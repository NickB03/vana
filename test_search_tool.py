#!/usr/bin/env python3
"""
Test the search_knowledge_tool function from the VANA codebase.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the VANA directory to the Python path
sys.path.append(os.getcwd())

# Try to import the search_knowledge_tool function
try:
    from tools.search_knowledge_tool import search_knowledge_tool
    
    def main():
        # Get a query from the user
        query = input("Enter your search query: ")
        
        # Call the search_knowledge_tool function
        results = search_knowledge_tool(query)
        
        # Display the results
        print(f"\nResults:\n{results}")
    
    if __name__ == "__main__":
        main()
except ImportError as e:
    print(f"Error importing search_knowledge_tool: {str(e)}")
    print("\nThe search_knowledge_tool function might not be available in the current codebase.")
    print("Please check if the tools/search_knowledge_tool.py file exists and is properly configured.")
