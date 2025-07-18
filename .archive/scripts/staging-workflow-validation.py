#!/usr/bin/env python3
"""
Multi-Agent Workflow Validation
Week 2: Test complex multi-agent coordination scenarios
"""

import os
import sys
import json
import asyncio
import time
from datetime import datetime
from typing import List, Dict, Any

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load staging environment
from dotenv import load_dotenv
load_dotenv('.env.staging')

class WorkflowValidator:
    """Validate multi-agent workflow scenarios."""
    
    def __init__(self):
        self.results = {
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "timestamp": datetime.now().isoformat(),
            "workflows": {},
            "summary": {
                "total": 0,
                "passed": 0,
                "failed": 0
            }
        }
    
    def record_workflow(self, workflow_name: str, passed: bool, details: Dict = None):
        """Record workflow test result."""
        self.results["workflows"][workflow_name] = {
            "passed": passed,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.results["summary"]["total"] += 1
        if passed:
            self.results["summary"]["passed"] += 1
        else:
            self.results["summary"]["failed"] += 1
    
    async def test_sequential_workflow(self) -> bool:
        """Test sequential agent coordination workflow."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🔄 Testing Sequential Workflow...")
        print("  Scenario: Code Review → Security Scan → Deployment Check")
        
        workflow_steps = [
            {
                "agent": "architecture_specialist",
                "task": "Review the proposed code changes for architectural consistency",
                "context": "New feature implementation PR #123"
            },
            {
                "agent": "security_specialist",
                "task": "Scan the code changes for security vulnerabilities",
                "context": "Following architecture review approval"
            },
            {
                "agent": "devops_specialist",
                "task": "Validate deployment configuration for the changes",
                "context": "After security clearance"
            }
        ]
        
        workflow_result = {
            "steps": [],
            "total_time_ms": 0,
            "success": True
        }
        
        start_time = time.perf_counter()
        previous_result = None
        
        for i, step in enumerate(workflow_steps, 1):
            print(f"  Step {i}: {step['agent']}")
            step_start = time.perf_counter()
            
            # Include previous step result in context
            if previous_result:
                step["context"] += f"\nPrevious step result: {previous_result}"
            
            try:
                result = real_delegate_to_agent(
                    agent_name=step["agent"],
                    task=step["task"],
                    context=step["context"]
                )
                
                result_data = json.loads(result)
                step_time = (time.perf_counter() - step_start) * 1000
                
                step_result = {
                    "agent": step["agent"],
                    "status": result_data.get("status"),
                    "time_ms": step_time,
                    "success": result_data.get("status") == "success"
                }
                
                workflow_result["steps"].append(step_result)
                
                if not step_result["success"]:
                    workflow_result["success"] = False
                    print(f"    ❌ Failed: {result_data.get('error', 'Unknown error')}")
                    break
                else:
                    print(f"    ✅ Success ({step_time:.2f}ms)")
                    previous_result = f"{step['agent']} completed successfully"
                    
            except Exception as e:
                workflow_result["success"] = False
                workflow_result["steps"].append({
                    "agent": step["agent"],
                    "status": "error",
                    "error": str(e),
                    "success": False
                })
                print(f"    ❌ Error: {e}")
                break
        
        workflow_result["total_time_ms"] = (time.perf_counter() - start_time) * 1000
        
        self.record_workflow("sequential_workflow", workflow_result["success"], workflow_result)
        return workflow_result["success"]
    
    async def test_parallel_workflow(self) -> bool:
        """Test parallel agent coordination workflow."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n⚡ Testing Parallel Workflow...")
        print("  Scenario: Simultaneous analysis by multiple specialists")
        
        parallel_tasks = [
            {
                "agent": "architecture_specialist",
                "task": "Analyze system architecture impact",
                "context": "Feature request: Add real-time notifications"
            },
            {
                "agent": "data_science_specialist",
                "task": "Estimate data volume and processing requirements",
                "context": "Feature request: Add real-time notifications"
            },
            {
                "agent": "security_specialist",
                "task": "Assess security implications",
                "context": "Feature request: Add real-time notifications"
            },
            {
                "agent": "ui_ux_specialist",
                "task": "Design notification UI components",
                "context": "Feature request: Add real-time notifications"
            }
        ]
        
        workflow_result = {
            "tasks": [],
            "total_time_ms": 0,
            "success": True
        }
        
        async def execute_task(task_info: Dict) -> Dict:
            """Execute a single task asynchronously."""
            start_time = time.perf_counter()
            
            try:
                result = await asyncio.to_thread(
                    real_delegate_to_agent,
                    agent_name=task_info["agent"],
                    task=task_info["task"],
                    context=task_info["context"]
                )
                
                result_data = json.loads(result)
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                
                return {
                    "agent": task_info["agent"],
                    "status": result_data.get("status"),
                    "time_ms": elapsed_ms,
                    "success": result_data.get("status") == "success"
                }
                
            except Exception as e:
                return {
                    "agent": task_info["agent"],
                    "status": "error",
                    "error": str(e),
                    "time_ms": (time.perf_counter() - start_time) * 1000,
                    "success": False
                }
        
        print("  Launching parallel tasks...")
        start_time = time.perf_counter()
        
        # Execute all tasks in parallel
        task_results = await asyncio.gather(
            *[execute_task(task) for task in parallel_tasks]
        )
        
        workflow_result["total_time_ms"] = (time.perf_counter() - start_time) * 1000
        workflow_result["tasks"] = task_results
        
        # Check results
        for result in task_results:
            if result["success"]:
                print(f"  ✅ {result['agent']}: Success ({result['time_ms']:.2f}ms)")
            else:
                print(f"  ❌ {result['agent']}: Failed")
                workflow_result["success"] = False
        
        self.record_workflow("parallel_workflow", workflow_result["success"], workflow_result)
        return workflow_result["success"]
    
    async def test_conditional_workflow(self) -> bool:
        """Test conditional branching workflow."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🌳 Testing Conditional Workflow...")
        print("  Scenario: Security scan determines next steps")
        
        workflow_result = {
            "path_taken": [],
            "total_time_ms": 0,
            "success": True
        }
        
        start_time = time.perf_counter()
        
        # Step 1: Initial security scan
        print("  Step 1: Security scan")
        try:
            result = real_delegate_to_agent(
                agent_name="security_specialist",
                task="Perform initial security assessment",
                context="New API endpoint implementation"
            )
            
            result_data = json.loads(result)
            
            if result_data.get("status") == "success":
                print("    ✅ Security scan passed")
                workflow_result["path_taken"].append("security_pass")
                
                # Branch A: Proceed to deployment
                print("  Step 2A: Deployment validation")
                deploy_result = real_delegate_to_agent(
                    agent_name="devops_specialist",
                    task="Validate deployment configuration",
                    context="Security scan passed - ready for deployment"
                )
                
                deploy_data = json.loads(deploy_result)
                if deploy_data.get("status") == "success":
                    print("    ✅ Deployment validation passed")
                    workflow_result["path_taken"].append("deploy_ready")
                else:
                    print("    ❌ Deployment validation failed")
                    workflow_result["success"] = False
            else:
                print("    ⚠️  Security issues detected")
                workflow_result["path_taken"].append("security_fail")
                
                # Branch B: Architecture review needed
                print("  Step 2B: Architecture review")
                review_result = real_delegate_to_agent(
                    agent_name="architecture_specialist",
                    task="Review architecture for security improvements",
                    context="Security scan found issues - need architectural changes"
                )
                
                review_data = json.loads(review_result)
                if review_data.get("status") == "success":
                    print("    ✅ Architecture review completed")
                    workflow_result["path_taken"].append("architecture_reviewed")
                else:
                    print("    ❌ Architecture review failed")
                    workflow_result["success"] = False
                    
        except Exception as e:
            print(f"    ❌ Error: {e}")
            workflow_result["success"] = False
            workflow_result["error"] = str(e)
        
        workflow_result["total_time_ms"] = (time.perf_counter() - start_time) * 1000
        
        self.record_workflow("conditional_workflow", workflow_result["success"], workflow_result)
        return workflow_result["success"]
    
    async def test_error_recovery_workflow(self) -> bool:
        """Test workflow with error handling and recovery."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🛡️ Testing Error Recovery Workflow...")
        print("  Scenario: Graceful handling of agent failures")
        
        workflow_result = {
            "attempts": [],
            "recovery_successful": False,
            "total_time_ms": 0
        }
        
        start_time = time.perf_counter()
        
        # Attempt 1: Try with potentially failing agent
        print("  Attempt 1: Invalid agent")
        try:
            result = real_delegate_to_agent(
                agent_name="invalid_specialist",
                task="This should fail",
                context="Testing error recovery"
            )
            
            result_data = json.loads(result)
            
            if result_data.get("status") == "error":
                print("    ✅ Error correctly detected")
                workflow_result["attempts"].append({
                    "agent": "invalid_specialist",
                    "status": "error",
                    "handled": True
                })
                
                # Recovery: Use valid agent
                print("  Recovery: Using valid agent")
                recovery_result = real_delegate_to_agent(
                    agent_name="qa_specialist",
                    task="Perform validation after error recovery",
                    context="Recovering from previous agent failure"
                )
                
                recovery_data = json.loads(recovery_result)
                if recovery_data.get("status") == "success":
                    print("    ✅ Recovery successful")
                    workflow_result["recovery_successful"] = True
                    workflow_result["attempts"].append({
                        "agent": "qa_specialist",
                        "status": "success",
                        "recovered": True
                    })
            else:
                print("    ❌ Error not properly handled")
                workflow_result["recovery_successful"] = False
                
        except Exception as e:
            print(f"    ❌ Unexpected error: {e}")
            workflow_result["recovery_successful"] = False
        
        workflow_result["total_time_ms"] = (time.perf_counter() - start_time) * 1000
        
        self.record_workflow("error_recovery_workflow", workflow_result["recovery_successful"], workflow_result)
        return workflow_result["recovery_successful"]
    
    async def test_complex_orchestration(self) -> bool:
        """Test complex multi-stage orchestration."""
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        print("\n🎭 Testing Complex Orchestration...")
        print("  Scenario: Full feature development lifecycle")
        
        workflow_result = {
            "stages": [],
            "total_time_ms": 0,
            "success": True
        }
        
        start_time = time.perf_counter()
        
        # Stage 1: Planning (Parallel)
        print("  Stage 1: Planning (Parallel)")
        planning_tasks = await asyncio.gather(
            asyncio.to_thread(real_delegate_to_agent, "architecture_specialist", "Design system architecture", "New feature: User analytics dashboard"),
            asyncio.to_thread(real_delegate_to_agent, "ui_ux_specialist", "Create UI mockups", "New feature: User analytics dashboard"),
            asyncio.to_thread(real_delegate_to_agent, "data_science_specialist", "Define analytics metrics", "New feature: User analytics dashboard")
        )
        
        planning_success = all(json.loads(t).get("status") == "success" for t in planning_tasks)
        workflow_result["stages"].append({
            "stage": "planning",
            "type": "parallel",
            "success": planning_success
        })
        
        if planning_success:
            print("    ✅ Planning stage completed")
            
            # Stage 2: Implementation Review (Sequential)
            print("  Stage 2: Implementation Review (Sequential)")
            
            # Security review
            sec_result = real_delegate_to_agent(
                "security_specialist",
                "Review implementation plan for security",
                "Based on architecture and UI designs from planning stage"
            )
            
            if json.loads(sec_result).get("status") == "success":
                print("    ✅ Security review passed")
                
                # QA test planning
                qa_result = real_delegate_to_agent(
                    "qa_specialist",
                    "Create test plan for feature",
                    "Analytics dashboard feature with security considerations"
                )
                
                if json.loads(qa_result).get("status") == "success":
                    print("    ✅ QA planning completed")
                    
                    # Stage 3: Deployment prep
                    print("  Stage 3: Deployment Preparation")
                    deploy_result = real_delegate_to_agent(
                        "devops_specialist",
                        "Prepare deployment pipeline",
                        "Analytics dashboard ready for staging deployment"
                    )
                    
                    deploy_success = json.loads(deploy_result).get("status") == "success"
                    workflow_result["stages"].append({
                        "stage": "deployment_prep",
                        "type": "sequential",
                        "success": deploy_success
                    })
                    
                    if deploy_success:
                        print("    ✅ Deployment preparation completed")
                    else:
                        workflow_result["success"] = False
                else:
                    workflow_result["success"] = False
            else:
                workflow_result["success"] = False
        else:
            workflow_result["success"] = False
            print("    ❌ Planning stage failed")
        
        workflow_result["total_time_ms"] = (time.perf_counter() - start_time) * 1000
        
        self.record_workflow("complex_orchestration", workflow_result["success"], workflow_result)
        return workflow_result["success"]
    
    async def run_all_validations(self):
        """Run all workflow validations."""
        print("=" * 60)
        print("🚀 Multi-Agent Workflow Validation Suite")
        print("=" * 60)
        print(f"Environment: {os.getenv('ENVIRONMENT', 'unknown')}")
        print(f"ADK Coordination: {os.getenv('USE_ADK_COORDINATION', 'false')}")
        print("=" * 60)
        
        # Run all workflow tests
        await self.test_sequential_workflow()
        await self.test_parallel_workflow()
        await self.test_conditional_workflow()
        await self.test_error_recovery_workflow()
        await self.test_complex_orchestration()
        
        # Display summary
        print("\n" + "=" * 60)
        print("📊 Workflow Validation Summary")
        print("=" * 60)
        
        for workflow_name, result in self.results["workflows"].items():
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"{workflow_name}: {status}")
            
            if "total_time_ms" in result.get("details", {}):
                print(f"  Time: {result['details']['total_time_ms']:.2f}ms")
        
        print(f"\nTotal: {self.results['summary']['total']}")
        print(f"Passed: {self.results['summary']['passed']}")
        print(f"Failed: {self.results['summary']['failed']}")
        print(f"Success Rate: {(self.results['summary']['passed'] / self.results['summary']['total'] * 100):.1f}%")
        
        # Save results
        report_path = ".development/reports/staging-workflow-validation.json"
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Results saved to: {report_path}")
        
        # Return success if all workflows passed
        return self.results['summary']['failed'] == 0

async def main():
    """Main entry point."""
    validator = WorkflowValidator()
    success = await validator.run_all_validations()
    
    if success:
        print("\n✅ All workflow validations PASSED!")
        print("🎯 Multi-agent coordination working correctly")
        return 0
    else:
        print("\n❌ Some workflow validations FAILED!")
        print("🔧 Please review the failures")
        return 1

if __name__ == "__main__":
    sys.exit(asyncio.run(main()))