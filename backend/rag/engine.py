import os
import sys
import json
import re
from dotenv import load_dotenv
from groq import Groq
from pinecone import Pinecone
from upstash_redis import Redis

load_dotenv()

# Initialize Lightweight Clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY_GENERATION"))

# Initialize Pinecone Connection (0 memory overhead)
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")
pinecone_index = pc.Index(pinecone_index_name)

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
# CACHED SECTION TEXT & DYNAMIC CHARACTERS
# ==========================================

def get_original_section_text(book_id: str, section_id: int) -> str:
    """Fetches raw text via Pinecone metadata filtering with Redis caching."""
    cache_key = f"rawtext:{book_id}:section_{section_id}"
    
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            return cached

    results = pinecone_index.query(
        vector=[0.0] * 384,
        filter={"book_id": {"$eq": book_id}, "section_id": {"$eq": section_id}},
        top_k=5,
        include_metadata=True
    )
    
    matches = results.get("matches", [])
    if not matches:
        results = pinecone_index.query(
            vector=[0.0] * 384,
            filter={"book_id": {"$eq": book_id}},
            top_k=5,
            include_metadata=True
        )
        matches = results.get("matches", [])

    raw_text = "\n\n".join([m.get("metadata", {}).get("text", "") for m in matches]) if matches else "Original text not available."

    if REDIS_AVAILABLE and raw_text:
        redis_client.set(cache_key, raw_text)

    return raw_text


def get_section_characters(book_id: str, section_id: int) -> list[str]:
    """Fetches dynamic characters from Pinecone metadata with Redis caching."""
    cache_key = f"chars:{book_id}:section_{section_id}"
    
    if REDIS_AVAILABLE:
        cached = redis_client.get(cache_key)
        if cached:
            try:
                return json.loads(cached)
            except Exception:
                pass

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
    if section_id <= 1:
        return "This is the beginning of the narrative."
    
    cache_key = f"summary:{book_id}:section_{section_id - 1}"
    if REDIS_AVAILABLE:
        val = redis_client.get(cache_key)
        return val if val else "Prior events leading up to this section."
    return "Prior events leading up to this section."


def save_cumulative_summary(book_id: str, section_id: int, summary_text: str):
    cache_key = f"summary:{book_id}:section_{section_id}"
    if REDIS_AVAILABLE:
        redis_client.set(cache_key, summary_text)


def retrieve_and_generate_pov(book_id: str, section_id: int, target_character: str):
    """
    Checks Redis first for cached POV monologues.
    Only queries Groq if the exact perspective is not cached.
    """
    pov_cache_key = f"pov:{book_id}:section_{section_id}:{target_character.replace(' ', '_').lower()}"
    
    if REDIS_AVAILABLE:
        cached_pov = redis_client.get(pov_cache_key)
        if cached_pov:
            print(f"[Redis Cache HIT] Returning cached POV for {target_character} in section {section_id}")
            return {
                "pov_content": cached_pov,
                "cached": True
            }

    target_scene_text = get_original_section_text(book_id, section_id)
    historical_summary = get_cumulative_summary(book_id, section_id)

    if target_character.lower() in ["author intent", "original author intent"]:
        system_persona = (
            "You are an objective literary scholar. Explain the underlying themes, "
            "foreshadowing, narrative tension, and structural intent behind the provided scene."
        )
        task_instruction = (
            f"Analyze the scene below from '{book_id}' (Section {section_id}). "
            "Do NOT provide meta-notes or chain-of-thought blocks. Output only the thematic critique."
        )
    else:
        system_persona = (
            f"You are {target_character}. You exist entirely inside the world of this book. "
            "Speak directly in the first person ('I', 'me', 'my'). Express your raw emotions, "
            "internal motivations, and immediate reactions to this exact scene."
        )
        task_instruction = (
            f"Retell and experience this scene directly as {target_character}. "
            "Do NOT introduce yourself, do NOT analyze the text as a reader, and do NOT include think tags. "
            "Begin directly in character:"
        )

    prompt = f"""
    [Historical Context / Previous Summary]:
    {historical_summary}

    [Target Scene Text (Section {section_id})]:
    {target_scene_text}

    [Task Instructions]:
    {task_instruction}
    """

    print(f"[Groq LLM Generation] Synthesizing {target_character} POV for Section {section_id} via openai/gpt-oss-120b...")
    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {"role": "system", "content": system_persona},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        raw_output = response.choices[0].message.content
        generated_output = clean_think_tags(raw_output)

        if not generated_output:
            generated_output = raw_output.strip()

        if REDIS_AVAILABLE:
            redis_client.set(pov_cache_key, generated_output)

        new_summary = f"{historical_summary} -> Section {section_id} events: {target_scene_text[:300]}..."
        save_cumulative_summary(book_id, section_id, new_summary)

        return {
            "pov_content": generated_output,
            "cached": False
        }

    except Exception as e:
        return {"pov_content": f"Generation failed due to Groq API error: {e}", "cached": False}


def query_narrative_graph(book_id: str, section_id: int, query: str) -> str:
    """Executes relationship search using Groq."""
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

    user_prompt = f"""
Book: {book_id}
Timeline Point: Section {section_id}
Active Characters in Graph: {', '.join(chars) if chars else 'Primary Cast'}
Narrative History: {historical_summary}
Current Section Canonical Context:
{scene_text[:2000]}

User Graph Query: {query}
"""

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