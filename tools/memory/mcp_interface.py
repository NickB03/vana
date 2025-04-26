import os
import requests
import logging
from datetime import datetime
from .buffer_manager import MemoryBufferManager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryMCP:
    def __init__(self, buffer_manager=None):
        self.buffer_manager = buffer_manager or MemoryBufferManager()
        self.webhook_url = os.environ.get("N8N_WEBHOOK_URL")
        
        if not self.webhook_url:
            logger.warning("N8N_WEBHOOK_URL not set in environment variables")
            
        self.webhook_auth = None
        webhook_user = os.environ.get("N8N_WEBHOOK_USER")
        webhook_password = os.environ.get("N8N_WEBHOOK_PASSWORD")
        
        if webhook_user and webhook_password:
            self.webhook_auth = (webhook_user, webhook_password)
        
    def handle_command(self, command):
        """Handle memory-related commands"""
        command = command.strip().lower()
        
        if command == "!memory_on":
            self.buffer_manager.start_recording()
            return "Memory recording started. All conversations will be buffered until saved with !rag or discarded with !memory_off."
        
        elif command == "!memory_off":
            self.buffer_manager.stop_recording()
            buffer_size = len(self.buffer_manager.get_buffer())
            self.buffer_manager.clear()
            return f"Memory recording stopped. Buffer cleared ({buffer_size} messages discarded)."
        
        elif command == "!rag":
            if not self.buffer_manager.memory_on:
                return "Error: Memory recording is not active. Use !memory_on first to start recording."
            
            buffer = self.buffer_manager.get_buffer()
            if not buffer:
                return "Error: Memory buffer is empty. Have a conversation first before saving."
                
            response = self._trigger_save_workflow(buffer)
            
            if response and response.get("success"):
                self.buffer_manager.clear()
                return response.get("message", "Memory saved to knowledge base.")
            else:
                error_msg = response.get("message", "Unknown error") if response else "Failed to connect to webhook"
                return f"Error saving memory: {error_msg}"
        
        return f"Unknown command: {command}"
    
    def _trigger_save_workflow(self, buffer):
        """Trigger n8n workflow to save memory"""
        if not self.webhook_url:
            logger.error("Cannot trigger workflow: N8N_WEBHOOK_URL not set")
            return None
            
        payload = {
            "buffer": buffer,
            "memory_on": self.buffer_manager.memory_on,
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            logger.info(f"Triggering webhook at {self.webhook_url}")
            response = requests.post(
                self.webhook_url, 
                json=payload,
                auth=self.webhook_auth,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error triggering save workflow: {e}")
            return None
