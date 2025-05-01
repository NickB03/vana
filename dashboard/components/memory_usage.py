"""
Memory Usage Component for VANA Dashboard.

This module provides components for displaying memory usage and operations.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import logging
from dashboard.api import memory_api

logger = logging.getLogger(__name__)

def display_memory_usage():
    """
    Display memory usage visualization.
    """
    # Get memory data
    memory_data = memory_api.get_memory_usage()

    # Display summary metrics
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Vector Search", f"{memory_data['vector_search']['size_mb']} MB",
                f"{memory_data['vector_search']['total_entries']} entries")
    with col2:
        st.metric("Knowledge Graph", f"{memory_data['knowledge_graph']['size_mb']} MB",
                f"{memory_data['knowledge_graph']['entity_count']} entities")
    with col3:
        st.metric("Cache", f"{memory_data['cache']['size_mb']} MB",
                f"Hit Rate: {memory_data['cache']['hit_rate']:.0%}")

    # Create usage chart
    usage_data = {
        'Component': ['Vector Search', 'Knowledge Graph', 'Cache'],
        'Size (MB)': [
            memory_data['vector_search']['size_mb'],
            memory_data['knowledge_graph']['size_mb'],
            memory_data['cache']['size_mb']
        ]
    }
    df = pd.DataFrame(usage_data)
    fig = px.bar(df, x='Component', y='Size (MB)',
                title='Memory Usage by Component',
                color='Component')
    st.plotly_chart(fig, use_container_width=True)

    # Display operations data
    st.subheader("Memory Operations")
    operations = memory_api.get_memory_operations()

    # Create operations chart
    op_data = {
        'Operation': ['Read', 'Write', 'Update', 'Delete'],
        'Count': [
            operations['operations']['read'],
            operations['operations']['write'],
            operations['operations']['update'],
            operations['operations']['delete']
        ]
    }
    df_ops = pd.DataFrame(op_data)
    fig_ops = px.pie(df_ops, values='Count', names='Operation',
                    title='Memory Operations Distribution')
    st.plotly_chart(fig_ops, use_container_width=True)

    # Display component usage
    st.subheader("Component Usage")
    comp_data = {
        'Component': ['Vector Search', 'Knowledge Graph', 'Cache'],
        'Operations': [
            operations['components']['vector_search'],
            operations['components']['knowledge_graph'],
            operations['components']['cache']
        ]
    }
    df_comp = pd.DataFrame(comp_data)
    fig_comp = px.bar(df_comp, x='Component', y='Operations',
                    title='Operations by Component',
                    color='Component')
    st.plotly_chart(fig_comp, use_container_width=True)
