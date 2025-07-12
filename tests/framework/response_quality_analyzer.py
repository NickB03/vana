"""
Response Quality Analyzer for AI Agent Testing Framework

Analyzes the quality of agent responses with automated scoring and
Human-in-the-Loop (HITL) validation for subjective metrics.
"""

import json
import re
import time
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional


class ReviewStatus(Enum):
    NOT_REVIEWED = "not_reviewed"
    PENDING_REVIEW = "pending_review"
    HUMAN_APPROVED = "human_approved"
    HUMAN_REJECTED = "human_rejected"
    LLM_APPROVED = "llm_approved"
    LLM_REJECTED = "llm_rejected"


@dataclass
class QualityMetrics:
    """Quality metrics for agent responses"""

    accuracy: float
    completeness: float
    relevance: float
    clarity: float
    overall_score: float

    # HITL fields
    needs_human_review: bool = False
    review_status: ReviewStatus = ReviewStatus.NOT_REVIEWED
    human_score: Optional[float] = None
    review_comments: Optional[str] = None
    review_timestamp: Optional[float] = None


@dataclass
class ValidationResult:
    """Result of response validation against criteria"""

    passed: bool
    score: float
    details: Dict[str, Any]
    failed_criteria: List[str]


class ResponseQualityAnalyzer:
    """Analyzes the quality of agent responses with HITL support"""

    def __init__(
        self,
        hitl_threshold: float = 0.85,
        enable_llm_judge: bool = True,
        review_storage_path: Optional[str] = None,
    ):
        """Initialize response quality analyzer"""
        self.hitl_threshold = hitl_threshold
        self.enable_llm_judge = enable_llm_judge

        # Set up review storage
        if review_storage_path is None:
            review_storage_path = Path(__file__).parent.parent / "test_data" / "reviews"

        self.review_storage_path = Path(review_storage_path)
        self.review_storage_path.mkdir(parents=True, exist_ok=True)

        # Load accuracy patterns and completeness criteria
        self.accuracy_patterns = self._load_accuracy_patterns()
        self.completeness_criteria = self._load_completeness_criteria()

    def analyze_response_quality(
        self,
        response: str,
        query: str,
        validation_criteria: Optional[Dict[str, Any]] = None,
        expected_data: Optional[Dict[str, Any]] = None,
    ) -> QualityMetrics:
        """Comprehensive response quality analysis with HITL support"""

        # Perform automated analysis
        accuracy = self.analyze_accuracy(response, expected_data, validation_criteria)
        completeness = self.analyze_completeness(response, query, validation_criteria)
        relevance = self.analyze_relevance(response, query)
        clarity = self.analyze_clarity(response)

        # Calculate overall score
        overall_score = accuracy * 0.3 + completeness * 0.25 + relevance * 0.25 + clarity * 0.2

        # Determine if human review is needed
        needs_review = self._needs_human_review(clarity, relevance, overall_score)

        metrics = QualityMetrics(
            accuracy=accuracy,
            completeness=completeness,
            relevance=relevance,
            clarity=clarity,
            overall_score=overall_score,
            needs_human_review=needs_review,
            review_status=ReviewStatus.PENDING_REVIEW if needs_review else ReviewStatus.NOT_REVIEWED,
        )

        # If review is needed, attempt LLM judge first (if enabled)
        if needs_review and self.enable_llm_judge:
            llm_result = self._llm_judge_evaluation(response, query, metrics)
            if llm_result is not None:
                metrics.review_status = llm_result["status"]
                metrics.human_score = llm_result["score"]
                metrics.review_comments = llm_result["comments"]
                metrics.review_timestamp = time.time()

        return metrics

    def analyze_accuracy(
        self,
        response: str,
        expected_data: Optional[Dict[str, Any]] = None,
        validation_criteria: Optional[Dict[str, Any]] = None,
    ) -> float:
        """Measure factual accuracy of agent responses"""
        if not expected_data and not validation_criteria:
            return 0.5  # STRICT: Low score when no validation criteria - requires human review

        accuracy_score = 0.0
        total_checks = 0

        # Check validation criteria if provided
        if validation_criteria:
            # Check must_contain criteria
            must_contain = validation_criteria.get("must_contain", [])
            for item in must_contain:
                total_checks += 1
                if item.lower() in response.lower():
                    accuracy_score += 1.0

            # Check must_not_contain criteria
            must_not_contain = validation_criteria.get("must_not_contain", [])
            for item in must_not_contain:
                total_checks += 1
                if item.lower() not in response.lower():
                    accuracy_score += 1.0

            # Check format patterns
            format_pattern = validation_criteria.get("format_pattern")
            if format_pattern:
                total_checks += 1
                if re.search(format_pattern, response, re.IGNORECASE):
                    accuracy_score += 1.0

        # Check specific facts from expected_data
        if expected_data:
            for fact_type, expected_value in expected_data.items():
                if fact_type in ["data_type", "complexity", "confidence"]:
                    continue  # Skip metadata fields

                total_checks += 1
                if self._verify_fact_in_response(response, fact_type, expected_value):
                    accuracy_score += 1.0

        return accuracy_score / total_checks if total_checks > 0 else 0.5  # STRICT: Low score without validation

    def analyze_completeness(
        self,
        response: str,
        query: str,
        validation_criteria: Optional[Dict[str, Any]] = None,
    ) -> float:
        """Assess completeness of information provided"""

        # Check minimum length requirement
        min_length = validation_criteria.get("min_length", 0) if validation_criteria else 0
        if min_length > 0 and len(response) < min_length:
            return 0.3  # Significantly penalize too-short responses

        # Check required structure elements
        structure_score = 1.0
        if validation_criteria and "structure_required" in validation_criteria:
            required_elements = validation_criteria["structure_required"]
            found_elements = 0

            for element in required_elements:
                if element.lower() in response.lower():
                    found_elements += 1

            structure_score = found_elements / len(required_elements)

        # Extract query requirements
        query_requirements = self._extract_query_requirements(query)
        addressed_requirements = 0

        for requirement in query_requirements:
            if self._requirement_addressed_in_response(response, requirement):
                addressed_requirements += 1

        query_completeness = (
            addressed_requirements / len(query_requirements)
            if query_requirements
            else 0.4  # STRICT: Low score for responses without clear structure
        )

        # Combine scores
        return structure_score * 0.6 + query_completeness * 0.4

    def analyze_relevance(self, response: str, query: str) -> float:
        """Evaluate relevance to user's actual needs"""
        query_keywords = self._extract_keywords(query)
        response_keywords = self._extract_keywords(response)

        if not query_keywords:
            return 0.3  # STRICT: Very low score if no relevance can be determined

        # Calculate keyword overlap
        overlap = len(set(query_keywords) & set(response_keywords))
        relevance_score = overlap / len(query_keywords)

        # Adjust for response length and focus
        focus_penalty = self._calculate_focus_penalty(response, query)

        # Check for off-topic indicators
        off_topic_penalty = self._calculate_off_topic_penalty(response, query)

        final_score = max(0.0, relevance_score - focus_penalty - off_topic_penalty)
        return min(1.0, final_score)

    def analyze_clarity(self, response: str) -> float:
        """Evaluate clarity and coherence of response"""
        clarity_factors = {
            "sentence_structure": self._analyze_sentence_structure(response),
            "logical_flow": self._analyze_logical_flow(response),
            "terminology_consistency": self._analyze_terminology_consistency(response),
            "readability": self._analyze_readability(response),
        }

        return sum(clarity_factors.values()) / len(clarity_factors)

    def validate_against_criteria(self, response: str, criteria: Dict[str, Any]) -> ValidationResult:
        """Validate response against specific criteria"""
        passed = True
        score = 1.0
        details = {}
        failed_criteria = []

        # Check must_contain
        if "must_contain" in criteria:
            for item in criteria["must_contain"]:
                if item.lower() not in response.lower():
                    passed = False
                    failed_criteria.append(f"Missing required content: {item}")
                    score -= 0.2

        # Check must_not_contain
        if "must_not_contain" in criteria:
            for item in criteria["must_not_contain"]:
                if item.lower() in response.lower():
                    passed = False
                    failed_criteria.append(f"Contains forbidden content: {item}")
                    score -= 0.3

        # Check minimum length
        if "min_length" in criteria:
            if len(response) < criteria["min_length"]:
                passed = False
                failed_criteria.append(f"Response too short: {len(response)} < {criteria['min_length']}")
                score -= 0.4

        # Check format pattern
        if "format_pattern" in criteria:
            if not re.search(criteria["format_pattern"], response, re.IGNORECASE):
                passed = False
                failed_criteria.append("Does not match required format pattern")
                score -= 0.3

        # Check accuracy threshold
        if "accuracy_threshold" in criteria:
            # This would need to be calculated separately
            details["accuracy_threshold"] = criteria["accuracy_threshold"]

        score = max(0.0, score)

        return ValidationResult(passed=passed, score=score, details=details, failed_criteria=failed_criteria)

    def submit_human_review(self, response_id: str, human_score: float, comments: str, reviewer_id: str) -> None:
        """Submit human review for a response"""
        review_data = {
            "response_id": response_id,
            "human_score": human_score,
            "comments": comments,
            "reviewer_id": reviewer_id,
            "timestamp": time.time(),
            "review_type": "human",
        }

        # Save review to storage
        review_file = self.review_storage_path / f"review_{response_id}.json"
        with open(review_file, "w") as f:
            json.dump(review_data, f, indent=2)

    def get_pending_reviews(self) -> List[Dict[str, Any]]:
        """Get list of responses pending human review"""
        # This would integrate with a review queue system
        # For now, return empty list
        return []

    # Helper methods (implementation details)
    def _needs_human_review(self, clarity: float, relevance: float, overall: float) -> bool:
        """Determine if response needs human review"""
        return clarity < self.hitl_threshold or relevance < self.hitl_threshold or overall < self.hitl_threshold

    def _llm_judge_evaluation(self, response: str, query: str, metrics: QualityMetrics) -> Optional[Dict[str, Any]]:
        """Use LLM as judge for subjective evaluation"""
        # This would integrate with an LLM service for evaluation
        # For now, return None to indicate LLM judge not available
        return None

    def _load_accuracy_patterns(self) -> Dict[str, Any]:
        """Load accuracy validation patterns"""
        return {
            "time_patterns": [r"\d{1,2}:\d{2}", r"\d{1,2}\s*(AM|PM)"],
            "temperature_patterns": [r"\d+°[CF]", r"\d+\s*degrees"],
            "location_patterns": [r"[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*"],
        }

    def _load_completeness_criteria(self) -> Dict[str, Any]:
        """Load completeness evaluation criteria"""
        return {
            "min_response_length": 50,
            "required_elements": ["answer", "context"],
            "structure_indicators": ["because", "therefore", "however", "additionally"],
        }

    def _verify_fact_in_response(self, response: str, fact_type: str, expected_value: Any) -> bool:
        """Verify a specific fact is present in the response"""
        response_lower = response.lower()

        if isinstance(expected_value, str):
            return expected_value.lower() in response_lower
        elif isinstance(expected_value, list):
            return any(item.lower() in response_lower for item in expected_value)
        else:
            return str(expected_value).lower() in response_lower

    def _extract_query_requirements(self, query: str) -> List[str]:
        """Extract requirements from the query"""
        requirements = []

        # Look for question words
        question_words = ["what", "when", "where", "who", "why", "how"]
        for word in question_words:
            if word in query.lower():
                requirements.append(f"answer_{word}_question")

        # Look for specific requests
        if "compare" in query.lower():
            requirements.append("comparison")
        if "analyze" in query.lower():
            requirements.append("analysis")
        if "explain" in query.lower():
            requirements.append("explanation")

        return requirements

    def _requirement_addressed_in_response(self, response: str, requirement: str) -> bool:
        """Check if a requirement is addressed in the response"""
        response_lower = response.lower()

        if requirement.startswith("answer_"):
            # Check if response provides an answer
            return len(response) > 20 and not any(
                phrase in response_lower for phrase in ["i cannot", "unable to", "don't know"]
            )
        elif requirement == "comparison":
            return any(word in response_lower for word in ["versus", "vs", "compared to", "difference"])
        elif requirement == "analysis":
            return any(word in response_lower for word in ["analysis", "examine", "evaluate"])
        elif requirement == "explanation":
            return any(word in response_lower for word in ["because", "due to", "reason"])

        return True  # Default to true for unknown requirements

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        # Simple keyword extraction - could be enhanced with NLP
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

        # Filter out common stop words
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

        return [word for word in words if word not in stop_words]

    def _calculate_focus_penalty(self, response: str, query: str) -> float:
        """Calculate penalty for unfocused responses"""
        # Penalize very long responses that might be unfocused
        if len(response) > 1000:
            return 0.1
        return 0.0

    def _calculate_off_topic_penalty(self, response: str, query: str) -> float:
        """Calculate penalty for off-topic content"""
        # Simple heuristic - could be enhanced
        if "sorry" in response.lower() and "cannot" in response.lower():
            return 0.3  # Heavy penalty for "I cannot" responses
        return 0.0

    def _analyze_sentence_structure(self, response: str) -> float:
        """Analyze sentence structure quality"""
        sentences = re.split(r"[.!?]+", response)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return 0.0

        # Check for reasonable sentence length
        avg_length = sum(len(s.split()) for s in sentences) / len(sentences)

        if 5 <= avg_length <= 25:
            return 1.0
        elif avg_length < 5:
            return 0.2  # STRICT: Very low score for too short responses
        else:
            return 0.7  # Too long

    def _analyze_logical_flow(self, response: str) -> float:
        """Analyze logical flow of response"""
        # Look for transition words and logical connectors
        connectors = [
            "however",
            "therefore",
            "additionally",
            "furthermore",
            "moreover",
            "consequently",
        ]

        connector_count = sum(1 for connector in connectors if connector in response.lower())

        # Normalize based on response length
        response_sentences = len(re.split(r"[.!?]+", response))

        if response_sentences <= 1:
            return 0.6  # STRICT: Lower score for single sentence responses

        connector_ratio = connector_count / response_sentences

        if 0.1 <= connector_ratio <= 0.3:
            return 1.0
        elif connector_ratio < 0.1:
            return 0.7  # Too few connectors
        else:
            return 0.8  # Too many connectors

    def _analyze_terminology_consistency(self, response: str) -> float:
        """Analyze consistency of terminology"""
        # Simple check for consistent terminology
        # Could be enhanced with domain-specific dictionaries
        return 0.9  # Default high score

    def _analyze_readability(self, response: str) -> float:
        """Analyze readability of response"""
        # Simple readability check based on sentence and word length
        words = response.split()
        sentences = re.split(r"[.!?]+", response)
        sentences = [s.strip() for s in sentences if s.strip()]

        if not words or not sentences:
            return 0.0

        avg_words_per_sentence = len(words) / len(sentences)
        avg_word_length = sum(len(word) for word in words) / len(words)

        # Optimal ranges for readability
        if 10 <= avg_words_per_sentence <= 20 and 4 <= avg_word_length <= 6:
            return 1.0
        else:
            return 0.8
