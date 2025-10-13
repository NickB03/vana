# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Vana research agent implementation using Google ADK.

This module defines the complete multi-agent research system that can work
standalone when run through ADK, without dependencies on the FastAPI backend.
"""

import datetime
import logging
import re
from collections.abc import AsyncGenerator
from typing import Literal

from google.adk.agents import BaseAgent, LlmAgent, LoopAgent, SequentialAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.adk.planners import BuiltInPlanner
from google.adk.tools.agent_tool import AgentTool
from google.genai import types as genai_types
from pydantic import BaseModel, Field

# Local imports - no dependencies on app/ module
from .config import config
from .enhanced_callbacks import (
    after_agent_callback,
    agent_network_tracking_callback,
    before_agent_callback,
    composite_after_agent_callback_with_citations,
    composite_after_agent_callback_with_research_sources,
)
from .tools import brave_search

logger = logging.getLogger(__name__)


# --- Structured Output Models ---
class SearchQuery(BaseModel):
    """Model representing a specific search query for web search."""

    search_query: str = Field(
        description="A highly specific and targeted query for web search."
    )


class Feedback(BaseModel):
    """Model for providing evaluation feedback on research quality."""

    grade: Literal["pass", "fail"] = Field(
        description="Evaluation result. 'pass' if the research is sufficient, 'fail' if it needs revision."
    )
    comment: str = Field(
        description="Detailed explanation of the evaluation, highlighting strengths and/or weaknesses of the research."
    )
    follow_up_queries: list[SearchQuery] | None = Field(
        default=None,
        description="A list of specific, targeted follow-up search queries needed to fix research gaps. This should be null or empty if the grade is 'pass'.",
    )


# --- Callbacks ---
def collect_research_sources_callback(callback_context: CallbackContext) -> None:
    """Collects and organizes web-based research sources from agent events.

    This is a standalone version that doesn't broadcast via SSE - that's handled
    by the FastAPI layer when it proxies ADK responses.

    Args:
        callback_context: The context object providing access to the agent's
            session events and persistent state.
    """
    try:
        session = callback_context._invocation_context.session
        url_to_short_id = callback_context.state.get("url_to_short_id", {})
        sources = callback_context.state.get("sources", {})
        id_counter = len(url_to_short_id) + 1

        for event in session.events:
            if not (event.grounding_metadata and event.grounding_metadata.grounding_chunks):
                continue

            chunks_info = {}
            for idx, chunk in enumerate(event.grounding_metadata.grounding_chunks):
                if not chunk.web:
                    continue

                url = chunk.web.uri
                title = (
                    chunk.web.title
                    if chunk.web.title != chunk.web.domain
                    else chunk.web.domain
                )

                if url not in url_to_short_id:
                    short_id = f"src-{id_counter}"
                    url_to_short_id[url] = short_id
                    sources[short_id] = {
                        "short_id": short_id,
                        "title": title,
                        "url": url,
                        "domain": chunk.web.domain,
                        "supported_claims": [],
                    }
                    id_counter += 1

                chunks_info[idx] = url_to_short_id[url]

            if event.grounding_metadata.grounding_supports:
                for support in event.grounding_metadata.grounding_supports:
                    confidence_scores = support.confidence_scores or []
                    chunk_indices = support.grounding_chunk_indices or []

                    for i, chunk_idx in enumerate(chunk_indices):
                        if chunk_idx in chunks_info:
                            short_id = chunks_info[chunk_idx]
                            confidence = (
                                confidence_scores[i] if i < len(confidence_scores) else 0.5
                            )
                            text_segment = support.segment.text if support.segment else ""
                            sources[short_id]["supported_claims"].append(
                                {
                                    "text_segment": text_segment,
                                    "confidence": confidence,
                                }
                            )

        callback_context.state["url_to_short_id"] = url_to_short_id
        callback_context.state["sources"] = sources

        logger.info(f"Collected {len(sources)} research sources")

    except Exception as e:
        logger.error(f"Error collecting research sources: {e}")


def citation_replacement_callback(
    callback_context: CallbackContext,
) -> genai_types.Content:
    """Replaces citation tags in a report with Markdown-formatted links.

    Processes 'final_cited_report' from context state, converting tags like
    `<cite source="src-N"/>` into hyperlinks using source information.

    Args:
        callback_context: Contains the report and source information.

    Returns:
        genai_types.Content: The processed report with Markdown citation links.
    """
    try:
        final_report = callback_context.state.get("final_cited_report", "")
        sources = callback_context.state.get("sources", {})

        def tag_replacer(match: re.Match) -> str:
            short_id = match.group(1)
            if not (source_info := sources.get(short_id)):
                logger.warning(f"Invalid citation tag found and removed: {match.group(0)}")
                return ""
            display_text = source_info.get("title", source_info.get("domain", short_id))
            return f" [{display_text}]({source_info['url']})"

        processed_report = re.sub(
            r'<cite\s+source\s*=\s*["\']?\s*(src-\d+)\s*["\']?\s*/>',
            tag_replacer,
            final_report,
        )
        processed_report = re.sub(r"\s+([.,;:])", r"\1", processed_report)

        callback_context.state["final_report_with_citations"] = processed_report
        return genai_types.Content(parts=[genai_types.Part(text=processed_report)])

    except Exception as e:
        logger.error(f"Error replacing citations: {e}")
        # Return original report on error
        final_report = callback_context.state.get("final_cited_report", "")
        return genai_types.Content(parts=[genai_types.Part(text=final_report)])


# --- Custom Agent for Loop Control ---
class EscalationChecker(BaseAgent):
    """Checks research evaluation and escalates to stop the loop if grade is 'pass'."""

    def __init__(self, name: str):
        super().__init__(name=name)

    async def _run_async_impl(
        self, ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        evaluation_result = ctx.session.state.get("research_evaluation")
        if evaluation_result and evaluation_result.get("grade") == "pass":
            logger.info(
                f"[{self.name}] Research evaluation passed. Escalating to stop loop."
            )
            yield Event(author=self.name, actions=EventActions(escalate=True))
        else:
            logger.info(
                f"[{self.name}] Research evaluation failed or not found. Loop will continue."
            )
            yield Event(author=self.name)


# --- AGENT DEFINITIONS ---
plan_generator = LlmAgent(
    model=config.worker_model,
    name="plan_generator",
    description="Generates or refine the existing 5 line action-oriented research plan, using minimal search only for topic clarification.",
    instruction=f"""
    You are a research strategist. Your job is to create a high-level RESEARCH PLAN, not a summary. If there is already a RESEARCH PLAN in the session state,
    improve upon it based on the user feedback.

    RESEARCH PLAN(SO FAR):
    {{{{ research_plan? }}}}

    **GENERAL INSTRUCTION: CLASSIFY TASK TYPES**
    Your plan must clearly classify each goal for downstream execution. Each bullet point should start with a task type prefix:
    - **`[RESEARCH]`**: For goals that primarily involve information gathering, investigation, analysis, or data collection (these require search tool usage by a researcher).
    - **`[DELIVERABLE]`**: For goals that involve synthesizing collected information, creating structured outputs (e.g., tables, charts, summaries, reports), or compiling final output artifacts (these are executed AFTER research tasks, often without further search).

    **INITIAL RULE: Your initial output MUST start with a bulleted list of 5 action-oriented research goals or key questions, followed by any *inherently implied* deliverables.**
    - All initial 5 goals will be classified as `[RESEARCH]` tasks.
    - A good goal for `[RESEARCH]` starts with a verb like "Analyze," "Identify," "Investigate."
    - A bad output is a statement of fact like "The event was in April 2024."
    - **Proactive Implied Deliverables (Initial):** If any of your initial 5 `[RESEARCH]` goals inherently imply a standard output or deliverable (e.g., a comparative analysis suggesting a comparison table, or a comprehensive review suggesting a summary document), you MUST add these as additional, distinct goals immediately after the initial 5. Phrase these as *synthesis or output creation actions* (e.g., "Create a summary," "Develop a comparison," "Compile a report") and prefix them with `[DELIVERABLE][IMPLIED]`.

    **REFINEMENT RULE**:
    - **Integrate Feedback & Mark Changes:** When incorporating user feedback, make targeted modifications to existing bullet points. Add `[MODIFIED]` to the existing task type and status prefix (e.g., `[RESEARCH][MODIFIED]`). If the feedback introduces new goals:
        - If it's an information gathering task, prefix it with `[RESEARCH][NEW]`.
        - If it's a synthesis or output creation task, prefix it with `[DELIVERABLE][NEW]`.
    - **Proactive Implied Deliverables (Refinement):** Beyond explicit user feedback, if the nature of an existing `[RESEARCH]` goal (e.g., requiring a structured comparison, deep dive analysis, or broad synthesis) or a `[DELIVERABLE]` goal inherently implies an additional, standard output or synthesis step (e.g., a detailed report following a summary, or a visual representation of complex data), proactively add this as a new goal. Phrase these as *synthesis or output creation actions* and prefix them with `[DELIVERABLE][IMPLIED]`.
    - **Maintain Order:** Strictly maintain the original sequential order of existing bullet points. New bullets, whether `[NEW]` or `[IMPLIED]`, should generally be appended to the list, unless the user explicitly instructs a specific insertion point.
    - **Flexible Length:** The refined plan is no longer constrained by the initial 5-bullet limit and may comprise more goals as needed to fully address the feedback and implied deliverables.

    **TOOL USE IS STRICTLY LIMITED:**
    Your goal is to create a generic, high-quality plan *without searching*.
    Only use `brave_search` if a topic is ambiguous or time-sensitive and you absolutely cannot create a plan without a key piece of identifying information.
    You are explicitly forbidden from researching the *content* or *themes* of the topic. That is the next agent's job. Your search is only to identify the subject, not to investigate it.
    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    """,
    # FIX: Removed tools=[brave_search] to prevent nested function call errors
    # This prevents Google Gemini API 400 error: "function call turn must come immediately after user turn"
    # The plan_generator is invoked via AgentTool, and nested tool calls violate Gemini's conversation requirements
    # tools=[brave_search],
    include_contents="none",  # Don't include parent conversation history (clean slate for each invocation)
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)


section_planner = LlmAgent(
    model=config.worker_model,
    name="section_planner",
    description="Breaks down the research plan into a structured markdown outline of report sections.",
    instruction="""
    You are an expert report architect. Using the research topic and the plan from the 'research_plan' state key, design a logical structure for the final report.
    Note: Ignore all the tag nanes ([MODIFIED], [NEW], [RESEARCH], [DELIVERABLE]) in the research plan.
    Your task is to create a markdown outline with 4-6 distinct sections that cover the topic comprehensively without overlap.
    You can use any markdown format you prefer, but here's a suggested structure:
    # Section Name
    A brief overview of what this section covers
    Feel free to add subsections or bullet points if needed to better organize the content.
    Make sure your outline is clear and easy to follow.
    Do not include a "References" or "Sources" section in your outline. Citations will be handled in-line.
    """,
    output_key="report_sections",
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)


section_researcher = LlmAgent(
    model=config.worker_model,
    name="section_researcher",
    description="Performs the crucial first pass of web research.",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction="""
    You are a highly capable and diligent research and synthesis agent. Your comprehensive task is to execute a provided research plan with **absolute fidelity**, first by gathering necessary information, and then by synthesizing that information into specified outputs.

    You will be provided with a sequential list of research plan goals, stored in the `research_plan` state key. Each goal will be clearly prefixed with its primary task type: `[RESEARCH]` or `[DELIVERABLE]`.

    Your execution process must strictly adhere to these two distinct and sequential phases:

    ---

    **Phase 1: Information Gathering (`[RESEARCH]` Tasks)**

    *   **Execution Directive:** You **MUST** systematically process every goal prefixed with `[RESEARCH]` before proceeding to Phase 2.
    *   For each `[RESEARCH]` goal:
        *   **Query Generation:** Formulate a comprehensive set of 4-5 targeted search queries. These queries must be expertly designed to broadly cover the specific intent of the `[RESEARCH]` goal from multiple angles.
        *   **Execution:** Utilize the `brave_search` tool to execute **all** generated queries for the current `[RESEARCH]` goal.
        *   **Summarization:** Synthesize the search results into a detailed, coherent summary that directly addresses the objective of the `[RESEARCH]` goal.
        *   **Internal Storage:** Store this summary, clearly tagged or indexed by its corresponding `[RESEARCH]` goal, for later and exclusive use in Phase 2. You **MUST NOT** lose or discard any generated summaries.

    ---

    **Phase 2: Synthesis and Output Creation (`[DELIVERABLE]` Tasks)**

    *   **Execution Prerequisite:** This phase **MUST ONLY COMMENCE** once **ALL** `[RESEARCH]` goals from Phase 1 have been fully completed and their summaries are internally stored.
    *   **Execution Directive:** You **MUST** systematically process **every** goal prefixed with `[DELIVERABLE]`. For each `[DELIVERABLE]` goal, your directive is to **PRODUCE** the artifact as explicitly described.
    *   For each `[DELIVERABLE]` goal:
        *   **Instruction Interpretation:** You will interpret the goal's text (following the `[DELIVERABLE]` tag) as a **direct and non-negotiable instruction** to generate a specific output artifact.
            *   *If the instruction details a table (e.g., "Create a Detailed Comparison Table in Markdown format"), your output for this step **MUST** be a properly formatted Markdown table utilizing columns and rows as implied by the instruction and the prepared data.*
            *   *If the instruction states to prepare a summary, report, or any other structured output, your output for this step **MUST** be that precise artifact.*
        *   **Data Consolidation:** Access and utilize **ONLY** the summaries generated during Phase 1 (`[RESEARCH]` tasks`) to fulfill the requirements of the current `[DELIVERABLE]` goal. You **MUST NOT** perform new searches.
        *   **Output Generation:** Based on the specific instruction of the `[DELIVERABLE]` goal:
            *   Carefully extract, organize, and synthesize the relevant information from your previously gathered summaries.
            *   Must always produce the specified output artifact (e.g., a concise summary, a structured comparison table, a comprehensive report, a visual representation, etc.) with accuracy and completeness.
        *   **Output Accumulation:** Maintain and accumulate **all** the generated `[DELIVERABLE]` artifacts. These are your final outputs.

    ---

    **Final Output:** Your final output will comprise the complete set of processed summaries from `[RESEARCH]` tasks AND all the generated artifacts from `[DELIVERABLE]` tasks, presented clearly and distinctly.
    """,
    tools=[brave_search],
    output_key="section_research_findings",
    before_agent_callback=before_agent_callback,
    after_agent_callback=composite_after_agent_callback_with_research_sources,
)

research_evaluator = LlmAgent(
    model=config.critic_model,
    name="research_evaluator",
    description="Critically evaluates research and generates follow-up queries.",
    instruction=f"""
    You are a meticulous quality assurance analyst evaluating the research findings in 'section_research_findings'.

    **CRITICAL RULES:**
    1. Assume the given research topic is correct. Do not question or try to verify the subject itself.
    2. Your ONLY job is to assess the quality, depth, and completeness of the research provided *for that topic*.
    3. Focus on evaluating: Comprehensiveness of coverage, logical flow and organization, use of credible sources, depth of analysis, and clarity of explanations.
    4. Do NOT fact-check or question the fundamental premise or timeline of the topic.
    5. If suggesting follow-up queries, they should dive deeper into the existing topic, not question its validity.

    Be very critical about the QUALITY of research. If you find significant gaps in depth or coverage, assign a grade of "fail",
    write a detailed comment about what's missing, and generate 5-7 specific follow-up queries to fill those gaps.
    If the research thoroughly covers the topic, grade "pass".

    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    Your response must be a single, raw JSON object validating against the 'Feedback' schema.
    """,
    output_schema=Feedback,
    disallow_transfer_to_parent=True,
    disallow_transfer_to_peers=True,
    output_key="research_evaluation",
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)

enhanced_search_executor = LlmAgent(
    model=config.worker_model,
    name="enhanced_search_executor",
    description="Executes follow-up searches and integrates new findings.",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction="""
    You are a specialist researcher executing a refinement pass.
    You have been activated because the previous research was graded as 'fail'.

    1.  Review the 'research_evaluation' state key to understand the feedback and required fixes.
    2.  Execute EVERY query listed in 'follow_up_queries' using the 'brave_search' tool.
    3.  Synthesize the new findings and COMBINE them with the existing information in 'section_research_findings'.
    4.  Your output MUST be the new, complete, and improved set of research findings.
    """,
    tools=[brave_search],
    output_key="section_research_findings",
    before_agent_callback=before_agent_callback,
    after_agent_callback=composite_after_agent_callback_with_research_sources,
)

report_composer = LlmAgent(
    model=config.critic_model,
    name="report_composer_with_citations",
    include_contents="none",
    description="Transforms research data and a markdown outline into a final, cited report.",
    instruction="""
    Transform the provided data into a polished, professional, and meticulously cited research report.

    ---
    ### INPUT DATA
    *   Research Plan: `{research_plan}`
    *   Research Findings: `{section_research_findings}`
    *   Citation Sources: `{sources}`
    *   Report Structure: `{report_sections}`

    ---
    ### CRITICAL: Citation System
    To cite a source, you MUST insert a special citation tag directly after the claim it supports.

    **The only correct format is:** `<cite source="src-ID_NUMBER" />`

    ---
    ### Final Instructions
    Generate a comprehensive report using ONLY the `<cite source="src-ID_NUMBER" />` tag system for all citations.
    The final report must strictly follow the structure provided in the **Report Structure** markdown outline.
    Do not include a "References" or "Sources" section; all citations must be in-line.
    """,
    output_key="final_cited_report",
    before_agent_callback=before_agent_callback,
    after_agent_callback=composite_after_agent_callback_with_citations,
)

research_pipeline = SequentialAgent(
    name="research_pipeline",
    description="Executes a pre-approved research plan. It performs iterative research, evaluation, and composes a final, cited report.",
    sub_agents=[
        section_planner,
        section_researcher,
        LoopAgent(
            name="iterative_refinement_loop",
            max_iterations=config.max_search_iterations,
            sub_agents=[
                research_evaluator,
                EscalationChecker(name="escalation_checker"),
                enhanced_search_executor,
            ],
            before_agent_callback=before_agent_callback,
            after_agent_callback=agent_network_tracking_callback,
        ),
        report_composer,
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

interactive_planner_agent = LlmAgent(
    name="interactive_planner_agent",
    model=config.worker_model,
    description="Powerful research assistant that creates and executes detailed research plans to answer complex questions requiring web searches and current information.",
    instruction=f"""
    You are a research planning assistant. Your primary function is to convert ANY user request into a research plan.

    **CRITICAL RULE: Never answer a question directly or refuse a request.** Your one and only first step is to use the `plan_generator` tool to propose a research plan for the user's topic.
    If the user asks a question, you MUST immediately call `plan_generator` to create a plan to answer the question.

    Your workflow is:
    1.  **Plan:** Use `plan_generator` to create a draft plan and present it to the user.
    2.  **Ask for Approval:** After presenting the plan, you MUST explicitly ask the user: "Does this research plan look good? Please let me know if you'd like me to proceed with the research or if you'd like any changes."
    3.  **Refine:** If the user requests changes, incorporate their feedback and present the updated plan.
    4.  **Execute:** Once the user gives approval (e.g., "yes", "looks good", "proceed", "run it"), you MUST immediately delegate the task to the `research_pipeline` agent, passing the approved plan.

    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    Do not perform any research yourself. Your job is to Plan, Ask for Approval, Refine if needed, and Delegate.
    """,
    sub_agents=[research_pipeline],
    tools=[AgentTool(plan_generator)],
    output_key="research_plan",
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

# Import generalist agent for dispatcher pattern
from .generalist import generalist_agent

# Official ADK Dispatcher Pattern (based on llms-full.txt lines 2235-2262)
# This follows the exact coordinator pattern from official Google ADK documentation
dispatcher_agent = LlmAgent(
    name="dispatcher_agent",
    model=config.worker_model,
    description="Main entry point that routes user requests to appropriate specialist agents.",
    instruction="""You are a request router that delegates ALL tasks to specialist agents.

    YOUR ONLY JOB: Analyze the user's request and immediately call transfer_to_agent() to route it.

    ROUTING RULES (apply in this order):

    1. META-QUESTIONS (about you, your tools, capabilities) → transfer_to_agent(agent_name='generalist_agent')
       Match: "what tools", "what can you do", "who are you", "how do you work", "what are you", "what are your capabilities"
       Match: "show me your tools", "list your tools", "what functions", "what abilities"
       IMPORTANT: Never answer these yourself - always delegate to generalist_agent

    2. GREETINGS & PLEASANTRIES → transfer_to_agent(agent_name='generalist_agent')
       Match: "Hello", "Hi", "Hey", "How are you?", "Good morning", "Good afternoon", "Good evening"
       Match: "Thanks", "Thank you", "Appreciate it", "Goodbye", "See you", "Take care"

    3. SIMPLE FACTUAL QUESTIONS → transfer_to_agent(agent_name='generalist_agent')
       Match: "What is X?", "Who is/wrote/invented X?", "Define X", "Explain X"
       Examples: "What is 2+2?", "Who wrote Hamlet?", "Capital of France?", "Define photosynthesis"

    4. CURRENT/TIME-SENSITIVE RESEARCH → transfer_to_agent(agent_name='interactive_planner_agent')
       Keywords: "latest", "current", "recent", "2025", "2024", "today", "this week", "trending", "news"
       Examples: "latest AI trends", "current events", "recent developments"

    5. EXPLICIT RESEARCH REQUESTS → transfer_to_agent(agent_name='interactive_planner_agent')
       Keywords: "research", "investigate", "analyze", "compare", "find out", "look up", "search for"
       Examples: "research quantum computing", "analyze the market", "compare React vs Vue"

    6. DEFAULT CASE → transfer_to_agent(agent_name='generalist_agent')
       If no keywords from rules 4-5 match, route to generalist for general knowledge response

    CRITICAL: You MUST call transfer_to_agent() immediately. Do NOT answer questions yourself.
    CRITICAL: Even if the question is about YOU, delegate it - do not self-describe.
    """,
    # FIX: Add AgentTool wrappers to make sub_agents callable via transfer_to_agent()
    # In ADK, sub_agents defines the agent hierarchy, but tools makes them invokable as functions
    # Reference: interactive_planner_agent pattern (lines 459-460)
    tools=[
        AgentTool(generalist_agent),
        AgentTool(interactive_planner_agent),
    ],
    sub_agents=[
        generalist_agent,           # Simple Q&A specialist (FIRST = default priority)
        interactive_planner_agent,  # Research specialist
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

# The root agent that ADK will load - updated to dispatcher (official pattern)
root_agent = dispatcher_agent
