"""
Capability Matcher for Agent Selection

This module provides capability matching functionality to map task requirements
to available agent capabilities for optimal routing decisions.
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .agent_discovery import AgentCapability, get_discovery_service
from .task_analyzer import get_task_analyzer
from .task_classifier import get_task_classifier

logger = logging.getLogger(__name__)


@dataclass
class CapabilityMatch:
    """Result of capability matching."""

    agent_name: str
    match_score: float
    matched_capabilities: List[str]
    missing_capabilities: List[str]
    capability_coverage: float
    performance_score: float
    availability_score: float
    overall_score: float
    reasoning: str


@dataclass
class MatchingResult:
    """Complete result of capability matching."""

    best_match: CapabilityMatch
    alternative_matches: List[CapabilityMatch]
    coverage_analysis: Dict[str, Any]
    recommendations: List[str]


class CapabilityMatcher:
    """Intelligent capability matcher for agent selection."""

    def __init__(self):
        """Initialize the capability matcher."""
        self.discovery_service = get_discovery_service()
        self.task_analyzer = get_task_analyzer()
        self.task_classifier = get_task_classifier()
        self.capability_weights = self._initialize_capability_weights()
        self.performance_cache = {}

    def match_capabilities(
        self,
        task: str,
        context: str = "",
        required_capabilities: Optional[List[str]] = None,
    ) -> MatchingResult:
        """Match task requirements to available agent capabilities.

        Args:
            task: Task description
            context: Additional context
            required_capabilities: Explicit capability requirements

        Returns:
            MatchingResult with agent recommendations
        """
        logger.info(f"🎯 Matching capabilities for task: {task[:100]}...")

        # Analyze task if capabilities not provided
        if not required_capabilities:
            analysis = self.task_analyzer.analyze_task(task, context)
            required_capabilities = analysis.required_capabilities

        # Get available agents
        available_agents = self.discovery_service.discover_agents()

        if not available_agents:
            logger.warning("⚠️ No agents available for capability matching")
            return self._create_empty_result()

        # Score each agent
        agent_matches = []
        for agent_name, agent_info in available_agents.items():
            match = self._score_agent_match(
                agent_name, agent_info, required_capabilities, task
            )
            agent_matches.append(match)

        # Sort by overall score
        agent_matches.sort(key=lambda x: x.overall_score, reverse=True)

        # Get best match and alternatives
        best_match = agent_matches[0] if agent_matches else None
        alternative_matches = agent_matches[1:5] if len(agent_matches) > 1 else []

        # Analyze coverage
        coverage_analysis = self._analyze_coverage(agent_matches, required_capabilities)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            agent_matches, required_capabilities, task
        )

        result = MatchingResult(
            best_match=best_match,
            alternative_matches=alternative_matches,
            coverage_analysis=coverage_analysis,
            recommendations=recommendations,
        )

        if best_match:
            logger.info(
                f"✅ Best capability match: {best_match.agent_name} (score: {best_match.overall_score:.2f})"
            )
        else:
            logger.warning("⚠️ No suitable capability matches found")

        return result

    def _initialize_capability_weights(self) -> Dict[str, float]:
        """Initialize capability importance weights."""
        return {
            "code_execution": 1.0,
            "data_analysis": 1.0,
            "knowledge_search": 0.8,
            "memory_management": 0.7,
            "workflow_automation": 0.9,
            "communication": 0.6,
            "coordination": 0.8,
            "specialized_tasks": 0.7,
            "python": 0.9,
            "javascript": 0.8,
            "shell": 0.7,
            "visualization": 0.8,
            "statistics": 0.9,
            "machine_learning": 1.0,
        }

    def _score_agent_match(
        self,
        agent_name: str,
        agent_info: AgentCapability,
        required_capabilities: List[str],
        task: str,
    ) -> CapabilityMatch:
        """Score how well an agent matches the required capabilities."""

        # Calculate capability match
        matched_capabilities = []
        missing_capabilities = []

        agent_capabilities = set(cap.lower() for cap in agent_info.capabilities)
        agent_tools = set(tool.lower() for tool in agent_info.tools)
        all_agent_capabilities = agent_capabilities.union(agent_tools)

        capability_score = 0.0
        total_weight = 0.0

        for req_cap in required_capabilities:
            req_cap_lower = req_cap.lower()
            weight = self.capability_weights.get(req_cap_lower, 0.5)
            total_weight += weight

            # Check for exact match
            if req_cap_lower in all_agent_capabilities:
                matched_capabilities.append(req_cap)
                capability_score += weight
            # Check for partial match (keywords)
            elif any(
                keyword in cap
                for cap in all_agent_capabilities
                for keyword in req_cap_lower.split("_")
            ):
                matched_capabilities.append(req_cap)
                capability_score += weight * 0.7  # Partial match
            else:
                missing_capabilities.append(req_cap)

        # Calculate coverage percentage
        capability_coverage = len(matched_capabilities) / max(
            len(required_capabilities), 1
        )

        # Normalize capability score
        normalized_capability_score = (
            capability_score / max(total_weight, 1) if total_weight > 0 else 0
        )

        # Calculate performance score (based on agent status and historical performance)
        performance_score = self._calculate_performance_score(agent_name, agent_info)

        # Calculate availability score
        availability_score = self._calculate_availability_score(agent_name, agent_info)

        # Calculate overall score (weighted combination)
        overall_score = (
            normalized_capability_score * 0.5
            + performance_score * 0.3
            + availability_score * 0.2
        )

        # Generate reasoning
        reasoning = self._generate_match_reasoning(
            agent_name,
            matched_capabilities,
            missing_capabilities,
            capability_coverage,
            performance_score,
            availability_score,
        )

        return CapabilityMatch(
            agent_name=agent_name,
            match_score=normalized_capability_score,
            matched_capabilities=matched_capabilities,
            missing_capabilities=missing_capabilities,
            capability_coverage=capability_coverage,
            performance_score=performance_score,
            availability_score=availability_score,
            overall_score=overall_score,
            reasoning=reasoning,
        )

    def _calculate_performance_score(
        self, agent_name: str, agent_info: AgentCapability
    ) -> float:
        """Calculate performance score for an agent."""
        # Base score from agent status
        status_scores = {
            "active": 1.0,
            "idle": 0.9,
            "busy": 0.7,
            "offline": 0.0,
            "error": 0.3,
        }

        base_score = status_scores.get(agent_info.status.lower(), 0.5)

        # Adjust based on agent type and specialization
        if agent_name == "vana":
            # Orchestration agent gets bonus for coordination tasks
            base_score += 0.1
        elif agent_name == "code_execution":
            # Code execution agent gets bonus for reliability
            base_score += 0.05
        elif agent_name == "data_science":
            # Data science agent gets bonus for complex analysis
            base_score += 0.05

        # Check performance cache for historical data
        if agent_name in self.performance_cache:
            historical_score = self.performance_cache[agent_name]
            base_score = (base_score * 0.7) + (historical_score * 0.3)

        return min(1.0, base_score)

    def _calculate_availability_score(
        self, agent_name: str, agent_info: AgentCapability
    ) -> float:
        """Calculate availability score for an agent."""
        # Base availability from status
        if agent_info.status.lower() == "active":
            return 1.0
        elif agent_info.status.lower() == "idle":
            return 0.95
        elif agent_info.status.lower() == "busy":
            return 0.6
        elif agent_info.status.lower() == "offline":
            return 0.0
        else:
            return 0.5

    def _analyze_coverage(
        self, agent_matches: List[CapabilityMatch], required_capabilities: List[str]
    ) -> Dict[str, Any]:
        """Analyze capability coverage across all agents."""
        if not agent_matches:
            return {
                "total_coverage": 0.0,
                "best_coverage": 0.0,
                "uncovered_capabilities": required_capabilities,
                "coverage_gaps": len(required_capabilities),
            }

        # Find best coverage
        best_coverage = max(match.capability_coverage for match in agent_matches)

        # Find capabilities covered by any agent
        all_covered = set()
        for match in agent_matches:
            all_covered.update(match.matched_capabilities)

        # Calculate total coverage
        total_coverage = len(all_covered) / max(len(required_capabilities), 1)

        # Find uncovered capabilities
        uncovered_capabilities = [
            cap for cap in required_capabilities if cap not in all_covered
        ]

        return {
            "total_coverage": total_coverage,
            "best_coverage": best_coverage,
            "uncovered_capabilities": uncovered_capabilities,
            "coverage_gaps": len(uncovered_capabilities),
            "agents_analyzed": len(agent_matches),
        }

    def _generate_recommendations(
        self,
        agent_matches: List[CapabilityMatch],
        required_capabilities: List[str],
        task: str,
    ) -> List[str]:
        """Generate recommendations based on capability analysis."""
        recommendations = []

        if not agent_matches:
            recommendations.append(
                "No suitable agents found. Consider adding agents with required capabilities."
            )
            return recommendations

        best_match = agent_matches[0]

        # Recommendation based on best match quality
        if best_match.overall_score >= 0.8:
            recommendations.append(
                f"Excellent match found: {best_match.agent_name} with {best_match.overall_score:.1%} compatibility"
            )
        elif best_match.overall_score >= 0.6:
            recommendations.append(
                f"Good match found: {best_match.agent_name} with {best_match.overall_score:.1%} compatibility"
            )
        else:
            recommendations.append(
                f"Partial match found: {best_match.agent_name} with {best_match.overall_score:.1%} compatibility"
            )

        # Recommendations for missing capabilities
        if best_match.missing_capabilities:
            missing_caps = ", ".join(best_match.missing_capabilities)
            recommendations.append(
                f"Consider fallback for missing capabilities: {missing_caps}"
            )

        # Recommendations for multiple agents
        if len(agent_matches) > 1 and best_match.capability_coverage < 1.0:
            second_best = agent_matches[1]
            if second_best.overall_score >= 0.5:
                recommendations.append(
                    f"Consider multi-agent approach with {second_best.agent_name} as secondary"
                )

        # Task-specific recommendations
        task_lower = task.lower()
        if "complex" in task_lower or "multiple" in task_lower:
            recommendations.append(
                "Consider task decomposition for complex requirements"
            )

        if len(required_capabilities) > 3:
            recommendations.append(
                "Multiple capabilities required - consider orchestrated execution"
            )

        return recommendations

    def _generate_match_reasoning(
        self,
        agent_name: str,
        matched_capabilities: List[str],
        missing_capabilities: List[str],
        coverage: float,
        performance: float,
        availability: float,
    ) -> str:
        """Generate reasoning for capability match."""
        reasoning_parts = []

        # Coverage reasoning
        if coverage >= 0.8:
            reasoning_parts.append(f"Excellent capability coverage ({coverage:.1%})")
        elif coverage >= 0.6:
            reasoning_parts.append(f"Good capability coverage ({coverage:.1%})")
        else:
            reasoning_parts.append(f"Partial capability coverage ({coverage:.1%})")

        # Matched capabilities
        if matched_capabilities:
            if len(matched_capabilities) <= 3:
                caps_str = ", ".join(matched_capabilities)
            else:
                caps_str = f"{', '.join(matched_capabilities[:3])} and {len(matched_capabilities) - 3} more"
            reasoning_parts.append(f"matches {caps_str}")

        # Missing capabilities
        if missing_capabilities:
            if len(missing_capabilities) <= 2:
                missing_str = ", ".join(missing_capabilities)
            else:
                missing_str = f"{', '.join(missing_capabilities[:2])} and {len(missing_capabilities) - 2} more"
            reasoning_parts.append(f"missing {missing_str}")

        # Performance and availability
        if performance >= 0.8 and availability >= 0.8:
            reasoning_parts.append("high performance and availability")
        elif performance >= 0.6 or availability >= 0.6:
            reasoning_parts.append("adequate performance and availability")

        return f"{agent_name}: " + ", ".join(reasoning_parts)

    def _create_empty_result(self) -> MatchingResult:
        """Create empty result when no agents are available."""
        return MatchingResult(
            best_match=None,
            alternative_matches=[],
            coverage_analysis={
                "total_coverage": 0.0,
                "best_coverage": 0.0,
                "uncovered_capabilities": [],
                "coverage_gaps": 0,
            },
            recommendations=["No agents available for capability matching"],
        )

    def update_performance_cache(self, agent_name: str, performance_score: float):
        """Update performance cache with historical data."""
        self.performance_cache[agent_name] = performance_score
        logger.debug(
            f"Updated performance cache for {agent_name}: {performance_score:.2f}"
        )


# Global capability matcher instance
_capability_matcher = None


def get_capability_matcher() -> CapabilityMatcher:
    """Get the global capability matcher instance."""
    global _capability_matcher
    if _capability_matcher is None:
        _capability_matcher = CapabilityMatcher()
    return _capability_matcher
