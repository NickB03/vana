#!/usr/bin/env python3
"""
Print Statement Replacement Tool

Systematically replaces print statements with appropriate logging calls
in the VANA codebase, focusing on core production files.
"""

import os
import re
import json
import shutil
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# Import our logging configuration
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib.logging_config import get_logger

logger = get_logger("vana.print_replacement")

class PrintStatementReplacer:
    """Replaces print statements with appropriate logging calls."""
    
    def __init__(self):
        """Initialize the replacer."""
        self.replacements_made = 0
        self.files_processed = 0
        self.errors = []
        
        # Load our audit data to know which files to process
        self.load_audit_data()
        
        # Define replacement patterns
        self.setup_replacement_patterns()
    
    def load_audit_data(self):
        """Load the debug audit data to know which files to process."""
        try:
            with open('debug_audit_report.json', 'r') as f:
                self.audit_data = json.load(f)
            logger.info("Loaded audit data successfully")
        except FileNotFoundError:
            logger.error("debug_audit_report.json not found")
            self.audit_data = None
    
    def setup_replacement_patterns(self):
        """Set up patterns for different types of print statements."""
        self.patterns = [
            # Simple print with string literal
            {
                'pattern': r'print\s*\(\s*["\']([^"\']*)["\'](?:\s*,\s*(.+))?\s*\)',
                'replacement': self.replace_simple_print,
                'description': 'Simple string print'
            },
            # Print with f-string
            {
                'pattern': r'print\s*\(\s*f["\']([^"\']*)["\'](?:\s*,\s*(.+))?\s*\)',
                'replacement': self.replace_fstring_print,
                'description': 'F-string print'
            },
            # Print with variable
            {
                'pattern': r'print\s*\(\s*([^,\)]+)(?:\s*,\s*(.+))?\s*\)',
                'replacement': self.replace_variable_print,
                'description': 'Variable print'
            }
        ]
    
    def determine_log_level(self, content: str, context: str = "") -> str:
        """Determine appropriate log level based on content."""
        content_lower = content.lower()
        context_lower = context.lower()
        
        # Error/warning indicators
        if any(word in content_lower for word in ['error', 'failed', 'exception', 'critical']):
            return 'error'
        if any(word in content_lower for word in ['warning', 'warn', 'deprecated']):
            return 'warning'
        
        # Debug indicators
        if any(word in content_lower for word in ['debug', 'trace', 'dump']):
            return 'debug'
        
        # Info indicators (status, results, etc.)
        if any(word in content_lower for word in ['starting', 'completed', 'finished', 'result', 'success']):
            return 'info'
        
        # Context-based decisions
        if 'test' in context_lower or 'demo' in context_lower:
            return 'debug'
        
        # Default to info for most cases
        return 'info'
    
    def replace_simple_print(self, match: re.Match, context: str = "") -> str:
        """Replace simple print statement."""
        message = match.group(1)
        additional_args = match.group(2) if match.group(2) else None
        
        log_level = self.determine_log_level(message, context)
        
        if additional_args:
            # Handle print with additional arguments
            return f'logger.{log_level}("{message}", {additional_args})'
        else:
            return f'logger.{log_level}("{message}")'
    
    def replace_fstring_print(self, match: re.Match, context: str = "") -> str:
        """Replace f-string print statement."""
        message = match.group(1)
        additional_args = match.group(2) if match.group(2) else None
        
        log_level = self.determine_log_level(message, context)
        
        if additional_args:
            return f'logger.{log_level}(f"{message}", {additional_args})'
        else:
            return f'logger.{log_level}(f"{message}")'
    
    def replace_variable_print(self, match: re.Match, context: str = "") -> str:
        """Replace variable print statement."""
        variable = match.group(1).strip()
        additional_args = match.group(2) if match.group(2) else None
        
        log_level = self.determine_log_level(variable, context)
        
        if additional_args:
            return f'logger.{log_level}("%s", {variable}, {additional_args})'
        else:
            return f'logger.{log_level}("%s", {variable})'
    
    def add_logger_import(self, file_content: str, file_path: str) -> str:
        """Add logger import to the file if not present."""
        # Check if logging is already imported
        if 'from lib.logging_config import get_logger' in file_content:
            return file_content
        
        if 'import logging' in file_content:
            return file_content
        
        # Determine the appropriate logger name based on file path
        if file_path.startswith('agents/'):
            logger_name = f"vana.{file_path.replace('/', '.').replace('.py', '')}"
        elif file_path.startswith('lib/'):
            logger_name = f"vana.{file_path.replace('/', '.').replace('.py', '')}"
        elif file_path.startswith('tools/'):
            logger_name = f"vana.{file_path.replace('/', '.').replace('.py', '')}"
        else:
            logger_name = f"vana.{Path(file_path).stem}"
        
        # Add import at the top after other imports
        lines = file_content.split('\n')
        import_index = 0
        
        # Find the last import statement, avoiding docstrings and comments
        in_docstring = False
        for i, line in enumerate(lines):
            stripped = line.strip()

            # Track docstring state
            if '"""' in stripped or "'''" in stripped:
                in_docstring = not in_docstring
                continue

            # Skip if in docstring or comment
            if in_docstring or stripped.startswith('#'):
                continue

            # Look for import statements
            if stripped.startswith(('import ', 'from ')) and 'logging' not in stripped:
                import_index = i + 1
        
        # Insert the logging import and logger setup
        logger_import = f"from lib.logging_config import get_logger"
        logger_setup = f'logger = get_logger("{logger_name}")'
        
        lines.insert(import_index, logger_import)
        lines.insert(import_index + 1, logger_setup)
        lines.insert(import_index + 2, "")  # Add blank line
        
        return '\n'.join(lines)
    
    def process_file(self, file_path: str) -> Dict:
        """Process a single file to replace print statements."""
        logger.info(f"Processing file: {file_path}")
        
        try:
            # Read the file
            with open(file_path, 'r', encoding='utf-8') as f:
                original_content = f.read()
            
            # Skip if no print statements
            if 'print(' not in original_content:
                logger.debug(f"No print statements found in {file_path}")
                return {'file': file_path, 'replacements': 0, 'status': 'skipped'}
            
            # Make a backup
            backup_path = f"{file_path}.backup"
            shutil.copy2(file_path, backup_path)
            
            # Process the content
            modified_content = original_content
            replacements_in_file = 0
            
            # Apply each pattern
            for pattern_info in self.patterns:
                pattern = pattern_info['pattern']
                replacement_func = pattern_info['replacement']
                
                def replace_match(match):
                    nonlocal replacements_in_file
                    replacements_in_file += 1
                    return replacement_func(match, file_path)
                
                modified_content = re.sub(pattern, replace_match, modified_content)
            
            # Add logger import if we made replacements
            if replacements_in_file > 0:
                modified_content = self.add_logger_import(modified_content, file_path)
                
                # Write the modified content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                logger.info(f"Replaced {replacements_in_file} print statements in {file_path}")
                self.replacements_made += replacements_in_file
                self.files_processed += 1
                
                return {
                    'file': file_path,
                    'replacements': replacements_in_file,
                    'status': 'success',
                    'backup': backup_path
                }
            else:
                # Remove backup if no changes made
                os.remove(backup_path)
                return {'file': file_path, 'replacements': 0, 'status': 'no_changes'}
                
        except Exception as e:
            error_msg = f"Error processing {file_path}: {e}"
            logger.error(error_msg)
            self.errors.append(error_msg)
            return {'file': file_path, 'replacements': 0, 'status': 'error', 'error': str(e)}
    
    def get_priority_files(self) -> List[str]:
        """Get list of files to process in priority order."""
        if not self.audit_data:
            return []
        
        # Get core scripts from our audit
        core_files = []
        for category, statements in self.audit_data['detailed_breakdown']['by_category'].items():
            for stmt in statements:
                file_path = stmt['file'].replace('./', '')
                if file_path not in core_files:
                    core_files.append(file_path)
        
        # Priority order
        priority_patterns = [
            'main.py',
            'agents/',
            'lib/',
            'tools/',
            'dashboard/',
            'scripts/'
        ]
        
        prioritized_files = []
        for pattern in priority_patterns:
            for file_path in core_files:
                if file_path.startswith(pattern) and file_path not in prioritized_files:
                    prioritized_files.append(file_path)
        
        # Add remaining files
        for file_path in core_files:
            if file_path not in prioritized_files:
                prioritized_files.append(file_path)
        
        return prioritized_files
    
    def run_replacement(self, max_files: Optional[int] = None) -> Dict:
        """Run the print statement replacement process."""
        logger.info("Starting print statement replacement process")
        
        files_to_process = self.get_priority_files()
        if max_files:
            files_to_process = files_to_process[:max_files]
        
        logger.info(f"Processing {len(files_to_process)} files")
        
        results = []
        for file_path in files_to_process:
            if os.path.exists(file_path):
                result = self.process_file(file_path)
                results.append(result)
            else:
                logger.warning(f"File not found: {file_path}")
        
        # Generate summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'total_files_processed': len([r for r in results if r['status'] == 'success']),
            'total_replacements': self.replacements_made,
            'errors': len(self.errors),
            'results': results
        }
        
        # Save results
        with open('print_replacement_results.json', 'w') as f:
            json.dump(summary, f, indent=2)
        
        logger.info(f"Replacement complete: {self.replacements_made} replacements in {self.files_processed} files")
        return summary


def main():
    """Main execution function."""
    logger.info("🔄 Starting Print Statement Replacement...")

    replacer = PrintStatementReplacer()

    # Process all remaining files to complete the task
    logger.info("📋 Processing all remaining files...")
    results = replacer.run_replacement()  # Process all files

    logger.info(f"\n✅ Replacement Summary:")
    logger.info(f"   Files processed: {results['total_files_processed']}")
    logger.info(f"   Print statements replaced: {results['total_replacements']}")
    logger.info(f"   Errors: {results['errors']}")

    if results['errors'] > 0:
        logger.error(f"\n❌ Errors encountered:")
        for error in replacer.errors:
            logger.error(f"   - {error}")

    logger.info(f"\n📄 Detailed results saved to: print_replacement_results.json")


if __name__ == "__main__":
    main()
