"""
Google ADK OpenRouter Wrapper

This module provides a wrapper that allows Google ADK's LlmAgent to use OpenRouter models
while maintaining full compatibility with the existing ADK interface.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from google.adk.agents import LlmAgent

from .openrouter_provider import create_openrouter_provider, is_openrouter_model

logger = logging.getLogger(__name__)

class OpenRouterLlmAgent(LlmAgent):
    """
    Extended LlmAgent that can use OpenRouter models while maintaining ADK compatibility.
    
    This class intercepts model calls and routes them to OpenRouter when an OpenRouter
    model is configured, while falling back to standard ADK behavior for other models.
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize the agent with OpenRouter support."""
        self.openrouter_provider = None
        
        # Check if we should use OpenRouter
        model = kwargs.get('model', os.getenv('VANA_MODEL', ''))
        
        if is_openrouter_model(model):
            logger.info(f"Initializing agent with OpenRouter model: {model}")
            self.openrouter_provider = create_openrouter_provider()
            
            if self.openrouter_provider:
                # Replace the model with a standard Gemini model for ADK initialization
                # but we'll intercept the actual calls
                kwargs['model'] = 'gemini-2.0-flash'
                logger.info("OpenRouter provider initialized successfully")
            else:
                logger.error("Failed to initialize OpenRouter provider, falling back to standard model")
        
        # Initialize the parent LlmAgent
        super().__init__(*args, **kwargs)
        
        # Store the original model name for reference
        self.original_model = model
    
    def _generate_content(self, messages: List[Dict[str, Any]], **kwargs) -> Dict[str, Any]:
        """
        Override content generation to use OpenRouter when configured.
        
        Args:
            messages: List of message objects
            **kwargs: Additional parameters for generation
            
        Returns:
            Generated content response
        """
        if self.openrouter_provider:
            try:
                logger.debug(f"Using OpenRouter for content generation with model: {self.original_model}")
                return self.openrouter_provider.generate_content(messages, **kwargs)
            except Exception as e:
                logger.error(f"OpenRouter generation failed: {e}, falling back to standard model")
                # Fall back to standard ADK behavior
                return super()._generate_content(messages, **kwargs)
        else:
            # Use standard ADK behavior
            return super()._generate_content(messages, **kwargs)

def create_llm_agent(*args, **kwargs) -> LlmAgent:
    """
    Factory function to create an LlmAgent with OpenRouter support.
    
    This function automatically detects if an OpenRouter model is configured
    and returns the appropriate agent type.
    
    Args:
        *args: Arguments to pass to LlmAgent constructor
        **kwargs: Keyword arguments to pass to LlmAgent constructor
        
    Returns:
        LlmAgent instance with OpenRouter support if needed
    """
    model = kwargs.get('model', os.getenv('VANA_MODEL', ''))
    
    if is_openrouter_model(model):
        logger.info(f"Creating OpenRouter-enabled agent for model: {model}")
        return OpenRouterLlmAgent(*args, **kwargs)
    else:
        logger.info(f"Creating standard ADK agent for model: {model}")
        return LlmAgent(*args, **kwargs)

def get_effective_model() -> str:
    """
    Get the effective model being used, accounting for OpenRouter configuration.
    
    Returns:
        The actual model name being used
    """
    model = os.getenv('VANA_MODEL', 'gemini-2.0-flash')
    
    if is_openrouter_model(model):
        # Return the actual OpenRouter model name
        return model.replace('openrouter/', '')
    else:
        return model
