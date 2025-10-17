# Long-Term Memory System Architecture

**Status**: Partially Implemented ⚠️
**Author**: System Architecture Designer
**Date**: 2024-10-10
**Last Reviewed**: 2024-10-17
**Version**: 1.1

---

## Executive Summary

This document defines a production-ready long-term memory system for the Vana AI Research Platform. The system enables ADK agents to store and retrieve contextual information across sessions while respecting Vana's existing authentication patterns and ADK's execution model.

**Critical Insight**: ADK tools execute **outside** FastAPI request context, requiring explicit `user_id` parameters rather than dependency injection.

---

## Implementation Status

**Last Updated**: 2024-10-17

### ✅ Completed Components
- **Database Model** (`app/auth/models.py:446-544`): `LongTermMemory` model fully implemented with all fields and indices
- **Memory Tools** (`app/tools/memory_tools.py`): All three tools (`store`, `retrieve`, `delete`) implemented with modern ADK `ToolContext` pattern
- **Input Validation**: Namespace/key validation, content length limits, tag limits
- **Error Handling**: Graceful degradation, structured logging
- **Security**: User isolation via user_id filtering, soft delete support

### ⚠️ Partially Implemented
- **Database Migrations**: Model exists but Alembic migration status not verified
- **Async Support**: Model uses sync operations only (Section 3 describes async but not implemented)

### ❌ Not Implemented
- **Route Integration** (`app/routes/adk_routes.py`): Memory tools are NOT passed to agents during session creation
- **Agent Configuration** (`app/agent.py`): Agents do not have access to memory tools
- **Advanced Features**: Vector search (14.1), memory summarization (14.2), analytics (14.3)
- **Monitoring**: Prometheus metrics (Section 11.3)

### 📝 Documentation Gaps
- **Section 1.2** documents `functools.partial` approach, but actual implementation uses ADK's `ToolContext` (modern pattern)
- **Section 4.1** shows old API signature with `user_id` parameter; actual implementation uses `tool_context: ToolContext`
- **Section 5** (ADK Agent Integration) describes integration that has not been completed

### 🔄 Implementation Variance
The actual implementation uses **ADK's native `ToolContext`** parameter for user context injection instead of `functools.partial`. This is **superior to documented approach** and represents modern ADK v2.0+ best practices. See `app/tools/memory_tools.py` for current implementation.

---

## 1. System Context & Constraints

### 1.1 Existing Architecture Patterns

#### Authentication Pattern
```python
# FastAPI routes use Depends() for auth
@router.get("/endpoint")
async def endpoint(
    current_user: User | None = Depends(get_current_active_user_optional())
):
    # user_id available here: current_user.id
```

#### ADK Tool Pattern
```python
# Tools use FunctionTool(function) - NO Depends()
def tool_function(query: str, user_id: int) -> dict:
    """user_id MUST be explicit parameter"""
    return {"result": "data"}

# Register tool
tool = FunctionTool(tool_function)
```

#### Database Pattern
```python
# Sync SQLAlchemy with SessionLocal
from app.auth.database import SessionLocal, get_auth_db

db = SessionLocal()
try:
    # Query operations
finally:
    db.close()
```

### 1.2 Critical Constraint: ADK Execution Context

**Problem**: ADK agents call tools in background tasks, outside FastAPI request scope.

**Modern Solution (IMPLEMENTED)**: Use ADK's native `ToolContext` parameter for automatic user context injection:

```python
from google.adk.tools.function_tool import FunctionTool
from google.adk.tools.tool_context import ToolContext

def store_memory_function(
    namespace: str,
    key: str,
    content: str,
    tags: list[str] | None = None,
    importance: float = 0.5,
    ttl_days: int | None = None,
    tool_context: ToolContext | None = None,  # ← Auto-injected by ADK
) -> str:
    """Store a memory for the current user.

    Args:
        tool_context: Auto-injected by ADK (contains user_id and session info)
    """
    if not tool_context:
        return "Error: User context not available."

    # Extract user context directly from ADK
    user_id = tool_context._invocation_context.user_id
    session_id = tool_context._invocation_context.session.id

    # Use user_id for database operations...

# Export tool - no user_id binding needed!
store_memory_tool = FunctionTool(store_memory_function)

# In routes, just pass the tool directly to agents
agent = LlmAgent(tools=[store_memory_tool, retrieve_memories_tool])
```

**Legacy Approach (Documented but Superseded)**: The original design used `functools.partial` to bind user_id:

```python
from functools import partial

@router.post("/run")
async def run_session(
    current_user: User | None = Depends(get_current_active_user_optional())
):
    # OLD PATTERN: Bind user_id to memory tools via partial
    user_id = current_user.id if current_user else None

    # Create partially applied tools with user_id bound
    memory_store_tool = FunctionTool(
        partial(store_memory_function, user_id=user_id)
    )
    memory_retrieve_tool = FunctionTool(
        partial(retrieve_memory_function, user_id=user_id)
    )

    # Pass to agent
    agent = LlmAgent(tools=[memory_store_tool, memory_retrieve_tool])
```

**Why ToolContext is Superior**:
- ✅ **Automatic Injection**: ADK handles user context propagation automatically
- ✅ **Session Awareness**: Access to full session context, not just user_id
- ✅ **Type Safety**: Proper type hints and IDE support
- ✅ **Less Boilerplate**: No manual partial application in routes
- ✅ **Framework Native**: Uses ADK's intended pattern (v2.0+)

**Implementation Status**: Current code (`app/tools/memory_tools.py`) uses the modern `ToolContext` pattern. However, route integration is pending - memory tools are not yet passed to agents in `app/routes/adk_routes.py`.

---

## 2. Database Schema Design

### 2.1 LongTermMemory Model

```python
# app/auth/models.py

from sqlalchemy import Text, Index, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from sqlalchemy.sql import func

class LongTermMemory(Base):
    """Long-term memory storage for AI agent context across sessions.

    Enables agents to store and retrieve contextual information that persists
    beyond individual chat sessions, supporting continuity and personalization.

    Security Features:
        - User isolation (memories are private to each user)
        - Namespace-based organization (research, preferences, facts, etc.)
        - Soft delete with retention period
        - Full-text search on content
        - Access audit trails

    Design Decisions:
        - JSON metadata for flexible structured data
        - Separate indices for user, namespace, and tags
        - Composite index for common query patterns
        - Importance scoring for retrieval prioritization
        - Automatic timestamp tracking
        - Foreign key to User model for referential integrity
    """

    __tablename__ = "long_term_memories"

    # Primary Key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # User Association (Required)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Memory Organization
    namespace: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
        comment="Memory category: research, preferences, facts, tasks, etc."
    )

    key: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
        comment="Unique identifier within namespace (e.g., 'preferred_citation_style')"
    )

    # Content Storage
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Primary memory content (natural language or structured text)"
    )

    metadata_json: Mapped[dict | None] = mapped_column(
        JSON,
        nullable=True,
        comment="Structured metadata: sources, confidence, relationships, etc."
    )

    # Retrieval Optimization
    tags: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(50)),
        nullable=True,
        comment="Searchable tags for categorization and filtering"
    )

    importance: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.5,
        comment="Relevance score (0.0-1.0) for retrieval prioritization"
    )

    # Lifecycle Management
    access_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of times this memory has been retrieved"
    )

    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Last retrieval timestamp for LRU eviction"
    )

    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Optional expiration date for time-sensitive memories"
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Soft delete flag for data retention compliance"
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Soft deletion timestamp"
    )

    # Audit Trail
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="memories")

    # Composite Indices for Common Query Patterns
    __table_args__ = (
        # Fast user+namespace queries
        Index('idx_user_namespace', 'user_id', 'namespace'),

        # Fast user+namespace+key lookups (unique memories)
        Index('idx_user_namespace_key', 'user_id', 'namespace', 'key', unique=True),

        # Tag-based search
        Index('idx_tags_gin', 'tags', postgresql_using='gin'),

        # Importance-based retrieval
        Index('idx_importance_desc', 'importance', postgresql_order_by='desc'),

        # Expiration cleanup queries
        Index('idx_expires_at', 'expires_at'),

        # Soft delete filtering
        Index('idx_is_deleted', 'is_deleted'),
    )

    def to_dict(self, include_metadata: bool = True) -> dict:
        """Serialize memory to dictionary for API responses."""
        data = {
            "id": self.id,
            "namespace": self.namespace,
            "key": self.key,
            "content": self.content,
            "tags": self.tags,
            "importance": self.importance,
            "access_count": self.access_count,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

        if include_metadata and self.metadata_json:
            data["metadata"] = self.metadata_json

        if self.last_accessed_at:
            data["last_accessed_at"] = self.last_accessed_at.isoformat()

        if self.expires_at:
            data["expires_at"] = self.expires_at.isoformat()

        return data


# Add relationship to User model
User.memories: Mapped[list["LongTermMemory"]] = relationship(
    "LongTermMemory",
    back_populates="user",
    cascade="all, delete-orphan"
)
```

### 2.2 Database Migration Strategy

```python
# alembic/versions/xxx_add_long_term_memory.py

"""Add long-term memory support

Revision ID: xxx
Revises: yyy
Create Date: 2025-10-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Create table
    op.create_table(
        'long_term_memories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('namespace', sa.String(length=100), nullable=False),
        sa.Column('key', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String(50)), nullable=True),
        sa.Column('importance', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('access_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_accessed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )

    # Create indices
    op.create_index('idx_user_id', 'long_term_memories', ['user_id'])
    op.create_index('idx_namespace', 'long_term_memories', ['namespace'])
    op.create_index('idx_user_namespace', 'long_term_memories', ['user_id', 'namespace'])
    op.create_index('idx_user_namespace_key', 'long_term_memories', ['user_id', 'namespace', 'key'], unique=True)
    op.create_index('idx_importance_desc', 'long_term_memories', ['importance'], postgresql_ops={'importance': 'DESC'})
    op.create_index('idx_expires_at', 'long_term_memories', ['expires_at'])
    op.create_index('idx_is_deleted', 'long_term_memories', ['is_deleted'])

    # GIN index for tags array (PostgreSQL only)
    op.create_index('idx_tags_gin', 'long_term_memories', ['tags'], postgresql_using='gin')


def downgrade():
    op.drop_table('long_term_memories')
```

---

## 3. Async Database Support

### 3.1 Async Engine Configuration

```python
# app/auth/database.py

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from typing import AsyncGenerator

# Existing sync configuration
AUTH_DATABASE_URL = os.getenv("AUTH_DATABASE_URL", "sqlite:///./auth.db")
engine = create_engine(AUTH_DATABASE_URL, ...)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# New async configuration
ASYNC_DATABASE_URL = os.getenv(
    "ASYNC_AUTH_DATABASE_URL",
    # Convert sync URL to async (sqlite+aiosqlite, postgresql+asyncpg)
    AUTH_DATABASE_URL.replace("sqlite://", "sqlite+aiosqlite://")
                     .replace("postgresql://", "postgresql+asyncpg://")
)

# Create async engine
async_engine: AsyncEngine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=os.getenv("AUTH_DB_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_auth_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for async database sessions.

    Usage:
        @app.get("/endpoint")
        async def endpoint(db: AsyncSession = Depends(get_async_auth_db)):
            result = await db.execute(select(User))
            return result.scalars().all()
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def get_sync_db_session() -> Session:
    """Get synchronous database session for ADK tools.

    ADK tools run in synchronous context, so use this for memory operations.
    IMPORTANT: Caller must close the session after use.

    Usage:
        db = get_sync_db_session()
        try:
            # Perform operations
            result = db.query(LongTermMemory).filter_by(user_id=user_id).all()
        finally:
            db.close()
    """
    return SessionLocal()
```

### 3.2 Database Dependencies Summary

```python
# For FastAPI async routes
async def get_async_auth_db() -> AsyncGenerator[AsyncSession, None]:
    """Use with: db: AsyncSession = Depends(get_async_auth_db)"""

# For synchronous ADK tools
def get_sync_db_session() -> Session:
    """Use in tools: db = get_sync_db_session(); try: ... finally: db.close()"""

# Existing sync dependency (keep for compatibility)
def get_auth_db() -> Generator[Session, None, None]:
    """Use with: db: Session = Depends(get_auth_db)"""
```

---

## 4. Memory Tool Implementation

### 4.1 Core Memory Functions

**⚠️ NOTE**: This section documents the original design using `functools.partial` for user context binding. **The actual implementation** (`app/tools/memory_tools.py`) uses ADK's modern `ToolContext` parameter for automatic context injection. See Section 1.2 for comparison of both approaches.

For the current implementation, see the actual file at `app/tools/memory_tools.py` which uses:
- `tool_context: ToolContext | None = None` parameter for automatic user context injection
- `user_id = tool_context._invocation_context.user_id` for extracting user ID
- Returns `str` instead of `dict[str, Any]` for agent-friendly responses

The code examples below represent the original design pattern for reference:

```python
# app/tools/memory_tools.py (LEGACY PATTERN - for reference only)

"""Long-term memory tools for ADK agents.

CRITICAL: These tools are called by ADK agents in background tasks,
OUTSIDE FastAPI request context. Therefore:
- user_id MUST be an explicit parameter (LEGACY - now handled by ToolContext)
- Use get_sync_db_session() for database access (STILL VALID)
- Always close database sessions in finally blocks (STILL VALID)
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from google.adk.tools.function_tool import FunctionTool
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.auth.database import get_sync_db_session
from app.auth.models import LongTermMemory

logger = logging.getLogger(__name__)


def store_memory_function(
    content: str,
    namespace: str,
    key: str,
    user_id: int,
    tags: list[str] | None = None,
    importance: float = 0.5,
    metadata: dict[str, Any] | None = None,
    ttl_days: int | None = None,
) -> dict[str, Any]:
    """Store or update a memory in long-term storage.

    Args:
        content: Natural language or structured text content
        namespace: Memory category (e.g., "research", "preferences", "facts")
        key: Unique identifier within namespace
        user_id: User ID (bound via partial application in routes)
        tags: Optional list of searchable tags
        importance: Relevance score (0.0-1.0, default 0.5)
        metadata: Optional structured metadata as dict
        ttl_days: Optional expiration period in days

    Returns:
        Dictionary with operation status and memory ID

    Example:
        # In route, bind user_id via partial:
        store_tool = FunctionTool(partial(store_memory_function, user_id=current_user.id))

        # Agent calls (user_id already bound):
        store_tool.invoke({
            "content": "User prefers APA citation style",
            "namespace": "preferences",
            "key": "citation_style",
            "tags": ["formatting", "academic"],
            "importance": 0.8
        })
    """
    if not user_id:
        return {
            "success": False,
            "error": "user_id is required for memory storage"
        }

    db: Session = get_sync_db_session()
    try:
        # Check for existing memory (upsert logic)
        existing = db.query(LongTermMemory).filter(
            and_(
                LongTermMemory.user_id == user_id,
                LongTermMemory.namespace == namespace,
                LongTermMemory.key == key,
                LongTermMemory.is_deleted == False
            )
        ).first()

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=ttl_days) if ttl_days else None

        if existing:
            # Update existing memory
            existing.content = content
            existing.tags = tags
            existing.importance = importance
            existing.metadata_json = metadata
            existing.expires_at = expires_at
            existing.updated_at = now

            memory = existing
            operation = "updated"
        else:
            # Create new memory
            memory = LongTermMemory(
                user_id=user_id,
                namespace=namespace,
                key=key,
                content=content,
                tags=tags,
                importance=importance,
                metadata_json=metadata,
                expires_at=expires_at,
                created_at=now,
                updated_at=now
            )
            db.add(memory)
            operation = "created"

        db.commit()
        db.refresh(memory)

        logger.info(
            f"Memory {operation}: user_id={user_id}, namespace={namespace}, "
            f"key={key}, id={memory.id}"
        )

        return {
            "success": True,
            "operation": operation,
            "memory_id": memory.id,
            "namespace": namespace,
            "key": key
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to store memory: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()


def retrieve_memories_function(
    user_id: int,
    namespace: str | None = None,
    tags: list[str] | None = None,
    query: str | None = None,
    limit: int = 10,
    min_importance: float = 0.0,
) -> dict[str, Any]:
    """Retrieve memories from long-term storage with flexible filtering.

    Args:
        user_id: User ID (bound via partial application)
        namespace: Optional namespace filter
        tags: Optional tags to match (OR logic)
        query: Optional text search in content (case-insensitive substring)
        limit: Maximum number of memories to return (default 10)
        min_importance: Minimum importance threshold (0.0-1.0)

    Returns:
        Dictionary with memories list and metadata

    Example:
        # Retrieve research-related memories with high importance
        retrieve_tool.invoke({
            "namespace": "research",
            "tags": ["citation", "methodology"],
            "min_importance": 0.7,
            "limit": 5
        })
    """
    if not user_id:
        return {
            "success": False,
            "error": "user_id is required for memory retrieval"
        }

    db: Session = get_sync_db_session()
    try:
        # Build query with filters
        stmt = select(LongTermMemory).filter(
            and_(
                LongTermMemory.user_id == user_id,
                LongTermMemory.is_deleted == False,
                LongTermMemory.importance >= min_importance
            )
        )

        # Optional namespace filter
        if namespace:
            stmt = stmt.filter(LongTermMemory.namespace == namespace)

        # Optional tag filter (match any tag)
        if tags:
            tag_filters = [LongTermMemory.tags.contains([tag]) for tag in tags]
            stmt = stmt.filter(or_(*tag_filters))

        # Optional content search (case-insensitive)
        if query:
            stmt = stmt.filter(LongTermMemory.content.ilike(f"%{query}%"))

        # Check for expired memories
        now = datetime.now(timezone.utc)
        stmt = stmt.filter(
            or_(
                LongTermMemory.expires_at == None,
                LongTermMemory.expires_at > now
            )
        )

        # Order by importance (descending) and recency
        stmt = stmt.order_by(
            LongTermMemory.importance.desc(),
            LongTermMemory.updated_at.desc()
        ).limit(limit)

        # Execute query
        result = db.execute(stmt)
        memories = result.scalars().all()

        # Update access tracking for retrieved memories
        memory_ids = [m.id for m in memories]
        if memory_ids:
            db.query(LongTermMemory).filter(
                LongTermMemory.id.in_(memory_ids)
            ).update(
                {
                    "access_count": LongTermMemory.access_count + 1,
                    "last_accessed_at": now
                },
                synchronize_session=False
            )
            db.commit()

        # Serialize memories
        memory_dicts = [m.to_dict() for m in memories]

        logger.info(
            f"Retrieved {len(memories)} memories for user_id={user_id}, "
            f"namespace={namespace}, tags={tags}"
        )

        return {
            "success": True,
            "memories": memory_dicts,
            "count": len(memory_dicts),
            "filters": {
                "namespace": namespace,
                "tags": tags,
                "query": query,
                "min_importance": min_importance
            }
        }

    except Exception as e:
        logger.error(f"Failed to retrieve memories: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "memories": []
        }
    finally:
        db.close()


def delete_memory_function(
    user_id: int,
    memory_id: int | None = None,
    namespace: str | None = None,
    key: str | None = None,
    hard_delete: bool = False,
) -> dict[str, Any]:
    """Delete a memory (soft delete by default, hard delete optional).

    Args:
        user_id: User ID (bound via partial application)
        memory_id: Specific memory ID to delete
        namespace: Optional namespace for key-based deletion
        key: Optional key for namespace+key deletion
        hard_delete: If True, permanently delete; if False, soft delete (default)

    Returns:
        Dictionary with operation status

    Example:
        # Soft delete by ID
        delete_tool.invoke({"memory_id": 123})

        # Hard delete by namespace+key
        delete_tool.invoke({
            "namespace": "research",
            "key": "old_preference",
            "hard_delete": True
        })
    """
    if not user_id:
        return {
            "success": False,
            "error": "user_id is required for memory deletion"
        }

    if not memory_id and not (namespace and key):
        return {
            "success": False,
            "error": "Must provide either memory_id or (namespace + key)"
        }

    db: Session = get_sync_db_session()
    try:
        # Build query to find memory
        if memory_id:
            stmt = select(LongTermMemory).filter(
                and_(
                    LongTermMemory.id == memory_id,
                    LongTermMemory.user_id == user_id
                )
            )
        else:
            stmt = select(LongTermMemory).filter(
                and_(
                    LongTermMemory.user_id == user_id,
                    LongTermMemory.namespace == namespace,
                    LongTermMemory.key == key,
                    LongTermMemory.is_deleted == False
                )
            )

        result = db.execute(stmt)
        memory = result.scalars().first()

        if not memory:
            return {
                "success": False,
                "error": "Memory not found"
            }

        if hard_delete:
            # Permanently delete from database
            db.delete(memory)
            operation = "hard_deleted"
        else:
            # Soft delete (mark as deleted)
            memory.is_deleted = True
            memory.deleted_at = datetime.now(timezone.utc)
            operation = "soft_deleted"

        db.commit()

        logger.info(
            f"Memory {operation}: user_id={user_id}, id={memory.id}, "
            f"namespace={memory.namespace}, key={memory.key}"
        )

        return {
            "success": True,
            "operation": operation,
            "memory_id": memory.id
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete memory: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()


# Export FunctionTool instances for ADK agents
# NOTE: These need user_id bound via partial() in routes
store_memory = FunctionTool(store_memory_function)
retrieve_memories = FunctionTool(retrieve_memories_function)
delete_memory = FunctionTool(delete_memory_function)
```

### 4.2 Memory Cleanup Utilities

```python
# app/tools/memory_tools.py (continued)

def cleanup_expired_memories() -> dict[str, Any]:
    """Background task to clean up expired memories.

    Should be called periodically (e.g., via cron job or scheduler).
    Hard-deletes memories that have been soft-deleted for > 30 days.
    Soft-deletes memories that have passed their expiration date.

    Returns:
        Dictionary with cleanup statistics
    """
    db: Session = get_sync_db_session()
    try:
        now = datetime.now(timezone.utc)
        retention_cutoff = now - timedelta(days=30)

        # Hard delete old soft-deleted memories
        hard_delete_result = db.query(LongTermMemory).filter(
            and_(
                LongTermMemory.is_deleted == True,
                LongTermMemory.deleted_at < retention_cutoff
            )
        ).delete(synchronize_session=False)

        # Soft delete expired memories
        soft_delete_result = db.query(LongTermMemory).filter(
            and_(
                LongTermMemory.is_deleted == False,
                LongTermMemory.expires_at < now
            )
        ).update(
            {
                "is_deleted": True,
                "deleted_at": now
            },
            synchronize_session=False
        )

        db.commit()

        logger.info(
            f"Memory cleanup: hard_deleted={hard_delete_result}, "
            f"soft_deleted={soft_delete_result}"
        )

        return {
            "success": True,
            "hard_deleted": hard_delete_result,
            "soft_deleted": soft_delete_result,
            "timestamp": now.isoformat()
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Memory cleanup failed: {e}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }
    finally:
        db.close()
```

---

## 5. ADK Agent Integration

### 5.1 Route Integration Pattern

```python
# app/routes/adk_routes.py

from functools import partial
from app.tools.memory_tools import (
    store_memory_function,
    retrieve_memories_function,
    delete_memory_function
)

@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def run_session_sse(
    app_name: str,
    user_id: str,
    session_id: str,
    request: dict = Body(...),
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict:
    """Start session research with memory-enabled agents."""

    # Extract authenticated user ID
    authenticated_user_id = current_user.id if current_user else None

    # Create memory tools with user_id bound via partial application
    # This binds the user context at route level, before ADK execution
    memory_tools = []

    if authenticated_user_id:
        # Create partially applied functions with user_id pre-bound
        store_with_user = partial(
            store_memory_function,
            user_id=authenticated_user_id
        )
        retrieve_with_user = partial(
            retrieve_memories_function,
            user_id=authenticated_user_id
        )
        delete_with_user = partial(
            delete_memory_function,
            user_id=authenticated_user_id
        )

        # Wrap in FunctionTool
        memory_tools = [
            FunctionTool(store_with_user),
            FunctionTool(retrieve_with_user),
            FunctionTool(delete_with_user),
        ]

    # TODO: Pass memory_tools to agent configuration
    # This requires modifying agent.py to accept dynamic tools

    # Continue with existing ADK invocation logic...
```

### 5.2 Agent Configuration with Memory Tools

```python
# app/agent.py

from app.tools import brave_search
from app.tools.memory_tools import store_memory, retrieve_memories, delete_memory

# Option 1: Static memory tools (requires user_id in tool parameters)
# This approach requires agents to explicitly pass user_id in every call
section_researcher = LlmAgent(
    model=config.worker_model,
    name="section_researcher",
    tools=[brave_search, store_memory, retrieve_memories],
    instruction="""
    You have access to long-term memory storage.

    CRITICAL: Always include user_id parameter when calling memory tools.
    The user_id will be provided in the session context.

    Example memory storage:
    store_memory(
        content="User prefers APA citation style",
        namespace="preferences",
        key="citation_style",
        user_id=<from_context>,
        importance=0.8
    )

    Example memory retrieval:
    retrieve_memories(
        user_id=<from_context>,
        namespace="preferences",
        limit=5
    )
    """
)

# Option 2: Dynamic memory tools (passed from route with user_id pre-bound)
# This is the RECOMMENDED approach - user_id is bound at route level
def create_research_agent(memory_tools: list[FunctionTool] | None = None):
    """Factory function to create agent with memory tools.

    Args:
        memory_tools: Pre-configured memory tools with user_id bound

    Returns:
        Configured LlmAgent instance
    """
    all_tools = [brave_search]

    if memory_tools:
        all_tools.extend(memory_tools)

    return LlmAgent(
        model=config.worker_model,
        name="section_researcher",
        tools=all_tools,
        instruction="""
        You have access to long-term memory storage.

        Use memory tools to:
        - Store important findings for future sessions
        - Retrieve user preferences and past research
        - Build continuity across conversations

        Memory is automatically scoped to the current user.

        Example memory storage:
        store_memory(
            content="User researching quantum computing applications",
            namespace="research",
            key="current_topic",
            tags=["quantum", "computing"],
            importance=0.9
        )
        """
    )
```

---

## 6. Memory Retrieval Strategies

### 6.1 Retrieval Patterns

#### Pattern 1: Namespace-Based Retrieval
```python
# Retrieve all research memories
retrieve_memories(
    user_id=user_id,
    namespace="research",
    limit=20
)
```

#### Pattern 2: Tag-Based Retrieval
```python
# Find memories related to citations
retrieve_memories(
    user_id=user_id,
    tags=["citation", "formatting"],
    limit=10
)
```

#### Pattern 3: Importance-Filtered Retrieval
```python
# Get high-priority memories only
retrieve_memories(
    user_id=user_id,
    namespace="preferences",
    min_importance=0.7,
    limit=5
)
```

#### Pattern 4: Content Search
```python
# Search for specific topics
retrieve_memories(
    user_id=user_id,
    query="quantum computing",
    limit=10
)
```

### 6.2 Context Window Management

**Problem**: LLM context windows are limited; cannot include all memories in every request.

**Solution**: Selective retrieval based on relevance

```python
def get_relevant_memories_for_query(
    user_id: int,
    query: str,
    max_memories: int = 5
) -> list[dict]:
    """Retrieve most relevant memories for a given query.

    Strategy:
    1. Text search in content (query match)
    2. Tag-based relevance (extract key terms from query)
    3. Importance weighting (prefer high-importance memories)
    4. Recency bias (prefer recently updated memories)
    """
    db = get_sync_db_session()
    try:
        # Extract potential tags from query (simple keyword extraction)
        query_terms = query.lower().split()

        # Retrieve memories with multiple strategies
        memories = []

        # Strategy 1: Content search
        content_results = retrieve_memories_function(
            user_id=user_id,
            query=query,
            min_importance=0.5,
            limit=max_memories
        )
        memories.extend(content_results.get("memories", []))

        # Strategy 2: Tag-based (if content search didn't return enough)
        if len(memories) < max_memories:
            tag_results = retrieve_memories_function(
                user_id=user_id,
                tags=query_terms[:3],  # First 3 terms as tags
                min_importance=0.5,
                limit=max_memories - len(memories)
            )
            memories.extend(tag_results.get("memories", []))

        # Deduplicate by ID
        seen_ids = set()
        unique_memories = []
        for m in memories:
            if m["id"] not in seen_ids:
                seen_ids.add(m["id"])
                unique_memories.append(m)

        # Sort by importance * recency score
        def relevance_score(memory: dict) -> float:
            importance = memory.get("importance", 0.5)
            # Simple recency decay (newer = higher score)
            updated_at = datetime.fromisoformat(memory["updated_at"])
            days_old = (datetime.now(timezone.utc) - updated_at).days
            recency_factor = max(0.5, 1.0 - (days_old / 365))  # Decay over year
            return importance * recency_factor

        unique_memories.sort(key=relevance_score, reverse=True)

        return unique_memories[:max_memories]

    finally:
        db.close()
```

---

## 7. Error Handling & Logging

### 7.1 Error Handling Strategy

```python
# Graceful degradation - memory failures should not break agent execution
def safe_store_memory(content: str, namespace: str, key: str, user_id: int, **kwargs) -> dict:
    """Wrapper with error isolation."""
    try:
        return store_memory_function(
            content=content,
            namespace=namespace,
            key=key,
            user_id=user_id,
            **kwargs
        )
    except Exception as e:
        logger.error(f"Memory storage failed (non-fatal): {e}", exc_info=True)
        return {
            "success": False,
            "error": "Memory storage temporarily unavailable",
            "fallback": True
        }
```

### 7.2 Logging Strategy

```python
# Structured logging for memory operations
import structlog

memory_logger = structlog.get_logger("vana.memory")

def log_memory_operation(
    operation: str,
    user_id: int,
    namespace: str,
    success: bool,
    **extra
):
    """Structured logging for memory operations."""
    memory_logger.info(
        "memory_operation",
        operation=operation,
        user_id=user_id,
        namespace=namespace,
        success=success,
        **extra
    )

# Usage in tool functions
log_memory_operation(
    operation="store",
    user_id=user_id,
    namespace=namespace,
    key=key,
    success=True,
    memory_id=memory.id,
    importance=importance
)
```

---

## 8. Security Considerations

### 8.1 Data Isolation

- **User Isolation**: All queries filtered by `user_id` (enforced at database level)
- **Foreign Key Constraints**: `ON DELETE CASCADE` ensures cleanup when user deleted
- **Index-Backed Filtering**: User-based indices prevent cross-user data leaks

### 8.2 Input Validation

```python
def validate_memory_input(content: str, namespace: str, key: str) -> tuple[bool, str | None]:
    """Validate memory inputs before storage."""
    # Content length limits
    if len(content) > 50000:  # 50KB max
        return False, "Content exceeds maximum length (50KB)"

    # Namespace validation
    if not namespace.isalnum() and "_" not in namespace:
        return False, "Namespace must be alphanumeric with underscores"

    # Key validation
    if len(key) > 255:
        return False, "Key exceeds maximum length (255 chars)"

    # Content sanitization (prevent XSS if rendered)
    if "<script>" in content.lower() or "javascript:" in content.lower():
        return False, "Content contains potentially malicious code"

    return True, None
```

### 8.3 Rate Limiting

```python
from app.utils.rate_limiter import RateLimiter

memory_rate_limiter = RateLimiter(
    max_requests=100,  # 100 operations per window
    window_seconds=60  # 1 minute window
)

async def rate_limited_store_memory(user_id: int, **kwargs):
    """Rate-limited memory storage."""
    async with memory_rate_limiter:
        return store_memory_function(user_id=user_id, **kwargs)
```

---

## 9. Performance Optimization

### 9.1 Database Indices

- **Composite Index**: `(user_id, namespace, key)` for fast lookups
- **GIN Index**: `tags` array for efficient tag searches
- **Partial Index**: `is_deleted = false` for active memory queries

### 9.2 Query Optimization

```sql
-- Optimized retrieval query
SELECT * FROM long_term_memories
WHERE user_id = :user_id
  AND namespace = :namespace
  AND is_deleted = false
  AND (expires_at IS NULL OR expires_at > NOW())
  AND importance >= :min_importance
ORDER BY importance DESC, updated_at DESC
LIMIT :limit;

-- Uses index: idx_user_namespace + idx_importance_desc
```

### 9.3 Connection Pooling

```python
# AsyncPG connection pool (PostgreSQL)
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_size=10,        # Base pool size
    max_overflow=20,     # Additional connections under load
    pool_pre_ping=True,  # Verify connections before use
    pool_recycle=3600,   # Recycle connections every hour
)
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

```python
# tests/unit/test_memory_tools.py

import pytest
from app.tools.memory_tools import (
    store_memory_function,
    retrieve_memories_function,
    delete_memory_function
)
from app.auth.models import User, LongTermMemory
from app.auth.database import get_sync_db_session

@pytest.fixture
def test_user(db_session):
    """Create test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed"
    )
    db_session.add(user)
    db_session.commit()
    return user

def test_store_and_retrieve_memory(test_user):
    """Test basic memory storage and retrieval."""
    # Store memory
    result = store_memory_function(
        content="Test memory content",
        namespace="test",
        key="test_key",
        user_id=test_user.id,
        tags=["test"],
        importance=0.8
    )

    assert result["success"] is True
    assert result["operation"] == "created"
    memory_id = result["memory_id"]

    # Retrieve memory
    retrieve_result = retrieve_memories_function(
        user_id=test_user.id,
        namespace="test"
    )

    assert retrieve_result["success"] is True
    assert len(retrieve_result["memories"]) == 1
    assert retrieve_result["memories"][0]["content"] == "Test memory content"

def test_user_isolation(test_user, db_session):
    """Test that users can only access their own memories."""
    # Create another user
    other_user = User(
        email="other@example.com",
        username="otheruser",
        hashed_password="hashed"
    )
    db_session.add(other_user)
    db_session.commit()

    # Store memory for test_user
    store_memory_function(
        content="User 1 memory",
        namespace="test",
        key="key1",
        user_id=test_user.id
    )

    # Try to retrieve as other_user
    result = retrieve_memories_function(
        user_id=other_user.id,
        namespace="test"
    )

    assert result["success"] is True
    assert len(result["memories"]) == 0  # Should not see test_user's memories

def test_memory_expiration(test_user):
    """Test that expired memories are not retrieved."""
    # Store memory with 1-day TTL
    store_memory_function(
        content="Expiring memory",
        namespace="test",
        key="expiring",
        user_id=test_user.id,
        ttl_days=1
    )

    # Should be retrievable immediately
    result = retrieve_memories_function(user_id=test_user.id, namespace="test")
    assert len(result["memories"]) == 1

    # Mock time passage (requires test utilities)
    # After expiration, should not be retrieved
    # (Implementation depends on testing infrastructure)
```

### 10.2 Integration Tests

```python
# tests/integration/test_memory_adk_integration.py

import pytest
from functools import partial
from app.tools.memory_tools import store_memory_function
from google.adk.tools.function_tool import FunctionTool

def test_partial_application_with_adk():
    """Test that partial application works with ADK FunctionTool."""
    user_id = 123

    # Create partially applied function
    store_with_user = partial(store_memory_function, user_id=user_id)

    # Wrap in FunctionTool
    tool = FunctionTool(store_with_user)

    # Invoke tool (user_id already bound)
    result = tool.invoke({
        "content": "Test content",
        "namespace": "test",
        "key": "test_key"
    })

    assert result["success"] is True
    # Verify user_id was correctly applied
```

---

## 11. Deployment Considerations

### 11.1 Database Setup

```bash
# Create database (PostgreSQL)
createdb vana_production

# Run migrations
alembic upgrade head

# Verify tables
psql vana_production -c "\dt"
```

### 11.2 Environment Variables

```bash
# .env.production
AUTH_DATABASE_URL=postgresql://user:pass@localhost/vana_production
ASYNC_AUTH_DATABASE_URL=postgresql+asyncpg://user:pass@localhost/vana_production

# Memory configuration
MEMORY_MAX_CONTENT_SIZE=50000
MEMORY_DEFAULT_TTL_DAYS=365
MEMORY_CLEANUP_INTERVAL_HOURS=24
```

### 11.3 Monitoring

```python
# app/monitoring/memory_metrics.py

from prometheus_client import Counter, Histogram, Gauge

# Memory operation metrics
memory_operations = Counter(
    'memory_operations_total',
    'Total memory operations',
    ['operation', 'namespace', 'success']
)

memory_retrieval_latency = Histogram(
    'memory_retrieval_seconds',
    'Memory retrieval latency',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

memory_storage_size = Gauge(
    'memory_storage_bytes',
    'Total memory storage size',
    ['user_id', 'namespace']
)

# Usage in tool functions
with memory_retrieval_latency.time():
    result = retrieve_memories_function(...)

memory_operations.labels(
    operation='retrieve',
    namespace=namespace,
    success=result['success']
).inc()
```

---

## 12. Migration Path

### 12.1 Phase 1: Database Setup (Week 1)
- Add `LongTermMemory` model to `app/auth/models.py`
- Create Alembic migration
- Add async database support to `app/auth/database.py`
- Run migrations in development environment

### 12.2 Phase 2: Tool Implementation (Week 2)
- Implement `app/tools/memory_tools.py`
- Write unit tests for memory functions
- Test partial application with FunctionTool

### 12.3 Phase 3: Agent Integration (Week 3)
- Modify `app/routes/adk_routes.py` to pass memory tools
- Update agent instructions to use memory
- Integration testing with ADK agents

### 12.4 Phase 4: Production Rollout (Week 4)
- Deploy database changes
- Enable memory tools for subset of users (feature flag)
- Monitor performance and error rates
- Full rollout after validation

---

## 13. Architecture Decision Records (ADRs)

### ADR-001: Sync Database Access for ADK Tools

**Decision**: Use synchronous database access in ADK tool functions.

**Rationale**:
- ADK tools are invoked synchronously by Google's framework
- Mixing async/sync in tool functions creates event loop conflicts
- Existing `SessionLocal` provides battle-tested sync access
- Performance impact minimal (tools called infrequently)

**Alternatives Considered**:
- Run async code in thread pool: Complex, error-prone
- Migrate all database access to async: Breaking change, high risk

### ADR-002: Partial Application for User Context

**Decision**: Bind `user_id` via `functools.partial` at route level.

**Rationale**:
- ADK tools execute outside FastAPI request context
- Dependency injection (`Depends()`) not available in tools
- Partial application is Pythonic, explicit, and type-safe
- User context captured when request is received
- Tools remain testable with explicit parameters

**Alternatives Considered**:
- Global context variable: Thread-safety issues, implicit dependencies
- Require user_id in every tool call: Error-prone, agents might forget

### ADR-003: Soft Delete with Retention Period

**Decision**: Implement soft delete with 30-day retention period.

**Rationale**:
- Allows recovery from accidental deletions
- Supports data retention compliance (GDPR, CCPA)
- Hard delete after 30 days balances storage and compliance
- Queries filtered on `is_deleted=false` by default

**Alternatives Considered**:
- Hard delete only: No recovery, compliance risk
- Infinite soft delete: Storage bloat, GDPR compliance issues

### ADR-004: Namespace-Based Organization

**Decision**: Use `namespace` + `key` for memory organization.

**Rationale**:
- Flexible categorization (research, preferences, facts, tasks)
- Fast querying with composite index
- Supports upsert logic (update existing key within namespace)
- Clear separation of concerns for different memory types

**Alternatives Considered**:
- Flat key-value store: No organization, poor querying
- Hierarchical tags: Complex, over-engineered for use case

---

## 14. Future Enhancements

### 14.1 Vector Search Integration

```python
# Add vector embeddings for semantic search
class LongTermMemory(Base):
    # ... existing fields ...

    content_embedding: Mapped[list[float] | None] = mapped_column(
        ARRAY(Float),
        nullable=True,
        comment="Vector embedding for semantic search"
    )

    __table_args__ = (
        # ... existing indices ...
        Index('idx_content_embedding_ivfflat', 'content_embedding',
              postgresql_using='ivfflat', postgresql_ops={'content_embedding': 'vector_cosine_ops'}),
    )
```

### 14.2 Memory Summarization

```python
# Periodically summarize old memories to reduce storage
def summarize_old_memories(user_id: int, days_threshold: int = 90):
    """Compress old memories into summaries."""
    # Implementation using LLM to summarize old memories
    pass
```

### 14.3 Cross-Session Analytics

```python
# Analyze memory access patterns
def get_memory_insights(user_id: int) -> dict:
    """Generate insights from user's memory patterns."""
    return {
        "most_accessed_namespace": "research",
        "total_memories": 156,
        "important_memories": 42,
        "common_tags": ["citation", "quantum", "AI"],
        "memory_growth_trend": "increasing"
    }
```

---

## 15. Conclusion

This architecture provides a production-ready long-term memory system that:

✅ **Respects Existing Patterns**: Works within Vana's auth and tool patterns
✅ **Solves ADK Context Problem**: Partial application binds user_id correctly
✅ **Scales Efficiently**: Optimized indices, connection pooling, async support
✅ **Secure by Design**: User isolation, input validation, rate limiting
✅ **Maintainable**: Clear separation of concerns, comprehensive testing
✅ **Production-Ready**: Error handling, logging, monitoring, migration path

### Next Steps

1. Review and approve this architecture document
2. Create GitHub issue for implementation tracking
3. Begin Phase 1: Database setup and migrations
4. Coordinate with frontend team for UI integration

---

## Appendices

### Appendix A: SQL Schema

```sql
CREATE TABLE long_term_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    namespace VARCHAR(100) NOT NULL,
    key VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata_json JSONB,
    tags VARCHAR(50)[],
    importance FLOAT NOT NULL DEFAULT 0.5,
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_user_namespace_key ON long_term_memories(user_id, namespace, key);
CREATE INDEX idx_user_namespace ON long_term_memories(user_id, namespace);
CREATE INDEX idx_tags_gin ON long_term_memories USING gin(tags);
CREATE INDEX idx_importance_desc ON long_term_memories(importance DESC);
CREATE INDEX idx_expires_at ON long_term_memories(expires_at);
CREATE INDEX idx_is_deleted ON long_term_memories(is_deleted);
```

### Appendix B: Example Usage Scenarios

#### Scenario 1: Research Continuity
```python
# User returns to research quantum computing after 2 weeks
memories = retrieve_memories(
    user_id=user_id,
    namespace="research",
    tags=["quantum"],
    limit=10
)
# Agent sees: "Last session covered quantum entanglement applications in cryptography"
```

#### Scenario 2: Preference Learning
```python
# Agent learns user prefers APA citations
store_memory(
    content="User consistently requests APA citation format",
    namespace="preferences",
    key="citation_style",
    user_id=user_id,
    tags=["formatting", "academic"],
    importance=0.9
)
# Future sessions automatically use APA without asking
```

#### Scenario 3: Fact Accumulation
```python
# Build knowledge base about user's domain
store_memory(
    content="User is biomedical engineer specializing in prosthetics",
    namespace="facts",
    key="user_profession",
    user_id=user_id,
    importance=0.8
)
# Agent tailors responses to biomedical engineering context
```

---

**Document End**
