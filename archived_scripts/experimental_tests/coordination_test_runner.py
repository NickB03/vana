#!/usr/bin/env python3
"""
Coordination Test Runner for VANA
Comprehensive test execution and reporting for coordination functionality

This runner executes all coordination tests and generates detailed reports
with success rate tracking and performance metrics.
"""

import asyncio
import json
import time
import sys
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from tests.coordination.test_coordination_framework import (
    CoordinationTestFramework, TestCoordinationTools, 
    TestWorkflowManagement, TestIntelligentTaskAnalysis, TestVANAOrchestration
)

class CoordinationTestRunner:
    """Comprehensive coordination test runner"""
    
    def __init__(self):
        self.framework = CoordinationTestFramework()
        self.test_results = {}
        self.start_time = None
        self.end_time = None
    
    async def run_all_coordination_tests(self) -> Dict[str, Any]:
        """Run all coordination tests and generate comprehensive report"""
        print("🧪 Starting Comprehensive Coordination Testing")
        print("=" * 60)
        
        self.start_time = time.time()
        self.framework.start_time = self.start_time
        
        # Run test suites
        await self._run_coordination_tools_tests()
        await self._run_workflow_management_tests()
        await self._run_intelligent_task_analysis_tests()
        await self._run_vana_orchestration_tests()
        
        self.end_time = time.time()
        self.framework.end_time = self.end_time
        
        # Generate comprehensive report
        report = self._generate_comprehensive_report()
        
        # Save report
        await self._save_report(report)
        
        # Print summary
        self._print_summary(report)
        
        return report
    
    async def _run_coordination_tools_tests(self):
        """Run coordination tools tests (Task #5)"""
        print("\n🔧 Testing Coordination Tools (Task #5)")
        print("-" * 40)
        
        test_suite = TestCoordinationTools()
        test_suite.framework = self.framework
        
        tests = [
            ("coordinate_task_basic", test_suite.test_coordinate_task_basic),
            ("delegate_data_science", test_suite.test_delegate_to_agent_data_science),
            ("delegate_code_execution", test_suite.test_delegate_to_agent_code_execution),
            ("get_agent_status", test_suite.test_get_agent_status)
        ]
        
        for test_name, test_func in tests:
            try:
                print(f"  Running {test_name}...")
                await test_func(self.framework)
                print(f"  ✅ {test_name} completed")
            except Exception as e:
                print(f"  ❌ {test_name} failed: {str(e)}")
    
    async def _run_workflow_management_tests(self):
        """Run workflow management tests (Task #8)"""
        print("\n🔄 Testing Workflow Management (Task #8)")
        print("-" * 40)
        
        test_suite = TestWorkflowManagement()
        test_suite.framework = self.framework
        
        tests = [
            ("get_workflow_templates", test_suite.test_get_workflow_templates),
            ("create_workflow_data_analysis", test_suite.test_create_workflow_data_analysis),
            ("create_workflow_code_execution", test_suite.test_create_workflow_code_execution),
            ("list_workflows", test_suite.test_list_workflows),
            ("workflow_status_monitoring", test_suite.test_workflow_status_monitoring)
        ]
        
        for test_name, test_func in tests:
            try:
                print(f"  Running {test_name}...")
                await test_func(self.framework)
                print(f"  ✅ {test_name} completed")
            except Exception as e:
                print(f"  ❌ {test_name} failed: {str(e)}")
    
    async def _run_intelligent_task_analysis_tests(self):
        """Run intelligent task analysis tests (Task #7)"""
        print("\n🧠 Testing Intelligent Task Analysis (Task #7)")
        print("-" * 40)
        
        test_suite = TestIntelligentTaskAnalysis()
        test_suite.framework = self.framework
        
        tests = [
            ("code_task_routing", test_suite.test_code_task_routing),
            ("data_analysis_routing", test_suite.test_data_analysis_task_routing),
            ("complex_task_decomposition", test_suite.test_complex_task_decomposition)
        ]
        
        for test_name, test_func in tests:
            try:
                print(f"  Running {test_name}...")
                await test_func(self.framework)
                print(f"  ✅ {test_name} completed")
            except Exception as e:
                print(f"  ❌ {test_name} failed: {str(e)}")
    
    async def _run_vana_orchestration_tests(self):
        """Run VANA orchestration tests (Task #6)"""
        print("\n🎯 Testing VANA Orchestration (Task #6)")
        print("-" * 40)
        
        test_suite = TestVANAOrchestration()
        test_suite.framework = self.framework
        
        tests = [
            ("vana_delegation_code", test_suite.test_proactive_delegation_code),
            ("vana_delegation_data", test_suite.test_proactive_delegation_data),
            ("fallback_mechanisms", test_suite.test_fallback_mechanisms)
        ]
        
        for test_name, test_func in tests:
            try:
                print(f"  Running {test_name}...")
                await test_func(self.framework)
                print(f"  ✅ {test_name} completed")
            except Exception as e:
                print(f"  ❌ {test_name} failed: {str(e)}")
    
    def _generate_comprehensive_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        base_report = self.framework.generate_report()
        
        # Add additional analysis
        metrics = self.framework.calculate_metrics()
        
        # Categorize results by test type
        coordination_tests = [r for r in self.framework.results if "coordinate" in r.test_name or "delegate" in r.test_name or "status" in r.test_name]
        workflow_tests = [r for r in self.framework.results if "workflow" in r.test_name]
        analysis_tests = [r for r in self.framework.results if "routing" in r.test_name or "decomposition" in r.test_name]
        orchestration_tests = [r for r in self.framework.results if "vana" in r.test_name or "fallback" in r.test_name]
        
        enhanced_report = {
            **base_report,
            "test_categories": {
                "coordination_tools": {
                    "count": len(coordination_tests),
                    "success_rate": sum(1 for r in coordination_tests if r.success) / len(coordination_tests) if coordination_tests else 0,
                    "avg_response_time": sum(r.execution_time for r in coordination_tests) / len(coordination_tests) if coordination_tests else 0
                },
                "workflow_management": {
                    "count": len(workflow_tests),
                    "success_rate": sum(1 for r in workflow_tests if r.success) / len(workflow_tests) if workflow_tests else 0,
                    "avg_response_time": sum(r.execution_time for r in workflow_tests) / len(workflow_tests) if workflow_tests else 0
                },
                "task_analysis": {
                    "count": len(analysis_tests),
                    "success_rate": sum(1 for r in analysis_tests if r.success) / len(analysis_tests) if analysis_tests else 0,
                    "avg_response_time": sum(r.execution_time for r in analysis_tests) / len(analysis_tests) if analysis_tests else 0
                },
                "vana_orchestration": {
                    "count": len(orchestration_tests),
                    "success_rate": sum(1 for r in orchestration_tests if r.success) / len(orchestration_tests) if orchestration_tests else 0,
                    "avg_response_time": sum(r.execution_time for r in orchestration_tests) / len(orchestration_tests) if orchestration_tests else 0
                }
            },
            "task_completion_status": {
                "task_5_coordination_tools": metrics.success_rate >= 0.90,
                "task_6_vana_orchestration": sum(1 for r in orchestration_tests if r.success) / len(orchestration_tests) >= 0.90 if orchestration_tests else False,
                "task_7_task_analysis": sum(1 for r in analysis_tests if r.success) / len(analysis_tests) >= 0.90 if analysis_tests else False,
                "task_8_workflow_management": sum(1 for r in workflow_tests if r.success) / len(workflow_tests) >= 0.90 if workflow_tests else False
            }
        }
        
        return enhanced_report
    
    async def _save_report(self, report: Dict[str, Any]):
        """Save test report to file"""
        results_dir = Path("tests/results")
        results_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"coordination_test_results_{timestamp}.json"
        filepath = results_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📊 Test report saved to: {filepath}")
    
    def _print_summary(self, report: Dict[str, Any]):
        """Print test summary"""
        metrics = report["metrics"]
        categories = report["test_categories"]
        
        print("\n" + "=" * 60)
        print("🎯 COORDINATION TESTING SUMMARY")
        print("=" * 60)
        
        print(f"📊 Overall Results:")
        print(f"   Total Tests: {metrics['total_tests']}")
        print(f"   Success Rate: {metrics['success_rate']:.1%}")
        print(f"   Average Response Time: {metrics['average_response_time']:.2f}s")
        print(f"   Target Achieved: {'✅ YES' if report['target_achieved'] else '❌ NO'}")
        
        print(f"\n📋 Category Breakdown:")
        for category, data in categories.items():
            print(f"   {category.replace('_', ' ').title()}: {data['success_rate']:.1%} ({data['count']} tests)")
        
        if report["recommendations"]:
            print(f"\n💡 Recommendations:")
            for rec in report["recommendations"]:
                print(f"   • {rec}")

async def main():
    """Main entry point"""
    runner = CoordinationTestRunner()
    report = await runner.run_all_coordination_tests()
    
    # Return exit code based on success rate
    success_rate = report["metrics"]["success_rate"]
    return 0 if success_rate >= 0.90 else 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
