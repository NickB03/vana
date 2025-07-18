#!/usr/bin/env python3
"""
Collect baseline metrics for agent tools performance
"""

import json
import time
import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent))

from lib._tools.agent_tools import (
    create_agent_tool,
    get_adk_architecture_tool,
    get_adk_ui_tool,
    get_adk_devops_tool,
    get_adk_qa_tool,
    initialize_agent_tools,
    AgentTool
)


def measure_initialization_time():
    """Measure time to initialize agent tools"""
    # Clear any existing initialization
    from lib._tools.agent_tools import _agent_tools
    _agent_tools.adk_architecture_tool = None
    _agent_tools.adk_ui_tool = None
    _agent_tools.adk_devops_tool = None
    _agent_tools.adk_qa_tool = None
    
    start = time.time()
    initialize_agent_tools()
    end = time.time()
    
    return end - start


def measure_tool_creation_time():
    """Measure time to create individual tools"""
    from unittest.mock import Mock
    
    mock_agent = Mock()
    mock_agent.name = "test_agent"
    mock_agent.description = "Test agent"
    
    start = time.time()
    tool = create_agent_tool(mock_agent)
    end = time.time()
    
    return end - start


def measure_getter_performance():
    """Measure performance of getter functions"""
    times = {}
    
    # Measure each getter
    getters = [
        ("architecture", get_adk_architecture_tool),
        ("ui", get_adk_ui_tool),
        ("devops", get_adk_devops_tool),
        ("qa", get_adk_qa_tool)
    ]
    
    for name, getter in getters:
        start = time.time()
        tool = getter()
        end = time.time()
        times[f"get_{name}_tool"] = end - start
        
    return times


def measure_execution_simulation():
    """Measure simulated execution time"""
    from unittest.mock import Mock
    
    mock_agent = Mock()
    mock_agent.name = "architecture_specialist"
    
    tool = AgentTool(mock_agent)
    
    start = time.time()
    result = tool.execute("Test request for baseline metrics")
    end = time.time()
    
    return {
        "execution_time": end - start,
        "success": result.success,
        "result_length": len(result.result)
    }


def count_code_metrics():
    """Count lines and complexity metrics"""
    import ast
    
    file_path = Path(__file__).parent.parent / "lib" / "_tools" / "agent_tools.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
        
    # Count lines
    lines = content.split('\n')
    total_lines = len(lines)
    code_lines = sum(1 for line in lines if line.strip() and not line.strip().startswith('#'))
    
    # Parse AST for complexity
    tree = ast.parse(content)
    
    classes = sum(1 for node in ast.walk(tree) if isinstance(node, ast.ClassDef))
    functions = sum(1 for node in ast.walk(tree) if isinstance(node, ast.FunctionDef))
    
    return {
        "total_lines": total_lines,
        "code_lines": code_lines,
        "comment_lines": total_lines - code_lines,
        "classes": classes,
        "functions": functions
    }


def main():
    """Collect all baseline metrics"""
    print("Collecting baseline metrics for agent tools...")
    
    metrics = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "initialization_time": measure_initialization_time(),
        "tool_creation_time": measure_tool_creation_time(),
        "getter_performance": measure_getter_performance(),
        "execution_simulation": measure_execution_simulation(),
        "code_metrics": count_code_metrics()
    }
    
    # Calculate averages
    getter_times = list(metrics["getter_performance"].values())
    metrics["average_getter_time"] = sum(getter_times) / len(getter_times)
    
    # Output results
    print(json.dumps(metrics, indent=2))
    
    # Save to file if specified
    if len(sys.argv) > 1 and sys.argv[1] == "--save":
        output_dir = Path(__file__).parent.parent / "metrics"
        output_dir.mkdir(exist_ok=True)
        
        with open(output_dir / "baseline.json", 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"\nMetrics saved to {output_dir / 'baseline.json'}")


if __name__ == "__main__":
    main()