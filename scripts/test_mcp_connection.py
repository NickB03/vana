#!/usr/bin/env python3
"""
Test MCP Knowledge Graph Connection Script

This script tests the connection to the MCP Knowledge Graph server
and verifies that the API key, namespace, and server URL are correctly configured.

Usage:
    python scripts/test_mcp_connection.py
"""

import os
import sys
import json
import argparse
import requests
from typing import Dict, Any, List, Optional

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

def load_environment():
    """Load environment variables from .env file."""
    try:
        # Check for .env file in project root
        env_file = ".env"
        if not os.path.exists(env_file):
            # Check for .env file in secrets directory
            env_file = "secrets/.env"
            if not os.path.exists(env_file):
                print("❌ No .env file found in project root or secrets directory.")
                return False
        
        # Load environment variables from the .env file
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    os.environ[key] = value
        return True
    except Exception as e:
        print(f"❌ Error loading environment variables: {e}")
        return False

def load_mcp_config() -> Dict[str, Any]:
    """Load MCP configuration from JSON file."""
    try:
        config_file = "claude-mcp-config.json"
        if not os.path.exists(config_file):
            print(f"❌ MCP config file not found: {config_file}")
            return {}
        
        with open(config_file, "r") as f:
            config = json.load(f)
        
        # Resolve environment variables
        for key, value in config.items():
            if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                env_var = value[2:-1]
                if env_var in os.environ:
                    config[key] = os.environ[env_var]
                else:
                    print(f"⚠️ Environment variable not found: {env_var}")
                    config[key] = ""
        
        return config
    except Exception as e:
        print(f"❌ Error loading MCP config: {e}")
        return {}

def test_knowledge_graph_connection(server_url: str, api_key: str, namespace: str) -> bool:
    """Test connection to the MCP Knowledge Graph server."""
    try:
        # Create headers with API key
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        
        # Create test entity to verify connection
        test_entity = {
            "name": "TestEntity",
            "entityType": "TestType",
            "observations": ["This is a test entity to verify connection"]
        }
        
        # Send request to create entity
        url = f"{server_url}/api/v1/kg/{namespace}/entities"
        response = requests.post(url, headers=headers, json={"entities": [test_entity]})
        
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Successfully connected to MCP Knowledge Graph server.")
            print(f"✅ Created test entity in namespace: {namespace}")
            
            # Delete the test entity to clean up
            delete_url = f"{server_url}/api/v1/kg/{namespace}/entities"
            delete_response = requests.delete(delete_url, headers=headers, json={"entityNames": ["TestEntity"]})
            
            if delete_response.status_code == 200:
                print("✅ Successfully deleted test entity.")
            else:
                print(f"⚠️ Failed to delete test entity. Status code: {delete_response.status_code}")
                print(f"⚠️ Response: {delete_response.text}")
            
            return True
        else:
            print(f"❌ Failed to connect to MCP Knowledge Graph server. Status code: {response.status_code}")
            print(f"❌ Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error testing Knowledge Graph connection: {e}")
        return False

def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Test MCP Knowledge Graph connection")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show verbose output")
    args = parser.parse_args()

    print("📝 Testing MCP Knowledge Graph connection...")
    
    # Load environment variables
    if not load_environment():
        print("❌ Failed to load environment variables.")
        sys.exit(1)
    
    # Load MCP configuration
    mcp_config = load_mcp_config()
    if not mcp_config:
        print("❌ Failed to load MCP configuration.")
        sys.exit(1)
    
    # Get configuration values
    server_url = mcp_config.get("serverUrl", "")
    api_key = mcp_config.get("apiKey", "")
    namespace = mcp_config.get("namespace", "")
    
    # Verify configuration values
    if not server_url:
        print("❌ Missing server URL in MCP configuration.")
        sys.exit(1)
    if not api_key:
        print("❌ Missing API key in MCP configuration.")
        sys.exit(1)
    if not namespace:
        print("❌ Missing namespace in MCP configuration.")
        sys.exit(1)
    
    # Show configuration if verbose
    if args.verbose:
        print(f"🔍 Server URL: {server_url}")
        print(f"🔍 API Key: {'*' * 8 + api_key[-4:] if api_key else 'None'}")
        print(f"🔍 Namespace: {namespace}")
    
    # Test connection
    if test_knowledge_graph_connection(server_url, api_key, namespace):
        print("✅ MCP Knowledge Graph connection test passed.")
        sys.exit(0)
    else:
        print("❌ MCP Knowledge Graph connection test failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
