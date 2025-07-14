"""
Enhanced VANA Team with Event Emission
Adds proper event yielding for ADK integration
"""

import json
import logging
from typing import Generator, Any

from google.adk.agents import LlmAgent
from google.genai.types import Content, Part

from agents.vana.team import root_agent as base_root_agent
from lib.logging_config import get_logger

logger = get_logger(__name__)


class EventEmittingAgent(LlmAgent):
    """Enhanced agent that emits events during processing"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._event_queue = []
        
    def emit_event(self, event_type: str, **kwargs):
        """Queue an event to be yielded"""
        event = {
            'type': event_type,
            'timestamp': None,  # Will be set by handler
            **kwargs
        }
        self._event_queue.append(event)
        logger.debug(f"Event queued: {event_type}")
        
    def process_with_events(self, *args, **kwargs) -> Generator[Any, None, None]:
        """Process request and yield events"""
        # Emit initial routing event
        self.emit_event('routing', content='Analyzing query type and routing to appropriate specialists...')
        
        # Process normally (this would call the parent's process method)
        result = super().process(*args, **kwargs)
        
        # Yield queued events
        while self._event_queue:
            yield self._event_queue.pop(0)
            
        # Yield final result
        yield result


def create_enhanced_root_agent():
    """Create an enhanced version of the root agent with event emission"""
    
    # Create new agent based on existing configuration
    enhanced_agent = EventEmittingAgent(
        model=base_root_agent.model,
        tools=base_root_agent.tools,
        sub_agents=base_root_agent.sub_agents,
        instructions=base_root_agent.instructions,
        name=base_root_agent.name,
        description=base_root_agent.description
    )
    
    # Wrap the transfer tool to emit events
    original_transfer = None
    for tool in enhanced_agent.tools:
        if hasattr(tool, 'name') and tool.name == 'transfer_to_agent':
            original_transfer = tool.func
            break
            
    if original_transfer:
        def enhanced_transfer(agent_name: str, context: str) -> str:
            """Enhanced transfer that emits events"""
            # Emit transfer event before executing
            enhanced_agent.emit_event(
                'agent_active',
                agent=agent_name,
                content=f'{agent_name.replace("_", " ").title()} analyzing request...',
                internal=True
            )
            
            # Execute original transfer
            return original_transfer(agent_name, context)
            
        # Replace the tool function
        for i, tool in enumerate(enhanced_agent.tools):
            if hasattr(tool, 'name') and tool.name == 'transfer_to_agent':
                from google.adk.tools import FunctionTool
                enhanced_tool = FunctionTool(func=enhanced_transfer)
                enhanced_tool.name = 'transfer_to_agent'
                enhanced_agent.tools[i] = enhanced_tool
                break
    
    return enhanced_agent


# Export enhanced agent
enhanced_root_agent = create_enhanced_root_agent()