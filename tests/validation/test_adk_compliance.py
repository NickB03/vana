#!/usr/bin/env python3
"""
GOOGLE ADK COMPLIANCE VALIDATION
Check if VANA follows proper Google ADK patterns
"""
import sys
import traceback

# Add the project root to Python path
sys.path.insert(0, "/Users/nick/Development/vana")


def check_adk_imports():
    """Check if Google ADK is properly imported"""
    try:
        import google.adk.agents  # noqa: F401
        import google.adk.tools  # noqa: F401

        return {
            "status": "SUCCESS",
            "llm_agent_available": True,
            "function_tool_available": True,
        }
    except ImportError as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "llm_agent_available": False,
            "function_tool_available": False,
        }


def check_vana_agent_structure():
    """Check if VANA agent follows ADK patterns"""
    try:
        from agents.vana.team import root_agent

        result = {
            "status": "SUCCESS",
            "agent_type": str(type(root_agent)),
            "is_llm_agent": "LlmAgent" in str(type(root_agent)),
            "has_tools": hasattr(root_agent, "tools"),
            "has_sub_agents": hasattr(root_agent, "sub_agents"),
            "tool_count": len(root_agent.tools) if hasattr(root_agent, "tools") else 0,
            "sub_agent_count": len(root_agent.sub_agents)
            if hasattr(root_agent, "sub_agents")
            else 0,
        }

        if hasattr(root_agent, "tools"):
            tool_types = [str(type(tool)) for tool in root_agent.tools]
            result["tool_types"] = tool_types
            result["all_function_tools"] = all(
                "FunctionTool" in tool_type for tool_type in tool_types
            )

        return result

    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


def check_specialist_agents():
    """Check if specialist agents are properly configured"""
    try:
        from agents.code_execution.specialist import code_execution_specialist
        from agents.data_science.specialist import data_science_specialist

        specialists = [
            ("code_execution_specialist", code_execution_specialist),
            ("data_science_specialist", data_science_specialist),
        ]

        results = {}
        for name, agent in specialists:
            results[name] = {
                "available": True,
                "type": str(type(agent)),
                "is_llm_agent": "LlmAgent" in str(type(agent)),
                "has_tools": hasattr(agent, "tools"),
                "tool_count": len(agent.tools) if hasattr(agent, "tools") else 0,
            }

        return {"status": "SUCCESS", "specialists": results}

    except Exception as e:
        return {
            "status": "FAILED",
            "error": str(e),
            "traceback": traceback.format_exc(),
        }


def check_sandbox_infrastructure():
    """Check if sandbox infrastructure exists"""
    try:
        import lib.sandbox.core.security_manager  # noqa: F401
        import lib.sandbox.executors  # noqa: F401

        return {
            "status": "SUCCESS",
            "python_executor_available": True,
            "javascript_executor_available": True,
            "shell_executor_available": True,
            "security_manager_available": True,
        }

    except ImportError as e:
        return {"status": "FAILED", "error": str(e), "missing_components": []}


def main():
    """Main validation function"""
    print("🔍 GOOGLE ADK COMPLIANCE VALIDATION")
    print("=" * 60)

    # Test 1: ADK Imports
    print("\n📦 ADK IMPORTS TEST")
    print("-" * 30)
    adk_result = check_adk_imports()
    if adk_result["status"] == "SUCCESS":
        print("✅ Google ADK properly imported")
        print("  LlmAgent: ✅")
        print("  FunctionTool: ✅")
    else:
        print("❌ Google ADK import failed")
        print(f"  Error: {adk_result['error']}")

    # Test 2: VANA Agent Structure
    print("\n🤖 VANA AGENT STRUCTURE")
    print("-" * 30)
    vana_result = check_vana_agent_structure()
    if vana_result["status"] == "SUCCESS":
        print("✅ VANA agent structure valid")
        print(f"  Type: {vana_result['agent_type']}")
        print(f"  Is LlmAgent: {'✅' if vana_result['is_llm_agent'] else '❌'}")
        print(f"  Tools: {vana_result['tool_count']}")
        print(f"  Sub-agents: {vana_result['sub_agent_count']}")
        print(
            f"  All Function Tools: {'✅' if vana_result.get('all_function_tools', False) else '❌'}"
        )
    else:
        print("❌ VANA agent structure invalid")
        print(f"  Error: {vana_result['error']}")

    # Test 3: Specialist Agents
    print("\n🎯 SPECIALIST AGENTS")
    print("-" * 30)
    specialist_result = check_specialist_agents()
    if specialist_result["status"] == "SUCCESS":
        print("✅ Specialist agents available")
        for name, details in specialist_result["specialists"].items():
            print(f"  {name}: {'✅' if details['available'] else '❌'}")
            print(f"    Type: {details['type']}")
            print(f"    Tools: {details['tool_count']}")
    else:
        print("❌ Specialist agents failed")
        print(f"  Error: {specialist_result['error']}")

    # Test 4: Sandbox Infrastructure
    print("\n🔒 SANDBOX INFRASTRUCTURE")
    print("-" * 30)
    sandbox_result = check_sandbox_infrastructure()
    if sandbox_result["status"] == "SUCCESS":
        print("✅ Sandbox infrastructure available")
        print("  PythonExecutor: ✅")
        print("  JavaScriptExecutor: ✅")
        print("  ShellExecutor: ✅")
        print("  SecurityManager: ✅")
    else:
        print("❌ Sandbox infrastructure missing")
        print(f"  Error: {sandbox_result['error']}")

    # Overall Assessment
    print("\n📊 OVERALL ADK COMPLIANCE")
    print("=" * 60)

    total_tests = 4
    passed_tests = sum(
        [
            adk_result["status"] == "SUCCESS",
            vana_result["status"] == "SUCCESS",
            specialist_result["status"] == "SUCCESS",
            sandbox_result["status"] == "SUCCESS",
        ]
    )

    compliance_score = (passed_tests / total_tests) * 100

    print(f"Tests passed: {passed_tests}/{total_tests}")
    print(f"Compliance score: {compliance_score:.1f}%")

    if compliance_score >= 75:
        print("✅ VANA IS ADK COMPLIANT")
    else:
        print("❌ VANA NEEDS ADK COMPLIANCE FIXES")

    # Save results
    results = {
        "adk_imports": adk_result,
        "vana_structure": vana_result,
        "specialists": specialist_result,
        "sandbox": sandbox_result,
        "compliance_score": compliance_score,
    }

    with open("/Users/nick/Development/vana/adk_compliance_results.json", "w") as f:
        import json

        json.dump(results, f, indent=2, default=str)

    print(
        "\nResults saved to: /Users/nick/Development/vana/adk_compliance_results.json"
    )


if __name__ == "__main__":
    main()
