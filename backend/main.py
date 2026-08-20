import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.rag.engine import (
    retrieve_and_generate_pov,
    get_section_characters,
    get_original_section_text,
    query_narrative_graph
)

app = FastAPI(title="Character POV & GraphRAG API", version="1.0")

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