# 📖 The Chronicle of Perspectives
### *Hybrid RAG & GraphRAG Literary Perspective Engine*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Pinecone](https://img.shields.io/badge/Pinecone-Serverless_Vector_DB-blue?style=flat-square)](https://www.pinecone.io/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Aura_Graph_DB-008CC1?style=flat-square&logo=neo4j&logoColor=white)](https://neo4j.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash-Redis_Cache-00E599?style=flat-square&logo=redis&logoColor=white)](https://upstash.com/)
[![Groq Cloud](https://img.shields.io/badge/Groq-LPU_Inference-F05A28?style=flat-square)](https://groq.com/)

**The Chronicle of Perspectives** is an interactive, multi-perspective literary platform built with a vintage newspaper aesthetic. It allows readers to explore public-domain literature both canonically and through the internal monologues of individual characters, while using GraphRAG to trace relationship shifts and enforce spoiler-proof timeline boundaries.

---

## 🌟 Key Features

* **🎭 Dynamic Character POV Rewriting:** Select any chapter and experience the narrative rewritten in the first-person voice and psychological framing of active characters using `openai/gpt-oss-120b`.
* **⚡ Zero-Token Reading & Multi-Tier Caching:** Unchunked canonical chapter texts, dynamic character rosters, rolling narrative summaries, and generated monologues are cached in **Upstash Redis** to eliminate redundant LLM token spend.
* **🕸️ GraphRAG Relational Search:** Powered by **Neo4j Aura** and **Cypher**, enabling multi-hop character queries, temporal relationship tracking via a section slider, and strict spoiler-prevention boundaries.
* **📥 Background Ingestion Pipeline:** Uses FastAPI `BackgroundTasks` to parse, clean (stripping Gutenberg boilerplates), segment, and vectorize books on demand.
* **🛠️ Protected Admin Operations Console:** Password-authenticated dashboard (`/admin`) to trigger batch literature ingestion from Gutendex or selectively purge Redis cache and Pinecone indexes.



## 🏗️ System Architecture
```
[ Next.js 14 Newspaper UI / Admin Panel ]
│
▼ (HTTP / REST)
[ FastAPI Backend Router ]
├── Background Ingestion Worker ──► [ Gutendex / Gutenberg APIs ]
│                                 ├──► [ Upstash Redis ] (Raw Text, Caches, Catalogs)
│                                 ├──► [ Pinecone Vector DB ] (Dense 1024-dim Embeddings)
│                                 └──► [ Neo4j Aura ] (Entity-Relationship Graph)
│
└── Query & Synthesis Engine ─────► [ Pinecone ] (Metadata-Filtered Vector Context)
├──► [ Neo4j ] (Cypher Subgraph Traversal)
└──► [ Groq Cloud LPU ] (POV Synthesis & Extraction)

```


## 🛠️ Tech Stack

* **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React Markdown
* **Backend:** Python 3.11, FastAPI, Pydantic, Uvicorn
* **AI & LLM Orchestration:** Groq Cloud API (`compound-mini`, `gpt-oss-120b`), LangChain
* **Vector Database:** Pinecone (Serverless)
* **Graph Database:** Neo4j Aura (Cypher queries)
* **Cache & Document Store:** Upstash Redis

---

## 📂 Project Structure

```text
├── backend/
│   ├── ingestion/
│   │   ├── ingest.py            # Text parsing, chunking, and embedding pipeline
│   │   └── bulk_ingest.py       # Multi-category batch processing script
│   ├── rag/
│   │   └── engine.py            # RAG retrieval, Redis caching, and POV synthesis
│   ├── main.py                  # FastAPI API gateway and admin endpoints
│   └── seed_catalog.py          # Initial catalog seed script
├── frontend/
│   └── src/
│       └── app/
│           ├── page.tsx         # Newspaper reading room & POV workspace
│           ├── admin/
│           │   └── page.tsx     # Ingestion & storage reset admin console
│           ├── layout.tsx
│           └── globals.css
├── requirements.txt
└── README.md
```

🚀 Getting Started

1. Prerequisites
Node.js 18+ and npm
Python 3.10+

Free accounts/keys for: Groq Cloud, Pinecone, Upstash Redis, and Neo4j Aura

2. Environment Variables
Create a .env file in the root directory:

# Groq
GROQ_API_KEY_GENERATION="gsk_..."

# Pinecone
PINECONE_API_KEY="pcsk_..."
PINECONE_INDEX_NAME="literary-pov-master"

# Upstash Redis
UPSTASH_REDIS_REST_URL="[https://...upstash.io](https://...upstash.io)"
UPSTASH_REDIS_REST_TOKEN="..."

# Neo4j Aura (GraphRAG)
NEO4J_URI="neo4j+s://..."
NEO4J_USERNAME="neo4j"
NEO4J_PASSWORD="..."

# Admin Security
ADMIN_SECRET_KEY="your-secure-admin-passphrase"


In frontend/.env.local:

NEXT_PUBLIC_API_URL="[http://127.0.0.1:8000](http://127.0.0.1:8000)"


3. Backend Setup

   # Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000


4. Frontend Setup

cd frontend
npm install
npm run dev


Open http://localhost:3000 to view the newspaper reading room or http://localhost:3000/admin to access the operations console.

📄 License
This project is open-source and available under the MIT License.

   
