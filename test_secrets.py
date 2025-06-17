#!/usr/bin/env python3
"""Test Secret Manager integration"""

import sys
import os

# Add current directory to path for lib imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from lib.secrets import get_api_key

def test_secret_access():
    """Test that we can access secrets from Secret Manager"""
    
    print("Testing Secret Manager access...")
    print(f"Project ID: {os.getenv('GOOGLE_CLOUD_PROJECT', 'analystai-454200')}")
    print()
    
    # Test Brave API key
    print("Testing Brave API key...")
    brave_key = get_api_key('brave-api-key')
    if brave_key:
        print(f"✅ Brave API key retrieved (length: {len(brave_key)})")
        print(f"   Key starts with: {brave_key[:10]}...")
    else:
        print("❌ Failed to retrieve Brave API key")
    
    print()
    
    # Test OpenRouter API key
    print("Testing OpenRouter API key...")
    openrouter_key = get_api_key('openrouter-api-key')
    if openrouter_key:
        print(f"✅ OpenRouter API key retrieved (length: {len(openrouter_key)})")
        print(f"   Key starts with: {openrouter_key[:15]}...")
    else:
        print("❌ Failed to retrieve OpenRouter API key")
    
    print()
    
    return brave_key and openrouter_key

def test_environment_integration():
    """Test that environment loading works with Secret Manager"""
    
    print("Testing environment integration...")
    
    # Import and run environment setup
    from lib.environment import setup_environment
    
    env_type = setup_environment()
    print(f"Environment type: {env_type}")
    
    # Check if API keys are now in environment variables
    brave_env = os.getenv('BRAVE_API_KEY')
    openrouter_env = os.getenv('OPENROUTER_API_KEY')
    
    print(f"BRAVE_API_KEY in environment: {'✅' if brave_env else '❌'}")
    print(f"OPENROUTER_API_KEY in environment: {'✅' if openrouter_env else '❌'}")
    
    return brave_env and openrouter_env

if __name__ == "__main__":
    print("🔐 VANA Secret Manager Integration Test")
    print("=" * 50)
    print()
    
    # Test 1: Direct Secret Manager access
    print("TEST 1: Direct Secret Manager Access")
    print("-" * 40)
    secret_success = test_secret_access()
    
    print()
    
    # Test 2: Environment integration
    print("TEST 2: Environment Integration")
    print("-" * 40)
    env_success = test_environment_integration()
    
    print()
    print("=" * 50)
    
    if secret_success and env_success:
        print("🎉 All tests passed! Secret Manager integration working correctly!")
        exit(0)
    else:
        print("🚨 Some tests failed! Secret Manager integration has issues!")
        exit(1)
