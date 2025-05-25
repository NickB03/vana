"""
Component modules for VANA Dashboard.

This package contains component modules for the dashboard.
"""

from dashboard.components.agent_status import display_agent_status, display_agent_details
from dashboard.components.memory_usage import display_memory_usage, display_memory_details
from dashboard.components.system_health import display_system_health, display_service_details
from dashboard.components.task_execution import display_task_execution, display_task_details, display_task_type_details

__all__ = [
    'display_agent_status', 'display_agent_details',
    'display_memory_usage', 'display_memory_details',
    'display_system_health', 'display_service_details',
    'display_task_execution', 'display_task_details', 'display_task_type_details'
]
