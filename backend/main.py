import json
import os
from typing import Optional

from fastapi import BackgroundTasks, FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pinecone import Pinecone
from pydantic import BaseModel
from upstash_redis import Redis
from backend.rag.engine import (
    retrieve_and_generate_pov,
    get_section_characters,
    get_original_section_text,
    query_narrative_graph
)
from backend.ingestion.bulk_ingest import run_multi_category_bulk_ingestion


app = FastAPI(title="Character POV & GraphRAG API", version="1.0")

# Initialize DB connections for admin operations
try:
    redis_admin = Redis(
        url=os.getenv("UPSTASH_REDIS_REST_URL"),
        token=os.getenv("UPSTASH_REDIS_REST_TOKEN")
    )
    redis_admin.ping()
except Exception:
    redis_admin = None

try:
    pc_admin = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    pinecone_index_admin = pc_admin.Index(os.getenv("PINECONE_INDEX_NAME", "literary-pov-master"))
except Exception:
    pinecone_index_admin = None

ADMIN_SECRET_KEY = os.getenv("ADMIN_SECRET_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class POVRequest(BaseModel):
    book_id: str
    section_id: int
    target_character: str


class GraphSearchRequest(BaseModel):
    book_id: str
    section_id: int
    query: str

@app.get("/")
def root():
    return {"message": "Character POV & GraphRAG API is running!"}



class AdminIngestRequest(BaseModel):
    books_per_category: int = 5
    page: int = 1


class AdminClearStorageRequest(BaseModel):
    clear_redis: bool = False
    clear_pinecone: bool = False
    

@app.post("/api/admin/bulk-ingest")
async def trigger_admin_bulk_ingest(
    request: AdminIngestRequest,
    background_tasks: BackgroundTasks,
    x_admin_secret: Optional[str] = Header(None)
):
    """Protected admin endpoint to trigger bulk ingestion in the background."""
    if x_admin_secret != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Secret Key.")
    
    # Run bulk ingestion in the background so API responds instantly
    background_tasks.add_task(
        run_multi_category_bulk_ingestion,
        books_per_category=request.books_per_category,
        start_page=request.page,
        total_pages=1
    )
    
    return {
        "status": "success",
        "message": f"Bulk ingestion started in background for page {request.page} ({request.books_per_category} books/category)."
    }



@app.post("/api/admin/clear-storage")
def clear_storage_endpoint(
    request: AdminClearStorageRequest,
    x_admin_secret: Optional[str] = Header(None)
):
    """Protected endpoint to clear Upstash Redis cache and/or Pinecone vectors."""
    if x_admin_secret != ADMIN_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: Invalid Admin Secret Key.")

    results = []

    # 1. Clear Redis Cache (raw text, dynamic chars, rolling summaries, cached POVs)
    if request.clear_redis:
        if not redis_admin:
            results.append("Redis client unavailable.")
        else:
            try:
                patterns = ["rawtext:*", "chars:*", "summary:*", "pov:*"]
                keys_to_delete = []
                for p in patterns:
                    matched = redis_admin.keys(p)
                    if matched:
                        keys_to_delete.extend(matched)

                unique_keys = list(set(keys_to_delete))
                for k in unique_keys:
                    redis_admin.delete(k)

                results.append(f"Cleared {len(unique_keys)} keys from Upstash Redis.")
            except Exception as e:
                results.append(f"Redis clear error: {str(e)}")

    # 2. Clear Pinecone Index Vectors
    if request.clear_pinecone:
        if not pinecone_index_admin:
            results.append("Pinecone index unavailable.")
        else:
            try:
                pinecone_index_admin.delete(delete_all=True)
                results.append("Deleted all vector embeddings from Pinecone index.")
            except Exception as e:
                results.append(f"Pinecone clear error: {str(e)}")

    if not request.clear_redis and not request.clear_pinecone:
        return {"status": "noop", "message": "No storage targets were selected."}

    return {
        "status": "success",
        "message": " | ".join(results)
    }



@app.post("/api/graph-search")
def graph_search_endpoint(request: GraphSearchRequest):
    try:
        result = query_narrative_graph(
            book_id=request.book_id,
            section_id=request.section_id,
            query=request.query
        )
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/characters")
def get_characters_endpoint(book_id: str, section_id: int = 1):
    try:
        characters = get_section_characters(book_id, section_id)
        return {"book_id": book_id, "section_id": section_id, "characters": characters}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/section-text")
def get_section_text_endpoint(book_id: str, section_id: int = 1):
    """Fetches the original, raw chapter text directly from vector storage."""
    try:
        raw_text = get_original_section_text(book_id, section_id)
        return {"book_id": book_id, "section_id": section_id, "original_text": raw_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate-pov")
def generate_pov_endpoint(request: POVRequest):
    try:
        result = retrieve_and_generate_pov(
            book_id=request.book_id,
            section_id=request.section_id,
            target_character=request.target_character
        )
        return {
            "book_id": request.book_id,
            "section_id": request.section_id,
            "character": request.target_character,
            "content": result.get("pov_content", ""),
            "original_text": result.get("original_text", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/catalog")
def get_catalog_endpoint():
    """Fetches the full book catalog from Upstash Redis."""
    try:
        from backend.rag.engine import redis_client, REDIS_AVAILABLE
        if REDIS_AVAILABLE:
            data = redis_client.get("app:book_catalog")
            if data:
                return {"books": json.loads(data) if isinstance(data, str) else data}
        
        # Fallback default catalog if Redis key is missing
        return {
            "books": [
                {"id": "frankenstein", "title": "Frankenstein", "category": "horror", "author": "Mary Shelley", "desc": "A gothic masterpiece."},
                {"id": "pride_and_prejudice", "title": "Pride and Prejudice", "category": "romance", "author": "Jane Austen", "desc": "A classic comedy of manners."},
                {"id": "dracula", "title": "Dracula", "category": "horror", "author": "Bram Stoker", "desc": "The iconic epistolary novel."},
                {"id": "the_adventures_of_sherlock_holmes", "title": "The Adventures of Sherlock Holmes", "category": "mystery", "author": "Arthur Conan Doyle", "desc": "Stories featuring the consulting detective."}
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))