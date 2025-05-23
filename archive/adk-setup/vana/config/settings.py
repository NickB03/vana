"""
Configuration settings for the VANA project.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Model configuration
MODEL = os.getenv("MODEL", "gemini-2.0-flash")

# Google Cloud configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

# Vector Search configuration
VECTOR_SEARCH_INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
VECTOR_SEARCH_DIMENSIONS = int(os.getenv("VECTOR_SEARCH_DIMENSIONS", "768"))
