import hashlib
import hmac
import time
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict, deque


@dataclass
class SecurityEvent:
    """Security event for logging and analysis."""
    timestamp: float
    event_type: str
    severity: str  # "low", "medium", "high", "critical"
    source_ip: str
    user_agent: str
    details: Dict[str, any]


class SecurityManager:
    """Comprehensive security management and hardening."""

    def __init__(self):
        self.rate_limits: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.blocked_ips: set = set()
        self.security_events: List[SecurityEvent] = []
        self.suspicious_patterns = [
            r'<script[^>]*>.*?</script>',  # XSS
            r'union\s+select',  # SQL injection
            r'drop\s+table',  # SQL injection
            r'\.\./',  # Path traversal
            r'eval\s*\(',  # Code injection
            r'exec\s*\(',  # Code injection
        ]

    def validate_input(self, input_data: str, max_length: int = 10000) -> Tuple[bool, str]:
        """Validate and sanitize input data."""
        if len(input_data) > max_length:
            return False, f"Input exceeds maximum length of {max_length}"

        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if re.search(pattern, input_data, re.IGNORECASE):
                return False, f"Suspicious pattern detected: {pattern}"

        return True, "Input validation passed"

    def check_rate_limit(self, identifier: str, limit: int = 100,
                        window_seconds: int = 60) -> bool:
        """Check if identifier is within rate limits."""
        now = time.time()
        window_start = now - window_seconds

        # Clean old entries
        requests = self.rate_limits[identifier]
        while requests and requests[0] < window_start:
            requests.popleft()

        # Check limit
        if len(requests) >= limit:
            return False

        # Add current request
        requests.append(now)
        return True

    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP address is blocked."""
        return ip_address in self.blocked_ips

    def block_ip(self, ip_address: str, reason: str = "Security violation"):
        """Block an IP address."""
        self.blocked_ips.add(ip_address)
        self.log_security_event(
            "ip_blocked",
            "high",
            ip_address,
            "",
            {"reason": reason}
        )

    def log_security_event(self, event_type: str, severity: str,
                          source_ip: str, user_agent: str, details: Dict):
        """Log a security event."""
        event = SecurityEvent(
            timestamp=time.time(),
            event_type=event_type,
            severity=severity,
            source_ip=source_ip,
            user_agent=user_agent,
            details=details
        )

        self.security_events.append(event)

        # Auto-block on critical events
        if severity == "critical":
            self.block_ip(source_ip, f"Critical security event: {event_type}")

    def generate_csrf_token(self, session_id: str, secret_key: str) -> str:
        """Generate CSRF token for session."""
        timestamp = str(int(time.time()))
        message = f"{session_id}:{timestamp}"
        signature = hmac.new(
            secret_key.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()

        return f"{timestamp}:{signature}"

    def validate_csrf_token(self, token: str, session_id: str,
                           secret_key: str, max_age: int = 3600) -> bool:
        """Validate CSRF token."""
        try:
            timestamp_str, signature = token.split(':', 1)
            timestamp = int(timestamp_str)

            # Check age
            if time.time() - timestamp > max_age:
                return False

            # Verify signature
            message = f"{session_id}:{timestamp_str}"
            expected_signature = hmac.new(
                secret_key.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()

            return hmac.compare_digest(signature, expected_signature)

        except (ValueError, IndexError):
            return False
