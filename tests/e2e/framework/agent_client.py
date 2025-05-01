"""
Agent Client for VANA End-to-End Tests.

This module provides a client for interacting with VANA agents in end-to-end tests.
"""

import os
import sys
import logging
import json
import time
import requests
from datetime import datetime

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

logger = logging.getLogger(__name__)

class AgentClient:
    """Client for interacting with VANA agents in end-to-end tests."""
    
    def __init__(self, base_url=None, timeout=30):
        """
        Initialize the agent client.
        
        Args:
            base_url (str): Base URL for the agent API.
            timeout (int): Timeout for API requests in seconds.
        """
        self.base_url = base_url or "http://localhost:8000/api"
        self.timeout = timeout
        self.session = requests.Session()
    
    def send_message(self, agent_id, message, session_id=None):
        """
        Send a message to an agent.
        
        Args:
            agent_id (str): ID of the agent to send the message to.
            message (str): Message to send.
            session_id (str): Session ID for the conversation.
        
        Returns:
            dict: Response from the agent.
        """
        url = f"{self.base_url}/agents/{agent_id}/messages"
        
        payload = {
            "message": message
        }
        
        if session_id:
            payload["session_id"] = session_id
        
        try:
            logger.info(f"Sending message to agent {agent_id}: {message}")
            response = self.session.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error sending message to agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_agent_status(self, agent_id):
        """
        Get the status of an agent.
        
        Args:
            agent_id (str): ID of the agent to get status for.
        
        Returns:
            dict: Agent status.
        """
        url = f"{self.base_url}/agents/{agent_id}/status"
        
        try:
            logger.info(f"Getting status for agent {agent_id}")
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting status for agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_conversation_history(self, session_id):
        """
        Get the conversation history for a session.
        
        Args:
            session_id (str): Session ID for the conversation.
        
        Returns:
            list: Conversation history.
        """
        url = f"{self.base_url}/sessions/{session_id}/history"
        
        try:
            logger.info(f"Getting conversation history for session {session_id}")
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error getting conversation history for session {session_id}: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def create_session(self):
        """
        Create a new session.
        
        Returns:
            str: Session ID.
        """
        url = f"{self.base_url}/sessions"
        
        try:
            logger.info("Creating new session")
            response = self.session.post(url, timeout=self.timeout)
            response.raise_for_status()
            return response.json().get("session_id")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error creating session: {e}")
            return None
    
    def end_session(self, session_id):
        """
        End a session.
        
        Args:
            session_id (str): Session ID to end.
        
        Returns:
            bool: True if successful, False otherwise.
        """
        url = f"{self.base_url}/sessions/{session_id}"
        
        try:
            logger.info(f"Ending session {session_id}")
            response = self.session.delete(url, timeout=self.timeout)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            logger.error(f"Error ending session {session_id}: {e}")
            return False
    
    def wait_for_agent_response(self, agent_id, session_id, timeout=60, poll_interval=1):
        """
        Wait for an agent to respond to a message.
        
        Args:
            agent_id (str): ID of the agent to wait for.
            session_id (str): Session ID for the conversation.
            timeout (int): Maximum time to wait in seconds.
            poll_interval (int): Time between polls in seconds.
        
        Returns:
            dict: Agent response or None if timeout.
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            history = self.get_conversation_history(session_id)
            
            if isinstance(history, dict) and not history.get("success", True):
                logger.error(f"Error getting conversation history: {history.get('error')}")
                return None
            
            # Check if there's a response from the agent
            for message in reversed(history):
                if message.get("sender") == agent_id:
                    return message
            
            # Wait before polling again
            time.sleep(poll_interval)
        
        logger.warning(f"Timeout waiting for response from agent {agent_id}")
        return None
    
    def simulate_conversation(self, agent_id, messages, session_id=None, wait_for_response=True):
        """
        Simulate a conversation with an agent.
        
        Args:
            agent_id (str): ID of the agent to converse with.
            messages (list): List of messages to send.
            session_id (str): Session ID for the conversation.
            wait_for_response (bool): Whether to wait for agent responses.
        
        Returns:
            dict: Conversation results.
        """
        # Create a new session if none is provided
        if not session_id:
            session_id = self.create_session()
            if not session_id:
                return {
                    "success": False,
                    "error": "Failed to create session"
                }
        
        conversation = []
        
        try:
            for message in messages:
                # Send the message
                self.send_message(agent_id, message, session_id)
                
                # Add the message to the conversation
                conversation.append({
                    "sender": "user",
                    "message": message,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Wait for the agent's response
                if wait_for_response:
                    response = self.wait_for_agent_response(agent_id, session_id)
                    if response:
                        conversation.append(response)
            
            return {
                "success": True,
                "session_id": session_id,
                "conversation": conversation
            }
        
        except Exception as e:
            logger.error(f"Error simulating conversation with agent {agent_id}: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id,
                "conversation": conversation
            }
