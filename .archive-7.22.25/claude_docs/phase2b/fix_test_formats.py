#!/usr/bin/env python3
"""
Fix all test files to have correct ADK evalset format.
"""

import json
import os
from pathlib import Path

def fix_test_file(file_path):
    """Convert test file to proper evalset format."""
    print(f"Fixing: {file_path}")
    
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Check if already in correct format
    if 'eval_set_id' in data and 'eval_cases' in data:
        print(f"  ✓ Already in correct format")
        return
    
    # Extract test name from filename
    test_name = Path(file_path).stem.replace('.test', '')
    
    # Convert to evalset format
    evalset = {
        "eval_set_id": f"{test_name}_evalset",
        "eval_cases": [data]  # Wrap existing test in eval_cases array
    }
    
    # Write back
    with open(file_path, 'w') as f:
        json.dump(evalset, f, indent=2)
    
    print(f"  ✓ Converted to evalset format")

def main():
    """Fix all test files in the tests directory."""
    test_dirs = [
        "/Users/nick/Development/vana/tests/unit/orchestrator",
        "/Users/nick/Development/vana/tests/unit/specialists", 
        "/Users/nick/Development/vana/tests/unit/tools",
        "/Users/nick/Development/vana/tests/performance"
    ]
    
    for test_dir in test_dirs:
        if not os.path.exists(test_dir):
            continue
            
        print(f"\nProcessing {test_dir}...")
        for file in Path(test_dir).glob("*.test.json"):
            fix_test_file(file)
    
    print("\n✅ All test files updated")

if __name__ == "__main__":
    main()