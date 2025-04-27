#!/usr/bin/env python3
"""
Test MCP Knowledge Graph Connection

This script tests the connection to the MCP Knowledge Graph server.
It performs basic operations like creating entities, relationships,
and querying the knowledge graph.

Usage:
    python test_mcp_connection.py --server <mcp_server_url> --api-key <api_key>
"""

import argparse
import json
import requests
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('mcp-connection-test')

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test MCP Knowledge Graph Connection')
    parser.add_argument('--server', type=str, default='https://mcp.community.augment.co', 
                        help='MCP server URL')
    parser.add_argument('--namespace', type=str, default='vana-project', 
                        help='Namespace for the knowledge graph')
    parser.add_argument('--api-key', type=str, help='API key for the MCP server')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    return parser.parse_args()

def test_connection(args):
    """Test connection to the MCP server."""
    logger.info(f"Testing connection to MCP server at {args.server}")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    try:
        response = requests.get(
            f"{args.server}/api/health",
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info("✅ Connection successful")
            return True
        else:
            logger.error(f"❌ Connection failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

def test_create_entity(args):
    """Test creating an entity in the knowledge graph."""
    logger.info("Testing entity creation")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    test_entity = {
        "namespace": args.namespace,
        "name": f"test_entity_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "type": "test",
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "test": True
        }
    }
    
    try:
        response = requests.post(
            f"{args.server}/api/entities",
            json=test_entity,
            headers=headers
        )
        
        if response.status_code in (200, 201):
            logger.info(f"✅ Entity created successfully: {test_entity['name']}")
            return test_entity['name']
        else:
            logger.error(f"❌ Entity creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        logger.error(f"❌ Entity creation failed: {e}")
        return None

def test_query_entity(args, entity_name):
    """Test querying an entity from the knowledge graph."""
    logger.info(f"Testing entity query for {entity_name}")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    try:
        response = requests.get(
            f"{args.server}/api/entities/{args.namespace}/{entity_name}",
            headers=headers
        )
        
        if response.status_code == 200:
            logger.info(f"✅ Entity query successful: {entity_name}")
            return True
        else:
            logger.error(f"❌ Entity query failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Entity query failed: {e}")
        return False

def test_create_relationship(args, entity_name):
    """Test creating a relationship in the knowledge graph."""
    logger.info("Testing relationship creation")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    # Create a second entity for the relationship
    second_entity = {
        "namespace": args.namespace,
        "name": f"test_entity_related_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "type": "test",
        "metadata": {
            "created_at": datetime.now().isoformat(),
            "test": True
        }
    }
    
    try:
        response = requests.post(
            f"{args.server}/api/entities",
            json=second_entity,
            headers=headers
        )
        
        if response.status_code not in (200, 201):
            logger.error(f"❌ Second entity creation failed: {response.status_code} - {response.text}")
            return False
        
        # Create relationship
        relationship = {
            "namespace": args.namespace,
            "source": entity_name,
            "target": second_entity["name"],
            "type": "test_relation",
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "test": True
            }
        }
        
        response = requests.post(
            f"{args.server}/api/relationships",
            json=relationship,
            headers=headers
        )
        
        if response.status_code in (200, 201):
            logger.info(f"✅ Relationship created successfully: {entity_name} -> {second_entity['name']}")
            return True
        else:
            logger.error(f"❌ Relationship creation failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"❌ Relationship creation failed: {e}")
        return False

def main():
    """Main function."""
    args = parse_arguments()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Test connection
    if not test_connection(args):
        return
    
    # Test entity creation
    entity_name = test_create_entity(args)
    if not entity_name:
        return
    
    # Test entity query
    if not test_query_entity(args, entity_name):
        return
    
    # Test relationship creation
    if not test_create_relationship(args, entity_name):
        return
    
    logger.info("✅ All tests passed successfully!")

if __name__ == "__main__":
    main()
