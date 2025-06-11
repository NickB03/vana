"""
Code Debugging Tool

Advanced debugging capabilities for code analysis and error resolution.
"""

import ast
import re
import logging
from typing import Dict, Any, List, Optional

from lib.sandbox.core.security_manager import SecurityManager

logger = logging.getLogger(__name__)


async def debug_code_tool(
    language: str,
    code: str,
    error_message: Optional[str] = None,
    analysis_level: str = "standard"
) -> Dict[str, Any]:
    """
    Analyze code for potential issues and provide debugging insights.
    
    Args:
        language: Programming language (python, javascript, shell)
        code: Code to analyze
        error_message: Optional error message to analyze
        analysis_level: Level of analysis (basic, standard, detailed)
        
    Returns:
        Comprehensive debugging analysis and recommendations
    """
    try:
        analysis = {
            "language": language,
            "analysis_level": analysis_level,
            "code_metrics": _analyze_code_metrics(code),
            "potential_issues": [],
            "recommendations": [],
            "security_analysis": await _analyze_security(code, language)
        }
        
        # Language-specific analysis
        if language == "python":
            analysis.update(await _debug_python_code(code, error_message, analysis_level))
        elif language == "javascript":
            analysis.update(await _debug_javascript_code(code, error_message, analysis_level))
        elif language == "shell":
            analysis.update(await _debug_shell_code(code, error_message, analysis_level))
        
        # Error-specific analysis
        if error_message:
            analysis["error_analysis"] = _analyze_error_message(error_message, language)
        
        # Generate overall recommendations
        analysis["overall_recommendations"] = _generate_recommendations(analysis)
        
        return analysis
        
    except Exception as e:
        logger.error(f"Code debugging failed: {str(e)}")
        return {
            "error": f"Debugging analysis failed: {str(e)}",
            "language": language
        }


def _analyze_code_metrics(code: str) -> Dict[str, Any]:
    """Analyze basic code metrics."""
    lines = code.split('\n')
    non_empty_lines = [line for line in lines if line.strip()]
    
    return {
        "total_lines": len(lines),
        "non_empty_lines": len(non_empty_lines),
        "average_line_length": sum(len(line) for line in non_empty_lines) / len(non_empty_lines) if non_empty_lines else 0,
        "max_line_length": max(len(line) for line in lines) if lines else 0,
        "complexity_estimate": _estimate_complexity_score(code)
    }


def _estimate_complexity_score(code: str) -> int:
    """Estimate code complexity on a scale of 1-10."""
    score = 1
    
    # Basic complexity indicators
    if len(code) > 100:
        score += 1
    if len(code) > 500:
        score += 1
    if len(code) > 1000:
        score += 1
    
    # Control flow complexity
    control_keywords = ['if', 'for', 'while', 'try', 'catch', 'switch', 'case']
    for keyword in control_keywords:
        score += code.count(keyword) * 0.5
    
    # Function/method complexity
    score += code.count('def ') * 0.3  # Python
    score += code.count('function ') * 0.3  # JavaScript
    
    return min(int(score), 10)


async def _analyze_security(code: str, language: str) -> Dict[str, Any]:
    """Analyze code for security issues."""
    try:
        security_manager = SecurityManager()
        
        # Attempt security validation
        try:
            security_manager.validate_code(code, language)
            security_status = "safe"
            security_issues = []
        except Exception as e:
            security_status = "unsafe"
            security_issues = [str(e)]
        
        return {
            "status": security_status,
            "issues": security_issues,
            "recommendations": _get_security_recommendations(security_issues, language)
        }
        
    except Exception as e:
        return {
            "status": "unknown",
            "error": f"Security analysis failed: {str(e)}"
        }


async def _debug_python_code(code: str, error_message: Optional[str], analysis_level: str) -> Dict[str, Any]:
    """Debug Python-specific code issues."""
    analysis = {
        "syntax_analysis": _analyze_python_syntax(code),
        "import_analysis": _analyze_python_imports(code),
        "structure_analysis": _analyze_python_structure(code)
    }
    
    if analysis_level in ["standard", "detailed"]:
        analysis["style_analysis"] = _analyze_python_style(code)
    
    if analysis_level == "detailed":
        analysis["advanced_analysis"] = _analyze_python_advanced(code)
    
    return {"python_analysis": analysis}


def _analyze_python_syntax(code: str) -> Dict[str, Any]:
    """Analyze Python syntax for issues."""
    try:
        ast.parse(code)
        return {
            "valid": True,
            "message": "Syntax is valid"
        }
    except SyntaxError as e:
        return {
            "valid": False,
            "error": str(e),
            "line": e.lineno,
            "column": e.offset,
            "suggestions": _get_python_syntax_suggestions(str(e))
        }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Syntax analysis failed: {str(e)}"
        }


def _analyze_python_imports(code: str) -> Dict[str, Any]:
    """Analyze Python imports."""
    lines = code.split('\n')
    imports = []
    
    for i, line in enumerate(lines, 1):
        line = line.strip()
        if line.startswith('import ') or line.startswith('from '):
            imports.append({
                "line": i,
                "statement": line,
                "type": "standard" if line.startswith('import ') else "from_import"
            })
    
    return {
        "import_count": len(imports),
        "imports": imports,
        "potential_issues": _check_import_issues(imports)
    }


def _analyze_python_structure(code: str) -> Dict[str, Any]:
    """Analyze Python code structure."""
    try:
        tree = ast.parse(code)
        
        functions = []
        classes = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                functions.append({
                    "name": node.name,
                    "line": node.lineno,
                    "args": len(node.args.args)
                })
            elif isinstance(node, ast.ClassDef):
                classes.append({
                    "name": node.name,
                    "line": node.lineno
                })
        
        return {
            "functions": functions,
            "classes": classes,
            "function_count": len(functions),
            "class_count": len(classes)
        }
        
    except Exception as e:
        return {
            "error": f"Structure analysis failed: {str(e)}"
        }


def _analyze_python_style(code: str) -> Dict[str, Any]:
    """Analyze Python code style."""
    issues = []
    
    lines = code.split('\n')
    for i, line in enumerate(lines, 1):
        # Check line length
        if len(line) > 79:
            issues.append(f"Line {i}: Line too long ({len(line)} > 79 characters)")
        
        # Check for trailing whitespace
        if line.endswith(' ') or line.endswith('\t'):
            issues.append(f"Line {i}: Trailing whitespace")
        
        # Check for mixed tabs and spaces
        if '\t' in line and '    ' in line:
            issues.append(f"Line {i}: Mixed tabs and spaces")
    
    return {
        "style_issues": issues,
        "issue_count": len(issues)
    }


def _analyze_python_advanced(code: str) -> Dict[str, Any]:
    """Advanced Python code analysis."""
    try:
        tree = ast.parse(code)
        
        complexity_score = 0
        nested_depth = 0
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
                complexity_score += 1
            elif isinstance(node, ast.FunctionDef):
                # Analyze function complexity
                func_complexity = _analyze_function_complexity(node)
                complexity_score += func_complexity
        
        return {
            "cyclomatic_complexity": complexity_score,
            "complexity_rating": "low" if complexity_score < 5 else "medium" if complexity_score < 10 else "high"
        }
        
    except Exception as e:
        return {
            "error": f"Advanced analysis failed: {str(e)}"
        }


async def _debug_javascript_code(code: str, error_message: Optional[str], analysis_level: str) -> Dict[str, Any]:
    """Debug JavaScript-specific code issues."""
    analysis = {
        "syntax_analysis": _analyze_javascript_syntax(code),
        "structure_analysis": _analyze_javascript_structure(code)
    }
    
    if analysis_level in ["standard", "detailed"]:
        analysis["style_analysis"] = _analyze_javascript_style(code)
    
    return {"javascript_analysis": analysis}


def _analyze_javascript_syntax(code: str) -> Dict[str, Any]:
    """Analyze JavaScript syntax patterns."""
    issues = []
    
    # Basic syntax checks
    if code.count('{') != code.count('}'):
        issues.append("Mismatched curly braces")
    
    if code.count('(') != code.count(')'):
        issues.append("Mismatched parentheses")
    
    if code.count('[') != code.count(']'):
        issues.append("Mismatched square brackets")
    
    # Check for common issues
    if re.search(r'=\s*=\s*=', code) and re.search(r'=\s*=(?!=)', code):
        issues.append("Mixed == and === operators")
    
    return {
        "issues": issues,
        "issue_count": len(issues)
    }


def _analyze_javascript_structure(code: str) -> Dict[str, Any]:
    """Analyze JavaScript code structure."""
    functions = re.findall(r'function\s+(\w+)', code)
    arrow_functions = re.findall(r'(\w+)\s*=\s*\([^)]*\)\s*=>', code)
    
    return {
        "functions": functions,
        "arrow_functions": arrow_functions,
        "function_count": len(functions) + len(arrow_functions),
        "has_async": 'async' in code,
        "has_promises": 'Promise' in code or '.then(' in code
    }


def _analyze_javascript_style(code: str) -> Dict[str, Any]:
    """Analyze JavaScript code style."""
    issues = []
    
    lines = code.split('\n')
    for i, line in enumerate(lines, 1):
        # Check for semicolons
        if line.strip() and not line.strip().endswith((';', '{', '}', ':', ',')):
            if not re.match(r'^\s*(if|for|while|function|class|const|let|var)', line.strip()):
                issues.append(f"Line {i}: Missing semicolon")
    
    return {
        "style_issues": issues,
        "issue_count": len(issues)
    }


async def _debug_shell_code(code: str, error_message: Optional[str], analysis_level: str) -> Dict[str, Any]:
    """Debug Shell-specific code issues."""
    analysis = {
        "command_analysis": _analyze_shell_commands(code),
        "syntax_analysis": _analyze_shell_syntax(code)
    }
    
    return {"shell_analysis": analysis}


def _analyze_shell_commands(code: str) -> Dict[str, Any]:
    """Analyze shell commands."""
    lines = [line.strip() for line in code.split('\n') if line.strip()]
    commands = []
    
    for line in lines:
        if not line.startswith('#'):  # Skip comments
            cmd = line.split()[0] if line.split() else ""
            commands.append(cmd)
    
    return {
        "commands": commands,
        "command_count": len(commands),
        "unique_commands": list(set(commands))
    }


def _analyze_shell_syntax(code: str) -> Dict[str, Any]:
    """Analyze shell syntax."""
    issues = []
    
    # Check for common shell issues
    if code.count('"') % 2 != 0:
        issues.append("Unmatched double quotes")
    
    if code.count("'") % 2 != 0:
        issues.append("Unmatched single quotes")
    
    return {
        "issues": issues,
        "issue_count": len(issues)
    }


def _analyze_error_message(error_message: str, language: str) -> Dict[str, Any]:
    """Analyze error message for debugging insights."""
    error_type = _classify_error_type(error_message)
    
    return {
        "error_type": error_type,
        "error_message": error_message,
        "suggestions": _get_error_suggestions(error_message, language),
        "common_causes": _get_common_causes(error_type, language)
    }


def _classify_error_type(error_message: str) -> str:
    """Classify the type of error."""
    error_lower = error_message.lower()
    
    if "syntax" in error_lower:
        return "syntax_error"
    elif "name" in error_lower and "not defined" in error_lower:
        return "name_error"
    elif "import" in error_lower or "module" in error_lower:
        return "import_error"
    elif "indentation" in error_lower:
        return "indentation_error"
    elif "type" in error_lower:
        return "type_error"
    elif "value" in error_lower:
        return "value_error"
    elif "timeout" in error_lower:
        return "timeout_error"
    elif "security" in error_lower:
        return "security_error"
    else:
        return "runtime_error"


def _get_error_suggestions(error_message: str, language: str) -> List[str]:
    """Get suggestions based on error message."""
    suggestions = []
    error_type = _classify_error_type(error_message)
    
    if error_type == "syntax_error":
        suggestions.extend([
            "Check for missing brackets, quotes, or semicolons",
            "Verify proper indentation",
            "Look for typos in keywords"
        ])
    elif error_type == "name_error":
        suggestions.extend([
            "Check variable spelling",
            "Ensure variables are defined before use",
            "Check scope of variables"
        ])
    elif error_type == "import_error":
        suggestions.extend([
            "Verify module name spelling",
            "Check if module is available in sandbox",
            "Use standard library modules when possible"
        ])
    
    return suggestions


def _get_common_causes(error_type: str, language: str) -> List[str]:
    """Get common causes for error types."""
    causes = {
        "syntax_error": [
            "Missing or extra punctuation",
            "Incorrect indentation",
            "Typos in keywords"
        ],
        "name_error": [
            "Variable not defined",
            "Typo in variable name",
            "Variable out of scope"
        ],
        "import_error": [
            "Module not installed",
            "Incorrect module name",
            "Module not available in sandbox"
        ]
    }
    
    return causes.get(error_type, ["Unknown error cause"])


def _generate_recommendations(analysis: Dict[str, Any]) -> List[str]:
    """Generate overall recommendations based on analysis."""
    recommendations = []
    
    # Security recommendations
    if analysis.get("security_analysis", {}).get("status") == "unsafe":
        recommendations.append("Address security issues before execution")
    
    # Complexity recommendations
    complexity = analysis.get("code_metrics", {}).get("complexity_estimate", 0)
    if complexity > 7:
        recommendations.append("Consider breaking down complex code into smaller functions")
    
    # Language-specific recommendations
    if "python_analysis" in analysis:
        python_analysis = analysis["python_analysis"]
        if python_analysis.get("style_analysis", {}).get("issue_count", 0) > 0:
            recommendations.append("Address Python style issues for better readability")
    
    if not recommendations:
        recommendations.append("Code analysis looks good - no major issues detected")
    
    return recommendations


def _get_python_syntax_suggestions(error: str) -> List[str]:
    """Get Python syntax error suggestions."""
    suggestions = []
    
    if "invalid syntax" in error.lower():
        suggestions.extend([
            "Check for missing colons after if/for/while/def statements",
            "Verify proper indentation",
            "Look for missing or extra parentheses/brackets"
        ])
    elif "indentation" in error.lower():
        suggestions.extend([
            "Use consistent indentation (4 spaces recommended)",
            "Don't mix tabs and spaces",
            "Check indentation after control statements"
        ])
    
    return suggestions


def _check_import_issues(imports: List[Dict[str, Any]]) -> List[str]:
    """Check for potential import issues."""
    issues = []
    
    restricted_modules = ['os', 'subprocess', 'socket', 'urllib', 'requests']
    
    for imp in imports:
        statement = imp["statement"]
        for module in restricted_modules:
            if module in statement:
                issues.append(f"Line {imp['line']}: Potentially restricted module '{module}'")
    
    return issues


def _get_security_recommendations(issues: List[str], language: str) -> List[str]:
    """Get security recommendations based on issues."""
    recommendations = []
    
    for issue in issues:
        if "import" in issue.lower():
            recommendations.append("Use only allowed standard library modules")
        elif "file" in issue.lower():
            recommendations.append("Avoid file system operations outside workspace")
        elif "network" in issue.lower():
            recommendations.append("Remove network operations")
    
    if not recommendations:
        recommendations.append("Follow sandbox security guidelines")
    
    return recommendations


def _analyze_function_complexity(func_node) -> int:
    """Analyze complexity of a function node."""
    complexity = 1  # Base complexity
    
    for node in ast.walk(func_node):
        if isinstance(node, (ast.If, ast.For, ast.While, ast.Try)):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
            complexity += len(node.values) - 1
    
    return complexity
