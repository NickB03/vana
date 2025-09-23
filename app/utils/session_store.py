"""In-memory session store for chat transcripts.

Provides a central place to persist research sessions so the frontend can
retrieve historical conversations and resume streaming without losing state.
The store is process-local and intended for development environments; it can
be swapped for a database-backed implementation in the future.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Any

from .session_security import (
    SessionValidationResult,
    create_session_security_validator,
    is_session_enumeration_attempt,
)


def _now() -> datetime:
    """Return a timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


def _iso(dt: datetime | str | None) -> str:
    """Serialise datetime objects to ISO strings."""
    if dt is None:
        return _now().isoformat()
    if isinstance(dt, str):
        return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


@dataclass
class StoredMessage:
    """Chat message persisted in the session store."""

    id: str
    role: str
    content: str
    timestamp: str
    metadata: dict[str, Any] | None = field(default=None)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp,
            "metadata": self.metadata or None,
        }


@dataclass
class SessionStoreConfig:
    """Configuration for session store memory management and security."""

    max_sessions: int = field(
        default_factory=lambda: int(os.getenv("SESSION_STORE_MAX_SESSIONS", "1000"))
    )
    session_ttl_hours: int = field(
        default_factory=lambda: int(os.getenv("SESSION_STORE_TTL_HOURS", "24"))
    )
    cleanup_interval_minutes: int = field(
        default_factory=lambda: int(os.getenv("SESSION_STORE_CLEANUP_INTERVAL", "60"))
    )
    max_messages_per_session: int = field(
        default_factory=lambda: int(os.getenv("SESSION_STORE_MAX_MESSAGES", "500"))
    )

    # Security configuration
    enable_session_validation: bool = field(
        default_factory=lambda: os.getenv("ENABLE_SESSION_VALIDATION", "true").lower()
        == "true"
    )
    enable_user_binding: bool = field(
        default_factory=lambda: os.getenv("ENABLE_USER_BINDING", "true").lower()
        == "true"
    )
    enable_tampering_detection: bool = field(
        default_factory=lambda: os.getenv("ENABLE_TAMPERING_DETECTION", "true").lower()
        == "true"
    )
    max_failed_attempts: int = field(
        default_factory=lambda: int(os.getenv("MAX_SESSION_FAILED_ATTEMPTS", "5"))
    )
    enumeration_detection_window: int = field(
        default_factory=lambda: int(os.getenv("ENUMERATION_DETECTION_WINDOW", "60"))
    )


@dataclass
class SessionRecord:
    """Persisted record for a research session with security metadata."""

    id: str
    created_at: str
    updated_at: str
    status: str = "pending"
    title: str | None = None
    user_id: int | None = None
    messages: list[StoredMessage] = field(default_factory=list)
    progress: float | None = None
    current_phase: str | None = None
    final_report: str | None = None
    error: str | None = None

    # Security metadata
    user_binding_token: str | None = None
    client_ip: str | None = None
    user_agent: str | None = None
    csrf_token: str | None = None
    last_access_at: str | None = None
    failed_access_attempts: int = 0
    is_security_flagged: bool = False
    security_warnings: list[str] = field(default_factory=list)

    def to_dict(
        self, include_messages: bool = True, include_security: bool = False
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "id": self.id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "status": self.status,
            "title": self.title,
            "user_id": self.user_id,
            "progress": self.progress,
            "current_phase": self.current_phase,
            "final_report": self.final_report,
            "error": self.error,
        }
        if include_messages:
            data["messages"] = [message.to_dict() for message in self.messages]

        if include_security:
            data.update(
                {
                    "last_access_at": self.last_access_at,
                    "failed_access_attempts": self.failed_access_attempts,
                    "is_security_flagged": self.is_security_flagged,
                    "security_warnings": self.security_warnings,
                    # Note: sensitive tokens are excluded from serialization
                }
            )
        return data


class SessionStore:
    """Thread-safe in-memory session store with enhanced security validation."""

    def __init__(self, config: SessionStoreConfig | None = None) -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._lock = RLock()
        self._config = config or SessionStoreConfig()
        
        # Async cleanup management
        self._cleanup_task: asyncio.Task | None = None
        self._shutdown_event = asyncio.Event()
        self._loop: asyncio.AbstractEventLoop | None = None

        # Security components
        self._security_validator = None
        self._failed_attempts: dict[str, list[float]] = {}  # IP -> timestamps
        self._enumeration_attempts: dict[str, list[str]] = {}  # IP -> session_ids

        if self._config.enable_session_validation:
            security_config = {
                "require_user_binding": self._config.enable_user_binding,
                "enable_tampering_detection": self._config.enable_tampering_detection,
            }
            self._security_validator = create_session_security_validator(
                security_config
            )

        self._start_cleanup_task()

        # Initialize logging
        self._logger = logging.getLogger(__name__)

    def __del__(self) -> None:
        """Clean up resources when store is destroyed."""
        self._stop_cleanup_task()

    # ------------------------------------------------------------------
    # Memory management
    # ------------------------------------------------------------------
    def _start_cleanup_task(self) -> None:
        """Start the async cleanup task with proper error handling."""
        if self._cleanup_task is not None and not self._cleanup_task.done():
            return

        try:
            # Get or create event loop
            try:
                self._loop = asyncio.get_running_loop()
            except RuntimeError:
                # No running loop, try to get the event loop
                try:
                    self._loop = asyncio.get_event_loop()
                except RuntimeError:
                    # Create new event loop if none exists
                    self._loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(self._loop)
            
            # Schedule the cleanup task
            self._cleanup_task = self._loop.create_task(self._async_cleanup_loop())
            
        except Exception as e:
            self._logger.warning(f"Failed to start async cleanup task: {e}")
            # Fallback to sync cleanup if async fails
            self._fallback_sync_cleanup()

    def _stop_cleanup_task(self) -> None:
        """Stop the async cleanup task gracefully."""
        self._shutdown_event.set()
        if self._cleanup_task is not None and not self._cleanup_task.done():
            self._cleanup_task.cancel()
            # Don't set to None immediately to allow proper cleanup

    async def _async_cleanup_loop(self) -> None:
        """Async cleanup loop that runs periodically."""
        interval_seconds = self._config.cleanup_interval_minutes * 60
        
        while not self._shutdown_event.is_set():
            try:
                # Wait for the interval or shutdown event
                await asyncio.wait_for(
                    self._shutdown_event.wait(), 
                    timeout=interval_seconds
                )
                # If we get here, shutdown was requested
                break
            except asyncio.TimeoutError:
                # Timeout means it's time for cleanup
                try:
                    await self._async_cleanup_expired_sessions()
                except Exception as e:
                    self._logger.warning(f"Async cleanup failed: {e}")
            except Exception as e:
                self._logger.error(f"Cleanup loop error: {e}")
                # Wait a bit before retrying to avoid tight error loops
                try:
                    await asyncio.sleep(min(60, interval_seconds // 10))
                except asyncio.CancelledError:
                    break

    async def _async_cleanup_expired_sessions(self) -> int:
        """Async version of cleanup_expired_sessions."""
        # Run the actual cleanup in a thread to avoid blocking
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self.cleanup_expired_sessions)

    def _fallback_sync_cleanup(self) -> None:
        """Fallback synchronous cleanup using threading.Thread (not Timer)."""
        def cleanup_worker():
            interval_seconds = self._config.cleanup_interval_minutes * 60
            while not self._shutdown_event.is_set():
                try:
                    self.cleanup_expired_sessions()
                except Exception as e:
                    self._logger.warning(f"Sync cleanup failed: {e}")
                
                # Use event.wait() with timeout instead of time.sleep
                if self._shutdown_event.wait(timeout=interval_seconds):
                    break  # Shutdown requested
        
        # Start cleanup thread
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()

    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions based on TTL and size limits with race condition protection.

        Returns:
            Number of sessions removed.
        """
        with self._lock:
            initial_count = len(self._sessions)
            removed_count = 0

            # Remove expired sessions based on TTL
            cutoff_time = datetime.now(timezone.utc) - timedelta(
                hours=self._config.session_ttl_hours
            )
            expired_ids = []

            # Create a snapshot to avoid race conditions during iteration
            sessions_snapshot = dict(self._sessions)

            for session_id, record in sessions_snapshot.items():
                try:
                    # Use last_access_at if available for more accurate expiration
                    access_time_str = record.last_access_at or record.updated_at
                    updated_at = datetime.fromisoformat(
                        access_time_str.replace("Z", "+00:00")
                    )
                    if updated_at < cutoff_time:
                        expired_ids.append(session_id)
                except (ValueError, AttributeError):
                    # Remove sessions with invalid timestamps
                    expired_ids.append(session_id)

            # Remove expired sessions with validation
            for session_id in expired_ids:
                if (
                    session_id in self._sessions
                ):  # Double-check existence to prevent race condition
                    record = self._sessions[session_id]

                    # Log security event for expired session
                    self._log_security_event(
                        "session_expired",
                        {
                            "session_id": session_id[:8] + "...",
                            "user_id": record.user_id,
                            "last_access": record.last_access_at,
                            "had_warnings": bool(record.security_warnings),
                        },
                    )

                    del self._sessions[session_id]
                    removed_count += 1

            # Apply size-based eviction (LRU) if still over limit
            if len(self._sessions) > self._config.max_sessions:
                # Sort by last access time for better LRU accuracy
                sessions_by_age = []
                for session_id, record in self._sessions.items():
                    access_time = record.last_access_at or record.updated_at
                    sessions_by_age.append((session_id, record, access_time))

                sessions_by_age.sort(key=lambda x: x[2])  # Sort by access time

                excess_count = len(self._sessions) - self._config.max_sessions
                for session_id, record, _ in sessions_by_age[:excess_count]:
                    if session_id in self._sessions:  # Double-check existence
                        # Log eviction event
                        self._log_security_event(
                            "session_evicted",
                            {
                                "session_id": session_id[:8] + "...",
                                "user_id": record.user_id,
                                "reason": "size_limit_exceeded",
                            },
                        )

                        del self._sessions[session_id]
                        removed_count += 1

            # Clean up security tracking data for removed sessions
            self._cleanup_security_tracking()

            return removed_count

    def _cleanup_security_tracking(self) -> None:
        """Clean up security tracking data to prevent memory leaks."""
        import time

        current_time = time.time()
        window = self._config.enumeration_detection_window

        # Clean old failed attempts
        for ip in list(self._failed_attempts.keys()):
            # Remove old timestamps
            self._failed_attempts[ip] = [
                timestamp
                for timestamp in self._failed_attempts[ip]
                if current_time - timestamp < window
            ]
            # Remove empty entries
            if not self._failed_attempts[ip]:
                del self._failed_attempts[ip]

        # Clean old enumeration attempts (keep only recent ones)
        for ip in list(self._enumeration_attempts.keys()):
            attempts = self._enumeration_attempts[ip]
            if len(attempts) > 50:  # Keep only most recent attempts
                self._enumeration_attempts[ip] = attempts[-25:]
            elif not attempts:
                del self._enumeration_attempts[ip]

    def get_memory_stats(self) -> dict[str, Any]:
        """Get current memory usage statistics.

        Returns:
            Dictionary with memory usage information.
        """
        with self._lock:
            total_messages = sum(
                len(record.messages) for record in self._sessions.values()
            )

            cleanup_status = "stopped"
            if self._cleanup_task is not None:
                if self._cleanup_task.done():
                    cleanup_status = "completed" if not self._cleanup_task.cancelled() else "cancelled"
                else:
                    cleanup_status = "running"

            return {
                "total_sessions": len(self._sessions),
                "max_sessions": self._config.max_sessions,
                "total_messages": total_messages,
                "avg_messages_per_session": total_messages / len(self._sessions)
                if self._sessions
                else 0,
                "cleanup_status": cleanup_status,
                "config": {
                    "max_sessions": self._config.max_sessions,
                    "session_ttl_hours": self._config.session_ttl_hours,
                    "cleanup_interval_minutes": self._config.cleanup_interval_minutes,
                    "max_messages_per_session": self._config.max_messages_per_session,
                },
            }

    async def shutdown(self) -> None:
        """Gracefully shutdown the session store and cleanup resources."""
        self._logger.info("Shutting down session store...")
        
        # Signal shutdown
        self._shutdown_event.set()
        
        # Wait for cleanup task to finish
        if self._cleanup_task is not None and not self._cleanup_task.done():
            try:
                await asyncio.wait_for(self._cleanup_task, timeout=5.0)
            except asyncio.TimeoutError:
                self._logger.warning("Cleanup task did not finish within timeout, cancelling...")
                self._cleanup_task.cancel()
                try:
                    await self._cleanup_task
                except asyncio.CancelledError:
                    pass
            except Exception as e:
                self._logger.warning(f"Error during cleanup task shutdown: {e}")
        
        # Mark task as None after proper cleanup
        self._cleanup_task = None
        
        # Final cleanup
        try:
            self.cleanup_expired_sessions()
        except Exception as e:
            self._logger.warning(f"Final cleanup failed: {e}")
        
        self._logger.info("Session store shutdown complete")

    def force_cleanup_now(self) -> int:
        """Force immediate cleanup of expired sessions.
        
        Returns:
            Number of sessions removed.
        """
        return self.cleanup_expired_sessions()

    # ------------------------------------------------------------------
    # Security validation methods
    # ------------------------------------------------------------------
    def _validate_session_access(
        self,
        session_id: str,
        client_ip: str | None = None,
        user_agent: str | None = None,
        user_id: int | None = None,
    ) -> SessionValidationResult:
        """Validate session access with comprehensive security checks.

        Args:
            session_id: The session ID to validate.
            client_ip: Client IP address for validation.
            user_agent: Client User-Agent for validation.
            user_id: Expected user ID for binding validation.

        Returns:
            SessionValidationResult with validation status and details.
        """
        if not self._config.enable_session_validation or not self._security_validator:
            return SessionValidationResult(is_valid=True, session_id=session_id)

        # First, validate session ID format
        validation_result = self._security_validator.validate_session_id(session_id)
        if not validation_result.is_valid:
            self._log_security_event(
                "invalid_session_format",
                {
                    "session_id": session_id[:8]
                    + "...",  # Log only prefix for security
                    "client_ip": client_ip,
                    "error": validation_result.error_code,
                },
            )
            return validation_result

        # Check for enumeration attempts
        if client_ip and self._is_enumeration_attempt(client_ip, session_id):
            self._log_security_event(
                "enumeration_attempt",
                {"client_ip": client_ip, "session_id": session_id[:8] + "..."},
            )
            return SessionValidationResult(
                is_valid=False,
                session_id=session_id,
                error_code="ENUMERATION_DETECTED",
                error_message="Session enumeration attempt detected",
            )

        # If session exists, perform user binding validation
        session_record = self._sessions.get(session_id)
        if session_record and self._config.enable_user_binding:
            if user_id and session_record.user_id != user_id:
                self._log_security_event(
                    "user_binding_mismatch",
                    {
                        "session_id": session_id[:8] + "...",
                        "expected_user": user_id,
                        "actual_user": session_record.user_id,
                        "client_ip": client_ip,
                    },
                )
                return SessionValidationResult(
                    is_valid=False,
                    session_id=session_id,
                    user_id=user_id,
                    error_code="USER_BINDING_VIOLATION",
                    error_message="Session user binding violation detected",
                )

            # Validate tampering detection token if available
            if (
                session_record.user_binding_token
                and client_ip
                and user_agent
                and session_record.user_id
            ):
                tamper_result = self._security_validator.verify_user_binding_token(
                    session_id,
                    session_record.user_id,
                    client_ip,
                    user_agent,
                    session_record.user_binding_token,
                )
                if not tamper_result.is_valid:
                    self._log_security_event(
                        "tampering_detected",
                        {
                            "session_id": session_id[:8] + "...",
                            "user_id": session_record.user_id,
                            "client_ip": client_ip,
                            "error": tamper_result.error_code,
                        },
                    )
                    return tamper_result

        return SessionValidationResult(
            is_valid=True, session_id=session_id, user_id=user_id
        )

    def _is_enumeration_attempt(self, client_ip: str, session_id: str) -> bool:
        """Detect session enumeration attempts from a client IP.

        Args:
            client_ip: The client IP address.
            session_id: The attempted session ID.

        Returns:
            True if enumeration attack is suspected.
        """
        import time

        current_time = time.time()
        window = self._config.enumeration_detection_window

        # Clean old attempts
        if client_ip in self._enumeration_attempts:
            # Remove attempts outside the time window (need timestamps)
            # For simplicity, we'll keep a rolling window of recent session IDs
            recent_attempts = self._enumeration_attempts[client_ip]
            if len(recent_attempts) > 20:  # Keep only recent attempts
                self._enumeration_attempts[client_ip] = recent_attempts[-10:]

        # Track this attempt
        if client_ip not in self._enumeration_attempts:
            self._enumeration_attempts[client_ip] = []

        self._enumeration_attempts[client_ip].append(session_id)

        # Check if this looks like enumeration
        recent_attempts = self._enumeration_attempts[client_ip]
        if len(recent_attempts) >= 5:  # 5 or more attempts
            return is_session_enumeration_attempt(recent_attempts[-5:])

        return False

    def _record_failed_attempt(
        self, client_ip: str | None, session_id: str, error_code: str
    ) -> None:
        """Record a failed session access attempt.

        Args:
            client_ip: The client IP address.
            session_id: The attempted session ID.
            error_code: The error code for the failure.
        """
        if not client_ip:
            return

        import time

        current_time = time.time()

        if client_ip not in self._failed_attempts:
            self._failed_attempts[client_ip] = []

        # Clean old attempts (outside time window)
        window = self._config.enumeration_detection_window
        self._failed_attempts[client_ip] = [
            timestamp
            for timestamp in self._failed_attempts[client_ip]
            if current_time - timestamp < window
        ]

        # Record this attempt
        self._failed_attempts[client_ip].append(current_time)

        # Log if too many failed attempts
        if len(self._failed_attempts[client_ip]) >= self._config.max_failed_attempts:
            self._log_security_event(
                "excessive_failed_attempts",
                {
                    "client_ip": client_ip,
                    "attempts": len(self._failed_attempts[client_ip]),
                    "latest_session": session_id[:8] + "...",
                    "error_code": error_code,
                },
            )

    def _log_security_event(self, event_type: str, details: dict[str, Any]) -> None:
        """Log security-related events for monitoring and analysis.

        Args:
            event_type: Type of security event.
            details: Event details dictionary.
        """
        self._logger.warning(
            f"Session security event: {event_type}",
            extra={"event_type": event_type, "timestamp": _iso(_now()), **details},
        )

    def create_secure_session(
        self,
        user_id: int | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
        title: str | None = None,
    ) -> SessionRecord:
        """Create a new session with enhanced security features.

        Args:
            user_id: The user ID to bind to the session.
            client_ip: Client IP address for binding.
            user_agent: Client User-Agent for binding.
            title: Optional session title.

        Returns:
            New SessionRecord with security metadata.
        """
        # Generate secure session ID
        if self._security_validator:
            session_id = self._security_validator.generate_secure_session_id()
        else:
            session_id = f"session_{uuid.uuid4()}"

        now = _iso(_now())

        # Create session record with security metadata
        record = SessionRecord(
            id=session_id,
            created_at=now,
            updated_at=now,
            status="pending",
            title=title,
            user_id=user_id,
            client_ip=client_ip,
            user_agent=user_agent,
            last_access_at=now,
        )

        # Generate security tokens if enabled
        if (
            self._config.enable_user_binding
            and self._security_validator
            and user_id
            and client_ip
            and user_agent
        ):
            record.user_binding_token = (
                self._security_validator.create_user_binding_token(
                    session_id, user_id, client_ip, user_agent
                )
            )

        if (
            self._config.enable_tampering_detection
            and self._security_validator
            and user_id
        ):
            record.csrf_token = self._security_validator.create_csrf_token(
                session_id, user_id
            )

        with self._lock:
            self._sessions[session_id] = record

        self._log_security_event(
            "session_created",
            {
                "session_id": session_id[:8] + "...",
                "user_id": user_id,
                "client_ip": client_ip,
                "has_binding": bool(record.user_binding_token),
                "has_csrf": bool(record.csrf_token),
            },
        )

        return record

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------
    def ensure_session(
        self,
        session_id: str,
        *,
        user_id: int | None = None,
        title: str | None = None,
        status: str | None = None,
        client_ip: str | None = None,
        user_agent: str | None = None,
    ) -> SessionRecord:
        """Create the session if missing and update metadata with security validation."""
        # Validate session access first
        validation_result = self._validate_session_access(
            session_id, client_ip, user_agent, user_id
        )

        if not validation_result.is_valid:
            self._record_failed_attempt(
                client_ip,
                session_id,
                validation_result.error_code or "VALIDATION_FAILED",
            )
            raise ValueError(
                f"Session validation failed: {validation_result.error_message}"
            )

        with self._lock:
            record = self._sessions.get(session_id)
            now = _iso(_now())

            if record is None:
                record = SessionRecord(
                    id=session_id,
                    created_at=now,
                    updated_at=now,
                    status=status or "pending",
                    title=title,
                    user_id=user_id,
                    client_ip=client_ip,
                    user_agent=user_agent,
                    last_access_at=now,
                )
                self._sessions[session_id] = record

                # Generate security tokens for new sessions
                if (
                    self._config.enable_user_binding
                    and self._security_validator
                    and user_id
                    and client_ip
                    and user_agent
                ):
                    record.user_binding_token = (
                        self._security_validator.create_user_binding_token(
                            session_id, user_id, client_ip, user_agent
                        )
                    )

                if (
                    self._config.enable_tampering_detection
                    and self._security_validator
                    and user_id
                ):
                    record.csrf_token = self._security_validator.create_csrf_token(
                        session_id, user_id
                    )
            else:
                # Update existing session
                record.updated_at = now
                record.last_access_at = now

                if status:
                    record.status = status
                if title is not None:
                    record.title = title or record.title
                if user_id is not None:
                    record.user_id = user_id

                # Update security metadata if provided
                if client_ip and record.client_ip != client_ip:
                    # IP change detected - potential security concern
                    record.security_warnings.append(
                        f"IP change detected: {record.client_ip} -> {client_ip}"
                    )
                    record.client_ip = client_ip

                if user_agent and record.user_agent != user_agent:
                    # User-Agent change detected
                    record.security_warnings.append("User-Agent change detected")
                    record.user_agent = user_agent

                # Add any validation warnings
                if validation_result.security_warnings:
                    record.security_warnings.extend(validation_result.security_warnings)

            return record

    def update_session(
        self,
        session_id: str,
        **updates: Any,
    ) -> SessionRecord:
        """Update an existing session with arbitrary fields."""
        with self._lock:
            record = self.ensure_session(session_id)
            for key, value in updates.items():
                if hasattr(record, key):
                    setattr(record, key, value)
            record.updated_at = _iso(_now())
            return record

    # ------------------------------------------------------------------
    # Message management
    # ------------------------------------------------------------------
    def add_message(self, session_id: str, message: dict[str, Any]) -> StoredMessage:
        """Append a chat message to the session, deduplicating by id."""
        with self._lock:
            record = self.ensure_session(session_id)
            message_id = message.get("id") or f"msg_{uuid.uuid4()}"
            timestamp = _iso(message.get("timestamp"))

            # Skip if message already exists
            existing = next((m for m in record.messages if m.id == message_id), None)
            if existing:
                existing.content = message.get("content", existing.content)
                existing.metadata = message.get("metadata") or existing.metadata
                existing.timestamp = timestamp
                record.updated_at = timestamp
                return existing

            stored = StoredMessage(
                id=message_id,
                role=message.get("role", "assistant"),
                content=message.get("content", ""),
                timestamp=timestamp,
                metadata=message.get("metadata") or None,
            )
            record.messages.append(stored)

            # Enforce message limit per session
            if len(record.messages) > self._config.max_messages_per_session:
                # Remove oldest messages to stay within limit
                excess_count = (
                    len(record.messages) - self._config.max_messages_per_session
                )
                record.messages = record.messages[excess_count:]

            record.updated_at = timestamp

            if not record.title and stored.role == "user" and stored.content:
                record.title = stored.content[:60]

            return stored

    def upsert_progress_message(
        self,
        session_id: str,
        content: str,
        *,
        completed: bool = False,
    ) -> StoredMessage:
        """Ensure a single assistant progress message exists and update it."""
        metadata = {"kind": "assistant-progress"}
        if completed:
            metadata["completed"] = True

        with self._lock:
            record = self.ensure_session(session_id)
            progress_message = next(
                (
                    m
                    for m in record.messages
                    if (m.metadata or {}).get("kind") == "assistant-progress"
                ),
                None,
            )

            timestamp = _iso(_now())
            if progress_message:
                progress_message.content = content
                progress_message.metadata = metadata
                progress_message.timestamp = timestamp
            else:
                progress_message = StoredMessage(
                    id=f"msg_{uuid.uuid4()}_assistant_progress",
                    role="assistant",
                    content=content,
                    timestamp=timestamp,
                    metadata=metadata,
                )
                record.messages.append(progress_message)

            record.updated_at = timestamp
            return progress_message

    # ------------------------------------------------------------------
    # Retrieval helpers with security validation
    # ------------------------------------------------------------------
    def get_session(
        self,
        session_id: str,
        client_ip: str | None = None,
        user_agent: str | None = None,
        user_id: int | None = None,
    ) -> dict[str, Any] | None:
        """Retrieve session with security validation."""
        # Validate session access
        validation_result = self._validate_session_access(
            session_id, client_ip, user_agent, user_id
        )

        if not validation_result.is_valid:
            self._record_failed_attempt(
                client_ip, session_id, validation_result.error_code or "ACCESS_DENIED"
            )
            return None

        with self._lock:
            record = self._sessions.get(session_id)
            if record:
                # Update access timestamp
                record.last_access_at = _iso(_now())
                record.updated_at = _iso(_now())

                # Reset failed attempts on successful access
                record.failed_access_attempts = 0

                return record.to_dict(include_messages=True)
            return None

    def get_session_secure(
        self,
        session_id: str,
        client_ip: str | None = None,
        user_agent: str | None = None,
        user_id: int | None = None,
        csrf_token: str | None = None,
    ) -> dict[str, Any] | None:
        """Retrieve session with full security validation including CSRF protection."""
        # First, perform standard validation
        session_data = self.get_session(session_id, client_ip, user_agent, user_id)
        if not session_data:
            return None

        # Additional CSRF validation if enabled and token provided
        if (
            self._config.enable_tampering_detection
            and self._security_validator
            and csrf_token
            and user_id
        ):
            if not self._security_validator.verify_csrf_token(
                session_id, user_id, csrf_token
            ):
                self._log_security_event(
                    "csrf_validation_failed",
                    {
                        "session_id": session_id[:8] + "...",
                        "user_id": user_id,
                        "client_ip": client_ip,
                    },
                )
                self._record_failed_attempt(
                    client_ip, session_id, "CSRF_VALIDATION_FAILED"
                )
                return None

        return session_data

    def list_sessions(
        self, user_id: int | None = None, include_security: bool = False
    ) -> list[dict[str, Any]]:
        """List sessions with optional user filtering and security metadata."""
        with self._lock:
            sessions = []
            for record in self._sessions.values():
                # Filter by user if specified
                if user_id is not None and record.user_id != user_id:
                    continue

                session_dict = record.to_dict(
                    include_messages=False, include_security=include_security
                )
                sessions.append(session_dict)

            sessions.sort(key=lambda item: item["updated_at"], reverse=True)
            return sessions

    def get_security_stats(self) -> dict[str, Any]:
        """Get security statistics for monitoring and analysis."""
        with self._lock:
            total_sessions = len(self._sessions)
            flagged_sessions = sum(
                1 for record in self._sessions.values() if record.is_security_flagged
            )
            sessions_with_warnings = sum(
                1 for record in self._sessions.values() if record.security_warnings
            )

            # Count failed attempts across all IPs
            total_failed_attempts = sum(
                len(attempts) for attempts in self._failed_attempts.values()
            )

            # Count enumeration attempts
            total_enumeration_attempts = sum(
                len(attempts) for attempts in self._enumeration_attempts.values()
            )

            return {
                "total_sessions": total_sessions,
                "flagged_sessions": flagged_sessions,
                "sessions_with_warnings": sessions_with_warnings,
                "total_failed_attempts": total_failed_attempts,
                "total_enumeration_attempts": total_enumeration_attempts,
                "security_features": {
                    "session_validation_enabled": self._config.enable_session_validation,
                    "user_binding_enabled": self._config.enable_user_binding,
                    "tampering_detection_enabled": self._config.enable_tampering_detection,
                },
                "security_thresholds": {
                    "max_failed_attempts": self._config.max_failed_attempts,
                    "enumeration_detection_window": self._config.enumeration_detection_window,
                },
            }

    # ------------------------------------------------------------------
    # SSE integration
    # ------------------------------------------------------------------
    def ingest_event(self, session_id: str, event: dict[str, Any]) -> None:
        """Update session metadata based on SSE events."""
        event_type = event.get("type")
        payload = event.get("data") if isinstance(event.get("data"), dict) else event

        if event_type not in {
            "research_started",
            "research_progress",
            "research_complete",
            "error",
        }:
            return

        status = payload.get("status") if isinstance(payload, dict) else None
        overall_progress = (
            payload.get("overall_progress") if isinstance(payload, dict) else None
        )
        current_phase = (
            payload.get("current_phase") if isinstance(payload, dict) else None
        )
        final_report = (
            payload.get("final_report") if isinstance(payload, dict) else None
        )
        error_message = (
            payload.get("error")
            if isinstance(payload, dict)
            else payload.get("message")
        )

        if event_type == "error" and not error_message and isinstance(payload, dict):
            error_message = payload.get("data", {}).get("error")

        with self._lock:
            record = self.ensure_session(session_id)
            if status:
                record.status = status
            if overall_progress is not None:
                try:
                    progress_value = float(overall_progress)
                    record.progress = (
                        progress_value if progress_value <= 1 else progress_value / 100
                    )
                except (TypeError, ValueError):
                    pass
            if current_phase:
                record.current_phase = current_phase

            if event_type == "error" and error_message:
                record.error = error_message

            if event_type in {"research_progress", "research_complete"}:
                content = self._format_progress_content(payload, record)
                completed = event_type == "research_complete"
                if final_report:
                    record.final_report = final_report
                    content = final_report
                    completed = True
                self.upsert_progress_message(session_id, content, completed=completed)

            record.updated_at = _iso(_now())

    # ------------------------------------------------------------------
    # Helper utilities
    # ------------------------------------------------------------------
    @staticmethod
    def _format_progress_content(
        payload: dict[str, Any] | None, record: SessionRecord
    ) -> str:
        """Format a human-readable progress message for assistant streaming."""
        if not isinstance(payload, dict):
            return "Processing research request..."

        phase = payload.get("current_phase") or record.current_phase or "Processing"
        lines: list[str] = [f"**{phase}**"]

        progress_raw = payload.get("overall_progress")
        try:
            if progress_raw is not None:
                progress_value = float(progress_raw)
                if progress_value <= 1:
                    progress_value *= 100
                lines.append(
                    f"Progress: {int(max(0, min(100, round(progress_value))))}%"
                )
        except (TypeError, ValueError):
            pass

        partial_results = payload.get("partial_results")
        if isinstance(partial_results, dict) and partial_results:
            preview_entries = list(partial_results.items())[:2]
            for key, value in preview_entries:
                if isinstance(value, str):
                    rendered = value
                else:
                    rendered = json.dumps(value, ensure_ascii=False)  # Rough preview
                lines.append(f"- {key.replace('_', ' ').title()}: {rendered}")

        return "\n\n".join(lines)


# Global singleton used across the application
session_store = SessionStore()

__all__ = [
    "SessionRecord",
    "SessionStore",
    "SessionStoreConfig",
    "StoredMessage",
    "session_store",
]
