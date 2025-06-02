#!/usr/bin/env python3
"""
Test Agent Orchestration Model

This script tests the agent orchestration model with Vana as the lead agent.
"""

import json
import logging
import os
import sys

from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def test_vana_orchestration():
    """Test the Vana orchestration model."""
    try:
        from adk_setup.vana.agents.team import AgentTeam
        from adk_setup.vana.agents.vana import VanaAgent
    except ImportError:
        logger.error(
            "Failed to import agent modules. Make sure you're running this script from the project root directory."
        )
        return False

    logger.info("Testing Vana orchestration model...")

    # Initialize Vana agent
    try:
        vana = VanaAgent()
        logger.info("✅ Vana agent initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Vana agent: {e}")
        return False

    # Initialize agent team
    try:
        team = AgentTeam()
        logger.info("✅ Agent team initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize agent team: {e}")
        return False

    # Test task delegation
    test_tasks = [
        {
            "task": "What is the architecture of the VANA project?",
            "expected_agent": "rhea",
            "description": "Architecture question should be delegated to Rhea",
        },
        {
            "task": "How should we design the user interface?",
            "expected_agent": "max",
            "description": "Interface question should be delegated to Max",
        },
        {
            "task": "How can we automate the deployment process?",
            "expected_agent": "sage",
            "description": "Automation question should be delegated to Sage",
        },
        {
            "task": "What edge cases should we consider for error handling?",
            "expected_agent": "kai",
            "description": "Edge case question should be delegated to Kai",
        },
        {
            "task": "Can you test the memory system?",
            "expected_agent": "juno",
            "description": "Testing question should be delegated to Juno",
        },
    ]

    results = []

    for task in test_tasks:
        logger.info(f"Testing task: {task['task']}")

        try:
            # Determine which agent should handle the task
            agent = vana.determine_agent(task["task"])

            if agent == task["expected_agent"]:
                logger.info(f"✅ Task correctly delegated to {agent}")
                result = "pass"
            else:
                logger.warning(
                    f"❌ Task incorrectly delegated to {agent}, expected {task['expected_agent']}"
                )
                result = "fail"

            results.append(
                {
                    "task": task["task"],
                    "expected_agent": task["expected_agent"],
                    "actual_agent": agent,
                    "result": result,
                    "description": task["description"],
                }
            )
        except Exception as e:
            logger.error(f"❌ Error determining agent for task: {e}")
            results.append(
                {
                    "task": task["task"],
                    "expected_agent": task["expected_agent"],
                    "actual_agent": "error",
                    "result": "error",
                    "description": task["description"],
                    "error": str(e),
                }
            )

    # Print results
    logger.info("\n=== Test Results ===")

    passed = sum(1 for r in results if r["result"] == "pass")
    failed = sum(1 for r in results if r["result"] == "fail")
    errors = sum(1 for r in results if r["result"] == "error")

    logger.info(f"Passed: {passed}/{len(results)}")
    logger.info(f"Failed: {failed}/{len(results)}")
    logger.info(f"Errors: {errors}/{len(results)}")

    for i, result in enumerate(results):
        logger.info(f"\nTest {i+1}: {result['task']}")
        logger.info(f"Expected agent: {result['expected_agent']}")
        logger.info(f"Actual agent: {result['actual_agent']}")
        logger.info(f"Result: {result['result']}")
        logger.info(f"Description: {result['description']}")

        if "error" in result:
            logger.info(f"Error: {result['error']}")

    # Save results to file
    with open("agent_orchestration_test_results.json", "w") as f:
        json.dump(results, f, indent=2)

    logger.info("\nTest results saved to agent_orchestration_test_results.json")

    return passed == len(results)


def test_context_passing():
    """Test the context passing framework."""
    try:
        from adk_setup.vana.context.context_manager import ContextManager
    except ImportError:
        logger.error(
            "Failed to import context manager module. Make sure you're running this script from the project root directory."
        )
        return False

    logger.info("Testing context passing framework...")

    # Initialize context manager
    try:
        context_manager = ContextManager()
        logger.info("✅ Context manager initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize context manager: {e}")
        return False

    # Test context creation
    try:
        context = context_manager.create_context("test_user", "test_session")
        logger.info("✅ Context created")
        logger.info(f"Context ID: {context.id}")
        logger.info(f"User ID: {context.user_id}")
        logger.info(f"Session ID: {context.session_id}")
        logger.info(f"Created at: {context.created_at}")
    except Exception as e:
        logger.error(f"❌ Failed to create context: {e}")
        return False

    # Test adding data to context
    try:
        context.add_data("test_key", "test_value")
        logger.info("✅ Data added to context")
    except Exception as e:
        logger.error(f"❌ Failed to add data to context: {e}")
        return False

    # Test getting data from context
    try:
        value = context.get_data("test_key")

        if value == "test_value":
            logger.info("✅ Data retrieved from context")
        else:
            logger.warning(f"❌ Data retrieved from context is incorrect: {value}")
            return False
    except Exception as e:
        logger.error(f"❌ Failed to get data from context: {e}")
        return False

    # Test serialization
    try:
        serialized = context.serialize()
        logger.info("✅ Context serialized")
        logger.info(f"Serialized context: {serialized}")
    except Exception as e:
        logger.error(f"❌ Failed to serialize context: {e}")
        return False

    # Test deserialization
    try:
        deserialized = context_manager.deserialize(serialized)
        logger.info("✅ Context deserialized")

        if deserialized.id == context.id:
            logger.info("✅ Deserialized context has correct ID")
        else:
            logger.warning(
                f"❌ Deserialized context has incorrect ID: {deserialized.id}"
            )
            return False

        if deserialized.get_data("test_key") == "test_value":
            logger.info("✅ Deserialized context has correct data")
        else:
            logger.warning(
                f"❌ Deserialized context has incorrect data: {deserialized.get_data('test_key')}"
            )
            return False
    except Exception as e:
        logger.error(f"❌ Failed to deserialize context: {e}")
        return False

    # Test persistence
    try:
        context_manager.save_context(context)
        logger.info("✅ Context saved")
    except Exception as e:
        logger.error(f"❌ Failed to save context: {e}")
        return False

    try:
        loaded = context_manager.load_context(context.id)
        logger.info("✅ Context loaded")

        if loaded.id == context.id:
            logger.info("✅ Loaded context has correct ID")
        else:
            logger.warning(f"❌ Loaded context has incorrect ID: {loaded.id}")
            return False

        if loaded.get_data("test_key") == "test_value":
            logger.info("✅ Loaded context has correct data")
        else:
            logger.warning(
                f"❌ Loaded context has incorrect data: {loaded.get_data('test_key')}"
            )
            return False
    except Exception as e:
        logger.error(f"❌ Failed to load context: {e}")
        return False

    return True


def test_result_synthesis():
    """Test the result synthesis methods."""
    try:
        from adk_setup.vana.orchestration.result_synthesizer import ResultSynthesizer
    except ImportError:
        logger.error(
            "Failed to import result synthesizer module. Make sure you're running this script from the project root directory."
        )
        return False

    logger.info("Testing result synthesis methods...")

    # Initialize result synthesizer
    try:
        synthesizer = ResultSynthesizer()
        logger.info("✅ Result synthesizer initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize result synthesizer: {e}")
        return False

    # Test result synthesis
    test_results = [
        {
            "agent": "rhea",
            "content": "The architecture follows a microservices pattern with three main components.",
            "confidence": 0.9,
        },
        {
            "agent": "max",
            "content": "The user interface should be designed with accessibility in mind.",
            "confidence": 0.8,
        },
        {
            "agent": "sage",
            "content": "Deployment can be automated using GitHub Actions.",
            "confidence": 0.7,
        },
    ]

    try:
        synthesized = synthesizer.synthesize(test_results)
        logger.info("✅ Results synthesized")
        logger.info(f"Synthesized result: {synthesized}")
    except Exception as e:
        logger.error(f"❌ Failed to synthesize results: {e}")
        return False

    # Test result ranking
    try:
        ranked = synthesizer.rank(test_results)
        logger.info("✅ Results ranked")

        for i, result in enumerate(ranked):
            logger.info(
                f"Rank {i+1}: {result['agent']} (confidence: {result['confidence']})"
            )
    except Exception as e:
        logger.error(f"❌ Failed to rank results: {e}")
        return False

    # Test result formatting
    try:
        formatted = synthesizer.format(synthesized)
        logger.info("✅ Results formatted")
        logger.info(f"Formatted result: {formatted}")
    except Exception as e:
        logger.error(f"❌ Failed to format results: {e}")
        return False

    return True


def main():
    """Main function."""
    logger.info("=== Testing Agent Orchestration Model ===")

    # Test Vana orchestration
    orchestration_result = test_vana_orchestration()

    # Test context passing
    context_result = test_context_passing()

    # Test result synthesis
    synthesis_result = test_result_synthesis()

    # Print overall results
    logger.info("\n=== Overall Results ===")
    logger.info(
        f"Vana Orchestration: {'✅ PASS' if orchestration_result else '❌ FAIL'}"
    )
    logger.info(f"Context Passing: {'✅ PASS' if context_result else '❌ FAIL'}")
    logger.info(f"Result Synthesis: {'✅ PASS' if synthesis_result else '❌ FAIL'}")

    if orchestration_result and context_result and synthesis_result:
        logger.info("\n✅ All tests passed!")
        return 0
    else:
        logger.warning("\n❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
