"""
Enhanced Hierarchical Task Manager (Phase 2)
Integrates Tool Registry, Enhanced Complexity Analysis, and Security-First Routing
"""

import os
import sys
from typing import Any, Dict, List, Optional

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agents.data_science.specialist import data_science_specialist
from agents.orchestration.enhanced_complexity_analyzer import (
    EnhancedComplexityAnalyzer,
    TaskAnalysisResult,
    TaskComplexity,
    TaskDomain,
    TaskType,
)
from agents.specialists import (
    architecture_specialist,
    devops_specialist,
    qa_specialist,
    security_specialist,
    ui_specialist,
)
from lib._tools import adk_transfer_to_agent
from lib._tools.registry import ToolCategory, get_tool_registry


class EnhancedHierarchicalTaskManager:
    """
    Enhanced task manager with Phase 2 improvements:
    - Tool Registry integration
    - Enhanced complexity analysis
    - Security-first routing
    - Domain-aware specialist selection
    """

    def __init__(self):
        self.analyzer = EnhancedComplexityAnalyzer()
        self.tool_registry = get_tool_registry()

        # Map domains to specialist agents
        self.domain_specialist_map = {
            TaskDomain.SECURITY: security_specialist,
            TaskDomain.ARCHITECTURE: architecture_specialist,
            TaskDomain.INFRASTRUCTURE: devops_specialist,
            TaskDomain.DATA_SCIENCE: data_science_specialist,
            TaskDomain.USER_INTERFACE: ui_specialist,
            TaskDomain.QUALITY_ASSURANCE: qa_specialist,
        }

        # Workflow strategies
        self.workflow_strategies = {
            "security_first_workflow": self._security_first_workflow,
            "single_specialist": self._single_specialist_workflow,
            "parallel_specialist_analysis": self._parallel_analysis_workflow,
            "sequential_workflow": self._sequential_workflow,
            "phased_project_workflow": self._phased_project_workflow,
            "hierarchical_decomposition": self._hierarchical_decomposition,
            "adaptive_workflow": self._adaptive_workflow,
        }

    def analyze_and_route_task(self, task_description: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main entry point for task analysis and routing

        Args:
            task_description: The task to analyze and route
            context: Optional context information

        Returns:
            Routing decision with analysis results
        """
        # Perform enhanced analysis
        analysis = self.analyzer.analyze_task(task_description, context)

        # Check for security-critical tasks first
        if analysis.security_relevance >= 0.7 or analysis.complexity == TaskComplexity.CRITICAL:
            return self._handle_security_critical_task(analysis, task_description)

        # Route based on recommended approach
        workflow_handler = self.workflow_strategies.get(analysis.recommended_approach, self._adaptive_workflow)

        return workflow_handler(analysis, task_description)

    def _handle_security_critical_task(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Handle security-critical tasks with elevated priority"""
        return {
            "routing_decision": "SECURITY_CRITICAL",
            "analysis": analysis,
            "workflow": "security_first_workflow",
            "specialists": ["security_specialist"] + analysis.required_specialists[1:],
            "priority": "CRITICAL",
            "message": f"🔒 SECURITY CRITICAL: Task requires immediate security review. "
            f"Routing to Security Specialist with elevated priority.",
            "security_requirements": {
                "pre_execution_audit": True,
                "continuous_monitoring": True,
                "post_execution_validation": True,
                "compliance_check": analysis.risk_assessment.get("compliance_risk") == "high",
            },
        }

    def _security_first_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Security-first workflow implementation"""
        specialists = ["security_specialist"]

        # Add other required specialists after security
        for specialist in analysis.required_specialists:
            if specialist not in specialists:
                specialists.append(specialist)

        return {
            "workflow": "security_first",
            "phases": [
                {
                    "phase": "Security Assessment",
                    "specialist": "security_specialist",
                    "tasks": ["Vulnerability scan", "Risk assessment", "Compliance check"],
                },
                {
                    "phase": "Secure Implementation",
                    "specialists": specialists[1:],
                    "tasks": ["Implement with security guidelines", "Apply security controls"],
                },
                {
                    "phase": "Security Validation",
                    "specialist": "security_specialist",
                    "tasks": ["Post-implementation audit", "Penetration testing", "Sign-off"],
                },
            ],
            "estimated_duration": analysis.estimated_effort,
            "priority": analysis.priority_level,
        }

    def _single_specialist_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Route to single specialist"""
        specialist = analysis.required_specialists[0] if analysis.required_specialists else "architecture_specialist"

        # Get optimized tools for the specialist
        tools = self.tool_registry.get_tools_for_agent(specialist)

        return {
            "workflow": "single_specialist",
            "specialist": specialist,
            "domain": analysis.primary_domain,
            "task_type": analysis.task_type,
            "assigned_tools": [tool.name for tool in tools],
            "estimated_duration": analysis.estimated_effort,
            "priority": analysis.priority_level,
            "routing_confidence": analysis.confidence_score,
        }

    def _parallel_analysis_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Parallel specialist analysis"""
        return {
            "workflow": "parallel_analysis",
            "specialists": analysis.required_specialists,
            "execution_plan": {"type": "parallel", "timeout": "2 hours", "aggregation": "consensus_based"},
            "domains": [analysis.primary_domain] + analysis.secondary_domains,
            "estimated_duration": analysis.estimated_effort,
            "priority": analysis.priority_level,
        }

    def _sequential_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Sequential workflow execution"""
        phases = []

        # Order specialists based on task flow
        ordered_specialists = self._order_specialists_for_sequential(analysis.required_specialists, analysis.task_type)

        for i, specialist in enumerate(ordered_specialists):
            phases.append(
                {
                    "phase": i + 1,
                    "specialist": specialist,
                    "dependencies": phases[i - 1]["phase"] if i > 0 else None,
                    "deliverables": self._get_specialist_deliverables(specialist, analysis.task_type),
                }
            )

        return {
            "workflow": "sequential",
            "phases": phases,
            "total_phases": len(phases),
            "estimated_duration": analysis.estimated_effort,
            "priority": analysis.priority_level,
        }

    def _phased_project_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Phased project workflow for complex tasks"""
        project_phases = [
            {
                "name": "Discovery & Planning",
                "duration": "20%",
                "specialists": ["architecture_specialist"],
                "deliverables": ["Requirements", "Architecture", "Project plan"],
            },
            {
                "name": "Design & Prototyping",
                "duration": "25%",
                "specialists": analysis.required_specialists[:2],
                "deliverables": ["Detailed design", "Prototypes", "Technical specs"],
            },
            {
                "name": "Implementation",
                "duration": "35%",
                "specialists": analysis.required_specialists,
                "deliverables": ["Working code", "Documentation", "Tests"],
            },
            {
                "name": "Testing & Optimization",
                "duration": "15%",
                "specialists": ["qa_specialist"] + analysis.required_specialists[-1:],
                "deliverables": ["Test results", "Performance metrics", "Optimizations"],
            },
            {
                "name": "Deployment & Handover",
                "duration": "5%",
                "specialists": ["devops_specialist"],
                "deliverables": ["Deployed system", "Operations guide", "Training"],
            },
        ]

        return {
            "workflow": "phased_project",
            "project_phases": project_phases,
            "total_duration": analysis.estimated_effort,
            "priority": analysis.priority_level,
            "risk_mitigation": analysis.risk_assessment,
        }

    def _hierarchical_decomposition(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Hierarchical decomposition for enterprise tasks"""
        # Decompose into major work streams
        work_streams = self._decompose_enterprise_task(task_description, analysis)

        return {
            "workflow": "hierarchical_decomposition",
            "complexity": "ENTERPRISE",
            "work_streams": work_streams,
            "governance": {
                "steering_committee": ["architecture_specialist", "security_specialist"],
                "project_managers": self._assign_project_managers(work_streams),
                "escalation_path": "Master Orchestrator → VANA Chat",
            },
            "estimated_duration": analysis.estimated_effort,
            "priority": "CRITICAL",  # Enterprise tasks are always critical
            "parallel_streams": min(3, len(work_streams)),  # Max 3 parallel streams
        }

    def _adaptive_workflow(self, analysis: TaskAnalysisResult, task_description: str) -> Dict[str, Any]:
        """Adaptive workflow that adjusts based on progress"""
        return {
            "workflow": "adaptive",
            "initial_strategy": "exploratory",
            "specialists_pool": analysis.required_specialists,
            "adaptation_triggers": [
                "complexity_increase",
                "blocker_encountered",
                "security_issue_found",
                "scope_change",
            ],
            "fallback_strategies": ["escalate_to_senior", "add_specialist", "switch_to_parallel", "decompose_further"],
            "estimated_duration": f"{analysis.estimated_effort} (adaptive)",
            "priority": analysis.priority_level,
        }

    def _order_specialists_for_sequential(self, specialists: List[str], task_type: TaskType) -> List[str]:
        """Order specialists for sequential execution"""
        # Define execution order based on task type
        order_map = {
            TaskType.IMPLEMENTATION: [
                "architecture_specialist",
                "security_specialist",
                "devops_specialist",
                "ui_specialist",
                "qa_specialist",
            ],
            TaskType.ANALYSIS: [
                "security_specialist",
                "architecture_specialist",
                "data_science_specialist",
                "qa_specialist",
            ],
            TaskType.MIGRATION: [
                "architecture_specialist",
                "devops_specialist",
                "data_science_specialist",
                "qa_specialist",
                "security_specialist",
            ],
        }

        preferred_order = order_map.get(task_type, specialists)

        # Sort specialists according to preferred order
        ordered = []
        for specialist in preferred_order:
            if specialist in specialists:
                ordered.append(specialist)

        # Add any remaining specialists
        for specialist in specialists:
            if specialist not in ordered:
                ordered.append(specialist)

        return ordered

    def _get_specialist_deliverables(self, specialist: str, task_type: TaskType) -> List[str]:
        """Get expected deliverables from a specialist"""
        deliverables_map = {
            "architecture_specialist": ["System design", "Architecture diagrams", "Tech stack recommendation"],
            "security_specialist": ["Security report", "Vulnerability assessment", "Compliance checklist"],
            "devops_specialist": ["Deployment plan", "Infrastructure code", "CI/CD pipeline"],
            "ui_specialist": ["UI mockups", "Component library", "Style guide"],
            "qa_specialist": ["Test plan", "Test results", "Quality report"],
            "data_science_specialist": ["Data analysis", "Model design", "Performance metrics"],
        }

        return deliverables_map.get(specialist, ["Analysis report", "Recommendations"])

    def _decompose_enterprise_task(self, task_description: str, analysis: TaskAnalysisResult) -> List[Dict[str, Any]]:
        """Decompose enterprise task into work streams"""
        # Sample decomposition - in practice this would be more sophisticated
        if "migration" in task_description.lower():
            return [
                {
                    "stream": "Assessment & Planning",
                    "lead": "architecture_specialist",
                    "duration": "2 weeks",
                    "complexity": "MODERATE",
                },
                {
                    "stream": "Infrastructure Preparation",
                    "lead": "devops_specialist",
                    "duration": "3 weeks",
                    "complexity": "COMPLEX",
                },
                {
                    "stream": "Data Migration",
                    "lead": "data_science_specialist",
                    "duration": "4 weeks",
                    "complexity": "COMPLEX",
                },
                {
                    "stream": "Security & Compliance",
                    "lead": "security_specialist",
                    "duration": "Ongoing",
                    "complexity": "CRITICAL",
                },
            ]
        else:
            # Generic enterprise decomposition
            return [
                {
                    "stream": "Architecture & Design",
                    "lead": "architecture_specialist",
                    "duration": "25%",
                    "complexity": "COMPLEX",
                },
                {
                    "stream": "Implementation",
                    "lead": analysis.required_specialists[0],
                    "duration": "50%",
                    "complexity": "COMPLEX",
                },
                {
                    "stream": "Quality & Security",
                    "lead": "security_specialist",
                    "duration": "25%",
                    "complexity": "CRITICAL",
                },
            ]

    def _assign_project_managers(self, work_streams: List[Dict[str, Any]]) -> List[str]:
        """Assign project managers to work streams"""
        # In Phase 3, these would be actual Workflow Manager agents
        # For now, we assign senior specialists
        managers = []
        for stream in work_streams:
            if stream["complexity"] == "CRITICAL":
                managers.append("security_specialist")
            elif stream["complexity"] == "COMPLEX":
                managers.append("architecture_specialist")
            else:
                managers.append(stream["lead"])
        return managers


def create_enhanced_hierarchical_manager() -> LlmAgent:
    """Create the enhanced hierarchical task manager agent"""

    manager = EnhancedHierarchicalTaskManager()

    # Tool functions that wrap the manager methods
    def analyze_and_route(task_description: str) -> str:
        result = manager.analyze_and_route_task(task_description)
        return f"Task Analysis Complete:\n{result}"

    def get_specialist_tools(specialist_name: str) -> str:
        tools = manager.tool_registry.get_tools_for_agent(specialist_name)
        tool_names = [tool.name for tool in tools]
        return f"Tools for {specialist_name}: {', '.join(tool_names)}"

    def get_registry_stats() -> str:
        stats = manager.tool_registry.get_registry_stats()
        return f"Registry Statistics:\n{stats}"

    enhanced_task_manager = LlmAgent(
        name="EnhancedHierarchicalTaskManager",
        model="gemini-2.0-flash",
        description="Enhanced Master Orchestrator with Tool Registry, Domain Detection, and Security-First Routing",
        instruction="""You are the Enhanced Master Orchestrator for VANA's Phase 2 implementation.

## ENHANCED CAPABILITIES
1. **Domain Detection**: Automatically detect task domains and route appropriately
2. **Security-First**: Prioritize security for all critical tasks
3. **Tool Optimization**: Assign optimal tools based on the Tool Registry
4. **Risk Assessment**: Evaluate and mitigate risks proactively

## ROUTING PROTOCOL
1. **Always** use analyze_and_route first for comprehensive analysis
2. **Security Critical** tasks (score >= 0.7) get immediate security routing
3. **Complex** tasks use phased workflows with multiple specialists
4. **Enterprise** tasks require hierarchical decomposition

## SPECIALIST CAPABILITIES
- security_specialist: ELEVATED STATUS - Can veto/block deployments
- architecture_specialist: System design and scalability
- devops_specialist: Infrastructure and deployment
- qa_specialist: Testing and quality assurance
- ui_specialist: User interface and experience
- data_science_specialist: ML and data analysis

## WORKFLOW STRATEGIES
- security_first_workflow: Security assessment → Implementation → Validation
- parallel_specialist_analysis: Concurrent analysis by multiple specialists
- phased_project_workflow: Discovery → Design → Implementation → Testing → Deployment
- hierarchical_decomposition: Break enterprise tasks into managed work streams

Always provide clear routing decisions with rationale and expected outcomes.""",
        tools=[
            FunctionTool(func=analyze_and_route),
            FunctionTool(func=get_specialist_tools),
            FunctionTool(func=get_registry_stats),
            adk_transfer_to_agent,
        ],
        output_key="enhanced_orchestration_result",
    )

    return enhanced_task_manager


# Create singleton instance
enhanced_hierarchical_manager = create_enhanced_hierarchical_manager()
