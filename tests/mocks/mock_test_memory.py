#!/usr/bin/env python3
"""
Mock test script for the VANA memory management system.
This script tests the memory management system without requiring a live n8n instance.
"""

import os
import sys
import json
import logging
from unittest.mock import MagicMock, patch
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

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
    required_vars = ["RAGIE_API_KEY"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these variables in .env.memory or .env file.")
        return False
    
    return True

@patch('requests.post')
def test_memory_system(mock_post):
    """Test the memory management system with mocked HTTP requests"""
    # Import the memory management classes
    from tools.memory.buffer_manager import MemoryBufferManager
    from tools.memory.mcp_interface import MemoryMCP
    
    # Configure the mock to return a successful response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"success": True, "message": "Memory saved successfully"}
    mock_post.return_value = mock_response
    
    # Create the buffer manager and MCP interface
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
    buffer.add_message("assistant", "VANA is a sophisticated multi-agent system...")
    
    # Check buffer contents
    messages = buffer.get_buffer()
    logger.info(f"Buffer contains {len(messages)} messages")
    assert len(messages) == 2, "Buffer should contain 2 messages"
    
    # Test !rag command
    logger.info("Testing !rag command...")
    result = mcp.handle_command("!rag")
    logger.info(f"!rag result: {result}")
    
    # Verify that the webhook was called with the correct data
    mock_post.assert_called_once()
    call_args = mock_post.call_args[1]
    assert 'json' in call_args, "POST request should include JSON data"
    payload = call_args['json']
    assert 'buffer' in payload, "Payload should include buffer"
    assert len(payload['buffer']) == 2, "Buffer should contain 2 messages"
    
    # Test !memory_off command
    logger.info("Testing !memory_off command...")
    result = mcp.handle_command("!memory_off")
    logger.info(f"!memory_off result: {result}")
    assert buffer.memory_on == False, "Memory recording should be off"
    assert len(buffer.get_buffer()) == 0, "Buffer should be empty"
    
    logger.info("All tests passed!")
    return True

def main():
    """Main function"""
    logger.info("Starting memory management system mock test")
    
    # Load environment variables
    if not load_environment():
        return 1
    
    # Run the mock test
    success = test_memory_system()
    
    if success:
        logger.info("Memory management system mock test completed successfully")
        return 0
    else:
        logger.error("Memory management system mock test failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
