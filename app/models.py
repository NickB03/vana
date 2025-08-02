"""Model configuration for LiteLLM and OpenRouter integration."""

import os
from typing import Union

from google.adk.models.lite_llm import LiteLlm

# Check if we should use OpenRouter
USE_OPENROUTER = os.getenv("USE_OPENROUTER", "false").lower() == "true"

if USE_OPENROUTER:
    # Qwen3 Coder Free model for both critic and worker
    # This is a capable coding model available for free on OpenRouter
    CRITIC_MODEL = LiteLlm(model="openrouter/qwen/qwen3-coder:free")
    WORKER_MODEL = LiteLlm(model="openrouter/qwen/qwen3-coder:free")
    
    print("[Models] Using OpenRouter with Qwen3 Coder Free model")
    print(f"[Models] Brave API Key configured: {'BRAVE_API_KEY' in os.environ or 'BSA6' in os.environ.get('BRAVE_API_KEY', '')}")
else:
    # Default Gemini models
    CRITIC_MODEL = "gemini-2.5-pro"
    WORKER_MODEL = "gemini-2.5-flash"
    
    print("[Models] Using default Gemini models")

# Type alias for model configuration
ModelType = Union[str, LiteLlm]