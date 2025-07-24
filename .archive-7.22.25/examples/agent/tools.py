"""
VANA Tool Implementation Patterns
Demonstrates how to create and use tools with ADK agents
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json
import re
from pathlib import Path
from google.adk.tools import FunctionTool


# Pattern 1: Basic Tool Function
def simple_text_processor(text: str) -> str:
    """
    Basic tool that processes text.
    
    Args:
        text: Input text to process
        
    Returns:
        Processed text with analysis
    """
    word_count = len(text.split())
    char_count = len(text)
    
    return f"Text analysis: {word_count} words, {char_count} characters"


# Pattern 2: Tool with Structured Input/Output
@dataclass
class CodeAnalysis:
    """Structured output for code analysis."""
    language: str
    lines_of_code: int
    complexity: str
    issues: List[str]


def analyze_code(code: str, language: str = "python") -> Dict[str, Any]:
    """
    Analyzes code and returns structured results.
    
    Args:
        code: Source code to analyze
        language: Programming language
        
    Returns:
        Dictionary with analysis results
    """
    lines = code.strip().split('\n')
    
    # Simple analysis logic
    issues = []
    if "eval(" in code:
        issues.append("Unsafe eval() usage detected")
    if "password" in code.lower() and "=" in code:
        issues.append("Potential hardcoded password")
    
    analysis = CodeAnalysis(
        language=language,
        lines_of_code=len(lines),
        complexity="medium" if len(lines) > 50 else "low",
        issues=issues
    )
    
    return {
        "language": analysis.language,
        "lines_of_code": analysis.lines_of_code,
        "complexity": analysis.complexity,
        "issues": analysis.issues
    }


# Pattern 3: Tool with Error Handling
def safe_file_reader(file_path: str) -> str:
    """
    Safely reads file content with comprehensive error handling.
    
    Args:
        file_path: Path to file
        
    Returns:
        File content or error message
    """
    try:
        path = Path(file_path)
        
        # Validation
        if not path.exists():
            return f"Error: File '{file_path}' does not exist"
        
        if not path.is_file():
            return f"Error: '{file_path}' is not a file"
        
        # Size check
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > 10:
            return f"Error: File too large ({size_mb:.1f}MB). Maximum 10MB allowed"
        
        # Read file
        content = path.read_text(encoding='utf-8')
        return f"Successfully read {len(content)} characters from {file_path}"
        
    except PermissionError:
        return f"Error: Permission denied for '{file_path}'"
    except UnicodeDecodeError:
        return f"Error: Unable to decode file '{file_path}' as UTF-8"
    except Exception as e:
        return f"Error reading file: {str(e)}"


# Pattern 4: Async-Compatible Tool (synchronous implementation)
def web_search_tool(query: str, max_results: int = 5) -> str:
    """
    Web search tool (mock implementation for pattern demonstration).
    In production, this would use actual search APIs.
    
    Args:
        query: Search query
        max_results: Maximum number of results
        
    Returns:
        Search results as formatted string
    """
    # Mock search results
    mock_results = [
        {"title": f"Result {i+1} for: {query}", 
         "url": f"https://example.com/{i+1}",
         "snippet": f"This is a snippet for result {i+1}"}
        for i in range(min(max_results, 3))
    ]
    
    # Format results
    formatted = f"Search results for '{query}':\n\n"
    for i, result in enumerate(mock_results, 1):
        formatted += f"{i}. {result['title']}\n"
        formatted += f"   URL: {result['url']}\n"
        formatted += f"   {result['snippet']}\n\n"
    
    return formatted


# Pattern 5: Tool with State/Context
class StatefulAnalyzer:
    """Tool that maintains state across calls."""
    
    def __init__(self):
        self.analysis_history = []
        self.total_processed = 0
    
    def analyze_with_context(self, data: str) -> str:
        """
        Analyze data while maintaining context from previous analyses.
        
        Args:
            data: Data to analyze
            
        Returns:
            Analysis with context
        """
        self.total_processed += 1
        
        # Perform analysis
        analysis = {
            "data_length": len(data),
            "timestamp": "2024-01-18T10:00:00Z",
            "session_count": self.total_processed
        }
        
        self.analysis_history.append(analysis)
        
        # Include context in response
        return f"""Analysis #{self.total_processed}:
- Current data length: {analysis['data_length']}
- Total items processed: {self.total_processed}
- Average length: {sum(a['data_length'] for a in self.analysis_history) / len(self.analysis_history):.1f}
"""


# Pattern 6: Composite Tool
def comprehensive_analyzer(
    content: str,
    analysis_type: str = "full"
) -> Dict[str, Any]:
    """
    Composite tool that combines multiple analysis functions.
    
    Args:
        content: Content to analyze
        analysis_type: Type of analysis (full, basic, security)
        
    Returns:
        Comprehensive analysis results
    """
    results = {
        "type": analysis_type,
        "content_preview": content[:100] + "..." if len(content) > 100 else content
    }
    
    # Basic analysis (always included)
    results["basic"] = {
        "length": len(content),
        "lines": content.count('\n') + 1,
        "words": len(content.split())
    }
    
    # Security analysis
    if analysis_type in ["full", "security"]:
        security_issues = []
        
        # Check for common security patterns
        patterns = {
            r"password\s*=\s*['\"].*['\"]": "Hardcoded password detected",
            r"api_key\s*=\s*['\"].*['\"]": "Hardcoded API key detected",
            r"eval\(": "Dangerous eval() usage",
            r"exec\(": "Dangerous exec() usage",
            r"os\.system\(": "OS command execution detected"
        }
        
        for pattern, message in patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                security_issues.append(message)
        
        results["security"] = {
            "issues_found": len(security_issues),
            "issues": security_issues
        }
    
    # Code quality analysis
    if analysis_type == "full" and any(content.count(x) > 0 for x in ['def ', 'class ', 'function']):
        results["code_quality"] = {
            "has_functions": 'def ' in content or 'function' in content,
            "has_classes": 'class ' in content,
            "has_comments": '#' in content or '/*' in content or '//' in content,
            "estimated_complexity": "high" if results["basic"]["lines"] > 100 else "low"
        }
    
    return results


# Pattern 7: Tool Factory
def create_custom_tool(tool_name: str, tool_config: Dict[str, Any]) -> callable:
    """
    Factory function for creating custom tools dynamically.
    
    Args:
        tool_name: Name of the tool
        tool_config: Configuration for the tool
        
    Returns:
        Configured tool function
    """
    def custom_tool(input_data: str) -> str:
        """Dynamically created tool."""
        # Apply configuration
        prefix = tool_config.get("prefix", "")
        suffix = tool_config.get("suffix", "")
        transform = tool_config.get("transform", "none")
        
        # Process input
        result = input_data
        if transform == "uppercase":
            result = result.upper()
        elif transform == "lowercase":
            result = result.lower()
        
        return f"{prefix}{result}{suffix}"
    
    # Set function name for ADK
    custom_tool.__name__ = tool_name
    return custom_tool


# Tool Registration Pattern
class ToolRegistry:
    """Registry for managing available tools."""
    
    def __init__(self):
        self.tools = {}
    
    def register(self, name: str, func: callable, description: str = ""):
        """Register a tool function."""
        self.tools[name] = {
            "function": func,
            "description": description or func.__doc__
        }
    
    def get_tool(self, name: str) -> Optional[callable]:
        """Get a registered tool."""
        tool_info = self.tools.get(name)
        return tool_info["function"] if tool_info else None
    
    def list_tools(self) -> List[str]:
        """List all registered tools."""
        return list(self.tools.keys())
    
    def create_adk_tools(self) -> List[FunctionTool]:
        """Create ADK FunctionTool instances for all registered tools."""
        return [FunctionTool(info["function"]) for info in self.tools.values()]


# Example tool initialization
def initialize_vana_tools() -> ToolRegistry:
    """Initialize standard VANA tools."""
    registry = ToolRegistry()
    
    # Register core tools
    registry.register("text_processor", simple_text_processor, 
                     "Process and analyze text")
    registry.register("code_analyzer", analyze_code,
                     "Analyze source code for issues")
    registry.register("file_reader", safe_file_reader,
                     "Safely read file contents")
    registry.register("web_search", web_search_tool,
                     "Search the web for information")
    registry.register("comprehensive_analyzer", comprehensive_analyzer,
                     "Perform comprehensive content analysis")
    
    return registry


# Usage example
if __name__ == "__main__":
    # Initialize tools
    tool_registry = initialize_vana_tools()
    
    print(f"Available tools: {tool_registry.list_tools()}")
    
    # Example tool usage
    analyzer = tool_registry.get_tool("code_analyzer")
    if analyzer:
        result = analyzer("def hello():\n    password = '123456'\n    print('Hello')", "python")
        print(f"\nCode analysis result: {json.dumps(result, indent=2)}")
    
    # Create ADK tools
    adk_tools = tool_registry.create_adk_tools()
    print(f"\nCreated {len(adk_tools)} ADK tools")