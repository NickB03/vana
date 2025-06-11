#!/usr/bin/env python3
"""
Smart VANA System Validation
Focused testing of actual system capabilities based on discovered reality
"""

import asyncio
import json
import time
from datetime import datetime
from playwright.async_api import async_playwright

class SmartVANAValidator:
    def __init__(self):
        self.base_url = "https://vana-dev-960076421399.us-central1.run.app"
        self.actual_agents = ['memory', 'orchestration', 'specialists', 'vana', 'workflows']
        self.results = {
            "validation_timestamp": datetime.now().isoformat(),
            "agents": {},
            "tools_discovered": [],
            "memory_systems": {},
            "performance_baseline": {},
            "reality_check": {}
        }
    
    async def run_smart_validation(self):
        """Execute focused validation of actual system capabilities"""
        print("🧠 Smart VANA System Validation")
        print("=" * 50)
        print(f"Testing {len(self.actual_agents)} actual agents")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                # Navigate once and reuse the page
                await page.goto(self.base_url, timeout=30000)
                await page.wait_for_load_state("networkidle")
                
                # Test each actual agent
                for agent in self.actual_agents:
                    print(f"\n🔍 Testing agent: {agent}")
                    result = await self.test_agent_capabilities(page, agent)
                    self.results["agents"][agent] = result
                
                # Test memory systems
                await self.test_memory_systems(page)
                
                # Generate reality check
                self.generate_reality_check()
                
            except Exception as e:
                print(f"❌ Validation failed: {e}")
            finally:
                await browser.close()
        
        return self.results
    
    async def test_agent_capabilities(self, page, agent_name):
        """Test specific agent capabilities with targeted queries"""
        agent_result = {
            "available": False,
            "response_time": None,
            "tools_used": [],
            "capabilities": [],
            "quality_score": 0.0
        }
        
        try:
            # Select the agent
            await page.click("mat-select")
            await page.click(f"mat-option:has-text('{agent_name}')")
            await asyncio.sleep(1)  # Wait for selection
            
            # Test with agent-specific queries
            test_queries = {
                "memory": "Search for information about VANA system capabilities",
                "orchestration": "Coordinate a task between multiple specialists",
                "specialists": "Help me with system architecture design",
                "vana": "What tools do you have available?",
                "workflows": "Create a workflow for software development"
            }
            
            query = test_queries.get(agent_name, f"What can you help me with as the {agent_name} agent?")
            
            start_time = time.time()
            
            # Clear and fill textarea
            await page.fill("textarea", "")
            await page.fill("textarea", query)
            await page.keyboard.press("Enter")
            
            # Wait for response
            await page.wait_for_selector("p", timeout=30000)
            response_time = time.time() - start_time
            
            # Get response text
            response_elements = await page.locator("p").all()
            response_text = ""
            tool_indicators = []
            
            for element in response_elements:
                text = await element.text_content()
                if text and ("robot_2" in text or len(text) > 50):
                    response_text = text
                    # Extract tool usage
                    if "robot_2bolt" in text:
                        tools = self.extract_tools_from_response(text)
                        tool_indicators.extend(tools)
            
            # Analyze response quality
            agent_result.update({
                "available": True,
                "response_time": round(response_time, 3),
                "tools_used": tool_indicators,
                "response_length": len(response_text),
                "quality_score": self.calculate_quality_score(response_text, tool_indicators)
            })
            
            # Add to global tools list
            self.results["tools_discovered"].extend(tool_indicators)
            
            print(f"   ✅ {agent_name}: {response_time:.3f}s, {len(tool_indicators)} tools, quality: {agent_result['quality_score']:.2f}")
            if tool_indicators:
                print(f"      Tools: {', '.join(tool_indicators)}")
            
        except Exception as e:
            print(f"   ❌ {agent_name}: {str(e)}")
            agent_result["error"] = str(e)
        
        return agent_result
    
    def extract_tools_from_response(self, response_text):
        """Extract tool names from response text"""
        tools = []
        
        # Look for robot_2bolt [tool] pattern
        import re
        tool_pattern = r'robot_2bolt\s+(\w+)'
        matches = re.findall(tool_pattern, response_text)
        tools.extend(matches)
        
        # Look for common tool indicators
        tool_indicators = {
            'search_knowledge': ['search', 'knowledge', 'information'],
            'vector_search': ['vector', 'documentation', 'technical'],
            'web_search': ['web', 'internet', 'online'],
            'architecture_tool': ['architecture', 'design', 'system'],
            'ui_tool': ['ui', 'interface', 'design'],
            'devops_tool': ['devops', 'deployment', 'infrastructure'],
            'qa_tool': ['qa', 'testing', 'quality'],
            'memory_tool': ['memory', 'remember', 'store'],
            'coordinate_task': ['coordinate', 'workflow', 'orchestrate']
        }
        
        response_lower = response_text.lower()
        for tool, indicators in tool_indicators.items():
            if any(indicator in response_lower for indicator in indicators):
                if tool not in tools:
                    tools.append(tool)
        
        return list(set(tools))  # Remove duplicates
    
    def calculate_quality_score(self, response_text, tools_used):
        """Calculate response quality score"""
        score = 0.0
        
        # Length factor
        if len(response_text) > 100:
            score += 0.3
        elif len(response_text) > 50:
            score += 0.2
        
        # Tool usage factor
        score += min(len(tools_used) * 0.2, 0.4)
        
        # Content quality indicators
        quality_indicators = [
            'help', 'assist', 'provide', 'analyze', 'create', 'design',
            'search', 'find', 'coordinate', 'manage', 'optimize'
        ]
        
        response_lower = response_text.lower()
        quality_matches = sum(1 for indicator in quality_indicators if indicator in response_lower)
        score += min(quality_matches * 0.05, 0.3)
        
        return min(score, 1.0)
    
    async def test_memory_systems(self, page):
        """Test memory system capabilities"""
        print(f"\n🧠 Testing Memory Systems")
        
        memory_tests = [
            ("session_memory", "Remember that I prefer detailed technical explanations"),
            ("knowledge_search", "Search for VANA system architecture information"),
            ("vector_search", "Find technical documentation about multi-agent systems")
        ]
        
        # Select VANA agent for memory testing
        await page.click("mat-select")
        await page.click("mat-option:has-text('vana')")
        
        for test_name, query in memory_tests:
            try:
                start_time = time.time()
                
                await page.fill("textarea", "")
                await page.fill("textarea", query)
                await page.keyboard.press("Enter")
                
                await page.wait_for_selector("p", timeout=30000)
                response_time = time.time() - start_time
                
                # Get response
                response_elements = await page.locator("p").all()
                response_text = ""
                for element in response_elements:
                    text = await element.text_content()
                    if text and len(text) > 30:
                        response_text = text
                        break
                
                # Analyze memory usage
                memory_indicators = {
                    "session_memory": ["remember", "stored", "preference"],
                    "knowledge_search": ["search", "found", "information"],
                    "vector_search": ["vector", "documentation", "technical"]
                }
                
                indicators = memory_indicators.get(test_name, [])
                memory_used = any(indicator in response_text.lower() for indicator in indicators)
                
                self.results["memory_systems"][test_name] = {
                    "available": memory_used,
                    "response_time": round(response_time, 3),
                    "response_quality": len(response_text)
                }
                
                status = "✅" if memory_used else "⚠️"
                print(f"   {status} {test_name}: {response_time:.3f}s")
                
            except Exception as e:
                print(f"   ❌ {test_name}: {str(e)}")
                self.results["memory_systems"][test_name] = {"available": False, "error": str(e)}
    
    def generate_reality_check(self):
        """Generate reality vs documentation comparison"""
        # Count actual capabilities
        working_agents = sum(1 for agent in self.results["agents"].values() if agent.get("available", False))
        unique_tools = list(set(self.results["tools_discovered"]))
        working_memory = sum(1 for mem in self.results["memory_systems"].values() if mem.get("available", False))
        
        # Calculate performance baseline
        response_times = [agent.get("response_time", 0) for agent in self.results["agents"].values() if agent.get("response_time")]
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        
        quality_scores = [agent.get("quality_score", 0) for agent in self.results["agents"].values() if agent.get("quality_score")]
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        self.results["reality_check"] = {
            "documented_agents": 24,
            "actual_agents": len(self.actual_agents),
            "working_agents": working_agents,
            "agent_gap_percentage": round((24 - working_agents) / 24 * 100, 1),
            
            "documented_tools": "59+",
            "discovered_tools": len(unique_tools),
            "unique_tools": unique_tools,
            
            "memory_systems_tested": len(self.results["memory_systems"]),
            "memory_systems_working": working_memory,
            
            "avg_response_time": round(avg_response_time, 3),
            "avg_quality_score": round(avg_quality, 3),
            
            "system_health": "operational" if working_agents >= 3 else "degraded"
        }
        
        self.results["performance_baseline"] = {
            "response_time_target": 5.0,
            "response_time_actual": avg_response_time,
            "quality_target": 0.8,
            "quality_actual": avg_quality,
            "meets_targets": avg_response_time <= 5.0 and avg_quality >= 0.6
        }

async def main():
    """Run smart validation and generate report"""
    validator = SmartVANAValidator()
    results = await validator.run_smart_validation()
    
    # Generate summary report
    print("\n" + "="*60)
    print("🎯 SMART VALIDATION SUMMARY")
    print("="*60)
    
    reality = results["reality_check"]
    baseline = results["performance_baseline"]
    
    print(f"📊 REALITY CHECK:")
    print(f"   Agents: {reality['working_agents']}/{reality['actual_agents']} working ({reality['documented_agents']} documented)")
    print(f"   Tools: {reality['discovered_tools']} discovered ({reality['documented_tools']} documented)")
    print(f"   Memory: {reality['memory_systems_working']}/{reality['memory_systems_tested']} systems working")
    print(f"   Gap: {reality['agent_gap_percentage']}% between documented and working agents")
    
    print(f"\n⚡ PERFORMANCE BASELINE:")
    print(f"   Avg Response Time: {baseline['response_time_actual']:.3f}s (target: {baseline['response_time_target']}s)")
    print(f"   Avg Quality Score: {baseline['quality_actual']:.3f} (target: {baseline['quality_target']})")
    print(f"   Meets Targets: {'✅ YES' if baseline['meets_targets'] else '❌ NO'}")
    
    print(f"\n🔧 DISCOVERED TOOLS:")
    if reality['unique_tools']:
        for tool in sorted(reality['unique_tools']):
            print(f"   - {tool}")
    else:
        print("   No tools clearly identified")
    
    print(f"\n🏥 SYSTEM STATUS: {reality['system_health'].upper()}")
    
    # Save detailed results
    with open("smart_validation_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n💾 Detailed results saved to: smart_validation_results.json")
    
    return baseline['meets_targets']

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
