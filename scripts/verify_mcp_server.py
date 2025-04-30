#!/usr/bin/env python3
"""
Verify MCP Server Connectivity

This script tests the connection to the MCP Knowledge Graph Memory Server
and provides diagnostic information about its status.
"""

import os
import sys
import requests
import json
import time
from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

def check_mcp_server():
    """Check if MCP server is accessible."""
    endpoint = os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co")
    namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
    api_key = os.environ.get("MCP_API_KEY", "")
    
    print(f"Checking MCP server at {endpoint}/{namespace}...")
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    try:
        response = requests.get(
            f"{endpoint}/{namespace}/status",
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 200:
            print(f"✅ MCP server is accessible")
            print(f"Response: {response.text}")
            return True
        else:
            print(f"❌ MCP server returned status code {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to MCP server: {e}")
        return False

def test_memory_operations():
    """Test basic memory operations."""
    try:
        from tools.mcp_memory_client import MCPMemoryClient
        from tools.memory_manager import MemoryManager
    except ImportError as e:
        print(f"❌ Error importing memory components: {e}")
        print("Make sure you're running this script from the project root directory.")
        return False
    
    print("Initializing memory components...")
    
    # Initialize components
    try:
        mcp_client = MCPMemoryClient()
        print("✅ MCPMemoryClient initialized")
    except Exception as e:
        print(f"❌ Error initializing MCPMemoryClient: {e}")
        return False
    
    try:
        memory_manager = MemoryManager(mcp_client)
        print("✅ MemoryManager initialized")
    except Exception as e:
        print(f"❌ Error initializing MemoryManager: {e}")
        return False
    
    # Try to initialize
    print("Initializing memory manager...")
    try:
        success = memory_manager.initialize()
        
        if success:
            print("✅ Memory manager initialized successfully")
            print(f"Loaded {len(memory_manager.local_cache)} entities")
        else:
            print("❌ Memory manager initialization failed")
    except Exception as e:
        print(f"❌ Error during memory manager initialization: {e}")
        return False
    
    # Test storing an entity
    test_entity = {
        "name": "Test Entity",
        "type": "Test",
        "observations": ["This is a test entity created for diagnostic purposes"]
    }
    
    print(f"Storing test entity: {test_entity['name']}...")
    
    try:
        result = mcp_client.store_entity(
            test_entity["name"],
            test_entity["type"],
            test_entity["observations"]
        )
        
        if result.get("success", False):
            print("✅ Test entity stored successfully")
            print(f"Entity ID: {result.get('entity', {}).get('id', 'Unknown')}")
            return True
        else:
            print(f"❌ Failed to store test entity: {result.get('message', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ Error storing test entity: {e}")
        return False

if __name__ == "__main__":
    print("=== VANA Memory System Diagnostic ===\n")
    
    # Check MCP server
    mcp_available = check_mcp_server()
    
    # Test memory operations
    if mcp_available:
        print("\n--- Testing Memory Operations ---")
        test_memory_operations()
    else:
        print("\n⚠️ Skipping memory operations test as MCP server is not available")
    
    print("\n=== Diagnostic Complete ===")
