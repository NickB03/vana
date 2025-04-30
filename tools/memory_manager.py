import logging
import time
from typing import Dict, List, Any, Optional
from .mcp_memory_client import MCPMemoryClient

logger = logging.getLogger(__name__)

class MemoryManager:
    """Manages knowledge graph memory operations."""
    
    def __init__(self, mcp_client: MCPMemoryClient, 
                 sync_interval: int = 300):
        self.mcp_client = mcp_client
        self.local_cache = {}
        self.sync_interval = sync_interval  # in seconds
        self.last_sync_time = 0
    
    def initialize(self) -> bool:
        """Initialize the memory manager with initial data."""
        try:
            initial_data = self.mcp_client.get_initial_data()
            self._process_initial_data(initial_data)
            self.last_sync_time = time.time()
            return True
        except Exception as e:
            logger.error(f"Error initializing memory manager: {e}")
            return False
    
    def sync_if_needed(self) -> bool:
        """Sync with memory server if interval has passed."""
        current_time = time.time()
        if current_time - self.last_sync_time >= self.sync_interval:
            return self.sync()
        return True
    
    def sync(self) -> bool:
        """Synchronize with memory server using delta updates."""
        try:
            delta_data = self.mcp_client.sync_delta()
            self._process_delta(delta_data)
            self.last_sync_time = time.time()
            return True
        except Exception as e:
            logger.error(f"Error syncing memory: {e}")
            return False
    
    def _process_initial_data(self, data: Dict[str, Any]) -> None:
        """Process initial data from memory server."""
        if "entities" in data:
            for entity in data["entities"]:
                entity_id = entity.get("id")
                if entity_id:
                    self.local_cache[entity_id] = entity
        
        logger.info(f"Loaded {len(self.local_cache)} entities into cache")
    
    def _process_delta(self, delta: Dict[str, Any]) -> None:
        """Process delta updates from memory server."""
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
        
        logger.info(f"Processed delta: {len(added)} added, "
                    f"{len(modified)} modified, {len(deleted)} deleted")
