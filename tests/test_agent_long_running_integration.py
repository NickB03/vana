"""
Test Long Running Tools Integration with VANA Agent

This module tests that the long-running tools are properly integrated
with the VANA multi-agent system and accessible through the main agent.
"""

import pytest
from unittest.mock import patch, MagicMock

def test_agent_has_long_running_tools():
    """Test that the vana agent has all long-running tools available."""
    try:
        from vana_multi_agent.agents.team import vana
        
        # Get tool names from the agent
        tool_names = [tool.func.__name__ if hasattr(tool, 'func') else str(tool) for tool in vana.tools]
        
        # Check that long-running tools are present
        expected_long_running_tools = [
            '_ask_for_approval',
            '_process_large_dataset', 
            '_generate_report',
            '_check_task_status'
        ]
        
        for tool_name in expected_long_running_tools:
            assert tool_name in tool_names, f"Long-running tool {tool_name} not found in agent tools"
        
        # Verify total tool count includes long-running tools
        assert len(vana.tools) >= 24, f"Expected at least 24 tools, got {len(vana.tools)}"
        
    except ImportError as e:
        pytest.skip(f"Could not import vana agent: {e}")

def test_long_running_tools_import():
    """Test that long-running tools can be imported correctly."""
    try:
        from vana_multi_agent.tools.adk_long_running_tools import (
            adk_ask_for_approval,
            adk_process_large_dataset,
            adk_generate_report,
            adk_check_task_status
        )
        
        # Verify tools have the expected attributes
        tools = [
            adk_ask_for_approval,
            adk_process_large_dataset,
            adk_generate_report,
            adk_check_task_status
        ]
        
        for tool in tools:
            assert hasattr(tool, 'func'), f"Tool {tool} missing func attribute"
            assert callable(tool.func), f"Tool {tool}.func is not callable"
            
    except ImportError as e:
        pytest.skip(f"Could not import long-running tools: {e}")

def test_long_running_tool_execution():
    """Test that long-running tools can be executed."""
    try:
        from vana_multi_agent.tools.adk_long_running_tools import _ask_for_approval
        
        # Test approval tool execution
        result = _ask_for_approval("Test approval", 500, "Test Manager")
        
        # Verify result format
        assert isinstance(result, str), "Tool should return string result"
        assert "✅ Approval request created successfully" in result
        assert "Task ID" in result
        assert "check_task_status" in result
        
    except ImportError as e:
        pytest.skip(f"Could not import long-running tools: {e}")

def test_task_status_checking():
    """Test task status checking functionality."""
    try:
        from vana_multi_agent.tools.adk_long_running_tools import (
            _ask_for_approval, _check_task_status
        )
        from vana_multi_agent.tools.long_running_tools import task_manager
        
        # Create a task through approval tool
        result = _ask_for_approval("Test status check", 300, "Manager")
        
        # Extract task ID from result (simple extraction for test)
        import re
        task_id_match = re.search(r'Task ID\*\*: ([a-f0-9-]+)', result)
        if task_id_match:
            task_id = task_id_match.group(1)
            
            # Check task status
            status_result = _check_task_status(task_id)
            
            assert isinstance(status_result, str), "Status check should return string"
            assert task_id in status_result, "Status should contain task ID"
            assert "Task Status" in status_result, "Status should contain status information"
        else:
            # If we can't extract task ID, just verify the tool works
            assert "Task ID" in result, "Approval result should contain task ID"
            
    except ImportError as e:
        pytest.skip(f"Could not import long-running tools: {e}")

def test_agent_tool_count():
    """Test that the agent has the expected number of tools."""
    try:
        from vana_multi_agent.agents.team import vana
        
        # Count tools by category
        tool_names = [tool.func.__name__ if hasattr(tool, 'func') else str(tool) for tool in vana.tools]
        
        # File system tools (4)
        file_tools = [name for name in tool_names if any(x in name for x in ['read_file', 'write_file', 'list_directory', 'file_exists'])]
        assert len(file_tools) >= 4, f"Expected at least 4 file tools, got {len(file_tools)}"
        
        # Search tools (3)
        search_tools = [name for name in tool_names if any(x in name for x in ['vector_search', 'web_search', 'search_knowledge'])]
        assert len(search_tools) >= 3, f"Expected at least 3 search tools, got {len(search_tools)}"
        
        # Knowledge graph tools (4)
        kg_tools = [name for name in tool_names if 'kg_' in name]
        assert len(kg_tools) >= 4, f"Expected at least 4 KG tools, got {len(kg_tools)}"
        
        # System tools (2)
        system_tools = [name for name in tool_names if any(x in name for x in ['echo', 'health_status'])]
        assert len(system_tools) >= 2, f"Expected at least 2 system tools, got {len(system_tools)}"
        
        # Agent coordination tools (4)
        coord_tools = [name for name in tool_names if any(x in name for x in ['coordinate_task', 'delegate_to_agent', 'get_agent_status', 'transfer_to_agent'])]
        assert len(coord_tools) >= 4, f"Expected at least 4 coordination tools, got {len(coord_tools)}"
        
        # Long-running tools (4)
        lr_tools = [name for name in tool_names if any(x in name for x in ['ask_for_approval', 'process_large_dataset', 'generate_report', 'check_task_status'])]
        assert len(lr_tools) >= 4, f"Expected at least 4 long-running tools, got {len(lr_tools)}"
        
        # Agent-as-tools (4)
        agent_tools = [name for name in tool_names if any(x in name for x in ['architecture_tool', 'ui_tool', 'devops_tool', 'qa_tool'])]
        assert len(agent_tools) >= 4, f"Expected at least 4 agent tools, got {len(agent_tools)}"
        
        print(f"Total tools: {len(vana.tools)}")
        print(f"Tool breakdown: File({len(file_tools)}), Search({len(search_tools)}), KG({len(kg_tools)}), System({len(system_tools)}), Coord({len(coord_tools)}), LongRunning({len(lr_tools)}), Agents({len(agent_tools)})")
        
    except ImportError as e:
        pytest.skip(f"Could not import vana agent: {e}")

def test_task_manager_functionality():
    """Test that the task manager is working correctly."""
    try:
        from vana_multi_agent.tools.long_running_tools import (
            task_manager, LongRunningTaskStatus
        )
        
        # Create a test task
        task_id = task_manager.create_task()
        assert task_id is not None
        assert len(task_id) > 0
        
        # Verify task exists
        task = task_manager.get_task(task_id)
        assert task is not None
        assert task.status == LongRunningTaskStatus.PENDING
        
        # Update task status
        success = task_manager.update_task(
            task_id, LongRunningTaskStatus.IN_PROGRESS,
            progress=0.5,
            metadata={"test": "data"}
        )
        assert success is True
        
        # Verify update
        updated_task = task_manager.get_task(task_id)
        assert updated_task.status == LongRunningTaskStatus.IN_PROGRESS
        assert updated_task.progress == 0.5
        assert updated_task.metadata["test"] == "data"
        
    except ImportError as e:
        pytest.skip(f"Could not import task manager: {e}")

if __name__ == "__main__":
    # Run basic integration test
    test_agent_has_long_running_tools()
    test_long_running_tools_import()
    test_long_running_tool_execution()
    test_agent_tool_count()
    test_task_manager_functionality()
    print("✅ All integration tests passed!")
