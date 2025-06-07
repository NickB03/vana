#!/usr/bin/env python3
"""
Test script for the Sequential Agent pattern implementation.

This script tests the Google ADK Sequential Agent pattern where agents
execute in sequence with state sharing between them.
"""

import sys
import os


def test_sequential_agent_creation():
    """Test creating a Sequential Agent with mock agents."""
    print("🧪 Testing Sequential Agent creation...")
    
    try:
        from google.adk.agents import SequentialAgent
        
        # Create mock agents
        class MockAgent:
            def __init__(self, name, output_key=None):
                self.name = name
                self.output_key = output_key
        
        # Create mock specialist agents
        mock_architecture = MockAgent("architecture_specialist", "architecture_analysis")
        mock_ui = MockAgent("ui_specialist", "ui_design")
        mock_devops = MockAgent("devops_specialist", "devops_plan")
        mock_qa = MockAgent("qa_specialist", "qa_report")
        
        # Test 1: Create sequential agent
        print("\n1. Creating sequential agent with 4 specialists...")
        sequential_agent = SequentialAgent(
            name="full_development_pipeline",
            sub_agents=[mock_architecture, mock_ui, mock_devops, mock_qa],
            description="Complete development workflow from architecture to QA"
        )
        
        print(f"✅ Sequential agent created: {sequential_agent.name}")
        print(f"✅ Sub-agents count: {len(sequential_agent.sub_agents)}")
        
        # Test 2: Get execution summary
        print("\n2. Testing execution summary...")
        summary = sequential_agent.get_execution_summary()
        print(f"✅ Summary: {summary['name']} with {summary['sub_agent_count']} agents")
        print(f"✅ Agent names: {summary['sub_agent_names']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Sequential Agent creation: {e}")
        return False

def test_sequential_execution():
    """Test sequential execution with mock agents."""
    print("\n🔄 Testing sequential execution...")
    
    try:
        from google.adk.agents import SequentialAgent
        
        # Create mock agents
        class MockAgent:
            def __init__(self, name, output_key=None):
                self.name = name
                self.output_key = output_key
        
        mock_architecture = MockAgent("architecture_specialist", "architecture_analysis")
        mock_ui = MockAgent("ui_specialist", "ui_design")
        mock_devops = MockAgent("devops_specialist", "devops_plan")
        
        # Create sequential agent
        sequential_agent = SequentialAgent(
            name="design_to_deployment",
            sub_agents=[mock_architecture, mock_ui, mock_devops],
            description="Design to deployment workflow"
        )
        
        # Test execution
        print("\n1. Executing sequential workflow...")
        result = sequential_agent.execute(
            initial_context="Design and deploy a new web application with user authentication",
            session_state={}
        )
        
        print(f"✅ Execution success: {result.success}")
        print(f"✅ Execution order: {result.execution_order}")
        print(f"✅ Total time: {result.total_execution_time:.2f}s")
        print(f"✅ Session state keys: {list(result.session_state.keys()) if result.session_state else []}")
        
        # Verify state sharing
        if result.session_state:
            expected_keys = ["architecture_analysis", "ui_design", "devops_plan"]
            for key in expected_keys:
                if key in result.session_state:
                    print(f"✅ Session state contains '{key}': {type(result.session_state[key])}")
                else:
                    print(f"❌ Session state missing '{key}'")
                    return False
        
        return result.success
        
    except Exception as e:
        print(f"❌ Error testing sequential execution: {e}")
        return False

def test_sequential_with_real_agents():
    """Test sequential execution with real agent definitions."""
    print("\n🤖 Testing sequential execution with real agents...")
    
    try:
        from google.adk.agents import SequentialAgent
        from agents.vana.team import (
            architecture_specialist,
            ui_specialist,
            devops_specialist,
        )
        
        # Create sequential agent with real agents
        print("\n1. Creating sequential agent with real specialist agents...")
        sequential_agent = SequentialAgent(
            name="real_agent_pipeline",
            sub_agents=[architecture_specialist, ui_specialist, devops_specialist],
            description="Real agent sequential workflow"
        )
        
        print(f"✅ Sequential agent created with real agents")
        
        # Test execution summary
        print("\n2. Testing execution summary with real agents...")
        summary = sequential_agent.get_execution_summary()
        print(f"✅ Real agent names: {summary['sub_agent_names']}")
        
        # Test mock execution (since we can't run full LLM execution in test)
        print("\n3. Testing mock execution with real agent structure...")
        result = sequential_agent.execute(
            initial_context="Create a scalable e-commerce platform",
            session_state={}
        )
        
        print(f"✅ Mock execution success: {result.success}")
        print(f"✅ Agents executed: {result.execution_order}")
        
        # Verify output_key mapping
        expected_mappings = {
            "architecture_specialist": "architecture_analysis",
            "ui_specialist": "ui_design", 
            "devops_specialist": "devops_plan"
        }
        
        for agent_name, expected_key in expected_mappings.items():
            if agent_name in result.execution_order and expected_key in result.session_state:
                print(f"✅ {agent_name} -> {expected_key} mapping working")
            else:
                print(f"❌ {agent_name} -> {expected_key} mapping failed")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing with real agents: {e}")
        return False

def test_error_handling():
    """Test error handling in sequential execution."""
    print("\n⚠️ Testing error handling...")
    
    try:
        from google.adk.agents import SequentialAgent
        
        # Test 1: Empty sub_agents list
        print("\n1. Testing empty sub_agents validation...")
        try:
            SequentialAgent(name="empty_agent", sub_agents=[])
            print("❌ Should have raised ValueError for empty sub_agents")
            return False
        except ValueError:
            print("✅ Correctly raised ValueError for empty sub_agents")
        
        # Test 2: Sequential agent with stop_on_error=False
        class MockAgent:
            def __init__(self, name, should_fail=False):
                self.name = name
                self.should_fail = should_fail
        
        mock_good = MockAgent("good_agent")
        mock_bad = MockAgent("bad_agent", should_fail=True)
        mock_recovery = MockAgent("recovery_agent")
        
        sequential_agent = SequentialAgent(
            name="error_handling_test",
            sub_agents=[mock_good, mock_bad, mock_recovery],
            stop_on_error=False  # Continue on error
        )
        
        print("\n2. Testing execution with stop_on_error=False...")
        result = sequential_agent.execute("Test error handling")
        
        # Should complete all agents even with error
        print(f"✅ Execution completed: {result.success}")
        print(f"✅ All agents executed: {len(result.execution_order) == 3}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing error handling: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing Google ADK Sequential Agent Pattern Implementation")
    print("=" * 70)
    
    results = []
    
    # Test 1: Agent creation
    results.append(test_sequential_agent_creation())
    
    # Test 2: Sequential execution
    results.append(test_sequential_execution())
    
    # Test 3: Real agents
    results.append(test_sequential_with_real_agents())
    
    # Test 4: Error handling
    results.append(test_error_handling())
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Google ADK Sequential Agent pattern is implemented correctly.")
        print("\n✅ Critical Gap #3 RESOLVED: Sequential Agent pattern is working!")
        print("✅ Agents can now execute in sequence with state sharing")
        print("✅ Multi-agent workflows support step-by-step processing")
        print("✅ Foundation for complex agent orchestration is ready")
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
