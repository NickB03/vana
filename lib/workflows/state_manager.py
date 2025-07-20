"""
Workflow State Manager for VANA Phase 4

This module implements a state machine pattern for managing complex workflow
executions with persistence, rollback capabilities, and atomic transitions.

Key Features:
- State machine with defined transitions and conditions
- Redis-backed persistence for long-running workflows
- Atomic state transitions with rollback support
- Progress tracking and state history
- Integration with existing workflow managers
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple
from uuid import uuid4

import redis.asyncio as redis
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class WorkflowStatus(str, Enum):
    """Workflow execution status states"""
    INITIAL = "initial"
    PROCESSING = "processing"
    WAITING = "waiting"
    REVIEW = "review"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ROLLED_BACK = "rolled_back"


class StateTransition(BaseModel):
    """Defines a valid state transition with conditions"""
    from_state: WorkflowStatus
    to_state: WorkflowStatus
    condition: Optional[str] = None  # Condition function name
    description: str = ""
    requires_approval: bool = False


class WorkflowCheckpoint(BaseModel):
    """Checkpoint for workflow state recovery"""
    checkpoint_id: str = Field(default_factory=lambda: str(uuid4()))
    state: WorkflowStatus
    context: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class WorkflowState:
    """
    Manages workflow execution state with persistence and transitions.
    
    This class implements a finite state machine pattern for workflows,
    supporting atomic transitions, rollback, and state persistence.
    """
    
    def __init__(
        self,
        workflow_id: str,
        initial_state: WorkflowStatus = WorkflowStatus.INITIAL,
        redis_client: Optional[redis.Redis] = None,
        ttl: int = 86400  # 24 hours default TTL
    ):
        self.workflow_id = workflow_id
        self.current_state = initial_state
        self.redis_client = redis_client
        self.ttl = ttl
        
        # State history for rollback
        self.state_history: List[WorkflowCheckpoint] = []
        
        # Context data for the workflow
        self.context: Dict[str, Any] = {
            "workflow_id": workflow_id,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "metadata": {}
        }
        
        # Valid transitions
        self.transitions: Dict[Tuple[WorkflowStatus, WorkflowStatus], StateTransition] = {}
        self._initialize_transitions()
        
        # Transition conditions
        self.conditions: Dict[str, Callable] = {}
        self._register_default_conditions()
        
        # State entry/exit hooks
        self.entry_hooks: Dict[WorkflowStatus, List[Callable]] = {}
        self.exit_hooks: Dict[WorkflowStatus, List[Callable]] = {}
    
    def _initialize_transitions(self):
        """Initialize default workflow transitions"""
        default_transitions = [
            # Starting workflow
            StateTransition(
                from_state=WorkflowStatus.INITIAL,
                to_state=WorkflowStatus.PROCESSING,
                description="Start workflow processing"
            ),
            
            # Processing paths
            StateTransition(
                from_state=WorkflowStatus.PROCESSING,
                to_state=WorkflowStatus.WAITING,
                description="Pause for external input"
            ),
            StateTransition(
                from_state=WorkflowStatus.PROCESSING,
                to_state=WorkflowStatus.REVIEW,
                condition="needs_review",
                description="Move to review stage"
            ),
            StateTransition(
                from_state=WorkflowStatus.PROCESSING,
                to_state=WorkflowStatus.COMPLETE,
                condition="processing_complete",
                description="Complete processing"
            ),
            StateTransition(
                from_state=WorkflowStatus.PROCESSING,
                to_state=WorkflowStatus.FAILED,
                description="Processing failed"
            ),
            
            # Waiting state transitions
            StateTransition(
                from_state=WorkflowStatus.WAITING,
                to_state=WorkflowStatus.PROCESSING,
                description="Resume processing"
            ),
            StateTransition(
                from_state=WorkflowStatus.WAITING,
                to_state=WorkflowStatus.CANCELLED,
                description="Cancel waiting workflow"
            ),
            
            # Review transitions
            StateTransition(
                from_state=WorkflowStatus.REVIEW,
                to_state=WorkflowStatus.PROCESSING,
                condition="review_rejected",
                description="Return to processing after review"
            ),
            StateTransition(
                from_state=WorkflowStatus.REVIEW,
                to_state=WorkflowStatus.COMPLETE,
                condition="review_approved",
                description="Complete after review approval"
            ),
            
            # Recovery transitions
            StateTransition(
                from_state=WorkflowStatus.FAILED,
                to_state=WorkflowStatus.PROCESSING,
                condition="can_retry",
                description="Retry failed workflow"
            ),
            StateTransition(
                from_state=WorkflowStatus.CANCELLED,
                to_state=WorkflowStatus.INITIAL,
                description="Reset cancelled workflow"
            )
        ]
        
        for transition in default_transitions:
            self.add_transition(transition)
    
    def _register_default_conditions(self):
        """Register default condition functions"""
        self.conditions.update({
            "needs_review": lambda ctx: ctx.get("requires_review", False),
            "processing_complete": lambda ctx: ctx.get("processing_complete", False),
            "review_approved": lambda ctx: ctx.get("review_status") == "approved",
            "review_rejected": lambda ctx: ctx.get("review_status") == "rejected",
            "can_retry": lambda ctx: ctx.get("retry_count", 0) < 3
        })
    
    def add_transition(self, transition: StateTransition):
        """Add a valid state transition"""
        key = (transition.from_state, transition.to_state)
        self.transitions[key] = transition
    
    def register_condition(self, name: str, condition: Callable[[Dict[str, Any]], bool]):
        """Register a condition function for transitions"""
        self.conditions[name] = condition
    
    def add_entry_hook(self, state: WorkflowStatus, hook: Callable):
        """Add a hook to run when entering a state"""
        if state not in self.entry_hooks:
            self.entry_hooks[state] = []
        self.entry_hooks[state].append(hook)
    
    def add_exit_hook(self, state: WorkflowStatus, hook: Callable):
        """Add a hook to run when exiting a state"""
        if state not in self.exit_hooks:
            self.exit_hooks[state] = []
        self.exit_hooks[state].append(hook)
    
    async def can_transition_to(self, to_state: WorkflowStatus) -> bool:
        """Check if transition to target state is valid"""
        key = (self.current_state, to_state)
        if key not in self.transitions:
            return False
        
        transition = self.transitions[key]
        if transition.condition:
            condition_fn = self.conditions.get(transition.condition)
            if condition_fn and not condition_fn(self.context):
                return False
        
        return True
    
    async def get_valid_transitions(self) -> List[WorkflowStatus]:
        """Get list of valid states we can transition to"""
        valid_states = []
        for (from_state, to_state), transition in self.transitions.items():
            if from_state == self.current_state:
                if await self.can_transition_to(to_state):
                    valid_states.append(to_state)
        return valid_states
    
    async def transition_to(self, to_state: WorkflowStatus, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Perform atomic state transition with persistence.
        
        Returns True if transition successful, False otherwise.
        """
        if not await self.can_transition_to(to_state):
            logger.warning(f"Invalid transition from {self.current_state} to {to_state}")
            return False
        
        try:
            # Create checkpoint before transition
            checkpoint = WorkflowCheckpoint(
                state=self.current_state,
                context=self.context.copy(),
                metadata=metadata or {}
            )
            self.state_history.append(checkpoint)
            
            # Run exit hooks for current state
            for hook in self.exit_hooks.get(self.current_state, []):
                await hook(self)
            
            # Update state
            old_state = self.current_state
            self.current_state = to_state
            self.context["updated_at"] = datetime.now().isoformat()
            
            # Add transition to history
            if "transitions" not in self.context:
                self.context["transitions"] = []
            self.context["transitions"].append({
                "from": old_state.value,
                "to": to_state.value,
                "timestamp": datetime.now().isoformat(),
                "metadata": metadata
            })
            
            # Run entry hooks for new state
            for hook in self.entry_hooks.get(to_state, []):
                await hook(self)
            
            # Persist state if Redis available
            await self._persist_state()
            
            logger.info(f"Workflow {self.workflow_id} transitioned from {old_state} to {to_state}")
            return True
            
        except Exception as e:
            logger.error(f"Error during state transition: {e}")
            # Attempt rollback
            await self.rollback()
            return False
    
    async def rollback(self, steps: int = 1) -> bool:
        """
        Rollback to previous state(s).
        
        Args:
            steps: Number of states to rollback (default 1)
        
        Returns:
            True if rollback successful
        """
        if len(self.state_history) < steps:
            logger.warning(f"Cannot rollback {steps} steps, only {len(self.state_history)} available")
            return False
        
        try:
            for _ in range(steps):
                if not self.state_history:
                    break
                
                checkpoint = self.state_history.pop()
                self.current_state = checkpoint.state
                self.context = checkpoint.context.copy()
                self.context["rolled_back_at"] = datetime.now().isoformat()
            
            await self._persist_state()
            logger.info(f"Workflow {self.workflow_id} rolled back {steps} steps to {self.current_state}")
            return True
            
        except Exception as e:
            logger.error(f"Error during rollback: {e}")
            return False
    
    async def _persist_state(self):
        """Persist current state to Redis"""
        if not self.redis_client:
            return
        
        try:
            key = f"workflow:state:{self.workflow_id}"
            data = {
                "workflow_id": self.workflow_id,
                "current_state": self.current_state.value,
                "context": self.context,
                "history": [
                    {
                        "checkpoint_id": cp.checkpoint_id,
                        "state": cp.state.value,
                        "context": cp.context,
                        "timestamp": cp.timestamp.isoformat(),
                        "metadata": cp.metadata
                    }
                    for cp in self.state_history[-10:]  # Keep last 10 checkpoints
                ]
            }
            
            await self.redis_client.setex(
                key,
                self.ttl,
                json.dumps(data)
            )
            
        except Exception as e:
            logger.error(f"Failed to persist workflow state: {e}")
    
    async def load_state(self) -> bool:
        """Load state from Redis"""
        if not self.redis_client:
            return False
        
        try:
            key = f"workflow:state:{self.workflow_id}"
            data = await self.redis_client.get(key)
            
            if not data:
                return False
            
            state_data = json.loads(data)
            self.current_state = WorkflowStatus(state_data["current_state"])
            self.context = state_data["context"]
            
            # Restore history
            self.state_history = []
            for checkpoint_data in state_data.get("history", []):
                checkpoint = WorkflowCheckpoint(
                    checkpoint_id=checkpoint_data["checkpoint_id"],
                    state=WorkflowStatus(checkpoint_data["state"]),
                    context=checkpoint_data["context"],
                    timestamp=datetime.fromisoformat(checkpoint_data["timestamp"]),
                    metadata=checkpoint_data["metadata"]
                )
                self.state_history.append(checkpoint)
            
            logger.info(f"Loaded workflow state for {self.workflow_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to load workflow state: {e}")
            return False
    
    async def get_progress(self) -> Dict[str, Any]:
        """Get workflow progress information"""
        total_transitions = len(self.context.get("transitions", []))
        
        # Calculate progress based on state
        progress_map = {
            WorkflowStatus.INITIAL: 0,
            WorkflowStatus.PROCESSING: 30,
            WorkflowStatus.WAITING: 50,
            WorkflowStatus.REVIEW: 80,
            WorkflowStatus.COMPLETE: 100,
            WorkflowStatus.FAILED: -1,
            WorkflowStatus.CANCELLED: -1,
            WorkflowStatus.ROLLED_BACK: -1
        }
        
        progress = progress_map.get(self.current_state, 0)
        
        return {
            "workflow_id": self.workflow_id,
            "current_state": self.current_state.value,
            "progress_percentage": progress,
            "total_transitions": total_transitions,
            "created_at": self.context.get("created_at"),
            "updated_at": self.context.get("updated_at"),
            "is_complete": self.current_state == WorkflowStatus.COMPLETE,
            "is_failed": self.current_state in [WorkflowStatus.FAILED, WorkflowStatus.CANCELLED],
            "can_retry": self.current_state == WorkflowStatus.FAILED and self.context.get("retry_count", 0) < 3,
            "valid_transitions": await self.get_valid_transitions()
        }
    
    def update_context(self, updates: Dict[str, Any]):
        """Update workflow context data"""
        self.context.update(updates)
        self.context["updated_at"] = datetime.now().isoformat()
    
    def get_state_duration(self) -> Optional[timedelta]:
        """Get duration in current state"""
        if self.state_history:
            last_transition = self.state_history[-1].timestamp
            return datetime.now() - last_transition
        return None