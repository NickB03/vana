# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Simple cost tracking for LLM usage (portfolio-optimized).

Lightweight cost monitoring focused on visibility and metrics,
without complex budget enforcement systems.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


# Model costs per 1M tokens (as of 2025-01-01)
# Free models have $0 cost
MODEL_COSTS = {
    # Gemini models (free tier)
    "gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0},
    "gemini-2.0-flash-thinking-exp-1219": {"input": 0.0, "output": 0.0},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30},
    "gemini-1.5-flash-8b": {"input": 0.0375, "output": 0.15},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00},
    # OpenRouter fallbacks
    "openrouter/google/gemini-2.0-flash-exp:free": {"input": 0.0, "output": 0.0},
    "openrouter/google/gemini-flash-1.5": {"input": 0.075, "output": 0.30},
}


@dataclass
class UsageRecord:
    """Single LLM usage record."""

    agent_name: str
    model: str
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    cost_usd: float
    timestamp: datetime


class SimpleCostTracker:
    """Lightweight cost tracker for portfolio demonstration.

    Tracks token usage and costs without complex budget enforcement.
    Focus is on visibility and demonstrating cost-conscious design.
    """

    def __init__(self):
        """Initialize cost tracker."""
        self.records: list[UsageRecord] = []
        self.agent_totals: dict[str, dict[str, float]] = defaultdict(
            lambda: {"tokens": 0, "cost": 0.0, "calls": 0}
        )
        self.session_totals: dict[str, dict[str, float]] = defaultdict(
            lambda: {"tokens": 0, "cost": 0.0}
        )

        logger.info("SimpleCostTracker initialized")

    def record_usage(
        self,
        agent_name: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        """Record LLM usage and calculate cost.

        Args:
            agent_name: Name of the agent
            model: Model identifier
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            cached_tokens: Number of cached tokens (reduces cost)
            session_id: Optional session identifier

        Returns:
            Dictionary with usage and cost information
        """
        # Calculate cost
        cost = self._calculate_cost(model, input_tokens, output_tokens)

        # Create record
        record = UsageRecord(
            agent_name=agent_name,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
            cost_usd=cost,
            timestamp=datetime.now(),
        )
        self.records.append(record)

        # Update totals
        total_tokens = input_tokens + output_tokens - cached_tokens
        self.agent_totals[agent_name]["tokens"] += total_tokens
        self.agent_totals[agent_name]["cost"] += cost
        self.agent_totals[agent_name]["calls"] += 1

        if session_id:
            self.session_totals[session_id]["tokens"] += total_tokens
            self.session_totals[session_id]["cost"] += cost

        # Log for visibility
        logger.info(
            f"💰 Cost tracking: {agent_name} used {total_tokens:,} tokens "
            f"(${cost:.4f}) | Model: {model}"
        )

        return {
            "agent": agent_name,
            "model": model,
            "tokens": {
                "input": input_tokens,
                "output": output_tokens,
                "cached": cached_tokens,
                "total": total_tokens,
            },
            "cost_usd": cost,
            "session_id": session_id,
        }

    def _calculate_cost(self, model: str, input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for usage.

        Args:
            model: Model identifier
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens

        Returns:
            Cost in USD
        """
        if model not in MODEL_COSTS:
            logger.warning(f"Unknown model '{model}', assuming $0 cost")
            return 0.0

        costs = MODEL_COSTS[model]
        input_cost = (input_tokens / 1_000_000) * costs["input"]
        output_cost = (output_tokens / 1_000_000) * costs["output"]
        return input_cost + output_cost

    def get_summary(self) -> dict[str, Any]:
        """Get cost summary for all agents.

        Returns:
            Summary dictionary with costs per agent
        """
        total_cost = sum(r.cost_usd for r in self.records)
        total_tokens = sum(
            r.input_tokens + r.output_tokens - r.cached_tokens for r in self.records
        )

        return {
            "total_cost_usd": total_cost,
            "total_tokens": total_tokens,
            "total_requests": len(self.records),
            "agents": {
                name: {
                    "total_tokens": int(totals["tokens"]),
                    "total_cost_usd": totals["cost"],
                    "total_calls": int(totals["calls"]),
                    "avg_tokens_per_call": totals["tokens"] / totals["calls"]
                    if totals["calls"] > 0
                    else 0,
                }
                for name, totals in self.agent_totals.items()
            },
            "sessions": dict(self.session_totals),
        }

    def get_agent_stats(self, agent_name: str) -> dict[str, Any]:
        """Get stats for a specific agent.

        Args:
            agent_name: Agent name

        Returns:
            Agent statistics
        """
        agent_records = [r for r in self.records if r.agent_name == agent_name]
        if not agent_records:
            return {"agent": agent_name, "total_calls": 0, "total_cost_usd": 0.0}

        return {
            "agent": agent_name,
            "total_calls": len(agent_records),
            "total_cost_usd": sum(r.cost_usd for r in agent_records),
            "total_tokens": sum(
                r.input_tokens + r.output_tokens - r.cached_tokens
                for r in agent_records
            ),
            "models_used": list(set(r.model for r in agent_records)),
        }


# Global instance
_cost_tracker: SimpleCostTracker | None = None


def get_cost_tracker() -> SimpleCostTracker:
    """Get or create global cost tracker instance.

    Returns:
        Global SimpleCostTracker instance
    """
    global _cost_tracker
    if _cost_tracker is None:
        _cost_tracker = SimpleCostTracker()
    return _cost_tracker


def reset_cost_tracker() -> None:
    """Reset the global cost tracker (for testing)."""
    global _cost_tracker
    _cost_tracker = None
