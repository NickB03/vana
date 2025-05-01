"""
Memory Usage Component for VANA Dashboard.

This module provides components for displaying memory usage and operations.
"""

import streamlit as st
import pandas as pd
import altair as alt
from datetime import datetime, timedelta
import logging

from dashboard.api.memory_api import memory_api
from dashboard.utils.data_formatter import format_timestamps, calculate_statistics, format_percentage
from dashboard.utils.visualization_helpers import (
    create_line_chart, create_pie_chart, create_metric_card, create_gauge_chart
)

logger = logging.getLogger(__name__)

def display_memory_usage():
    """
    Display memory usage component.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader("Memory Usage")
    
    try:
        # Get memory usage data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="memory_usage_time_range"
        )
        
        memory_usage_data = memory_api.get_memory_usage(time_range=time_range)
        formatted_data = format_timestamps(memory_usage_data)
        
        # Display memory usage chart
        st.markdown("### Memory Usage Over Time")
        
        chart = create_line_chart(
            formatted_data,
            "short_timestamps",
            ["vector_search_usage", "knowledge_graph_usage", "local_cache_usage"],
            "Memory Usage Over Time"
        )
        st.altair_chart(chart, use_container_width=True)
        
        # Display memory usage breakdown
        st.markdown("### Memory Usage Breakdown")
        
        # Create columns for metrics
        col1, col2, col3 = st.columns(3)
        
        # Calculate current usage (last value in the data)
        vector_search_usage = memory_usage_data["vector_search_usage"][-1]
        knowledge_graph_usage = memory_usage_data["knowledge_graph_usage"][-1]
        local_cache_usage = memory_usage_data["local_cache_usage"][-1]
        total_usage = vector_search_usage + knowledge_graph_usage + local_cache_usage
        
        # Display metrics
        with col1:
            create_metric_card(
                "Vector Search",
                vector_search_usage,
                delta=f"{vector_search_usage / total_usage * 100:.1f}",
                delta_suffix="%",
                formatter=lambda x: f"{x} MB"
            )
        
        with col2:
            create_metric_card(
                "Knowledge Graph",
                knowledge_graph_usage,
                delta=f"{knowledge_graph_usage / total_usage * 100:.1f}",
                delta_suffix="%",
                formatter=lambda x: f"{x} MB"
            )
        
        with col3:
            create_metric_card(
                "Local Cache",
                local_cache_usage,
                delta=f"{local_cache_usage / total_usage * 100:.1f}",
                delta_suffix="%",
                formatter=lambda x: f"{x} MB"
            )
        
        # Display memory usage pie chart
        pie_data = {
            "component": ["Vector Search", "Knowledge Graph", "Local Cache"],
            "usage": [vector_search_usage, knowledge_graph_usage, local_cache_usage]
        }
        
        pie_chart = create_pie_chart(
            pie_data,
            "component",
            "usage",
            "Memory Usage Breakdown"
        )
        st.plotly_chart(pie_chart, use_container_width=True)
        
        # Display memory operations
        st.markdown("### Memory Operations")
        
        memory_operations_data = memory_api.get_memory_operations(time_range=time_range)
        formatted_operations_data = format_timestamps(memory_operations_data)
        
        # Create tabs for different operation types
        tab1, tab2 = st.tabs(["Operation Counts", "Operation Breakdown"])
        
        # Display operation counts chart
        with tab1:
            chart = create_line_chart(
                formatted_operations_data,
                "short_timestamps",
                ["read_operations", "write_operations", "delete_operations"],
                "Memory Operations Over Time"
            )
            st.altair_chart(chart, use_container_width=True)
        
        # Display operation breakdown
        with tab2:
            # Calculate total operations
            total_reads = sum(memory_operations_data["read_operations"])
            total_writes = sum(memory_operations_data["write_operations"])
            total_deletes = sum(memory_operations_data["delete_operations"])
            total_operations = total_reads + total_writes + total_deletes
            
            # Create pie chart data
            operation_data = {
                "operation": ["Read", "Write", "Delete"],
                "count": [total_reads, total_writes, total_deletes]
            }
            
            # Display pie chart
            pie_chart = create_pie_chart(
                operation_data,
                "operation",
                "count",
                "Memory Operation Breakdown"
            )
            st.plotly_chart(pie_chart, use_container_width=True)
        
        # Display cache metrics
        st.markdown("### Cache Metrics")
        
        cache_metrics = memory_api.get_cache_metrics()
        
        # Create columns for metrics
        col1, col2, col3 = st.columns(3)
        
        # Display metrics
        with col1:
            create_metric_card(
                "Cache Hit Rate",
                cache_metrics["hit_rate"],
                formatter=format_percentage
            )
        
        with col2:
            create_metric_card(
                "Cache Size",
                cache_metrics["size"],
                delta=f"{cache_metrics['size'] / cache_metrics['max_size'] * 100:.1f}",
                delta_suffix="% of max",
                formatter=lambda x: f"{x} items"
            )
        
        with col3:
            # Create gauge chart for cache usage
            gauge = create_gauge_chart(
                cache_metrics["size"],
                0,
                cache_metrics["max_size"],
                "Cache Usage",
                threshold=cache_metrics["max_size"] * 0.8
            )
            st.plotly_chart(gauge, use_container_width=True)
    
    except Exception as e:
        logger.error(f"Error displaying memory usage: {e}")
        st.error(f"Error displaying memory usage: {e}")

def display_memory_details(component):
    """
    Display detailed information for a specific memory component.
    
    Args:
        component (str): Memory component to display details for.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Memory Details: {component}")
    
    try:
        # Get memory usage data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="memory_details_time_range"
        )
        
        memory_usage_data = memory_api.get_memory_usage(time_range=time_range)
        formatted_data = format_timestamps(memory_usage_data)
        
        # Map component name to data key
        component_key_map = {
            "Vector Search": "vector_search_usage",
            "Knowledge Graph": "knowledge_graph_usage",
            "Local Cache": "local_cache_usage"
        }
        
        component_key = component_key_map.get(component)
        
        if not component_key:
            st.error(f"Component {component} not found")
            return
        
        # Display component usage chart
        st.markdown(f"### {component} Usage Over Time")
        
        chart = create_line_chart(
            formatted_data,
            "short_timestamps",
            [component_key],
            f"{component} Usage Over Time"
        )
        st.altair_chart(chart, use_container_width=True)
        
        # Display component statistics
        st.markdown(f"### {component} Statistics")
        
        # Calculate statistics
        stats = calculate_statistics(memory_usage_data[component_key])
        
        # Create columns for metrics
        col1, col2, col3, col4, col5 = st.columns(5)
        
        # Display metrics
        with col1:
            create_metric_card(
                "Min",
                stats["min"],
                formatter=lambda x: f"{x:.2f} MB"
            )
        
        with col2:
            create_metric_card(
                "Max",
                stats["max"],
                formatter=lambda x: f"{x:.2f} MB"
            )
        
        with col3:
            create_metric_card(
                "Mean",
                stats["mean"],
                formatter=lambda x: f"{x:.2f} MB"
            )
        
        with col4:
            create_metric_card(
                "Median",
                stats["median"],
                formatter=lambda x: f"{x:.2f} MB"
            )
        
        with col5:
            create_metric_card(
                "Std Dev",
                stats["std"],
                formatter=lambda x: f"{x:.2f} MB"
            )
        
        # Display additional component-specific information
        if component == "Vector Search":
            st.markdown("### Vector Search Details")
            st.markdown("""
            Vector Search is used for semantic retrieval of information based on embeddings.
            It allows for efficient similarity search across large datasets.
            """)
        
        elif component == "Knowledge Graph":
            st.markdown("### Knowledge Graph Details")
            st.markdown("""
            Knowledge Graph stores structured information about entities and their relationships.
            It enables complex queries and reasoning about the data.
            """)
        
        elif component == "Local Cache":
            st.markdown("### Local Cache Details")
            st.markdown("""
            Local Cache stores frequently accessed data in memory for fast retrieval.
            It reduces the need to query external services, improving performance.
            """)
            
            # Display cache metrics
            cache_metrics = memory_api.get_cache_metrics()
            
            # Create columns for metrics
            col1, col2 = st.columns(2)
            
            # Display metrics
            with col1:
                create_metric_card(
                    "Cache Hit Count",
                    cache_metrics["hit_count"]
                )
                
                create_metric_card(
                    "Cache Miss Count",
                    cache_metrics["miss_count"]
                )
            
            with col2:
                create_metric_card(
                    "Cache Hit Rate",
                    cache_metrics["hit_rate"],
                    formatter=format_percentage
                )
                
                create_metric_card(
                    "Cache Size",
                    cache_metrics["size"],
                    delta=f"{cache_metrics['size'] / cache_metrics['max_size'] * 100:.1f}",
                    delta_suffix="% of max",
                    formatter=lambda x: f"{x} items"
                )
    
    except Exception as e:
        logger.error(f"Error displaying memory details: {e}")
        st.error(f"Error displaying memory details: {e}")
