"""Model configuration for LiteLLM and OpenRouter integration."""

import os
from typing import Union

from google.adk.models.lite_llm import LiteLlm

# Check if we should use OpenRouter
USE_OPENROUTER = os.getenv("USE_OPENROUTER", "false").lower() == "true"

# Set OpenRouter API key for LiteLLM if configured
if USE_OPENROUTER and os.getenv("OPENROUTER_API_KEY"):
    os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY")

if USE_OPENROUTER:
    # Qwen 3 Coder model for both critic and worker
    # This is a capable coding model available on OpenRouter
    CRITIC_MODEL = LiteLlm(model="openrouter/qwen/qwen-3-coder:free")
    WORKER_MODEL = LiteLlm(model="openrouter/qwen/qwen-3-coder:free")
    
    print("[Models] Using OpenRouter with Qwen 3 Coder model")
    print(f"[Models] Brave API Key configured: {bool(os.environ.get('BRAVE_API_KEY'))}")
else:
    # Default Gemini models
    CRITIC_MODEL = "gemini-2.5-pro"
    WORKER_MODEL = "gemini-2.5-flash"
    
    print("[Models] Using default Gemini models")

# Type alias for model configuration
ModelType = Union[str, LiteLlm]