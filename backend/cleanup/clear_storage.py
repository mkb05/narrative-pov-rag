import os
from dotenv import load_dotenv
from upstash_redis import Redis
from pinecone import Pinecone

load_dotenv()

# ==========================================
# CLIENT INITIALIZATIONS
# ==========================================
redis_client = None
redis_available = False

try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_client.ping()
    redis_available = True
    print("[Connection] Connected to Upstash Redis.")
except Exception as e:
    print(f"[Connection Warning] Redis connection failed: {e}")

try:
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")
    index = pc.Index(pinecone_index_name)
    print(f"[Connection] Connected to Pinecone index: '{pinecone_index_name}'")
except Exception as e:
    index = None
    print(f"[Connection Warning] Pinecone connection failed: {e}")


# ==========================================
# STORAGE CLEARING FUNCTIONS
# ==========================================
def clear_redis():
    """Clears cached raw text, dynamic characters, rolling summaries, and POV monologues from Redis."""
    if not redis_available or not redis_client:
        print("[Redis] Cannot clear Redis: Client is not connected.")
        return

    keys_to_delete = []
    patterns = ["rawtext:*", "chars:*", "summary:*", "pov:*"]
    
    for pattern in patterns:
        matched = redis_client.keys(pattern)
        if matched:
            keys_to_delete.extend(matched)

    if keys_to_delete:
        # Deduplicate keys if any overlap occurs
        unique_keys = list(set(keys_to_delete))
        for k in unique_keys:
            redis_client.delete(k)
        print(f"[Redis] Successfully deleted {len(unique_keys)} keys from Upstash Redis.")
    else:
        print("[Redis] No matching cached keys found in Redis.")


def clear_pinecone():
    """Deletes all vector embeddings and payloads from the Pinecone index."""
    if not index:
        print("[Pinecone] Cannot clear Pinecone: Index client is not initialized.")
        return

    try:
        index.delete(delete_all=True)
        print("[Pinecone] Successfully deleted all vectors from the Pinecone index.")
    except Exception as e:
        print(f"[Pinecone] Error clearing Pinecone index: {e}")


# ==========================================
# INTERACTIVE CLI PROMPT
# ==========================================
if __name__ == "__main__":
    print("\n--- Storage Reset Utility ---\n")
    
    # 1. Ask for Redis
    confirm_redis = input("Do you want to clear Upstash Redis cache (raw text, summaries, characters, POVs)? (y/n): ").strip().lower()
    if confirm_redis == 'y':
        clear_redis()
    else:
        print("[Redis] Skipped.")

    print()

    # 2. Ask for Pinecone
    confirm_pinecone = input("Do you want to clear Pinecone index (all vector embeddings)? (y/n): ").strip().lower()
    if confirm_pinecone == 'y':
        clear_pinecone()
    else:
        print("[Pinecone] Skipped.")

    print("\nStorage reset operations completed.")