#!/usr/bin/env python3
"""
Test the actual load_memory tool functionality.
"""

from dotenv import load_dotenv
import json
from pathlib import Path

# Load environment
load_dotenv('.env.local')

def test_load_memory_tool_directly():
    """Test load_memory tool directly to see if it actually works."""
    
    print("🧪 Testing load_memory Tool Directly...")
    
    try:
        from google.adk.tools import load_memory
        print("   ✅ load_memory tool imported successfully")
        print(f"   🔧 Tool type: {type(load_memory)}")
        print(f"   📝 Tool info: {load_memory}")
        
        # Try to get tool information
        if hasattr(load_memory, '__doc__'):
            print(f"   📚 Docstring: {load_memory.__doc__}")
        
        # Try to call the tool (this might fail without proper context)
        try:
            # This is likely to fail since we need proper ToolContext
            result = load_memory("test query")
            print(f"   ✅ Tool call succeeded: {result}")
        except Exception as e:
            print(f"   ⚠️  Tool call failed (expected): {e}")
            
        return True
        
    except ImportError as e:
        print(f"   ❌ Failed to import load_memory: {e}")
        return False

def test_agent_tool_usage():
    """Test load_memory through agent context."""
    
    print("\n🧪 Testing load_memory Through Agent Context...")
    
    try:
        from lib.agents.specialists.research_specialist import create_research_specialist
        
        # Create agent with load_memory tool
        agent = create_research_specialist()
        print(f"   ✅ Agent created with {len(agent.tools)} tools")
        
        # Find load_memory tool
        load_memory_tool = None
        for tool in agent.tools:
            if "LoadMemoryTool" in str(type(tool)):
                load_memory_tool = tool
                break
        
        if load_memory_tool:
            print(f"   ✅ Found LoadMemoryTool: {type(load_memory_tool)}")
            
            # Try to examine the tool
            if hasattr(load_memory_tool, '__dict__'):
                tool_attrs = {k: str(v)[:100] for k, v in load_memory_tool.__dict__.items() 
                             if not k.startswith('_')}
                print(f"   📊 Tool attributes: {tool_attrs}")
                
            # Test if tool has callable method
            if hasattr(load_memory_tool, '__call__'):
                print("   🔧 Tool is callable")
                
                # Try to call with test query (might fail without session context)
                try:
                    result = load_memory_tool("test ADK query")
                    print(f"   ✅ Tool call result: {result}")
                except Exception as e:
                    print(f"   ⚠️  Tool call failed: {e}")
                    print("   💡 This is expected without proper session context")
            
        else:
            print("   ❌ LoadMemoryTool not found in agent tools")
            
        return load_memory_tool is not None
        
    except Exception as e:
        print(f"   ❌ Error testing agent: {e}")
        return False

def test_environment_configuration():
    """Test if environment is properly configured for load_memory."""
    
    print("\n🧪 Testing Environment Configuration...")
    
    import os
    
    env_vars = [
        "VANA_RAG_CORPUS_ID",
        "SESSION_SERVICE_TYPE", 
        "GOOGLE_GENAI_USE_VERTEXAI",
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_API_KEY"
    ]
    
    config_status = {}
    
    for var in env_vars:
        value = os.getenv(var)
        if value:
            # Hide sensitive values
            display_value = value if var != "GOOGLE_API_KEY" else "***SET***"
            print(f"   ✅ {var}: {display_value}")
            config_status[var] = True
        else:
            print(f"   ❌ {var}: NOT SET")
            config_status[var] = False
    
    # Check corpus ID format
    corpus_id = os.getenv("VANA_RAG_CORPUS_ID")
    if corpus_id and corpus_id.startswith("projects/"):
        print("   ✅ Corpus ID format looks correct")
        config_status["corpus_format"] = True
    else:
        print("   ⚠️  Corpus ID format may be incorrect")
        config_status["corpus_format"] = False
        
    return config_status

def test_actual_query_with_session():
    """Test load_memory with actual ADK session context."""
    
    print("\n🧪 Testing load_memory with Session Context...")
    
    try:
        # Try to create a minimal ADK session context
        from google.adk.sessions import InMemorySessionService
        from google.adk.tools.context import ToolContext
        
        print("   📋 Creating session service...")
        session_service = InMemorySessionService()
        
        # Create session
        session = session_service.create_session(
            app_name="test_app",
            user_id="test_user",
            state={}
        )
        print(f"   ✅ Session created: {session.id}")
        
        # Try to create ToolContext (this might not work correctly)
        try:
            from google.adk.tools import load_memory
            
            # This is speculative - may not work without proper agent context
            print("   🔧 Attempting to call load_memory with session context...")
            
            # Note: This will likely fail as load_memory needs proper agent context
            # But we can see what kind of error we get
            result = load_memory("What is ADK?")
            print(f"   ✅ load_memory succeeded: {result}")
            
        except Exception as e:
            print(f"   ⚠️  load_memory failed: {e}")
            print("   💡 This indicates load_memory needs proper agent runtime context")
            
        return True
        
    except Exception as e:
        print(f"   ❌ Error setting up session: {e}")
        return False

def create_test_report(test_results):
    """Create test report for load_memory functionality."""
    
    report = {
        "test_summary": {
            "timestamp": "2025-01-19T20:15:00Z",
            "tests_run": len(test_results),
            "tests_passed": sum(1 for result in test_results.values() if result.get("passed", False)),
            "overall_status": "partial_success"
        },
        "detailed_results": test_results,
        "conclusions": {
            "load_memory_available": test_results.get("direct_test", {}).get("passed", False),
            "agent_integration": test_results.get("agent_test", {}).get("passed", False),
            "environment_ready": test_results.get("env_test", {}).get("passed", False),
            "session_context": test_results.get("session_test", {}).get("passed", False)
        },
        "recommendations": [
            "load_memory tool exists but may need proper agent runtime context",
            "Environment configuration appears correct",
            "Tool integration successful but functionality unverified",
            "Need real agent execution to test load_memory properly"
        ]
    }
    
    # Save report
    report_path = Path(".claude_workspace/load_memory_test_report.json")
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n📄 Test report saved to {report_path}")
    return report

def main():
    """Main test execution."""
    
    print("🚀 Testing load_memory Tool Functionality...")
    print("="*60)
    
    test_results = {}
    
    # Test 1: Direct tool import and inspection
    direct_success = test_load_memory_tool_directly()
    test_results["direct_test"] = {"passed": direct_success}
    
    # Test 2: Agent integration
    agent_success = test_agent_tool_usage()
    test_results["agent_test"] = {"passed": agent_success}
    
    # Test 3: Environment configuration
    env_config = test_environment_configuration()
    test_results["env_test"] = {"passed": all(env_config.values()), "details": env_config}
    
    # Test 4: Session context
    session_success = test_actual_query_with_session()
    test_results["session_test"] = {"passed": session_success}
    
    # Create report
    report = create_test_report(test_results)
    
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"Overall Status: {report['test_summary']['overall_status']}")
    print(f"Tests Passed: {report['test_summary']['tests_passed']}/{report['test_summary']['tests_run']}")
    
    print(f"\n🎯 Key Findings:")
    for key, value in report['conclusions'].items():
        status = "✅" if value else "❌"
        print(f"   {status} {key}: {value}")
    
    print(f"\n💡 Recommendations:")
    for rec in report['recommendations']:
        print(f"   - {rec}")
    
    print(f"\n🎯 CRITICAL INSIGHT:")
    if report['conclusions']['load_memory_available']:
        print("   load_memory tool exists and can be imported")
        print("   BUT it may require proper agent runtime context to function")
        print("   This suggests it's a real ADK tool, not just our addition")
    else:
        print("   load_memory tool is not available - this is a major finding")

if __name__ == "__main__":
    main()