"""
Shell Executor for VANA Sandbox Environment

Provides secure shell script execution with comprehensive security validation,
command filtering, and Docker container isolation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_executor import BaseExecutor, ExecutorResult

logger = logging.getLogger(__name__)


class ShellExecutor(BaseExecutor):
    """
    Shell-specific executor with enhanced security and functionality.

    Provides secure shell script execution with:
    - Command filtering and validation
    - Path restrictions
    - Resource monitoring
    - Safe utility command support
    """

    def __init__(self, security_manager):
        """Initialize Shell executor."""
        super().__init__(security_manager, "shell")

    def _get_code_filename(self) -> str:
        """Get filename for shell script."""
        return "script.sh"

    def _get_execution_command(self) -> List[str]:
        """Get command to execute shell script."""
        return ["bash", "/workspace/wrapper.sh"]

    def _get_environment_variables(self) -> Dict[str, str]:
        """Get shell-specific environment variables."""
        env = super()._get_environment_variables()
        env.update(
            {
                "PATH": "/usr/local/bin:/usr/bin:/bin",
                "SHELL": "/bin/bash",
                "TERM": "xterm",
                "PS1": "sandbox$ ",
                "HISTFILE": "/dev/null",  # Disable history
                "HISTSIZE": "0",
                "HISTFILESIZE": "0",
            }
        )
        return env

    async def _prepare_additional_files(self, workspace_path: Path, execution_id: str):
        """Prepare additional shell-specific files."""
        # Create execution wrapper
        wrapper_code = self._create_execution_wrapper()
        wrapper_file = workspace_path / "wrapper.sh"
        wrapper_file.write_text(wrapper_code, encoding="utf-8")

        # Make wrapper executable
        import os

        os.chmod(wrapper_file, 0o755)

        # Create safe command validator
        validator_code = self._create_command_validator()
        validator_file = workspace_path / "validate_commands.sh"
        validator_file.write_text(validator_code, encoding="utf-8")
        os.chmod(validator_file, 0o755)

        # Create output capture script
        capture_code = self._create_output_capture()
        capture_file = workspace_path / "capture_output.sh"
        capture_file.write_text(capture_code, encoding="utf-8")
        os.chmod(capture_file, 0o755)

    def _create_execution_wrapper(self) -> str:
        """Create a shell wrapper for safe execution."""
        return """#!/bin/bash

# VANA Sandbox Shell Execution Wrapper
# Provides safe shell script execution with command validation and output capture

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Initialize result tracking
RESULT_FILE="/workspace/result.json"
START_TIME=$(date +%s.%N)
EXIT_CODE=0
OUTPUT=""
ERROR_OUTPUT=""

# Function to write result
write_result() {
    local end_time=$(date +%s.%N)
    local execution_time=$(echo "$end_time - $START_TIME" | bc -l 2>/dev/null || echo "0")

    cat > "$RESULT_FILE" << EOF
{
  "output": $(echo "$OUTPUT" | jq -R -s .),
  "error": $(echo "$ERROR_OUTPUT" | jq -R -s . | sed 's/^""/null/' | sed 's/""$/null/'),
  "exit_code": $EXIT_CODE,
  "execution_time": $execution_time,
  "metadata": {
    "shell": "bash",
    "wrapper_version": "1.0"
  }
}
EOF
}

# Function to validate commands
validate_script() {
    local script_file="$1"

    # Check for forbidden commands
    local forbidden_commands=(
        "rm" "rmdir" "mv" "cp" "chmod" "chown" "chgrp"
        "sudo" "su" "passwd" "useradd" "userdel" "usermod"
        "mount" "umount" "fdisk" "mkfs" "fsck" "dd"
        "wget" "curl" "nc" "netcat" "ssh" "scp" "rsync"
        "iptables" "ufw" "systemctl" "service" "crontab"
        "kill" "killall" "pkill"
    )

    for cmd in "${forbidden_commands[@]}"; do
        if grep -q "\\b$cmd\\b" "$script_file"; then
            echo "ERROR: Forbidden command detected: $cmd" >&2
            return 1
        fi
    done

    # Check for dangerous patterns
    local forbidden_patterns=(
        ">" "/dev/"
        "|" "sh"
        "&&"
        "||"
        '`.*`'
        '\\$\\('
        '\\.\\./.*'
        '/etc/'
        '/proc/'
        '/sys/'
        '/var/'
        '/usr/'
        '/bin/'
        '/sbin/'
        '/lib/'
        '/opt/'
        '/root/'
    )

    for pattern in "${forbidden_patterns[@]}"; do
        if grep -qE "$pattern" "$script_file"; then
            echo "ERROR: Forbidden pattern detected: $pattern" >&2
            return 1
        fi
    done

    return 0
}

# Function to execute script safely
execute_script() {
    local script_file="$1"

    # Validate script first
    if ! validate_script "$script_file"; then
        ERROR_OUTPUT="Script validation failed: contains forbidden commands or patterns"
        EXIT_CODE=1
        return 1
    fi

    # Create temporary output files
    local stdout_file=$(mktemp)
    local stderr_file=$(mktemp)

    # Execute script with output capture and timeout
    timeout 30s bash "$script_file" > "$stdout_file" 2> "$stderr_file"
    local script_exit_code=$?

    # Read output
    OUTPUT=$(cat "$stdout_file" 2>/dev/null || echo "")
    ERROR_OUTPUT=$(cat "$stderr_file" 2>/dev/null || echo "")

    # Clean up temp files
    rm -f "$stdout_file" "$stderr_file" 2>/dev/null || true

    # Handle timeout
    if [ $script_exit_code -eq 124 ]; then
        ERROR_OUTPUT="Script execution timed out after 30 seconds"
        EXIT_CODE=124
        return 124
    fi

    EXIT_CODE=$script_exit_code
    return $script_exit_code
}

# Main execution
main() {
    echo "=== VANA Shell Sandbox Execution ===" >&2

    # Check if script file exists
    if [ ! -f "/workspace/script.sh" ]; then
        ERROR_OUTPUT="Script file not found: /workspace/script.sh"
        EXIT_CODE=1
        write_result
        echo "$ERROR_OUTPUT" >&2
        exit 1
    fi

    # Execute the script
    execute_script "/workspace/script.sh"
    local exec_result=$?

    # Write result
    write_result

    # Output results
    echo "=== EXECUTION RESULT ===" >&2
    if [ -n "$OUTPUT" ]; then
        echo "OUTPUT:" >&2
        echo "$OUTPUT"
    fi
    if [ -n "$ERROR_OUTPUT" ]; then
        echo "ERROR:" >&2
        echo "$ERROR_OUTPUT" >&2
    fi
    echo "EXIT CODE: $EXIT_CODE" >&2

    exit $EXIT_CODE
}

# Trap to ensure result is written on exit
trap 'write_result' EXIT

# Run main function
main "$@"
"""

    def _create_command_validator(self) -> str:
        """Create command validator script."""
        return """#!/bin/bash

# Command validator for VANA Shell Sandbox
# Validates shell commands against security policies

validate_command() {
    local command="$1"

    # List of allowed commands
    local allowed_commands=(
        "echo" "printf" "cat" "head" "tail" "wc" "grep" "sed" "awk"
        "cut" "sort" "uniq" "tr" "tee" "xargs" "find" "ls" "pwd"
        "date" "whoami" "id" "env" "which" "type" "test" "true" "false"
        "sleep" "bc" "expr" "seq" "yes" "basename" "dirname" "readlink"
        "stat" "file" "du" "df" "free" "uptime" "uname" "hostname"
        "jq" "tree" "less" "more" "vim" "nano"
    )

    # Check if command is in allowed list
    for allowed in "${allowed_commands[@]}"; do
        if [ "$command" = "$allowed" ]; then
            return 0
        fi
    done

    echo "Command '$command' is not allowed in sandbox" >&2
    return 1
}

# Validate all commands in a script
validate_script_commands() {
    local script_file="$1"

    # Extract commands from script (basic parsing)
    while IFS= read -r line; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// }" ]] && continue

        # Extract first word (command)
        local command=$(echo "$line" | awk '{print $1}')

        # Skip shell keywords and built-ins
        case "$command" in
            if|then|else|elif|fi|for|while|do|done|case|esac|function|{|}|[[|]]|(|)) continue ;;
        esac

        # Validate command
        if [ -n "$command" ] && ! validate_command "$command"; then
            return 1
        fi

    done < "$script_file"

    return 0
}

# Main function
if [ $# -eq 0 ]; then
    echo "Usage: $0 <script_file>" >&2
    exit 1
fi

validate_script_commands "$1"
"""

    def _create_output_capture(self) -> str:
        """Create output capture script."""
        return """#!/bin/bash

# Output capture for VANA Shell Sandbox
# Captures and formats execution output

capture_output() {
    local result_file="/workspace/result.json"

    if [ ! -f "$result_file" ]; then
        echo "Result file not found" >&2
        exit 1
    fi

    # Parse and output result
    local output=$(jq -r '.output // ""' "$result_file" 2>/dev/null)
    local error=$(jq -r '.error // ""' "$result_file" 2>/dev/null)
    local exit_code=$(jq -r '.exit_code // 1' "$result_file" 2>/dev/null)

    # Output to stdout
    if [ "$output" != "null" ] && [ -n "$output" ]; then
        echo "$output"
    fi

    # Output errors to stderr
    if [ "$error" != "null" ] && [ -n "$error" ]; then
        echo "$error" >&2
    fi

    exit "$exit_code"
}

capture_output
"""

    async def _run_container(self, container, code: str, execution_id: str) -> ExecutorResult:
        """Enhanced container execution with shell-specific handling."""
        try:
            # Start container
            container.start()

            # Wait for container to complete with timeout
            timeout = self.security_manager.get_resource_limits().get("max_execution_time", 30)

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
                    result_data = self._extract_result_from_container(container)
                    if result_data:
                        return ExecutorResult(
                            output=result_data.get("output", output),
                            error=result_data.get("error") or (error_output if error_output else None),
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

        return None
