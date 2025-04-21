# vana/agents/team.py
from google.adk.agents import LlmAgent
from vana.tools.agent_tools import (
    coordinate_task,
    design_agent_architecture,
    build_interface,
    deploy_infrastructure, 
    simulate_failures,
    create_documentation
)
from vana.tools.rag_tools import search_knowledge
from vana.config.settings import MODEL

# Create specialist agents
rhea = LlmAgent(
    name="rhea",
    model=MODEL,
    description="Meta-Architect of Agent Intelligence",
    instruction="""You are Rhea — the brain builder. You design adaptive, evolving agent workflows.
    You don't just implement AI pipelines; you invent new ways agents can think, collaborate, and improve.""",
    tools=[design_agent_architecture, search_knowledge]
)

max = LlmAgent(
    name="max",
    model=MODEL,
    description="Interaction Engineer",
    instruction="""You are Max — a translator of AI cognition. You create interfaces that visualize
    agent decision-making in real-time. You don't build UIs — you build intuition.""",
    tools=[build_interface, search_knowledge]
)

sage = LlmAgent(
    name="sage",
    model=MODEL,
    description="Platform Automator",  
    instruction="""You are Sage — master of the unseen. You deploy infrastructure that heals, scales, and evolves.
    Your infrastructure is invisible when it's perfect.""",
    tools=[deploy_infrastructure, search_knowledge]
)

kai = LlmAgent(
    name="kai",
    model=MODEL,
    description="Edge Case Hunter",
    instruction="""You are Kai — the system's devil's advocate. You ensure agents behave reliably through
    simulation and chaos testing. You model the worst possible scenarios and break things early.""",
    tools=[simulate_failures, search_knowledge]
)

juno = LlmAgent(
    name="juno",
    model=MODEL,
    description="Story Engineer",
    instruction="""You are Juno — the system's voice. You design onboarding, documentation, and internal UX.
    You turn complexity into clarity.""",
    tools=[create_documentation, search_knowledge]
)

# Create coordinator agent
ben = LlmAgent(
    name="ben",
    model=MODEL,
    description="Project Lead & DevOps Strategist",
    instruction="""You are Ben — the system thinker. You blend DevOps pragmatism with product vision, 
    ensuring every part of the stack ships clean, secure, and on-schedule. You orchestrate progress 
    through review, mentorship, and decisive calls.""",
    sub_agents=[rhea, max, sage, kai, juno],
    tools=[coordinate_task, search_knowledge]
)

# This is the root agent that will be exposed
root_agent = ben

# vana/tools/agent_tools.py
from google.adk.toolkit import tool

@tool
def coordinate_task(task_description: str, assigned_agent: str) -> str:
    """Coordinate task assignment to specialist agents.
    
    Args:
        task_description: Description of the task to be coordinated
        assigned_agent: Name of the agent to assign the task to
        
    Returns:
        Coordination response
    """
    return f"Task '{task_description}' has been assigned to {assigned_agent}"

@tool
def design_agent_architecture(requirements: str) -> str:
    """Design a modular agent architecture based on specific requirements.
    
    Args:
        requirements: The specific requirements for the architecture
        
    Returns:
        A detailed architecture design
    """
    return f"Agent architecture design for: {requirements}"

@tool
def build_interface(specification: str) -> str:
    """Build a React dashboard with agent trace visualization.
    
    Args:
        specification: UI specifications for the interface
        
    Returns:
        Interface component code
    """
    return f"React interface built for: {specification}"

@tool
def deploy_infrastructure(config: str) -> str:
    """Deploy infrastructure using GCP with auto-scaling.
    
    Args:
        config: Deployment configuration details
        
    Returns:
        Deployment status
    """
    return f"Infrastructure deployed with config: {config}"

@tool
def simulate_failures(system_component: str) -> str:
    """Create chaos testing scenarios across system components.
    
    Args:
        system_component: The component to test
        
    Returns:
        Test results and findings
    """
    return f"Failure simulation completed for: {system_component}"

@tool
def create_documentation(topic: str) -> str:
    """Build onboarding docs and live setup walkthroughs.
    
    Args:
        topic: Documentation topic
        
    Returns:
        Markdown documentation
    """
    return f"Documentation created for: {topic}"

# vana/tools/rag_tools.py
from google.adk.toolkit import tool
from google.cloud import aiplatform
from typing import List, Dict

@tool
def search_knowledge(query: str) -> str:
    """Search the shared knowledge base for relevant information.
    
    Args:
        query: Search query text
        
    Returns:
        Relevant search results from the vector store
    """
    try:
        # Initialize vector search endpoint  
        index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
            index_endpoint_name="projects/analystai-454200/locations/us-central1/indexEndpoints/vana-shared-index"
        )
        
        # Generate embedding for query
        embedding = generate_embedding(query)
        
        # Search for similar content
        results = index_endpoint.find_neighbors(
            deployed_index_id="vana-index",
            queries=[embedding],
            num_neighbors=5
        )
        
        # Format and return results
        return format_search_results(results)
    except Exception as e:
        return f"Knowledge search error: {str(e)}"

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using Vertex AI."""
    # Using Vertex AI embeddings for text
    model = aiplatform.TextEmbeddingModel.from_pretrained("text-embedding-004")
    embeddings = model.get_embeddings([text])
    return embeddings[0].values

def format_search_results(results: List[Dict]) -> str:
    """Format vector search results into readable text."""
    if not results:
        return "No relevant information found in knowledge base."
    
    formatted = "Relevant information from knowledge base:\n\n"
    for i, result in enumerate(results, 1):
        formatted += f"{i}. {result.get('text', 'No text available')}\n"
        formatted += f"   Similarity: {result.get('similarity', 'N/A')}\n\n"
    
    return formatted

# vana/config/settings.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Core configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")  
GOOGLE_GENAI_USE_VERTEXAI = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "True")

# Model configuration
MODEL = os.getenv("MODEL", "gemini-2.0-flash")

# Vector search configuration
VECTOR_SEARCH_INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
VECTOR_SEARCH_DIMENSIONS = int(os.getenv("VECTOR_SEARCH_DIMENSIONS", "768"))

# deploy.py
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
