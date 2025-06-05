# 📚 VANA Examples

Working code examples demonstrating VANA's multi-agent capabilities.

## 🎯 Example Categories

### 🤖 Agent Orchestration Examples
- **[Basic Agent Usage](basic-agent-usage.py)** - Simple agent interactions
- **[Multi-Agent Workflows](multi-agent-workflows.py)** - Complex orchestration patterns
- **[State Sharing](state-sharing-example.py)** - Google ADK state management

### ✈️ Travel Planning Examples
- **[Hotel Search](travel/hotel-search.py)** - Hotel discovery and comparison
- **[Flight Booking](travel/flight-booking.py)** - Flight search and booking workflow
- **[Complete Trip Planning](travel/complete-trip.py)** - End-to-end travel planning

### 💻 Development Examples
- **[Code Generation](development/code-generation.py)** - Automated code creation
- **[Testing Workflows](development/testing-workflow.py)** - Quality assurance automation
- **[Documentation Generation](development/docs-generation.py)** - Technical writing automation

### 🔍 Research Examples
- **[Web Research](research/web-research.py)** - Information gathering workflows
- **[Data Analysis](research/data-analysis.py)** - Statistical analysis and visualization
- **[Competitive Intelligence](research/competitive-intel.py)** - Market research automation

### 🛠️ Tool Development Examples
- **[Custom Tool Creation](tools/custom-tool.py)** - Building new tools
- **[Long-Running Tasks](tools/long-running-task.py)** - Asynchronous task management
- **[MCP Integration](tools/mcp-integration.py)** - External service integration

## 🚀 Quick Start Examples

### Basic Agent Interaction

```python
# examples/basic-interaction.py
import asyncio
from agents.vana.team import vana

async def basic_example():
    """Basic VANA interaction example."""
    
    # Simple echo test
    response = await vana.execute("echo 'Hello VANA'")
    print(f"Echo response: {response}")
    
    # File operation
    response = await vana.execute("list_directory '.'")
    print(f"Directory listing: {response}")
    
    # Web search
    response = await vana.execute("web_search 'latest AI developments'")
    print(f"Search results: {response}")

if __name__ == "__main__":
    asyncio.run(basic_example())
```

### Agent-as-Tools Pattern

```python
# examples/agent-tools-pattern.py
import asyncio
from agents.vana.team import vana

async def agent_tools_example():
    """Demonstrate agent-as-tools orchestration."""
    
    # Architecture analysis
    arch_response = await vana.execute(
        "architecture_tool 'Design a microservices API for e-commerce'"
    )
    print(f"Architecture analysis: {arch_response}")
    
    # UI design based on architecture
    ui_response = await vana.execute(
        "ui_tool 'Create user interface for the e-commerce API'"
    )
    print(f"UI design: {ui_response}")
    
    # DevOps planning
    devops_response = await vana.execute(
        "devops_tool 'Plan deployment for the e-commerce system'"
    )
    print(f"DevOps plan: {devops_response}")

if __name__ == "__main__":
    asyncio.run(agent_tools_example())
```

### Long-Running Task Example

```python
# examples/long-running-task.py
import asyncio
import time
from agents.vana.team import vana

async def long_running_example():
    """Demonstrate long-running task management."""
    
    # Start a long-running task
    response = await vana.execute(
        "competitive_intelligence_tool 'Analyze AI market trends 2024'"
    )
    print(f"Task started: {response}")
    
    # Extract task ID from response
    task_id = extract_task_id(response)
    
    # Monitor progress
    while True:
        status_response = await vana.execute(f"check_task_status '{task_id}'")
        print(f"Task status: {status_response}")
        
        if "completed" in status_response.lower():
            break
        
        await asyncio.sleep(10)  # Check every 10 seconds

def extract_task_id(response: str) -> str:
    """Extract task ID from response."""
    # Simple extraction - in practice, use regex or JSON parsing
    lines = response.split('\n')
    for line in lines:
        if 'Task ID' in line:
            return line.split(':')[1].strip()
    return ""

if __name__ == "__main__":
    asyncio.run(long_running_example())
```

## 📋 Example Usage Patterns

### 1. Sequential Workflow

```python
# Sequential execution with state sharing
async def sequential_workflow():
    # Step 1: Research
    research = await vana.execute("web_research_tool 'Python async best practices'")
    
    # Step 2: Analysis (uses research results from session state)
    analysis = await vana.execute("data_analysis_tool 'Analyze research findings'")
    
    # Step 3: Documentation (uses both previous results)
    docs = await vana.execute("documentation_tool 'Create best practices guide'")
    
    return docs
```

### 2. Parallel Execution

```python
# Parallel task execution
async def parallel_workflow():
    tasks = [
        vana.execute("hotel_search_tool 'Hotels in Tokyo'"),
        vana.execute("flight_search_tool 'Flights to Tokyo'"),
        vana.execute("web_research_tool 'Tokyo travel guide'")
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Combine results for itinerary planning
    itinerary = await vana.execute(
        "itinerary_planning_tool 'Plan Tokyo trip with search results'"
    )
    
    return itinerary
```

### 3. Error Handling

```python
# Robust error handling
async def robust_workflow():
    try:
        # Primary approach
        result = await vana.execute("code_generation_tool 'Create REST API'")
        
        if "error" in result.lower():
            # Fallback approach
            result = await vana.execute("web_search 'REST API examples Python'")
            result = await vana.execute(f"architecture_tool 'Design API based on: {result}'")
        
        return result
        
    except Exception as e:
        # Final fallback
        return await vana.execute(f"echo 'Error occurred: {e}'")
```

## 🔧 Development Examples

### Custom Agent Creation

```python
# examples/custom-agent.py
from google.adk.agents import LlmAgent
from lib._tools import adk_read_file, adk_write_file, adk_web_search

# Create custom agent
custom_agent = LlmAgent(
    name="data_scientist",
    model="gemini-2.0-flash",
    description="📊 Data Science Specialist",
    output_key="data_science_results",
    instruction="""You are a Data Science Specialist...
    
    ## Core Expertise:
    - Statistical analysis and modeling
    - Data visualization and reporting
    - Machine learning implementation
    
    ## Tools Available:
    - File operations for data access
    - Web search for research
    - Analysis and visualization capabilities
    """,
    tools=[adk_read_file, adk_write_file, adk_web_search]
)

# Use custom agent
async def use_custom_agent():
    response = await custom_agent.execute("Analyze sales data trends")
    return response
```

### Custom Tool Creation

```python
# examples/custom-tool.py
from google.adk.tools import FunctionTool
import logging

logger = logging.getLogger(__name__)

def data_processor(data_source: str) -> str:
    """📊 Custom data processing tool."""
    try:
        # Simulate data processing
        result = f"Processed data from: {data_source}"
        logger.info(f"Data processing completed: {data_source}")
        return result
    except Exception as e:
        logger.error(f"Data processing error: {e}")
        return f"❌ Error processing data: {str(e)}"

# Create ADK tool
adk_data_processor = FunctionTool(func=data_processor)
adk_data_processor.name = "data_processor"

# Use in agent
custom_agent_with_tool = LlmAgent(
    name="enhanced_data_scientist",
    model="gemini-2.0-flash",
    description="📊 Enhanced Data Science Specialist",
    tools=[adk_data_processor, adk_read_file, adk_write_file]
)
```

## 🧪 Testing Examples

### Unit Testing

```python
# examples/test_examples.py
import pytest
import asyncio
from agents.vana.team import vana

@pytest.mark.asyncio
async def test_basic_functionality():
    """Test basic VANA functionality."""
    response = await vana.execute("echo 'test message'")
    assert "test message" in response
    assert not response.startswith("❌")

@pytest.mark.asyncio
async def test_file_operations():
    """Test file operation tools."""
    # Test directory listing
    response = await vana.execute("list_directory '.'")
    assert "main.py" in response or "agents" in response
    
    # Test file existence check
    response = await vana.execute("file_exists 'main.py'")
    assert "exists" in response.lower()

@pytest.mark.asyncio
async def test_agent_tools():
    """Test agent-as-tools functionality."""
    response = await vana.execute("architecture_tool 'Simple web API design'")
    assert "Task ID" in response or "architecture" in response.lower()
```

### Integration Testing

```python
# examples/integration_test.py
import asyncio
from agents.vana.team import vana

async def test_full_workflow():
    """Test complete multi-agent workflow."""
    
    # Research phase
    research = await vana.execute("web_research_tool 'Python FastAPI tutorial'")
    assert "Task ID" in research
    
    # Development phase
    code = await vana.execute("code_generation_tool 'Create FastAPI hello world'")
    assert "Task ID" in code
    
    # Testing phase
    tests = await vana.execute("testing_tool 'Create tests for FastAPI app'")
    assert "Task ID" in tests
    
    # Documentation phase
    docs = await vana.execute("documentation_tool 'Document FastAPI application'")
    assert "Task ID" in docs
    
    print("✅ Full workflow test completed successfully")

if __name__ == "__main__":
    asyncio.run(test_full_workflow())
```

## 📊 Performance Examples

### Monitoring and Metrics

```python
# examples/performance_monitoring.py
import asyncio
import time
from agents.vana.team import vana

async def performance_test():
    """Monitor VANA performance metrics."""
    
    start_time = time.time()
    
    # Test multiple operations
    operations = [
        "echo 'performance test'",
        "get_health_status",
        "list_directory '.'",
        "web_search 'AI news'"
    ]
    
    results = []
    for operation in operations:
        op_start = time.time()
        response = await vana.execute(operation)
        op_time = time.time() - op_start
        
        results.append({
            "operation": operation,
            "time": op_time,
            "success": not response.startswith("❌")
        })
    
    total_time = time.time() - start_time
    
    # Print performance report
    print(f"Performance Test Results:")
    print(f"Total time: {total_time:.2f}s")
    print(f"Operations: {len(operations)}")
    print(f"Average time per operation: {total_time/len(operations):.2f}s")
    
    for result in results:
        status = "✅" if result["success"] else "❌"
        print(f"{status} {result['operation']}: {result['time']:.2f}s")

if __name__ == "__main__":
    asyncio.run(performance_test())
```

## 🚀 Production Examples

### Health Monitoring

```python
# examples/health_monitoring.py
import asyncio
import json
from agents.vana.team import vana

async def health_check():
    """Comprehensive health check example."""
    
    health_checks = [
        ("System Health", "get_health_status"),
        ("Tool Validation", "echo 'health check'"),
        ("File System", "list_directory '.'"),
        ("Search Capability", "web_search 'test query'")
    ]
    
    results = {}
    
    for check_name, command in health_checks:
        try:
            response = await vana.execute(command)
            results[check_name] = {
                "status": "healthy" if not response.startswith("❌") else "unhealthy",
                "response": response[:100] + "..." if len(response) > 100 else response
            }
        except Exception as e:
            results[check_name] = {
                "status": "error",
                "error": str(e)
            }
    
    # Generate health report
    print(json.dumps(results, indent=2))
    
    # Overall health status
    healthy_count = sum(1 for r in results.values() if r.get("status") == "healthy")
    overall_health = "HEALTHY" if healthy_count == len(health_checks) else "DEGRADED"
    
    print(f"\nOverall System Health: {overall_health}")
    print(f"Healthy Components: {healthy_count}/{len(health_checks)}")

if __name__ == "__main__":
    asyncio.run(health_check())
```

---

**📚 Next Steps:**
- Run examples with `python examples/example_name.py`
- Modify examples for your specific use cases
- Create custom agents and tools based on patterns
- Contribute new examples to the repository
