"""
VANA Mode Manager - PLAN/ACT Mode Switching

Implements intelligent mode switching inspired by Cline:
- PLAN Mode: Analyze tasks, create detailed execution plans
- ACT Mode: Execute plans with proper validation and feedback
- Mode transitions based on task complexity and confidence levels
"""

import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List


class AgentMode(Enum):
    """Agent operation modes."""

    PLAN = "PLAN"
    ACT = "ACT"
    VALIDATE = "VALIDATE"


@dataclass
class TaskPlan:
    """Represents a structured task execution plan."""

    task_id: str
    description: str
    steps: List[Dict[str, Any]]
    estimated_complexity: float  # 0.0 - 1.0
    required_agents: List[str]
    success_criteria: List[str]
    fallback_strategies: List[str]
    created_at: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert plan to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "description": self.description,
            "steps": self.steps,
            "estimated_complexity": self.estimated_complexity,
            "required_agents": self.required_agents,
            "success_criteria": self.success_criteria,
            "fallback_strategies": self.fallback_strategies,
            "created_at": self.created_at,
        }


@dataclass
class ExecutionResult:
    """Represents the result of task execution."""

    task_id: str
    success: bool
    completed_steps: int
    total_steps: int
    execution_time: float
    errors: List[str]
    outputs: List[Any]
    confidence_score: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary for serialization."""
        return {
            "task_id": self.task_id,
            "success": self.success,
            "completed_steps": self.completed_steps,
            "total_steps": self.total_steps,
            "execution_time": self.execution_time,
            "errors": self.errors,
            "outputs": self.outputs,
            "confidence_score": self.confidence_score,
        }


class ModeManager:
    """
    Manages PLAN/ACT mode switching for intelligent task execution.

    Inspired by Cline's approach to task analysis and execution planning.
    """

    def __init__(self):
        self.current_mode = AgentMode.PLAN
        self.active_plans: Dict[str, TaskPlan] = {}
        self.execution_history: List[ExecutionResult] = []
        self.mode_transition_threshold = 0.7  # Confidence threshold for PLAN -> ACT

    def analyze_task_complexity(self, task_description: str) -> float:
        """
        Analyze task complexity to determine planning requirements.

        Returns complexity score from 0.0 (simple) to 1.0 (very complex).
        """
        complexity_indicators = {
            # File operations
            "read": 0.1,
            "write": 0.2,
            "create": 0.3,
            "delete": 0.4,
            # Search operations
            "search": 0.3,
            "find": 0.3,
            "query": 0.4,
            # Multi-step operations
            "analyze": 0.6,
            "implement": 0.7,
            "design": 0.8,
            "architect": 0.9,
            # Coordination operations
            "coordinate": 0.8,
            "orchestrate": 0.9,
            "manage": 0.7,
            # Complex keywords
            "multiple": 0.5,
            "complex": 0.7,
            "comprehensive": 0.8,
            "advanced": 0.9,
        }

        words = task_description.lower().split()
        complexity_scores = []

        for word in words:
            for indicator, score in complexity_indicators.items():
                if indicator in word:
                    complexity_scores.append(score)

        if not complexity_scores:
            return 0.3  # Default moderate complexity

        # Use weighted average with emphasis on highest complexity indicators
        complexity_scores.sort(reverse=True)
        if len(complexity_scores) >= 3:
            # Weight: 50% highest, 30% second, 20% third
            return complexity_scores[0] * 0.5 + complexity_scores[1] * 0.3 + complexity_scores[2] * 0.2
        elif len(complexity_scores) == 2:
            return complexity_scores[0] * 0.7 + complexity_scores[1] * 0.3
        else:
            return complexity_scores[0]

    def should_plan_first(self, task_description: str, agent_confidence: float = 0.5) -> bool:
        """
        Determine if task requires planning phase before execution.

        Args:
            task_description: Description of the task to execute
            agent_confidence: Agent's confidence in handling this task type

        Returns:
            True if planning phase is recommended
        """
        complexity = self.analyze_task_complexity(task_description)

        # Plan first if:
        # 1. High complexity task (>0.6)
        # 2. Low agent confidence (<0.5)
        # 3. Multiple agents likely needed
        # 4. Previous similar tasks had issues

        plan_indicators = [
            complexity > 0.6,
            agent_confidence < 0.5,
            any(
                keyword in task_description.lower()
                for keyword in ["multiple", "coordinate", "complex", "comprehensive"]
            ),
            self._has_similar_task_failures(task_description),
        ]

        return sum(plan_indicators) >= 2

    def create_execution_plan(self, task_description: str, context: Dict[str, Any] = None) -> TaskPlan:
        """
        Create a detailed execution plan for the given task.

        This implements the PLAN mode functionality.
        """
        task_id = f"task_{int(time.time() * 1000)}"
        complexity = self.analyze_task_complexity(task_description)

        # Analyze task to determine required steps
        steps = self._decompose_task(task_description, context or {})

        # Determine required agents based on task content
        required_agents = self._identify_required_agents(task_description, steps)

        # Define success criteria
        success_criteria = self._define_success_criteria(task_description, steps)

        # Create fallback strategies
        fallback_strategies = self._create_fallback_strategies(task_description, complexity)

        plan = TaskPlan(
            task_id=task_id,
            description=task_description,
            steps=steps,
            estimated_complexity=complexity,
            required_agents=required_agents,
            success_criteria=success_criteria,
            fallback_strategies=fallback_strategies,
            created_at=time.time(),
        )

        self.active_plans[task_id] = plan
        return plan

    def _decompose_task(self, task_description: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Decompose task into executable steps."""
        # This is a simplified decomposition - in practice, this would use
        # more sophisticated NLP and task analysis

        steps = []

        # Basic task decomposition patterns
        if "read" in task_description.lower():
            steps.append(
                {
                    "action": "read_file",
                    "description": "Read the specified file",
                    "tools": ["adk_read_file"],
                    "validation": "File content retrieved successfully",
                }
            )

        if "write" in task_description.lower() or "create" in task_description.lower():
            steps.append(
                {
                    "action": "write_file",
                    "description": "Write content to file",
                    "tools": ["adk_write_file"],
                    "validation": "File written successfully",
                }
            )

        if "search" in task_description.lower():
            steps.append(
                {
                    "action": "search",
                    "description": "Search for relevant information",
                    "tools": ["adk_vector_search", "adk_web_search"],
                    "validation": "Search results obtained",
                }
            )

        if "analyze" in task_description.lower():
            steps.append(
                {
                    "action": "analyze",
                    "description": "Analyze the gathered information",
                    "tools": ["adk_kg_query", "adk_search_knowledge"],
                    "validation": "Analysis completed with insights",
                }
            )

        # If no specific patterns found, create generic steps
        if not steps:
            steps = [
                {
                    "action": "understand",
                    "description": "Understand the task requirements",
                    "tools": ["adk_echo"],
                    "validation": "Task requirements clarified",
                },
                {
                    "action": "execute",
                    "description": "Execute the main task",
                    "tools": ["adk_get_health_status"],
                    "validation": "Task execution completed",
                },
            ]

        return steps

    def _identify_required_agents(self, task_description: str, steps: List[Dict[str, Any]]) -> List[str]:
        """Identify which specialist agents are needed for this task."""
        required_agents = ["vana"]  # Orchestrator always involved

        # Agent specialization keywords
        agent_keywords = {
            "architecture_specialist": [
                "design",
                "architect",
                "structure",
                "system",
                "pattern",
            ],
            "ui_specialist": ["interface", "ui", "ux", "frontend", "design", "user"],
            "devops_specialist": [
                "deploy",
                "infrastructure",
                "server",
                "production",
                "monitoring",
            ],
            "qa_specialist": ["test", "quality", "validate", "verify", "check"],
        }

        task_lower = task_description.lower()

        for agent, keywords in agent_keywords.items():
            if any(keyword in task_lower for keyword in keywords):
                required_agents.append(agent)

        return required_agents

    def _define_success_criteria(self, task_description: str, steps: List[Dict[str, Any]]) -> List[str]:
        """Define success criteria for task validation."""
        criteria = [
            "All planned steps completed successfully",
            "No critical errors encountered",
            "Output meets specified requirements",
        ]

        # Add specific criteria based on task type
        if "file" in task_description.lower():
            criteria.append("File operations completed without data loss")

        if "search" in task_description.lower():
            criteria.append("Relevant search results obtained")

        if "test" in task_description.lower():
            criteria.append("All tests pass successfully")

        return criteria

    def _create_fallback_strategies(self, task_description: str, complexity: float) -> List[str]:
        """Create fallback strategies for error recovery."""
        strategies = [
            "Retry with exponential backoff",
            "Delegate to different specialist agent",
            "Break down into smaller subtasks",
        ]

        if complexity > 0.7:
            strategies.extend(
                [
                    "Request human guidance for complex decisions",
                    "Use alternative tools or approaches",
                    "Implement graceful degradation",
                ]
            )

        return strategies

    def _has_similar_task_failures(self, task_description: str) -> bool:
        """Check if similar tasks have failed recently."""
        # Simple keyword-based similarity check
        task_keywords = set(task_description.lower().split())

        for result in self.execution_history[-10:]:  # Check last 10 executions
            if not result.success:
                # Check for keyword overlap
                result_keywords = set(result.task_id.lower().split())
                overlap = len(task_keywords.intersection(result_keywords))
                if overlap >= 2:  # At least 2 common keywords
                    return True

        return False

    def transition_to_act_mode(self, plan: TaskPlan) -> bool:
        """
        Transition from PLAN to ACT mode if conditions are met.

        Returns True if transition successful, False if more planning needed.
        """
        # Validate plan completeness
        if not plan.steps:
            return False

        if not plan.success_criteria:
            return False

        # Check if plan confidence is sufficient
        plan_confidence = self._calculate_plan_confidence(plan)

        if plan_confidence >= self.mode_transition_threshold:
            self.current_mode = AgentMode.ACT
            return True

        return False

    def _calculate_plan_confidence(self, plan: TaskPlan) -> float:
        """Calculate confidence score for execution plan."""
        confidence_factors = []

        # Factor 1: Plan completeness (0.0 - 0.4)
        completeness = min(0.4, len(plan.steps) * 0.1)
        confidence_factors.append(completeness)

        # Factor 2: Success criteria clarity (0.0 - 0.3)
        criteria_clarity = min(0.3, len(plan.success_criteria) * 0.1)
        confidence_factors.append(criteria_clarity)

        # Factor 3: Fallback strategy availability (0.0 - 0.2)
        fallback_coverage = min(0.2, len(plan.fallback_strategies) * 0.05)
        confidence_factors.append(fallback_coverage)

        # Factor 4: Inverse complexity penalty (0.0 - 0.1)
        complexity_bonus = max(0.0, 0.1 - plan.estimated_complexity * 0.1)
        confidence_factors.append(complexity_bonus)

        return sum(confidence_factors)

    def get_mode_status(self) -> Dict[str, Any]:
        """Get current mode manager status."""
        return {
            "current_mode": self.current_mode.value,
            "active_plans": len(self.active_plans),
            "execution_history_count": len(self.execution_history),
            "mode_transition_threshold": self.mode_transition_threshold,
            "recent_success_rate": self._calculate_recent_success_rate(),
        }

    def _calculate_recent_success_rate(self) -> float:
        """Calculate success rate for recent executions."""
        if not self.execution_history:
            return 0.0

        recent_results = self.execution_history[-10:]  # Last 10 executions
        successful = sum(1 for result in recent_results if result.success)

        return successful / len(recent_results)
