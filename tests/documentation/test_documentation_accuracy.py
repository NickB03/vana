"""
Documentation Accuracy Validation Tests

Ensures all documentation claims are backed by working code.
"""
import os
import re
import ast
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple
import pytest
import markdown
from markdown.extensions import codehilite, fenced_code


class DocumentationValidator:
    """Validates documentation accuracy against actual code."""
    
    def __init__(self, docs_dir: Path = Path("docs")):
        self.docs_dir = docs_dir
        self.repo_root = Path(__file__).parent.parent.parent
        
    def extract_code_blocks(self, md_file: Path) -> List[Dict[str, str]]:
        """Extract all code blocks from a markdown file."""
        with open(md_file, 'r') as f:
            content = f.read()
            
        # Find all code blocks
        code_blocks = []
        pattern = r'```(\w+)?\n(.*?)```'
        matches = re.findall(pattern, content, re.DOTALL)
        
        for lang, code in matches:
            code_blocks.append({
                'language': lang or 'text',
                'code': code.strip(),
                'file': str(md_file),
                'line': content[:content.find(code)].count('\n')
            })
            
        return code_blocks
    
    def validate_python_code(self, code: str) -> Tuple[bool, str]:
        """Validate Python code blocks."""
        try:
            # First check if it's valid Python syntax
            ast.parse(code)
            
            # Try to execute in isolated environment
            result = subprocess.run(
                ['python', '-c', code],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return False, f"Execution failed: {result.stderr}"
                
            return True, "Code executed successfully"
            
        except SyntaxError as e:
            return False, f"Syntax error: {e}"
        except Exception as e:
            return False, f"Validation error: {e}"
    
    def validate_bash_commands(self, code: str) -> Tuple[bool, str]:
        """Validate bash command examples."""
        # Don't actually run potentially destructive commands
        # Just check for common issues
        
        dangerous_commands = ['rm -rf', 'sudo', 'kill', 'shutdown']
        for cmd in dangerous_commands:
            if cmd in code:
                return True, f"Skipped validation of potentially dangerous command: {cmd}"
        
        # Check if command exists
        first_word = code.split()[0] if code.split() else ""
        if first_word:
            result = subprocess.run(['which', first_word], capture_output=True)
            if result.returncode != 0:
                return False, f"Command not found: {first_word}"
                
        return True, "Command appears valid"
    
    def check_file_references(self, md_file: Path) -> List[str]:
        """Check all file path references in documentation."""
        with open(md_file, 'r') as f:
            content = f.read()
            
        # Find file references
        file_pattern = r'`([^`]+\.(py|yaml|yml|json|md|sh|txt))`'
        referenced_files = re.findall(file_pattern, content)
        
        missing_files = []
        for file_ref, _ in referenced_files:
            # Skip if it's clearly an example
            if file_ref.startswith('your-') or file_ref.startswith('example'):
                continue
                
            file_path = self.repo_root / file_ref
            if not file_path.exists():
                missing_files.append(file_ref)
                
        return missing_files
    
    def check_dependency_claims(self, md_file: Path) -> List[str]:
        """Check if claimed dependencies exist in pyproject.toml."""
        with open(md_file, 'r') as f:
            content = f.read()
            
        # Find pip install commands
        pip_pattern = r'pip install ([^\s]+)'
        claimed_deps = re.findall(pip_pattern, content)
        
        # Load actual dependencies
        pyproject_path = self.repo_root / 'pyproject.toml'
        if not pyproject_path.exists():
            return ["pyproject.toml not found"]
            
        with open(pyproject_path, 'r') as f:
            pyproject_content = f.read()
            
        missing_deps = []
        for dep in claimed_deps:
            # Clean up version specifiers
            dep_name = dep.split('>=')[0].split('==')[0].split('<')[0]
            if dep_name and dep_name not in pyproject_content:
                missing_deps.append(dep)
                
        return missing_deps
    
    def validate_status_claims(self, md_file: Path) -> List[str]:
        """Check for unrealistic status claims."""
        with open(md_file, 'r') as f:
            content = f.read()
            
        red_flags = []
        
        # Check for overly optimistic claims
        if "fully operational" in content.lower() and "46.2%" not in content:
            red_flags.append("Claims 'fully operational' without mentioning 46.2% infrastructure status")
            
        if "production ready" in content.lower() and "psutil" not in content:
            red_flags.append("Claims 'production ready' without mentioning missing psutil dependency")
            
        if "100% working" in content and "known issues" not in content.lower():
            red_flags.append("Claims '100% working' without documenting known issues")
            
        return red_flags


# Test functions
def test_no_false_claims():
    """Ensure no documentation makes false claims about system status."""
    validator = DocumentationValidator()
    
    errors = []
    for md_file in Path("docs").rglob("*.md"):
        red_flags = validator.validate_status_claims(md_file)
        if red_flags:
            errors.append(f"{md_file}: {red_flags}")
            
    assert not errors, f"False claims found:\n" + "\n".join(errors)


def test_code_examples_valid():
    """Ensure all code examples in documentation are valid."""
    validator = DocumentationValidator()
    
    errors = []
    for md_file in Path("docs").rglob("*.md"):
        code_blocks = validator.extract_code_blocks(md_file)
        
        for block in code_blocks:
            if block['language'] == 'python':
                valid, msg = validator.validate_python_code(block['code'])
                if not valid:
                    errors.append(f"{block['file']}:{block['line']} - {msg}")
                    
    assert not errors, f"Invalid code examples:\n" + "\n".join(errors)


def test_file_references_exist():
    """Ensure all referenced files in documentation actually exist."""
    validator = DocumentationValidator()
    
    errors = []
    for md_file in Path("docs").rglob("*.md"):
        missing = validator.check_file_references(md_file)
        if missing:
            errors.append(f"{md_file}: Missing files {missing}")
            
    assert not errors, f"Missing file references:\n" + "\n".join(errors)


def test_dependency_claims_accurate():
    """Ensure all claimed dependencies exist in pyproject.toml."""
    validator = DocumentationValidator()
    
    errors = []
    for md_file in Path("docs").rglob("*.md"):
        missing = validator.check_dependency_claims(md_file)
        if missing:
            errors.append(f"{md_file}: Undeclared dependencies {missing}")
            
    assert not errors, f"Missing dependencies:\n" + "\n".join(errors)


def test_links_valid():
    """Ensure all links in documentation are valid."""
    # This would check both internal and external links
    pass  # Implementation depends on specific needs


if __name__ == "__main__":
    # Run validation
    validator = DocumentationValidator()
    print("🔍 Validating documentation accuracy...")
    
    # You can run specific validations here
    for md_file in Path("docs").rglob("*.md"):
        print(f"\nChecking {md_file}...")
        
        # Check status claims
        red_flags = validator.validate_status_claims(md_file)
        if red_flags:
            print(f"  ⚠️  Red flags: {red_flags}")
            
        # Check file references
        missing = validator.check_file_references(md_file)
        if missing:
            print(f"  ❌ Missing files: {missing}")
            
        # Check dependencies
        missing_deps = validator.check_dependency_claims(md_file)
        if missing_deps:
            print(f"  ❌ Missing dependencies: {missing_deps}")
