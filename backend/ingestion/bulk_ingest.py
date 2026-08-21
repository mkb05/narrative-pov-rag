import os
import re
import time
import requests
from dotenv import load_dotenv
from upstash_redis import Redis
from ingest import (
    get_serverless_embedding, 
    PINECONE_INDEX_NAME, 
    pinecone_index
)
import json
import argparse
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

# Initialize Upstash Redis
try:
    redis_client = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
    print("[Bulk Ingest] Upstash Redis Connected & Active!")
except Exception as e:
    print(f"[Bulk Ingest] Redis connection failed: {e}")
    redis_client = None
    REDIS_AVAILABLE = False

GUTENDEX_API_URL = "https://gutendex.com/books"

CATEGORIES = [
    "fiction", "romance", "mystery", "adventure", "horror",
    "history", "poetry", "science fiction", "fantasy", "drama"
]


def check_book_exists(book_id_str: str) -> tuple[bool, bool]:
    """
    Checks if the book already exists in Redis (raw text) and Pinecone (vectors).
    Returns (exists_in_redis, exists_in_pinecone).
    """
    exists_in_redis = False
    exists_in_pinecone = False

    # 1. Check Redis
    if REDIS_AVAILABLE and redis_client:
        try:
            if redis_client.get(f"rawtext:{book_id_str}:section_1"):
                exists_in_redis = True
        except Exception as e:
            print(f"  [Deduplication] Redis check failed: {e}")

    # 2. Check Pinecone via metadata filter
    try:
        results = pinecone_index.query(
            vector=[0.0] * 1024,
            filter={"book_id": {"$eq": book_id_str}},
            top_k=1,
            include_metadata=False
        )
        if results.get("matches"):
            exists_in_pinecone = True
    except Exception as e:
        print(f"  [Deduplication] Pinecone check failed: {e}")

    return exists_in_redis, exists_in_pinecone


def fetch_books_by_category(category: str, limit_per_category: int = 5, page: int = 1):
    """
    Queries Gutendex API for English books with pagination support.
    """
    print(f"\n[Gutendex API] Fetching page {page} for category: '{category}'...")
    url = f"{GUTENDEX_API_URL}?languages=en&topic={category}&page={page}"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Failed to fetch catalog for topic '{category}' (Page {page}). Status: {response.status_code}")
        return {}
    
    data = response.json()
    books = data.get("results", [])[:limit_per_category]
    
    catalog = {}
    for book in books:
        book_id = book["id"]
        title_slug = book["title"].lower().split(",")[0].strip().replace(" ", "_").replace(":", "").replace("'", "").replace("-", "_")
        
        formats = book.get("formats", {})
        text_url = formats.get("text/plain; charset=utf-8") or formats.get("text/plain")

        authors = book.get("authors", [])
        author_name = "Unknown"
        if authors:
            raw_name = authors[0].get("name", "Unknown")
            if "," in raw_name:
                parts = raw_name.split(",")
                author_name = f"{parts[1].strip()} {parts[0].strip()}"
            else:
                author_name = raw_name
        
        if text_url and book_id not in [item.get("gutenberg_id") for item in catalog.values()]:
            catalog[title_slug] = {
                "gutenberg_id": book_id,
                "title": book["title"].split('\n')[0],
                "author": author_name,
                "url": text_url,
                "category": category
            }
            
    return catalog


def fetch_and_clean_text(text_url: str) -> str:
    """Downloads raw text and strips Gutenberg boilerplate."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(text_url, headers=headers, timeout=20)
    if response.status_code != 200:
        raise Exception(f"Failed to download text. Status: {response.status_code}")
        
    text = response.text
    if "*** START OF THE PROJECT GUTENBERG" in text:
        after_start = text.split("*** START OF THE PROJECT GUTENBERG")[1]
        text = after_start.split("***")[1] if "***" in after_start else after_start
    if "*** END OF THE PROJECT GUTENBERG" in text:
        text = text.split("*** END OF THE PROJECT GUTENBERG")[0]
        
    return text.strip()


def split_into_sections(text: str) -> list[str]:
    """Splits full text into structural chapters or uniform sections."""
    chapter_pattern = r'\n\s*(?:CHAPTER|Chapter|SECTION|Section)?\s*(?:[IVXLCDM]+\b|\d+\b)\s*\n'
    raw_sections = re.split(chapter_pattern, text)
    cleaned_sections = [sec.strip() for sec in raw_sections if sec and len(sec.strip()) > 200]
    
    if len(cleaned_sections) <= 1:
        fallback_splitter = RecursiveCharacterTextSplitter(
            chunk_size=4000, 
            chunk_overlap=0, 
            separators=["\n\n\n", "\n\n", "\n"]
        )
        docs = fallback_splitter.split_documents([Document(page_content=text)])
        cleaned_sections = [doc.page_content for doc in docs]
        
    return cleaned_sections


def process_and_push_book(book_id_str: str, book_info: dict):
    """
    Checks for duplicates first. Only downloads, splits, and writes 
    missing data to Redis and/or Pinecone.
    """
    print(f"\n--- Checking [{book_info['category'].upper()}] Book: {book_info['title']} (ID: {book_info['gutenberg_id']}) ---")
    
    in_redis, in_pinecone = check_book_exists(book_id_str)

    # Completely skip if already stored in both places
    if in_redis and in_pinecone:
        print(f"  -> [SKIP] '{book_id_str}' already fully indexed in both Redis and Pinecone.")
        return

    # Download raw text only if at least one store is missing the book
    raw_text = fetch_and_clean_text(book_info["url"])
    sections = split_into_sections(raw_text)
    print(f"  -> Parsed {len(sections)} structural sections.")

    # 1. Backfill Redis if missing
    if not in_redis:
        if REDIS_AVAILABLE and redis_client:
            for sec_idx, sec_text in enumerate(sections):
                redis_client.set(f"rawtext:{book_id_str}:section_{sec_idx + 1}", sec_text)
            print(f"  -> [Redis] Stored {len(sections)} raw sections.")
    else:
        print(f"  -> [Redis] Sections already exist, skipping Redis upload.")

    # 2. Backfill Pinecone if missing
    if not in_pinecone:
        vector_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)
        vectors_to_upsert = []
        stats = pinecone_index.describe_index_stats()
        start_id = stats.get("total_vector_count", 0)

        for sec_idx, sec_text in enumerate(sections):
            section_id = sec_idx + 1
            sub_docs = vector_splitter.split_documents([
                Document(page_content=sec_text, metadata={"book_id": book_id_str, "section_id": section_id})
            ])

            for chunk in sub_docs:
                payload = {
                    "text": chunk.page_content,
                    "page_content": chunk.page_content,
                    "book_id": book_id_str,
                    "category": book_info["category"],
                    "section_id": section_id,
                    "active_characters": [],
                    "chunk_summary": chunk.page_content[:150] + "...",
                    "source": f"gutenberg_{book_info['gutenberg_id']}"
                }
                
                vector = get_serverless_embedding(chunk.page_content)
                vector_id = f"chunk_{start_id + len(vectors_to_upsert)}"
                
                vectors_to_upsert.append({
                    "id": vector_id,
                    "values": vector,
                    "metadata": payload
                })
                
                if len(vectors_to_upsert) >= 50:
                    pinecone_index.upsert(vectors=vectors_to_upsert)
                    print(f"  -> Upserted batch of 50 vectors to Pinecone...")
                    start_id += len(vectors_to_upsert)
                    vectors_to_upsert = []
                    time.sleep(1)

        if vectors_to_upsert:
            pinecone_index.upsert(vectors=vectors_to_upsert)
            print(f"  -> Upserted remaining {len(vectors_to_upsert)} vectors to Pinecone.")
    else:
        print(f"  -> [Pinecone] Vectors already exist, skipping embedding upload.")

    register_book_in_redis_catalog(book_id_str, book_info)
    print(f"  -> Completed sync for '{book_id_str}'!")


def run_multi_category_bulk_ingestion(books_per_category: int = 5, start_page: int = 1, total_pages: int = 1):
    """
    Runs automated ingestion across multiple pages to fetch new books continuously.
    """
    total_processed = 0
    
    for page in range(start_page, start_page + total_pages):
        print(f"\n==========================================")
        print(f"   STARTING BATCH FOR API PAGE: {page}")
        print(f"==========================================\n")
        
        for category in CATEGORIES:
            catalog = fetch_books_by_category(category, limit_per_category=books_per_category, page=page)
            
            for book_id_str, book_info in catalog.items():
                try:
                    process_and_push_book(book_id_str, book_info)
                    total_processed += 1
                except Exception as e:
                    print(f"Error processing book '{book_id_str}': {e}")
                    
    print(f"\n[Bulk Ingestion] Complete! Processed/checked {total_processed} books.")


def run_automated_next_batch(books_per_category: int = 5):
    """
    Automatically tracks the last ingested page in Redis so every run
    pulls the next batch of fresh books without touching code.
    """
    # 1. Fetch current page cursor from Redis (default to page 1)
    current_page = 1
    if REDIS_AVAILABLE and redis_client:
        try:
            saved_page = redis_client.get("ingest:last_page")
            if saved_page:
                current_page = int(saved_page)
        except Exception:
            current_page = 1

    print(f"\n==========================================")
    print(f"   AUTO-INGESTING API PAGE: {current_page}")
    print(f"==========================================\n")

    total_processed = 0
    for category in CATEGORIES:
        catalog = fetch_books_by_category(category, limit_per_category=books_per_category, page=current_page)
        
        for book_id_str, book_info in catalog.items():
            try:
                process_and_push_book(book_id_str, book_info)
                total_processed += 1
            except Exception as e:
                print(f"Error processing book '{book_id_str}': {e}")

    # 2. Advance page cursor in Redis for the next run
    if REDIS_AVAILABLE and redis_client:
        redis_client.set("ingest:last_page", current_page + 1)
        print(f"\n[Cursor Updated] Next run will automatically process Page {current_page + 1}.")

    print(f"\n[Bulk Ingestion] Batch complete! Processed {total_processed} books.")




def register_book_in_redis_catalog(book_id_str: str, book_info: dict):
    """
    Dynamically registers a newly ingested book into the Upstash Redis catalog
    so the Next.js frontend discovers it on the next catalog fetch.
    """
    if not REDIS_AVAILABLE or not redis_client:
        return

    try:
        # 1. Update app:book_catalog list
        existing_catalog_raw = redis_client.get("app:book_catalog")
        existing_catalog = []
        if existing_catalog_raw:
            existing_catalog = json.loads(existing_catalog_raw) if isinstance(existing_catalog_raw, (str, bytes)) else existing_catalog_raw

        # Check if already present in the catalog
        if not any(b.get("id") == book_id_str for b in existing_catalog):
            author_name = book_info.get("author", "Unknown Author")
            new_entry = {
                "id": book_id_str,
                "title": book_info.get("title", book_id_str.replace("_", " ").title()),
                "category": book_info.get("category", "General"),
                "author": author_name,
                "desc": f"A classic work of {book_info.get('category', 'literature')} by {author_name}."
            }
            existing_catalog.append(new_entry)
            redis_client.set("app:book_catalog", json.dumps(existing_catalog))
            print(f"  -> [Catalog Synced] Added '{book_info.get('title')}' to frontend catalog in Redis.")

        # 2. Update app:gutenberg_map dictionary
        existing_map_raw = redis_client.get("app:gutenberg_map")
        existing_map = {}
        if existing_map_raw:
            existing_map = json.loads(existing_map_raw) if isinstance(existing_map_raw, (str, bytes)) else existing_map_raw

        if book_id_str not in existing_map and book_info.get("gutenberg_id"):
            existing_map[book_id_str] = book_info["gutenberg_id"]
            redis_client.set("app:gutenberg_map", json.dumps(existing_map))

    except Exception as e:
        print(f"  [Catalog Warning] Failed to update Redis catalog: {e}")



if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk ingest books from Gutenberg.")
    parser.add_argument("--page", type=int, default=1, help="Gutendex page number to fetch")
    parser.add_argument("--limit", type=int, default=5, help="Number of books per category")
    
    args = parser.parse_args()
    
    run_multi_category_bulk_ingestion(books_per_category=args.limit, start_page=args.page, total_pages=1)