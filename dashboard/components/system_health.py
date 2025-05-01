"""
System Health Component for VANA Dashboard.

This module provides components for displaying system health and performance.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import altair as alt
from datetime import datetime
import logging
import humanize

from dashboard.api.system_api import get_system_health, get_service_status, get_system_health_history, get_system_alerts
from dashboard.utils.data_formatter import format_timestamp

logger = logging.getLogger(__name__)

def display_system_health():
    """Display system health visualization component."""
    # Fetch system health data
    health_data = get_system_health()

    # System Overview
    st.subheader("System Overview")

    # System info card
    system_info = health_data["system_info"]

    # Format uptime
    if isinstance(system_info["uptime"], str):
        uptime_str = system_info["uptime"]
    else:
        days = system_info["uptime"].days
        hours = system_info["uptime"].seconds // 3600
        minutes = (system_info["uptime"].seconds % 3600) // 60
        uptime_str = f"{days} days, {hours} hours, {minutes} minutes"

    # Create system info card
    st.markdown(
        f"""
        <div style="
            border-radius: 5px;
            background-color: white;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            padding: 15px;
            margin-bottom: 20px;
        ">
            <h3>System Information</h3>
            <p><b>OS:</b> {system_info["os"]} {system_info["version"]}</p>
            <p><b>Architecture:</b> {system_info["architecture"]}</p>
            <p><b>Processor:</b> {system_info["processor"]}</p>
            <p><b>Hostname:</b> {system_info["hostname"]}</p>
            <p><b>Uptime:</b> {uptime_str}</p>
        </div>
        """,
        unsafe_allow_html=True
    )

    # Resource Usage Gauges
    st.subheader("Resource Usage")

    # Create columns for gauges
    col1, col2, col3 = st.columns(3)

    with col1:
        # CPU gauge
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["cpu"]["usage_percent"],
            title={"text": "CPU Usage"},
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "royalblue"},
                "steps": [
                    {"range": [0, 60], "color": "lightgreen"},
                    {"range": [60, 85], "color": "orange"},
                    {"range": [85, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 90
                }
            }
        ))
        fig.update_layout(height=250, margin=dict(l=20, r=20, t=50, b=20))
        st.plotly_chart(fig, use_container_width=True)

        # CPU details
        st.metric("CPU Cores", health_data["cpu"]["count"])
        st.metric("Load Average", f"{health_data['cpu']['load_avg'][0]:.2f}, {health_data['cpu']['load_avg'][1]:.2f}, {health_data['cpu']['load_avg'][2]:.2f}")

    with col2:
        # Memory gauge
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["memory"]["percent"],
            title={"text": "Memory Usage"},
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "royalblue"},
                "steps": [
                    {"range": [0, 60], "color": "lightgreen"},
                    {"range": [60, 85], "color": "orange"},
                    {"range": [85, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 90
                }
            }
        ))
        fig.update_layout(height=250, margin=dict(l=20, r=20, t=50, b=20))
        st.plotly_chart(fig, use_container_width=True)

        # Memory details
        total_gb = health_data["memory"]["total_mb"] / 1024
        used_gb = health_data["memory"]["used_mb"] / 1024
        available_gb = health_data["memory"]["available_mb"] / 1024

        st.metric("Total Memory", f"{total_gb:.2f} GB")
        st.metric("Available", f"{available_gb:.2f} GB")

    with col3:
        # Disk gauge
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=health_data["disk"]["percent"],
            title={"text": "Disk Usage"},
            domain={"x": [0, 1], "y": [0, 1]},
            gauge={
                "axis": {"range": [0, 100]},
                "bar": {"color": "royalblue"},
                "steps": [
                    {"range": [0, 70], "color": "lightgreen"},
                    {"range": [70, 90], "color": "orange"},
                    {"range": [90, 100], "color": "red"}
                ],
                "threshold": {
                    "line": {"color": "red", "width": 4},
                    "thickness": 0.75,
                    "value": 95
                }
            }
        ))
        fig.update_layout(height=250, margin=dict(l=20, r=20, t=50, b=20))
        st.plotly_chart(fig, use_container_width=True)

        # Disk details
        st.metric("Total Disk", f"{health_data['disk']['total_gb']:.2f} GB")
        st.metric("Free Space", f"{health_data['disk']['free_gb']:.2f} GB")

    # Network Statistics
    st.subheader("Network Statistics")

    # Format network stats
    bytes_sent = humanize.naturalsize(health_data["network"]["bytes_sent"])
    bytes_recv = humanize.naturalsize(health_data["network"]["bytes_recv"])

    # Create columns for network stats
    net_col1, net_col2 = st.columns(2)

    with net_col1:
        st.metric("Data Sent", bytes_sent)
        st.metric("Packets Sent", f"{health_data['network']['packets_sent']:,}")
        st.metric("Errors Out", str(health_data["network"]["err_out"]))

    with net_col2:
        st.metric("Data Received", bytes_recv)
        st.metric("Packets Received", f"{health_data['network']['packets_recv']:,}")
        st.metric("Errors In", str(health_data["network"]["err_in"]))

    # Historical Performance
    st.subheader("Historical Performance")

    # Time period selection
    time_period = st.radio("Time Period", ["Last 24 Hours", "Last Week"], horizontal=True)
    hours = 24 if time_period == "Last 24 Hours" else 168

    # Fetch historical data
    history_data = get_system_health_history(hours)

    if history_data:
        # Convert to DataFrame
        history_df = pd.DataFrame([
            {
                "timestamp": datetime.fromisoformat(entry["timestamp"]),
                "cpu_percent": entry["cpu_percent"],
                "memory_percent": entry["memory_percent"],
                "disk_percent": entry["disk_percent"],
                "network_send_bytes": entry["network_send_bytes"],
                "network_recv_bytes": entry["network_recv_bytes"]
            }
            for entry in history_data
        ])

        # Create tabs for different metrics
        hist_tabs = st.tabs(["Resource Usage", "Network Traffic"])

        with hist_tabs[0]:
            # Resource usage over time
            resource_chart = alt.Chart(history_df).transform_fold(
                ["cpu_percent", "memory_percent", "disk_percent"],
                as_=["Resource", "Usage (%)"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Usage (%):Q", scale=alt.Scale(domain=[0, 100])),
                color=alt.Color("Resource:N",
                               scale=alt.Scale(domain=["cpu_percent", "memory_percent", "disk_percent"],
                                              range=["#FF4B4B", "#4B4BFF", "#4BFF4B"])),
                tooltip=["timestamp:T", "Usage (%):Q", "Resource:N"]
            ).properties(
                title="Resource Usage Over Time",
                height=300
            ).interactive()

            st.altair_chart(resource_chart, use_container_width=True)

        with hist_tabs[1]:
            # Format network data for better visualization
            history_df["network_send_mb"] = history_df["network_send_bytes"] / (1024 * 1024)
            history_df["network_recv_mb"] = history_df["network_recv_bytes"] / (1024 * 1024)

            # Network traffic over time
            network_chart = alt.Chart(history_df).transform_fold(
                ["network_send_mb", "network_recv_mb"],
                as_=["Direction", "Traffic (MB)"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Traffic (MB):Q"),
                color=alt.Color("Direction:N",
                               scale=alt.Scale(domain=["network_send_mb", "network_recv_mb"],
                                              range=["#FF9900", "#0099FF"])),
                tooltip=["timestamp:T", "Traffic (MB):Q", "Direction:N"]
            ).properties(
                title="Network Traffic Over Time",
                height=300
            ).interactive()

            st.altair_chart(network_chart, use_container_width=True)
    else:
        st.error("No historical performance data available")

    # Service Status
    st.subheader("Service Status")

    # Fetch service status
    services = get_service_status()

    # Create columns for service cards - 3 per row
    cols = st.columns(3)

    # Display service cards
    for i, service in enumerate(services):
        col_index = i % 3
        with cols[col_index]:
            # Determine card color based on status
            status_color = {
                "running": "green",
                "warning": "orange",
                "error": "red"
            }.get(service["status"], "gray")

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
                        background-color: {status_color};
                        color: white;
                        padding: 10px;
                        border-radius: 5px 5px 0 0;
                        font-weight: bold;
                    ">
                        {service["name"]} - {service["status"].upper()}
                    </div>
                    <div style="padding: 15px;">
                        <p><b>Uptime:</b> {service["uptime"]} hours</p>
                        <p><b>Response Time:</b> {service["response_time"]:.2f} sec</p>
                        <p><b>Error Rate:</b> {service["error_rate"]:.2%}</p>
                    </div>
                </div>
                """,
                unsafe_allow_html=True
            )

    # System Alerts
    st.subheader("System Alerts")

    # Fetch system alerts
    alerts = get_system_alerts(limit=10)

    if alerts:
        # Create DataFrame
        alerts_df = pd.DataFrame([
            {
                "Time": datetime.fromisoformat(alert["timestamp"]).strftime("%Y-%m-%d %H:%M:%S"),
                "Type": alert["type"].capitalize(),
                "Level": alert["level"].upper(),
                "Message": alert["message"],
                "Status": "Acknowledged" if alert["acknowledged"] else "Unacknowledged"
            }
            for alert in alerts
        ])

        # Style the DataFrame based on alert level
        def color_alerts(val):
            if val == "CRITICAL":
                return "background-color: #ffcccc"
            elif val == "WARNING":
                return "background-color: #fff2cc"
            elif val == "ERROR":
                return "background-color: #ffcccc"
            elif val == "INFO":
                return "background-color: #ccffcc"
            return ""

        # Apply styling
        styled_df = alerts_df.style.applymap(color_alerts, subset=["Level"])

        # Display as table
        st.dataframe(styled_df, use_container_width=True, height=400)
    else:
        st.info("No system alerts available")


