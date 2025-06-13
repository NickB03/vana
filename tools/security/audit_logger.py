"""
Audit Logger for VANA

This module provides secure audit logging for sensitive operations in the VANA project.
It creates tamper-evident logs with proper metadata and security information.
"""

import datetime
import hashlib
import json
import logging
import os
import uuid
from typing import Any, Dict, List, Optional

# Set up logging
logger = logging.getLogger(__name__)


class AuditLogger:
    """
    Audit Logger for sensitive operations.

    This class provides secure, tamper-evident logging for sensitive operations
    with proper metadata and security information.
    """

    def __init__(self, log_dir: Optional[str] = None):
        """
        Initialize the audit logger.

        Args:
            log_dir: Directory to store audit logs (optional)
        """
        # Set log directory
        self.log_dir = log_dir or os.path.join(os.environ.get("VANA_DATA_DIR", "."), "audit_logs")

        # Create log directory if it doesn't exist
        os.makedirs(self.log_dir, exist_ok=True)

        # Current log file
        self.current_log_file = self._get_log_file_path()

        # Previous log hash for tamper evidence
        self.previous_log_hash = self._get_last_log_hash()

        logger.info(f"Audit Logger initialized with log directory: {self.log_dir}")

    def _get_log_file_path(self) -> str:
        """
        Get the path for the current log file.

        Returns:
            Path to the current log file
        """
        # Use date-based log files
        date_str = datetime.datetime.now().strftime("%Y-%m-%d")
        return os.path.join(self.log_dir, f"audit_{date_str}.log")

    def _get_last_log_hash(self) -> str:
        """
        Get the hash of the last log entry.

        Returns:
            Hash of the last log entry, or empty string if no logs exist
        """
        log_file = self.current_log_file

        if not os.path.exists(log_file):
            return ""

        try:
            with open(log_file, "r") as f:
                # Read the last line
                lines = f.readlines()
                if not lines:
                    return ""

                last_line = lines[-1].strip()
                if not last_line:
                    return ""

                # Parse the last log entry
                log_entry = json.loads(last_line)
                return log_entry.get("hash", "")
        except Exception as e:
            logger.error(f"Error reading last log hash: {str(e)}")
            return ""

    def _compute_log_hash(self, log_data: Dict[str, Any]) -> str:
        """
        Compute a hash for a log entry.

        Args:
            log_data: Log data to hash

        Returns:
            Hash of the log data
        """
        # Create a string representation of the log data
        log_str = json.dumps(log_data, sort_keys=True)

        # Combine with previous hash for tamper evidence
        combined = f"{self.previous_log_hash}:{log_str}"

        # Compute hash
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def log_event(
        self,
        event_type: str,
        user_id: str,
        operation: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = "success",
    ) -> bool:
        """
        Log an audit event.

        Args:
            event_type: Type of event (e.g., "access", "modification", "deletion")
            user_id: ID of the user or agent performing the operation
            operation: Operation being performed
            resource_type: Type of resource being accessed
            resource_id: ID of the resource being accessed (optional)
            details: Additional details about the operation (optional)
            status: Status of the operation (default: "success")

        Returns:
            True if the event was logged successfully, False otherwise
        """
        try:
            # Create timestamp
            timestamp = datetime.datetime.now().isoformat()

            # Create log data
            log_data = {
                "timestamp": timestamp,
                "event_id": str(uuid.uuid4()),
                "event_type": event_type,
                "user_id": user_id,
                "operation": operation,
                "resource_type": resource_type,
                "status": status,
            }

            # Add optional fields
            if resource_id:
                log_data["resource_id"] = resource_id

            if details:
                # Filter out sensitive information
                filtered_details = self._filter_sensitive_data(details)
                log_data["details"] = filtered_details

            # Add source information
            log_data["source"] = {
                "ip": os.environ.get("REMOTE_ADDR", "unknown"),
                "user_agent": os.environ.get("HTTP_USER_AGENT", "unknown"),
                "hostname": os.environ.get("HOSTNAME", "unknown"),
            }

            # Compute hash for tamper evidence
            log_data["hash"] = self._compute_log_hash(log_data)

            # Update previous hash
            self.previous_log_hash = log_data["hash"]

            # Write to log file
            with open(self.current_log_file, "a") as f:
                f.write(json.dumps(log_data) + "\n")

            logger.debug(f"Audit log entry created: {event_type} {operation} on {resource_type}")
            return True
        except Exception as e:
            logger.error(f"Error creating audit log: {str(e)}")
            return False

    def _filter_sensitive_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter sensitive data from log details.

        Args:
            data: Data to filter

        Returns:
            Filtered data
        """
        # Create a copy of the data
        filtered = data.copy()

        # List of sensitive field names
        sensitive_fields = [
            "password",
            "api_key",
            "token",
            "secret",
            "credential",
            "auth",
            "key",
            "private",
            "certificate",
        ]

        # Filter sensitive fields
        for key in list(filtered.keys()):
            key_lower = key.lower()

            # Check if the key contains a sensitive term
            if any(term in key_lower for term in sensitive_fields):
                # Mask the value
                if isinstance(filtered[key], str):
                    filtered[key] = "********"
                elif isinstance(filtered[key], dict):
                    filtered[key] = self._filter_sensitive_data(filtered[key])
            elif isinstance(filtered[key], dict):
                # Recursively filter nested dictionaries
                filtered[key] = self._filter_sensitive_data(filtered[key])

        return filtered

    def get_audit_logs(
        self,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        event_types: Optional[List[str]] = None,
        user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get audit logs with filtering.

        Args:
            start_time: Start time for filtering (ISO format)
            end_time: End time for filtering (ISO format)
            event_types: List of event types to include
            user_id: Filter by user ID
            resource_type: Filter by resource type
            operation: Filter by operation
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries
        """
        logs = []

        try:
            # Convert times to datetime objects if provided
            start_datetime = None
            if start_time:
                start_datetime = datetime.datetime.fromisoformat(start_time)

            end_datetime = None
            if end_time:
                end_datetime = datetime.datetime.fromisoformat(end_time)

            # Determine which log files to read
            log_files = self._get_log_files_for_time_range(start_datetime, end_datetime)

            # Read and filter logs
            for log_file in log_files:
                if not os.path.exists(log_file):
                    continue

                with open(log_file, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue

                        try:
                            log_entry = json.loads(line)

                            # Apply filters
                            if not self._matches_filters(
                                log_entry, start_datetime, end_datetime, event_types, user_id, resource_type, operation
                            ):
                                continue

                            logs.append(log_entry)

                            # Check limit
                            if len(logs) >= limit:
                                break
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON in audit log: {line}")

                # Check limit
                if len(logs) >= limit:
                    break

            return logs
        except Exception as e:
            logger.error(f"Error retrieving audit logs: {str(e)}")
            return []

    def _get_log_files_for_time_range(
        self, start_datetime: Optional[datetime.datetime], end_datetime: Optional[datetime.datetime]
    ) -> List[str]:
        """
        Get log files for a time range.

        Args:
            start_datetime: Start time
            end_datetime: End time

        Returns:
            List of log file paths
        """
        # If no time range is specified, return the current log file
        if not start_datetime and not end_datetime:
            return [self.current_log_file]

        # Get all log files
        log_files = []
        for filename in os.listdir(self.log_dir):
            if filename.startswith("audit_") and filename.endswith(".log"):
                log_files.append(os.path.join(self.log_dir, filename))

        # Sort by date
        log_files.sort()

        # Filter by date if needed
        if start_datetime or end_datetime:
            filtered_files = []
            for log_file in log_files:
                # Extract date from filename
                filename = os.path.basename(log_file)
                date_str = filename[6:-4]  # Remove "audit_" and ".log"

                try:
                    file_date = datetime.datetime.strptime(date_str, "%Y-%m-%d")

                    # Check if file is in range
                    if start_datetime and file_date < start_datetime.replace(hour=0, minute=0, second=0, microsecond=0):
                        continue

                    if end_datetime and file_date > end_datetime.replace(hour=0, minute=0, second=0, microsecond=0):
                        continue

                    filtered_files.append(log_file)
                except ValueError:
                    # Skip files with invalid date format
                    continue

            return filtered_files

        return log_files

    def _matches_filters(
        self,
        log_entry: Dict[str, Any],
        start_datetime: Optional[datetime.datetime],
        end_datetime: Optional[datetime.datetime],
        event_types: Optional[List[str]],
        user_id: Optional[str],
        resource_type: Optional[str],
        operation: Optional[str],
    ) -> bool:
        """
        Check if a log entry matches the filters.

        Args:
            log_entry: Log entry to check
            start_datetime: Start time filter
            end_datetime: End time filter
            event_types: Event type filter
            user_id: User ID filter
            resource_type: Resource type filter
            operation: Operation filter

        Returns:
            True if the log entry matches the filters, False otherwise
        """
        # Check timestamp
        if start_datetime or end_datetime:
            try:
                log_time = datetime.datetime.fromisoformat(log_entry["timestamp"])

                if start_datetime and log_time < start_datetime:
                    return False

                if end_datetime and log_time > end_datetime:
                    return False
            except (ValueError, KeyError):
                return False

        # Check event type
        if event_types and log_entry.get("event_type") not in event_types:
            return False

        # Check user ID
        if user_id and log_entry.get("user_id") != user_id:
            return False

        # Check resource type
        if resource_type and log_entry.get("resource_type") != resource_type:
            return False

        # Check operation
        if operation and log_entry.get("operation") != operation:
            return False

        return True

    def verify_log_integrity(self) -> Dict[str, Any]:
        """
        Verify the integrity of audit logs.

        Returns:
            Dictionary with verification results
        """
        results = {"verified": True, "errors": [], "files_checked": 0, "entries_checked": 0}

        try:
            # Get all log files
            log_files = []
            for filename in os.listdir(self.log_dir):
                if filename.startswith("audit_") and filename.endswith(".log"):
                    log_files.append(os.path.join(self.log_dir, filename))

            # Sort by date
            log_files.sort()

            # Check each file
            for log_file in log_files:
                results["files_checked"] += 1

                if not os.path.exists(log_file):
                    continue

                previous_hash = ""

                with open(log_file, "r") as f:
                    for line_num, line in enumerate(f, 1):
                        line = line.strip()
                        if not line:
                            continue

                        results["entries_checked"] += 1

                        try:
                            log_entry = json.loads(line)

                            # Get the hash from the log entry
                            log_hash = log_entry.get("hash", "")

                            # Remove the hash for verification
                            verification_entry = log_entry.copy()
                            verification_entry.pop("hash", None)

                            # Compute the expected hash
                            log_str = json.dumps(verification_entry, sort_keys=True)
                            combined = f"{previous_hash}:{log_str}"
                            expected_hash = hashlib.sha256(combined.encode("utf-8")).hexdigest()

                            # Compare hashes
                            if log_hash != expected_hash:
                                results["verified"] = False
                                results["errors"].append(
                                    {
                                        "file": log_file,
                                        "line": line_num,
                                        "error": "Hash mismatch",
                                        "expected": expected_hash,
                                        "actual": log_hash,
                                    }
                                )

                            # Update previous hash
                            previous_hash = log_hash
                        except json.JSONDecodeError:
                            results["verified"] = False
                            results["errors"].append({"file": log_file, "line": line_num, "error": "Invalid JSON"})

            return results
        except Exception as e:
            logger.error(f"Error verifying audit logs: {str(e)}")
            return {
                "verified": False,
                "errors": [{"error": str(e)}],
                "files_checked": results["files_checked"],
                "entries_checked": results["entries_checked"],
            }
