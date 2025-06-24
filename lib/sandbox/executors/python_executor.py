"""
Python Executor for VANA Sandbox Environment

Provides secure Python code execution with comprehensive security validation,
resource monitoring, and Docker container isolation.
"""

import json
import logging
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Dict, List

from .base_executor import BaseExecutor, ExecutorResult

logger = logging.getLogger(__name__)


class PythonExecutor(BaseExecutor):
    """
    Python-specific executor with enhanced security and functionality.

    Provides secure Python code execution with:
    - AST-based security validation
    - Import restrictions
    - Resource monitoring
    - Data science library support
    """

    def __init__(self, security_manager):
        """Initialize Python executor."""
        super().__init__(security_manager, "python")

    def _get_code_filename(self) -> str:
        """Get filename for Python code."""
        return "main.py"

    def _get_execution_command(self) -> List[str]:
        """Get command to execute Python code."""
        return ["python3", "/workspace/main.py"]

    def _get_environment_variables(self) -> Dict[str, str]:
        """Get Python-specific environment variables."""
        env = super()._get_environment_variables()
        env.update(
            {
                "PYTHONPATH": "/workspace",
                "PYTHONDONTWRITEBYTECODE": "1",
                "PYTHONUNBUFFERED": "1",
                "PYTHONIOENCODING": "utf-8",
                "LANG": "C.UTF-8",
                "LC_ALL": "C.UTF-8",
            }
        )
        return env

    async def _prepare_additional_files(self, workspace_path: Path, execution_id: str):
        """Prepare additional Python-specific files."""
        # Create a requirements.txt if needed for dynamic imports
        requirements_file = workspace_path / "requirements.txt"
        requirements_file.write_text("# Dynamic requirements\n", encoding="utf-8")

        # Create a safe execution wrapper
        wrapper_code = self._create_execution_wrapper()
        wrapper_file = workspace_path / "wrapper.py"
        wrapper_file.write_text(wrapper_code, encoding="utf-8")

        # Create output capture script
        output_script = self._create_output_capture_script()
        output_file = workspace_path / "capture_output.py"
        output_file.write_text(output_script, encoding="utf-8")

    def _create_execution_wrapper(self) -> str:
        """Create a Python wrapper for safe execution."""
        return '''
import sys
import json
import traceback
import time
import io
from contextlib import redirect_stdout, redirect_stderr

def safe_execute():
    """Execute the main code with output capture and error handling."""
    start_time = time.time()

    # Capture stdout and stderr
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()

    result = {
        "output": "",
        "error": None,
        "execution_time": 0,
        "exit_code": 0,
        "metadata": {}
    }

    try:
        # Read the main code
        with open('/workspace/main.py', 'r') as f:
            code = f.read()

        # Create a restricted globals environment
        restricted_globals = {
            '__builtins__': {
                'print': print,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'range': range,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'sum': sum,
                'min': min,
                'max': max,
                'abs': abs,
                'round': round,
                'sorted': sorted,
                'reversed': reversed,
                'any': any,
                'all': all,
                'isinstance': isinstance,
                'type': type,
                'ValueError': ValueError,
                'TypeError': TypeError,
                'IndexError': IndexError,
                'KeyError': KeyError,
                'AttributeError': AttributeError,
                'ZeroDivisionError': ZeroDivisionError,
                'Exception': Exception,
            }
        }

        # Add safe imports
        import math
        import random
        import datetime
        import json as json_module
        import re

        # Add commonly used safe modules
        restricted_globals.update({
            'math': math,
            'random': random,
            'datetime': datetime,
            'json': json_module,
            're': re,
        })

        # Try to import data science libraries safely
        try:
            import numpy as np
            import pandas as pd
            import matplotlib.pyplot as plt
            restricted_globals.update({
                'np': np,
                'numpy': np,
                'pd': pd,
                'pandas': pd,
                'plt': plt,
                'matplotlib': plt
            })
        except ImportError:
            pass

        # Execute code with output capture
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            exec(code, restricted_globals)

        result["output"] = stdout_capture.getvalue()
        stderr_output = stderr_capture.getvalue()
        if stderr_output:
            result["error"] = stderr_output

    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)}\\n{traceback.format_exc()}"
        result["exit_code"] = 1

    result["execution_time"] = time.time() - start_time

    # Write result to file for container to read
    with open('/workspace/result.json', 'w') as f:
        json.dump(result, f, indent=2, default=str)

    # Also print to stdout for immediate feedback
    logger.info("=== EXECUTION RESULT ===")
    if result["output"]:
        logger.info("OUTPUT:")
        logger.info("%s", result["output"])
    if result["error"]:
        logger.error("ERROR:")
        logger.error("%s", result["error"])
    logger.info("%s", f"EXECUTION TIME: {result['execution_time']:.3f}s")
    logger.info("%s", f"EXIT CODE: {result['exit_code']}")

if __name__ == "__main__":
    safe_execute()
'''

    def _create_output_capture_script(self) -> str:
        """Create output capture script for enhanced result handling."""
        return '''
import json
import sys

def capture_and_format_output():
    """Capture execution result and format for container output."""
    try:
        with open('/workspace/result.json', 'r') as f:
            result = json.load(f)

        # Format output for container logs
        if result.get("output"):
            logger.info("%s", result["output"], end="")

        if result.get("error"):
            logger.error("%s", result["error"], file=sys.stderr, end="")

        # Exit with appropriate code
        sys.exit(result.get("exit_code", 0))

    except FileNotFoundError:
        logger.info("Execution result not found", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to process execution result: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    capture_and_format_output()
'''

    def _get_execution_command(self) -> List[str]:
        """Get enhanced Python execution command with wrapper."""
        return ["python3", "/workspace/wrapper.py"]

    async def _run_container(
        self, container, code: str, execution_id: str
    ) -> ExecutorResult:
        """Enhanced container execution with Python-specific handling."""
        try:
            # Start container
            container.start()

            # Wait for container to complete with timeout
            timeout = self.security_manager.get_resource_limits().get(
                "max_execution_time", 30
            )

            try:
                exit_code = container.wait(timeout=timeout)
                if isinstance(exit_code, dict):
                    exit_code = exit_code.get("StatusCode", 0)
            except Exception:
                # Container timed out
                container.kill()
                return ExecutorResult(
                    output="",
                    error=f"Execution timed out after {timeout} seconds",
                    exit_code=124,
                    execution_time=0,
                    container_id=container.id,
                    metadata={"timeout": True, "timeout_seconds": timeout},
                )

            # Get output and errors
            try:
                output = container.logs(stdout=True, stderr=False).decode("utf-8")
                error_output = container.logs(stdout=False, stderr=True).decode("utf-8")

                # Try to get enhanced result from JSON file
                try:
                    # Copy result file from container if it exists
                    result_data = self._extract_result_from_container(container)
                    if result_data:
                        return ExecutorResult(
                            output=result_data.get("output", output),
                            error=result_data.get("error")
                            or (error_output if error_output else None),
                            exit_code=result_data.get("exit_code", exit_code),
                            execution_time=result_data.get("execution_time", 0),
                            container_id=container.id,
                            metadata={
                                "container_name": container.name,
                                "enhanced_result": True,
                                **result_data.get("metadata", {}),
                            },
                        )
                except Exception as e:
                    logger.debug(f"Could not extract enhanced result: {e}")

                # Fallback to basic result
                return ExecutorResult(
                    output=output,
                    error=error_output if error_output else None,
                    exit_code=exit_code,
                    execution_time=0,
                    container_id=container.id,
                    metadata={
                        "container_name": container.name,
                        "enhanced_result": False,
                    },
                )

            except Exception as e:
                return ExecutorResult(
                    output="",
                    error=f"Failed to retrieve container output: {e}",
                    exit_code=1,
                    execution_time=0,
                    container_id=container.id,
                    metadata={"output_error": True},
                )

        except Exception as e:
            return ExecutorResult(
                output="",
                error=f"Container execution failed: {e}",
                exit_code=1,
                execution_time=0,
                container_id=container.id if container else None,
                metadata={"execution_error": True},
            )

    def _extract_result_from_container(self, container) -> Dict[str, Any]:
        """Extract enhanced result data from container."""
        try:
            # Get the result file from container
            archive, _ = container.get_archive("/workspace/result.json")

            # Extract and parse the JSON result
            import io
            import tarfile

            tar_stream = io.BytesIO()
            for chunk in archive:
                tar_stream.write(chunk)
            tar_stream.seek(0)

            with tarfile.open(fileobj=tar_stream, mode="r") as tar:
                result_file = tar.extractfile("result.json")
                if result_file:
                    result_data = json.loads(result_file.read().decode("utf-8"))
                    return result_data

        except Exception as e:
            logger.debug(f"Could not extract result file: {e}")

        return {}

    async def _execute_fallback(
        self, code: str, execution_id: str, start_time: float
    ) -> ExecutorResult:
        """
        Fallback Python execution when Docker is not available.

        Executes Python code directly with basic security restrictions.
        This is less secure than Docker execution but allows basic functionality.
        """
        timeout = self.security_manager.get_resource_limits().get(
            "max_execution_time", 30
        )

        try:
            # Validate code first
            self.security_manager.validate_code(code, "python")

            # Create temporary file for code
            with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                # Execute Python code with timeout
                result = subprocess.run(
                    ["python3", temp_file],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    cwd=tempfile.gettempdir(),
                )

                return ExecutorResult(
                    output=result.stdout,
                    error=result.stderr if result.stderr else None,
                    exit_code=result.returncode,
                    execution_time=time.time() - start_time,
                    container_id=None,
                    metadata={
                        "fallback_execution": True,
                        "docker_available": False,
                        "language": "python",
                        "security_validated": True,
                    },
                )

            finally:
                # Clean up temporary file
                try:
                    os.unlink(temp_file)
                except (OSError, FileNotFoundError):
                    pass

        except subprocess.TimeoutExpired:
            return ExecutorResult(
                output="",
                error=f"Execution timed out after {timeout} seconds",
                exit_code=124,
                execution_time=time.time() - start_time,
                container_id=None,
                metadata={
                    "fallback_execution": True,
                    "timeout": True,
                    "timeout_seconds": timeout,
                },
            )

        except Exception as e:
            return ExecutorResult(
                output="",
                error=f"Fallback execution failed: {str(e)}",
                exit_code=1,
                execution_time=time.time() - start_time,
                container_id=None,
                metadata={
                    "fallback_execution": True,
                    "execution_error": True,
                    "error_type": type(e).__name__,
                },
            )
