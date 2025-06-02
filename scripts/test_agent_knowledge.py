#!/usr/bin/env python3
"""
Test Agent Knowledge Retrieval

This script tests agents' ability to retrieve knowledge from Vector Search.
It works with both ADK agents and the fallback mechanism.
"""

import argparse
import json
import logging
import os
import sys
import time

from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the ADK wrapper
from tools.adk_wrapper import adk

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("agent_knowledge_test.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Test agent knowledge retrieval")
    parser.add_argument("--agent", default="ben", help="Agent to test (default: ben)")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--output", help="Output file for test results (JSON)")
    parser.add_argument("--queries-file", help="JSON file with test queries")
    return parser.parse_args()


def setup_logging(verbose=False):
    """Set up logging with appropriate level based on verbose flag."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("agent_knowledge_test.log"),
            logging.StreamHandler(),
        ],
    )
    return logging.getLogger(__name__)


def get_test_queries():
    """Get a list of test queries covering different knowledge areas."""
    return [
        {"query": "What is the architecture of VANA?", "category": "architecture"},
        {
            "query": "How does Vector Search integration work?",
            "category": "vector_search",
        },
        {"query": "What are the agent roles in the VANA system?", "category": "agents"},
        {
            "query": "How do I troubleshoot Vector Search issues?",
            "category": "troubleshooting",
        },
        {"query": "How do agents delegate tasks?", "category": "delegation"},
        {"query": "What is the current project status?", "category": "status"},
        {
            "query": "How do I update the Vector Search index?",
            "category": "maintenance",
        },
        {"query": "What tools are available to VANA agents?", "category": "tools"},
        {"query": "How is the GitHub sync implemented?", "category": "github"},
        {
            "query": "What are the known issues with ADK integration?",
            "category": "issues",
        },
    ]


def load_queries_from_file(file_path):
    """Load test queries from a JSON file."""
    try:
        with open(file_path) as f:
            queries = json.load(f)
        logger.info(f"Loaded {len(queries)} queries from {file_path}")
        return queries
    except Exception as e:
        logger.error(f"Error loading queries from {file_path}: {str(e)}")
        return get_test_queries()


def create_test_agent(agent_name):
    """Create an agent for testing."""
    logger.info(f"Creating agent: {agent_name}")

    # Find the search knowledge tool
    search_tool = None
    try:
        # Try to import the search knowledge tool
        from scripts.test_vector_search_direct import search_knowledge

        search_tool = {
            "name": "search_knowledge",
            "description": "Search the knowledge base for information",
            "function": search_knowledge,
        }
        logger.info("Using direct Vector Search as the search tool")
    except ImportError as e:
        logger.warning(
            f"Could not import search_knowledge, agent will have no tools: {str(e)}"
        )

    # Create the agent using the ADK wrapper with search tool
    tools = [search_tool] if search_tool else None
    agent = adk.create_agent(
        name=agent_name,
        description=f"{agent_name} is a helpful AI assistant for the VANA project.",
        instructions=f"You are {agent_name}, a helpful AI assistant. Use the knowledge base to answer questions about the VANA project.",
        tools=tools,
    )

    return agent


def test_agent_knowledge(agent, queries):
    """Test the agent's ability to retrieve knowledge from Vector Search."""
    results = []

    for i, query_data in enumerate(queries):
        query = query_data["query"]
        category = query_data.get("category", "general")

        logger.info(
            f"Testing query {i+1}/{len(queries)}: '{query}' (Category: {category})"
        )

        try:
            # Record the start time
            start_time = time.time()

            # Run the agent with the query
            response = adk.run_agent(agent, query)

            # Record the end time
            end_time = time.time()
            response_time = end_time - start_time

            # Extract the response text
            if hasattr(response, "text"):
                response_text = response.text
            else:
                response_text = str(response)

            # Simple relevance check (can be improved)
            query_terms = set(query.lower().split())
            stop_words = {
                "the",
                "is",
                "are",
                "and",
                "or",
                "in",
                "of",
                "to",
                "a",
                "an",
                "how",
                "what",
                "why",
            }
            query_terms = query_terms - stop_words

            # Count how many query terms appear in the response
            response_lower = response_text.lower()
            matched_terms = sum(1 for term in query_terms if term in response_lower)

            # Calculate relevance score
            if not query_terms:
                relevance_score = 1.0  # All terms were stop words
            else:
                relevance_score = matched_terms / len(query_terms)

            # Determine if the response is relevant
            relevant = relevance_score >= 0.5

            result = {
                "query": query,
                "category": category,
                "response": response_text,
                "response_time": response_time,
                "relevance_score": relevance_score,
                "relevant": relevant,
                "success": True,
            }

            logger.info(
                f"Response relevance: {relevance_score:.2f} ({'✅ Relevant' if relevant else '❌ Not relevant'})"
            )
            logger.info(f"Response time: {response_time:.2f}s")

        except Exception as e:
            logger.error(f"❌ Error testing query: {str(e)}")
            result = {
                "query": query,
                "category": category,
                "response": "",
                "relevance_score": 0.0,
                "relevant": False,
                "success": False,
                "error": str(e),
            }

        results.append(result)

    return results


def main():
    """Main function."""
    args = parse_arguments()

    # Set up logging with appropriate level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Starting agent knowledge retrieval test")

    # Get test queries
    queries = (
        load_queries_from_file(args.queries_file)
        if args.queries_file
        else get_test_queries()
    )

    # Create the agent
    agent = create_test_agent(args.agent)

    # Test the agent's knowledge retrieval
    results = test_agent_knowledge(agent, queries)

    # Calculate success rate
    success_count = sum(1 for result in results if result.get("relevant", False))
    success_rate = success_count / len(results) * 100 if results else 0

    # Summarize by category
    categories = {}
    for result in results:
        category = result.get("category", "unknown")
        if category not in categories:
            categories[category] = {"total": 0, "success": 0}

        categories[category]["total"] += 1
        if result.get("relevant", False):
            categories[category]["success"] += 1

    # Calculate category success rates
    for category, counts in categories.items():
        if counts["total"] > 0:
            counts["rate"] = counts["success"] / counts["total"] * 100
        else:
            counts["rate"] = 0

    # Create summary
    summary = {
        "agent": args.agent,
        "total_queries": len(results),
        "success_count": success_count,
        "success_rate": success_rate,
        "categories": categories,
        "adk_available": adk.is_available(),
        "results": results,
    }

    # Print summary
    logger.info(f"Agent: {args.agent}")
    logger.info(f"Total queries: {len(results)}")
    logger.info(f"Success rate: {success_rate:.1f}% ({success_count}/{len(results)})")
    logger.info("Category breakdown:")
    for category, counts in categories.items():
        logger.info(
            f"  {category}: {counts['rate']:.1f}% ({counts['success']}/{counts['total']})"
        )

    # Save results to file
    if args.output:
        try:
            os.makedirs(os.path.dirname(args.output), exist_ok=True)
            with open(args.output, "w") as f:
                json.dump(summary, f, indent=2)
            logger.info(f"Results saved to {args.output}")
        except Exception as e:
            logger.error(f"Error saving results: {str(e)}")

    return 0 if success_rate >= 70 else 1


if __name__ == "__main__":
    main()
