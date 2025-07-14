"""
Agent-as-Tool Pattern Implementation for VANA Phase 3
Direct tool access to specialist agents with context awareness.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Callable

from google.adk.tools import FunctionTool

from lib.context.specialist_context import SpecialistContext, create_specialist_context
from lib.logging_config import get_logger

logger = get_logger("vana.agent_as_tool")


class AgentToolWrapper:
    """
    Wrapper for specialist agents to be used as direct tools.
    Implements the Agent-as-Tool pattern from Phase 3 roadmap.
    """
    
    def __init__(self, specialist_agent, specialist_name: str, 
                 description: str, context_aware: bool = True):
        self.specialist_agent = specialist_agent
        self.specialist_name = specialist_name
        self.description = description
        self.context_aware = context_aware
        self.execution_count = 0
        self.total_execution_time = 0.0
        
    async def execute_with_context(self, request: str, context: Optional[SpecialistContext] = None,
                                 quick_mode: bool = False) -> Dict[str, Any]:
        """Execute specialist with context awareness"""
        start_time = time.time()
        
        try:
            # Create or use provided context
            if context is None and self.context_aware:
                context = await create_specialist_context(request)
            
            # Update routing in context
            if context:
                context.execution_metadata.add_routing_step(self.specialist_name)
                
                # Add to context for future reference
                if quick_mode:
                    context.add_specialist_insight(self.specialist_name, {
                        "type": "quick_execution",
                        "request": request[:100] + "...",
                        "execution_mode": "direct_tool"
                    })
            
            # Execute the specialist
            if hasattr(self.specialist_agent, 'run'):
                # Standard ADK agent execution
                result = self.specialist_agent.run(request, context.to_session_data() if context else {})
            elif hasattr(self.specialist_agent, 'execute'):
                # Custom execution method
                result = self.specialist_agent.execute(request, context)
            else:
                # Fallback to calling the agent directly
                result = str(self.specialist_agent)
            
            execution_time = time.time() - start_time
            
            # Update metrics
            self.execution_count += 1
            self.total_execution_time += execution_time
            
            # Update context with results
            if context:
                context.add_specialist_insight(self.specialist_name, {
                    "result": result,
                    "execution_time": execution_time,
                    "execution_mode": "direct_tool",
                    "quick_mode": quick_mode
                })
                context.add_performance_metric(f"{self.specialist_name}_execution_time", execution_time)
            
            logger.info(f"Agent-as-Tool execution: {self.specialist_name} completed in {execution_time:.2f}s")
            
            return {
                "success": True,
                "result": result,
                "execution_time": execution_time,
                "specialist": self.specialist_name,
                "context_used": context is not None
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Agent-as-Tool execution failed for {self.specialist_name}: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "execution_time": execution_time,
                "specialist": self.specialist_name,
                "context_used": context is not None
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for this tool"""
        avg_execution_time = (self.total_execution_time / self.execution_count 
                            if self.execution_count > 0 else 0.0)
        
        return {
            "specialist_name": self.specialist_name,
            "execution_count": self.execution_count,
            "total_execution_time": self.total_execution_time,
            "average_execution_time": avg_execution_time,
            "performance_rating": "excellent" if avg_execution_time < 1.0 else 
                                "good" if avg_execution_time < 3.0 else "needs_improvement"
        }


class AgentToolRegistry:
    """Registry for managing agent-as-tool instances"""
    
    def __init__(self):
        self.tools: Dict[str, AgentToolWrapper] = {}
        self.logger = get_logger("vana.agent_tool_registry")
        
    def register_specialist_tool(self, tool_name: str, specialist_agent, 
                               specialist_name: str, description: str,
                               context_aware: bool = True) -> AgentToolWrapper:
        """Register a specialist as a tool"""
        
        tool_wrapper = AgentToolWrapper(
            specialist_agent=specialist_agent,
            specialist_name=specialist_name,
            description=description,
            context_aware=context_aware
        )
        
        self.tools[tool_name] = tool_wrapper
        self.logger.info(f"Registered agent-as-tool: {tool_name} -> {specialist_name}")
        
        return tool_wrapper
    
    def get_tool(self, tool_name: str) -> Optional[AgentToolWrapper]:
        """Get a registered tool"""
        return self.tools.get(tool_name)
    
    def list_tools(self) -> List[str]:
        """List all registered tools"""
        return list(self.tools.keys())
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary for all tools"""
        summary = {
            "total_tools": len(self.tools),
            "tool_metrics": {}
        }
        
        for tool_name, tool_wrapper in self.tools.items():
            summary["tool_metrics"][tool_name] = tool_wrapper.get_performance_metrics()
        
        return summary


# Global registry instance
agent_tool_registry = AgentToolRegistry()


def create_specialist_tools(specialists: Dict[str, Any]) -> List[FunctionTool]:
    """
    Create FunctionTool instances for specialists using Agent-as-Tool pattern.
    This implements the Phase 3 roadmap requirement for direct tool access.
    """
    
    tools = []
    
    # Security specialist tool
    if "security" in specialists and specialists["security"]:
        security_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="quick_security_scan",
            specialist_agent=specialists["security"],
            specialist_name="security_specialist",
            description="Quick security vulnerability check and analysis"
        )
        
        def security_tool_func(code_or_request: str) -> str:
            """Quick security scan for code or system analysis"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            result = loop.run_until_complete(
                security_wrapper.execute_with_context(code_or_request, quick_mode=True)
            )
            
            if result["success"]:
                return f"Security Analysis: {result['result']}"
            else:
                return f"Security scan failed: {result['error']}"
        
        tool = FunctionTool(func=security_tool_func)
        tool.name = "quick_security_scan"
        tool.description = "Quick security vulnerability check and analysis for code or systems"
        tools.append(tool)
    
    # Architecture specialist tool  
    if "architecture" in specialists and specialists["architecture"]:
        arch_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="architecture_review",
            specialist_agent=specialists["architecture"],
            specialist_name="architecture_specialist", 
            description="Quick architecture review and design pattern analysis"
        )
        
        def architecture_tool_func(code_or_design: str) -> str:
            """Quick architecture review and pattern analysis"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(
                arch_wrapper.execute_with_context(code_or_design, quick_mode=True)
            )
            
            if result["success"]:
                return f"Architecture Review: {result['result']}"
            else:
                return f"Architecture review failed: {result['error']}"
        
        tool = FunctionTool(func=architecture_tool_func)
        tool.name = "architecture_review"
        tool.description = "Quick architecture review and design pattern analysis"
        tools.append(tool)
    
    # Data science specialist tool
    if "data_science" in specialists and specialists["data_science"]:
        data_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="data_stats",
            specialist_agent=specialists["data_science"],
            specialist_name="data_science_specialist",
            description="Quick statistical analysis and data insights"
        )
        
        def data_science_tool_func(data_request: str) -> str:
            """Get basic statistics and insights for data"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(
                data_wrapper.execute_with_context(data_request, quick_mode=True)
            )
            
            if result["success"]:
                return f"Data Analysis: {result['result']}"
            else:
                return f"Data analysis failed: {result['error']}"
        
        tool = FunctionTool(func=data_science_tool_func)
        tool.name = "data_stats"
        tool.description = "Quick statistical analysis and data insights"
        tools.append(tool)
    
    # QA specialist tool
    if "qa" in specialists and specialists["qa"]:
        qa_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="qa_quick_check",
            specialist_agent=specialists["qa"],
            specialist_name="qa_specialist",
            description="Quick quality assurance and testing analysis"
        )
        
        def qa_tool_func(code_or_test: str) -> str:
            """Quick QA check and test analysis"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(
                qa_wrapper.execute_with_context(code_or_test, quick_mode=True)
            )
            
            if result["success"]:
                return f"QA Analysis: {result['result']}"
            else:
                return f"QA check failed: {result['error']}"
        
        tool = FunctionTool(func=qa_tool_func)
        tool.name = "qa_quick_check"
        tool.description = "Quick quality assurance and testing analysis"
        tools.append(tool)
    
    # UI specialist tool
    if "ui" in specialists and specialists["ui"]:
        ui_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="ui_component_gen",
            specialist_agent=specialists["ui"],
            specialist_name="ui_specialist",
            description="Quick UI component generation and analysis"
        )
        
        def ui_tool_func(ui_request: str) -> str:
            """Generate UI components or analyze interface design"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(
                ui_wrapper.execute_with_context(ui_request, quick_mode=True)
            )
            
            if result["success"]:
                return f"UI Analysis: {result['result']}"
            else:
                return f"UI analysis failed: {result['error']}"
        
        tool = FunctionTool(func=ui_tool_func)
        tool.name = "ui_component_gen"
        tool.description = "Quick UI component generation and analysis"
        tools.append(tool)
    
    # DevOps specialist tool
    if "devops" in specialists and specialists["devops"]:
        devops_wrapper = agent_tool_registry.register_specialist_tool(
            tool_name="devops_config",
            specialist_agent=specialists["devops"],
            specialist_name="devops_specialist",
            description="Quick DevOps configuration and deployment analysis"
        )
        
        def devops_tool_func(devops_request: str) -> str:
            """Quick DevOps configuration and deployment analysis"""
            try:
                loop = asyncio.get_event_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
            result = loop.run_until_complete(
                devops_wrapper.execute_with_context(devops_request, quick_mode=True)
            )
            
            if result["success"]:
                return f"DevOps Analysis: {result['result']}"
            else:
                return f"DevOps analysis failed: {result['error']}"
        
        tool = FunctionTool(func=devops_tool_func)
        tool.name = "devops_config"
        tool.description = "Quick DevOps configuration and deployment analysis"
        tools.append(tool)
    
    logger.info(f"Created {len(tools)} agent-as-tool functions")
    return tools


def get_agent_tool_performance_report() -> str:
    """Get formatted performance report for all agent tools"""
    summary = agent_tool_registry.get_performance_summary()
    
    report = f"## Agent-as-Tool Performance Report\n\n"
    report += f"**Total Tools Registered**: {summary['total_tools']}\n\n"
    
    for tool_name, metrics in summary["tool_metrics"].items():
        report += f"### {tool_name}\n"
        report += f"- **Specialist**: {metrics['specialist_name']}\n"
        report += f"- **Executions**: {metrics['execution_count']}\n"
        report += f"- **Avg Time**: {metrics['average_execution_time']:.2f}s\n"
        report += f"- **Rating**: {metrics['performance_rating']}\n\n"
    
    return report


# Export main classes and functions
__all__ = [
    "AgentToolWrapper",
    "AgentToolRegistry", 
    "agent_tool_registry",
    "create_specialist_tools",
    "get_agent_tool_performance_report"
]