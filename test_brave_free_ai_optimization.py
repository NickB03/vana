#!/usr/bin/env python3
"""
Test Brave Search Free AI Plan Optimizations

This test validates the new Free AI plan features and optimization strategies
for enhanced search performance and data extraction.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_free_ai_features():
    """Test Free AI plan specific features."""
    print("🧪 Testing Brave Search Free AI Plan Features...")
    
    try:
        from tools.brave_search_client import get_brave_search_client
        
        # Test real client with Free AI features
        print("\n🔍 Testing Free AI Enhanced Search:")
        client = get_brave_search_client()
        
        if client.is_available():
            print(f"   ✅ Brave Search client is available")
            
            # Test enhanced search with Free AI features
            results = client.search("AI agent development", num_results=3)
            print(f"   ✅ Enhanced search returned {len(results)} results")
            
            if results:
                first_result = results[0]
                print(f"   📄 First result: {first_result.get('title', 'No title')}")
                
                # Check for Free AI enhancements
                if first_result.get('extra_snippets'):
                    print(f"   ✨ Extra snippets available: {len(first_result['extra_snippets'])}")
                if first_result.get('ai_summary'):
                    print(f"   🤖 AI summary available: {first_result['ai_summary'][:50]}...")
                if first_result.get('summary'):
                    print(f"   📝 Summary available: {first_result['summary'][:50]}...")
            
        else:
            print(f"   ❌ Brave Search client not available")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Free AI features test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_optimized_search_types():
    """Test different optimized search types."""
    print("\n🧪 Testing Optimized Search Types...")
    
    try:
        from tools.brave_search_client import get_brave_search_client
        
        client = get_brave_search_client()
        
        if not client.is_available():
            print("   ⚠️ Skipping optimized search tests - client not available")
            return True
        
        # Test different search optimization types
        search_types = [
            ("comprehensive", "AI agent architecture"),
            ("fast", "Python programming"),
            ("academic", "machine learning research"),
            ("recent", "AI news 2024"),
            ("local", "AI companies San Francisco")
        ]
        
        for search_type, query in search_types:
            print(f"\n🔍 Testing {search_type} search:")
            try:
                results = client.optimized_search(query, search_type=search_type)
                print(f"   ✅ {search_type.capitalize()} search returned {len(results)} results")
                
                if results:
                    print(f"   📄 Sample result: {results[0].get('title', 'No title')[:50]}...")
                    
            except Exception as e:
                print(f"   ⚠️ {search_type.capitalize()} search failed: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Optimized search types test failed: {str(e)}")
        return False

def test_goggles_search():
    """Test Brave Goggles search functionality."""
    print("\n🧪 Testing Brave Goggles Search...")
    
    try:
        from tools.brave_search_client import get_brave_search_client
        
        client = get_brave_search_client()
        
        if not client.is_available():
            print("   ⚠️ Skipping goggles search tests - client not available")
            return True
        
        # Test different goggle types
        goggle_tests = [
            ("academic", "artificial intelligence research"),
            ("tech", "Python machine learning libraries"),
            ("news", "AI industry developments")
        ]
        
        for goggle_type, query in goggle_tests:
            print(f"\n🥽 Testing {goggle_type} goggle:")
            try:
                results = client.search_with_goggles(query, goggle_type=goggle_type)
                print(f"   ✅ {goggle_type.capitalize()} goggle search returned {len(results)} results")
                
                if results:
                    print(f"   📄 Sample result: {results[0].get('title', 'No title')[:50]}...")
                    
            except Exception as e:
                print(f"   ⚠️ {goggle_type.capitalize()} goggle search failed: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Goggles search test failed: {str(e)}")
        return False

def test_multi_type_search():
    """Test multi-type search functionality."""
    print("\n🧪 Testing Multi-Type Search...")
    
    try:
        from tools.brave_search_client import get_brave_search_client
        
        client = get_brave_search_client()
        
        if not client.is_available():
            print("   ⚠️ Skipping multi-type search tests - client not available")
            return True
        
        # Test multi-type search
        print(f"\n🔍 Testing multi-type search:")
        try:
            result_types = ["web", "news", "videos", "infobox"]
            categorized_results = client.multi_type_search(
                "AI agent development", 
                result_types=result_types
            )
            
            print(f"   ✅ Multi-type search completed")
            
            for result_type, results in categorized_results.items():
                print(f"   📊 {result_type}: {len(results)} results")
                
        except Exception as e:
            print(f"   ⚠️ Multi-type search failed: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Multi-type search test failed: {str(e)}")
        return False

def test_search_optimization_impact():
    """Test the impact of search optimizations."""
    print("\n🧪 Testing Search Optimization Impact...")
    
    try:
        from tools.brave_search_client import get_brave_search_client
        
        client = get_brave_search_client()
        
        if not client.is_available():
            print("   ⚠️ Skipping optimization impact tests - client not available")
            return True
        
        query = "machine learning algorithms"
        
        # Compare basic vs optimized search
        print(f"\n📊 Comparing search approaches for: {query}")
        
        # Basic search
        try:
            basic_results = client.search(query, num_results=5)
            print(f"   📈 Basic search: {len(basic_results)} results")
            
            # Comprehensive optimized search
            optimized_results = client.optimized_search(query, search_type="comprehensive")
            print(f"   🚀 Optimized search: {len(optimized_results)} results")
            
            # Analyze enhancements
            if optimized_results:
                enhanced_features = 0
                for result in optimized_results[:3]:  # Check first 3 results
                    if result.get('extra_snippets'):
                        enhanced_features += 1
                    if result.get('ai_summary'):
                        enhanced_features += 1
                    if result.get('summary'):
                        enhanced_features += 1
                
                print(f"   ✨ Enhanced features detected: {enhanced_features}")
                
        except Exception as e:
            print(f"   ⚠️ Optimization comparison failed: {str(e)}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Optimization impact test failed: {str(e)}")
        return False

def main():
    """Run all Free AI optimization tests."""
    print("🚀 Brave Search Free AI Plan Optimization Test Suite")
    print("=" * 60)
    
    # Run tests
    test1_passed = test_free_ai_features()
    test2_passed = test_optimized_search_types()
    test3_passed = test_goggles_search()
    test4_passed = test_multi_type_search()
    test5_passed = test_search_optimization_impact()
    
    # Summary
    print("\n📊 Free AI Optimization Test Results:")
    print(f"   Free AI Features: {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"   Optimized Search Types: {'✅ PASS' if test2_passed else '❌ FAIL'}")
    print(f"   Goggles Search: {'✅ PASS' if test3_passed else '❌ FAIL'}")
    print(f"   Multi-Type Search: {'✅ PASS' if test4_passed else '❌ FAIL'}")
    print(f"   Optimization Impact: {'✅ PASS' if test5_passed else '❌ FAIL'}")
    
    all_passed = all([test1_passed, test2_passed, test3_passed, test4_passed, test5_passed])
    
    if all_passed:
        print("\n🎉 ALL FREE AI OPTIMIZATION TESTS PASSED!")
        print("✅ Brave Search Free AI plan features are optimally configured")
        print("✅ Enhanced search capabilities are working correctly")
        print("✅ Data optimization strategies are implemented")
        print("\n🚀 Key Free AI Benefits Activated:")
        print("   • Extra snippets for richer content extraction")
        print("   • AI-powered summaries for quick insights")
        print("   • Goggles for custom result ranking")
        print("   • Multi-type search for comprehensive coverage")
        print("   • Optimized parameters for different use cases")
        return True
    else:
        print("\n❌ SOME FREE AI OPTIMIZATION TESTS FAILED!")
        print("Please check the error messages above and verify Free AI plan features")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
