# 🗺️ VANA Agent System Map - ADK Compliant Version

*Generated: 2025-01-19*  
*Corrected to align with official ADK patterns and examples*

## ⚠️ Key Corrections from Previous Version

1. **NO `transfer_to_agent()`** - ADK uses `sub_agents` parameter for delegation
2. **Use `AgentTool` wrapper** - Required when adding agents to tools list
3. **Workflow agents don't use LLMs** - Sequential/Parallel/Loop are deterministic
4. **No explicit Human-in-the-Loop pattern** - Implement via custom tools
5. **Functions auto-wrap as FunctionTool** - No explicit wrapping needed

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VANA Root Orchestrator                     │
│                  (Uses sub_agents parameter)                  │
└───────────────┬─────────────────────────────────────────────┘
                │
         sub_agents list
                │
    ┌───────────┴──────────┬────────────────┬────────────────┐
    │                      │                │                │
┌───▼──────────┐   ┌──────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│Core Platform │   │  Personal   │  │  Creative  │  │ Research & │
│   Agents     │   │ Assistant   │  │  Content   │  │ Analysis   │
└──────────────┘   └─────────────┘  └────────────┘  └────────────┘
```

## 1️⃣ Core Platform Agents (Foundation Layer)

### 🎯 VANA Root Orchestrator - CORRECTED
```python
from google.adk import Agent
from google.adk.tools.agent_tool import AgentTool

class VANAOrchestrator:
    """Primary orchestrator using ADK delegation patterns"""
    
    def create(self):
        # Create all specialist agents first
        email_assistant = self._create_email_assistant()
        calendar_manager = self._create_calendar_manager()
        content_writer = self._create_content_writer()
        web_researcher = self._create_web_researcher()
        
        # Root orchestrator with sub_agents for delegation
        root_agent = Agent(
            name="vana",
            model="gemini-2.5-flash",
            description="VANA's master coordinator for all user requests",
            instruction="""
            You are VANA's master coordinator. Analyze user requests and delegate to:
            - email_assistant: For email management and inbox tasks
            - calendar_manager: For scheduling and calendar operations
            - content_writer: For writing and content creation
            - web_researcher: For research and information gathering
            
            NEVER attempt to answer directly. Always delegate to specialists.
            NEVER transfer back to 'vana' agent.
            """,
            # ADK pattern: sub_agents for delegation
            sub_agents=[
                email_assistant,
                calendar_manager,
                content_writer,
                web_researcher
            ],
            # Optional: Add agents as tools using AgentTool wrapper
            tools=[
                get_user_preferences,  # Regular function
                AgentTool(session_manager)  # Agent as tool
            ]
        )
        return root_agent
```

### 🔐 Authentication Manager - CORRECTED
```python
from google.adk import BaseAgent

class AuthenticationManager(BaseAgent):
    """Custom agent for credential management"""
    
    def __init__(self):
        super().__init__(
            name="auth_manager",
            description="Manages API keys and credentials securely"
        )
    
    async def run(self, context):
        # Custom logic for credential management
        # Integrate with Google Secret Manager
        pass
```

### 💾 Session Manager - CORRECTED
```python
def save_user_preference(key: str, value: str) -> dict:
    """Save user preference to session state"""
    # This is a regular function that will auto-wrap as FunctionTool
    # Access session via context when called
    return {"status": "saved", "key": key, "value": value}

def get_user_preferences() -> dict:
    """Retrieve all user preferences"""
    # Regular function, no manual FunctionTool wrapping needed
    return {"preferences": {...}}

# Used in agent tools list
agent = Agent(
    name="preference_manager",
    tools=[save_user_preference, get_user_preferences]
)
```

## 2️⃣ Personal Assistant Agents - CORRECTED

### 📧 Email Assistant
```python
from google.adk import Agent

def read_inbox(max_emails: int = 10) -> dict:
    """Read latest emails from inbox"""
    # Gmail API integration
    return {"emails": [...]}

def send_email(to: str, subject: str, body: str) -> dict:
    """Send an email"""
    # Gmail API send
    return {"status": "sent", "message_id": "..."}

def clean_inbox() -> dict:
    """Remove spam and organize emails"""
    # Bulk operations
    return {"cleaned": 50, "organized": 30}

email_assistant = Agent(
    name="email_assistant",
    model="gemini-2.5-flash",
    description="Manages all email operations including reading, sending, and organizing",
    instruction="""
    You are an email management specialist. You can:
    - Read and summarize emails
    - Draft and send emails 
    - Clean and organize the inbox
    - Unsubscribe from unwanted emails
    
    Always be concise and professional.
    """,
    tools=[
        read_inbox,
        send_email,
        clean_inbox,
        draft_email,
        organize_labels,
        bulk_unsubscribe
    ]
)
```

### 📅 Calendar Manager
```python
from google.adk import Agent

def list_events(start_date: str, end_date: str) -> dict:
    """List calendar events in date range"""
    # Google Calendar API
    return {"events": [...]}

def create_event(title: str, start: str, end: str, attendees: list) -> dict:
    """Create a new calendar event"""
    # Google Calendar API
    return {"event_id": "...", "status": "created"}

def find_available_slots(duration_minutes: int, attendees: list) -> dict:
    """Find mutual availability"""
    # Complex availability logic
    return {"slots": [...]}

calendar_manager = Agent(
    name="calendar_manager",
    model="gemini-2.5-flash",
    description="Handles all calendar and scheduling operations",
    instruction="""
    You are a calendar management expert. You can:
    - View and summarize calendar events
    - Schedule new meetings and events
    - Find available time slots
    - Handle time zones properly
    - Set reminders
    """,
    tools=[
        list_events,
        create_event,
        update_event,
        delete_event,
        find_available_slots,
        set_reminder
    ]
)
```

### ✅ Task Manager Workflow - CORRECTED
```python
from google.adk import SequentialAgent, Agent

# Individual task agents
task_creator = Agent(
    name="task_creator",
    model="gemini-2.5-flash",
    description="Creates and structures tasks",
    tools=[create_task, set_priority]
)

task_organizer = Agent(
    name="task_organizer",
    model="gemini-2.5-flash", 
    description="Organizes tasks into projects",
    tools=[create_project, assign_to_project]
)

# Sequential workflow for task management
task_management_workflow = SequentialAgent(
    name="task_management_workflow",
    description="Complete task creation and organization pipeline",
    sub_agents=[task_creator, task_organizer]
)
```

## 3️⃣ Creative Content Agents - CORRECTED

### ✍️ Content Creation Workflow
```python
from google.adk import SequentialAgent, LoopAgent, Agent

# Base content writer
content_drafter = Agent(
    name="content_drafter",
    model="gemini-2.5-pro-latest",
    description="Creates initial content drafts",
    instruction="""
    Write high-quality content based on the topic and requirements.
    Adapt style to the content type (blog, email, social media).
    """,
    tools=[grammar_check, tone_analyzer]
)

# Content reviewer
content_reviewer = Agent(
    name="content_reviewer",
    model="gemini-2.5-flash",
    description="Reviews content quality",
    instruction="Review content and provide quality score (0-1) and feedback.",
    tools=[quality_scorer, seo_checker]
)

# Iterative refinement loop
content_refinement_loop = LoopAgent(
    name="content_refinement_loop",
    description="Iteratively improve content until quality threshold met",
    max_iterations=5,
    sub_agents=[content_reviewer, content_drafter]
)

# Full content creation pipeline
content_creation_pipeline = SequentialAgent(
    name="content_creation_pipeline",
    description="Complete content creation workflow",
    sub_agents=[
        topic_researcher,
        content_drafter,
        content_refinement_loop,
        final_formatter
    ]
)
```

### 💻 Code Generator - CORRECTED
```python
from google.adk import Agent
from lib._tools import SecureCodeExecutor  # Existing VANA tool

code_generator = Agent(
    name="code_generator",
    model="gemini-2.5-flash",
    description="Creates applications, scripts, and tools",
    instruction="""
    You are an expert programmer. Create clean, secure, well-documented code.
    Support: Python, JavaScript, HTML/CSS, SQL.
    Always validate and test generated code.
    """,
    tools=[
        SecureCodeExecutor,  # Existing VANA tool
        validate_syntax,
        generate_tests,
        create_documentation
    ]
)
```

## 4️⃣ Research & Analysis Agents - CORRECTED

### 🔍 Research Workflow with Parallel Execution
```python
from google.adk import ParallelAgent, SequentialAgent, Agent
from google.adk.tools import GoogleSearchTool

# Individual research agents
web_searcher = Agent(
    name="web_searcher",
    model="gemini-2.5-flash",
    tools=[GoogleSearchTool()],
    description="Performs web searches"
)

academic_searcher = Agent(
    name="academic_searcher",
    model="gemini-2.5-flash",
    tools=[scholar_search],
    description="Searches academic papers"
)

news_searcher = Agent(
    name="news_searcher",
    model="gemini-2.5-flash",
    tools=[news_api_search],
    description="Searches recent news"
)

# Parallel research gathering
research_gatherer = ParallelAgent(
    name="research_gatherer",
    description="Gather information from multiple sources simultaneously",
    sub_agents=[web_searcher, academic_searcher, news_searcher]
)

# Synthesis agent
research_synthesizer = Agent(
    name="research_synthesizer",
    model="gemini-2.5-pro-latest",
    description="Synthesizes research from multiple sources",
    instruction="Combine all research findings into a comprehensive report.",
    tools=[citation_generator, fact_checker]
)

# Complete research pipeline
research_pipeline = SequentialAgent(
    name="research_pipeline",
    description="Complete research workflow",
    sub_agents=[research_gatherer, research_synthesizer]
)
```

### 📚 Document Analyzer (RAG Pattern) - CORRECTED
```python
from google.adk import SequentialAgent, Agent

# Vector search agent
vector_searcher = Agent(
    name="vector_searcher",
    model="gemini-2.5-flash",
    description="Searches document vectors for relevant chunks",
    tools=[vector_search_tool]  # Custom vector DB integration
)

# Answer synthesis agent
answer_synthesizer = Agent(
    name="answer_synthesizer",
    model="gemini-2.5-pro-latest",
    description="Synthesizes answers from retrieved documents",
    instruction="""
    Using ONLY the provided document chunks, answer the user's question.
    If the information is not in the chunks, say so.
    Always cite which documents you used.
    """
)

# RAG pipeline
rag_pipeline = SequentialAgent(
    name="rag_pipeline",
    description="Retrieval Augmented Generation for document Q&A",
    sub_agents=[vector_searcher, answer_synthesizer]
)
```

## 5️⃣ Human-in-the-Loop Pattern - CORRECTED

```python
from google.adk import Agent
from google.adk.tools import ToolContext

def request_approval(action: str, details: str, tool_context: ToolContext) -> dict:
    """Request human approval for critical actions"""
    # Store pending action in session
    tool_context.state["pending_action"] = {
        "action": action,
        "details": details,
        "status": "awaiting_approval"
    }
    
    # In production, this would trigger a notification
    return {
        "status": "approval_requested",
        "message": f"Human approval needed for: {action}"
    }

def check_approval(tool_context: ToolContext) -> dict:
    """Check if human has approved the action"""
    pending = tool_context.state.get("pending_action", {})
    
    if pending.get("status") == "approved":
        return {"approved": True}
    else:
        # Exit the current workflow
        tool_context.actions.escalate = True
        return {"approved": False, "message": "Action not yet approved"}

# Agent with approval flow
critical_action_agent = Agent(
    name="critical_action_agent",
    model="gemini-2.5-flash",
    description="Handles actions requiring human approval",
    instruction="""
    For any critical action (deletion, bulk email, financial transaction):
    1. First call request_approval with details
    2. Wait for approval
    3. Only proceed if approved
    """,
    tools=[
        request_approval,
        check_approval,
        perform_critical_action
    ]
)
```

## 6️⃣ Integration Patterns - CORRECTED

### OpenAPIToolset Integration
```python
from google.adk.tools import OpenAPIToolset
from google.adk.tools.authentication import token_to_scheme_credential

# Integrate Slack API
slack_tools = OpenAPIToolset(
    openapi_spec_url="https://api.slack.com/specs/openapi_v2.json",
    credential=token_to_scheme_credential(
        token=os.environ["SLACK_TOKEN"],
        scheme="bearer"
    )
)

# Create Slack agent with all API operations as tools
slack_agent = Agent(
    name="slack_agent",
    model="gemini-2.5-flash",
    description="Manages Slack workspace operations",
    tools=slack_tools.get_tools()
)
```

### Using Agents as Tools - CORRECTED
```python
from google.adk import Agent
from google.adk.tools.agent_tool import AgentTool

# Specialist agent
email_specialist = Agent(
    name="email_specialist",
    model="gemini-2.5-flash",
    tools=[read_email, send_email]
)

# Manager agent that can use specialist as a tool
manager_agent = Agent(
    name="manager",
    model="gemini-2.5-flash",
    description="Manages various tasks",
    # Regular agents in sub_agents
    sub_agents=[calendar_agent, task_agent],
    # Agent as tool requires AgentTool wrapper
    tools=[
        AgentTool(email_specialist),  # Wrapped as tool
        get_weather,  # Regular function
        calculate_budget  # Regular function
    ]
)
```

## 🚀 Implementation Roadmap - CORRECTED

### Phase 1: Core Foundation (Weeks 1-2)
1. ✅ Keep existing VANA orchestrator pattern (already uses sub_agents)
2. ✅ Authentication Manager as CustomAgent
3. ✅ Session state functions (auto-wrap as FunctionTool)
4. ✅ OpenAPIToolset for Gmail/Calendar

### Phase 2: Personal Assistant (Weeks 3-4)
1. ✅ Email Assistant with Gmail tools
2. ✅ Calendar Manager with Google Calendar
3. ✅ Task workflow using SequentialAgent
4. ✅ Shopping Assistant with product search

### Phase 3: Creative Suite (Weeks 5-6)
1. ✅ Content pipeline with LoopAgent refinement
2. ✅ Code Generator using SecureCodeExecutor
3. ✅ Multimedia workflow with ParallelAgent

### Phase 4: Research & Analysis (Weeks 7-8)
1. ✅ Research pipeline with ParallelAgent gathering
2. ✅ RAG pipeline with SequentialAgent
3. ✅ Data Analyst with visualization tools

### Phase 5: Advanced Features (Weeks 9-10)
1. ✅ Human approval via custom tools
2. ✅ Third-party integrations via OpenAPIToolset
3. ✅ Complex workflows combining patterns
4. ✅ iOS bridge as CustomAgent

## 📋 Key ADK Compliance Rules

### ✅ CORRECT Patterns
- Use `sub_agents` parameter for delegation
- Use `AgentTool` wrapper for agents in tools list
- Regular functions auto-wrap as FunctionTool
- Workflow agents (Sequential/Parallel/Loop) for orchestration
- CustomAgent by extending BaseAgent

### ❌ INCORRECT Patterns (Avoid These)
- No `transfer_to_agent()` function exists
- Don't mix agents in tools without AgentTool
- Don't use LLMs in workflow agents
- Don't create custom delegation mechanisms
- Don't manually wrap functions as FunctionTool

---

*This corrected version aligns with official ADK documentation and examples.*