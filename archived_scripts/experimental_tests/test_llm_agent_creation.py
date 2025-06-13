#!/usr/bin/env python3
"""
Test LlmAgent creation after SSL fixes.

This script tests the actual LlmAgent creation now that the SSL issues are resolved.
"""

import os
import sys
import time
import signal
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from project .env
env_path = Path(".env")
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")

# Set SSL environment variables
import certifi
cert_path = certifi.where()
os.environ["SSL_CERT_FILE"] = cert_path
os.environ["REQUESTS_CA_BUNDLE"] = cert_path
os.environ["CURL_CA_BUNDLE"] = cert_path
os.environ["PYTHONHTTPSVERIFY"] = "1"

def timeout_handler(signum, frame):
    """Handle timeout for hanging operations."""
    raise TimeoutError("Operation timed out")

def test_llm_agent_creation():
    """Test LlmAgent creation with proper timeout and error handling."""
    print("🔍 Testing LlmAgent Creation...")
    
    try:
        from google.adk.agents import LlmAgent
        from google.genai import types
        
        # Set timeout for this operation
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(45)  # 45 second timeout
        
        print("Creating LlmAgent with minimal configuration...")
        start_time = time.time()
        
        # Create agent with minimal configuration
        agent = LlmAgent(
            name="test_agent",
            model="gemini-2.0-flash",
            instruction="You are a test agent for VANA."
        )
        
        end_time = time.time()
        signal.alarm(0)  # Cancel timeout
        
        print(f"✅ LlmAgent created successfully in {end_time - start_time:.2f} seconds")
        print(f"   Agent name: {agent.name}")
        print(f"   Agent model: {agent.model}")
        
        return True, agent
        
    except TimeoutError:
        print("❌ LlmAgent creation timed out after 45 seconds")
        print("   This suggests a network connectivity issue with Vertex AI")
        return False, None
    except Exception as e:
        print(f"❌ LlmAgent creation failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        return False, None

def test_llm_agent_with_tools():
    """Test LlmAgent creation with tools."""
    print("\n🔍 Testing LlmAgent with Tools...")
    
    try:
        from google.adk.agents import LlmAgent
        from google.adk.tools import FunctionTool
        
        # Create a simple tool
        def echo_tool(message: str) -> str:
            """Echo the input message."""
            return f"Echo: {message}"
        
        # Wrap as FunctionTool
        echo_function_tool = FunctionTool(func=echo_tool)
        
        # Set timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(45)
        
        print("Creating LlmAgent with tools...")
        start_time = time.time()
        
        agent = LlmAgent(
            name="vana_test",
            model="gemini-2.0-flash",
            instruction="You are VANA, an AI assistant with tool capabilities.",
            tools=[echo_function_tool]
        )
        
        end_time = time.time()
        signal.alarm(0)
        
        print(f"✅ LlmAgent with tools created successfully in {end_time - start_time:.2f} seconds")
        print(f"   Agent has {len(agent.tools)} tool(s)")
        
        return True, agent
        
    except TimeoutError:
        print("❌ LlmAgent with tools creation timed out")
        return False, None
    except Exception as e:
        print(f"❌ LlmAgent with tools creation failed: {e}")
        return False, None

def test_vertex_ai_direct():
    """Test direct Vertex AI connection."""
    print("\n🔍 Testing Direct Vertex AI Connection...")
    
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel
        
        project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
        location = os.getenv("GOOGLE_CLOUD_LOCATION")
        
        print(f"Initializing Vertex AI for project {project_id} in {location}...")
        
        # Set timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(30)
        
        vertexai.init(project=project_id, location=location)
        
        # Try to create a model instance
        model = GenerativeModel("gemini-2.0-flash")
        
        signal.alarm(0)
        
        print("✅ Direct Vertex AI connection successful")
        print(f"   Model: {model.model_name}")
        
        return True
        
    except TimeoutError:
        print("❌ Direct Vertex AI connection timed out")
        return False
    except Exception as e:
        print(f"❌ Direct Vertex AI connection failed: {e}")
        return False

def main():
    """Run comprehensive LlmAgent tests."""
    print("🚀 Google ADK LlmAgent Creation Test")
    print("=" * 50)
    
    # Test direct Vertex AI first
    vertex_success = test_vertex_ai_direct()
    
    if not vertex_success:
        print("\n⚠️  Direct Vertex AI connection failed. Trying LlmAgent anyway...")
    
    # Test basic LlmAgent creation
    basic_success, basic_agent = test_llm_agent_creation()
    
    if basic_success:
        # Test LlmAgent with tools
        tools_success, tools_agent = test_llm_agent_with_tools()
    else:
        tools_success = False
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    tests = [
        ("Direct Vertex AI Connection", vertex_success),
        ("Basic LlmAgent Creation", basic_success),
        ("LlmAgent with Tools", tools_success),
    ]
    
    for test_name, result in tests:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    if basic_success:
        print("\n🎉 SUCCESS! Google ADK LlmAgent is working!")
        print("The SSL fixes resolved the initialization issue.")
        print("\n📋 Next Steps:")
        print("1. Update your agent code to use the working configuration")
        print("2. Test with your actual VANA tools")
        print("3. Implement proper session management")
    else:
        print("\n🔧 TROUBLESHOOTING:")
        if not vertex_success:
            print("1. Check Vertex AI API is enabled in your project")
            print("2. Verify service account has Vertex AI permissions")
            print("3. Check network connectivity to Google Cloud")
        print("4. Consider using Google AI Studio instead of Vertex AI")

if __name__ == "__main__":
    main()
