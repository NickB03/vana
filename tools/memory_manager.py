import json
import logging
import os
import sqlite3
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from .mcp_memory_client import MCPMemoryClient

# Import environment configuration
try:
    from config.environment import EnvironmentConfig
except ImportError:
    # Fallback if config module is not available
    class EnvironmentConfig:
        @staticmethod
        def get_memory_config():
            return {
                "sync_interval": int(os.environ.get("MEMORY_SYNC_INTERVAL", "300")),
                "cache_size": int(os.environ.get("MEMORY_CACHE_SIZE", "1000")),
                "cache_ttl": int(os.environ.get("MEMORY_CACHE_TTL", "3600")),
                "entity_half_life_days": int(os.environ.get("ENTITY_HALF_LIFE_DAYS", "30")),
                "local_db_path": os.path.join(os.environ.get("VANA_DATA_DIR", "."), "memory_cache.db"),
            }


logger = logging.getLogger(__name__)


class MemoryManager:
    """Manages knowledge graph memory operations with local fallback."""

    def __init__(self, mcp_client: MCPMemoryClient, sync_interval: int = None):
        """
        Initialize the memory manager.

        Args:
            mcp_client: MCP Memory Client instance
            sync_interval: Interval in seconds between syncs (optional, defaults to config)
        """
        self.mcp_client = mcp_client
        self.local_cache = {}

        # Get configuration
        memory_config = EnvironmentConfig.get_memory_config()
        self.sync_interval = sync_interval or memory_config["sync_interval"]
        self.local_db_path = memory_config["local_db_path"]

        self.last_sync_time = 0
        self.mcp_available = self.mcp_client.is_available

        # Initialize local database
        self._init_local_db()

    def _init_local_db(self) -> None:
        """Initialize local SQLite database for fallback storage."""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.local_db_path), exist_ok=True)

            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()

            # Create tables if they don't exist
            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS entities (
                id TEXT PRIMARY KEY,
                name TEXT,
                type TEXT,
                data TEXT,
                modified_at TEXT
            )
            """
            )

            cursor.execute(
                """
            CREATE TABLE IF NOT EXISTS relationships (
                id TEXT PRIMARY KEY,
                from_entity TEXT,
                relationship TEXT,
                to_entity TEXT,
                modified_at TEXT,
                FOREIGN KEY (from_entity) REFERENCES entities (id),
                FOREIGN KEY (to_entity) REFERENCES entities (id)
            )
            """
            )

            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_entities_name ON entities (name)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_entities_type ON entities (type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships (from_entity)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships (to_entity)")

            conn.commit()
            conn.close()
            logger.info("Local memory database initialized at %s", self.local_db_path)
        except Exception as e:
            logger.error("Error initializing local database: %s", e)

    def initialize(self) -> bool:
        """
        Initialize the memory manager with initial data.

        Returns:
            bool: True if initialization was successful, False otherwise
        """
        try:
            # Try to initialize from MCP server
            if self.mcp_client.is_available:
                logger.info("Initializing from MCP server")
                initial_data = self.mcp_client.get_initial_data()

                if "error" in initial_data:
                    logger.warning("Error getting data from MCP server: %s", initial_data["error"])
                    self.mcp_available = False
                    # Load from local database instead
                    self._load_from_local_db()
                else:
                    self._process_initial_data(initial_data)
                    self.last_sync_time = time.time()
                    self.mcp_available = True
                    # Update local database with fetched data
                    self._update_local_db()
            else:
                logger.warning("MCP server not available, loading from local database")
                self.mcp_available = False
                self._load_from_local_db()

            return True
        except Exception as e:
            logger.error("Error initializing memory manager: %s", e)
            self.mcp_available = False
            # Try to load from local database as fallback
            try:
                self._load_from_local_db()
                return True
            except Exception as load_error:
                logger.error("Error loading from local database: %s", load_error)
                return False

    def sync_if_needed(self) -> bool:
        """
        Sync with memory server if interval has passed.

        Returns:
            bool: True if sync was successful or not needed, False otherwise
        """
        current_time = time.time()
        if current_time - self.last_sync_time >= self.sync_interval:
            return self.sync()
        return True

    def sync(self) -> bool:
        """
        Synchronize with memory server using delta updates.

        Returns:
            bool: True if sync was successful, False otherwise
        """
        try:
            if not self.mcp_client.is_available:
                logger.warning("MCP server not available, skipping sync")
                self.mcp_available = False
                return False

            delta_data = self.mcp_client.sync_delta()

            if "error" in delta_data:
                logger.warning("Error syncing with MCP server: %s", delta_data["error"])
                self.mcp_available = False
                return False

            self._process_delta(delta_data)
            self.last_sync_time = time.time()
            self.mcp_available = True

            # Update local database with changes
            self._update_local_db()

            return True
        except Exception as e:
            logger.error("Error syncing memory: %s", e)
            self.mcp_available = False
            return False

    def store_entity(self, entity_name: str, entity_type: str, observations: List[str]) -> Dict[str, Any]:
        """
        Store an entity in memory.

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            observations: List of observations about the entity

        Returns:
            Dict containing operation result
        """
        try:
            # Try to store in MCP server first
            if self.mcp_client.is_available:
                result = self.mcp_client.store_entity(entity_name, entity_type, observations)

                if "error" not in result:
                    # If successful, update local cache and database
                    if "entity" in result:
                        entity = result["entity"]
                        entity_id = entity.get("id")
                        if entity_id:
                            self.local_cache[entity_id] = entity
                            self._store_entity_in_db(entity)
                    return result

            # If MCP server is not available or operation failed, store locally
            self.mcp_available = False
            entity_id = str(uuid.uuid4())
            timestamp = datetime.now().isoformat()

            entity = {
                "id": entity_id,
                "name": entity_name,
                "type": entity_type,
                "observations": observations,
                "created_at": timestamp,
                "modified_at": timestamp,
            }

            self.local_cache[entity_id] = entity
            self._store_entity_in_db(entity)

            return {"success": True, "entity": entity, "message": "Entity stored locally (MCP server not available)"}
        except Exception as e:
            logger.error("Error storing entity: %s", e)
            return {"error": str(e), "success": False}

    def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
        """
        Retrieve an entity from memory.

        Args:
            entity_name: Name of the entity to retrieve

        Returns:
            Dict containing the entity data or error
        """
        try:
            # Try to retrieve from MCP server first
            if self.mcp_client.is_available:
                result = self.mcp_client.retrieve_entity(entity_name)

                if "error" not in result:
                    return result

            # If MCP server is not available or operation failed, retrieve locally
            self.mcp_available = False

            # First check local cache
            for entity_id, entity in self.local_cache.items():
                if entity.get("name") == entity_name:
                    return {"success": True, "entity": entity}

            # If not in cache, check local database
            entity = self._retrieve_entity_from_db(entity_name)

            if entity:
                # Add to cache
                self.local_cache[entity["id"]] = entity
                return {"success": True, "entity": entity}

            return {"error": f"Entity '{entity_name}' not found", "success": False}
        except Exception as e:
            logger.error("Error retrieving entity: %s", e)
            return {"error": str(e), "success": False}

    def search_entities(self, query: str, entity_type: str = None, limit: int = 10) -> Dict[str, Any]:
        """
        Search for entities in memory.

        Args:
            query: Search query
            entity_type: Optional entity type to filter by
            limit: Maximum number of results to return

        Returns:
            Dict containing search results
        """
        try:
            # Try to search in MCP server first
            if self.mcp_client.is_available:
                result = self.mcp_client.search_entities(query, entity_type, limit)

                if "error" not in result:
                    return result

            # If MCP server is not available or operation failed, search locally
            self.mcp_available = False

            # Simple local search implementation
            results = []

            # Search in local cache first
            for entity_id, entity in self.local_cache.items():
                if self._entity_matches_query(entity, query, entity_type):
                    results.append(entity)
                    if len(results) >= limit:
                        break

            # If not enough results, search in local database
            if len(results) < limit:
                db_results = self._search_entities_in_db(query, entity_type, limit - len(results))

                for entity in db_results:
                    # Add to cache
                    self.local_cache[entity["id"]] = entity
                    results.append(entity)

            return {"success": True, "entities": results}
        except Exception as e:
            logger.error("Error searching entities: %s", e)
            return {"error": str(e), "success": False}

    def _process_initial_data(self, data: Dict[str, Any]) -> None:
        """
        Process initial data from memory server.

        Args:
            data: Initial data from MCP server
        """
        if "entities" in data:
            for entity in data["entities"]:
                entity_id = entity.get("id")
                if entity_id:
                    self.local_cache[entity_id] = entity

        logger.info("Loaded %d entities into cache", len(self.local_cache))

    def _process_delta(self, delta: Dict[str, Any]) -> None:
        """
        Process delta updates from memory server.

        Args:
            delta: Delta data from MCP server
        """
        # Process added entities
        added = delta.get("added", [])
        for entity in added:
            entity_id = entity.get("id")
            if entity_id:
                self.local_cache[entity_id] = entity

        # Process modified entities
        modified = delta.get("modified", [])
        for entity in modified:
            entity_id = entity.get("id")
            if entity_id:
                self.local_cache[entity_id] = entity

        # Process deleted entities
        deleted = delta.get("deleted", [])
        for entity_id in deleted:
            if entity_id in self.local_cache:
                del self.local_cache[entity_id]

        logger.info("Processed delta: %d added, %d modified, %d deleted", len(added), len(modified), len(deleted))

    def _load_from_local_db(self) -> None:
        """Load data from local SQLite database."""
        try:
            conn = sqlite3.connect(self.local_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Load entities
            cursor.execute("SELECT * FROM entities")
            entities = cursor.fetchall()

            for entity_row in entities:
                entity_id = entity_row["id"]
                entity_data = json.loads(entity_row["data"])
                self.local_cache[entity_id] = entity_data

            conn.close()
            logger.info("Loaded %d entities from local database", len(self.local_cache))
        except Exception as e:
            logger.error("Error loading from local database: %s", e)
            # Initialize empty cache if loading fails
            self.local_cache = {}

    def _update_local_db(self) -> None:
        """Update local database with current cache data."""
        if not self.local_cache:
            return

        try:
            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()

            # Update entities
            for entity_id, entity in self.local_cache.items():
                cursor.execute(
                    "INSERT OR REPLACE INTO entities (id, name, type, data, modified_at) VALUES (?, ?, ?, ?, ?)",
                    (
                        entity_id,
                        entity.get("name", ""),
                        entity.get("type", ""),
                        json.dumps(entity),
                        datetime.now().isoformat(),
                    ),
                )

            conn.commit()
            conn.close()
            logger.info("Updated local database with %d entities", len(self.local_cache))
        except Exception as e:
            logger.error("Error updating local database: %s", e)

    def _store_entity_in_db(self, entity: Dict[str, Any]) -> None:
        """
        Store an entity in the local database.

        Args:
            entity: Entity data to store
        """
        try:
            conn = sqlite3.connect(self.local_db_path)
            cursor = conn.cursor()

            cursor.execute(
                "INSERT OR REPLACE INTO entities (id, name, type, data, modified_at) VALUES (?, ?, ?, ?, ?)",
                (
                    entity.get("id", ""),
                    entity.get("name", ""),
                    entity.get("type", ""),
                    json.dumps(entity),
                    datetime.now().isoformat(),
                ),
            )

            conn.commit()
            conn.close()
        except Exception as e:
            logger.error("Error storing entity in local database: %s", e)

    def _retrieve_entity_from_db(self, entity_name: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve an entity from the local database.

        Args:
            entity_name: Name of the entity to retrieve

        Returns:
            Entity data or None if not found
        """
        try:
            conn = sqlite3.connect(self.local_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            cursor.execute("SELECT data FROM entities WHERE name = ?", (entity_name,))
            result = cursor.fetchone()

            conn.close()

            if result:
                return json.loads(result["data"])

            return None
        except Exception as e:
            logger.error("Error retrieving entity from local database: %s", e)
            return None

    def _search_entities_in_db(self, query: str, entity_type: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search for entities in the local database.

        Args:
            query: Search query
            entity_type: Optional entity type to filter by
            limit: Maximum number of results to return

        Returns:
            List of matching entities
        """
        try:
            conn = sqlite3.connect(self.local_db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            if entity_type:
                cursor.execute(
                    "SELECT data FROM entities WHERE name LIKE ? AND type = ? LIMIT ?",
                    (f"%{query}%", entity_type, limit),
                )
            else:
                cursor.execute("SELECT data FROM entities WHERE name LIKE ? LIMIT ?", (f"%{query}%", limit))

            results = cursor.fetchall()

            conn.close()

            return [json.loads(result["data"]) for result in results]
        except Exception as e:
            logger.error("Error searching entities in local database: %s", e)
            return []

    def _entity_matches_query(self, entity: Dict[str, Any], query: str, entity_type: str = None) -> bool:
        """
        Check if an entity matches a search query.

        Args:
            entity: Entity data
            query: Search query
            entity_type: Optional entity type to filter by

        Returns:
            True if entity matches query, False otherwise
        """
        # Check entity type if specified
        if entity_type and entity.get("type") != entity_type:
            return False

        # Check if query is in entity name
        if query.lower() in entity.get("name", "").lower():
            return True

        # Check if query is in observations
        for observation in entity.get("observations", []):
            if query.lower() in observation.lower():
                return True

        return False
