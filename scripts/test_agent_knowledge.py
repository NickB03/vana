#!/usr/bin/env python3
"""
Test Agent Knowledge Retrieval

This script tests the ability of agents to retrieve knowledge from Vector Search.
It sends queries to the agents and verifies that they can access and use the knowledge base.
"""

import os
import sys
import logging
import argparse
from dotenv import load_dotenv
import vertexai
from google.cloud import aiplatform

# Add the adk-setup directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
adk_setup_dir = os.path.join(parent_dir, 'adk-setup')
sys.path.insert(0, adk_setup_dir)

# Import agent definitions
try:
    from vana.agents.team import ben, rhea, max, sage, kai, juno, root_agent
except ImportError as e:
    print(f"Error importing agent definitions: {str(e)}")
    print(f"Python path: {sys.path}")
    print(f"Looking for: {os.path.join(adk_setup_dir, 'vana', 'agents', 'team.py')}")
    print(f"File exists: {os.path.exists(os.path.join(adk_setup_dir, 'vana', 'agents', 'team.py'))}")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("agent_knowledge_test.log"),
        logging.StreamHandler()
    ]
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
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--agent", choices=["ben", "rhea", "max", "sage", "kai", "juno", "all"],
                        default="ben", help="Agent to test (default: ben)")
    return parser.parse_args()

def setup_logging(verbose=False):
    """Set up logging with appropriate level based on verbose flag."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("agent_knowledge_test.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def test_agent_knowledge(agent, query):
    """Test an agent's ability to retrieve knowledge."""
    logger.info(f"Testing {agent.name} with query: '{query}'")

    try:
        # Initialize Vertex AI
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        aiplatform.init(project=PROJECT_ID, location=LOCATION)

        # Send the query to the agent
        response = agent.generate_content(query)

        # Log the response
        logger.info(f"Response from {agent.name}:")
        logger.info(response.text)

        # Check if the response contains knowledge base information
        if "knowledge base" in response.text.lower() or "vector search" in response.text.lower():
            logger.info(f"✅ {agent.name} successfully retrieved information from the knowledge base")
            return True
        else:
            logger.warning(f"⚠️ {agent.name} may not have used the knowledge base in the response")
            return False

    except Exception as e:
        logger.error(f"❌ Error testing {agent.name}: {str(e)}")
        return False

def main():
    """Main function."""
    args = parse_arguments()

    # Set up logging with appropriate level
    global logger
    logger = setup_logging(args.verbose)

    logger.info("Starting agent knowledge retrieval test")

    # Test queries that should trigger knowledge retrieval
    test_queries = [
        "What is the architecture of VANA agents?",
        "How does Vector Search integration work in this project?",
        "Tell me about the agent hierarchy in VANA",
        "What tools are available to the agents?",
        "How is knowledge shared between agents?"
    ]

    # Select the agent to test
    if args.agent == "all":
        agents = [ben, rhea, max, sage, kai, juno]
    elif args.agent == "ben":
        agents = [ben]
    elif args.agent == "rhea":
        agents = [rhea]
    elif args.agent == "max":
        agents = [max]
    elif args.agent == "sage":
        agents = [sage]
    elif args.agent == "kai":
        agents = [kai]
    elif args.agent == "juno":
        agents = [juno]

    # Test each agent with each query
    results = {}
    for agent in agents:
        agent_results = []
        for query in test_queries:
            success = test_agent_knowledge(agent, query)
            agent_results.append(success)

        # Calculate success rate
        success_rate = sum(agent_results) / len(agent_results) * 100
        results[agent.name] = success_rate

    # Print summary
    logger.info("\n" + "="*50)
    logger.info("AGENT KNOWLEDGE RETRIEVAL TEST SUMMARY")
    logger.info("="*50)

    for agent_name, success_rate in results.items():
        logger.info(f"{agent_name}: {success_rate:.1f}% success rate")

    logger.info("="*50)

    # Overall assessment
    overall_success_rate = sum(results.values()) / len(results)
    if overall_success_rate >= 80:
        logger.info("🎉 SUCCESS: Agents can effectively retrieve knowledge from Vector Search")
    elif overall_success_rate >= 50:
        logger.info("⚠️ PARTIAL SUCCESS: Agents can retrieve knowledge but may need improvement")
    else:
        logger.info("❌ FAILURE: Agents are not effectively retrieving knowledge from Vector Search")

    logger.info("="*50)

if __name__ == "__main__":
    main()
