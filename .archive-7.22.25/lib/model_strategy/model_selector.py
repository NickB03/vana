"""
Cost-Conscious Model Selection Strategy for VANA
Implements tiered model usage based on request complexity and cost optimization.
"""

import os
from enum import Enum
from typing import Dict, Optional, List, Any
from dataclasses import dataclass

from lib.logging_config import get_logger

logger = get_logger("vana.model_selector")


class ModelTier(Enum):
    """Model tiers for cost optimization"""
    FLASH = "flash"          # Free/cheap tier for most requests
    PRO = "pro"              # Paid tier for complex reasoning
    ULTRA = "ultra"          # Premium tier for critical tasks


class RequestComplexity(Enum):
    """Request complexity levels"""
    SIMPLE = "simple"        # Basic queries, routing decisions
    MODERATE = "moderate"    # Standard analysis, code review
    COMPLEX = "complex"      # Multi-step reasoning, architecture
    CRITICAL = "critical"    # Security analysis, production decisions


@dataclass
class ModelConfig:
    """Configuration for a specific model"""
    name: str
    tier: ModelTier
    cost_per_1k_chars: float
    max_tokens: int
    capabilities: List[str]
    recommended_for: List[RequestComplexity]


class ModelSelector:
    """
    Intelligent model selection based on request complexity and cost optimization.
    Ensures we use the most cost-effective model for each request type.
    """
    
    # Model configurations with cost data
    MODELS = {
        "gemini-2.5-flash": ModelConfig(
            name="gemini-2.5-flash",
            tier=ModelTier.FLASH,
            cost_per_1k_chars=0.0,  # Free tier available
            max_tokens=1_048_576,
            capabilities=["fast_response", "basic_reasoning", "code_analysis"],
            recommended_for=[RequestComplexity.SIMPLE, RequestComplexity.MODERATE]
        ),
        "gemini-2.5-pro": ModelConfig(
            name="gemini-2.5-pro", 
            tier=ModelTier.PRO,
            cost_per_1k_chars=0.00125,  # Approximate cost
            max_tokens=2_097_152,
            capabilities=["complex_reasoning", "deep_analysis", "nuanced_understanding"],
            recommended_for=[RequestComplexity.COMPLEX, RequestComplexity.CRITICAL]
        ),
        "gemini-2.0-flash": ModelConfig(
            name="gemini-2.0-flash",
            tier=ModelTier.FLASH,
            cost_per_1k_chars=0.0,  # Legacy free tier
            max_tokens=1_048_576,
            capabilities=["fast_response", "basic_reasoning"],
            recommended_for=[RequestComplexity.SIMPLE]
        )
    }
    
    def __init__(self, default_model: str = "gemini-2.5-flash",
                 enable_cost_optimization: bool = True,
                 monthly_budget_usd: float = 100.0):
        """
        Initialize model selector with cost constraints.
        
        Args:
            default_model: Default model to use
            enable_cost_optimization: Whether to optimize for cost
            monthly_budget_usd: Monthly budget limit in USD
        """
        self.default_model = default_model
        self.enable_cost_optimization = enable_cost_optimization
        self.monthly_budget_usd = monthly_budget_usd
        self.usage_tracker = UsageTracker()
        
        # Override from environment
        self.default_model = os.getenv("VANA_DEFAULT_MODEL", default_model)
        self.pro_model_threshold = float(os.getenv("VANA_PRO_MODEL_THRESHOLD", "0.8"))
        
        logger.info(f"ModelSelector initialized: default={self.default_model}, "
                   f"optimization={self.enable_cost_optimization}")
    
    def select_model(self, request: str, context: Optional[Dict[str, Any]] = None,
                    force_tier: Optional[ModelTier] = None) -> str:
        """
        Select appropriate model based on request complexity and cost optimization.
        
        Args:
            request: The request text
            context: Optional context with metadata
            force_tier: Force a specific model tier
            
        Returns:
            Selected model name
        """
        # Allow manual override
        if force_tier:
            return self._get_model_for_tier(force_tier)
        
        # Check if cost optimization is disabled
        if not self.enable_cost_optimization:
            return self.default_model
        
        # Analyze request complexity
        complexity = self._analyze_complexity(request, context)
        
        # Check budget constraints
        if self._is_budget_exceeded():
            logger.warning("Budget exceeded, falling back to free tier")
            return "gemini-2.5-flash"
        
        # Select model based on complexity
        model = self._select_by_complexity(complexity, context)
        
        # Track usage
        self.usage_tracker.track_request(model, len(request))
        
        logger.info(f"Selected model: {model} for complexity: {complexity.value}")
        return model
    
    def _analyze_complexity(self, request: str, context: Optional[Dict[str, Any]]) -> RequestComplexity:
        """Analyze request complexity based on content and context"""
        
        # Security requests are always critical
        security_keywords = ["security", "vulnerability", "exploit", "authentication", 
                           "authorization", "encryption", "certificate", "breach"]
        if any(keyword in request.lower() for keyword in security_keywords):
            return RequestComplexity.CRITICAL
        
        # Check context for priority
        if context:
            priority = context.get("execution_metadata", {}).get("priority", "medium")
            if priority in ["high", "critical"]:
                return RequestComplexity.CRITICAL
            
            # Check if multiple specialists are involved
            specialists = context.get("specialist_insights", {})
            if len(specialists) > 2:
                return RequestComplexity.COMPLEX
        
        # Architecture and design decisions
        complex_keywords = ["architecture", "design", "refactor", "migration", 
                          "integration", "scalability", "performance optimization"]
        if any(keyword in request.lower() for keyword in complex_keywords):
            return RequestComplexity.COMPLEX
        
        # Multi-step analysis
        if any(phrase in request.lower() for phrase in ["analyze and", "first", "then", 
                                                        "step by step", "comprehensive"]):
            return RequestComplexity.COMPLEX
        
        # Code analysis
        if "```" in request or len(request) > 1000:
            return RequestComplexity.MODERATE
        
        # Simple queries
        simple_keywords = ["what is", "how to", "list", "show", "get", "find"]
        if any(keyword in request.lower()[:50] for keyword in simple_keywords):
            return RequestComplexity.SIMPLE
        
        # Default to moderate
        return RequestComplexity.MODERATE
    
    def _select_by_complexity(self, complexity: RequestComplexity, 
                            context: Optional[Dict[str, Any]]) -> str:
        """Select model based on complexity level"""
        
        # Map complexity to models
        complexity_map = {
            RequestComplexity.SIMPLE: "gemini-2.5-flash",
            RequestComplexity.MODERATE: "gemini-2.5-flash",
            RequestComplexity.COMPLEX: "gemini-2.5-flash",  # Still use flash by default
            RequestComplexity.CRITICAL: "gemini-2.5-flash"  # Override only when needed
        }
        
        base_model = complexity_map[complexity]
        
        # Only upgrade to Pro for critical + specific conditions
        if complexity == RequestComplexity.CRITICAL:
            # Check if user explicitly requests thorough analysis
            if context and context.get("user_preferences", {}).get("analysis_depth") == "thorough":
                if self._can_afford_pro_request():
                    return "gemini-2.5-pro"
            
            # Check if this is a production deployment decision
            if "production" in str(context).lower() and "deployment" in str(context).lower():
                if self._can_afford_pro_request():
                    return "gemini-2.5-pro"
        
        return base_model
    
    def _get_model_for_tier(self, tier: ModelTier) -> str:
        """Get a model for a specific tier"""
        tier_models = {
            ModelTier.FLASH: "gemini-2.5-flash",
            ModelTier.PRO: "gemini-2.5-pro",
            ModelTier.ULTRA: "gemini-2.5-pro"  # No ultra tier yet
        }
        return tier_models.get(tier, self.default_model)
    
    def _is_budget_exceeded(self) -> bool:
        """Check if monthly budget is exceeded"""
        monthly_cost = self.usage_tracker.get_monthly_cost()
        return monthly_cost >= self.monthly_budget_usd
    
    def _can_afford_pro_request(self) -> bool:
        """Check if we can afford a Pro model request"""
        monthly_cost = self.usage_tracker.get_monthly_cost()
        # Allow Pro if we've used less than threshold of budget
        return monthly_cost < (self.monthly_budget_usd * self.pro_model_threshold)
    
    def get_cost_report(self) -> Dict[str, Any]:
        """Get cost usage report"""
        return {
            "monthly_budget_usd": self.monthly_budget_usd,
            "current_month_cost_usd": self.usage_tracker.get_monthly_cost(),
            "usage_by_model": self.usage_tracker.get_usage_by_model(),
            "optimization_enabled": self.enable_cost_optimization,
            "default_model": self.default_model
        }


class UsageTracker:
    """Track model usage for cost monitoring"""
    
    def __init__(self):
        self.usage_data: Dict[str, Dict[str, float]] = {}
        self._load_usage_data()
    
    def track_request(self, model: str, char_count: int):
        """Track a model request"""
        import datetime
        
        month_key = datetime.datetime.now().strftime("%Y-%m")
        
        if month_key not in self.usage_data:
            self.usage_data[month_key] = {}
        
        if model not in self.usage_data[month_key]:
            self.usage_data[month_key][model] = {
                "requests": 0,
                "total_chars": 0,
                "estimated_cost_usd": 0.0
            }
        
        # Update usage
        self.usage_data[month_key][model]["requests"] += 1
        self.usage_data[month_key][model]["total_chars"] += char_count
        
        # Calculate cost (ensure 0 for free tier)
        model_config = ModelSelector.MODELS.get(model)
        if model_config and model_config.cost_per_1k_chars > 0:
            cost = (char_count / 1000) * model_config.cost_per_1k_chars
            self.usage_data[month_key][model]["estimated_cost_usd"] += cost
        else:
            # Free tier - no cost
            self.usage_data[month_key][model]["estimated_cost_usd"] = 0.0
        
        self._save_usage_data()
    
    def get_monthly_cost(self) -> float:
        """Get current month's total cost"""
        import datetime
        
        month_key = datetime.datetime.now().strftime("%Y-%m")
        if month_key not in self.usage_data:
            return 0.0
        
        total_cost = 0.0
        for model_data in self.usage_data[month_key].values():
            total_cost += model_data.get("estimated_cost_usd", 0.0)
        
        return total_cost
    
    def get_usage_by_model(self) -> Dict[str, Dict[str, Any]]:
        """Get usage breakdown by model for current month"""
        import datetime
        
        month_key = datetime.datetime.now().strftime("%Y-%m")
        return self.usage_data.get(month_key, {})
    
    def _load_usage_data(self):
        """Load usage data from file"""
        try:
            import json
            usage_file = os.path.join(os.path.dirname(__file__), "model_usage.json")
            if os.path.exists(usage_file):
                with open(usage_file, 'r') as f:
                    self.usage_data = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load usage data: {e}")
    
    def _save_usage_data(self):
        """Save usage data to file"""
        try:
            import json
            usage_file = os.path.join(os.path.dirname(__file__), "model_usage.json")
            os.makedirs(os.path.dirname(usage_file), exist_ok=True)
            with open(usage_file, 'w') as f:
                json.dump(self.usage_data, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to save usage data: {e}")


# Global model selector instance
_model_selector = None


def get_model_selector() -> ModelSelector:
    """Get or create the global model selector instance"""
    global _model_selector
    if _model_selector is None:
        _model_selector = ModelSelector()
    return _model_selector


def select_model_for_request(request: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Select the most cost-effective model for a request.
    
    Args:
        request: The request text
        context: Optional context with metadata
        
    Returns:
        Selected model name
    """
    selector = get_model_selector()
    return selector.select_model(request, context)


# Export main classes and functions
__all__ = [
    "ModelSelector",
    "ModelTier", 
    "RequestComplexity",
    "get_model_selector",
    "select_model_for_request"
]