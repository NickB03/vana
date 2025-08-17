#!/usr/bin/env python3
"""
Test script for ADK Expert Agent

This script tests the ADK Expert Agent's ability to query ChromaDB
and provide ADK guidance for Claude Flow integration.
"""

import asyncio

# Import the ADK Expert Agent modules
# Note: app.agents module structure has changed or moved
# from app.agents.adk_expert_agent import (
#     ADKExpertAgent,
#     create_adk_expert_llm_agent,
#     query_adk_expert,
#     ADKQueryType,
#     ADKQueryRequest
# )
# from app.agents.adk_expert_claude_flow import (
#     ADKExpertClaudeFlow,
#     query_adk_chromadb,
#     adk_expert_mcp_tool
# )


async def test_basic_agent():
    """Test basic ADK Expert Agent functionality."""
    print("\n=== Testing Basic ADK Expert Agent ===\n")

    try:
        # Create expert agent
        expert = ADKExpertAgent()
        print("✓ ADK Expert Agent created successfully")

        # Test different query types
        test_queries = [
            ("How to implement two-phase workflow", ADKQueryType.IMPLEMENTATION),
            ("Best practices for agent callbacks", ADKQueryType.BEST_PRACTICE),
            ("LoopAgent not terminating", ADKQueryType.TROUBLESHOOTING),
            ("SequentialAgent example", ADKQueryType.EXAMPLE),
        ]

        for query, query_type in test_queries:
            print(f"\nQuerying: {query} (Type: {query_type.value})")

            # Query knowledge base
            results = await expert.query_adk_knowledge(query, query_type, max_results=5)
            print(f"  - Query executed, checking for: {results['type']}")

            # Synthesize guidance
            guidance = await expert.synthesize_guidance(results, query)
            print(f"  - Guidance synthesized for topic: {guidance.topic}")

            if guidance.examples:
                print(f"  - Found {len(guidance.examples)} code examples")
            if guidance.best_practices:
                print(f"  - Found {len(guidance.best_practices)} best practices")
            if guidance.warnings:
                print(f"  - Found {len(guidance.warnings)} warnings")

        print("\n✓ All query types tested successfully")

    except Exception as e:
        print(f"✗ Error testing basic agent: {e}")
        return False

    return True


async def test_claude_flow_integration():
    """Test Claude Flow integration."""
    print("\n=== Testing Claude Flow Integration ===\n")

    try:
        # Create Claude Flow orchestrator
        flow = ADKExpertClaudeFlow()
        print("✓ Claude Flow orchestrator created")

        # Test query processing
        test_cases = [
            "What is the hierarchical planner-executor pattern?",
            "How do I use AgentTool for delegation?",
            "Fix circular import in callbacks",
            "Show me an example of custom BaseAgent"
        ]

        for query in test_cases:
            print(f"\nProcessing: {query}")

            result = await flow.process_adk_query(query)

            print(f"  - Intent detected: {result['intent']}")
            print(f"  - Status: {result['status']}")

            # Check if results were generated
            if result.get('results'):
                print(f"  - Generated {len(result['results'])} search queries")

        print("\n✓ Claude Flow integration tested successfully")

    except Exception as e:
        print(f"✗ Error testing Claude Flow: {e}")
        return False

    return True


async def test_mcp_tool_integration():
    """Test MCP tool integration."""
    print("\n=== Testing MCP Tool Integration ===\n")

    try:
        # Test ChromaDB query structure
        query_result = await query_adk_chromadb(
            "LlmAgent configuration",
            collection_name="adk_documentation",
            n_results=5
        )

        print("✓ ChromaDB query structured successfully")
        print(f"  - Collection: {query_result['collection']}")
        print(f"  - Status: {query_result['status']}")
        print(f"  - MCP tool: {query_result['mcp_query']['tool']}")

        # Test MCP tool wrapper
        actions = [
            ("query", {"query": "SequentialAgent pattern"}),
            ("list_patterns", {}),
            ("validate", {"code": "agent = LlmAgent(name='test')"})
        ]

        for action, params in actions:
            print(f"\nTesting MCP action: {action}")

            result = await adk_expert_mcp_tool(action, params)

            if result.get("status") == "success":
                print(f"  ✓ Action '{action}' executed successfully")
            else:
                print(f"  ✗ Action '{action}' failed: {result.get('message', 'Unknown error')}")

        print("\n✓ MCP tool integration tested successfully")

    except Exception as e:
        print(f"✗ Error testing MCP tools: {e}")
        return False

    return True


async def test_llm_agent_wrapper():
    """Test LLM Agent wrapper for tool usage."""
    print("\n=== Testing LLM Agent Wrapper ===\n")

    try:
        # Create LLM agent with ADK expert capabilities
        adk_llm_agent = create_adk_expert_llm_agent()

        print("✓ ADK Expert LLM Agent created")
        print(f"  - Name: {adk_llm_agent.name}")
        print(f"  - Model: {adk_llm_agent.model}")
        print(f"  - Tools: {len(adk_llm_agent.tools)} tool(s) available")

        # Test tool function directly
        tool_result = await query_adk_expert(
            query="How to use callbacks in ADK",
            query_type="implementation",
            include_examples=True
        )

        print("\n✓ Tool function executed")
        print(f"  - Status: {tool_result['status']}")

        if tool_result['status'] == 'success':
            guidance = tool_result.get('guidance', {})
            print(f"  - Guidance topic: {guidance.get('topic', 'N/A')}")

        print("\n✓ LLM Agent wrapper tested successfully")

    except Exception as e:
        print(f"✗ Error testing LLM agent: {e}")
        return False

    return True


async def test_validation_functionality():
    """Test code validation against ADK patterns."""
    print("\n=== Testing Validation Functionality ===\n")

    try:
        expert = ADKExpertAgent()

        # Test code samples
        test_cases = [
            (
                """
                agent = LlmAgent(
                    name="test_agent",
                    model="gemini-2.5-flash",
                    instruction="Process tasks"
                )
                """,
                "LlmAgent configuration"
            ),
            (
                """
                pipeline = SequentialAgent(
                    name="pipeline",
                    sub_agents=[agent1, agent2]
                )
                """,
                "SequentialAgent pattern"
            )
        ]

        for code, pattern in test_cases:
            print(f"\nValidating: {pattern}")

            validation = await expert.validate_implementation(code, pattern)

            print(f"  - Pattern: {validation['pattern']}")
            print(f"  - Compliant: {validation['compliant']}")
            print(f"  - Score: {validation['score']}")

            if validation['issues']:
                print(f"  - Issues found: {len(validation['issues'])}")
            if validation['suggestions']:
                print(f"  - Suggestions: {len(validation['suggestions'])}")

        print("\n✓ Validation functionality tested successfully")

    except Exception as e:
        print(f"✗ Error testing validation: {e}")
        return False

    return True


async def main():
    """Run all tests."""
    print("=" * 60)
    print("ADK EXPERT AGENT TEST SUITE")
    print("=" * 60)

    # Track test results
    results = []

    # Run tests
    tests = [
        ("Basic Agent", test_basic_agent),
        ("Claude Flow Integration", test_claude_flow_integration),
        ("MCP Tool Integration", test_mcp_tool_integration),
        ("LLM Agent Wrapper", test_llm_agent_wrapper),
        ("Validation Functionality", test_validation_functionality)
    ]

    for test_name, test_func in tests:
        print(f"\nRunning: {test_name}")
        print("-" * 40)

        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Print summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = 0
    failed = 0

    for test_name, result in results:
        status = "✓ PASSED" if result else "✗ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
        else:
            failed += 1

    print("-" * 40)
    print(f"Total: {passed} passed, {failed} failed")

    # Overall result
    if failed == 0:
        print("\n🎉 All tests passed successfully!")
    else:
        print(f"\n⚠️  {failed} test(s) failed. Please review the errors above.")

    return failed == 0


if __name__ == "__main__":
    # Run the test suite
    success = asyncio.run(main())

    # Exit with appropriate code
    exit(0 if success else 1)
