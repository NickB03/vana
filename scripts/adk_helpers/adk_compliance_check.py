#!/usr/bin/env python3
"""
ADK Compliance Check Script
Validates that the codebase follows Google ADK best practices and patterns.
"""

import ast
import json
import sys
from pathlib import Path
from typing import Any


class ADKComplianceChecker:
    """Checks for ADK compliance patterns in Python code."""

    def __init__(self):
        self.errors = []
        self.warnings = []
        self.checked_files = 0

    def check_file(self, filepath: Path) -> dict[str, Any]:
        """Check a single Python file for ADK compliance."""
        try:
            with open(filepath, encoding='utf-8') as f:
                content = f.read()

            tree = ast.parse(content, filename=str(filepath))
            file_issues = {
                'file': str(filepath),
                'errors': [],
                'warnings': [],
                'score': 100
            }

            # Check for required imports
            self._check_imports(tree, file_issues)

            # Check for proper error handling
            self._check_error_handling(tree, file_issues)

            # Check for logging patterns
            self._check_logging_patterns(tree, file_issues)

            # Check for async patterns
            self._check_async_patterns(tree, file_issues)

            # Check for proper type annotations
            self._check_type_annotations(tree, file_issues)

            self.checked_files += 1
            return file_issues

        except Exception as e:
            return {
                'file': str(filepath),
                'errors': [f"Failed to parse file: {e}"],
                'warnings': [],
                'score': 0
            }

    def _check_imports(self, tree: ast.AST, issues: dict[str, Any]) -> None:
        """Check for proper ADK imports."""
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)

        # Check for logging import
        if not any('logging' in imp for imp in imports):
            issues['warnings'].append("Consider adding logging for better observability")
            issues['score'] -= 5

        # Check for FastAPI patterns in server files
        filepath = issues['file']
        if 'server.py' in filepath or 'routes.py' in filepath:
            if not any('fastapi' in imp.lower() for imp in imports):
                issues['warnings'].append("FastAPI import expected in server/routes files")
                issues['score'] -= 5

    def _check_error_handling(self, tree: ast.AST, issues: dict[str, Any]) -> None:
        """Check for proper error handling patterns."""
        try_blocks = []
        functions = []

        for node in ast.walk(tree):
            if isinstance(node, ast.Try):
                try_blocks.append(node)
            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                functions.append(node)

        # Check if functions that might need error handling have try blocks
        if len(functions) > 2 and len(try_blocks) == 0:
            issues['warnings'].append("Consider adding error handling for better reliability")
            issues['score'] -= 10

        # Check for bare except clauses
        for try_block in try_blocks:
            for handler in try_block.handlers:
                if handler.type is None:
                    issues['errors'].append("Bare except clause found - specify exception types")
                    issues['score'] -= 15

    def _check_logging_patterns(self, tree: ast.AST, issues: dict[str, Any]) -> None:
        """Check for proper logging usage."""
        has_logging = False

        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if hasattr(node.func, 'attr') and hasattr(node.func.value, 'id'):
                    if 'log' in node.func.attr.lower():
                        has_logging = True
                elif hasattr(node.func, 'id') and 'log' in node.func.id.lower():
                    has_logging = True

        # Check if file has functions but no logging
        functions = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        if len(functions) > 1 and not has_logging:
            issues['warnings'].append("Consider adding logging for better observability")
            issues['score'] -= 5

    def _check_async_patterns(self, tree: ast.AST, issues: dict[str, Any]) -> None:
        """Check for proper async/await patterns."""
        async_functions = []
        await_calls = []

        for node in ast.walk(tree):
            if isinstance(node, ast.AsyncFunctionDef):
                async_functions.append(node)
            elif isinstance(node, ast.Await):
                await_calls.append(node)

        # Check for async functions without await
        for func in async_functions:
            func_awaits = [n for n in ast.walk(func) if isinstance(n, ast.Await)]
            if not func_awaits:
                issues['warnings'].append(f"Async function '{func.name}' has no await calls")
                issues['score'] -= 5

    def _check_type_annotations(self, tree: ast.AST, issues: dict[str, Any]) -> None:
        """Check for type annotations."""
        functions = []
        annotated_functions = 0

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                functions.append(node)
                if node.returns or any(arg.annotation for arg in node.args.args):
                    annotated_functions += 1

        if len(functions) > 0:
            annotation_ratio = annotated_functions / len(functions)
            if annotation_ratio < 0.5:
                issues['warnings'].append("Consider adding more type annotations for better code quality")
                issues['score'] -= 10

    def check_project(self, project_path: Path) -> dict[str, Any]:
        """Check the entire project for ADK compliance."""
        app_path = project_path / "app"
        if not app_path.exists():
            return {
                'error': 'app/ directory not found',
                'score': 0,
                'files_checked': 0
            }

        all_issues = []
        total_score = 0

        # Find all Python files in app/
        python_files = list(app_path.rglob("*.py"))

        for py_file in python_files:
            if "__pycache__" in str(py_file):
                continue

            file_issues = self.check_file(py_file)
            all_issues.append(file_issues)
            total_score += file_issues['score']

        if len(python_files) == 0:
            average_score = 0
        else:
            average_score = total_score / len(python_files)

        return {
            'project_score': average_score,
            'files_checked': len(python_files),
            'files_with_issues': len([f for f in all_issues if f['errors'] or f['warnings']]),
            'file_details': all_issues,
            'summary': self._generate_summary(all_issues, average_score)
        }

    def _generate_summary(self, all_issues: list[dict], score: float) -> dict[str, Any]:
        """Generate a summary of the compliance check."""
        total_errors = sum(len(f['errors']) for f in all_issues)
        total_warnings = sum(len(f['warnings']) for f in all_issues)

        if score >= 90:
            grade = "A"
            message = "Excellent ADK compliance"
        elif score >= 80:
            grade = "B"
            message = "Good ADK compliance with minor issues"
        elif score >= 70:
            grade = "C"
            message = "Acceptable ADK compliance with room for improvement"
        elif score >= 60:
            grade = "D"
            message = "Poor ADK compliance - significant improvements needed"
        else:
            grade = "F"
            message = "Failed ADK compliance - major issues detected"

        return {
            'grade': grade,
            'score': score,
            'message': message,
            'total_errors': total_errors,
            'total_warnings': total_warnings
        }


def main():
    """Main entry point for the compliance checker."""
    project_root = Path.cwd()
    checker = ADKComplianceChecker()

    print("🔍 Running ADK Compliance Check...")
    print(f"Project root: {project_root}")

    results = checker.check_project(project_root)

    if 'error' in results:
        print(f"❌ Error: {results['error']}")
        sys.exit(1)

    # Print summary
    summary = results['summary']
    print("\n📊 ADK Compliance Report")
    print(f"{'=' * 50}")
    print(f"Grade: {summary['grade']} ({summary['score']:.1f}/100)")
    print(f"Message: {summary['message']}")
    print(f"Files checked: {results['files_checked']}")
    print(f"Files with issues: {results['files_with_issues']}")
    print(f"Total errors: {summary['total_errors']}")
    print(f"Total warnings: {summary['total_warnings']}")

    # Print file details if there are issues
    if results['files_with_issues'] > 0:
        print("\n📋 Detailed Issues:")
        for file_info in results['file_details']:
            if file_info['errors'] or file_info['warnings']:
                print(f"\n📄 {file_info['file']} (Score: {file_info['score']}/100)")

                for error in file_info['errors']:
                    print(f"  ❌ Error: {error}")

                for warning in file_info['warnings']:
                    print(f"  ⚠️  Warning: {warning}")

    # Save results to file
    output_file = project_root / ".claude_workspace" / "reports" / "adk-compliance.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n💾 Detailed results saved to: {output_file}")

    # Exit with appropriate code
    if summary['total_errors'] > 0:
        print("\n❌ ADK compliance check failed due to errors")
        sys.exit(1)
    elif summary['score'] < 70:
        print("\n⚠️  ADK compliance check passed with warnings")
        sys.exit(0)
    else:
        print("\n✅ ADK compliance check passed")
        sys.exit(0)


if __name__ == "__main__":
    main()
