"""
VANA Coordination Manager - AGOR-Inspired State Management

This module implements AGOR-style coordination patterns with VANA enhancements:
- Shared coordination files for agent communication
- Session state synchronization with Google ADK
- Agent memory management and persistence
- Task progress tracking and handoff coordination
- Real-time agent status monitoring

Directory Structure (AGOR-inspired):
.vana/
├── agent_conversation.md     # Shared communication log
├── session_memory.md         # Project-level decisions and context
├── agent_memories/           # Individual agent memory files
│   ├── architecture_memory.md
│   ├── ui_memory.md
│   └── ...
├── strategy_active.md        # Current strategy details
├── coordination_state.json   # Real-time coordination state
└── task_progress.json        # Task progress and handoff tracking
"""

import json
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class AgentStatus:
    """Agent status tracking"""

    agent_id: str
    status: str  # "idle", "working", "waiting", "complete", "error"
    current_task: Optional[str] = None
    last_update: Optional[str] = None
    confidence_score: Optional[float] = None
    estimated_completion: Optional[str] = None


@dataclass
class TaskProgress:
    """Task progress tracking"""

    task_id: str
    description: str
    assigned_agents: List[str]
    status: str  # "pending", "in_progress", "review", "complete"
    created_at: str
    updated_at: str
    dependencies: List[str] = None
    results: Dict[str, Any] = None


class CoordinationManager:
    """
    AGOR-inspired coordination manager for VANA agents

    Manages:
    - Agent communication and memory
    - Task coordination and handoffs
    - Session state synchronization
    - Progress tracking and monitoring
    """

    def __init__(self, coordination_dir: str = ".vana"):
        self.coordination_dir = Path(coordination_dir)
        self.agent_statuses: Dict[str, AgentStatus] = {}
        self.task_progress: Dict[str, TaskProgress] = {}
        self._ensure_coordination_structure()

    def _ensure_coordination_structure(self):
        """Create AGOR-style coordination directory structure"""
        self.coordination_dir.mkdir(exist_ok=True)
        (self.coordination_dir / "agent_memories").mkdir(exist_ok=True)

        # Initialize coordination files if they don't exist
        files_to_create = [
            "agent_conversation.md",
            "session_memory.md",
            "strategy_active.md",
            "coordination_state.json",
            "task_progress.json",
        ]

        for file_name in files_to_create:
            file_path = self.coordination_dir / file_name
            if not file_path.exists():
                if file_name.endswith(".json"):
                    file_path.write_text("{}")
                else:
                    file_path.write_text(f"# {file_name.replace('_', ' ').title()}\n\n")

    async def log_agent_communication(
        self, agent_id: str, message: str, message_type: str = "info"
    ):
        """Log agent communication to shared conversation file"""
        timestamp = datetime.now().isoformat()
        log_entry = f"\n## {timestamp} - {agent_id} ({message_type})\n{message}\n"

        conversation_file = self.coordination_dir / "agent_conversation.md"
        with open(conversation_file, "a", encoding="utf-8") as f:
            f.write(log_entry)

    async def update_agent_memory(
        self, agent_id: str, memory_content: str, append: bool = True
    ):
        """Update individual agent memory file"""
        memory_file = self.coordination_dir / "agent_memories" / f"{agent_id}_memory.md"

        if append and memory_file.exists():
            timestamp = datetime.now().isoformat()
            memory_entry = f"\n## {timestamp}\n{memory_content}\n"
            with open(memory_file, "a", encoding="utf-8") as f:
                f.write(memory_entry)
        else:
            with open(memory_file, "w", encoding="utf-8") as f:
                f.write(f"# {agent_id} Memory\n\n{memory_content}\n")

    async def update_session_memory(
        self, key: str, value: Any, category: str = "general"
    ):
        """Update project-level session memory"""
        session_file = self.coordination_dir / "session_memory.md"
        timestamp = datetime.now().isoformat()

        memory_entry = f"\n## {category.title()} - {timestamp}\n**{key}**: {value}\n"

        with open(session_file, "a", encoding="utf-8") as f:
            f.write(memory_entry)

    async def update_agent_status(
        self,
        agent_id: str,
        status: str,
        task: str = None,
        confidence: float = None,
        estimated_completion: str = None,
    ):
        """Update agent status with real-time tracking"""
        self.agent_statuses[agent_id] = AgentStatus(
            agent_id=agent_id,
            status=status,
            current_task=task,
            last_update=datetime.now().isoformat(),
            confidence_score=confidence,
            estimated_completion=estimated_completion,
        )

        # Save to coordination state file
        await self._save_coordination_state()

        # Log status change
        await self.log_agent_communication(
            agent_id,
            f"Status updated: {status}" + (f" (Task: {task})" if task else ""),
            "status",
        )

    async def create_task(
        self,
        task_id: str,
        description: str,
        assigned_agents: List[str],
        dependencies: List[str] = None,
    ) -> TaskProgress:
        """Create new task with progress tracking"""
        task = TaskProgress(
            task_id=task_id,
            description=description,
            assigned_agents=assigned_agents,
            status="pending",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            dependencies=dependencies or [],
            results={},
        )

        self.task_progress[task_id] = task
        await self._save_task_progress()

        # Log task creation
        await self.log_agent_communication(
            "system",
            f"Task created: {task_id} - {description}\nAssigned to: {', '.join(assigned_agents)}",
            "task",
        )

        return task

    async def update_task_progress(
        self, task_id: str, status: str, results: Dict[str, Any] = None
    ):
        """Update task progress and results"""
        if task_id in self.task_progress:
            task = self.task_progress[task_id]
            task.status = status
            task.updated_at = datetime.now().isoformat()

            if results:
                task.results.update(results)

            await self._save_task_progress()

            # Log progress update
            await self.log_agent_communication(
                "system", f"Task {task_id} status updated: {status}", "progress"
            )

    async def get_agent_coordination_context(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive coordination context for an agent"""
        context = {
            "agent_status": self.agent_statuses.get(agent_id),
            "all_agent_statuses": self.agent_statuses,
            "active_tasks": [
                task
                for task in self.task_progress.values()
                if agent_id in task.assigned_agents
            ],
            "recent_communications": await self._get_recent_communications(limit=10),
            "session_memory": await self._get_session_memory_summary(),
            "agent_memory": await self._get_agent_memory(agent_id),
        }
        return context

    async def _save_coordination_state(self):
        """Save current coordination state to JSON file"""
        state = {
            "agent_statuses": {k: asdict(v) for k, v in self.agent_statuses.items()},
            "last_updated": datetime.now().isoformat(),
        }

        state_file = self.coordination_dir / "coordination_state.json"
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, indent=2)

    async def _save_task_progress(self):
        """Save task progress to JSON file"""
        progress = {
            "tasks": {k: asdict(v) for k, v in self.task_progress.items()},
            "last_updated": datetime.now().isoformat(),
        }

        progress_file = self.coordination_dir / "task_progress.json"
        with open(progress_file, "w", encoding="utf-8") as f:
            json.dump(progress, f, indent=2)

    async def _get_recent_communications(self, limit: int = 10) -> List[str]:
        """Get recent agent communications"""
        conversation_file = self.coordination_dir / "agent_conversation.md"
        if not conversation_file.exists():
            return []

        with open(conversation_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Simple parsing - get last N entries
        entries = content.split("\n## ")[-limit:]
        return entries

    async def _get_session_memory_summary(self) -> str:
        """Get session memory summary"""
        session_file = self.coordination_dir / "session_memory.md"
        if not session_file.exists():
            return ""

        with open(session_file, "r", encoding="utf-8") as f:
            return f.read()

    async def _get_agent_memory(self, agent_id: str) -> str:
        """Get specific agent memory"""
        memory_file = self.coordination_dir / "agent_memories" / f"{agent_id}_memory.md"
        if not memory_file.exists():
            return ""

        with open(memory_file, "r", encoding="utf-8") as f:
            return f.read()
