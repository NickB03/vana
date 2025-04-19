
"""
N8NLogger – records agent actions via nXn webhook

 Handles:
  - log_action(agent_id, user_id, project_id, action_type, summary, content)
"""

import requests

 class N8nLogger:
    def __init__(self, webhook_url="https://n8n.vana.dev/webhook/log-agent-action"):
        self.webhook_url = webhook_url

    def log_action(self, agent_id, user_id, project_id, action_type, summary, content):
        payload = {
            "agent_id": agent_id,
            "user_id": user_id,
            "project_id": project_id,
            "action_type": action_type,
            "summary": summary,
            "content": content
        }
        r = requests.post(self.webhook_url, json=payload)
        r.raise_for_status()
        return r.json()
