#!/usr/bin/env python3
"""
Test ADK wrapper with Vector Search integration.

This script tests the ADK wrapper's ability to create an agent with a Vector Search tool.
"""

import os
import sys
import logging
import argparse
from dotenv import load_dotenv

# Add the parent directory to the path so we can import the ADK wrapper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.adk_wrapper import ADKWrapper

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Test ADK wrapper with Vector Search integration")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--query", default="How does Vector Search work in VANA?", 
                        help="Query to test (default: 'How does Vector Search work in VANA?')")
    return parser.parse_args()

def create_search_tool():
    """Create a search tool that uses Vector Search."""
    # Import the search function from the direct test script
    sys.path.append('scripts')
    from test_vector_search_direct import search_knowledge
    
    def search_knowledge_tool(query):
        """Search the knowledge base for information related to the query."""
        logger.info(f"Searching knowledge base for: '{query}'")
        results = search_knowledge(query)
        return results
    
    return search_knowledge_tool

def main():
    """Main function."""
    args = parse_arguments()
    
    # Set logging level based on verbose flag
    if args.verbose:
        logger.setLevel(logging.DEBUG)
        # Also set the handler level
        for handler in logger.handlers:
            handler.setLevel(logging.DEBUG)
    
    logger.info("Starting ADK wrapper test with Vector Search integration")
    
    # Initialize ADK wrapper
    adk_wrapper = ADKWrapper(verbose=args.verbose)
    
    if not adk_wrapper.is_available():
        logger.error("❌ ADK wrapper failed to initialize")
        return 1
    
    logger.info("✅ ADK wrapper initialized successfully")
    
    # Create a search tool
    try:
        search_tool = create_search_tool()
        logger.info("✅ Created search tool")
    except Exception as e:
        logger.error(f"❌ Failed to create search tool: {str(e)}")
        return 1
    
    # Test the search tool directly
    try:
        logger.info(f"Testing search tool with query: '{args.query}'")
        results = search_tool(args.query)
        logger.info("Search results:")
        logger.info(results)
        logger.info("✅ Search tool test successful")
    except Exception as e:
        logger.error(f"❌ Failed to test search tool: {str(e)}")
        return 1
    
    # Try to create an agent with the search tool
    if adk_wrapper.adk_module and hasattr(adk_wrapper.adk_module, 'create_agent'):
        try:
            logger.info("Creating agent with search tool...")
            
            # Define the tool
            search_knowledge_tool_def = {
                "name": "search_knowledge",
                "description": "Search the knowledge base for information related to the query.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "The query to search for."
                        }
                    },
                    "required": ["query"]
                },
                "function": search_tool
            }
            
            # Create the agent
            agent = adk_wrapper.create_agent(
                name="KnowledgeAgent",
                description="An agent that can search the knowledge base.",
                instructions="""You are a helpful assistant that can search the knowledge base for information.
                When asked a question, use the search_knowledge tool to find relevant information.
                Always cite your sources and provide context for your answers.""",
                tools=[search_knowledge_tool_def]
            )
            
            logger.info("✅ Successfully created agent with search tool")
            
            # Test the agent
            try:
                logger.info(f"Testing agent with query: '{args.query}'")
                response = agent.generate_content(args.query)
                logger.info("Agent response:")
                logger.info(response.text)
                logger.info("✅ Agent test successful")
            except Exception as e:
                logger.error(f"❌ Failed to test agent: {str(e)}")
                return 1
            
        except Exception as e:
            logger.error(f"❌ Failed to create agent with search tool: {str(e)}")
            return 1
    else:
        logger.warning("⚠️ ADK module does not support agent creation")
    
    logger.info("✅ ADK wrapper test with Vector Search integration completed successfully")
    return 0

if __name__ == "__main__":
    sys.exit(main())
