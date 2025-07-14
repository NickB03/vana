#!/usr/bin/env python3
"""
Phase 2 ADK Coordination Verification Script
Week 1: Development Environment Validation
"""

import os
import sys
import json
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load development environment variables
from dotenv import load_dotenv
load_dotenv('.env.development')

def verify_feature_flags():
    """Verify feature flags are properly set."""
    print("🔍 Verifying Feature Flags...")
    
    use_adk_coordination = os.getenv("USE_ADK_COORDINATION", "false").lower() == "true"
    use_official_agent_tool = os.getenv("USE_OFFICIAL_AGENT_TOOL", "false").lower() == "true"
    
    print(f"  ✅ USE_ADK_COORDINATION: {use_adk_coordination}")
    print(f"  ✅ USE_OFFICIAL_AGENT_TOOL: {use_official_agent_tool}")
    
    if not use_adk_coordination:
        print("  ❌ ERROR: USE_ADK_COORDINATION is not enabled!")
        return False
    
    return True

def verify_imports():
    """Verify ADK imports are working."""
    print("\n🔍 Verifying ADK Imports...")
    
    try:
        from google.adk.tools.agent_tool import AgentTool
        print("  ✅ ADK AgentTool import successful")
        
        from lib._tools.real_coordination_tools import transfer_to_agent, real_delegate_to_agent
        print("  ✅ Coordination tools import successful")
        
        from lib._tools.agent_tools import create_specialist_agent_tool, create_specialist_tools
        print("  ✅ Agent tools import successful")
        
        return True
    except Exception as e:
        print(f"  ❌ Import error: {e}")
        return False

def test_adk_coordination():
    """Test ADK coordination functionality."""
    print("\n🧪 Testing ADK Coordination...")
    
    try:
        from lib._tools.real_coordination_tools import real_delegate_to_agent
        
        # Test coordination
        result = real_delegate_to_agent(
            agent_name="test_specialist",
            task="Verify ADK coordination is working",
            context="Development environment rollout verification"
        )
        
        # Parse result
        result_data = json.loads(result)
        
        print(f"  ✅ Coordination test successful")
        print(f"  📊 Result status: {result_data.get('status')}")
        print(f"  🔧 Method used: {result_data.get('transfer_result', {}).get('method', 'Unknown')}")
        
        # Verify ADK method was used
        if "ADK" in result_data.get('transfer_result', {}).get('method', ''):
            print("  ✅ ADK coordination mechanism confirmed active")
            return True
        else:
            print("  ❌ ERROR: Legacy coordination mechanism is active!")
            return False
            
    except Exception as e:
        print(f"  ❌ Coordination test failed: {e}")
        return False

def verify_logging():
    """Verify logging is properly configured."""
    print("\n🔍 Verifying Logging Configuration...")
    
    import logging
    
    # Check log level
    log_level = os.getenv("LOG_LEVEL", "INFO")
    print(f"  ✅ Log level: {log_level}")
    
    # Test logging
    logger = logging.getLogger("vana.tools.coordination")
    logger.info("ADK coordination verification test log")
    print("  ✅ Logging functional")
    
    return True

def generate_verification_report():
    """Generate a verification report."""
    print("\n📄 Generating Verification Report...")
    
    report = {
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "unknown"),
        "rollout_week": os.getenv("ROLLOUT_WEEK", "unknown"),
        "rollout_start_date": os.getenv("ROLLOUT_START_DATE", "unknown"),
        "feature_flags": {
            "USE_ADK_COORDINATION": os.getenv("USE_ADK_COORDINATION", "false"),
            "USE_OFFICIAL_AGENT_TOOL": os.getenv("USE_OFFICIAL_AGENT_TOOL", "false")
        },
        "verification_status": "pending"
    }
    
    # Run all verifications
    all_passed = all([
        verify_feature_flags(),
        verify_imports(),
        test_adk_coordination(),
        verify_logging()
    ])
    
    report["verification_status"] = "PASSED" if all_passed else "FAILED"
    
    # Save report
    report_path = ".development/reports/adk-coordination-verification-week1.json"
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Report saved to: {report_path}")
    print(f"\n🎯 Overall Status: {report['verification_status']}")
    
    return all_passed

def main():
    """Main verification entry point."""
    print("=" * 60)
    print("🚀 ADK Coordination Rollout - Week 1 Verification")
    print("=" * 60)
    
    success = generate_verification_report()
    
    if success:
        print("\n✅ Development environment is ready for ADK coordination!")
        print("📋 Next steps:")
        print("  1. Monitor logs for 'Using ADK coordination mechanism'")
        print("  2. Track error rates and performance metrics")
        print("  3. Run integration tests with ADK enabled")
        print("  4. Prepare for Week 2 staging deployment")
    else:
        print("\n❌ Development environment verification failed!")
        print("🔧 Please check the errors above and fix before proceeding.")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())