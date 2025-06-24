"""
VANA Multi-Agent Team Definition - Minimal Working Version

This is a simplified version with only working tools to test basic functionality.
"""

import os

from dotenv import load_dotenv
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

from lib._tools import adk_enhanced_analyze_task  # Enhanced reasoning version
from lib._tools import adk_intelligent_echo  # Enhanced reasoning version
from lib._tools import adk_logical_analyze  # New logical reasoning tool
from lib._tools import adk_mathematical_solve  # New mathematical reasoning tool
from lib._tools import adk_reasoning_coordinate_task  # Enhanced reasoning version
from lib._tools import (  # File System Tools; Search Tools; System Tools; Agent Coordination Tools; Intelligent Task Analysis Tools; Multi-Agent Workflow Management Tools; MCP Integration Tools; Enhanced Reasoning Tools
    adk_cancel_workflow,
    adk_classify_task,
    adk_create_workflow,
    adk_delegate_to_agent,
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
    brave_search_mcp,
    context7_sequential_thinking,
    github_mcp_operations,
)
from lib.logging_config import get_logger

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
    from agents.code_execution.specialist import code_execution_specialist
    from agents.data_science.specialist import data_science_specialist
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
        ui_specialist,
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

        logger.info(
            f"✅ Created AgentTool wrappers for {len(specialist_agent_tools_wrapped)} specialist agents"
        )
    except ImportError as e:
        logger.warning(
            f"⚠️ AgentTool not available, using fallback specialist tools: {e}"
        )
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
    model=os.getenv("VANA_MODEL", "gemini-2.0-flash-exp"),
    description="🧠 VANA - Intelligent AI Assistant with Memory-First Decision Strategy",
    output_key="vana_results",
    instruction="""You are VANA, an intelligent AI assistant with advanced data extraction and reasoning capabilities.

## 🧠 ENHANCED REASONING CAPABILITIES (NEW)
You now have access to advanced reasoning tools for mathematical and logical problem solving:

### Mathematical Reasoning
- **adk_mathematical_solve**: Solve arithmetic expressions (2+2, 10*3+5), word problems ("John has 3 apples, gives away 1, how many left?")
- **Use for**: All math problems, calculations, quantitative analysis
- **Features**: Step-by-step reasoning, confidence scoring, multiple solution approaches

### Logical Reasoning
- **adk_logical_analyze**: Analyze logical problems, if-then statements, logical structures
- **Use for**: Logic puzzles, reasoning problems, decision analysis
- **Features**: Structured analysis, reasoning validation, confidence assessment

### Enhanced Analysis
- **adk_enhanced_analyze_task**: Enhanced task analysis with reasoning capabilities
- **adk_reasoning_coordinate_task**: Task coordination with reasoning integration
- **adk_intelligent_echo**: Enhanced echo with reasoning validation

**IMPORTANT**: For any mathematical calculations or logical reasoning problems, ALWAYS use these specialized tools instead of trying to solve them yourself.

## 🎯 DATA EXTRACTION RULES (CRITICAL)
When users ask for current information (time, weather, news, facts):

1. **ALWAYS use adk_web_search** for current information queries
2. **NEVER provide URLs as final answers** - extract the actual data
3. **Parse JSON results systematically:**
   - web_search returns enhanced data: {"query": "...", "results": [{"title": "...", "url": "...", "description": "...", "extra_snippets": [...], "summary": "..."}]}
   - **PRIORITY ORDER for data extraction:**
     1. **extra_snippets** array - Contains detailed extractable information
     2. **summary** field - AI-generated summary with key facts
     3. **description** field - Basic snippet information
   - **For time queries:** Look in extra_snippets for patterns like "time is", "currently", "now", specific times
   - **For weather queries:** Look in extra_snippets for temperature, conditions, forecasts

4. **Specific extraction examples with enhanced data:**
   - **Time queries:** Search extra_snippets for patterns:
     * "The time in [city] is [time]"
     * "Current time: [time]"
     * "[time] [timezone]" (e.g., "3:45 PM EST")
     * Time offset information (e.g., "6 hours ahead")
   - **Weather queries:** Search extra_snippets for:
     * Temperature readings ("22°C", "75°F")
     * Weather conditions ("partly cloudy", "sunny", "rainy")
     * Forecast information ("High around 95F")
   - **News queries:** Extract key facts, dates, and specific details from extra_snippets
   - **Stock prices:** Look for "$150.25" or "up 2.3%" in extra_snippets first

5. **Enhanced data extraction process:**
   - Identify the specific information requested by the user
   - **FIRST:** Check extra_snippets array for detailed extractable data
   - **SECOND:** Check summary field for AI-generated key information
   - **THIRD:** Fall back to description field if needed
   - Extract the most current and accurate information from these enhanced fields
   - Format the response clearly and directly for the user
   - Provide actual data (numbers, facts, times) not references

## 🔄 PERSISTENCE RULES
1. **If first search doesn't yield clear data:** Try alternative search terms
2. **If results are unclear:** Extract partial information and note limitations
3. **Never give up after single attempt** for data extraction queries
4. **Try multiple approaches** before concluding information is unavailable

## 🧠 SYSTEMATIC PROCESSING
For every data extraction task:
1. **Understand the request:** What specific information does the user want?
2. **Call the appropriate tool:** Use adk_web_search for current information
3. **Parse the enhanced JSON response:** Prioritize extra_snippets, then summary, then description
4. **Extract relevant data:** Pull out the specific information from enhanced fields
5. **Verify extraction:** Ensure you have actual data, not just references
6. **Respond directly:** Provide the extracted information clearly

## 📋 TOOL USAGE GUIDELINES
- **File operations:** Use read_file, write_file, list_directory, file_exists
- **Knowledge search:** Use search_knowledge for VANA-specific information
- **Current information:** Use adk_web_search for time, weather, news, current events
- **System status:** Use echo, get_health_status for basic testing
- **Agent coordination:** Use adk_get_agent_status to check available agents, adk_delegate_to_agent for task delegation
- **Complex tasks:** Use coordinate_task, delegate_to_agent for multi-step or specialized tasks

## 🤝 AGENT COORDINATION RULES
When users ask about agents, capabilities, or need specialized help:

1. **Agent Status Queries:** Use adk_get_agent_status tool to show available agents
   - Example: "Show me available agents" → Use adk_get_agent_status immediately
   - Example: "What agents can help with data analysis" → Use adk_get_agent_status first

2. **Task Delegation:** Use adk_delegate_to_agent for specialized tasks
   - Code tasks → Delegate to code_execution agent
   - Data analysis → Delegate to data_science agent
   - Architecture design → Delegate to specialists agent
   - Complex workflows → Use coordinate_task

3. **Always use tools when requested:** If user asks you to use a specific tool, use it immediately
   - Example: "Use your adk_get_agent_status tool" → Call adk_get_agent_status right away
   - Don't explain or ask permission - just use the requested tool

## ⚡ BEHAVIOR EXPECTATIONS
- **Be direct and helpful** - provide actual answers, not explanations of limitations
- **Use tools immediately** when appropriate - don't ask permission
- **Extract real data** from tool results - never just summarize that data exists
- **Try alternative approaches** if initial attempts don't yield clear results
- **Provide specific, actionable information** rather than general guidance

## 🚨 CRITICAL SUCCESS PATTERNS
✅ **Good Response:** "The current time is 3:45 PM EST"
❌ **Bad Response:** "I found time information but cannot provide the exact current time"

✅ **Good Response:** "The weather in New York is 22°C and partly cloudy"
❌ **Bad Response:** "I found weather information on several websites"

✅ **Good Response:** "Apple stock is currently trading at $150.25, up 2.3% today"
❌ **Bad Response:** "I found stock information but you should check a financial website"

Remember: Your goal is to provide users with the actual information they requested, not to direct them to other sources.""",
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
            adk_intelligent_echo,  # Enhanced reasoning version
            adk_get_health_status,
            # Agent Coordination Tools
            adk_reasoning_coordinate_task,  # Enhanced reasoning version
            adk_delegate_to_agent,
            adk_get_agent_status,
            # Intelligent Task Analysis Tools
            adk_enhanced_analyze_task,  # Enhanced reasoning version
            adk_match_capabilities,
            adk_classify_task,
            # Enhanced Reasoning Tools
            adk_mathematical_solve,  # New mathematical reasoning tool
            adk_logical_analyze,  # New logical reasoning tool
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
