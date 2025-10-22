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

"""Cost optimization and tracking for LLM usage.

This module provides intelligent cost management for multi-agent systems:
- Token usage tracking and budgeting
- Adaptive model selection based on complexity
- Cost forecasting and alerting
- Usage analytics and reporting
"""

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ModelTier(Enum):
    """Model tiers ordered by cost and capability."""

    BUDGET = "budget"  # Lowest cost, basic tasks
    STANDARD = "standard"  # Mid-tier, general purpose
    PREMIUM = "premium"  # Highest cost, complex reasoning


# Model costs per 1M tokens (input/output)
# Source: Google AI pricing as of 2025
MODEL_COSTS = {
    # Gemini models via Google AI
    "gemini-2.0-flash-exp": {"input": 0.0, "output": 0.0, "tier": ModelTier.PREMIUM},
    "gemini-2.0-flash-thinking-exp-1219": {
        "input": 0.0,
        "output": 0.0,
        "tier": ModelTier.PREMIUM,
    },
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30, "tier": ModelTier.BUDGET},
    "gemini-1.5-flash-8b": {"input": 0.0375, "output": 0.15, "tier": ModelTier.BUDGET},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00, "tier": ModelTier.PREMIUM},
    # OpenRouter fallback models
    "openrouter/google/gemini-2.0-flash-exp:free": {
        "input": 0.0,
        "output": 0.0,
        "tier": ModelTier.PREMIUM,
    },
    "openrouter/google/gemini-flash-1.5": {
        "input": 0.075,
        "output": 0.30,
        "tier": ModelTier.BUDGET,
    },
}


@dataclass
class TokenUsage:
    """Token usage metrics for a single request."""

    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0  # Context caching savings
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def total_tokens(self) -> int:
        """Total tokens used (input + output - cached)."""
        return self.input_tokens + self.output_tokens - self.cached_tokens

    def calculate_cost(self, model: str) -> float:
        """Calculate cost for this usage.

        Args:
            model: Model identifier

        Returns:
            Cost in USD
        """
        if model not in MODEL_COSTS:
            logger.warning(f"Unknown model {model}, using default pricing")
            return 0.0

        costs = MODEL_COSTS[model]
        input_cost = (self.input_tokens / 1_000_000) * costs["input"]
        output_cost = (self.output_tokens / 1_000_000) * costs["output"]
        return input_cost + output_cost


@dataclass
class CostBudget:
    """Cost budget configuration and tracking."""

    daily_limit: float = 10.0  # USD
    monthly_limit: float = 300.0  # USD
    alert_threshold: float = 0.8  # Alert at 80% of budget
    current_daily_spend: float = 0.0
    current_monthly_spend: float = 0.0
    last_reset_daily: datetime = field(default_factory=datetime.now)
    last_reset_monthly: datetime = field(default_factory=datetime.now)

    def check_budget(self) -> tuple[bool, str]:
        """Check if we're within budget.

        Returns:
            Tuple of (within_budget, message)
        """
        # Reset daily budget if needed
        if datetime.now() - self.last_reset_daily > timedelta(days=1):
            self.current_daily_spend = 0.0
            self.last_reset_daily = datetime.now()

        # Reset monthly budget if needed
        if datetime.now() - self.last_reset_monthly > timedelta(days=30):
            self.current_monthly_spend = 0.0
            self.last_reset_monthly = datetime.now()

        # Check limits
        if self.current_daily_spend >= self.daily_limit:
            return False, f"Daily budget exceeded: ${self.current_daily_spend:.2f} / ${self.daily_limit:.2f}"

        if self.current_monthly_spend >= self.monthly_limit:
            return False, f"Monthly budget exceeded: ${self.current_monthly_spend:.2f} / ${self.monthly_limit:.2f}"

        # Check alert thresholds
        if self.current_daily_spend >= self.daily_limit * self.alert_threshold:
            return True, f"Warning: Approaching daily limit (${self.current_daily_spend:.2f} / ${self.daily_limit:.2f})"

        if self.current_monthly_spend >= self.monthly_limit * self.alert_threshold:
            return True, f"Warning: Approaching monthly limit (${self.current_monthly_spend:.2f} / ${self.monthly_limit:.2f})"

        return True, "Within budget"

    def add_cost(self, cost: float) -> None:
        """Add cost to current spending."""
        self.current_daily_spend += cost
        self.current_monthly_spend += cost


class CostOptimizer:
    """Intelligent cost optimization for multi-agent LLM usage."""

    def __init__(
        self,
        daily_budget: float = 10.0,
        monthly_budget: float = 300.0,
        enable_adaptive_selection: bool = True,
    ):
        """Initialize cost optimizer.

        Args:
            daily_budget: Daily spending limit in USD
            monthly_budget: Monthly spending limit in USD
            enable_adaptive_selection: Enable automatic model selection based on task complexity
        """
        self.budget = CostBudget(daily_limit=daily_budget, monthly_limit=monthly_budget)
        self.enable_adaptive_selection = enable_adaptive_selection

        # Usage tracking by agent
        self.agent_usage: dict[str, list[TokenUsage]] = defaultdict(list)
        self.agent_costs: dict[str, float] = defaultdict(float)

        # Model usage statistics
        self.model_usage: dict[str, int] = defaultdict(int)
        self.model_costs: dict[str, float] = defaultdict(float)

        # Session tracking
        self.session_costs: dict[str, float] = defaultdict(float)

        logger.info(
            f"CostOptimizer initialized: daily=${daily_budget}, monthly=${monthly_budget}, adaptive={enable_adaptive_selection}"
        )

    def record_usage(
        self,
        agent_name: str,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cached_tokens: int = 0,
        session_id: str | None = None,
    ) -> dict[str, Any]:
        """Record token usage and calculate cost.

        Args:
            agent_name: Name of the agent
            model: Model identifier
            input_tokens: Number of input tokens
            output_tokens: Number of output tokens
            cached_tokens: Number of cached tokens (saved)
            session_id: Optional session identifier

        Returns:
            Dictionary with cost information and budget status
        """
        usage = TokenUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cached_tokens=cached_tokens,
        )

        cost = usage.calculate_cost(model)

        # Track usage
        self.agent_usage[agent_name].append(usage)
        self.agent_costs[agent_name] += cost
        self.model_usage[model] += 1
        self.model_costs[model] += cost

        if session_id:
            self.session_costs[session_id] += cost

        # Update budget
        self.budget.add_cost(cost)
        within_budget, budget_msg = self.budget.check_budget()

        result = {
            "agent": agent_name,
            "model": model,
            "tokens": {
                "input": input_tokens,
                "output": output_tokens,
                "cached": cached_tokens,
                "total": usage.total_tokens,
            },
            "cost": cost,
            "within_budget": within_budget,
            "budget_message": budget_msg,
            "cumulative_cost": {
                "daily": self.budget.current_daily_spend,
                "monthly": self.budget.current_monthly_spend,
            },
        }

        # Log if approaching limits
        if not within_budget or "Warning" in budget_msg:
            logger.warning(f"Cost alert: {budget_msg}")

        return result

    def select_optimal_model(
        self, task_complexity: str, current_model: str
    ) -> tuple[str, str]:
        """Select optimal model based on task complexity and budget.

        Args:
            task_complexity: One of 'simple', 'moderate', 'complex'
            current_model: Current model being used

        Returns:
            Tuple of (selected_model, reason)
        """
        if not self.enable_adaptive_selection:
            return current_model, "Adaptive selection disabled"

        # Check budget first
        within_budget, budget_msg = self.budget.check_budget()
        if not within_budget:
            # Force cheapest model when over budget
            cheapest = min(
                MODEL_COSTS.items(),
                key=lambda x: x[1]["input"] + x[1]["output"],
            )
            return cheapest[0], f"Budget exceeded, using cheapest model: {budget_msg}"

        # Select based on complexity
        if task_complexity == "simple":
            # Use budget tier for simple tasks
            budget_models = [
                m for m, info in MODEL_COSTS.items() if info["tier"] == ModelTier.BUDGET
            ]
            if budget_models:
                return budget_models[0], "Simple task, using budget model"

        elif task_complexity == "complex":
            # Use premium tier for complex tasks
            premium_models = [
                m
                for m, info in MODEL_COSTS.items()
                if info["tier"] == ModelTier.PREMIUM
            ]
            if premium_models and within_budget:
                return premium_models[0], "Complex task, using premium model"

        # Default: use current model
        return current_model, "Using configured model"

    def get_agent_analytics(self, agent_name: str) -> dict[str, Any]:
        """Get cost analytics for a specific agent.

        Args:
            agent_name: Agent name

        Returns:
            Analytics dictionary
        """
        usage_list = self.agent_usage.get(agent_name, [])
        if not usage_list:
            return {"agent": agent_name, "total_requests": 0, "total_cost": 0.0}

        total_input = sum(u.input_tokens for u in usage_list)
        total_output = sum(u.output_tokens for u in usage_list)
        total_cached = sum(u.cached_tokens for u in usage_list)

        return {
            "agent": agent_name,
            "total_requests": len(usage_list),
            "total_tokens": {
                "input": total_input,
                "output": total_output,
                "cached": total_cached,
                "total": total_input + total_output - total_cached,
            },
            "total_cost": self.agent_costs[agent_name],
            "average_tokens_per_request": (total_input + total_output) / len(usage_list)
            if usage_list
            else 0,
            "cache_hit_rate": total_cached / (total_input + total_output)
            if (total_input + total_output) > 0
            else 0,
        }

    def get_cost_summary(self) -> dict[str, Any]:
        """Get comprehensive cost summary.

        Returns:
            Cost summary dictionary
        """
        return {
            "budget": {
                "daily_limit": self.budget.daily_limit,
                "daily_spent": self.budget.current_daily_spend,
                "daily_remaining": self.budget.daily_limit
                - self.budget.current_daily_spend,
                "monthly_limit": self.budget.monthly_limit,
                "monthly_spent": self.budget.current_monthly_spend,
                "monthly_remaining": self.budget.monthly_limit
                - self.budget.current_monthly_spend,
            },
            "agents": {
                name: self.get_agent_analytics(name) for name in self.agent_usage.keys()
            },
            "models": {
                model: {
                    "requests": count,
                    "total_cost": self.model_costs[model],
                    "average_cost_per_request": self.model_costs[model] / count
                    if count > 0
                    else 0,
                }
                for model, count in self.model_usage.items()
            },
            "top_cost_agents": sorted(
                self.agent_costs.items(), key=lambda x: x[1], reverse=True
            )[:5],
        }


# Global cost optimizer instance
_cost_optimizer: CostOptimizer | None = None


def get_cost_optimizer() -> CostOptimizer:
    """Get or create global cost optimizer instance.

    Returns:
        Global CostOptimizer instance
    """
    global _cost_optimizer
    if _cost_optimizer is None:
        _cost_optimizer = CostOptimizer()
    return _cost_optimizer


def reset_cost_optimizer() -> None:
    """Reset the global cost optimizer (for testing)."""
    global _cost_optimizer
    _cost_optimizer = None
