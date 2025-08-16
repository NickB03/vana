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

"""Agent Progress Tracking Module.

Provides utilities for tracking and broadcasting agent progress updates
through the SSE system for real-time visualization in the frontend.
"""

import logging
from datetime import datetime

from app.utils.sse_broadcaster import get_sse_broadcaster

logger = logging.getLogger(__name__)


class AgentProgressTracker:
    """Track and broadcast agent progress updates.
    
    This class provides a simple interface for agents to report their progress
    during long-running operations, enabling real-time updates in the UI.
    """

    def __init__(self, session_id: str, agent_name: str):
        """Initialize progress tracker.
        
        Args:
            session_id: The session ID for SSE broadcasting
            agent_name: The name of the agent being tracked
        """
        self.session_id = session_id
        self.agent_name = agent_name
        self.start_time = datetime.now()
        self.steps_completed = 0
        self.total_steps = 0
        self.current_step_name = ""
        self.substeps: list[dict[str, any]] = []

    async def update_progress(self,
                              current_step: int,
                              total_steps: int,
                              message: str = None,
                              step_name: str = None,
                              metadata: dict = None):
        """Send progress update via SSE.
        
        Args:
            current_step: Current step number
            total_steps: Total number of steps
            message: Optional progress message
            step_name: Optional name of current step
            metadata: Optional additional metadata
        """
        self.steps_completed = current_step
        self.total_steps = total_steps
        if step_name:
            self.current_step_name = step_name

        progress_percent = (current_step / total_steps * 100) if total_steps > 0 else 0
        elapsed = (datetime.now() - self.start_time).total_seconds()

        # Estimate remaining time based on progress
        estimated_total = (elapsed / progress_percent * 100) if progress_percent > 0 else 0
        estimated_remaining = max(0, estimated_total - elapsed)

        event = {
            "type": "agent_progress",
            "data": {
                "agentName": self.agent_name,
                "progress": round(progress_percent, 1),
                "currentStep": current_step,
                "totalSteps": total_steps,
                "stepName": step_name or self.current_step_name,
                "message": message,
                "elapsedTime": round(elapsed, 1),
                "estimatedRemaining": round(estimated_remaining, 1),
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata or {}
            }
        }

        # Broadcast the progress event
        broadcaster = get_sse_broadcaster()
        await broadcaster.broadcast_event(self.session_id, event)

    async def add_substep(self, name: str, status: str = "pending", details: str = None):
        """Add a substep to the current step.
        
        Args:
            name: Name of the substep
            status: Status of the substep (pending, active, complete, error)
            details: Optional details about the substep
        """
        substep = {
            "name": name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.substeps.append(substep)

        # Broadcast substep update
        event = {
            "type": "agent_substep",
            "data": {
                "agentName": self.agent_name,
                "currentStep": self.current_step_name,
                "substep": substep,
                "allSubsteps": self.substeps[-10:],  # Last 10 substeps
                "timestamp": datetime.now().isoformat()
            }
        }

        broadcaster = get_sse_broadcaster()
        await broadcaster.broadcast_event(self.session_id, event)

    async def complete(self, success: bool = True, message: str = None):
        """Mark the entire process as complete.
        
        Args:
            success: Whether the process completed successfully
            message: Optional completion message
        """
        elapsed = (datetime.now() - self.start_time).total_seconds()

        event = {
            "type": "agent_progress_complete",
            "data": {
                "agentName": self.agent_name,
                "success": success,
                "message": message,
                "totalSteps": self.total_steps,
                "stepsCompleted": self.steps_completed,
                "totalTime": round(elapsed, 1),
                "timestamp": datetime.now().isoformat()
            }
        }

        broadcaster = get_sse_broadcaster()
        await broadcaster.broadcast_event(self.session_id, event)


def create_progress_tracker(session_id: str, agent_name: str) -> AgentProgressTracker:
    """Factory function to create a progress tracker.
    
    Args:
        session_id: The session ID for SSE broadcasting
        agent_name: The name of the agent being tracked
        
    Returns:
        AgentProgressTracker instance
    """
    return AgentProgressTracker(session_id, agent_name)


async def broadcast_agent_thinking(session_id: str,
                                   agent_name: str,
                                   thinking_step: str,
                                   status: str = "active"):
    """Broadcast a thinking/reasoning step for an agent.
    
    This is a simplified function for quick thinking updates without
    full progress tracking.
    
    Args:
        session_id: The session ID for SSE broadcasting
        agent_name: The name of the agent
        thinking_step: Description of what the agent is thinking about
        status: Status of the thinking (active, complete)
    """
    event = {
        "type": "thinking_update",
        "data": {
            "stepId": f"thinking_{agent_name}_{datetime.now().timestamp()}",
            "agent": agent_name,
            "action": thinking_step,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
    }

    broadcaster = get_sse_broadcaster()
    await broadcaster.broadcast_event(session_id, event)
