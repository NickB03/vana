"""
Context Manager for VANA

This module provides context management for the VANA project,
including context creation, serialization, and persistence.
"""

import os
import json
import time
import uuid
import logging
import sqlite3
from typing import Dict, Any, Optional, List
from datetime import datetime

# Set up logging
logger = logging.getLogger(__name__)

class Context:
    """Context object for passing information between Vana and tools."""
    
    def __init__(self, user_id: str, session_id: str, context_id: Optional[str] = None):
        """
        Initialize a context object.
        
        Args:
            user_id: User ID
            session_id: Session ID
            context_id: Context ID (optional, will be generated if not provided)
        """
        self.id = context_id or str(uuid.uuid4())
        self.user_id = user_id
        self.session_id = session_id
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.data = {}
    
    def add_data(self, key: str, value: Any) -> None:
        """
        Add data to the context.
        
        Args:
            key: Data key
            value: Data value
        """
        self.data[key] = value
        self.updated_at = datetime.now().isoformat()
    
    def get_data(self, key: str, default: Any = None) -> Any:
        """
        Get data from the context.
        
        Args:
            key: Data key
            default: Default value to return if key is not found
            
        Returns:
            Data value or default
        """
        return self.data.get(key, default)
    
    def remove_data(self, key: str) -> None:
        """
        Remove data from the context.
        
        Args:
            key: Data key
        """
        if key in self.data:
            del self.data[key]
            self.updated_at = datetime.now().isoformat()
    
    def clear_data(self) -> None:
        """Clear all data from the context."""
        self.data = {}
        self.updated_at = datetime.now().isoformat()
    
    def serialize(self) -> Dict[str, Any]:
        """
        Serialize the context to a dictionary.
        
        Returns:
            Serialized context
        """
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_id": self.session_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "data": self.data
        }
    
    def __str__(self) -> str:
        """
        Get string representation of the context.
        
        Returns:
            String representation
        """
        return f"Context(id={self.id}, user_id={self.user_id}, session_id={self.session_id})"

class ContextManager:
    """Manager for context objects."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize a context manager.
        
        Args:
            db_path: Path to SQLite database (optional, defaults to data/context.db)
        """
        # Create data directory if it doesn't exist
        data_dir = os.environ.get("VANA_DATA_DIR", os.path.join(os.getcwd(), "data"))
        os.makedirs(data_dir, exist_ok=True)
        
        # Set database path
        self.db_path = db_path or os.path.join(data_dir, "context.db")
        
        # Initialize database
        self._init_db()
        
        # In-memory cache
        self.cache = {}
    
    def _init_db(self) -> None:
        """Initialize the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create context table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS contexts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            data TEXT NOT NULL
        )
        """)
        
        conn.commit()
        conn.close()
    
    def create_context(self, user_id: str, session_id: str) -> Context:
        """
        Create a new context.
        
        Args:
            user_id: User ID
            session_id: Session ID
            
        Returns:
            New context object
        """
        context = Context(user_id, session_id)
        self.cache[context.id] = context
        return context
    
    def get_context(self, context_id: str) -> Optional[Context]:
        """
        Get a context by ID.
        
        Args:
            context_id: Context ID
            
        Returns:
            Context object or None if not found
        """
        # Check cache
        if context_id in self.cache:
            return self.cache[context_id]
        
        # Load from database
        return self.load_context(context_id)
    
    def save_context(self, context: Context) -> bool:
        """
        Save a context to the database.
        
        Args:
            context: Context object
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Serialize data
            data_json = json.dumps(context.data)
            
            # Insert or update context
            cursor.execute("""
            INSERT OR REPLACE INTO contexts (id, user_id, session_id, created_at, updated_at, data)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                context.id,
                context.user_id,
                context.session_id,
                context.created_at,
                context.updated_at,
                data_json
            ))
            
            conn.commit()
            conn.close()
            
            # Update cache
            self.cache[context.id] = context
            
            return True
        except Exception as e:
            logger.error(f"Error saving context: {e}")
            return False
    
    def load_context(self, context_id: str) -> Optional[Context]:
        """
        Load a context from the database.
        
        Args:
            context_id: Context ID
            
        Returns:
            Context object or None if not found
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query context
            cursor.execute("""
            SELECT id, user_id, session_id, created_at, updated_at, data
            FROM contexts
            WHERE id = ?
            """, (context_id,))
            
            row = cursor.fetchone()
            
            conn.close()
            
            if row:
                # Create context object
                context = Context(row[1], row[2], row[0])
                context.created_at = row[3]
                context.updated_at = row[4]
                context.data = json.loads(row[5])
                
                # Update cache
                self.cache[context.id] = context
                
                return context
            
            return None
        except Exception as e:
            logger.error(f"Error loading context: {e}")
            return None
    
    def delete_context(self, context_id: str) -> bool:
        """
        Delete a context from the database.
        
        Args:
            context_id: Context ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete context
            cursor.execute("""
            DELETE FROM contexts
            WHERE id = ?
            """, (context_id,))
            
            conn.commit()
            conn.close()
            
            # Remove from cache
            if context_id in self.cache:
                del self.cache[context_id]
            
            return True
        except Exception as e:
            logger.error(f"Error deleting context: {e}")
            return False
    
    def list_contexts(self, user_id: Optional[str] = None, session_id: Optional[str] = None) -> List[Context]:
        """
        List contexts from the database.
        
        Args:
            user_id: Filter by user ID (optional)
            session_id: Filter by session ID (optional)
            
        Returns:
            List of context objects
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build query
            query = "SELECT id, user_id, session_id, created_at, updated_at, data FROM contexts"
            params = []
            
            if user_id or session_id:
                query += " WHERE"
                
                if user_id:
                    query += " user_id = ?"
                    params.append(user_id)
                    
                    if session_id:
                        query += " AND session_id = ?"
                        params.append(session_id)
                elif session_id:
                    query += " session_id = ?"
                    params.append(session_id)
            
            # Query contexts
            cursor.execute(query, params)
            
            rows = cursor.fetchall()
            
            conn.close()
            
            # Create context objects
            contexts = []
            
            for row in rows:
                context = Context(row[1], row[2], row[0])
                context.created_at = row[3]
                context.updated_at = row[4]
                context.data = json.loads(row[5])
                
                # Update cache
                self.cache[context.id] = context
                
                contexts.append(context)
            
            return contexts
        except Exception as e:
            logger.error(f"Error listing contexts: {e}")
            return []
    
    def clear_cache(self) -> None:
        """Clear the context cache."""
        self.cache = {}
    
    def deserialize(self, serialized: Dict[str, Any]) -> Context:
        """
        Deserialize a context from a dictionary.
        
        Args:
            serialized: Serialized context
            
        Returns:
            Context object
        """
        context = Context(
            serialized["user_id"],
            serialized["session_id"],
            serialized["id"]
        )
        
        context.created_at = serialized["created_at"]
        context.updated_at = serialized["updated_at"]
        context.data = serialized["data"]
        
        return context
