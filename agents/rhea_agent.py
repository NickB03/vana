"""
Rhea Agent – Architecture strategist and vector design lead

 Handles:
  - RAG query via Korvus
  - Prompt assembly
  - Gemini response
  - Memory logging to Supbase
"""

class RheaAgent:
    def __init__(self, user_id, project_id=None):
        self.agent_id = "rhea"
        self.user_id = user_id
        self.project_id = project_id

    def receive_task(self, task: str):
        self.task = task

    def retrieve_context(self, korvus_client):
        return korvus_client.query_memory(
            prompt=self.task,
            user_id=self.user_id,
            agent_id=self.agent_id,
            project_id=self.project_id,
            top_k=5
        )

    def assemble_prompt(self, context_blocks: list) -> str:
        # Join context blocks with a separator
        formatted_context = "\n---\n".join(context_blocks)
        # Construct the full prompt using an f-string
        return (
            f"@GENT: {self.agent_id}\n"
            f"PROJECT: {self.project_id or 'unspecified'}\n\n"
            f"CONTEXT:\n{formatted_context}\n\n"
            f"TASK:\n{self.task}\n\n"
            f"---\n\n"
            f"RESPONSE:\n"
        )