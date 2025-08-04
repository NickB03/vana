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

"""SSE Event Broadcasting System for Agent Network Updates.

This module provides utilities to broadcast agent network events through the
existing ADK SSE system. It allows injecting custom events into the SSE stream
while maintaining compatibility with the standard ADK event format.
"""

import json
import logging
import threading
from typing import Any, Dict, List, Optional, AsyncGenerator
from dataclasses import dataclass
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class SSEEvent:
    """Represents a Server-Sent Event."""
    type: str
    data: Dict[str, Any]
    id: Optional[str] = None
    retry: Optional[int] = None
    
    def to_sse_format(self) -> str:
        """Convert to SSE format string."""
        lines = []
        
        if self.id:
            lines.append(f"id: {self.id}")
        
        if self.retry:
            lines.append(f"retry: {self.retry}")
        
        lines.append(f"event: {self.type}")
        lines.append(f"data: {json.dumps(self.data)}")
        lines.append("")  # Empty line to end event
        
        return "\n".join(lines)


class SSEBroadcaster:
    """Manages SSE event broadcasting for agent network updates."""
    
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._lock = threading.Lock()
        self._event_history: List[SSEEvent] = []
        self._max_history = 100
    
    def subscribe(self, session_id: str, queue: asyncio.Queue) -> None:
        """Subscribe a queue to receive SSE events for a session."""
        with self._lock:
            if session_id not in self._subscribers:
                self._subscribers[session_id] = []
            self._subscribers[session_id].append(queue)
            logger.info(f"New SSE subscriber for session {session_id}")
    
    def unsubscribe(self, session_id: str, queue: asyncio.Queue) -> None:
        """Unsubscribe a queue from SSE events."""
        with self._lock:
            if session_id in self._subscribers:
                try:
                    self._subscribers[session_id].remove(queue)
                    if not self._subscribers[session_id]:
                        del self._subscribers[session_id]
                    logger.info(f"SSE subscriber removed for session {session_id}")
                except ValueError:
                    pass  # Queue wasn't in the list
    
    def broadcast_event(self, event: SSEEvent, session_id: Optional[str] = None) -> None:
        """Broadcast an SSE event to subscribers."""
        # Store in history
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history.pop(0)
        
        with self._lock:
            if session_id:
                # Broadcast to specific session
                subscribers = self._subscribers.get(session_id, [])
            else:
                # Broadcast to all sessions
                subscribers = []
                for session_subscribers in self._subscribers.values():
                    subscribers.extend(session_subscribers)
            
            for queue in subscribers:
                try:
                    # Use put_nowait to avoid blocking
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    logger.warning(f"SSE queue full, dropping event: {event.type}")
                except Exception as e:
                    logger.error(f"Error broadcasting SSE event: {e}")
    
    def broadcast_agent_network_event(self, network_event: Dict[str, Any], session_id: Optional[str] = None) -> None:
        """Broadcast an agent network update event."""
        event_type = network_event.get("type", "agent_network_update")
        event_data = network_event.get("data", {})
        
        sse_event = SSEEvent(
            type=event_type,
            data=event_data,
            id=f"{event_type}_{datetime.now().timestamp()}"
        )
        
        self.broadcast_event(sse_event, session_id)
        logger.debug(f"Broadcasted {event_type} for agent {event_data.get('agent_name', 'unknown')}")
    
    def get_event_history(self, limit: int = 50) -> List[SSEEvent]:
        """Get recent event history."""
        with self._lock:
            return self._event_history[-limit:] if self._event_history else []
    
    def clear_session(self, session_id: str) -> None:
        """Clear all subscribers for a session."""
        with self._lock:
            if session_id in self._subscribers:
                del self._subscribers[session_id]
                logger.info(f"Cleared SSE subscribers for session {session_id}")


# Global broadcaster instance
_broadcaster = SSEBroadcaster()


def get_sse_broadcaster() -> SSEBroadcaster:
    """Get the global SSE broadcaster instance."""
    return _broadcaster


async def agent_network_event_stream(session_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE stream for agent network events.
    
    This function creates an async generator that yields SSE-formatted strings
    for agent network events. It's designed to be used alongside the main ADK
    SSE stream to provide additional agent network visualization data.
    
    Args:
        session_id: The session ID to stream events for
        
    Yields:
        SSE-formatted strings containing agent network events
    """
    broadcaster = get_sse_broadcaster()
    queue: asyncio.Queue = asyncio.Queue(maxsize=100)
    
    try:
        broadcaster.subscribe(session_id, queue)
        
        # Send initial connection event
        connection_event = SSEEvent(
            type="agent_network_connection",
            data={
                "status": "connected",
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            }
        )
        yield connection_event.to_sse_format()
        
        # Stream events from the queue
        while True:
            try:
                # Wait for event with timeout to allow for graceful shutdown
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield event.to_sse_format()
                queue.task_done()
                
            except asyncio.TimeoutError:
                # Send keepalive event
                keepalive = SSEEvent(
                    type="keepalive",
                    data={"timestamp": datetime.now().isoformat()}
                )
                yield keepalive.to_sse_format()
                
            except asyncio.CancelledError:
                logger.info(f"Agent network event stream cancelled for session {session_id}")
                break
            except Exception as e:
                logger.error(f"Error in agent network event stream: {e}")
                # Send error event
                error_event = SSEEvent(
                    type="error",
                    data={
                        "message": f"Stream error: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    }
                )
                yield error_event.to_sse_format()
                break
    
    finally:
        broadcaster.unsubscribe(session_id, queue)
        # Send disconnection event
        try:
            disconnect_event = SSEEvent(
                type="agent_network_connection",
                data={
                    "status": "disconnected",
                    "session_id": session_id,
                    "timestamp": datetime.now().isoformat()
                }
            )
            yield disconnect_event.to_sse_format()
        except Exception:
            pass  # Don't fail on cleanup


def broadcast_agent_network_update(network_event: Dict[str, Any], session_id: Optional[str] = None) -> None:
    """Utility function to broadcast agent network updates.
    
    This function provides a simple interface for broadcasting agent network
    events from anywhere in the application, particularly from callback functions.
    
    Args:
        network_event: Dictionary containing the network event data
        session_id: Optional session ID to target specific session
    """
    broadcaster = get_sse_broadcaster()
    broadcaster.broadcast_agent_network_event(network_event, session_id)


def get_agent_network_event_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent agent network event history.
    
    Args:
        limit: Maximum number of events to return
        
    Returns:
        List of recent agent network events
    """
    broadcaster = get_sse_broadcaster()
    events = broadcaster.get_event_history(limit)
    
    return [
        {
            "type": event.type,
            "data": event.data,
            "id": event.id,
            "timestamp": event.data.get("timestamp")
        }
        for event in events
        if event.type in ["agent_network_update", "agent_network_snapshot"]
    ]