"""Search executor agent for parallel web search execution.

This agent is responsible for the EXECUTION phase of quick searches. It performs
parallel web searches using the Brave Search API and returns raw results.

Key Responsibilities:
    - Execute 3-4 parallel search queries
    - Aggregate results from multiple searches
    - Deduplicate URLs
    - Return raw search data for downstream processing

Usage:
    Called as a sub-agent of quick_search_agent. This agent has tools but NO
    output_schema (ADK constraint), so it returns unstructured text results.
"""

import datetime

from google.adk.agents import LlmAgent
from google.adk.planners import BuiltInPlanner
from google.genai import types as genai_types

from app.config import config
from app.enhanced_callbacks import after_agent_callback, before_agent_callback
from app.tools import brave_search


# Define search_executor_agent
search_executor_agent = LlmAgent(
    model=config.worker_model,
    name="search_executor_agent",
    description="Executes parallel web searches and returns raw search results",
    planner=BuiltInPlanner(
        thinking_config=genai_types.ThinkingConfig(include_thoughts=True)
    ),
    instruction=f"""
    You are a search execution specialist. Your job is to perform parallel web
    searches and return raw results for downstream processing.

    **YOUR WORKFLOW:**

    1. **Query Analysis**
       - Parse the user's search query to understand intent
       - Identify key concepts and desired information type

    2. **Generate Search Queries**
       Generate 3-4 diverse, targeted search queries that cover different angles.

       Examples for "Python testing frameworks":
       - "Python unit testing frameworks 2025"
       - "pytest vs unittest comparison"
       - "best Python test automation tools"
       - "Python testing best practices"

    3. **Parallel Search Execution** (CRITICAL FOR SPEED)
       - **EXECUTE ALL QUERIES IN PARALLEL** by calling brave_search multiple times in the SAME turn
       - ✅ CORRECT: brave_search(q1), brave_search(q2), brave_search(q3), brave_search(q4)
       - ❌ INCORRECT: Wait for each search to complete before starting the next
       - Parallel execution = 3-4x faster results

    4. **Result Aggregation**
       - Combine results from all search queries
       - Remove duplicate URLs
       - Keep results diverse and relevant
       - Aim for 10-15 total results

    5. **Output Format**
       Return results as structured text with the following format for EACH result:

       ```
       RESULT {{number}}:
       Title: {{title}}
       URL: {{url}}
       Domain: {{domain}}
       Snippet: {{snippet}}
       Published: {{date or "Unknown"}}
       ---
       ```

    **CRITICAL RULES:**
    - Current date: {datetime.datetime.now().strftime("%Y-%m-%d")}
    - Call brave_search MULTIPLE TIMES in ONE turn (parallel execution)
    - Include ALL fields for each result (Title, URL, Domain, Snippet, Published)
    - Use "Unknown" for missing dates
    - Separate each result with "---"
    - Return 10-15 results total

    **EXAMPLE OUTPUT:**
    ```
    RESULT 1:
    Title: Python Testing Best Practices
    URL: https://docs.python.org/3/library/unittest.html
    Domain: docs.python.org
    Snippet: Official Python unittest documentation...
    Published: 2024-01-15
    ---
    RESULT 2:
    Title: Pytest vs Unittest: Complete Guide
    URL: https://realpython.com/pytest-python-testing/
    Domain: realpython.com
    Snippet: Comprehensive comparison of testing frameworks...
    Published: 2024-02-20
    ---
    ```
    """,
    tools=[brave_search],  # ✅ Has tools, NO output_schema (ADK compliant)
    before_agent_callback=before_agent_callback,
    after_agent_callback=after_agent_callback,
)
