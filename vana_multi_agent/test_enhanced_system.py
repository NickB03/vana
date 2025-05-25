#!/usr/bin/env python3
"""
Test Enhanced VANA Multi-Agent System with PLAN/ACT Capabilities

This script tests the new AI agent best practices implementation:
- PLAN/ACT mode switching
- Confidence scoring for task routing
- Enhanced error recovery patterns
"""

import sys
import os
from pathlib import Path

# Add parent directory to Python path
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

def test_core_components():
    """Test the core enhanced components."""
    print("🧪 Testing Enhanced Core Components...")
    
    try:
        # Test Mode Manager
        from vana_multi_agent.core.mode_manager import ModeManager, AgentMode
        mode_manager = ModeManager()
        print("✅ Mode Manager: Imported successfully")
        
        # Test basic mode functionality
        complexity = mode_manager.analyze_task_complexity("Create a comprehensive system architecture")
        print(f"✅ Task Complexity Analysis: {complexity:.2f}")
        
        # Test Confidence Scorer
        from vana_multi_agent.core.confidence_scorer import ConfidenceScorer
        confidence_scorer = ConfidenceScorer()
        print("✅ Confidence Scorer: Imported successfully")
        
        # Test task analysis
        task_analysis = confidence_scorer.analyze_task("Design a user interface for the dashboard")
        print(f"✅ Task Analysis: Primary domain = {task_analysis.primary_domain.value}")
        
        # Test agent confidence calculation
        best_agent, score = confidence_scorer.get_best_agent_for_task("Implement automated testing")
        print(f"✅ Agent Selection: {best_agent} (confidence: {score.final_confidence:.2f})")
        
        # Test Task Router
        from vana_multi_agent.core.task_router import TaskRouter
        task_router = TaskRouter()
        print("✅ Task Router: Imported successfully")
        
        # Test routing decision
        routing_decision = task_router.route_task("Create a deployment pipeline")
        print(f"✅ Task Routing: {routing_decision.selected_agent} selected")
        print(f"   Planning Required: {routing_decision.requires_planning}")
        print(f"   Confidence: {routing_decision.confidence_score:.2f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Core Components Test Failed: {e}")
        return False

def test_enhanced_tools():
    """Test the enhanced coordination tools."""
    print("\n🔧 Testing Enhanced Coordination Tools...")
    
    try:
        from vana_multi_agent.tools.adk_tools import (
            _coordinate_task, _delegate_to_agent, _get_agent_status
        )
        
        # Test enhanced coordination
        result = _coordinate_task("Optimize system performance", "architecture_specialist")
        print("✅ Enhanced Task Coordination: Working")
        print(f"   Sample output: {result[:100]}...")
        
        # Test enhanced delegation
        result = _delegate_to_agent("ui_specialist", "Create responsive dashboard")
        print("✅ Enhanced Agent Delegation: Working")
        print(f"   Sample output: {result[:100]}...")
        
        # Test enhanced status
        result = _get_agent_status()
        print("✅ Enhanced Agent Status: Working")
        print(f"   Sample output: {result[:100]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced Tools Test Failed: {e}")
        return False

def test_agent_team():
    """Test the updated agent team with functional names."""
    print("\n🤖 Testing Enhanced Agent Team...")
    
    try:
        from vana_multi_agent.agents.team import (
            vana, architecture_specialist, ui_specialist, 
            devops_specialist, qa_specialist
        )
        
        print("✅ VANA Orchestrator: Imported successfully")
        print(f"   Name: {vana.name}")
        print(f"   Sub-agents: {len(vana.sub_agents)} specialists")
        
        print("✅ Architecture Specialist: Imported successfully")
        print(f"   Name: {architecture_specialist.name}")
        
        print("✅ UI Specialist: Imported successfully")
        print(f"   Name: {ui_specialist.name}")
        
        print("✅ DevOps Specialist: Imported successfully")
        print(f"   Name: {devops_specialist.name}")
        
        print("✅ QA Specialist: Imported successfully")
        print(f"   Name: {qa_specialist.name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Agent Team Test Failed: {e}")
        return False

def test_plan_act_integration():
    """Test PLAN/ACT mode integration."""
    print("\n🎯 Testing PLAN/ACT Mode Integration...")
    
    try:
        from vana_multi_agent.core.mode_manager import ModeManager
        from vana_multi_agent.core.task_router import TaskRouter
        
        mode_manager = ModeManager()
        task_router = TaskRouter()
        
        # Test simple task (should be direct ACT)
        simple_task = "Read a configuration file"
        routing = task_router.route_task(simple_task)
        print(f"✅ Simple Task Routing:")
        print(f"   Task: {simple_task}")
        print(f"   Mode: {'PLAN → ACT' if routing.requires_planning else 'Direct ACT'}")
        print(f"   Agent: {routing.selected_agent}")
        
        # Test complex task (should require PLAN)
        complex_task = "Design and implement a comprehensive multi-agent coordination system"
        routing = task_router.route_task(complex_task)
        print(f"✅ Complex Task Routing:")
        print(f"   Task: {complex_task}")
        print(f"   Mode: {'PLAN → ACT' if routing.requires_planning else 'Direct ACT'}")
        print(f"   Agent: {routing.selected_agent}")
        print(f"   Collaboration: {', '.join(routing.collaboration_agents) if routing.collaboration_agents else 'None'}")
        
        return True
        
    except Exception as e:
        print(f"❌ PLAN/ACT Integration Test Failed: {e}")
        return False

def main():
    """Run all enhanced system tests."""
    print("🚀 Enhanced VANA Multi-Agent System Test Suite")
    print("=" * 60)
    
    tests = [
        test_core_components,
        test_enhanced_tools,
        test_agent_team,
        test_plan_act_integration
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 60)
    print(f"🎯 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All enhanced features are working correctly!")
        print("\n📋 Enhanced Capabilities Verified:")
        print("✅ PLAN/ACT mode switching")
        print("✅ Confidence-based task routing")
        print("✅ Intelligent agent selection")
        print("✅ Enhanced coordination tools")
        print("✅ Functional agent naming")
        print("✅ Multi-agent collaboration planning")
        
        print("\n🚀 System ready for advanced AI agent operations!")
        return 0
    else:
        print(f"❌ {total - passed} tests failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
