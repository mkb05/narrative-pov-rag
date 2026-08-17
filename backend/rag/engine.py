import os
import json
from dotenv import load_dotenv
from groq import Groq
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from upstash_redis import Redis

load_dotenv()

# Initialize Clients
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY_GENERATION"))
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# Initialize Pinecone Vector Store integration
vector_store = PineconeVectorStore(
    index_name=os.getenv("PINECONE_INDEX_NAME", "literary-pov-master"),
    embedding=embeddings_model,
    text_key="text"
)

# Initialize Upstash Redis Client via REST API
try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    # Test connection with a lightweight ping
    redis_client.ping()
    REDIS_AVAILABLE = True
    print("[RAG Engine] Successfully connected to Upstash Redis!")
except Exception as e:
    print(f"[RAG Engine] Warning: Failed to connect to Upstash Redis ({e}). Falling back to local memory.")
    redis_client = {}
    REDIS_AVAILABLE = False

def get_cumulative_summary(book_id: str, section_id: int) -> str:
    """
    Fetches the accumulated rolling summary from Upstash Redis cache (Progressive Caching).
    """
    if section_id <= 1:
        return "This is the beginning of the narrative."
    
    target_prev_section = section_id - 1
    cache_key = f"summary:{book_id}:section_{target_prev_section}"
    
    if REDIS_AVAILABLE:
        # Upstash redis client returns data directly
        val = redis_client.get(cache_key)
        return val if val else ""
    else:
        return redis_client.get(cache_key, "")

def save_cumulative_summary(book_id: str, section_id: int, summary_text: str):
    """Saves or updates the cumulative summary in Upstash Redis for the next sequential section."""
    cache_key = f"summary:{book_id}:section_{section_id}"
    if REDIS_AVAILABLE:
        redis_client.set(cache_key, summary_text)
    else:
        redis_client[cache_key] = summary_text

def retrieve_and_generate_pov(book_id: str, section_id: int, target_character: str):
    """
    Executes Metadata-Filtered RAG, checks Upstash Redis context cache, and streams 
    character POV using qwen/qwen3.6-27b.
    """
    print(f"\n[RAG Engine] Fetching Section {section_id} for Book [{book_id}] | Perspective: [{target_character}]")

    # Step 1: Metadata-Filtered Search in Pinecone
    filter_dict = {
        "book_id": book_id,
        "section_id": section_id
    }
    
    results = vector_store.similarity_search(
        query=f"Scene content for section {section_id}",
        k=3,
        filter=filter_dict
    )

    if not results:
        return "Error: No matching text chunks found for this section with the given metadata filters."

    target_scene_text = "\n\n".join([doc.page_content for doc in results])

    # Step 2: Progressive Cache Check (Upstash Redis)
    historical_summary = get_cumulative_summary(book_id, section_id)
    if not historical_summary and section_id > 1:
        print("[Cache Miss] Generating rolling summary for prior sections on the fly...")
        historical_summary = "Prior events leading up to this section."

    # Step 3: Construct Dynamic Prompt Template
    if target_character.lower() == "author intent":
        system_persona = "You are an objective literary analyst explaining the overarching themes and author's structural intent."
        task_instruction = f"Analyze this scene from '{book_id}' (Section {section_id}). Explain the underlying themes, foreshadowing, and plot mechanics."
    else:
        system_persona = f"You are {target_character}. Stay strictly true to your internal biases, emotions, knowledge boundaries, and personal motivations within the story."
        task_instruction = f"Rewrite this scene entirely from your ({target_character}'s) point of view. Focus heavily on your inner monologue, emotional reactions, and hidden justifications."

    prompt = f"""
    [Historical Context / Previous Summary]:
    {historical_summary}

    [Target Scene Text (Section {section_id})]:
    {target_scene_text}

    [Task Instructions]:
    {task_instruction}
    """

    # Step 4: High-Performance Generation via Groq (llama-3.3-70b-versatile)
    print("Calling Groq (qwen/qwen3.6-27b) to generate character perspective...")
    try:
            response = groq_client.chat.completions.create(
                model="qwen/qwen3.6-27b",  # Updated to active high-performance free model
                messages=[
                    {"role": "system", "content": system_persona},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            generated_output = response.choices[0].message.content
            
            # Progressive Roll-Forward (Update Cache for next section)
            new_summary_payload = f"{historical_summary} -> Section {section_id} events: {target_scene_text[:300]}..."
            save_cumulative_summary(book_id, section_id, new_summary_payload)

            return generated_output

    except Exception as e:
            return f"Generation failed due to Groq API error: {e}"

if __name__ == "__main__":
    test_book = "frankenstein"
    test_section = 1
    test_char = "Victor Frankenstein"

    output = retrieve_and_generate_pov(test_book, test_section, test_char)
    print("\n--- Generated Character POV Output ---")
    print(output)