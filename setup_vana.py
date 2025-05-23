#!/usr/bin/env python3
"""
Setup VANA - Versatile Agent Network Architecture.

This script sets up the VANA environment by:
1. Verifying API enablement
2. Checking service account permissions
3. Setting up Vector Search
4. Populating Vector Search with knowledge documents
5. Testing Vector Search integration
"""

import os
import subprocess
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_script(script_name, description):
    """Run a script and return True if it succeeds."""
    print(f"\n{'='*80}")
    print(f"Running {script_name}: {description}")
    print(f"{'='*80}\n")
    
    result = subprocess.run([f"./{script_name}"], shell=True)
    
    if result.returncode == 0:
        print(f"\n✅ {script_name} completed successfully!")
        return True
    else:
        print(f"\n❌ {script_name} failed with exit code {result.returncode}")
        return False

def main():
    """Main function."""
    print("🚀 Setting up VANA - Versatile Agent Network Architecture")
    
    # Step 1: Verify API enablement
    if not run_script("verify_apis.py", "Verifying API enablement"):
        print("\n❌ Failed to verify API enablement. Please fix the issues and try again.")
        sys.exit(1)
    
    # Step 2: Check service account permissions
    if not run_script("check_permissions.py", "Checking service account permissions"):
        print("\n❌ Failed to check service account permissions. Please fix the issues and try again.")
        sys.exit(1)
    
    # Step 3: Set up Vector Search
    if not run_script("setup_vector_search.py", "Setting up Vector Search"):
        print("\n⚠️ Vector Search setup failed. This may be because it's already set up.")
        
        # Ask user if they want to continue
        response = input("\nDo you want to continue with the setup? (y/n): ")
        if response.lower() != 'y':
            print("\n❌ Setup aborted.")
            sys.exit(1)
    
    # Step 4: Populate Vector Search with knowledge documents
    if not run_script("populate_vector_search.py", "Populating Vector Search with knowledge documents"):
        print("\n❌ Failed to populate Vector Search. Please fix the issues and try again.")
        sys.exit(1)
    
    # Step 5: Test Vector Search integration
    if not run_script("test_vector_search.py", "Testing Vector Search integration"):
        print("\n⚠️ Vector Search test failed. This may be because the index is still being updated.")
        print("Please try running test_vector_search.py again later.")
    
    print("\n🎉 VANA setup completed successfully!")
    print("\nNext steps:")
    print("1. Start the ADK web interface: cd adk-setup && adk web")
    print("2. Test the agent system with Vector Search integration")
    print("3. Deploy to Vertex AI Agent Engine (optional): python adk-setup/deploy.py")

if __name__ == "__main__":
    main()
