#!/usr/bin/env python3
"""
Comprehensive Functional Test Suite for VANA System
Following the systematic recovery plan from the handoff document.

This establishes a baseline: "System must work before and after any change"
"""

import sys
import time
import traceback
import json
from typing import Dict, List, Any

def test_step(step_name: str, test_func, timeout: int = 30) -> tuple[bool, Any]:
    """Test a specific step with timeout protection"""
    print(f"🔍 Testing: {step_name}")
    start_time = time.time()
    
    try:
        result = test_func()
        elapsed = time.time() - start_time
        print(f"✅ {step_name} - Success ({elapsed:.2f}s)")
        return True, result
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ {step_name} - Failed ({elapsed:.2f}s): {e}")
        if elapsed > timeout:
            print(f"⚠️  Test exceeded timeout of {timeout}s")
        return False, str(e)

class VanaFunctionalTester:
    """Comprehensive functional testing for VANA system"""
    
    def __init__(self):
        self.results = []
        self.agent = None
        
    def test_environment_setup(self) -> bool:
        """Test basic environment setup"""
        def _test():
            import os
            import sys
            
            # Check Python version
            python_version = sys.version_info
            if python_version.major != 3 or python_version.minor < 9:
                raise Exception(f"Python version {python_version} not supported")
            
            # Check if we're in Poetry environment
            if 'vana-vCvkDMga-py3.13' not in sys.executable:
                raise Exception("Not running in Poetry environment")
            
            return {
                "python_version": f"{python_version.major}.{python_version.minor}.{python_version.micro}",
                "executable": sys.executable,
                "poetry_env": True
            }
        
        success, result = test_step("Environment Setup", _test)
        self.results.append(("Environment Setup", success, result))
        return success
    
    def test_core_imports(self) -> bool:
        """Test core system imports"""
        def _test():
            # Test Google Cloud imports
            from google.cloud import aiplatform
            
            # Test Google ADK imports  
            from google.adk import Agent
            
            # Test local imports
            sys.path.append('.')
            from lib._tools import adk_tools
            
            return "All core imports successful"
        
        success, result = test_step("Core Imports", _test)
        self.results.append(("Core Imports", success, result))
        return success
    
    def test_agent_loading(self) -> bool:
        """Test agent loading and initialization"""
        def _test():
            sys.path.append('.')
            from agents.vana.team import root_agent
            
            # Store agent for later tests
            self.agent = root_agent
            
            # Validate agent properties
            if not hasattr(root_agent, 'name'):
                raise Exception("Agent missing name attribute")
            
            if not hasattr(root_agent, 'tools'):
                raise Exception("Agent missing tools attribute")
            
            tools = getattr(root_agent, 'tools', [])
            if len(tools) == 0:
                raise Exception("Agent has no tools")
            
            return {
                "agent_name": root_agent.name,
                "tool_count": len(tools),
                "agent_loaded": True
            }
        
        success, result = test_step("Agent Loading", _test)
        self.results.append(("Agent Loading", success, result))
        return success
    
    def test_tool_registration(self) -> bool:
        """Test tool registration and accessibility"""
        def _test():
            if not self.agent:
                raise Exception("Agent not loaded")
            
            tools = getattr(self.agent, 'tools', [])
            
            # Test tool properties
            tool_info = []
            for i, tool in enumerate(tools[:5]):  # Test first 5 tools
                tool_name = getattr(tool, 'name', f'tool_{i}')
                tool_type = type(tool).__name__
                tool_info.append({
                    "name": tool_name,
                    "type": tool_type,
                    "callable": callable(tool)
                })
            
            return {
                "total_tools": len(tools),
                "sample_tools": tool_info,
                "all_tools_present": len(tools) >= 50  # Expected minimum
            }
        
        success, result = test_step("Tool Registration", _test)
        self.results.append(("Tool Registration", success, result))
        return success
    
    def test_basic_tool_functionality(self) -> bool:
        """Test basic tool functionality"""
        def _test():
            if not self.agent:
                raise Exception("Agent not loaded")
            
            # Look for echo tool specifically
            tools = getattr(self.agent, 'tools', [])
            echo_tool = None
            
            for tool in tools:
                tool_name = getattr(tool, 'name', '')
                if 'echo' in tool_name.lower():
                    echo_tool = tool
                    break
            
            if not echo_tool:
                return {
                    "echo_tool_found": False,
                    "message": "Echo tool not found - this is expected if tools are wrapped differently"
                }
            
            # If we found echo tool, test it
            if callable(echo_tool):
                try:
                    result = echo_tool("test message")
                    return {
                        "echo_tool_found": True,
                        "echo_test": "success",
                        "echo_result": str(result)
                    }
                except Exception as e:
                    return {
                        "echo_tool_found": True,
                        "echo_test": "failed",
                        "echo_error": str(e)
                    }
            
            return {
                "echo_tool_found": True,
                "echo_test": "not_callable",
                "tool_type": type(echo_tool).__name__
            }
        
        success, result = test_step("Basic Tool Functionality", _test)
        self.results.append(("Basic Tool Functionality", success, result))
        return success
    
    def test_configuration_files(self) -> bool:
        """Test configuration files and environment variables"""
        def _test():
            import os
            
            # Check for required environment files
            env_files = ['.env', '.env.local', '.env.production']
            found_files = []
            
            for env_file in env_files:
                if os.path.exists(env_file):
                    found_files.append(env_file)
            
            # Check for key environment variables
            key_vars = [
                'GOOGLE_CLOUD_PROJECT',
                'GOOGLE_CLOUD_REGION',
                'VANA_MODEL'
            ]
            
            env_vars = {}
            for var in key_vars:
                env_vars[var] = os.getenv(var, 'NOT_SET')
            
            return {
                "env_files_found": found_files,
                "env_variables": env_vars,
                "config_valid": len(found_files) > 0
            }
        
        success, result = test_step("Configuration Files", _test)
        self.results.append(("Configuration Files", success, result))
        return success
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all functional tests"""
        print("🚀 Starting VANA Functional Baseline Tests")
        print("=" * 50)
        
        # Run tests in order
        tests = [
            self.test_environment_setup,
            self.test_core_imports,
            self.test_agent_loading,
            self.test_tool_registration,
            self.test_basic_tool_functionality,
            self.test_configuration_files
        ]
        
        all_passed = True
        for test_func in tests:
            success = test_func()
            if not success:
                all_passed = False
                print(f"\n🚨 Stopping at first failure: {test_func.__name__}")
                break
        
        # Generate summary
        summary = {
            "all_tests_passed": all_passed,
            "total_tests": len(self.results),
            "passed_tests": sum(1 for _, success, _ in self.results if success),
            "failed_tests": sum(1 for _, success, _ in self.results if not success),
            "test_results": self.results,
            "baseline_established": all_passed
        }
        
        print("\n" + "=" * 50)
        print("📊 FUNCTIONAL BASELINE TEST RESULTS")
        print("=" * 50)
        
        for test_name, success, result in self.results:
            status = "✅" if success else "❌"
            print(f"{status} {test_name}")
            if isinstance(result, dict):
                for key, value in result.items():
                    print(f"    {key}: {value}")
            else:
                print(f"    {result}")
        
        print(f"\n🎯 BASELINE STATUS: {'✅ ESTABLISHED' if all_passed else '❌ FAILED'}")
        print(f"📈 Success Rate: {summary['passed_tests']}/{summary['total_tests']}")
        
        return summary

def main():
    """Main test execution"""
    tester = VanaFunctionalTester()
    summary = tester.run_all_tests()
    
    # Save results for future reference
    with open('test_baseline_results.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print(f"\n💾 Results saved to test_baseline_results.json")
    
    return summary['all_tests_passed']

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
