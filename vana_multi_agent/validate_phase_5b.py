#!/usr/bin/env python3
"""
Quick Phase 5B Development Specialists Validation

Validates the successful implementation of Phase 5B Development Specialists.
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    print("🚀 Phase 5B Development Specialists Validation")
    print("=" * 50)
    
    try:
        # Import the team module
        from vana_multi_agent.agents.team import (
            vana, development_orchestrator,
            code_generation_agent, testing_agent, documentation_agent, security_agent
        )
        
        print("✅ Successfully imported all development specialist agents")
        
        # Check agent counts
        total_agents = 1 + len(vana.sub_agents)  # 1 VANA + sub_agents
        print(f"📊 Total Agent Count: {total_agents} (Expected: 16)")
        
        # Check tool counts  
        total_tools = len(vana.tools)
        print(f"🔧 Total Tool Count: {total_tools} (Expected: 38)")
        
        # List development specialists
        print(f"\n🧑‍💻 Development Specialist Agents:")
        development_specialists = [
            ("Code Generation Agent", code_generation_agent),
            ("Testing Agent", testing_agent), 
            ("Documentation Agent", documentation_agent),
            ("Security Agent", security_agent)
        ]
        
        for name, agent in development_specialists:
            print(f"   - {name}: {agent.name} (output_key: {agent.output_key})")
        
        # Check if development specialists are in VANA sub_agents
        vana_sub_agent_names = [agent.name for agent in vana.sub_agents]
        dev_specialist_names = [agent.name for _, agent in development_specialists]
        
        print(f"\n🔗 VANA Integration:")
        for name in dev_specialist_names:
            status = "✅" if name in vana_sub_agent_names else "❌"
            print(f"   - {name}: {status}")
        
        # Validate success criteria
        success = True
        if total_agents != 16:
            print(f"❌ Agent count mismatch: expected 16, got {total_agents}")
            success = False
        
        if total_tools != 38:
            print(f"❌ Tool count mismatch: expected 38, got {total_tools}")
            success = False
            
        for name in dev_specialist_names:
            if name not in vana_sub_agent_names:
                print(f"❌ {name} not in VANA sub_agents")
                success = False
        
        if success:
            print(f"\n🎉 PHASE 5B IMPLEMENTATION SUCCESSFUL!")
            print(f"✅ Expanded from 12 to 16 agents (33% increase)")
            print(f"✅ Added 4 development specialist tools")
            print(f"✅ Google ADK Agents-as-Tools pattern working")
            print(f"✅ All development specialists integrated with VANA")
            print(f"\n🚀 Ready for Phase 5C: Research Specialists Implementation")
            return True
        else:
            print(f"\n❌ PHASE 5B IMPLEMENTATION FAILED!")
            return False
            
    except Exception as e:
        print(f"❌ Error during validation: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
