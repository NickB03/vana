
"""
KorvusSearcher — query memory chunks from Korvus with filters
"""

from korvus_client import KorvusClient

korvus = KorvusClient()

def search_memory(prompt, user_id=None, agent_id=None, project_id=None, top_k=5):
    return korvus.query_memory(prompt=prompt, user_id=user_id, agent_id=agent_id, project_id=project_id, top_k=top_k)
