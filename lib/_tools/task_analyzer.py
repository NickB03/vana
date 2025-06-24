"""
Task Analyzer for Intelligent Task Routing

This module provides task analysis capabilities to parse, understand, and categorize
incoming tasks for optimal routing to appropriate agents.
"""

import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class TaskComplexity(Enum):
    """Task complexity levels."""

    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class TaskType(Enum):
    """Task type categories."""

    CODE_EXECUTION = "code_execution"
    DATA_ANALYSIS = "data_analysis"
    KNOWLEDGE_SEARCH = "knowledge_search"
    COORDINATION = "coordination"
    COMMUNICATION = "communication"
    GENERAL = "general"


@dataclass
class TaskAnalysis:
    """Result of task analysis."""

    task_type: TaskType
    complexity: TaskComplexity
    keywords: List[str]
    required_capabilities: List[str]
    estimated_duration: float  # in seconds
    resource_requirements: Dict[str, Any]
    confidence_score: float  # 0.0 to 1.0
    reasoning: str


class TaskAnalyzer:
    """Intelligent task analyzer for routing decisions."""

    def __init__(self):
        """Initialize the task analyzer."""
        self.task_patterns = self._initialize_task_patterns()
        self.capability_keywords = self._initialize_capability_keywords()
        self.complexity_indicators = self._initialize_complexity_indicators()

    def analyze_task(self, task: str, context: str = "") -> TaskAnalysis:
        """Analyze a task to determine its characteristics for routing.

        Args:
            task: Task description
            context: Additional context

        Returns:
            TaskAnalysis with routing recommendations
        """
        logger.info(f"🔍 Analyzing task: {task[:100]}...")

        # Combine task and context for analysis
        full_text = f"{task} {context}".lower().strip()

        # Extract keywords
        keywords = self._extract_keywords(full_text)

        # Determine task type
        task_type = self._classify_task_type(full_text, keywords)

        # Assess complexity
        complexity = self._assess_complexity(full_text, keywords)

        # Identify required capabilities
        required_capabilities = self._identify_capabilities(
            full_text, keywords, task_type
        )

        # Estimate duration
        estimated_duration = self._estimate_duration(
            complexity, task_type, len(full_text)
        )

        # Determine resource requirements
        resource_requirements = self._determine_resource_requirements(
            task_type, complexity
        )

        # Calculate confidence score
        confidence_score = self._calculate_confidence(task_type, keywords, full_text)

        # Generate reasoning
        reasoning = self._generate_reasoning(
            task_type, complexity, keywords, required_capabilities
        )

        analysis = TaskAnalysis(
            task_type=task_type,
            complexity=complexity,
            keywords=keywords,
            required_capabilities=required_capabilities,
            estimated_duration=estimated_duration,
            resource_requirements=resource_requirements,
            confidence_score=confidence_score,
            reasoning=reasoning,
        )

        logger.info(
            f"✅ Task analysis complete: {task_type.value} ({complexity.value}) - {confidence_score:.2f} confidence"
        )
        return analysis

    def _initialize_task_patterns(self) -> Dict[TaskType, List[str]]:
        """Initialize task type patterns."""
        return {
            TaskType.CODE_EXECUTION: [
                r"\b(execute|run|code|script|program|python|javascript|shell|bash)\b",
                r"\b(function|method|class|variable|import|library)\b",
                r"\b(debug|test|compile|syntax|error)\b",
                r"\b(algorithm|logic|implementation)\b",
            ],
            TaskType.DATA_ANALYSIS: [
                r"\b(analyze|data|dataset|statistics|chart|graph|plot)\b",
                r"\b(visualization|pandas|numpy|matplotlib|csv|json)\b",
                r"\b(correlation|regression|clustering|classification)\b",
                r"\b(mean|median|variance|distribution|trend)\b",
            ],
            TaskType.KNOWLEDGE_SEARCH: [
                r"\b(search|find|lookup|research|information|knowledge)\b",
                r"\b(query|database|index|retrieve|fetch)\b",
                r"\b(documentation|reference|manual|guide)\b",
                r"\b(fact|definition|explanation|details)\b",
            ],
            TaskType.COORDINATION: [
                r"\b(coordinate|manage|orchestrate|organize|schedule)\b",
                r"\b(workflow|process|pipeline|sequence|order)\b",
                r"\b(delegate|assign|distribute|allocate)\b",
                r"\b(monitor|track|status|progress)\b",
            ],
            TaskType.COMMUNICATION: [
                r"\b(send|message|notify|communicate|inform)\b",
                r"\b(email|chat|alert|notification|broadcast)\b",
                r"\b(route|forward|relay|transmit)\b",
                r"\b(response|reply|acknowledge|confirm)\b",
            ],
        }

    def _initialize_capability_keywords(self) -> Dict[str, List[str]]:
        """Initialize capability keyword mappings."""
        return {
            "code_execution": [
                "python",
                "javascript",
                "shell",
                "bash",
                "script",
                "execute",
                "run",
                "code",
            ],
            "data_analysis": [
                "data",
                "analyze",
                "statistics",
                "chart",
                "visualization",
                "pandas",
                "numpy",
            ],
            "knowledge_search": [
                "search",
                "find",
                "lookup",
                "research",
                "knowledge",
                "information",
            ],
            "memory_management": [
                "memory",
                "store",
                "retrieve",
                "cache",
                "database",
                "index",
            ],
            "workflow_automation": [
                "workflow",
                "automate",
                "process",
                "pipeline",
                "sequence",
            ],
            "communication": [
                "send",
                "message",
                "notify",
                "communicate",
                "route",
                "forward",
            ],
        }

    def _initialize_complexity_indicators(self) -> Dict[TaskComplexity, Dict[str, Any]]:
        """Initialize complexity assessment indicators."""
        return {
            TaskComplexity.SIMPLE: {
                "max_words": 20,
                "keywords": ["simple", "basic", "quick", "easy", "single"],
                "patterns": [r"\b(echo|print|show|display|get|list)\b"],
            },
            TaskComplexity.MODERATE: {
                "max_words": 50,
                "keywords": ["analyze", "process", "calculate", "generate", "create"],
                "patterns": [r"\b(multiple|several|some|few)\b"],
            },
            TaskComplexity.COMPLEX: {
                "max_words": 100,
                "keywords": [
                    "complex",
                    "advanced",
                    "detailed",
                    "comprehensive",
                    "integrate",
                ],
                "patterns": [r"\b(many|various|different|multiple.*and)\b"],
            },
            TaskComplexity.VERY_COMPLEX: {
                "max_words": float("inf"),
                "keywords": [
                    "orchestrate",
                    "coordinate",
                    "optimize",
                    "machine learning",
                    "ai",
                ],
                "patterns": [r"\b(all|entire|complete|full.*system)\b"],
            },
        }

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from task text."""
        # Remove common stop words and extract meaningful terms
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
        }

        # Split into words and filter
        words = re.findall(r"\b\w+\b", text.lower())
        keywords = [word for word in words if word not in stop_words and len(word) > 2]

        # Remove duplicates while preserving order
        unique_keywords = []
        seen = set()
        for keyword in keywords:
            if keyword not in seen:
                unique_keywords.append(keyword)
                seen.add(keyword)

        return unique_keywords[:20]  # Limit to top 20 keywords

    def _classify_task_type(self, text: str, keywords: List[str]) -> TaskType:
        """Classify the task type based on text analysis."""
        type_scores = {}

        # Score each task type based on pattern matches
        for task_type, patterns in self.task_patterns.items():
            score = 0
            for pattern in patterns:
                matches = len(re.findall(pattern, text))
                score += matches
            type_scores[task_type] = score

        # Find the highest scoring type
        if type_scores:
            best_type = max(type_scores, key=type_scores.get)
            if type_scores[best_type] > 0:
                return best_type

        return TaskType.GENERAL

    def _assess_complexity(self, text: str, keywords: List[str]) -> TaskComplexity:
        """Assess task complexity based on various indicators."""
        word_count = len(text.split())

        # Check complexity indicators
        for complexity, indicators in self.complexity_indicators.items():
            # Check word count
            if word_count <= indicators["max_words"]:
                # Check for complexity keywords
                keyword_matches = sum(1 for kw in indicators["keywords"] if kw in text)

                # Check for complexity patterns
                pattern_matches = sum(
                    1 for pattern in indicators["patterns"] if re.search(pattern, text)
                )

                # If we have matches or it's within word limit, consider this complexity
                if (
                    keyword_matches > 0
                    or pattern_matches > 0
                    or complexity == TaskComplexity.SIMPLE
                ):
                    return complexity

        # Default based on word count
        if word_count <= 20:
            return TaskComplexity.SIMPLE
        elif word_count <= 50:
            return TaskComplexity.MODERATE
        elif word_count <= 100:
            return TaskComplexity.COMPLEX
        else:
            return TaskComplexity.VERY_COMPLEX

    def _identify_capabilities(
        self, text: str, keywords: List[str], task_type: TaskType
    ) -> List[str]:
        """Identify required capabilities based on task analysis."""
        required_capabilities = []

        # Check capability keywords
        for capability, cap_keywords in self.capability_keywords.items():
            if any(kw in text for kw in cap_keywords):
                required_capabilities.append(capability)

        # Add default capability based on task type
        type_capability_map = {
            TaskType.CODE_EXECUTION: "code_execution",
            TaskType.DATA_ANALYSIS: "data_analysis",
            TaskType.KNOWLEDGE_SEARCH: "knowledge_search",
            TaskType.COORDINATION: "workflow_automation",
            TaskType.COMMUNICATION: "communication",
        }

        default_capability = type_capability_map.get(task_type)
        if default_capability and default_capability not in required_capabilities:
            required_capabilities.append(default_capability)

        return required_capabilities

    def _estimate_duration(
        self, complexity: TaskComplexity, task_type: TaskType, text_length: int
    ) -> float:
        """Estimate task duration in seconds."""
        base_durations = {
            TaskComplexity.SIMPLE: 5.0,
            TaskComplexity.MODERATE: 15.0,
            TaskComplexity.COMPLEX: 45.0,
            TaskComplexity.VERY_COMPLEX: 120.0,
        }

        type_multipliers = {
            TaskType.CODE_EXECUTION: 1.5,
            TaskType.DATA_ANALYSIS: 2.0,
            TaskType.KNOWLEDGE_SEARCH: 1.0,
            TaskType.COORDINATION: 1.2,
            TaskType.COMMUNICATION: 0.8,
            TaskType.GENERAL: 1.0,
        }

        base_duration = base_durations[complexity]
        type_multiplier = type_multipliers[task_type]
        length_factor = min(text_length / 100, 2.0)  # Cap at 2x for very long tasks

        return base_duration * type_multiplier * (1 + length_factor * 0.5)

    def _determine_resource_requirements(
        self, task_type: TaskType, complexity: TaskComplexity
    ) -> Dict[str, Any]:
        """Determine resource requirements for the task."""
        base_requirements = {
            "cpu_intensive": False,
            "memory_intensive": False,
            "io_intensive": False,
            "network_required": True,
            "parallel_capable": False,
        }

        # Adjust based on task type
        if task_type == TaskType.CODE_EXECUTION:
            base_requirements["cpu_intensive"] = True
            base_requirements["parallel_capable"] = True
        elif task_type == TaskType.DATA_ANALYSIS:
            base_requirements["cpu_intensive"] = True
            base_requirements["memory_intensive"] = True
            base_requirements["parallel_capable"] = True
        elif task_type == TaskType.KNOWLEDGE_SEARCH:
            base_requirements["io_intensive"] = True
            base_requirements["network_required"] = True

        # Adjust based on complexity
        if complexity in [TaskComplexity.COMPLEX, TaskComplexity.VERY_COMPLEX]:
            base_requirements["memory_intensive"] = True
            base_requirements["parallel_capable"] = True

        return base_requirements

    def _calculate_confidence(
        self, task_type: TaskType, keywords: List[str], text: str
    ) -> float:
        """Calculate confidence score for the analysis."""
        confidence = 0.5  # Base confidence

        # Increase confidence based on keyword matches
        if task_type != TaskType.GENERAL:
            confidence += 0.3

        # Increase confidence based on clear indicators
        type_patterns = self.task_patterns.get(task_type, [])
        pattern_matches = sum(
            1 for pattern in type_patterns if re.search(pattern, text)
        )
        confidence += min(pattern_matches * 0.1, 0.2)

        # Decrease confidence for very short or very long tasks
        word_count = len(text.split())
        if word_count < 3:
            confidence -= 0.2
        elif word_count > 200:
            confidence -= 0.1

        return max(0.0, min(1.0, confidence))

    def _generate_reasoning(
        self,
        task_type: TaskType,
        complexity: TaskComplexity,
        keywords: List[str],
        capabilities: List[str],
    ) -> str:
        """Generate human-readable reasoning for the analysis."""
        reasoning_parts = []

        reasoning_parts.append(f"Classified as {task_type.value} task")
        reasoning_parts.append(f"Assessed complexity: {complexity.value}")

        if keywords:
            key_keywords = keywords[:5]
            reasoning_parts.append(f"Key indicators: {', '.join(key_keywords)}")

        if capabilities:
            reasoning_parts.append(f"Required capabilities: {', '.join(capabilities)}")

        return ". ".join(reasoning_parts) + "."


# Global task analyzer instance
_task_analyzer = None


def get_task_analyzer() -> TaskAnalyzer:
    """Get the global task analyzer instance."""
    global _task_analyzer
    if _task_analyzer is None:
        _task_analyzer = TaskAnalyzer()
    return _task_analyzer
