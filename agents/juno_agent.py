class AgentContext:
    def __init__(self, user_id, task, project_id=None):
        self.user_id = user_id
        self.task = task
        self.project_id = project_id


class JunoAgent:
    def __init__(self, context: AgentContext):
        self.context = context
        self.agent_id = "juno" # Added closing quote

    def receive_task(self, task: str):
        self.context.task = task

    def get_context(self, korvus_client):
        return korvus_client.query_memory(
            prompt=self.context.task,
            user_id=self.context.user_id,
            agent_id=self.agent_id,
            project_id=self.context.project_id,
            top_k=5
        )

    def run_llm(self, assembled_prompt: str, gemini_client):
        return gemini_client.generate(prompt=assembled_prompt)

    # Corrected Python type hint syntax
    def post_process(self, response: str) -> str:
        return response

    # Added n8n_logger parameter to match ben_agent.py and likely intent
    def log_action(self, output: str, summary: str, n8n_logger):
        return n8n_logger.log_action(
            agent_id=self.agent_id,
            user_id=self.context.user_id,
            project_id=self.context.project_id,
            action_type="task",
            summary=summary,
            content=output
        )
