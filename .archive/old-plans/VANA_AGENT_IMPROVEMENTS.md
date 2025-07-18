# VANA Agent Communication Improvements

## Executive Summary

The current VANA implementation shows agent transfers as visible chat messages instead of handling them silently. The thinking panel displays static, pre-generated events rather than real-time agent activity. This document outlines the necessary improvements to achieve seamless, behind-the-scenes agent coordination.

## Current Issues

### 1. Visible Agent Transfers
- **Problem**: Agent handoffs appear as chat messages
- **Location**: `lib/_tools/adk_tools.py:transfer_to_agent()`
- **Impact**: Breaks the illusion of a single, intelligent assistant

### 2. Static Thinking Events
- **Problem**: Events are hardcoded based on keywords before processing
- **Location**: `main.py:process_vana_agent_with_events()`
- **Impact**: Thinking panel doesn't reflect actual agent work

### 3. No Specialist Invocation
- **Problem**: Specialists aren't actually called, just routing messages shown
- **Location**: `agents/vana/enhanced_orchestrator.py:route_to_specialist()`
- **Impact**: No actual specialized processing occurs

### 4. Missing Event Streaming
- **Problem**: No mechanism to capture real-time agent/tool events
- **Location**: `main.py:process_vana_agent()`
- **Impact**: Can't show progress updates during processing

## Proposed Architecture

### 1. Silent Agent Handoff System

```python
# New: Event-driven agent coordinator
class AgentCoordinator:
    def __init__(self):
        self.event_queue = asyncio.Queue()
        self.active_agents = {}
        
    async def route_request(self, request: str, session_id: str):
        """Silently route to appropriate specialist"""
        # Analyze task
        task_analysis = await self.analyze_task(request)
        
        # Emit routing event
        await self.emit_event({
            'type': 'routing',
            'content': f'Analyzing request type: {task_analysis.category}',
            'timestamp': time.time()
        })
        
        # Get specialist
        specialist = self.get_specialist(task_analysis)
        
        # Invoke specialist (silent)
        result = await self.invoke_specialist(specialist, request, session_id)
        
        return result
        
    async def invoke_specialist(self, specialist, request, session_id):
        """Invoke specialist and stream events"""
        # Emit activation event
        await self.emit_event({
            'type': 'agent_active',
            'agent': specialist.name,
            'content': f'{specialist.description} analyzing request...'
        })
        
        # Process with event hooks
        async for event in specialist.process_with_events(request):
            await self.emit_event(event)
            
        return specialist.get_result()
```

### 2. Real-Time Event Streaming

```python
# Enhanced agent processing with event capture
async def process_vana_agent_streaming(user_input: str, session_id: str):
    """Process with real-time event streaming"""
    coordinator = AgentCoordinator()
    
    # Start processing task
    process_task = asyncio.create_task(
        coordinator.route_request(user_input, session_id)
    )
    
    # Stream events while processing
    while not process_task.done():
        try:
            event = await asyncio.wait_for(
                coordinator.event_queue.get(), 
                timeout=0.1
            )
            yield event
        except asyncio.TimeoutError:
            continue
            
    # Get final result
    result = await process_task
    yield {'type': 'complete', 'result': result}
```

### 3. Enhanced Transfer Tool

```python
# Silent transfer implementation
async def silent_transfer_to_agent(agent_name: str, context: str) -> Dict:
    """Transfer control to specialist without visible output"""
    
    # Emit internal event only
    await coordinator.emit_event({
        'type': 'transfer',
        'from_agent': 'vana',
        'to_agent': agent_name,
        'context': context,
        'internal': True  # Don't show in chat
    })
    
    # Return control signal (not displayed)
    return {
        'action': 'TRANSFER_CONTROL',
        'target': agent_name,
        'display': False  # Key flag for silent transfer
    }
```

### 4. Tool Usage Event Capture

```python
# Wrap tools with event emission
class EventEmittingTool:
    def __init__(self, tool, coordinator):
        self.tool = tool
        self.coordinator = coordinator
        
    async def __call__(self, *args, **kwargs):
        # Emit tool start event
        await self.coordinator.emit_event({
            'type': 'tool_start',
            'tool': self.tool.name,
            'args': self._sanitize_args(args, kwargs)
        })
        
        # Execute tool
        result = await self.tool(*args, **kwargs)
        
        # Emit tool complete event
        await self.coordinator.emit_event({
            'type': 'tool_complete',
            'tool': self.tool.name,
            'status': 'success'
        })
        
        return result
```

## Implementation Steps

### Phase 1: Event Infrastructure (2-3 days)
1. Implement `AgentCoordinator` class
2. Add event queue system
3. Create event emission hooks

### Phase 2: Silent Transfers (2-3 days)
1. Modify transfer tool to return control signals
2. Update root agent to handle silent transfers
3. Implement specialist invocation system

### Phase 3: Real-Time Streaming (3-4 days)
1. Update `process_vana_agent()` to use coordinator
2. Implement event streaming in SSE endpoint
3. Add tool usage tracking

### Phase 4: Specialist Integration (2-3 days)
1. Wrap specialist agents with event emitters
2. Implement actual specialist invocation
3. Add progress tracking for long operations

## Quick Fixes (Immediate)

### 1. Hide Transfer Messages
```python
# In ResponseFormatter.format_response()
def format_response(text: str) -> str:
    # Filter out transfer messages
    if '"action": "transfer_conversation"' in text:
        return ""  # Don't display transfer messages
    return text
```

### 2. Dynamic Event Generation
```python
# Replace static events with dynamic generation
async def generate_thinking_events(request: str, processing_func):
    events = []
    
    # Initial analysis
    events.append({'type': 'analyzing', 'content': 'Understanding request...'})
    
    # Monitor actual processing
    async with processing_monitor(processing_func) as monitor:
        async for event in monitor.events:
            events.append(event)
            
    return events
```

### 3. Specialist Stub Implementation
```python
# Quick fix to actually invoke specialists
def route_to_specialist(request: str, task_type: str):
    specialist = routing_map.get(task_type)
    if specialist and specialist.is_available():
        # Actually invoke the specialist
        return specialist.process(request)
    return "Specialist not available"
```

## Success Metrics

1. **Silent Handoffs**: No transfer messages in chat output
2. **Real Progress**: Thinking panel shows actual tool usage and processing steps
3. **Specialist Work**: Specialists perform actual work with their tools
4. **Response Time**: < 100ms latency for event streaming
5. **User Experience**: Seamless conversation flow without visible handoffs

## Testing Strategy

1. **Unit Tests**: Event emission, coordinator logic
2. **Integration Tests**: Agent handoffs, tool tracking
3. **E2E Tests**: Full conversation flows with multiple agents
4. **Performance Tests**: Event streaming latency

## Conclusion

These improvements will transform VANA from showing mechanical agent transfers to providing a seamless, intelligent assistant experience. The thinking panel will show real progress, and specialists will perform actual work behind the scenes.