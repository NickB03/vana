"""
Agent Intelligence Validator for AI Agent Testing Framework

Validates AI agent intelligence and behavior patterns including reasoning
consistency, tool selection intelligence, and context utilization.
"""

import re
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

from .agent_client import AgentResponse, AgentTestClient
from .test_data_manager import QueryType, TestDataManager, TestScenario


@dataclass
class IntelligenceTestResult:
    """Result of an intelligence test"""

    test_name: str
    score: float  # 0.0 to 1.0
    details: Dict[str, Any]
    passed: bool
    execution_time: float
    scenarios_tested: int
    individual_results: List[Dict[str, Any]]


class ReasoningPattern(Enum):
    """Expected reasoning patterns for different query types"""

    WEB_SEARCH_THEN_EXTRACT = "web_search_then_extract"
    DIRECT_ANSWER_OR_SEARCH = "direct_answer_or_search"
    DELEGATE_TO_SPECIALIST = "delegate_to_specialist"
    RESEARCH_THEN_ANALYZE = "research_then_analyze"
    RESEARCH_THEN_SYNTHESIZE = "research_then_synthesize"
    RESEARCH_THEN_CATEGORIZE = "research_then_categorize"
    RESEARCH_THEN_EVALUATE = "research_then_evaluate"
    DELEGATE_TO_CODE_EXECUTION = "delegate_to_code_execution"
    DELEGATE_TO_DATA_SCIENCE = "delegate_to_data_science"
    RESEARCH_THEN_INSTRUCT = "research_then_instruct"


class AgentIntelligenceValidator:
    """Validates AI agent intelligence and behavior patterns"""

    def __init__(
        self,
        agent_client: AgentTestClient,
        test_data_manager: Optional[TestDataManager] = None,
    ):
        """Initialize with agent client and test data manager"""
        self.agent_client = agent_client
        self.test_data_manager = test_data_manager or TestDataManager()

        # Load reasoning patterns and tool mappings
        self.reasoning_patterns = self._load_reasoning_patterns()
        self.tool_appropriateness_map = self._load_tool_appropriateness_map()

    async def validate_reasoning_consistency(
        self,
        query_type: Optional[QueryType] = None,
        scenarios: Optional[List[TestScenario]] = None,
    ) -> IntelligenceTestResult:
        """Test consistent reasoning across similar scenarios"""
        start_time = time.time()

        # Get scenarios to test
        if scenarios is None:
            if query_type:
                scenarios = self.test_data_manager.load_scenarios_by_type(query_type)
            else:
                scenarios = self.test_data_manager.load_all_scenarios()

        if not scenarios:
            return IntelligenceTestResult(
                test_name="reasoning_consistency",
                score=0.0,
                details={"error": "No scenarios available for testing"},
                passed=False,
                execution_time=time.time() - start_time,
                scenarios_tested=0,
                individual_results=[],
            )

        # Group scenarios by expected pattern
        pattern_groups = self._group_scenarios_by_pattern(scenarios)

        individual_results = []
        pattern_consistency_scores = []

        for pattern, pattern_scenarios in pattern_groups.items():
            if len(pattern_scenarios) < 2:
                continue  # Need at least 2 scenarios to test consistency

            pattern_results = []

            for scenario in pattern_scenarios:
                response = await self.agent_client.query(scenario.query, expected_tools=scenario.expected_tools)

                # Analyze reasoning pattern
                detected_pattern = self._analyze_reasoning_pattern(response, scenario)
                consistency_score = self._calculate_pattern_consistency(detected_pattern, scenario.expected_pattern)

                result = {
                    "scenario_id": scenario.query_id,
                    "query": scenario.query,
                    "expected_pattern": scenario.expected_pattern,
                    "detected_pattern": detected_pattern,
                    "consistency_score": consistency_score,
                    "tools_used": response.tools_used,
                    "execution_time": response.execution_time,
                }

                pattern_results.append(result)
                individual_results.append(result)

            # Calculate consistency within this pattern group
            pattern_scores = [r["consistency_score"] for r in pattern_results]
            pattern_consistency = self._calculate_group_consistency(pattern_scores)
            pattern_consistency_scores.append(pattern_consistency)

        # Calculate overall consistency score
        overall_score = (
            sum(pattern_consistency_scores) / len(pattern_consistency_scores) if pattern_consistency_scores else 0.0
        )

        execution_time = time.time() - start_time

        return IntelligenceTestResult(
            test_name="reasoning_consistency",
            score=overall_score,
            details={
                "pattern_groups": len(pattern_groups),
                "pattern_consistency_scores": pattern_consistency_scores,
                "avg_consistency": overall_score,
            },
            passed=overall_score >= 0.8,
            execution_time=execution_time,
            scenarios_tested=len(scenarios),
            individual_results=individual_results,
        )

    async def validate_tool_selection_intelligence(
        self, query_types: Optional[List[QueryType]] = None
    ) -> IntelligenceTestResult:
        """Test appropriate tool selection for different query types"""
        start_time = time.time()

        if query_types is None:
            query_types = list(QueryType)

        individual_results = []
        appropriateness_scores = []

        for query_type in query_types:
            try:
                scenarios = self.test_data_manager.load_scenarios_by_type(query_type)
            except FileNotFoundError:
                continue  # Skip if no scenarios for this type

            for scenario in scenarios:
                response = await self.agent_client.query(scenario.query, expected_tools=scenario.expected_tools)

                # Evaluate tool selection appropriateness
                appropriateness = self._evaluate_tool_appropriateness(
                    response.tools_used, scenario.expected_tools, query_type
                )

                result = {
                    "scenario_id": scenario.query_id,
                    "query_type": query_type.value,
                    "query": scenario.query,
                    "expected_tools": scenario.expected_tools,
                    "tools_used": response.tools_used,
                    "appropriateness_score": appropriateness,
                    "execution_time": response.execution_time,
                }

                individual_results.append(result)
                appropriateness_scores.append(appropriateness)

        overall_score = sum(appropriateness_scores) / len(appropriateness_scores) if appropriateness_scores else 0.0

        execution_time = time.time() - start_time

        return IntelligenceTestResult(
            test_name="tool_selection_intelligence",
            score=overall_score,
            details={
                "query_types_tested": len(query_types),
                "avg_appropriateness": overall_score,
                "tool_usage_analysis": self._analyze_tool_usage_patterns(individual_results),
            },
            passed=overall_score >= 0.85,
            execution_time=execution_time,
            scenarios_tested=len(individual_results),
            individual_results=individual_results,
        )

    async def validate_context_utilization(
        self, context_scenarios: Optional[List[Dict[str, Any]]] = None
    ) -> IntelligenceTestResult:
        """Verify effective use of context and memory"""
        start_time = time.time()

        if context_scenarios is None:
            context_scenarios = self._generate_context_scenarios()

        individual_results = []
        context_scores = []

        for scenario in context_scenarios:
            # Set up context if provided
            if "context" in scenario:
                # This would set context in the agent client
                # For now, we'll simulate by including context in the query
                enhanced_query = f"Context: {scenario['context']}\n\nQuery: {scenario['query']}"
            else:
                enhanced_query = scenario["query"]

            response = await self.agent_client.query(enhanced_query)

            # Analyze context utilization
            context_usage_score = self._analyze_context_usage(response, scenario.get("context", ""), scenario["query"])

            result = {
                "scenario_id": scenario.get("id", f"context_{len(individual_results)}"),
                "query": scenario["query"],
                "context_provided": scenario.get("context", ""),
                "context_usage_score": context_usage_score,
                "response_content": response.content,
                "execution_time": response.execution_time,
            }

            individual_results.append(result)
            context_scores.append(context_usage_score)

        overall_score = sum(context_scores) / len(context_scores) if context_scores else 0.0

        execution_time = time.time() - start_time

        return IntelligenceTestResult(
            test_name="context_utilization",
            score=overall_score,
            details={
                "avg_context_usage": overall_score,
                "context_analysis": self._analyze_context_patterns(individual_results),
            },
            passed=overall_score >= 0.8,
            execution_time=execution_time,
            scenarios_tested=len(context_scenarios),
            individual_results=individual_results,
        )

    # Helper methods for analysis
    def _load_reasoning_patterns(self) -> Dict[str, Any]:
        """Load reasoning pattern definitions"""
        return {
            ReasoningPattern.WEB_SEARCH_THEN_EXTRACT.value: {
                "indicators": ["search", "web", "looking", "found"],
                "tools": ["adk_web_search"],
                "sequence": ["search", "extract", "present"],
            },
            ReasoningPattern.DELEGATE_TO_SPECIALIST.value: {
                "indicators": ["delegate", "transfer", "specialist"],
                "tools": ["delegate_to_agent"],
                "sequence": ["identify_need", "delegate", "receive_result"],
            },
            ReasoningPattern.RESEARCH_THEN_ANALYZE.value: {
                "indicators": ["research", "analyze", "examine"],
                "tools": ["adk_web_search", "delegate_to_agent"],
                "sequence": ["research", "analyze", "synthesize"],
            },
        }

    def _load_tool_appropriateness_map(self) -> Dict[QueryType, List[str]]:
        """Load mapping of query types to appropriate tools"""
        return {
            QueryType.FACTUAL: ["adk_web_search"],
            QueryType.ANALYTICAL: ["adk_web_search", "delegate_to_agent"],
            QueryType.PROCEDURAL: ["delegate_to_agent"],
            QueryType.CREATIVE: ["delegate_to_agent"],
            QueryType.CONVERSATIONAL: [],
        }

    def _group_scenarios_by_pattern(self, scenarios: List[TestScenario]) -> Dict[str, List[TestScenario]]:
        """Group scenarios by their expected reasoning pattern"""
        groups = {}
        for scenario in scenarios:
            pattern = scenario.expected_pattern
            if pattern not in groups:
                groups[pattern] = []
            groups[pattern].append(scenario)
        return groups

    def _analyze_reasoning_pattern(self, response: AgentResponse, scenario: TestScenario) -> str:
        """Analyze the reasoning pattern used in the response"""
        content = response.content.lower()
        tools_used = response.tools_used

        # Check for web search pattern
        if "adk_web_search" in tools_used and any(
            indicator in content for indicator in ["search", "found", "according to"]
        ):
            return ReasoningPattern.WEB_SEARCH_THEN_EXTRACT.value

        # Check for delegation pattern
        if "delegate_to_agent" in tools_used or any(
            indicator in content for indicator in ["delegat", "transfer", "specialist"]
        ):
            return ReasoningPattern.DELEGATE_TO_SPECIALIST.value

        # Check for research and analysis pattern
        if "adk_web_search" in tools_used and any(
            indicator in content for indicator in ["analyz", "examin", "evaluat"]
        ):
            return ReasoningPattern.RESEARCH_THEN_ANALYZE.value

        # Default to direct answer
        return ReasoningPattern.DIRECT_ANSWER_OR_SEARCH.value

    def _calculate_pattern_consistency(self, detected_pattern: str, expected_pattern: str) -> float:
        """Calculate consistency score between detected and expected patterns"""
        if detected_pattern == expected_pattern:
            return 1.0

        # Check for related patterns
        pattern_families = {
            "search_based": [
                ReasoningPattern.WEB_SEARCH_THEN_EXTRACT.value,
                ReasoningPattern.RESEARCH_THEN_ANALYZE.value,
                ReasoningPattern.RESEARCH_THEN_SYNTHESIZE.value,
            ],
            "delegation_based": [
                ReasoningPattern.DELEGATE_TO_SPECIALIST.value,
                ReasoningPattern.DELEGATE_TO_CODE_EXECUTION.value,
                ReasoningPattern.DELEGATE_TO_DATA_SCIENCE.value,
            ],
        }

        for family, patterns in pattern_families.items():
            if detected_pattern in patterns and expected_pattern in patterns:
                return 0.7  # Partial credit for same family

        return 0.0  # No match

    def _calculate_group_consistency(self, scores: List[float]) -> float:
        """Calculate consistency within a group of scores"""
        if not scores:
            return 0.0

        avg_score = sum(scores) / len(scores)

        # Calculate variance to measure consistency
        variance = sum((score - avg_score) ** 2 for score in scores) / len(scores)
        consistency_penalty = min(variance, 0.3)  # Cap penalty at 0.3

        return max(0.0, avg_score - consistency_penalty)

    def _evaluate_tool_appropriateness(
        self, tools_used: List[str], expected_tools: List[str], query_type: QueryType
    ) -> float:
        """Evaluate appropriateness of tool selection"""
        if not expected_tools:
            # If no specific tools expected, check against query type mapping
            appropriate_tools = self.tool_appropriateness_map.get(query_type, [])
            if not appropriate_tools:
                return 0.8  # Default score if no mapping available
            expected_tools = appropriate_tools

        if not tools_used:
            return 0.0  # No tools used when tools were expected

        # Calculate overlap between used and expected tools
        used_set = set(tools_used)
        expected_set = set(expected_tools)

        if not expected_set:
            return 0.8  # Default score if no expectations

        # Calculate precision and recall
        intersection = used_set & expected_set
        precision = len(intersection) / len(used_set) if used_set else 0
        recall = len(intersection) / len(expected_set) if expected_set else 0

        # F1 score as appropriateness measure
        if precision + recall == 0:
            return 0.0

        f1_score = 2 * (precision * recall) / (precision + recall)
        return f1_score

    def _analyze_tool_usage_patterns(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in tool usage across results"""
        tool_counts = {}
        query_type_tools = {}

        for result in results:
            query_type = result["query_type"]
            tools_used = result["tools_used"]

            # Count tool usage
            for tool in tools_used:
                tool_counts[tool] = tool_counts.get(tool, 0) + 1

            # Track tools by query type
            if query_type not in query_type_tools:
                query_type_tools[query_type] = {}

            for tool in tools_used:
                query_type_tools[query_type][tool] = query_type_tools[query_type].get(tool, 0) + 1

        return {
            "tool_usage_frequency": tool_counts,
            "tools_by_query_type": query_type_tools,
            "most_used_tool": max(tool_counts.items(), key=lambda x: x[1])[0] if tool_counts else None,
        }

    def _generate_context_scenarios(self) -> List[Dict[str, Any]]:
        """Generate context utilization test scenarios"""
        return [
            {
                "id": "context_memory_001",
                "context": "The user is working on a Python web application using Flask.",
                "query": "How do I add authentication to my application?",
                "expected_context_usage": ["Python", "Flask", "web application"],
            },
            {
                "id": "context_memory_002",
                "context": "Previous conversation mentioned the user prefers React for frontend development.",
                "query": "What frontend framework should I use for my new project?",
                "expected_context_usage": ["React", "frontend", "preference"],
            },
            {
                "id": "context_memory_003",
                "context": "The user is a beginner programmer learning JavaScript.",
                "query": "Explain how functions work.",
                "expected_context_usage": ["beginner", "JavaScript", "learning"],
            },
        ]

    def _analyze_context_usage(self, response: AgentResponse, context: str, query: str) -> float:
        """Analyze how well the agent utilized provided context"""
        if not context:
            return 0.8  # Default score if no context provided

        response_content = response.content.lower()
        context_lower = context.lower()

        # Extract key terms from context
        context_terms = self._extract_key_terms(context)

        # Check how many context terms are referenced in the response
        referenced_terms = 0
        for term in context_terms:
            if term.lower() in response_content:
                referenced_terms += 1

        if not context_terms:
            return 0.8  # Default if no terms extracted

        # Calculate context utilization score
        utilization_score = referenced_terms / len(context_terms)

        # Bonus for explicit context acknowledgment
        context_acknowledgment_bonus = 0.0
        acknowledgment_phrases = [
            "based on",
            "given that",
            "since you mentioned",
            "as you said",
        ]
        if any(phrase in response_content for phrase in acknowledgment_phrases):
            context_acknowledgment_bonus = 0.2

        final_score = min(1.0, utilization_score + context_acknowledgment_bonus)
        return final_score

    def _extract_key_terms(self, text: str) -> List[str]:
        """Extract key terms from text for context analysis"""
        # Simple key term extraction - could be enhanced with NLP
        words = re.findall(r"\b[A-Za-z]{3,}\b", text)

        # Filter out common words
        stop_words = {
            "the",
            "and",
            "for",
            "are",
            "but",
            "not",
            "you",
            "all",
            "can",
            "had",
            "her",
            "was",
            "one",
            "our",
            "out",
            "day",
            "get",
            "has",
            "him",
            "his",
            "how",
            "its",
            "may",
            "new",
            "now",
            "old",
            "see",
            "two",
            "who",
            "boy",
            "did",
            "she",
            "use",
            "way",
            "what",
            "when",
            "where",
            "will",
            "with",
        }

        key_terms = [word for word in words if word.lower() not in stop_words]

        # Return unique terms
        return list(set(key_terms))

    def _analyze_context_patterns(self, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in context utilization"""
        scores = [r["context_usage_score"] for r in results]

        return {
            "avg_context_usage": sum(scores) / len(scores) if scores else 0,
            "min_context_usage": min(scores) if scores else 0,
            "max_context_usage": max(scores) if scores else 0,
            "scenarios_with_good_context_usage": len([s for s in scores if s >= 0.8]),
        }
