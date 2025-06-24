"""
Result Aggregator for Multi-Agent Task Results

This module provides result aggregation capabilities to combine and synthesize
results from multiple agents into coherent, comprehensive responses.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class AggregationStrategy(Enum):
    """Result aggregation strategies."""

    CONCATENATE = "concatenate"
    SYNTHESIZE = "synthesize"
    PRIORITIZE = "prioritize"
    MERGE = "merge"
    SUMMARIZE = "summarize"
    VOTE = "vote"


@dataclass
class ResultWeight:
    """Weight information for result prioritization."""

    agent_name: str
    confidence: float
    relevance: float
    quality: float
    overall_weight: float


@dataclass
class AggregatedResult:
    """Aggregated result from multiple agents."""

    primary_result: Dict[str, Any]
    supporting_results: List[Dict[str, Any]]
    synthesis: str
    confidence: float
    sources: List[str]
    aggregation_strategy: str
    metadata: Dict[str, Any]


class ResultAggregator:
    """Aggregates and synthesizes results from multiple agents."""

    def __init__(self):
        """Initialize the result aggregator."""
        self.aggregation_history: List[Dict[str, Any]] = []
        self.agent_reliability_scores: Dict[str, float] = {}

    async def aggregate_results(
        self,
        results: List[Dict[str, Any]],
        original_task: str,
        strategy: str = "adaptive",
    ) -> Dict[str, Any]:
        """Aggregate multiple agent results into a coherent response.

        Args:
            results: List of results from different agents
            original_task: Original task description
            strategy: Aggregation strategy to use

        Returns:
            Aggregated result dictionary
        """
        logger.info(f"🔄 Aggregating {len(results)} results using {strategy} strategy")

        if not results:
            return {
                "status": "error",
                "message": "No results to aggregate",
                "aggregated_result": None,
            }

        if len(results) == 1:
            return {
                "status": "success",
                "message": "Single result - no aggregation needed",
                "aggregated_result": results[0],
            }

        try:
            # Filter valid results
            valid_results = self._filter_valid_results(results)

            if not valid_results:
                return {
                    "status": "error",
                    "message": "No valid results to aggregate",
                    "aggregated_result": None,
                }

            # Determine aggregation strategy
            aggregation_strategy = self._determine_aggregation_strategy(
                valid_results, original_task, strategy
            )

            # Calculate result weights
            result_weights = self._calculate_result_weights(valid_results)

            # Perform aggregation
            aggregated_result = await self._perform_aggregation(
                valid_results, result_weights, aggregation_strategy, original_task
            )

            # Record aggregation history
            self._record_aggregation_history(
                valid_results, aggregated_result, aggregation_strategy
            )

            logger.info(
                f"✅ Results aggregated successfully using {aggregation_strategy.value} strategy"
            )

            return {
                "status": "success",
                "message": f"Results aggregated using {aggregation_strategy.value} strategy",
                "aggregated_result": aggregated_result,
            }

        except Exception as e:
            logger.error(f"❌ Result aggregation failed: {e}")
            return {
                "status": "error",
                "message": f"Aggregation failed: {str(e)}",
                "aggregated_result": None,
            }

    def _filter_valid_results(
        self, results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Filter out invalid or empty results."""
        valid_results = []

        for result in results:
            # Check if result has meaningful content
            if (
                result.get("status") == "success"
                and result.get("result")
                and isinstance(result.get("result"), dict)
                and result["result"].get("output")
            ):
                valid_results.append(result)
            elif result.get("output"):  # Direct output format
                valid_results.append(result)

        logger.debug(
            f"📊 Filtered {len(valid_results)} valid results from {len(results)} total"
        )
        return valid_results

    def _determine_aggregation_strategy(
        self, results: List[Dict[str, Any]], original_task: str, strategy: str
    ) -> AggregationStrategy:
        """Determine the best aggregation strategy."""
        if strategy != "adaptive":
            # Use explicit strategy if provided
            strategy_map = {
                "concatenate": AggregationStrategy.CONCATENATE,
                "synthesize": AggregationStrategy.SYNTHESIZE,
                "prioritize": AggregationStrategy.PRIORITIZE,
                "merge": AggregationStrategy.MERGE,
                "summarize": AggregationStrategy.SUMMARIZE,
                "vote": AggregationStrategy.VOTE,
            }
            return strategy_map.get(strategy, AggregationStrategy.SYNTHESIZE)

        # Adaptive strategy selection
        task_lower = original_task.lower()

        # For analysis tasks, synthesize results
        if any(
            keyword in task_lower
            for keyword in ["analyze", "analysis", "compare", "evaluate"]
        ):
            return AggregationStrategy.SYNTHESIZE

        # For search tasks, merge and prioritize
        if any(
            keyword in task_lower
            for keyword in ["search", "find", "lookup", "research"]
        ):
            return AggregationStrategy.MERGE

        # For code execution, prioritize successful results
        if any(
            keyword in task_lower for keyword in ["execute", "run", "code", "script"]
        ):
            return AggregationStrategy.PRIORITIZE

        # For summary tasks, concatenate and summarize
        if any(
            keyword in task_lower for keyword in ["summary", "summarize", "overview"]
        ):
            return AggregationStrategy.SUMMARIZE

        # Default to synthesis for complex tasks
        return AggregationStrategy.SYNTHESIZE

    def _calculate_result_weights(
        self, results: List[Dict[str, Any]]
    ) -> List[ResultWeight]:
        """Calculate weights for result prioritization."""
        weights = []

        for result in results:
            agent_name = result.get("agent_name", "unknown")

            # Base confidence from result
            confidence = result.get("confidence", 0.5)
            if isinstance(confidence, str):
                confidence = 0.5  # Default if confidence is not numeric

            # Relevance based on result content
            relevance = self._calculate_relevance(result)

            # Quality based on result structure and completeness
            quality = self._calculate_quality(result)

            # Agent reliability from historical performance
            reliability = self.agent_reliability_scores.get(agent_name, 0.7)

            # Calculate overall weight
            overall_weight = (
                confidence * 0.3 + relevance * 0.3 + quality * 0.2 + reliability * 0.2
            )

            weights.append(
                ResultWeight(
                    agent_name=agent_name,
                    confidence=confidence,
                    relevance=relevance,
                    quality=quality,
                    overall_weight=overall_weight,
                )
            )

        return weights

    def _calculate_relevance(self, result: Dict[str, Any]) -> float:
        """Calculate relevance score for a result."""
        # Check if result has meaningful output
        output = self._extract_output(result)

        if not output:
            return 0.0

        # Basic relevance scoring
        relevance = 0.5  # Base score

        # Increase relevance for longer, more detailed outputs
        if len(output) > 100:
            relevance += 0.2

        # Increase relevance for structured outputs
        if isinstance(result.get("result"), dict):
            relevance += 0.1

        # Increase relevance if execution time is reasonable
        exec_time = result.get("execution_time_ms", 0)
        if 1000 <= exec_time <= 30000:  # 1-30 seconds is reasonable
            relevance += 0.1

        return min(1.0, relevance)

    def _calculate_quality(self, result: Dict[str, Any]) -> float:
        """Calculate quality score for a result."""
        quality = 0.5  # Base score

        # Check for error indicators
        if result.get("error") or result.get("status") == "error":
            quality -= 0.3

        # Check for completeness
        output = self._extract_output(result)
        if output and len(output.strip()) > 50:
            quality += 0.2

        # Check for structured data
        if isinstance(result.get("result"), dict) and len(result["result"]) > 1:
            quality += 0.1

        # Check for metadata presence
        if result.get("execution_time_ms") or result.get("agent_name"):
            quality += 0.1

        return min(1.0, max(0.0, quality))

    def _extract_output(self, result: Dict[str, Any]) -> str:
        """Extract output text from a result."""
        # Try different output formats
        if result.get("result") and isinstance(result["result"], dict):
            return str(result["result"].get("output", ""))
        elif result.get("output"):
            return str(result["output"])
        elif result.get("result"):
            return str(result["result"])
        else:
            return ""

    async def _perform_aggregation(
        self,
        results: List[Dict[str, Any]],
        weights: List[ResultWeight],
        strategy: AggregationStrategy,
        original_task: str,
    ) -> AggregatedResult:
        """Perform the actual result aggregation."""

        if strategy == AggregationStrategy.CONCATENATE:
            return await self._concatenate_results(results, weights)
        elif strategy == AggregationStrategy.SYNTHESIZE:
            return await self._synthesize_results(results, weights, original_task)
        elif strategy == AggregationStrategy.PRIORITIZE:
            return await self._prioritize_results(results, weights)
        elif strategy == AggregationStrategy.MERGE:
            return await self._merge_results(results, weights)
        elif strategy == AggregationStrategy.SUMMARIZE:
            return await self._summarize_results(results, weights, original_task)
        elif strategy == AggregationStrategy.VOTE:
            return await self._vote_on_results(results, weights)
        else:
            # Default to synthesis
            return await self._synthesize_results(results, weights, original_task)

    async def _concatenate_results(
        self, results: List[Dict[str, Any]], weights: List[ResultWeight]
    ) -> AggregatedResult:
        """Concatenate results in order of weight."""
        # Sort results by weight
        sorted_pairs = sorted(
            zip(results, weights), key=lambda x: x[1].overall_weight, reverse=True
        )

        concatenated_output = []
        sources = []

        for result, weight in sorted_pairs:
            output = self._extract_output(result)
            if output:
                agent_name = weight.agent_name
                concatenated_output.append(f"**{agent_name}**: {output}")
                sources.append(agent_name)

        primary_result = sorted_pairs[0][0] if sorted_pairs else {}
        supporting_results = [pair[0] for pair in sorted_pairs[1:]]

        synthesis = "\n\n".join(concatenated_output)
        confidence = (
            sum(w.overall_weight for w in weights) / len(weights) if weights else 0.0
        )

        return AggregatedResult(
            primary_result=primary_result,
            supporting_results=supporting_results,
            synthesis=synthesis,
            confidence=confidence,
            sources=sources,
            aggregation_strategy="concatenate",
            metadata={"result_count": len(results)},
        )

    async def _synthesize_results(
        self,
        results: List[Dict[str, Any]],
        weights: List[ResultWeight],
        original_task: str,
    ) -> AggregatedResult:
        """Synthesize results into a coherent response."""
        # Sort results by weight
        sorted_pairs = sorted(
            zip(results, weights), key=lambda x: x[1].overall_weight, reverse=True
        )

        # Extract key information from each result
        key_points = []
        sources = []

        for result, weight in sorted_pairs:
            output = self._extract_output(result)
            if output:
                # Extract key sentences (simple approach)
                sentences = output.split(". ")
                key_sentences = sentences[:2] if len(sentences) > 2 else sentences
                key_points.extend(key_sentences)
                sources.append(weight.agent_name)

        # Create synthesis
        synthesis_parts = []
        synthesis_parts.append(f"Based on analysis from {len(sources)} agents:")

        # Group similar points and create coherent narrative
        unique_points = list(
            set(point.strip() for point in key_points if point.strip())
        )
        for i, point in enumerate(unique_points[:5]):  # Limit to top 5 points
            if point and len(point) > 10:
                synthesis_parts.append(f"{i + 1}. {point}")

        synthesis = "\n".join(synthesis_parts)

        primary_result = sorted_pairs[0][0] if sorted_pairs else {}
        supporting_results = [pair[0] for pair in sorted_pairs[1:]]
        confidence = (
            sum(w.overall_weight for w in weights) / len(weights) if weights else 0.0
        )

        return AggregatedResult(
            primary_result=primary_result,
            supporting_results=supporting_results,
            synthesis=synthesis,
            confidence=confidence,
            sources=sources,
            aggregation_strategy="synthesize",
            metadata={
                "result_count": len(results),
                "key_points_extracted": len(unique_points),
            },
        )

    async def _prioritize_results(
        self, results: List[Dict[str, Any]], weights: List[ResultWeight]
    ) -> AggregatedResult:
        """Prioritize results based on weights and return the best one."""
        # Sort results by weight
        sorted_pairs = sorted(
            zip(results, weights), key=lambda x: x[1].overall_weight, reverse=True
        )

        if not sorted_pairs:
            return AggregatedResult(
                primary_result={},
                supporting_results=[],
                synthesis="No valid results to prioritize",
                confidence=0.0,
                sources=[],
                aggregation_strategy="prioritize",
                metadata={},
            )

        best_result, best_weight = sorted_pairs[0]

        # Create synthesis explaining the prioritization
        synthesis = f"Selected result from {best_weight.agent_name} (confidence: {best_weight.confidence:.2f})"
        best_output = self._extract_output(best_result)
        if best_output:
            synthesis += f": {best_output}"

        return AggregatedResult(
            primary_result=best_result,
            supporting_results=[pair[0] for pair in sorted_pairs[1:]],
            synthesis=synthesis,
            confidence=best_weight.overall_weight,
            sources=[best_weight.agent_name],
            aggregation_strategy="prioritize",
            metadata={
                "selected_agent": best_weight.agent_name,
                "selection_confidence": best_weight.overall_weight,
            },
        )

    async def _merge_results(
        self, results: List[Dict[str, Any]], weights: List[ResultWeight]
    ) -> AggregatedResult:
        """Merge results by combining unique information."""
        merged_data = {}
        all_outputs = []
        sources = []

        for result, weight in zip(results, weights):
            output = self._extract_output(result)
            if output:
                all_outputs.append(output)
                sources.append(weight.agent_name)

                # Try to extract structured data
                if isinstance(result.get("result"), dict):
                    for key, value in result["result"].items():
                        if key not in merged_data:
                            merged_data[key] = value

        # Create merged synthesis
        unique_outputs = list(set(all_outputs))
        synthesis = "Merged information from multiple sources:\n"
        synthesis += "\n".join(
            f"• {output[:200]}..." if len(output) > 200 else f"• {output}"
            for output in unique_outputs[:5]
        )

        primary_result = {"merged_data": merged_data, "all_outputs": unique_outputs}
        confidence = (
            sum(w.overall_weight for w in weights) / len(weights) if weights else 0.0
        )

        return AggregatedResult(
            primary_result=primary_result,
            supporting_results=results,
            synthesis=synthesis,
            confidence=confidence,
            sources=sources,
            aggregation_strategy="merge",
            metadata={
                "unique_outputs": len(unique_outputs),
                "merged_fields": len(merged_data),
            },
        )

    async def _summarize_results(
        self,
        results: List[Dict[str, Any]],
        weights: List[ResultWeight],
        original_task: str,
    ) -> AggregatedResult:
        """Summarize results into a concise overview."""
        all_outputs = []
        sources = []

        for result, weight in zip(results, weights):
            output = self._extract_output(result)
            if output:
                all_outputs.append(output)
                sources.append(weight.agent_name)

        # Create summary
        summary_parts = []
        summary_parts.append(
            f"Summary of {len(all_outputs)} agent responses for: {original_task}"
        )

        # Extract key themes (simple keyword-based approach)
        all_text = " ".join(all_outputs).lower()
        common_words = {}
        for word in all_text.split():
            if len(word) > 4:  # Only consider longer words
                common_words[word] = common_words.get(word, 0) + 1

        # Get most common themes
        top_themes = sorted(common_words.items(), key=lambda x: x[1], reverse=True)[:5]
        if top_themes:
            summary_parts.append("Key themes identified:")
            for theme, count in top_themes:
                summary_parts.append(f"• {theme} (mentioned {count} times)")

        # Add brief conclusion
        if all_outputs:
            first_output = all_outputs[0]
            conclusion = (
                first_output[:200] + "..." if len(first_output) > 200 else first_output
            )
            summary_parts.append(f"Primary finding: {conclusion}")

        synthesis = "\n".join(summary_parts)
        confidence = (
            sum(w.overall_weight for w in weights) / len(weights) if weights else 0.0
        )

        return AggregatedResult(
            primary_result={"summary": synthesis, "themes": dict(top_themes)},
            supporting_results=results,
            synthesis=synthesis,
            confidence=confidence,
            sources=sources,
            aggregation_strategy="summarize",
            metadata={
                "themes_identified": len(top_themes),
                "total_text_length": len(all_text),
            },
        )

    async def _vote_on_results(
        self, results: List[Dict[str, Any]], weights: List[ResultWeight]
    ) -> AggregatedResult:
        """Use voting mechanism to select best result."""
        # Simple voting based on similarity and weights
        vote_scores = {}

        for i, (result, weight) in enumerate(zip(results, weights)):
            output = self._extract_output(result)
            vote_scores[i] = weight.overall_weight

            # Bonus for results that are similar to others (consensus)
            for j, (other_result, other_weight) in enumerate(zip(results, weights)):
                if i != j:
                    other_output = self._extract_output(other_result)
                    similarity = self._calculate_similarity(output, other_output)
                    vote_scores[i] += similarity * 0.1

        # Find winner
        winner_index = max(vote_scores, key=vote_scores.get)
        winner_result = results[winner_index]
        winner_weight = weights[winner_index]

        synthesis = f"Voting result: Selected response from {winner_weight.agent_name} "
        synthesis += f"(vote score: {vote_scores[winner_index]:.2f})"

        winner_output = self._extract_output(winner_result)
        if winner_output:
            synthesis += f": {winner_output}"

        return AggregatedResult(
            primary_result=winner_result,
            supporting_results=[r for i, r in enumerate(results) if i != winner_index],
            synthesis=synthesis,
            confidence=vote_scores[winner_index] / max(vote_scores.values()),
            sources=[winner_weight.agent_name],
            aggregation_strategy="vote",
            metadata={"vote_scores": vote_scores, "winner_index": winner_index},
        )

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate simple similarity between two texts."""
        if not text1 or not text2:
            return 0.0

        # Simple word overlap similarity
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union) if union else 0.0

    def _record_aggregation_history(
        self,
        results: List[Dict[str, Any]],
        aggregated_result: AggregatedResult,
        strategy: AggregationStrategy,
    ):
        """Record aggregation history for analysis."""
        history_entry = {
            "timestamp": datetime.now().isoformat(),
            "strategy": strategy.value,
            "input_count": len(results),
            "confidence": aggregated_result.confidence,
            "sources": aggregated_result.sources,
            "success": True,
        }

        self.aggregation_history.append(history_entry)

        # Keep only last 1000 entries
        if len(self.aggregation_history) > 1000:
            self.aggregation_history = self.aggregation_history[-1000:]

    def get_aggregation_stats(self) -> Dict[str, Any]:
        """Get aggregation statistics."""
        if not self.aggregation_history:
            return {"message": "No aggregation history available"}

        total_aggregations = len(self.aggregation_history)

        # Strategy distribution
        strategy_counts = {}
        for entry in self.aggregation_history:
            strategy = entry["strategy"]
            strategy_counts[strategy] = strategy_counts.get(strategy, 0) + 1

        # Average confidence
        avg_confidence = (
            sum(entry["confidence"] for entry in self.aggregation_history)
            / total_aggregations
        )

        return {
            "total_aggregations": total_aggregations,
            "average_confidence": avg_confidence,
            "strategy_distribution": strategy_counts,
            "agent_reliability_scores": self.agent_reliability_scores,
        }

    def update_agent_reliability(self, agent_name: str, reliability_score: float):
        """Update agent reliability score based on performance."""
        self.agent_reliability_scores[agent_name] = max(
            0.0, min(1.0, reliability_score)
        )


# Global result aggregator instance
_result_aggregator = None


def get_result_aggregator() -> ResultAggregator:
    """Get the global result aggregator instance."""
    global _result_aggregator
    if _result_aggregator is None:
        _result_aggregator = ResultAggregator()
    return _result_aggregator
