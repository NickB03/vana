"""Long-term memory tools for AI agent personalization.

These tools allow agents to store and retrieve user-specific memories across sessions.
Uses ADK's tool_context parameter for automatic user context injection.
"""

import logging
import re
from datetime import datetime, timedelta, timezone

from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.tool_context import ToolContext
from sqlalchemy import and_, select, update
from sqlalchemy.orm import Session

from app.auth.database import SessionLocal
from app.auth.models import LongTermMemory

logger = logging.getLogger(__name__)

# Constants
MAX_CONTENT_LENGTH = 10000  # Max characters for memory content
MAX_TAGS = 10  # Max tags per memory
DEFAULT_IMPORTANCE = 0.5
MAX_RETRIEVAL_LIMIT = 50

# Input validation patterns
NAMESPACE_PATTERN = re.compile(r'^[a-z_]{3,50}$')
KEY_PATTERN = re.compile(r'^[a-zA-Z0-9_\-\.]{1,255}$')


def store_memory_function(
    namespace: str,
    key: str,
    content: str,
    tags: list[str] | None = None,
    importance: float = DEFAULT_IMPORTANCE,
    ttl_days: int | None = None,
    tool_context: ToolContext | None = None,
) -> str:
    """Store a memory for the current user.

    Args:
        namespace: Category (e.g., 'research', 'preferences', 'facts', 'context')
        key: Unique identifier within namespace
        content: Natural language content to remember
        tags: Optional list of tags for filtering (max 10)
        importance: Relevance score 0.0-1.0 (default 0.5)
        ttl_days: Optional days until expiration
        tool_context: Auto-injected by ADK (contains user_id)

    Returns:
        Success/error message for agent feedback

    Example:
        Store a user preference:
        store_memory_function(
            namespace="preferences",
            key="favorite_topics",
            content="The user loves discussing AI and quantum computing",
            tags=["ai", "quantum", "preference"],
            importance=0.9
        )
    """
    # Extract user context from ADK
    if not tool_context:
        logger.warning("store_memory called without tool_context")
        return "Error: User context not available. Please ensure authentication."

    user_id = tool_context._invocation_context.user_id
    session_id = tool_context._invocation_context.session.id

    if not user_id:
        return "Error: User not authenticated."

    logger.info(
        f"Storing memory: user={user_id}, session={session_id}, "
        f"namespace={namespace}, key={key}"
    )

    # Input validation
    if not NAMESPACE_PATTERN.match(namespace):
        return "Error: Namespace must be lowercase letters and underscores only (3-50 characters)."

    if not KEY_PATTERN.match(key):
        return "Error: Key must be alphanumeric with _-. characters only (1-255 characters)."

    if len(content) > MAX_CONTENT_LENGTH:
        return f"Error: Content too long (max {MAX_CONTENT_LENGTH} characters)."

    if tags and len(tags) > MAX_TAGS:
        return f"Error: Too many tags (max {MAX_TAGS})."

    if not (0.0 <= importance <= 1.0):
        return "Error: Importance must be between 0.0 and 1.0."

    db: Session = SessionLocal()
    try:
        # Calculate expiration if TTL provided
        expires_at = None
        if ttl_days and ttl_days > 0:
            expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)

        # Check for existing memory (upsert pattern)
        stmt = select(LongTermMemory).where(
            and_(
                LongTermMemory.user_id == user_id,
                LongTermMemory.namespace == namespace,
                LongTermMemory.key == key,
                LongTermMemory.is_deleted == False,  # noqa: E712
            )
        )
        existing = db.execute(stmt).scalar_one_or_none()

        if existing:
            # Update existing memory
            existing.content = content
            existing.tags = tags
            existing.importance = importance
            existing.expires_at = expires_at
            existing.updated_at = datetime.now(timezone.utc)
            action = "updated"
        else:
            # Create new memory
            memory = LongTermMemory(
                user_id=user_id,
                namespace=namespace,
                key=key,
                content=content,
                tags=tags,
                importance=importance,
                expires_at=expires_at,
            )
            db.add(memory)
            action = "stored"

        db.commit()

        logger.info(
            f"Memory {action}: user={user_id}, namespace={namespace}, "
            f"key={key}, importance={importance}"
        )

        return f"I've {action} this memory: {key} in {namespace}."

    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to store memory: user={user_id}, namespace={namespace}, "
            f"key={key}, error={e}",
            exc_info=True,
        )
        return f"Error: Could not store memory - {e!s}"
    finally:
        db.close()


def retrieve_memories_function(
    namespace: str | None = None,
    key: str | None = None,
    tags: list[str] | None = None,
    min_importance: float = 0.0,
    limit: int = 10,
    include_content: bool = True,
    tool_context: ToolContext | None = None,
) -> str:
    """Retrieve memories for the current user.

    Args:
        namespace: Filter by category (optional)
        key: Exact key match (optional)
        tags: Filter by tags (matches any tag in list)
        min_importance: Minimum importance score (0.0-1.0)
        limit: Maximum memories to return (1-50, default 10)
        include_content: Include full content or just summaries
        tool_context: Auto-injected by ADK (contains user_id)

    Returns:
        Formatted memory list or error message

    Example:
        Retrieve important research memories:
        retrieve_memories_function(
            namespace="research",
            min_importance=0.7,
            limit=5
        )
    """
    # Extract user context from ADK
    if not tool_context:
        logger.warning("retrieve_memories called without tool_context")
        return "Error: User context not available."

    user_id = tool_context._invocation_context.user_id
    session_id = tool_context._invocation_context.session.id

    if not user_id:
        return "Error: User not authenticated."

    logger.info(
        f"Retrieving memories: user={user_id}, session={session_id}, "
        f"namespace={namespace}, key={key}, tags={tags}"
    )

    # Input validation
    if namespace and not NAMESPACE_PATTERN.match(namespace):
        return "Error: Invalid namespace format (lowercase letters and underscores, 3-50 characters)."

    if key and not KEY_PATTERN.match(key):
        return "Error: Invalid key format (alphanumeric with _-. characters, 1-255 characters)."

    limit = max(1, min(limit, MAX_RETRIEVAL_LIMIT))

    db: Session = SessionLocal()
    try:
        # Build query
        stmt = select(LongTermMemory).where(
            and_(
                LongTermMemory.user_id == user_id,
                LongTermMemory.is_deleted == False,  # noqa: E712
                LongTermMemory.importance >= min_importance,
            )
        )

        # Apply filters
        if namespace:
            stmt = stmt.where(LongTermMemory.namespace == namespace)

        if key:
            stmt = stmt.where(LongTermMemory.key == key)

        if tags:
            # PostgreSQL: Use overlap operator for JSON array
            # SQLite: Filter in Python after fetching
            stmt = stmt.where(LongTermMemory.tags.isnot(None))

        # Order by importance (descending) and update access tracking
        stmt = stmt.order_by(LongTermMemory.importance.desc()).limit(limit)

        memories = db.execute(stmt).scalars().all()

        # Filter by tags (for SQLite compatibility)
        if tags:
            memories = [
                m for m in memories if m.tags and any(tag in m.tags for tag in tags)
            ][:limit]

        # Filter out expired memories
        memories = [m for m in memories if not m.is_expired]

        if not memories:
            logger.info(f"No memories found for user={user_id} with filters")
            return "I don't have any memories matching those criteria."

        # Update access tracking atomically (prevents race conditions)
        now = datetime.now(timezone.utc)
        for memory in memories:
            db.execute(
                update(LongTermMemory)
                .where(LongTermMemory.id == memory.id)
                .values(
                    access_count=LongTermMemory.access_count + 1,
                    last_accessed_at=now
                )
            )
        db.commit()

        # Format response
        lines = [f"I found {len(memories)} relevant memories:\n"]
        for i, mem in enumerate(memories, 1):
            lines.append(
                f"{i}. **{mem.namespace}/{mem.key}** (importance: {mem.importance:.1f})"
            )
            if mem.tags:
                lines.append(f"   Tags: {', '.join(mem.tags)}")
            if include_content:
                content = (
                    mem.content[:200] + "..."
                    if len(mem.content) > 200
                    else mem.content
                )
                lines.append(f"   Content: {content}")
            lines.append("")

        logger.info(f"Retrieved {len(memories)} memories for user={user_id}")
        return "\n".join(lines)

    except Exception as e:
        logger.error(
            f"Failed to retrieve memories: user={user_id}, error={e}", exc_info=True
        )
        return f"Error: Could not retrieve memories - {e!s}"
    finally:
        db.close()


def delete_memory_function(
    namespace: str,
    key: str,
    hard_delete: bool = False,
    tool_context: ToolContext | None = None,
) -> str:
    """Delete a memory for the current user.

    Args:
        namespace: Memory category
        key: Memory identifier
        hard_delete: If True, permanently delete; if False, soft delete (default)
        tool_context: Auto-injected by ADK (contains user_id)

    Returns:
        Success/error message

    Example:
        Soft delete a memory:
        delete_memory_function(
            namespace="research",
            key="outdated_topic"
        )
    """
    # Extract user context from ADK
    if not tool_context:
        logger.warning("delete_memory called without tool_context")
        return "Error: User context not available."

    user_id = tool_context._invocation_context.user_id
    session_id = tool_context._invocation_context.session.id

    if not user_id:
        return "Error: User not authenticated."

    logger.info(
        f"Deleting memory: user={user_id}, session={session_id}, "
        f"namespace={namespace}, key={key}, hard_delete={hard_delete}"
    )

    # Input validation
    if not NAMESPACE_PATTERN.match(namespace):
        return "Error: Invalid namespace format (lowercase letters and underscores, 3-50 characters)."

    if not KEY_PATTERN.match(key):
        return "Error: Invalid key format (alphanumeric with _-. characters, 1-255 characters)."

    db: Session = SessionLocal()
    try:
        # Find memory
        stmt = select(LongTermMemory).where(
            and_(
                LongTermMemory.user_id == user_id,
                LongTermMemory.namespace == namespace,
                LongTermMemory.key == key,
            )
        )
        memory = db.execute(stmt).scalar_one_or_none()

        if not memory:
            return (
                f"I don't have a memory with key '{key}' in namespace '{namespace}'."
            )

        if hard_delete:
            db.delete(memory)
            action = "permanently deleted"
        else:
            memory.is_deleted = True
            memory.updated_at = datetime.now(timezone.utc)
            action = "forgotten"

        db.commit()

        logger.info(
            f"Memory {action}: user={user_id}, namespace={namespace}, key={key}"
        )

        return f"I've {action} the memory: {key} from {namespace}."

    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to delete memory: user={user_id}, namespace={namespace}, "
            f"key={key}, error={e}",
            exc_info=True,
        )
        return f"Error: Could not delete memory - {e!s}"
    finally:
        db.close()


# Create ADK FunctionTool instances
store_memory_tool = FunctionTool(store_memory_function)
retrieve_memories_tool = FunctionTool(retrieve_memories_function)
delete_memory_tool = FunctionTool(delete_memory_function)

# Export tools
__all__ = [
    "delete_memory_function",
    "delete_memory_tool",
    "retrieve_memories_function",
    "retrieve_memories_tool",
    "store_memory_function",
    "store_memory_tool",
]
