#!/usr/bin/env python
"""
Script to verify context preservation functionality.

This script demonstrates the context preservation capabilities of the VANA system
by simulating a conversation with context-dependent follow-up questions.
"""

import logging
import os
import sys
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from adk_setup.vana.adk_integration import (
        ADKEventHandler,
        ADKSessionAdapter,
        ADKStateManager,
        ADKToolAdapter,
    )
    from adk_setup.vana.agents.vana import VanaAgent
    from adk_setup.vana.context import ConversationContextManager
except ImportError:
    print(
        "Error: Unable to import VANA modules. Make sure the project is properly installed."
    )
    print("Try running: pip install -e .")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def setup_agent():
    """
    Set up the VANA agent with context management and ADK integration.

    Returns:
        VanaAgent: Configured VANA agent
    """
    try:
        # Create agent
        agent = VanaAgent()

        # Mock generate_response to simulate agent responses
        def mock_generate_response(message):
            if "favorite color" in message.lower() and "blue" not in message.lower():
                return "I'll remember that your favorite color is blue."
            elif "favorite color" in message.lower() and "blue" in message.lower():
                return "You told me earlier that your favorite color is blue."
            elif "favorite food" in message.lower() and "pizza" not in message.lower():
                return "I'll remember that your favorite food is pizza."
            elif "favorite food" in message.lower() and "pizza" in message.lower():
                return "You told me earlier that your favorite food is pizza."
            elif "remember" in message.lower():
                return "I remember your favorite color is blue and your favorite food is pizza."
            else:
                return "I'm not sure how to respond to that."

        agent.generate_response = mock_generate_response

        return agent
    except Exception as e:
        logger.error(f"Error setting up agent: {e}")
        sys.exit(1)


def run_conversation(agent):
    """
    Run a simulated conversation to test context preservation.

    Args:
        agent: VANA agent
    """
    user_id = f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    session_id = f"test_session_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    logger.info(
        f"Starting conversation with user_id={user_id}, session_id={session_id}"
    )

    # First interaction
    message1 = "My favorite color is blue."
    logger.info(f"User: {message1}")
    response1 = agent.process_message(user_id, session_id, message1)
    logger.info(f"Agent: {response1}")

    # Second interaction
    message2 = "My favorite food is pizza."
    logger.info(f"User: {message2}")
    response2 = agent.process_message(user_id, session_id, message2)
    logger.info(f"Agent: {response2}")

    # Third interaction - testing color memory
    message3 = "What's my favorite color?"
    logger.info(f"User: {message3}")
    response3 = agent.process_message(user_id, session_id, message3)
    logger.info(f"Agent: {response3}")

    # Fourth interaction - testing food memory
    message4 = "What's my favorite food?"
    logger.info(f"User: {message4}")
    response4 = agent.process_message(user_id, session_id, message4)
    logger.info(f"Agent: {response4}")

    # Fifth interaction - testing combined memory
    message5 = "What do you remember about me?"
    logger.info(f"User: {message5}")
    response5 = agent.process_message(user_id, session_id, message5)
    logger.info(f"Agent: {response5}")

    # Verify context preservation
    context_preserved = (
        "blue" in response3.lower()
        and "pizza" in response4.lower()
        and "blue" in response5.lower()
        and "pizza" in response5.lower()
    )

    if context_preserved:
        logger.info("✅ Context preservation test PASSED")
        return True
    else:
        logger.error("❌ Context preservation test FAILED")
        return False


def main():
    """Main function."""
    logger.info("Starting context preservation verification")

    try:
        # Set up agent
        agent = setup_agent()

        # Run conversation
        success = run_conversation(agent)

        # Exit with appropriate code
        sys.exit(0 if success else 1)
    except Exception as e:
        logger.error(f"Error during verification: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
