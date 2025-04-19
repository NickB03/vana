
"""
KorvusWriter — wraps text -> chunk -> embed -> log pipeline
"""

from korvus_client import KorvusClient
from n8n_logger import N8NLogger
from embedder import chunk_text

korvus = KorvusClient()
logger = N8nLogger()

def log_memory(text, metadata: dict):
    chunks = chunk_text(text)
    for chunk in chunks:
        embedding = korvus.embed_text(chunk, metadata)
        logger.log_action(
            agent_id=metadata["agent_id"],
            user_id=metadata["user_id"],
            project_id=metadata.get("project_id"),
            action_type=metadata.get("action_type", "output"),
            summary=metadata.get("summary", chunk[:50]),
            content=chunk
        )
