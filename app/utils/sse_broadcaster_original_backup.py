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
from typing import Any, Dict, List, Optional, AsyncGenerator, Set
from dataclasses import dataclass
from datetime import datetime
import asyncio
from collections import defaultdict

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


class EnhancedSSEBroadcaster:
    """Enhanced SSE broadcaster with session-aware routing and improved performance."""
    
    def __init__(self):
        # Session-specific subscriber queues
        self._subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)
        self._lock = threading.Lock()
        # Session-specific event history
        self._event_history: Dict[str, List[SSEEvent]] = defaultdict(list)
        self._max_history = 100
        # Active sessions tracking
        self._active_sessions: Set[str] = set()
    
    async def add_subscriber(self, session_id: str) -> asyncio.Queue:
        """Add a new SSE subscriber for a session and return the queue."""
        queue = asyncio.Queue(maxsize=50)
        
        with self._lock:
            self._subscribers[session_id].append(queue)
            self._active_sessions.add(session_id)
            
            # Send recent history to new subscriber
            history = self._event_history[session_id][-10:] if session_id in self._event_history else []
            
        # Send history asynchronously
        for event in history:
            try:
                await queue.put(event.to_sse_format())
            except asyncio.QueueFull:
                break
                
        logger.info(f"New SSE subscriber for session {session_id}, total: {len(self._subscribers[session_id])}")
        return queue
    
    async def remove_subscriber(self, session_id: str, queue: asyncio.Queue) -> None:
        """Remove an SSE subscriber."""
        with self._lock:
            if session_id in self._subscribers:
                try:
                    self._subscribers[session_id].remove(queue)
                    if not self._subscribers[session_id]:
                        del self._subscribers[session_id]
                        # Clean up session if no more subscribers
                        if session_id in self._active_sessions:
                            self._active_sessions.remove(session_id)
                    logger.info(f"SSE subscriber removed for session {session_id}, remaining: {len(self._subscribers.get(session_id, []))}")
                except ValueError:
                    pass  # Queue wasn't in the list
    
    async def broadcast_event(self, session_id: str, event_data: dict) -> None:
        """Broadcast event to all subscribers of a session."""
        # Add timestamp if not present
        if 'timestamp' not in event_data:
            event_data['timestamp'] = datetime.now().isoformat()
        
        # Create SSE event
        event = SSEEvent(
            type=event_data.get('type', 'agent_update'),
            data=event_data.get('data', event_data),
            id=f"{event_data.get('type', 'event')}_{datetime.now().timestamp()}"
        )
        
        # Store in session history
        with self._lock:
            self._event_history[session_id].append(event)
            if len(self._event_history[session_id]) > self._max_history:
                self._event_history[session_id].pop(0)
            
            # Get subscribers for this session
            subscribers = list(self._subscribers.get(session_id, []))
        
        # Broadcast to subscribers (outside lock to avoid blocking)
        if subscribers:
            dead_queues = []
            event_str = event.to_sse_format()
            
            for queue in subscribers:
                try:
                    # Non-blocking put with timeout
                    await asyncio.wait_for(
                        queue.put(event_str),
                        timeout=1.0
                    )
                except (asyncio.TimeoutError, asyncio.QueueFull):
                    dead_queues.append(queue)
                    logger.warning(f"SSE queue full/timeout for session {session_id}")
                except Exception as e:
                    logger.error(f"Error broadcasting to queue: {e}")
                    dead_queues.append(queue)
            
            # Clean up dead queues
            for queue in dead_queues:
                await self.remove_subscriber(session_id, queue)
    
    async def broadcast_agent_network_event(self, network_event: Dict[str, Any], session_id: str) -> None:
        """Broadcast an agent network update event."""
        event_type = network_event.get("type", "agent_network_update")
        event_data = network_event.get("data", {})
        
        sse_event = SSEEvent(
            type=event_type,
            data=event_data,
            id=f"{event_type}_{datetime.now().timestamp()}"
        )
        
        await self.broadcast_event(session_id, network_event)
        logger.debug(f"Broadcasted {event_type} for agent {event_data.get('agentName', event_data.get('agent_name', 'unknown'))}")
    
    def get_event_history(self, session_id: str, limit: int = 50) -> List[SSEEvent]:
        """Get recent event history for a session."""
        with self._lock:
            if session_id in self._event_history:
                return self._event_history[session_id][-limit:]
            return []
    
    async def clear_session(self, session_id: str) -> None:
        """Clear all subscribers and history for a session."""
        with self._lock:
            # Clear subscribers
            if session_id in self._subscribers:
                del self._subscribers[session_id]
            
            # Clear history
            if session_id in self._event_history:
                del self._event_history[session_id]
            
            # Remove from active sessions
            if session_id in self._active_sessions:
                self._active_sessions.remove(session_id)
            
            logger.info(f"Cleared SSE data for session {session_id}")
    
    def get_stats(self) -> dict:
        """Get broadcaster statistics."""
        with self._lock:
            return {
                "totalSessions": len(self._active_sessions),
                "totalSubscribers": sum(len(queues) for queues in self._subscribers.values()),
                "sessionStats": {
                    session_id: {
                        "subscribers": len(self._subscribers.get(session_id, [])),
                        "historySize": len(self._event_history.get(session_id, []))
                    }
                    for session_id in self._active_sessions
                }
            }


# Global broadcaster instance
_broadcaster = EnhancedSSEBroadcaster()


def get_sse_broadcaster() -> EnhancedSSEBroadcaster:
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
    
    try:
        queue = await broadcaster.add_subscriber(session_id)
        
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
        await broadcaster.remove_subscriber(session_id, queue)
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


def broadcast_agent_network_update(network_event: Dict[str, Any], session_id: str) -> None:
    """Utility function to broadcast agent network updates.
    
    This function provides a simple interface for broadcasting agent network
    events from anywhere in the application, particularly from callback functions.
    
    Args:
        network_event: Dictionary containing the network event data
        session_id: Optional session ID to target specific session
    """
    broadcaster = get_sse_broadcaster()
    # Use asyncio to broadcast without blocking
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(broadcaster.broadcast_agent_network_event(network_event, session_id))
        else:
            loop.run_until_complete(broadcaster.broadcast_agent_network_event(network_event, session_id))
    except RuntimeError:
        # No event loop, create a task in a new thread
        asyncio.run(broadcaster.broadcast_agent_network_event(network_event, session_id))


def get_agent_network_event_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Get recent agent network event history.
    
    Args:
        limit: Maximum number of events to return
        
    Returns:
        List of recent agent network events
    """
    broadcaster = get_sse_broadcaster()
    # Return aggregated history from all sessions for the endpoint
    all_events = []
    
    with broadcaster._lock:
        for session_id in broadcaster._active_sessions:
            events = broadcaster.get_event_history(session_id, limit)
            for event in events:
                if event.type in ["agent_network_update", "agent_network_snapshot", "agent_start", "agent_complete"]:
                    all_events.append({
                        "type": event.type,
                        "data": event.data,
                        "id": event.id,
                        "sessionId": session_id,
                        "timestamp": event.data.get("timestamp")
                    })
    
    # Sort by timestamp and return most recent
    all_events.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return all_events[:limit]