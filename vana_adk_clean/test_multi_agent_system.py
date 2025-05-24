#!/usr/bin/env python3
"""
VANA Multi-Agent System Test Script

This script tests the enhanced VANA multi-agent system with Manus-style capabilities.
It verifies that all agents are properly configured and can coordinate effectively.
"""

import os
import sys
import logging
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_agent_imports():
    """Test that all agents can be imported successfully."""
    try:
        from vana_agent.agent import (
            vana_root_agent, 
            code_execution_agent, 
            search_agent, 
            vana_orchestrator,
            root_agent
        )
        
        logger.info("✅ All agents imported successfully")
        
        # Verify agent configurations
        agents = {
            "Root Agent": vana_root_agent,
            "Code Execution Agent": code_execution_agent,
            "Search Agent": search_agent,
            "Orchestrator": vana_orchestrator,
            "Exported Root": root_agent
        }
        
        for name, agent in agents.items():
            logger.info(f"✅ {name}: {agent.name} - {len(agent.tools) if hasattr(agent, 'tools') else 0} tools")
            
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to import agents: {str(e)}")
        return False

def test_tool_availability():
    """Test that all tools are available and properly configured."""
    try:
        from vana_agent.agent import vana_root_agent
        
        expected_tools = [
            'echo_tool', 'get_info_tool', 'help_tool',
            'read_file_tool', 'write_file_tool', 'list_directory_tool', 'file_exists_tool',
            'create_file_tool', 'delete_file_tool', 'move_file_tool', 'copy_file_tool',
            'search_files_tool', 'get_file_info_tool',
            'create_directory_tool', 'delete_directory_tool', 
            'get_current_directory_tool', 'change_directory_tool',
            'vector_search_tool', 'web_search_tool', 'kg_query_tool', 'kg_store_tool',
            'context7_search_tool', 'context7_get_docs_tool',
            'get_health_status_tool'
        ]
        
        available_tools = [tool.__name__ for tool in vana_root_agent.tools]
        
        logger.info(f"✅ Root agent has {len(available_tools)} tools available")
        
        missing_tools = set(expected_tools) - set(available_tools)
        if missing_tools:
            logger.warning(f"⚠️ Missing tools: {missing_tools}")
        else:
            logger.info("✅ All expected tools are available")
            
        return len(missing_tools) == 0
        
    except Exception as e:
        logger.error(f"❌ Failed to check tool availability: {str(e)}")
        return False

def test_multi_agent_architecture():
    """Test the multi-agent architecture configuration."""
    try:
        from vana_agent.agent import vana_orchestrator
        
        # Check that orchestrator has AgentTool wrappers
        agent_tools = [tool for tool in vana_orchestrator.tools if hasattr(tool, 'agent')]
        
        logger.info(f"✅ Orchestrator has {len(agent_tools)} agent tools")
        
        for i, agent_tool in enumerate(agent_tools):
            agent_name = agent_tool.agent.name if hasattr(agent_tool.agent, 'name') else f"Agent {i}"
            logger.info(f"  - {agent_name}")
            
        # Verify we have the expected number of agents
        expected_agent_count = 3  # Root, Code, Search
        if len(agent_tools) == expected_agent_count:
            logger.info("✅ Multi-agent architecture properly configured")
            return True
        else:
            logger.error(f"❌ Expected {expected_agent_count} agents, found {len(agent_tools)}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Failed to test multi-agent architecture: {str(e)}")
        return False

def test_manus_style_capabilities():
    """Test that Manus-style capabilities are properly implemented."""
    try:
        from vana_agent.agent import get_info_tool, help_tool
        
        # Test get_info_tool
        info_result = get_info_tool()
        required_sections = [
            "# VANA - Comprehensive AI Assistant",
            "## Overview",
            "## General Capabilities", 
            "## Programming Languages and Technologies",
            "## Task Execution Methodology",
            "## How I Can Help You"
        ]
        
        missing_sections = []
        for section in required_sections:
            if section not in info_result:
                missing_sections.append(section)
                
        if missing_sections:
            logger.warning(f"⚠️ get_info_tool missing sections: {missing_sections}")
        else:
            logger.info("✅ get_info_tool has all required Manus-style sections")
            
        # Test help_tool
        help_result = help_tool()
        required_help_sections = [
            "# VANA Comprehensive Help & Tool Reference",
            "## 🎯 Overview",
            "## 🔧 Tool Categories & Capabilities",
            "## 🎯 Task Execution Methodology",
            "## 🚀 Natural Language Interaction"
        ]
        
        missing_help_sections = []
        for section in required_help_sections:
            if section not in help_result:
                missing_help_sections.append(section)
                
        if missing_help_sections:
            logger.warning(f"⚠️ help_tool missing sections: {missing_help_sections}")
        else:
            logger.info("✅ help_tool has all required Manus-style sections")
            
        return len(missing_sections) == 0 and len(missing_help_sections) == 0
        
    except Exception as e:
        logger.error(f"❌ Failed to test Manus-style capabilities: {str(e)}")
        return False

def run_comprehensive_test():
    """Run all tests and provide a comprehensive report."""
    logger.info("🚀 Starting VANA Multi-Agent System Comprehensive Test")
    logger.info("=" * 60)
    
    tests = [
        ("Agent Import Test", test_agent_imports),
        ("Tool Availability Test", test_tool_availability),
        ("Multi-Agent Architecture Test", test_multi_agent_architecture),
        ("Manus-Style Capabilities Test", test_manus_style_capabilities)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n🔍 Running {test_name}...")
        try:
            result = test_func()
            results[test_name] = result
            status = "✅ PASSED" if result else "❌ FAILED"
            logger.info(f"{status}: {test_name}")
        except Exception as e:
            results[test_name] = False
            logger.error(f"❌ FAILED: {test_name} - {str(e)}")
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("📊 TEST SUMMARY")
    logger.info("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{status}: {test_name}")
    
    logger.info(f"\n🎯 Overall Result: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 ALL TESTS PASSED - VANA Multi-Agent System is ready!")
        logger.info("🚀 You can now start the system with: cd vana_adk_clean && python main.py")
    else:
        logger.warning(f"⚠️ {total - passed} tests failed - please review the issues above")
    
    return passed == total

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)
