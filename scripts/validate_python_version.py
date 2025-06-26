#!/usr/bin/env python3
"""
Python Version Validation Script for VANA

CRITICAL: Ensures Python 3.13+ is being used for production stability.
This script MUST be run before any VANA operations to prevent production errors.
"""

import sys
import os
from pathlib import Path


def validate_python_version():
    """Validate that Python 3.13+ is being used"""
    
    print("🔍 VANA Python Version Validation")
    print("=" * 50)
    
    # Get current Python version
    current_version = sys.version_info
    required_major = 3
    required_minor = 13
    
    print(f"Current Python Version: {current_version.major}.{current_version.minor}.{current_version.micro}")
    print(f"Required Version: {required_major}.{required_minor}+")
    
    # Check if version meets requirements
    version_ok = (
        current_version.major == required_major and 
        current_version.minor >= required_minor
    )
    
    if version_ok:
        print("✅ PASSED: Python version meets requirements")
        print(f"✅ Using Python {current_version.major}.{current_version.minor}.{current_version.micro}")
        
        # Additional SSL/OpenSSL check
        try:
            import ssl
            print(f"✅ SSL Version: {ssl.OPENSSL_VERSION}")
        except Exception as e:
            print(f"⚠️  SSL Warning: {e}")
            
        return True
    else:
        print("🚨 CRITICAL ERROR: Python version requirement not met!")
        print(f"❌ Current: Python {current_version.major}.{current_version.minor}.{current_version.micro}")
        print(f"❌ Required: Python {required_major}.{required_minor}+")
        print()
        print("IMMEDIATE ACTION REQUIRED:")
        print("1. Install Python 3.13+")
        print("2. Run: poetry env use python3.13")
        print("3. Run: poetry install")
        print("4. Re-run this validation script")
        print()
        print("⚠️  PRODUCTION DEPLOYMENT WILL FAIL WITH INCORRECT PYTHON VERSION")
        
        return False


def validate_environment():
    """Validate the complete environment setup"""
    
    print("\n🔍 Environment Validation")
    print("=" * 30)
    
    # Check if we're in a virtual environment
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    
    if in_venv:
        print("✅ Running in virtual environment")
    else:
        print("⚠️  Not in virtual environment (recommended to use Poetry)")
    
    # Check project structure
    project_root = Path(__file__).parent.parent
    critical_files = [
        'pyproject.toml',
        'agents/vana/team.py',
        'lib/_tools/adk_tools.py',
        'main.py'
    ]
    
    print("\n📁 Project Structure Validation:")
    all_files_exist = True
    for file_path in critical_files:
        full_path = project_root / file_path
        if full_path.exists():
            print(f"✅ {file_path}")
        else:
            print(f"❌ Missing: {file_path}")
            all_files_exist = False
    
    return all_files_exist


def main():
    """Main validation function"""
    
    print("🚀 VANA System Validation")
    print("=" * 60)
    print("Ensuring production-ready environment configuration")
    print()
    
    # Validate Python version
    python_ok = validate_python_version()
    
    # Validate environment
    env_ok = validate_environment()
    
    print("\n" + "=" * 60)
    print("📋 VALIDATION SUMMARY")
    print("=" * 60)
    
    if python_ok and env_ok:
        print("🎉 ALL VALIDATIONS PASSED")
        print("✅ System ready for VANA operations")
        print("✅ Production deployment requirements met")
        return 0
    else:
        print("🚨 VALIDATION FAILED")
        if not python_ok:
            print("❌ Python version requirement not met")
        if not env_ok:
            print("❌ Environment configuration issues detected")
        print("⚠️  DO NOT PROCEED TO PRODUCTION UNTIL RESOLVED")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)