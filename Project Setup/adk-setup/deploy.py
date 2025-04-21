from google.cloud import aiplatform
from vertexai import agent_engines
from vana.agents.team import root_agent
import os

# Initialize Vertex AI
aiplatform.init(
    project=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("GOOGLE_CLOUD_LOCATION")
)

# Define requirements for deployment
requirements = [
    "google-cloud-aiplatform[adk,agent_engines]",
    "google-adk",
    "python-dotenv"
]

# Deploy to Agent Engine
print("Deploying VANA agent team to Vertex AI Agent Engine...")
remote_app = agent_engines.create(
    agent_engine=root_agent,
    requirements=requirements,
    display_name="VANA Multi-Agent System",
    description="Production deployment of VANA agent team with ADK"
)

print(f"Agent deployed successfully!")
print(f"Agent ID: {remote_app.name}")
print(f"View in Cloud Console: https://console.cloud.google.com/vertex-ai/generative/agents/{remote_app.name.split('/')[-1]}")
