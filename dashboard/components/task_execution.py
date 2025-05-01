"""
Task Execution Component for VANA Dashboard.

This module provides components for displaying task execution metrics and details.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import logging

from dashboard.api import task_api

logger = logging.getLogger(__name__)

def display_task_execution():
    """
    Display task execution visualization.
    """
    # Get task summary data
    time_range = st.selectbox(
        "Time Range",
        ["hour", "day", "week", "month"],
        index=1,
        key="task_execution_time_range"
    )

    task_summary = task_api.get_task_summary(time_range=time_range)

    # Display task summary metrics
    st.subheader("Task Summary")

    # Create columns for metrics
    col1, col2, col3, col4 = st.columns(4)

    # Display metrics
    with col1:
        st.metric("Total Tasks", task_summary["total_tasks"])

    with col2:
        st.metric(
            "Completed Tasks",
            task_summary["completed_tasks"],
            f"{task_summary['completed_tasks'] / task_summary['total_tasks'] * 100:.1f}%"
        )

    with col3:
        st.metric(
            "Failed Tasks",
            task_summary["failed_tasks"],
            f"{task_summary['failed_tasks'] / task_summary['total_tasks'] * 100:.1f}%"
        )

    with col4:
        st.metric(
            "Pending Tasks",
            task_summary["pending_tasks"],
            f"{task_summary['pending_tasks'] / task_summary['total_tasks'] * 100:.1f}%"
        )

    # Display additional metrics
    col1, col2 = st.columns(2)

    with col1:
        st.metric("Average Duration", f"{task_summary['average_duration']:.2f} seconds")

    with col2:
        st.metric("Success Rate", f"{task_summary['success_rate']:.1%}")

    # Display task status breakdown
    st.subheader("Task Status Breakdown")

    # Create pie chart data
    status_data = pd.DataFrame({
        "Status": ["Completed", "Failed", "Pending"],
        "Count": [
            task_summary["completed_tasks"],
            task_summary["failed_tasks"],
            task_summary["pending_tasks"]
        ]
    })

    # Create pie chart
    fig_status = px.pie(
        status_data,
        names="Status",
        values="Count",
        title="Task Status Breakdown",
        color="Status",
        color_discrete_map={
            "Completed": "green",
            "Failed": "red",
            "Pending": "orange"
        }
    )
    st.plotly_chart(fig_status, use_container_width=True)

    # Display task timeline
    st.subheader("Task Timeline")

    # Get task timeline data
    task_timeline = task_api.get_task_timeline(time_range=time_range)

    # Create DataFrame for timeline
    timeline_data = []
    for task in task_timeline:
        timeline_data.append({
            "Task ID": task["id"],
            "Type": task["type"].replace("_", " ").title(),
            "Status": task["status"].capitalize(),
            "Agent": task["agent"].capitalize(),
            "Start Time": task["start_time"],
            "End Time": task["end_time"],
            "Duration": task["duration"]
        })

    df_timeline = pd.DataFrame(timeline_data)

    # Create Gantt chart
    fig_timeline = px.timeline(
        df_timeline,
        x_start="Start Time",
        x_end="End Time",
        y="Task ID",
        color="Status",
        hover_data=["Type", "Agent", "Duration"],
        title="Task Execution Timeline",
        color_discrete_map={
            "Completed": "green",
            "Failed": "red"
        }
    )
    st.plotly_chart(fig_timeline, use_container_width=True)

    # Display recent tasks
    st.subheader("Recent Tasks")

    # Get task details
    task_details = task_api.get_task_details()

    # Create DataFrame for task details
    df_tasks = pd.DataFrame([
        {
            "Task ID": task["id"],
            "Type": task["type"].replace("_", " ").title(),
            "Status": task["status"].capitalize(),
            "Created At": task["created_at"],
            "Duration (s)": task["duration"],
            "Agent": task["agent"].capitalize()
        }
        for task in task_details
    ])

    # Display task details table
    st.dataframe(df_tasks, use_container_width=True)

def display_task_details(task_id):
    """
    Display detailed information for a specific task.

    Args:
        task_id (str): ID of the task to display details for.

    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Task Details: {task_id}")

    # Get task details
    task = task_api.get_task_details(task_id=task_id)

    if not task:
        st.error(f"Task {task_id} not found")
        return

    # Display task details
    st.markdown(f"### {task['type'].replace('_', ' ').title()} Task")

    # Create status indicator
    status_color = {
        "completed": "green",
        "failed": "red",
        "pending": "orange",
        "in_progress": "blue"
    }.get(task["status"], "gray")

    st.markdown(
        f"""
        <div style="padding: 5px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
        <p><strong>Status:</strong> {task["status"].capitalize()}</p>
        </div>
        """,
        unsafe_allow_html=True
    )

    # Format timestamps
    created_at = datetime.fromisoformat(task["created_at"].replace("Z", "+00:00"))
    updated_at = datetime.fromisoformat(task["updated_at"].replace("Z", "+00:00"))

    st.markdown(f"**Created:** {created_at.strftime('%Y-%m-%d %H:%M:%S')}")
    st.markdown(f"**Updated:** {updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
    st.markdown(f"**Duration:** {task['duration']:.2f} seconds")
    st.markdown(f"**Agent:** {task['agent'].capitalize()}")

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

def display_task_type_details(task_type):
    """
    Display detailed information for a specific task type.

    Args:
        task_type (str): Type of task to display details for.

    Returns:
        None: Displays the component directly using Streamlit.
    """
    st.subheader(f"Task Type Details: {task_type.replace('_', ' ').title()}")

    # Get task details
    all_tasks = task_api.get_task_details()

    # Filter tasks by type
    tasks_of_type = [task for task in all_tasks if task["type"] == task_type]

    if not tasks_of_type:
        st.error(f"No tasks of type {task_type} found")
        return

    # Display task type summary
    st.markdown(f"### {task_type.replace('_', ' ').title()} Tasks")
    st.markdown(f"**Total Tasks:** {len(tasks_of_type)}")

    # Calculate success rate
    completed_tasks = [task for task in tasks_of_type if task["status"] == "completed"]
    failed_tasks = [task for task in tasks_of_type if task["status"] == "failed"]

    success_rate = len(completed_tasks) / len(tasks_of_type) if tasks_of_type else 0

    st.markdown(f"**Completed Tasks:** {len(completed_tasks)}")
    st.markdown(f"**Failed Tasks:** {len(failed_tasks)}")
    st.markdown(f"**Success Rate:** {success_rate:.1%}")

    # Calculate average duration
    durations = [task["duration"] for task in tasks_of_type]
    avg_duration = sum(durations) / len(durations) if durations else 0

    st.markdown(f"**Average Duration:** {avg_duration:.2f} seconds")

    # Display task details table
    st.markdown("### Task List")

    # Create DataFrame for task details
    df_tasks = pd.DataFrame([
        {
            "Task ID": task["id"],
            "Status": task["status"].capitalize(),
            "Created At": task["created_at"],
            "Duration (s)": task["duration"],
            "Agent": task["agent"].capitalize()
        }
        for task in tasks_of_type
    ])

    # Display task details table
    st.dataframe(df_tasks, use_container_width=True)
