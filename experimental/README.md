# Experimental Layer: Rapid Memory Prototyping

This folder contains optional components not meant for production use -- created solely for testing features (like memory search, embeddings, context injection) ahead of full integration into the agent system.

---

## Purpose
To provide a minimal RAG pipeline based on patterns shown in [YouTube tutorial](https://youtube.com/weXrbtqNIqI?si=IR48saR1kThQ5V63), useful for:
- Rapid context injection while Korvus API is under construction
- Prototyping memory grounding without deploying full Supabase
- Testing Gemini or OpenRouter-backed RAG flows

---

## 🔍  What This Is
- A temporary memory service using vector search (e.g. ChromaDB or FAISS)
- Basic FastAPI or Flask endpoint to retrieve context chunks
- Hardcoded or folder-based document ingestion

## 🔍 What This Is NOT
- Not agent-driven
- Not integrated with Supabase or cloud logging
- Not production-performant or secure

---

## When to Use
Use this if:
- Need to test a memory-backed response
- Are evaluating Gemini output with or without retrieved context
- Want to iterate on chunking/embedding strategies in isolation

---

## Folder Status
This folder may be deleted once the Korvus API and Supabase memory loop are live.

---

## Next
Want me to stub out `fast_rag_server.py` in here next?