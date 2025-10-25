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

from google.adk.tools.google_search_tool import GoogleSearchTool

from app.tools.memory_tools import (
    delete_memory_tool,
    retrieve_memories_tool,
    store_memory_tool,
)

from .config import config
from .enhanced_callbacks import (
    after_agent_callback,
    agent_network_tracking_callback,
    before_agent_callback,
    composite_after_agent_callback_with_citations,
    composite_after_agent_callback_with_research_sources,
)

# --- Google Search Tool Configuration ---
# ADK 1.16.0+ supports using Google Search with other tools via bypass_multi_tools_limit
# This replaces Brave Search for better native Gemini grounding and automatic citations
google_search = GoogleSearchTool(bypass_multi_tools_limit=True)
"""Google Search tool configured for multi-tool usage in child agents.

ADK 1.16.0+ feature that allows Google Search to work alongside custom tools.
Provides native Gemini grounding with automatic citation extraction and
source attribution via grounding_metadata.

Benefits over Brave Search:
- Native Gemini integration (better quality)
- Automatic citation extraction
- No additional API costs
- Richer grounding metadata with confidence scores
"""


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
    """Collects and organizes web-based research sources and their supported claims from agent events.

    This function processes the agent's `session.events` to extract web source details (URLs,
    titles, domains from `grounding_chunks`) and associated text segments with confidence scores
    (from `grounding_supports`). The aggregated source information and a mapping of URLs to short
    IDs are cumulatively stored in `callback_context.state`.

    Args:
        callback_context (CallbackContext): The context object providing access to the agent's
            session events and persistent state.
    """
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

    # Broadcast research sources to SSE
    if sources:
        try:
            from app.utils.sse_broadcaster import broadcast_agent_network_update

            session_id = getattr(
                callback_context._invocation_context.session, "id", None
            )
            if session_id:
                # Convert sources to list and use camelCase
                sources_list = [
                    {
                        "shortId": v["short_id"],
                        "title": v["title"],
                        "url": v["url"],
                        "domain": v["domain"],
                        "supportedClaims": [
                            {
                                "textSegment": claim["text_segment"],
                                "confidence": claim["confidence"],
                            }
                            for claim in v.get("supported_claims", [])
                        ],
                    }
                    for v in sources.values()
                ]

                event = {
                    "type": "research_sources",
                    "data": {
                        "sources": sources_list,
                        "totalSources": len(sources_list),
                        "timestamp": datetime.datetime.now().isoformat(),
                    },
                }
                broadcast_agent_network_update(event, session_id)
        except Exception as e:
            logging.error(f"Error broadcasting research sources: {e}")


def citation_replacement_callback(
    callback_context: CallbackContext,
) -> genai_types.Content:
    """Replaces citation tags in a report with Markdown-formatted links.

    Processes 'final_cited_report' from context state, converting tags like
    `<cite source="src-N"/>` into hyperlinks using source information from
    `callback_context.state["sources"]`. Also fixes spacing around punctuation.

    Args:
        callback_context (CallbackContext): Contains the report and source information.

    Returns:
        genai_types.Content: The processed report with Markdown citation links.
    """
    final_report = callback_context.state.get("final_cited_report", "")
    sources = callback_context.state.get("sources", {})

    def tag_replacer(match: re.Match) -> str:
        short_id = match.group(1)
        if not (source_info := sources.get(short_id)):
            logging.warning(f"Invalid citation tag found and removed: {match.group(0)}")
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
            logging.info(
                f"[{self.name}] Research evaluation passed. Escalating to stop loop."
            )
            yield Event(author=self.name, actions=EventActions(escalate=True))
        else:
            logging.info(
                f"[{self.name}] Research evaluation failed or not found. Loop will continue."
            )
            # Yielding an event without content or actions just lets the flow continue.
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
    {{ research_plan? }}

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
    Only use `google_search` if a topic is ambiguous or time-sensitive and you absolutely cannot create a plan without a key piece of identifying information.
    You are explicitly forbidden from researching the *content* or *themes* of the topic. That is the next agent's job. Your search is only to identify the subject, not to investigate it.
    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    """,
    # ADK 1.17.0: Re-enabled Google Search with bypass_multi_tools_limit=True
    # Previous issue: Brave Search caused nested function call errors when plan_generator was invoked via AgentTool
    # Solution: Google Search with bypass flag works correctly in multi-agent scenarios
    # The bypass_multi_tools_limit flag allows Google Search to coexist with AgentTool invocations
    tools=[google_search],
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
        *   **PARALLEL EXECUTION:** Execute **ALL** generated queries for the current `[RESEARCH]` goal **in parallel** by calling `google_search` multiple times in the **same turn**. The ADK framework automatically handles concurrent execution, resulting in 3-5x faster research compared to sequential execution.
            *   ✅ CORRECT: Call `google_search(query1)`, `google_search(query2)`, `google_search(query3)`, `google_search(query4)`, `google_search(query5)` together
            *   ❌ INCORRECT: Wait for each search to complete before starting the next one
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
    tools=[google_search],
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
    2.  **PARALLEL EXECUTION:** Execute **ALL** queries listed in 'follow_up_queries' **in parallel** by calling `google_search` multiple times in the **same turn**. ADK's parallel tool calling will execute them concurrently for faster results.
        - ✅ CORRECT: Call all follow-up searches together in one turn
        - ❌ INCORRECT: Execute searches one at a time sequentially
    3.  Synthesize the new findings and COMBINE them with the existing information in 'section_research_findings'.
    4.  Your output MUST be the new, complete, and improved set of research findings.
    """,
    tools=[google_search],
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

# Import quick search agent for fast web searches
from app.agents.quick_search_agent import quick_search_agent

interactive_planner_agent = LlmAgent(
    name="interactive_planner_agent",
    model=config.worker_model,
    description="Powerful research assistant that creates and executes detailed research plans to answer complex questions requiring web searches and current information. Also handles quick web searches for fast answers.",
    instruction=f"""
    You are a helpful and friendly research assistant with long-term memory capabilities.
    You can operate in TWO MODES: Quick Search Mode and Deep Research Mode.

    ⚠️ **CRITICAL: ASK USER TO CHOOSE MODE FOR AMBIGUOUS QUERIES**
    You handle queries where the user's intent is unclear. Your job is to ASK them to choose
    between Quick Search (fast) or Deep Research (comprehensive).

    **YOUR WORKFLOW:**

    **STEP 1: Detect explicit intent or mode choice**
       - If query contains "search for", "find", "find me", "show me" (explicit quick search keywords)
         → Immediately call transfer_to_agent(agent_name="quick_search_agent") - NO prompt needed
       - If user is responding to mode choice: "quick search", "fast", "quick", "option 1", "1", "first one"
         → Immediately call transfer_to_agent(agent_name="quick_search_agent")
       - If user says: "deep research", "comprehensive", "detailed", "option 2", "2", "second one"
         → Use plan_generator tool to create research plan
       - If no clear intent detected (ambiguous query), proceed to STEP 2

    **STEP 2: Ask user to choose between Quick Search and Deep Research**
       Present this EXACT message format:

       "I can help with that! Please choose how you'd like me to proceed:

       **Option 1: Quick Search** ⚡
       Get fast results with AI-powered summaries and related suggestions. Best for discovering resources, getting quick answers, or exploring topics.

       **Option 2: Deep Research** 🔍
       Comprehensive analysis with multiple sources, citations, and detailed findings. Best for thorough investigations or creating detailed reports.

       Which option would you prefer? (Type '1' for Quick Search or '2' for Deep Research)"

    **STEP 3: After user chooses**
       - Option 1 (Quick Search) → transfer_to_agent(agent_name="quick_search_agent")
       - Option 2 (Deep Research) → Use plan_generator, present plan, ask for approval, then route to research_pipeline

    **CRITICAL RULES:**
    - ALWAYS ask for mode choice FIRST (unless user already chose)
    - DO NOT automatically assume deep research
    - DO NOT call plan_generator until user explicitly chooses Option 2
    - Keep the mode selection message friendly and clear

    **WORKFLOW BY MODE:**

    **Quick Search Mode:**
    1. Detect quick search keywords
    2. Immediately transfer to quick_search_agent (no planning needed)
    3. Present formatted results to user

    **Deep Research Mode:**
    1. Use `plan_generator` to create a draft research plan
    2. Present the plan in a clear, organized format
    3. Ask for approval: "Does this research plan look good? Please let me know if you'd like me to proceed with the research or if you'd like any changes."
    4. If user approves, delegate to `research_pipeline`
    5. If changes requested, refine plan and repeat

    **MEMORY SYSTEM:**
    You have access to a long-term memory system that persists across sessions:
    - Use `store_memory_function` to remember important user preferences, facts, or context
    - Use `retrieve_memories_function` to recall previously stored information
    - Use `delete_memory_function` to forget outdated or incorrect information

    **MEMORY BEST PRACTICES:**
    - Store user preferences in namespace="preferences"
    - Store research context in namespace="research"
    - Store factual information in namespace="facts"
    - Use descriptive keys (e.g., "favorite_topics", "research_methodology_preference")
    - Set importance scores: 0.9-1.0 for critical info, 0.5-0.8 for useful context, 0.0-0.4 for temporary notes
    - Add relevant tags for easier retrieval

    **USER PERSONALIZATION:**
    - At session start, use `retrieve_memories_function` with namespace="preferences" and key="user_name"
    - If you know the user's name, greet them personally
    - Store important preferences throughout conversations

    **CRITICAL RULES:**
    - ALWAYS detect mode first before taking action
    - Quick searches go directly to quick_search_agent (no planning)
    - Deep research requires plan_generator + approval
    - Never answer complex questions directly - always use appropriate mode

    Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    Your job is to: Detect Mode → Route to Appropriate Agent → Present Results → Remember Context
    """,
    sub_agents=[
        quick_search_agent,   # For quick web searches (when user chooses Option 1)
        research_pipeline,    # For deep research (when user chooses Option 2)
    ],
    tools=[
        AgentTool(plan_generator),  # ⚠️ KEEP but use ONLY after Deep Research Mode detection
        store_memory_tool,
        retrieve_memories_tool,
        delete_memory_tool,
    ],
    output_key="final_response",
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

# Import generalist agent for dispatcher pattern
from app.agents.generalist import generalist_agent

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

    4. ⚡ ALL SEARCH/RESEARCH QUERIES → transfer_to_agent(agent_name='interactive_planner_agent')
       Keywords: "search for", "find", "research", "investigate", "analyze", "what are the best", "top", "list", "recommend", "compare"
       Examples:
         * "search for Python testing frameworks" (will auto-route to quick_search)
         * "research Python testing" (will ask user to choose)
         * "what are the best frameworks" (will ask user to choose)
       Note: interactive_planner handles mode detection and user choice

    5. CURRENT/TIME-SENSITIVE → transfer_to_agent(agent_name='interactive_planner_agent')
       Keywords: "latest", "current", "recent", "2025", "2024", "today", "this week", "trending", "news"
       Examples: "latest AI trends", "current events", "recent developments"
       Note: interactive_planner will handle these queries

    7. DEFAULT CASE → transfer_to_agent(agent_name='generalist_agent')
       If no keywords from rules 4-6 match, route to generalist for general knowledge response

    CRITICAL: You MUST call transfer_to_agent() immediately. Do NOT answer questions yourself.
    CRITICAL: Even if the question is about YOU, delegate it - do not self-describe.
    """,
    # CRITICAL: Use sub_agents pattern, NOT AgentTool
    # This is the official ADK pattern for dispatchers/coordinators
    # Reference: docs/adk/llms-full.txt lines 2248-2262
    sub_agents=[
        generalist_agent,           # Simple Q&A specialist (FIRST = default priority)
        interactive_planner_agent,  # Handles mode selection and routing to quick_search or research
    ],
    before_agent_callback=before_agent_callback,
    after_agent_callback=agent_network_tracking_callback,
)

# Update root agent to dispatcher (official pattern)
root_agent = dispatcher_agent
