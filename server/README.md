# FastAPI Chatbot Backend

This backend accepts up to 10 PDF files at once, uses Pinecone or ChromaDB for vector database, and exposes endpoints for PDF upload and chat. Integrate with your React frontend for a complete RAG chatbot solution.

## Features
- Upload up to 10 PDF files
- Store and query document embeddings using Pinecone or ChromaDB
- Chat endpoint for user queries

## Setup
1. Install dependencies:
   ```zsh
   pip install fastapi uvicorn pypdf pinecone-client chromadb sentence-transformers
   ```
2. Run the server:
   ```zsh
   uvicorn main:app --reload
   ```

## Endpoints
- `POST /upload_pdfs`: Upload up to 10 PDFs
- `POST /chat`: Ask questions based on uploaded PDFs

## Environment Variables
- Configure Pinecone/ChromaDB API keys as needed

## Next Steps
- Connect your React frontend in the `client` folder to these endpoints.
