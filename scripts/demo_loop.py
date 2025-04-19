
"""
Demo: Run a test agent prompt through Gemini – Korvus — n8n
"""

from korvus_config.agent_bridge import run_agent

if __name__ == "__main__":
    metadata = {
        "user_id": "demo_user",
        "agent_id": "sage",
        "project_id": "demo_project",
        "action_type": "task",
        "summary": "Demo agent feedback loop"
    }

    response = run_agent("What would be a great onboarding flow for an AI assistant?", metadata)
    print("\n--- Agent Output ---\n")
    print(response)
