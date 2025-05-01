"""
Task Execution Component for VANA Dashboard.

This module provides components for displaying task execution metrics and details.
"""

import streamlit as st
import pandas as pd
import altair as alt
from datetime import datetime, timedelta
import logging

from dashboard.api.task_api import task_api
from dashboard.utils.data_formatter import format_duration, format_percentage, format_time_ago
from dashboard.utils.visualization_helpers import (
    create_line_chart, create_pie_chart, create_metric_card, create_data_table, create_timeline
)

logger = logging.getLogger(__name__)

def display_task_execution():
    """
    Display task execution component.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader("Task Execution")
    
    try:
        # Get task summary data
        time_range = st.selectbox(
            "Time Range",
            ["hour", "day", "week", "month"],
            index=1,
            key="task_execution_time_range"
        )
        
        task_summary = task_api.get_task_summary(time_range=time_range)
        
        # Display task summary metrics
        st.markdown("### Task Summary")
        
        # Create columns for metrics
        col1, col2, col3, col4 = st.columns(4)
        
        # Display metrics
        with col1:
            create_metric_card(
                "Total Tasks",
                task_summary["total_tasks"]
            )
        
        with col2:
            create_metric_card(
                "Completed Tasks",
                task_summary["completed_tasks"],
                delta=f"{task_summary['completed_tasks'] / task_summary['total_tasks'] * 100:.1f}",
                delta_suffix="%"
            )
        
        with col3:
            create_metric_card(
                "Failed Tasks",
                task_summary["failed_tasks"],
                delta=f"{task_summary['failed_tasks'] / task_summary['total_tasks'] * 100:.1f}",
                delta_suffix="%"
            )
        
        with col4:
            create_metric_card(
                "Pending Tasks",
                task_summary["pending_tasks"],
                delta=f"{task_summary['pending_tasks'] / task_summary['total_tasks'] * 100:.1f}",
                delta_suffix="%"
            )
        
        # Display additional metrics
        col1, col2 = st.columns(2)
        
        with col1:
            create_metric_card(
                "Average Duration",
                task_summary["average_duration"],
                formatter=format_duration
            )
        
        with col2:
            create_metric_card(
                "Success Rate",
                task_summary["success_rate"],
                formatter=format_percentage
            )
        
        # Display task status breakdown
        st.markdown("### Task Status Breakdown")
        
        # Create pie chart data
        status_data = {
            "status": ["Completed", "Failed", "Pending"],
            "count": [
                task_summary["completed_tasks"],
                task_summary["failed_tasks"],
                task_summary["pending_tasks"]
            ]
        }
        
        # Display pie chart
        pie_chart = create_pie_chart(
            status_data,
            "status",
            "count",
            "Task Status Breakdown"
        )
        st.plotly_chart(pie_chart, use_container_width=True)
        
        # Display task timeline
        st.markdown("### Task Timeline")
        
        # Get task timeline data
        task_timeline = task_api.get_task_timeline(time_range=time_range)
        
        # Create timeline
        timeline = create_timeline(task_timeline, "Task Execution Timeline")
        st.plotly_chart(timeline, use_container_width=True)
        
        # Display recent tasks
        st.markdown("### Recent Tasks")
        
        # Get task details
        task_details = task_api.get_task_details()
        
        # Display task details table
        create_data_table(
            task_details,
            columns=["id", "type", "status", "created_at", "duration", "agent"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying task execution: {e}")
        st.error(f"Error displaying task execution: {e}")

def display_task_details(task_id):
    """
    Display detailed information for a specific task.
    
    Args:
        task_id (str): ID of the task to display details for.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Task Details: {task_id}")
    
    try:
        # Get task details
        task = task_api.get_task_details(task_id=task_id)
        
        if not task:
            st.error(f"Task {task_id} not found")
            return
        
        # Display task details
        st.markdown(f"### {task['type']} Task")
        st.markdown(f"**Status:** {task['status'].capitalize()}")
        st.markdown(f"**Created:** {format_time_ago(task['created_at'])}")
        st.markdown(f"**Updated:** {format_time_ago(task['updated_at'])}")
        st.markdown(f"**Duration:** {format_duration(task['duration'])}")
        st.markdown(f"**Agent:** {task['agent']}")
        
        # Display task input and output
        st.markdown("### Task Input")
        st.code(task['details']['input'])
        
        st.markdown("### Task Output")
        if task['details']['output']:
            st.code(task['details']['output'])
        else:
            st.info("No output available")
        
        # Display task error if any
        if task['details']['error']:
            st.markdown("### Task Error")
            st.error(task['details']['error'])
    
    except Exception as e:
        logger.error(f"Error displaying task details: {e}")
        st.error(f"Error displaying task details: {e}")

def display_task_type_details(task_type):
    """
    Display detailed information for a specific task type.
    
    Args:
        task_type (str): Type of task to display details for.
    
    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Task Type Details: {task_type}")
    
    try:
        # Get task details
        all_tasks = task_api.get_task_details()
        
        # Filter tasks by type
        tasks_of_type = [task for task in all_tasks if task["type"] == task_type]
        
        if not tasks_of_type:
            st.error(f"No tasks of type {task_type} found")
            return
        
        # Display task type summary
        st.markdown(f"### {task_type} Tasks")
        st.markdown(f"**Total Tasks:** {len(tasks_of_type)}")
        
        # Calculate success rate
        completed_tasks = [task for task in tasks_of_type if task["status"] == "completed"]
        failed_tasks = [task for task in tasks_of_type if task["status"] == "failed"]
        
        success_rate = len(completed_tasks) / len(tasks_of_type) if tasks_of_type else 0
        
        st.markdown(f"**Completed Tasks:** {len(completed_tasks)}")
        st.markdown(f"**Failed Tasks:** {len(failed_tasks)}")
        st.markdown(f"**Success Rate:** {format_percentage(success_rate)}")
        
        # Calculate average duration
        durations = [task["duration"] for task in tasks_of_type]
        avg_duration = sum(durations) / len(durations) if durations else 0
        
        st.markdown(f"**Average Duration:** {format_duration(avg_duration)}")
        
        # Display task details table
        st.markdown("### Task List")
        
        create_data_table(
            tasks_of_type,
            columns=["id", "status", "created_at", "duration", "agent"]
        )
    
    except Exception as e:
        logger.error(f"Error displaying task type details: {e}")
        st.error(f"Error displaying task type details: {e}")
