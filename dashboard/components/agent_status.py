"""
Agent Status Component for VANA Dashboard.

This module provides components for displaying agent status and performance.
"""

import streamlit as st
import pandas as pd
import altair as alt
from datetime import datetime, timedelta
import logging

from dashboard.api.agent_api import agent_api
from dashboard.utils.data_formatter import format_timestamps, format_duration, format_percentage, format_time_ago
from dashboard.utils.visualization_helpers import (
    create_line_chart, create_status_indicator, create_metric_card, create_data_table, create_timeline
)

logger = logging.getLogger(__name__)

def display_agent_status():
    """
    Display agent status component.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader("Agent Status")
    
    try:
        # Get agent status data
        agents = agent_api.get_agent_status()
        
        # Display agent status cards
        st.markdown("### Active Agents")
        
        # Create columns for agent cards
        cols = st.columns(3)
        
        # Display agent cards
        for i, agent in enumerate(agents):
            with cols[i % 3]:
                st.markdown(f"#### {agent['name']}")
                create_status_indicator(agent['status'], "Status")
                st.markdown(f"**Type:** {agent['type'].capitalize()}")
                st.markdown(f"**Uptime:** {agent['uptime']} hours")
                st.markdown(f"**Tasks Completed:** {agent['tasks_completed']}")
                st.markdown(f"**Success Rate:** {format_percentage(agent['success_rate'])}")
                st.markdown(f"**Response Time:** {format_duration(agent['response_time'])}")
                st.markdown(f"**Last Active:** {format_time_ago(agent['last_active'])}")
                st.markdown("---")
        
        # Display agent performance metrics
        st.markdown("### Agent Performance")
        
        # Create tabs for different metrics
        tab1, tab2, tab3 = st.tabs(["Response Time", "Success Rate", "Task Count"])
        
        # Get agent performance data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="agent_performance_time_range"
        )
        
        performance_data = agent_api.get_agent_performance(time_range=time_range)
        
        # Display response time chart
        with tab1:
            for agent_id, data in performance_data.items():
                formatted_data = format_timestamps(data)
                chart = create_line_chart(
                    formatted_data,
                    "short_timestamps",
                    ["response_times"],
                    f"{agent_id.capitalize()} Response Time"
                )
                st.altair_chart(chart, use_container_width=True)
        
        # Display success rate chart
        with tab2:
            for agent_id, data in performance_data.items():
                formatted_data = format_timestamps(data)
                chart = create_line_chart(
                    formatted_data,
                    "short_timestamps",
                    ["success_rates"],
                    f"{agent_id.capitalize()} Success Rate"
                )
                st.altair_chart(chart, use_container_width=True)
        
        # Display task count chart
        with tab3:
            for agent_id, data in performance_data.items():
                formatted_data = format_timestamps(data)
                chart = create_line_chart(
                    formatted_data,
                    "short_timestamps",
                    ["task_counts"],
                    f"{agent_id.capitalize()} Task Count"
                )
                st.altair_chart(chart, use_container_width=True)
        
        # Display agent activity timeline
        st.markdown("### Agent Activity Timeline")
        
        # Get agent activity data
        activity_data = agent_api.get_agent_activity(time_range=time_range)
        
        # Create timeline
        timeline = create_timeline(activity_data, "Agent Activity Timeline")
        st.plotly_chart(timeline, use_container_width=True)
        
        # Display activity table
        st.markdown("### Recent Activities")
        create_data_table(
            activity_data,
            columns=["timestamp", "agent_id", "type", "details"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying agent status: {e}")
        st.error(f"Error displaying agent status: {e}")

def display_agent_details(agent_id):
    """
    Display detailed information for a specific agent.
    
    Args:
        agent_id (str): ID of the agent to display details for.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Agent Details: {agent_id.capitalize()}")
    
    try:
        # Get agent status data
        agents = agent_api.get_agent_status()
        agent = next((a for a in agents if a["id"] == agent_id), None)
        
        if not agent:
            st.error(f"Agent {agent_id} not found")
            return
        
        # Display agent details
        st.markdown(f"### {agent['name']}")
        create_status_indicator(agent['status'], "Status")
        st.markdown(f"**Type:** {agent['type'].capitalize()}")
        st.markdown(f"**Uptime:** {agent['uptime']} hours")
        st.markdown(f"**Tasks Completed:** {agent['tasks_completed']}")
        st.markdown(f"**Success Rate:** {format_percentage(agent['success_rate'])}")
        st.markdown(f"**Response Time:** {format_duration(agent['response_time'])}")
        st.markdown(f"**Last Active:** {format_time_ago(agent['last_active'])}")
        
        # Display agent performance metrics
        st.markdown("### Performance Metrics")
        
        # Get agent performance data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="agent_details_time_range"
        )
        
        performance_data = agent_api.get_agent_performance(agent_id=agent_id, time_range=time_range)
        formatted_data = format_timestamps(performance_data)
        
        # Create tabs for different metrics
        tab1, tab2, tab3 = st.tabs(["Response Time", "Success Rate", "Task Count"])
        
        # Display response time chart
        with tab1:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["response_times"],
                "Response Time"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display success rate chart
        with tab2:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["success_rates"],
                "Success Rate"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display task count chart
        with tab3:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["task_counts"],
                "Task Count"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display agent activity timeline
        st.markdown("### Activity Timeline")
        
        # Get agent activity data
        activity_data = agent_api.get_agent_activity(agent_id=agent_id, time_range=time_range)
        
        # Display activity table
        create_data_table(
            activity_data,
            columns=["timestamp", "type", "details"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying agent details: {e}")
        st.error(f"Error displaying agent details: {e}")
