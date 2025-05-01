# VANA Sprint 3 - Phase 2: Detailed Implementation Plan

## Overview

This plan builds directly on Phase 1, with specific focus on addressing the identified issues in your implementation: placeholder components, non-functional data sources, missing visualizations, and lack of mock data. Each section contains explicit code examples and step-by-step instructions to ensure you can implement fully functional components.

## Timeline

This phase should be completed in 1-2 weeks, with the following time allocation:
- Agent Status visualization: 2-3 days
- Memory Usage visualization: 2-3 days  
- System Health visualization: 2-3 days
- Test implementation and integration: 3-4 days

## 1. Implement Agent Status Panel

### 1.1. Create Mock Data Generator

First, create a functional mock data generator in `dashboard/api/agent_api.py`:

```python
import random
import datetime
import logging

def get_agent_statuses():
    """
    Retrieve status information for all agents in the system.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        # For now, returning realistic mock data
        return generate_mock_agent_data()
    except Exception as e:
        logging.error(f"Error fetching agent status data: {e}")
        # Still return mock data as fallback to ensure UI works
        return generate_mock_agent_data()

def generate_mock_agent_data():
    """Generate realistic mock agent status data."""
    # List of agent names
    agent_names = ["Vana", "Rhea", "Max", "Sage", "Kai", "Juno"]
    
    # Status options
    status_options = ["Active", "Idle", "Busy", "Error", "Offline"]
    status_weights = [0.6, 0.2, 0.1, 0.05, 0.05]  # Probability weights
    
    # Generate realistic timestamp within the last hour
    current_time = datetime.datetime.now()
    
    # Generate data for each agent
    agents_data = []
    for agent in agent_names:
        # Generate a realistic last active time within the last hour
        minutes_ago = random.randint(0, 60)
        last_active = current_time - datetime.timedelta(minutes=minutes_ago)
        
        # Random status weighted towards "Active"
        status = random.choices(status_options, status_weights)[0]
        
        # Generate realistic metrics
        response_time_ms = round(random.uniform(50, 500), 1)
        requests_handled = random.randint(10, 1000)
        error_rate = round(random.uniform(0, 0.05), 3)
        
        # Standard capabilities for each agent based on their role
        capabilities = {
            "Vana": ["Task Delegation", "Context Management", "Memory Integration"],
            "Rhea": ["Architecture Planning", "System Design", "Component Integration"],
            "Max": ["User Interface", "Command Parsing", "Response Formatting"],
            "Sage": ["Platform Integration", "API Management", "Service Orchestration"],
            "Kai": ["Edge Case Handling", "Error Recovery", "Fallback Management"],
            "Juno": ["System Testing", "Quality Assurance", "Performance Monitoring"]
        }
        
        # Construct agent data object
        agent_data = {
            "name": agent,
            "status": status,
            "last_active": last_active.isoformat(),
            "response_time_ms": response_time_ms,
            "requests_handled": requests_handled,
            "error_rate": error_rate,
            "capabilities": capabilities.get(agent, []),
            "cpu_usage": round(random.uniform(5, 95), 1),
            "memory_usage_mb": random.randint(50, 500)
        }
        
        agents_data.append(agent_data)
    
    return agents_data

def get_agent_activity(agent_name, hours=24):
    """
    Get historical activity data for a specific agent.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        return generate_mock_agent_activity(agent_name, hours)
    except Exception as e:
        logging.error(f"Error fetching agent activity data: {e}")
        return generate_mock_agent_activity(agent_name, hours)

def generate_mock_agent_activity(agent_name, hours=24):
    """Generate realistic mock historical data for an agent."""
    current_time = datetime.datetime.now()
    activity_data = []
    
    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)
        
        # Generate realistic metrics with some random variation
        requests = random.randint(5, 100)
        response_time = round(random.uniform(50, 500), 1)
        error_rate = round(random.uniform(0, 0.1), 3)
        cpu_usage = round(random.uniform(5, 95), 1)
        memory_usage = random.randint(50, 500)
        
        # Add some realistic patterns - busier during work hours
        hour_of_day = timestamp.hour
        if 9 <= hour_of_day <= 17:  # 9 AM to 5 PM
            requests *= 1.5
            cpu_usage *= 1.2
            memory_usage *= 1.2
        
        data_point = {
            "timestamp": timestamp.isoformat(),
            "requests": int(requests),
            "response_time_ms": response_time,
            "error_rate": error_rate,
            "cpu_usage": cpu_usage,
            "memory_usage_mb": memory_usage
        }
        
        activity_data.append(data_point)
    
    return {
        "agent_name": agent_name,
        "activity": activity_data
    }
```

### 1.2. Implement Agent Status Component

Create the actual visualization in `dashboard/components/agent_status.py`:

```python
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime
import altair as alt

from dashboard.api.agent_api import get_agent_statuses, get_agent_activity
from dashboard.utils.data_formatter import format_timestamp

def display_agent_status():
    """Display agent status visualization component."""
    # Fetch agent data
    agent_data = get_agent_statuses()
    
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
                "Offline": "gray"
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
                unsafe_allow_html=True
            )
    
    # Agent performance metrics
    st.subheader("Agent Performance Metrics")
    
    # Create DataFrame for performance metrics
    metrics_df = pd.DataFrame([
        {
            "Agent": agent["name"],
            "Response Time (ms)": agent["response_time_ms"],
            "Error Rate (%)": agent["error_rate"] * 100,
            "CPU Usage (%)": agent["cpu_usage"],
            "Memory Usage (MB)": agent["memory_usage_mb"]
        }
        for agent in agent_data
    ])
    
    # Create tabs for different performance metrics
    tabs = st.tabs(["Response Time", "Error Rate", "Resource Usage"])
    
    with tabs[0]:
        # Response time bar chart
        fig = px.bar(
            metrics_df, 
            x="Agent", 
            y="Response Time (ms)",
            color="Agent",
            title="Agent Response Times"
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with tabs[1]:
        # Error rate bar chart
        fig = px.bar(
            metrics_df, 
            x="Agent", 
            y="Error Rate (%)",
            color="Agent",
            title="Agent Error Rates"
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with tabs[2]:
        # Resource usage grouped bar chart
        fig = go.Figure()
        
        # Add CPU usage bars
        fig.add_trace(go.Bar(
            x=metrics_df["Agent"],
            y=metrics_df["CPU Usage (%)"],
            name="CPU Usage (%)",
            marker_color="indianred"
        ))
        
        # Add Memory usage bars
        fig.add_trace(go.Bar(
            x=metrics_df["Agent"],
            y=metrics_df["Memory Usage (MB)"],
            name="Memory Usage (MB)",
            marker_color="lightsalmon"
        ))
        
        # Update layout
        fig.update_layout(
            title="Agent Resource Usage",
            xaxis_title="Agent",
            yaxis_title="Usage",
            barmode="group"
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # Agent historical activity
    st.subheader("Agent Historical Activity")
    
    # Agent selection for historical data
    selected_agent = st.selectbox("Select Agent", [agent["name"] for agent in agent_data])
    
    # Time period selection
    time_period = st.radio("Time Period", ["Last 24 Hours", "Last Week"], horizontal=True)
    hours = 24 if time_period == "Last 24 Hours" else 168
    
    # Fetch historical data
    historical_data = get_agent_activity(selected_agent, hours)
    
    # Create DataFrame from historical data
    if historical_data and "activity" in historical_data:
        history_df = pd.DataFrame(historical_data["activity"])
        
        # Convert timestamp strings to datetime objects
        history_df["timestamp"] = pd.to_datetime(history_df["timestamp"])
        
        # Create tabs for different metrics
        hist_tabs = st.tabs(["Requests", "Response Time", "Error Rate", "Resource Usage"])
        
        with hist_tabs[0]:
            # Requests line chart
            chart = alt.Chart(history_df).mark_line().encode(
                x=alt.X('timestamp:T', title='Time'),
                y=alt.Y('requests:Q', title='Number of Requests'),
                tooltip=['timestamp:T', 'requests:Q']
            ).properties(
                title=f"{selected_agent} - Request Volume",
                height=300
            ).interactive()
            
            st.altair_chart(chart, use_container_width=True)
        
        with hist_tabs[1]:
            # Response time line chart
            chart = alt.Chart(history_df).mark_line().encode(
                x=alt.X('timestamp:T', title='Time'),
                y=alt.Y('response_time_ms:Q', title='Response Time (ms)'),
                tooltip=['timestamp:T', 'response_time_ms:Q']
            ).properties(
                title=f"{selected_agent} - Response Time",
                height=300
            ).interactive()
            
            st.altair_chart(chart, use_container_width=True)
        
        with hist_tabs[2]:
            # Error rate line chart
            history_df["error_rate_percent"] = history_df["error_rate"] * 100
            
            chart = alt.Chart(history_df).mark_line().encode(
                x=alt.X('timestamp:T', title='Time'),
                y=alt.Y('error_rate_percent:Q', title='Error Rate (%)'),
                tooltip=['timestamp:T', 'error_rate_percent:Q']
            ).properties(
                title=f"{selected_agent} - Error Rate",
                height=300
            ).interactive()
            
            st.altair_chart(chart, use_container_width=True)
        
        with hist_tabs[3]:
            # Create dual y-axis chart for CPU and memory usage
            base = alt.Chart(history_df).encode(
                x=alt.X('timestamp:T', title='Time')
            ).properties(
                title=f"{selected_agent} - Resource Usage",
                height=300
            )
            
            # CPU usage line
            cpu_line = base.mark_line(color='red').encode(
                y=alt.Y('cpu_usage:Q', title='CPU Usage (%)'),
                tooltip=['timestamp:T', 'cpu_usage:Q']
            )
            
            # Memory usage line
            memory_line = base.mark_line(color='blue').encode(
                y=alt.Y('memory_usage_mb:Q', title='Memory Usage (MB)'),
                tooltip=['timestamp:T', 'memory_usage_mb:Q']
            )
            
            # Combine both lines
            chart = alt.layer(cpu_line, memory_line).resolve_scale(
                y='independent'
            ).interactive()
            
            st.altair_chart(chart, use_container_width=True)
    else:
        st.error(f"No historical data available for {selected_agent}")
```

### 1.3. Implement Data Formatter Utility

Create `dashboard/utils/data_formatter.py` to support the agent status component:

```python
from datetime import datetime
import pytz

def format_timestamp(timestamp_str):
    """Format an ISO timestamp string to a human-readable string."""
    try:
        # Parse ISO format timestamp
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        
        # Convert to local timezone
        local_tz = datetime.now().astimezone().tzinfo
        local_dt = dt.astimezone(local_tz)
        
        # Calculate time difference
        now = datetime.now(local_tz)
        diff = now - local_dt
        
        # Format based on time difference
        if diff.days == 0:
            if diff.seconds < 60:
                return "Just now"
            elif diff.seconds < 3600:
                minutes = diff.seconds // 60
                return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
            else:
                hours = diff.seconds // 3600
                return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.days == 1:
            return f"Yesterday at {local_dt.strftime('%H:%M')}"
        else:
            return local_dt.strftime("%Y-%m-%d %H:%M")
    except Exception as e:
        # If formatting fails, return the original string
        return timestamp_str

def format_bytes(size_bytes):
    """Format bytes to human-readable string (KB, MB, GB, etc.)."""
    if size_bytes < 1024:
        return f"{size_bytes} bytes"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

def format_duration(seconds):
    """Format seconds to human-readable duration string."""
    if seconds < 60:
        return f"{seconds:.1f} seconds"
    elif seconds < 3600:
        minutes = seconds / 60
        return f"{minutes:.1f} minutes"
    elif seconds < 86400:
        hours = seconds / 3600
        return f"{hours:.1f} hours"
    else:
        days = seconds / 86400
        return f"{days:.1f} days"

def format_percentage(value):
    """Format a decimal value to percentage string."""
    return f"{value * 100:.2f}%"
```

### 1.4. Update Main App

Update `dashboard/app.py` to use the actual agent status component:

```python
# Replace the placeholder section:
elif page == "Agent Status":
    st.header("Agent Status")
    # Use the actual component instead of placeholder
    agent_status.display_agent_status()
```

## 2. Implement Memory Usage Panel

### 2.1. Create Mock Data Generator

Create `dashboard/api/memory_api.py` with functional mock data:

```python
import random
import datetime
import logging

def get_memory_usage():
    """
    Retrieve memory usage data for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        # In real implementation, this would call an actual API endpoint
        return generate_mock_memory_data()
    except Exception as e:
        logging.error(f"Error fetching memory usage data: {e}")
        return generate_mock_memory_data()

def generate_mock_memory_data():
    """Generate realistic mock memory usage data."""
    # Generate vector search data
    vector_search = {
        "total_entries": random.randint(1000, 10000),
        "size_mb": round(random.uniform(50, 500), 1),
        "query_count_24h": random.randint(100, 2000),
        "average_latency_ms": round(random.uniform(50, 200), 1),
        "index_type": "HNSW",
        "dimensions": 1536,
        "cache_hit_rate": round(random.uniform(0.6, 0.9), 2)
    }
    
    # Generate knowledge graph data
    knowledge_graph = {
        "entity_count": random.randint(5000, 20000),
        "relationship_count": random.randint(10000, 50000),
        "size_mb": round(random.uniform(20, 300), 1),
        "query_count_24h": random.randint(50, 1000),
        "average_latency_ms": round(random.uniform(30, 150), 1),
        "entity_types": ["Person", "Organization", "Concept", "Document", "Event"],
        "relationship_types": ["KNOWS", "PART_OF", "RELATES_TO", "CREATED_BY", "MENTIONS"]
    }
    
    # Generate cache data
    cache = {
        "entries": random.randint(100, 2000),
        "hit_rate": round(random.uniform(0.5, 0.95), 2),
        "size_mb": round(random.uniform(10, 100), 1),
        "evictions_24h": random.randint(10, 200),
        "max_size_mb": 200,
        "average_access_time_ms": round(random.uniform(1, 10), 1)
    }
    
    # Generate hybrid search data
    hybrid_search = {
        "query_count_24h": random.randint(50, 500),
        "average_latency_ms": round(random.uniform(100, 300), 1),
        "vector_contribution": round(random.uniform(0.3, 0.7), 2),
        "graph_contribution": round(random.uniform(0.3, 0.7), 2)
    }
    
    return {
        "vector_search": vector_search,
        "knowledge_graph": knowledge_graph,
        "cache": cache,
        "hybrid_search": hybrid_search
    }

def get_memory_metrics_history(hours=24):
    """
    Get historical memory metrics for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_memory_history(hours)
    except Exception as e:
        logging.error(f"Error fetching memory history data: {e}")
        return generate_mock_memory_history(hours)

def generate_mock_memory_history(hours=24):
    """Generate realistic mock historical memory data."""
    current_time = datetime.datetime.now()
    history = []
    
    # Starting values
    vector_size = 200
    graph_size = 100
    cache_size = 30
    vector_entries = 5000
    graph_entities = 10000
    graph_relationships = 25000
    
    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)
        
        # Add some random growth to the metrics
        vector_size += random.uniform(-5, 15)
        graph_size += random.uniform(-3, 10)
        cache_size += random.uniform(-2, 5)
        vector_entries += random.randint(-50, 200)
        graph_entities += random.randint(-30, 150)
        graph_relationships += random.randint(-100, 400)
        
        # Ensure values stay reasonable
        vector_size = max(50, min(1000, vector_size))
        graph_size = max(20, min(500, graph_size))
        cache_size = max(10, min(200, cache_size))
        vector_entries = max(1000, vector_entries)
        graph_entities = max(5000, graph_entities)
        graph_relationships = max(10000, graph_relationships)
        
        # Create data point
        data_point = {
            "timestamp": timestamp.isoformat(),
            "vector_search": {
                "size_mb": round(vector_size, 1),
                "total_entries": int(vector_entries),
                "query_count": random.randint(5, 100),
                "latency_ms": round(random.uniform(50, 200), 1)
            },
            "knowledge_graph": {
                "size_mb": round(graph_size, 1),
                "entity_count": int(graph_entities),
                "relationship_count": int(graph_relationships),
                "query_count": random.randint(3, 50),
                "latency_ms": round(random.uniform(30, 150), 1)
            },
            "cache": {
                "size_mb": round(cache_size, 1),
                "entries": random.randint(100, 1000),
                "hit_rate": round(random.uniform(0.5, 0.95), 2)
            }
        }
        
        history.append(data_point)
    
    return history

def get_recent_queries(limit=10):
    """
    Get recent memory queries for the VANA system.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_recent_queries(limit)
    except Exception as e:
        logging.error(f"Error fetching recent queries data: {e}")
        return generate_mock_recent_queries(limit)

def generate_mock_recent_queries(limit=10):
    """Generate realistic mock recent query data."""
    current_time = datetime.datetime.now()
    
    # Query templates
    query_templates = [
        "Find information about {topic}",
        "What do we know about {topic}?",
        "Retrieve context related to {topic}",
        "Get details on {topic}",
        "Find entities related to {topic}"
    ]
    
    # Possible topics
    topics = [
        "machine learning",
        "natural language processing",
        "vector databases",
        "knowledge graphs",
        "agent architectures",
        "memory systems",
        "context management",
        "ADK integration",
        "specialist agents",
        "team coordination",
        "workflow automation"
    ]
    
    # Generate queries
    queries = []
    for i in range(limit):
        minutes_ago = random.randint(1, 60 * 24)  # Within last 24 hours
        timestamp = current_time - datetime.timedelta(minutes=minutes_ago)
        
        # Generate query
        template = random.choice(query_templates)
        topic = random.choice(topics)
        query_text = template.format(topic=topic)
        
        # Generate result data
        result_count = random.randint(0, 20)
        duration_ms = random.randint(50, 500)
        
        # Determine search type
        search_type = random.choice(["vector", "graph", "hybrid"])
        
        # Create query object
        query = {
            "id": f"q-{i+1}",
            "timestamp": timestamp.isoformat(),
            "query": query_text,
            "search_type": search_type,
            "result_count": result_count,
            "duration_ms": duration_ms,
            "successful": random.random() > 0.1  # 90% success rate
        }
        
        queries.append(query)
    
    # Sort by timestamp (most recent first)
    queries.sort(key=lambda q: q["timestamp"], reverse=True)
    
    return queries
```

### 2.2. Implement Memory Usage Component

Create `dashboard/components/memory_usage.py`:

```python
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import altair as alt
from datetime import datetime

from dashboard.api.memory_api import get_memory_usage, get_memory_metrics_history, get_recent_queries
from dashboard.utils.data_formatter import format_percentage

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
            f"{memory_data['vector_search']['total_entries']} entries"
        )
    
    with col2:
        st.metric(
            "Knowledge Graph", 
            f"{memory_data['knowledge_graph']['size_mb']} MB",
            f"{memory_data['knowledge_graph']['entity_count']} entities"
        )
    
    with col3:
        st.metric(
            "Cache", 
            f"{memory_data['cache']['size_mb']} MB",
            f"Hit Rate: {format_percentage(memory_data['cache']['hit_rate'])}"
        )
    
    # Memory Size Chart
    st.subheader("Memory Storage Breakdown")
    
    # Create DataFrame for memory components
    memory_sizes = pd.DataFrame([
        {"Component": "Vector Search", "Size (MB)": memory_data["vector_search"]["size_mb"]},
        {"Component": "Knowledge Graph", "Size (MB)": memory_data["knowledge_graph"]["size_mb"]},
        {"Component": "Cache", "Size (MB)": memory_data["cache"]["size_mb"]}
    ])
    
    # Create bar chart
    fig = px.bar(
        memory_sizes,
        x="Component",
        y="Size (MB)",
        color="Component",
        title="Memory Usage by Component",
        color_discrete_sequence=["#3366CC", "#DC3912", "#FF9900"]
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
        st.markdown("""
        The Vector Search component stores embeddings of text for semantic similarity search.
        It uses an HNSW (Hierarchical Navigable Small World) index for efficient approximate nearest neighbor search.
        """)
    
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
            "Person": int(kg['entity_count'] * 0.3),
            "Organization": int(kg['entity_count'] * 0.2),
            "Concept": int(kg['entity_count'] * 0.25),
            "Document": int(kg['entity_count'] * 0.15),
            "Event": int(kg['entity_count'] * 0.1)
        }
        
        entity_df = pd.DataFrame({
            "Entity Type": entity_counts.keys(),
            "Count": entity_counts.values()
        })
        
        fig = px.pie(
            entity_df,
            values="Count",
            names="Entity Type",
            title="Entity Type Distribution",
            color_discrete_sequence=px.colors.qualitative.Safe
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Display additional explanation
        st.markdown("""
        The Knowledge Graph component stores structured information as entities and relationships.
        It enables complex queries based on relationships between entities.
        """)
    
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
        fig = go.Figure(go.Indicator(
            mode = "gauge+number",
            value = cache["hit_rate"] * 100,
            title = {'text': "Cache Hit Rate"},
            domain = {'x': [0, 1], 'y': [0, 1]},
            gauge = {
                'axis': {'range': [0, 100]},
                'bar': {'color': "darkgreen"},
                'steps': [
                    {'range': [0, 50], 'color': "red"},
                    {'range': [50, 75], 'color': "orange"},
                    {'range': [75, 100], 'color': "green"}
                ],
                'threshold': {
                    'line': {'color': "black", 'width': 4},
                    'thickness': 0.75,
                    'value': cache["hit_rate"] * 100
                }
            }
        ))
        
        fig.update_layout(height=300)
        st.plotly_chart(fig, use_container_width=True)
        
        # Display additional explanation
        st.markdown("""
        The Cache component stores frequently accessed data for rapid retrieval.
        A higher hit rate indicates better cache efficiency.
        """)
    
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
        contrib_df = pd.DataFrame([
            {"Component": "Vector Search", "Contribution": hs["vector_contribution"]},
            {"Component": "Knowledge Graph", "Contribution": hs["graph_contribution"]}
        ])
        
        fig = px.pie(
            contrib_df,
            values="Contribution",
            names="Component",
            title="Hybrid Search Contribution",
            color_discrete_sequence=["#3366CC", "#DC3912"]
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Display additional explanation
        st.markdown("""
        Hybrid Search combines results from both Vector Search and Knowledge Graph.
        It provides more comprehensive results by leveraging both semantic similarity and structured relationships.
        """)
    
    # Historical Memory Metrics
    st.subheader("Historical Memory Metrics")
    
    # Time period selection
    time_period = st.radio("Time Period", ["Last 24 Hours", "Last Week"], horizontal=True)
    hours = 24 if time_period == "Last 24 Hours" else 168
    
    # Fetch historical data
    history_data = get_memory_metrics_history(hours)
    
    if history_data:
        # Convert to DataFrame
        history_df = pd.DataFrame([
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
                "cache_hit_rate": entry["cache"]["hit_rate"]
            }
            for entry in history_data
        ])
        
        # Create tabs for different historical metrics
        hist_tabs = st.tabs(["Size", "Entries", "Performance"])
        
        with hist_tabs[0]:
            # Size over time
            size_chart = alt.Chart(history_df).transform_fold(
                ["vector_size_mb", "graph_size_mb", "cache_size_mb"],
                as_=["Memory Component", "Size (MB)"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Size (MB):Q"),
                color=alt.Color("Memory Component:N", 
                               scale=alt.Scale(domain=["vector_size_mb", "graph_size_mb", "cache_size_mb"],
                                              range=["#3366CC", "#DC3912", "#FF9900"])),
                tooltip=["timestamp:T", "Size (MB):Q", "Memory Component:N"]
            ).properties(
                title="Memory Size Over Time",
                height=300
            ).interactive()
            
            st.altair_chart(size_chart, use_container_width=True)
        
        with hist_tabs[1]:
            # Create separate charts for entries
            
            # Vector entries
            vector_chart = alt.Chart(history_df).mark_line(color="#3366CC").encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("vector_entries:Q", title="Vector Entries"),
                tooltip=["timestamp:T", "vector_entries:Q"]
            ).properties(
                title="Vector Search Entries Over Time",
                height=200
            ).interactive()
            
            # Graph entities
            entity_chart = alt.Chart(history_df).mark_line(color="#DC3912").encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("graph_entities:Q", title="Entities"),
                tooltip=["timestamp:T", "graph_entities:Q"]
            ).properties(
                title="Knowledge Graph Entities Over Time",
                height=200
            ).interactive()
            
            # Graph relationships
            relationship_chart = alt.Chart(history_df).mark_line(color="#FF9900").encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("graph_relationships:Q", title="Relationships"),
                tooltip=["timestamp:T", "graph_relationships:Q"]
            ).properties(
                title="Knowledge Graph Relationships Over Time",
                height=200
            ).interactive()
            
            st.altair_chart(vector_chart, use_container_width=True)
            st.altair_chart(entity_chart, use_container_width=True)
            st.altair_chart(relationship_chart, use_container_width=True)
        
        with hist_tabs[2]:
            # Performance metrics over time
            
            # Query counts
            query_chart = alt.Chart(history_df).transform_fold(
                ["vector_queries", "graph_queries"],
                as_=["Component", "Queries"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Queries:Q"),
                color=alt.Color("Component:N", 
                               scale=alt.Scale(domain=["vector_queries", "graph_queries"],
                                              range=["#3366CC", "#DC3912"])),
                tooltip=["timestamp:T", "Queries:Q", "Component:N"]
            ).properties(
                title="Query Count Over Time",
                height=200
            ).interactive()
            
            # Latency
            latency_chart = alt.Chart(history_df).transform_fold(
                ["vector_latency_ms", "graph_latency_ms"],
                as_=["Component", "Latency (ms)"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Latency (ms):Q"),
                color=alt.Color("Component:N", 
                               scale=alt.Scale(domain=["vector_latency_ms", "graph_latency_ms"],
                                              range=["#3366CC", "#DC3912"])),
                tooltip=["timestamp:T", "Latency (ms):Q", "Component:N"]
            ).properties(
                title="Query Latency Over Time",
                height=200
            ).interactive()
            
            # Cache hit rate
            hit_rate_chart = alt.Chart(history_df).mark_line(color="#FF9900").encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("cache_hit_rate:Q", title="Hit Rate", scale=alt.Scale(domain=[0, 1])),
                tooltip=["timestamp:T", alt.Tooltip("cache_hit_rate:Q", format=".2%")]
            ).properties(
                title="Cache Hit Rate Over Time",
                height=200
            ).interactive()
            
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
        queries_df = pd.DataFrame([
            {
                "Time": datetime.fromisoformat(q["timestamp"]).strftime("%Y-%m-%d %H:%M:%S"),
                "Query": q["query"],
                "Type": q["search_type"].capitalize(),
                "Results": q["result_count"],
                "Duration (ms)": q["duration_ms"],
                "Status": "Success" if q["successful"] else "Failed"
            }
            for q in recent_queries
        ])
        
        # Style the DataFrame
        style_df = queries_df.style.apply(
            lambda row: ["background-color: #e6ffe6" if row["Status"] == "Success" else "background-color: #ffe6e6" for _ in row],
            axis=1
        )
        
        # Display as table
        st.dataframe(style_df, use_container_width=True, height=400)
    else:
        st.error("No recent queries available")
```

### 2.3. Update Main App

Update `dashboard/app.py` to use the actual memory usage component:

```python
# Replace the placeholder section:
elif page == "Memory Usage":
    st.header("Memory Usage")
    # Use the actual component instead of placeholder
    memory_usage.display_memory_usage()
```

## 3. Implement System Health Component

### 3.1. Create Mock Data Generator

Create `dashboard/api/system_api.py`:

```python
import random
import datetime
import logging
import platform
import psutil

def get_system_health():
    """
    Retrieve system health data.
    Returns real data if possible, falls back to mock data for development.
    """
    try:
        # Try to get real system metrics
        return get_real_system_health()
    except Exception as e:
        logging.error(f"Error getting real system health: {e}")
        # Fall back to mock data
        return generate_mock_system_health()

def get_real_system_health():
    """Get real system health metrics using psutil."""
    # Get CPU usage
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    
    # Get memory usage
    memory = psutil.virtual_memory()
    
    # Get disk usage
    disk = psutil.disk_usage('/')
    
    # Get network stats (as counters, not rates)
    net = psutil.net_io_counters()
    
    # Get system information
    system_info = {
        "os": platform.system(),
        "version": platform.version(),
        "architecture": platform.architecture()[0],
        "processor": platform.processor(),
        "hostname": platform.node(),
        "uptime": datetime.datetime.now() - datetime.datetime.fromtimestamp(psutil.boot_time())
    }
    
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "cpu": {
            "usage_percent": cpu_percent,
            "count": cpu_count,
            "load_avg": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
        },
        "memory": {
            "total_mb": memory.total / (1024 * 1024),
            "available_mb": memory.available / (1024 * 1024),
            "used_mb": memory.used / (1024 * 1024),
            "percent": memory.percent
        },
        "disk": {
            "total_gb": disk.total / (1024**3),
            "free_gb": disk.free / (1024**3),
            "used_gb": disk.used / (1024**3),
            "percent": disk.percent
        },
        "network": {
            "bytes_sent": net.bytes_sent,
            "bytes_recv": net.bytes_recv,
            "packets_sent": net.packets_sent,
            "packets_recv": net.packets_recv,
            "err_in": net.errin,
            "err_out": net.errout,
            "drop_in": net.dropin,
            "drop_out": net.dropout
        },
        "system_info": system_info
    }

def generate_mock_system_health():
    """Generate realistic mock system health data."""
    # Create timestamp
    timestamp = datetime.datetime.now()
    
    # CPU metrics
    cpu_count = 8
    cpu_percent = random.uniform(20, 80)
    
    # Memory metrics
    memory_total = 16 * 1024  # 16 GB in MB
    memory_percent = random.uniform(40, 85)
    memory_used = memory_total * (memory_percent / 100)
    memory_available = memory_total - memory_used
    
    # Disk metrics
    disk_total = 512  # 512 GB
    disk_percent = random.uniform(30, 70)
    disk_used = disk_total * (disk_percent / 100)
    disk_free = disk_total - disk_used
    
    # Network metrics
    bytes_sent = random.randint(1000000, 5000000)
    bytes_recv = random.randint(5000000, 20000000)
    packets_sent = random.randint(10000, 50000)
    packets_recv = random.randint(50000, 200000)
    
    # System info
    system_info = {
        "os": "Linux",
        "version": "Ubuntu 22.04 LTS",
        "architecture": "64-bit",
        "processor": "Intel(R) Core(TM) i7-10700K CPU @ 3.80GHz",
        "hostname": "vana-server",
        "uptime": datetime.timedelta(days=random.randint(1, 30), 
                                     hours=random.randint(0, 23), 
                                     minutes=random.randint(0, 59))
    }
    
    return {
        "timestamp": timestamp.isoformat(),
        "cpu": {
            "usage_percent": cpu_percent,
            "count": cpu_count,
            "load_avg": [round(random.uniform(0, 4), 2) for _ in range(3)]
        },
        "memory": {
            "total_mb": memory_total,
            "available_mb": memory_available,
            "used_mb": memory_used,
            "percent": memory_percent
        },
        "disk": {
            "total_gb": disk_total,
            "free_gb": disk_free,
            "used_gb": disk_used,
            "percent": disk_percent
        },
        "network": {
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packets_sent": packets_sent,
            "packets_recv": packets_recv,
            "err_in": random.randint(0, 10),
            "err_out": random.randint(0, 5),
            "drop_in": random.randint(0, 20),
            "drop_out": random.randint(0, 10)
        },
        "system_info": system_info
    }

def get_system_health_history(hours=24):
    """
    Get historical system health data.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_system_health_history(hours)
    except Exception as e:
        logging.error(f"Error fetching system health history: {e}")
        return generate_mock_system_health_history(hours)

def generate_mock_system_health_history(hours=24):
    """Generate realistic mock historical system health data."""
    current_time = datetime.datetime.now()
    history = []
    
    # Starting values
    cpu_base = 40
    memory_base = 60
    disk_base = 50
    network_send_base = 2000000  # 2 MB
    network_recv_base = 8000000  # 8 MB
    
    # Generate data points for each hour
    for hour in range(hours, 0, -1):
        timestamp = current_time - datetime.timedelta(hours=hour)
        
        # Add time-of-day pattern - higher usage during business hours
        hour_of_day = timestamp.hour
        time_factor = 1.0
        if 9 <= hour_of_day <= 17:  # 9 AM to 5 PM
            time_factor = 1.3
        elif 18 <= hour_of_day <= 21:  # 6 PM to 9 PM
            time_factor = 1.1
        elif 0 <= hour_of_day <= 5:  # Midnight to 5 AM
            time_factor = 0.7
        
        # Add some random variation
        cpu_percent = min(95, max(5, cpu_base * time_factor + random.uniform(-15, 15)))
        memory_percent = min(95, max(30, memory_base * time_factor + random.uniform(-10, 10)))
        disk_percent = min(90, max(40, disk_base + random.uniform(-2, 2)))  # Disk usage changes slowly
        
        # Network traffic with time pattern
        network_send = network_send_base * time_factor * random.uniform(0.8, 1.2)
        network_recv = network_recv_base * time_factor * random.uniform(0.8, 1.2)
        
        # Create data point
        data_point = {
            "timestamp": timestamp.isoformat(),
            "cpu_percent": cpu_percent,
            "memory_percent": memory_percent,
            "disk_percent": disk_percent,
            "network_send_bytes": network_send,
            "network_recv_bytes": network_recv
        }
        
        history.append(data_point)
    
    return history

def get_system_alerts(limit=10):
    """
    Get recent system alerts.
    Returns mock data for development purposes.
    """
    try:
        return generate_mock_system_alerts(limit)
    except Exception as e:
        logging.error(f"Error fetching system alerts: {e}")
        return generate_mock_system_alerts(limit)

def generate_mock_system_alerts(limit=10):
    """Generate realistic mock system alerts."""
    current_time = datetime.datetime.now()
    
    # Alert templates
    alert_templates = [
        {"type": "cpu", "level": "warning", "message": "CPU usage above {threshold}% for {duration} minutes"},
        {"type": "cpu", "level": "critical", "message": "CPU usage critically high at {value}%"},
        {"type": "memory", "level": "warning", "message": "Memory usage above {threshold}% for {duration} minutes"},
        {"type": "memory", "level": "critical", "message": "Memory usage critically high at {value}%"},
        {"type": "disk", "level": "warning", "message": "Disk usage above {threshold}%"},
        {"type": "disk", "level": "critical", "message": "Disk space critically low ({free_gb} GB free)"},
        {"type": "network", "level": "warning", "message": "Network packet loss detected ({loss_rate}%)"},
        {"type": "system", "level": "info", "message": "System updated to version {version}"},
        {"type": "system", "level": "warning", "message": "System restart required for updates"},
        {"type": "application", "level": "error", "message": "Application crashed: {error_message}"}
    ]
    
    # Generate alerts
    alerts = []
    for i in range(limit):
        minutes_ago = random.randint(5, 60 * 24)  # Within last 24 hours
        timestamp = current_time - datetime.timedelta(minutes=minutes_ago)
        
        # Select alert template
        template = random.choice(alert_templates)
        alert_type = template["type"]
        level = template["level"]
        message_template = template["message"]
        
        # Fill in template values
        message_params = {}
        if "threshold" in message_template:
            message_params["threshold"] = random.randint(80, 95)
        if "duration" in message_template:
            message_params["duration"] = random.randint(5, 30)
        if "value" in message_template:
            message_params["value"] = random.randint(90, 99)
        if "free_gb" in message_template:
            message_params["free_gb"] = random.randint(1, 10)
        if "loss_rate" in message_template:
            message_params["loss_rate"] = random.uniform(1, 5)
        if "version" in message_template:
            message_params["version"] = f"1.{random.randint(0, 9)}.{random.randint(0, 99)}"
        if "error_message" in message_template:
            error_messages = [
                "OutOfMemoryError",
                "NullPointerException",
                "DatabaseConnectionError",
                "Segmentation fault",
                "Timeout waiting for response"
            ]
            message_params["error_message"] = random.choice(error_messages)
        
        message = message_template.format(**message_params)
        
        # Create alert object
        alert = {
            "id": f"alert-{i+1}",
            "timestamp": timestamp.isoformat(),
            "type": alert_type,
            "level": level,
            "message": message,
            "acknowledged": random.random() > 0.3  # 70% are acknowledged
        }
        
        alerts.append(alert)
    
    # Sort by timestamp (most recent first)
    alerts.sort(key=lambda a: a["timestamp"], reverse=True)
    
    return alerts
```

### 3.2. Implement System Health Component

Create `dashboard/components/system_health.py`:

```python
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import altair as alt
from datetime import datetime, timedelta

from dashboard.api.system_api import get_system_health, get_system_health_history, get_system_alerts
from dashboard.utils.data_formatter import format_percentage, format_bytes, format_duration

def display_system_health():
    """Display system health visualization component."""
    # Fetch system health data
    health_data = get_system_health()
    
    # System Overview
    st.subheader("System Overview")
    
    # System info section
    with st.expander("System Information", expanded=True):
        # Create two columns
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown(f"**Operating System:** {health_data['system_info']['os']} {health_data['system_info']['version']}")
            st.markdown(f"**Architecture:** {health_data['system_info']['architecture']}")
            st.markdown(f"**Processor:** {health_data['system_info']['processor']}")
        
        with col2:
            st.markdown(f"**Hostname:** {health_data['system_info']['hostname']}")
            uptime_str = format_duration(health_data['system_info']['uptime'].total_seconds())
            st.markdown(f"**Uptime:** {uptime_str}")
            st.markdown(f"**CPU Cores:** {health_data['cpu']['count']}")
    
    # Resource Usage Cards
    st.subheader("Current Resource Usage")
    
    # Create columns for resource metrics
    col1, col2, col3 = st.columns(3)
    
    with col1:
        # CPU gauge
        cpu_fig = create_gauge_chart(
            value=health_data["cpu"]["usage_percent"],
            title="CPU Usage",
            suffix="%",
            thresholds=[60, 80]
        )
        st.plotly_chart(cpu_fig, use_container_width=True)
    
    with col2:
        # Memory gauge
        memory_fig = create_gauge_chart(
            value=health_data["memory"]["percent"],
            title="Memory Usage",
            suffix="%",
            thresholds=[70, 90]
        )
        st.plotly_chart(memory_fig, use_container_width=True)
    
    with col3:
        # Disk gauge
        disk_fig = create_gauge_chart(
            value=health_data["disk"]["percent"],
            title="Disk Usage",
            suffix="%",
            thresholds=[75, 90]
        )
        st.plotly_chart(disk_fig, use_container_width=True)
    
    # Resource Details Tabs
    st.subheader("Resource Details")
    
    tabs = st.tabs(["CPU", "Memory", "Disk", "Network"])
    
    with tabs[0]:
        # CPU details
        cpu = health_data["cpu"]
        
        # CPU metrics
        st.metric("CPU Usage", f"{cpu['usage_percent']:.1f}%")
        
        # Show load average on Unix-like systems
        if cpu['load_avg'][0] > 0:
            st.markdown(f"**Load Average:** {cpu['load_avg'][0]:.2f} (1 min), {cpu['load_avg'][1]:.2f} (5 min), {cpu['load_avg'][2]:.2f} (15 min)")
        
        # CPU usage by core mock data
        core_data = {
            "Core": [f"Core {i+1}" for i in range(cpu["count"])],
            "Usage": [random.uniform(0, 100) for _ in range(cpu["count"])]
        }
        core_df = pd.DataFrame(core_data)
        
        # Core usage chart
        core_fig = px.bar(
            core_df,
            x="Core",
            y="Usage",
            color="Usage",
            color_continuous_scale="Viridis",
            title="CPU Usage by Core",
            labels={"Usage": "Usage (%)"}
        )
        
        st.plotly_chart(core_fig, use_container_width=True)
    
    with tabs[1]:
        # Memory details
        memory = health_data["memory"]
        
        # Memory metrics
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Total Memory", f"{memory['total_mb'] / 1024:.1f} GB")
            st.metric("Used Memory", f"{memory['used_mb'] / 1024:.1f} GB")
        
        with col2:
            st.metric("Available Memory", f"{memory['available_mb'] / 1024:.1f} GB")
            st.metric("Usage Percentage", f"{memory['percent']:.1f}%")
        
        # Memory usage breakdown chart
        memory_data = [
            {"Category": "Used", "Size (MB)": memory["used_mb"]},
            {"Category": "Available", "Size (MB)": memory["available_mb"]}
        ]
        memory_df = pd.DataFrame(memory_data)
        
        memory_fig = px.pie(
            memory_df,
            values="Size (MB)",
            names="Category",
            title="Memory Usage Breakdown",
            color_discrete_sequence=["#DC3912", "#3366CC"]
        )
        
        st.plotly_chart(memory_fig, use_container_width=True)
    
    with tabs[2]:
        # Disk details
        disk = health_data["disk"]
        
        # Disk metrics
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Total Disk Space", f"{disk['total_gb']:.1f} GB")
            st.metric("Used Disk Space", f"{disk['used_gb']:.1f} GB")
        
        with col2:
            st.metric("Free Disk Space", f"{disk['free_gb']:.1f} GB")
            st.metric("Usage Percentage", f"{disk['percent']:.1f}%")
        
        # Disk usage breakdown chart
        disk_data = [
            {"Category": "Used", "Size (GB)": disk["used_gb"]},
            {"Category": "Free", "Size (GB)": disk["free_gb"]}
        ]
        disk_df = pd.DataFrame(disk_data)
        
        disk_fig = px.pie(
            disk_df,
            values="Size (GB)",
            names="Category",
            title="Disk Usage Breakdown",
            color_discrete_sequence=["#DC3912", "#3366CC"]
        )
        
        st.plotly_chart(disk_fig, use_container_width=True)
    
    with tabs[3]:
        # Network details
        network = health_data["network"]
        
        # Network metrics
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric("Data Sent", format_bytes(network["bytes_sent"]))
            st.metric("Packets Sent", f"{network['packets_sent']:,}")
            st.metric("Errors (Out)", f"{network['err_out']:,}")
        
        with col2:
            st.metric("Data Received", format_bytes(network["bytes_recv"]))
            st.metric("Packets Received", f"{network['packets_recv']:,}")
            st.metric("Errors (In)", f"{network['err_in']:,}")
        
        # Network throughput chart
        network_data = [
            {"Direction": "Sent", "Bytes": network["bytes_sent"]},
            {"Direction": "Received", "Bytes": network["bytes_recv"]}
        ]
        network_df = pd.DataFrame(network_data)
        
        network_fig = px.bar(
            network_df,
            x="Direction",
            y="Bytes",
            color="Direction",
            title="Network Throughput",
            labels={"Bytes": "Bytes"},
            text_auto='.2s',
            color_discrete_sequence=["#3366CC", "#DC3912"]
        )
        
        # Format y-axis labels to human-readable sizes
        network_fig.update_layout(
            yaxis=dict(
                tickformat=".2s"
            )
        )
        
        st.plotly_chart(network_fig, use_container_width=True)
    
    # Historical Resource Usage
    st.subheader("Historical Resource Usage")
    
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
        
        # Create tabs for different historical metrics
        hist_tabs = st.tabs(["CPU & Memory", "Disk", "Network"])
        
        with hist_tabs[0]:
            # CPU and Memory over time
            cpu_memory_chart = alt.Chart(history_df).transform_fold(
                ["cpu_percent", "memory_percent"],
                as_=["Metric", "Percentage"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Percentage:Q", scale=alt.Scale(domain=[0, 100])),
                color=alt.Color("Metric:N", 
                               scale=alt.Scale(domain=["cpu_percent", "memory_percent"],
                                              range=["#DC3912", "#3366CC"])),
                tooltip=["timestamp:T", "Percentage:Q", "Metric:N"]
            ).properties(
                title="CPU and Memory Usage Over Time",
                height=300
            ).interactive()
            
            st.altair_chart(cpu_memory_chart, use_container_width=True)
        
        with hist_tabs[1]:
            # Disk usage over time
            disk_chart = alt.Chart(history_df).mark_line(color="#FF9900").encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("disk_percent:Q", title="Disk Usage (%)", scale=alt.Scale(domain=[0, 100])),
                tooltip=["timestamp:T", "disk_percent:Q"]
            ).properties(
                title="Disk Usage Over Time",
                height=300
            ).interactive()
            
            st.altair_chart(disk_chart, use_container_width=True)
        
        with hist_tabs[2]:
            # Network traffic over time
            network_chart = alt.Chart(history_df).transform_fold(
                ["network_send_bytes", "network_recv_bytes"],
                as_=["Direction", "Bytes"]
            ).mark_line().encode(
                x=alt.X("timestamp:T", title="Time"),
                y=alt.Y("Bytes:Q", scale=alt.Scale(type='log')),
                color=alt.Color("Direction:N", 
                               scale=alt.Scale(domain=["network_send_bytes", "network_recv_bytes"],
                                              range=["#3366CC", "#DC3912"])),
                tooltip=["timestamp:T", 
                         alt.Tooltip("Bytes:Q", format=".4s")]
            ).properties(
                title="Network Traffic Over Time",
                height=300
            ).interactive()
            
            st.altair_chart(network_chart, use_container_width=True)
    else:
        st.error("No historical system metrics available")
    
    # System Alerts
    st.subheader("System Alerts")
    
    # Fetch alerts
    alerts = get_system_alerts(limit=10)
    
    if alerts:
        # Create DataFrame
        alerts_df = pd.DataFrame([
            {
                "Time": datetime.fromisoformat(a["timestamp"]).strftime("%Y-%m-%d %H:%M:%S"),
                "Type": a["type"].capitalize(),
                "Level": a["level"].capitalize(),
                "Message": a["message"],
                "Status": "Acknowledged" if a["acknowledged"] else "New"
            }
            for a in alerts
        ])
        
        # Apply styling based on alert level
        def style_alerts(row):
            level = row["Level"]
            if level == "Critical":
                return ["background-color: #ffcccc" for _ in row]
            elif level == "Error":
                return ["background-color: #ffe6cc" for _ in row]
            elif level == "Warning":
                return ["background-color: #ffffcc" for _ in row]
            elif level == "Info":
                return ["background-color: #e6f2ff" for _ in row]
            else:
                return ["" for _ in row]
        
        styled_alerts = alerts_df.style.apply(style_alerts, axis=1)
        
        # Display as table
        st.dataframe(styled_alerts, use_container_width=True, height=400)
        
        # Alert statistics
        new_alerts = len([a for a in alerts if not a["acknowledged"]])
        critical_alerts = len([a for a in alerts if a["level"] == "critical"])
        
        st.info(f"You have {new_alerts} new alerts, including {critical_alerts} critical alerts.")
    else:
        st.success("No system alerts at this time.")

def create_gauge_chart(value, title, suffix="%", thresholds=[60, 80]):
    """Create a gauge chart for resource usage visualization."""
    # Determine color based on thresholds
    if value < thresholds[0]:
        color = "green"
    elif value < thresholds[1]:
        color = "orange"
    else:
        color = "red"
    
    # Create gauge chart
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = value,
        title = {'text': title},
        number = {'suffix': suffix},
        domain = {'x': [0, 1], 'y': [0, 1]},
        gauge = {
            'axis': {'range': [0, 100]},
            'bar': {'color': color},
            'steps': [
                {'range': [0, thresholds[0]], 'color': "lightgreen"},
                {'range': [thresholds[0], thresholds[1]], 'color': "orange"},
                {'range': [thresholds[1], 100], 'color': "red"}
            ],
            'threshold': {
                'line': {'color': "black", 'width': 2},
                'thickness': 0.75,
                'value': value
            }
        }
    ))
    
    fig.update_layout(height=250, margin=dict(l=30, r=30, t=30, b=30))
    
    return fig
```

### 3.3. Update Main App

Update `dashboard/app.py` to use the actual system health component:

```python
# Replace the placeholder section:
elif page == "System Health":
    st.header("System Health")
    # Use the actual component instead of placeholder
    system_health.display_system_health()
```

## 4. Implement Test Scenarios

### 4.1 Create Basic Conversation Test

Create `tests/e2e/scenarios/basic_conversation.py`:

```python
"""
Basic conversation test scenario.

This test verifies basic conversation capabilities with the VANA agent.
It tests simple greeting and question-answering functionality.
"""

from tests.e2e.framework.test_case import TestCase
import logging

class BasicConversationTest(TestCase):
    """Test case for basic conversation with VANA."""
    
    def __init__(self):
        """Initialize test case."""
        super().__init__(
            name="basic_conversation",
            description="Test basic conversation with VANA"
        )
        self.client = None
    
    def setup(self):
        """Set up the test case."""
        from tests.e2e.framework.agent_client import AgentClient
        self.client = AgentClient()
        self.log_info("Agent client initialized")
    
    def _run(self):
        """Run the test case."""
        self.step("greeting", "Send greeting to VANA")
        response = self.client.send_message("Hello, VANA!")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "Hello", "Response should contain a greeting")
        
        self.step("question", "Ask a simple question")
        response = self.client.send_message("What can you help me with?")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "help", "Response should mention capabilities")
        
        self.step("memory_query", "Ask about VANA's memory capabilities")
        response = self.client.send_message("Tell me about your memory system.")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "memory", "Response should mention memory")
        
        self.step("agent_query", "Ask about VANA's specialist agents")
        response = self.client.send_message("What specialist agents do you have?")
        self.assert_not_empty(response, "Response should not be empty")
        # Should mention at least one specialist agent
        specialist_names = ["Rhea", "Max", "Sage", "Kai", "Juno"]
        found_specialist = False
        for specialist in specialist_names:
            if specialist in response:
                found_specialist = True
                break
        self.assert_true(found_specialist, "Response should mention at least one specialist agent")
    
    def teardown(self):
        """Clean up after the test case."""
        if self.client:
            self.client.close()
        self.log_info("Agent client closed")


# Create instance
test_case = BasicConversationTest()

# Export functions
def setup():
    """Set up the test case."""
    test_case.setup()

def run():
    """Run the test case."""
    return test_case.run()

def teardown():
    """Clean up after the test case."""
    test_case.teardown()
```

### 4.2 Create Memory Retrieval Test

Create `tests/e2e/scenarios/memory_retrieval.py`:

```python
"""
Memory retrieval test scenario.

This test verifies memory retrieval capabilities of the VANA agent.
It tests conversation history recall and fact retrieval functionality.
"""

from tests.e2e.framework.test_case import TestCase
import logging
import time

class MemoryRetrievalTest(TestCase):
    """Test case for memory retrieval with VANA."""
    
    def __init__(self):
        """Initialize test case."""
        super().__init__(
            name="memory_retrieval",
            description="Test memory retrieval capabilities"
        )
        self.client = None
    
    def setup(self):
        """Set up the test case."""
        from tests.e2e.framework.agent_client import AgentClient
        self.client = AgentClient()
        self.log_info("Agent client initialized")
    
    def _run(self):
        """Run the test case."""
        # Step 1: Provide information to remember
        self.step("provide_information", "Provide information for VANA to remember")
        test_fact = "My favorite color is cerulean blue and I have a cat named Whiskers."
        response = self.client.send_message(f"Please remember that {test_fact}")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "remember", "Response should acknowledge the memory request")
        
        # Wait briefly to ensure information is stored
        time.sleep(2)
        
        # Step 2: Ask unrelated question
        self.step("unrelated_question", "Ask an unrelated question")
        response = self.client.send_message("What's the weather like today?")
        self.assert_not_empty(response, "Response should not be empty")
        # No specific assertion here, just creating conversation distance
        
        # Step 3: Retrieve previously provided information
        self.step("retrieve_information", "Ask VANA to recall the provided information")
        response = self.client.send_message("What is my favorite color?")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "cerulean", "Response should recall the favorite color")
        
        # Step 4: Retrieve additional information
        self.step("retrieve_additional", "Ask VANA to recall additional information")
        response = self.client.send_message("What is my cat's name?")
        self.assert_not_empty(response, "Response should not be empty")
        self.assert_contains(response, "Whiskers", "Response should recall the cat's name")
        
        # Step 5: Test conversation context
        self.step("conversation_context", "Test conversation context awareness")
        response = self.client.send_message("Do you remember what we were talking about earlier?")
        self.assert_not_empty(response, "Response should not be empty")
        # Should mention either the favorite color or the cat
        context_markers = ["color", "cerulean", "cat", "Whiskers"]
        found_context = False
        for marker in context_markers:
            if marker in response:
                found_context = True
                break
        self.assert_true(found_context, "Response should demonstrate awareness of conversation context")
    
    def teardown(self):
        """Clean up after the test case."""
        if self.client:
            self.client.close()
        self.log_info("Agent client closed")


# Create instance
test_case = MemoryRetrievalTest()

# Export functions
def setup():
    """Set up the test case."""
    test_case.setup()

def run():
    """Run the test case."""
    return test_case.run()

def teardown():
    """Clean up after the test case."""
    test_case.teardown()
```

### 4.3 Create Test Utilities

Update `tests/e2e/framework/test_case.py` to include all needed assertion methods:

```python
import datetime
import logging
import traceback
from typing import Any, Dict, List, Optional

class TestCase:
    """Base class for test cases."""
    
    def __init__(self, name: str, description: str):
        """Initialize the test case.
        
        Args:
            name: Name of the test case
            description: Description of the test case
        """
        self.name = name
        self.description = description
        self.steps = []
        self.current_step = None
        self.logger = logging.getLogger(f"test.{name}")
    
    def setup(self):
        """Set up the test case."""
        pass
    
    def _run(self):
        """Run the test case."""
        raise NotImplementedError("Test case must implement _run method")
    
    def teardown(self):
        """Clean up after the test case."""
        pass
    
    def run(self):
        """Run the test case and return the results."""
        start_time = datetime.datetime.now()
        
        result = {
            "name": self.name,
            "description": self.description,
            "status": "failed",
            "error": None,
            "steps": [],
            "start_time": start_time.isoformat(),
            "end_time": None,
            "duration": None
        }
        
        try:
            self._run()
            result["status"] = "passed"
        except AssertionError as e:
            self.log_error(f"Assertion failed: {str(e)}")
            if self.current_step:
                self.current_step["status"] = "failed"
                self.current_step["error"] = str(e)
            result["error"] = str(e)
        except Exception as e:
            self.log_error(f"Error running test: {str(e)}")
            if self.current_step:
                self.current_step["status"] = "failed"
                self.current_step["error"] = str(e)
            result["error"] = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        finally:
            end_time = datetime.datetime.now()
            result["end_time"] = end_time.isoformat()
            result["duration"] = (end_time - start_time).total_seconds()
            result["steps"] = self.steps
        
        return result
    
    def step(self, name: str, description: str):
        """Start a new test step.
        
        Args:
            name: Name of the step
            description: Description of the step
        """
        # Complete previous step if any
        if self.current_step:
            if self.current_step["status"] == "running":
                self.current_step["status"] = "passed"
                self.current_step["end_time"] = datetime.datetime.now().isoformat()
                self.current_step["duration"] = (
                    datetime.datetime.fromisoformat(self.current_step["end_time"]) - 
                    datetime.datetime.fromisoformat(self.current_step["start_time"])
                ).total_seconds()
        
        # Start new step
        start_time = datetime.datetime.now()
        self.current_step = {
            "name": name,
            "description": description,
            "status": "running",
            "error": None,
            "start_time": start_time.isoformat(),
            "end_time": None,
            "duration": None
        }
        
        self.steps.append(self.current_step)
        self.log_info(f"Starting step: {name} - {description}")
    
    def execute_step(self, func, *args, **kwargs):
        """Execute a function as a step.
        
        Args:
            func: Function to execute
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
        
        Returns:
            The return value of the function
        """
        if not self.current_step:
            self.step(func.__name__, func.__doc__ or "")
        
        try:
            result = func(*args, **kwargs)
            self.current_step["status"] = "passed"
            return result
        except AssertionError as e:
            self.current_step["status"] = "failed"
            self.current_step["error"] = str(e)
            raise
        except Exception as e:
            self.current_step["status"] = "failed"
            self.current_step["error"] = f"{type(e).__name__}: {str(e)}"
            raise
        finally:
            self.current_step["end_time"] = datetime.datetime.now().isoformat()
            self.current_step["duration"] = (
                datetime.datetime.fromisoformat(self.current_step["end_time"]) - 
                datetime.datetime.fromisoformat(self.current_step["start_time"])
            ).total_seconds()
    
    def log_info(self, message: str):
        """Log an info message.
        
        Args:
            message: Message to log
        """
        self.logger.info(message)
    
    def log_error(self, message: str):
        """Log an error message.
        
        Args:
            message: Message to log
        """
        self.logger.error(message)
    
    def log_warning(self, message: str):
        """Log a warning message.
        
        Args:
            message: Message to log
        """
        self.logger.warning(message)
    
    # Assertion methods
    
    def assert_equals(self, actual: Any, expected: Any, message: str = None):
        """Assert that actual equals expected.
        
        Args:
            actual: Actual value
            expected: Expected value
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If actual != expected
        """
        assert actual == expected, message or f"Expected {expected}, got {actual}"
    
    def assert_not_equals(self, actual: Any, expected: Any, message: str = None):
        """Assert that actual does not equal expected.
        
        Args:
            actual: Actual value
            expected: Expected value
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If actual == expected
        """
        assert actual != expected, message or f"Expected {actual} to not equal {expected}"
    
    def assert_true(self, condition: bool, message: str = None):
        """Assert that condition is true.
        
        Args:
            condition: Condition to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If condition is false
        """
        assert condition, message or "Expected condition to be true"
    
    def assert_false(self, condition: bool, message: str = None):
        """Assert that condition is false.
        
        Args:
            condition: Condition to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If condition is true
        """
        assert not condition, message or "Expected condition to be false"
    
    def assert_is_none(self, obj: Any, message: str = None):
        """Assert that obj is None.
        
        Args:
            obj: Object to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If obj is not None
        """
        assert obj is None, message or f"Expected None, got {obj}"
    
    def assert_is_not_none(self, obj: Any, message: str = None):
        """Assert that obj is not None.
        
        Args:
            obj: Object to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If obj is None
        """
        assert obj is not None, message or "Expected not None"
    
    def assert_in(self, item: Any, container: Any, message: str = None):
        """Assert that item is in container.
        
        Args:
            item: Item to check
            container: Container to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If item not in container
        """
        assert item in container, message or f"Expected {item} to be in {container}"
    
    def assert_not_in(self, item: Any, container: Any, message: str = None):
        """Assert that item is not in container.
        
        Args:
            item: Item to check
            container: Container to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If item in container
        """
        assert item not in container, message or f"Expected {item} to not be in {container}"
    
    def assert_contains(self, container: Any, item: Any, message: str = None):
        """Assert that container contains item.
        
        Args:
            container: Container to check
            item: Item to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If item not in container
        """
        assert item in container, message or f"Expected {container} to contain {item}"
    
    def assert_not_contains(self, container: Any, item: Any, message: str = None):
        """Assert that container does not contain item.
        
        Args:
            container: Container to check
            item: Item to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If item in container
        """
        assert item not in container, message or f"Expected {container} to not contain {item}"
    
    def assert_greater_than(self, actual: Any, expected: Any, message: str = None):
        """Assert that actual > expected.
        
        Args:
            actual: Actual value
            expected: Expected value
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If actual <= expected
        """
        assert actual > expected, message or f"Expected {actual} to be greater than {expected}"
    
    def assert_less_than(self, actual: Any, expected: Any, message: str = None):
        """Assert that actual < expected.
        
        Args:
            actual: Actual value
            expected: Expected value
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If actual >= expected
        """
        assert actual < expected, message or f"Expected {actual} to be less than {expected}"
    
    def assert_length(self, obj: Any, length: int, message: str = None):
        """Assert that len(obj) == length.
        
        Args:
            obj: Object to check
            length: Expected length
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If len(obj) != length
        """
        assert len(obj) == length, message or f"Expected length {length}, got {len(obj)}"
    
    def assert_empty(self, obj: Any, message: str = None):
        """Assert that obj is empty.
        
        Args:
            obj: Object to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If obj is not empty
        """
        assert not obj, message or f"Expected empty, got {obj}"
    
    def assert_not_empty(self, obj: Any, message: str = None):
        """Assert that obj is not empty.
        
        Args:
            obj: Object to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If obj is empty
        """
        assert obj, message or "Expected not empty"
    
    def assert_instance(self, obj: Any, cls: type, message: str = None):
        """Assert that obj is an instance of cls.
        
        Args:
            obj: Object to check
            cls: Class to check
            message: Optional message to include in the assertion error
        
        Raises:
            AssertionError: If not isinstance(obj, cls)
        """
        assert isinstance(obj, cls), message or f"Expected instance of {cls.__name__}, got {type(obj).__name__}"
```

## 5. Update Package Requirements

Ensure `dashboard/requirements.txt` includes all necessary packages:

```
streamlit==1.26.0
pandas==2.0.3
plotly==5.18.0
altair==5.1.2
psutil==5.9.5
pytz==2023.3
```

And add necessary test packages in `tests/e2e/requirements.txt`:

```
pytest==7.4.0
requests==2.31.0
```

## Timeline for Completion

### Days 1-3: Agent Status Panel and Agent API
- Implement the mock data generator for agent status
- Create the agent status visualization component
- Ensure the component works with the mock data
- Integrate into the main app

### Days 4-6: Memory Usage Panel and Memory API
- Implement the mock data generator for memory usage
- Create the memory usage visualization component
- Ensure the component works with the mock data
- Integrate into the main app

### Days 7-9: System Health Panel and System API
- Implement the mock data generator for system health
- Create the system health visualization component
- Ensure the component works with the mock data
- Integrate into the main app

### Days 10-14: Testing Implementation
- Finalize the test framework implementation
- Create the basic conversation test scenario
- Create the memory retrieval test scenario
- Implement the test runner
- Test the integrated system

## Important Implementation Notes

1. **ALWAYS include both real and mock implementations**: Every API function should try to get real data first, then fall back to mock data.

2. **Make all code WORK immediately**: Every module should be functional as soon as it's created, even if with mock data.

3. **Test frequently**: After implementing each component, run the app to verify it works correctly.

4. **Add detailed comments**: Include function and class docstrings for all code.

5. **Handle errors gracefully**: All functions should have proper error handling.

6. **Use consistent styling**: Follow the same naming conventions and code style throughout.

7. **Add logging**: Include logging in all components to help with debugging.

8. **Make visual components interactive**: Use tooltips, filters, and interactive elements in charts.

Remember, the goal of Phase 2 is to have FUNCTIONAL components, not just placeholders. Each component should display real or realistic mock data in an informative and visually appealing way.