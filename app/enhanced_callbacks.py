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

"""Enhanced callbacks for agent network tracking and multi-agent canvas visualization.

This module provides advanced callback functions that capture agent relationships,
dependencies, data flow, and performance metrics for real-time multi-agent system
visualization and monitoring.
"""

import logging
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from google.adk.agents.callback_context import CallbackContext

from app.utils.sse_broadcaster import broadcast_agent_network_update

logger = logging.getLogger(__name__)

# Performance monitoring integration
try:
    from app.monitoring.metrics_collector import get_metrics_collector
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False
    logger.warning("Performance metrics collector not available")


@dataclass
class AgentMetrics:
    """Metrics for individual agent performance and behavior."""

    invocation_count: int = 0
    total_execution_time: float = 0.0
    last_invocation: datetime | None = None
    average_execution_time: float = 0.0
    confidence_scores: list[float] = field(default_factory=list)
    error_count: int = 0
    success_count: int = 0
    tools_used: set[str] = field(default_factory=set)

    def update_timing(self, execution_time: float) -> None:
        """Update timing metrics."""
        self.invocation_count += 1
        self.total_execution_time += execution_time
        self.average_execution_time = self.total_execution_time / self.invocation_count
        self.last_invocation = datetime.now()

    def add_confidence_score(self, score: float) -> None:
        """Add a confidence score."""
        self.confidence_scores.append(score)
        # Keep only last 100 scores
        if len(self.confidence_scores) > 100:
            self.confidence_scores.pop(0)

    def record_success(self) -> None:
        """Record successful execution."""
        self.success_count += 1

    def record_error(self) -> None:
        """Record failed execution."""
        self.error_count += 1

    def add_tool_usage(self, tool_name: str) -> None:
        """Record tool usage."""
        self.tools_used.add(tool_name)


@dataclass
class AgentRelationship:
    """Represents a relationship between two agents."""

    source_agent: str
    target_agent: str
    relationship_type: (
        str  # 'invokes', 'delegates_to', 'receives_from', 'parent_of', 'child_of'
    )
    data_flow: list[str] = field(
        default_factory=list
    )  # Keys of data passed between agents
    interaction_count: int = 0
    last_interaction: datetime | None = None

    def record_interaction(self, data_keys: list[str] | None = None) -> None:
        """Record an interaction between agents."""
        self.interaction_count += 1
        self.last_interaction = datetime.now()
        if data_keys:
            self.data_flow.extend(data_keys)


@dataclass
class AgentNetworkState:
    """Global state tracking for the agent network."""

    agents: dict[str, AgentMetrics] = field(default_factory=dict)
    relationships: list[AgentRelationship] = field(default_factory=list)
    execution_stack: list[str] = field(
        default_factory=list
    )  # Current agent execution stack
    agent_hierarchy: dict[str, list[str]] = field(
        default_factory=dict
    )  # parent -> children mapping
    active_agents: set[str] = field(default_factory=set)
    data_dependencies: dict[str, set[str]] = field(
        default_factory=dict
    )  # agent -> required data keys

    def get_or_create_agent_metrics(self, agent_name: str) -> AgentMetrics:
        """Get or create metrics for an agent."""
        if agent_name not in self.agents:
            self.agents[agent_name] = AgentMetrics()
        return self.agents[agent_name]

    def add_relationship(
        self,
        source: str,
        target: str,
        rel_type: str,
        data_keys: list[str] | None = None,
    ) -> None:
        """Add or update a relationship between agents."""
        # Find existing relationship or create new one
        existing = None
        for rel in self.relationships:
            if (
                rel.source_agent == source
                and rel.target_agent == target
                and rel.relationship_type == rel_type
            ):
                existing = rel
                break

        if existing:
            existing.record_interaction(data_keys)
        else:
            new_rel = AgentRelationship(source, target, rel_type)
            new_rel.record_interaction(data_keys)
            self.relationships.append(new_rel)

    def set_hierarchy(self, parent: str, children: list[str]) -> None:
        """Set parent-child relationships in the agent hierarchy."""
        self.agent_hierarchy[parent] = children

        # Also create bidirectional relationships
        for child in children:
            self.add_relationship(parent, child, "parent_of")
            self.add_relationship(child, parent, "child_of")

    def push_agent(self, agent_name: str) -> None:
        """Push agent onto execution stack."""
        self.execution_stack.append(agent_name)
        self.active_agents.add(agent_name)

    def pop_agent(self) -> str | None:
        """Pop agent from execution stack."""
        if self.execution_stack:
            agent_name = self.execution_stack.pop()
            if agent_name not in self.execution_stack:
                self.active_agents.discard(agent_name)
            return agent_name
        return None

    def add_data_dependency(self, agent_name: str, data_key: str) -> None:
        """Add a data dependency for an agent."""
        if agent_name not in self.data_dependencies:
            self.data_dependencies[agent_name] = set()
        self.data_dependencies[agent_name].add(data_key)


# Global network state - in production, this would be managed by the session
_network_state = AgentNetworkState()


def before_agent_callback(callback_context: CallbackContext) -> None:
    """Callback executed before an agent starts processing.

    Tracks agent invocation start, updates network state, and records
    the beginning of agent execution for timing and relationship tracking.

    Args:
        callback_context: The ADK callback context containing invocation details
    """
    try:
        invocation_ctx = callback_context._invocation_context
        agent_name = invocation_ctx.agent.name if invocation_ctx.agent else "unknown"

        # Record agent start time
        start_time = time.time()
        callback_context.state[f"{agent_name}_start_time"] = start_time

        # Update network state
        global _network_state
        _network_state.push_agent(agent_name)

        # Get agent metrics
        _network_state.get_or_create_agent_metrics(agent_name)

        # Check for parent agent relationship
        if len(_network_state.execution_stack) > 1:
            parent_agent = _network_state.execution_stack[-2]
            _network_state.add_relationship(parent_agent, agent_name, "invokes")

        # Analyze data dependencies from session state
        if invocation_ctx.session and invocation_ctx.session.state:
            session_keys = set(invocation_ctx.session.state.keys())
            for key in session_keys:
                _network_state.add_data_dependency(agent_name, key)

        # Emit agent network event (using camelCase for frontend compatibility)
        network_event = {
            "type": "agent_start",
            "data": {
                "agentId": f"agent_{agent_name}_{datetime.now().timestamp()}",
                "agentName": agent_name,
                "agentType": invocation_ctx.agent.__class__.__name__
                if invocation_ctx.agent
                else "unknown",
                "action": "Starting",
                "status": "active",
                "timestamp": datetime.now().isoformat(),
                "executionStack": _network_state.execution_stack.copy(),
                "activeAgents": list(_network_state.active_agents),
                "parentAgent": _network_state.execution_stack[-2]
                if len(_network_state.execution_stack) > 1
                else None,
                "sessionId": getattr(invocation_ctx.session, "id", None)
                if invocation_ctx.session
                else None,
            },
        }

        # Broadcast the event immediately
        session_id = (
            getattr(invocation_ctx.session, "id", None)
            if invocation_ctx.session
            else None
        )
        if session_id:
            broadcast_agent_network_update(network_event, session_id)

        # Also store for legacy compatibility
        callback_context.state["agent_network_event"] = network_event

        # Record performance metrics if available
        if METRICS_AVAILABLE:
            try:
                metrics_collector = get_metrics_collector()
                request_id = f"agent_{agent_name}_{start_time}"
                metrics_collector.record_request_start(request_id, f"agent:{agent_name}")
                callback_context.state[f"{agent_name}_metrics_request_id"] = request_id
            except Exception as e:
                logger.error(f"Failed to record performance metrics: {e}")

        logger.info(f"Agent {agent_name} started execution")

    except Exception as e:
        logger.error(f"Error in before_agent_callback: {e}")


def after_agent_callback(callback_context: CallbackContext) -> None:
    """Callback executed after an agent completes processing.

    Tracks agent completion, calculates execution metrics, updates relationships,
    and emits network state changes for real-time visualization.

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

        # Update network state
        global _network_state
        _network_state.pop_agent()

        # Update agent metrics
        metrics = _network_state.get_or_create_agent_metrics(agent_name)
        metrics.update_timing(execution_time)

        # Check if agent completed successfully (no escalation)
        has_error = any(
            event.actions and getattr(event.actions, "escalate", False)
            for event in invocation_ctx.session.events
            if event.author == agent_name
        )

        if has_error:
            metrics.record_error()
        else:
            metrics.record_success()

        # Track tool usage from recent events
        for event in invocation_ctx.session.events:
            if event.author == agent_name and event.content:
                for part in event.content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        metrics.add_tool_usage(part.function_call.name)

        # Analyze state changes for data flow
        state_changes = []
        if invocation_ctx.session and invocation_ctx.session.state:
            # Look for new or modified state keys
            for key, value in invocation_ctx.session.state.items():
                if isinstance(value, str | dict | list) and value:
                    state_changes.append(key)

        # Record data flow relationships with next agent in stack
        if state_changes and _network_state.execution_stack:
            next_agent = _network_state.execution_stack[-1]
            _network_state.add_relationship(
                agent_name, next_agent, "provides_data", state_changes
            )

        # Calculate confidence score if available
        recent_events = [
            e for e in invocation_ctx.session.events if e.author == agent_name
        ]
        if recent_events:
            # Use usage metadata as proxy for confidence
            last_event = recent_events[-1]
            if hasattr(last_event, "usage_metadata") and last_event.usage_metadata:
                # Simple confidence heuristic based on token usage
                confidence = min(
                    1.0, last_event.usage_metadata.total_token_count / 1000
                )
                metrics.add_confidence_score(confidence)

        # Emit completion event (using camelCase for frontend compatibility)
        network_event = {
            "type": "agent_complete",
            "data": {
                "agentName": agent_name,
                "status": "complete",
                "executionTime": execution_time,
                "timestamp": datetime.now().isoformat(),
                "sessionId": getattr(invocation_ctx.session, "id", None)
                if invocation_ctx.session
                else None,
                "hasOutput": bool(state_changes),
                "success": not has_error,
                "stateChanges": state_changes,
                "activeAgents": list(_network_state.active_agents),
                "metrics": {
                    "invocationCount": metrics.invocation_count,
                    "averageExecutionTime": metrics.average_execution_time,
                    "successRate": metrics.success_count
                    / (metrics.success_count + metrics.error_count)
                    if (metrics.success_count + metrics.error_count) > 0
                    else 1.0,
                    "toolsUsed": list(metrics.tools_used),
                },
            },
        }

        # Broadcast the event immediately
        session_id = (
            getattr(invocation_ctx.session, "id", None)
            if invocation_ctx.session
            else None
        )
        if session_id:
            broadcast_agent_network_update(network_event, session_id)

        # Also store for legacy compatibility
        callback_context.state["agent_network_event"] = network_event

        # Record performance metrics completion if available
        if METRICS_AVAILABLE:
            try:
                metrics_request_id = callback_context.state.get(f"{agent_name}_metrics_request_id")
                if metrics_request_id:
                    metrics_collector = get_metrics_collector()
                    metrics_collector.record_request_end(
                        metrics_request_id, 
                        f"agent:{agent_name}", 
                        success=not has_error
                    )
                    metrics_collector.record_agent_metrics(agent_name, execution_time * 1000, not has_error)
                    # Clean up
                    del callback_context.state[f"{agent_name}_metrics_request_id"]
            except Exception as e:
                logger.error(f"Failed to record performance metrics completion: {e}")

        logger.info(f"Agent {agent_name} completed execution in {execution_time:.2f}s")

    except Exception as e:
        logger.error(f"Error in after_agent_callback: {e}")


def agent_network_tracking_callback(callback_context: CallbackContext) -> None:
    """Enhanced callback for comprehensive agent network tracking.

    This callback provides detailed tracking of agent relationships, dependencies,
    data flow, and performance metrics. It's designed to be used in conjunction
    with before_agent_callback and after_agent_callback for complete coverage.

    Key features:
    - Agent relationship mapping (parent-child, invocation, data flow)
    - Performance metrics collection (timing, success rates, tool usage)
    - Data dependency analysis
    - Real-time network state updates for visualization

    Args:
        callback_context: The ADK callback context providing access to agent
            session events and persistent state
    """
    try:
        invocation_ctx = callback_context._invocation_context
        agent_name = invocation_ctx.agent.name if invocation_ctx.agent else "unknown"

        global _network_state

        # Analyze all events from this session to build comprehensive network picture
        agent_interactions = {}
        state_modifications = {}

        for event in invocation_ctx.session.events:
            event_agent = event.author

            # Track agent interactions
            if event_agent not in agent_interactions:
                agent_interactions[event_agent] = {
                    "events": [],
                    "tools_used": set(),
                    "state_keys_read": set(),
                    "state_keys_written": set(),
                }

            agent_interactions[event_agent]["events"].append(event)

            # Track tool usage
            if event.content:
                for part in event.content.parts:
                    if hasattr(part, "function_call") and part.function_call:
                        agent_interactions[event_agent]["tools_used"].add(
                            part.function_call.name
                        )

            # Track state modifications
            if (
                event.actions
                and hasattr(event.actions, "state_delta")
                and event.actions.state_delta
            ):
                for key in event.actions.state_delta.keys():
                    state_modifications[key] = event_agent
                    agent_interactions[event_agent]["state_keys_written"].add(key)

        # Build data flow relationships
        for agent, info in agent_interactions.items():
            metrics = _network_state.get_or_create_agent_metrics(agent)

            # Update tool usage
            for tool in info["tools_used"]:
                metrics.add_tool_usage(tool)

            # Determine data dependencies
            for key in info["state_keys_read"]:
                _network_state.add_data_dependency(agent, key)

                # If another agent wrote this key, create data flow relationship
                if key in state_modifications and state_modifications[key] != agent:
                    writer_agent = state_modifications[key]
                    _network_state.add_relationship(
                        writer_agent, agent, "provides_data", [key]
                    )

        # Detect agent hierarchies from the session structure
        if (
            hasattr(invocation_ctx.agent, "sub_agents")
            and invocation_ctx.agent.sub_agents
        ):
            sub_agent_names = [
                sub_agent.name for sub_agent in invocation_ctx.agent.sub_agents
            ]
            _network_state.set_hierarchy(agent_name, sub_agent_names)

        # Create comprehensive network snapshot
        network_snapshot = {
            "type": "agent_network_snapshot",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "agents": {
                    name: {
                        "invocation_count": metrics.invocation_count,
                        "average_execution_time": metrics.average_execution_time,
                        "success_rate": metrics.success_count
                        / (metrics.success_count + metrics.error_count)
                        if (metrics.success_count + metrics.error_count) > 0
                        else 1.0,
                        "tools_used": list(metrics.tools_used),
                        "last_invocation": metrics.last_invocation.isoformat()
                        if metrics.last_invocation
                        else None,
                        "is_active": name in _network_state.active_agents,
                    }
                    for name, metrics in _network_state.agents.items()
                },
                "relationships": [
                    {
                        "source": rel.source_agent,
                        "target": rel.target_agent,
                        "type": rel.relationship_type,
                        "interaction_count": rel.interaction_count,
                        "data_flow": rel.data_flow[-10:],  # Last 10 data keys
                        "last_interaction": rel.last_interaction.isoformat()
                        if rel.last_interaction
                        else None,
                    }
                    for rel in _network_state.relationships
                ],
                "hierarchy": _network_state.agent_hierarchy,
                "execution_stack": _network_state.execution_stack.copy(),
                "active_agents": list(_network_state.active_agents),
                "data_dependencies": {
                    agent: list(deps)
                    for agent, deps in _network_state.data_dependencies.items()
                },
            },
        }

        # Broadcast the snapshot immediately
        session_id = (
            getattr(invocation_ctx.session, "id", None)
            if invocation_ctx.session
            else None
        )
        broadcast_agent_network_update(network_snapshot, session_id)

        # Also store for legacy compatibility
        callback_context.state["agent_network_snapshot"] = network_snapshot

        logger.info(
            f"Generated network snapshot with {len(_network_state.agents)} agents and {len(_network_state.relationships)} relationships"
        )

    except Exception as e:
        logger.error(f"Error in agent_network_tracking_callback: {e}")


def get_current_network_state() -> dict[str, Any]:
    """Get the current agent network state for external access.

    Returns:
        Dictionary containing the current network state including agents,
        relationships, hierarchy, and metrics.
    """
    global _network_state

    return {
        "agents": {
            name: {
                "invocation_count": metrics.invocation_count,
                "average_execution_time": metrics.average_execution_time,
                "success_rate": metrics.success_count
                / (metrics.success_count + metrics.error_count)
                if (metrics.success_count + metrics.error_count) > 0
                else 1.0,
                "tools_used": list(metrics.tools_used),
                "last_invocation": metrics.last_invocation.isoformat()
                if metrics.last_invocation
                else None,
                "is_active": name in _network_state.active_agents,
            }
            for name, metrics in _network_state.agents.items()
        },
        "relationships": [
            {
                "source": rel.source_agent,
                "target": rel.target_agent,
                "type": rel.relationship_type,
                "interaction_count": rel.interaction_count,
                "data_flow": rel.data_flow,
                "last_interaction": rel.last_interaction.isoformat()
                if rel.last_interaction
                else None,
            }
            for rel in _network_state.relationships
        ],
        "hierarchy": _network_state.agent_hierarchy,
        "execution_stack": _network_state.execution_stack.copy(),
        "active_agents": list(_network_state.active_agents),
        "data_dependencies": {
            agent: list(deps)
            for agent, deps in _network_state.data_dependencies.items()
        },
    }


def reset_network_state() -> None:
    """Reset the global network state. Useful for testing or new sessions."""
    global _network_state
    _network_state = AgentNetworkState()
    logger.info("Agent network state reset")


def composite_after_agent_callback_with_research_sources(
    callback_context: CallbackContext,
) -> None:
    """Composite callback that combines research source collection with network tracking.

    This callback is specifically designed for the section_researcher and enhanced_search_executor
    agents that need both research source collection and network tracking functionality.

    Args:
        callback_context: The ADK callback context
    """
    try:
        # Import here to avoid circular imports
        from app.agent import collect_research_sources_callback

        # First run the existing research sources callback
        collect_research_sources_callback(callback_context)

        # Then run our network tracking callback
        after_agent_callback(callback_context)

    except Exception as e:
        logger.error(
            f"Error in composite_after_agent_callback_with_research_sources: {e}"
        )


def composite_after_agent_callback_with_citations(
    callback_context: CallbackContext,
) -> None:
    """Composite callback that combines citation replacement with network tracking.

    This callback is specifically designed for the report_composer agent that needs both
    citation replacement and network tracking functionality.

    Args:
        callback_context: The ADK callback context
    """
    try:
        # Import here to avoid circular imports
        from app.agent import citation_replacement_callback

        # First run our network tracking callback
        after_agent_callback(callback_context)

        # Then run the citation replacement callback
        citation_replacement_callback(callback_context)

    except Exception as e:
        logger.error(f"Error in composite_after_agent_callback_with_citations: {e}")
