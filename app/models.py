"""Model configuration for Google Gemini models.

Vana uses Google Gemini 2.5 models as the primary AI system:
- CRITIC_MODEL: Gemini 2.5 Pro for evaluation and critical thinking tasks
- WORKER_MODEL: Gemini 2.5 Flash for fast generation and working tasks

The system uses the Google AI Studio API key directly when available.
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Google API key if provided - NO DEFAULT FOR SECURITY
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
    # Keep Vertex AI enabled for RAG functionality
    # The API key will be used for Gemini models through AI Studio when needed
else:
    logger.warning("GOOGLE_API_KEY environment variable not set. Google AI features will not be available.")

# Type alias for model configuration
ModelType = str

# PRIMARY: Google Gemini models
CRITIC_MODEL: ModelType = "gemini-2.5-pro"
WORKER_MODEL: ModelType = "gemini-2.5-flash"

logger.info("[Models] ✅ PRIMARY: Using Google Gemini 2.5 models")
logger.info(f"[Models] CRITIC: {CRITIC_MODEL} | WORKER: {WORKER_MODEL}")
logger.info(f"[Models] Google API Key configured: {'✅' if GOOGLE_API_KEY else '❌'}")
logger.info(f"[Models] Brave API Key configured: {bool(os.getenv('BRAVE_API_KEY'))}")

# Security validation
if not GOOGLE_API_KEY:
    logger.error("[SECURITY] Google API Key not configured. Set GOOGLE_API_KEY environment variable.")
