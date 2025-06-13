"""
Test Audit Logger

This module tests the audit logger functionality.
"""

import os
import sys
import json
import shutil
import unittest
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from tools.security.audit_logger import AuditLogger

class TestAuditLogger(unittest.TestCase):
    """Test cases for the Audit Logger."""

    def setUp(self):
        """Set up test environment."""
        # Create a temporary directory for logs
        self.temp_dir = tempfile.mkdtemp()

        # Create an audit logger with the temporary directory
        self.audit_logger = AuditLogger(log_dir=self.temp_dir)

    def tearDown(self):
        """Clean up after tests."""
        # Remove the temporary directory
        shutil.rmtree(self.temp_dir)

    def test_log_event(self):
        """Test logging an event."""
        # Log an event
        result = self.audit_logger.log_event(
            event_type="access",
            user_id="test_user",
            operation="retrieve_entity",
            resource_type="entity",
            resource_id="test_entity",
            details={"query": "test query"},
            status="success"
        )

        # Verify the result
        self.assertTrue(result)

        # Check if the log file exists
        log_file = self.audit_logger.current_log_file
        self.assertTrue(os.path.exists(log_file))

        # Read the log file
        with open(log_file, "r") as f:
            log_content = f.read()
            log_entry = json.loads(log_content.strip())

        # Verify log entry fields
        self.assertEqual(log_entry["event_type"], "access")
        self.assertEqual(log_entry["user_id"], "test_user")
        self.assertEqual(log_entry["operation"], "retrieve_entity")
        self.assertEqual(log_entry["resource_type"], "entity")
        self.assertEqual(log_entry["resource_id"], "test_entity")
        self.assertEqual(log_entry["details"]["query"], "test query")
        self.assertEqual(log_entry["status"], "success")
        self.assertIn("timestamp", log_entry)
        self.assertIn("event_id", log_entry)
        self.assertIn("hash", log_entry)
        self.assertIn("source", log_entry)

    def test_filter_sensitive_data(self):
        """Test filtering sensitive data."""
        # Create test data with sensitive fields
        test_data = {
            "query": "test query",
            "api_key": "secret_api_key",
            "password": "secret_password",
            "token": "secret_token",
            "nested": {
                "secret_key": "secret_value",
                "normal_field": "normal_value"
            }
        }

        # Filter the data
        filtered = self.audit_logger._filter_sensitive_data(test_data)

        # Verify non-sensitive fields are unchanged
        self.assertEqual(filtered["query"], "test query")
        self.assertEqual(filtered["nested"]["normal_field"], "normal_value")

        # Verify sensitive fields are masked
        self.assertEqual(filtered["api_key"], "********")
        self.assertEqual(filtered["password"], "********")
        self.assertEqual(filtered["token"], "********")
        self.assertEqual(filtered["nested"]["secret_key"], "********")

    def test_log_integrity(self):
        """Test log integrity with hash chaining."""
        # Log multiple events
        self.audit_logger.log_event(
            event_type="access",
            user_id="test_user",
            operation="retrieve_entity",
            resource_type="entity",
            resource_id="entity1"
        )

        self.audit_logger.log_event(
            event_type="modification",
            user_id="test_user",
            operation="update_entity",
            resource_type="entity",
            resource_id="entity1"
        )

        self.audit_logger.log_event(
            event_type="access",
            user_id="test_user",
            operation="retrieve_entity",
            resource_type="entity",
            resource_id="entity2"
        )

        # Verify log integrity
        result = self.audit_logger.verify_log_integrity()

        # Check verification result
        self.assertTrue(result["verified"])
        self.assertEqual(result["files_checked"], 1)
        self.assertEqual(result["entries_checked"], 3)
        self.assertEqual(len(result["errors"]), 0)

    def test_get_audit_logs(self):
        """Test retrieving audit logs with filtering."""
        # Create log entries with different timestamps
        yesterday = datetime.now() - timedelta(days=1)
        yesterday_str = yesterday.isoformat()

        today = datetime.now()
        today_str = today.isoformat()

        tomorrow = datetime.now() + timedelta(days=1)
        tomorrow_str = tomorrow.isoformat()

        # Create a log file for yesterday
        yesterday_file = os.path.join(self.temp_dir, f"audit_{yesterday.strftime('%Y-%m-%d')}.log")
        with open(yesterday_file, "w") as f:
            f.write(json.dumps({
                "timestamp": yesterday_str,
                "event_id": "event1",
                "event_type": "access",
                "user_id": "user1",
                "operation": "retrieve_entity",
                "resource_type": "entity",
                "resource_id": "entity1",
                "status": "success",
                "hash": "hash1"
            }) + "\n")

        # Create a log file for today
        today_file = os.path.join(self.temp_dir, f"audit_{today.strftime('%Y-%m-%d')}.log")
        with open(today_file, "w") as f:
            f.write(json.dumps({
                "timestamp": today_str,
                "event_id": "event2",
                "event_type": "modification",
                "user_id": "user1",
                "operation": "update_entity",
                "resource_type": "entity",
                "resource_id": "entity1",
                "status": "success",
                "hash": "hash2"
            }) + "\n")

            f.write(json.dumps({
                "timestamp": today_str,
                "event_id": "event3",
                "event_type": "access",
                "user_id": "user2",
                "operation": "retrieve_entity",
                "resource_type": "entity",
                "resource_id": "entity2",
                "status": "success",
                "hash": "hash3"
            }) + "\n")

        # Test filtering by time range
        logs = self.audit_logger.get_audit_logs(
            start_time=yesterday_str,
            end_time=today_str
        )
        self.assertEqual(len(logs), 3)

        # Test filtering by event type
        logs = self.audit_logger.get_audit_logs(
            event_types=["modification"]
        )
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["event_id"], "event2")

        # Test filtering by user ID
        logs = self.audit_logger.get_audit_logs(
            user_id="user2"
        )
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["event_id"], "event3")

        # Test filtering by resource type
        logs = self.audit_logger.get_audit_logs(
            resource_type="entity"
        )
        # All logs have resource_type="entity"
        self.assertTrue(len(logs) > 0)

        # Test filtering by operation
        logs = self.audit_logger.get_audit_logs(
            operation="update_entity"
        )
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["event_id"], "event2")

        # Test limit
        logs = self.audit_logger.get_audit_logs(limit=2)
        self.assertEqual(len(logs), 2)

    def test_tamper_detection(self):
        """Test tamper detection in audit logs."""
        # Log an event
        self.audit_logger.log_event(
            event_type="access",
            user_id="test_user",
            operation="retrieve_entity",
            resource_type="entity",
            resource_id="entity1"
        )

        # Log another event
        self.audit_logger.log_event(
            event_type="modification",
            user_id="test_user",
            operation="update_entity",
            resource_type="entity",
            resource_id="entity1"
        )

        # Tamper with the log file
        log_file = self.audit_logger.current_log_file
        with open(log_file, "r") as f:
            lines = f.readlines()

        # Modify the first log entry
        log_entry = json.loads(lines[0])
        log_entry["user_id"] = "hacker"
        lines[0] = json.dumps(log_entry) + "\n"

        # Write back to the file
        with open(log_file, "w") as f:
            f.writelines(lines)

        # Verify log integrity
        result = self.audit_logger.verify_log_integrity()

        # Check verification result
        self.assertFalse(result["verified"])
        self.assertEqual(result["files_checked"], 1)
        self.assertEqual(result["entries_checked"], 2)
        self.assertEqual(len(result["errors"]), 1)
        self.assertEqual(result["errors"][0]["error"], "Hash mismatch")

if __name__ == "__main__":
    unittest.main()
