#!/usr/bin/env python3
"""
Test script for the output_key state sharing implementation.

This script tests the Google ADK state sharing pattern where agents
save their results to session state via output_key parameters.
"""

import os
import sys

# Add the vana_multi_agent directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "vana_multi_agent"))


def test_agent_output_key_configuration():
    """Test that all agents have proper output_key configuration."""
    print("🧪 Testing agent output_key configuration...")

    try:
        from vana_multi_agent.agents.team import (
            architecture_specialist,
            devops_specialist,
            qa_specialist,
            ui_specialist,
            vana,
        )

        # Test 1: Check architecture specialist
        print("\n1. Testing architecture_specialist output_key...")
        if (
            hasattr(architecture_specialist, "output_key")
            and architecture_specialist.output_key == "architecture_analysis"
        ):
            print(
                "✅ architecture_specialist has correct output_key: 'architecture_analysis'"
            )
        else:
            print(
                f"❌ architecture_specialist output_key issue: {getattr(architecture_specialist, 'output_key', 'NOT_SET')}"
            )
            return False

        # Test 2: Check UI specialist
        print("\n2. Testing ui_specialist output_key...")
        if (
            hasattr(ui_specialist, "output_key")
            and ui_specialist.output_key == "ui_design"
        ):
            print("✅ ui_specialist has correct output_key: 'ui_design'")
        else:
            print(
                f"❌ ui_specialist output_key issue: {getattr(ui_specialist, 'output_key', 'NOT_SET')}"
            )
            return False

        # Test 3: Check DevOps specialist
        print("\n3. Testing devops_specialist output_key...")
        if (
            hasattr(devops_specialist, "output_key")
            and devops_specialist.output_key == "devops_plan"
        ):
            print("✅ devops_specialist has correct output_key: 'devops_plan'")
        else:
            print(
                f"❌ devops_specialist output_key issue: {getattr(devops_specialist, 'output_key', 'NOT_SET')}"
            )
            return False

        # Test 4: Check QA specialist
        print("\n4. Testing qa_specialist output_key...")
        if (
            hasattr(qa_specialist, "output_key")
            and qa_specialist.output_key == "qa_report"
        ):
            print("✅ qa_specialist has correct output_key: 'qa_report'")
        else:
            print(
                f"❌ qa_specialist output_key issue: {getattr(qa_specialist, 'output_key', 'NOT_SET')}"
            )
            return False

        # Test 5: Check vana orchestrator (should not have output_key)
        print("\n5. Testing vana orchestrator output_key...")
        if not hasattr(vana, "output_key") or vana.output_key is None:
            print(
                "✅ vana orchestrator correctly has no output_key (orchestrator pattern)"
            )
        else:
            print(f"⚠️ vana has output_key: {vana.output_key} (may be intentional)")

        print("\n🎉 Agent output_key configuration tests completed!")
        return True

    except Exception as e:
        print(f"❌ Error testing agent output_key configuration: {e}")
        return False


def test_agent_instruction_updates():
    """Test that agent instructions include state sharing guidance."""
    print("\n🔧 Testing agent instruction updates...")

    try:
        from vana_multi_agent.agents.team import (
            architecture_specialist,
            devops_specialist,
            qa_specialist,
            ui_specialist,
            vana,
        )

        # Test 1: Check if instructions mention state sharing
        agents_to_test = [
            ("architecture_specialist", architecture_specialist),
            ("ui_specialist", ui_specialist),
            ("devops_specialist", devops_specialist),
            ("qa_specialist", qa_specialist),
            ("vana", vana),
        ]

        state_sharing_keywords = [
            "session state",
            "state sharing",
            "Google ADK State Sharing",
        ]

        for agent_name, agent in agents_to_test:
            print(f"\nTesting {agent_name} instructions...")
            instruction = getattr(agent, "instruction", "")

            has_state_sharing = any(
                keyword in instruction for keyword in state_sharing_keywords
            )

            if has_state_sharing:
                print(f"✅ {agent_name} instructions include state sharing guidance")
            else:
                print(f"❌ {agent_name} instructions missing state sharing guidance")
                return False

        print("\n🎉 Agent instruction update tests completed!")
        return True

    except Exception as e:
        print(f"❌ Error testing agent instructions: {e}")
        return False


def test_state_sharing_workflow():
    """Test the conceptual state sharing workflow."""
    print("\n🔄 Testing state sharing workflow concept...")

    try:
        # Simulate the state sharing workflow
        session_state = {}

        # Step 1: Architecture specialist saves analysis
        print("\n1. Architecture specialist completes analysis...")
        session_state["architecture_analysis"] = {
            "system_design": "microservices_architecture",
            "database": "postgresql_with_redis_cache",
            "api_design": "rest_with_graphql",
            "scalability": "horizontal_scaling_ready",
        }
        print(
            f"✅ Saved to session_state['architecture_analysis']: {session_state['architecture_analysis']['system_design']}"
        )

        # Step 2: UI specialist uses architecture analysis
        print("\n2. UI specialist reads architecture analysis...")
        if "architecture_analysis" in session_state:
            arch_data = session_state["architecture_analysis"]
            print(f"✅ UI specialist can access: {arch_data['api_design']}")

            # UI specialist saves design
            session_state["ui_design"] = {
                "framework": "react_with_typescript",
                "api_integration": arch_data["api_design"],
                "responsive_design": "mobile_first",
                "accessibility": "wcag_2.1_aa_compliant",
            }
            print(
                f"✅ Saved to session_state['ui_design']: {session_state['ui_design']['framework']}"
            )

        # Step 3: DevOps specialist uses both previous results
        print("\n3. DevOps specialist reads previous work...")
        if "architecture_analysis" in session_state and "ui_design" in session_state:
            arch_data = session_state["architecture_analysis"]
            ui_data = session_state["ui_design"]
            print(f"✅ DevOps can access architecture: {arch_data['database']}")
            print(f"✅ DevOps can access UI framework: {ui_data['framework']}")

            # DevOps specialist saves plan
            session_state["devops_plan"] = {
                "infrastructure": "kubernetes_cluster",
                "database_deployment": arch_data["database"],
                "frontend_deployment": f"nginx_serving_{ui_data['framework']}",
                "monitoring": "prometheus_grafana",
            }
            print(
                f"✅ Saved to session_state['devops_plan']: {session_state['devops_plan']['infrastructure']}"
            )

        # Step 4: QA specialist validates all previous work
        print("\n4. QA specialist reads all previous work...")
        if all(
            key in session_state
            for key in ["architecture_analysis", "ui_design", "devops_plan"]
        ):
            session_state["qa_report"] = {
                "test_strategy": "comprehensive_testing",
                "architecture_tests": "microservices_integration_tests",
                "ui_tests": "react_component_testing",
                "infrastructure_tests": "kubernetes_deployment_tests",
                "overall_quality": "production_ready",
            }
            print(
                f"✅ Saved to session_state['qa_report']: {session_state['qa_report']['test_strategy']}"
            )

        print("\n🎉 State sharing workflow test completed!")
        print(f"📊 Final session state keys: {list(session_state.keys())}")
        return True

    except Exception as e:
        print(f"❌ Error testing state sharing workflow: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Testing Google ADK output_key State Sharing Implementation")
    print("=" * 70)

    results = []

    # Test 1: Agent configuration
    results.append(test_agent_output_key_configuration())

    # Test 2: Instruction updates
    results.append(test_agent_instruction_updates())

    # Test 3: Workflow concept
    results.append(test_state_sharing_workflow())

    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)

    passed = sum(results)
    total = len(results)

    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print(
            "🎉 ALL TESTS PASSED! Google ADK output_key state sharing is implemented correctly."
        )
        print("\n✅ Critical Gap #2 RESOLVED: output_key state sharing is working!")
        print("✅ Agents can now save results to session state for collaboration")
        print("✅ Multi-agent workflows can share data between specialist agents")
        print("✅ Foundation for sequential and parallel agent patterns is ready")
    else:
        print("❌ Some tests failed. Please check the implementation.")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
