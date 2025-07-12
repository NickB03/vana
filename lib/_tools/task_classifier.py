"""
Task Classifier for Agent Routing

This module provides task classification capabilities to categorize tasks
and determine the most appropriate agent types for execution.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List

from .task_analyzer import TaskAnalysis, TaskComplexity, TaskType, get_task_analyzer

logger = logging.getLogger(__name__)


class AgentCategory(Enum):
    """Agent categories for task routing."""

    ORCHESTRATION = "orchestration"
    CODE_EXECUTION = "code_execution"
    DATA_SCIENCE = "data_science"
    MEMORY = "memory"
    SPECIALISTS = "specialists"
    WORKFLOWS = "workflows"


@dataclass
class AgentRecommendation:
    """Recommendation for agent selection."""

    agent_category: AgentCategory
    agent_name: str
    confidence: float
    reasoning: str
    fallback_agents: List[str]


@dataclass
class TaskClassification:
    """Result of task classification."""

    primary_recommendation: AgentRecommendation
    alternative_recommendations: List[AgentRecommendation]
    decomposition_suggested: bool
    parallel_execution: bool
    estimated_agents_needed: int
    routing_strategy: str


class TaskClassifier:
    """Intelligent task classifier for agent routing."""

    def __init__(self):
        """Initialize the task classifier."""
        self.task_analyzer = get_task_analyzer()
        self.agent_capabilities = self._initialize_agent_capabilities()
        self.routing_rules = self._initialize_routing_rules()

    def classify_task(self, task: str, context: str = "") -> TaskClassification:
        """Classify a task and recommend appropriate agents.

        Args:
            task: Task description
            context: Additional context

        Returns:
            TaskClassification with agent recommendations
        """
        logger.info(f"🏷️ Classifying task for routing: {task[:100]}...")

        # First analyze the task
        analysis = self.task_analyzer.analyze_task(task, context)

        # Get primary recommendation
        primary_recommendation = self._get_primary_recommendation(analysis, task)

        # Get alternative recommendations
        alternative_recommendations = self._get_alternative_recommendations(analysis, task, primary_recommendation)

        # Determine if decomposition is suggested
        decomposition_suggested = self._should_decompose_task(analysis, task)

        # Determine if parallel execution is beneficial
        parallel_execution = self._should_execute_parallel(analysis, task)

        # Estimate number of agents needed
        estimated_agents_needed = self._estimate_agents_needed(analysis, decomposition_suggested, parallel_execution)

        # Determine routing strategy
        routing_strategy = self._determine_routing_strategy(analysis, decomposition_suggested, parallel_execution)

        classification = TaskClassification(
            primary_recommendation=primary_recommendation,
            alternative_recommendations=alternative_recommendations,
            decomposition_suggested=decomposition_suggested,
            parallel_execution=parallel_execution,
            estimated_agents_needed=estimated_agents_needed,
            routing_strategy=routing_strategy,
        )

        logger.info(
            f"✅ Task classified: {primary_recommendation.agent_name} ({primary_recommendation.confidence:.2f} confidence)"
        )
        return classification

    def _initialize_agent_capabilities(self) -> Dict[AgentCategory, Dict[str, Any]]:
        """Initialize agent capability mappings."""
        return {
            AgentCategory.ORCHESTRATION: {
                "name": "vana",
                "capabilities": [
                    "coordination",
                    "workflow_automation",
                    "task_management",
                    "agent_coordination",
                ],
                "task_types": [TaskType.COORDINATION, TaskType.COMMUNICATION],
                "complexity_preference": [
                    TaskComplexity.COMPLEX,
                    TaskComplexity.VERY_COMPLEX,
                ],
                "specialties": [
                    "multi-agent coordination",
                    "task orchestration",
                    "workflow management",
                ],
            },
            AgentCategory.CODE_EXECUTION: {
                "name": "code_execution",
                "capabilities": [
                    "code_execution",
                    "python",
                    "javascript",
                    "shell",
                    "debugging",
                ],
                "task_types": [TaskType.CODE_EXECUTION],
                "complexity_preference": [
                    TaskComplexity.SIMPLE,
                    TaskComplexity.MODERATE,
                    TaskComplexity.COMPLEX,
                ],
                "specialties": [
                    "code execution",
                    "script running",
                    "programming tasks",
                    "debugging",
                ],
            },
            AgentCategory.DATA_SCIENCE: {
                "name": "data_science",
                "capabilities": [
                    "data_analysis",
                    "visualization",
                    "statistics",
                    "machine_learning",
                ],
                "task_types": [TaskType.DATA_ANALYSIS],
                "complexity_preference": [
                    TaskComplexity.MODERATE,
                    TaskComplexity.COMPLEX,
                    TaskComplexity.VERY_COMPLEX,
                ],
                "specialties": [
                    "data analysis",
                    "visualization",
                    "statistical analysis",
                    "machine learning",
                ],
            },
            AgentCategory.MEMORY: {
                "name": "memory",
                "capabilities": [
                    "knowledge_search",
                    "memory_management",
                    "information_retrieval",
                ],
                "task_types": [TaskType.KNOWLEDGE_SEARCH],
                "complexity_preference": [
                    TaskComplexity.SIMPLE,
                    TaskComplexity.MODERATE,
                ],
                "specialties": [
                    "knowledge retrieval",
                    "information search",
                    "memory management",
                ],
            },
            AgentCategory.SPECIALISTS: {
                "name": "specialists",
                "capabilities": [
                    "specialized_tasks",
                    "domain_expertise",
                    "complex_analysis",
                ],
                "task_types": [TaskType.GENERAL],
                "complexity_preference": [
                    TaskComplexity.COMPLEX,
                    TaskComplexity.VERY_COMPLEX,
                ],
                "specialties": [
                    "specialized tasks",
                    "domain expertise",
                    "complex problem solving",
                ],
            },
            AgentCategory.WORKFLOWS: {
                "name": "workflows",
                "capabilities": [
                    "workflow_automation",
                    "process_management",
                    "pipeline_execution",
                ],
                "task_types": [TaskType.COORDINATION, TaskType.COMMUNICATION],
                "complexity_preference": [
                    TaskComplexity.MODERATE,
                    TaskComplexity.COMPLEX,
                ],
                "specialties": [
                    "workflow automation",
                    "process management",
                    "pipeline execution",
                ],
            },
        }

    def _initialize_routing_rules(self) -> Dict[str, Any]:
        """Initialize routing rules and preferences."""
        return {
            "decomposition_triggers": [
                "multiple",
                "several",
                "various",
                "different",
                "and",
                "also",
                "plus",
                "step by step",
                "first.*then",
                "after.*do",
                "both.*and",
            ],
            "parallel_triggers": [
                "simultaneously",
                "parallel",
                "concurrent",
                "at the same time",
                "independently",
                "separate",
                "multiple agents",
            ],
            "orchestration_triggers": [
                "coordinate",
                "manage",
                "orchestrate",
                "organize",
                "workflow",
                "multiple agents",
                "complex process",
                "end-to-end",
            ],
            "complexity_thresholds": {
                "decomposition": TaskComplexity.COMPLEX,
                "parallel": TaskComplexity.MODERATE,
                "orchestration": TaskComplexity.VERY_COMPLEX,
            },
        }

    def _get_primary_recommendation(self, analysis: TaskAnalysis, task: str) -> AgentRecommendation:
        """Get the primary agent recommendation."""
        # Score each agent category
        agent_scores = {}

        for category, capabilities in self.agent_capabilities.items():
            score = self._calculate_agent_score(analysis, capabilities, task)
            agent_scores[category] = score

        # Find the best match
        best_category = max(agent_scores, key=agent_scores.get)
        best_score = agent_scores[best_category]

        # Get agent details
        agent_info = self.agent_capabilities[best_category]

        # Generate reasoning
        reasoning = self._generate_agent_reasoning(analysis, agent_info, best_score)

        # Get fallback agents
        fallback_agents = self._get_fallback_agents(best_category, agent_scores)

        return AgentRecommendation(
            agent_category=best_category,
            agent_name=agent_info["name"],
            confidence=min(best_score, 1.0),
            reasoning=reasoning,
            fallback_agents=fallback_agents,
        )

    def _get_alternative_recommendations(
        self, analysis: TaskAnalysis, task: str, primary: AgentRecommendation
    ) -> List[AgentRecommendation]:
        """Get alternative agent recommendations."""
        alternatives = []

        # Score all agents except the primary
        for category, capabilities in self.agent_capabilities.items():
            if category == primary.agent_category:
                continue

            score = self._calculate_agent_score(analysis, capabilities, task)

            # Only include if score is reasonable
            if score > 0.3:
                reasoning = self._generate_agent_reasoning(analysis, capabilities, score)
                fallback_agents = self._get_fallback_agents(category, {})

                alternatives.append(
                    AgentRecommendation(
                        agent_category=category,
                        agent_name=capabilities["name"],
                        confidence=min(score, 1.0),
                        reasoning=reasoning,
                        fallback_agents=fallback_agents,
                    )
                )

        # Sort by confidence and return top 3
        alternatives.sort(key=lambda x: x.confidence, reverse=True)
        return alternatives[:3]

    def _calculate_agent_score(self, analysis: TaskAnalysis, agent_capabilities: Dict[str, Any], task: str) -> float:
        """Calculate score for an agent based on task analysis."""
        score = 0.0

        # Task type match
        if analysis.task_type in agent_capabilities["task_types"]:
            score += 0.4

        # Capability match
        capability_matches = 0
        for req_cap in analysis.required_capabilities:
            if req_cap in agent_capabilities["capabilities"]:
                capability_matches += 1

        if analysis.required_capabilities:
            capability_ratio = capability_matches / len(analysis.required_capabilities)
            score += capability_ratio * 0.3

        # Complexity preference match
        if analysis.complexity in agent_capabilities["complexity_preference"]:
            score += 0.2

        # Keyword matching with specialties
        task_lower = task.lower()
        specialty_matches = 0
        for specialty in agent_capabilities["specialties"]:
            if any(word in task_lower for word in specialty.split()):
                specialty_matches += 1

        if agent_capabilities["specialties"]:
            specialty_ratio = specialty_matches / len(agent_capabilities["specialties"])
            score += specialty_ratio * 0.1

        return score

    def _should_decompose_task(self, analysis: TaskAnalysis, task: str) -> bool:
        """Determine if task should be decomposed."""
        task_lower = task.lower()

        # Check for decomposition triggers
        decomposition_triggers = self.routing_rules["decomposition_triggers"]
        trigger_count = sum(1 for trigger in decomposition_triggers if trigger in task_lower)

        # Check complexity
        complex_enough = analysis.complexity in [
            TaskComplexity.COMPLEX,
            TaskComplexity.VERY_COMPLEX,
        ]

        # Check for multiple requirements
        multiple_capabilities = len(analysis.required_capabilities) > 2

        return trigger_count > 1 or (complex_enough and multiple_capabilities)

    def _should_execute_parallel(self, analysis: TaskAnalysis, task: str) -> bool:
        """Determine if task should be executed in parallel."""
        task_lower = task.lower()

        # Check for parallel triggers
        parallel_triggers = self.routing_rules["parallel_triggers"]
        has_parallel_triggers = any(trigger in task_lower for trigger in parallel_triggers)

        # Check if task is parallel capable
        parallel_capable = analysis.resource_requirements.get("parallel_capable", False)

        # Check complexity
        complex_enough = analysis.complexity in [
            TaskComplexity.MODERATE,
            TaskComplexity.COMPLEX,
            TaskComplexity.VERY_COMPLEX,
        ]

        return has_parallel_triggers or (parallel_capable and complex_enough)

    def _estimate_agents_needed(self, analysis: TaskAnalysis, decompose: bool, parallel: bool) -> int:
        """Estimate number of agents needed for the task."""
        base_agents = 1

        if decompose:
            # Estimate based on complexity and capabilities
            if analysis.complexity == TaskComplexity.VERY_COMPLEX:
                base_agents = min(len(analysis.required_capabilities), 4)
            elif analysis.complexity == TaskComplexity.COMPLEX:
                base_agents = min(len(analysis.required_capabilities), 3)
            else:
                base_agents = 2

        if parallel and not decompose:
            # Parallel execution of same task
            base_agents = min(3, base_agents + 1)

        return max(1, base_agents)

    def _determine_routing_strategy(self, analysis: TaskAnalysis, decompose: bool, parallel: bool) -> str:
        """Determine the best routing strategy."""
        if decompose and parallel:
            return "decompose_and_parallel"
        elif decompose:
            return "decompose_sequential"
        elif parallel:
            return "parallel_execution"
        elif analysis.complexity == TaskComplexity.VERY_COMPLEX:
            return "orchestrated_execution"
        else:
            return "direct_routing"

    def _generate_agent_reasoning(self, analysis: TaskAnalysis, agent_info: Dict[str, Any], score: float) -> str:
        """Generate reasoning for agent selection."""
        reasons = []

        if analysis.task_type.value in [t.value for t in agent_info["task_types"]]:
            reasons.append(f"matches task type ({analysis.task_type.value})")

        capability_matches = [cap for cap in analysis.required_capabilities if cap in agent_info["capabilities"]]
        if capability_matches:
            reasons.append(f"has required capabilities ({', '.join(capability_matches)})")

        if analysis.complexity in agent_info["complexity_preference"]:
            reasons.append(f"suitable for {analysis.complexity.value} tasks")

        if not reasons:
            reasons.append("general capability match")

        return f"Selected {agent_info['name']} because it " + " and ".join(reasons) + f" (score: {score:.2f})"

    def _get_fallback_agents(
        self, primary_category: AgentCategory, all_scores: Dict[AgentCategory, float]
    ) -> List[str]:
        """Get fallback agent names."""
        fallbacks = []

        # Always include orchestration as fallback for complex tasks
        if primary_category != AgentCategory.ORCHESTRATION:
            fallbacks.append("vana")

        # Add other high-scoring agents
        if all_scores:
            sorted_agents = sorted(all_scores.items(), key=lambda x: x[1], reverse=True)
            for category, score in sorted_agents:
                if category != primary_category and score > 0.3:
                    agent_name = self.agent_capabilities[category]["name"]
                    if agent_name not in fallbacks:
                        fallbacks.append(agent_name)

        # Add general fallbacks
        general_fallbacks = ["specialists", "workflows"]
        for fallback in general_fallbacks:
            if fallback not in fallbacks:
                fallbacks.append(fallback)

        return fallbacks[:3]  # Limit to top 3 fallbacks


# Global task classifier instance
_task_classifier = None


def get_task_classifier() -> TaskClassifier:
    """Get the global task classifier instance."""
    global _task_classifier
    if _task_classifier is None:
        _task_classifier = TaskClassifier()
    return _task_classifier
