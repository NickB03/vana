"""
Tool Breadcrumbs for VANA

This module provides debugging and observability for tool execution by emitting
breadcrumb events to the ADK event stream.
"""

import logging
from google.adk.events import Event
from google.genai import types

logger = logging.getLogger(__name__)


def emit_tool_breadcrumb(tool: str, summary: str) -> None:
    """
    Emit a short breadcrumb event to the ADK event stream.
    
    Args:
        tool: Name of the tool being executed
        summary: Brief summary of the tool action
    """
    try:
        event = Event(
            author="tool",
            content=types.Content(parts=[types.Part(text=f"{tool}: {summary}")]),
        )
        # Use ADK global event stream if available
        from google.adk.runtime import event_stream

        event_stream.push(event)
        logger.debug(f"Tool breadcrumb emitted: {tool}: {summary}")
    except Exception as exc:
        logger.debug(f"Breadcrumb emit failed: {exc}")


__all__ = ["emit_tool_breadcrumb"]
