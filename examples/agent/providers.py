"""
VANA Multi-Provider Pattern
Demonstrates how to work with multiple LLM providers using ADK
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import os
from google.adk.agents import LlmAgent


class ModelProvider(Enum):
    """Supported model providers."""
    GEMINI = "gemini"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    CUSTOM = "custom"


@dataclass
class ModelConfig:
    """Configuration for a specific model."""
    provider: ModelProvider
    model_name: str
    api_key_env: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    extra_params: Dict[str, Any] = None


# Pattern 1: Provider Configuration
class ProviderManager:
    """Manages multiple LLM provider configurations."""
    
    def __init__(self):
        self.providers = self._initialize_providers()
        self.default_provider = ModelProvider.GEMINI
    
    def _initialize_providers(self) -> Dict[ModelProvider, ModelConfig]:
        """Initialize provider configurations."""
        return {
            ModelProvider.GEMINI: ModelConfig(
                provider=ModelProvider.GEMINI,
                model_name="gemini-2.5-flash",
                api_key_env="GOOGLE_API_KEY",
                temperature=0.7
            ),
            ModelProvider.OPENAI: ModelConfig(
                provider=ModelProvider.OPENAI,
                model_name="gpt-4",
                api_key_env="OPENAI_API_KEY",
                temperature=0.7,
                max_tokens=4096
            ),
            ModelProvider.ANTHROPIC: ModelConfig(
                provider=ModelProvider.ANTHROPIC,
                model_name="claude-3-sonnet",
                api_key_env="ANTHROPIC_API_KEY",
                temperature=0.5
            )
        }
    
    def get_config(self, provider: ModelProvider) -> Optional[ModelConfig]:
        """Get configuration for a specific provider."""
        return self.providers.get(provider)
    
    def is_available(self, provider: ModelProvider) -> bool:
        """Check if provider is available (API key exists)."""
        config = self.get_config(provider)
        if not config:
            return False
        return os.environ.get(config.api_key_env) is not None


# Pattern 2: Provider-Specific Agent Creation
def create_provider_agent(
    name: str,
    provider: ModelProvider,
    provider_manager: ProviderManager,
    fallback_provider: Optional[ModelProvider] = None
) -> Optional[LlmAgent]:
    """
    Create an agent with specific provider, with fallback support.
    
    Args:
        name: Agent name
        provider: Primary provider to use
        provider_manager: Provider configuration manager
        fallback_provider: Fallback provider if primary unavailable
        
    Returns:
        Configured agent or None if no provider available
    """
    # Try primary provider
    if provider_manager.is_available(provider):
        config = provider_manager.get_config(provider)
        return LlmAgent(
            name=name,
            model=config.model_name,
            description=f"Agent using {provider.value} provider",
            instruction=f"You are powered by {config.model_name}. Provide helpful responses.",
            # Additional provider-specific parameters would go here
        )
    
    # Try fallback provider
    if fallback_provider and provider_manager.is_available(fallback_provider):
        config = provider_manager.get_config(fallback_provider)
        return LlmAgent(
            name=name,
            model=config.model_name,
            description=f"Agent using {fallback_provider.value} provider (fallback)",
            instruction=f"You are powered by {config.model_name}. Provide helpful responses.",
        )
    
    return None


# Pattern 3: Multi-Provider Agent Pool
class MultiProviderAgentPool:
    """
    Manages a pool of agents across different providers.
    Useful for load balancing or provider-specific capabilities.
    """
    
    def __init__(self):
        self.provider_manager = ProviderManager()
        self.agents = {}
        self._initialize_agents()
    
    def _initialize_agents(self):
        """Initialize agents for each available provider."""
        for provider in ModelProvider:
            if self.provider_manager.is_available(provider):
                agent = create_provider_agent(
                    name=f"{provider.value}_agent",
                    provider=provider,
                    provider_manager=self.provider_manager
                )
                if agent:
                    self.agents[provider] = agent
    
    def get_agent(self, provider: Optional[ModelProvider] = None) -> Optional[LlmAgent]:
        """
        Get an agent, optionally from a specific provider.
        
        Args:
            provider: Specific provider to use, or None for any available
            
        Returns:
            Available agent or None
        """
        if provider:
            return self.agents.get(provider)
        
        # Return first available agent
        for agent in self.agents.values():
            return agent
        
        return None
    
    def get_best_agent_for_task(self, task_type: str) -> Optional[LlmAgent]:
        """
        Get the best agent for a specific task type.
        
        Args:
            task_type: Type of task (e.g., "code", "creative", "analysis")
            
        Returns:
            Best suited agent for the task
        """
        # Task-to-provider mapping based on strengths
        task_provider_map = {
            "code": ModelProvider.GEMINI,  # Gemini excels at code
            "creative": ModelProvider.ANTHROPIC,  # Claude for creative tasks
            "analysis": ModelProvider.OPENAI,  # GPT-4 for analysis
            "general": ModelProvider.GEMINI  # Default to Gemini
        }
        
        preferred_provider = task_provider_map.get(task_type, ModelProvider.GEMINI)
        
        # Try preferred provider first
        agent = self.agents.get(preferred_provider)
        if agent:
            return agent
        
        # Fall back to any available
        return self.get_agent()


# Pattern 4: Provider-Specific Features
class ProviderFeatures:
    """Encapsulates provider-specific features and capabilities."""
    
    @staticmethod
    def get_provider_capabilities(provider: ModelProvider) -> Dict[str, Any]:
        """Get capabilities for a specific provider."""
        capabilities = {
            ModelProvider.GEMINI: {
                "supports_code_execution": True,
                "supports_function_calling": True,
                "supports_vision": True,
                "max_context_length": 1000000,
                "strengths": ["code", "multimodal", "long_context"]
            },
            ModelProvider.OPENAI: {
                "supports_code_execution": False,
                "supports_function_calling": True,
                "supports_vision": True,
                "max_context_length": 128000,
                "strengths": ["reasoning", "analysis", "general"]
            },
            ModelProvider.ANTHROPIC: {
                "supports_code_execution": False,
                "supports_function_calling": True,
                "supports_vision": True,
                "max_context_length": 200000,
                "strengths": ["writing", "analysis", "safety"]
            }
        }
        
        return capabilities.get(provider, {})
    
    @staticmethod
    def create_provider_specific_agent(
        provider: ModelProvider,
        task: str
    ) -> Optional[LlmAgent]:
        """Create an agent optimized for provider-specific features."""
        capabilities = ProviderFeatures.get_provider_capabilities(provider)
        
        if provider == ModelProvider.GEMINI:
            # Gemini-specific agent with code execution
            return LlmAgent(
                name="gemini_enhanced",
                model="gemini-2.5-flash",
                description="Gemini agent with enhanced capabilities",
                instruction=f"""You are a Gemini-powered agent optimized for: {task}
                
                Your special capabilities:
                - Code execution support
                - Ultra-long context (1M tokens)
                - Multimodal understanding
                
                Leverage these capabilities when appropriate."""
            )
        
        elif provider == ModelProvider.OPENAI:
            # OpenAI-specific agent
            return LlmAgent(
                name="gpt4_enhanced",
                model="gpt-4",
                description="GPT-4 agent with reasoning focus",
                instruction=f"""You are a GPT-4 agent optimized for: {task}
                
                Your strengths:
                - Advanced reasoning
                - Complex analysis
                - General knowledge
                
                Focus on logical, well-reasoned responses."""
            )
        
        return None


# Pattern 5: Provider Abstraction Layer
class ProviderAbstractionLayer:
    """
    Abstraction layer for provider-agnostic agent creation.
    Handles provider differences transparently.
    """
    
    def __init__(self):
        self.provider_manager = ProviderManager()
        self.feature_manager = ProviderFeatures()
    
    def create_agent(
        self,
        name: str,
        purpose: str,
        required_capabilities: List[str] = None
    ) -> Optional[LlmAgent]:
        """
        Create an agent based on required capabilities.
        
        Args:
            name: Agent name
            purpose: Agent purpose/description
            required_capabilities: List of required capabilities
            
        Returns:
            Agent meeting requirements or None
        """
        required_capabilities = required_capabilities or []
        
        # Find suitable provider
        for provider in ModelProvider:
            if not self.provider_manager.is_available(provider):
                continue
            
            capabilities = self.feature_manager.get_provider_capabilities(provider)
            
            # Check if provider meets requirements
            meets_requirements = all(
                capabilities.get(cap, False) 
                for cap in required_capabilities
            )
            
            if meets_requirements:
                config = self.provider_manager.get_config(provider)
                return LlmAgent(
                    name=name,
                    model=config.model_name,
                    description=purpose,
                    instruction=f"""You are a {purpose}.
                    Provider: {provider.value}
                    Model: {config.model_name}
                    
                    Provide excellent service within your capabilities."""
                )
        
        return None


# Usage Examples
def demonstrate_multi_provider_patterns():
    """Demonstrate various multi-provider patterns."""
    
    # Pattern 1: Basic provider management
    provider_manager = ProviderManager()
    print("Available providers:")
    for provider in ModelProvider:
        if provider_manager.is_available(provider):
            print(f"  - {provider.value}")
    
    # Pattern 2: Create agent with fallback
    agent = create_provider_agent(
        name="versatile_agent",
        provider=ModelProvider.ANTHROPIC,
        provider_manager=provider_manager,
        fallback_provider=ModelProvider.GEMINI
    )
    if agent:
        print(f"\nCreated agent: {agent.name} with model: {agent.model}")
    
    # Pattern 3: Agent pool for task routing
    agent_pool = MultiProviderAgentPool()
    code_agent = agent_pool.get_best_agent_for_task("code")
    if code_agent:
        print(f"\nBest agent for code tasks: {code_agent.name}")
    
    # Pattern 4: Provider abstraction
    abstraction = ProviderAbstractionLayer()
    vision_agent = abstraction.create_agent(
        name="vision_analyzer",
        purpose="Image analysis specialist",
        required_capabilities=["supports_vision"]
    )
    if vision_agent:
        print(f"\nCreated vision-capable agent: {vision_agent.name}")


if __name__ == "__main__":
    demonstrate_multi_provider_patterns()