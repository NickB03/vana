"""
Agent Status Component for VANA Dashboard.

This module provides components for displaying agent status and performance.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import logging

from dashboard.api import agent_api

logger = logging.getLogger(__name__)

def display_agent_status():
    """
    Display agent status visualization.
    """
    # Get agent data
    agents = agent_api.get_agent_status()

    # Create agent status cards
    st.subheader("Agent Status")

    # Create columns for agent cards
    cols = st.columns(3)

    # Display agent cards
    for i, agent in enumerate(agents):
        with cols[i % 3]:
            # Create card with colored border based on status
            status_color = {
                "active": "green",
                "idle": "orange",
                "error": "red"
            }.get(agent["status"], "gray")

            st.markdown(
                f"""
                <div style="padding: 10px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
                <h3>{agent["name"]}</h3>
                <p><strong>Role:</strong> {agent["role"]}</p>
                <p><strong>Status:</strong> {agent["status"]}</p>
                <p><strong>Tasks:</strong> {agent["tasks_completed"]}</p>
                <p><strong>Success Rate:</strong> {agent["success_rate"]:.0%}</p>
                </div>
                """,
                unsafe_allow_html=True
            )
            st.write("")  # Add some space between cards

    # Display agent performance metrics
    st.subheader("Agent Performance")

    # Get agent performance data
    time_range = st.selectbox(
        "Time Range",
        ["hour", "day", "week", "month"],
        index=1,
        key="agent_performance_time_range"
    )

    performance_data = agent_api.get_agent_performance(time_range=time_range)

    # Create a DataFrame for response times
    response_times_data = []
    for agent_id, data in performance_data.items():
        for i, timestamp in enumerate(data["timestamps"]):
            response_times_data.append({
                "Agent": agent_id.capitalize(),
                "Timestamp": timestamp,
                "Response Time (s)": data["response_times"][i]
            })

    df_response = pd.DataFrame(response_times_data)

    # Create response time chart
    fig_response = px.line(
        df_response,
        x="Timestamp",
        y="Response Time (s)",
        color="Agent",
        title="Agent Response Times"
    )
    st.plotly_chart(fig_response, use_container_width=True)

    # Display agent activity
    st.subheader("Recent Agent Activity")

    # Get agent activity data
    activity_data = agent_api.get_agent_activity(time_range=time_range)

    # Create a DataFrame for the activity table
    df_activity = pd.DataFrame([
        {
            "Timestamp": activity["timestamp"],
            "Agent": activity["agent_id"].capitalize(),
            "Activity Type": activity["type"].replace("_", " ").title(),
            "Details": activity["details"]
        }
        for activity in activity_data[:10]  # Show only the 10 most recent activities
    ])

    # Display the activity table
    st.dataframe(df_activity, use_container_width=True)

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

        # Create status indicator
        status_color = {
            "active": "green",
            "idle": "orange",
            "error": "red"
        }.get(agent["status"], "gray")

        st.markdown(
            f"""
            <div style="padding: 5px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
            <p><strong>Status:</strong> {agent["status"]}</p>
            </div>
            """,
            unsafe_allow_html=True
        )

        st.markdown(f"**Role:** {agent['role']}")
        st.markdown(f"**Uptime:** {agent['uptime']} hours")
        st.markdown(f"**Tasks Completed:** {agent['tasks_completed']}")
        st.markdown(f"**Success Rate:** {agent['success_rate']:.0%}")
        st.markdown(f"**Response Time:** {agent['response_time']:.2f} seconds")

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

        # Create a DataFrame for response times
        response_times_data = []
        for i, timestamp in enumerate(performance_data["timestamps"]):
            response_times_data.append({
                "Timestamp": timestamp,
                "Response Time (s)": performance_data["response_times"][i]
            })

        df_response = pd.DataFrame(response_times_data)

        # Create response time chart
        fig_response = px.line(
            df_response,
            x="Timestamp",
            y="Response Time (s)",
            title="Response Time"
        )
        st.plotly_chart(fig_response, use_container_width=True)

        # Display agent activity
        st.markdown("### Recent Activities")

        # Get agent activity data
        activity_data = agent_api.get_agent_activity(agent_id=agent_id, time_range=time_range)

        # Create a DataFrame for the activity table
        df_activity = pd.DataFrame([
            {
                "Timestamp": activity["timestamp"],
                "Activity Type": activity["type"].replace("_", " ").title(),
                "Details": activity["details"]
            }
            for activity in activity_data[:10]  # Show only the 10 most recent activities
        ])

        # Display the activity table
        st.dataframe(df_activity, use_container_width=True)

    except Exception as e:
        logger.error(f"Error displaying agent details: {e}")
        st.error(f"Error displaying agent details: {e}")
