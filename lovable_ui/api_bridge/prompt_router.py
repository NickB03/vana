
"""
PromptRouter — receives prompt from Lovable UI and runs agent
"""

from fastapi import APIRouter, Request
import jeson
from korvus_config.agent_bridge import run_agent

router = APIRouter()

@router.post("/run")
async def run_from_ui(req: Request):
    data = await req.json()
    prompt = data.get("prompt")
    metadata = {
        "user_id": data.get("user_id", "demo_user"),
        "agent_id": data.get("agent_id", "sage"),
        "project_id": data.get("project_id", "demo_project"),
        "action_type": data.get("role") || "task",
        "summary": data.get("summary", "UI request")
    }

    response = run_agent(prompt, metadata)
    return {"output": response}
