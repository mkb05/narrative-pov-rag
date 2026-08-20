import os
from dotenv import load_dotenv
from upstash_redis import Redis
from pinecone import Pinecone

load_dotenv()

# Connect to Redis
redis_available = False
try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_client.ping()
    redis_available = True
    print("Connected to Upstash Redis.")
except Exception as e:
    print(f"Redis connection failed: {e}")

# Connect to Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
pinecone_index_name = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")
index = pc.Index(pinecone_index_name)

def reset_storage():
    # 1. Clear Redis keys related to raw text, summaries, characters, and POVs
    if redis_available:
        keys_to_delete = []
        patterns = ["rawtext:*", "chars:*", "summary:*", "pov:*"]
        for pattern in patterns:
            matched = redis_client.keys(pattern)
            if matched:
                keys_to_delete.extend(matched)
        
        if keys_to_delete:
            for k in keys_to_delete:
                redis_client.delete(k)
            print(f"Successfully deleted {len(keys_to_delete)} keys from Upstash Redis.")
        else:
            print("No matching keys found in Redis.")

    # 2. Clear Pinecone index vectors
    try:
        index.delete(delete_all=True)
        print("Successfully deleted all vectors from Pinecone index.")
    except Exception as e:
        print(f"Error clearing Pinecone index: {e}")

if __name__ == "__main__":
    confirm = input("Are you sure you want to delete all cached book text in Redis and vectors in Pinecone? (y/n): ")
    if confirm.lower() == 'y':
        reset_storage()
        print("Storage reset complete! You can now restart your app and ingest books fresh.")
    else:
        print("Operation cancelled.")