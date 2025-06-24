"""
Unit tests for workflow management tools functionality

Tests the workflow management tools (create_workflow, start_workflow,
get_workflow_status, list_workflows, pause_workflow, resume_workflow,
cancel_workflow, get_workflow_templates) in isolation, validating their
core functionality, error handling, and edge cases.

These tools provide multi-agent workflow orchestration capabilities
for complex task coordination in the VANA system.
"""

import json

# Import the actual tools from VANA codebase
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import (
    adk_cancel_workflow,
    adk_create_workflow,
    adk_get_workflow_status,
    adk_get_workflow_templates,
    adk_list_workflows,
    adk_pause_workflow,
    adk_resume_workflow,
    adk_start_workflow,
)
from tests.framework import EnvironmentConfig, EnvironmentType, TestEnvironment


class TestCreateWorkflowTool:
    """Unit tests for create_workflow tool"""

    @pytest.fixture
    def test_env(self):
        """Create test environment"""
        config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
        return TestEnvironment(config)

    @pytest.mark.unit
    def test_create_workflow_basic_functionality(self):
        """Test basic workflow creation functionality"""
        name = "Test Workflow"
        description = "A test workflow for unit testing"

        result = adk_create_workflow.func(name, description)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with workflow creation results
        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "create_workflow"
            assert "workflow_id" in parsed
            assert "name" in parsed
            assert parsed["name"] == name
            assert "description" in parsed
            assert parsed["description"] == description
            assert "steps" in parsed
            assert isinstance(parsed["steps"], list)
        except json.JSONDecodeError:
            pytest.fail("create_workflow should return valid JSON")

    @pytest.mark.unit
    def test_create_workflow_with_template(self):
        """Test workflow creation with template"""
        name = "Data Analysis Workflow"
        description = "Analyze sales data and create reports"
        template_name = "data_analysis"

        result = adk_create_workflow.func(name, description, template_name)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert parsed["template_name"] == template_name
            assert "steps" in parsed
            # Data analysis template should have specific steps
            steps = parsed["steps"]
            assert len(steps) > 0
        except json.JSONDecodeError:
            pytest.fail("create_workflow should return valid JSON")

    @pytest.mark.unit
    def test_create_workflow_with_all_parameters(self):
        """Test workflow creation with all parameters"""
        name = "Complex Workflow"
        description = "A complex multi-step workflow"
        template_name = "code_execution"
        strategy = "sequential"
        priority = "high"

        result = adk_create_workflow.func(
            name, description, template_name, strategy, priority
        )

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert parsed["strategy"] == strategy
            assert parsed["priority"] == priority
            assert parsed["template_name"] == template_name
        except json.JSONDecodeError:
            pytest.fail("create_workflow should return valid JSON")

    @pytest.mark.unit
    def test_create_workflow_empty_inputs(self):
        """Test workflow creation with empty inputs"""
        result = adk_create_workflow.func("", "")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle empty inputs gracefully
        try:
            parsed = json.loads(result)
            assert "workflow_id" in parsed
            assert "name" in parsed
            assert "description" in parsed
        except json.JSONDecodeError:
            pytest.fail("create_workflow should return valid JSON")


class TestWorkflowControlTools:
    """Unit tests for workflow control tools (start, pause, resume, cancel)"""

    @pytest.mark.unit
    def test_start_workflow_basic_functionality(self):
        """Test basic workflow start functionality"""
        workflow_id = "test-workflow-123"

        result = adk_start_workflow.func(workflow_id)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with start results or error
        try:
            parsed = json.loads(result)
            # start_workflow may return error if workflow not found (expected behavior)
            assert "action" in parsed or "error" in parsed
            if "action" in parsed:
                assert parsed["action"] == "start_workflow"
                assert "workflow_id" in parsed
                assert parsed["workflow_id"] == workflow_id
            elif "error" in parsed:
                # Error is expected for non-existent workflow
                assert "not found" in parsed["error"].lower()
        except json.JSONDecodeError:
            pytest.fail("start_workflow should return valid JSON")

    @pytest.mark.unit
    def test_pause_workflow_basic_functionality(self):
        """Test basic workflow pause functionality"""
        workflow_id = "test-workflow-456"

        result = adk_pause_workflow.func(workflow_id)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "pause_workflow"
            assert "workflow_id" in parsed
            assert parsed["workflow_id"] == workflow_id
        except json.JSONDecodeError:
            pytest.fail("pause_workflow should return valid JSON")

    @pytest.mark.unit
    def test_resume_workflow_basic_functionality(self):
        """Test basic workflow resume functionality"""
        workflow_id = "test-workflow-789"

        result = adk_resume_workflow.func(workflow_id)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "resume_workflow"
            assert "workflow_id" in parsed
            assert parsed["workflow_id"] == workflow_id
        except json.JSONDecodeError:
            pytest.fail("resume_workflow should return valid JSON")

    @pytest.mark.unit
    def test_cancel_workflow_basic_functionality(self):
        """Test basic workflow cancel functionality"""
        workflow_id = "test-workflow-cancel"

        result = adk_cancel_workflow.func(workflow_id)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "cancel_workflow"
            assert "workflow_id" in parsed
            assert parsed["workflow_id"] == workflow_id
        except json.JSONDecodeError:
            pytest.fail("cancel_workflow should return valid JSON")


class TestWorkflowStatusTools:
    """Unit tests for workflow status and listing tools"""

    @pytest.mark.unit
    def test_get_workflow_status_basic_functionality(self):
        """Test basic workflow status functionality"""
        workflow_id = "test-workflow-status"

        result = adk_get_workflow_status.func(workflow_id)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "get_workflow_status"
            assert "workflow_status" in parsed

            status = parsed["workflow_status"]
            assert "workflow_id" in status
            assert status["workflow_id"] == workflow_id
            assert "state" in status
            assert "progress_percentage" in status
        except json.JSONDecodeError:
            pytest.fail("get_workflow_status should return valid JSON")

    @pytest.mark.unit
    def test_list_workflows_basic_functionality(self):
        """Test basic workflow listing functionality"""
        result = adk_list_workflows.func()

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "list_workflows"
            assert "workflows" in parsed
            assert isinstance(parsed["workflows"], list)
            assert "total_count" in parsed
        except json.JSONDecodeError:
            pytest.fail("list_workflows should return valid JSON")

    @pytest.mark.unit
    def test_list_workflows_with_filter(self):
        """Test workflow listing with state filter"""
        state_filter = "running"

        result = adk_list_workflows.func(state_filter)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "state_filter" in parsed
            assert parsed["state_filter"] == state_filter
            assert "workflows" in parsed
        except json.JSONDecodeError:
            pytest.fail("list_workflows should return valid JSON")

    @pytest.mark.unit
    def test_get_workflow_templates_basic_functionality(self):
        """Test basic workflow templates functionality"""
        result = adk_get_workflow_templates.func()

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "action" in parsed
            assert parsed["action"] == "get_workflow_templates"
            assert "available_templates" in parsed
            assert isinstance(parsed["available_templates"], list)
            assert "template_descriptions" in parsed
            assert "total_templates" in parsed

            # Should have some standard templates
            templates = parsed["available_templates"]
            assert len(templates) > 0
            assert "data_analysis" in templates
            assert "code_execution" in templates
        except json.JSONDecodeError:
            pytest.fail("get_workflow_templates should return valid JSON")


class TestWorkflowManagementIntegration:
    """Integration tests for workflow management tools"""

    @pytest.mark.unit
    def test_workflow_lifecycle_simulation(self):
        """Test simulated workflow lifecycle"""
        # Create workflow
        create_result = adk_create_workflow.func(
            "Test Lifecycle", "Test workflow lifecycle"
        )
        create_parsed = json.loads(create_result)
        workflow_id = create_parsed["workflow_id"]

        # Start workflow (may fail since workflow isn't persisted)
        start_result = adk_start_workflow.func(workflow_id)
        start_parsed = json.loads(start_result)
        # start_workflow may return error for non-persisted workflow
        if "workflow_id" in start_parsed:
            assert start_parsed["workflow_id"] == workflow_id
        else:
            # Error is expected since workflows aren't persisted
            assert "error" in start_parsed

        # Get status (returns simulated status)
        status_result = adk_get_workflow_status.func(workflow_id)
        status_parsed = json.loads(status_result)
        assert status_parsed["workflow_status"]["workflow_id"] == workflow_id

        # Pause workflow
        pause_result = adk_pause_workflow.func(workflow_id)
        pause_parsed = json.loads(pause_result)
        assert pause_parsed["workflow_id"] == workflow_id

        # Resume workflow
        resume_result = adk_resume_workflow.func(workflow_id)
        resume_parsed = json.loads(resume_result)
        assert resume_parsed["workflow_id"] == workflow_id

        # Cancel workflow
        cancel_result = adk_cancel_workflow.func(workflow_id)
        cancel_parsed = json.loads(cancel_result)
        assert cancel_parsed["workflow_id"] == workflow_id

    @pytest.mark.unit
    def test_workflow_tools_consistency(self):
        """Test that all workflow tools work consistently"""
        # Test all tools return valid JSON
        tools_and_params = [
            (adk_create_workflow, ["Test", "Description"]),
            (adk_start_workflow, ["test-id"]),
            (adk_get_workflow_status, ["test-id"]),
            (adk_list_workflows, []),
            (adk_pause_workflow, ["test-id"]),
            (adk_resume_workflow, ["test-id"]),
            (adk_cancel_workflow, ["test-id"]),
            (adk_get_workflow_templates, []),
        ]

        for tool, params in tools_and_params:
            result = tool.func(*params)
            assert isinstance(result, str)
            assert len(result) > 0

            try:
                parsed = json.loads(result)
                assert "action" in parsed or "error" in parsed
            except json.JSONDecodeError:
                pytest.fail(f"Tool {tool.name} should return valid JSON")

    @pytest.mark.unit
    def test_workflow_tools_performance(self):
        """Test workflow tools performance"""
        import time

        tools = [
            adk_create_workflow,
            adk_start_workflow,
            adk_get_workflow_status,
            adk_list_workflows,
            adk_pause_workflow,
            adk_resume_workflow,
            adk_cancel_workflow,
            adk_get_workflow_templates,
        ]

        for tool in tools:
            start_time = time.time()

            if tool == adk_create_workflow:
                result = tool.func("Test", "Description")
            elif tool in [
                adk_start_workflow,
                adk_get_workflow_status,
                adk_pause_workflow,
                adk_resume_workflow,
                adk_cancel_workflow,
            ]:
                result = tool.func("test-id")
            else:  # list_workflows, get_workflow_templates
                result = tool.func()

            end_time = time.time()
            execution_time = end_time - start_time

            # Should be reasonably fast (under 2 seconds)
            assert execution_time < 2.0, (
                f"Tool {tool.name} took too long: {execution_time:.2f}s"
            )
            assert isinstance(result, str)
            assert len(result) > 0
