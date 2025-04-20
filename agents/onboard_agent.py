class AgentContext:
    def __init__(self, user_id, task, project_id=None):
        self.user_id = user_id
        self.task = task
        self.project_id = project_id


class OnboardAgent:
    def __init__(self, context: AgentContext):
        self.context = context
        self.agent_id = "onboard"

    def receive_task(self, task: str):
        self.context.task = task

    # Corrected signature to match other agents and resolve Pylance error
    def get_context(self, korvus_client):
        # Note: Implementation still returns hardcoded string, doesn't use korvus_client
        return "Generate agent team dynamically from local config."

    def run_llm(self, task: str, gemini_client):
        return gemini_client.generate(prompt=task)

    def post_process(self, response: str) -> str:
        return response

    # Added n8n_logger parameter and corrected n8 -> n8n_logger
    def log_action(self, output: str, summary: str, n8n_logger):
        return n8n_logger.log_action(
            agent_id=self.agent_id,
            user_id=self.context.user_id,
            project_id=self.context.project_id,
            action_type="task",
            summary=summary,
            content=output
        )
