#!/usr/bin/env python3
"""
Fix syntax errors in team.py caused by the optimization script.
The script incorrectly added memory-first instructions without properly closing strings.
"""

import re
import sys

def fix_team_py():
    """Fix all unterminated string literals in team.py"""
    
    file_path = "agents/vana/team.py"
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        print(f"📁 Reading {file_path}...")
        print(f"📊 Original file size: {len(content)} characters")
        
        # Pattern to find unterminated instruction strings
        # Look for: instruction=" followed by memory-first content but no closing """
        pattern = r'instruction="(\n## 🧠 MEMORY-FIRST DECISION STRATEGY.*?)""([^"])'
        
        # Replace with properly terminated strings
        def fix_instruction(match):
            memory_content = match.group(1)
            next_char = match.group(2)
            return f'instruction="""{memory_content}""",\n{next_char}'
        
        # Fix the pattern
        fixed_content = re.sub(pattern, fix_instruction, content, flags=re.DOTALL)
        
        # Also fix any remaining instruction=" that should be instruction="""
        fixed_content = re.sub(r'instruction="(\n## 🧠 MEMORY-FIRST)', r'instruction="""\1', fixed_content)
        
        # Ensure all memory-first blocks end with proper closing
        # Find blocks that start with """ but don't end properly
        pattern2 = r'instruction="""(\n## 🧠 MEMORY-FIRST DECISION STRATEGY.*?)(\n[^"]*?)(tools=\[)'
        
        def fix_instruction2(match):
            memory_content = match.group(1)
            middle_content = match.group(2)
            tools_start = match.group(3)
            
            # Find where the original instruction should end
            # Look for the pattern that indicates end of instruction
            if 'You are the' in middle_content:
                # Split at "You are the" and ensure proper closing
                parts = middle_content.split('You are the', 1)
                if len(parts) == 2:
                    return f'instruction="""{memory_content}\n\nYou are the{parts[1]}""",\n    {tools_start}'
            
            return f'instruction="""{memory_content}{middle_content}""",\n    {tools_start}'
        
        fixed_content = re.sub(pattern2, fix_instruction2, fixed_content, flags=re.DOTALL)
        
        print(f"📊 Fixed file size: {len(fixed_content)} characters")
        
        # Write the fixed content back
        with open(file_path, 'w') as f:
            f.write(fixed_content)
        
        print(f"✅ Fixed syntax errors in {file_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

if __name__ == "__main__":
    success = fix_team_py()
    sys.exit(0 if success else 1)
