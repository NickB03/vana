"""
Silent Handoff Manager

Manages silent agent handoffs following Google ADK patterns.
Ensures agent transfers happen behind the scenes without visible chat messages.
"""

import logging
from typing import AsyncGenerator, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class SilentHandoffManager:
    """Manages silent agent handoffs following ADK patterns"""
    
    def __init__(self):
        self.specialist_registry = {}
        self.active_context = {}
        self.handoff_history = []
        
        # Specialist descriptions for thinking panel
        self.specialist_descriptions = {
            'architecture_specialist': 'Architecture Specialist - analyzing code structure and design patterns',
            'security_specialist': 'Security Specialist - scanning for vulnerabilities and security issues',
            'data_science_specialist': 'Data Science Specialist - analyzing data and statistics',
            'qa_specialist': 'QA Specialist - evaluating testing strategies and quality',
            'ui_specialist': 'UI/UX Specialist - reviewing interface and user experience',
            'devops_specialist': 'DevOps Specialist - checking deployment and infrastructure'
        }
        
    def register_specialist(self, name: str, agent: Any):
        """Register a specialist agent"""
        self.specialist_registry[name] = agent
        logger.info(f"Registered specialist: {name}")
        
    async def handle_specialist_request(
        self,
        specialist_name: str,
        request: str,
        context: Dict
    ) -> AsyncGenerator[Dict, None]:
        """
        Handle specialist invocation silently.
        
        Yields events for the thinking panel but filters out
        any transfer announcements from the chat.
        """
        
        # Record handoff
        handoff_record = {
            'timestamp': datetime.now().isoformat(),
            'from': context.get('from_agent', 'vana'),
            'to': specialist_name,
            'request': request[:100] + '...' if len(request) > 100 else request
        }
        self.handoff_history.append(handoff_record)
        
        # Yield routing event (for thinking panel only)
        yield {
            'type': 'routing',
            'content': f'Identifying specialist for {context.get("task_type", "task")}...',
            'internal': True
        }
        
        # Get specialist agent
        specialist = self.specialist_registry.get(specialist_name)
        if not specialist:
            logger.warning(f"Specialist not found: {specialist_name}")
            yield {
                'type': 'error',
                'content': f'Specialist {specialist_name} not available',
                'internal': True
            }
            return
            
        # Yield specialist activation (for thinking panel)
        description = self.specialist_descriptions.get(
            specialist_name, 
            f'{specialist_name} processing request'
        )
        yield {
            'type': 'agent_active',
            'agent': specialist_name,
            'content': description,
            'internal': True
        }
        
        # Update context for specialist
        specialist_context = {
            **context,
            'handoff_from': context.get('from_agent', 'vana'),
            'handoff_time': datetime.now().isoformat()
        }
        
        try:
            # Invoke specialist - this would be the actual agent call
            # For now, we'll simulate the response
            logger.info(f"Invoking specialist: {specialist_name}")
            
            # In real implementation, this would be:
            # async for event in specialist.process(request, specialist_context):
            #     if not self._is_transfer_announcement(event):
            #         yield event
            
            # Simulated specialist work
            yield {
                'type': 'thinking',
                'content': f'{specialist_name} analyzing...',
                'agent': specialist_name,
                'internal': True
            }
            
            # Simulate tool usage
            if specialist_name == 'security_specialist':
                yield {
                    'type': 'tool_start',
                    'tool': 'security_scan',
                    'agent': specialist_name,
                    'internal': True
                }
                
            # Note: The actual response would come from the specialist
            # and should NOT include any transfer messages
            
        except Exception as e:
            logger.error(f"Error invoking specialist {specialist_name}: {e}")
            yield {
                'type': 'error',
                'content': f'Error processing with {specialist_name}',
                'internal': True
            }
            
    def _is_transfer_announcement(self, event: Any) -> bool:
        """Check if event is a transfer announcement to filter"""
        # Check for transfer phrases in content
        try:
            content = ""
            if hasattr(event, 'content'):
                if isinstance(event.content, str):
                    content = event.content
                elif hasattr(event.content, 'text'):
                    content = event.content.text
                elif hasattr(event.content, 'parts'):
                    content = event.content.parts[0].text if event.content.parts else ""
                    
            transfer_phrases = [
                "transferring to",
                "routing to",
                "handing off",
                "delegating to",
                "forwarding to",
                "🔄 Transfer"
            ]
            
            content_lower = content.lower()
            return any(phrase in content_lower for phrase in transfer_phrases)
            
        except:
            return False
            
    def get_handoff_history(self) -> list:
        """Get history of agent handoffs"""
        return self.handoff_history.copy()
        
    def clear_history(self):
        """Clear handoff history"""
        self.handoff_history.clear()
        
    async def create_silent_transfer_response(
        self,
        from_agent: str,
        to_agent: str,
        reason: str
    ) -> Dict:
        """
        Create a response object for silent transfer.
        
        This returns a control signal that the system understands
        but doesn't display to the user.
        """
        return {
            'action': 'TRANSFER_CONTROL',
            'from': from_agent,
            'to': to_agent,
            'reason': reason,
            'display': False,  # Critical flag for silent transfer
            'timestamp': datetime.now().isoformat()
        }