"""
Memory Usage Component for VANA Dashboard.

This module provides components for displaying memory usage and operations.
"""

import logging
from datetime import datetime

import altair as alt
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.api.memory_api import get_memory_metrics_history, get_memory_usage, get_recent_queries
from dashboard.utils.data_formatter import format_percentage

logger = logging.getLogger(__name__)


def display_memory_usage():
    """Display memory usage visualization component."""
    # Fetch memory data
    memory_data = get_memory_usage()

    # Memory Overview
    st.subheader("Memory System Overview")

    # Create metrics in 3 columns
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Vector Search",
            f"{memory_data['vector_search']['size_mb']} MB",
            f"{memory_data['vector_search']['total_entries']} entries",
        )

    with col2:
        st.metric(
            "Knowledge Graph",
            f"{memory_data['knowledge_graph']['size_mb']} MB",
            f"{memory_data['knowledge_graph']['entity_count']} entities",
        )

    with col3:
        st.metric(
            "Cache",
            f"{memory_data['cache']['size_mb']} MB",
            f"Hit Rate: {format_percentage(memory_data['cache']['hit_rate'])}",
        )

    # Memory Size Chart
    st.subheader("Memory Storage Breakdown")

    # Create DataFrame for memory components
    memory_sizes = pd.DataFrame(
        [
            {"Component": "Vector Search", "Size (MB)": memory_data["vector_search"]["size_mb"]},
            {"Component": "Knowledge Graph", "Size (MB)": memory_data["knowledge_graph"]["size_mb"]},
            {"Component": "Cache", "Size (MB)": memory_data["cache"]["size_mb"]},
        ]
    )

    # Create bar chart
    fig = px.bar(
        memory_sizes,
        x="Component",
        y="Size (MB)",
        color="Component",
        title="Memory Usage by Component",
        color_discrete_sequence=["#3366CC", "#DC3912", "#FF9900"],
    )

    st.plotly_chart(fig, use_container_width=True)

    # Memory Metrics Tabs
    st.subheader("Memory Component Details")

    tabs = st.tabs(["Vector Search", "Knowledge Graph", "Cache", "Hybrid Search"])

    with tabs[0]:
        # Vector Search metrics
        vs = memory_data["vector_search"]

        # Create two columns for metrics
        vs_col1, vs_col2 = st.columns(2)

        with vs_col1:
            st.metric("Total Entries", f"{vs['total_entries']:,}")
            st.metric("Size", f"{vs['size_mb']} MB")
            st.metric("Index Type", vs["index_type"])

        with vs_col2:
            st.metric("Query Count (24h)", f"{vs['query_count_24h']:,}")
            st.metric("Average Latency", f"{vs['average_latency_ms']} ms")
            st.metric("Dimensions", f"{vs['dimensions']}")

        # Display additional explanation
        st.markdown(
            """
        The Vector Search component stores embeddings of text for semantic similarity search.
        It uses an HNSW (Hierarchical Navigable Small World) index for efficient approximate nearest neighbor search.
        """
        )

    with tabs[1]:
        # Knowledge Graph metrics
        kg = memory_data["knowledge_graph"]

        # Create two columns for metrics
        kg_col1, kg_col2 = st.columns(2)

        with kg_col1:
            st.metric("Entity Count", f"{kg['entity_count']:,}")
            st.metric("Relationship Count", f"{kg['relationship_count']:,}")
            st.metric("Size", f"{kg['size_mb']} MB")

        with kg_col2:
            st.metric("Query Count (24h)", f"{kg['query_count_24h']:,}")
            st.metric("Average Latency", f"{kg['average_latency_ms']} ms")
            st.metric("Entity Types", f"{len(kg['entity_types'])}")

        # Create pie chart for entity distribution
        entity_counts = {
            "Person": int(kg["entity_count"] * 0.3),
            "Organization": int(kg["entity_count"] * 0.2),
            "Concept": int(kg["entity_count"] * 0.25),
            "Document": int(kg["entity_count"] * 0.15),
            "Event": int(kg["entity_count"] * 0.1),
        }

        entity_df = pd.DataFrame({"Entity Type": entity_counts.keys(), "Count": entity_counts.values()})

        fig = px.pie(
            entity_df,
            values="Count",
            names="Entity Type",
            title="Entity Type Distribution",
            color_discrete_sequence=px.colors.qualitative.Safe,
        )

        st.plotly_chart(fig, use_container_width=True)

        # Display additional explanation
        st.markdown(
            """
        The Knowledge Graph component stores structured information as entities and relationships.
        It enables complex queries based on relationships between entities.
        """
        )

    with tabs[2]:
        # Cache metrics
        cache = memory_data["cache"]

        # Create two columns for metrics
        cache_col1, cache_col2 = st.columns(2)

        with cache_col1:
            st.metric("Entries", f"{cache['entries']:,}")
            st.metric("Size", f"{cache['size_mb']} MB")
            st.metric("Hit Rate", format_percentage(cache["hit_rate"]))

        with cache_col2:
            st.metric("Evictions (24h)", f"{cache['evictions_24h']:,}")
            st.metric("Max Size", f"{cache['max_size_mb']} MB")
            st.metric("Average Access Time", f"{cache['average_access_time_ms']} ms")

        # Create gauge chart for cache hit rate
        fig = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=cache["hit_rate"] * 100,
                title={"text": "Cache Hit Rate"},
                domain={"x": [0, 1], "y": [0, 1]},
                gauge={
                    "axis": {"range": [0, 100]},
                    "bar": {"color": "darkgreen"},
                    "steps": [
                        {"range": [0, 50], "color": "red"},
                        {"range": [50, 75], "color": "orange"},
                        {"range": [75, 100], "color": "green"},
                    ],
                    "threshold": {
                        "line": {"color": "black", "width": 4},
                        "thickness": 0.75,
                        "value": cache["hit_rate"] * 100,
                    },
                },
            )
        )

        fig.update_layout(height=300)
        st.plotly_chart(fig, use_container_width=True)

        # Display additional explanation
        st.markdown(
            """
        The Cache component stores frequently accessed data for rapid retrieval.
        A higher hit rate indicates better cache efficiency.
        """
        )

    with tabs[3]:
        # Hybrid Search metrics
        hs = memory_data["hybrid_search"]

        # Create two columns for metrics
        hs_col1, hs_col2 = st.columns(2)

        with hs_col1:
            st.metric("Query Count (24h)", f"{hs['query_count_24h']:,}")
            st.metric("Average Latency", f"{hs['average_latency_ms']} ms")

        with hs_col2:
            st.metric("Vector Contribution", format_percentage(hs["vector_contribution"]))
            st.metric("Graph Contribution", format_percentage(hs["graph_contribution"]))

        # Create pie chart for hybrid search contribution
        contrib_df = pd.DataFrame(
            [
                {"Component": "Vector Search", "Contribution": hs["vector_contribution"]},
                {"Component": "Knowledge Graph", "Contribution": hs["graph_contribution"]},
            ]
        )

        fig = px.pie(
            contrib_df,
            values="Contribution",
            names="Component",
            title="Hybrid Search Contribution",
            color_discrete_sequence=["#3366CC", "#DC3912"],
        )

        st.plotly_chart(fig, use_container_width=True)

        # Display additional explanation
        st.markdown(
            """
        Hybrid Search combines results from both Vector Search and Knowledge Graph.
        It provides more comprehensive results by leveraging both semantic similarity and structured relationships.
        """
        )

    # Historical Memory Metrics
    st.subheader("Historical Memory Metrics")

    # Time period selection
    time_period = st.radio("Time Period", ["Last 24 Hours", "Last Week"], horizontal=True)
    hours = 24 if time_period == "Last 24 Hours" else 168

    # Fetch historical data
    history_data = get_memory_metrics_history(hours)

    if history_data:
        # Convert to DataFrame
        history_df = pd.DataFrame(
            [
                {
                    "timestamp": datetime.fromisoformat(entry["timestamp"]),
                    "vector_size_mb": entry["vector_search"]["size_mb"],
                    "vector_entries": entry["vector_search"]["total_entries"],
                    "vector_queries": entry["vector_search"]["query_count"],
                    "vector_latency_ms": entry["vector_search"]["latency_ms"],
                    "graph_size_mb": entry["knowledge_graph"]["size_mb"],
                    "graph_entities": entry["knowledge_graph"]["entity_count"],
                    "graph_relationships": entry["knowledge_graph"]["relationship_count"],
                    "graph_queries": entry["knowledge_graph"]["query_count"],
                    "graph_latency_ms": entry["knowledge_graph"]["latency_ms"],
                    "cache_size_mb": entry["cache"]["size_mb"],
                    "cache_entries": entry["cache"]["entries"],
                    "cache_hit_rate": entry["cache"]["hit_rate"],
                }
                for entry in history_data
            ]
        )

        # Create tabs for different historical metrics
        hist_tabs = st.tabs(["Size", "Entries", "Performance"])

        with hist_tabs[0]:
            # Size over time
            size_chart = (
                alt.Chart(history_df)
                .transform_fold(
                    ["vector_size_mb", "graph_size_mb", "cache_size_mb"], as_=["Memory Component", "Size (MB)"]
                )
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("Size (MB):Q"),
                    color=alt.Color(
                        "Memory Component:N",
                        scale=alt.Scale(
                            domain=["vector_size_mb", "graph_size_mb", "cache_size_mb"],
                            range=["#3366CC", "#DC3912", "#FF9900"],
                        ),
                    ),
                    tooltip=["timestamp:T", "Size (MB):Q", "Memory Component:N"],
                )
                .properties(title="Memory Size Over Time", height=300)
                .interactive()
            )

            st.altair_chart(size_chart, use_container_width=True)

        with hist_tabs[1]:
            # Create separate charts for entries

            # Vector entries
            vector_chart = (
                alt.Chart(history_df)
                .mark_line(color="#3366CC")
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("vector_entries:Q", title="Vector Entries"),
                    tooltip=["timestamp:T", "vector_entries:Q"],
                )
                .properties(title="Vector Search Entries Over Time", height=200)
                .interactive()
            )

            # Graph entities
            entity_chart = (
                alt.Chart(history_df)
                .mark_line(color="#DC3912")
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("graph_entities:Q", title="Entities"),
                    tooltip=["timestamp:T", "graph_entities:Q"],
                )
                .properties(title="Knowledge Graph Entities Over Time", height=200)
                .interactive()
            )

            # Graph relationships
            relationship_chart = (
                alt.Chart(history_df)
                .mark_line(color="#FF9900")
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("graph_relationships:Q", title="Relationships"),
                    tooltip=["timestamp:T", "graph_relationships:Q"],
                )
                .properties(title="Knowledge Graph Relationships Over Time", height=200)
                .interactive()
            )

            st.altair_chart(vector_chart, use_container_width=True)
            st.altair_chart(entity_chart, use_container_width=True)
            st.altair_chart(relationship_chart, use_container_width=True)

        with hist_tabs[2]:
            # Performance metrics over time

            # Query counts
            query_chart = (
                alt.Chart(history_df)
                .transform_fold(["vector_queries", "graph_queries"], as_=["Component", "Queries"])
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("Queries:Q"),
                    color=alt.Color(
                        "Component:N",
                        scale=alt.Scale(domain=["vector_queries", "graph_queries"], range=["#3366CC", "#DC3912"]),
                    ),
                    tooltip=["timestamp:T", "Queries:Q", "Component:N"],
                )
                .properties(title="Query Count Over Time", height=200)
                .interactive()
            )

            # Latency
            latency_chart = (
                alt.Chart(history_df)
                .transform_fold(["vector_latency_ms", "graph_latency_ms"], as_=["Component", "Latency (ms)"])
                .mark_line()
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("Latency (ms):Q"),
                    color=alt.Color(
                        "Component:N",
                        scale=alt.Scale(domain=["vector_latency_ms", "graph_latency_ms"], range=["#3366CC", "#DC3912"]),
                    ),
                    tooltip=["timestamp:T", "Latency (ms):Q", "Component:N"],
                )
                .properties(title="Query Latency Over Time", height=200)
                .interactive()
            )

            # Cache hit rate
            hit_rate_chart = (
                alt.Chart(history_df)
                .mark_line(color="#FF9900")
                .encode(
                    x=alt.X("timestamp:T", title="Time"),
                    y=alt.Y("cache_hit_rate:Q", title="Hit Rate", scale=alt.Scale(domain=[0, 1])),
                    tooltip=["timestamp:T", alt.Tooltip("cache_hit_rate:Q", format=".2%")],
                )
                .properties(title="Cache Hit Rate Over Time", height=200)
                .interactive()
            )

            st.altair_chart(query_chart, use_container_width=True)
            st.altair_chart(latency_chart, use_container_width=True)
            st.altair_chart(hit_rate_chart, use_container_width=True)
    else:
        st.error("No historical memory metrics available")

    # Recent Memory Queries
    st.subheader("Recent Memory Queries")

    # Fetch recent queries
    recent_queries = get_recent_queries(limit=10)

    if recent_queries:
        # Create DataFrame
        queries_df = pd.DataFrame(
            [
                {
                    "Time": datetime.fromisoformat(q["timestamp"]).strftime("%Y-%m-%d %H:%M:%S"),
                    "Query": q["query"],
                    "Type": q["search_type"].capitalize(),
                    "Results": q["result_count"],
                    "Duration (ms)": q["duration_ms"],
                    "Status": "Success" if q["successful"] else "Failed",
                }
                for q in recent_queries
            ]
        )

        # Style the DataFrame
        style_df = queries_df.style.apply(
            lambda row: [
                "background-color: #e6ffe6" if row["Status"] == "Success" else "background-color: #ffe6e6" for _ in row
            ],
            axis=1,
        )

        # Display as table
        st.dataframe(style_df, use_container_width=True, height=400)
    else:
        st.error("No recent queries available")
