#!/usr/bin/env python3
"""
ADK Wrapper to handle import issues

This wrapper provides access to ADK functionality regardless of the import path.
It attempts multiple import strategies to ensure compatibility.
"""

import os
import sys
import logging
import importlib
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class ADKWrapper:
    """Wrapper for ADK functionality that handles import issues."""
    
    def __init__(self):
        self.adk_module = None
        self.agent_module = None
        self._initialize()
    
    def _initialize(self):
        """Initialize the ADK wrapper by trying multiple import strategies."""
        # Strategy 1: Direct import
        try:
            import google.adk
            self.adk_module = google.adk
            logger.info("Imported ADK directly from google.adk")
            return
        except ImportError:
            logger.warning("Failed to import google.adk directly")
        
        # Strategy 2: Import through google.cloud.aiplatform
        try:
            from google.cloud import aiplatform
            if hasattr(aiplatform, 'adk'):
                self.adk_module = aiplatform.adk
                logger.info("Imported ADK from google.cloud.aiplatform.adk")
                return
        except ImportError:
            logger.warning("Failed to import google.cloud.aiplatform")
        
        # Strategy 3: Try aiplatform.agents for direct agent access
        try:
            from google.cloud.aiplatform import agents
            self.agent_module = agents
            logger.info("Imported agents from google.cloud.aiplatform.agents")
            return
        except ImportError:
            logger.warning("Failed to import google.cloud.aiplatform.agents")
        
        logger.error("All ADK import strategies failed")
    
    def create_agent(self, *args, **kwargs):
        """Create an agent using the available module."""
        if self.adk_module and hasattr(self.adk_module, 'create_agent'):
            return self.adk_module.create_agent(*args, **kwargs)
        elif self.agent_module and hasattr(self.agent_module, 'create_agent'):
            return self.agent_module.create_agent(*args, **kwargs)
        else:
            raise ImportError("No ADK module available to create agent")
    
    def run_agent(self, agent, *args, **kwargs):
        """Run an agent using the available module."""
        if hasattr(agent, 'run'):
            return agent.run(*args, **kwargs)
        else:
            raise AttributeError("Agent does not have 'run' method")
    
    def is_available(self) -> bool:
        """Check if ADK functionality is available."""
        return self.adk_module is not None or self.agent_module is not None

# Singleton instance
adk = ADKWrapper()

# Test functionality
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    if adk.is_available():
        print("✅ ADK wrapper initialized successfully")
        print(f"ADK module: {adk.adk_module}")
        print(f"Agent module: {adk.agent_module}")
    else:
        print("❌ ADK wrapper failed to initialize")
        sys.exit(1)
