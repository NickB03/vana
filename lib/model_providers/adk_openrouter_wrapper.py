"""
Google ADK OpenRouter Wrapper

This module provides proper OpenRouter integration with Google ADK using LiteLLM.
Based on the official implementation pattern from BitDoze.
"""

import os
import logging
from google.adk.agents import LlmAgent

# Import LiteLLM from Google ADK (correct path from BitDoze article)
try:
    from google.adk.models.lite_llm import LiteLlm
    LITELLM_AVAILABLE = True
except ImportError:
    LiteLlm = None
    LITELLM_AVAILABLE = False
    logging.warning("LiteLlm not available in Google ADK")

from .openrouter_provider import is_openrouter_model

logger = logging.getLogger(__name__)

def create_llm_agent(*args, **kwargs) -> LlmAgent:
    """
    Factory function to create an LlmAgent with proper OpenRouter support via LiteLLM.

    This follows the official pattern from BitDoze article on ADK + OpenRouter integration.

    Args:
        *args: Arguments to pass to LlmAgent constructor
        **kwargs: Keyword arguments to pass to LlmAgent constructor

    Returns:
        LlmAgent instance with OpenRouter support if configured
    """
    model = kwargs.get('model', os.getenv('VANA_MODEL', ''))

    if is_openrouter_model(model) and LITELLM_AVAILABLE:
        logger.info(f"OpenRouter model detected: {model}")

        # Get OpenRouter API key
        openrouter_api_key = os.getenv('OPENROUTER_API_KEY')
        if not openrouter_api_key:
            logger.error("OPENROUTER_API_KEY not found, falling back to Gemini")
            kwargs['model'] = 'gemini-2.0-flash'
            return LlmAgent(*args, **kwargs)

        # Extract the actual model name and format correctly for OpenRouter
        # Convert from 'openrouter/deepseek/deepseek-r1-0528:free'
        # to 'openrouter/openrouter/deepseek/deepseek-r1-0528:free'
        if model.startswith('openrouter/') and not model.startswith('openrouter/openrouter/'):
            actual_model = model.replace('openrouter/', 'openrouter/openrouter/')
        else:
            actual_model = model

        logger.info(f"Using OpenRouter model via LiteLLM: {actual_model}")

        # Create LiteLlm instance using the correct pattern from BitDoze article
        if LITELLM_AVAILABLE:
            litellm_model = LiteLlm(
                model=actual_model,
                api_key=openrouter_api_key,
                api_base="https://openrouter.ai/api/v1"
            )
        else:
            logger.error("LiteLlm not available, falling back to Gemini")
            kwargs['model'] = 'gemini-2.0-flash'
            return LlmAgent(*args, **kwargs)

        # Replace the model parameter with the LiteLLM instance
        kwargs['model'] = litellm_model
        logger.info("Successfully configured OpenRouter via LiteLLM")
        return LlmAgent(*args, **kwargs)
    else:
        if is_openrouter_model(model) and not LITELLM_AVAILABLE:
            logger.error("OpenRouter model requested but LiteLLM not available. Falling back to Gemini.")
            kwargs['model'] = 'gemini-2.0-flash'
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
