"""
Visualization helpers for VANA Dashboard.

This module provides helper functions for creating visualizations.
"""

import logging

import altair as alt
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from dashboard.utils.config import get_config_value

logger = logging.getLogger(__name__)


def create_line_chart(data, x_key, y_keys, title, height=None, width=None):
    """
    Create a line chart using Altair.

    Args:
        data (dict): Data dictionary.
        x_key (str): Key for x-axis data.
        y_keys (list): List of keys for y-axis data.
        title (str): Chart title.
        height (int): Chart height.
        width (int): Chart width.

    Returns:
        altair.Chart: Altair chart object.
    """
    if not height:
        height = get_config_value("visualization.chart_height", 400)
    if not width:
        width = get_config_value("visualization.chart_width", 800)

    try:
        # Create a DataFrame for the chart
        df = pd.DataFrame({x_key: data[x_key]})
        for key in y_keys:
            if key in data and len(data[key]) == len(data[x_key]):
                df[key] = data[key]

        # Melt the DataFrame for Altair
        df_melted = df.melt(
            id_vars=[x_key], value_vars=y_keys, var_name="metric", value_name="value"
        )

        # Create the chart
        chart = (
            alt.Chart(df_melted)
            .mark_line()
            .encode(
                x=alt.X(f"{x_key}:N", title="Time"),
                y=alt.Y("value:Q", title="Value"),
                color=alt.Color("metric:N", title="Metric"),
            )
            .properties(title=title, height=height, width=width)
        )

        return chart
    except Exception as e:
        logger.error(f"Error creating line chart: {e}")
        st.error(f"Error creating line chart: {e}")
        return None


def create_bar_chart(data, x_key, y_key, title, height=None, width=None):
    """
    Create a bar chart using Altair.

    Args:
        data (dict): Data dictionary.
        x_key (str): Key for x-axis data.
        y_key (str): Key for y-axis data.
        title (str): Chart title.
        height (int): Chart height.
        width (int): Chart width.

    Returns:
        altair.Chart: Altair chart object.
    """
    if not height:
        height = get_config_value("visualization.chart_height", 400)
    if not width:
        width = get_config_value("visualization.chart_width", 800)

    try:
        # Create a DataFrame for the chart
        df = pd.DataFrame({x_key: data[x_key], y_key: data[y_key]})

        # Create the chart
        chart = (
            alt.Chart(df)
            .mark_bar()
            .encode(
                x=alt.X(f"{x_key}:N", title=x_key.capitalize()),
                y=alt.Y(f"{y_key}:Q", title=y_key.capitalize()),
            )
            .properties(title=title, height=height, width=width)
        )

        return chart
    except Exception as e:
        logger.error(f"Error creating bar chart: {e}")
        st.error(f"Error creating bar chart: {e}")
        return None


def create_pie_chart(data, labels, values, title):
    """
    Create a pie chart using Plotly.

    Args:
        data (dict): Data dictionary.
        labels (str): Key for labels.
        values (str): Key for values.
        title (str): Chart title.

    Returns:
        plotly.graph_objects.Figure: Plotly figure object.
    """
    try:
        # Create the chart
        fig = go.Figure(
            data=[go.Pie(labels=data[labels], values=data[values], hole=0.3)]
        )

        # Update layout
        fig.update_layout(
            title=title,
            height=get_config_value("visualization.chart_height", 400),
            width=get_config_value("visualization.chart_width", 800),
        )

        return fig
    except Exception as e:
        logger.error(f"Error creating pie chart: {e}")
        st.error(f"Error creating pie chart: {e}")
        return None


def create_gauge_chart(value, min_value, max_value, title, threshold=None):
    """
    Create a gauge chart using Plotly.

    Args:
        value (float): Current value.
        min_value (float): Minimum value.
        max_value (float): Maximum value.
        title (str): Chart title.
        threshold (float): Threshold value for color change.

    Returns:
        plotly.graph_objects.Figure: Plotly figure object.
    """
    try:
        # Set default threshold if not provided
        if threshold is None:
            threshold = max_value * 0.8

        # Determine color based on value and threshold
        if value < threshold:
            color = "green"
        else:
            color = "red"

        # Create the chart
        fig = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=value,
                domain={"x": [0, 1], "y": [0, 1]},
                title={"text": title},
                gauge={
                    "axis": {"range": [min_value, max_value]},
                    "bar": {"color": color},
                    "steps": [
                        {"range": [min_value, threshold], "color": "lightgreen"},
                        {"range": [threshold, max_value], "color": "lightcoral"},
                    ],
                    "threshold": {
                        "line": {"color": "red", "width": 4},
                        "thickness": 0.75,
                        "value": threshold,
                    },
                },
            )
        )

        # Update layout
        fig.update_layout(height=300, width=400)

        return fig
    except Exception as e:
        logger.error(f"Error creating gauge chart: {e}")
        st.error(f"Error creating gauge chart: {e}")
        return None


def create_timeline(events, title):
    """
    Create a timeline visualization using Plotly.

    Args:
        events (list): List of event dictionaries with start_time, end_time, and label.
        title (str): Chart title.

    Returns:
        plotly.graph_objects.Figure: Plotly figure object.
    """
    try:
        # Create a DataFrame for the chart
        df = pd.DataFrame(events)

        # Convert string timestamps to datetime
        df["start_time"] = pd.to_datetime(df["start_time"])
        df["end_time"] = pd.to_datetime(df["end_time"])

        # Create the chart
        fig = px.timeline(
            df,
            x_start="start_time",
            x_end="end_time",
            y="agent",
            color="type",
            hover_name="id",
            title=title,
        )

        # Update layout
        fig.update_layout(
            height=get_config_value("visualization.chart_height", 400),
            width=get_config_value("visualization.chart_width", 800),
            xaxis_title="Time",
            yaxis_title="Agent",
        )

        return fig
    except Exception as e:
        logger.error(f"Error creating timeline: {e}")
        st.error(f"Error creating timeline: {e}")
        return None


def create_status_indicator(status, label):
    """
    Create a status indicator.

    Args:
        status (str): Status value ("running", "warning", "error", "inactive").
        label (str): Label for the status indicator.

    Returns:
        None: Displays the status indicator directly using Streamlit.
    """
    try:
        # Define colors for different statuses
        status_colors = {
            "running": "green",
            "active": "green",
            "warning": "orange",
            "error": "red",
            "inactive": "gray",
        }

        # Get color for the status
        color = status_colors.get(status.lower(), "gray")

        # Create columns for the indicator
        col1, col2 = st.columns([1, 10])

        # Display the indicator
        with col1:
            st.markdown(
                f"<div style='width: 20px; height: 20px; border-radius: 50%; background-color: {color};'></div>",
                unsafe_allow_html=True,
            )

        with col2:
            st.markdown(f"**{label}**: {status.capitalize()}")
    except Exception as e:
        logger.error(f"Error creating status indicator: {e}")
        st.error(f"Error creating status indicator: {e}")


def create_metric_card(title, value, delta=None, delta_suffix="", formatter=None):
    """
    Create a metric card.

    Args:
        title (str): Title for the metric.
        value (float): Current value.
        delta (float): Delta value for the metric.
        delta_suffix (str): Suffix for the delta value.
        formatter (function): Function to format the value.

    Returns:
        None: Displays the metric card directly using Streamlit.
    """
    try:
        # Format the value if formatter is provided
        if formatter:
            formatted_value = formatter(value)
        else:
            formatted_value = value

        # Display the metric
        if delta is not None:
            st.metric(
                label=title, value=formatted_value, delta=f"{delta}{delta_suffix}"
            )
        else:
            st.metric(label=title, value=formatted_value)
    except Exception as e:
        logger.error(f"Error creating metric card: {e}")
        st.error(f"Error creating metric card: {e}")


def create_data_table(data, columns=None):
    """
    Create a data table.

    Args:
        data (list): List of dictionaries with data.
        columns (list): List of column names to include.

    Returns:
        None: Displays the data table directly using Streamlit.
    """
    try:
        # Create a DataFrame for the table
        df = pd.DataFrame(data)

        # Filter columns if specified
        if columns:
            df = df[columns]

        # Display the table
        st.dataframe(df)
    except Exception as e:
        logger.error(f"Error creating data table: {e}")
        st.error(f"Error creating data table: {e}")


def create_heatmap(data, x_key, y_key, value_key, title, height=None, width=None):
    """
    Create a heatmap using Altair.

    Args:
        data (dict): Data dictionary.
        x_key (str): Key for x-axis data.
        y_key (str): Key for y-axis data.
        value_key (str): Key for value data.
        title (str): Chart title.
        height (int): Chart height.
        width (int): Chart width.

    Returns:
        altair.Chart: Altair chart object.
    """
    if not height:
        height = get_config_value("visualization.chart_height", 400)
    if not width:
        width = get_config_value("visualization.chart_width", 800)

    try:
        # Create a DataFrame for the chart
        df = pd.DataFrame(data)

        # Create the chart
        chart = (
            alt.Chart(df)
            .mark_rect()
            .encode(
                x=alt.X(f"{x_key}:N", title=x_key.capitalize()),
                y=alt.Y(f"{y_key}:N", title=y_key.capitalize()),
                color=alt.Color(f"{value_key}:Q", title=value_key.capitalize()),
            )
            .properties(title=title, height=height, width=width)
        )

        return chart
    except Exception as e:
        logger.error(f"Error creating heatmap: {e}")
        st.error(f"Error creating heatmap: {e}")
        return None
