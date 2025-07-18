#!/usr/bin/env python3
"""
ADK Coordination Integration Test Suite
Tests real agent workflows with ADK coordination enabled
"""

import os
import sys
import json
import asyncio
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load development environment
from dotenv import load_dotenv
load_dotenv('.env.development')

async def test_specialist_coordination():
    """Test coordination with different specialist agents."""
    from lib._tools.real_coordination_tools import real_delegate_to_agent
    
    test_cases = [
        {
            "agent": "architecture_specialist",
            "task": "Analyze the project structure and identify key components",
            "context": "Testing ADK coordination for architecture analysis"
        },
        {
            "agent": "data_science_specialist", 
            "task": "Calculate basic statistics for the test dataset",
            "context": "Testing ADK coordination for data analysis"
        },
        {
            "agent": "security_specialist",
            "task": "Perform a basic security audit of the configuration",
            "context": "Testing ADK coordination for security scanning"
        },
        {
            "agent": "devops_specialist",
            "task": "Check deployment configuration and CI/CD setup",
            "context": "Testing ADK coordination for DevOps tasks"
        },
        {
            "agent": "qa_specialist",
            "task": "Generate test coverage report for the project",
            "context": "Testing ADK coordination for QA operations"
        }
    ]
    
    results = []
    
    print("🧪 Running Specialist Coordination Tests...\n")
    
    for i, test in enumerate(test_cases, 1):
        print(f"Test {i}/{len(test_cases)}: {test['agent']}")
        
        try:
            # Call coordination function
            result = real_delegate_to_agent(
                agent_name=test['agent'],
                task=test['task'],
                context=test['context']
            )
            
            # Parse result
            result_data = json.loads(result)
            
            # Check for ADK method
            method = result_data.get('transfer_result', {}).get('method', '')
            is_adk = 'ADK' in method
            
            test_result = {
                "test_number": i,
                "agent": test['agent'],
                "status": result_data.get('status'),
                "method": method,
                "is_adk": is_adk,
                "passed": result_data.get('status') == 'success' and is_adk
            }
            
            results.append(test_result)
            
            if test_result['passed']:
                print(f"  ✅ PASSED - ADK coordination successful")
            else:
                print(f"  ❌ FAILED - Status: {test_result['status']}, Method: {test_result['method']}")
                
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            results.append({
                "test_number": i,
                "agent": test['agent'],
                "status": "error",
                "error": str(e),
                "passed": False
            })
        
        print()
    
    return results

async def test_concurrent_coordination():
    """Test concurrent coordination requests."""
    from lib._tools.real_coordination_tools import real_delegate_to_agent
    
    print("🧪 Running Concurrent Coordination Test...\n")
    
    # Create multiple concurrent tasks
    tasks = []
    agents = ["architecture_specialist", "data_science_specialist", "security_specialist"]
    
    for agent in agents:
        task = asyncio.create_task(asyncio.to_thread(
            real_delegate_to_agent,
            agent_name=agent,
            task=f"Concurrent test task for {agent}",
            context="Testing concurrent ADK coordination"
        ))
        tasks.append(task)
    
    # Wait for all tasks
    results = await asyncio.gather(*tasks)
    
    # Check results
    all_successful = True
    for i, (agent, result) in enumerate(zip(agents, results)):
        result_data = json.loads(result)
        is_success = result_data.get('status') == 'success'
        is_adk = 'ADK' in result_data.get('transfer_result', {}).get('method', '')
        
        if is_success and is_adk:
            print(f"  ✅ {agent}: Concurrent coordination successful")
        else:
            print(f"  ❌ {agent}: Failed - Status: {result_data.get('status')}")
            all_successful = False
    
    return all_successful

async def test_error_handling():
    """Test error handling in ADK coordination."""
    from lib._tools.real_coordination_tools import real_delegate_to_agent
    
    print("\n🧪 Running Error Handling Test...\n")
    
    # Test with invalid agent name
    try:
        result = real_delegate_to_agent(
            agent_name="non_existent_specialist",
            task="This should fail gracefully",
            context="Testing error handling"
        )
        
        result_data = json.loads(result)
        
        # Should still return valid JSON with error status
        if result_data.get('status') == 'error':
            print("  ✅ Invalid agent handled gracefully")
            return True
        else:
            print("  ❌ Error not properly handled")
            return False
            
    except Exception as e:
        print(f"  ❌ Unexpected error: {e}")
        return False

async def run_integration_tests():
    """Run all integration tests."""
    print("=" * 60)
    print("🚀 ADK Coordination Integration Test Suite")
    print("=" * 60)
    print(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
    print(f"USE_ADK_COORDINATION: {os.getenv('USE_ADK_COORDINATION', 'false')}")
    print("=" * 60)
    
    # Run test suites
    specialist_results = await test_specialist_coordination()
    concurrent_success = await test_concurrent_coordination()
    error_handling_success = await test_error_handling()
    
    # Generate summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    # Specialist tests
    passed = sum(1 for r in specialist_results if r['passed'])
    total = len(specialist_results)
    print(f"\n✅ Specialist Coordination: {passed}/{total} passed")
    
    # Concurrent test
    print(f"✅ Concurrent Coordination: {'PASSED' if concurrent_success else 'FAILED'}")
    
    # Error handling
    print(f"✅ Error Handling: {'PASSED' if error_handling_success else 'FAILED'}")
    
    # Overall result
    all_passed = (
        passed == total and 
        concurrent_success and 
        error_handling_success
    )
    
    # Save test report
    report = {
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "feature_flags": {
            "USE_ADK_COORDINATION": os.getenv("USE_ADK_COORDINATION", "false"),
            "USE_OFFICIAL_AGENT_TOOL": os.getenv("USE_OFFICIAL_AGENT_TOOL", "false")
        },
        "test_results": {
            "specialist_tests": specialist_results,
            "concurrent_test": concurrent_success,
            "error_handling_test": error_handling_success,
            "overall_passed": all_passed
        }
    }
    
    report_path = ".development/reports/adk-integration-test-results.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Test report saved to: {report_path}")
    
    if all_passed:
        print("\n🎉 All integration tests PASSED!")
        print("✅ ADK coordination is working correctly in development")
        return 0
    else:
        print("\n❌ Some integration tests FAILED!")
        print("🔧 Please review the failures before proceeding")
        return 1

def main():
    """Main entry point."""
    return asyncio.run(run_integration_tests())

if __name__ == "__main__":
    sys.exit(main())