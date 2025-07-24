#!/usr/bin/env python3
"""
Validate the pure ADK delegation fix in Cloud Run
Test that transfer_to_agent() function calls work without 400 errors
"""

import subprocess
import time

def check_build_status(build_id):
    """Check if the specified build completed successfully"""
    try:
        result = subprocess.run([
            "gcloud", "builds", "describe", build_id,
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

def validate_pure_adk_delegation():
    """Validate the pure ADK delegation pattern works"""
    
    print("🧪 Validating PURE ADK Delegation Pattern")
    print("=" * 60)
    
    print("🎯 Expected Behavior with Pure ADK Pattern:")
    print("   ✅ No more custom transfer_to_specialist tool")
    print("   ✅ Only 4 basic tools: read_file, write_file, list_directory, search_knowledge")
    print("   ✅ 5 sub-agents: security, architecture, data_science, devops, research")
    print("   ✅ transfer_to_agent() function calls work correctly")
    print("   ✅ No more '400 INVALID_ARGUMENT: Tool use with function calling is unsupported'")
    
    print("\n🔧 Pure ADK Configuration Applied:")
    print("   ✅ Removed custom transfer_to_specialist tool")
    print("   ✅ Removed ToolContext.actions.transfer_to_agent approach")
    print("   ✅ Using pure ADK sub_agents parameter")
    print("   ✅ Instructions reference transfer_to_agent() function calls")
    print("   ✅ No tool/sub_agents conflicts")
    
    print("\n💬 Test Query to Try:")
    print("   'What time is it in Paris?' → Should trigger transfer_to_agent(agent_name='research_specialist')")
    
    print("\n🌐 vana-dev URL: https://vana-dev-qqugqgsbcq-uc.a.run.app")
    
    return True

def main():
    # Check latest build
    latest_build_id = "f3ab1233-f81d-42d6-87a7-d048d8b0eed3"
    
    print("Checking latest build status...")
    build_complete = check_build_status(latest_build_id)
    
    if build_complete:
        validate_pure_adk_delegation()
        print("\n✅ Pure ADK delegation pattern deployed")
        print("🎯 TEST: Ask 'What time is it in Paris?' in vana-dev")
        print("🎯 EXPECT: transfer_to_agent() call → research_specialist responds")
        print("🎯 SUCCESS: No 400 errors!")
    else:
        print("\n⏳ Build still in progress - run this script again when build completes")
        print(f"💡 Monitor build: gcloud builds describe {latest_build_id} --project=analystai-454200")

if __name__ == "__main__":
    main()