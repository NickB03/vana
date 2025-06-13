#!/usr/bin/env python3
"""
Memory Diagnostic Tool for VANA

This script checks the connectivity to the MCP server and tests basic memory operations.
It helps diagnose issues with the memory system and verify the configuration.
"""

import json
import os
import sys
import time
from datetime import datetime

import requests
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

def check_mcp_server():
    """Check if MCP server is accessible."""
    endpoint = os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co")
    namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
    api_key = os.environ.get("MCP_API_KEY", "")
    
    logger.info(f"Checking MCP server at {endpoint}/{namespace}...")
    
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
            logger.info(f"✅ MCP server is accessible")
            logger.info(f"Response: {response.text}")
            return True
        else:
            logger.info(f"❌ MCP server returned status code {response.status_code}")
            logger.info(f"Response: {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Error connecting to MCP server: {e}")
        return False

def test_memory_operations():
    """Test basic memory operations."""
    try:
        from tools.mcp_memory_client import MCPMemoryClient

from lib.logging_config import get_logger

logger = get_logger("vana.memory_diagnostic")

        
        logger.info("Initializing MCP Memory Client...")
        
        # Initialize client
        endpoint = os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co")
        namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
        api_key = os.environ.get("MCP_API_KEY", "")
        
        mcp_client = MCPMemoryClient(endpoint, namespace, api_key)
        
        # Test storing an entity
        test_entity = {
            "name": f"Test Entity {datetime.now().isoformat()}",
            "type": "Test",
            "observations": ["This is a test entity created for diagnostic purposes"]
        }
        
        logger.info("%s", f"Storing test entity: {test_entity['name']}...")
        
        try:
            result = mcp_client.store_entity(
                test_entity["name"],
                test_entity["type"],
                test_entity["observations"]
            )
            
            if "success" in result and result["success"]:
                logger.info("✅ Test entity stored successfully")
            else:
                logger.error("%s", f"❌ Failed to store test entity: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"❌ Error storing test entity: {e}")
        
        # Test retrieving an entity
        logger.info("%s", f"Retrieving test entity: {test_entity['name']}...")
        
        try:
            result = mcp_client.retrieve_entity(test_entity["name"])
            
            if "entity" in result:
                logger.info("✅ Test entity retrieved successfully")
                logger.debug("%s", f"Entity data: {json.dumps(result['entity'], indent=2)}")
            else:
                logger.error("%s", f"❌ Failed to retrieve test entity: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"❌ Error retrieving test entity: {e}")
        
        # Test initial data load
        logger.info("Testing initial data load...")
        
        try:
            result = mcp_client.get_initial_data()
            
            if "entities" in result:
                logger.info("%s", f"✅ Initial data loaded successfully ({len(result['entities'])} entities)")
            else:
                logger.error("%s", f"❌ Failed to load initial data: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"❌ Error loading initial data: {e}")
        
        # Test delta sync
        logger.info("Testing delta sync...")
        
        try:
            result = mcp_client.sync_delta()
            
            if "added" in result or "modified" in result or "deleted" in result:
                added = len(result.get("added", []))
                modified = len(result.get("modified", []))
                deleted = len(result.get("deleted", []))
                logger.info(f"✅ Delta sync successful (Added: {added}, Modified: {modified}, Deleted: {deleted})")
            else:
                logger.error("%s", f"❌ Failed to perform delta sync: {result.get('error', 'Unknown error')}")
        except Exception as e:
            logger.error(f"❌ Error performing delta sync: {e}")
            
    except ImportError as e:
        logger.error(f"❌ Error importing memory components: {e}")
        logger.info("%s", "Make sure you're running this script from the project root directory.")
    except Exception as e:
        logger.error(f"❌ Unexpected error in memory operations test: {e}")

def check_environment_variables():
    """Check if required environment variables are set."""
    logger.info("Checking environment variables...")
    
    variables = {
        "MCP_ENDPOINT": os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
        "MCP_NAMESPACE": os.environ.get("MCP_NAMESPACE", "vana-project"),
        "MCP_API_KEY": os.environ.get("MCP_API_KEY", ""),
        "VECTOR_SEARCH_ENDPOINT_ID": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID", ""),
        "DEPLOYED_INDEX_ID": os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex"),
        "GOOGLE_CLOUD_PROJECT": os.environ.get("GOOGLE_CLOUD_PROJECT", ""),
        "GOOGLE_CLOUD_LOCATION": os.environ.get("GOOGLE_CLOUD_LOCATION", "")
    }
    
    all_set = True
    
    for name, value in variables.items():
        if value:
            logger.info("%s", f"✅ {name} is set to: {value[:5]}{'*' * (len(value) - 5) if len(value) > 5 else ''}")
        else:
            logger.info(f"❌ {name} is not set")
            all_set = False
    
    return all_set

if __name__ == "__main__":
    logger.info("=== VANA Memory System Diagnostic ===\n")
    
    # Check environment variables
    logger.info("\n--- Checking Environment Variables ---")
    env_vars_set = check_environment_variables()
    
    if not env_vars_set:
        logger.info("\n⚠️ Some environment variables are not set. This may affect functionality.")
    
    # Check MCP server
    logger.info("\n--- Checking MCP Server ---")
    mcp_available = check_mcp_server()
    
    # Test memory operations
    if mcp_available:
        logger.info("\n--- Testing Memory Operations ---")
        test_memory_operations()
    else:
        logger.info("\n⚠️ Skipping memory operations test as MCP server is not available")
    
    logger.info("\n=== Diagnostic Complete ===")
