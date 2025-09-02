"""Model configuration for Google Gemini models.

Vana uses Google Gemini 2.5 models as the primary AI system:
- CRITIC_MODEL: Gemini 2.5 Pro for evaluation and critical thinking tasks
- WORKER_MODEL: Gemini 2.5 Flash for fast generation and working tasks

The system uses the Google AI Studio API key directly when available.
"""

import os

# Set Google API key if provided
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyDBnz8MA7VuNR9jIZ4dGf1IOzZhpLfE5Z0")
if GOOGLE_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY
    # Keep Vertex AI enabled for RAG functionality
    # The API key will be used for Gemini models through AI Studio when needed

# Type alias for model configuration
ModelType = str

# PRIMARY: Google Gemini models
CRITIC_MODEL: ModelType = "gemini-2.5-pro"
WORKER_MODEL: ModelType = "gemini-2.5-flash"

print("[Models] ✅ PRIMARY: Using Google Gemini 2.5 models")
print(f"[Models] CRITIC: {CRITIC_MODEL} | WORKER: {WORKER_MODEL}")
print(f"[Models] Google API Key configured: {'✅' if GOOGLE_API_KEY else '❌'}")
print(f"[Models] Brave API Key configured: {bool(os.getenv('BRAVE_API_KEY'))}")
