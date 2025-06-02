#!/usr/bin/env python3
"""
Test script for the VANA memory management system.
This script simulates a conversation and tests the memory commands.
"""

import logging
import os
import sys

from buffer_manager import MemoryBufferManager
from dotenv import load_dotenv
from mcp_interface import MemoryMCP

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


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


def simulate_conversation(mcp):
    """Simulate a conversation and test memory commands"""
    buffer_manager = mcp.buffer_manager

    # Test memory_on command
    logger.info("Testing !memory_on command...")
    response = mcp.handle_command("!memory_on")
    logger.info(f"Response: {response}")

    # Simulate a conversation
    logger.info("Simulating conversation...")
    user_messages = [
        "How do I implement memory in VANA?",
        "Can you explain how the buffer manager works?",
        "How do I save conversations to Ragie?",
    ]

    assistant_messages = [
        "You can implement memory in VANA using the memory management system. It allows you to record conversations and save them to a knowledge base.",
        "The buffer manager is responsible for storing conversation messages. It has methods to start and stop recording, add messages, and clear the buffer.",
        "You can save conversations to Ragie using the !rag command. This triggers a workflow that formats the conversation and uploads it to Ragie.",
    ]

    for i, (user_msg, assistant_msg) in enumerate(
        zip(user_messages, assistant_messages, strict=False)
    ):
        logger.info(f"User: {user_msg}")
        buffer_manager.add_message("user", user_msg)

        logger.info(f"Assistant: {assistant_msg}")
        buffer_manager.add_message("assistant", assistant_msg)

    # Show buffer status
    logger.info(f"Buffer status: {buffer_manager.get_status()}")
    logger.info(f"Buffer size: {len(buffer_manager.get_buffer())}")

    # Test rag command
    logger.info("Testing !rag command...")
    response = mcp.handle_command("!rag")
    logger.info(f"Response: {response}")

    # Test memory_off command
    logger.info("Testing !memory_off command...")
    response = mcp.handle_command("!memory_off")
    logger.info(f"Response: {response}")

    # Verify buffer is cleared
    logger.info(f"Buffer size after memory_off: {len(buffer_manager.get_buffer())}")


def main():
    """Main function"""
    logger.info("Starting memory management system test")

    # Load environment variables
    if not load_environment():
        return 1

    # Create memory components
    buffer_manager = MemoryBufferManager()
    mcp = MemoryMCP(buffer_manager)

    # Simulate conversation
    simulate_conversation(mcp)

    logger.info("Memory management system test completed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
