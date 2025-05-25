#!/usr/bin/env python3
"""
VANA Multi-Agent System Setup Test

This script tests the basic setup and imports for the VANA multi-agent system.
"""

import sys
import os

def test_imports():
    """Test if all required modules can be imported."""
    print("🧪 Testing VANA Multi-Agent System Setup...")
    
    # Test basic Python imports
    try:
        import dotenv
        print("✅ python-dotenv: OK")
    except ImportError:
        print("❌ python-dotenv: Missing")
        return False
    
    # Test if we can import our enhanced tools
    try:
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        from agent.tools import echo, read_file, vector_search
        print("✅ Enhanced VANA tools: OK")
    except ImportError as e:
        print(f"❌ Enhanced VANA tools: {e}")
        return False
    
    # Test Google ADK (may not be installed yet)
    try:
        from google.adk.agents import LlmAgent
        from google.adk.tools import tool
        print("✅ Google ADK: OK")
        adk_available = True
    except ImportError:
        print("⚠️  Google ADK: Not installed (will be installed with requirements)")
        adk_available = False
    
    return True

def test_enhanced_tools():
    """Test the enhanced tools functionality."""
    print("\n🔧 Testing Enhanced Tools...")
    
    try:
        sys.path.append(os.path.dirname(os.path.dirname(__file__)))
        from agent.tools import echo
        
        # Test echo tool
        result = echo("Test message")
        if "Test message" in result:
            print("✅ Echo tool: Working")
        else:
            print("❌ Echo tool: Not working properly")
            return False
            
    except Exception as e:
        print(f"❌ Enhanced tools test failed: {e}")
        return False
    
    return True

def test_environment():
    """Test environment configuration."""
    print("\n🌍 Testing Environment Configuration...")
    
    # Check if .env file exists
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        print("✅ .env file: Found")
    else:
        print("⚠️  .env file: Not found (will use defaults)")
    
    # Test environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    project = os.getenv("GOOGLE_CLOUD_PROJECT", "not-set")
    model = os.getenv("VANA_MODEL", "gemini-2.0-flash")
    
    print(f"📊 Google Cloud Project: {project}")
    print(f"🤖 Model: {model}")
    
    return True

def main():
    """Run all tests."""
    print("🚀 VANA Multi-Agent System Setup Test\n")
    
    success = True
    
    # Run tests
    success &= test_imports()
    success &= test_enhanced_tools()
    success &= test_environment()
    
    print("\n" + "="*50)
    if success:
        print("🎉 All tests passed! VANA Multi-Agent System is ready.")
        print("\n📋 Next steps:")
        print("1. Install Google ADK: pip install -r requirements.txt")
        print("2. Configure .env file with your credentials")
        print("3. Start the system: python main.py")
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
