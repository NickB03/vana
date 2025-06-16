#!/usr/bin/env python3
"""
Simple test script to check current VANA system status
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.append(str(project_root))

async def test_basic_imports():
    """Test basic imports to see what's working"""
    print("🔍 Testing Basic Imports...")
    
    try:
        from lib.logging_config import get_logger
        print("✅ lib.logging_config - OK")
        logger = get_logger("test")
        logger.info("Logger working")
    except Exception as e:
        print(f"❌ lib.logging_config - FAILED: {e}")
    
    try:
        from agents.vana.team import root_agent
        print("✅ agents.vana.team - OK")
        print(f"   Agent name: {root_agent.name}")
        print(f"   Agent description: {root_agent.description}")
    except Exception as e:
        print(f"❌ agents.vana.team - FAILED: {e}")
    
    try:
        from lib._tools.adk_tools import get_agent_status
        print("✅ lib._tools.adk_tools - OK")
    except Exception as e:
        print(f"❌ lib._tools.adk_tools - FAILED: {e}")

def test_file_structure():
    """Test file structure"""
    print("\n📁 Testing File Structure...")
    
    required_paths = [
        "agents/vana",
        "lib/_tools",
        "tests/eval",
        "memory-bank/00-core"
    ]
    
    for path in required_paths:
        if Path(path).exists():
            print(f"✅ {path} - EXISTS")
        else:
            print(f"❌ {path} - MISSING")

def test_evalsets():
    """Test evaluation sets"""
    print("\n🧪 Testing Evaluation Sets...")
    
    evalsets_dir = Path("tests/eval/evalsets")
    if evalsets_dir.exists():
        evalset_files = list(evalsets_dir.glob("*.json"))
        print(f"✅ Found {len(evalset_files)} evalset files:")
        for file in evalset_files:
            print(f"   - {file.name}")
    else:
        print("❌ Evalsets directory not found")

async def main():
    """Main test function"""
    print("🚀 VANA System Status Check")
    print("=" * 50)
    
    test_file_structure()
    await test_basic_imports()
    test_evalsets()
    
    print("\n" + "=" * 50)
    print("✅ Status check complete!")

if __name__ == "__main__":
    asyncio.run(main())
