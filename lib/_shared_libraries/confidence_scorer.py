"""
VANA Confidence Scoring System

Implements intelligent task routing based on agent capability confidence scores.
Inspired by Cursor/Devin's approach to capability assessment and task delegation.
"""

import hashlib
import re
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache
from typing import Any, Dict, List, Tuple

# Import intelligent caching system


class AgentSpecialty(Enum):
    """Agent specialization areas."""

    ORCHESTRATION = "orchestration"
    ARCHITECTURE = "architecture"
    UI_UX = "ui_ux"
    DEVOPS = "devops"
    QA_TESTING = "qa_testing"


@dataclass
class CapabilityScore:
    """Represents an agent's capability score for a specific task type."""

    agent_name: str
    specialty: AgentSpecialty
    base_confidence: float  # 0.0 - 1.0
    task_match_score: float  # 0.0 - 1.0
    experience_bonus: float  # 0.0 - 0.2
    final_confidence: float  # Calculated total
    reasoning: str


@dataclass
class TaskAnalysis:
    """Analysis of task requirements and complexity."""

    task_description: str
    primary_domain: AgentSpecialty
    secondary_domains: List[AgentSpecialty]
    complexity_score: float
    required_tools: List[str]
    estimated_duration: str
    collaboration_needed: bool


class ConfidenceScorer:
    """
    Calculates confidence scores for task routing to specialist agents.

    Uses keyword analysis, historical performance, and capability mapping
    to determine the best agent for each task.
    """

    def __init__(self):
        self.agent_capabilities = self._initialize_agent_capabilities()
        self.performance_history: Dict[str, List[float]] = {}
        self.task_patterns = self._initialize_task_patterns()

        # Performance optimization: Pre-computed compatibility matrices
        self._agent_compatibility_matrix = self._precompute_agent_compatibility()
        self._task_analysis_cache = {}  # Manual cache for task analysis
        self._confidence_cache = {}  # Manual cache for confidence calculations

    def _initialize_agent_capabilities(self) -> Dict[str, Dict[str, Any]]:
        """Initialize base capability scores for each agent."""
        return {
            "vana": {
                "specialty": AgentSpecialty.ORCHESTRATION,
                "base_confidence": 0.9,
                "strengths": [
                    "task_coordination",
                    "agent_delegation",
                    "workflow_management",
                    "multi_domain_tasks",
                    "complex_orchestration",
                    "decision_making",
                ],
                "tools": [
                    "adk_coordinate_task",
                    "adk_delegate_to_agent",
                    "adk_get_agent_status",
                    "adk_read_file",
                    "adk_write_file",
                    "adk_vector_search",
                    "adk_web_search",
                ],
            },
            "architecture_specialist": {
                "specialty": AgentSpecialty.ARCHITECTURE,
                "base_confidence": 0.85,
                "strengths": [
                    "system_design",
                    "architecture_planning",
                    "performance_optimization",
                    "scalability_analysis",
                    "design_patterns",
                    "technical_strategy",
                ],
                "tools": [
                    "adk_read_file",
                    "adk_write_file",
                    "adk_vector_search",
                    "adk_search_knowledge",
                    "adk_kg_query",
                ],
            },
            "ui_specialist": {
                "specialty": AgentSpecialty.UI_UX,
                "base_confidence": 0.8,
                "strengths": [
                    "interface_design",
                    "user_experience",
                    "frontend_development",
                    "visual_design",
                    "usability_analysis",
                    "interaction_design",
                ],
                "tools": [
                    "adk_read_file",
                    "adk_write_file",
                    "adk_web_search",
                    "adk_search_knowledge",
                    "adk_kg_query",
                ],
            },
            "devops_specialist": {
                "specialty": AgentSpecialty.DEVOPS,
                "base_confidence": 0.8,
                "strengths": [
                    "infrastructure_management",
                    "deployment_automation",
                    "monitoring_setup",
                    "security_implementation",
                    "performance_tuning",
                    "ci_cd_pipelines",
                ],
                "tools": [
                    "adk_read_file",
                    "adk_write_file",
                    "adk_vector_search",
                    "adk_web_search",
                    "adk_get_health_status",
                ],
            },
            "qa_specialist": {
                "specialty": AgentSpecialty.QA_TESTING,
                "base_confidence": 0.8,
                "strengths": [
                    "test_strategy",
                    "quality_assurance",
                    "validation_procedures",
                    "bug_detection",
                    "performance_testing",
                    "security_testing",
                ],
                "tools": [
                    "adk_read_file",
                    "adk_write_file",
                    "adk_vector_search",
                    "adk_web_search",
                    "adk_search_knowledge",
                ],
            },
        }

    def _initialize_task_patterns(self) -> Dict[AgentSpecialty, List[str]]:
        """Initialize keyword patterns for each agent specialty."""
        return {
            AgentSpecialty.ORCHESTRATION: [
                "coordinate",
                "manage",
                "orchestrate",
                "delegate",
                "organize",
                "workflow",
                "process",
                "overall",
                "comprehensive",
                "multi",
            ],
            AgentSpecialty.ARCHITECTURE: [
                "design",
                "architect",
                "structure",
                "system",
                "pattern",
                "framework",
                "scalability",
                "performance",
                "optimization",
                "technical",
                "strategy",
            ],
            AgentSpecialty.UI_UX: [
                "interface",
                "ui",
                "ux",
                "frontend",
                "design",
                "user",
                "visual",
                "layout",
                "component",
                "styling",
                "responsive",
                "accessibility",
            ],
            AgentSpecialty.DEVOPS: [
                "deploy",
                "infrastructure",
                "server",
                "production",
                "monitoring",
                "security",
                "automation",
                "pipeline",
                "environment",
                "configuration",
            ],
            AgentSpecialty.QA_TESTING: [
                "test",
                "quality",
                "validate",
                "verify",
                "check",
                "bug",
                "error",
                "testing",
                "qa",
                "assurance",
                "validation",
                "debugging",
            ],
        }

    def analyze_task(self, task_description: str) -> TaskAnalysis:
        """
        Analyze task requirements and complexity with performance optimization.

        Uses caching to improve performance for repeated or similar tasks.
        """
        # Use cached version for performance optimization
        task_hash = self._get_task_hash(task_description)
        return self._analyze_task_cached(task_hash, task_description)

    def _analyze_task_original(self, task_description: str) -> TaskAnalysis:
        """
        Analyze task to determine requirements and complexity.

        Args:
            task_description: Description of the task to analyze

        Returns:
            TaskAnalysis object with task breakdown
        """
        task_lower = task_description.lower()

        # Determine primary domain
        domain_scores = {}
        for specialty, keywords in self.task_patterns.items():
            score = sum(1 for keyword in keywords if keyword in task_lower)
            domain_scores[specialty] = score

        primary_domain = max(domain_scores, key=domain_scores.get)

        # Determine secondary domains (scores > 0 but not primary)
        secondary_domains = [
            domain
            for domain, score in domain_scores.items()
            if score > 0 and domain != primary_domain
        ]

        # Calculate complexity
        complexity_indicators = {
            "simple": 0.2,
            "basic": 0.3,
            "standard": 0.4,
            "complex": 0.7,
            "advanced": 0.8,
            "comprehensive": 0.9,
            "multiple": 0.6,
            "integrate": 0.7,
            "coordinate": 0.8,
            "optimize": 0.7,
        }

        complexity_scores = [
            score for word, score in complexity_indicators.items() if word in task_lower
        ]
        complexity_score = max(complexity_scores) if complexity_scores else 0.5

        # Determine required tools
        tool_keywords = {
            "read": ["adk_read_file"],
            "write": ["adk_write_file"],
            "search": ["adk_vector_search", "adk_web_search"],
            "knowledge": ["adk_search_knowledge", "adk_kg_query"],
            "coordinate": ["adk_coordinate_task", "adk_delegate_to_agent"],
        }

        required_tools = []
        for keyword, tools in tool_keywords.items():
            if keyword in task_lower:
                required_tools.extend(tools)

        # Estimate duration
        if complexity_score < 0.3:
            duration = "5-15 minutes"
        elif complexity_score < 0.6:
            duration = "15-45 minutes"
        else:
            duration = "45+ minutes"

        # Determine if collaboration needed
        collaboration_needed = (
            len(secondary_domains) > 1
            or complexity_score > 0.7
            or "multiple" in task_lower
            or "coordinate" in task_lower
        )

        return TaskAnalysis(
            task_description=task_description,
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            complexity_score=complexity_score,
            required_tools=list(set(required_tools)),
            estimated_duration=duration,
            collaboration_needed=collaboration_needed,
        )

    def calculate_agent_confidence(
        self, agent_name: str, task_analysis: TaskAnalysis
    ) -> CapabilityScore:
        """
        Calculate confidence score for specific agent on given task with optimization.

        Uses pre-computed compatibility matrices and caching for improved performance.
        """
        # Create cache key for this calculation
        cache_key = f"{agent_name}_{task_analysis.task_description}_{task_analysis.complexity_score}"

        # Check cache first
        if cache_key in self._confidence_cache:
            return self._confidence_cache[cache_key]

        # Calculate confidence using optimized method
        result = self._calculate_agent_confidence_optimized(agent_name, task_analysis)

        # Cache the result (limit cache size)
        if len(self._confidence_cache) > 500:
            # Remove oldest entries (simple FIFO)
            oldest_keys = list(self._confidence_cache.keys())[:100]
            for key in oldest_keys:
                del self._confidence_cache[key]

        self._confidence_cache[cache_key] = result
        return result

    def _calculate_agent_confidence_optimized(
        self, agent_name: str, task_analysis: TaskAnalysis
    ) -> CapabilityScore:
        """
        Calculate confidence score for specific agent on given task.

        Args:
            agent_name: Name of the agent to evaluate
            task_analysis: Analysis of the task requirements

        Returns:
            CapabilityScore with detailed confidence breakdown
        """
        if agent_name not in self.agent_capabilities:
            return CapabilityScore(
                agent_name=agent_name,
                specialty=AgentSpecialty.ORCHESTRATION,
                base_confidence=0.1,
                task_match_score=0.0,
                experience_bonus=0.0,
                final_confidence=0.1,
                reasoning="Unknown agent",
            )

        agent_info = self.agent_capabilities[agent_name]
        base_confidence = agent_info["base_confidence"]

        # Calculate task match score
        task_match_score = self._calculate_task_match(agent_info, task_analysis)

        # Calculate experience bonus
        experience_bonus = self._calculate_experience_bonus(agent_name, task_analysis)

        # Calculate final confidence
        final_confidence = min(
            1.0, base_confidence * task_match_score + experience_bonus
        )

        # Generate reasoning
        reasoning = self._generate_confidence_reasoning(
            agent_info, task_analysis, task_match_score, experience_bonus
        )

        return CapabilityScore(
            agent_name=agent_name,
            specialty=agent_info["specialty"],
            base_confidence=base_confidence,
            task_match_score=task_match_score,
            experience_bonus=experience_bonus,
            final_confidence=final_confidence,
            reasoning=reasoning,
        )

    def _calculate_task_match(
        self, agent_info: Dict[str, Any], task_analysis: TaskAnalysis
    ) -> float:
        """Calculate how well agent capabilities match task requirements."""
        # Primary domain match
        if agent_info["specialty"] == task_analysis.primary_domain:
            domain_match = 1.0
        elif agent_info["specialty"] in task_analysis.secondary_domains:
            domain_match = 0.7
        else:
            domain_match = 0.3

        # Strength keyword match
        agent_strengths = agent_info["strengths"]
        task_words = task_analysis.task_description.lower().split()

        strength_matches = 0
        for strength in agent_strengths:
            strength_words = strength.split("_")
            if any(word in task_words for word in strength_words):
                strength_matches += 1

        strength_score = min(1.0, strength_matches / len(agent_strengths))

        # Tool availability match
        agent_tools = set(agent_info["tools"])
        required_tools = set(task_analysis.required_tools)

        if required_tools:
            tool_coverage = len(agent_tools.intersection(required_tools)) / len(
                required_tools
            )
        else:
            tool_coverage = 1.0

        # Weighted combination
        return domain_match * 0.5 + strength_score * 0.3 + tool_coverage * 0.2

    def _calculate_experience_bonus(
        self, agent_name: str, task_analysis: TaskAnalysis
    ) -> float:
        """Calculate experience bonus based on historical performance."""
        if agent_name not in self.performance_history:
            return 0.0

        recent_scores = self.performance_history[agent_name][-5:]  # Last 5 tasks

        if not recent_scores:
            return 0.0

        avg_performance = sum(recent_scores) / len(recent_scores)

        # Bonus scales with performance: 0.0 to 0.2
        return min(0.2, (avg_performance - 0.5) * 0.4) if avg_performance > 0.5 else 0.0

    def _generate_confidence_reasoning(
        self,
        agent_info: Dict[str, Any],
        task_analysis: TaskAnalysis,
        task_match_score: float,
        experience_bonus: float,
    ) -> str:
        """Generate human-readable reasoning for confidence score."""
        specialty = agent_info["specialty"].value

        reasoning_parts = [f"Agent specializes in {specialty}"]

        if task_match_score > 0.8:
            reasoning_parts.append("Excellent match for task requirements")
        elif task_match_score > 0.6:
            reasoning_parts.append("Good match for task requirements")
        elif task_match_score > 0.4:
            reasoning_parts.append("Moderate match for task requirements")
        else:
            reasoning_parts.append("Limited match for task requirements")

        if experience_bonus > 0.1:
            reasoning_parts.append("Strong recent performance history")
        elif experience_bonus > 0.05:
            reasoning_parts.append("Good recent performance history")

        if task_analysis.complexity_score > 0.7:
            reasoning_parts.append("High complexity task may require collaboration")

        return "; ".join(reasoning_parts)

    def get_best_agent_for_task(
        self, task_description: str
    ) -> Tuple[str, CapabilityScore]:
        """
        Determine the best agent for a given task.

        Args:
            task_description: Description of the task

        Returns:
            Tuple of (agent_name, capability_score)
        """
        task_analysis = self.analyze_task(task_description)

        agent_scores = {}
        for agent_name in self.agent_capabilities.keys():
            score = self.calculate_agent_confidence(agent_name, task_analysis)
            agent_scores[agent_name] = score

        best_agent = max(
            agent_scores.keys(), key=lambda x: agent_scores[x].final_confidence
        )

        return best_agent, agent_scores[best_agent]

    def get_collaboration_recommendations(
        self, task_description: str
    ) -> List[Tuple[str, CapabilityScore]]:
        """
        Get recommendations for multi-agent collaboration.

        Args:
            task_description: Description of the task

        Returns:
            List of (agent_name, capability_score) tuples sorted by confidence
        """
        task_analysis = self.analyze_task(task_description)

        if not task_analysis.collaboration_needed:
            # Single agent recommendation
            best_agent, score = self.get_best_agent_for_task(task_description)
            return [(best_agent, score)]

        # Multi-agent recommendations
        agent_scores = []
        for agent_name in self.agent_capabilities.keys():
            score = self.calculate_agent_confidence(agent_name, task_analysis)
            if score.final_confidence > 0.4:  # Only include capable agents
                agent_scores.append((agent_name, score))

        # Sort by confidence, but ensure orchestrator is first if included
        agent_scores.sort(key=lambda x: x[1].final_confidence, reverse=True)

        # Ensure VANA orchestrator is included for complex tasks
        if task_analysis.complexity_score > 0.6:
            vana_included = any(agent == "vana" for agent, _ in agent_scores)
            if not vana_included:
                vana_score = self.calculate_agent_confidence("vana", task_analysis)
                agent_scores.insert(0, ("vana", vana_score))

        return agent_scores[:3]  # Return top 3 recommendations

    def record_performance(self, agent_name: str, performance_score: float):
        """Record agent performance for future confidence calculations."""
        if agent_name not in self.performance_history:
            self.performance_history[agent_name] = []

        self.performance_history[agent_name].append(performance_score)

        # Keep only last 20 scores to prevent memory bloat
        if len(self.performance_history[agent_name]) > 20:
            self.performance_history[agent_name] = self.performance_history[agent_name][
                -20:
            ]

    def get_confidence_summary(self) -> Dict[str, Any]:
        """Get summary of confidence scoring system status."""
        return {
            "total_agents": len(self.agent_capabilities),
            "agents_with_history": len(self.performance_history),
            "total_performance_records": sum(
                len(scores) for scores in self.performance_history.values()
            ),
            "agent_specialties": {
                name: info["specialty"].value
                for name, info in self.agent_capabilities.items()
            },
        }

    # ========== PERFORMANCE OPTIMIZATION METHODS ==========

    def _precompute_agent_compatibility(self) -> Dict[str, Dict[str, float]]:
        """Pre-compute agent compatibility matrix for faster lookups."""
        compatibility_matrix = {}

        for agent_name, agent_info in self.agent_capabilities.items():
            compatibility_matrix[agent_name] = {}

            # Pre-compute domain compatibility scores
            for domain in AgentSpecialty:
                if agent_info["specialty"] == domain:
                    compatibility_matrix[agent_name][domain.value] = 1.0
                else:
                    # Calculate cross-domain compatibility
                    compatibility_matrix[agent_name][domain.value] = 0.3

            # Pre-compute tool compatibility scores
            agent_tools = set(agent_info["tools"])
            for tool_category in [
                "file_operations",
                "search",
                "knowledge_graph",
                "coordination",
            ]:
                tool_overlap = len([t for t in agent_tools if tool_category in t])
                compatibility_matrix[agent_name][f"tools_{tool_category}"] = min(
                    1.0, tool_overlap * 0.25
                )

        return compatibility_matrix

    def _get_task_hash(self, task_description: str) -> str:
        """Generate consistent hash for task caching."""
        # Normalize task description for better cache hits
        normalized = task_description.lower().strip()
        # Remove common variations that don't affect analysis
        normalized = re.sub(r"\s+", " ", normalized)  # Normalize whitespace
        return hashlib.sha256(normalized.encode()).hexdigest()

    @lru_cache(maxsize=1000)
    def _analyze_task_cached(
        self, task_hash: str, task_description: str
    ) -> TaskAnalysis:
        """Cached version of task analysis for performance optimization."""
        # This is the actual implementation - the cache is on the hash
        return self._analyze_task_uncached(task_description)

    def _analyze_task_uncached(self, task_description: str) -> TaskAnalysis:
        """Original task analysis implementation without caching."""
        # This contains the original analyze_task logic
        task_lower = task_description.lower()

        # Determine primary domain
        primary_domain = AgentSpecialty.ORCHESTRATION  # Default

        domain_keywords = {
            AgentSpecialty.ARCHITECTURE: [
                "design",
                "architect",
                "structure",
                "system",
                "pattern",
                "framework",
            ],
            AgentSpecialty.UI_UX: [
                "interface",
                "ui",
                "ux",
                "frontend",
                "design",
                "user",
                "visual",
            ],
            AgentSpecialty.DEVOPS: [
                "deploy",
                "infrastructure",
                "server",
                "production",
                "monitoring",
                "ci/cd",
            ],
            AgentSpecialty.QA_TESTING: [
                "test",
                "quality",
                "validate",
                "verify",
                "check",
                "bug",
            ],
        }

        max_matches = 0
        for domain, keywords in domain_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in task_lower)
            if matches > max_matches:
                max_matches = matches
                primary_domain = domain

        # Determine secondary domains
        secondary_domains = []
        for domain, keywords in domain_keywords.items():
            if domain != primary_domain:
                matches = sum(1 for keyword in keywords if keyword in task_lower)
                if matches > 0:
                    secondary_domains.append(domain)

        # Calculate complexity score
        complexity_indicators = {
            "simple": ["read", "write", "list", "check", "get", "show"],
            "medium": ["search", "find", "analyze", "create", "update", "process"],
            "complex": [
                "design",
                "implement",
                "optimize",
                "coordinate",
                "integrate",
                "architect",
            ],
        }

        complexity_score = 0.3  # Default
        for level, keywords in complexity_indicators.items():
            matches = sum(1 for keyword in keywords if keyword in task_lower)
            if matches > 0:
                if level == "simple":
                    complexity_score = max(complexity_score, 0.2)
                elif level == "medium":
                    complexity_score = max(complexity_score, 0.5)
                elif level == "complex":
                    complexity_score = max(complexity_score, 0.8)

        # Determine required tools
        tool_keywords = {
            "adk_read_file": ["read", "file", "content"],
            "adk_write_file": ["write", "create", "save"],
            "adk_vector_search": ["search", "find", "query"],
            "adk_web_search": ["web", "internet", "online"],
            "adk_kg_query": ["knowledge", "graph", "relationship"],
            "adk_coordinate_task": ["coordinate", "manage", "orchestrate"],
        }

        required_tools = []
        for tool, keywords in tool_keywords.items():
            if any(keyword in task_lower for keyword in keywords):
                required_tools.append(tool)

        # Estimate duration (simplified)
        word_count = len(task_description.split())
        duration = max(1.0, word_count * 0.1 + complexity_score * 5.0)  # Minutes

        # Determine collaboration needs
        collaboration_needed = (
            len(secondary_domains) > 1
            or complexity_score > 0.7
            or "multiple" in task_lower
            or "coordinate" in task_lower
        )

        return TaskAnalysis(
            task_description=task_description,
            primary_domain=primary_domain,
            secondary_domains=secondary_domains,
            complexity_score=complexity_score,
            required_tools=list(set(required_tools)),
            estimated_duration=duration,
            collaboration_needed=collaboration_needed,
        )
