import os
import json
from bs4 import BeautifulSoup
from ebooklib import epub
from dotenv import load_dotenv
from groq import Groq
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from pinecone import Pinecone
from langchain_pinecone import PineconeVectorStore

# Load environment variables from root .env file
load_dotenv()

# Initialize Groq client using your fast ingestion model key
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY_INGESTION"))

# Initialize Pinecone Client
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "literary-pov-master")

pc = Pinecone(api_key=PINECONE_API_KEY)
pinecone_index = pc.Index(PINECONE_INDEX_NAME)

# Initialize a lightweight, free local embedding model
embeddings_model = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def load_epub_book(file_path: str):
    """Extracts clean plain text from an EPUB file using EbookLib and BeautifulSoup."""
    print(f"Unpacking and parsing EPUB book from {file_path}...")
    book = epub.read_epub(file_path)
    chapters = []

    for item in book.get_items():
        if item.get_type() == 9 or (hasattr(item, "media_type") and item.media_type == "application/xhtml+xml"):
            soup = BeautifulSoup(item.get_content(), "html.parser")
            text = soup.get_text()
            if text.strip():
                chapters.append(text)

    full_book_text = "\n\n".join(chapters)
    return [Document(page_content=full_book_text, metadata={"source": file_path})]

def extract_chunk_metadata(chunk_text: str, book_title: str, chunk_index: int):
    """
    Uses llama-3.1-8b-instant to extract active characters and assign a section ID.
    """
    prompt = f"""
    Analyze the following book excerpt from '{book_title}' (Chunk {chunk_index}).
    Extract the following information and return ONLY a valid JSON object with these keys:
    - "section_id": An integer representing the estimated logical section or chapter sequence number.
    - "active_characters": A list of string names of characters explicitly present or actively mentioned as interacting in this specific chunk.
    - "summary": A concise 1-sentence summary of what happens in this chunk.

    Excerpt:
    {chunk_text[:1500]}
    """

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Metadata extraction failed for chunk {chunk_index}: {e}")
        return {"section_id": chunk_index // 10, "active_characters": [], "summary": ""}

def push_chunks_to_pinecone(chunks):
    """
    Converts chunks to vector embeddings and pushes them to Pinecone with metadata payloads.
    """
    print(f"\nConnecting to Pinecone index: '{PINECONE_INDEX_NAME}'...")
    
    print("Generating embeddings and uploading vectors to Pinecone...")
    
    vectors_to_upsert = []
    
    # Get current stats or set a base ID counter
    stats = pinecone_index.describe_index_stats()
    start_id = stats.get("total_vector_count", 0)

    for idx, chunk in enumerate(chunks):
        vector = embeddings_model.embed_query(chunk.page_content)
        
        # Pinecone metadata values must be strings, numbers, or lists of strings
        payload = {
            "page_content": chunk.page_content,
            "book_id": str(chunk.metadata.get("book_id")),
            "section_id": int(chunk.metadata.get("section_id", 0)),
            "active_characters": list(chunk.metadata.get("active_characters", [])),
            "chunk_summary": str(chunk.metadata.get("chunk_summary", "")),
            "source": str(chunk.metadata.get("source", ""))
        }
        
        vector_id = f"chunk_{start_id + idx}"
        vectors_to_upsert.append({
            "id": vector_id,
            "values": vector,
            "metadata": payload
        })

    # Upsert in batches to Pinecone
    pinecone_index.upsert(vectors=vectors_to_upsert)
    print(f"Successfully uploaded {len(vectors_to_upsert)} vectors with metadata payloads to Pinecone index '{PINECONE_INDEX_NAME}'!")

def load_and_chunk_book(file_path: str, chunk_size: int = 3000, chunk_overlap: int = 200):
    """Loads a book, chunks it, attaches metadata, and pushes to Pinecone."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Book file not found at path: {file_path}")

    if file_path.endswith(".epub"):
        documents = load_epub_book(file_path)
    elif file_path.endswith(".txt"):
        print(f"Loading text file from {file_path}...")
        loader = TextLoader(file_path, encoding="utf-8")
        documents = loader.load()
    else:
        raise ValueError("Unsupported file format. Please provide a .txt or .epub file.")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", " ", ""],
    )

    chunks = text_splitter.split_documents(documents)
    print(f"Successfully split the book into {len(chunks)} semantic chunks. Extracting metadata...")

    enriched_chunks = []
    book_title = os.path.basename(file_path).split(".")[0].lower().replace(" ", "_")

    for idx, chunk in enumerate(chunks[:5]):  # Processing first 5 chunks for test run
        meta = extract_chunk_metadata(chunk.page_content, book_title, idx)
        chunk.metadata.update({
            "book_id": book_title,
            "section_id": meta.get("section_id", idx),
            "active_characters": meta.get("active_characters", []),
            "chunk_summary": meta.get("summary", "")
        })
        enriched_chunks.append(chunk)
        print(f"Processed Chunk {idx}: Book [{book_title}] | Section {chunk.metadata['section_id']} | Characters: {chunk.metadata['active_characters']}")

    # Push enriched chunks into Pinecone
    push_chunks_to_pinecone(enriched_chunks)
    return enriched_chunks

if __name__ == "__main__":
    sample_book_path = "data/frankenstein.epub"

    try:
        book_chunks = load_and_chunk_book(sample_book_path)
        print("\n--- Milestone 2 Complete: Stored in Pinecone Serverless Index ---")
        print(f"Total uploaded chunks processed: {len(book_chunks)}")

    except Exception as e:
        print(f"Error during ingestion test: {e}")