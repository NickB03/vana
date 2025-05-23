#!/usr/bin/env python3
"""
Run the VANA agent directly.
"""

import os
import sys
from dotenv import load_dotenv

# Add the adk-setup directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "adk-setup"))

# Load environment variables
load_dotenv()

# Import the agent
from vana.agents.team import root_agent

def main():
    """Run the agent."""
    print("🤖 Running VANA agent...")
    
    # Print agent information
    print(f"Agent name: {root_agent.name}")
    print(f"Agent description: {root_agent.description}")
    
    # Start a conversation
    print("\nEnter your message (or 'exit' to quit):")
    
    while True:
        # Get user input
        user_input = input("> ")
        
        if user_input.lower() == "exit":
            break
        
        # Generate a response
        try:
            response = root_agent.generate_content(user_input)
            print(f"\n{response.text}\n")
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    main()
