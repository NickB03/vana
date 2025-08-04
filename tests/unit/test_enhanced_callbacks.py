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

"""Tests for enhanced callbacks system."""

import pytest
import time
from unittest.mock import Mock, MagicMock, patch
from datetime import datetime

from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events.event import Event

from app.enhanced_callbacks import (
    before_agent_callback,
    after_agent_callback,
    agent_network_tracking_callback,
    AgentMetrics,
    AgentRelationship,
    AgentNetworkState,
    get_current_network_state,
    reset_network_state,
    _network_state
)


class TestAgentMetrics:
    """Test cases for AgentMetrics class."""
    
    def test_initial_state(self):
        """Test that AgentMetrics initializes with correct default values."""
        metrics = AgentMetrics()
        
        assert metrics.invocation_count == 0
        assert metrics.total_execution_time == 0.0
        assert metrics.average_execution_time == 0.0
        assert metrics.last_invocation is None
        assert metrics.confidence_scores == []
        assert metrics.error_count == 0
        assert metrics.success_count == 0
        assert metrics.tools_used == set()
    
    def test_update_timing(self):
        """Test timing metrics update correctly."""
        metrics = AgentMetrics()
        
        metrics.update_timing(1.5)
        assert metrics.invocation_count == 1
        assert metrics.total_execution_time == 1.5
        assert metrics.average_execution_time == 1.5
        assert metrics.last_invocation is not None
        
        metrics.update_timing(2.5)
        assert metrics.invocation_count == 2
        assert metrics.total_execution_time == 4.0
        assert metrics.average_execution_time == 2.0
    
    def test_confidence_scores(self):
        """Test confidence score management."""
        metrics = AgentMetrics()
        
        # Add some scores
        for i in range(5):
            metrics.add_confidence_score(0.1 * (i + 1))
        
        assert len(metrics.confidence_scores) == 5
        # Check with small tolerance for floating point precision
        expected = [0.1, 0.2, 0.3, 0.4, 0.5]
        for i, score in enumerate(metrics.confidence_scores):
            assert abs(score - expected[i]) < 1e-10
        
        # Test that only last 100 scores are kept
        for i in range(100):
            metrics.add_confidence_score(0.8)
        
        assert len(metrics.confidence_scores) == 100
        assert all(score == 0.8 for score in metrics.confidence_scores[-95:])
    
    def test_success_and_error_tracking(self):
        """Test success and error count tracking."""
        metrics = AgentMetrics()
        
        metrics.record_success()
        metrics.record_success()
        metrics.record_error()
        
        assert metrics.success_count == 2
        assert metrics.error_count == 1
    
    def test_tool_usage_tracking(self):
        """Test tool usage tracking."""
        metrics = AgentMetrics()
        
        metrics.add_tool_usage("search_tool")
        metrics.add_tool_usage("analysis_tool")
        metrics.add_tool_usage("search_tool")  # Duplicate should not increase count
        
        assert metrics.tools_used == {"search_tool", "analysis_tool"}


class TestAgentRelationship:
    """Test cases for AgentRelationship class."""
    
    def test_initialization(self):
        """Test AgentRelationship initialization."""
        rel = AgentRelationship("agent_a", "agent_b", "invokes")
        
        assert rel.source_agent == "agent_a"
        assert rel.target_agent == "agent_b"
        assert rel.relationship_type == "invokes"
        assert rel.data_flow == []
        assert rel.interaction_count == 0
        assert rel.last_interaction is None
    
    def test_record_interaction(self):
        """Test interaction recording."""
        rel = AgentRelationship("agent_a", "agent_b", "invokes")
        
        rel.record_interaction(["key1", "key2"])
        
        assert rel.interaction_count == 1
        assert rel.data_flow == ["key1", "key2"]
        assert rel.last_interaction is not None
        
        rel.record_interaction(["key3"])
        
        assert rel.interaction_count == 2
        assert rel.data_flow == ["key1", "key2", "key3"]


class TestAgentNetworkState:
    """Test cases for AgentNetworkState class."""
    
    def setup_method(self):
        """Set up test environment."""
        self.network_state = AgentNetworkState()
    
    def test_get_or_create_agent_metrics(self):
        """Test agent metrics creation and retrieval."""
        metrics = self.network_state.get_or_create_agent_metrics("test_agent")
        
        assert isinstance(metrics, AgentMetrics)
        assert "test_agent" in self.network_state.agents
        
        # Getting the same agent should return the same instance
        metrics2 = self.network_state.get_or_create_agent_metrics("test_agent")
        assert metrics is metrics2
    
    def test_add_relationship(self):
        """Test relationship addition and updating."""
        self.network_state.add_relationship("agent_a", "agent_b", "invokes", ["data1"])
        
        assert len(self.network_state.relationships) == 1
        rel = self.network_state.relationships[0]
        assert rel.source_agent == "agent_a"
        assert rel.target_agent == "agent_b"
        assert rel.relationship_type == "invokes"
        assert rel.interaction_count == 1
        
        # Adding the same relationship should update the existing one
        self.network_state.add_relationship("agent_a", "agent_b", "invokes", ["data2"])
        
        assert len(self.network_state.relationships) == 1
        assert rel.interaction_count == 2
        assert rel.data_flow == ["data1", "data2"]
    
    def test_execution_stack(self):
        """Test execution stack management."""
        self.network_state.push_agent("agent_a")
        self.network_state.push_agent("agent_b")
        
        assert self.network_state.execution_stack == ["agent_a", "agent_b"]
        assert self.network_state.active_agents == {"agent_a", "agent_b"}
        
        popped = self.network_state.pop_agent()
        assert popped == "agent_b"
        assert self.network_state.execution_stack == ["agent_a"]
        assert self.network_state.active_agents == {"agent_a"}
    
    def test_hierarchy_setting(self):
        """Test agent hierarchy management."""
        self.network_state.set_hierarchy("parent_agent", ["child1", "child2"])
        
        assert self.network_state.agent_hierarchy["parent_agent"] == ["child1", "child2"]
        
        # Check that relationships were created
        parent_child_rels = [rel for rel in self.network_state.relationships 
                           if rel.relationship_type in ["parent_of", "child_of"]]
        assert len(parent_child_rels) == 4  # 2 parent_of + 2 child_of
    
    def test_data_dependencies(self):
        """Test data dependency tracking."""
        self.network_state.add_data_dependency("agent_a", "data_key1")
        self.network_state.add_data_dependency("agent_a", "data_key2")
        self.network_state.add_data_dependency("agent_b", "data_key1")
        
        assert self.network_state.data_dependencies["agent_a"] == {"data_key1", "data_key2"}
        assert self.network_state.data_dependencies["agent_b"] == {"data_key1"}


class TestCallbackFunctions:
    """Test cases for callback functions."""
    
    def setup_method(self):
        """Set up test environment."""
        reset_network_state()
        
        # Create mock objects
        self.mock_agent = Mock()
        self.mock_agent.name = "test_agent"
        
        self.mock_session = Mock()
        self.mock_session.id = "test_session_123"
        self.mock_session.state = {"key1": "value1", "key2": "value2"}
        self.mock_session.events = []
        
        self.mock_invocation_context = Mock(spec=InvocationContext)
        self.mock_invocation_context.agent = self.mock_agent
        self.mock_invocation_context.session = self.mock_session
        
        self.mock_callback_context = Mock(spec=CallbackContext)
        self.mock_callback_context._invocation_context = self.mock_invocation_context
        self.mock_callback_context.state = {}
    
    @patch('app.enhanced_callbacks.broadcast_agent_network_update')
    @patch('app.enhanced_callbacks.logger')
    def test_before_agent_callback(self, mock_logger, mock_broadcast):
        """Test before_agent_callback functionality."""
        # Reset network state before test
        reset_network_state()
        
        # Add debug prints
        print(f"Agent name: {self.mock_invocation_context.agent.name}")
        print(f"Session state: {self.mock_invocation_context.session.state}")
        
        try:
            before_agent_callback(self.mock_callback_context)
        except Exception as e:
            print(f"Exception in callback: {e}")
            raise
        
        print(f"Network state after callback: {_network_state.execution_stack}")
        
        # Check if an error was logged
        if mock_logger.error.called:
            print(f"Error logged: {mock_logger.error.call_args}")
        
        # Check that network state was updated
        assert "test_agent" in _network_state.execution_stack
        assert "test_agent" in _network_state.active_agents
        assert "test_agent" in _network_state.agents
        
        # Check that broadcast was called
        mock_broadcast.assert_called_once()
        call_args = mock_broadcast.call_args
        network_event = call_args[0][0]
        session_id = call_args[0][1]
        
        assert network_event["type"] == "agent_network_update"
        assert network_event["data"]["event_type"] == "agent_start"
        assert network_event["data"]["agent_name"] == "test_agent"
        assert session_id == "test_session_123"
        
        # Check that state was stored
        assert "agent_network_event" in self.mock_callback_context.state
    
    @patch('app.enhanced_callbacks.broadcast_agent_network_update')
    def test_after_agent_callback(self, mock_broadcast):
        """Test after_agent_callback functionality."""
        # Set up the before state
        self.mock_callback_context.state["test_agent_start_time"] = time.time() - 1.5
        _network_state.push_agent("test_agent")
        
        after_agent_callback(self.mock_callback_context)
        
        # Check that network state was updated
        assert "test_agent" not in _network_state.active_agents
        metrics = _network_state.agents["test_agent"]
        assert metrics.invocation_count == 1
        assert metrics.average_execution_time > 0
        assert metrics.success_count == 1
        
        # Check that broadcast was called
        mock_broadcast.assert_called_once()
        call_args = mock_broadcast.call_args
        network_event = call_args[0][0]
        
        assert network_event["type"] == "agent_network_update"
        assert network_event["data"]["event_type"] == "agent_complete"
        assert network_event["data"]["agent_name"] == "test_agent"
        assert "execution_time" in network_event["data"]
        assert "metrics" in network_event["data"]
    
    @patch('app.enhanced_callbacks.broadcast_agent_network_update')
    def test_agent_network_tracking_callback(self, mock_broadcast):
        """Test comprehensive network tracking callback."""
        # Add some mock events to the session
        mock_event1 = Mock()
        mock_event1.author = "test_agent"
        mock_event1.content = Mock()
        mock_event1.content.parts = []
        mock_event1.actions = None
        
        mock_event2 = Mock()
        mock_event2.author = "other_agent"
        mock_event2.content = Mock()
        mock_event2.content.parts = []
        mock_event2.actions = None
        
        self.mock_session.events = [mock_event1, mock_event2]
        
        agent_network_tracking_callback(self.mock_callback_context)
        
        # Check that comprehensive snapshot was generated
        mock_broadcast.assert_called_once()
        call_args = mock_broadcast.call_args
        network_snapshot = call_args[0][0]
        
        assert network_snapshot["type"] == "agent_network_snapshot"
        assert "agents" in network_snapshot["data"]
        assert "relationships" in network_snapshot["data"]
        assert "hierarchy" in network_snapshot["data"]
        assert "timestamp" in network_snapshot["data"]
    
    def test_get_current_network_state(self):
        """Test network state retrieval."""
        # Set up some network state
        _network_state.get_or_create_agent_metrics("agent1")
        _network_state.get_or_create_agent_metrics("agent2")
        _network_state.add_relationship("agent1", "agent2", "invokes")
        _network_state.set_hierarchy("parent", ["child1", "child2"])
        
        state = get_current_network_state()
        
        assert "agents" in state
        assert "relationships" in state
        assert "hierarchy" in state
        assert "execution_stack" in state
        assert "active_agents" in state
        assert "data_dependencies" in state
        
        assert len(state["agents"]) == 2
        assert len(state["relationships"]) >= 1  # At least the direct relationship
        assert "parent" in state["hierarchy"]
    
    def test_reset_network_state(self):
        """Test network state reset functionality."""
        # Set up some network state
        _network_state.get_or_create_agent_metrics("agent1")
        _network_state.push_agent("agent1")
        _network_state.add_relationship("agent1", "agent2", "invokes")
        
        assert len(_network_state.agents) > 0
        assert len(_network_state.active_agents) > 0
        assert len(_network_state.relationships) > 0
        
        reset_network_state()
        
        assert len(_network_state.agents) == 0
        assert len(_network_state.active_agents) == 0
        assert len(_network_state.relationships) == 0
        assert len(_network_state.execution_stack) == 0


class TestErrorHandling:
    """Test cases for error handling in callbacks."""
    
    def setup_method(self):
        """Set up test environment."""
        reset_network_state()
    
    def test_before_agent_callback_with_none_agent(self):
        """Test before_agent_callback handles None agent gracefully."""
        mock_invocation_context = Mock()
        mock_invocation_context.agent = None
        mock_invocation_context.session = Mock()
        mock_invocation_context.session.state = {}
        
        mock_callback_context = Mock()
        mock_callback_context.invocation_context = mock_invocation_context
        mock_callback_context.state = {}
        
        # Should not raise an exception
        before_agent_callback(mock_callback_context)
        
        # Agent should be recorded as "unknown"
        assert "unknown" in _network_state.execution_stack
    
    def test_after_agent_callback_without_start_time(self):
        """Test after_agent_callback handles missing start time gracefully."""
        mock_invocation_context = Mock()
        mock_invocation_context.agent = Mock()
        mock_invocation_context.agent.name = "test_agent"
        mock_invocation_context.session = Mock()
        mock_invocation_context.session.events = []
        
        mock_callback_context = Mock()
        mock_callback_context.invocation_context = mock_invocation_context
        mock_callback_context.state = {}  # No start time
        
        _network_state.push_agent("test_agent")
        
        # Should not raise an exception
        after_agent_callback(mock_callback_context)
        
        # Should still record metrics
        assert "test_agent" in _network_state.agents
    
    @patch('app.enhanced_callbacks.logger')
    def test_callback_exception_handling(self, mock_logger):
        """Test that callback exceptions are logged and don't crash."""
        mock_callback_context = Mock()
        mock_callback_context.invocation_context = Mock()
        mock_callback_context.invocation_context.agent = Mock()
        mock_callback_context.invocation_context.agent.name = "test_agent"
        # Cause an exception by setting session to None
        mock_callback_context.invocation_context.session = None
        mock_callback_context.state = {}
        
        # Should not raise an exception, but should log error
        before_agent_callback(mock_callback_context)
        
        # Check that error was logged
        mock_logger.error.assert_called()
        error_call = mock_logger.error.call_args[0][0]
        assert "Error in before_agent_callback" in error_call


if __name__ == "__main__":
    pytest.main([__file__])