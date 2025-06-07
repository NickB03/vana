# webui/backend/main.py

"""
VANA FastAPI Backend - Example Implementation

This is an example FastAPI application that demonstrates how to use
the VANA configuration system. It integrates with the existing VANA
architecture and follows FastAPI best practices.
"""

import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, Any

# Import our VANA configuration
from .config import settings, VanaBackendSettings, is_feature_enabled

# Create FastAPI app with configuration
app = FastAPI(
    title=settings.vana_brand_name,
    description=settings.vana_brand_tagline,
    version="1.0.0",
    debug=settings.debug_mode,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get settings (useful for testing and dependency injection)
def get_settings() -> VanaBackendSettings:
    """Dependency to get application settings."""
    return settings

@app.get("/")
async def root() -> Dict[str, Any]:
    """Root endpoint with basic app information."""
    return {
        "app_name": settings.vana_brand_name,
        "tagline": settings.vana_brand_tagline,
        "environment": settings.vana_env,
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.vana_env,
        "features": {
            "workflow": is_feature_enabled("workflow"),
            "mcp": is_feature_enabled("mcp"),
            "vector_search": is_feature_enabled("vector_search"),
            "web_interface": is_feature_enabled("web_interface"),
        }
    }

@app.get("/config")
async def get_config(current_settings: VanaBackendSettings = Depends(get_settings)) -> Dict[str, Any]:
    """
    Get public configuration information.
    
    Note: This endpoint only returns non-sensitive configuration data.
    """
    return {
        "app_name": current_settings.vana_brand_name,
        "tagline": current_settings.vana_brand_tagline,
        "environment": current_settings.vana_env,
        "api_host": current_settings.api_host,
        "api_port": current_settings.api_port,
        "features": {
            "workflow_enabled": current_settings.vana_feature_workflow_enabled,
            "mcp_enabled": current_settings.vana_feature_mcp_enabled,
            "vector_search_enabled": current_settings.vana_feature_vector_search_enabled,
            "web_interface_enabled": current_settings.vana_feature_web_interface_enabled,
        },
        "cors_origins": current_settings.cors_origins,
        "debug_mode": current_settings.debug_mode,
    }

@app.get("/vana/status")
async def vana_status() -> Dict[str, Any]:
    """
    Get VANA-specific status information.
    
    This endpoint provides information about the VANA agent system.
    """
    return {
        "vana_service_url": settings.vana_service_url,
        "model": settings.vana_model,
        "google_cloud_project": settings.google_cloud_project,
        "google_cloud_location": settings.google_cloud_location,
        "vertex_ai_location": settings.vertex_ai_location,
        "use_vertex_ai": settings.google_genai_use_vertexai == "True",
        "vector_search_configured": bool(settings.vector_search_endpoint),
        "mcp_enabled": settings.mcp_enabled,
    }

@app.get("/features/{feature_name}")
async def check_feature(feature_name: str) -> Dict[str, Any]:
    """
    Check if a specific feature is enabled.
    
    Args:
        feature_name: Name of the feature to check
        
    Returns:
        Feature status information
    """
    enabled = is_feature_enabled(feature_name)
    
    if not hasattr(settings, f"vana_feature_{feature_name}_enabled"):
        raise HTTPException(
            status_code=404, 
            detail=f"Feature '{feature_name}' not found"
        )
    
    return {
        "feature": feature_name,
        "enabled": enabled,
        "environment": settings.vana_env
    }

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for better error responses."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc) if settings.debug_mode else "An error occurred",
            "environment": settings.vana_env
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Application startup event."""
    print(f"🚀 Starting {settings.vana_brand_name} FastAPI Backend")
    print(f"📍 Environment: {settings.vana_env}")
    print(f"🌐 Host: {settings.api_host}:{settings.api_port}")
    print(f"🔧 Debug Mode: {settings.debug_mode}")
    print(f"🎯 VANA Service: {settings.vana_service_url}")
    
    # Validate configuration
    try:
        settings.validate_required_settings()
        print("✅ Configuration validation passed")
    except RuntimeError as e:
        print(f"⚠️  Configuration warning: {e}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event."""
    print(f"🛑 Shutting down {settings.vana_brand_name} FastAPI Backend")

if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_reload,
        workers=settings.api_workers if not settings.api_reload else 1,
        log_level=settings.log_level.lower(),
    )
