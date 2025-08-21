"""Model configuration for LiteLLM and OpenRouter integration.

Vana uses a two-tier AI model system:
1. PRIMARY: LiteLLM with OpenRouter using Qwen 3 Coder (FREE tier) - used when OPENROUTER_API_KEY is present
2. FALLBACK: Google Gemini 2.5 Pro/Flash - used when OpenRouter is unavailable

OpenRouter is automatically selected when the API key is present.
"""

import os
from typing import Union

from google.adk.models.lite_llm import LiteLlm

# Primary model provider: Check if OpenRouter API key is available
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
USE_OPENROUTER_OVERRIDE = (
    os.getenv("USE_OPENROUTER", "").lower() == "false"
)  # Explicit override to disable

# Automatically use OpenRouter when API key is present (unless explicitly disabled)
USE_OPENROUTER = bool(OPENROUTER_API_KEY) and not USE_OPENROUTER_OVERRIDE

# Set OpenRouter API key for LiteLLM if configured
if USE_OPENROUTER and OPENROUTER_API_KEY:
    os.environ["OPENROUTER_API_KEY"] = OPENROUTER_API_KEY

# Initialize model variables with type hints
CRITIC_MODEL: ModelType
WORKER_MODEL: ModelType

if USE_OPENROUTER:
    # PRIMARY: LiteLLM with OpenRouter using Qwen 3 Coder (FREE tier)
    # This is a capable coding model available on OpenRouter at no cost
    CRITIC_MODEL = LiteLlm(model="openrouter/qwen/qwen-3-coder:free")
    WORKER_MODEL = LiteLlm(model="openrouter/qwen/qwen-3-coder:free")

    print("[Models] ✅ PRIMARY: Using OpenRouter with Qwen 3 Coder model (FREE tier)")
    print(f"[Models] Brave API Key configured: {bool(os.environ.get('BRAVE_API_KEY'))}")
else:
    # FALLBACK: Google Gemini models when OpenRouter is not available
    CRITIC_MODEL = "gemini-2.5-pro"
    WORKER_MODEL = "gemini-2.5-flash"

    if OPENROUTER_API_KEY and USE_OPENROUTER_OVERRIDE:
        print(
            "[Models] ⚠️  FALLBACK: Using Gemini models (OpenRouter explicitly disabled)"
        )
    else:
        print(
            "[Models] ⚠️  FALLBACK: Using Gemini models (OpenRouter API key not configured)"
        )
        print(
            "[Models] 💡 Tip: Set OPENROUTER_API_KEY for faster, free Qwen 3 Coder model"
        )

# Type alias for model configuration
ModelType = Union[str, LiteLlm]
