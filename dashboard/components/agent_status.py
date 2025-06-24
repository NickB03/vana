"""
Agent Status Component for VANA Dashboard.

This module provides components for displaying agent status and performance.
"""

import logging

import altair as alt
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.api.agent_api import get_agent_activity, get_agent_statuses
from dashboard.utils.data_formatter import format_timestamp

logger = logging.getLogger(__name__)


def display_agent_status():
    """Display agent status visualization component."""
    # Force refresh button for debugging
    if st.button("🔄 Refresh Agent Data", key="refresh_agents"):
        if "agent_data" in st.session_state:
            del st.session_state.agent_data
        st.rerun()

    # Fetch fresh agent data
    agent_data = get_agent_statuses()

    # Debug information
    st.write("**Debug Info:**")
    st.write(f"- Agent data type: {type(agent_data)}")
    st.write(f"- Agent data length: {len(agent_data) if agent_data else 0}")
    if agent_data and len(agent_data) > 0:
        st.write(f"- First agent: {agent_data[0]}")
        st.write(
            f"- Agent names: {[agent.get('name', 'NO_NAME') for agent in agent_data]}"
        )

    st.session_state.agent_data = agent_data

    # Agent status cards
    st.subheader("Agent Status Overview")

    # Create columns for agent status cards - 3 per row
    cols = st.columns(3)

    # Display agent status cards
    for i, agent in enumerate(agent_data):
        col_index = i % 3
        with cols[col_index]:
            # Determine card color based on status
            card_color = {
                "Active": "green",
                "Idle": "blue",
                "Busy": "orange",
                "Error": "red",
                "Offline": "gray",
            }.get(agent["status"], "blue")

            # Create card with colored header
            st.markdown(
                f"""
                <div style="
                    border-radius: 5px;
                    background-color: white;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    margin-bottom: 20px;
                ">
                    <div style="
                        background-color: {card_color};
                        color: white;
                        padding: 10px;
                        border-radius: 5px 5px 0 0;
                        font-weight: bold;
                    ">
                        {agent["name"]} - {agent["status"]}
                    </div>
                    <div style="padding: 15px;">
                        <p><b>Response Time:</b> {agent["response_time_ms"]} ms</p>
                        <p><b>Requests Handled:</b> {agent["requests_handled"]}</p>
                        <p><b>Error Rate:</b> {agent["error_rate"] * 100:.2f}%</p>
                        <p><b>Last Active:</b> {format_timestamp(agent["last_active"])}</p>
                    </div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # Agent performance metrics
    st.subheader("Agent Performance Metrics")

    # Create DataFrame for performance metrics
    metrics_df = pd.DataFrame(
        [
            {
                "Agent": agent["name"],
                "Response Time (ms)": agent["response_time_ms"],
                "Error Rate (%)": agent["error_rate"] * 100,
                "CPU Usage (%)": agent["cpu_usage"],
                "Memory Usage (MB)": agent["memory_usage_mb"],
            }
            for agent in agent_data
        ]
    )

    # Create tabs for different performance metrics
    tabs = st.tabs(["Response Time", "Error Rate", "Resource Usage"])

    with tabs[0]:
        # Response time bar chart
        fig = px.bar(
            metrics_df,
            x="Agent",
            y="Response Time (ms)",
            color="Agent",
            title="Agent Response Times",
        )
        st.plotly_chart(fig, use_container_width=True)

    with tabs[1]:
        # Error rate bar chart
        fig = px.bar(
            metrics_df,
            x="Agent",
            y="Error Rate (%)",
            color="Agent",
            title="Agent Error Rates",
        )
        st.plotly_chart(fig, use_container_width=True)

    with tabs[2]:
        # Resource usage grouped bar chart
        fig = go.Figure()

        # Add CPU usage bars
        fig.add_trace(
            go.Bar(
                x=metrics_df["Agent"],
                y=metrics_df["CPU Usage (%)"],
                name="CPU Usage (%)",
                marker_color="indianred",
            )
        )

        # Add Memory usage bars
        fig.add_trace(
            go.Bar(
                x=metrics_df["Agent"],
                y=metrics_df["Memory Usage (MB)"],
                name="Memory Usage (MB)",
                marker_color="lightsalmon",
            )
        )

        # Update layout
        fig.update_layout(
            title="Agent Resource Usage",
            xaxis_title="Agent",
            yaxis_title="Usage",
            barmode="group",
        )

        st.plotly_chart(fig, use_container_width=True)

    # Agent historical activity
    st.subheader("Agent Historical Activity")

    # Agent selection for historical data
    if agent_data and len(agent_data) > 0:
        agent_names = [agent["name"] for agent in agent_data]
        selected_agent = st.selectbox("Select Agent", agent_names, key="agent_selector")
    else:
        st.error("No agent data available")
        selected_agent = "vana"  # fallback

    # Time period selection
    time_period = st.radio(
        "Time Period", ["Last 24 Hours", "Last Week"], horizontal=True
    )
    hours = 24 if time_period == "Last 24 Hours" else 168

    # Fetch historical data
    historical_data = get_agent_activity(selected_agent, hours)

    # Create DataFrame from historical data
    if historical_data and "activity" in historical_data:
        history_df = pd.DataFrame(historical_data["activity"])

        # Convert timestamp strings to datetime objects
        history_df["timestamp"] = pd.to_datetime(history_df["timestamp"])

        # Create tabs for different metrics
        hist_tabs = st.tabs(
            ["Requests", "Response Time", "Error Rate", "Resource Usage"]
        )

        with hist_tabs[0]:
            # Requests line chart
            chart = (
                alt.Chart(history_df)
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("requests:Q", title="Number of Requests"),
                    tooltip=["timestamp:T", "requests:Q"],
                )
                .properties(title=f"{selected_agent} - Request Volume", height=300)
                .interactive()
            )

            st.altair_chart(chart, use_container_width=True)

        with hist_tabs[1]:
            # Response time line chart
            chart = (
                alt.Chart(history_df)
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("response_time_ms:Q", title="Response Time (ms)"),
                    tooltip=["timestamp:T", "response_time_ms:Q"],
                )
                .properties(title=f"{selected_agent} - Response Time", height=300)
                .interactive()
            )

            st.altair_chart(chart, use_container_width=True)

        with hist_tabs[2]:
            # Error rate line chart
            history_df["error_rate_percent"] = history_df["error_rate"] * 100

            chart = (
                alt.Chart(history_df)
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("error_rate_percent:Q", title="Error Rate (%)"),
                    tooltip=["timestamp:T", "error_rate_percent:Q"],
                )
                .properties(title=f"{selected_agent} - Error Rate", height=300)
                .interactive()
            )

            st.altair_chart(chart, use_container_width=True)

        with hist_tabs[3]:
            # Create dual y-axis chart for CPU and memory usage
            base = (
                alt.Chart(history_df)
                .encode(x=alt.X("timestamp:T", title="Time"))
                .properties(title=f"{selected_agent} - Resource Usage", height=300)
            )

            # CPU usage line
            cpu_line = base.mark_line(color="red").encode(
                y=alt.Y("cpu_usage:Q", title="CPU Usage (%)"),
                tooltip=["timestamp:T", "cpu_usage:Q"],
            )

            # Memory usage line
            memory_line = base.mark_line(color="blue").encode(
                y=alt.Y("memory_usage_mb:Q", title="Memory Usage (MB)"),
                tooltip=["timestamp:T", "memory_usage_mb:Q"],
            )

            # Combine both lines
            chart = (
                alt.layer(cpu_line, memory_line)
                .resolve_scale(y="independent")
                .interactive()
            )

            st.altair_chart(chart, use_container_width=True)
    else:
        st.error(f"No historical data available for {selected_agent}")
