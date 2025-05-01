"""
System Health Component for VANA Dashboard.

This module provides components for displaying system health and performance.
"""

import streamlit as st
import pandas as pd
import altair as alt
from datetime import datetime, timedelta
import logging

from dashboard.api.system_api import system_api
from dashboard.utils.data_formatter import format_timestamps, format_bytes, format_duration, format_percentage, format_time_ago
from dashboard.utils.visualization_helpers import (
    create_line_chart, create_gauge_chart, create_status_indicator, create_metric_card, create_data_table
)

logger = logging.getLogger(__name__)

def display_system_health():
    """
    Display system health component.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader("System Health")
    
    try:
        # Get system health data
        system_health = system_api.get_system_health()
        
        # Display system health metrics
        st.markdown("### System Metrics")
        
        # Create columns for metrics
        col1, col2, col3 = st.columns(3)
        
        # Display metrics
        with col1:
            # Create gauge chart for CPU usage
            gauge = create_gauge_chart(
                system_health["cpu_usage"],
                0,
                100,
                "CPU Usage",
                threshold=80
            )
            st.plotly_chart(gauge, use_container_width=True)
        
        with col2:
            # Create gauge chart for memory usage
            gauge = create_gauge_chart(
                system_health["memory_usage"],
                0,
                100,
                "Memory Usage",
                threshold=80
            )
            st.plotly_chart(gauge, use_container_width=True)
        
        with col3:
            # Create gauge chart for disk usage
            gauge = create_gauge_chart(
                system_health["disk_usage"],
                0,
                100,
                "Disk Usage",
                threshold=80
            )
            st.plotly_chart(gauge, use_container_width=True)
        
        # Display additional metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            create_metric_card(
                "Memory Available",
                system_health["memory_available"],
                formatter=format_bytes
            )
        
        with col2:
            create_metric_card(
                "Memory Total",
                system_health["memory_total"],
                formatter=format_bytes
            )
        
        with col3:
            create_metric_card(
                "Disk Available",
                system_health["disk_available"],
                formatter=format_bytes
            )
        
        # Display system performance over time
        st.markdown("### System Performance")
        
        # Get system performance data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="system_performance_time_range"
        )
        
        performance_data = system_api.get_system_performance(time_range=time_range)
        formatted_data = format_timestamps(performance_data)
        
        # Create tabs for different metrics
        tab1, tab2, tab3 = st.tabs(["CPU & Memory", "Disk", "Network"])
        
        # Display CPU and memory usage chart
        with tab1:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["cpu_usage", "memory_usage"],
                "CPU and Memory Usage Over Time"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display disk usage chart
        with tab2:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["disk_usage"],
                "Disk Usage Over Time"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display network usage chart
        with tab3:
            chart = create_line_chart(
                formatted_data,
                "short_timestamps",
                ["network_in", "network_out"],
                "Network Usage Over Time"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display service status
        st.markdown("### Service Status")
        
        # Get service status data
        services = system_api.get_service_status()
        
        # Display service status cards
        cols = st.columns(3)
        
        for i, service in enumerate(services):
            with cols[i % 3]:
                st.markdown(f"#### {service['name']}")
                create_status_indicator(service['status'], "Status")
                st.markdown(f"**Uptime:** {service['uptime']} hours")
                st.markdown(f"**Response Time:** {format_duration(service['response_time'])}")
                st.markdown(f"**Error Rate:** {format_percentage(service['error_rate'])}")
                st.markdown(f"**Last Checked:** {format_time_ago(service['last_checked'])}")
                st.markdown("---")
        
        # Display error logs
        st.markdown("### Error Logs")
        
        # Get error logs
        error_logs = system_api.get_error_logs(time_range=time_range)
        
        # Display error logs table
        create_data_table(
            error_logs,
            columns=["timestamp", "level", "component", "message"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying system health: {e}")
        st.error(f"Error displaying system health: {e}")

def display_service_details(service_id):
    """
    Display detailed information for a specific service.
    
    Args:
        service_id (str): ID of the service to display details for.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Service Details: {service_id}")
    
    try:
        # Get service status data
        services = system_api.get_service_status()
        service = next((s for s in services if s["id"] == service_id), None)
        
        if not service:
            st.error(f"Service {service_id} not found")
            return
        
        # Display service details
        st.markdown(f"### {service['name']}")
        create_status_indicator(service['status'], "Status")
        st.markdown(f"**Uptime:** {service['uptime']} hours")
        st.markdown(f"**Response Time:** {format_duration(service['response_time'])}")
        st.markdown(f"**Error Rate:** {format_percentage(service['error_rate'])}")
        st.markdown(f"**Last Checked:** {format_time_ago(service['last_checked'])}")
        
        # Display service metrics
        st.markdown("### Service Metrics")
        
        # TODO: Implement service-specific metrics
        st.info("Service-specific metrics will be implemented here.")
        
        # Display service logs
        st.markdown("### Service Logs")
        
        # Get error logs for this service
        error_logs = system_api.get_error_logs()
        service_logs = [log for log in error_logs if log["component"] == service_id]
        
        # Display service logs table
        create_data_table(
            service_logs,
            columns=["timestamp", "level", "message", "details"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying service details: {e}")
        st.error(f"Error displaying service details: {e}")
