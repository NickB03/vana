# Korvus Config

This module exposes the `/embed` and `/search` endpoints via FastAPI. Korvus runs in GCP Cloud Run as a container service.

## Structure

- `korvus_writer.py` = embed + log to Supabase
- `korvus_search.py` = recall memory via Supabase +pgvector
- `embedder.py` = Vertex AI embedding model
- `server.py` = API wrapper (FastAPI)
- `gemini_client.py` = Text/Chat bison access via Vertex AI 
- `agent_bridge.py` = cordinates LLM + embed + supported logging

## Endpoints

### /embed
- Receives [text, user_id, agent_id]
- Generates embedding via Vertex AI - textembedding-gecko
- Stores in Supabase `vector_index`

## /search
- Receives a memory request **query**
- Returns closest content by cosine similarity
- Built on top of Supabase `vector_index`

## Deployment
- Runs as a Cloud Run service
- Service name: korvus-vana
- Authorized via vertex-sa
- Uses secret key or service account with JWT header
- Supabase secure auth token used for insert/search
~ Websucket: https://github.com/NickB03/vana