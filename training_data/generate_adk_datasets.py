#!/usr/bin/env python3
"""
Generate neural training datasets from Vana ADK codebase.

This script extracts ADK patterns, anti-patterns, and best practices
to create structured JSON training data for claude-flow neural training.
"""

import json
import re
from pathlib import Path
from typing import Any
from datetime import datetime


def extract_agent_patterns() -> list[dict[str, Any]]:
    """Extract ADK agent patterns from codebase."""

    patterns = [
        {
            "name": "basic_llm_agent",
            "category": "agent_definition",
            "code": """LlmAgent(
    model=config.worker_model,
    name="agent_name",
    description="Agent description",
    instruction="Detailed instructions for the agent..."
)""",
            "description": "Standard LLM agent with model, name, and instructions",
            "use_cases": ["Simple Q&A", "Single-task execution", "Tool usage"],
            "best_practices": [
                "Use descriptive names that explain the agent's purpose",
                "Clear, detailed instruction prompts",
                "Specify output_key for state management",
                "Set include_contents='none' to isolate context when needed"
            ],
            "example_from_vana": "plan_generator, section_planner, research_evaluator"
        },
        {
            "name": "agent_tool_wrapper",
            "category": "tool_integration",
            "code": "tools=[AgentTool(sub_agent)]",
            "description": "Wrap sub-agents as tools for hierarchical execution",
            "use_cases": [
                "Multi-agent coordination",
                "Delegation patterns",
                "Parent-child agent relationships"
            ],
            "best_practices": [
                "Use AgentTool ONLY for sub-agents",
                "Use regular functions for external APIs",
                "NEVER nest AgentTool calls (causes Gemini API errors)",
                "Set include_contents='none' on AgentTool-wrapped agents to prevent context pollution"
            ],
            "antipatterns": [
                {
                    "bad": "plan_generator = LlmAgent(tools=[AgentTool(another_agent), brave_search])",
                    "good": "plan_generator = LlmAgent(tools=[brave_search])",
                    "reason": "AgentTool wrapped agents cannot have nested tools - violates Gemini conversation requirements",
                    "error": "Google Gemini API 400: function call turn must come immediately after user turn"
                }
            ],
            "example_from_vana": "interactive_planner_agent uses AgentTool(plan_generator)"
        },
        {
            "name": "event_extraction_critical",
            "category": "event_processing",
            "code": """for part in content.get('parts', []):
    # Extract text parts
    text = part.get('text')
    if text:
        accumulated_content.append(text)

    # Extract functionResponse parts (CRITICAL!)
    function_response = part.get('functionResponse')
    if function_response and isinstance(function_response, dict):
        result = function_response.get('response', {}).get('result')
        if result:
            accumulated_content.append(result)""",
            "description": "CRITICAL: Extract from BOTH text AND functionResponse parts",
            "use_cases": [
                "SSE streaming",
                "Agent tool outputs",
                "Research plans from plan_generator",
                "Any AgentTool wrapped function results"
            ],
            "best_practices": [
                "Always check BOTH text and functionResponse",
                "Use defensive .get() calls",
                "Log extraction for debugging",
                "Validate nested structure before accessing"
            ],
            "antipatterns": [
                {
                    "bad": "text = part.get('text')\\nif text: content.append(text)",
                    "good": "# Check both text AND functionResponse",
                    "reason": "Research plans and agent outputs come from functionResponse, not text",
                    "symptom": "Research plans don't show up, agent outputs invisible to users",
                    "reference": "docs/adk/ADK-Event-Extraction-Guide.md"
                }
            ],
            "severity": "CRITICAL",
            "example_from_vana": "agents/vana/agent.py - plan_generator returns via functionResponse"
        },
        {
            "name": "sequential_agent_pipeline",
            "category": "orchestration",
            "code": """research_pipeline = SequentialAgent(
    name="research_pipeline",
    description="Executes research workflow",
    sub_agents=[
        section_planner,
        section_researcher,
        iterative_refinement_loop,
        report_composer
    ]
)""",
            "description": "Execute sub-agents in sequential order",
            "use_cases": [
                "Linear workflows with dependencies",
                "Multi-stage processing",
                "Pipeline orchestration"
            ],
            "best_practices": [
                "Use output_key to pass state between agents",
                "Order matters - dependencies must execute first",
                "Name agents descriptively for debugging",
                "Use callbacks for monitoring"
            ],
            "state_flow": "Each agent reads from previous agent's output_key in session state",
            "example_from_vana": "research_pipeline in agents/vana/agent.py"
        },
        {
            "name": "loop_agent_with_escalation",
            "category": "orchestration",
            "code": """LoopAgent(
    name="iterative_refinement_loop",
    max_iterations=config.max_search_iterations,
    sub_agents=[
        research_evaluator,
        EscalationChecker(name="escalation_checker"),
        enhanced_search_executor
    ]
)""",
            "description": "Iterative execution with escalation-based exit",
            "use_cases": [
                "Iterative refinement",
                "Quality improvement loops",
                "Retry with enhancement patterns"
            ],
            "best_practices": [
                "Set max_iterations to prevent infinite loops",
                "Use custom BaseAgent for escalation logic",
                "Store evaluation results in session state",
                "Clear escalation conditions"
            ],
            "escalation_pattern": "EscalationChecker yields Event(actions=EventActions(escalate=True)) to exit loop",
            "example_from_vana": "iterative_refinement_loop in research_pipeline"
        },
        {
            "name": "custom_base_agent",
            "category": "agent_definition",
            "code": """class EscalationChecker(BaseAgent):
    def __init__(self, name: str):
        super().__init__(name=name)

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        evaluation = ctx.session.state.get("research_evaluation")
        if evaluation and evaluation.get("grade") == "pass":
            yield Event(author=self.name, actions=EventActions(escalate=True))
        else:
            yield Event(author=self.name)""",
            "description": "Custom agent with specific control flow logic",
            "use_cases": [
                "Loop control",
                "Conditional execution",
                "Custom business logic",
                "State-based decisions"
            ],
            "best_practices": [
                "Inherit from BaseAgent",
                "Implement _run_async_impl",
                "Always yield Event (with or without actions)",
                "Access state via ctx.session.state"
            ],
            "example_from_vana": "EscalationChecker for loop exit control"
        },
        {
            "name": "structured_output_schema",
            "category": "output_validation",
            "code": """class Feedback(BaseModel):
    grade: Literal["pass", "fail"]
    comment: str
    follow_up_queries: list[SearchQuery] | None = None

agent = LlmAgent(
    output_schema=Feedback,
    output_key="research_evaluation"
)""",
            "description": "Type-safe structured outputs with Pydantic",
            "use_cases": [
                "Validated outputs",
                "Type safety",
                "Structured data extraction",
                "JSON schema validation"
            ],
            "best_practices": [
                "Use Pydantic BaseModel",
                "Provide Field descriptions",
                "Use Literal for enums",
                "Store in state with output_key"
            ],
            "example_from_vana": "Feedback model for research_evaluator"
        },
        {
            "name": "callback_pattern",
            "category": "state_management",
            "code": """def collect_research_sources_callback(callback_context: CallbackContext) -> None:
    session = callback_context._invocation_context.session
    sources = callback_context.state.get("sources", {})

    for event in session.events:
        # Process events...

    callback_context.state["sources"] = sources

agent = LlmAgent(
    after_agent_callback=collect_research_sources_callback
)""",
            "description": "Process agent results and manage state via callbacks",
            "use_cases": [
                "Post-processing outputs",
                "State management",
                "Logging and monitoring",
                "SSE broadcasting"
            ],
            "best_practices": [
                "Use before_agent_callback for setup",
                "Use after_agent_callback for processing",
                "Access state via callback_context.state",
                "Access session events via callback_context._invocation_context.session"
            ],
            "example_from_vana": "collect_research_sources_callback for citation tracking"
        },
        {
            "name": "tool_integration",
            "category": "tool_integration",
            "code": """def brave_search(query: str) -> str:
    '''Search the web using Brave Search API.'''
    # Implementation...
    return results

agent = LlmAgent(
    tools=[brave_search]
)""",
            "description": "Integrate external tools and functions",
            "use_cases": [
                "Web search",
                "API calls",
                "Database queries",
                "External services"
            ],
            "best_practices": [
                "Use clear function names",
                "Provide detailed docstrings",
                "Type hints for all parameters",
                "Return serializable data"
            ],
            "example_from_vana": "brave_search tool for web research"
        },
        {
            "name": "state_management_pattern",
            "category": "state_management",
            "code": """# Agent 1 writes to state
agent1 = LlmAgent(
    output_key="research_plan"
)

# Agent 2 reads from state via instruction template
agent2 = LlmAgent(
    instruction="Execute the plan: {{ research_plan }}"
)""",
            "description": "Share state between agents using output_key and template interpolation",
            "use_cases": [
                "Agent-to-agent data passing",
                "Workflow coordination",
                "Context sharing",
                "Pipeline state management"
            ],
            "best_practices": [
                "Use descriptive output_key names",
                "Access state in instructions with {{ key }}",
                "Optional access with {{ key? }}",
                "Store structured data in state"
            ],
            "example_from_vana": "research_plan passed from plan_generator to section_researcher"
        }
    ]

    return patterns


def extract_antipatterns() -> list[dict[str, Any]]:
    """Extract known ADK anti-patterns and bugs."""

    antipatterns = [
        {
            "name": "missing_functionresponse_extraction",
            "severity": "critical",
            "category": "event_processing",
            "symptom": "Research plans don't show up, agent outputs invisible",
            "cause": "Only extracting from text parts, missing functionResponse",
            "fix": "Extract from BOTH text AND functionResponse parts",
            "detection": "Check if AgentTool wrapped functions are used - they return via functionResponse",
            "code_smell": "for part in parts: if 'text' in part: ...",
            "correct_pattern": "Check both part.get('text') AND part.get('functionResponse')",
            "impact": "User-facing bug - core functionality broken",
            "references": ["docs/adk/ADK-Event-Extraction-Guide.md"],
            "example": "plan_generator outputs research plan via functionResponse, not text"
        },
        {
            "name": "nested_agent_tool_calls",
            "severity": "high",
            "category": "agent_definition",
            "symptom": "Google Gemini API 400 error: 'function call turn must come immediately after user turn'",
            "cause": "AgentTool wrapped agent has tools parameter with nested AgentTools or any tools",
            "fix": "Remove tools parameter from agents that will be wrapped in AgentTool",
            "detection": "Look for tools=[...] inside an agent that is itself used in AgentTool(agent)",
            "code_smell": "plan_generator = LlmAgent(tools=[brave_search]); parent = LlmAgent(tools=[AgentTool(plan_generator)])",
            "correct_pattern": "plan_generator = LlmAgent(); parent = LlmAgent(tools=[AgentTool(plan_generator), brave_search])",
            "impact": "Runtime error - prevents agent execution",
            "references": ["agents/vana/agent.py:252-258"],
            "gemini_requirement": "Function calls must come immediately after user turn, no nested calls in AgentTool conversation"
        },
        {
            "name": "missing_defensive_gets",
            "severity": "medium",
            "category": "error_handling",
            "symptom": "KeyError when processing events",
            "cause": "Assuming nested structure exists without validation",
            "fix": "Use .get() with defaults for all nested access",
            "detection": "Look for event['content']['parts'] or part['functionResponse']['response']['result']",
            "code_smell": "result = part['functionResponse']['response']['result']",
            "correct_pattern": "func_resp = part.get('functionResponse'); result = func_resp.get('response', {}).get('result') if func_resp else None",
            "impact": "Runtime error - crashes event processing",
            "best_practice": "Always use defensive .get() calls for nested structures"
        },
        {
            "name": "broadcasting_inside_loop",
            "severity": "low",
            "category": "performance",
            "symptom": "Excessive SSE events, performance degradation",
            "cause": "Broadcasting inside the parts loop instead of after accumulation",
            "fix": "Accumulate all content first, then broadcast once",
            "detection": "Look for broadcast/SSE calls inside the parts iteration loop",
            "code_smell": "for part in parts: content.append(...); await broadcast(...)",
            "correct_pattern": "for part in parts: content.append(...); # After loop: await broadcast(...)",
            "impact": "Performance issue - unnecessary network traffic",
            "best_practice": "Batch updates and broadcast once per event"
        },
        {
            "name": "missing_max_iterations",
            "severity": "medium",
            "category": "orchestration",
            "symptom": "Infinite loops, runaway agent execution",
            "cause": "LoopAgent without max_iterations limit",
            "fix": "Always set max_iterations on LoopAgent",
            "detection": "LoopAgent(...) without max_iterations parameter",
            "code_smell": "LoopAgent(sub_agents=[...])",
            "correct_pattern": "LoopAgent(max_iterations=10, sub_agents=[...])",
            "impact": "Operational issue - resource exhaustion",
            "best_practice": "Always set reasonable max_iterations for LoopAgent"
        },
        {
            "name": "unclear_escalation_logic",
            "severity": "low",
            "category": "orchestration",
            "symptom": "Loops don't exit when expected, unclear control flow",
            "cause": "Complex or implicit escalation conditions",
            "fix": "Use dedicated EscalationChecker agent with clear logic",
            "detection": "Escalation logic buried in multi-purpose agents",
            "code_smell": "Combined evaluation + escalation in single agent",
            "correct_pattern": "Separate agents: evaluator + EscalationChecker + executor",
            "impact": "Maintainability issue - unclear control flow",
            "best_practice": "Single responsibility - dedicated agent for escalation decisions",
            "example_from_vana": "EscalationChecker as separate agent in iterative_refinement_loop"
        },
        {
            "name": "missing_output_key",
            "severity": "medium",
            "category": "state_management",
            "symptom": "State not accessible to downstream agents",
            "cause": "Agent produces output but doesn't specify output_key",
            "fix": "Always specify output_key for agents that produce data for other agents",
            "detection": "Agent in SequentialAgent without output_key, but next agent needs its output",
            "code_smell": "Agent produces data but output_key not set",
            "correct_pattern": "LlmAgent(..., output_key='result_name')",
            "impact": "Integration issue - data not accessible",
            "best_practice": "Use descriptive output_key names for all data-producing agents"
        },
        {
            "name": "include_contents_pollution",
            "severity": "medium",
            "category": "state_management",
            "symptom": "Agent has too much context, slow or confused responses",
            "cause": "Not setting include_contents='none' on isolated agents",
            "fix": "Set include_contents='none' for agents that should have clean context",
            "detection": "AgentTool wrapped agents without include_contents='none'",
            "code_smell": "LlmAgent used in AgentTool without context isolation",
            "correct_pattern": "LlmAgent(..., include_contents='none')",
            "impact": "Performance + quality issue",
            "best_practice": "Isolate context for sub-agents that don't need parent conversation",
            "example_from_vana": "plan_generator uses include_contents='none' to start fresh"
        }
    ]

    return antipatterns


def extract_orchestration_patterns() -> list[dict[str, Any]]:
    """Extract ADK orchestration patterns."""

    patterns = [
        {
            "name": "sequential_pipeline",
            "type": "SequentialAgent",
            "structure": "SequentialAgent with sub_agents=[agent1, agent2, agent3]",
            "use_case": "Linear workflow with dependencies",
            "example": "research_pipeline: section_planner → section_researcher → loop → report_composer",
            "state_flow": "Each agent reads from previous agent's output_key",
            "best_practices": [
                "Use output_key to pass state between agents",
                "Order matters - dependencies must execute first",
                "Use include_contents='none' to isolate context",
                "Name agents descriptively for debugging"
            ],
            "data_flow": {
                "agent1": {"output_key": "step1_result"},
                "agent2": {"instruction": "Process {{ step1_result }}"},
                "agent3": {"instruction": "Finalize {{ step2_result }}"}
            },
            "example_from_vana": "research_pipeline in agents/vana/agent.py"
        },
        {
            "name": "iterative_refinement_loop",
            "type": "LoopAgent",
            "structure": "LoopAgent with escalation control",
            "use_case": "Iterative improvement until quality threshold met",
            "example": "evaluator → checker (escalate if pass) → enhancer",
            "state_flow": "Loop continues until EscalationChecker sets escalate=True",
            "best_practices": [
                "Set max_iterations to prevent infinite loops",
                "Use custom BaseAgent for escalation logic",
                "Store evaluation results in session state",
                "Clear exit conditions"
            ],
            "control_flow": {
                "step1": "Evaluate quality",
                "step2": "Check if pass → escalate to exit",
                "step3": "If fail → enhance and repeat"
            },
            "example_from_vana": "iterative_refinement_loop in research_pipeline"
        },
        {
            "name": "hierarchical_delegation",
            "type": "AgentTool",
            "structure": "Parent agent with AgentTool wrapped sub-agents",
            "use_case": "Parent coordinates, delegates to specialists",
            "example": "interactive_planner_agent → AgentTool(plan_generator)",
            "best_practices": [
                "Parent decides WHEN to delegate",
                "Sub-agents are specialists for specific tasks",
                "Use AgentTool ONLY for agents, not functions",
                "Sub-agents should have include_contents='none'"
            ],
            "delegation_flow": {
                "parent": "Receives user request → decides to delegate",
                "delegation": "Calls AgentTool(specialist)",
                "specialist": "Executes task in isolation → returns result",
                "parent": "Receives result → continues conversation"
            },
            "example_from_vana": "interactive_planner_agent delegates to plan_generator"
        },
        {
            "name": "multi_agent_research_workflow",
            "type": "Composite",
            "structure": "Combination of Sequential, Loop, and delegation patterns",
            "use_case": "Complex research workflow with planning, execution, evaluation, refinement",
            "architecture": {
                "layer1": "interactive_planner_agent (delegation)",
                "layer2": "research_pipeline (sequential)",
                "layer3": [
                    "section_planner",
                    "section_researcher",
                    "iterative_refinement_loop (loop)",
                    "report_composer"
                ],
                "layer4_loop": [
                    "research_evaluator",
                    "escalation_checker",
                    "enhanced_search_executor"
                ]
            },
            "data_flow": {
                "plan": "plan_generator → research_plan",
                "structure": "section_planner → report_sections",
                "research": "section_researcher → section_research_findings",
                "evaluation": "research_evaluator → research_evaluation",
                "refinement": "enhanced_search_executor → updated findings",
                "final": "report_composer → final_cited_report → final_report_with_citations"
            },
            "example_from_vana": "Complete Vana research agent system"
        }
    ]

    return patterns


def extract_integration_patterns() -> list[dict[str, Any]]:
    """Extract FastAPI + ADK + SSE integration patterns."""

    patterns = [
        {
            "name": "fastapi_adk_proxy",
            "category": "integration",
            "architecture": "FastAPI backend proxies to ADK agents on port 8080",
            "flow": "Frontend → FastAPI (8000) → ADK (8080) → SSE stream",
            "endpoints": {
                "run": "/apps/vana/users/{user_id}/sessions/{session_id}/run",
                "method": "GET",
                "response_type": "text/event-stream"
            },
            "implementation": {
                "1_receive_request": "FastAPI endpoint receives GET request",
                "2_create_session": "Create or retrieve ADK session",
                "3_invoke_agent": "Call ADK agent with user query",
                "4_stream_response": "Stream ADK events as SSE to frontend",
                "5_extract_content": "Parse ADK events and extract content",
                "6_broadcast": "Broadcast extracted content via SSE"
            },
            "critical_patterns": [
                "Extract from both text and functionResponse parts",
                "Accumulate content before broadcasting",
                "Handle async streaming with proper error handling",
                "Maintain session state across requests"
            ]
        },
        {
            "name": "sse_event_streaming",
            "category": "integration",
            "pattern": "Server-Sent Events for real-time updates",
            "event_types": [
                "research_update: Main content stream",
                "research_sources: Citation sources",
                "agent_network: Agent coordination events",
                "error: Error messages"
            ],
            "implementation": {
                "event_format": "data: {json}\\n\\n",
                "content_type": "text/event-stream",
                "headers": {
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive"
                }
            },
            "best_practices": [
                "Use try/except for error handling",
                "Send heartbeat events to prevent timeout",
                "Properly close streams on completion",
                "Handle client disconnection gracefully"
            ]
        }
    ]

    return patterns


def generate_all_datasets() -> None:
    """Generate all training datasets."""

    # Create output directory
    output_dir = Path("training_data")
    output_dir.mkdir(exist_ok=True)

    # Generate datasets
    datasets = {
        "adk_agent_patterns.json": {
            "patterns": extract_agent_patterns(),
            "metadata": {
                "source": "vana_codebase",
                "extracted_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "ADK agent patterns extracted from Vana project"
            }
        },
        "adk_antipatterns.json": {
            "antipatterns": extract_antipatterns(),
            "metadata": {
                "source": "vana_codebase_bugs_and_fixes",
                "extracted_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "Common ADK anti-patterns and bugs"
            }
        },
        "adk_orchestration.json": {
            "orchestration_patterns": extract_orchestration_patterns(),
            "metadata": {
                "source": "vana_agent_architecture",
                "extracted_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "ADK orchestration and coordination patterns"
            }
        },
        "adk_integration.json": {
            "integration_patterns": extract_integration_patterns(),
            "metadata": {
                "source": "vana_fastapi_integration",
                "extracted_at": datetime.now().isoformat(),
                "version": "1.0",
                "description": "FastAPI + ADK + SSE integration patterns"
            }
        }
    }

    # Write datasets
    for filename, data in datasets.items():
        filepath = output_dir / filename
        filepath.write_text(json.dumps(data, indent=2))
        print(f"✅ Generated: {filepath}")
        print(f"   - {len(data[list(data.keys())[0]])} entries")

    print(f"\n🎉 Successfully generated {len(datasets)} training datasets!")
    print(f"📁 Location: {output_dir.absolute()}")


if __name__ == "__main__":
    generate_all_datasets()
