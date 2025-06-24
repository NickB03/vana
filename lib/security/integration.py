"""
VANA Security Integration Utilities

This module provides integration helpers for connecting the security
framework with existing VANA components.
"""

import os
import time
from typing import Any, Dict, Tuple

import yaml

from lib.logging_config import get_logger

from .security_manager import SecurityManager

logger = get_logger("vana.lib.security.integration")


class SecurityIntegration:
    """Integration utilities for VANA security."""

    def __init__(self, config_path: str = None):
        self.config_path = config_path or "config/security/security_policies.yaml"
        self.config = self._load_config()
        self.security_manager = SecurityManager()
        self._setup_security_policies()

    def _load_config(self) -> Dict[str, Any]:
        """Load security configuration."""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, "r") as f:
                    return yaml.safe_load(f)
        except Exception as e:
            logger.warning(f"Warning: Could not load security config: {e}")

        # Default configuration
        return {
            "input_validation": {"max_input_length": 10000},
            "rate_limiting": {"default_limit": 100, "window_seconds": 60},
            "ip_blocking": {"auto_block_on_critical": True},
        }

    def _setup_security_policies(self):
        """Setup security policies from configuration."""
        # Add any additional patterns from config
        input_config = self.config.get("input_validation", {})
        if "forbidden_patterns" in input_config:
            self.security_manager.suspicious_patterns.extend(
                input_config["forbidden_patterns"]
            )

    def get_security_manager(self) -> SecurityManager:
        """Get the security manager instance."""
        return self.security_manager

    def validate_agent_input(
        self, input_data: str, source_ip: str = "unknown"
    ) -> Tuple[bool, str]:
        """Validate input for agent processing."""
        max_length = self.config.get("input_validation", {}).get(
            "max_input_length", 10000
        )

        is_valid, message = self.security_manager.validate_input(input_data, max_length)

        if not is_valid:
            self.security_manager.log_security_event(
                "input_validation_failed",
                "medium",
                source_ip,
                "",
                {"input_length": len(input_data), "reason": message},
            )

        return is_valid, message

    def check_request_rate_limit(
        self, identifier: str, source_ip: str = "unknown"
    ) -> bool:
        """Check rate limit for requests."""
        rate_config = self.config.get("rate_limiting", {})
        limit = rate_config.get("default_limit", 100)
        window = rate_config.get("window_seconds", 60)

        is_allowed = self.security_manager.check_rate_limit(identifier, limit, window)

        if not is_allowed:
            self.security_manager.log_security_event(
                "rate_limit_exceeded",
                "high",
                source_ip,
                "",
                {"identifier": identifier, "limit": limit, "window": window},
            )

        return is_allowed

    def get_security_headers(self) -> Dict[str, str]:
        """Get security headers for HTTP responses."""
        return self.config.get("headers", {}).get("security_headers", {})

    def get_security_status(self) -> Dict[str, Any]:
        """Get security system status."""
        recent_events = [
            event
            for event in self.security_manager.security_events
            if event.timestamp > (time.time() - 300)  # Last 5 minutes
        ]

        return {
            "blocked_ips": len(self.security_manager.blocked_ips),
            "recent_security_events": len(recent_events),
            "critical_events": len(
                [e for e in recent_events if e.severity == "critical"]
            ),
            "rate_limit_active_sessions": len(self.security_manager.rate_limits),
        }


# Global security instance
_security_integration = None


def get_security() -> SecurityIntegration:
    """Get global security integration instance."""
    global _security_integration
    if _security_integration is None:
        _security_integration = SecurityIntegration()
    return _security_integration
