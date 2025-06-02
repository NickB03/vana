#!/usr/bin/env python3
"""
Test script to isolate Google ADK import issues.

This script tests Google ADK imports in isolation to identify the exact point of failure.
"""

import os
import time
from pathlib import Path


def test_basic_imports():
    """Test basic Python imports."""
    print("🔍 Testing basic imports...")
    try:
        print("✅ Basic imports successful")
        return True
    except Exception as e:
        print(f"❌ Basic imports failed: {e}")
        return False


def test_environment_setup():
    """Test environment variable setup."""
    print("\n🔍 Testing environment setup...")

    # Load environment variables
    env_path = Path("vana_multi_agent/.env")
    if env_path.exists():
        from dotenv import load_dotenv

        load_dotenv(env_path)
        print(f"✅ Loaded .env from {env_path}")
    else:
        print(f"❌ .env file not found at {env_path}")
        # Try alternative paths
        alt_paths = [".env", "vana_multi_agent/.env", "./vana_multi_agent/.env"]
        for alt_path in alt_paths:
            if Path(alt_path).exists():
                from dotenv import load_dotenv

                load_dotenv(alt_path)
                print(f"✅ Loaded .env from alternative path: {alt_path}")
                break
        else:
            print("❌ No .env file found in any expected location")
            return False

    # Check required environment variables
    required_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION",
        "GOOGLE_GENAI_USE_VERTEXAI",
        "GOOGLE_APPLICATION_CREDENTIALS",
    ]

    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}={value}")
        else:
            print(f"❌ {var} not set")
            missing_vars.append(var)

    if missing_vars:
        print(f"❌ Missing environment variables: {missing_vars}")
        return False

    # Check service account file
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        # Try different path combinations
        possible_paths = [
            Path(creds_path),
            Path("vana_multi_agent") / creds_path,
            Path("vana_multi_agent/secrets/vana-vector-search-sa.json"),
        ]

        for full_path in possible_paths:
            if full_path.exists():
                print(f"✅ Service account file exists: {full_path}")
                break
        else:
            print("❌ Service account file not found. Tried paths:")
            for path in possible_paths:
                print(f"   - {path}")
            return False

    return True


def test_google_cloud_auth():
    """Test Google Cloud authentication."""
    print("\n🔍 Testing Google Cloud authentication...")
    try:
        from google.auth import default
        from google.auth.exceptions import DefaultCredentialsError

        print("Attempting to get default credentials...")
        credentials, project = default()
        print("✅ Authentication successful")
        print(f"✅ Project: {project}")
        print(f"✅ Credentials type: {type(credentials).__name__}")
        return True

    except DefaultCredentialsError as e:
        print(f"❌ Authentication failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected authentication error: {e}")
        return False


def test_google_adk_imports():
    """Test Google ADK imports step by step."""
    print("\n🔍 Testing Google ADK imports...")

    # Test each import individually with timeout
    imports_to_test = [
        ("google.adk", "Basic ADK package"),
        ("google.adk.tools", "ADK tools module"),
        ("google.adk.agents", "ADK agents module"),
        ("google.adk.tools.langchain_tool", "LangChain tool wrapper"),
        ("google.adk.tools.crewai_tool", "CrewAI tool wrapper"),
    ]

    for module_name, description in imports_to_test:
        print(f"\n  Testing {description} ({module_name})...")
        try:
            # Set a timeout for the import
            start_time = time.time()
            exec(f"import {module_name}")
            end_time = time.time()
            print(
                f"  ✅ {description} imported successfully ({end_time - start_time:.2f}s)"
            )
        except ImportError as e:
            print(f"  ❌ {description} import failed: {e}")
            return False
        except Exception as e:
            print(f"  ❌ {description} unexpected error: {e}")
            return False

    return True


def test_adk_functionality():
    """Test basic ADK functionality."""
    print("\n🔍 Testing basic ADK functionality...")
    try:
        from google.adk.tools import FunctionTool

        # Create a simple test function
        def test_function(message: str) -> str:
            return f"Test response: {message}"

        # Wrap it with ADK FunctionTool
        adk_tool = FunctionTool(func=test_function)
        print("✅ FunctionTool creation successful")

        # Test the tool
        result = adk_tool.func("Hello ADK")
        print(f"✅ Tool execution successful: {result}")

        return True

    except Exception as e:
        print(f"❌ ADK functionality test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Google ADK Import Test Suite")
    print("=" * 50)

    tests = [
        ("Basic Imports", test_basic_imports),
        ("Environment Setup", test_environment_setup),
        ("Google Cloud Auth", test_google_cloud_auth),
        ("Google ADK Imports", test_google_adk_imports),
        ("ADK Functionality", test_adk_functionality),
    ]

    results = {}

    for test_name, test_func in tests:
        print(f"\n{'=' * 20} {test_name} {'=' * 20}")
        try:
            results[test_name] = test_func()
        except KeyboardInterrupt:
            print(f"\n⚠️ Test '{test_name}' interrupted by user")
            results[test_name] = False
            break
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results[test_name] = False

    # Summary
    print(f"\n{'=' * 20} SUMMARY {'=' * 20}")
    passed = sum(results.values())
    total = len(results)

    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")

    print(f"\nResults: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Google ADK should work correctly.")
    else:
        print("⚠️ Some tests failed. Check the output above for details.")

        # Provide recommendations
        print("\n💡 Recommendations:")
        if not results.get("Environment Setup", True):
            print("- Check your .env file configuration")
            print("- Verify GOOGLE_APPLICATION_CREDENTIALS path")
        if not results.get("Google Cloud Auth", True):
            print("- Run: gcloud auth application-default login")
            print("- Verify service account permissions")
        if not results.get("Google ADK Imports", True):
            print("- Check if google-adk is installed: pip install google-adk")
            print("- Verify network connectivity to Google services")


if __name__ == "__main__":
    main()
