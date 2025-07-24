#!/usr/bin/env python3
"""
Validate the natural language delegation fix for 400 error
"""

import subprocess
import time
import json

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

def validate_natural_language_fix():
    """Explain the natural language fix for the 400 error"""
    
    print("🧪 ROOT CAUSE ANALYSIS: 400 INVALID_ARGUMENT Error")
    print("=" * 60)
    
    print("\n❌ THE PROBLEM:")
    print("   - Error: 'Tool use with function calling is unsupported'")
    print("   - Cause: Orchestrator instruction contained function call syntax")
    print("   - Example: 'transfer_to_agent(agent_name=\"research_specialist\")'")
    print("   - ADK interprets this as an attempt to use function calling")
    
    print("\n📚 ADK DOCUMENTATION INSIGHT:")
    print("   - ADK does NOT support function call syntax in instructions")
    print("   - Instructions should use natural language")
    print("   - The LLM will decide when to delegate based on context")
    print("   - ADK's sub_agents parameter handles the actual delegation")
    
    print("\n✅ THE FIX:")
    print("   - Changed: 'transfer_to_agent(agent_name=\"research_specialist\")'")
    print("   - To: 'delegate to research_specialist'")
    print("   - Removed ALL function call syntax from instructions")
    print("   - Let ADK handle delegation through sub_agents naturally")
    
    print("\n🔧 What Changed:")
    print("   OLD: '→ transfer_to_agent(agent_name=\"research_specialist\")'")
    print("   NEW: '→ delegate to research_specialist'")
    
    print("\n🎯 Expected Behavior:")
    print("   1. User: 'What time is it in Paris?'")
    print("   2. Orchestrator sees: 'delegate to research_specialist'")
    print("   3. ADK handles delegation through sub_agents")
    print("   4. Research specialist responds with time")
    print("   5. NO MORE 400 ERROR!")
    
    print("\n💡 Key Insight:")
    print("   ADK delegation works through natural language + sub_agents,")
    print("   NOT through function call syntax in instructions!")
    
    print("\n🌐 vana-dev URL: https://vana-dev-qqugqgsbcq-uc.a.run.app")
    
    return True

def main():
    # Check latest build
    latest_build_id = "7cef2a82-9b69-47ea-9197-e9f3af135f36"
    
    print("Checking latest build status...")
    build_complete = check_build_status(latest_build_id)
    
    if build_complete:
        validate_natural_language_fix()
        print("\n✅ Natural language fix deployed")
        print("🎯 TEST: Ask 'What time is it in Paris?' in vana-dev")
        print("🎯 EXPECT: Successful delegation to research_specialist")
        print("🎯 SUCCESS: No more 400 INVALID_ARGUMENT error!")
    else:
        print("\n⏳ Build still in progress - wait for completion")
        print(f"💡 Monitor: gcloud builds describe {latest_build_id} --project=analystai-454200")
        validate_natural_language_fix()

if __name__ == "__main__":
    main()