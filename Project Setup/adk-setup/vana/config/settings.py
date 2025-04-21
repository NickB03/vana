import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Core configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")  
GOOGLE_GENAI_USE_VERTEXAI = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "True")

# Model configuration
MODEL = os.getenv("MODEL", "gemini-2.0-flash")

# Vector search configuration
VECTOR_SEARCH_INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
VECTOR_SEARCH_DIMENSIONS = int(os.getenv("VECTOR_SEARCH_DIMENSIONS", "768"))
