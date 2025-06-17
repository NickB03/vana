"""
VANA Multi-Agent Team Definition - Minimal Working Version

This is a simplified version with only working tools to test basic functionality.
"""

from lib._tools import (  # File System Tools; Search Tools; System Tools; Agent Coordination Tools; Intelligent Task Analysis Tools; Multi-Agent Workflow Management Tools
    adk_analyze_task,
    adk_cancel_workflow,
    adk_classify_task,
    adk_coordinate_task,
    adk_create_workflow,
    adk_delegate_to_agent,
    adk_echo,
    adk_file_exists,
    adk_get_agent_status,
    adk_get_health_status,
    adk_get_workflow_status,
    adk_get_workflow_templates,
    adk_list_directory,
    adk_list_workflows,
    adk_match_capabilities,
    adk_pause_workflow,
    adk_read_file,
    adk_resume_workflow,
    adk_search_knowledge,
    adk_start_workflow,
    adk_vector_search,
    adk_web_search,
    adk_write_file,
    # MCP Integration Tools
    context7_sequential_thinking,
    brave_search_mcp,
    github_mcp_operations,
)
from lib.logging_config import get_logger
from google.adk.tools import FunctionTool
from google.adk.agents import LlmAgent
import os

# Add project root to Python path for absolute imports
import sys

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables before importing Google ADK
load_dotenv()

# Google ADK imports (installed in environment)

# Logging configuration

logger = get_logger("vana.agents.vana.team")

# Import only working ADK-compatible tools

# Import specialist agent tools for Phase 3 orchestration
try:
    from agents.specialists.agent_tools import specialist_agent_tools

    SPECIALIST_TOOLS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Warning: Specialist tools not available: {e}")
    specialist_agent_tools = []
    SPECIALIST_TOOLS_AVAILABLE = False

# Import specialist agents for proper ADK delegation
try:
    from agents.data_science.specialist import data_science_specialist
    from agents.code_execution.specialist import code_execution_specialist
    from agents.specialists.architecture_specialist import architecture_specialist
    from agents.specialists.devops_specialist import devops_specialist
    from agents.specialists.qa_specialist import qa_specialist
    from agents.specialists.ui_specialist import ui_specialist

    specialist_agents = [
        data_science_specialist,
        code_execution_specialist,
        architecture_specialist,
        devops_specialist,
        qa_specialist,
        ui_specialist
    ]
    SPECIALIST_AGENTS_AVAILABLE = True
    logger.info("✅ Specialist agents imported successfully for ADK delegation")
except ImportError as e:
    logger.warning(f"Warning: Specialist agents not available: {e}")
    specialist_agents = []
    SPECIALIST_AGENTS_AVAILABLE = False

# Create AgentTool wrappers for specialist agents (Agent Zero pattern)
specialist_agent_tools_wrapped = []
if SPECIALIST_AGENTS_AVAILABLE:
    try:
        from google.adk.tools import agent_tool

        # Test with limited AgentTool wrappers to avoid resource issues in Cloud Run
        # Only wrap the first 2 specialist agents to test functionality
        for agent in specialist_agents[:2]:  # Limit to first 2 agents
            # Create AgentTool wrapper for each specialist agent
            agent_tool_wrapper = agent_tool.AgentTool(agent=agent)
            specialist_agent_tools_wrapped.append(agent_tool_wrapper)

        logger.info(f"✅ Created AgentTool wrappers for {len(specialist_agent_tools_wrapped)} specialist agents")
    except ImportError as e:
        logger.warning(f"⚠️ AgentTool not available, using fallback specialist tools: {e}")
        specialist_agent_tools_wrapped = []

# Import advanced orchestration capabilities for Priority 3 enhancements
try:
    from agents.memory.specialist_memory_manager import get_specialist_knowledge_func, save_specialist_knowledge_func
    from agents.orchestration.hierarchical_task_manager import (
        analyze_task_complexity,
        coordinate_workflow,
        decompose_enterprise_task,
        route_to_specialist,
    )

    # Create orchestration tools
    orchestration_tools = [
        FunctionTool(analyze_task_complexity),
        FunctionTool(route_to_specialist),
        FunctionTool(coordinate_workflow),
        FunctionTool(decompose_enterprise_task),
        FunctionTool(save_specialist_knowledge_func),
        FunctionTool(get_specialist_knowledge_func),
    ]

    ORCHESTRATION_TOOLS_AVAILABLE = True
    logger.info("✅ Advanced orchestration capabilities loaded successfully")

except ImportError as e:
    logger.warning(f"Warning: Advanced orchestration tools not available: {e}")
    orchestration_tools = []
    ORCHESTRATION_TOOLS_AVAILABLE = False

# Create a simple VANA agent with working tools
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    description="🧠 VANA - Intelligent AI Assistant with Memory-First Decision Strategy",
    output_key="vana_results",
    instruction="""
🚨 CRITICAL: EXTRACT ACTUAL DATA - NEVER PROVIDE URLS AS ANSWERS

You are VANA, an intelligent AI assistant. When users ask questions:

1. For time/weather/news/current events: Use adk_web_search immediately
2. Extract specific data from results (temperatures, times, prices, facts)
3. Provide actual information directly - NEVER just give website URLs
4. If first search unclear, try different search terms

Examples:
❌ WRONG: "Check timeanddate.com for Paris time"
✅ CORRECT: "The current time in Paris is 3:45 PM CET"

❌ WRONG: "Visit weather.com for Tokyo weather"
✅ CORRECT: "Tokyo weather is 18°C with light rain"

For VANA questions: Use adk_search_knowledge
For technical docs: Use adk_vector_search
For complex tasks: Use delegation tools

## MEMORY-FIRST STRATEGY

Check memory first, then use appropriate tools:
- VANA questions → adk_search_knowledge
- Technical docs → adk_vector_search
- Current info → adk_web_search (extract actual data!)
- Complex tasks → delegation tools

Be proactive - use tools immediately without asking permission.

Available tools include file operations, search capabilities, agent coordination, and workflow management.

Use tools proactively without asking permission. For complex tasks, use delegation tools to coordinate with specialist agents.
""",
    tools=(
        [
            # File System Tools
            adk_read_file,
            adk_write_file,
            adk_list_directory,
            adk_file_exists,
            # Search Tools
            adk_vector_search,
            adk_web_search,
            adk_search_knowledge,
            # System Tools
            adk_echo,
            adk_get_health_status,
            # Agent Coordination Tools
            adk_coordinate_task,
            adk_delegate_to_agent,
            adk_get_agent_status,
            # Intelligent Task Analysis Tools
            adk_analyze_task,
            adk_match_capabilities,
            adk_classify_task,
            # Multi-Agent Workflow Management Tools
            adk_create_workflow,
            adk_start_workflow,
            adk_get_workflow_status,
            adk_list_workflows,
            adk_pause_workflow,
            adk_resume_workflow,
            adk_cancel_workflow,
            adk_get_workflow_templates,
            # MCP Integration Tools
            FunctionTool(context7_sequential_thinking),
            FunctionTool(brave_search_mcp),
            FunctionTool(github_mcp_operations),
        ]
        + (specialist_agent_tools if SPECIALIST_TOOLS_AVAILABLE else [])
        + (specialist_agent_tools_wrapped if SPECIALIST_AGENTS_AVAILABLE else [])
        + (orchestration_tools if ORCHESTRATION_TOOLS_AVAILABLE else [])
    ),
    # Add specialist agents as sub_agents for proper ADK delegation
    sub_agents=specialist_agents if SPECIALIST_AGENTS_AVAILABLE else [],
)
