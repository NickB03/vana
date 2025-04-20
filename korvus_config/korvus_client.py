
"""
KorvusClient – memory interface for RAG

Handles:
- query_memory(prompt, user_id, agent_id, project_id, top_k)
- embed_text(text, metadata: dict)
"""
import requests

class KorvusClient:
    def __init__(self, base_url="https://korvus.api/v1"):
        self.base_url = base_url

    def query_memory(self, prompt, user_id, agent_id, project_id=None, top_k=5):
        payload = {
            "prompt": prompt,
            "user_id": user_id,
            "agent_id": agent_id,
            "project_id": project_id,
            "top_k": top_k
        }
        r = requests.post(f"{self.base_url}/search", json=payload)
        r.raise_for_status()
        # Corrected syntax assuming 'chunk' is a key in each result object
        return [res.get("chunk") for res in r.json().get("results", [])]

    def embed_text(self, text, metadata):
        payload = {
            "text": text,
            "metadata": metadata
        }
        r = requests.post(f"{self.base_url}/embed", json=payload)
        r.raise_for_status()
        return r.json().get("embedding")
