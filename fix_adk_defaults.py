#!/usr/bin/env python3
"""
ADK Compliance Fix Script
Automatically removes default parameters from tool functions.
"""

import os
import re
import ast
from pathlib import Path
from typing import List, Tuple


class DefaultParameterFixer:
    """Fixes default parameters in Python functions for ADK compliance."""
    
    def __init__(self):
        self.fixes_applied = []
        self.skipped_files = []
        
        # Patterns for tool functions (these should not have defaults)
        self.tool_function_patterns = [
            r'def \w*search\w*\(',
            r'def \w*analyze\w*\(',
            r'def \w*execute\w*\(',
            r'def \w*transfer\w*\(',
            r'def \w*tool\w*\(',
            r'def \w*get_\w*\(',
            r'def \w*perform\w*\(',
            r'def \w*run\w*\(',
            r'def google_web_search\(',
            r'def standardized_\w*\(',
        ]
        
        # Skip these patterns (they can keep defaults)
        self.skip_patterns = [
            r'def __init__\(',
            r'def _validate_\w*\(',
            r'def _get_\w*\(',
            r'def _save_\w*\(',
            r'def _initialize_\w*\(',
            r'def _extract_\w*\(',
            r'def _process_\w*\(',
            r'def _handle_\w*\(',
            r'class \w*:',
        ]
    
    def should_fix_function(self, line: str) -> bool:
        """Determine if a function definition should be fixed."""
        # Skip certain patterns
        for pattern in self.skip_patterns:
            if re.search(pattern, line):
                return False
        
        # Check if it's a tool function
        for pattern in self.tool_function_patterns:
            if re.search(pattern, line):
                return True
        
        # Check if it's in a tools directory
        return False
    
    def fix_default_parameters(self, content: str, file_path: str) -> Tuple[str, List[str]]:
        """Fix default parameters in file content."""
        lines = content.split('\n')
        fixed_lines = []
        fixes = []
        
        for i, line in enumerate(lines):
            # Check if this line defines a function with defaults
            if 'def ' in line and '=' in line and ')' in line:
                if self.should_fix_function(line) or 'tools' in file_path.lower():
                    # Remove default values
                    original_line = line
                    
                    # Use regex to remove default parameters
                    # Pattern: parameter_name: type = default_value
                    pattern = r'(\w+:\s*\w+(?:\[\w+\])?)\s*=\s*[^,\)]+([,\)])'
                    fixed_line = re.sub(pattern, r'\1\2', line)
                    
                    # Also handle simpler patterns like param=value
                    pattern2 = r'(\w+)\s*=\s*[^,\)]+([,\)])'
                    fixed_line = re.sub(pattern2, r'\1\2', fixed_line)
                    
                    if fixed_line != original_line:
                        fixes.append(f"Line {i+1}: {original_line.strip()} -> {fixed_line.strip()}")
                        line = fixed_line
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines), fixes
    
    def fix_file(self, file_path: str) -> bool:
        """Fix a single file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            fixed_content, fixes = self.fix_default_parameters(content, file_path)
            
            if fixes:
                # Write the fixed content back
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                
                rel_path = os.path.relpath(file_path)
                self.fixes_applied.append((rel_path, fixes))
                print(f"✅ Fixed {len(fixes)} defaults in {rel_path}")
                return True
            
            return False
            
        except Exception as e:
            rel_path = os.path.relpath(file_path)
            self.skipped_files.append((rel_path, str(e)))
            print(f"⚠️  Skipped {rel_path}: {e}")
            return False
    
    def fix_directory(self, directory: str) -> None:
        """Fix all Python files in a directory."""
        print(f"🔧 Fixing default parameters in {directory}/")
        
        for root, dirs, files in os.walk(directory):
            # Skip __pycache__ and test directories
            dirs[:] = [d for d in dirs if not d.startswith('__pycache__')]
            
            for file in files:
                if file.endswith('.py') and not file.startswith('test_'):
                    file_path = os.path.join(root, file)
                    self.fix_file(file_path)
    
    def generate_report(self) -> None:
        """Generate a report of all fixes applied."""
        print("\n" + "="*60)
        print("ADK COMPLIANCE FIX REPORT")
        print("="*60)
        
        print(f"\n📊 SUMMARY:")
        print(f"  • Files fixed: {len(self.fixes_applied)}")
        print(f"  • Files skipped: {len(self.skipped_files)}")
        
        if self.fixes_applied:
            print(f"\n✅ FIXES APPLIED:")
            for file_path, fixes in self.fixes_applied:
                print(f"  📄 {file_path}:")
                for fix in fixes[:3]:  # Show first 3 fixes per file
                    print(f"    • {fix}")
                if len(fixes) > 3:
                    print(f"    • ... and {len(fixes) - 3} more")
        
        if self.skipped_files:
            print(f"\n⚠️  SKIPPED FILES:")
            for file_path, reason in self.skipped_files:
                print(f"  • {file_path}: {reason}")


def main():
    """Main function to fix ADK compliance issues."""
    print("🚀 Starting ADK Compliance Fix")
    print("Removing default parameters from tool functions...")
    
    fixer = DefaultParameterFixer()
    
    # Fix critical directories
    directories_to_fix = [
        'lib/_tools',
        'agents/specialists',
        'agents/vana'
    ]
    
    for directory in directories_to_fix:
        if os.path.exists(directory):
            fixer.fix_directory(directory)
        else:
            print(f"⚠️  Directory not found: {directory}")
    
    # Generate report
    fixer.generate_report()
    
    print(f"\n🎯 ADK Compliance Fix Complete!")
    print("Next: Run tests with 'python tests/test_adk_compliance.py'")


if __name__ == "__main__":
    main()