#!/usr/bin/env python3
"""
Agent Test Harness

This script provides a testing environment for agents with fallback to direct testing
if ADK is not available.
"""

import argparse
import json
import logging
import os
import sys
from typing import Any, Dict, List, Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Try to import ADK wrapper
try:
    sys.path.append("tools")
    from adk_wrapper import adk

    ADK_AVAILABLE = adk.is_available()
except ImportError:
    logger.warning("ADK wrapper not available, falling back to direct testing")
    ADK_AVAILABLE = False

# Import search knowledge tool
try:
    sys.path.append("tools")
    from search_knowledge_tool import search_knowledge_tool

    SEARCH_AVAILABLE = True
except ImportError:
    logger.warning("Search knowledge tool not available")
    SEARCH_AVAILABLE = False


class MockAgent:
    """Mock agent for testing when ADK is not available."""

    def __init__(self, name, description, instructions):
        self.name = name
        self.description = description
        self.instructions = instructions
        self.tools = []

    def add_tool(self, tool_fn, name, description):
        """Add a tool to the agent."""
        self.tools.append({"function": tool_fn, "name": name, "description": description})

    def run(self, query):
        """Run the agent with direct tool access."""
        logger.info(f"MockAgent '{self.name}' processing query: '{query}'")

        # Check if the query is about knowledge
        knowledge_keywords = ["what", "how", "explain", "describe", "tell me about", "information"]
        should_search = any(keyword in query.lower() for keyword in knowledge_keywords)

        if should_search and SEARCH_AVAILABLE:
            logger.info("Using search_knowledge_tool to answer query")
            search_results = search_knowledge_tool(query)

            response = f"Based on my knowledge:\n\n{search_results}\n\n"
            response += f"Is there anything specific about {query} you'd like to know more about?"
            return response
        else:
            logger.warning("Cannot process knowledge query without search_knowledge_tool")
            return f"I understand you're asking about '{query}', but I don't have access to that information right now."


def create_test_agent():
    """Create a test agent with knowledge capabilities."""
    # Define agent parameters
    name = "KnowledgeAgent"
    description = "An agent that can answer questions using the knowledge base"
    instructions = """
    You are a knowledgeable assistant for the VANA project.
    When asked questions, search the knowledge base for relevant information.
    Provide clear and concise answers based on the available knowledge.
    If information is not available, acknowledge this and suggest alternatives.
    """

    if ADK_AVAILABLE:
        # Create ADK agent with knowledge tool
        try:
            agent = adk.create_agent(name=name, description=description, instructions=instructions)

            # Add search_knowledge_tool if available
            if SEARCH_AVAILABLE:
                agent.add_tool(
                    search_knowledge_tool,
                    name="search_knowledge",
                    description="Search the knowledge base for information related to the query",
                )

            logger.info(f"Created ADK agent: {name}")
            return agent
        except Exception as e:
            logger.error(f"Error creating ADK agent: {str(e)}")
            logger.warning("Falling back to MockAgent")

    # Fallback to MockAgent
    agent = MockAgent(name, description, instructions)

    # Add search_knowledge_tool if available
    if SEARCH_AVAILABLE:
        agent.add_tool(
            search_knowledge_tool,
            name="search_knowledge",
            description="Search the knowledge base for information related to the query",
        )

    logger.info(f"Created MockAgent: {name}")
    return agent


def run_agent_test(agent, query):
    """Run a test with the agent."""
    logger.info(f"Testing agent with query: '{query}'")

    try:
        response = agent.run(query)
        logger.info(f"Agent response:\n{response}")
        return response
    except Exception as e:
        logger.error(f"Error running agent: {str(e)}")
        return None


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Agent test harness")
    parser.add_argument("--query", default="What is the architecture of VANA?", help="Query to test")
    args = parser.parse_args()

    # Create test agent
    agent = create_test_agent()

    # Run test
    response = run_agent_test(agent, args.query)

    if response:
        logger.info("Agent test completed successfully")
        return 0
    else:
        logger.error("Agent test failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
