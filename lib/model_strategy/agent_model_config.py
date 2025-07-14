"""
Agent-Specific Model Configuration for VANA
Implements per-agent model assignment based on role and requirements.
"""

import os
from typing import Dict, Optional, Any, List
from dataclasses import dataclass
from enum import Enum

from lib.logging_config import get_logger

logger = get_logger("vana.agent_model_config")


class AgentRole(Enum):
    """Agent roles that determine model requirements"""
    ORCHESTRATOR = "orchestrator"        # Main coordinator - needs balanced performance
    ROUTER = "router"                    # Simple routing decisions - flash model
    ANALYZER = "analyzer"                # Deep analysis - reasoning model
    SPECIALIST = "specialist"            # Domain expert - varies by specialty
    WORKFLOW = "workflow"                # Workflow management - flash model
    SECURITY = "security"                # Security critical - reasoning model


class ModelType(Enum):
    """Model types for different use cases"""
    FLASH = "flash"                      # Fast, cost-effective (gemini-2.5-flash)
    REASONING = "reasoning"              # Complex reasoning (gemini-2.5-pro)
    SPECIAL = "special"                  # Special purpose (future models)
    LEGACY = "legacy"                    # Legacy support (gemini-2.0-flash)


@dataclass
class AgentModelProfile:
    """Model profile for an agent"""
    agent_name: str
    role: AgentRole
    default_model_type: ModelType
    fallback_model_type: ModelType
    can_upgrade: bool = True             # Can upgrade to better model if needed
    can_downgrade: bool = True           # Can downgrade to save costs
    special_requirements: Dict[str, Any] = None


class AgentModelConfigurator:
    """
    Configure and manage model assignments for different agents.
    Implements the dynamic model decision system.
    """
    
    # Default model mappings
    MODEL_TYPE_MAPPING = {
        ModelType.FLASH: "gemini-2.5-flash",
        ModelType.REASONING: "gemini-2.5-pro",
        ModelType.SPECIAL: "gemini-2.5-pro",  # Placeholder
        ModelType.LEGACY: "gemini-2.0-flash"
    }
    
    # Default agent profiles
    DEFAULT_PROFILES = {
        # Orchestrators use flash model by default, can upgrade for complex tasks
        "enhanced_orchestrator": AgentModelProfile(
            agent_name="enhanced_orchestrator",
            role=AgentRole.ORCHESTRATOR,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=True,
            can_downgrade=False
        ),
        
        # Security specialist always uses reasoning model
        "security_specialist": AgentModelProfile(
            agent_name="security_specialist",
            role=AgentRole.SECURITY,
            default_model_type=ModelType.REASONING,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=False,  # Already at highest
            can_downgrade=True  # Only in emergencies
        ),
        
        # Architecture specialist uses flash but can upgrade
        "architecture_specialist": AgentModelProfile(
            agent_name="architecture_specialist",
            role=AgentRole.SPECIALIST,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=True,
            can_downgrade=False
        ),
        
        # Data science specialist uses flash for basic stats
        "data_science_specialist": AgentModelProfile(
            agent_name="data_science_specialist",
            role=AgentRole.SPECIALIST,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=True,  # Upgrade for ML tasks
            can_downgrade=False
        ),
        
        # QA specialist uses flash model
        "qa_specialist": AgentModelProfile(
            agent_name="qa_specialist",
            role=AgentRole.SPECIALIST,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=False,
            can_downgrade=False
        ),
        
        # UI specialist uses flash model
        "ui_specialist": AgentModelProfile(
            agent_name="ui_specialist",
            role=AgentRole.SPECIALIST,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=False,
            can_downgrade=False
        ),
        
        # DevOps specialist uses flash model
        "devops_specialist": AgentModelProfile(
            agent_name="devops_specialist",
            role=AgentRole.SPECIALIST,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=True,  # For complex deployments
            can_downgrade=False
        ),
        
        # Workflow managers always use flash
        "sequential_workflow_manager": AgentModelProfile(
            agent_name="sequential_workflow_manager",
            role=AgentRole.WORKFLOW,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=False,
            can_downgrade=False
        ),
        
        "parallel_workflow_manager": AgentModelProfile(
            agent_name="parallel_workflow_manager",
            role=AgentRole.WORKFLOW,
            default_model_type=ModelType.FLASH,
            fallback_model_type=ModelType.FLASH,
            can_upgrade=False,
            can_downgrade=False
        )
    }
    
    def __init__(self):
        """Initialize the configurator"""
        self.profiles: Dict[str, AgentModelProfile] = self.DEFAULT_PROFILES.copy()
        self._load_custom_profiles()
        
        # Load environment overrides
        self.enable_dynamic_selection = os.getenv("VANA_DYNAMIC_MODEL_SELECTION", "true").lower() == "true"
        self.cost_optimization_level = os.getenv("VANA_COST_OPTIMIZATION", "balanced")  # aggressive, balanced, performance
        
        logger.info(f"AgentModelConfigurator initialized: dynamic={self.enable_dynamic_selection}, "
                   f"optimization={self.cost_optimization_level}")
    
    def get_model_for_agent(self, agent_name: str, request_context: Optional[Dict[str, Any]] = None) -> str:
        """
        Get the appropriate model for an agent based on profile and context.
        
        Args:
            agent_name: Name of the agent
            request_context: Optional context about the current request
            
        Returns:
            Model name to use
        """
        # Get agent profile
        profile = self.profiles.get(agent_name)
        if not profile:
            logger.warning(f"No profile found for agent: {agent_name}, using default")
            return self.MODEL_TYPE_MAPPING[ModelType.FLASH]
        
        # If dynamic selection is disabled, use default
        if not self.enable_dynamic_selection:
            return self.MODEL_TYPE_MAPPING[profile.default_model_type]
        
        # Check if we should upgrade or downgrade
        model_type = self._determine_model_type(profile, request_context)
        
        return self.MODEL_TYPE_MAPPING[model_type]
    
    def _determine_model_type(self, profile: AgentModelProfile, 
                            context: Optional[Dict[str, Any]]) -> ModelType:
        """Determine the appropriate model type based on profile and context"""
        
        base_type = profile.default_model_type
        
        # Check cost optimization level
        if self.cost_optimization_level == "aggressive":
            # Always use cheapest model unless critical
            if context and context.get("priority") == "critical":
                return base_type
            return profile.fallback_model_type
        
        # Check if upgrade is needed
        if profile.can_upgrade and context:
            # Upgrade conditions
            upgrade_conditions = [
                context.get("request_complexity") == "complex",
                context.get("priority") in ["high", "critical"],
                context.get("requires_reasoning", False),
                len(context.get("request", "")) > 5000,  # Long requests
                "multi-step" in str(context.get("analysis_type", ""))
            ]
            
            if any(upgrade_conditions):
                # Upgrade to reasoning model
                if base_type == ModelType.FLASH:
                    logger.info(f"Upgrading {profile.agent_name} from FLASH to REASONING")
                    return ModelType.REASONING
        
        # Check if downgrade is needed
        if profile.can_downgrade and context:
            # Downgrade conditions
            downgrade_conditions = [
                context.get("budget_exceeded", False),
                context.get("request_complexity") == "simple",
                self.cost_optimization_level == "aggressive"
            ]
            
            if any(downgrade_conditions):
                logger.info(f"Downgrading {profile.agent_name} to fallback model")
                return profile.fallback_model_type
        
        return base_type
    
    def register_agent_profile(self, profile: AgentModelProfile):
        """Register a custom agent profile"""
        self.profiles[profile.agent_name] = profile
        logger.info(f"Registered profile for agent: {profile.agent_name}")
    
    def update_agent_model_type(self, agent_name: str, model_type: ModelType):
        """Update the default model type for an agent"""
        if agent_name in self.profiles:
            self.profiles[agent_name].default_model_type = model_type
            logger.info(f"Updated {agent_name} to use {model_type.value} model")
    
    def get_cost_summary(self) -> Dict[str, Any]:
        """Get summary of model assignments and potential costs"""
        summary = {
            "total_agents": len(self.profiles),
            "model_distribution": {
                ModelType.FLASH.value: 0,
                ModelType.REASONING.value: 0,
                ModelType.SPECIAL.value: 0,
                ModelType.LEGACY.value: 0
            },
            "agents_by_model": {
                ModelType.FLASH.value: [],
                ModelType.REASONING.value: [],
                ModelType.SPECIAL.value: [],
                ModelType.LEGACY.value: []
            }
        }
        
        for profile in self.profiles.values():
            model_type = profile.default_model_type
            summary["model_distribution"][model_type.value] += 1
            summary["agents_by_model"][model_type.value].append(profile.agent_name)
        
        return summary
    
    def _load_custom_profiles(self):
        """Load custom agent profiles from configuration"""
        # This could load from a YAML/JSON file in the future
        pass
    
    def get_recommendation(self, agent_name: str) -> Dict[str, Any]:
        """Get model recommendation for an agent"""
        profile = self.profiles.get(agent_name)
        if not profile:
            return {"error": f"No profile found for {agent_name}"}
        
        return {
            "agent_name": agent_name,
            "role": profile.role.value,
            "current_model": self.MODEL_TYPE_MAPPING[profile.default_model_type],
            "recommended_model": self.MODEL_TYPE_MAPPING[profile.default_model_type],
            "can_upgrade": profile.can_upgrade,
            "can_downgrade": profile.can_downgrade,
            "cost_tier": "free" if profile.default_model_type == ModelType.FLASH else "paid",
            "use_cases": self._get_use_cases_for_role(profile.role)
        }
    
    def _get_use_cases_for_role(self, role: AgentRole) -> List[str]:
        """Get typical use cases for an agent role"""
        use_cases = {
            AgentRole.ORCHESTRATOR: ["Request routing", "Task coordination", "Response aggregation"],
            AgentRole.SECURITY: ["Vulnerability analysis", "Security audits", "Threat assessment"],
            AgentRole.SPECIALIST: ["Domain-specific analysis", "Code review", "Technical recommendations"],
            AgentRole.WORKFLOW: ["Task sequencing", "Parallel execution", "State management"],
            AgentRole.ROUTER: ["Simple routing decisions", "Quick classification"],
            AgentRole.ANALYZER: ["Deep analysis", "Complex reasoning", "Multi-step problem solving"]
        }
        return use_cases.get(role, ["General tasks"])


# Global configurator instance
_agent_model_configurator = None


def get_agent_model_configurator() -> AgentModelConfigurator:
    """Get or create the global agent model configurator"""
    global _agent_model_configurator
    if _agent_model_configurator is None:
        _agent_model_configurator = AgentModelConfigurator()
    return _agent_model_configurator


def get_model_for_agent(agent_name: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Get the appropriate model for a specific agent.
    
    Args:
        agent_name: Name of the agent
        context: Optional request context
        
    Returns:
        Model name to use
    """
    configurator = get_agent_model_configurator()
    return configurator.get_model_for_agent(agent_name, context)


# Export main classes and functions
__all__ = [
    "AgentModelConfigurator",
    "AgentModelProfile",
    "AgentRole",
    "ModelType",
    "get_agent_model_configurator",
    "get_model_for_agent"
]