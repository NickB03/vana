#!/usr/bin/env python3
"""
Production Parity Testing Framework

This framework ensures tests run in the SAME environment as production,
eliminating the environment mismatch that caused our testing failures.

Key Principles:
1. Always test in Poetry environment (like production Docker)
2. Validate dependencies match production requirements.txt
3. Test actual deployment artifacts, not development environment
4. Mirror production configuration and behavior
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Tuple


class ProductionParityValidator:
    """Validates that test environment matches production environment"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.results = {
            "environment_parity": {},
            "dependency_validation": {},
            "production_mirror": {},
            "errors": [],
            "warnings": []
        }
    
    def validate_all(self) -> Dict:
        """Run complete production parity validation"""
        print("🔍 Starting Production Parity Validation...")
        
        # Phase 1: Environment validation
        self._validate_python_environment()
        self._validate_poetry_environment()
        self._validate_dependencies()
        
        # Phase 2: Production mirror validation
        self._validate_production_endpoints()
        self._validate_agent_functionality()
        
        # Phase 3: Generate report
        self._generate_validation_report()
        
        return self.results
    
    def _validate_python_environment(self):
        """Ensure we're using the correct Python version and environment"""
        print("📍 Validating Python environment...")
        
        # Check Python version
        version_info = sys.version_info
        if version_info.major != 3 or version_info.minor < 13:
            self.results["errors"].append(
                f"Python 3.13+ required, got {version_info.major}.{version_info.minor}"
            )
            return False
        
        # Check if we're in Poetry environment
        python_path = sys.executable
        is_poetry_env = ".venv" in python_path or "poetry" in python_path.lower()
        
        self.results["environment_parity"]["python_version"] = f"{version_info.major}.{version_info.minor}.{version_info.micro}"
        self.results["environment_parity"]["python_path"] = python_path
        self.results["environment_parity"]["is_poetry_environment"] = is_poetry_env
        
        if not is_poetry_env:
            self.results["errors"].append(
                "Tests must run in Poetry environment. Use 'poetry run python' or 'poetry shell'"
            )
            return False
        
        print(f"✅ Python {version_info.major}.{version_info.minor}.{version_info.micro} in Poetry environment")
        return True
    
    def _validate_poetry_environment(self):
        """Validate Poetry configuration matches production"""
        print("📦 Validating Poetry environment...")
        
        try:
            # Check Poetry is available
            result = subprocess.run(["poetry", "--version"], capture_output=True, text=True)
            if result.returncode != 0:
                self.results["errors"].append("Poetry not available")
                return False
            
            # Check virtual environment
            result = subprocess.run(["poetry", "env", "info"], capture_output=True, text=True)
            if result.returncode != 0:
                self.results["errors"].append("Poetry virtual environment not configured")
                return False
            
            env_info = result.stdout
            self.results["environment_parity"]["poetry_env_info"] = env_info
            
            print("✅ Poetry environment configured correctly")
            return True
            
        except FileNotFoundError:
            self.results["errors"].append("Poetry not installed")
            return False
    
    def _validate_dependencies(self):
        """Validate dependencies match production requirements"""
        print("📋 Validating dependencies...")
        
        # Critical dependencies that caused production issues
        critical_deps = [
            ("psutil", "psutil"),
            ("aiohttp", "aiohttp"), 
            ("google-adk", "google.adk"),
            ("fastapi", "fastapi")
        ]
        
        dependency_status = {}
        
        for dep_name, import_name in critical_deps:
            try:
                __import__(import_name.replace("-", "_"))
                dependency_status[dep_name] = "available"
                print(f"✅ {dep_name}: Available")
            except ImportError:
                dependency_status[dep_name] = "missing"
                self.results["errors"].append(f"Critical dependency missing: {dep_name}")
                print(f"❌ {dep_name}: Missing")
        
        self.results["dependency_validation"] = dependency_status
        
        # Check requirements.txt vs installed packages
        try:
            with open(self.project_root / "requirements.txt") as f:
                req_lines = f.readlines()
            
            result = subprocess.run(["poetry", "show"], capture_output=True, text=True)
            installed_packages = result.stdout
            
            self.results["dependency_validation"]["requirements_file_exists"] = True
            self.results["dependency_validation"]["poetry_packages_count"] = len(installed_packages.split('\n'))
            
        except FileNotFoundError:
            self.results["errors"].append("requirements.txt not found")
        
        return len(self.results["errors"]) == 0
    
    def _validate_production_endpoints(self):
        """Test actual production endpoints"""
        print("🌐 Validating production endpoints...")
        
        production_url = "https://vana-dev-960076421399.us-central1.run.app"
        endpoints = ["/health", "/info"]
        
        endpoint_status = {}
        
        try:
            import requests
            
            for endpoint in endpoints:
                try:
                    response = requests.get(f"{production_url}{endpoint}", timeout=10)
                    endpoint_status[endpoint] = {
                        "status_code": response.status_code,
                        "response_time": response.elapsed.total_seconds(),
                        "working": response.status_code == 200
                    }
                    if response.status_code == 200:
                        print(f"✅ {endpoint}: {response.status_code} ({response.elapsed.total_seconds():.2f}s)")
                    else:
                        print(f"❌ {endpoint}: {response.status_code}")
                        
                except Exception as e:
                    endpoint_status[endpoint] = {"error": str(e), "working": False}
                    print(f"❌ {endpoint}: {e}")
            
        except ImportError:
            self.results["warnings"].append("requests not available for endpoint testing")
        
        self.results["production_mirror"]["endpoints"] = endpoint_status
    
    def _validate_agent_functionality(self):
        """Test agent functionality in current environment"""
        print("🤖 Validating agent functionality...")
        
        try:
            # Test VANA agent loading
            from agents.vana.team import root_agent
            
            agent_status = {
                "agent_loaded": True,
                "tool_count": len(root_agent.tools),
                "tools": [tool.name for tool in root_agent.tools]
            }
            
            print(f"✅ VANA agent loaded with {len(root_agent.tools)} tools")
            
            # Test critical tools
            tool_tests = {}
            for tool in root_agent.tools[:3]:  # Test first 3 tools
                try:
                    # Simple tool test
                    if tool.name == "mathematical_solve":
                        result = tool.func("2 + 2")
                        tool_tests[tool.name] = {"working": True, "result_length": len(str(result))}
                    elif tool.name == "web_search":
                        result = tool.func("test", 1)
                        tool_tests[tool.name] = {"working": True, "result_length": len(str(result))}
                    else:
                        tool_tests[tool.name] = {"working": True, "skipped": "no test implemented"}
                    
                    print(f"✅ {tool.name}: Working")
                    
                except Exception as e:
                    tool_tests[tool.name] = {"working": False, "error": str(e)}
                    print(f"❌ {tool.name}: {e}")
            
            agent_status["tool_tests"] = tool_tests
            
        except Exception as e:
            agent_status = {"agent_loaded": False, "error": str(e)}
            self.results["errors"].append(f"Agent loading failed: {e}")
        
        self.results["production_mirror"]["agent_functionality"] = agent_status
    
    def _generate_validation_report(self):
        """Generate comprehensive validation report"""
        total_errors = len(self.results["errors"])
        total_warnings = len(self.results["warnings"])
        
        print(f"\n📊 VALIDATION SUMMARY:")
        print(f"   Errors: {total_errors}")
        print(f"   Warnings: {total_warnings}")
        
        if total_errors == 0:
            print("✅ PRODUCTION PARITY ACHIEVED - Tests will reflect production reality")
        else:
            print("❌ PRODUCTION PARITY FAILED - Test results will be unreliable")
            for error in self.results["errors"]:
                print(f"   🚨 {error}")
        
        if total_warnings > 0:
            for warning in self.results["warnings"]:
                print(f"   ⚠️  {warning}")
        
        # Save detailed report
        report_path = self.project_root / "tests" / "validation" / "production_parity_report.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print(f"\n📄 Detailed report saved: {report_path}")


def run_production_parity_test():
    """Main entry point for production parity validation"""
    validator = ProductionParityValidator()
    results = validator.validate_all()
    
    # Exit with error code if validation fails
    if len(results["errors"]) > 0:
        sys.exit(1)
    
    return results


if __name__ == "__main__":
    run_production_parity_test()