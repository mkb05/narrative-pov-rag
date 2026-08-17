from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.rag.engine import retrieve_and_generate_pov

app = FastAPI(title="Character POV & GraphRAG API", version="1.0")

# Enable CORS so your Next.js frontend can communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class POVRequest(BaseModel):
    book_id: str
    section_id: int
    target_character: str

@app.get("/")
def root():
    return {"message": "Character POV & GraphRAG API is running!"}

@app.post("/api/generate-pov")
def generate_pov_endpoint(request: POVRequest):
    """
    API endpoint that receives book_id, section_id, and target_character,
    runs the RAG pipeline, checks Redis cache, and returns the generated POV text.
    """
    try:
        output = retrieve_and_generate_pov(
            book_id=request.book_id,
            section_id=request.section_id,
            target_character=request.target_character
        )
        return {"book_id": request.book_id, "section_id": request.section_id, "character": request.target_character, "content": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))