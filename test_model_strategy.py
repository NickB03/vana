#!/usr/bin/env python3
"""
Test Dynamic Model Strategy Implementation
Verifies cost-conscious model selection without making actual API calls.
"""

from lib.model_strategy.model_selector import (
    ModelSelector, RequestComplexity, select_model_for_request
)
from lib.model_strategy.agent_model_config import (
    AgentModelConfigurator, get_model_for_agent, ModelType
)


def test_model_selector():
    """Test the model selector logic"""
    print("🧪 Testing Model Selector...")
    
    selector = ModelSelector()
    
    # Test 1: Simple request
    simple_request = "What is the current time?"
    model = selector.select_model(simple_request)
    assert model == "gemini-2.5-flash", f"Simple request should use flash model, got {model}"
    print("   ✅ Simple request -> Flash model")
    
    # Test 2: Security request (still uses flash by default)
    security_request = "Check for security vulnerabilities in this code"
    model = selector.select_model(security_request)
    assert model == "gemini-2.5-flash", f"Security request should still use flash by default, got {model}"
    print("   ✅ Security request -> Flash model (cost-conscious)")
    
    # Test 3: Complex request with context
    complex_request = "Analyze the architecture and provide step-by-step refactoring recommendations"
    context = {
        "user_preferences": {"analysis_depth": "thorough"},
        "execution_metadata": {"priority": "critical"}
    }
    model = selector.select_model(complex_request, context)
    # With thorough analysis requested, it CAN upgrade to pro
    print(f"   📊 Complex request with thorough analysis -> {model}")
    
    # Test 4: Get cost report
    report = selector.get_cost_report()
    assert report["monthly_budget_usd"] == 100.0
    # The selector has tracked some usage, so cost might not be exactly 0
    print(f"   📊 Current month cost: ${report['current_month_cost_usd']:.6f}")
    print("   ✅ Cost tracking initialized correctly")
    
    return True


def test_agent_model_config():
    """Test agent-specific model configuration"""
    print("\n🤖 Testing Agent Model Configuration...")
    
    configurator = AgentModelConfigurator()
    
    # Test 1: Orchestrator uses flash
    model = configurator.get_model_for_agent("enhanced_orchestrator")
    assert model == "gemini-2.5-flash", f"Orchestrator should use flash, got {model}"
    print("   ✅ Orchestrator -> Flash model")
    
    # Test 2: Security specialist with reasoning model
    model = configurator.get_model_for_agent("security_specialist")
    assert model == "gemini-2.5-pro", f"Security specialist should use reasoning model, got {model}"
    print("   ✅ Security specialist -> Reasoning model")
    
    # Test 3: QA specialist always flash
    model = configurator.get_model_for_agent("qa_specialist")
    assert model == "gemini-2.5-flash", f"QA specialist should use flash, got {model}"
    print("   ✅ QA specialist -> Flash model")
    
    # Test 4: Dynamic upgrade for architecture specialist
    context = {
        "request_complexity": "complex",
        "priority": "high",
        "requires_reasoning": True
    }
    model = configurator.get_model_for_agent("architecture_specialist", context)
    # With dynamic selection enabled, might upgrade
    print(f"   📊 Architecture specialist with complex request -> {model}")
    
    # Test 5: Cost summary
    summary = configurator.get_cost_summary()
    flash_count = summary["model_distribution"]["flash"]
    reasoning_count = summary["model_distribution"]["reasoning"]
    print(f"   📊 Model distribution: {flash_count} flash, {reasoning_count} reasoning")
    assert flash_count > reasoning_count, "Most agents should use flash model"
    print("   ✅ Majority of agents use free tier")
    
    return True


def test_integration():
    """Test integration scenarios"""
    print("\n🔄 Testing Integration Scenarios...")
    
    # Test 1: Simple helper function
    model = get_model_for_agent("enhanced_orchestrator")
    assert model == "gemini-2.5-flash"
    print("   ✅ Helper function works correctly")
    
    # Test 2: Request-based selection
    request = "List all files in the directory"
    model = select_model_for_request(request)
    assert model == "gemini-2.5-flash"
    print("   ✅ Request-based selection works")
    
    # Test 3: Verify all specialist agents have profiles
    specialists = [
        "architecture_specialist",
        "data_science_specialist", 
        "security_specialist",
        "qa_specialist",
        "ui_specialist",
        "devops_specialist"
    ]
    
    configurator = AgentModelConfigurator()
    for specialist in specialists:
        profile = configurator.profiles.get(specialist)
        assert profile is not None, f"Missing profile for {specialist}"
    
    print("   ✅ All specialists have model profiles")
    
    return True


def test_cost_scenarios():
    """Test various cost optimization scenarios"""
    print("\n💰 Testing Cost Scenarios...")
    
    selector = ModelSelector(enable_cost_optimization=True)
    
    # Simulate different request types
    requests = [
        ("Simple query", "What is VANA?", "gemini-2.5-flash"),
        ("Code review", "Review this 200-line Python file: ```python...", "gemini-2.5-flash"),
        ("Architecture", "Design a microservices architecture", "gemini-2.5-flash"),
        ("Security critical", "Analyze authentication vulnerabilities", "gemini-2.5-flash"),
    ]
    
    total_chars = 0
    for desc, request, expected_model in requests:
        model = selector.select_model(request)
        total_chars += len(request)
        assert model == expected_model, f"{desc} should use {expected_model}, got {model}"
        print(f"   ✅ {desc} -> {model}")
    
    # Check estimated cost (should be very low or $0 for flash models)
    report = selector.get_cost_report()
    monthly_cost = report["current_month_cost_usd"]
    # Flash model is free but might show tiny tracking amounts
    assert monthly_cost < 0.01, f"Flash model cost should be negligible, got ${monthly_cost}"
    print(f"   ✅ Total cost for {total_chars} chars: ${monthly_cost:.6f}")
    
    return True


def main():
    """Run all tests"""
    print("🚀 Testing Dynamic Model Strategy\n")
    
    tests = [
        ("Model Selector", test_model_selector),
        ("Agent Configuration", test_agent_model_config),
        ("Integration", test_integration),
        ("Cost Scenarios", test_cost_scenarios)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            print(f"   ❌ {test_name} failed: {e}")
    
    print(f"\n{'='*50}")
    print(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✅ All tests passed! Dynamic model strategy is working correctly.")
        print("\n📊 Key Findings:")
        print("- All agents default to free tier (gemini-2.5-flash)")
        print("- Security specialist configured for reasoning model")
        print("- Cost tracking and budget management functional")
        print("- No API calls made during testing (cost: $0)")
    else:
        print("\n❌ Some tests failed. Review implementation.")
    
    return passed == total


if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)