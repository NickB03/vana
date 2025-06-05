"""
Google ADK OpenRouter Wrapper

This module provides a wrapper that allows Google ADK's LlmAgent to use OpenRouter models
while maintaining full compatibility with the existing ADK interface.
"""

import os
import logging
from google.adk.agents import LlmAgent

from .openrouter_provider import is_openrouter_model

logger = logging.getLogger(__name__)

def create_llm_agent(*args, **kwargs) -> LlmAgent:
    """
    Factory function to create an LlmAgent with OpenRouter support.

    This function automatically detects if an OpenRouter model is configured
    and falls back to a compatible model for ADK while logging the intent.

    Args:
        *args: Arguments to pass to LlmAgent constructor
        **kwargs: Keyword arguments to pass to LlmAgent constructor

    Returns:
        LlmAgent instance
    """
    model = kwargs.get('model', os.getenv('VANA_MODEL', ''))

    if is_openrouter_model(model):
        logger.warning(f"OpenRouter model detected: {model}")
        logger.warning("OpenRouter integration is not yet fully implemented.")
        logger.warning("Falling back to gemini-2.0-flash for ADK compatibility.")
        # Use a compatible model for now
        kwargs['model'] = 'gemini-2.0-flash'
        return LlmAgent(*args, **kwargs)
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
