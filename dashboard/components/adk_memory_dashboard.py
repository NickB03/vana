"""
ADK Memory Dashboard Components

This module provides Streamlit components for visualizing ADK memory
performance, costs, session state, and reliability metrics.
"""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

from dashboard.api.adk_memory_api import adk_memory_api


def display_adk_memory_overview():
    """Display ADK memory system overview."""
    st.header("🧠 ADK Memory System Overview")

    # Get current status and metrics
    status_data = adk_memory_api.get_status()
    metrics_data = adk_memory_api.get_metrics()
    cost_data = adk_memory_api.get_cost_metrics()

    if status_data.get("status") == "error":
        st.error(f"❌ Error getting ADK memory status: {status_data.get('message', 'Unknown error')}")
        return

    # Status indicator
    status = status_data.get("status", "unknown")
    if status == "ok":
        st.success("✅ ADK Memory System: Healthy")
    elif status == "warning":
        st.warning(f"⚠️ ADK Memory System: {status_data.get('message', 'Warning')}")
    else:
        st.error(f"❌ ADK Memory System: {status_data.get('message', 'Error')}")

    # ADK availability indicator
    adk_available = status_data.get("adk_available", False)
    if adk_available:
        st.info("🔗 Google ADK: Connected")
    else:
        st.warning("🔗 Google ADK: Using Mock Data (ADK not available)")

    if metrics_data.get("status") != "success":
        st.error("Failed to load metrics data")
        return

    metrics = metrics_data["data"]

    # Key metrics in columns
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Service Status", metrics["service_status"].title(), delta=None)

    with col2:
        st.metric(
            "Active Sessions",
            metrics["storage"]["active_sessions"],
            delta=f"{metrics['performance']['session_count']} total",
        )

    with col3:
        latency = metrics["performance"]["average_query_latency_ms"]
        st.metric("Avg Query Latency", f"{latency:.1f}ms", delta="Good" if latency < 200 else "High")

    with col4:
        if cost_data.get("status") == "success":
            daily_cost = cost_data["data"]["daily_costs"]["total_cost_usd"]
            st.metric(
                "Daily Cost",
                f"${daily_cost:.2f}",
                delta=f"${cost_data['data']['projections']['monthly_projection_usd']:.0f}/mo",
            )
        else:
            st.metric("Daily Cost", "N/A", delta="Error")


def display_adk_performance_metrics():
    """Display detailed ADK performance metrics."""
    st.subheader("📊 Performance Metrics")

    metrics_data = adk_memory_api.get_metrics()
    if metrics_data.get("status") != "success":
        st.error("Failed to load performance metrics")
        return

    metrics = metrics_data["data"]

    # Performance metrics in tabs
    perf_tabs = st.tabs(["Query Performance", "Memory Usage", "Reliability", "Configuration"])

    with perf_tabs[0]:
        # Query performance metrics
        col1, col2 = st.columns(2)

        with col1:
            st.metric("Memory Operations (24h)", f"{metrics['performance']['memory_operations_count']:,}", delta=None)
            st.metric(
                "Error Rate",
                f"{metrics['performance']['error_rate']:.2%}",
                delta="Good" if metrics["performance"]["error_rate"] < 0.02 else "High",
            )

        with col2:
            st.metric(
                "Cache Hit Rate",
                f"{metrics['performance']['cache_hit_rate']:.1%}",
                delta="Good" if metrics["performance"]["cache_hit_rate"] > 0.8 else "Low",
            )
            st.metric(
                "Uptime",
                f"{metrics['performance']['uptime_percentage']:.2f}%",
                delta=f"SLA: {metrics['reliability']['availability_sla']:.1f}%",
            )

    with perf_tabs[1]:
        # Memory usage metrics
        col1, col2 = st.columns(2)

        with col1:
            st.metric("Total Memory Storage", f"{metrics['storage']['memory_storage_mb']:.1f} MB", delta=None)
            st.metric(
                "Session State Size",
                f"{metrics['storage']['session_state_size_mb']:.1f} MB",
                delta=f"{metrics['storage']['active_sessions']} sessions",
            )

        with col2:
            avg_session_size = metrics["storage"]["session_state_size_mb"] / max(
                metrics["storage"]["active_sessions"], 1
            )
            st.metric(
                "Avg Session Size", f"{avg_session_size:.2f} MB", delta="Efficient" if avg_session_size < 5 else "Large"
            )
            st.metric(
                "Session Persistence",
                f"{metrics['reliability']['session_persistence_rate']:.1%}",
                delta="Good" if metrics["reliability"]["session_persistence_rate"] > 0.95 else "Low",
            )

    with perf_tabs[2]:
        # Reliability metrics
        col1, col2 = st.columns(2)

        with col1:
            st.metric("Errors (24h)", metrics["reliability"]["error_count_24h"], delta=None)
            st.metric(
                "Success Rate",
                f"{(metrics['reliability']['success_count_24h'] / max(metrics['reliability']['success_count_24h'] + metrics['reliability']['error_count_24h'], 1)):.2%}",
                delta="Good" if metrics["reliability"]["error_count_24h"] < 10 else "High errors",
            )

        with col2:
            st.metric("Successful Operations (24h)", f"{metrics['reliability']['success_count_24h']:,}", delta=None)
            sla_compliance = metrics["performance"]["uptime_percentage"] >= metrics["reliability"]["availability_sla"]
            st.metric(
                "SLA Compliance",
                "✅ Met" if sla_compliance else "❌ Missed",
                delta=f"{metrics['performance']['uptime_percentage'] - metrics['reliability']['availability_sla']:.2f}% margin",
            )

    with perf_tabs[3]:
        # Configuration details
        st.write("**RAG Corpus Configuration:**")
        st.code(metrics["configuration"]["similarity_threshold"])

        col1, col2 = st.columns(2)
        with col1:
            st.metric("Similarity Threshold", metrics["configuration"]["similarity_threshold"], delta=None)
        with col2:
            st.metric("Top K Results", metrics["configuration"]["top_k_results"], delta=None)

        st.write("**RAG Corpus ID:**")
        st.code(metrics["rag_corpus_id"])


def display_adk_cost_analysis():
    """Display ADK cost analysis and tracking."""
    st.subheader("💰 Cost Analysis")

    cost_data = adk_memory_api.get_cost_metrics()
    if cost_data.get("status") != "success":
        st.error("Failed to load cost metrics")
        return

    costs = cost_data["data"]

    # Current costs overview
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Daily Total", f"${costs['daily_costs']['total_cost_usd']:.2f}", delta=None)

    with col2:
        st.metric("Cost per Query", f"${costs['usage']['cost_per_query_usd']:.4f}", delta=None)

    with col3:
        st.metric("Monthly Projection", f"${costs['projections']['monthly_projection_usd']:.0f}", delta=None)

    # Cost breakdown chart
    st.write("**Daily Cost Breakdown**")

    cost_breakdown = pd.DataFrame(
        [
            {"Component": "RAG Corpus", "Cost": costs["daily_costs"]["rag_corpus_cost_usd"]},
            {"Component": "Session Storage", "Cost": costs["daily_costs"]["session_storage_cost_usd"]},
            {"Component": "Vertex AI", "Cost": costs["daily_costs"]["vertex_ai_cost_usd"]},
        ]
    )

    fig = px.pie(
        cost_breakdown,
        values="Cost",
        names="Component",
        title="Cost Distribution by Component",
        color_discrete_sequence=["#3366CC", "#DC3912", "#FF9900"],
    )
    st.plotly_chart(fig, use_container_width=True)

    # Usage metrics
    st.write("**Usage Metrics**")
    col1, col2 = st.columns(2)

    with col1:
        st.metric("RAG Corpus Queries", f"{costs['usage']['rag_corpus_queries']:,}", delta=None)

    with col2:
        st.metric("Vertex AI Calls", f"{costs['usage']['vertex_ai_calls']:,}", delta=None)


def display_adk_session_monitoring():
    """Display session state monitoring."""
    st.subheader("🔄 Session State Monitoring")

    session_data = adk_memory_api.get_session_metrics()
    if session_data.get("status") != "success":
        st.error("Failed to load session metrics")
        return

    session_metrics = session_data["data"]["session_metrics"]
    session_health = session_data["data"]["session_health"]

    # Session health status
    if session_health["status"] == "healthy":
        st.success("✅ Session State: Healthy")
    else:
        st.warning(f"⚠️ Session State: {session_health['status'].title()}")

    # Session metrics
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric(
            "Active Sessions", session_metrics["active_sessions"], delta=f"{session_metrics['total_sessions']} total"
        )

    with col2:
        st.metric(
            "Persistence Rate",
            f"{session_metrics['session_persistence_rate']:.1%}",
            delta="Good" if session_metrics["session_persistence_rate"] > 0.95 else "Low",
        )

    with col3:
        st.metric("Avg Session Duration", f"{session_metrics['average_session_duration_minutes']:.0f} min", delta=None)

    with col4:
        st.metric(
            "Memory per Session",
            f"{session_metrics['session_memory_usage_per_session_mb']:.2f} MB",
            delta=session_health["memory_efficiency"].title(),
        )

    # Session activity chart
    st.write("**Session Activity**")

    activity_data = pd.DataFrame(
        [
            {"Metric": "Creation Rate", "Value": session_metrics["session_creation_rate_per_hour"], "Unit": "/hour"},
            {
                "Metric": "Termination Rate",
                "Value": session_metrics["session_termination_rate_per_hour"],
                "Unit": "/hour",
            },
        ]
    )

    fig = px.bar(
        activity_data,
        x="Metric",
        y="Value",
        title="Session Activity Rates",
        color="Metric",
        color_discrete_sequence=["#3366CC", "#DC3912"],
    )
    fig.update_layout(showlegend=False)
    st.plotly_chart(fig, use_container_width=True)


def display_adk_performance_comparison():
    """Display performance comparison with baseline."""
    st.subheader("📈 Performance Comparison")

    comparison_data = adk_memory_api.get_performance_comparison()
    if comparison_data.get("status") != "success":
        if "error" in comparison_data.get("data", {}):
            st.info(f"ℹ️ {comparison_data['data']['error']}")
        else:
            st.error("Failed to load performance comparison")
        return

    comparison = comparison_data["data"]

    st.write(f"**Comparison Period:** {comparison['comparison_period']}")

    # Performance comparison metrics
    col1, col2, col3 = st.columns(3)

    with col1:
        latency = comparison["latency"]
        delta_color = "inverse" if latency["status"] == "improved" else "normal"
        st.metric(
            "Query Latency",
            f"{latency['recent_ms']:.1f}ms",
            delta=f"{latency['change_percent']:+.1f}%",
            delta_color=delta_color,
        )
        st.caption(f"Baseline: {latency['baseline_ms']:.1f}ms")

    with col2:
        error_rate = comparison["error_rate"]
        delta_color = "inverse" if error_rate["status"] == "improved" else "normal"
        st.metric(
            "Error Rate",
            f"{error_rate['recent']:.2%}",
            delta=f"{error_rate['change_percent']:+.1f}%",
            delta_color=delta_color,
        )
        st.caption(f"Baseline: {error_rate['baseline']:.2%}")

    with col3:
        cache_hit = comparison["cache_hit_rate"]
        delta_color = "normal" if cache_hit["status"] == "improved" else "inverse"
        st.metric(
            "Cache Hit Rate",
            f"{cache_hit['recent']:.1%}",
            delta=f"{cache_hit['change_percent']:+.1f}%",
            delta_color=delta_color,
        )
        st.caption(f"Baseline: {cache_hit['baseline']:.1%}")


def display_adk_historical_charts():
    """Display historical performance charts."""
    st.subheader("📊 Historical Performance")

    # Time range selector
    time_range = st.selectbox(
        "Select time range:", options=[1, 6, 12, 24], index=3, format_func=lambda x: f"Last {x} hours"
    )

    # Get historical data
    history_data = adk_memory_api.get_history(time_range)
    cost_history_data = adk_memory_api.get_cost_history(time_range)

    if history_data.get("status") != "success":
        st.error("Failed to load historical data")
        return

    history = history_data["data"]["metrics"]

    if not history:
        st.info("No historical data available")
        return

    # Convert to DataFrame
    df = pd.DataFrame(history)
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Performance charts
    chart_tabs = st.tabs(["Latency & Errors", "Memory Usage", "Costs", "Session Activity"])

    with chart_tabs[0]:
        # Latency and error rate chart
        fig = make_subplots(rows=2, cols=1, subplot_titles=("Query Latency", "Error Rate"), vertical_spacing=0.1)

        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["average_query_latency_ms"],
                mode="lines",
                name="Latency (ms)",
                line=dict(color="#3366CC"),
            ),
            row=1,
            col=1,
        )

        fig.add_trace(
            go.Scatter(
                x=df["timestamp"],
                y=df["error_rate"] * 100,  # Convert to percentage
                mode="lines",
                name="Error Rate (%)",
                line=dict(color="#DC3912"),
            ),
            row=2,
            col=1,
        )

        fig.update_layout(height=500, showlegend=False)
        fig.update_xaxes(title_text="Time", row=2, col=1)
        fig.update_yaxes(title_text="Latency (ms)", row=1, col=1)
        fig.update_yaxes(title_text="Error Rate (%)", row=2, col=1)

        st.plotly_chart(fig, use_container_width=True)

    with chart_tabs[1]:
        # Memory usage chart
        fig = px.line(
            df,
            x="timestamp",
            y=["memory_storage_mb", "session_state_size_mb"],
            title="Memory Usage Over Time",
            labels={"value": "Memory (MB)", "timestamp": "Time"},
        )
        fig.update_layout(legend_title_text="Memory Type")
        st.plotly_chart(fig, use_container_width=True)

    with chart_tabs[2]:
        # Cost charts
        if cost_history_data.get("status") == "success":
            cost_history = cost_history_data["data"]["costs"]
            if cost_history:
                cost_df = pd.DataFrame(cost_history)
                cost_df["timestamp"] = pd.to_datetime(cost_df["timestamp"])

                fig = px.area(
                    cost_df,
                    x="timestamp",
                    y="total_cost_usd",
                    title="Cost Over Time",
                    labels={"total_cost_usd": "Cost (USD)", "timestamp": "Time"},
                )
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No cost history available")
        else:
            st.error("Failed to load cost history")

    with chart_tabs[3]:
        # Session activity chart
        fig = px.line(
            df,
            x="timestamp",
            y=["active_sessions", "session_count"],
            title="Session Activity Over Time",
            labels={"value": "Session Count", "timestamp": "Time"},
        )
        fig.update_layout(legend_title_text="Session Type")
        st.plotly_chart(fig, use_container_width=True)


def display_adk_alerts_and_health():
    """Display ADK-specific alerts and health status."""
    st.subheader("🚨 Alerts & Health Status")

    # Get reliability metrics
    reliability_data = adk_memory_api.get_reliability_metrics()
    if reliability_data.get("status") != "success":
        st.error("Failed to load reliability metrics")
        return

    reliability = reliability_data["data"]

    # Overall reliability status
    status = reliability["reliability_status"]
    if status == "excellent":
        st.success("✅ Reliability Status: Excellent")
    elif status == "good":
        st.success("✅ Reliability Status: Good")
    elif status == "acceptable":
        st.warning("⚠️ Reliability Status: Acceptable")
    else:
        st.error("❌ Reliability Status: Poor")

    # SLA compliance
    sla_status = reliability["sla_status"]
    if sla_status["compliant"]:
        st.success(f"✅ SLA Compliance: Met ({sla_status['actual']:.2f}% vs {sla_status['target']:.1f}% target)")
    else:
        st.error(f"❌ SLA Compliance: Missed ({sla_status['actual']:.2f}% vs {sla_status['target']:.1f}% target)")

    # Reliability metrics
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "MTTR",
            f"{reliability['metrics']['mttr_minutes']:.1f} min",
            delta="Good" if reliability["metrics"]["mttr_minutes"] < 10 else "High",
        )

    with col2:
        st.metric(
            "MTBF",
            f"{reliability['metrics']['mtbf_hours']:.0f} hours",
            delta="Good" if reliability["metrics"]["mtbf_hours"] > 100 else "Low",
        )

    with col3:
        st.metric(
            "Success Rate",
            f"{reliability['metrics']['success_rate']:.2%}",
            delta="Good" if reliability["metrics"]["success_rate"] > 0.99 else "Low",
        )


def display_adk_diagnostic_panel():
    """Display diagnostic information for troubleshooting."""
    st.subheader("🔧 Diagnostic Panel")

    diagnostic_data = adk_memory_api.get_diagnostic_info()
    if diagnostic_data.get("status") != "success":
        st.error("Failed to load diagnostic information")
        return

    diagnostic = diagnostic_data["data"]

    # Diagnostic tabs
    diag_tabs = st.tabs(["System Status", "Configuration", "Environment", "Data Availability"])

    with diag_tabs[0]:
        st.write("**System Health:**")
        system_status = diagnostic["system_status"]
        st.json(system_status)

    with diag_tabs[1]:
        st.write("**Configuration:**")
        config = diagnostic["configuration"]
        for key, value in config.items():
            st.write(f"- **{key}:** {value}")

    with diag_tabs[2]:
        st.write("**Environment Variables:**")
        env = diagnostic["environment"]
        for key, value in env.items():
            if value:
                st.write(f"- **{key}:** {value}")
            else:
                st.write(f"- **{key}:** ❌ Not set")

    with diag_tabs[3]:
        st.write("**Data Availability:**")
        data_avail = diagnostic["data_availability"]
        service_health = diagnostic["service_health"]

        col1, col2 = st.columns(2)
        with col1:
            st.metric("Metrics History", data_avail["metrics_history_count"])
            st.metric("Cost History", data_avail["cost_history_count"])

        with col2:
            st.metric("Memory Service", "✅ OK" if service_health["memory_service_initialized"] else "❌ Failed")
            st.metric("Check Interval", f"{service_health['check_interval']}s")


def display_adk_memory_dashboard():
    """Main ADK memory dashboard display function."""
    st.title("🧠 ADK Memory Performance Dashboard")

    # Overview section
    display_adk_memory_overview()

    st.divider()

    # Main dashboard tabs
    main_tabs = st.tabs(
        ["Performance", "Cost Analysis", "Session Monitoring", "Historical Data", "Alerts & Health", "Diagnostics"]
    )

    with main_tabs[0]:
        display_adk_performance_metrics()
        display_adk_performance_comparison()

    with main_tabs[1]:
        display_adk_cost_analysis()

    with main_tabs[2]:
        display_adk_session_monitoring()

    with main_tabs[3]:
        display_adk_historical_charts()

    with main_tabs[4]:
        display_adk_alerts_and_health()

    with main_tabs[5]:
        display_adk_diagnostic_panel()
