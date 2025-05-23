"""
Workflow Interface for VANA.

This module provides a consistent interface for workflow operations, with or without n8n.
"""

import os
import logging
import requests
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

class WorkflowInterface:
    """Interface for workflow management, with or without n8n."""
    
    def __init__(self):
        """Initialize workflow interface."""
        self.n8n_url = os.environ.get("N8N_WEBHOOK_URL", "")
        self.n8n_username = os.environ.get("N8N_WEBHOOK_USERNAME", "")
        self.n8n_password = os.environ.get("N8N_WEBHOOK_PASSWORD", "")
        self.n8n_available = self._check_n8n_available() if self.n8n_url else False
        
        if not self.n8n_available:
            logger.info("n8n not available. Using direct implementation for workflows.")
        else:
            logger.info(f"n8n available at {self.n8n_url}. Using n8n for workflows.")
    
    def _check_n8n_available(self) -> bool:
        """Check if n8n is available."""
        try:
            response = requests.get(f"{self.n8n_url}/healthz", timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"n8n not available: {e}")
            return False
    
    def trigger_memory_save(self, buffer: List[Dict[str, str]], tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Trigger memory save workflow.
        
        Args:
            buffer: List of messages to save
            tags: Optional list of tags to apply
            
        Returns:
            Dict with result information
        """
        if self.n8n_available:
            # Use n8n webhook
            return self._trigger_n8n_workflow("save-memory", {
                "buffer": buffer,
                "tags": tags or [],
                "memory_on": True
            })
        else:
            # Direct implementation
            from vana.memory import MemoryManager
            memory_manager = MemoryManager()
            return memory_manager.save_buffer(buffer, tags)
    
    def trigger_memory_sync(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """Trigger memory sync workflow.
        
        Args:
            user_id: User ID to sync memory for
            session_id: Session ID to sync memory for
            
        Returns:
            Dict with result information
        """
        if self.n8n_available:
            # Use n8n webhook
            return self._trigger_n8n_workflow("memory-sync", {
                "user_id": user_id,
                "session_id": session_id
            })
        else:
            # Direct implementation
            from vana.memory import MemoryManager
            memory_manager = MemoryManager()
            return memory_manager.sync_memory(user_id, session_id)
    
    def trigger_knowledge_graph_sync(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Trigger knowledge graph sync workflow.
        
        Args:
            entities: List of entities to sync
            
        Returns:
            Dict with result information
        """
        if self.n8n_available:
            # Use n8n webhook
            return self._trigger_n8n_workflow("kg-sync", {
                "entities": entities
            })
        else:
            # Direct implementation
            from vana.knowledge_graph import KnowledgeGraphManager
            kg_manager = KnowledgeGraphManager()
            return kg_manager.sync_entities(entities)
    
    def trigger_document_processing(self, document_path: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Trigger document processing workflow.
        
        Args:
            document_path: Path to document to process
            options: Optional processing options
            
        Returns:
            Dict with result information
        """
        if self.n8n_available:
            # Use n8n webhook
            return self._trigger_n8n_workflow("document-processing", {
                "document_path": document_path,
                "options": options or {}
            })
        else:
            # Direct implementation
            from vana.document_processing import DocumentProcessor
            document_processor = DocumentProcessor()
            return document_processor.process(document_path, options)
    
    def _trigger_n8n_workflow(self, workflow_name: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger n8n workflow via webhook.
        
        Args:
            workflow_name: Name of workflow to trigger
            data: Data to send to workflow
            
        Returns:
            Dict with result information
        """
        try:
            webhook_url = f"{self.n8n_url}/webhook/{workflow_name}"
            
            # Use basic auth if credentials are provided
            auth = None
            if self.n8n_username and self.n8n_password:
                auth = (self.n8n_username, self.n8n_password)
            
            response = requests.post(
                webhook_url,
                json=data,
                headers={"Content-Type": "application/json"},
                auth=auth,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                error_msg = f"n8n workflow error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return {"error": f"Workflow failed with status {response.status_code}"}
        except Exception as e:
            error_msg = f"Error triggering n8n workflow: {e}"
            logger.error(error_msg)
            return {"error": str(e)}
