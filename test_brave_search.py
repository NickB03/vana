#!/usr/bin/env python3
"""Test script to verify Brave Search functionality."""

import sys
sys.path.append('.')

from app.tools.brave_search import brave_web_search_function

def test_brave_search():
    """Test the Brave Search function."""
    print("Testing Brave Search...")
    
    try:
        result = brave_web_search_function("OpenAI GPT-4", count=3)
        print("Brave Search Result:")
        print(f"Query: {result.get('query', 'N/A')}")
        print(f"Source: {result.get('source', 'N/A')}")
        
        if 'error' in result:
            print(f"❌ Error: {result['error']}")
            return False
        
        results = result.get('results', [])
        print(f"✅ Found {len(results)} results:")
        
        for i, item in enumerate(results[:3]):
            print(f"  {i+1}. {item.get('title', 'No title')}")
            print(f"     {item.get('link', 'No link')}")
            print(f"     {item.get('snippet', 'No snippet')[:100]}...")
            print()
        
        return len(results) > 0
        
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    success = test_brave_search()
    if success:
        print("🎉 Brave Search test passed!")
    else:
        print("💥 Brave Search test failed!")
    exit(0 if success else 1)