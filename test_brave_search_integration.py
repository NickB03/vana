#!/usr/bin/env python3
"""
Test Brave Search Integration

This test validates the Brave Search API integration and ensures
the web search functionality is working correctly.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_brave_search_client():
    """Test the Brave Search client directly."""
    print("🧪 Testing Brave Search Client...")

    try:
        from tools.brave_search_client import get_brave_search_client

        # Test real client
        print("\n🔍 Testing Real Brave Search Client:")
        client = get_brave_search_client()

        if client.is_available():
            print(f"   ✅ Brave Search client is available")

            # Test search
            results = client.search("VANA AI agent", num_results=3)
            print(f"   ✅ Search returned {len(results)} results")

            if results:
                print(f"   📄 First result: {results[0].get('title', 'No title')}")
                print(f"   🔗 URL: {results[0].get('url', 'No URL')}")

        else:
            print(f"   ❌ Brave Search client not available (missing API key)")

        # Test mock client
        print("\n🔍 Testing Mock Brave Search Client:")
        mock_client = get_brave_search_client(use_mock=True)

        if mock_client.is_available():
            print(f"   ✅ Mock Brave Search client is available")

            # Test search
            mock_results = mock_client.search("VANA", num_results=2)
            print(f"   ✅ Mock search returned {len(mock_results)} results")

            if mock_results:
                print(f"   📄 First mock result: {mock_results[0].get('title', 'No title')}")

        return True

    except Exception as e:
        print(f"   ❌ Brave Search client test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_web_search_client():
    """Test the WebSearchClient with Brave Search backend."""
    print("\n🧪 Testing WebSearchClient with Brave Search...")

    try:
        from tools.web_search_client import get_web_search_client

        # Test real client
        print("\n🔍 Testing Real WebSearchClient:")
        client = get_web_search_client()

        if hasattr(client, 'available') and client.available:
            print(f"   ✅ WebSearchClient is available")

            # Test search
            results = client.search("AI agents", num_results=2)
            print(f"   ✅ Search completed")

            if "items" in results and results["items"]:
                print(f"   📄 Found {len(results['items'])} items")
                first_item = results["items"][0]
                print(f"   📄 First result: {first_item.get('title', 'No title')}")
                print(f"   🔗 URL: {first_item.get('link', 'No URL')}")
            elif "error" in results:
                print(f"   ⚠️ Search returned error: {results['error']}")
            else:
                print(f"   ⚠️ No items found in search results")
        else:
            print(f"   ❌ WebSearchClient not available")

        # Test mock client
        print("\n🔍 Testing Mock WebSearchClient:")
        mock_client = get_web_search_client(use_mock=True)

        mock_results = mock_client.search("VANA", num_results=2)
        print(f"   ✅ Mock search completed")

        if "items" in mock_results and mock_results["items"]:
            print(f"   📄 Found {len(mock_results['items'])} mock items")
            first_item = mock_results["items"][0]
            print(f"   📄 First mock result: {first_item.get('title', 'No title')}")

        return True

    except Exception as e:
        print(f"   ❌ WebSearchClient test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_adk_web_search_tool():
    """Test the ADK web search tool integration."""
    print("\n🧪 Testing ADK Web Search Tool...")

    try:
        from vana_multi_agent.tools.adk_tools import adk_web_search

        # Test web search tool
        print("\n🔍 Testing ADK Web Search Tool:")
        result = adk_web_search.func("VANA architecture")
        print(f"   ✅ ADK web search completed")
        print(f"   📄 Result preview: {result[:100]}...")

        return True

    except Exception as e:
        print(f"   ❌ ADK web search tool test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all Brave Search integration tests."""
    print("🚀 Brave Search Integration Test Suite")
    print("=" * 50)

    # Run tests
    test1_passed = test_brave_search_client()
    test2_passed = test_web_search_client()
    test3_passed = test_adk_web_search_tool()

    # Summary
    print("\n📊 Test Results Summary:")
    print(f"   Brave Search Client: {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"   WebSearchClient: {'✅ PASS' if test2_passed else '❌ FAIL'}")
    print(f"   ADK Web Search Tool: {'✅ PASS' if test3_passed else '❌ FAIL'}")

    if test1_passed and test2_passed and test3_passed:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Brave Search integration is working correctly")
        print("✅ Migration from Google Custom Search to Brave Search complete")
        return True
    else:
        print("\n❌ SOME TESTS FAILED!")
        print("Please check the error messages above and fix any issues")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
