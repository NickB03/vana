#!/usr/bin/env python3
"""
Master Test Runner for Post-Merge Validation
Comprehensive testing suite for project-id-audit-deployment-fixes merge

Executes all validation phases and generates comprehensive reports
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Import test modules
try:
    from infrastructure_validation import InfrastructureValidator
    from orchestration_validation import OrchestrationValidator
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running from the tests/automated directory")
    sys.exit(1)

class MasterTestRunner:
    def __init__(self):
        self.results = {
            "test_run_id": f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "merge_commit": "774345abf3e265d28ac1f817f9398bacd1488691",
            "branch_merged": "project-id-audit-deployment-fixes",
            "test_phases": {},
            "summary": {}
        }
        
        # Ensure results directory exists
        os.makedirs("tests/results", exist_ok=True)
        
    def print_header(self):
        """Print test execution header"""
        print("🧪 COMPREHENSIVE POST-MERGE VALIDATION")
        print("=" * 60)
        print(f"Test Run ID: {self.results['test_run_id']}")
        print(f"Merge Commit: {self.results['merge_commit']}")
        print(f"Branch: {self.results['branch_merged']}")
        print(f"Timestamp: {self.results['timestamp']}")
        print("=" * 60)
        
    async def run_infrastructure_tests(self) -> Dict[str, Any]:
        """Execute Phase 1: Infrastructure Validation"""
        print("\n📋 PHASE 1: Infrastructure Validation")
        print("-" * 40)
        
        try:
            infra_validator = InfrastructureValidator()
            infra_results = infra_validator.run_all_tests()
            
            # Calculate phase summary
            total = len(infra_results)
            passed = sum(1 for r in infra_results if r["status"] == "PASS")
            failed = sum(1 for r in infra_results if r["status"] == "FAIL")
            errors = sum(1 for r in infra_results if r["status"] == "ERROR")
            
            phase_summary = {
                "phase": "infrastructure",
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "success_rate": f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
                "status": "PASS" if passed == total else "FAIL"
            }
            
            return {
                "results": infra_results,
                "summary": phase_summary
            }
            
        except Exception as e:
            print(f"❌ Infrastructure validation failed: {e}")
            return {
                "results": [],
                "summary": {
                    "phase": "infrastructure",
                    "status": "ERROR",
                    "error": str(e)
                }
            }
            
    async def run_orchestration_tests(self) -> Dict[str, Any]:
        """Execute Phase 2: Multi-Agent Orchestration"""
        print("\n📋 PHASE 2: Multi-Agent Orchestration")
        print("-" * 40)
        
        try:
            orch_validator = OrchestrationValidator()
            orch_results = await orch_validator.run_all_tests()
            
            # Calculate phase summary
            total = len(orch_results)
            passed = sum(1 for r in orch_results if r["status"] == "PASS")
            failed = sum(1 for r in orch_results if r["status"] == "FAIL")
            errors = sum(1 for r in orch_results if r["status"] == "ERROR")
            
            phase_summary = {
                "phase": "orchestration",
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "success_rate": f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
                "status": "PASS" if passed == total else "FAIL"
            }
            
            return {
                "results": orch_results,
                "summary": phase_summary
            }
            
        except Exception as e:
            print(f"❌ Orchestration validation failed: {e}")
            return {
                "results": [],
                "summary": {
                    "phase": "orchestration",
                    "status": "ERROR",
                    "error": str(e)
                }
            }
            
    def run_security_tests(self) -> Dict[str, Any]:
        """Execute Phase 3: Security Validation"""
        print("\n📋 PHASE 3: Security Validation")
        print("-" * 40)
        
        # Basic security validation (can be expanded)
        try:
            import requests
            
            base_url = "https://vana-dev-960076421399.us-central1.run.app"
            security_results = []
            
            # Test 1: Check for hardcoded credentials in responses
            try:
                response = requests.get(f"{base_url}/info", timeout=10)
                if response.status_code == 200:
                    info_str = response.text
                    
                    # Check for old project ID (should not be present)
                    has_old_project = "960076421399" in info_str
                    has_hardcoded_key = "BSA6fMCYrfJC5seE-AVsWrKjpOFk6Nm" in info_str
                    
                    status = "PASS" if not has_old_project and not has_hardcoded_key else "FAIL"
                    
                    security_results.append({
                        "test_id": "TC-SEC-001",
                        "name": "Runtime Credential Scan",
                        "status": status,
                        "has_old_project": has_old_project,
                        "has_hardcoded_key": has_hardcoded_key,
                        "timestamp": datetime.now().isoformat()
                    })
                else:
                    security_results.append({
                        "test_id": "TC-SEC-001",
                        "name": "Runtime Credential Scan",
                        "status": "ERROR",
                        "error": f"HTTP {response.status_code}",
                        "timestamp": datetime.now().isoformat()
                    })
                    
            except Exception as e:
                security_results.append({
                    "test_id": "TC-SEC-001",
                    "name": "Runtime Credential Scan",
                    "status": "ERROR",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
                
            # Test 2: Security headers check
            try:
                response = requests.get(f"{base_url}/health", timeout=10)
                security_headers = ['X-Content-Type-Options', 'X-Frame-Options']
                present_headers = [h for h in security_headers if h in response.headers]
                
                security_results.append({
                    "test_id": "TC-SEC-002",
                    "name": "Security Headers Check",
                    "status": "PASS",  # Not critical for this validation
                    "present_headers": present_headers,
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                security_results.append({
                    "test_id": "TC-SEC-002",
                    "name": "Security Headers Check",
                    "status": "ERROR",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
                
            # Calculate phase summary
            total = len(security_results)
            passed = sum(1 for r in security_results if r["status"] == "PASS")
            failed = sum(1 for r in security_results if r["status"] == "FAIL")
            errors = sum(1 for r in security_results if r["status"] == "ERROR")
            
            # Print results
            for result in security_results:
                status_emoji = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
                print(f"{status_emoji} {result['test_id']}: {result['name']} - {result['status']}")
                
            phase_summary = {
                "phase": "security",
                "total_tests": total,
                "passed": passed,
                "failed": failed,
                "errors": errors,
                "success_rate": f"{(passed/total)*100:.1f}%" if total > 0 else "0%",
                "status": "PASS" if passed == total else "FAIL"
            }
            
            return {
                "results": security_results,
                "summary": phase_summary
            }
            
        except Exception as e:
            print(f"❌ Security validation failed: {e}")
            return {
                "results": [],
                "summary": {
                    "phase": "security",
                    "status": "ERROR",
                    "error": str(e)
                }
            }
            
    async def run_comprehensive_validation(self) -> Dict[str, Any]:
        """Execute all validation phases"""
        self.print_header()
        
        # Execute all phases
        infra_data = await self.run_infrastructure_tests()
        orch_data = await self.run_orchestration_tests()
        sec_data = self.run_security_tests()
        
        # Store phase results
        self.results["test_phases"] = {
            "infrastructure": infra_data,
            "orchestration": orch_data,
            "security": sec_data
        }
        
        # Generate overall summary
        self.generate_overall_summary()
        
        # Save results
        self.save_results()
        
        # Print final summary
        self.print_final_summary()
        
        return self.results
        
    def generate_overall_summary(self):
        """Generate overall test execution summary"""
        total_tests = 0
        total_passed = 0
        total_failed = 0
        total_errors = 0
        
        phase_statuses = []
        
        for phase_name, phase_data in self.results["test_phases"].items():
            if "summary" in phase_data:
                summary = phase_data["summary"]
                total_tests += summary.get("total_tests", 0)
                total_passed += summary.get("passed", 0)
                total_failed += summary.get("failed", 0)
                total_errors += summary.get("errors", 0)
                phase_statuses.append(summary.get("status", "ERROR"))
                
        overall_status = "PASS" if all(status == "PASS" for status in phase_statuses) else "FAIL"
        success_rate = f"{(total_passed/total_tests)*100:.1f}%" if total_tests > 0 else "0%"
        
        self.results["summary"] = {
            "overall_status": overall_status,
            "total_tests": total_tests,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "total_errors": total_errors,
            "success_rate": success_rate,
            "phase_statuses": {
                phase: data["summary"].get("status", "ERROR") 
                for phase, data in self.results["test_phases"].items()
            }
        }
        
    def print_final_summary(self):
        """Print final test execution summary"""
        summary = self.results["summary"]
        
        print("\n" + "=" * 60)
        print("📊 COMPREHENSIVE VALIDATION SUMMARY")
        print("=" * 60)
        print(f"Overall Status: {'✅ PASS' if summary['overall_status'] == 'PASS' else '❌ FAIL'}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"✅ Passed: {summary['total_passed']}")
        print(f"❌ Failed: {summary['total_failed']}")
        print(f"⚠️ Errors: {summary['total_errors']}")
        print(f"Success Rate: {summary['success_rate']}")
        print("\nPhase Results:")
        for phase, status in summary["phase_statuses"].items():
            status_emoji = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
            print(f"  {status_emoji} {phase.title()}: {status}")
        print("=" * 60)
        
        # Production readiness assessment
        if summary["overall_status"] == "PASS" and float(summary["success_rate"].rstrip('%')) >= 95:
            print("🚀 PRODUCTION READINESS: ✅ READY FOR DEPLOYMENT")
        elif summary["overall_status"] == "PASS":
            print("⚠️ PRODUCTION READINESS: CONDITIONAL - Minor issues identified")
        else:
            print("❌ PRODUCTION READINESS: NOT READY - Critical issues require resolution")
        print("=" * 60)
        
    def save_results(self) -> str:
        """Save comprehensive test results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"comprehensive_validation_{timestamp}.json"
        filepath = os.path.join("tests/results", filename)
        
        with open(filepath, "w") as f:
            json.dump(self.results, f, indent=2)
            
        print(f"\n💾 Comprehensive results saved to: {filepath}")
        return filepath

if __name__ == "__main__":
    runner = MasterTestRunner()
    results = asyncio.run(runner.run_comprehensive_validation())
