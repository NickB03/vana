
"""
Sage Agent — RAG orchestration and n8n automation expert

Handles:
- RAG query via Korvus
- Prompt assembly
- Gemini response
- Memory logging to Supabase
"""

class SageAgent:
    def __init__(self, user_id, project_id=None):
        self.agent_id = "sage"
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
        formatted_context = "\n---\n".join(context_blocks)
        return f"""\nAGENT: {{self.agent_id}}\nPROJECT: {{self.project_id or 'unspecified'}}\n\nCONTEXT:\n{{formatted_context}}\n\nTASK:\n{{self.task}}\n\n---\n\nRESPONSE:\n"""

    def run_llm(self, assembled_prompt: str, gemini_client):
        return gemini_client.generate(prompt=assembled_prompt)

    def log_action(self, output: str, summary: str, n8n_logger):
        return n8n_logger.log_action(
            agent_id=self.agent_id,
            user_id=self.user_id,
            project_id=self.project_id,
            action_type="task",
            summary=summary,
            content=output
        )
