#!/usr/bin/env python3
"""
Documentation Verification Script
Ensures documentation claims match reality
"""

import requests
import json
import sys
import subprocess
from datetime import datetime

class DocumentationVerifier:
    def __init__(self, base_url="http://localhost:8081"):
        self.base_url = base_url
        self.results = []
        
    def test_health_endpoint(self):
        """Verify health endpoint returns correct response"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            actual = response.json()
            expected = {"status": "healthy"}
            
            if actual == expected:
                self.results.append(("✅", "Health endpoint", f"Returns {actual}"))
            else:
                self.results.append(("❌", "Health endpoint", 
                    f"Expected {expected}, got {actual}"))
                    
        except Exception as e:
            self.results.append(("❌", "Health endpoint", f"Error: {e}"))
    
    def test_port(self):
        """Verify server runs on documented port"""
        try:
            # Test port 8081 (correct)
            response = requests.get(f"{self.base_url}/health", timeout=2)
            if response.status_code == 200:
                self.results.append(("✅", "Port 8081", "Server accessible"))
            
            # Test port 8000 (incorrect in some docs)
            try:
                bad_response = requests.get("http://localhost:8000/health", timeout=2)
                self.results.append(("⚠️", "Port 8000", 
                    "Server also running on 8000? Documentation may be inconsistent"))
            except:
                self.results.append(("✅", "Port 8000", 
                    "Correctly not accessible (docs should say 8081)"))
                
        except Exception as e:
            self.results.append(("❌", "Port test", f"Server not accessible: {e}"))
    
    def test_api_endpoints(self):
        """Test documented API endpoints"""
        # Test /run endpoint
        try:
            response = requests.post(
                f"{self.base_url}/run",
                json={"input": "What is 2+2?"},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if "result" in data and "output" in data["result"]:
                    self.results.append(("✅", "POST /run", "Endpoint working"))
                else:
                    self.results.append(("⚠️", "POST /run", 
                        f"Unexpected response format: {data}"))
            else:
                self.results.append(("❌", "POST /run", 
                    f"Status {response.status_code}"))
        except Exception as e:
            self.results.append(("❌", "POST /run", f"Error: {e}"))
            
        # Test /v1/chat/completions
        try:
            response = requests.post(
                f"{self.base_url}/v1/chat/completions",
                json={
                    "messages": [{"role": "user", "content": "Hi"}],
                    "stream": False
                },
                timeout=10
            )
            if response.status_code == 200:
                self.results.append(("✅", "POST /v1/chat/completions", 
                    "OpenAI-compatible endpoint working"))
            else:
                self.results.append(("❌", "POST /v1/chat/completions", 
                    f"Status {response.status_code}"))
        except Exception as e:
            self.results.append(("❌", "POST /v1/chat/completions", f"Error: {e}"))
    
    def test_python_version(self):
        """Verify Python version requirements"""
        result = subprocess.run(
            ["python", "--version"], 
            capture_output=True, 
            text=True
        )
        version = result.stdout.strip()
        
        # Extract version number
        import re
        match = re.search(r'Python (\d+)\.(\d+)', version)
        if match:
            major = int(match.group(1))
            minor = int(match.group(2))
            
            if major == 3 and minor >= 13:
                self.results.append(("✅", "Python version", 
                    f"{version} meets requirement (3.13+)"))
            else:
                self.results.append(("❌", "Python version", 
                    f"{version} does NOT meet requirement (needs 3.13+)"))
        else:
            self.results.append(("⚠️", "Python version", 
                f"Could not parse version: {version}"))
    
    def check_tool_availability(self):
        """Verify which tools are actually available"""
        try:
            # Test web search
            response = requests.post(
                f"{self.base_url}/run",
                json={"input": "What time is it in London?"},
                timeout=15
            )
            if response.status_code == 200 and "time" in response.text.lower():
                self.results.append(("✅", "Web search tool", 
                    "Functional (time query worked)"))
            else:
                self.results.append(("⚠️", "Web search tool", 
                    "May not be working properly"))
                    
        except Exception as e:
            self.results.append(("❌", "Web search tool", f"Error: {e}"))
    
    def check_file_references(self):
        """Check if documented files exist"""
        files_to_check = [
            ("docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md", 
             "Referenced in README"),
            ("lib/_tools/web_search_sync.py", 
             "Primary web search implementation"),
            ("agents/vana/team.py", 
             "Main orchestrator"),
        ]
        
        import os
        for filepath, description in files_to_check:
            if os.path.exists(filepath):
                self.results.append(("✅", f"File exists", 
                    f"{filepath} - {description}"))
            else:
                self.results.append(("❌", f"Missing file", 
                    f"{filepath} - {description}"))
    
    def generate_report(self):
        """Generate verification report"""
        print("\n" + "="*60)
        print("📋 VANA Documentation Verification Report")
        print("="*60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Summary
        passed = sum(1 for r in self.results if r[0] == "✅")
        failed = sum(1 for r in self.results if r[0] == "❌")
        warnings = sum(1 for r in self.results if r[0] == "⚠️")
        
        print(f"Summary: {passed} passed, {failed} failed, {warnings} warnings\n")
        
        # Detailed results
        for status, test, detail in self.results:
            print(f"{status} {test}")
            print(f"   {detail}")
            print()
        
        # Recommendations
        print("\n📝 Recommendations:")
        if failed > 0:
            print("- Fix failed tests before updating documentation")
            print("- Update docs to reflect actual behavior")
        if warnings > 0:
            print("- Investigate warnings for potential issues")
        print("- Run this script regularly to prevent drift")
        
        return failed == 0

def main():
    print("🔍 Starting VANA documentation verification...\n")
    
    verifier = DocumentationVerifier()
    
    # Check if server is running
    try:
        response = requests.get("http://localhost:8081/health", timeout=2)
    except:
        print("❌ ERROR: VANA server not running on port 8081")
        print("Please start with: poetry run python main.py")
        return 1
    
    # Run all tests
    print("Running tests...")
    verifier.test_health_endpoint()
    verifier.test_port()
    verifier.test_api_endpoints()
    verifier.test_python_version()
    verifier.check_tool_availability()
    verifier.check_file_references()
    
    # Generate report
    success = verifier.generate_report()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())