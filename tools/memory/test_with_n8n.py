#!/usr/bin/env python3
"""
Test script for the VANA memory management system with a real n8n instance.
This script tests the memory management system with a real n8n instance.
"""

import logging
import os
import sys

import requests
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))


def load_environment():
    """Load environment variables from .env file"""
    # Try to load from .env.memory first, then fall back to .env
    if os.path.exists(".env.memory"):
        load_dotenv(".env.memory")
        logger.info("Loaded environment variables from .env.memory")
    elif os.path.exists(".env"):
        load_dotenv(".env")
        logger.info("Loaded environment variables from .env")
    else:
        logger.warning("No .env file found. Using existing environment variables.")

    # Check required environment variables
    required_vars = ["N8N_WEBHOOK_URL", "RAGIE_API_KEY"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]

    if missing_vars:
        logger.error(
            f"Missing required environment variables: {', '.join(missing_vars)}"
        )
        logger.error("Please set these variables in .env.memory or .env file.")
        return False

    return True


def test_memory_system():
    """Test the memory management system with a real n8n instance"""
    # Import the memory management classes
    from tools.memory.buffer_manager import MemoryBufferManager
    from tools.memory.mcp_interface import MemoryMCP

    # Create memory components
    buffer = MemoryBufferManager()
    mcp = MemoryMCP(buffer)

    # Test !memory_on command
    logger.info("Testing !memory_on command...")
    result = mcp.handle_command("!memory_on")
    logger.info(f"!memory_on result: {result}")
    assert buffer.memory_on == True, "Memory recording should be on"

    # Add some messages to the buffer
    logger.info("Adding messages to buffer...")
    buffer.add_message("user", "Tell me about VANA")
    buffer.add_message(
        "assistant",
        "VANA is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with specialized AI agents led by a coordinator agent (Ben), all sharing knowledge through Vector Search.",
    )

    # Check buffer contents
    messages = buffer.get_buffer()
    logger.info(f"Buffer contains {len(messages)} messages")
    assert len(messages) == 2, "Buffer should contain 2 messages"

    # Test !rag command
    logger.info("Testing !rag command...")
    result = mcp.handle_command("!rag")
    logger.info(f"!rag result: {result}")

    # Test !memory_off command
    logger.info("Testing !memory_off command...")
    result = mcp.handle_command("!memory_off")
    logger.info(f"!memory_off result: {result}")
    assert buffer.memory_on == False, "Memory recording should be off"
    assert len(buffer.get_buffer()) == 0, "Buffer should be empty"

    logger.info("All tests passed!")
    return True


def test_direct_webhook():
    """Test the webhook directly"""
    webhook_url = os.environ.get("N8N_WEBHOOK_URL")
    webhook_user = os.environ.get("N8N_WEBHOOK_USER")
    webhook_password = os.environ.get("N8N_WEBHOOK_PASSWORD")

    if not webhook_url:
        logger.error("N8N_WEBHOOK_URL not set")
        return False

    auth = None
    if webhook_user and webhook_password:
        auth = (webhook_user, webhook_password)

    # Create a test payload
    payload = {
        "buffer": [
            {
                "role": "user",
                "content": "Tell me about VANA",
                "timestamp": "2025-04-26T22:45:58.463149",
            },
            {
                "role": "assistant",
                "content": "VANA is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with specialized AI agents led by a coordinator agent (Ben), all sharing knowledge through Vector Search.",
                "timestamp": "2025-04-26T22:45:58.463149",
            },
        ],
        "memory_on": True,
        "timestamp": "2025-04-26T22:45:58.463149",
    }

    # Send the request
    logger.info(f"Sending direct webhook request to {webhook_url}")
    try:
        response = requests.post(webhook_url, json=payload, auth=auth, timeout=10)
        response.raise_for_status()
        logger.info(f"Response: {response.json()}")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Error sending webhook request: {e}")
        return False


def main():
    """Main function"""
    logger.info("Starting memory management system test with real n8n")

    # Load environment variables
    if not load_environment():
        return 1

    # Test direct webhook
    logger.info("Testing direct webhook...")
    webhook_success = test_direct_webhook()

    if webhook_success:
        logger.info("Direct webhook test passed")
    else:
        logger.error("Direct webhook test failed")
        logger.info("Continuing with memory system test...")

    # Test memory system
    logger.info("Testing memory system...")
    memory_success = test_memory_system()

    if memory_success:
        logger.info("Memory system test passed")
    else:
        logger.error("Memory system test failed")

    if webhook_success and memory_success:
        logger.info("All tests passed!")
        return 0
    else:
        logger.error("Some tests failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
