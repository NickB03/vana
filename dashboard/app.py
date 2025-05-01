"""
VANA Dashboard - Main Application

This is the main Streamlit application for the VANA dashboard.
It provides visualization for memory usage, agent performance, system health, and alerting.
"""

import streamlit as st
import os
import sys
import logging
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import dashboard modules
try:
    from dashboard.api import memory_api, agent_api, system_api, task_api
    from dashboard.components import agent_status, memory_usage, system_health
    from dashboard.utils import config, data_formatter, visualization_helpers
except ImportError as e:
    st.error(f"Error importing dashboard modules: {e}")
    logging.error(f"Error importing dashboard modules: {e}")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'dashboard.log'))
    ]
)
logger = logging.getLogger(__name__)

# Dashboard configuration
st.set_page_config(
    page_title="VANA Dashboard",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded"
)

def main():
    """Main function to run the dashboard application."""
    # Dashboard title
    st.title("VANA Dashboard")
    st.markdown("### Visualization, Monitoring, and Analytics for VANA")
    
    # Sidebar navigation
    st.sidebar.title("Navigation")
    page = st.sidebar.radio(
        "Select a page",
        ["Agent Status", "Memory Usage", "System Health", "Task Execution"]
    )
    
    # Display timestamp
    st.sidebar.markdown(f"**Last updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Display selected page
    if page == "Agent Status":
        st.header("Agent Status")
        st.info("This page will display the status of all agents in the system.")
        # Placeholder for agent status component
        st.markdown("Agent status visualization will be implemented here.")
    
    elif page == "Memory Usage":
        st.header("Memory Usage")
        st.info("This page will display memory usage metrics.")
        # Placeholder for memory usage component
        st.markdown("Memory usage visualization will be implemented here.")
    
    elif page == "System Health":
        st.header("System Health")
        st.info("This page will display system health metrics.")
        # Placeholder for system health component
        st.markdown("System health visualization will be implemented here.")
    
    elif page == "Task Execution":
        st.header("Task Execution")
        st.info("This page will display task execution metrics.")
        # Placeholder for task execution component
        st.markdown("Task execution visualization will be implemented here.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        st.error(f"An error occurred: {e}")
        logger.exception("An error occurred in the dashboard application")
