#!/usr/bin/env python3
"""
Test script to isolate and troubleshoot LlmAgent initialization issue.

This script tests the Google ADK LlmAgent initialization step by step
to identify where the hanging occurs and provide solutions.
"""

import os
import sys
import time
import signal
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from vana_multi_agent/.env
env_path = Path("vana_multi_agent/.env")
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    print(f"⚠️  Environment file not found at {env_path}")

def timeout_handler(signum, frame):
    """Handle timeout for hanging operations."""
    raise TimeoutError("Operation timed out")

def test_environment_variables():
    """Test that all required environment variables are set."""
    print("\n🔍 Testing Environment Variables...")
    
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION", 
        "GOOGLE_GENAI_USE_VERTEXAI",
        "GOOGLE_APPLICATION_CREDENTIALS"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n❌ Missing required environment variables: {missing_vars}")
        return False
    
    # Check credentials file exists
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path and os.path.exists(creds_path):
        print(f"✅ Credentials file exists: {creds_path}")
    else:
        print(f"❌ Credentials file not found: {creds_path}")
        return False
    
    return True

def test_google_adk_imports():
    """Test Google ADK imports."""
    print("\n🔍 Testing Google ADK Imports...")
    
    try:
        from google.adk.tools import FunctionTool
        print("✅ google.adk.tools.FunctionTool imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import FunctionTool: {e}")
        return False
    
    try:
        from google.adk.agents import LlmAgent
        print("✅ google.adk.agents.LlmAgent imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import LlmAgent: {e}")
        return False
    
    try:
        from google.genai import types
        print("✅ google.genai.types imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import google.genai.types: {e}")
        return False
    
    return True

def test_function_tool_creation():
    """Test FunctionTool creation (this should work)."""
    print("\n🔍 Testing FunctionTool Creation...")
    
    try:
        from google.adk.tools import FunctionTool
        
        def simple_test_tool(message: str) -> str:
            """Simple test tool."""
            return f"Echo: {message}"
        
        # Set timeout for this operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(10)  # 10 second timeout
        
        test_tool = FunctionTool(func=simple_test_tool)
        
        signal.alarm(0)  # Cancel timeout
        print("✅ FunctionTool created successfully")
        return True
        
    except TimeoutError:
        print("❌ FunctionTool creation timed out")
        return False
    except Exception as e:
        print(f"❌ FunctionTool creation failed: {e}")
        return False

def test_llm_agent_creation_minimal():
    """Test minimal LlmAgent creation with timeout."""
    print("\n🔍 Testing Minimal LlmAgent Creation...")
    
    try:
        from google.adk.agents import LlmAgent
        
        # Set timeout for this operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)  # 30 second timeout
        
        print("Creating LlmAgent with minimal configuration...")
        start_time = time.time()
        
        # Try the most minimal configuration possible
        agent = LlmAgent(
            name="test_agent",
            model="gemini-2.0-flash",
            instruction="You are a test agent."
        )
        
        end_time = time.time()
        signal.alarm(0)  # Cancel timeout
        
        print(f"✅ LlmAgent created successfully in {end_time - start_time:.2f} seconds")
        return True
        
    except TimeoutError:
        print("❌ LlmAgent creation timed out after 30 seconds")
        print("   This suggests a network connectivity issue with Vertex AI")
        return False
    except Exception as e:
        print(f"❌ LlmAgent creation failed: {e}")
        return False

def test_google_auth():
    """Test Google Cloud authentication."""
    print("\n🔍 Testing Google Cloud Authentication...")
    
    try:
        from google.auth import default
        from google.auth.transport.requests import Request
        
        # Get default credentials
        credentials, project = default()
        print(f"✅ Default credentials obtained for project: {project}")
        
        # Test if credentials are valid
        if hasattr(credentials, 'valid') and not credentials.valid:
            if hasattr(credentials, 'refresh'):
                request = Request()
                credentials.refresh(request)
                print("✅ Credentials refreshed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Google Cloud authentication failed: {e}")
        return False

def test_vertex_ai_connection():
    """Test basic Vertex AI connection."""
    print("\n🔍 Testing Vertex AI Connection...")
    
    try:
        import vertexai
        
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        location = os.getenv("GOOGLE_CLOUD_LOCATION")
        
        print(f"Initializing Vertex AI for project {project_id} in {location}...")
        
        # Set timeout for this operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(15)  # 15 second timeout
        
        vertexai.init(project=project_id, location=location)
        
        signal.alarm(0)  # Cancel timeout
        print("✅ Vertex AI initialized successfully")
        return True
        
    except TimeoutError:
        print("❌ Vertex AI initialization timed out")
        return False
    except Exception as e:
        print(f"❌ Vertex AI initialization failed: {e}")
        return False

def main():
    """Run all tests to diagnose the LlmAgent initialization issue."""
    print("🚀 Google ADK LlmAgent Initialization Diagnostic")
    print("=" * 60)
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Google ADK Imports", test_google_adk_imports),
        ("Google Cloud Authentication", test_google_auth),
        ("Vertex AI Connection", test_vertex_ai_connection),
        ("FunctionTool Creation", test_function_tool_creation),
        ("LlmAgent Creation", test_llm_agent_creation_minimal),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except KeyboardInterrupt:
            print(f"\n⚠️  Test '{test_name}' interrupted by user")
            results[test_name] = False
            break
        except Exception as e:
            print(f"\n❌ Test '{test_name}' failed with unexpected error: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if not results.get("LlmAgent Creation", False):
        print("\n🔧 TROUBLESHOOTING RECOMMENDATIONS:")
        print("1. Check network connectivity to Google Cloud services")
        print("2. Verify Vertex AI API is enabled in your project")
        print("3. Check firewall/proxy settings")
        print("4. Try using Google AI Studio instead of Vertex AI")
        print("5. Check service account permissions for Vertex AI")

if __name__ == "__main__":
    main()
