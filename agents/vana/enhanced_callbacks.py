# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Standalone callbacks for Vana ADK agents.

This module provides callback functions that work independently without
FastAPI dependencies. These callbacks track agent execution and collect
research sources but don't directly broadcast via SSE (that's handled by
the FastAPI layer when it proxies ADK responses).
"""

import logging
import time
from datetime import datetime

from google.adk.agents.callback_context import CallbackContext

logger = logging.getLogger(__name__)

# Export all callbacks for proper module imports
__all__ = [
    "before_agent_callback",
    "after_agent_callback",
    "agent_network_tracking_callback",
    "composite_after_agent_callback_with_research_sources",
    "composite_after_agent_callback_with_citations",
    "peer_transfer_tracking_callback",
]


def before_agent_callback(callback_context: CallbackContext) -> None:
    """Callback executed before an agent starts processing.

    Tracks agent invocation start and records timing information.

    Args:
        callback_context: The ADK callback context containing invocation details
    """
    try:
        invocation_ctx = callback_context._invocation_context
        agent_name = invocation_ctx.agent.name if invocation_ctx.agent else "unknown"

        # Record agent start time
        start_time = time.time()
        callback_context.state[f"{agent_name}_start_time"] = start_time

        logger.info(f"Agent {agent_name} started execution at {datetime.now().isoformat()}")

    except Exception as e:
        logger.error(f"Error in before_agent_callback: {e}")


def after_agent_callback(callback_context: CallbackContext) -> None:
    """Callback executed after an agent completes processing.

    Tracks agent completion and calculates execution metrics.

    Args:
        callback_context: The ADK callback context containing invocation details
    """
    try:
        invocation_ctx = callback_context._invocation_context
        agent_name = invocation_ctx.agent.name if invocation_ctx.agent else "unknown"

        # Calculate execution time
        start_time_key = f"{agent_name}_start_time"
        start_time = callback_context.state.get(start_time_key, time.time())
        execution_time = time.time() - start_time

        # Clean up start time
        if start_time_key in callback_context.state:
            del callback_context.state[start_time_key]

        logger.info(f"Agent {agent_name} completed execution in {execution_time:.2f}s")

    except Exception as e:
        logger.error(f"Error in after_agent_callback: {e}")


def agent_network_tracking_callback(callback_context: CallbackContext) -> None:
    """Callback for agent network tracking.

    This is a simplified version that logs agent execution without broadcasting.
    The FastAPI layer will handle broadcasting when it proxies ADK responses.

    Args:
        callback_context: The ADK callback context
    """
    try:
        invocation_ctx = callback_context._invocation_context
        agent_name = invocation_ctx.agent.name if invocation_ctx.agent else "unknown"

        logger.info(f"Agent network tracking for: {agent_name}")

    except Exception as e:
        logger.error(f"Error in agent_network_tracking_callback: {e}")


def composite_after_agent_callback_with_research_sources(
    callback_context: CallbackContext,
) -> None:
    """Composite callback that combines research source collection with tracking.

    This callback is designed for research agents that collect sources.

    Args:
        callback_context: The ADK callback context
    """
    try:
        # Import the collect function from the same module as the agent
        # This avoids circular imports
        from .agent import collect_research_sources_callback

        # First collect research sources
        collect_research_sources_callback(callback_context)

        # Then run standard after callback
        after_agent_callback(callback_context)

    except Exception as e:
        logger.error(
            f"Error in composite_after_agent_callback_with_research_sources: {e}"
        )


def composite_after_agent_callback_with_citations(
    callback_context: CallbackContext,
) -> None:
    """Composite callback that combines citation replacement with tracking.

    This callback is designed for report composition agents.

    Args:
        callback_context: The ADK callback context
    """
    try:
        # Import the citation function from the same module as the agent
        from .agent import citation_replacement_callback

        # First run standard after callback
        after_agent_callback(callback_context)

        # Then replace citations
        citation_replacement_callback(callback_context)

    except Exception as e:
        logger.error(f"Error in composite_after_agent_callback_with_citations: {e}")


def peer_transfer_tracking_callback(callback_context: CallbackContext) -> None:
    """Track peer transfer events for monitoring and debugging.

    Logs transfer events with session_id, from/to agents, and latency.
    Detects potential loop patterns.

    Args:
        callback_context: The ADK callback context containing session and agent details
    """
    try:
        session = callback_context._invocation_context.session
        current_agent = callback_context._invocation_context.agent.name

        # Track transfer in session state
        transfers = session.state.get("peer_transfers", [])
        transfer_event = {
            "from_agent": transfers[-1]["to_agent"] if transfers else "dispatcher",
            "to_agent": current_agent,
            "timestamp": datetime.now().isoformat(),
            "message_preview": (
                session.events[-1].content.parts[0].text[:50] if session.events else "N/A"
            ),
        }
        transfers.append(transfer_event)
        session.state["peer_transfers"] = transfers

        # Log transfer
        logger.info(
            f"[PEER_TRANSFER] {transfer_event['from_agent']} → {transfer_event['to_agent']}"
        )

        # Loop detection: Check for bounce patterns
        if len(transfers) >= 3:
            last_three = [t["to_agent"] for t in transfers[-3:]]
            if last_three[0] == last_three[2]:  # A → B → A pattern
                logger.warning(
                    f"[LOOP_RISK] Detected bounce pattern: {' → '.join(last_three)}"
                )

    except Exception as e:
        logger.error(f"Error in peer_transfer_tracking_callback: {e}")
