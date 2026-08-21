import os
import sys
import json
import re
import time
import requests
from dotenv import load_dotenv
from groq import Groq
from pinecone import Pinecone
from upstash_redis import Redis
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_pinecone import PineconeEmbeddings

# Ensure ingestion modules can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ingestion')))
try:
    from ingest import extract_chunk_metadata
except ImportError:
    pass

load_dotenv()

# Initialize Lightweight Clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY_GENERATION"))

# Initialize Pinecone Connection (0 memory overhead)
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")
pinecone_index = pc.Index(pinecone_index_name)

# ==========================================
# LAZY LOADING EMBEDDINGS
# ==========================================
_embeddings_model = None

def get_embeddings_model():
    """Uses Pinecone's hosted serverless embeddings (Zero local RAM overhead)."""
    return PineconeEmbeddings(model="multilingual-e5-large")

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
    print(f"[RAG Engine] Redis connection failed ({e}).")
    redis_client = {}
    REDIS_AVAILABLE = False


def clean_think_tags(text: str) -> str:
    """Removes chain-of-thought blocks from reasoning models."""
    if not text:
        return ""
    cleaned = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    cleaned = re.sub(r'<think>.*', '', cleaned, flags=re.DOTALL)
    return cleaned.strip()


# ==========================================
# ON-DEMAND LAZY INGESTION (DUAL STORAGE)
# ==========================================
def check_and_lazy_ingest_book(book_id: str):
    """
    Fetches book from Gutenberg, splits it into genuine structural sections,
    stores them individually into Redis, and indexes chunks into Pinecone.
    """
    # Check if section 1 already exists in Redis
    if REDIS_AVAILABLE and redis_client.get(f"rawtext:{book_id}:section_1"):
        return True

    print(f"[Lazy Ingestion] Book '{book_id}' missing in storage. Fetching on-demand...")

    # Fetch Gutenberg ID dynamically or via fallback map
    g_id = None
    if REDIS_AVAILABLE:
        try:
            raw_map = redis_client.get("app:gutenberg_map")
            if raw_map:
                g_map = json.loads(raw_map) if isinstance(raw_map, (str, bytes)) else raw_map
                g_id = g_map.get(book_id)
        except Exception:
            pass

    if not g_id:
        fallback_map = {
            "frankenstein": 84,
            "pride_and_prejudice": 1342,
            "dracula": 345,
            "the_adventures_of_sherlock_holmes": 1661,
            "the_time_machine": 35
        }
        g_id = fallback_map.get(book_id, 84)

    url = f"https://www.gutenberg.org/cache/epub/{g_id}/pg{g_id}.txt"

    #   standard User-Agent header so Gutenberg doesn't block the request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    # FIX: Add a retry mechanism for dropped connections
    response = None
    for attempt in range(3):
        try:
            response = requests.get(url, headers=headers, timeout=20)
            if response.status_code == 200:
                break
        except requests.exceptions.RequestException as e:
            print(f"[Lazy Ingestion] Attempt {attempt + 1} failed: {e}")
            time.sleep(2)
            if attempt == 2:
                raise Exception(f"Failed to download book from Gutenberg URL {url} after 3 attempts.")

            
    if response.status_code != 200:
        raise Exception(f"Failed to download book from Gutenberg URL: {url}")
        
    text = response.text
    if "*** START OF THE PROJECT GUTENBERG" in text:
        after_start = text.split("*** START OF THE PROJECT GUTENBERG")[1]
        text = after_start.split("***")[1] if "***" in after_start else after_start
    if "*** END OF THE PROJECT GUTENBERG" in text:
        text = text.split("*** END OF THE PROJECT GUTENBERG")[0]

    text = text.strip()

    # FIX: Use regex to find genuine chapter headers (e.g., "CHAPTER I", "Chapter 1", or standalone Roman/Arabic numbers on new lines)
    # This pattern matches words like Chapter/CHAPTER followed by numbers, or standalone Roman/Arabic numerals with surrounding line breaks
    chapter_pattern = r'\n\s*(?:CHAPTER|Chapter|SECTION|Section)?\s*(?:[IVXLCDM]+\b|\d+\b)\s*\n'
    
    # Split the raw text using the regex pattern
    raw_sections = re.split(chapter_pattern, text)
    
    # Filter out empty or whitespace-only sections
    cleaned_sections = [sec.strip() for sec in raw_sections if sec and len(sec.strip()) > 200]
    
    # If regex split successfully found multiple structural sections, wrap them as LangChain Documents
    if len(cleaned_sections) > 1:
        section_docs = [Document(page_content=sec) for sec in cleaned_sections]
        print(f"[Lazy Ingestion] Successfully parsed {len(section_docs)} structural sections using chapter/numeric patterns.")
    else:
        # Fallback to RecursiveCharacterTextSplitter if headers weren't structured uniformly
        section_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000, 
            chunk_overlap=0, 
            separators=["\n\n\n", "\n\n", "\n"]
        )
        section_docs = section_splitter.split_documents([Document(page_content=text)])

    if REDIS_AVAILABLE:
        for idx, sec_doc in enumerate(section_docs):
            redis_client.set(f"rawtext:{book_id}:section_{idx + 1}", sec_doc.page_content.strip())
        print(f"[Redis Document Store] Stored {len(section_docs)} distinct sections for '{book_id}' in Redis.")

    # Process smaller overlapping chunks for Pinecone Vector DB (AI features)
    vector_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)
    docs = vector_splitter.split_documents([Document(page_content=text, metadata={"book_id": book_id})])
    
    vectors_to_upsert = []
    total_vectors = pinecone_index.describe_index_stats().get("total_vector_count", 0)
    embeddings = get_embeddings_model()

    for idx, chunk in enumerate(docs[:20] if len(docs) > 20 else docs):
        section_id = (idx // 2) + 1  # Map chunks logically to sections
        try:
            meta = extract_chunk_metadata(chunk.page_content, book_id, idx)
        except NameError:
            meta = {"active_characters": [], "summary": ""}
            
        payload = {
            "text": chunk.page_content,
            "page_content": chunk.page_content,
            "book_id": book_id,
            "section_id": section_id,
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
        
    if vectors_to_upsert:
        pinecone_index.upsert(vectors=vectors_to_upsert)
        time.sleep(2.5)

    print(f"[Lazy Ingestion] Successfully processed and indexed '{book_id}'!")
    time.sleep(2) 
    return True


# ==========================================
# CACHED SECTION TEXT & DYNAMIC CHARACTERS
# ==========================================
def get_original_section_text(book_id: str, section_id: int) -> str:
    """Fetches raw text strictly from Redis (Document DB). No vector lookups needed for reading!"""
    cache_key = f"rawtext:{book_id}:section_{section_id}"
    
    # 1. Attempt standard Redis retrieval
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            return cached if isinstance(cached, str) else cached.decode("utf-8")

    # 2. If missing, trigger lazy ingestion pipeline
    check_and_lazy_ingest_book(book_id)

    # 3. Retrieve newly populated text from Redis
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            return cached if isinstance(cached, str) else cached.decode("utf-8")

    return "Original text not available for this section."


def get_section_characters(book_id: str, section_id: int) -> list[str]:
    """Fetches dynamic characters from Pinecone metadata with Redis caching and token-safe Groq fallback."""
    cache_key = f"chars:{book_id}:section_{section_id}"
    
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            try:
                return json.loads(cached) if isinstance(cached, (str, bytes)) else cached
            except Exception:
                pass

    check_and_lazy_ingest_book(book_id)
    
    # 2. Query Pinecone metadata with a higher top_k to aggregate across all chunk variations
    results = pinecone_index.query(
        vector=[0.0] * 1024,  # Matches your new 1024-dim index
        filter={
            "$and": [
                {"book_id": {"$eq": book_id}},
                {"section_id": {"$eq": section_id}}
            ]
        },
        top_k=15,  # Fetch more chunks to ensure we catch non-empty metadata
        include_metadata=True
    )

    
    if not results.get("matches"):
        results = pinecone_index.query(
            vector=[0.0] * 1024,
            filter={"book_id": {"$eq": book_id}},
            top_k=15,
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

# 3. FALLBACK: If characters are still empty, extract safely on-the-fly via Groq
    if not char_list:
        print(f"[RAG Engine] Character list empty for '{book_id}' section {section_id}. Extracting via Groq on-the-fly...")
        scene_text = get_original_section_text(book_id, section_id)
        
        if scene_text and scene_text != "Original text not available for this section.":
            try:
                safe_scene_text = scene_text[:4000]  # Keep it safely within token bounds
                extraction_prompt = (
                    f"List the names of all the characters present, speaking, or actively mentioned in this text excerpt from '{book_id}' (Section {section_id}). "
                    "Provide a simple comma-separated list of names (e.g., Elizabeth Bennet, Mr. Darcy, Jane). "
                    "Do not include extra text, explanations, or markdown."
                )
                response = groq_client.chat.completions.create(
                    model="groq/compound-mini",
                    messages=[
                        {"role": "system", "content": "You are a precise literary data extractor. Output only names separated by commas."},
                        {"role": "user", "content": f"{extraction_prompt}\n\nText:\n{safe_scene_text}"}
                    ],
                    temperature=0.1,
                    max_tokens=150
                )
                print("response",response)
                raw_content = clean_think_tags(response.choices[0].message.content)
                print("raw content:", raw_content)
                
                # Parse lines or comma separation safely using basic text cleaning
                if raw_content:
                    # Clean up common conversational artifacts if present
                    cleaned = raw_content.replace("Characters:", "").replace("-", "").strip()
                    # Split by commas or newlines
                    potential_chars = re.split(r'[\n,]+', cleaned)
                    for c in potential_chars:
                        clean_name = c.strip(" '\"*._-")
                        if clean_name and len(clean_name) < 40 and not clean_name.lower().startswith("none"):
                            characters.add(clean_name)
                            
                char_list = sorted(list(characters))
            except Exception as e:
                import traceback
                print(f"[RAG Engine] On-the-fly character extraction failed with error: {e}")
                traceback.print_exc()

    if REDIS_AVAILABLE and char_list:
        redis_client.set(cache_key, json.dumps(char_list))

    return char_list


# ==========================================
# CACHED POV GENERATION & PROGRESSIVE SUMMARY
# ==========================================
def get_cumulative_summary(book_id: str, section_id: int) -> str:
    if section_id <= 1:
        return "This is the beginning of the narrative."
    
    cache_key = f"summary:{book_id}:section_{section_id - 1}"
    if REDIS_AVAILABLE:
        val = redis_client.get(cache_key)
        if val:
            return val if isinstance(val, str) else val.decode("utf-8")
    return "Prior events leading up to this section."


def save_cumulative_summary(book_id: str, section_id: int, summary_text: str):
    cache_key = f"summary:{book_id}:section_{section_id}"
    if REDIS_AVAILABLE:
        redis_client.set(cache_key, summary_text)


def retrieve_and_generate_pov(book_id: str, section_id: int, target_character: str):
    pov_cache_key = f"pov:{book_id}:section_{section_id}:{target_character.replace(' ', '_').lower()}"
    
    if REDIS_AVAILABLE:
        cached_pov = redis_client.get(pov_cache_key)
        if cached_pov:
            return {
                "pov_content": cached_pov if isinstance(cached_pov, str) else cached_pov.decode("utf-8"),
                "cached": True
            }

    target_scene_text = get_original_section_text(book_id, section_id)
    historical_summary = get_cumulative_summary(book_id, section_id)

    # TRUNCATE TOKENS SAFELY: Keep scene text under ~3,000 characters (~750 tokens) to stay well under TPM limits
    safe_scene_text = target_scene_text[:3000] if target_scene_text else ""
    safe_history = historical_summary[:1000] if historical_summary else ""

    if target_character.lower() in ["author intent", "original author intent"]:
        system_persona = (
            "You are the author reflecting on your work. Explain your narrative choices, "
            "thematic goals, and character dynamics in this section in an engaging, conversational literary voice. "
            "Do NOT include planning notes, lists of constraints, or chain-of-thought tags."
        )
        user_prompt = f"Book: {book_id} (Section {section_id})\nPrior Plot Context: {safe_history}\nCanonical Text of This Scene:\n{safe_scene_text}\n\nTask:\nExplain what is happening in this scene, why you wrote it this way, and the underlying tension between the characters. \nBegin your response immediately:\n"
    else:
        system_persona = (
            f"You are {target_character} from '{book_id}'. You are recounting and explaining the events of this scene "
            f"directly to the reader in your own distinct voice and personality. Use first-person ('I', 'me', 'my'). "
            f"Focus on your emotions, motives, reactions, and internal monologue during these events. "
            f"Do NOT break character. Do NOT explain what you are doing. Do NOT output analysis or <think> tags."
        )
        user_prompt = f"Prior Background: {safe_history}\nThe Events Happening in This Scene:\n{safe_scene_text}\n\nTask:\nRecount and explain this scene as {target_character}. Tell me what happened, how you felt about it, and what you were thinking at that moment.\nBegin speaking directly in character now:\n"

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_persona},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        raw_output = response.choices[0].message.content
        generated_output = clean_think_tags(raw_output)

        if not generated_output:
            generated_output = raw_output.strip()

        if REDIS_AVAILABLE and generated_output:
            redis_client.set(pov_cache_key, generated_output)

        new_summary = f"{safe_history} -> Section {section_id} events: {safe_scene_text[:200]}..."
        save_cumulative_summary(book_id, section_id, new_summary)

        return {
            "pov_content": generated_output,
            "cached": False
        }

    except Exception as e:
        return {"pov_content": f"Generation failed due to Groq API error: {e}", "cached": False}

    

def query_narrative_graph(book_id: str, section_id: int, query: str) -> str:
    if not query.strip():
        return "Please enter a specific question about character relationships or events."

    scene_text = get_original_section_text(book_id, section_id)
    chars = get_section_characters(book_id, section_id)
    historical_summary = get_cumulative_summary(book_id, section_id)

    system_persona = (
        "You are an insightful literary companion. Explain character dynamics, shifting relationships, "
        "and multi-hop connections in clear, engaging, conversational language. "
        "DO NOT output raw markdown tables, database syntax, planning outlines, or <think> tags. "
        "Use concise paragraphs, standalone bold labels, and bullet points."
    )

    user_prompt = f"Book: {book_id}\nTimeline Point: Section {section_id}\nActive Characters in Graph: {', '.join(chars) if chars else 'Primary Cast'}\nNarrative History: {historical_summary}\nCurrent Section Canonical Context:\n{scene_text[:2000]}\n\nUser Graph Query: {query}\n"

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_persona},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5,
            max_tokens=600
        )
        return clean_think_tags(response.choices[0].message.content)
    except Exception as e:
        return f"Graph query failed: {e}"