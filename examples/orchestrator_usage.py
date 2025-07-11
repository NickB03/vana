"""
Example usage of the Enhanced VANA Orchestrator
Demonstrates Phase 3 specialist routing and metrics
"""

from agents.vana.enhanced_orchestrator import (
    enhanced_orchestrator,
    route_to_specialist,
    analyze_and_route,
    cached_route_to_specialist,
    get_orchestrator_stats
)


def test_security_routing():
    """Test security specialist routing with elevated priority"""
    print("=== Testing Security Routing ===\n")
    
    # These should all route to security specialist
    security_queries = [
        "Check this code for SQL injection vulnerabilities",
        "Is my password hashing secure?",
        "Scan for XSS attacks in this JavaScript",
        "Review authentication implementation for weaknesses"
    ]
    
    for query in security_queries:
        print(f"Query: {query}")
        result = analyze_and_route(query)
        print(f"Result:\n{result}\n")
        print("-" * 50)


def test_specialist_routing():
    """Test routing to different specialists"""
    print("\n=== Testing Specialist Routing ===\n")
    
    test_cases = [
        ("Review my application architecture", "architecture_review"),
        ("Analyze this dataset for patterns", "data_analysis"),
        ("Help me set up CI/CD pipeline", "ci_cd"),
        ("Create monitoring dashboard", "monitoring")
    ]
    
    for query, expected_type in test_cases:
        print(f"Query: {query}")
        print(f"Expected Type: {expected_type}")
        result = route_to_specialist(query, expected_type)
        print(f"Result:\n{result}\n")
        print("-" * 50)


def test_caching():
    """Test caching functionality"""
    print("\n=== Testing Cache ===\n")
    
    # First call - should be cache miss
    query = "Analyze code architecture"
    task_type = "architecture_review"
    
    print(f"First call (cache miss expected):")
    result1 = cached_route_to_specialist(query, task_type)
    print(f"Result:\n{result1}\n")
    
    # Second call - should be cache hit
    print(f"Second call (cache hit expected):")
    result2 = cached_route_to_specialist(query, task_type)
    print(f"Result:\n{result2}\n")
    
    # Check if cached response indicator is present
    if "*[Cached Response]*" in result2:
        print("✅ Cache working correctly!")
    else:
        print("❌ Cache not working as expected")


def test_orchestrator_agent():
    """Test the full orchestrator agent"""
    print("\n=== Testing Orchestrator Agent ===\n")
    
    # Run a simple query through the orchestrator
    query = "I need help with security vulnerabilities in my Python code"
    
    print(f"Running query: {query}")
    result = enhanced_orchestrator.run(query)
    print(f"Orchestrator response:\n{result}")


def show_metrics():
    """Display current orchestrator metrics"""
    print("\n=== Orchestrator Metrics ===\n")
    
    stats = get_orchestrator_stats()
    print(stats)


def main():
    """Run all tests"""
    print("Enhanced VANA Orchestrator Examples\n")
    print("This demonstrates the Phase 3 integration with specialist routing.\n")
    
    # Run tests
    test_security_routing()
    test_specialist_routing()
    test_caching()
    test_orchestrator_agent()
    
    # Show metrics after tests
    show_metrics()
    
    print("\n✅ All examples completed!")


if __name__ == "__main__":
    main()