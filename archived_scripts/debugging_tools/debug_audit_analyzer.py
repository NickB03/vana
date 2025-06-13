#!/usr/bin/env python3
"""
Debug Code Audit Analyzer
Analyzes print statements found in the VANA codebase and generates a comprehensive report.
"""

import json
import re
import os
from collections import defaultdict, Counter
from datetime import datetime
from pathlib import Path

def parse_grep_output(file_path):
    """Parse grep output file and extract print statement information."""
    print_statements = []
    
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
                
            # Parse grep output format: filename:line_number:content
            parts = line.split(':', 2)
            if len(parts) >= 3:
                file_path = parts[0]
                line_number = parts[1]
                content = parts[2]
                
                print_statements.append({
                    'file': file_path,
                    'line': int(line_number) if line_number.isdigit() else 0,
                    'content': content.strip(),
                    'raw_line': line
                })
    
    return print_statements

def categorize_by_directory(print_statements):
    """Categorize print statements by directory structure."""
    categories = defaultdict(list)
    
    for stmt in print_statements:
        file_path = stmt['file']
        
        # Remove leading ./
        if file_path.startswith('./'):
            file_path = file_path[2:]
        
        # Determine category based on path
        if file_path.startswith('agents/'):
            category = 'agents'
        elif file_path.startswith('lib/'):
            category = 'lib'
        elif file_path.startswith('tests/'):
            category = 'tests'
        elif file_path.startswith('scripts/'):
            category = 'scripts'
        elif file_path.startswith('dashboard/'):
            category = 'dashboard'
        elif file_path.startswith('deployment/'):
            category = 'deployment'
        elif file_path in ['main.py', 'app.py']:
            category = 'main'
        else:
            category = 'other'
        
        categories[category].append(stmt)
    
    return dict(categories)

def analyze_print_content(print_statements):
    """Analyze print statement content to determine purpose."""
    purposes = defaultdict(list)
    
    debug_patterns = [
        r'debug', r'DEBUG', r'Debug',
        r'print\s*\(\s*["\'].*debug.*["\']',
        r'print\s*\(\s*f["\'].*debug.*["\']'
    ]
    
    info_patterns = [
        r'info', r'INFO', r'Info',
        r'status', r'Status', r'STATUS',
        r'starting', r'Starting', r'STARTING',
        r'completed', r'Completed', r'COMPLETED'
    ]
    
    error_patterns = [
        r'error', r'ERROR', r'Error',
        r'exception', r'Exception', r'EXCEPTION',
        r'failed', r'Failed', r'FAILED',
        r'warning', r'Warning', r'WARNING'
    ]
    
    for stmt in print_statements:
        content = stmt['content'].lower()
        
        # Check for specific patterns
        if any(re.search(pattern, content, re.IGNORECASE) for pattern in debug_patterns):
            purpose = 'debug'
        elif any(re.search(pattern, content, re.IGNORECASE) for pattern in error_patterns):
            purpose = 'error_handling'
        elif any(re.search(pattern, content, re.IGNORECASE) for pattern in info_patterns):
            purpose = 'info'
        elif 'f"' in content or "f'" in content:
            purpose = 'formatted_output'
        elif any(word in content for word in ['result', 'response', 'output']):
            purpose = 'result_display'
        elif any(word in content for word in ['test', 'testing', 'assert']):
            purpose = 'testing'
        else:
            purpose = 'general'
        
        stmt['purpose'] = purpose
        purposes[purpose].append(stmt)
    
    return dict(purposes)

def generate_statistics(print_statements, categories, purposes):
    """Generate comprehensive statistics."""
    stats = {
        'total_print_statements': len(print_statements),
        'by_category': {cat: len(stmts) for cat, stmts in categories.items()},
        'by_purpose': {purpose: len(stmts) for purpose, stmts in purposes.items()},
        'top_files': {},
        'analysis_timestamp': datetime.now().isoformat()
    }
    
    # Count by file
    file_counts = Counter(stmt['file'] for stmt in print_statements)
    stats['top_files'] = dict(file_counts.most_common(20))
    
    return stats

def main():
    """Main execution function."""
    print("🔍 Starting Debug Code Audit Analysis...")
    
    # Parse the grep output
    grep_file = '/tmp/vana_print_audit.txt'
    if not os.path.exists(grep_file):
        print(f"❌ Error: {grep_file} not found. Run the grep command first.")
        return
    
    print(f"📖 Parsing print statements from {grep_file}...")
    print_statements = parse_grep_output(grep_file)
    print(f"✅ Found {len(print_statements)} print statements")
    
    # Categorize by directory
    print("📂 Categorizing by directory structure...")
    categories = categorize_by_directory(print_statements)
    
    # Analyze content for purpose
    print("🎯 Analyzing content for purpose...")
    purposes = analyze_print_content(print_statements)
    
    # Generate statistics
    print("📊 Generating statistics...")
    stats = generate_statistics(print_statements, categories, purposes)
    
    # Create comprehensive report
    report = {
        'audit_metadata': {
            'timestamp': datetime.now().isoformat(),
            'total_files_scanned': len(set(stmt['file'] for stmt in print_statements)),
            'total_print_statements': len(print_statements),
            'analysis_version': '1.0'
        },
        'statistics': stats,
        'categories': {cat: len(stmts) for cat, stmts in categories.items()},
        'purposes': {purpose: len(stmts) for purpose, stmts in purposes.items()},
        'detailed_breakdown': {
            'by_category': categories,
            'by_purpose': purposes
        }
    }
    
    # Save detailed report
    output_file = 'debug_audit_report.json'
    print(f"💾 Saving detailed report to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    # Print summary
    print("\n" + "="*60)
    print("🎉 DEBUG CODE AUDIT COMPLETE")
    print("="*60)
    print(f"📊 Total Print Statements: {stats['total_print_statements']}")
    print(f"📁 Files Analyzed: {len(set(stmt['file'] for stmt in print_statements))}")
    print("\n📂 By Category:")
    for category, count in sorted(stats['by_category'].items(), key=lambda x: x[1], reverse=True):
        print(f"   {category}: {count}")
    print("\n🎯 By Purpose:")
    for purpose, count in sorted(stats['by_purpose'].items(), key=lambda x: x[1], reverse=True):
        print(f"   {purpose}: {count}")
    print(f"\n📄 Detailed report saved to: {output_file}")
    print("="*60)

if __name__ == "__main__":
    main()
