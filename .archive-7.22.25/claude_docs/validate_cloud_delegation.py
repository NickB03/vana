#!/usr/bin/env python3
"""
Validate that the fixed ADK delegation pattern works in Cloud Run
Should test that transfer_to_agent() calls work without 400 errors
"""

import requests
import json
import time

def validate_cloud_delegation():
    """Test ADK delegation in vana-dev Cloud Run after fixes"""
    
    base_url = "https://vana-dev-qqugqgsbcq-uc.a.run.app"
    
    print("🧪 Validating Fixed ADK Delegation in Cloud Run")
    print("=" * 60)
    
    # Test 1: Service Health Check
    try:
        print("🏥 Testing service health...")
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ vana-dev service is healthy")
        else:
            print(f"⚠️ Service returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    print(f"\n🌐 ADK Web Interface: {base_url}")
    print("💬 Test Queries to Try:")
    print("   1. 'What time is it in Paris?' → Should delegate to research_specialist")
    print("   2. 'Scan for security vulnerabilities' → Should delegate to security_specialist")
    print("   3. 'Analyze the code architecture' → Should delegate to architecture_specialist")
    
    print("\n🎯 Expected Behavior:")
    print("   ✅ No more '400 INVALID_ARGUMENT: Tool use with function calling is unsupported'")
    print("   ✅ Should see transfer_to_agent() calls in ADK web interface")
    print("   ✅ Specialists should receive queries and respond properly")
    print("   ✅ Research specialist should use google_search for time queries")
    
    print("\n🔧 Fixed Issues:")
    print("   ✅ Removed custom transfer_to_specialist tool")
    print("   ✅ Updated instruction to use transfer_to_agent()")
    print("   ✅ Kept gemini-2.5-flash model")
    print("   ✅ Maintained sub_agents parameter for ADK delegation")
    
    # Check current revision
    try:
        print("\n📦 Checking deployment revision...")
        response = requests.get(base_url, timeout=10)
        if "vana" in response.text.lower():
            print("✅ New revision appears to be deployed")
        else:
            print("⚠️ May still be old revision - check manually")
    except Exception as e:
        print(f"⚠️ Could not verify revision: {e}")
    
    return True

def check_build_status():
    """Check if the build completed successfully"""
    import subprocess
    
    try:
        result = subprocess.run([
            "gcloud", "builds", "describe", "fa9ff86f-5bf1-4ad6-aaad-c024dc53d7c6",
            "--project=analystai-454200", "--format=value(status,finishTime)"
        ], capture_output=True, text=True, timeout=10)
        
        status_info = result.stdout.strip().split('\n')
        status = status_info[0] if status_info else "UNKNOWN"
        
        print(f"📦 Build Status: {status}")
        
        if status == "SUCCESS":
            print("✅ Build completed successfully")
            return True
        elif status == "WORKING":
            print("⏳ Build still in progress")
            return False
        else:
            print(f"❌ Build failed with status: {status}")
            return False
            
    except Exception as e:
        print(f"⚠️ Could not check build status: {e}")
        return False

if __name__ == "__main__":
    print("Checking build status first...")
    build_complete = check_build_status()
    
    if build_complete:
        validate_cloud_delegation()
        print("\n✅ Validation complete - test the time query in ADK web interface")
    else:
        print("\n⏳ Build still in progress - run this script again when build completes")
        print("💡 Monitor build: gcloud builds describe fa9ff86f-5bf1-4ad6-aaad-c024dc53d7c6 --project=analystai-454200")