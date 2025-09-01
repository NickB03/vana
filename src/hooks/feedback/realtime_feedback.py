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

"""
Real-time feedback system for hook validation results.

This module provides immediate feedback to Claude Code about validation
results, enabling real-time decision making and user notification.
"""

import asyncio
import json
import logging
import threading
from collections import deque
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any

import websockets
from websockets.legacy.server import WebSocketServer, WebSocketServerProtocol, serve

from ..config.hook_config import FeedbackConfig

logger = logging.getLogger(__name__)


@dataclass
class FeedbackEvent:
    """Represents a feedback event."""

    event_type: str
    timestamp: datetime
    session_id: str | None
    agent_id: str | None
    tool_type: str
    validation_result: str
    security_score: float
    execution_time: float
    issues: list[str]
    warnings: list[str]
    recommendations: list[str]
    metadata: dict[str, Any]


class RealtimeFeedback:
    """
    Real-time feedback system for validation results.

    Features:
    - WebSocket-based real-time updates
    - Event buffering and replay
    - Multiple client support
    - Integration with SSE broadcaster
    - Metrics collection and reporting
    """

    def __init__(self, config: FeedbackConfig | None = None) -> None:
        """Initialize the real-time feedback system."""
        self.config = config or FeedbackConfig()
        self.is_enabled = self.config.enabled

        # WebSocket server components
        self.websocket_server: WebSocketServer | None = None
        self.connected_clients: set[WebSocketServerProtocol] = set()

        # Event management
        self.event_buffer: deque[FeedbackEvent] = deque(maxlen=self.config.buffer_size)
        self.event_subscribers: list[Callable[[FeedbackEvent], Any]] = []

        # Metrics
        self.metrics: dict[str, Any] = {
            "events_sent": 0,
            "clients_connected": 0,
            "errors": 0,
            "uptime_start": datetime.now(),
        }

        # Threading
        self._lock = threading.RLock()
        self._websocket_task: asyncio.Task[Any] | None = None

        # SSE integration (if available)
        self.sse_broadcaster: Callable[[dict[str, Any], str], None] | None = None
        try:
            from app.utils.sse_broadcaster import broadcast_agent_network_update

            self.sse_broadcaster = broadcast_agent_network_update
        except ImportError:
            logger.info("SSE broadcaster not available - WebSocket only mode")

        logger.info(
            "Real-time feedback system initialized (enabled: %s)", self.is_enabled
        )

    async def start(self) -> None:
        """Start the feedback system."""
        if not self.is_enabled:
            logger.info("Feedback system disabled")
            return

        try:
            # Start WebSocket server
            await self._start_websocket_server()
            logger.info(
                "Feedback system started on port %d", self.config.websocket_port
            )

        except Exception as e:
            logger.error("Failed to start feedback system: %s", str(e))
            raise

    async def stop(self) -> None:
        """Stop the feedback system."""
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        logger.info("Feedback system stopped")

    async def send_validation_update(self, validation_report: Any) -> None:
        """Send validation update to all connected clients."""
        if not self.is_enabled:
            return

        try:
            # Create feedback event
            event = FeedbackEvent(
                event_type="validation_result",
                timestamp=datetime.now(),
                session_id=validation_report.tool_call.session_id,
                agent_id=validation_report.tool_call.agent_id,
                tool_type=validation_report.tool_call.tool_type.value,
                validation_result=validation_report.validation_result.value,
                security_score=validation_report.security_score,
                execution_time=validation_report.execution_time,
                issues=validation_report.errors,
                warnings=validation_report.warnings,
                recommendations=validation_report.recommendations,
                metadata=validation_report.tool_call.metadata,
            )

            # Add to buffer
            with self._lock:
                self.event_buffer.append(event)
                events_sent = self.metrics.get("events_sent", 0)
                if isinstance(events_sent, int):
                    self.metrics["events_sent"] = events_sent + 1

            # Send to WebSocket clients
            await self._broadcast_to_websockets(event)

            # Send to SSE clients
            await self._broadcast_to_sse(event)

            # Notify event subscribers
            await self._notify_subscribers(event)

        except Exception as e:
            logger.error("Error sending validation update: %s", str(e))
            with self._lock:
                errors = self.metrics.get("errors", 0)
                if isinstance(errors, int):
                    self.metrics["errors"] = errors + 1

    async def send_system_update(self, update_type: str, data: dict[str, Any]) -> None:
        """Send system-level update."""
        if not self.is_enabled:
            return

        try:
            event = FeedbackEvent(
                event_type=update_type,
                timestamp=datetime.now(),
                session_id=data.get("session_id"),
                agent_id=data.get("agent_id"),
                tool_type="system",
                validation_result="info",
                security_score=1.0,
                execution_time=0.0,
                issues=[],
                warnings=[],
                recommendations=[],
                metadata=data,
            )

            await self._broadcast_to_websockets(event)
            await self._broadcast_to_sse(event)

        except Exception as e:
            logger.error("Error sending system update: %s", str(e))

    async def _start_websocket_server(self) -> None:
        """Start the WebSocket server."""
        try:
            self.websocket_server = await serve(
                self._handle_websocket_client,
                "localhost",
                self.config.websocket_port,
                ping_interval=30,
                ping_timeout=10,
            )

        except Exception as e:
            logger.error("Failed to start WebSocket server: %s", str(e))
            raise

    async def _handle_websocket_client(
        self, websocket: WebSocketServerProtocol
    ) -> None:
        """Handle a new WebSocket client connection."""
        peer = websocket.remote_address or ("unknown", 0)
        client_id = f"{peer[0]}:{peer[1]}"
        logger.info("WebSocket client connected: %s", client_id)

        with self._lock:
            self.connected_clients.add(websocket)
            self.metrics["clients_connected"] = len(self.connected_clients)

        try:
            # Send connection acknowledgment
            await websocket.send(
                json.dumps(
                    {
                        "type": "connection_ack",
                        "timestamp": datetime.now().isoformat(),
                        "client_id": client_id,
                        "buffer_size": len(self.event_buffer),
                    }
                )
            )

            # Send recent events from buffer
            await self._send_buffered_events(websocket)

            # Keep connection alive and handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON from client %s: %s", client_id, message
                    )
                except Exception as e:
                    logger.error(
                        "Error handling message from %s: %s", client_id, str(e)
                    )

        except websockets.exceptions.ConnectionClosed:
            logger.info("WebSocket client disconnected: %s", client_id)
        except Exception as e:
            logger.error("WebSocket client error %s: %s", client_id, str(e))
        finally:
            with self._lock:
                self.connected_clients.discard(websocket)
                self.metrics["clients_connected"] = len(self.connected_clients)

    async def _handle_client_message(
        self, websocket: WebSocketServerProtocol, data: dict[str, Any]
    ) -> None:
        """Handle incoming message from WebSocket client."""
        message_type = data.get("type")

        if message_type == "subscribe":
            # Client requesting specific event types
            event_types = data.get("event_types", [])
            # Store subscription preferences (could be enhanced)
            await websocket.send(
                json.dumps(
                    {"type": "subscription_ack", "subscribed_events": event_types}
                )
            )

        elif message_type == "get_metrics":
            # Client requesting current metrics
            metrics = await self.get_status()
            await websocket.send(json.dumps({"type": "metrics", "data": metrics}))

        elif message_type == "ping":
            # Simple ping/pong
            await websocket.send(json.dumps({"type": "pong"}))

        else:
            logger.warning("Unknown message type from client: %s", message_type)

    async def _send_buffered_events(self, websocket: WebSocketServerProtocol) -> None:
        """Send buffered events to a newly connected client."""
        try:
            with self._lock:
                events = list(self.event_buffer)

            if events:
                for event in events:
                    event_data: dict[str, Any] = {
                        "type": "buffered_event",
                        "event": asdict(event),
                    }
                    # Convert datetime to ISO string
                    event_dict = event_data["event"]
                    if isinstance(event_dict, dict):
                        event_dict["timestamp"] = event.timestamp.isoformat()

                    await websocket.send(json.dumps(event_data))

        except Exception as e:
            logger.error("Error sending buffered events: %s", str(e))

    async def _broadcast_to_websockets(self, event: FeedbackEvent) -> None:
        """Broadcast event to all WebSocket clients."""
        if not self.connected_clients:
            return

        event_data: dict[str, Any] = {
            "type": "validation_event",
            "event": asdict(event),
        }
        # Convert datetime to ISO string
        event_dict = event_data["event"]
        if isinstance(event_dict, dict):
            event_dict["timestamp"] = event.timestamp.isoformat()

        message = json.dumps(event_data)

        # Send to all connected clients
        disconnected_clients = set()

        for client in self.connected_clients.copy():
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                logger.error("Error sending to WebSocket client: %s", str(e))
                disconnected_clients.add(client)

        # Remove disconnected clients
        if disconnected_clients:
            with self._lock:
                self.connected_clients -= disconnected_clients
                self.metrics["clients_connected"] = len(self.connected_clients)

    async def _broadcast_to_sse(self, event: FeedbackEvent) -> None:
        """Broadcast event to SSE clients."""
        if self.sse_broadcaster is None:
            return

        try:
            # Convert event to SSE-compatible format
            sse_data = {
                "type": "hook_validation",
                "timestamp": event.timestamp.isoformat(),
                "validation_result": event.validation_result,
                "tool_type": event.tool_type,
                "security_score": event.security_score,
                "execution_time": event.execution_time,
                "session_id": event.session_id,
                "agent_id": event.agent_id,
                "summary": {
                    "issues_count": len(event.issues),
                    "warnings_count": len(event.warnings),
                    "recommendations_count": len(event.recommendations),
                },
            }

            # Send via SSE broadcaster
            session_id = event.session_id or "default"
            if asyncio.iscoroutinefunction(self.sse_broadcaster):
                await self.sse_broadcaster(sse_data, session_id)
            else:
                self.sse_broadcaster(sse_data, session_id)

        except Exception as e:
            logger.error("Error broadcasting to SSE: %s", str(e))

    async def _notify_subscribers(self, event: FeedbackEvent) -> None:
        """Notify event subscribers."""
        for subscriber in self.event_subscribers:
            try:
                if asyncio.iscoroutinefunction(subscriber):
                    await subscriber(event)
                else:
                    subscriber(event)
            except Exception as e:
                logger.error("Error notifying subscriber: %s", str(e))

    def subscribe_to_events(self, callback: Callable[[FeedbackEvent], Any]) -> None:
        """Subscribe to validation events."""
        self.event_subscribers.append(callback)
        logger.info("Event subscriber added: %s", callback.__name__)

    def unsubscribe_from_events(self, callback: Callable[[FeedbackEvent], Any]) -> None:
        """Unsubscribe from validation events."""
        if callback in self.event_subscribers:
            self.event_subscribers.remove(callback)
            logger.info("Event subscriber removed: %s", callback.__name__)

    async def get_status(self) -> dict[str, Any]:
        """Get current feedback system status."""
        with self._lock:
            uptime_start = self.metrics.get("uptime_start")
            if isinstance(uptime_start, datetime):
                uptime = (datetime.now() - uptime_start).total_seconds()
            else:
                uptime = 0.0

            return {
                "enabled": self.is_enabled,
                "websocket_server_running": self.websocket_server is not None,
                "connected_clients": self.metrics["clients_connected"],
                "events_sent": self.metrics["events_sent"],
                "errors": self.metrics["errors"],
                "uptime_seconds": uptime,
                "buffer_size": len(self.event_buffer),
                "buffer_capacity": self.config.buffer_size,
                "sse_available": self.sse_broadcaster is not None,
            }

    def get_recent_events(self, count: int = 10) -> list[dict[str, Any]]:
        """Get recent events from buffer."""
        with self._lock:
            recent_events = list(self.event_buffer)[-count:]

        return [
            {**asdict(event), "timestamp": event.timestamp.isoformat()}
            for event in recent_events
        ]

    async def clear_buffer(self) -> None:
        """Clear the event buffer."""
        with self._lock:
            self.event_buffer.clear()
        logger.info("Event buffer cleared")

    @asynccontextmanager
    async def temporary_disable(self) -> AsyncIterator[None]:
        """Temporarily disable the feedback system."""
        original_enabled = self.is_enabled
        self.is_enabled = False
        try:
            yield
        finally:
            self.is_enabled = original_enabled

    async def send_metrics_update(self) -> None:
        """Send periodic metrics update."""
        if not self.is_enabled:
            return

        try:
            status = await self.get_status()
            await self.send_system_update("metrics_update", status)

        except Exception as e:
            logger.error("Error sending metrics update: %s", str(e))

    def enable(self) -> None:
        """Enable the feedback system."""
        self.is_enabled = True
        logger.info("Feedback system enabled")

    def disable(self) -> None:
        """Disable the feedback system."""
        self.is_enabled = False
        logger.info("Feedback system disabled")


# Global feedback instance
_global_feedback: RealtimeFeedback | None = None


def get_feedback_system(config: FeedbackConfig | None = None) -> RealtimeFeedback:
    """Get or create the global feedback system instance."""
    global _global_feedback

    if _global_feedback is None:
        _global_feedback = RealtimeFeedback(config)

    return _global_feedback


def reset_feedback_system() -> None:
    """Reset the global feedback system instance (for testing)."""
    global _global_feedback
    _global_feedback = None
