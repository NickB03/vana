"""
Simple test of VANA code execution capabilities
Tests the actual tools that VANA has access to
"""

import json
from lib._tools.adk_tools import simple_execute_code, mathematical_solve


def test_vana_tools_available():
    """Test that VANA's code execution tools are working."""
    
    # Test mathematical solving - VANA's mathematical_solve tool
    math_result = mathematical_solve("What is 25 * 4 + 10?")
    math_data = json.loads(math_result)
    assert math_data["answer"] == 110
    assert math_data["confidence"] > 0.8
    print(f"✅ Mathematical solve: {math_data['answer']} (confidence: {math_data['confidence']})")
    
    # Test code execution - VANA's simple_execute_code tool
    code_result = simple_execute_code("print(sum([1, 2, 3, 4, 5]))", "python")
    code_data = json.loads(code_result)
    assert code_data["success"] is True
    assert "15" in code_data["output"]
    print(f"✅ Code execution: {code_data['output'].strip()}")
    
    # Test security blocking - should fail safely
    security_result = simple_execute_code("import os; os.system('ls')", "python")
    security_data = json.loads(security_result)
    assert security_data["success"] is False
    assert "dangerous pattern" in security_data["error"]
    print(f"✅ Security blocking: {security_data['error']}")


def test_vana_agent_has_tools():
    """Test that VANA agent actually has these tools imported."""
    from agents.vana.team import root_agent
    
    # Check that the tools are in VANA's tool list
    tool_names = [tool.name for tool in root_agent.tools]
    
    print(f"Available tools: {tool_names}")
    
    # Check for code execution tools (might have different names)
    code_tools = [name for name in tool_names if "execute" in name or "code" in name]
    math_tools = [name for name in tool_names if "mathematical" in name or "math" in name]
    
    assert len(code_tools) > 0, f"No code execution tools found in: {tool_names}"
    assert len(math_tools) > 0, f"No mathematical tools found in: {tool_names}"
    
    print(f"✅ VANA has {len(tool_names)} tools including:")
    print(f"   Code execution: {code_tools}")
    print(f"   Mathematical: {math_tools}")


if __name__ == "__main__":
    print("=== Testing VANA Code Execution Tools ===\n")
    
    test_vana_tools_available()
    print()
    test_vana_agent_has_tools()
    
    print("\n🎉 All VANA code execution tests passed!")
    print("\nVANA is ready for lightweight code execution:")
    print("- ✅ Mathematical expressions")
    print("- ✅ Simple Python code")
    print("- ✅ Security validation")
    print("- ✅ Tools properly imported")