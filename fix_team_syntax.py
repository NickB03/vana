#!/usr/bin/env python3
"""
Fix syntax errors in agents/vana/team.py caused by unterminated string literals.
"""

import re

def fix_team_syntax():
    """Fix all unterminated string literals in team.py"""

    # Read the file
    with open('agents/vana/team.py', 'r') as f:
        content = f.read()

    # Fix the specific pattern: ""You are the... -> """You are the...
    content = re.sub(r'""You are the', '"""You are the', content)

    # Fix the pattern: """", -> """,
    content = re.sub(r'"""",', '""",', content)

    # Fix any remaining unterminated strings that start with instruction="
    # and don't end properly
    lines = content.split('\n')
    fixed_lines = []

    for i, line in enumerate(lines):
        # If line contains instruction=" but doesn't end with """ or """,
        if 'instruction="' in line and not (line.strip().endswith('"""') or line.strip().endswith('""",') or line.strip().endswith('""",')):
            # Replace instruction=" with instruction="""
            fixed_line = line.replace('instruction="', 'instruction="""')
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)

    # Join back together
    final_content = '\n'.join(fixed_lines)

    # Write the fixed content
    with open('agents/vana/team.py', 'w') as f:
        f.write(final_content)

    print("✅ Fixed syntax errors in agents/vana/team.py")

if __name__ == "__main__":
    fix_team_syntax()
