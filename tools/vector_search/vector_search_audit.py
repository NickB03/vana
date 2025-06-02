#!/usr/bin/env python3
"""
Vector Search Audit Logger

This module provides audit logging for security-sensitive operations in the Vector Search subsystem.
It leverages the AuditLogger from the security module to create tamper-evident logs.
"""

import logging
import os
from typing import Any, Optional

# Import the AuditLogger
from tools.security.audit_logger import AuditLogger

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VectorSearchAuditLogger:
    """
    Audit Logger for Vector Search operations.

    This class provides a specialized audit logger for Vector Search operations,
    focusing on security-sensitive operations like searches, updates, and configuration changes.
    """

    def __init__(self, log_dir: str = "logs/audit/vector_search"):
        """
        Initialize the Vector Search Audit Logger.

        Args:
            log_dir: Directory for audit logs (default: logs/audit/vector_search)
        """
        # Create log directory if it doesn't exist
        os.makedirs(log_dir, exist_ok=True)

        # Create audit logger
        self.audit_logger = AuditLogger(log_dir=log_dir)

        logger.info(
            f"Vector Search Audit Logger initialized with log directory: {log_dir}"
        )

    def log_search(
        self,
        user_id: str,
        query: str,
        num_results: int,
        metadata_filter: Optional[dict[str, Any]] = None,
        status: str = "success",
        details: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Log a Vector Search operation.

        Args:
            user_id: ID of the user performing the search
            query: Search query or embedding ID
            num_results: Number of results requested
            metadata_filter: Metadata filter used (optional)
            status: Operation status (success/failure)
            details: Additional details (optional)

        Returns:
            True if the event was logged successfully, False otherwise
        """
        # Create details dictionary
        log_details = {"query": query, "num_results": num_results}

        # Add metadata filter if provided
        if metadata_filter:
            log_details["metadata_filter"] = metadata_filter

        # Add additional details if provided
        if details:
            log_details.update(details)

        # Log the event
        return self.audit_logger.log_event(
            event_type="search",
            user_id=user_id,
            operation="vector_search",
            resource_type="vector_index",
            resource_id=os.environ.get("DEPLOYED_INDEX_ID", "unknown"),
            details=log_details,
            status=status,
        )

    def log_update(
        self,
        user_id: str,
        operation_type: str,
        num_items: int,
        item_ids: Optional[list[str]] = None,
        status: str = "success",
        details: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Log a Vector Search update operation.

        Args:
            user_id: ID of the user performing the update
            operation_type: Type of update (upsert/remove)
            num_items: Number of items affected
            item_ids: List of item IDs (optional)
            status: Operation status (success/failure)
            details: Additional details (optional)

        Returns:
            True if the event was logged successfully, False otherwise
        """
        # Create details dictionary
        log_details = {"operation_type": operation_type, "num_items": num_items}

        # Add item IDs if provided (limit to first 10 for brevity)
        if item_ids:
            log_details["item_ids"] = item_ids[:10]
            if len(item_ids) > 10:
                log_details["item_ids_truncated"] = True

        # Add additional details if provided
        if details:
            log_details.update(details)

        # Log the event
        return self.audit_logger.log_event(
            event_type="update",
            user_id=user_id,
            operation=f"vector_{operation_type}",
            resource_type="vector_index",
            resource_id=os.environ.get("DEPLOYED_INDEX_ID", "unknown"),
            details=log_details,
            status=status,
        )

    def log_config_change(
        self,
        user_id: str,
        config_type: str,
        old_value: Optional[Any] = None,
        new_value: Optional[Any] = None,
        status: str = "success",
        details: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Log a Vector Search configuration change.

        Args:
            user_id: ID of the user making the change
            config_type: Type of configuration being changed
            old_value: Previous configuration value (optional)
            new_value: New configuration value (optional)
            status: Operation status (success/failure)
            details: Additional details (optional)

        Returns:
            True if the event was logged successfully, False otherwise
        """
        # Create details dictionary
        log_details = {"config_type": config_type}

        # Add old and new values if provided
        if old_value is not None:
            log_details["old_value"] = str(old_value)

        if new_value is not None:
            log_details["new_value"] = str(new_value)

        # Add additional details if provided
        if details:
            log_details.update(details)

        # Log the event
        return self.audit_logger.log_event(
            event_type="config_change",
            user_id=user_id,
            operation="vector_config_change",
            resource_type="vector_search_config",
            resource_id=config_type,
            details=log_details,
            status=status,
        )

    def log_access(
        self,
        user_id: str,
        access_type: str,
        resource_id: Optional[str] = None,
        status: str = "success",
        details: Optional[dict[str, Any]] = None,
    ) -> bool:
        """
        Log a Vector Search access event.

        Args:
            user_id: ID of the user accessing the resource
            access_type: Type of access (read/write/admin)
            resource_id: ID of the resource being accessed (optional)
            status: Operation status (success/failure)
            details: Additional details (optional)

        Returns:
            True if the event was logged successfully, False otherwise
        """
        # Create details dictionary
        log_details = {"access_type": access_type}

        # Add additional details if provided
        if details:
            log_details.update(details)

        # Log the event
        return self.audit_logger.log_event(
            event_type="access",
            user_id=user_id,
            operation="vector_access",
            resource_type="vector_search",
            resource_id=resource_id or os.environ.get("DEPLOYED_INDEX_ID", "unknown"),
            details=log_details,
            status=status,
        )


# Create a singleton instance
vector_search_audit_logger = VectorSearchAuditLogger()
