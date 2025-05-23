#!/usr/bin/env python3
"""
Test script for ADK package integration.

This script tests if the Google ADK package can be imported correctly.
It also checks the version of the package and prints information about the available modules.
"""

import sys
import importlib
import pkg_resources

def check_package_installed(package_name):
    """Check if a package is installed and get its version."""
    try:
        package = pkg_resources.get_distribution(package_name)
        print(f"✅ {package_name} is installed (version: {package.version})")
        return True
    except pkg_resources.DistributionNotFound:
        print(f"❌ {package_name} is not installed")
        return False

def test_import(module_name):
    """Test if a module can be imported."""
    try:
        module = importlib.import_module(module_name)
        print(f"✅ Successfully imported {module_name}")
        return module
    except ImportError as e:
        print(f"❌ Failed to import {module_name}: {str(e)}")
        return None

def print_module_info(module):
    """Print information about a module."""
    if module:
        print(f"\nModule information for {module.__name__}:")
        print(f"  - Path: {module.__file__}")
        print(f"  - Package: {module.__package__}")
        
        # Print available attributes and submodules
        attributes = dir(module)
        print(f"\nAvailable attributes and submodules ({len(attributes)}):")
        
        # Filter out private attributes
        public_attrs = [attr for attr in attributes if not attr.startswith('_')]
        
        # Print submodules first
        submodules = []
        for attr in public_attrs:
            try:
                value = getattr(module, attr)
                if isinstance(value, type(module)):
                    submodules.append(attr)
                    print(f"  - Submodule: {attr}")
            except:
                pass
        
        # Print other public attributes
        other_attrs = [attr for attr in public_attrs if attr not in submodules]
        if other_attrs:
            print("\nOther public attributes:")
            for attr in other_attrs[:20]:  # Limit to first 20 to avoid overwhelming output
                try:
                    value = getattr(module, attr)
                    print(f"  - {attr}: {type(value).__name__}")
                except:
                    print(f"  - {attr}: <error getting value>")
            
            if len(other_attrs) > 20:
                print(f"  ... and {len(other_attrs) - 20} more")

def main():
    """Main function."""
    print("Testing ADK package integration...\n")
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Check if google-adk is installed
    adk_installed = check_package_installed("google-adk")
    
    # Check if google-cloud-aiplatform is installed
    aiplatform_installed = check_package_installed("google-cloud-aiplatform")
    
    # Try to import google.adk
    print("\nTrying to import google.adk...")
    adk_module = test_import("google.adk")
    print_module_info(adk_module)
    
    # Try to import google.cloud.aiplatform
    print("\nTrying to import google.cloud.aiplatform...")
    aiplatform_module = test_import("google.cloud.aiplatform")
    print_module_info(aiplatform_module)
    
    # Try to import google.cloud.aiplatform.agents
    print("\nTrying to import google.cloud.aiplatform.agents...")
    agents_module = test_import("google.cloud.aiplatform.agents")
    print_module_info(agents_module)
    
    # Print Python path
    print("\nPython path:")
    for path in sys.path:
        print(f"  - {path}")
    
    # Print recommendations
    print("\nRecommendations:")
    if not adk_installed:
        print("  - Install google-adk: pip install google-adk")
    if not aiplatform_installed:
        print("  - Install google-cloud-aiplatform: pip install google-cloud-aiplatform[adk]")
    if adk_installed and not adk_module:
        print("  - Try installing a specific version: pip install google-adk==0.5.0")
        print("  - Try installing the ADK through aiplatform: pip install --upgrade \"google-cloud-aiplatform[adk]\"")
    
    print("\nTest completed.")

if __name__ == "__main__":
    main()
