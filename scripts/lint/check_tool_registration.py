#!/usr/bin/env python3
"""
VANA tool registration pattern checker.
Ensures proper FunctionTool registration patterns to prevent runtime errors.

This script validates VANA's specific tool registration requirements:
- FunctionTool(func=function) patterns
- Proper tool.name assignments
- Function/tool name consistency
- ADK-compliant registration patterns
"""
import ast
import sys
from pathlib import Path


class ToolRegistrationChecker(ast.NodeVisitor):
    def __init__(self):
        self.errors: list[tuple[int, str]] = []
        self.warnings: list[tuple[int, str]] = []
        self.function_tools: dict[str, str] = {}  # tool_var -> func_name
        self.tool_names: dict[str, str] = {}  # tool_var -> assigned_name
        self.function_defs: set[str] = set()  # all function names in file
        self.imports: set[str] = set()  # imported names

    def visit_Import(self, node: ast.Import):
        """Track imports for validation."""
        for alias in node.names:
            self.imports.add(alias.name)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        """Track from imports for validation."""
        if node.names:
            for alias in node.names:
                self.imports.add(alias.name)
        self.generic_visit(node)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        """Track function definitions."""
        self.function_defs.add(node.name)
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign):
        """Check assignment statements for tool registration patterns."""
        if len(node.targets) == 1:
            target = node.targets[0]

            # Check FunctionTool creation patterns
            if isinstance(target, ast.Name) and isinstance(node.value, ast.Call):
                tool_var = target.id

                # Check for FunctionTool creation
                if (
                    isinstance(node.value.func, ast.Name)
                    and node.value.func.id == "FunctionTool"
                ):
                    # Validate FunctionTool usage
                    if "FunctionTool" not in self.imports:
                        self.errors.append(
                            (
                                node.lineno,
                                "VANA ERROR: FunctionTool used but not imported. "
                                "Add: from google.adk import FunctionTool",
                            )
                        )

                    # Extract function name from FunctionTool(func=...)
                    func_name = None
                    for keyword in node.value.keywords:
                        if keyword.arg == "func":
                            if isinstance(keyword.value, ast.Name):
                                func_name = keyword.value.id
                            else:
                                self.errors.append(
                                    (
                                        node.lineno,
                                        f"VANA ERROR: FunctionTool func parameter should be a function name, "
                                        f"not {type(keyword.value).__name__}",
                                    )
                                )

                    if func_name:
                        self.function_tools[tool_var] = func_name

                        # Check if function exists in this file
                        if (
                            func_name not in self.function_defs
                            and not func_name.startswith("_")
                        ):
                            self.warnings.append(
                                (
                                    node.lineno,
                                    f"VANA WARNING: Function '{func_name}' not found in this file. "
                                    f"Ensure it's defined or imported.",
                                )
                            )
                    else:
                        self.errors.append(
                            (
                                node.lineno,
                                f"VANA ERROR: FunctionTool '{tool_var}' missing func parameter. "
                                f"Should be: FunctionTool(func=function_name)",
                            )
                        )

            # Check tool name assignments (tool.name = "...")
            elif (
                isinstance(target, ast.Attribute)
                and target.attr == "name"
                and isinstance(node.value, ast.Constant)
                and isinstance(node.value.value, str)
            ):
                tool_name = node.value.value
                tool_var = (
                    target.value.id if isinstance(target.value, ast.Name) else "unknown"
                )

                # Validate tool name
                if tool_name.startswith("_"):
                    self.errors.append(
                        (
                            node.lineno,
                            f"VANA CRITICAL: Tool name '{tool_name}' has leading underscore. "
                            f"This causes 'Function {tool_name} is not found in the tools_dict' errors. "
                            f"Should be: '{tool_name[1:]}'",
                        )
                    )

                # Check for common VANA problematic tool names
                problematic_names = [
                    "_vector_search",
                    "_echo",
                    "_ask_for_approval",
                    "_generate_report",
                    "_architecture_tool",
                    "_ui_tool",
                    "_devops_tool",
                    "_qa_tool",
                ]

                if tool_name in problematic_names:
                    correct_name = tool_name[1:]
                    self.errors.append(
                        (
                            node.lineno,
                            f"VANA CRITICAL: Tool name '{tool_name}' is a known problematic pattern. "
                            f"Change to '{correct_name}' - this exact issue has broken VANA deployments.",
                        )
                    )

                self.tool_names[tool_var] = tool_name

        self.generic_visit(node)

    def check_consistency(self):
        """Check for function name vs tool name consistency issues."""
        for tool_var in self.function_tools:
            func_name = self.function_tools.get(tool_var)
            tool_name = self.tool_names.get(tool_var)

            if func_name and tool_name:
                # VANA-specific pattern validation

                # Pattern 1: Function with underscore, tool name without (CORRECT for VANA)
                if func_name.startswith("_") and not tool_name.startswith("_"):
                    # This is the correct VANA pattern
                    expected_tool_name = func_name[1:]
                    if tool_name != expected_tool_name:
                        self.warnings.append(
                            (
                                0,
                                f"VANA WARNING: Tool '{tool_var}' uses function '{func_name}' "
                                f"but tool name is '{tool_name}'. Expected '{expected_tool_name}' for consistency.",
                            )
                        )

                # Pattern 2: Both have underscores (PROBLEMATIC)
                elif func_name.startswith("_") and tool_name.startswith("_"):
                    self.errors.append(
                        (
                            0,
                            f"VANA ERROR: Tool '{tool_var}' has both function '{func_name}' "
                            f"and tool name '{tool_name}' with underscores. Remove underscore from tool name.",
                        )
                    )

                # Pattern 3: Neither has underscores (CHECK CONSISTENCY)
                elif not func_name.startswith("_") and not tool_name.startswith("_"):
                    if func_name != tool_name:
                        self.warnings.append(
                            (
                                0,
                                f"VANA WARNING: Tool '{tool_var}' function name '{func_name}' "
                                f"doesn't match tool name '{tool_name}'. Consider consistency.",
                            )
                        )

                # Pattern 4: Function without underscore, tool name with underscore (WRONG)
                elif not func_name.startswith("_") and tool_name.startswith("_"):
                    self.errors.append(
                        (
                            0,
                            f"VANA ERROR: Tool '{tool_var}' function '{func_name}' has no underscore "
                            f"but tool name '{tool_name}' does. This will cause registration failure.",
                        )
                    )

    def check_export_patterns(self):
        """Check for proper __all__ export patterns."""
        # This would be implemented to check __all__ exports
        # For now, we'll add a basic check
        pass


def check_file(filepath: Path) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Check tool registration patterns in a file."""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        tree = ast.parse(content, filename=str(filepath))
        checker = ToolRegistrationChecker()
        checker.visit(tree)
        checker.check_consistency()
        checker.check_export_patterns()

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
                print(f"\n🚨 TOOL REGISTRATION ERRORS in {filepath}:")
                for line_no, error in errors:
                    print(f"  Line {line_no}: {error}")
                total_errors += len(errors)

            if warnings:
                print(f"\n⚠️  TOOL REGISTRATION WARNINGS in {filepath}:")
                for line_no, warning in warnings:
                    print(f"  Line {line_no}: {warning}")
                total_warnings += len(warnings)

    if total_errors > 0:
        print(f"\n❌ Found {total_errors} tool registration errors!")
        print(
            "💡 Fix: Ensure proper FunctionTool patterns and remove underscore prefixes from tool names"
        )
        print("📚 See memory bank for VANA tool registration patterns")
        return 1

    if total_warnings > 0:
        print(f"\n⚠️  Found {total_warnings} tool registration warnings (non-blocking)")

    if total_errors == 0 and total_warnings == 0:
        print("✅ No tool registration issues found")

    return 0


if __name__ == "__main__":
    sys.exit(main())
