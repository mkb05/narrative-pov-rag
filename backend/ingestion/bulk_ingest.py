import os
import requests
from dotenv import load_dotenv
from ingest import (
    embeddings_model, 
    extract_chunk_metadata, 
    groq_client, 
    PINECONE_INDEX_NAME, 
    pinecone_index
)
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

GUTENDEX_API_URL = "https://gutendex.com/books"

# Define multiple literary categories/topics to fetch books from
CATEGORIES = [
    "fiction",
    "romance",
    "mystery",
    "adventure",
    "horror",
    "history",
    "poetry",
    "science fiction",
    "fantasy",
    "drama"
]

def fetch_books_by_category(category: str, limit_per_category: int = 10):
    """
    Queries Gutendex API for English books matching a specific category/topic.
    """
    print(f"[Gutendex API] Fetching up to {limit_per_category} English books for category: '{category}'...")
    response = requests.get(f"{GUTENDEX_API_URL}?languages=en&topic={category}")
    
    if response.status_code != 200:
        print(f"Failed to fetch catalog for topic '{category}']. Status: {response.status_code}")
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
                "title": book["title"],
                "url": text_url,
                "category": category
            }
            
    return catalog

def fetch_and_clean_text(text_url: str) -> str:
    """Downloads raw text from the direct Gutenberg text URL and strips boilerplate."""
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
    """Chunks, extracts metadata via Groq, and upserts a book into Pinecone."""
    print(f"\n--- Processing [{book_info['category'].upper()}] Book: {book_info['title']} (ID: {book_info['gutenberg_id']}) ---")
    
    raw_text = fetch_and_clean_text(book_info["url"])
    documents = [Document(page_content=raw_text, metadata={"source": f"gutenberg_id_{book_info['gutenberg_id']}", "category": book_info['category']})]
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )
    
    chunks = text_splitter.split_documents(documents)
    print(f"Successfully split into {len(chunks)} semantic chunks. Extracting metadata via Groq...")

    vectors_to_upsert = []
    stats = pinecone_index.describe_index_stats()
    start_id = stats.get("total_vector_count", 0)

    for idx, chunk in enumerate(chunks[:5]):  # Process chunks[:5] for test runs; remove slice for full book ingestion
        meta = extract_chunk_metadata(chunk.page_content, book_id_str, idx)
        
        payload = {
            "text": chunk.page_content,
            "page_content": chunk.page_content,
            "book_id": book_id_str,
            "category": book_info["category"],
            "section_id": int(meta.get("section_id", idx)),
            "active_characters": list(meta.get("active_characters", [])),
            "chunk_summary": str(meta.get("summary", "")),
            "source": f"gutenberg_{book_info['gutenberg_id']}"
        }
        
        vector = embeddings_model.embed_query(chunk.page_content)
        vector_id = f"chunk_{start_id + idx}"
        
        vectors_to_upsert.append({
            "id": vector_id,
            "values": vector,
            "metadata": payload
        })
        print(f"Processed Chunk {idx}: Section {payload['section_id']} | Characters: {payload['active_characters']}")

    pinecone_index.upsert(vectors=vectors_to_upsert)
    print(f"Successfully uploaded {len(vectors_to_upsert)} vectors for '{book_id_str}' to Pinecone!")

def run_multi_category_bulk_ingestion(books_per_category: int = 10):
    """Iterates through multiple categories and runs automated ingestion for 10 books each."""
    print(f"[Bulk Ingestion] Starting multi-category batch ingestion ({books_per_category} books per category)...\n")
    
    total_processed = 0
    for category in CATEGORIES:
        catalog = fetch_books_by_category(category, limit_per_category=books_per_category)
        print(f"Found {len(catalog)} books for category '{category}'. Starting upload...")
        
        for book_id_str, book_info in catalog.items():
            try:
                process_and_push_book(book_id_str, book_info)
                total_processed += 1
            except Exception as e:
                print(f"Error processing book '{book_id_str}': {e}")
                
    print(f"\n[Bulk Ingestion] Multi-category ingestion complete! Successfully processed {total_processed} books across all categories.")

if __name__ == "__main__":
    run_multi_category_bulk_ingestion(books_per_category=10)