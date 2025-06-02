"""
Task Execution Component for VANA Dashboard.

This module provides comprehensive components for displaying task execution metrics,
timelines, agent performance, and detailed task information.
"""

import logging
from datetime import datetime

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from dashboard.api import task_api
from dashboard.utils.data_formatter import format_percentage, format_timestamp

logger = logging.getLogger(__name__)


def display_task_execution():
    """
    Display comprehensive task execution visualization with enhanced metrics and visualizations.
    """
    # Time range selection
    time_range = st.selectbox(
        "Time Range",
        ["hour", "day", "week", "month"],
        index=1,
        key="task_execution_time_range",
    )

    # Get task data
    task_summary = task_api.get_task_summary(time_range=time_range)
    task_details = task_api.get_task_details()
    task_timeline = task_api.get_task_timeline(time_range=time_range)

    # Task Summary Section
    st.subheader("Task Execution Summary")

    # Create metrics in 4 columns
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Total Tasks", f"{task_summary['total_tasks']}", f"{time_range}")

    with col2:
        st.metric(
            "Completed",
            f"{task_summary['completed_tasks']}",
            f"{format_percentage(task_summary['completed_tasks'] / task_summary['total_tasks'])}",
        )

    with col3:
        st.metric(
            "Failed",
            f"{task_summary['failed_tasks']}",
            f"{format_percentage(task_summary['failed_tasks'] / task_summary['total_tasks'])}",
        )

    with col4:
        st.metric(
            "Pending",
            f"{task_summary['pending_tasks']}",
            f"{format_percentage(task_summary['pending_tasks'] / task_summary['total_tasks'])}",
        )

    # Create second row of metrics
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Average Duration", f"{task_summary['average_duration']:.2f}s")

    with col2:
        # Task Success Rate Gauge
        fig = go.Figure(
            go.Indicator(
                mode="gauge+number",
                value=task_summary["success_rate"] * 100,
                title={"text": "Success Rate"},
                domain={"x": [0, 1], "y": [0, 1]},
                gauge={
                    "axis": {"range": [0, 100]},
                    "bar": {"color": "green"},
                    "steps": [
                        {"range": [0, 60], "color": "red"},
                        {"range": [60, 80], "color": "orange"},
                        {"range": [80, 100], "color": "lightgreen"},
                    ],
                    "threshold": {
                        "line": {"color": "black", "width": 4},
                        "thickness": 0.75,
                        "value": task_summary["success_rate"] * 100,
                    },
                },
            )
        )

        fig.update_layout(height=200, margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig, use_container_width=True)

    with col3:
        # Task Status Breakdown
        status_data = pd.DataFrame(
            {
                "Status": ["Completed", "Failed", "Pending"],
                "Count": [
                    task_summary["completed_tasks"],
                    task_summary["failed_tasks"],
                    task_summary["pending_tasks"],
                ],
            }
        )

        fig = px.pie(
            status_data,
            names="Status",
            values="Count",
            title="Status Breakdown",
            color="Status",
            color_discrete_map={
                "Completed": "green",
                "Failed": "red",
                "Pending": "orange",
            },
            hole=0.4,
        )

        fig.update_layout(height=200, margin=dict(l=20, r=20, t=30, b=20))
        st.plotly_chart(fig, use_container_width=True)

    # Task Timeline Section
    st.subheader("Task Execution Timeline")

    # Create tabs for different timeline views
    timeline_tabs = st.tabs(["Gantt Chart", "Task Distribution", "Agent Performance"])

    # Create DataFrame for timeline
    timeline_data = []
    for task in task_timeline:
        timeline_data.append(
            {
                "Task ID": task["id"],
                "Type": task["type"].replace("_", " ").title(),
                "Status": task["status"].capitalize(),
                "Agent": task["agent"].capitalize(),
                "Start Time": datetime.fromisoformat(
                    task["start_time"].replace("Z", "+00:00")
                ),
                "End Time": datetime.fromisoformat(
                    task["end_time"].replace("Z", "+00:00")
                ),
                "Duration": task["duration"],
            }
        )

    df_timeline = pd.DataFrame(timeline_data)

    with timeline_tabs[0]:
        # Enhanced Gantt chart
        if not df_timeline.empty:
            # Add task type to the task ID for better labeling
            df_timeline["Task Label"] = (
                df_timeline["Task ID"] + " (" + df_timeline["Type"] + ")"
            )

            fig = px.timeline(
                df_timeline,
                x_start="Start Time",
                x_end="End Time",
                y="Task Label",
                color="Status",
                hover_data=["Type", "Agent", "Duration"],
                color_discrete_map={"Completed": "green", "Failed": "red"},
            )

            fig.update_layout(
                title="Task Execution Timeline",
                xaxis_title="Time",
                yaxis_title="Task",
                height=500,
            )

            # Add agent information as text annotations
            for i, task in enumerate(df_timeline.itertuples()):
                fig.add_annotation(
                    x=task._5,  # End Time
                    y=task.Task_Label,
                    text=f"Agent: {task.Agent}",
                    showarrow=False,
                    xshift=10,
                    align="left",
                )

            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No timeline data available for the selected time range")

    with timeline_tabs[1]:
        if not df_timeline.empty:
            # Task type distribution
            col1, col2 = st.columns(2)

            with col1:
                # Task type distribution chart
                task_type_counts = df_timeline["Type"].value_counts().reset_index()
                task_type_counts.columns = ["Task Type", "Count"]

                fig = px.pie(
                    task_type_counts,
                    values="Count",
                    names="Task Type",
                    title="Task Type Distribution",
                )

                st.plotly_chart(fig, use_container_width=True)

            with col2:
                # Task duration by type
                task_duration_by_type = (
                    df_timeline.groupby("Type")["Duration"].mean().reset_index()
                )
                task_duration_by_type.columns = ["Task Type", "Average Duration (s)"]

                fig = px.bar(
                    task_duration_by_type,
                    x="Task Type",
                    y="Average Duration (s)",
                    title="Average Task Duration by Type",
                    color="Task Type",
                )

                st.plotly_chart(fig, use_container_width=True)

            # Task status by type
            task_status_by_type = pd.crosstab(
                df_timeline["Type"], df_timeline["Status"]
            )

            # Calculate success rate by type
            if "Completed" in task_status_by_type.columns:
                task_status_by_type["Total"] = task_status_by_type.sum(axis=1)
                task_status_by_type["Success Rate"] = (
                    task_status_by_type["Completed"] / task_status_by_type["Total"]
                )

                # Create success rate chart
                success_rate_by_type = task_status_by_type.reset_index()[
                    ["Type", "Success Rate"]
                ]
                success_rate_by_type["Success Rate"] = (
                    success_rate_by_type["Success Rate"] * 100
                )

                fig = px.bar(
                    success_rate_by_type,
                    x="Type",
                    y="Success Rate",
                    title="Success Rate by Task Type (%)",
                    color="Type",
                )

                fig.update_layout(yaxis_range=[0, 100])
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No distribution data available for the selected time range")

    with timeline_tabs[2]:
        if not df_timeline.empty:
            # Agent performance metrics
            col1, col2 = st.columns(2)

            with col1:
                # Task count by agent
                agent_task_counts = df_timeline["Agent"].value_counts().reset_index()
                agent_task_counts.columns = ["Agent", "Task Count"]

                fig = px.bar(
                    agent_task_counts,
                    x="Agent",
                    y="Task Count",
                    title="Tasks Handled by Agent",
                    color="Agent",
                )

                st.plotly_chart(fig, use_container_width=True)

            with col2:
                # Average duration by agent
                agent_duration = (
                    df_timeline.groupby("Agent")["Duration"].mean().reset_index()
                )
                agent_duration.columns = ["Agent", "Average Duration (s)"]

                fig = px.bar(
                    agent_duration,
                    x="Agent",
                    y="Average Duration (s)",
                    title="Average Task Duration by Agent",
                    color="Agent",
                )

                st.plotly_chart(fig, use_container_width=True)

            # Success rate by agent
            agent_success = (
                df_timeline.groupby("Agent")["Status"]
                .apply(lambda x: (x == "Completed").mean())
                .reset_index()
            )
            agent_success.columns = ["Agent", "Success Rate"]
            agent_success["Success Rate"] = agent_success["Success Rate"] * 100

            fig = px.bar(
                agent_success,
                x="Agent",
                y="Success Rate",
                title="Success Rate by Agent (%)",
                color="Agent",
            )

            fig.update_layout(yaxis_range=[0, 100])
            st.plotly_chart(fig, use_container_width=True)

            # Task type distribution by agent
            agent_task_types = pd.crosstab(df_timeline["Agent"], df_timeline["Type"])

            # Convert to percentage
            agent_task_types_pct = (
                agent_task_types.div(agent_task_types.sum(axis=1), axis=0) * 100
            )

            # Melt for plotting
            agent_task_types_melt = agent_task_types_pct.reset_index().melt(
                id_vars=["Agent"], var_name="Task Type", value_name="Percentage"
            )

            fig = px.bar(
                agent_task_types_melt,
                x="Agent",
                y="Percentage",
                color="Task Type",
                title="Task Type Distribution by Agent (%)",
                barmode="stack",
            )

            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No agent performance data available for the selected time range")

    # Recent Tasks Section
    st.subheader("Recent Tasks")

    # Create DataFrame for task details
    df_tasks = pd.DataFrame(
        [
            {
                "Task ID": task["id"],
                "Type": task["type"].replace("_", " ").title(),
                "Status": task["status"].capitalize(),
                "Created At": format_timestamp(task["created_at"]),
                "Duration (s)": f"{task['duration']:.2f}",
                "Agent": task["agent"].capitalize(),
                "Error": task["details"]["error"] if task["details"]["error"] else "",
            }
            for task in task_details
        ]
    )

    # Style the DataFrame based on status
    def color_status(val):
        if val == "Completed":
            return "background-color: #d4f7d4"  # Light green
        elif val == "Failed":
            return "background-color: #f7d4d4"  # Light red
        elif val == "In_progress":
            return "background-color: #d4d4f7"  # Light blue
        else:
            return ""

    if not df_tasks.empty:
        styled_df = df_tasks.style.applymap(color_status, subset=["Status"])

        # Display the table
        st.dataframe(styled_df, use_container_width=True, height=400)

        # Task Details Expander
        with st.expander("View Task Details"):
            # Select a task to view details
            selected_task_id = st.selectbox(
                "Select a task to view details", options=df_tasks["Task ID"].tolist()
            )

            if selected_task_id:
                # Get task details
                task = task_api.get_task_details(task_id=selected_task_id)

                # Create columns for task details
                detail_col1, detail_col2 = st.columns(2)

                with detail_col1:
                    st.markdown(f"**Task ID:** {task['id']}")
                    st.markdown(f"**Type:** {task['type'].replace('_', ' ').title()}")
                    st.markdown(f"**Status:** {task['status'].capitalize()}")
                    st.markdown(f"**Agent:** {task['agent'].capitalize()}")

                with detail_col2:
                    st.markdown(f"**Created:** {format_timestamp(task['created_at'])}")
                    st.markdown(f"**Updated:** {format_timestamp(task['updated_at'])}")
                    st.markdown(f"**Duration:** {task['duration']:.2f} seconds")

                # Display task input and output
                st.markdown("### Input")
                st.code(task["details"]["input"])

                st.markdown("### Output")
                if task["details"]["error"]:
                    st.error(task["details"]["error"])
                else:
                    st.code(task["details"]["output"])
    else:
        st.info("No recent tasks available")


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
        "in_progress": "blue",
    }.get(task["status"], "gray")

    st.markdown(
        f"""
        <div style="padding: 5px; border-left: 5px solid {status_color}; background-color: #f0f0f0;">
        <p><strong>Status:</strong> {task["status"].capitalize()}</p>
        </div>
        """,
        unsafe_allow_html=True,
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
    st.code(task["details"]["input"])

    st.markdown("### Task Output")
    if task["details"]["output"]:
        st.code(task["details"]["output"])
    else:
        st.info("No output available")

    # Display task error if any
    if task["details"]["error"]:
        st.markdown("### Task Error")
        st.error(task["details"]["error"])


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
    df_tasks = pd.DataFrame(
        [
            {
                "Task ID": task["id"],
                "Status": task["status"].capitalize(),
                "Created At": task["created_at"],
                "Duration (s)": task["duration"],
                "Agent": task["agent"].capitalize(),
            }
            for task in tasks_of_type
        ]
    )

    # Display task details table
    st.dataframe(df_tasks, use_container_width=True)
