#!/usr/bin/env python3
"""
Documentation Quality Check Script
Ensures all documentation is up-to-date, professional, and GitHub-ready
"""

import os
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# ANSI colors for output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m'  # No Color


def check_markdown_file(filepath: Path) -> Tuple[bool, List[str]]:
    """Check a markdown file for quality issues."""
    issues = []
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        return False, [f"Error reading file: {e}"]
    
    # Check for common issues
    
    # 1. Future dates
    future_date_pattern = r'2025|2026|2027|2028|2029|203\d'
    if re.search(future_date_pattern, content):
        matches = re.findall(future_date_pattern, content)
        issues.append(f"Contains future dates: {set(matches)}")
    
    # 2. Broken links
    link_pattern = r'\[([^\]]+)\]\(([^\)]+)\)'
    for match in re.finditer(link_pattern, content):
        link_text, link_url = match.groups()
        if link_url.startswith('#'):  # Internal anchor
            continue
        if link_url.startswith('http'):  # External link
            continue
        # Check if local file exists
        if not link_url.startswith('mailto:'):
            full_path = filepath.parent / link_url
            if not full_path.exists() and not full_path.with_suffix('.md').exists():
                issues.append(f"Broken link: [{link_text}]({link_url})")
    
    # 3. Missing headers
    if not lines or not lines[0].startswith('#'):
        issues.append("Missing main header (# Title)")
    
    # 4. Trailing whitespace
    for i, line in enumerate(lines):
        if line.endswith(' ') or line.endswith('\t'):
            issues.append(f"Trailing whitespace on line {i+1}")
    
    # 5. TODO or FIXME comments
    todo_pattern = r'TODO|FIXME|XXX|HACK'
    if re.search(todo_pattern, content, re.IGNORECASE):
        issues.append("Contains TODO/FIXME comments")
    
    # 6. Inconsistent header hierarchy
    headers = [line for line in lines if line.startswith('#')]
    prev_level = 0
    for header in headers:
        level = len(header.split()[0])
        if prev_level > 0 and level > prev_level + 1:
            issues.append(f"Header hierarchy jump: {header[:50]}")
        prev_level = level
    
    # 7. Empty code blocks
    if '```\n```' in content or '```\n\n```' in content:
        issues.append("Contains empty code blocks")
    
    # 8. Unformatted URLs
    url_pattern = r'(?<![\(\[])(https?://[^\s\)\]]+)'
    if re.search(url_pattern, content):
        issues.append("Contains unformatted URLs (should use [text](url) format)")
    
    return len(issues) == 0, issues


def check_documentation_structure() -> Dict[str, any]:
    """Check overall documentation structure and consistency."""
    results = {
        'total_files': 0,
        'passed': 0,
        'failed': 0,
        'issues_by_file': {},
        'missing_essential': []
    }
    
    # Essential documentation files
    essential_files = [
        'README.md',
        'CLAUDE.md',
        'docs/GETTING_STARTED.md',
        'docs/API_REFERENCE.md',
        'docs/ARCHITECTURE.md'
    ]
    
    # Check essential files exist
    for essential in essential_files:
        if not Path(essential).exists():
            results['missing_essential'].append(essential)
    
    # Find all markdown files
    for md_file in Path('.').rglob('*.md'):
        # Skip some directories
        if any(skip in str(md_file) for skip in ['node_modules', '.venv', 'venv', '.git']):
            continue
        
        results['total_files'] += 1
        passed, issues = check_markdown_file(md_file)
        
        if passed:
            results['passed'] += 1
        else:
            results['failed'] += 1
            results['issues_by_file'][str(md_file)] = issues
    
    return results


def check_readme_sections() -> List[str]:
    """Check if README has all required sections."""
    required_sections = [
        'Overview',
        'Features',
        'Quick Start',
        'Prerequisites',
        'Installation',
        'Architecture',
        'Documentation',
        'Contributing',
        'License'
    ]
    
    missing = []
    
    try:
        with open('README.md', 'r') as f:
            content = f.read().lower()
        
        for section in required_sections:
            if section.lower() not in content:
                missing.append(section)
    
    except FileNotFoundError:
        missing = required_sections
    
    return missing


def check_documentation_consistency() -> Dict[str, List[str]]:
    """Check for consistency across documentation."""
    inconsistencies = {
        'version_mismatches': [],
        'feature_discrepancies': [],
        'status_conflicts': []
    }
    
    # Common patterns to check
    version_pattern = r'(?:Phase|Version|v)\s*(\d+(?:\.\d+)*)'
    status_pattern = r'Status:\s*([^\n]+)'
    
    versions_found = {}
    statuses_found = {}
    
    for md_file in Path('.').rglob('*.md'):
        if any(skip in str(md_file) for skip in ['node_modules', '.venv', 'venv', '.git']):
            continue
        
        try:
            with open(md_file, 'r') as f:
                content = f.read()
            
            # Check versions
            for match in re.finditer(version_pattern, content):
                version = match.group(1)
                if version not in versions_found:
                    versions_found[version] = []
                versions_found[version].append(str(md_file))
            
            # Check status
            for match in re.finditer(status_pattern, content):
                status = match.group(1).strip()
                if status not in statuses_found:
                    statuses_found[status] = []
                statuses_found[status].append(str(md_file))
        
        except Exception:
            continue
    
    # Report inconsistencies
    if len(versions_found) > 1:
        inconsistencies['version_mismatches'] = [
            f"{v}: {', '.join(files[:3])}" for v, files in versions_found.items()
        ]
    
    if len(statuses_found) > 1:
        inconsistencies['status_conflicts'] = [
            f"{s}: {', '.join(files[:3])}" for s, files in statuses_found.items()
        ]
    
    return inconsistencies


def main():
    """Run all documentation quality checks."""
    print(f"{GREEN}📚 VANA Documentation Quality Check{NC}")
    print("=" * 50)
    
    # Check overall structure
    print(f"\n{YELLOW}Checking documentation structure...{NC}")
    results = check_documentation_structure()
    
    print(f"Total files checked: {results['total_files']}")
    print(f"{GREEN}✅ Passed: {results['passed']}{NC}")
    print(f"{RED}❌ Failed: {results['failed']}{NC}")
    
    if results['missing_essential']:
        print(f"\n{RED}Missing essential files:{NC}")
        for missing in results['missing_essential']:
            print(f"  - {missing}")
    
    if results['issues_by_file']:
        print(f"\n{YELLOW}Issues found:{NC}")
        for filepath, issues in list(results['issues_by_file'].items())[:10]:  # Show first 10
            print(f"\n{filepath}:")
            for issue in issues[:3]:  # Show first 3 issues per file
                print(f"  - {issue}")
        
        if len(results['issues_by_file']) > 10:
            print(f"\n... and {len(results['issues_by_file']) - 10} more files with issues")
    
    # Check README sections
    print(f"\n{YELLOW}Checking README completeness...{NC}")
    missing_sections = check_readme_sections()
    
    if missing_sections:
        print(f"{RED}Missing README sections:{NC}")
        for section in missing_sections:
            print(f"  - {section}")
    else:
        print(f"{GREEN}✅ README has all required sections{NC}")
    
    # Check consistency
    print(f"\n{YELLOW}Checking documentation consistency...{NC}")
    inconsistencies = check_documentation_consistency()
    
    if any(inconsistencies.values()):
        print(f"{YELLOW}Potential inconsistencies found:{NC}")
        for issue_type, issues in inconsistencies.items():
            if issues:
                print(f"\n{issue_type}:")
                for issue in issues[:5]:  # Show first 5
                    print(f"  - {issue}")
    else:
        print(f"{GREEN}✅ Documentation appears consistent{NC}")
    
    # Summary
    print(f"\n{GREEN}Summary:{NC}")
    print(f"- Total documentation files: {results['total_files']}")
    print(f"- Quality pass rate: {results['passed']/results['total_files']*100:.1f}%")
    print(f"- Essential files: {'✅ All present' if not results['missing_essential'] else f'❌ {len(results['missing_essential'])} missing'}")
    print(f"- README completeness: {'✅ Complete' if not missing_sections else f'❌ {len(missing_sections)} sections missing'}")
    
    # Exit code
    if results['failed'] > 0 or results['missing_essential'] or missing_sections:
        print(f"\n{RED}Documentation needs attention!{NC}")
        return 1
    else:
        print(f"\n{GREEN}Documentation quality check passed!{NC}")
        return 0


if __name__ == "__main__":
    exit(main())