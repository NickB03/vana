# webui/backend/config.py

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings
    SettingsConfigDict = None

# Load environment variables from VANA's existing environment system
# This integrates with lib/environment.py's smart environment detection
project_root = Path(__file__).parent.parent.parent

def get_env_var(name: str, default: str = "", required: bool = False) -> str:
    """
    Retrieve environment variable or raise error if required and missing.

    Args:
        name: Environment variable name
        default: Default value if not found
        required: Whether the variable is required

    Returns:
        Environment variable value or default

    Raises:
        RuntimeError: If required variable is missing
    """
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value or default

def get_env_var_optional(name: str, default: Optional[str] = None) -> Optional[str]:
    """
    Retrieve optional environment variable.

    Args:
        name: Environment variable name
        default: Default value if not found

    Returns:
        Environment variable value or default
    """
    return os.getenv(name, default)

def load_vana_environment():
    """
    Load VANA environment configuration following existing patterns.
    Integrates with lib/environment.py's environment detection.
    """
    # Check if we're in Cloud Run (production)
    if os.getenv("K_SERVICE"):
        # Cloud Run Production Environment
        env_file = project_root / ".env.production"
        if env_file.exists():
            load_dotenv(env_file)
    else:
        # Local Development Environment
        env_file = project_root / ".env.local"
        if env_file.exists():
            load_dotenv(env_file)
        
        # Fallback to main .env file
        main_env_file = project_root / ".env"
        if main_env_file.exists():
            load_dotenv(main_env_file)

# Load environment before defining settings
load_vana_environment()

class VanaBackendSettings(BaseSettings):
    """
    Centralized configuration for the VANA FastAPI backend.
    
    This configuration integrates with VANA's existing environment system
    and follows FastAPI best practices for settings management.
    
    Environment variables are automatically loaded from:
    - .env.production (Cloud Run)
    - .env.local (Local development)
    - .env (Fallback)
    """
    
    # === Core VANA Configuration ===
    # Google Cloud & AI Configuration (VANA uses Google, not OpenAI)
    google_api_key: Optional[str] = get_env_var_optional("GOOGLE_API_KEY")
    google_cloud_project: Optional[str] = get_env_var_optional("GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = get_env_var("GOOGLE_CLOUD_LOCATION", default="us-central1")
    google_application_credentials: Optional[str] = get_env_var_optional("GOOGLE_APPLICATION_CREDENTIALS")

    # Vertex AI Configuration
    vertex_ai_location: str = get_env_var("VERTEX_AI_LOCATION", default="us-central1")
    google_genai_use_vertexai: str = get_env_var("GOOGLE_GENAI_USE_VERTEXAI", default="True")

    # VANA Model Configuration
    vana_model: str = get_env_var("VANA_MODEL", default="gemini-2.0-flash-exp")
    vana_env: str = get_env_var("VANA_ENV", default="development")
    vana_host: str = get_env_var("VANA_HOST", default="localhost")
    
    # === Security & Session Configuration ===
    session_secret: str = get_env_var("SESSION_SECRET", default="changeme-in-production")
    jwt_secret_key: str = get_env_var("JWT_SECRET_KEY", default="changeme-in-production")
    jwt_algorithm: str = get_env_var("JWT_ALGORITHM", default="HS256")
    jwt_expire_minutes: int = int(get_env_var("JWT_EXPIRE_MINUTES", default="30"))
    
    # === FastAPI Server Configuration ===
    api_host: str = get_env_var("API_HOST", default="0.0.0.0")
    api_port: int = int(get_env_var("API_PORT", default="8000"))
    api_workers: int = int(get_env_var("API_WORKERS", default="1"))
    api_reload: bool = get_env_var("API_RELOAD", default="false").lower() == "true"
    
    # === VANA Service URLs ===
    vana_service_url: str = get_env_var("VANA_SERVICE_URL", default="http://localhost:8080")
    vana_memory_api_url: str = get_env_var("VANA_MEMORY_API_URL", default="http://localhost:8000/api/memory")
    vana_agent_api_url: str = get_env_var("VANA_AGENT_API_URL", default="http://localhost:8000/api/agents")
    vana_system_api_url: str = get_env_var("VANA_SYSTEM_API_URL", default="http://localhost:8000/api/system")
    vana_task_api_url: str = get_env_var("VANA_TASK_API_URL", default="http://localhost:8000/api/tasks")

    # === Database Configuration ===
    database_url: Optional[str] = get_env_var_optional("DATABASE_URL")
    session_db_url: str = get_env_var("SESSION_DB_URL", default="sqlite:////tmp/sessions.db")
    
    # === CORS Configuration ===
    allowed_origins: str = get_env_var("ALLOWED_ORIGINS", default="http://localhost,http://localhost:3000,http://localhost:8080,*")
    
    # === Feature Flags ===
    vana_feature_workflow_enabled: bool = get_env_var("VANA_FEATURE_WORKFLOW_ENABLED", default="true").lower() == "true"
    vana_feature_mcp_enabled: bool = get_env_var("VANA_FEATURE_MCP_ENABLED", default="true").lower() == "true"
    vana_feature_vector_search_enabled: bool = get_env_var("VANA_FEATURE_VECTOR_SEARCH_ENABLED", default="true").lower() == "true"
    vana_feature_web_interface_enabled: bool = get_env_var("VANA_FEATURE_WEB_INTERFACE_ENABLED", default="true").lower() == "true"
    
    # === Branding & UI Configuration ===
    vana_brand_name: str = get_env_var("VANA_BRAND_NAME", default="VANA")
    vana_brand_tagline: str = get_env_var("VANA_BRAND_TAGLINE", default="AI Agent Orchestration Platform")
    
    # === Logging & Monitoring ===
    log_level: str = get_env_var("LOG_LEVEL", default="INFO")
    debug_mode: bool = get_env_var("DEBUG", default="false").lower() == "true"
    
    # === Vector Search Configuration ===
    vector_search_endpoint: Optional[str] = get_env_var_optional("VECTOR_SEARCH_ENDPOINT")
    vector_search_index: Optional[str] = get_env_var_optional("VECTOR_SEARCH_INDEX")
    vector_search_index_id: Optional[str] = get_env_var_optional("VECTOR_SEARCH_INDEX_ID")
    vector_search_dimensions: int = int(get_env_var("VECTOR_SEARCH_DIMENSIONS", default="768"))
    deployed_index_id: Optional[str] = get_env_var_optional("DEPLOYED_INDEX_ID")

    # === RAG Configuration (Real Corpus) ===
    rag_corpus_resource_name: Optional[str] = get_env_var_optional("RAG_CORPUS_RESOURCE_NAME")
    vana_rag_corpus_id: Optional[str] = get_env_var_optional("VANA_RAG_CORPUS_ID")
    memory_similarity_top_k: int = int(get_env_var("MEMORY_SIMILARITY_TOP_K", default="5"))
    memory_vector_distance_threshold: float = float(get_env_var("MEMORY_VECTOR_DISTANCE_THRESHOLD", default="0.7"))
    session_service_type: str = get_env_var("SESSION_SERVICE_TYPE", default="vertex_ai")

    # === API Keys (Production Services) ===
    brave_api_key: Optional[str] = get_env_var_optional("BRAVE_API_KEY")
    openrouter_api_key: Optional[str] = get_env_var_optional("OPENROUTER_API_KEY")

    # === MCP Configuration ===
    mcp_enabled: bool = get_env_var("MCP_ENABLED", default="true").lower() == "true"
    mcp_server_port: int = int(get_env_var("MCP_SERVER_PORT", default="3001"))

    # === Development Configuration ===
    use_mock_data: bool = get_env_var("USE_MOCK_DATA", default="false").lower() == "true"
    use_local_mcp: bool = get_env_var("USE_LOCAL_MCP", default="false").lower() == "true"
    vana_use_mock: bool = get_env_var("VANA_USE_MOCK", default="false").lower() == "true"
    dashboard_enabled: bool = get_env_var("DASHBOARD_ENABLED", default="true").lower() == "true"
    
    # Pydantic configuration
    if SettingsConfigDict:
        model_config = SettingsConfigDict(
            env_file=".env",
            env_file_encoding="utf-8",
            case_sensitive=False,
            extra="ignore"
        )
    else:
        # Fallback for older pydantic versions
        class Config:
            env_file = ".env"
            env_file_encoding = "utf-8"
            case_sensitive = False
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return os.getenv("K_SERVICE") is not None or self.vana_env == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return not self.is_production
    
    @property
    def cors_origins(self) -> list[str]:
        """Get CORS origins as a list."""
        return [origin.strip() for origin in self.allowed_origins.split(",")]
    
    def validate_required_settings(self) -> None:
        """
        Validate that required settings are properly configured.
        Raises RuntimeError if critical settings are missing.
        """
        errors = []
        
        # Check Google API configuration
        if not self.google_api_key and not self.google_application_credentials:
            errors.append("Either GOOGLE_API_KEY or GOOGLE_APPLICATION_CREDENTIALS must be set")
        
        # Check production-specific requirements
        if self.is_production:
            if self.session_secret == "changeme-in-production":
                errors.append("SESSION_SECRET must be set in production")
            if self.jwt_secret_key == "changeme-in-production":
                errors.append("JWT_SECRET_KEY must be set in production")
        
        if errors:
            raise RuntimeError(f"Configuration validation failed: {'; '.join(errors)}")

# Global settings instance
# This follows FastAPI best practices for settings management
settings = VanaBackendSettings()

# Validate settings on import (fail fast)
try:
    settings.validate_required_settings()
except RuntimeError as e:
    print(f"⚠️  Configuration Warning: {e}")
    print("💡 Please check your environment variables and .env files")

# Convenience functions for common operations
def get_database_url() -> str:
    """Get the database URL, with fallback to session DB."""
    return settings.database_url or settings.session_db_url

def get_cors_origins() -> list[str]:
    """Get CORS origins as a list."""
    return settings.cors_origins

def is_feature_enabled(feature_name: str) -> bool:
    """
    Check if a feature is enabled.
    
    Args:
        feature_name: Name of the feature (e.g., 'workflow', 'mcp', 'vector_search')
        
    Returns:
        True if feature is enabled, False otherwise
    """
    feature_attr = f"vana_feature_{feature_name}_enabled"
    return getattr(settings, feature_attr, False)

# Export commonly used settings for convenience
__all__ = [
    "settings",
    "VanaBackendSettings", 
    "get_database_url",
    "get_cors_origins",
    "is_feature_enabled"
]
