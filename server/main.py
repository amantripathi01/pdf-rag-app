from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
import uuid
import re
from fastapi.responses import JSONResponse
import openai
from dotenv import load_dotenv

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


# Initialize FastAPI App
app = FastAPI(
    title="PDF Vector Search API",
    description="Upload PDFs, store them in ChromaDB, and query using semantic search.",
    version="1.1.0",
)

# Allow all CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utility Functions
def split_text(text: str, max_length: int = 400, overlap: int = 20):
    """
    Split text into smaller chunks with slight overlap for embeddings.
    """
    sentences = text.split(". ")
    chunks, current_chunk = [], ""

    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= max_length:
            current_chunk += sentence + ". "
        else:
            chunks.append(current_chunk.strip())
            current_chunk = sentence[-overlap:] + ". "
    if current_chunk:
        chunks.append(current_chunk.strip())

    return [chunk for chunk in chunks if chunk.strip()]

def deduplicate_text(text: str) -> str:
    """
    Remove repeated sentences or phrases to avoid duplication in the answer.
    """
    sentences = re.split(r'(?<=[.!?]) +', text)
    seen = set()
    unique_sentences = []
    for s in sentences:
        s_clean = s.strip()
        if s_clean not in seen:
            seen.add(s_clean)
            unique_sentences.append(s_clean)
    return " ".join(unique_sentences)


PERSIST_DIR = "chroma_db"
UPLOAD_DIR = "uploaded_pdfs"

os.makedirs(PERSIST_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

chroma_client = chromadb.Client(Settings(persist_directory=PERSIST_DIR))
collection = chroma_client.get_or_create_collection(name="pdf_chunks")

# Load embedding model
embedder = SentenceTransformer("all-MiniLM-L6-v2")


@app.post("/upload_pdfs")
async def upload_pdfs(files: List[UploadFile] = File(...)):
    """
    Upload up to 10 PDFs, extract text, chunk, embed, and store in ChromaDB.
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 PDF files allowed.")
    
    saved_files = []

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail=f"{file.filename} is not a PDF.")

        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        saved_files.append(file_path)

        # Extract text page by page
        reader = PdfReader(file_path)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            chunks = split_text(text)

            if not chunks:
                continue

            embeddings = embedder.encode(chunks)
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                doc_id = f"{file.filename}_page{page_num}_chunk{i}_{uuid.uuid4().hex}"
                collection.add(
                    documents=[chunk],
                    embeddings=[embedding],
                    ids=[doc_id],
                    metadatas=[{"filename": file.filename, "page": page_num}],
                )

    return {"message": "PDFs uploaded and processed successfully.", "files": saved_files}

@app.post("/chat")
async def chat(query: str = Query(..., description="Your chat query"), n_results: int = 3):
    """
    Query the stored PDF data semantically and generate an answer using GPT-4.
    """
    query_embedding = embedder.encode([query])[0]
    results = collection.query(query_embeddings=[query_embedding], n_results=n_results)
    answers = results.get("documents", [[]])[0]

    if not answers:
        return {"answer": "No relevant information found."}

    context = "\n\n".join(answers)
    prompt = (
        f"Answer the following question using only the provided context.\n"
        f"Context:\n{context}\n\nQuestion: {query}\nAnswer:"
    )
    try:
        response = openai.chat.completions.create(
            model="gpt-4-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that answers questions using only the provided context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=512,
            temperature=0.2,
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        answer = f"Error from OpenAI: {str(e)}"
    return {"answer": answer}

@app.get("/list_pdfs")
def list_pdfs():
    """
    List all uploaded PDF files.
    """
    files = []
    upload_dir = "uploaded_pdfs"
    if os.path.exists(upload_dir):
        files = [os.path.join(upload_dir, f) for f in os.listdir(upload_dir) if f.lower().endswith(".pdf")]
    return JSONResponse({"files": files})

@app.post("/reprocess_pdfs")
def reprocess_pdfs():
    """
    Reprocess and embed all PDFs in uploaded_pdfs/ that are not already embedded in ChromaDB.
    Also, remove embeddings for PDFs that have been deleted from disk.
    """
    # Remove embeddings for deleted PDFs
    disk_files = set(os.listdir(UPLOAD_DIR))
    all_metadatas = collection.get()["metadatas"]
    ids = collection.get()["ids"]
    ids_to_delete = []
    for i, meta in enumerate(all_metadatas):
        if meta["filename"] not in disk_files:
            ids_to_delete.append(ids[i])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
    # Re-embed missing PDFs
    processed_files = set(meta["filename"] for meta in all_metadatas if meta["filename"] in disk_files)
    new_files = []
    for filename in disk_files:
        if filename.lower().endswith(".pdf") and filename not in processed_files:
            file_path = os.path.join(UPLOAD_DIR, filename)
            reader = PdfReader(file_path)
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                chunks = split_text(text)
                if not chunks:
                    continue
                embeddings = embedder.encode(chunks)
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    doc_id = f"{filename}_page{page_num}_chunk{i}_{uuid.uuid4().hex}"
                    collection.add(
                        documents=[chunk],
                        embeddings=[embedding],
                        ids=[doc_id],
                        metadatas=[{"filename": filename, "page": page_num}],
                    )
            new_files.append(file_path)
    return {"message": "Reprocessing complete.", "new_files": new_files, "deleted_chunks": len(ids_to_delete)}

@app.delete("/delete_pdf")
def delete_pdf(filename: str = Body(..., embed=True)):
    """
    Delete a PDF file from uploaded_pdfs, remove its chunks from ChromaDB.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return {"message": "File not found."}
    # Remove file from disk
    os.remove(file_path)
    # Remove all chunks from ChromaDB for this file
    ids_to_delete = []
    metadatas = collection.get()["metadatas"]
    ids = collection.get()["ids"]
    for i, meta in enumerate(metadatas):
        if meta["filename"] == filename:
            ids_to_delete.append(ids[i])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
    return {"message": "PDF deleted from disk and DB.", "deleted_file": filename, "deleted_chunks": len(ids_to_delete)}

@app.get("/")
def root():
    return {"message": "PDF Vector Search API is running!"}
