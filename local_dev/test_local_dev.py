#!/usr/bin/env python
"""
Test script for VANA local development.
This script tests the functionality of the local development environment.
"""

import os
import sys
import time
import json
import logging
import argparse
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vana-test")

# Load environment variables
load_dotenv()

# Default ports
BACKEND_PORT = int(os.environ.get('BACKEND_PORT', 5000))
FRONTEND_PORT = int(os.environ.get('FRONTEND_PORT', 8501))

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Test VANA local development environment')
    parser.add_argument('--backend-port', type=int, default=BACKEND_PORT,
                        help=f'Backend port (default: {BACKEND_PORT})')
    parser.add_argument('--frontend-port', type=int, default=FRONTEND_PORT,
                        help=f'Frontend port (default: {FRONTEND_PORT})')
    parser.add_argument('--wait', type=int, default=5,
                        help='Wait time in seconds for servers to start (default: 5)')
    return parser.parse_args()

def test_backend_health(port):
    """Test backend health endpoint."""
    url = f"http://localhost:{port}/api/health"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'healthy':
                logger.info("✅ Backend health check passed")
                return True
            else:
                logger.error(f"❌ Backend health check failed: {data}")
                return False
        else:
            logger.error(f"❌ Backend health check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Backend health check failed: {str(e)}")
        return False

def test_agent_tools(port):
    """Test agent tools endpoint."""
    url = f"http://localhost:{port}/api/agent/tools"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and 'tools' in data:
                logger.info(f"✅ Agent tools check passed: {len(data['tools'])} tools available")
                return True
            else:
                logger.error(f"❌ Agent tools check failed: {data}")
                return False
        else:
            logger.error(f"❌ Agent tools check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Agent tools check failed: {str(e)}")
        return False

def test_vector_search_health(port):
    """Test Vector Search health endpoint."""
    url = f"http://localhost:{port}/api/vector-search/health"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                logger.info("✅ Vector Search health check passed")
                return True
            else:
                logger.error(f"❌ Vector Search health check failed: {data}")
                return False
        else:
            logger.error(f"❌ Vector Search health check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Vector Search health check failed: {str(e)}")
        return False

def test_vector_search(port):
    """Test Vector Search endpoint."""
    url = f"http://localhost:{port}/api/vector-search/search"
    try:
        response = requests.post(url, json={"query": "What is VANA?", "limit": 3})
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and 'results' in data:
                logger.info(f"✅ Vector Search check passed: {len(data['results'])} results returned")
                return True
            else:
                logger.error(f"❌ Vector Search check failed: {data}")
                return False
        else:
            logger.error(f"❌ Vector Search check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Vector Search check failed: {str(e)}")
        return False

def test_web_search(port):
    """Test Web Search endpoint."""
    url = f"http://localhost:{port}/api/web-search"
    try:
        response = requests.post(url, json={"query": "VANA AI agent", "limit": 3})
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and 'results' in data:
                logger.info(f"✅ Web Search check passed: {len(data['results'])} results returned")
                return True
            else:
                logger.error(f"❌ Web Search check failed: {data}")
                return False
        else:
            logger.error(f"❌ Web Search check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Web Search check failed: {str(e)}")
        return False

def test_agent_message(port):
    """Test agent message endpoint."""
    url = f"http://localhost:{port}/api/agent/message"
    try:
        response = requests.post(url, json={"message": "Hello, VANA!"})
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success' and 'response' in data:
                logger.info(f"✅ Agent message check passed")
                return True
            else:
                logger.error(f"❌ Agent message check failed: {data}")
                return False
        else:
            logger.error(f"❌ Agent message check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Agent message check failed: {str(e)}")
        return False

def test_frontend(port):
    """Test frontend server."""
    url = f"http://localhost:{port}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            logger.info("✅ Frontend check passed")
            return True
        else:
            logger.error(f"❌ Frontend check failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Frontend check failed: {str(e)}")
        return False

def run_tests(backend_port, frontend_port):
    """Run all tests."""
    logger.info("Running tests for VANA local development environment")
    
    # Test backend
    backend_health = test_backend_health(backend_port)
    agent_tools = test_agent_tools(backend_port) if backend_health else False
    vector_search_health = test_vector_search_health(backend_port) if backend_health else False
    vector_search = test_vector_search(backend_port) if vector_search_health else False
    web_search = test_web_search(backend_port) if backend_health else False
    agent_message = test_agent_message(backend_port) if backend_health else False
    
    # Test frontend
    frontend = test_frontend(frontend_port)
    
    # Print summary
    logger.info("\n--- Test Summary ---")
    logger.info(f"Backend Health: {'✅' if backend_health else '❌'}")
    logger.info(f"Agent Tools: {'✅' if agent_tools else '❌'}")
    logger.info(f"Vector Search Health: {'✅' if vector_search_health else '❌'}")
    logger.info(f"Vector Search: {'✅' if vector_search else '❌'}")
    logger.info(f"Web Search: {'✅' if web_search else '❌'}")
    logger.info(f"Agent Message: {'✅' if agent_message else '❌'}")
    logger.info(f"Frontend: {'✅' if frontend else '❌'}")
    
    # Calculate overall status
    backend_tests = [backend_health, agent_tools, vector_search_health, vector_search, web_search, agent_message]
    backend_status = sum(backend_tests) / len(backend_tests) * 100
    
    logger.info(f"\nBackend Status: {backend_status:.1f}% of tests passed")
    logger.info(f"Frontend Status: {'100.0%' if frontend else '0.0%'} of tests passed")
    
    if all(backend_tests) and frontend:
        logger.info("\n✅ All tests passed! The local development environment is working correctly.")
        return True
    else:
        logger.info("\n❌ Some tests failed. Please check the logs for details.")
        return False

if __name__ == '__main__':
    args = parse_args()
    
    # Wait for servers to start
    logger.info(f"Waiting {args.wait} seconds for servers to start...")
    time.sleep(args.wait)
    
    # Run tests
    success = run_tests(args.backend_port, args.frontend_port)
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)
