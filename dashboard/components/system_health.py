"""
System Health Component for VANA Dashboard.

This module provides components for displaying system health and performance.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import logging

from dashboard.api import system_api

logger = logging.getLogger(__name__)

def display_system_health():
    """
    Display system health visualization.
    """
    # Get system health data
    health_data = system_api.get_system_health()

    # Display system metrics
    st.subheader("System Health")

    # Create columns for metrics
    col1, col2, col3 = st.columns(3)

    with col1:
        # Create CPU gauge
        fig_cpu = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["cpu"]["usage_percent"],
            title={"text": "CPU Usage"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "darkblue"},
                "steps": [
                    {"range": [0, 60], "color": "lightgreen"},
                    {"range": [60, 80], "color": "orange"},
                    {"range": [80, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 80
                }
            }
        ))
        st.plotly_chart(fig_cpu, use_container_width=True)

    with col2:
        # Create memory gauge
        fig_memory = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["memory"]["usage_percent"],
            title={"text": "Memory Usage"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "darkblue"},
                "steps": [
                    {"range": [0, 60], "color": "lightgreen"},
                    {"range": [60, 80], "color": "orange"},
                    {"range": [80, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 80
                }
            }
        ))
        st.plotly_chart(fig_memory, use_container_width=True)

    with col3:
        # Create disk gauge
        fig_disk = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["disk"]["usage_percent"],
            title={"text": "Disk Usage"},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "darkblue"},
                "steps": [
                    {"range": [0, 60], "color": "lightgreen"},
                    {"range": [60, 80], "color": "orange"},
                    {"range": [80, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 80
                }
            }
        ))
        st.plotly_chart(fig_disk, use_container_width=True)

    # Display additional metrics
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Memory Total", f"{health_data['memory']['total_gb']} GB")

    with col2:
        st.metric("Memory Used", f"{health_data['memory']['used_gb']} GB")

    with col3:
        st.metric("CPU Cores", f"{health_data['cpu']['core_count']}")

    # Display system performance over time
    st.subheader("System Performance")

    # Get system performance data
    time_range = st.selectbox(
        "Time Range",
        ["hour", "day", "week", "month"],
        index=1,
        key="system_performance_time_range"
    )

    performance_data = system_api.get_system_performance(time_range=time_range)

    # Create DataFrame for performance data
    df_performance = pd.DataFrame({
        "Timestamp": performance_data["timestamps"],
        "CPU Usage (%)": performance_data["cpu_usage"],
        "Memory Usage (%)": performance_data["memory_usage"],
        "Disk Usage (%)": performance_data["disk_usage"]
    })

    # Create performance chart
    fig_performance = px.line(
        df_performance,
        x="Timestamp",
        y=["CPU Usage (%)", "Memory Usage (%)", "Disk Usage (%)"],
        title="System Performance Over Time"
    )
    st.plotly_chart(fig_performance, use_container_width=True)

    # Display service status
    st.subheader("Service Status")

    # Get service status
    services = system_api.get_service_status()

    # Create columns for service cards
    cols = st.columns(3)

    # Display service cards
    for i, service in enumerate(services):
        with cols[i % 3]:
            # Create card with colored border based on status
            status_color = {
                "running": "green",
                "warning": "orange",
                "error": "red"
            }.get(service["status"], "gray")

            st.markdown(
                f"""
                <div style="padding: 10px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
                <h3>{service["name"]}</h3>
                <p><strong>Status:</strong> {service["status"]}</p>
                <p><strong>Uptime:</strong> {service["uptime"]} hours</p>
                <p><strong>Error Rate:</strong> {service["error_rate"]:.2%}</p>
                </div>
                """,
                unsafe_allow_html=True
            )
            st.write("")  # Add some space between cards

    # Display error logs
    st.subheader("Recent Error Logs")

    # Get error logs
    error_logs = system_api.get_error_logs(time_range=time_range, limit=10)

    # Create DataFrame for error logs
    df_logs = pd.DataFrame([
        {
            "Timestamp": log["timestamp"],
            "Level": log["level"],
            "Component": log["component"],
            "Message": log["message"]
        }
        for log in error_logs
    ])

    # Display error logs table
    st.dataframe(df_logs, use_container_width=True)

def display_service_details(service_id):
    """
    Display detailed information for a specific service.

    Args:
        service_id (str): ID of the service to display details for.

    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Service Details: {service_id}")

    # Get service status data
    services = system_api.get_service_status()
    service = next((s for s in services if s["id"] == service_id), None)

    if not service:
        st.error(f"Service {service_id} not found")
        return

    # Display service details
    st.markdown(f"### {service['name']}")

    # Create status indicator
    status_color = {
        "running": "green",
        "warning": "orange",
        "error": "red"
    }.get(service["status"], "gray")

    st.markdown(
        f"""
        <div style="padding: 5px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
        <p><strong>Status:</strong> {service["status"]}</p>
        </div>
        """,
        unsafe_allow_html=True
    )

    st.markdown(f"**Uptime:** {service['uptime']} hours")
    st.markdown(f"**Response Time:** {service['response_time']:.2f} seconds")
    st.markdown(f"**Error Rate:** {service['error_rate']:.2%}")
    st.markdown(f"**Last Checked:** {service['last_checked']}")

    # Display service logs
    st.markdown("### Service Logs")

    # Get error logs for this service
    error_logs = system_api.get_error_logs()
    service_logs = [log for log in error_logs if log["component"] == service_id]

    # Create DataFrame for service logs
    df_logs = pd.DataFrame([
        {
            "Timestamp": log["timestamp"],
            "Level": log["level"],
            "Message": log["message"],
            "Details": log.get("details", "")
        }
        for log in service_logs[:10]  # Show only the 10 most recent logs
    ])

    # Display service logs table
    st.dataframe(df_logs, use_container_width=True)
