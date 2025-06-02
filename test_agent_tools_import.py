#!/usr/bin/env python3
"""
Test script to safely check agent tools imports without affecting the running server.
"""

import sys
import time
import traceback


def test_import(module_path, item_name):
    """Test importing a specific item from a module."""
    print(f"\n🔍 Testing import: {item_name} from {module_path}")
    start_time = time.time()

    try:
        # Import the module
        module = __import__(module_path, fromlist=[item_name])

        # Get the specific item
        item = getattr(module, item_name)

        elapsed = time.time() - start_time
        print(f"✅ SUCCESS: {item_name} imported in {elapsed:.2f}s")
        print(f"   Type: {type(item)}")
        print(f"   Name: {getattr(item, 'name', 'No name attribute')}")
        return True

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ FAILED: {item_name} failed to import in {elapsed:.2f}s")
        print(f"   Error: {str(e)}")
        print("   Traceback:")
        traceback.print_exc()
        return False


def test_initialization():
    """Test the initialization of agent tools."""
    print("\n🔧 Testing Agent Tools Initialization")
    print("=" * 50)

    try:
        from lib._tools.agent_tools import adk_architecture_tool, initialize_agent_tools

        print("✅ Import successful")
        print(f"   Tool before init: {type(adk_architecture_tool)}")

        # Initialize the tools
        print("🔄 Initializing tools...")
        start_time = time.time()
        initialize_agent_tools()
        elapsed = time.time() - start_time

        # Re-import to get the initialized tool
        from lib._tools.agent_tools import adk_architecture_tool as arch_tool_after

        print(f"✅ Initialization completed in {elapsed:.2f}s")
        print(f"   Tool after init: {type(arch_tool_after)}")
        print(f"   Tool name: {getattr(arch_tool_after, 'name', 'No name')}")

        return True

    except Exception as e:
        print(f"❌ Initialization failed: {str(e)}")
        traceback.print_exc()
        return False


def main():
    """Test agent tools imports and initialization."""
    print("🚀 Testing Agent Tools Imports")
    print("=" * 50)

    # Test each agent tool individually
    tools_to_test = [
        ("lib._tools.agent_tools", "adk_architecture_tool"),
        ("lib._tools.agent_tools", "adk_ui_tool"),
        ("lib._tools.agent_tools", "adk_devops_tool"),
        ("lib._tools.agent_tools", "adk_qa_tool"),
    ]

    results = {}

    for module_path, tool_name in tools_to_test:
        success = test_import(module_path, tool_name)
        results[tool_name] = success

        # Add a small delay between tests
        time.sleep(0.5)

    print("\n📊 IMPORT SUMMARY")
    print("=" * 50)
    for tool_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {tool_name}")

    all_imports_passed = all(results.values())
    print(
        f"\n🎯 Import Result: {'✅ ALL PASSED' if all_imports_passed else '❌ SOME FAILED'}"
    )

    # Test initialization if imports passed
    init_passed = False
    if all_imports_passed:
        init_passed = test_initialization()

    overall_success = all_imports_passed and init_passed
    print(
        f"\n🏆 FINAL RESULT: {'✅ ALL TESTS PASSED' if overall_success else '❌ SOME TESTS FAILED'}"
    )

    return overall_success


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
