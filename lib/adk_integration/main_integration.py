"""
Main Integration Module

Connects the ADK event streaming infrastructure with the existing VANA system.
Provides a bridge between the current implementation and ADK-compliant architecture.
"""

import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Optional, Any
from datetime import datetime

from google.adk.runners import Runner
from google.genai.types import Content, Part

from .event_stream import ADKEventStreamHandler
from .silent_handoff import SilentHandoffManager

logger = logging.getLogger(__name__)


class VANAEventProcessor:
    """
    Main processor that integrates ADK event streaming with VANA.
    
    This class bridges the gap between the existing system and the new
    ADK-compliant event-driven architecture.
    """
    
    def __init__(self, runner: Runner):
        self.runner = runner
        self.event_handler = ADKEventStreamHandler(runner)
        self.handoff_manager = SilentHandoffManager()
        self._register_specialists()
        
    def _register_specialists(self):
        """Register all available specialists with handoff manager"""
        specialists = [
            'architecture_specialist',
            'security_specialist',
            'data_science_specialist',
            'qa_specialist',
            'ui_specialist',
            'devops_specialist'
        ]
        
        # Register placeholders for now
        # In production, these would be actual specialist agents
        for spec in specialists:
            self.handoff_manager.register_specialist(spec, f"{spec}_agent")
            
    async def process_with_adk_events(
        self,
        user_input: str,
        session_id: str,
        user_id: str = "api_user"
    ) -> AsyncGenerator[Dict, None]:
        """
        Process user input with full ADK event streaming.
        
        This is the main entry point that replaces the hardcoded
        event generation with real ADK event processing.
        """
        
        try:
            # Ensure session exists before processing
            session_service = self.runner.session_service
            if session_service:
                try:
                    # Check if session exists
                    await session_service.get_session(user_id=user_id, session_id=session_id)
                except:
                    # Create session if it doesn't exist
                    await session_service.create_session(
                        app_name="vana",
                        user_id=user_id,
                        session_id=session_id
                    )
                    
            # Use the event handler for processing
            async for event in self.event_handler.process_with_events(
                user_input, session_id, user_id
            ):
                # Additional processing if needed
                if event.get('type') == 'agent_active' and event.get('internal'):
                    # This is a specialist activation - could trigger additional logic
                    logger.info(f"Specialist activated: {event.get('agent')}")
                    
                yield event
                
        except Exception as e:
            logger.error(f"Event processing error: {e}")
            yield {
                'type': 'error',
                'content': f'Processing error: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }
            
    async def stream_response(
        self,
        user_input: str,
        session_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream response in SSE format for the frontend.
        
        Converts ADK events to Server-Sent Events format.
        """
        
        if not session_id:
            session_id = f"session_{datetime.now().timestamp()}"
            
        try:
            # Process with ADK events
            async for event in self.process_with_adk_events(user_input, session_id):
                # Convert to SSE format
                yield f"data: {json.dumps(event)}\n\n"
                
                # Small delay for better streaming UX on content
                if event.get('type') == 'content':
                    await asyncio.sleep(0.05)
                    
        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_event = {
                'type': 'error',
                'content': 'An error occurred while processing your request.'
            }
            yield f"data: {json.dumps(error_event)}\n\n"
            
        finally:
            # Send completion event
            done_event = {'type': 'done', 'status': 'complete'}
            yield f"data: {json.dumps(done_event)}\n\n"


def create_adk_processor(runner: Runner) -> VANAEventProcessor:
    """
    Factory function to create a configured VANA event processor.
    
    Args:
        runner: The ADK Runner instance
        
    Returns:
        Configured VANAEventProcessor
    """
    return VANAEventProcessor(runner)


# Backward compatibility functions
async def process_with_events_compat(
    runner: Runner,
    user_input: str,
    session_id: str
) -> tuple[str, list]:
    """
    Backward compatible function that mimics the old behavior.
    
    Returns a tuple of (response_text, thinking_events) for compatibility
    with existing code that expects this format.
    """
    processor = VANAEventProcessor(runner)
    
    events = []
    response_text = ""
    
    async for event in processor.process_with_adk_events(user_input, session_id):
        if event['type'] == 'content':
            response_text += event['content']
        else:
            events.append(event)
            
    return response_text, events