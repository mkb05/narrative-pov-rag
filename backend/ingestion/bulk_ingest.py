import os
import time
import requests
from dotenv import load_dotenv
from ingest import (
    get_serverless_embedding, 
    PINECONE_INDEX_NAME, 
    pinecone_index
)
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

GUTENDEX_API_URL = "https://gutendex.com/books"

# Define 10 literary categories
CATEGORIES = [
    "fiction", "romance", "mystery", "adventure", "horror",
    "history", "poetry", "science fiction", "fantasy", "drama"
]

def fetch_books_by_category(category: str, limit_per_category: int = 5):
    """Queries Gutendex API for English books."""
    print(f"[Gutendex API] Fetching up to {limit_per_category} books for category: '{category}'...")
    response = requests.get(f"{GUTENDEX_API_URL}?languages=en&topic={category}")
    
    if response.status_code != 200:
        print(f"Failed to fetch catalog for topic '{category}'. Status: {response.status_code}")
        return {}
    
    data = response.json()
    books = data.get("results", [])[:limit_per_category]
    
    catalog = {}
    for book in books:
        book_id = book["id"]
        title_slug = book["title"].lower().split(",")[0].strip().replace(" ", "_").replace(":", "").replace("'", "").replace("-", "_")
        
        formats = book.get("formats", {})
        text_url = formats.get("text/plain; charset=utf-8") or formats.get("text/plain")
        
        if text_url and book_id not in [item.get("gutenberg_id") for item in catalog.values()]:
            catalog[title_slug] = {
                "gutenberg_id": book_id,
                "title": book["title"].split('\n')[0],
                "url": text_url,
                "category": category
            }
            
    return catalog

def fetch_and_clean_text(text_url: str) -> str:
    """Downloads raw text and strips boilerplate."""
    response = requests.get(text_url)
    if response.status_code != 200:
        raise Exception(f"Failed to download text. Status: {response.status_code}")
        
    text = response.text
    start_marker = "*** START OF THE PROJECT GUTENBERG EBOOK"
    end_marker = "*** END OF THE PROJECT GUTENBERG EBOOK"
    
    if start_marker in text:
        text = text.split(start_marker)[1]
    if end_marker in text:
        text = text.split(end_marker)[0]
        
    return text.strip()

def process_and_push_book(book_id_str: str, book_info: dict, chunk_size: int = 3000, chunk_overlap: int = 200):
    """Chunks and batch-upserts a FULL book into Pinecone with ZERO Groq API calls."""
    print(f"\n--- Processing [{book_info['category'].upper()}] Book: {book_info['title']} (ID: {book_info['gutenberg_id']}) ---")
    
    raw_text = fetch_and_clean_text(book_info["url"])
    documents = [Document(page_content=raw_text, metadata={"source": f"gutenberg_id_{book_info['gutenberg_id']}", "category": book_info['category']})]
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"Successfully split into {len(chunks)} semantic chunks. Embedding and uploading...")

    vectors_to_upsert = []
    stats = pinecone_index.describe_index_stats()
    start_id = stats.get("total_vector_count", 0)

    # Process ALL chunks (Removed the [:5] slice constraint)
    for idx, chunk in enumerate(chunks): 
        # ZERO API CALLS: Programmatic metadata fallback
        payload = {
            "text": chunk.page_content,
            "page_content": chunk.page_content,
            "book_id": book_id_str,
            "category": book_info["category"],
            "section_id": (idx // 3) + 1,
            "active_characters": [],  # Leave empty engine.py will extract on-the-fly when read
            "chunk_summary": chunk.page_content[:100] + "...",
            "source": f"gutenberg_{book_info['gutenberg_id']}"
        }
        
        vector = get_serverless_embedding.embed_query(chunk.page_content)
        vector_id = f"chunk_{start_id + idx}"
        
        vectors_to_upsert.append({
            "id": vector_id,
            "values": vector,
            "metadata": payload
        })
        
        # Batch upsert every 50 vectors to prevent Pinecone payload size errors
        if len(vectors_to_upsert) >= 50:
            pinecone_index.upsert(vectors=vectors_to_upsert)
            print(f"  -> Upserted batch of 50 vectors...")
            vectors_to_upsert = []
            time.sleep(1) # Gentle pause for rate limits

    # Upsert any remaining vectors
    if vectors_to_upsert:
        pinecone_index.upsert(vectors=vectors_to_upsert)

    print(f"Successfully uploaded ALL vectors for '{book_id_str}' to Pinecone!")

def run_multi_category_bulk_ingestion(books_per_category: int = 5):
    """Iterates through 10 categories and ingests 5 books each (50 Total)."""
    print(f"[Bulk Ingestion] Starting batch ingestion ({books_per_category} books * {len(CATEGORIES)} categories = 50 books)...\n")
    
    total_processed = 0
    for category in CATEGORIES:
        catalog = fetch_books_by_category(category, limit_per_category=books_per_category)
        
        for book_id_str, book_info in catalog.items():
            try:
                process_and_push_book(book_id_str, book_info)
                total_processed += 1
            except Exception as e:
                print(f"Error processing book '{book_id_str}': {e}")
                
    print(f"\n[Bulk Ingestion] Complete! Successfully processed {total_processed} books.")

if __name__ == "__main__":
    # Runs 5 books across 10 categories
    run_multi_category_bulk_ingestion(books_per_category=5)