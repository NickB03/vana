"""
ADK Event Stream Handler

Handles Google ADK event streaming for real-time agent communication and progress tracking.
Converts ADK Events to UI-friendly events for the thinking panel.
"""

import asyncio
import logging
from typing import AsyncGenerator, Dict, Optional, Any
from datetime import datetime

from google.adk.runners import Runner
from google.genai.types import Content, Part

# Import enhanced transfer detection
try:
    from .enhanced_event_handler import is_transfer_message as enhanced_is_transfer
    from .enhanced_event_handler import convert_to_ui_events
    USE_ENHANCED_DETECTION = True
except ImportError:
    USE_ENHANCED_DETECTION = False

logger = logging.getLogger(__name__)


class EventType:
    """Event types for ADK-style communication"""
    AGENT_STATE_CHANGE = "agent_state_change"
    TOOL_USE_REQUEST = "tool_use_request"
    TOOL_USE_RESULT = "tool_use_result"
    AGENT_TRANSFER = "agent_transfer"
    AGENT_MESSAGE = "agent_message"
    ERROR = "error"
    THINKING = "thinking"
    ROUTING = "routing"


class ADKEventStreamHandler:
    """Handles ADK event streaming for real-time agent communication"""
    
    def __init__(self, runner: Runner):
        self.runner = runner
        self.event_queue = asyncio.Queue()
        self.active_specialists = {}
        self.event_history = []
        
    async def process_with_events(
        self, 
        user_input: str, 
        session_id: str,
        user_id: str = "api_user"
    ) -> AsyncGenerator[Dict, None]:
        """
        Process user input with full event streaming.
        
        Yields UI-friendly events for the thinking panel while processing
        the request through the ADK runner.
        """
        
        try:
            # Initial thinking event
            yield {
                'type': 'thinking',
                'content': 'Understanding your request...',
                'timestamp': datetime.now().isoformat()
            }
            
            # Create user message
            content = Content(role='user', parts=[Part(text=user_input)])
            
            # Track events for proper response handling
            has_final_response = False
            collected_response = []
            
            # Process events as they arrive from the runner
            for event in self.runner.run(
                user_id=user_id,
                session_id=session_id,
                new_message=content
            ):
                # Log raw event for debugging
                logger.debug(f"ADK Event: type={getattr(event, 'type', 'unknown')}, author={getattr(event, 'author', 'unknown')}")
                
                # Check if this is routing/transfer information
                if hasattr(event, 'content') and event.content:
                    content_text = self._extract_text_from_event(event)
                    
                    # Use enhanced detection if available
                    if USE_ENHANCED_DETECTION:
                        is_transfer = enhanced_is_transfer(content_text)
                    else:
                        is_transfer = self._is_transfer_message(content_text)
                        
                    # Route transfer messages to thinking panel
                    if is_transfer:
                        # Convert transfer messages to thinking events
                        thinking_event = self._convert_transfer_to_thinking(content_text)
                        if thinking_event:
                            yield thinking_event
                        continue  # Don't add to main response
                
                # Convert ADK events to UI events
                ui_event = await self._convert_to_ui_event(event)
                if ui_event:
                    # Only yield non-content events (thinking, routing, etc)
                    if ui_event['type'] != 'content':
                        yield ui_event
                    else:
                        # Check if content is a transfer message before collecting
                        content = ui_event['content']
                        if USE_ENHANCED_DETECTION:
                            is_transfer = enhanced_is_transfer(content)
                        else:
                            is_transfer = self._is_transfer_message(content)
                            
                        if not is_transfer:
                            collected_response.append(content)
                
                # Check if final response
                if hasattr(event, 'is_final_response') and event.is_final_response():
                    has_final_response = True
                    
            # Yield the complete response at the end
            if collected_response:
                full_response = ''.join(collected_response)
                if full_response.strip():  # Only yield non-empty responses
                    yield {
                        'type': 'content',
                        'content': full_response
                    }
                    
        except Exception as e:
            logger.error(f"Event stream error: {e}")
            yield {
                'type': 'error',
                'content': f'Error processing request: {str(e)}'
            }
            
    def _extract_text_from_event(self, event) -> str:
        """Extract text content from an event"""
        try:
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts') and event.content.parts:
                    return event.content.parts[0].text
                elif hasattr(event.content, 'text'):
                    return event.content.text
        except:
            pass
        return ""
        
    def _is_transfer_message(self, text: str) -> bool:
        """Check if text contains transfer/routing information"""
        if not text:
            return False
            
        # First check for JSON transfer patterns
        try:
            import json
            # Try to parse as JSON
            data = json.loads(text.strip())
            if isinstance(data, dict):
                # Check for transfer-related keys
                if data.get('action') in ['transfer_conversation', 'TRANSFER_CONTROL']:
                    return True
                if 'target_agent' in data or 'agent_name' in data:
                    return True
                if 'agent' in data and 'conversation' in data:
                    return True
        except:
            # Not JSON, continue with text pattern matching
            pass
            
        # Text-based transfer indicators
        transfer_indicators = [
            '"action": "transfer_conversation"',
            '"action":"transfer_conversation"',  # No spaces
            '"target_agent"',
            '"agent_name"',
            'transferring to',
            'transferring you to',
            'routing to specialist',
            'handing off to',
            '🔄 Transfer',
            'transfer_to_agent'
        ]
        
        text_lower = text.lower()
        return any(indicator.lower() in text_lower for indicator in transfer_indicators)
        
    def _extract_specialist_info(self, text: str) -> Optional[Dict[str, str]]:
        """Extract specialist information from transfer message"""
        specialists = {
            'security': ('security_specialist', 'Security Specialist'),
            'architecture': ('architecture_specialist', 'Architecture Specialist'),
            'data': ('data_science_specialist', 'Data Science Specialist'),
            'qa': ('qa_specialist', 'QA Specialist'),
            'ui': ('ui_specialist', 'UI/UX Specialist'),
            'devops': ('devops_specialist', 'DevOps Specialist'),
            'enhanced_orchestrator': ('enhanced_orchestrator', 'Enhanced Orchestrator')
        }
        
        # First try to extract from JSON
        try:
            import json
            data = json.loads(text.strip())
            if isinstance(data, dict):
                # Check various agent fields
                agent_name = data.get('agent') or data.get('target_agent') or data.get('agent_name')
                if agent_name:
                    for key, (name, desc) in specialists.items():
                        if key in agent_name.lower() or name == agent_name:
                            return {'name': name, 'description': desc}
        except:
            pass
        
        # Fallback to text matching
        text_lower = text.lower()
        for key, (name, desc) in specialists.items():
            if key in text_lower:
                return {'name': name, 'description': desc}
                
        return None
                
    async def _convert_to_ui_event(self, event: Any) -> Optional[Dict]:
        """Convert ADK Event to UI-friendly event"""
        
        # Handle different event structures
        if hasattr(event, 'type'):
            event_type = event.type
        else:
            event_type = None
            
        # Extract event metadata
        metadata = getattr(event, 'metadata', {})
        author = getattr(event, 'author', 'vana')
        
        # Agent thinking/routing events
        if event_type == EventType.AGENT_STATE_CHANGE:
            if metadata.get("routing"):
                return {
                    'type': 'routing',
                    'content': f'Analyzing query type: {metadata.get("task_type", "general")}',
                    'agent': author
                }
                
        # Tool usage events
        elif event_type == EventType.TOOL_USE_REQUEST:
            if hasattr(event, 'content') and hasattr(event.content, 'function_calls'):
                tool_name = event.content.function_calls[0].name
                return {
                    'type': 'tool_start',
                    'tool': tool_name,
                    'agent': author,
                    'content': f'Using tool: {tool_name}'
                }
                
        # Tool results
        elif event_type == EventType.TOOL_USE_RESULT:
            return {
                'type': 'tool_complete',
                'agent': author,
                'content': 'Tool execution complete'
            }
            
        # Agent transfer events (silent)
        elif event_type == EventType.AGENT_TRANSFER:
            return {
                'type': 'agent_active',
                'agent': metadata.get('target_agent', 'specialist'),
                'content': metadata.get('description', 'Specialist analyzing request...'),
                'internal': True  # Don't show in chat
            }
            
        # Regular content - check if it's actually content
        elif hasattr(event, 'content') and event.content:
            text = self._extract_text_from_event(event)
            if text and not self._is_transfer_message(text):
                return {
                    'type': 'content',
                    'content': text
                }
                
        return None
    
    def _convert_transfer_to_thinking(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Convert transfer messages to thinking panel events.
        Shows the multi-agent orchestration transparently.
        """
        content_lower = content.lower()
        
        # Map transfer patterns to user-friendly thinking events
        if "i've transferred your request" in content_lower or "transferring to" in content_lower:
            # Extract which agent
            if "enhanced_orchestrator" in content_lower or "orchestrator" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Analyzing request and determining best approach...',
                    'agent': 'master_orchestrator',
                    'status': 'routing'
                }
            elif "security" in content_lower:
                return {
                    'type': 'thinking', 
                    'content': 'Assigning Security Specialist for vulnerability analysis...',
                    'agent': 'security_specialist',
                    'status': 'active'
                }
            elif "data" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Assigning Data Science Specialist for analysis...',
                    'agent': 'data_science_specialist', 
                    'status': 'active'
                }
            elif "architecture" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Assigning Architecture Specialist for code review...',
                    'agent': 'architecture_specialist',
                    'status': 'active'
                }
            elif "devops" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Assigning DevOps Specialist for deployment analysis...',
                    'agent': 'devops_specialist',
                    'status': 'active'
                }
            elif "qa" in content_lower or "test" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Assigning QA Specialist for quality assessment...',
                    'agent': 'qa_specialist',
                    'status': 'active'
                }
            elif "ui" in content_lower or "ux" in content_lower:
                return {
                    'type': 'thinking',
                    'content': 'Assigning UI/UX Specialist for interface design...',
                    'agent': 'ui_specialist',
                    'status': 'active'
                }
                
        # Handle completion messages
        elif "complete" in content_lower or "finished" in content_lower:
            # Extract which agent completed
            for agent in ['security', 'data', 'architecture', 'devops', 'qa', 'ui']:
                if agent in content_lower:
                    agent_name = f"{agent}_specialist"
                    return {
                        'type': 'thinking',
                        'content': f'{agent.title()} analysis complete, preparing insights...',
                        'agent': agent_name,
                        'status': 'complete'
                    }
                    
        # Handle generic routing messages
        elif "routing" in content_lower or "analyzing" in content_lower:
            return {
                'type': 'thinking',
                'content': 'Determining optimal specialist configuration...',
                'status': 'routing'
            }
            
        return None