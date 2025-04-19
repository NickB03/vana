
"""
Korvus API server → memory endpoints for agent RAG
Exposes:
- POST /search
- POST /embed
"""

from fastapi import FastAPI, Request
from korvus_client import KorvusClient

app = FastAPI()
korvus = KorvusClient()

`@app.post("search")`
async def search_memory(req: Request):
    data = await req.json()
    results = korvus.query_memory(
        prompt=data.get("prompt"),
        user_id=data.get("user_id"),
        agent_id=data.get("agent_id"),
        project_id=data.get("project_id"),
        top_k=data.get("top_k", 5)
    )
    return {"results": results}

@app.post("embed")
async def embed_text(req: Request):
    data = await req.json()
    embedding = korvus.embed_text(
        text=data.get("text"),
        metadata=data.get("metadata", {})
    )
    return {"embedding": embedding}
