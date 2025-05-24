#!/usr/bin/env python3
"""
Simple frontend app for VANA local development.
This script starts a Streamlit app with basic functionality.
"""

import os
import sys
import logging
import streamlit as st
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("vana-frontend")

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

# Echo
st.header("Echo Test")
message = st.text_input("Message", "Hello, VANA!")

if st.button("Send"):
    try:
        response = requests.post(
            f"{API_ENDPOINT}/echo",
            json={"message": message}
        )
        st.json(response.json())
    except Exception as e:
        st.error(f"Error: {str(e)}")

# Add information
st.markdown("---")
st.markdown("## About This App")
st.markdown("""
This is a simple test app for VANA local development. It demonstrates:
- Basic communication with the backend API
- Simple UI elements with Streamlit
- Error handling

Once the full VANA agent is set up, you'll be able to:
- Chat with the VANA agent
- Search using Vector Search
- Search the web
- Use other agent tools
""")

# Add backend status
st.sidebar.markdown("---")
try:
    response = requests.get(f"{API_ENDPOINT}/health")
    if response.status_code == 200:
        st.sidebar.success("Backend is running")
    else:
        st.sidebar.error("Backend is not responding correctly")
except Exception as e:
    st.sidebar.error("Backend is not running")
    st.sidebar.markdown(f"Error: {str(e)}")
