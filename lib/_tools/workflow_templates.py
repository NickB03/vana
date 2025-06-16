"""
Workflow Templates for Common Multi-Agent Patterns

This module provides predefined workflow templates for common multi-agent
coordination patterns and use cases.
"""

import logging
from typing import Any, Dict, List, Optional

from .workflow_engine import get_workflow_engine

logger = logging.getLogger(__name__)


class WorkflowTemplates:
    """Manages workflow templates for common patterns."""

    def __init__(self):
        """Initialize workflow templates."""
        self.templates = {
            "data_analysis": self._data_analysis_template,
            "code_execution": self._code_execution_template,
            "research_and_analysis": self._research_analysis_template,
            "content_creation": self._content_creation_template,
            "system_monitoring": self._system_monitoring_template,
            "multi_agent_collaboration": self._multi_agent_collaboration_template,
        }

    def get_available_templates(self) -> List[str]:
        """Get list of available workflow templates."""
        return list(self.templates.keys())

    def create_workflow_from_template(
        self, template_name: str, task_description: str, custom_params: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a workflow from a template."""
        if template_name not in self.templates:
            raise ValueError(f"Template '{template_name}' not found")

        template_func = self.templates[template_name]
        workflow_config = template_func(task_description, custom_params or {})

        # Create workflow using the engine
        workflow_engine = get_workflow_engine()
        workflow_id = workflow_engine.create_workflow(**workflow_config)

        logger.info(f"Created workflow from template '{template_name}': {workflow_id}")
        return workflow_id

    def _data_analysis_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for data analysis workflows."""
        return {
            "name": f"Data Analysis: {task_description[:50]}...",
            "description": f"Multi-step data analysis workflow: {task_description}",
            "template_name": "data_analysis",
            "strategy": params.get("strategy", "sequential"),
            "priority": params.get("priority", "medium"),
            "max_parallel_steps": params.get("max_parallel_steps", 2),
            "timeout_seconds": params.get("timeout_seconds", 3600),  # 1 hour
            "steps": [
                {
                    "name": "Data Validation",
                    "description": f"Validate and prepare data for analysis: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Statistical Analysis",
                    "description": f"Perform statistical analysis: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": ["step_1"],
                    "max_retries": 3,
                    "timeout_seconds": 900,
                },
                {
                    "name": "Visualization Generation",
                    "description": f"Generate visualizations and charts: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": ["step_2"],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Results Summary",
                    "description": f"Compile analysis results and insights: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_3"],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
            ],
            "metadata": {"template": "data_analysis", "domain": "analytics", "complexity": "medium"},
        }

    def _code_execution_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for code execution workflows."""
        return {
            "name": f"Code Execution: {task_description[:50]}...",
            "description": f"Secure code execution workflow: {task_description}",
            "template_name": "code_execution",
            "strategy": params.get("strategy", "sequential"),
            "priority": params.get("priority", "medium"),
            "max_parallel_steps": params.get("max_parallel_steps", 1),
            "timeout_seconds": params.get("timeout_seconds", 1800),  # 30 minutes
            "steps": [
                {
                    "name": "Code Validation",
                    "description": f"Validate code security and syntax: {task_description}",
                    "agent_name": "code_execution",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
                {
                    "name": "Code Execution",
                    "description": f"Execute code in secure environment: {task_description}",
                    "agent_name": "code_execution",
                    "dependencies": ["step_1"],
                    "max_retries": 3,
                    "timeout_seconds": 900,
                },
                {
                    "name": "Results Analysis",
                    "description": f"Analyze execution results and output: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_2"],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
            ],
            "metadata": {"template": "code_execution", "domain": "development", "complexity": "medium"},
        }

    def _research_analysis_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for research and analysis workflows."""
        return {
            "name": f"Research & Analysis: {task_description[:50]}...",
            "description": f"Comprehensive research and analysis workflow: {task_description}",
            "template_name": "research_and_analysis",
            "strategy": params.get("strategy", "pipeline"),
            "priority": params.get("priority", "medium"),
            "max_parallel_steps": params.get("max_parallel_steps", 3),
            "timeout_seconds": params.get("timeout_seconds", 2400),  # 40 minutes
            "steps": [
                {
                    "name": "Information Gathering",
                    "description": f"Gather relevant information and sources: {task_description}",
                    "agent_name": "memory",
                    "dependencies": [],
                    "max_retries": 3,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Web Research",
                    "description": f"Conduct web research for current information: {task_description}",
                    "agent_name": "specialists",
                    "dependencies": [],
                    "max_retries": 3,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Data Analysis",
                    "description": f"Analyze gathered data and information: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": ["step_1", "step_2"],
                    "max_retries": 2,
                    "timeout_seconds": 900,
                },
                {
                    "name": "Synthesis and Report",
                    "description": f"Synthesize findings into comprehensive report: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_3"],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
            ],
            "metadata": {"template": "research_and_analysis", "domain": "research", "complexity": "high"},
        }

    def _content_creation_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for content creation workflows."""
        return {
            "name": f"Content Creation: {task_description[:50]}...",
            "description": f"Multi-stage content creation workflow: {task_description}",
            "template_name": "content_creation",
            "strategy": params.get("strategy", "sequential"),
            "priority": params.get("priority", "medium"),
            "max_parallel_steps": params.get("max_parallel_steps", 2),
            "timeout_seconds": params.get("timeout_seconds", 2400),  # 40 minutes
            "steps": [
                {
                    "name": "Research and Planning",
                    "description": f"Research topic and plan content structure: {task_description}",
                    "agent_name": "memory",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Content Generation",
                    "description": f"Generate initial content draft: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_1"],
                    "max_retries": 3,
                    "timeout_seconds": 900,
                },
                {
                    "name": "Review and Enhancement",
                    "description": f"Review and enhance content quality: {task_description}",
                    "agent_name": "specialists",
                    "dependencies": ["step_2"],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
            ],
            "metadata": {"template": "content_creation", "domain": "content", "complexity": "medium"},
        }

    def _system_monitoring_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for system monitoring workflows."""
        return {
            "name": f"System Monitoring: {task_description[:50]}...",
            "description": f"Comprehensive system monitoring workflow: {task_description}",
            "template_name": "system_monitoring",
            "strategy": params.get("strategy", "parallel"),
            "priority": params.get("priority", "high"),
            "max_parallel_steps": params.get("max_parallel_steps", 4),
            "timeout_seconds": params.get("timeout_seconds", 1200),  # 20 minutes
            "steps": [
                {
                    "name": "Health Check",
                    "description": f"Perform system health check: {task_description}",
                    "agent_name": "vana",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
                {
                    "name": "Performance Analysis",
                    "description": f"Analyze system performance metrics: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Error Detection",
                    "description": f"Detect and analyze system errors: {task_description}",
                    "agent_name": "code_execution",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Status Report",
                    "description": f"Generate comprehensive status report: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_1", "step_2", "step_3"],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
            ],
            "metadata": {"template": "system_monitoring", "domain": "operations", "complexity": "medium"},
        }

    def _multi_agent_collaboration_template(self, task_description: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Template for complex multi-agent collaboration workflows."""
        return {
            "name": f"Multi-Agent Collaboration: {task_description[:50]}...",
            "description": f"Complex multi-agent collaboration workflow: {task_description}",
            "template_name": "multi_agent_collaboration",
            "strategy": params.get("strategy", "adaptive"),
            "priority": params.get("priority", "high"),
            "max_parallel_steps": params.get("max_parallel_steps", 5),
            "timeout_seconds": params.get("timeout_seconds", 3600),  # 1 hour
            "steps": [
                {
                    "name": "Task Analysis",
                    "description": f"Analyze task requirements and complexity: {task_description}",
                    "agent_name": "vana",
                    "dependencies": [],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
                {
                    "name": "Resource Planning",
                    "description": f"Plan resource allocation and agent assignments: {task_description}",
                    "agent_name": "orchestration",
                    "dependencies": ["step_1"],
                    "max_retries": 2,
                    "timeout_seconds": 300,
                },
                {
                    "name": "Parallel Execution",
                    "description": f"Execute parallel subtasks across agents: {task_description}",
                    "agent_name": "specialists",
                    "dependencies": ["step_2"],
                    "max_retries": 3,
                    "timeout_seconds": 1800,
                },
                {
                    "name": "Results Integration",
                    "description": f"Integrate results from parallel execution: {task_description}",
                    "agent_name": "data_science",
                    "dependencies": ["step_3"],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
                {
                    "name": "Final Synthesis",
                    "description": f"Synthesize final results and recommendations: {task_description}",
                    "agent_name": "vana",
                    "dependencies": ["step_4"],
                    "max_retries": 2,
                    "timeout_seconds": 600,
                },
            ],
            "metadata": {"template": "multi_agent_collaboration", "domain": "orchestration", "complexity": "high"},
        }


# Global workflow templates instance
_workflow_templates = None


def get_workflow_templates() -> WorkflowTemplates:
    """Get the global workflow templates instance."""
    global _workflow_templates
    if _workflow_templates is None:
        _workflow_templates = WorkflowTemplates()
    return _workflow_templates
