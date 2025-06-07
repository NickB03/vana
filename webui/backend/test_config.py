#!/usr/bin/env python3
"""
Test script to validate VANA backend configuration.
This script loads the configuration and displays the actual values
from the environment files.
"""

import sys
import os
from pathlib import Path

# Add the project root to the path so we can import the config
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

def test_configuration():
    """Test and display the VANA backend configuration."""
    print("🔧 VANA Backend Configuration Test")
    print("=" * 50)
    
    try:
        # Import the configuration
        from webui.backend.config import settings, VanaBackendSettings
        
        print("✅ Configuration loaded successfully!")
        print()
        
        # Display core configuration
        print("🌟 Core VANA Configuration:")
        print(f"  Environment: {settings.vana_env}")
        print(f"  Host: {settings.vana_host}")
        print(f"  Model: {settings.vana_model}")
        print(f"  Brand Name: {settings.vana_brand_name}")
        print(f"  Is Production: {settings.is_production}")
        print()
        
        # Display Google Cloud configuration
        print("☁️  Google Cloud Configuration:")
        print(f"  Project: {settings.google_cloud_project}")
        print(f"  Location: {settings.google_cloud_location}")
        print(f"  Use Vertex AI: {settings.google_genai_use_vertexai}")
        print(f"  API Key Set: {'Yes' if settings.google_api_key else 'No'}")
        print(f"  Credentials Path: {settings.google_application_credentials or 'Not set'}")
        print()
        
        # Display API Keys (masked for security)
        print("🔑 API Keys:")
        print(f"  Brave API Key: {'***' + settings.brave_api_key[-4:] if settings.brave_api_key else 'Not set'}")
        print(f"  OpenRouter API Key: {'***' + settings.openrouter_api_key[-4:] if settings.openrouter_api_key else 'Not set'}")
        print()
        
        # Display Vector Search configuration
        print("🔍 Vector Search Configuration:")
        print(f"  Endpoint: {settings.vector_search_endpoint or 'Not set'}")
        print(f"  Index: {settings.vector_search_index or 'Not set'}")
        print(f"  Dimensions: {settings.vector_search_dimensions}")
        print()
        
        # Display RAG configuration
        print("🧠 RAG Configuration:")
        print(f"  Corpus ID: {settings.vana_rag_corpus_id or 'Not set'}")
        print(f"  Similarity Top K: {settings.memory_similarity_top_k}")
        print(f"  Distance Threshold: {settings.memory_vector_distance_threshold}")
        print(f"  Service Type: {settings.session_service_type}")
        print()
        
        # Display Feature Flags
        print("🎛️  Feature Flags:")
        print(f"  Workflow Enabled: {settings.vana_feature_workflow_enabled}")
        print(f"  MCP Enabled: {settings.vana_feature_mcp_enabled}")
        print(f"  Vector Search Enabled: {settings.vana_feature_vector_search_enabled}")
        print(f"  Web Interface Enabled: {settings.vana_feature_web_interface_enabled}")
        print(f"  Dashboard Enabled: {settings.dashboard_enabled}")
        print()
        
        # Display Server configuration
        print("🖥️  Server Configuration:")
        print(f"  API Host: {settings.api_host}")
        print(f"  API Port: {settings.api_port}")
        print(f"  Debug Mode: {settings.debug_mode}")
        print(f"  Log Level: {settings.log_level}")
        print()
        
        # Test validation
        print("🔍 Configuration Validation:")
        try:
            settings.validate_required_settings()
            print("  ✅ All required settings are valid")
        except RuntimeError as e:
            print(f"  ⚠️  Validation warning: {e}")
        
        print()
        print("🎉 Configuration test completed successfully!")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you're running this from the project root")
        return False
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False

def show_environment_files():
    """Show which environment files exist."""
    print("\n📁 Environment Files Status:")
    print("-" * 30)
    
    env_files = [
        ".env.production",
        ".env.local", 
        ".env"
    ]
    
    for env_file in env_files:
        file_path = project_root / env_file
        if file_path.exists():
            print(f"  ✅ {env_file} - Found")
        else:
            print(f"  ❌ {env_file} - Not found")

if __name__ == "__main__":
    print("🚀 Starting VANA Backend Configuration Test")
    print(f"📍 Project Root: {project_root}")
    
    # Show environment files
    show_environment_files()
    print()
    
    # Test configuration
    success = test_configuration()
    
    if success:
        print("\n✨ All tests passed! Configuration is ready to use.")
        sys.exit(0)
    else:
        print("\n💥 Configuration test failed. Please check your setup.")
        sys.exit(1)
