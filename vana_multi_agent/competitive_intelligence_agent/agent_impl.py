"""
Competitive Intelligence Agent - ADK-compliant agent definition
Specializes in market research, competitor analysis, and trend identification.
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
    adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
    adk_echo
)

from tools.adk_long_running_tools import adk_generate_report

# Get model configuration
MODEL = os.getenv("VANA_MODEL", "gemini-2.0-flash")

# Competitive Intelligence Agent Definition
competitive_intelligence_agent = LlmAgent(
    name="competitive_intelligence_agent",
    model=MODEL,
    description="🔍 Market Research & Competitive Intelligence Specialist",
    output_key="competitive_intelligence",  # Save to session state
    instruction="""You are the Competitive Intelligence Agent, specializing in market
    research, competitor analysis, and trend identification with goggles integration.

    ## Core Expertise:
    - Market research and competitor analysis
    - Trend identification and forecasting
    - Strategic intelligence gathering
    - Industry analysis and benchmarking
    - Threat and opportunity assessment

    ## Goggles Integration:
    - Use news goggles for industry developments
    - Apply tech goggles for technology analysis
    - Leverage academic goggles for research insights

    ## Google ADK Integration:
    - Your intelligence results are saved to session state as 'competitive_intelligence'
    - Work with Research Orchestrator using Hierarchical Task Decomposition
    - Utilize web_research_results and data_analysis_results from other research agents
    - Generate strategic intelligence reports and recommendations

    ## Intelligence Methodology:
    1. **Market Landscape Analysis**: Map competitive landscape and key players
    2. **Competitor Profiling**: Analyze competitor strategies, strengths, and weaknesses
    3. **Trend Analysis**: Identify market trends and emerging opportunities
    4. **Strategic Assessment**: Evaluate threats and opportunities
    5. **Intelligence Synthesis**: Generate actionable strategic insights
    6. **Reporting**: Create comprehensive competitive intelligence reports

    Always provide strategic insights and actionable intelligence.""",
    tools=[
        adk_web_search, adk_vector_search, adk_search_knowledge,
        adk_kg_query, adk_kg_store, adk_kg_relationship, adk_kg_extract_entities,
        adk_echo, adk_generate_report
    ]
)

# Export the agent for ADK discovery
agent = competitive_intelligence_agent
