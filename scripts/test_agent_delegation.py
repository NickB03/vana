#!/usr/bin/env python3
"""
Test Agent Delegation with Knowledge

This script tests if knowledge about agent delegation and specialization
is correctly retrieved from Vector Search.
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

# Import the direct Vector Search function
from scripts.test_vector_search_direct import search_knowledge

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Define the agent specialists for VANA
AGENTS = {
    "Ben": ["coordinator", "lead", "project management"],
    "Rhea": ["meta-architect", "architecture", "system design"],
    "Max": ["interaction", "interface", "user experience"],
    "Sage": ["platform", "automation", "infrastructure"],
    "Kai": ["edge cases", "debugging", "testing"],
    "Juno": ["story", "narrative", "content"],
}


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Test agent delegation with knowledge")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--output", help="Output file for test results (JSON)")
    parser.add_argument("--scenarios-file", help="JSON file with delegation scenarios")
    return parser.parse_args()


def get_delegation_scenarios():
    """Get a list of scenarios for testing agent delegation knowledge."""
    return [
        {
            "query": "Who handles architecture design in VANA?",
            "expected_agent": "Rhea",
            "category": "agent_role",
        },
        {
            "query": "Which agent is responsible for user interface?",
            "expected_agent": "Max",
            "category": "agent_role",
        },
        {
            "query": "Who leads the VANA project?",
            "expected_agent": "Ben",
            "category": "agent_role",
        },
        {
            "query": "Which agent manages infrastructure?",
            "expected_agent": "Sage",
            "category": "agent_role",
        },
        {
            "query": "Who handles edge cases and testing?",
            "expected_agent": "Kai",
            "category": "agent_role",
        },
        {
            "query": "Which agent is the story engineer?",
            "expected_agent": "Juno",
            "category": "agent_role",
        },
        {
            "query": "How do agents collaborate in VANA?",
            "expected_agent": "Ben",  # Coordinator would know about collaboration
            "category": "collaboration",
        },
        {
            "query": "What is the agent hierarchy in VANA?",
            "expected_agent": "Ben",  # Coordinator would know about hierarchy
            "category": "hierarchy",
        },
        {
            "query": "How does task delegation work in VANA?",
            "expected_agent": "Ben",  # Coordinator handles delegation
            "category": "delegation",
        },
        {
            "query": "What specializations do VANA agents have?",
            "expected_agent": None,  # All agents should be mentioned
            "category": "specialization",
        },
    ]


def load_scenarios_from_file(file_path):
    """Load delegation scenarios from a JSON file."""
    try:
        with open(file_path) as f:
            scenarios = json.load(f)
        logger.info(f"Loaded {len(scenarios)} scenarios from {file_path}")
        return scenarios
    except Exception as e:
        logger.error(f"Error loading scenarios from {file_path}: {str(e)}")
        return get_delegation_scenarios()


def agent_mentioned_in_text(agent_name, text):
    """Check if an agent is mentioned in text, including their specialties."""
    if agent_name.lower() in text.lower():
        return True

    # Check for agent specialties
    if agent_name in AGENTS:
        for specialty in AGENTS[agent_name]:
            if specialty.lower() in text.lower():
                return True

    return False


def test_agent_delegation(scenarios):
    """Test if the knowledge base contains correct agent delegation information."""
    results = []

    for i, scenario in enumerate(scenarios):
        query = scenario["query"]
        expected_agent = scenario["expected_agent"]
        category = scenario.get("category", "unknown")

        logger.info(
            f"Testing scenario {i+1}/{len(scenarios)}: '{query}' (Expected: {expected_agent}, Category: {category})"
        )

        try:
            # Record the start time
            start_time = time.time()

            # Search the knowledge base directly
            response = search_knowledge(query)

            # Record the end time
            end_time = time.time()
            response_time = end_time - start_time

            # Check if the expected agent is mentioned in the response
            if expected_agent:
                success = agent_mentioned_in_text(expected_agent, response)
                logger.info(f"Expected agent {expected_agent} mentioned: {success}")
            else:
                # For scenarios where all agents should be mentioned
                mentioned_agents = [
                    agent
                    for agent in AGENTS.keys()
                    if agent_mentioned_in_text(agent, response)
                ]
                success = (
                    len(mentioned_agents) >= 3
                )  # At least 3 agents should be mentioned
                logger.info(
                    f"Agents mentioned: {mentioned_agents} ({len(mentioned_agents)}/{len(AGENTS)})"
                )

            result = {
                "query": query,
                "expected_agent": expected_agent,
                "category": category,
                "response": response,
                "response_time": response_time,
                "success": success,
            }

            if expected_agent is None:
                result["mentioned_agents"] = mentioned_agents

            logger.info(f"Response time: {response_time:.2f}s")

        except Exception as e:
            logger.error(f"❌ Error testing scenario: {str(e)}")
            result = {
                "query": query,
                "expected_agent": expected_agent,
                "category": category,
                "response": "",
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

    logger.info("Starting agent delegation test")

    # Get delegation scenarios
    scenarios = (
        load_scenarios_from_file(args.scenarios_file)
        if args.scenarios_file
        else get_delegation_scenarios()
    )

    # Test agent delegation
    results = test_agent_delegation(scenarios)

    # Calculate success rate
    success_count = sum(1 for result in results if result.get("success", False))
    success_rate = success_count / len(results) * 100 if results else 0

    # Summarize by category
    categories = {}
    for result in results:
        category = result.get("category", "unknown")
        if category not in categories:
            categories[category] = {"total": 0, "success": 0}

        categories[category]["total"] += 1
        if result.get("success", False):
            categories[category]["success"] += 1

    # Calculate category success rates
    for category, counts in categories.items():
        if counts["total"] > 0:
            counts["rate"] = counts["success"] / counts["total"] * 100
        else:
            counts["rate"] = 0

    # Create summary
    summary = {
        "total_scenarios": len(results),
        "success_count": success_count,
        "success_rate": success_rate,
        "categories": categories,
        "results": results,
    }

    # Print summary
    logger.info(f"Total scenarios: {len(results)}")
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
    sys.exit(main())
