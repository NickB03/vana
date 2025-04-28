#!/usr/bin/env python
"""
Test MCP Connection for VANA

This script tests the connection to the MCP server to verify proper configuration
and accessibility. It performs basic Knowledge Graph and Vector Search operations
to ensure that all tools are properly connected.

Usage:
    python scripts/test_mcp_connection.py [--api-key API_KEY]

Options:
    --api-key API_KEY   Override the API key in the config file
"""

import json
import os
import sys
import argparse
import requests
from dotenv import load_dotenv

# Add root directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def load_config():
    """Load MCP configuration from file"""
    try:
        with open("claude-mcp-config.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: claude-mcp-config.json not found")
        return None
    except json.JSONDecodeError:
        print("Error: Invalid JSON in claude-mcp-config.json")
        return None

def test_server_connection(config, api_key=None):
    """Test basic connection to MCP server"""
    # Use PLACEHOLDER_MCP_SERVER_URL in the config file
    url = f"{config['serverUrl']}/api/v1/health"

    # Use provided API key or default from config
    headers = {
        "Authorization": f"Bearer {api_key or config['apiKey'].replace('${MCP_API_KEY}', os.environ.get('MCP_API_KEY', ''))}"
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        print(f"✅ Server connection successful: {url}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"❌ Server connection failed: {e}")
        return False

def test_knowledge_graph(config, api_key=None):
    """Test Knowledge Graph functionality"""
    url = f"{config['serverUrl']}/api/v1/{config['namespace']}/knowledge-graph/query"

    # Use provided API key or default from config
    headers = {
        "Authorization": f"Bearer {api_key or config['apiKey'].replace('${MCP_API_KEY}', os.environ.get('MCP_API_KEY', ''))}",
        "Content-Type": "application/json"
    }

    # Simple query to test connection
    payload = {
        "query": "*"
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        # Check if we got a valid response
        if "entities" in data:
            print(f"✅ Knowledge Graph query successful: {len(data['entities'])} entities found")
            return True
        else:
            print("❌ Knowledge Graph query failed: Invalid response format")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Knowledge Graph query failed: {e}")
        return False

def test_vector_search(config, api_key=None):
    """Test Vector Search functionality through MCP"""
    url = f"{config['serverUrl']}/api/v1/{config['namespace']}/vector-search/query"

    # Use provided API key or default from config
    headers = {
        "Authorization": f"Bearer {api_key or config['apiKey'].replace('${MCP_API_KEY}', os.environ.get('MCP_API_KEY', ''))}",
        "Content-Type": "application/json"
    }

    # Simple query to test connection
    payload = {
        "query": "What is VANA?",
        "top_k": 3
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()

        # Check if we got a valid response
        if "results" in data:
            print(f"✅ Vector Search query successful: {len(data['results'])} results found")
            return True
        else:
            print("❌ Vector Search query failed: Invalid response format")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Vector Search query failed: {e}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Test MCP connection for VANA")
    parser.add_argument("--api-key", help="Override the API key in the config file")
    args = parser.parse_args()

    # Load config
    config = load_config()
    if not config:
        sys.exit(1)

    print(f"Testing connection to MCP server: {config['serverUrl']}")
    print(f"Namespace: {config['namespace']}")
    print("-----------------------------------")

    # Test server connection
    server_ok = test_server_connection(config, args.api_key)
    if not server_ok:
        print("\nError: Could not connect to MCP server")
        print("Please check your API key and server URL")
        print("You may need to set the MCP_API_KEY environment variable or use --api-key")
        sys.exit(1)

    # Test Knowledge Graph
    kg_ok = test_knowledge_graph(config, args.api_key)

    # Test Vector Search
    vs_ok = test_vector_search(config, args.api_key)

    # Print summary
    print("\nTest Results:")
    print(f"Server Connection: {'✅ PASS' if server_ok else '❌ FAIL'}")
    print(f"Knowledge Graph: {'✅ PASS' if kg_ok else '❌ FAIL'}")
    print(f"Vector Search: {'✅ PASS' if vs_ok else '❌ FAIL'}")

    # Overall result
    if server_ok and kg_ok and vs_ok:
        print("\n✅ All tests passed! Your MCP connection is properly configured.")
        return 0
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
