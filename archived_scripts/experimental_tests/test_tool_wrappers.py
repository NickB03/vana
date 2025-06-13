import logging
import unittest
import os
import sys
import importlib.util

# Add the project root to the Python path
ROOT_DIR = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, ROOT_DIR)

# Import tool_wrappers without triggering lib._tools __init__
spec = importlib.util.spec_from_file_location(
    "tool_wrappers",
    os.path.join(ROOT_DIR, "lib", "_tools", "tool_wrappers.py"),
)
tool_wrappers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool_wrappers)
safe_tool = tool_wrappers.safe_tool

class TestSafeTool(unittest.TestCase):
    def test_logs_exception(self):
        def failing_tool():
            raise ValueError("boom")

        wrapped = safe_tool(failing_tool)

        with self.assertLogs(tool_wrappers.logger.name, level='ERROR') as cm:
            result = wrapped()

        self.assertEqual(result, "boom")
        self.assertTrue(any("Error executing tool" in record.getMessage() for record in cm.records))

if __name__ == '__main__':
    unittest.main()
