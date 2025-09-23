"""Circuit breaker pattern implementation for authentication security.

This module provides a circuit breaker system to protect against brute force attacks
and authentication abuse by implementing progressive blocking based on failed attempts.

Features:
- IP-based rate limiting with configurable thresholds
- Progressive blocking: warning -> temporary block -> extended block
- Automatic cleanup of tracking data to prevent memory growth
- IP whitelist for trusted sources
- Comprehensive audit logging
- Thread-safe operations for concurrent requests

Security Design:
- Default to secure: block on errors rather than allow
- Rate limits increase exponentially with repeated failures
- Automatic cleanup prevents resource exhaustion
- Detailed logging for security monitoring
"""

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Dict, List, Optional, Set
from threading import Lock
import ipaddress

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Circuit breaker states for authentication attempts."""
    CLOSED = "closed"  # Normal operation, allowing requests
    HALF_OPEN = "half_open"  # Warning state, limited requests allowed
    OPEN = "open"  # Circuit breaker triggered, blocking requests


@dataclass
class FailedAttempt:
    """Represents a failed authentication attempt."""
    ip_address: str
    timestamp: float
    user_identifier: Optional[str] = None
    user_agent: Optional[str] = None
    endpoint: Optional[str] = None


@dataclass
class CircuitBreakerState:
    """Tracks the state of a circuit breaker for a specific IP."""
    ip_address: str
    state: CircuitState = CircuitState.CLOSED
    failed_attempts: List[FailedAttempt] = field(default_factory=list)
    last_failure_time: float = 0.0
    consecutive_failures: int = 0
    circuit_opened_at: float = 0.0
    total_attempts: int = 0
    
    def add_failure(self, attempt: FailedAttempt) -> None:
        """Add a failed attempt and update circuit state."""
        self.failed_attempts.append(attempt)
        self.last_failure_time = attempt.timestamp
        self.consecutive_failures += 1
        self.total_attempts += 1
    
    def reset_success(self) -> None:
        """Reset circuit breaker state after successful authentication."""
        self.consecutive_failures = 0
        self.state = CircuitState.CLOSED
        self.circuit_opened_at = 0.0
        # Keep failed attempts for audit trail but mark success
    
    def is_blocked(self, current_time: float) -> bool:
        """Check if the IP should be blocked based on circuit state."""
        if self.state == CircuitState.CLOSED:
            return False
        elif self.state == CircuitState.HALF_OPEN:
            # Allow limited attempts in half-open state
            return False
        else:  # OPEN state
            return True


class AuthenticationCircuitBreaker:
    """Circuit breaker implementation for authentication endpoints.
    
    Implements a sophisticated circuit breaker pattern that protects against
    brute force attacks by tracking failed authentication attempts per IP
    address and implementing progressive blocking.
    
    Thresholds:
    - 5 failed attempts: Warning state (HALF_OPEN)
    - 10 failed attempts: Temporary block (OPEN) for 15 minutes
    - 20 failed attempts: Extended block (OPEN) for 1 hour
    - 50+ failed attempts: Long-term block (OPEN) for 24 hours
    
    Features:
    - Automatic cleanup of old tracking data
    - IP whitelist for trusted sources
    - Progressive blocking with exponential backoff
    - Comprehensive audit logging
    - Thread-safe operations
    """
    
    def __init__(
        self,
        warning_threshold: int = 5,
        temporary_block_threshold: int = 10,
        extended_block_threshold: int = 20,
        long_term_block_threshold: int = 50,
        temporary_block_duration: int = 900,  # 15 minutes
        extended_block_duration: int = 3600,  # 1 hour
        long_term_block_duration: int = 86400,  # 24 hours
        cleanup_interval: int = 3600,  # 1 hour
        max_tracking_age: int = 86400 * 7,  # 7 days
        trusted_ips: Optional[Set[str]] = None,
    ):
        """Initialize the circuit breaker with configurable thresholds.
        
        Args:
            warning_threshold: Failed attempts before entering warning state
            temporary_block_threshold: Failed attempts before temporary block
            extended_block_threshold: Failed attempts before extended block
            long_term_block_threshold: Failed attempts before long-term block
            temporary_block_duration: Duration of temporary block in seconds
            extended_block_duration: Duration of extended block in seconds
            long_term_block_duration: Duration of long-term block in seconds
            cleanup_interval: How often to clean up old data in seconds
            max_tracking_age: Maximum age of tracking data in seconds
            trusted_ips: Set of IP addresses to whitelist (never block)
        """
        self.warning_threshold = warning_threshold
        self.temporary_block_threshold = temporary_block_threshold
        self.extended_block_threshold = extended_block_threshold
        self.long_term_block_threshold = long_term_block_threshold
        
        self.temporary_block_duration = temporary_block_duration
        self.extended_block_duration = extended_block_duration
        self.long_term_block_duration = long_term_block_duration
        
        self.cleanup_interval = cleanup_interval
        self.max_tracking_age = max_tracking_age
        
        # Thread-safe data structures
        self._lock = Lock()
        self.circuit_states: Dict[str, CircuitBreakerState] = {}
        self.last_cleanup = time.time()
        
        # Default trusted IPs (localhost, RFC 1918 private networks)
        default_trusted = {
            "127.0.0.1", "::1",  # Localhost
            "localhost",
        }
        
        # Add private network ranges
        default_trusted.update(self._get_private_network_ips())
        
        self.trusted_ips = trusted_ips or default_trusted
        
        logger.info(
            "Authentication circuit breaker initialized with thresholds: "
            f"warning={warning_threshold}, temp_block={temporary_block_threshold}, "
            f"extended_block={extended_block_threshold}, long_term={long_term_block_threshold}"
        )
    
    def _get_private_network_ips(self) -> Set[str]:
        """Get commonly used private network IP ranges."""
        # In practice, you might want to be more specific about which
        # private IPs are trusted in your environment
        return {
            "10.0.0.1", "192.168.1.1", "172.16.0.1",  # Common gateway IPs
            # Add specific internal IPs as needed
        }
    
    def is_ip_trusted(self, ip_address: str) -> bool:
        """Check if an IP address is in the trusted whitelist.
        
        Args:
            ip_address: IP address to check
            
        Returns:
            True if IP is trusted and should never be blocked
        """
        if ip_address in self.trusted_ips:
            return True
        
        try:
            # Check if IP is in private network ranges
            ip = ipaddress.ip_address(ip_address)
            if ip.is_private or ip.is_loopback:
                return True
        except ValueError:
            # Invalid IP format
            pass
        
        return False
    
    def should_block_request(
        self, 
        ip_address: str, 
        user_identifier: Optional[str] = None
    ) -> tuple[bool, str, Optional[int]]:
        """Check if a request should be blocked based on circuit breaker state.
        
        Args:
            ip_address: Client IP address
            user_identifier: Optional username/email for additional context
            
        Returns:
            Tuple of (should_block, reason, retry_after_seconds)
        """
        # Never block trusted IPs
        if self.is_ip_trusted(ip_address):
            return False, "trusted_ip", None
        
        current_time = time.time()
        
        # Perform cleanup if needed
        self._cleanup_old_data(current_time)
        
        with self._lock:
            if ip_address not in self.circuit_states:
                return False, "no_history", None
            
            state = self.circuit_states[ip_address]
            
            # Check if circuit is open (blocked)
            if state.state == CircuitState.OPEN:
                time_since_opened = current_time - state.circuit_opened_at
                retry_after = self._get_block_duration(state.consecutive_failures)
                
                if time_since_opened >= retry_after:
                    # Transition to half-open state
                    state.state = CircuitState.HALF_OPEN
                    logger.info(
                        f"Circuit breaker for IP {ip_address} transitioning to HALF_OPEN "
                        f"after {time_since_opened:.0f} seconds"
                    )
                    return False, "half_open_recovery", None
                else:
                    remaining_time = int(retry_after - time_since_opened)
                    logger.warning(
                        f"Request blocked for IP {ip_address}: {state.consecutive_failures} "
                        f"failed attempts, {remaining_time}s remaining"
                    )
                    return True, f"circuit_open_{state.consecutive_failures}_failures", remaining_time
            
            elif state.state == CircuitState.HALF_OPEN:
                # In half-open state, allow limited attempts
                logger.info(f"Request allowed for IP {ip_address} in HALF_OPEN state")
                return False, "half_open_allowed", None
            
            # Circuit is closed, check if we should warn about approaching limits
            if state.consecutive_failures >= self.warning_threshold:
                logger.warning(
                    f"IP {ip_address} approaching rate limit: {state.consecutive_failures} "
                    f"failed attempts (warning threshold: {self.warning_threshold})"
                )
            
            return False, "allowed", None
    
    def record_failed_attempt(
        self,
        ip_address: str,
        user_identifier: Optional[str] = None,
        user_agent: Optional[str] = None,
        endpoint: Optional[str] = None
    ) -> None:
        """Record a failed authentication attempt and update circuit state.
        
        Args:
            ip_address: Client IP address
            user_identifier: Username or email that failed authentication
            user_agent: User-Agent header from request
            endpoint: Authentication endpoint that was accessed
        """
        # Don't track failures for trusted IPs
        if self.is_ip_trusted(ip_address):
            logger.debug(f"Skipping failure tracking for trusted IP: {ip_address}")
            return
        
        current_time = time.time()
        attempt = FailedAttempt(
            ip_address=ip_address,
            timestamp=current_time,
            user_identifier=user_identifier,
            user_agent=user_agent,
            endpoint=endpoint
        )
        
        with self._lock:
            if ip_address not in self.circuit_states:
                self.circuit_states[ip_address] = CircuitBreakerState(ip_address=ip_address)
            
            state = self.circuit_states[ip_address]
            state.add_failure(attempt)
            
            # Update circuit state based on failure count
            self._update_circuit_state(state, current_time)
            
            logger.warning(
                f"Failed authentication attempt recorded for IP {ip_address}: "
                f"user={user_identifier}, consecutive_failures={state.consecutive_failures}, "
                f"state={state.state.value}, endpoint={endpoint}"
            )
    
    def record_successful_attempt(
        self, 
        ip_address: str, 
        user_identifier: Optional[str] = None
    ) -> None:
        """Record a successful authentication and reset circuit breaker if needed.
        
        Args:
            ip_address: Client IP address
            user_identifier: Username or email that successfully authenticated
        """
        with self._lock:
            if ip_address in self.circuit_states:
                state = self.circuit_states[ip_address]
                previous_state = state.state
                state.reset_success()
                
                logger.info(
                    f"Successful authentication for IP {ip_address}: "
                    f"user={user_identifier}, previous_state={previous_state.value}, "
                    f"circuit breaker reset"
                )
            else:
                logger.debug(f"Successful authentication for IP {ip_address} (no prior failures)")
    
    def _update_circuit_state(self, state: CircuitBreakerState, current_time: float) -> None:
        """Update circuit breaker state based on failure count.
        
        Args:
            state: Circuit breaker state to update
            current_time: Current timestamp
        """
        failures = state.consecutive_failures
        
        if failures >= self.long_term_block_threshold:
            if state.state != CircuitState.OPEN:
                state.state = CircuitState.OPEN
                state.circuit_opened_at = current_time
                logger.error(
                    f"Circuit breaker OPENED for IP {state.ip_address}: "
                    f"{failures} failures (long-term block: 24h)"
                )
        elif failures >= self.extended_block_threshold:
            if state.state != CircuitState.OPEN:
                state.state = CircuitState.OPEN
                state.circuit_opened_at = current_time
                logger.warning(
                    f"Circuit breaker OPENED for IP {state.ip_address}: "
                    f"{failures} failures (extended block: 1h)"
                )
        elif failures >= self.temporary_block_threshold:
            if state.state != CircuitState.OPEN:
                state.state = CircuitState.OPEN
                state.circuit_opened_at = current_time
                logger.warning(
                    f"Circuit breaker OPENED for IP {state.ip_address}: "
                    f"{failures} failures (temporary block: 15m)"
                )
        elif failures >= self.warning_threshold:
            if state.state == CircuitState.CLOSED:
                state.state = CircuitState.HALF_OPEN
                logger.warning(
                    f"Circuit breaker entering HALF_OPEN for IP {state.ip_address}: "
                    f"{failures} failures (warning threshold reached)"
                )
    
    def _get_block_duration(self, failure_count: int) -> int:
        """Get the block duration based on failure count.
        
        Args:
            failure_count: Number of consecutive failures
            
        Returns:
            Block duration in seconds
        """
        if failure_count >= self.long_term_block_threshold:
            return self.long_term_block_duration
        elif failure_count >= self.extended_block_threshold:
            return self.extended_block_duration
        else:
            return self.temporary_block_duration
    
    def _cleanup_old_data(self, current_time: float) -> None:
        """Clean up old tracking data to prevent memory growth.
        
        Args:
            current_time: Current timestamp
        """
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        with self._lock:
            cutoff_time = current_time - self.max_tracking_age
            ips_to_remove = []
            attempts_cleaned = 0
            
            for ip_address, state in self.circuit_states.items():
                # Remove old failed attempts
                original_count = len(state.failed_attempts)
                state.failed_attempts = [
                    attempt for attempt in state.failed_attempts
                    if attempt.timestamp > cutoff_time
                ]
                attempts_cleaned += original_count - len(state.failed_attempts)
                
                # Remove states with no recent activity
                if (not state.failed_attempts and 
                    state.last_failure_time < cutoff_time and
                    state.state == CircuitState.CLOSED):
                    ips_to_remove.append(ip_address)
            
            # Remove empty states
            for ip_address in ips_to_remove:
                del self.circuit_states[ip_address]
            
            self.last_cleanup = current_time
            
            if attempts_cleaned > 0 or ips_to_remove:
                logger.info(
                    f"Circuit breaker cleanup completed: "
                    f"removed {attempts_cleaned} old attempts, "
                    f"cleaned {len(ips_to_remove)} IP states"
                )
    
    def get_stats(self) -> Dict:
        """Get circuit breaker statistics for monitoring.
        
        Returns:
            Dictionary containing current statistics
        """
        with self._lock:
            stats = {
                "total_tracked_ips": len(self.circuit_states),
                "circuits_open": 0,
                "circuits_half_open": 0,
                "circuits_closed": 0,
                "total_failed_attempts": 0,
                "most_failed_ip": None,
                "most_failures": 0,
            }
            
            for ip_address, state in self.circuit_states.items():
                if state.state == CircuitState.OPEN:
                    stats["circuits_open"] += 1
                elif state.state == CircuitState.HALF_OPEN:
                    stats["circuits_half_open"] += 1
                else:
                    stats["circuits_closed"] += 1
                
                stats["total_failed_attempts"] += len(state.failed_attempts)
                
                if state.consecutive_failures > stats["most_failures"]:
                    stats["most_failures"] = state.consecutive_failures
                    stats["most_failed_ip"] = ip_address
            
            return stats
    
    def reset_ip(self, ip_address: str) -> bool:
        """Manually reset circuit breaker state for a specific IP.
        
        Args:
            ip_address: IP address to reset
            
        Returns:
            True if IP was found and reset, False otherwise
        """
        with self._lock:
            if ip_address in self.circuit_states:
                state = self.circuit_states[ip_address]
                previous_failures = state.consecutive_failures
                state.reset_success()
                
                logger.info(
                    f"Manually reset circuit breaker for IP {ip_address}: "
                    f"cleared {previous_failures} failures"
                )
                return True
            return False


# Global circuit breaker instance
_circuit_breaker: Optional[AuthenticationCircuitBreaker] = None


import threading

# Global circuit breaker instance
_circuit_breaker: Optional[AuthenticationCircuitBreaker] = None
_circuit_breaker_lock: threading.Lock = threading.Lock()

def get_circuit_breaker() -> AuthenticationCircuitBreaker:
    """Get the global circuit breaker instance.
    
    Returns:
        The global AuthenticationCircuitBreaker instance
    """
    global _circuit_breaker
    if _circuit_breaker is None:
        with _circuit_breaker_lock:
            # Double-check pattern
            if _circuit_breaker is None:
                # Import configuration here to avoid circular dependencies
                from .circuit_breaker_config import get_circuit_breaker_config
                config = get_circuit_breaker_config()
                
                _circuit_breaker = AuthenticationCircuitBreaker(
                    warning_threshold=config.warning_threshold,
                    temporary_block_threshold=config.temporary_block_threshold,
                    extended_block_threshold=config.extended_block_threshold,
                    long_term_block_threshold=config.long_term_block_threshold,
                    temporary_block_duration=config.temporary_block_duration,
                    extended_block_duration=config.extended_block_duration,
                    long_term_block_duration=config.long_term_block_duration,
                    cleanup_interval=config.cleanup_interval,
                    max_tracking_age=config.max_tracking_age,
                    trusted_ips=config.trusted_ips,
                )
    return _circuit_breaker

def init_circuit_breaker(**kwargs) -> AuthenticationCircuitBreaker:
    """Initialize the global circuit breaker with custom settings.
    
    Args:
        **kwargs: Configuration parameters for AuthenticationCircuitBreaker
        
    Returns:
        The initialized AuthenticationCircuitBreaker instance
    """
    global _circuit_breaker
    _circuit_breaker = AuthenticationCircuitBreaker(**kwargs)
    return _circuit_breaker