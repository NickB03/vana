import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MCP Memory Server Configuration
MCP_MEMORY_SERVER = {
    "endpoint": os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
    "namespace": os.environ.get("MCP_NAMESPACE", "vana-project"),
    "api_key": os.environ.get("MCP_API_KEY", "")
}

# Memory Manager Configuration
MEMORY_MANAGER = {
    "sync_interval": int(os.environ.get("MEMORY_SYNC_INTERVAL", "300")),  # 5 minutes
    "cache_size": int(os.environ.get("MEMORY_CACHE_SIZE", "1000")),
    "cache_ttl": int(os.environ.get("MEMORY_CACHE_TTL", "3600"))  # 1 hour
}

# Entity Scorer Configuration
ENTITY_SCORER = {
    "half_life_days": int(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30")),
    "type_weights": {
        "Person": 0.9,
        "Organization": 0.8,
        "Project": 0.7,
        "Task": 0.6,
        "Preference": 0.9,
        "Conversation": 0.5,
        "Fact": 0.7,
        "Default": 0.5
    }
}

# Hybrid Search Configuration
HYBRID_SEARCH = {
    "vector_search_weight": float(os.environ.get("VECTOR_SEARCH_WEIGHT", "0.7")),
    "knowledge_graph_weight": float(os.environ.get("KNOWLEDGE_GRAPH_WEIGHT", "0.3")),
    "default_top_k": int(os.environ.get("DEFAULT_TOP_K", "5"))
}
