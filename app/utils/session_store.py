"""In-memory session store for chat transcripts.

Provides a central place to persist research sessions so the frontend can
retrieve historical conversations and resume streaming without losing state.
The store is process-local and intended for development environments; it can
be swapped for a database-backed implementation in the future.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import RLock
from typing import Any


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
class SessionRecord:
    """Persisted record for a research session."""

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

    def to_dict(self, include_messages: bool = True) -> dict[str, Any]:
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
        return data


class SessionStore:
    """Thread-safe in-memory session store."""

    def __init__(self) -> None:
        self._sessions: dict[str, SessionRecord] = {}
        self._lock = RLock()

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
    ) -> SessionRecord:
        """Create the session if missing and update metadata."""
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
                )
                self._sessions[session_id] = record
            else:
                record.updated_at = now
                if status:
                    record.status = status
                if title is not None:
                    record.title = title or record.title
                if user_id is not None:
                    record.user_id = user_id
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
                (m for m in record.messages if (m.metadata or {}).get("kind") == "assistant-progress"),
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
    # Retrieval helpers
    # ------------------------------------------------------------------
    def get_session(self, session_id: str) -> dict[str, Any] | None:
        with self._lock:
            record = self._sessions.get(session_id)
            return record.to_dict(include_messages=True) if record else None

    def list_sessions(self) -> list[dict[str, Any]]:
        with self._lock:
            sessions = [record.to_dict(include_messages=False) for record in self._sessions.values()]
            sessions.sort(key=lambda item: item["updated_at"], reverse=True)
            return sessions

    # ------------------------------------------------------------------
    # SSE integration
    # ------------------------------------------------------------------
    def ingest_event(self, session_id: str, event: dict[str, Any]) -> None:
        """Update session metadata based on SSE events."""
        event_type = event.get("type")
        payload = event.get("data") if isinstance(event.get("data"), dict) else event

        if event_type not in {"research_started", "research_progress", "research_complete", "error"}:
            return

        status = payload.get("status") if isinstance(payload, dict) else None
        overall_progress = payload.get("overall_progress") if isinstance(payload, dict) else None
        current_phase = payload.get("current_phase") if isinstance(payload, dict) else None
        final_report = payload.get("final_report") if isinstance(payload, dict) else None
        error_message = payload.get("error") if isinstance(payload, dict) else payload.get("message")

        if event_type == "error" and not error_message and isinstance(payload, dict):
            error_message = payload.get("data", {}).get("error")

        with self._lock:
            record = self.ensure_session(session_id)
            if status:
                record.status = status
            if overall_progress is not None:
                try:
                    progress_value = float(overall_progress)
                    record.progress = progress_value if progress_value <= 1 else progress_value / 100
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
    def _format_progress_content(payload: dict[str, Any] | None, record: SessionRecord) -> str:
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
                lines.append(f"Progress: {int(max(0, min(100, round(progress_value))))}%")
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

__all__ = ["session_store", "SessionStore", "SessionRecord", "StoredMessage"]
