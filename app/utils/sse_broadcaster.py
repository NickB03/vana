# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Memory-optimized SSE Event Broadcasting System for Agent Network Updates.

This module provides a memory-leak-free implementation of SSE broadcasting
with proper resource management, TTL-based cleanup, bounded queues, and
comprehensive monitoring.

Key improvements:
- Bounded event history with configurable limits
- TTL-based event expiration
- Memory-optimized queue implementation
- Automatic cleanup of stale resources
- Context managers for proper cleanup
- Weakref usage for automatic GC
- Background cleanup tasks
- Comprehensive memory monitoring
"""

import asyncio
import gc
import json
import logging
import os
import threading  # Only used for singleton pattern in synchronous context
import time
from collections import defaultdict, deque
from collections.abc import AsyncGenerator, AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

from app.utils.session_store import session_store

# Optional import for memory monitoring
try:
    import psutil  # type: ignore
except ImportError:  # psutil may not be installed
    psutil = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


@dataclass
class BroadcasterConfig:
    """Configuration for the SSE broadcaster."""

    max_queue_size: int = 1000
    max_history_per_session: int = 500
    event_ttl: float | None = 300.0  # 5 minutes default TTL
    session_ttl: float = 1800.0  # 30 minutes default session TTL
    cleanup_interval: float = 60.0  # 1 minute cleanup interval
    enable_metrics: bool = True
    max_subscriber_idle_time: float = 600.0  # 10 minutes
    memory_warning_threshold_mb: float = 100.0
    memory_critical_threshold_mb: float = 200.0


@dataclass
class MemoryMetrics:
    """Memory usage metrics."""

    process_memory_mb: float = 0.0
    broadcaster_memory_estimate_mb: float = 0.0
    total_sessions: int = 0
    total_subscribers: int = 0
    total_events: int = 0
    expired_events_cleaned: int = 0
    dead_queues_cleaned: int = 0
    sessions_expired: int = 0
    last_cleanup_time: float = 0.0
    cleanup_count: int = 0


@dataclass
class SSEEvent:
    """Represents a Server-Sent Event with TTL support."""

    type: str
    data: dict[str, Any]
    id: str | None = None
    retry: int | None = None
    ttl: float | None = None  # Time to live in seconds
    created_at: float = field(default_factory=time.time)

    def is_expired(self) -> bool:
        """Check if the event has expired based on TTL."""
        if self.ttl is None:
            return False
        return (time.time() - self.created_at) > self.ttl

    def to_sse_format(self) -> str:
        """Convert to SSE format string."""
        lines = []

        if self.id:
            lines.append(f"id: {self.id}")

        if self.retry:
            lines.append(f"retry: {self.retry}")

        lines.append(f"event: {self.type}")
        lines.append(f"data: {json.dumps(self.data)}")

        return "\n".join(lines) + "\n\n"  # Properly terminate with double newline per SSE spec


class MemoryOptimizedQueue:
    """Memory-optimized async queue with TTL and size limits."""

    def __init__(self, maxsize: int = 0):
        self.maxsize = maxsize
        self._queue: deque[Any] = deque()
        self._condition: asyncio.Condition | None = None  # Lazy init to avoid event loop issues
        self._closed = False
        self._last_activity = time.time()

    def _ensure_condition(self):
        """Lazily create Condition in the current event loop."""
        if self._condition is None:
            try:
                self._condition = asyncio.Condition()
            except RuntimeError as e:
                logger.error(f"No running event loop to create Condition: {e}")
                raise

    async def put(self, item: Any, timeout: float | None = None) -> bool:
        """Put item in queue, return False if queue is closed or full."""
        if self._closed:
            return False

        self._ensure_condition()
        async with self._condition:
            if self.maxsize > 0 and len(self._queue) >= self.maxsize:
                return False

            self._queue.append(item)
            self._last_activity = time.time()
            self._condition.notify()
            return True

    async def get(self, timeout: float | None = None) -> Any:
        """Get item from queue, raises CancelledError if closed."""
        if self._closed:
            raise asyncio.CancelledError("Queue is closed")

        self._ensure_condition()
        async with self._condition:
            while not self._queue and not self._closed:
                try:
                    if timeout is not None:
                        await asyncio.wait_for(self._condition.wait(), timeout=timeout)
                    else:
                        await self._condition.wait()
                except asyncio.TimeoutError:
                    # Return keepalive on timeout
                    return {
                        "type": "keepalive",
                        "timestamp": datetime.now().isoformat(),
                    }

            # After exiting the while loop, either we have items or queue is closed
            if not self._queue:  # Must be closed if no items
                raise asyncio.CancelledError("Queue is closed")

            item = self._queue.popleft()
            self._last_activity = time.time()
            return item

    def qsize(self) -> int:
        """Get queue size."""
        return len(self._queue)

    def is_stale(self, max_age: float) -> bool:
        """Check if queue is stale (no activity for max_age seconds)."""
        return (time.time() - self._last_activity) > max_age

    def close(self) -> None:
        """Close the queue and notify waiting tasks."""
        self._closed = True

        # We need to acquire the condition in a task since we might not be in async context
        def notify_close() -> None:
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(self._notify_close())  # noqa: RUF006
            except RuntimeError:
                pass  # No running loop

        notify_close()

    async def _notify_close(self) -> None:
        """Internal method to notify close."""
        self._ensure_condition()
        async with self._condition:
            self._condition.notify_all()


class SessionManager:
    """Manages session lifecycle and tracking."""

    def __init__(self, config: BroadcasterConfig):
        self.config = config
        self._sessions: dict[str, float] = {}  # session_id -> last_activity
        self._subscriber_counts: dict[str, int] = defaultdict(int)
        self._tasks: dict[str, asyncio.Task] = {}  # session_id -> background task
        # Use asyncio.Lock for async/await compatibility in async contexts
        # Note: asyncio locks cannot be used in synchronous contexts
        self._lock = asyncio.Lock()

    async def create_session(self, session_id: str) -> None:
        """Create or update a session."""
        async with self._lock:
            self._sessions[session_id] = time.time()

    async def touch_session(self, session_id: str) -> None:
        """Update session activity timestamp."""
        async with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id] = time.time()

    async def increment_subscribers(self, session_id: str) -> None:
        """Increment subscriber count for session."""
        async with self._lock:
            self._subscriber_counts[session_id] += 1
            # Don't await touch_session since we already hold the lock
            if session_id in self._sessions:
                self._sessions[session_id] = time.time()

    async def decrement_subscribers(self, session_id: str) -> None:
        """Decrement subscriber count for session."""
        async with self._lock:
            if self._subscriber_counts[session_id] > 0:
                self._subscriber_counts[session_id] -= 1

    async def get_active_sessions(self) -> set[str]:
        """Get all active sessions."""
        async with self._lock:
            return set(self._sessions.keys())

    async def register_task(self, session_id: str, task: asyncio.Task[Any]) -> None:
        """Register a background task for a session, canceling any existing task."""
        old_task: asyncio.Task[Any] | None = None

        async with self._lock:
            # Cancel existing task if present
            if session_id in self._tasks:
                old_task = self._tasks[session_id]
                if not old_task.done():
                    old_task.cancel()
                    logger.info(f"Cancelling existing task for session {session_id}")

            # Register new task immediately (don't wait for old task to finish)
            self._tasks[session_id] = task

        # CRITICAL FIX: Wait for old task cancellation OUTSIDE the lock
        # Awaiting inside the lock can cause deadlock if the task needs the lock
        if old_task and not old_task.done():
            try:
                await old_task
            except asyncio.CancelledError:
                pass  # Expected when canceling
            logger.info(f"Cancelled existing task for session {session_id} completed")

    async def cancel_task(self, session_id: str) -> None:
        """Cancel and remove a background task for a session."""
        async with self._lock:
            if session_id in self._tasks:
                self._tasks[session_id].cancel()
                try:
                    await self._tasks[session_id]
                except asyncio.CancelledError:
                    pass  # Expected when cancelling
                del self._tasks[session_id]

    async def cancel_session_tasks(self, session_id: str) -> None:
        """Alias for cancel_task to match test expectations."""
        await self.cancel_task(session_id)

    async def get_task_status(self, session_id: str | None = None) -> dict[str, Any]:
        """Get status information about background tasks.

        Args:
            session_id: If provided, get status for specific session. Otherwise, get overall status.

        Returns:
            Dictionary with task status information
        """
        async with self._lock:
            if session_id is not None:
                # Get status for specific session
                if session_id in self._tasks:
                    task = self._tasks[session_id]
                    return {
                        "session_id": session_id,
                        "has_task": True,
                        "status": "running" if not task.done() else "done",
                        "cancelled": task.cancelled() if task.done() else False,
                    }
                else:
                    return {
                        "session_id": session_id,
                        "has_task": False,
                        "status": None,
                        "cancelled": False,
                    }
            else:
                # Get overall status for all sessions
                total_tasks = len(self._tasks)
                running_tasks = sum(1 for task in self._tasks.values() if not task.done())
                return {
                    "total_tasks": total_tasks,
                    "running_tasks": running_tasks,
                    "sessions": list(self._tasks.keys()),
                }

    async def cleanup_expired_sessions(self) -> set[str]:
        """Remove expired sessions with no subscribers and cancel their tasks."""
        current_time = time.time()
        expired_sessions = set()

        async with self._lock:
            for session_id, last_activity in list(self._sessions.items()):
                # Only expire if no subscribers and past TTL
                if (
                    self._subscriber_counts[session_id] == 0
                    and (current_time - last_activity) > self.config.session_ttl
                ):
                    expired_sessions.add(session_id)
                    del self._sessions[session_id]
                    if session_id in self._subscriber_counts:
                        del self._subscriber_counts[session_id]

                    # Cancel background task if exists
                    if session_id in self._tasks:
                        task = self._tasks[session_id]
                        if not task.done():
                            task.cancel()
                            try:
                                await task
                            except asyncio.CancelledError:
                                pass  # Expected when canceling
                        del self._tasks[session_id]
                        logger.info(f"Cancelled task for expired session {session_id}")

        return expired_sessions


class EnhancedSSEBroadcaster:
    """Enhanced SSE broadcaster with memory leak prevention."""

    def __init__(self, config: BroadcasterConfig | None = None):
        self.config = config or BroadcasterConfig()

        # Session-specific subscriber queues using weak references
        self._subscribers: dict[str, list[MemoryOptimizedQueue]] = defaultdict(list)
        self._lock = asyncio.Lock()

        # Session-specific event history with bounded deques
        self._event_history: dict[str, deque[SSEEvent]] = defaultdict(
            lambda: deque(maxlen=self.config.max_history_per_session)
        )

        # Session lifecycle management
        self._session_manager = SessionManager(self.config)

        # Metrics tracking
        self._metrics = MemoryMetrics()
        self._process = psutil.Process(os.getpid()) if psutil else None

        # Background cleanup task
        self._cleanup_task: asyncio.Task[None] | None = None
        self._running = False

        # Start background cleanup if event loop is available
        try:
            asyncio.get_running_loop()
            self._start_background_cleanup()
        except RuntimeError:
            # No event loop yet, will start when first operation happens
            pass

    def _start_background_cleanup(self) -> None:
        """Start the background cleanup task."""
        if not self._running:
            self._running = True
            try:
                loop = asyncio.get_running_loop()
                self._cleanup_task = loop.create_task(self._background_cleanup())
            except RuntimeError:
                # No event loop running, will start when needed
                pass

    async def _background_cleanup(self) -> None:
        """Background task for periodic cleanup."""
        while self._running:
            try:
                await asyncio.sleep(self.config.cleanup_interval)
                await self._perform_cleanup()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background cleanup: {e}")

    async def _perform_cleanup(self) -> None:
        """Perform comprehensive cleanup of expired resources."""
        cleanup_start = time.time()

        expired_events = 0
        dead_queues = 0

        # Clean up expired events
        async with self._lock:
            for session_id, events in list(self._event_history.items()):
                # Filter out expired events
                if self.config.event_ttl:
                    before_count = len(events)
                    # Create new deque with non-expired events
                    new_events = deque(
                        (event for event in events if not event.is_expired()),
                        maxlen=self.config.max_history_per_session,
                    )
                    self._event_history[session_id] = new_events
                    expired_events += before_count - len(new_events)

        # Clean up dead queues
        async with self._lock:
            for session_id, queues in list(self._subscribers.items()):
                alive_queues = []
                for queue in queues:
                    if not queue._closed and not queue.is_stale(
                        self.config.max_subscriber_idle_time
                    ):
                        alive_queues.append(queue)
                    else:
                        dead_queues += 1
                        queue.close()

                if alive_queues:
                    self._subscribers[session_id] = alive_queues
                else:
                    # No alive queues, remove session and reset subscriber count
                    del self._subscribers[session_id]
                    # Use reset_subscribers to properly zero out the count
                    await self.reset_subscribers(session_id)

        # Clean up expired sessions
        expired_sessions = await self._session_manager.cleanup_expired_sessions()

        # Remove data for expired sessions
        for session_id in expired_sessions:
            async with self._lock:
                if session_id in self._event_history:
                    del self._event_history[session_id]
                if session_id in self._subscribers:
                    # Close any remaining queues
                    for queue in self._subscribers[session_id]:
                        queue.close()
                    del self._subscribers[session_id]

        # Update metrics
        self._metrics.expired_events_cleaned += expired_events
        self._metrics.dead_queues_cleaned += dead_queues
        self._metrics.sessions_expired += len(expired_sessions)
        self._metrics.last_cleanup_time = cleanup_start
        self._metrics.cleanup_count += 1

        # Update memory metrics if enabled
        if self.config.enable_metrics:
            await self._update_memory_metrics()

        cleanup_time = time.time() - cleanup_start
        if cleanup_time > 1.0:  # Log slow cleanups
            logger.warning(
                f"Cleanup took {cleanup_time:.2f}s, "
                f"cleaned {expired_events} events, {dead_queues} queues, "
                f"{len(expired_sessions)} sessions"
            )

    async def _update_memory_metrics(self) -> None:
        """Update memory usage metrics."""
        try:
            # Only check process memory if we have psutil available and configured
            if self._process and self.config.enable_metrics:
                try:
                    memory_info = self._process.memory_info()
                    process_memory_mb = memory_info.rss / (1024 * 1024)
                    self._metrics.process_memory_mb = process_memory_mb

                    # Only log warnings for genuinely high memory usage (over 1GB)
                    if process_memory_mb > max(
                        1000.0, self.config.memory_critical_threshold_mb
                    ):
                        logger.error(
                            f"Critical memory usage: {process_memory_mb:.1f}MB"
                        )
                        gc.collect()
                    elif process_memory_mb > max(
                        500.0, self.config.memory_warning_threshold_mb
                    ):
                        logger.warning(f"High memory usage: {process_memory_mb:.1f}MB")
                except Exception:
                    # Ignore psutil errors
                    self._metrics.process_memory_mb = 0.0
            else:
                # No psutil available, skip memory monitoring
                self._metrics.process_memory_mb = 0.0

            # Estimate broadcaster memory usage
            total_events = sum(len(events) for events in self._event_history.values())
            total_queues = sum(len(queues) for queues in self._subscribers.values())

            # Rough estimation: 1KB per event, 500 bytes per queue
            estimated_mb = (total_events * 1024 + total_queues * 500) / (1024 * 1024)
            self._metrics.broadcaster_memory_estimate_mb = estimated_mb

            # Update counts
            active_sessions = await self._session_manager.get_active_sessions()
            self._metrics.total_sessions = len(active_sessions)
            self._metrics.total_subscribers = total_queues
            self._metrics.total_events = total_events

        except Exception as e:
            logger.error(f"Error updating memory metrics: {e}")

    async def add_subscriber(self, session_id: str) -> MemoryOptimizedQueue:
        """Add a new SSE subscriber for a session."""
        logger.info(f"add_subscriber called for session {session_id}")
        # Ensure cleanup is running
        if not self._running:
            self._start_background_cleanup()

        logger.info(f"Creating queue with maxsize {self.config.max_queue_size}")
        queue = MemoryOptimizedQueue(maxsize=self.config.max_queue_size)
        logger.info("Queue created, acquiring lock")

        async with self._lock:
            logger.info("Lock acquired, adding subscriber")
            self._subscribers[session_id].append(queue)
            await self._session_manager.create_session(session_id)
            await self._session_manager.increment_subscribers(session_id)

            # Send recent history to new subscriber
            history = list(self._event_history[session_id])[-10:]  # Last 10 events
            logger.info(f"History retrieved: {len(history)} events")

        # Send history asynchronously
        for event in history:
            if not event.is_expired():
                success = await queue.put(event.to_sse_format(), timeout=1.0)
                if not success:
                    break

        logger.info(
            f"New SSE subscriber for session {session_id}, "
            f"total: {len(self._subscribers[session_id])}"
        )
        return queue

    async def remove_subscriber(
        self, session_id: str, queue: MemoryOptimizedQueue
    ) -> None:
        """Remove an SSE subscriber."""
        queue.close()

        async with self._lock:
            if session_id in self._subscribers:
                try:
                    self._subscribers[session_id].remove(queue)
                    await self._session_manager.decrement_subscribers(session_id)

                    if not self._subscribers[session_id]:
                        del self._subscribers[session_id]

                    logger.info(
                        f"SSE subscriber removed for session {session_id}, "
                        f"remaining: {len(self._subscribers.get(session_id, []))}"
                    )
                except ValueError:
                    pass  # Queue wasn't in the list

    @asynccontextmanager
    async def subscribe(self, session_id: str) -> AsyncIterator[MemoryOptimizedQueue]:
        """Context manager for safe subscription management."""
        logger.info(f"subscribe() called for session {session_id}")
        queue = await self.add_subscriber(session_id)
        logger.info(f"add_subscriber() returned queue for session {session_id}")
        try:
            yield queue
        finally:
            logger.info(f"subscribe() cleanup for session {session_id}")
            await self.remove_subscriber(session_id, queue)

    async def broadcast_event(self, session_id: str, event_data: dict) -> None:
        """Broadcast event to all subscribers of a session."""
        # Ensure cleanup is running
        if not self._running:
            self._start_background_cleanup()

        # Add timestamp if not present
        if "timestamp" not in event_data:
            event_data["timestamp"] = datetime.now().isoformat()

        # Ensure timestamp exists in event data payload
        event_payload = event_data.get("data", event_data)
        if isinstance(event_payload, dict) and "timestamp" not in event_payload:
            event_payload["timestamp"] = event_data["timestamp"]

        # Create SSE event with TTL
        event = SSEEvent(
            type=event_data.get("type", "agent_update"),
            data=event_payload,
            id=f"{event_data.get('type', 'event')}_{datetime.now().timestamp()}",
            ttl=self.config.event_ttl,
        )

        # Store in session history (bounded deque)
        async with self._lock:
            self._event_history[session_id].append(event)
            await self._session_manager.touch_session(session_id)

            # Get subscribers for this session
            subscribers = list(self._subscribers.get(session_id, []))

        # Persist event snapshots so sessions can be resumed later. Use specific
        # exception handling to provide better debugging while avoiding breaking
        # the broadcast path if persistence fails.
        try:
            session_store.ingest_event(session_id, event_data)
        except (KeyError, ValueError, TypeError) as exc:
            # Data validation or formatting errors
            logger.warning(
                "Session persistence failed due to invalid data format for session %s: %s",
                session_id,
                exc,
                extra={"session_id": session_id, "event_type": event_data.get("type")},
            )
        except MemoryError as exc:
            # Memory pressure - important to track
            logger.error(
                "Session persistence failed due to memory pressure for session %s: %s",
                session_id,
                exc,
                extra={"session_id": session_id, "memory_critical": True},
            )
        except Exception as exc:  # pragma: no cover - catch-all for unexpected errors
            logger.error(
                "Unexpected error in session persistence for session %s: %s",
                session_id,
                exc,
                extra={"session_id": session_id, "error_type": type(exc).__name__},
            )

        # Broadcast to subscribers (outside lock)
        if subscribers:
            dead_queues = []
            event_str = event.to_sse_format()

            for queue in subscribers:
                if queue._closed:
                    dead_queues.append(queue)
                    continue

                success = await queue.put(event_str, timeout=0.1)
                if not success:
                    dead_queues.append(queue)
                    logger.warning(f"SSE queue full/timeout for session {session_id}")

            # Clean up dead queues
            for queue in dead_queues:
                await self.remove_subscriber(session_id, queue)

    async def broadcast_agent_network_event(
        self, network_event: dict[str, Any], session_id: str
    ) -> None:
        """Broadcast an agent network update event."""
        await self.broadcast_event(session_id, network_event)
        logger.debug(
            f"Broadcasted {network_event.get('type', 'event')} for session {session_id}"
        )

    async def get_event_history(self, session_id: str, limit: int = 50) -> list[SSEEvent]:
        """Get recent event history for a session."""
        async with self._lock:
            if session_id in self._event_history:
                events = list(self._event_history[session_id])
                # Filter out expired events and apply limit
                valid_events = [e for e in events if not e.is_expired()]
                return valid_events[-limit:] if limit else valid_events
            return []

    async def clear_session(self, session_id: str) -> None:
        """Clear all subscribers and history for a session."""
        # Cancel background task first
        await self._session_manager.cancel_task(session_id)

        async with self._lock:
            # Close and clear subscribers
            if session_id in self._subscribers:
                for queue in self._subscribers[session_id]:
                    queue.close()
                del self._subscribers[session_id]

            # Clear history
            if session_id in self._event_history:
                del self._event_history[session_id]

        logger.info(f"Cleared SSE data for session {session_id}")

    async def reset_subscribers(self, session_id: str | None = None) -> None:
        """Reset subscribers for proper session expiry.

        Args:
            session_id: If provided, reset only this session. If None, reset all.
        """
        async with self._lock:
            if session_id:
                # Reset specific session
                if session_id in self._subscribers:
                    for queue in self._subscribers[session_id]:
                        queue.close()
                    del self._subscribers[session_id]

                if session_id in self._event_history:
                    self._event_history[session_id].clear()

                # Reset session manager state
                self._session_manager._subscriber_counts[session_id] = 0
                if session_id in self._session_manager._sessions:
                    del self._session_manager._sessions[session_id]

                logger.info(f"Reset subscribers for session {session_id}")
            else:
                # Reset all sessions
                for queues in self._subscribers.values():
                    for queue in queues:
                        queue.close()

                self._subscribers.clear()
                self._event_history.clear()
                self._session_manager._sessions.clear()
                self._session_manager._subscriber_counts.clear()

                logger.info("Reset all subscribers")

    async def get_stats(self) -> dict[str, Any]:
        """Get comprehensive broadcaster statistics."""
        async with self._lock:
            session_stats = {}

            active_sessions = await self._session_manager.get_active_sessions()

            for session_id in active_sessions:
                session_stats[session_id] = {
                    "subscribers": len(self._subscribers.get(session_id, [])),
                    "historySize": len(self._event_history.get(session_id, [])),
                }

            stats = {
                "totalSessions": len(active_sessions),
                "totalSubscribers": sum(
                    len(queues) for queues in self._subscribers.values()
                ),
                "totalEvents": sum(
                    len(events) for events in self._event_history.values()
                ),
                "memoryUsageMB": self._metrics.process_memory_mb,
                "sessionStats": session_stats,
                "config": {
                    "maxQueueSize": self.config.max_queue_size,
                    "maxHistoryPerSession": self.config.max_history_per_session,
                    "eventTTL": self.config.event_ttl,
                    "sessionTTL": self.config.session_ttl,
                    "cleanupInterval": self.config.cleanup_interval,
                },
                "metrics": asdict(self._metrics),
            }

        return stats

    async def shutdown(self) -> None:
        """Gracefully shutdown the broadcaster."""
        self._running = False

        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Close all queues
        async with self._lock:
            for queues in self._subscribers.values():
                for queue in queues:
                    queue.close()

            self._subscribers.clear()
            self._event_history.clear()

        logger.info("SSE broadcaster shutdown complete")


# Global broadcaster instance - will be replaced with singleton pattern
_broadcaster: EnhancedSSEBroadcaster | None = None
_broadcaster_lock = threading.Lock()


def get_sse_broadcaster() -> EnhancedSSEBroadcaster:
    """Get the global SSE broadcaster instance (singleton pattern)."""
    global _broadcaster

    if _broadcaster is None:
        with _broadcaster_lock:
            if _broadcaster is None:
                _broadcaster = EnhancedSSEBroadcaster()

    return _broadcaster


async def agent_network_event_stream(session_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE stream for agent network events.

    This function creates an async generator that yields SSE-formatted strings
    for agent network events with proper resource cleanup.

    Args:
        session_id: The session ID to stream events for

    Yields:
        SSE-formatted strings containing agent network events
    """
    logger.info(f"agent_network_event_stream starting for session {session_id}")
    broadcaster = get_sse_broadcaster()
    logger.info(f"Got broadcaster, about to subscribe for session {session_id}")

    async with broadcaster.subscribe(session_id) as queue:
        logger.info(f"Subscribed to session {session_id}, queue size: {queue.maxsize}")
        # Send initial connection event
        connection_event = SSEEvent(
            type="agent_network_connection",
            data={
                "status": "connected",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat(),
            },
        )
        yield connection_event.to_sse_format()

        # Stream events from the queue
        try:
            while True:
                try:
                    # Wait for event with timeout for keepalive
                    event = await queue.get(timeout=30.0)

                    # Handle keepalive dict objects
                    if isinstance(event, dict) and event.get("type") == "keepalive":
                        keepalive = SSEEvent(
                            type="keepalive", data={"timestamp": event["timestamp"]}
                        )
                        yield keepalive.to_sse_format()
                    else:
                        # Regular event string
                        yield event

                except asyncio.CancelledError:
                    logger.info(
                        f"Agent network event stream cancelled for session {session_id}"
                    )
                    break
                except Exception as e:
                    logger.error(f"Error in agent network event stream: {e}")
                    # Send error event
                    error_event = SSEEvent(
                        type="error",
                        data={
                            "message": f"Stream error: {e!s}",
                            "timestamp": datetime.now().isoformat(),
                        },
                    )
                    yield error_event.to_sse_format()
                    break
        finally:
            # Send disconnection event
            try:
                disconnect_event = SSEEvent(
                    type="agent_network_connection",
                    data={
                        "status": "disconnected",
                        "session_id": session_id,
                        "timestamp": datetime.now().isoformat(),
                    },
                )
                yield disconnect_event.to_sse_format()
            except Exception:
                pass  # Don't fail on cleanup


def broadcast_agent_network_update(
    network_event: dict[str, Any], session_id: str
) -> None:
    """Utility function to broadcast agent network updates.

    This function provides a simple interface for broadcasting agent network
    events from anywhere in the application, particularly from callback functions.

    Args:
        network_event: Dictionary containing the network event data
        session_id: Session ID to target specific session
    """
    broadcaster = get_sse_broadcaster()
    # Use asyncio to broadcast without blocking
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Fire-and-forget task for broadcasting
            loop.create_task(  # noqa: RUF006
                broadcaster.broadcast_agent_network_event(network_event, session_id)
            )
        else:
            loop.run_until_complete(
                broadcaster.broadcast_agent_network_event(network_event, session_id)
            )
    except RuntimeError:
        # No event loop, create a task in a new thread
        asyncio.run(
            broadcaster.broadcast_agent_network_event(network_event, session_id)
        )


async def get_agent_network_event_history(limit: int = 50) -> list[dict[str, Any]]:
    """Get recent agent network event history.

    Args:
        limit: Maximum number of events to return

    Returns:
        List of recent agent network events
    """
    broadcaster = get_sse_broadcaster()
    # Return aggregated history from all sessions for the endpoint
    all_events = []

    active_sessions = await broadcaster._session_manager.get_active_sessions()

    for session_id in active_sessions:
        events = await broadcaster.get_event_history(session_id, limit)
        for event in events:
            if event.type in [
                "agent_network_update",
                "agent_network_snapshot",
                "agent_start",
                "agent_complete",
            ]:
                all_events.append(
                    {
                        "type": event.type,
                        "data": event.data,
                        "id": event.id,
                        "sessionId": session_id,
                        "timestamp": event.data.get("timestamp"),
                    }
                )

    # Sort by timestamp and return most recent
    all_events.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)
    return all_events[:limit]
