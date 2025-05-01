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

# Import dashboard modules will be done in each component section

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
        try:
            from dashboard.components.agent_status import display_agent_status
            display_agent_status()
        except Exception as e:
            st.error(f"Error displaying agent status: {e}")
            logger.exception("Error displaying agent status")

    elif page == "Memory Usage":
        st.header("Memory Usage")
        try:
            from dashboard.components.memory_usage import display_memory_usage
            display_memory_usage()
        except Exception as e:
            st.error(f"Error displaying memory usage: {e}")
            logger.exception("Error displaying memory usage")

    elif page == "System Health":
        st.header("System Health")
        try:
            from dashboard.components.system_health import display_system_health
            display_system_health()
        except Exception as e:
            st.error(f"Error displaying system health: {e}")
            logger.exception("Error displaying system health")

    elif page == "Task Execution":
        st.header("Task Execution")
        try:
            from dashboard.components.task_execution import display_task_execution
            display_task_execution()
        except Exception as e:
            st.error(f"Error displaying task execution: {e}")
            logger.exception("Error displaying task execution")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        st.error(f"An error occurred: {e}")
        logger.exception("An error occurred in the dashboard application")
