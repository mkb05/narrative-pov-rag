import os
import sys
import json
import re
import time
import requests
from dotenv import load_dotenv
from groq import Groq
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from upstash_redis import Redis

# Ensure ingestion modules can be imported under any execution context
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ingestion')))

try:
    from backend.ingestion.ingest import extract_chunk_metadata
except ImportError:
    try:
        from ingestion.ingest import extract_chunk_metadata
    except ImportError:
        from ingest import extract_chunk_metadata

load_dotenv()

# Initialize Lightweight Clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY_GENERATION"))

# Initialize Pinecone Client (Connection only - 0 memory overhead)
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")
pinecone_index = pc.Index(pinecone_index_name)

# ==========================================
# LAZY LOADING SINGLETONS (Prevents OOM)
# ==========================================
_embeddings_model = None
_vector_store = None

def get_embeddings_model():
    """Lazily loads HuggingFace embedding weights only when first requested."""
    global _embeddings_model
    if _embeddings_model is None:
        print("[RAG Engine] Lazily loading HuggingFaceEmbeddings (all-MiniLM-L6-v2)...")
        _embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    return _embeddings_model

def get_vector_store():
    """Lazily initializes PineconeVectorStore wrapper when first requested."""
    global _vector_store
    if _vector_store is None:
        _vector_store = PineconeVectorStore(
            index_name=pinecone_index_name,
            embedding=get_embeddings_model(),
            text_key="text"
        )
    return _vector_store


# Initialize Upstash Redis
try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
    print("[RAG Engine] Upstash Redis Connected & Active!")
except Exception as e:
    print(f"[RAG Engine] Redis connection failed ({e}). Falling back to memory dictionary.")
    redis_client = {}
    REDIS_AVAILABLE = False


def clean_think_tags(text: str) -> str:
    """Removes chain-of-thought blocks and meta-planning headers from reasoning models."""
    if not text:
        return ""
    # Strip explicit <think>...</think> tags
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL)

    # Strip standard planning/outline traces if present
    if "Here's a thinking process:" in cleaned or "Thinking Process:" in cleaned:
        parts = re.split(
            r'\*\(Start directly in character\)\*|\(Start directly in character\)|\(Opening\)|5\.\s+\*\*Draft|\*\*Drafting\*\*:', 
            cleaned, 
            flags=re.IGNORECASE
        )
        if len(parts) > 1:
            cleaned = parts[-1]
        else:
            paragraphs = cleaned.split("\n\n")
            narrative_paras = [
                p for p in paragraphs 
                if not any(p.strip().startswith(prefix) for prefix in ["-", "*", "1.", "2.", "3.", "4.", "5.", "Here's", "Thinking"])
            ]
            if narrative_paras:
                cleaned = "\n\n".join(narrative_paras)

    return cleaned.strip()


def check_and_lazy_ingest_book(book_id: str):
    """Ensures book chunks are embedded in Pinecone on demand."""
    results = pinecone_index.query(
        vector=[0.0] * 384,
        filter={"book_id": {"$eq": book_id}},
        top_k=1,
        include_metadata=False
    )
    
    if results.get("matches"):
        return True

    print(f"[Lazy Ingestion] Book '{book_id}' missing in vector DB. Fetching from Gutenberg...")

    gutenberg_map = {
        "frankenstein": 84,
        "pride_and_prejudice": 1342,
        "dracula": 345,
        "the_adventures_of_sherlock_holmes": 1661
    }
    
    g_id = gutenberg_map.get(book_id, 84)
    url = f"https://www.gutenberg.org/cache/epub/{g_id}/pg{g_id}.txt"
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception(f"Failed to download book from Gutenberg: {url}")
        
    text = response.text
    if "*** START OF THE PROJECT GUTENBERG" in text:
        text = text.split("*** START OF THE PROJECT GUTENBERG")[1].split("***")[1]
    if "*** END OF THE PROJECT GUTENBERG" in text:
        text = text.split("*** END OF THE PROJECT GUTENBERG")[0]

    splitter = RecursiveCharacterTextSplitter(chunk_size=3000, chunk_overlap=200)
    docs = splitter.split_documents([Document(page_content=text.strip(), metadata={"book_id": book_id})])
    
    vectors_to_upsert = []
    total_vectors = pinecone_index.describe_index_stats().get("total_vector_count", 0)

    # Use lazy loaded embeddings
    embeddings = get_embeddings_model()

    for idx, chunk in enumerate(docs[:15] if len(docs) > 15 else docs):
        meta = extract_chunk_metadata(chunk.page_content, book_id, idx)
        payload = {
            "text": chunk.page_content,
            "page_content": chunk.page_content,
            "book_id": book_id,
            "section_id": int(meta.get("section_id", (idx // 3) + 1)),
            "active_characters": list(meta.get("active_characters", [])),
            "chunk_summary": str(meta.get("summary", "")),
            "source": f"gutenberg_{g_id}"
        }
        vector = embeddings.embed_query(chunk.page_content)
        vectors_to_upsert.append({
            "id": f"chunk_{total_vectors + idx}",
            "values": vector,
            "metadata": payload
        })
        time.sleep(2)
        
    pinecone_index.upsert(vectors=vectors_to_upsert)
    return True


def query_narrative_graph(book_id: str, section_id: int, query: str) -> str:
    """
    Executes relational and thematic graph search for a specific book and section.
    """
    if not query.strip():
        return "Please enter a specific question about character relationships or events."

    # Fetch context for the scene and prior summary
    scene_text = get_original_section_text(book_id, section_id)
    chars = get_section_characters(book_id, section_id)
    historical_summary = get_cumulative_summary(book_id, section_id)

    system_persona = (
        "You are an insightful literary companion. Explain character dynamics, shifting relationships, "
        "and multi-hop connections in clear, engaging, conversational language. "
        "DO NOT output raw markdown tables, database syntax, planning outlines, or <think> tags. "
        "Use concise paragraphs, standalone bold labels, and bullet points."
    )

    user_prompt = f"""
Book: {book_id}
Timeline Point: Section {section_id}
Active Characters in Graph: {', '.join(chars) if chars else 'Primary Cast'}
Narrative History: {historical_summary}
Current Section Canonical Context:
{scene_text[:2000]}

User Graph Query: {query}

Instructions:
1. Answer the question directly in 2-3 clear sentences.
2. Highlight key relationship shifts using lightweight bullet points (e.g., 'Character A → Character B: Shift').
3. Note any ripple effects across the social circle.
4. Keep the tone conversational and accessible.
"""

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_persona},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.4,
            max_tokens=700
        )
        return clean_think_tags(response.choices[0].message.content)
    except Exception as e:
        return f"Graph query failed: {e}"


# ==========================================
# CACHED SECTION TEXT & DYNAMIC CHARACTERS
# ==========================================

def get_original_section_text(book_id: str, section_id: int) -> str:
    """Fetches raw text with Redis caching to avoid repeat vector queries."""
    cache_key = f"rawtext:{book_id}:section_{section_id}"
    
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            return cached

    check_and_lazy_ingest_book(book_id)
    
    # Lazy vector store
    v_store = get_vector_store()
    retriever = v_store.as_retriever(
        search_kwargs={"filter": {"book_id": book_id, "section_id": section_id}, "k": 5}
    )
    docs = retriever.invoke(f"What happens in section {section_id}?")
    
    if not docs:
        retriever_fallback = v_store.as_retriever(
            search_kwargs={"filter": {"book_id": book_id}, "k": 5}
        )
        docs = retriever_fallback.invoke(f"Section {section_id}")
        
    raw_text = "\n\n".join([doc.page_content for doc in docs]) if docs else "Original text not available."

    if REDIS_AVAILABLE and raw_text:
        redis_client.set(cache_key, raw_text)

    return raw_text


def get_section_characters(book_id: str, section_id: int) -> list[str]:
    """Fetches dynamic characters with Redis caching to save token extraction."""
    cache_key = f"chars:{book_id}:section_{section_id}"
    
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

    check_and_lazy_ingest_book(book_id)
    
    results = pinecone_index.query(
        vector=[0.0] * 384,
        filter={"book_id": {"$eq": book_id}, "section_id": {"$eq": section_id}},
        top_k=5,
        include_metadata=True
    )
    
    if not results.get("matches"):
        results = pinecone_index.query(
            vector=[0.0] * 384,
            filter={"book_id": {"$eq": book_id}},
            top_k=10,
            include_metadata=True
        )

    characters = set()
    for match in results.get("matches", []):
        meta = match.get("metadata", {})
        active = meta.get("active_characters", [])
        if isinstance(active, list):
            for char in active:
                if char and char.strip():
                    characters.add(char.strip())

    char_list = sorted(list(characters))

    if REDIS_AVAILABLE:
        redis_client.set(cache_key, json.dumps(char_list))

    return char_list


# ==========================================
# CACHED POV GENERATION & PROGRESSIVE SUMMARY
# ==========================================

def get_cumulative_summary(book_id: str, section_id: int) -> str:
    """Fetches accumulated rolling summary from Redis."""
    if section_id <= 1:
        return "This is the beginning of the narrative."
    
    cache_key = f"summary:{book_id}:section_{section_id - 1}"
    if REDIS_AVAILABLE:
        val = redis_client.get(cache_key)
        return val if val else "Prior events leading up to this section."
    return "Prior events leading up to this section."


def save_cumulative_summary(book_id: str, section_id: int, summary_text: str):
    """Stores rolling summary in Redis for subsequent sections."""
    cache_key = f"summary:{book_id}:section_{section_id}"
    if REDIS_AVAILABLE:
        redis_client.set(cache_key, summary_text)


def retrieve_and_generate_pov(book_id: str, section_id: int, target_character: str):
    """
    Checks Redis first for cached POV monologues.
    Only queries Groq if the exact perspective is not cached.
    """
    pov_cache_key = f"pov:{book_id}:section_{section_id}:{target_character.replace(' ', '_').lower()}"
    
    # 1. Zero-Token Check for Previously Generated POVs
    if REDIS_AVAILABLE:
        cached_pov = redis_client.get(pov_cache_key)
        if cached_pov:
            print(f"[Redis Cache HIT] Returning cached POV for {target_character} in section {section_id}")
            return {
                "pov_content": cached_pov,
                "cached": True
            }

    # 2. Get Raw Text & Historical Rolling Context
    target_scene_text = get_original_section_text(book_id, section_id)
    historical_summary = get_cumulative_summary(book_id, section_id)

    # 3. Construct Strict Persona Prompts
    if target_character.lower() in ["author intent", "original author intent"]:
        system_persona = (
            "You are the author reflecting on your work. Explain your narrative choices, "
            "thematic goals, and character dynamics in this section in an engaging, conversational literary voice. "
            "Do NOT include planning notes, lists of constraints, or chain-of-thought tags."
        )
        user_prompt = f"""
Book: {book_id} (Section {section_id})
Prior Plot Context: {historical_summary}
Canonical Text of This Scene:
{target_scene_text}

Task:
Explain what is happening in this scene, why you wrote it this way, and the underlying tension between the characters. 
Begin your response immediately:
"""
    else:
        system_persona = (
            f"You are {target_character} from '{book_id}'. You are recounting and explaining the events of this scene "
            f"directly to the reader in your own distinct voice and personality. Use first-person ('I', 'me', 'my'). "
            f"Focus on your emotions, motives, reactions, and internal monologue during these events. "
            f"Do NOT break character. Do NOT explain what you are doing. Do NOT output analysis or <think> tags."
        )
        user_prompt = f"""
Prior Background: {historical_summary}
The Events Happening in This Scene:
{target_scene_text}

Task:
Recount and explain this scene as {target_character}. Tell me what happened, how you felt about it, and what you were thinking at that moment.
Begin speaking directly in character now:
"""

    print(f"[Groq LLM Generation] Synthesizing {target_character} POV for Section {section_id} via openai/gpt-oss-120b...")
    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_persona},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        raw_output = response.choices[0].message.content
        generated_output = clean_think_tags(raw_output)

        if not generated_output:
            generated_output = raw_output.strip()

        # Cache generated POV in Redis
        if REDIS_AVAILABLE and generated_output:
            redis_client.set(pov_cache_key, generated_output)

        # Update progressive cumulative summary for next sections
        new_summary = f"{historical_summary} -> Section {section_id} events: {target_scene_text[:300]}..."
        save_cumulative_summary(book_id, section_id, new_summary)

        return {
            "pov_content": generated_output,
            "cached": False
        }

    except Exception as e:
        return {"pov_content": f"Generation failed due to Groq API error: {e}", "cached": False}