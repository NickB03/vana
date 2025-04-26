#!/usr/bin/env python3
"""
Run a memory-enabled agent for testing

This script provides a simple text interface for testing the
memory-enabled Ben agent outside of the ADK web interface.

Requires:
    - .env file with RAGIE_API_KEY set
    - ADK package installed
"""

import os
from dotenv import load_dotenv
from google.adk import Agent
from google.adk.run import Orchestrator
from adk-setup.vana.agents.memory_enabled_ben import get_agent

# Load environment variables from .env file
load_dotenv()

# Check for required environment variables
if not os.environ.get('RAGIE_API_KEY'):
    print("Error: RAGIE_API_KEY environment variable not set")
    print("Create a .env file with your Ragie API key")
    exit(1)

def main():
    # Create agent
    ben = get_agent()
    orchestrator = Orchestrator()
    
    print("Memory-Enabled Ben Agent")
    print("=======================")
    print("Type 'exit' to quit\n")
    
    # Simple conversation loop
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'exit':
            break
            
        # Process the input with the agent
        response = orchestrator.process_interaction(ben, user_input)
        print(f"\nBen: {response}\n")

if __name__ == "__main__":
    main()
