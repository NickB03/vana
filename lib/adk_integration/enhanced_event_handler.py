"""
Enhanced Event Handler with Improved Transfer Detection

This module provides better handling of transfer messages and event conversion.
"""

import json
import logging
import re
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class TransferPatternMatcher:
    """Advanced pattern matching for transfer messages"""
    
    def __init__(self):
        # Compile regex patterns for better performance
        self.json_pattern = re.compile(r'^\s*\{.*\}\s*$', re.DOTALL)
        self.transfer_phrases = [
            r'transferring (?:you )?to (?:the )?(\w+)',
            r'routing to (?:the )?(\w+)',
            r'handing off to (?:the )?(\w+)',
            r'moving (?:you )?to (?:the )?(\w+)',
            r'delegating to (?:the )?(\w+)'
        ]
        self.compiled_phrases = [re.compile(p, re.IGNORECASE) for p in self.transfer_phrases]
        
    def is_transfer_message(self, text: str) -> bool:
        """Enhanced transfer message detection"""
        if not text or not text.strip():
            return False
            
        text = text.strip()
        
        # Check JSON patterns first (most reliable)
        if self._is_json_transfer(text):
            return True
            
        # Check for transfer phrases
        if self._contains_transfer_phrase(text):
            return True
            
        return False
        
    def _is_json_transfer(self, text: str) -> bool:
        """Check if text is a JSON transfer message"""
        if not self.json_pattern.match(text):
            return False
            
        try:
            data = json.loads(text)
            if not isinstance(data, dict):
                return False
                
            # Check for transfer indicators in JSON
            transfer_keys = {'action', 'target_agent', 'agent_name', 'agent', 'transfer'}
            transfer_values = {'transfer_conversation', 'transfer', 'delegate', 'route'}
            
            # Check keys
            if any(key in data for key in transfer_keys):
                # Check if action indicates transfer
                action = data.get('action', '').lower()
                if any(val in action for val in transfer_values):
                    return True
                    
                # If has agent-related keys, likely a transfer
                if any(key in data for key in ['target_agent', 'agent_name', 'agent']):
                    return True
                    
            # Check for nested transfer info
            if 'transfer' in str(data).lower():
                return True
                
        except json.JSONDecodeError:
            pass
            
        return False
        
    def _contains_transfer_phrase(self, text: str) -> bool:
        """Check if text contains transfer phrases"""
        text_lower = text.lower()
        
        # Quick check for common keywords
        transfer_keywords = [
            'transferring', 'routing', 'handing off', 'delegating',
            'transfer to', 'route to', 'hand off to'
        ]
        
        if not any(keyword in text_lower for keyword in transfer_keywords):
            return False
            
        # Check compiled patterns
        for pattern in self.compiled_phrases:
            if pattern.search(text):
                return True
                
        return False
        
    def extract_agent_info(self, text: str) -> Optional[Dict[str, str]]:
        """Extract agent information from transfer message"""
        # Try JSON extraction first
        try:
            if self.json_pattern.match(text.strip()):
                data = json.loads(text.strip())
                if isinstance(data, dict):
                    agent = (data.get('target_agent') or 
                            data.get('agent_name') or 
                            data.get('agent', ''))
                    context = data.get('context', '')
                    
                    if agent:
                        return {
                            'agent': agent,
                            'context': context,
                            'type': 'json'
                        }
        except:
            pass
            
        # Try phrase extraction
        for pattern in self.compiled_phrases:
            match = pattern.search(text)
            if match:
                agent = match.group(1)
                return {
                    'agent': agent,
                    'context': text,
                    'type': 'phrase'
                }
                
        return None


class EnhancedEventConverter:
    """Enhanced converter for ADK events to UI events"""
    
    def __init__(self):
        self.pattern_matcher = TransferPatternMatcher()
        self.specialist_map = {
            'security': 'Security Specialist',
            'architecture': 'Architecture Specialist', 
            'data': 'Data Science Specialist',
            'qa': 'QA Specialist',
            'ui': 'UI/UX Specialist',
            'devops': 'DevOps Specialist',
            'enhanced_orchestrator': 'Enhanced Orchestrator'
        }
        
    def convert_to_ui_event(self, text: str, event_context: Dict = None) -> List[Dict]:
        """Convert text/event to UI events"""
        events = []
        
        # Check if this is a transfer message
        if self.pattern_matcher.is_transfer_message(text):
            # Extract agent info
            agent_info = self.pattern_matcher.extract_agent_info(text)
            
            if agent_info:
                # Create internal routing event
                agent_name = agent_info['agent']
                description = self._get_specialist_description(agent_name)
                
                events.append({
                    'type': 'agent_active',
                    'agent': agent_name,
                    'content': f'{description} analyzing request...',
                    'internal': True,  # Don't show in chat
                    'timestamp': datetime.now().isoformat()
                })
                
                # Don't include the transfer message in content
                return events
                
        # Not a transfer message - return as content
        if text and text.strip():
            events.append({
                'type': 'content',
                'content': text,
                'timestamp': datetime.now().isoformat()
            })
            
        return events
        
    def _get_specialist_description(self, agent_name: str) -> str:
        """Get human-readable description for specialist"""
        agent_lower = agent_name.lower()
        
        for key, description in self.specialist_map.items():
            if key in agent_lower:
                return description
                
        # Default formatting
        return agent_name.replace('_', ' ').title()


# Global instances for easy import
transfer_matcher = TransferPatternMatcher()
event_converter = EnhancedEventConverter()


def is_transfer_message(text: str) -> bool:
    """Check if text is a transfer message"""
    return transfer_matcher.is_transfer_message(text)


def convert_to_ui_events(text: str, context: Dict = None) -> List[Dict]:
    """Convert text to UI events"""
    return event_converter.convert_to_ui_event(text, context)