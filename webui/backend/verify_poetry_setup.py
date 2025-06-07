#!/usr/bin/env python3
"""
Verify Poetry setup and VANA configuration in Codex environment.
This script checks that Poetry is properly installed and configured.
"""

import subprocess
import sys
import os
from pathlib import Path

def check_poetry_installation():
    """Check if Poetry is installed and accessible."""
    print("🔍 Checking Poetry Installation...")
    
    try:
        result = subprocess.run(['poetry', '--version'], 
                              capture_output=True, text=True, check=True)
        print(f"✅ Poetry found: {result.stdout.strip()}")
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Poetry not found")
        print("💡 Install Poetry with: curl -sSL https://install.python-poetry.org | python3 -")
        return False

def check_poetry_environment():
    """Check Poetry virtual environment status."""
    print("\n🔍 Checking Poetry Environment...")
    
    try:
        # Check if we're in a Poetry environment
        result = subprocess.run(['poetry', 'env', 'info'], 
                              capture_output=True, text=True, check=True)
        print("✅ Poetry environment info:")
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"⚠️  Poetry environment issue: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are installed."""
    print("\n🔍 Checking Dependencies...")
    
    try:
        # Check Poetry dependencies
        result = subprocess.run(['poetry', 'show'], 
                              capture_output=True, text=True, check=True)
        
        required_packages = [
            'fastapi',
            'uvicorn', 
            'pydantic-settings',
            'python-dotenv'
        ]
        
        installed_packages = result.stdout.lower()
        
        for package in required_packages:
            if package in installed_packages:
                print(f"✅ {package} - Installed")
            else:
                print(f"❌ {package} - Missing")
                
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error checking dependencies: {e}")
        return False

def test_vana_config():
    """Test VANA configuration loading."""
    print("\n🔍 Testing VANA Configuration...")
    
    try:
        # Try to import and test the configuration
        sys.path.insert(0, str(Path(__file__).parent.parent.parent))
        
        from webui.backend.config import settings
        
        print("✅ VANA configuration loaded successfully")
        print(f"  Environment: {settings.vana_env}")
        print(f"  Model: {settings.vana_model}")
        print(f"  API Keys configured: {bool(settings.brave_api_key and settings.openrouter_api_key)}")
        
        return True
    except Exception as e:
        print(f"❌ VANA configuration error: {e}")
        return False

def run_with_poetry():
    """Test running commands with Poetry."""
    print("\n🔍 Testing Poetry Command Execution...")
    
    try:
        # Test running the config test with Poetry
        result = subprocess.run([
            'poetry', 'run', 'python', 'webui/backend/test_config.py'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Poetry run command successful")
            return True
        else:
            print(f"❌ Poetry run failed: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("⚠️  Poetry run command timed out")
        return False
    except Exception as e:
        print(f"❌ Poetry run error: {e}")
        return False

def main():
    """Main verification function."""
    print("🚀 VANA Poetry Setup Verification")
    print("=" * 50)
    
    checks = [
        ("Poetry Installation", check_poetry_installation),
        ("Poetry Environment", check_poetry_environment), 
        ("Dependencies", check_dependencies),
        ("VANA Configuration", test_vana_config),
        ("Poetry Execution", run_with_poetry)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        print(f"\n📋 {check_name}")
        print("-" * 30)
        success = check_func()
        results.append((check_name, success))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for check_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {check_name}")
        if not success:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All checks passed! Poetry and VANA are properly configured.")
        print("\n🚀 You can now run:")
        print("   poetry run python webui/backend/main.py")
    else:
        print("\n⚠️  Some checks failed. Please review the issues above.")
        print("\n💡 Common fixes:")
        print("   1. Install Poetry: curl -sSL https://install.python-poetry.org | python3 -")
        print("   2. Install dependencies: poetry install")
        print("   3. Check environment variables in Codex")
    
    return all_passed

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
