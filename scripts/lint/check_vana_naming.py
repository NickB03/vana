#!/usr/bin/env python3
"""
VANA-specific naming convention checker.
Prevents the recurring underscore naming issues that break tool registration.

This script specifically targets the VANA project's common error patterns:
- Tool functions with leading underscores (e.g., _vector_search -> vector_search)
- Tool name assignments with underscores (e.g., tool.name = "_echo" -> "echo")
- Function/tool name mismatches that cause "Function X is not found" errors
"""
import ast
import sys
from pathlib import Path


class VANANamingChecker(ast.NodeVisitor):
    def __init__(self):
        self.errors: list[tuple[int, str]] = []
        self.warnings: list[tuple[int, str]] = []
        self.tool_functions: list[str] = []
        self.tool_registrations: dict[str, str] = {}  # tool_var -> func_name
        self.tool_names: dict[str, str] = {}  # tool_var -> assigned_name

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Check function definitions for VANA naming violations."""
        # Check for tool functions with leading underscores
        if node.name.startswith("_") and self._is_tool_function(node):
            self.errors.append(
                (
                    node.lineno,
                    f"VANA ERROR: Tool function '{node.name}' has leading underscore. "
                    f"Should be '{node.name[1:]}' for proper ADK registration. "
                    f"This causes 'Function {node.name} is not found in the tools_dict' errors.",
                )
            )

        # Check for common VANA tool naming patterns
        if self._is_tool_function(node):
            self.tool_functions.append(node.name)

            # Check for specific VANA problematic patterns
            problematic_patterns = [
                ("_vector_search", "vector_search"),
                ("_echo", "echo"),
                ("_ask_for_approval", "ask_for_approval"),
                ("_generate_report", "generate_report"),
                ("_architecture_tool", "architecture_tool"),
                ("_ui_tool", "ui_tool"),
                ("_devops_tool", "devops_tool"),
                ("_qa_tool", "qa_tool"),
            ]

            for wrong, correct in problematic_patterns:
                if node.name == wrong:
                    self.errors.append(
                        (
                            node.lineno,
                            f"VANA CRITICAL: Function '{wrong}' should be '{correct}'. "
                            f"This exact pattern has caused deployment failures in VANA.",
                        )
                    )

        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        """Check assignment statements for tool registration patterns."""
        if len(node.targets) == 1:
            target = node.targets[0]

            # Check tool name assignments (tool.name = "...")
            if (
                isinstance(target, ast.Attribute)
                and target.attr == "name"
                and isinstance(node.value, ast.Constant)
                and isinstance(node.value.value, str)
            ):
                tool_name = node.value.value
                tool_var = (
                    target.value.id if isinstance(target.value, ast.Name) else "unknown"
                )

                if tool_name.startswith("_"):
                    self.errors.append(
                        (
                            node.lineno,
                            f"VANA ERROR: Tool name assignment '{tool_name}' has leading underscore. "
                            f"Should be '{tool_name[1:]}'. This breaks ADK tool registration.",
                        )
                    )

                self.tool_names[tool_var] = tool_name

            # Check FunctionTool creation patterns
            elif (
                isinstance(target, ast.Name)
                and isinstance(node.value, ast.Call)
                and isinstance(node.value.func, ast.Name)
                and node.value.func.id == "FunctionTool"
            ):
                tool_var = target.id

                # Extract function name from FunctionTool(func=...)
                for keyword in node.value.keywords:
                    if keyword.arg == "func" and isinstance(keyword.value, ast.Name):
                        func_name = keyword.value.id
                        self.tool_registrations[tool_var] = func_name

        self.generic_visit(node)

    def _is_tool_function(self, node: ast.FunctionDef) -> bool:
        """Check if function is likely a VANA tool function."""
        # VANA-specific tool patterns based on actual codebase
        vana_tool_patterns = [
            "search",
            "echo",
            "health",
            "coordinate",
            "delegate",
            "transfer",
            "generate",
            "process",
            "architecture",
            "devops",
            "ui_tool",
            "qa_tool",
            "vector",
            "web_search",
            "knowledge",
            "approval",
            "report",
            "dataset",
            "status",
            "mcp",
            "brave",
            "github",
            "context7",
            "sequential",
        ]

        func_name_lower = node.name.lower()
        return any(pattern in func_name_lower for pattern in vana_tool_patterns)

    def check_consistency(self):
        """Check for function name vs tool name consistency issues."""
        for tool_var in self.tool_registrations:
            func_name = self.tool_registrations.get(tool_var)
            tool_name = self.tool_names.get(tool_var)

            if func_name and tool_name:
                # Check for common VANA inconsistency patterns
                if func_name.startswith("_") and not tool_name.startswith("_"):
                    # This is actually the correct pattern for VANA
                    continue
                elif not func_name.startswith("_") and tool_name.startswith("_"):
                    self.errors.append(
                        (
                            0,
                            f"VANA ERROR: Tool '{tool_var}' has function '{func_name}' "
                            f"but tool name '{tool_name}' has underscore. This will cause registration failure.",
                        )
                    )
                elif func_name.startswith("_") and tool_name.startswith("_"):
                    self.warnings.append(
                        (
                            0,
                            f"VANA WARNING: Both function '{func_name}' and tool name '{tool_name}' "
                            f"have underscores. Consider removing from tool name.",
                        )
                    )


def check_file(filepath: Path) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Check a single Python file for VANA naming violations."""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        tree = ast.parse(content, filename=str(filepath))
        checker = VANANamingChecker()
        checker.visit(tree)
        checker.check_consistency()

        return checker.errors, checker.warnings
    except Exception as e:
        return [(0, f"Error parsing {filepath}: {e}")], []


def main():
    """Main entry point for pre-commit hook."""
    files = sys.argv[1:] if len(sys.argv) > 1 else []

    if not files:
        print("No files to check")
        return 0

    total_errors = 0
    total_warnings = 0

    for filepath in files:
        path = Path(filepath)
        if path.suffix == ".py" and ("tools" in str(path) or "agents" in str(path)):
            errors, warnings = check_file(path)

            if errors:
                print(f"\n🚨 VANA NAMING VIOLATIONS in {filepath}:")
                for line_no, error in errors:
                    print(f"  Line {line_no}: {error}")
                total_errors += len(errors)

            if warnings:
                print(f"\n⚠️  VANA NAMING WARNINGS in {filepath}:")
                for line_no, warning in warnings:
                    print(f"  Line {line_no}: {warning}")
                total_warnings += len(warnings)

    if total_errors > 0:
        print(f"\n❌ Found {total_errors} VANA naming violations!")
        print(
            "💡 Fix: Remove leading underscores from tool names and ensure consistency"
        )
        print("📚 See memory bank for VANA naming conventions")
        return 1

    if total_warnings > 0:
        print(f"\n⚠️  Found {total_warnings} VANA naming warnings (non-blocking)")

    if total_errors == 0 and total_warnings == 0:
        print("✅ No VANA naming violations found")

    return 0


if __name__ == "__main__":
    sys.exit(main())
