#!/usr/bin/env python
"""
Frontend server for VANA local development.
This script starts a Streamlit server for the VANA frontend.
"""

import os
import sys
import logging
import subprocess
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vana-frontend")

# Load environment variables
load_dotenv()

def check_dashboard_exists():
    """Check if the dashboard directory exists."""
    if not os.path.exists('dashboard'):
        logger.error("Dashboard directory not found. Make sure symbolic links are set up correctly.")
        return False
    return True

def check_streamlit_app():
    """Check if the Streamlit app exists."""
    if not os.path.exists('dashboard/streamlit_app.py'):
        logger.error("Streamlit app not found. Make sure the dashboard is set up correctly.")
        return False
    return True

def start_streamlit():
    """Start the Streamlit server."""
    port = int(os.environ.get('FRONTEND_PORT', 8501))
    logger.info(f"Starting VANA frontend server on port {port}")
    
    # Set environment variables for Streamlit
    env = os.environ.copy()
    env['STREAMLIT_SERVER_PORT'] = str(port)
    env['STREAMLIT_SERVER_HEADLESS'] = 'true'
    env['STREAMLIT_SERVER_ENABLE_CORS'] = 'true'
    env['STREAMLIT_BROWSER_GATHER_USAGE_STATS'] = 'false'
    
    # Set API endpoint for backend
    backend_port = int(os.environ.get('BACKEND_PORT', 5000))
    env['VANA_API_ENDPOINT'] = f"http://localhost:{backend_port}/api"
    
    try:
        # Start Streamlit server
        process = subprocess.Popen(
            ['streamlit', 'run', 'dashboard/streamlit_app.py'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Print Streamlit output
        for line in process.stdout:
            print(line, end='')
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode != 0:
            logger.error(f"Streamlit server exited with code {process.returncode}")
            for line in process.stderr:
                print(line, end='')
    except KeyboardInterrupt:
        logger.info("Stopping Streamlit server...")
        process.terminate()
    except Exception as e:
        logger.error(f"Error starting Streamlit server: {str(e)}")
        sys.exit(1)

def create_simple_app():
    """Create a simple Streamlit app for testing."""
    logger.info("Creating simple Streamlit app for testing...")
    
    # Create app directory if it doesn't exist
    os.makedirs('simple_app', exist_ok=True)
    
    # Create simple app
    with open('simple_app/app.py', 'w') as f:
        f.write("""
import streamlit as st
import requests
import os
import json

# Set page config
st.set_page_config(
    page_title="VANA Test App",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Define API endpoint
BACKEND_PORT = os.environ.get('BACKEND_PORT', 5000)
API_ENDPOINT = f"http://localhost:{BACKEND_PORT}/api"

# Add title
st.title("VANA Test App")
st.markdown("This is a simple test app for VANA local development.")

# Add sidebar
st.sidebar.title("VANA Test App")
st.sidebar.markdown("Test different VANA features:")

# Health check
if st.sidebar.button("Health Check"):
    try:
        response = requests.get(f"{API_ENDPOINT}/health")
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Vector Search health
if st.sidebar.button("Vector Search Health"):
    try:
        response = requests.get(f"{API_ENDPOINT}/vector-search/health")
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Agent tools
if st.sidebar.button("Get Agent Tools"):
    try:
        response = requests.get(f"{API_ENDPOINT}/agent/tools")
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Vector Search
st.header("Vector Search")
vs_query = st.text_input("Vector Search Query", "What is VANA?")
vs_limit = st.slider("Result Limit", 1, 10, 5)

if st.button("Search"):
    try:
        response = requests.post(
            f"{API_ENDPOINT}/vector-search/search",
            json={"query": vs_query, "limit": vs_limit}
        )
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Web Search
st.header("Web Search")
ws_query = st.text_input("Web Search Query", "VANA AI agent")
ws_limit = st.slider("Web Result Limit", 1, 10, 5)

if st.button("Web Search"):
    try:
        response = requests.post(
            f"{API_ENDPOINT}/web-search",
            json={"query": ws_query, "limit": ws_limit}
        )
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Agent Chat
st.header("Agent Chat")
message = st.text_input("Message", "Hello, VANA!")

if st.button("Send"):
    try:
        response = requests.post(
            f"{API_ENDPOINT}/agent/message",
            json={"message": message}
        )
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")
""")
    
    logger.info("Simple Streamlit app created successfully.")
    return True

def start_simple_app():
    """Start the simple Streamlit app."""
    port = int(os.environ.get('FRONTEND_PORT', 8501))
    logger.info(f"Starting simple Streamlit app on port {port}")
    
    # Set environment variables for Streamlit
    env = os.environ.copy()
    env['STREAMLIT_SERVER_PORT'] = str(port)
    env['STREAMLIT_SERVER_HEADLESS'] = 'true'
    env['STREAMLIT_SERVER_ENABLE_CORS'] = 'true'
    env['STREAMLIT_BROWSER_GATHER_USAGE_STATS'] = 'false'
    
    # Set API endpoint for backend
    backend_port = int(os.environ.get('BACKEND_PORT', 5000))
    env['BACKEND_PORT'] = str(backend_port)
    
    try:
        # Start Streamlit server
        process = subprocess.Popen(
            ['streamlit', 'run', 'simple_app/app.py'],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )
        
        # Print Streamlit output
        for line in process.stdout:
            print(line, end='')
        
        # Wait for process to complete
        process.wait()
        
        if process.returncode != 0:
            logger.error(f"Streamlit server exited with code {process.returncode}")
            for line in process.stderr:
                print(line, end='')
    except KeyboardInterrupt:
        logger.info("Stopping Streamlit server...")
        process.terminate()
    except Exception as e:
        logger.error(f"Error starting Streamlit server: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    # Check if dashboard exists
    if check_dashboard_exists() and check_streamlit_app():
        # Start Streamlit server with existing dashboard
        start_streamlit()
    else:
        # Create and start simple app
        if create_simple_app():
            start_simple_app()
        else:
            logger.error("Failed to create simple app.")
            sys.exit(1)
