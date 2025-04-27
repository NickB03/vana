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
import sys
import uuid
from dotenv import load_dotenv
from google.adk import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

# Add the adk-setup directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'adk-setup'))

# Now import the agent
from vana.agents.memory_enabled_ben import get_agent

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

    # Create a session service
    session_service = InMemorySessionService()

    # Define constants for identifying the interaction context
    app_name = "memory-test"
    user_id = f"test-user-{uuid.uuid4()}"  # Generate a unique user ID each time
    session_id = str(uuid.uuid4())

    # Create the session first
    session = session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=session_id
    )
    print(f"Session created: App='{app_name}', User='{user_id}', Session='{session_id}'")

    # Create a runner with the session service
    runner = Runner(
        app_name=app_name,
        agent=ben,
        session_service=session_service,
    )

    print("Memory-Enabled Ben Agent")
    print("=======================")
    print("Type 'exit' to quit\n")

    # Simple conversation loop
    while True:
        user_input = input("You: ")
        if user_input.lower() == 'exit':
            break

        # Create a content object with the user's input
        message = Content(
            parts=[Part(text=user_input)],
            role="user"
        )

        # Process the input with the agent
        response_text = ""
        try:
            for event in runner.run(
                user_id=user_id,
                session_id=session_id,
                new_message=message
            ):
                # In ADK 0.3.0, the event structure is different
                # Let's print the event to see its structure
                print(f"Event: {event}")

                # Try to extract the response text based on the event structure
                if hasattr(event, 'content'):
                    response_text = event.content.text if hasattr(event.content, 'text') else str(event.content)
                elif hasattr(event, 'data') and isinstance(event.data, dict):
                    response_text = event.data.get("text", str(event.data))
                else:
                    response_text = str(event)

            print(f"\nBen: {response_text}\n")
        except Exception as e:
            print(f"\nError processing agent response: {e}\n")

if __name__ == "__main__":
    main()
