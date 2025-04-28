#!/usr/bin/env python3
"""
Run Optimized Hybrid Search

This script demonstrates the optimized hybrid search implementation
and compares it with the original implementation.
"""

import os
import sys
import json
import time
import logging
import argparse
from typing import Dict, Any

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import search implementations
try:
    from tools.hybrid_search import HybridSearch
    from tools.enhanced_hybrid_search import EnhancedHybridSearch
    from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
except ImportError as e:
    logger.error(f"Error importing search implementations: {str(e)}")
    sys.exit(1)


def measure_latency(func, *args, **kwargs):
    """
    Measure latency of a function
    
    Args:
        func: Function to measure
        *args: Function arguments
        **kwargs: Function keyword arguments
        
    Returns:
        Tuple of (function result, latency in milliseconds)
    """
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    
    latency = (end_time - start_time) * 1000  # Convert to milliseconds
    
    return result, latency


def run_search(query: str, top_k: int = 5, include_web: bool = True):
    """
    Run search with different implementations
    
    Args:
        query: Search query
        top_k: Number of results to retrieve
        include_web: Whether to include web search results
    """
    logger.info(f"Running search for query: {query}")
    
    # Initialize search implementations
    hybrid_search = HybridSearch()
    enhanced_search = EnhancedHybridSearch()
    optimized_search = EnhancedHybridSearchOptimized()
    
    # Check availability
    hs_available = hasattr(hybrid_search, 'vector_search_client') and hybrid_search.vector_search_client.is_available()
    ehs_available = hasattr(enhanced_search, 'vs_available') and enhanced_search.vs_available
    opt_available = hasattr(optimized_search, 'vs_available') and optimized_search.vs_available
    
    logger.info(f"Availability: Hybrid Search: {hs_available}, Enhanced: {ehs_available}, Optimized: {opt_available}")
    
    results = {}
    
    # Run Hybrid Search
    if hs_available:
        try:
            hs_results, hs_latency = measure_latency(hybrid_search.search, query, top_k=top_k)
            results["hybrid_search"] = {
                "results": hs_results,
                "latency": hs_latency,
                "result_count": len(hs_results.get("combined", []))
            }
            logger.info(f"Hybrid Search: {len(hs_results.get('combined', []))} results in {hs_latency:.2f} ms")
        except Exception as e:
            logger.error(f"Error in Hybrid Search: {str(e)}")
            results["hybrid_search"] = {"error": str(e)}
    
    # Run Enhanced Hybrid Search
    if ehs_available:
        try:
            ehs_results, ehs_latency = measure_latency(enhanced_search.search, query, top_k=top_k, include_web=include_web)
            results["enhanced_hybrid_search"] = {
                "results": ehs_results,
                "latency": ehs_latency,
                "result_count": len(ehs_results.get("combined", []))
            }
            logger.info(f"Enhanced Hybrid Search: {len(ehs_results.get('combined', []))} results in {ehs_latency:.2f} ms")
        except Exception as e:
            logger.error(f"Error in Enhanced Hybrid Search: {str(e)}")
            results["enhanced_hybrid_search"] = {"error": str(e)}
    
    # Run Optimized Hybrid Search
    if opt_available:
        try:
            # Get query category
            category = optimized_search.classify_query(query)
            logger.info(f"Query category: {category}")
            
            # Run search
            opt_results, opt_latency = measure_latency(optimized_search.search, query, top_k=top_k, include_web=include_web)
            results["optimized_hybrid_search"] = {
                "results": opt_results,
                "latency": opt_latency,
                "result_count": len(opt_results.get("combined", [])),
                "category": category
            }
            logger.info(f"Optimized Hybrid Search: {len(opt_results.get('combined', []))} results in {opt_latency:.2f} ms")
        except Exception as e:
            logger.error(f"Error in Optimized Hybrid Search: {str(e)}")
            results["optimized_hybrid_search"] = {"error": str(e)}
    
    return results


def display_results(results: Dict[str, Any]):
    """
    Display search results
    
    Args:
        results: Search results from different implementations
    """
    print("\n=== Search Results ===\n")
    
    # Display performance comparison
    print("Performance Comparison:")
    print("-" * 80)
    print(f"{'Implementation':<25} {'Latency (ms)':<15} {'Result Count':<15}")
    print("-" * 80)
    
    for impl, data in results.items():
        if "error" in data:
            print(f"{impl:<25} {'ERROR':<15} {'N/A':<15}")
        else:
            print(f"{impl:<25} {data['latency']:.2f} ms{'':<8} {data['result_count']:<15}")
    
    print("\n")
    
    # Display optimized search results
    if "optimized_hybrid_search" in results and "error" not in results["optimized_hybrid_search"]:
        opt_data = results["optimized_hybrid_search"]
        opt_results = opt_data["results"]
        
        print("Optimized Hybrid Search Results:")
        print("-" * 80)
        
        # Format results
        if hasattr(optimized_search, 'format_results'):
            formatted = optimized_search.format_results(opt_results)
            print(formatted)
        else:
            # Manual formatting
            for i, result in enumerate(opt_results.get("combined", [])[:5], 1):
                source = result.get("source", "unknown")
                content = result.get("content", "")
                score = result.get("final_score", 0)
                
                print(f"{i}. [{source.upper()}] (Score: {score:.2f})")
                print(f"   {content[:200]}...")
                print()
    
    print("-" * 80)


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Run Optimized Hybrid Search")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results to retrieve")
    parser.add_argument("--include-web", action="store_true", help="Include web search results")
    parser.add_argument("--output", help="Output file for results (JSON)")
    
    args = parser.parse_args()
    
    # Run search
    results = run_search(args.query, args.top_k, args.include_web)
    
    # Display results
    display_results(results)
    
    # Save results to file if specified
    if args.output:
        try:
            # Create a simplified version of results for JSON serialization
            simplified_results = {}
            for impl, data in results.items():
                if "error" in data:
                    simplified_results[impl] = {"error": data["error"]}
                else:
                    simplified_results[impl] = {
                        "latency": data["latency"],
                        "result_count": data["result_count"]
                    }
                    
                    # Add combined results
                    combined = []
                    for result in data["results"].get("combined", [])[:5]:
                        combined.append({
                            "source": result.get("source", "unknown"),
                            "content": result.get("content", "")[:200],
                            "score": result.get("final_score", 0)
                        })
                    
                    simplified_results[impl]["combined"] = combined
            
            with open(args.output, "w") as f:
                json.dump(simplified_results, f, indent=2)
            
            logger.info(f"Results saved to {args.output}")
        except Exception as e:
            logger.error(f"Error saving results to {args.output}: {str(e)}")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
