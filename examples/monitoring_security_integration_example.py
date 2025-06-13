"""
VANA Monitoring and Security Integration Example

This example demonstrates how to integrate the monitoring and security
components with the existing VANA agent system.
"""

import asyncio
import time
from typing import Dict, Any
from lib.monitoring import get_monitoring
from lib.security import get_security
from lib.logging_config import get_logger
logger = get_logger("vana.monitoring_security_integration_example")

from lib.logging import StructuredLogger

class VanaAgentWithMonitoring:
    """Example VANA agent with integrated monitoring and security."""
    
    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.monitoring = get_monitoring()
        self.security = get_security()
        self.logger = StructuredLogger(f"agent.{agent_name}")
        
        # Setup APM for automatic monitoring
        self.apm = self.monitoring.get_apm()
    
    def validate_and_process_input(self, user_input: str, source_ip: str = "unknown") -> Dict[str, Any]:
        """Validate input with security checks and monitoring."""
        start_time = time.time()
        
        try:
            # Security validation
            is_valid, validation_message = self.security.validate_agent_input(user_input, source_ip)
            if not is_valid:
                self.logger.warning(
                    "Input validation failed",
                    agent=self.agent_name,
                    source_ip=source_ip,
                    reason=validation_message,
                    input_length=len(user_input)
                )
                return {
                    "success": False,
                    "error": "Input validation failed",
                    "details": validation_message
                }
            
            # Rate limiting check
            if not self.security.check_request_rate_limit(source_ip, source_ip):
                self.logger.warning(
                    "Rate limit exceeded",
                    agent=self.agent_name,
                    source_ip=source_ip
                )
                return {
                    "success": False,
                    "error": "Rate limit exceeded",
                    "details": "Too many requests"
                }
            
            # Process the input (mock processing)
            result = self._process_input(user_input)
            
            self.logger.info(
                "Input processed successfully",
                agent=self.agent_name,
                source_ip=source_ip,
                processing_time=time.time() - start_time
            )
            
            return {
                "success": True,
                "result": result,
                "processing_time": time.time() - start_time
            }
            
        except Exception as e:
            self.logger.error(
                "Error processing input",
                agent=self.agent_name,
                source_ip=source_ip,
                error=str(e),
                processing_time=time.time() - start_time
            )
            return {
                "success": False,
                "error": "Processing error",
                "details": str(e)
            }
        finally:
            # Record response time
            duration = time.time() - start_time
            self.monitoring.record_agent_response(
                self.agent_name,
                duration,
                success=True  # You could determine this based on actual success
            )
    
    def _process_input(self, user_input: str) -> str:
        """Mock input processing with automatic monitoring."""
        # Simulate processing time
        time.sleep(0.1)
        return f"Processed: {user_input[:50]}..."

    async def async_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Example async task with monitoring."""
        self.logger.info(
            "Starting async task",
            agent=self.agent_name,
            task_type=task_data.get("type", "unknown")
        )
        
        # Simulate async work
        await asyncio.sleep(0.2)
        
        result = {
            "task_id": task_data.get("id", "unknown"),
            "status": "completed",
            "result": "Task completed successfully"
        }
        
        self.logger.info(
            "Async task completed",
            agent=self.agent_name,
            task_id=result["task_id"]
        )
        
        return result
    
    def execute_tool(self, tool_name: str, tool_params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a tool with monitoring."""
        start_time = time.time()
        
        try:
            self.logger.debug(
                "Executing tool",
                agent=self.agent_name,
                tool=tool_name,
                params=tool_params
            )
            
            # Mock tool execution
            result = self._mock_tool_execution(tool_name, tool_params)
            success = True
            
        except Exception as e:
            self.logger.error(
                "Tool execution failed",
                agent=self.agent_name,
                tool=tool_name,
                error=str(e)
            )
            result = {"error": str(e)}
            success = False
        
        finally:
            # Record tool execution metrics
            duration = time.time() - start_time
            self.monitoring.record_tool_execution(tool_name, duration, success)
        
        return result
    
    def _mock_tool_execution(self, tool_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Mock tool execution."""
        # Simulate different execution times for different tools
        execution_times = {
            "search_tool": 0.1,
            "complex_analysis": 0.5,
            "quick_lookup": 0.05
        }
        
        time.sleep(execution_times.get(tool_name, 0.1))
        
        return {
            "tool": tool_name,
            "result": f"Mock result for {tool_name}",
            "params": params
        }
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get agent status including monitoring and security info."""
        return {
            "agent_name": self.agent_name,
            "monitoring": self.monitoring.get_health_status(),
            "security": self.security.get_security_status(),
            "recent_metrics": {
                "response_times": len(self.monitoring.monitor.get_metrics(f"response_time.agent.{self.agent_name}")),
                "alerts": len([a for a in self.monitoring.monitor.alerts if time.time() - a["timestamp"] < 300])
            }
        }

# Example usage
async def main():
    """Example usage of monitored VANA agent."""
    # Create agent with monitoring
    agent = VanaAgentWithMonitoring("example_agent")
    
    logger.info("=== VANA Agent with Monitoring and Security Example ===\n")
    
    # Example 1: Process valid input
    logger.info("1. Processing valid input:")
    result = agent.validate_and_process_input("Hello, how can you help me?", "192.168.1.100")
    logger.info(f"Result: {result}\n")
    
    # Example 2: Process invalid input (XSS attempt)
    logger.info("2. Processing invalid input (XSS attempt):")
    result = agent.validate_and_process_input("<script>alert('xss')</script>", "192.168.1.101")
    logger.info(f"Result: {result}\n")
    
    # Example 3: Execute tools
    logger.info("3. Executing tools:")
    tool_result = agent.execute_tool("search_tool", {"query": "test search"})
    logger.info(f"Tool result: {tool_result}\n")
    
    # Example 4: Async task
    logger.info("4. Executing async task:")
    async_result = await agent.async_task({"id": "task_123", "type": "analysis"})
    logger.info(f"Async result: {async_result}\n")
    
    # Example 5: Rate limiting test
    logger.info("5. Testing rate limiting:")
    for i in range(7):  # Should hit rate limit
        result = agent.validate_and_process_input(f"Request {i}", "192.168.1.102")
        logger.error("%s", f"Request {i}: {'Success' if result['success'] else 'Failed - ' + result['error']}")
    logger.info("")
    
    # Example 6: Get agent status
    logger.info("6. Agent status:")
    status = agent.get_agent_status()
    logger.info(f"Status: {status}\n")
    
    # Example 7: System metrics
    logger.info("7. Recording system metrics:")
    agent.monitoring.record_system_metrics()
    logger.info("System metrics recorded\n")
    
    logger.info("=== Example completed ===")

if __name__ == "__main__":
    asyncio.run(main())
