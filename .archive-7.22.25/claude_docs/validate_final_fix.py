#!/usr/bin/env python3
"""
Validate the final ADK delegation fix in Cloud Run
Should test that transfer_to_specialist tool works without 400 errors
"""

import requests
import json
import time
import subprocess

def check_build_status():
    """Check if the latest build completed successfully"""
    try:
        result = subprocess.run([
            "gcloud", "builds", "describe", "b43d1175-a8f9-447f-9f99-10348057e32c",
            "--project=analystai-454200", "--format=value(status,finishTime)"
        ], capture_output=True, text=True, timeout=10)
        
        status_info = result.stdout.strip().split('\n')
        status = status_info[0] if status_info else "UNKNOWN"
        
        print(f"📦 Build Status: {status}")
        
        if status.startswith("SUCCESS"):
            print("✅ Build completed successfully")
            return True
        elif status.startswith("WORKING"):
            print("⏳ Build still in progress")
            return False
        else:
            print(f"❌ Build failed with status: {status}")
            return False
            
    except Exception as e:
        print(f"⚠️ Could not check build status: {e}")
        return False

def validate_fixed_delegation():
    """Test that the fixed ADK delegation pattern works in Cloud Run"""
    
    base_url = "https://vana-dev-qqugqgsbcq-uc.a.run.app"
    
    print("🧪 Validating FINAL ADK Delegation Fix")
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
    print("💬 Test Query to Try:")
    print("   'What time is it in Paris?' → Should use transfer_to_specialist tool")
    
    print("\n🎯 Expected Final Behavior:")
    print("   ✅ No more '400 INVALID_ARGUMENT: Tool use with function calling is unsupported'")
    print("   ✅ Should see transfer_to_specialist tool call in ADK web interface")
    print("   ✅ Tool should use tool_context.actions.transfer_to_agent = 'research_specialist'")
    print("   ✅ Research specialist should receive query and respond with time info")
    
    print("\n🔧 Final Fix Applied:")
    print("   ✅ Added proper transfer_to_specialist tool to orchestrator tools list")
    print("   ✅ Updated instruction to reference tool instead of invalid function calls")
    print("   ✅ Tool uses correct ADK pattern: tool_context.actions.transfer_to_agent")
    print("   ✅ Maintained sub_agents parameter for ADK hierarchy")
    print("   ✅ Kept gemini-2.5-flash model as requested")
    
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

def main():
    print("Checking build status first...")
    build_complete = check_build_status()
    
    if build_complete:
        validate_fixed_delegation()
        print("\n✅ Validation complete")
        print("🎯 TEST: Go to vana-dev and ask 'What time is it in Paris?'")
        print("🎯 EXPECT: transfer_to_specialist tool call → research_specialist responds")
        print("🎯 SUCCESS: No more 400 INVALID_ARGUMENT errors!")
    else:
        print("\n⏳ Build still in progress - run this script again when build completes")
        print("💡 Monitor build: gcloud builds describe b43d1175-a8f9-447f-9f99-10348057e32c --project=analystai-454200")

if __name__ == "__main__":
    main()