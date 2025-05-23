#!/usr/bin/env python3
"""
Test script for the search_knowledge function in rag_tools.py
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Import the search_knowledge function
from rag_tools import search_knowledge

def main():
    """Test the search_knowledge function with a sample query"""
    query = "Tell me about VANA's vector search implementation"
    logger.info(f"Testing search_knowledge with query: '{query}'")
    
    try:
        # Call the search_knowledge function
        results = search_knowledge(query)
        
        # Print the results
        logger.info("Search results:")
        logger.info(results)
        
        logger.info("✅ Search test completed successfully!")
        return 0
    except Exception as e:
        logger.error(f"❌ Error testing search_knowledge: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    sys.exit(main())
