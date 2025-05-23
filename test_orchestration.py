"""
Simple test script to verify the orchestration components.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock
import importlib.util

# Add the project directory to the Python path
sys.path.insert(0, os.path.abspath('.'))

# Import the orchestration components using importlib
def import_module(module_path):
    """Import a module from a file path."""
    try:
        module_name = os.path.basename(module_path).replace('.py', '')
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    except Exception as e:
        print(f"Error importing {module_path}: {e}")
        return None

# Import the orchestration components
task_planner_module = import_module('adk-setup/vana/orchestration/task_planner.py')
parallel_executor_module = import_module('adk-setup/vana/orchestration/parallel_executor.py')
result_validator_module = import_module('adk-setup/vana/orchestration/result_validator.py')
fallback_manager_module = import_module('adk-setup/vana/orchestration/fallback_manager.py')

# Get the classes from the modules
TaskPlanner = getattr(task_planner_module, 'TaskPlanner', None)
ParallelExecutor = getattr(parallel_executor_module, 'ParallelExecutor', None)
ResultValidator = getattr(result_validator_module, 'ResultValidator', None)
FallbackManager = getattr(fallback_manager_module, 'FallbackManager', None)

def main():
    """Test the orchestration components."""
    print("Testing orchestration components...")

    # Test TaskPlanner
    print("\nTesting TaskPlanner...")
    task_planner = TaskPlanner()
    subtasks = task_planner.decompose_task("Design a system for user authentication")
    print(f"Decomposed into {len(subtasks)} subtasks")

    # Test ParallelExecutor
    print("\nTesting ParallelExecutor...")
    executor = ParallelExecutor()

    # Test ResultValidator
    print("\nTesting ResultValidator...")
    validator = ResultValidator()

    # Test FallbackManager
    print("\nTesting FallbackManager...")
    fallback_manager = FallbackManager()

    print("\nAll components imported successfully!")

if __name__ == "__main__":
    main()
