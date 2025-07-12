#!/usr/bin/env python3
"""
SYSTEMATIC VALIDATION OF VANA'S 7 CLAIMED TOOLS
Ground truth testing - no assumptions, just facts.
"""

import sys
import traceback

# Add the project root to Python path
sys.path.insert(0, "/Users/nick/Development/vana")


def test_tool_import(tool_name: str) -> dict:
    """Test if a tool can be imported and what type it is"""
    result = {
        "tool_name": tool_name,
        "importable": False,
        "type": None,
        "callable": False,
        "has_function_attribute": False,
        "error": None,
    }

    try:
        # Try to import the tool
        from lib._tools import adk_tools

        tool = getattr(adk_tools, tool_name, None)

        if tool is None:
            result["error"] = f"Tool {tool_name} not found in adk_tools module"
            return result

        result["importable"] = True
        result["type"] = str(type(tool))
        result["callable"] = callable(tool)

        # Check if it has function attribute (for FunctionTool)
        if hasattr(tool, "func"):
            result["has_function_attribute"] = True

        # Check if it's a FunctionTool from Google ADK
        if "FunctionTool" in str(type(tool)):
            result["is_adk_function_tool"] = True
        else:
            result["is_adk_function_tool"] = False

    except Exception as e:
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()

    return result


def test_tool_execution(tool_name: str, test_args: dict) -> dict:
    """Test if a tool can actually be executed"""
    result = {
        "tool_name": tool_name,
        "executable": False,
        "result": None,
        "error": None,
    }

    try:
        from lib._tools import adk_tools

        tool = getattr(adk_tools, tool_name, None)

        if tool is None:
            result["error"] = f"Tool {tool_name} not found"
            return result

        # Try to execute the tool
        if hasattr(tool, "func"):
            # It's a FunctionTool, call the underlying function
            result["result"] = tool.func(**test_args)
        else:
            # Try calling it directly
            result["result"] = tool(**test_args)

        result["executable"] = True

    except Exception as e:
        result["error"] = str(e)
        result["traceback"] = traceback.format_exc()

    return result


def main():
    """Main validation function"""
    print("🔍 SYSTEMATIC VALIDATION OF VANA'S 7 TOOLS")
    print("=" * 60)

    # The 7 tools claimed to exist in team.py
    claimed_tools = [
        "adk_web_search",
        "adk_mathematical_solve",
        "adk_logical_analyze",
        "adk_read_file",
        "adk_write_file",
        "adk_analyze_task",
        "adk_simple_execute_code",
    ]

    # Test data for each tool
    test_cases = {
        "adk_web_search": {"query": "test query", "max_results": 3},
        "adk_mathematical_solve": {"problem": "2 + 2"},
        "adk_logical_analyze": {"problem": "If A then B. A is true. What can we conclude?"},
        "adk_read_file": {"file_path": "/Users/nick/Development/vana/README.md"},
        "adk_write_file": {
            "file_path": "/tmp/test_file.txt",
            "content": "test content",
        },
        "adk_analyze_task": {"task": "analyze this task"},
        "adk_simple_execute_code": {"code": 'print("Hello World")'},
    }

    results = {}

    # Test 1: Import test
    print("\n📦 IMPORT TEST")
    print("-" * 30)
    for tool in claimed_tools:
        import_result = test_tool_import(tool)
        results[tool] = {"import": import_result}

        status = "✅ PASS" if import_result["importable"] else "❌ FAIL"
        print(f"{tool}: {status}")
        if import_result["error"]:
            print(f"  Error: {import_result['error']}")

    # Test 2: Execution test
    print("\n🚀 EXECUTION TEST")
    print("-" * 30)
    for tool in claimed_tools:
        if results[tool]["import"]["importable"]:
            exec_result = test_tool_execution(tool, test_cases[tool])
            results[tool]["execution"] = exec_result

            status = "✅ PASS" if exec_result["executable"] else "❌ FAIL"
            print(f"{tool}: {status}")
            if exec_result["error"]:
                print(f"  Error: {exec_result['error']}")
        else:
            print(f"{tool}: ⏭️  SKIP (not importable)")
            results[tool]["execution"] = {"skipped": True}

    # Summary
    print("\n📊 VALIDATION SUMMARY")
    print("=" * 60)

    importable_count = sum(1 for tool in claimed_tools if results[tool]["import"]["importable"])
    executable_count = sum(
        1
        for tool in claimed_tools
        if "execution" in results[tool] and results[tool]["execution"].get("executable", False)
    )

    print(f"Tools claimed: {len(claimed_tools)}")
    print(f"Tools importable: {importable_count}/{len(claimed_tools)}")
    print(f"Tools executable: {executable_count}/{len(claimed_tools)}")

    # Individual tool status
    print("\nDETAILED STATUS:")
    for tool in claimed_tools:
        import_ok = results[tool]["import"]["importable"]
        exec_ok = results[tool].get("execution", {}).get("executable", False)

        if import_ok and exec_ok:
            status = "✅ VERIFIED WORKING"
        elif import_ok and not exec_ok:
            status = "⚠️  IMPORTS BUT FAILS EXECUTION"
        else:
            status = "❌ NOT WORKING"

        print(f"  {tool}: {status}")

    # Save results to file
    with open("/Users/nick/Development/vana/tool_validation_results.json", "w") as f:
        import json

        json.dump(results, f, indent=2, default=str)

    print("\nResults saved to: /Users/nick/Development/vana/tool_validation_results.json")


if __name__ == "__main__":
    main()
