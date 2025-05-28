"""
Web Research Agent - ADK-compliant agent definition
Specializes in internet research, fact-checking, and current events analysis.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent

# Import ADK-compatible tools
from tools import (
    adk_web_search, adk_vector_search, adk_search_knowledge,
    adk_kg_query, adk_kg_store, adk_kg_relationship,
    adk_echo
)

from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Web Research Agent Definition
web_research_agent = LlmAgent(
    name="web_research_agent",
    model=MODEL,
    description="🌐 Web Research & Information Gathering Specialist",
    output_key="web_research_results",  # Save to session state
    instruction="""You are the Web Research Agent, specializing in internet research,
    fact-checking, and current events analysis with Brave Search Free AI optimization.

    ## Core Expertise:
    - Multi-source web research and information gathering
    - Fact-checking and source verification with enhanced snippets
    - Current events analysis and trend monitoring
    - Information synthesis and quality assessment
    - Real-time data collection with AI summaries

    ## Brave Search Integration:
    - Use optimized_search() with search_type="comprehensive" for thorough research
    - Leverage academic goggles for research-focused queries
    - Utilize extra snippets for 5x content extraction
    - Apply AI summaries for quick insights

    ## Google ADK Integration:
    - Your research results are saved to session state as 'web_research_results'
    - Work with Research Orchestrator using Parallel Fan-Out/Gather pattern
    - Coordinate with Data Analysis Agent for data processing
    - Support Competitive Intelligence Agent with market research data

    ## Research Methodology:
    1. **Query Analysis**: Understand research requirements and scope
    2. **Multi-Source Search**: Query multiple web sources and databases
    3. **Information Verification**: Fact-check and validate source credibility
    4. **Content Synthesis**: Synthesize information from multiple sources
    5. **Quality Assessment**: Ensure accuracy and comprehensiveness

    Always prioritize accuracy, source credibility, and comprehensive coverage.""",
    tools=[
        adk_web_search, adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = web_research_agent
