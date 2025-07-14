# VANA ADK-Compliant Agent Architecture

## Executive Summary

After reviewing the Phase 2 design and current implementation, there's a significant gap between the intended ADK-compliant architecture and what's deployed. The current system lacks proper event streaming, silent agent handoffs, and real-time progress tracking. This document outlines an ADK-compliant architecture that aligns with Google's Agent Development Kit patterns.

## Current Architecture Gaps

### 1. **No Event-Driven Communication**
- Current: Hardcoded thinking events based on keywords
- Missing: Real ADK Event objects yielded during execution
- Impact: No actual progress tracking or agent coordination visibility

### 2. **Visible Agent Transfers**
- Current: `transfer_to_agent()` returns JSON displayed in chat
- Missing: Silent control handoff through Runner orchestration
- Impact: Breaks seamless assistant experience

### 3. **No Agent Invocation**
- Current: Specialists exist but aren't actually called
- Missing: Proper sub-agent invocation through ADK patterns
- Impact: No specialized processing occurs

### 4. **Missing Workflow Engine Integration**
- Current: Phase 4 workflow engine exists but unused in main flow
- Missing: Connection between Runner events and workflow execution
- Impact: Complex workflows not supported

## ADK-Compliant Architecture

### Core Concepts from ADK

1. **Event Loop**: The Runner manages an event loop where agents yield Events
2. **Yield & Pause**: Agent execution pauses after yielding, waiting for Runner processing
3. **State Consistency**: All state changes happen through Events
4. **Bidirectional Communication**: Events flow between Runner, Agents, and UI

### Proposed Implementation

```python
# lib/adk_integration/event_stream.py
from google.adk.events import Event, EventType
from google.adk.runners import Runner
from typing import AsyncGenerator, Optional
import asyncio

class ADKEventStreamHandler:
    """Handles ADK event streaming for real-time agent communication"""
    
    def __init__(self, runner: Runner):
        self.runner = runner
        self.event_queue = asyncio.Queue()
        self.active_specialists = {}
        
    async def process_with_events(
        self, 
        user_input: str, 
        session_id: str
    ) -> AsyncGenerator[Dict, None]:
        """Process user input with full event streaming"""
        
        # Start processing
        content = Content(role='user', parts=[Part(text=user_input)])
        
        # Process events as they arrive
        async for event in self.runner.run(
            user_id="api_user",
            session_id=session_id,
            new_message=content
        ):
            # Convert ADK events to UI events
            ui_event = await self._convert_to_ui_event(event)
            if ui_event:
                yield ui_event
                
    async def _convert_to_ui_event(self, event: Event) -> Optional[Dict]:
        """Convert ADK Event to UI-friendly event"""
        
        # Agent thinking/routing events
        if event.type == EventType.AGENT_STATE_CHANGE:
            if "routing" in event.metadata:
                return {
                    'type': 'thinking',
                    'content': f'Analyzing request type: {event.metadata["task_type"]}',
                    'agent': event.author
                }
                
        # Tool usage events
        elif event.type == EventType.TOOL_USE_REQUEST:
            return {
                'type': 'tool_start',
                'tool': event.content.function_calls[0].name,
                'agent': event.author
            }
            
        # Agent transfer events (silent)
        elif event.type == EventType.AGENT_TRANSFER:
            return {
                'type': 'agent_active',
                'agent': event.metadata['target_agent'],
                'content': f'{event.metadata["specialist_desc"]} analyzing request...',
                'internal': True  # Don't show in chat
            }
            
        # Final response
        elif event.is_final_response():
            return {
                'type': 'content',
                'content': event.content.parts[0].text
            }
            
        return None
```

### Silent Agent Handoff Implementation

```python
# lib/adk_integration/silent_handoff.py
from google.adk.agents import LlmAgent
from google.adk.events import Event
from typing import AsyncGenerator

class SilentHandoffManager:
    """Manages silent agent handoffs following ADK patterns"""
    
    def __init__(self):
        self.specialist_registry = {}
        self.active_context = {}
        
    async def handle_specialist_request(
        self,
        specialist_name: str,
        request: str,
        context: Dict
    ) -> AsyncGenerator[Event, None]:
        """Handle specialist invocation silently"""
        
        # Yield routing event (for thinking panel only)
        yield Event(
            type=EventType.AGENT_STATE_CHANGE,
            author="orchestrator",
            metadata={
                "routing": True,
                "target": specialist_name,
                "task_type": context.get("task_type")
            }
        )
        
        # Get specialist agent
        specialist = self.specialist_registry.get(specialist_name)
        if not specialist:
            yield Event(
                type=EventType.ERROR,
                author="orchestrator",
                content="Specialist not available"
            )
            return
            
        # Invoke specialist (silent transfer)
        async for event in specialist.process(request, context):
            # Filter transfer announcements
            if not self._is_transfer_announcement(event):
                yield event
                
    def _is_transfer_announcement(self, event: Event) -> bool:
        """Check if event is a transfer announcement to filter"""
        if event.type == EventType.AGENT_MESSAGE:
            text = event.content.parts[0].text.lower()
            return any(phrase in text for phrase in [
                "transferring to",
                "routing to",
                "handing off"
            ])
        return False
```

### Enhanced Root Agent with Event Support

```python
# agents/vana/team_v2.py
from google.adk.agents import LlmAgent
from google.adk.events import Event, EventType
from lib.adk_integration.silent_handoff import SilentHandoffManager

class VanaRootAgentV2(LlmAgent):
    """Enhanced root agent with proper event streaming"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.handoff_manager = SilentHandoffManager()
        
    async def process(self, request: str, context: Dict) -> AsyncGenerator[Event, None]:
        """Process request with event streaming"""
        
        # Analyze task
        task_analysis = await self.analyze_task(request)
        
        # Yield analysis event
        yield Event(
            type=EventType.AGENT_STATE_CHANGE,
            author=self.name,
            metadata={
                "routing": True,
                "task_type": task_analysis.type,
                "complexity": task_analysis.complexity
            }
        )
        
        # Route to specialist if needed
        if task_analysis.requires_specialist:
            # Silent handoff - no chat message
            async for event in self.handoff_manager.handle_specialist_request(
                specialist_name=task_analysis.specialist,
                request=request,
                context={**context, "task_analysis": task_analysis}
            ):
                yield event
        else:
            # Handle directly
            response = await self.generate_response(request)
            yield Event(
                type=EventType.AGENT_MESSAGE,
                author=self.name,
                content=Content(role="assistant", parts=[Part(text=response)])
            )
```

### Integration with Workflow Engine

```python
# agents/workflows/adk_workflow_integration.py
from agents.workflows.workflow_engine import WorkflowEngine
from google.adk.events import Event

class ADKWorkflowIntegration:
    """Integrates Phase 4 workflow engine with ADK event system"""
    
    def __init__(self, workflow_engine: WorkflowEngine):
        self.workflow_engine = workflow_engine
        
    async def execute_workflow_with_events(
        self,
        workflow_def: WorkflowDefinition,
        context: Dict
    ) -> AsyncGenerator[Event, None]:
        """Execute workflow with event streaming"""
        
        # Start workflow
        workflow_state = await self.workflow_engine.start_workflow(
            definition=workflow_def,
            context=context
        )
        
        # Stream events during execution
        async for step_result in self.workflow_engine.execute_steps(workflow_state):
            # Convert step results to events
            if step_result.type == "specialist_invocation":
                yield Event(
                    type=EventType.AGENT_TRANSFER,
                    author="workflow_engine",
                    metadata={
                        "target_agent": step_result.specialist,
                        "specialist_desc": self._get_specialist_description(step_result.specialist),
                        "step_id": step_result.step_id
                    }
                )
            elif step_result.type == "tool_use":
                yield Event(
                    type=EventType.TOOL_USE_REQUEST,
                    author=step_result.agent,
                    content=Content(
                        role="assistant",
                        parts=[Part(function_calls=[step_result.tool_call])]
                    )
                )
```

### Updated Main Processing Flow

```python
# main.py - Enhanced processing
from lib.adk_integration.event_stream import ADKEventStreamHandler

async def process_vana_agent_with_adk_events(
    user_input: str, 
    session_id: str
) -> AsyncGenerator[Dict, None]:
    """Process with proper ADK event streaming"""
    
    # Create event handler
    event_handler = ADKEventStreamHandler(runner)
    
    # Process with real event streaming
    async for ui_event in event_handler.process_with_events(user_input, session_id):
        yield ui_event

async def stream_agent_response(user_input: str, session_id: str = None) -> AsyncGenerator[str, None]:
    """Stream VANA agent response with real ADK events"""
    
    try:
        # Process through ADK event system
        async for event in process_vana_agent_with_adk_events(user_input, session_id):
            # Convert to SSE format
            yield f"data: {json.dumps(event)}\n\n"
            
    except Exception as e:
        logger.error(f"Streaming error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
```

## Implementation Phases

### Phase 1: Event Infrastructure (2-3 days)
1. Implement `ADKEventStreamHandler`
2. Create event conversion utilities
3. Update Runner configuration for event streaming

### Phase 2: Silent Handoffs (2-3 days)
1. Implement `SilentHandoffManager`
2. Update `transfer_to_agent` to yield events instead of returning JSON
3. Filter transfer announcements from chat

### Phase 3: Specialist Integration (3-4 days)
1. Update specialists to yield ADK Events
2. Implement proper sub-agent invocation
3. Add tool usage event tracking

### Phase 4: Workflow Integration (2-3 days)
1. Connect workflow engine to event system
2. Implement `ADKWorkflowIntegration`
3. Enable complex workflow execution

## Testing Strategy

```python
# tests/test_adk_events.py
import pytest
from unittest.mock import AsyncMock

@pytest.mark.asyncio
async def test_silent_handoff():
    """Test that agent handoffs don't appear in chat"""
    handler = ADKEventStreamHandler(mock_runner)
    
    events = []
    async for event in handler.process_with_events("analyze my code", "test_session"):
        events.append(event)
        
    # Check no transfer messages in content
    content_events = [e for e in events if e['type'] == 'content']
    for event in content_events:
        assert 'transferring to' not in event['content'].lower()
        
@pytest.mark.asyncio
async def test_real_specialist_invocation():
    """Test that specialists are actually invoked"""
    # Mock specialist that adds specific response
    mock_specialist = AsyncMock()
    mock_specialist.process.return_value = [
        Event(type=EventType.AGENT_MESSAGE, content="Security scan complete")
    ]
    
    handler = SilentHandoffManager()
    handler.specialist_registry['security'] = mock_specialist
    
    # Process security request
    await handler.handle_specialist_request('security', 'check vulnerabilities', {})
    
    # Verify specialist was called
    mock_specialist.process.assert_called_once()
```

## Benefits

1. **True Event Streaming**: Real-time progress updates from actual agent work
2. **Silent Handoffs**: Seamless experience without visible transfers
3. **ADK Compliance**: Follows Google's recommended patterns
4. **Workflow Support**: Leverages Phase 4 workflow engine
5. **Extensible**: Easy to add new event types and handlers

## Conclusion

This ADK-compliant architecture bridges the gap between the Phase 2 design intentions and current implementation. By following Google ADK's event-driven patterns, we can achieve true silent agent coordination with real-time progress tracking, making VANA appear as a single, intelligent assistant rather than a collection of separate agents.