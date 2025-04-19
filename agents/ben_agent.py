"""
"Ben Agent – DevOps strategist with memory-aware task execution

Handles:
- RAG query via Korvus
- Gemini prompt assembly
- Logging action output to Supbase
- Task type: deploy, plan, evaluate
"""

class BenAgent:
    def __init__(self, user_id, project_id=None):
        self.agent_id = "ben"
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
        formatted_context = \"\\n---\\n\".join(context_blocks)
        return f"`
 AGENT: {self.agent_id}
PROJECT: {self.project_id or "unspecified"}

TANK:
{formatted_context}

{self.task}

---

RESPONSE: 
`"

    def run_llm(self, assembled_prompt: str, gemini_client):
        return gemini_client.generate(prompt=assembled_prompt)

    def log_action(self, output: str, summary: str, n8n_logger):
        return n8n_logger.log_action(
            agent_id=self.agent_id,
            user_id=self.user_id,
            project_id=self.project_id,
            action_type="plan",
            summary=summary,
            content=output
        )
