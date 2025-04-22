#!/usr/bin/env python3
"""
End-to-End Test for VANA Agent System

This script tests the entire VANA agent system end-to-end, including:
1. Agent initialization
2. Knowledge retrieval from Vector Search
3. Agent delegation
4. Cross-agent communication
"""

import os
import sys
import logging
import argparse
import time
from dotenv import load_dotenv
import vertexai
from google.cloud import aiplatform

# Add the adk-setup directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'adk-setup'))

# Import agent definitions
try:
    from vana.agents.team import ben, rhea, max, sage, kai, juno, root_agent
except ImportError:
    print("Error importing agent definitions. Make sure the adk-setup directory is in your Python path.")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("end_to_end_test.log"),
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
    parser = argparse.ArgumentParser(description="End-to-end test for VANA agent system")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--test-type", choices=["knowledge", "delegation", "all"], 
                        default="all", help="Type of test to run (default: all)")
    return parser.parse_args()

def setup_logging(verbose=False):
    """Set up logging with appropriate level based on verbose flag."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("end_to_end_test.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def test_knowledge_retrieval():
    """Test knowledge retrieval from Vector Search."""
    logger.info("Testing knowledge retrieval...")
    
    # Queries that should trigger knowledge retrieval
    queries = [
        "What is the architecture of VANA agents?",
        "How does Vector Search integration work in this project?"
    ]
    
    success = True
    for query in queries:
        logger.info(f"Testing query: '{query}'")
        
        try:
            # Send the query to Ben
            response = ben.generate_content(query)
            
            # Log the response
            logger.info(f"Response from Ben:")
            logger.info(response.text)
            
            # Check if the response contains knowledge base information
            if "knowledge base" in response.text.lower() or "vector search" in response.text.lower():
                logger.info(f"✅ Successfully retrieved information from the knowledge base")
            else:
                logger.warning(f"⚠️ May not have used the knowledge base in the response")
                success = False
        
        except Exception as e:
            logger.error(f"❌ Error testing knowledge retrieval: {str(e)}")
            success = False
    
    return success

def test_agent_delegation():
    """Test delegation from Ben to specialist agents."""
    logger.info("Testing agent delegation...")
    
    # Queries that should trigger delegation to specialist agents
    delegation_queries = [
        "Design a new agent architecture for our system",  # Should delegate to Rhea
        "Create a user interface for visualizing agent decisions",  # Should delegate to Max
        "Set up a self-healing infrastructure for our platform",  # Should delegate to Sage
        "Identify potential edge cases in our agent system",  # Should delegate to Kai
        "Create documentation for our agent system"  # Should delegate to Juno
    ]
    
    success = True
    for query in delegation_queries:
        logger.info(f"Testing delegation query: '{query}'")
        
        try:
            # Send the query to Ben
            response = ben.generate_content(query)
            
            # Log the response
            logger.info(f"Response from Ben:")
            logger.info(response.text)
            
            # Check if the response mentions delegation or specialist agents
            delegation_terms = ["delegate", "specialist", "rhea", "max", "sage", "kai", "juno"]
            if any(term in response.text.lower() for term in delegation_terms):
                logger.info(f"✅ Ben successfully mentioned delegation or specialist agents")
            else:
                logger.warning(f"⚠️ Ben may not have delegated the task")
                success = False
        
        except Exception as e:
            logger.error(f"❌ Error testing agent delegation: {str(e)}")
            success = False
    
    return success

def run_end_to_end_test(test_type="all"):
    """Run the end-to-end test."""
    logger.info("Starting end-to-end test for VANA agent system")
    
    try:
        # Initialize Vertex AI
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Run the selected tests
        knowledge_success = True
        delegation_success = True
        
        if test_type in ["knowledge", "all"]:
            knowledge_success = test_knowledge_retrieval()
        
        if test_type in ["delegation", "all"]:
            delegation_success = test_agent_delegation()
        
        # Print summary
        logger.info("\n" + "="*50)
        logger.info("END-TO-END TEST SUMMARY")
        logger.info("="*50)
        
        if test_type in ["knowledge", "all"]:
            logger.info(f"Knowledge Retrieval: {'✅ PASSED' if knowledge_success else '❌ FAILED'}")
        
        if test_type in ["delegation", "all"]:
            logger.info(f"Agent Delegation: {'✅ PASSED' if delegation_success else '❌ FAILED'}")
        
        logger.info("="*50)
        
        # Overall assessment
        if test_type == "all":
            if knowledge_success and delegation_success:
                logger.info("🎉 SUCCESS: End-to-end test passed")
            elif knowledge_success or delegation_success:
                logger.info("⚠️ PARTIAL SUCCESS: Some tests passed, some failed")
            else:
                logger.info("❌ FAILURE: All tests failed")
        elif test_type == "knowledge":
            if knowledge_success:
                logger.info("🎉 SUCCESS: Knowledge retrieval test passed")
            else:
                logger.info("❌ FAILURE: Knowledge retrieval test failed")
        elif test_type == "delegation":
            if delegation_success:
                logger.info("🎉 SUCCESS: Agent delegation test passed")
            else:
                logger.info("❌ FAILURE: Agent delegation test failed")
        
        logger.info("="*50)
        
        return knowledge_success and delegation_success
    
    except Exception as e:
        logger.error(f"❌ Error running end-to-end test: {str(e)}")
        return False

def main():
    """Main function."""
    args = parse_arguments()
    
    # Set up logging with appropriate level
    global logger
    logger = setup_logging(args.verbose)
    
    # Run the end-to-end test
    success = run_end_to_end_test(args.test_type)
    
    # Return exit code based on success
    return 0 if success else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
