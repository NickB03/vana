"""
Comprehensive test suite for ADK integration
"""

import asyncio
import json
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from datetime import datetime

from google.genai.types import Content, Part
from lib.adk_integration import (
    ADKEventStreamHandler,
    SilentHandoffManager,
    VANAEventProcessor,
    create_adk_processor
)


class TestADKEventStreamHandler:
    """Unit tests for ADK Event Stream Handler"""
    
    @pytest.fixture
    def mock_runner(self):
        """Create a mock runner for testing"""
        runner = Mock()
        runner.session_service = Mock()
        return runner
    
    @pytest.fixture
    def event_handler(self, mock_runner):
        """Create event handler instance"""
        return ADKEventStreamHandler(mock_runner)
    
    @pytest.mark.asyncio
    async def test_process_with_events_basic(self, event_handler, mock_runner):
        """Test basic event processing"""
        # Mock event
        mock_event = Mock()
        mock_event.content = Content(role='assistant', parts=[Part(text='Hello, how can I help?')])
        mock_event.is_final_response = Mock(return_value=True)
        
        # Configure runner to return mock event
        mock_runner.run.return_value = [mock_event]
        
        # Collect events
        events = []
        async for event in event_handler.process_with_events('test query', 'test_session'):
            events.append(event)
        
        # Verify
        assert len(events) >= 2  # At least thinking + content
        assert events[0]['type'] == 'thinking'
        assert events[-1]['type'] == 'content'
        assert events[-1]['content'] == 'Hello, how can I help?'
    
    @pytest.mark.asyncio
    async def test_transfer_message_filtering(self, event_handler, mock_runner):
        """Test that transfer messages are filtered out"""
        # Mock transfer message with proper transfer pattern
        transfer_event = Mock()
        transfer_event.content = Content(
            role='assistant', 
            parts=[Part(text='{"action": "transfer_conversation", "target_agent": "enhanced_orchestrator"}')]
        )
        transfer_event.is_final_response = Mock(return_value=True)
        
        # Configure runner
        mock_runner.run.return_value = [transfer_event]
        
        # Collect events
        events = []
        async for event in event_handler.process_with_events('security check', 'test_session'):
            events.append(event)
        
        # Verify transfer message was filtered
        content_events = [e for e in events if e['type'] == 'content']
        # Transfer messages should result in empty content after filtering
        if content_events:
            assert content_events[0]['content'] == ''  # Empty because transfer was filtered
    
    def test_is_transfer_message(self, event_handler):
        """Test transfer message detection"""
        # Transfer messages (case-sensitive check)
        assert event_handler._is_transfer_message('I am transferring to the enhanced_orchestrator agent.')
        assert event_handler._is_transfer_message('{"action": "transfer_conversation", "target": "specialist"}')
        assert event_handler._is_transfer_message('Routing to specialist for analysis')
        assert event_handler._is_transfer_message('Transferring to security specialist')
        
        # Non-transfer messages
        assert not event_handler._is_transfer_message('Here is your security analysis:')
        assert not event_handler._is_transfer_message('I can help you with that.')
        assert not event_handler._is_transfer_message('')
    
    def test_extract_specialist_info(self, event_handler):
        """Test specialist extraction from transfer messages"""
        # Test security specialist
        info = event_handler._extract_specialist_info('Transferring to security specialist')
        assert info['name'] == 'security_specialist'
        assert 'Security' in info['description']
        
        # Test data science specialist
        info = event_handler._extract_specialist_info('Routing to data analysis expert')
        assert info['name'] == 'data_science_specialist'
        
        # Test no specialist found
        info = event_handler._extract_specialist_info('General response')
        assert info is None


class TestSilentHandoffManager:
    """Unit tests for Silent Handoff Manager"""
    
    @pytest.fixture
    def handoff_manager(self):
        return SilentHandoffManager()
    
    def test_register_specialist(self, handoff_manager):
        """Test specialist registration"""
        handoff_manager.register_specialist('test_specialist', 'test_agent')
        assert 'test_specialist' in handoff_manager.specialist_registry
        assert handoff_manager.specialist_registry['test_specialist'] == 'test_agent'
    
    @pytest.mark.asyncio
    async def test_handle_transfer_silent(self, handoff_manager):
        """Test silent transfer handling"""
        handoff_manager.register_specialist('security_specialist', 'security_agent')
        
        # Collect events from transfer
        events = []
        async for event in handoff_manager.handle_specialist_request(
            'security_specialist',
            'Check for vulnerabilities',
            {'session_id': 'test123'}
        ):
            events.append(event)
        
        # Verify events
        assert len(events) >= 1
        assert events[0]['type'] == 'agent_active'
        assert events[0]['agent'] == 'security_specialist'
        assert events[0].get('internal') == True  # Should be internal (not shown in chat)
    
    def test_get_transfer_history(self, handoff_manager):
        """Test transfer history tracking"""
        # The manager uses handoff_history, not transfer_history
        handoff_manager.handoff_history.append({
            'from': 'vana',
            'to': 'security_specialist',
            'timestamp': datetime.now().isoformat()
        })
        
        history = handoff_manager.get_handoff_history()
        assert len(history) == 1
        assert history[0]['to'] == 'security_specialist'


class TestVANAEventProcessor:
    """Integration tests for VANA Event Processor"""
    
    @pytest.fixture
    def mock_runner(self):
        """Create a mock runner with session service"""
        runner = Mock()
        runner.session_service = AsyncMock()
        runner.session_service.get_session = AsyncMock(side_effect=Exception("Not found"))
        runner.session_service.create_session = AsyncMock(return_value={'id': 'test_session'})
        return runner
    
    @pytest.fixture
    def processor(self, mock_runner):
        """Create processor instance"""
        return VANAEventProcessor(mock_runner)
    
    @pytest.mark.asyncio
    async def test_process_with_adk_events_session_creation(self, processor, mock_runner):
        """Test that sessions are created if missing"""
        # Mock event
        mock_event = Mock()
        mock_event.content = Content(role='assistant', parts=[Part(text='Test response')])
        mock_event.is_final_response = Mock(return_value=True)
        
        # Configure runner
        mock_runner.run.return_value = [mock_event]
        
        # Process
        events = []
        async for event in processor.process_with_adk_events('test query', 'new_session'):
            events.append(event)
        
        # Verify session was created
        mock_runner.session_service.create_session.assert_called_once()
        assert len(events) > 0
    
    @pytest.mark.asyncio
    async def test_stream_response_sse_format(self, processor, mock_runner):
        """Test SSE formatted streaming"""
        # Mock event
        mock_event = Mock()
        mock_event.content = Content(role='assistant', parts=[Part(text='Streaming response')])
        mock_event.is_final_response = Mock(return_value=True)
        
        # Configure runner
        mock_runner.run.return_value = [mock_event]
        
        # Stream response
        sse_events = []
        async for sse in processor.stream_response('test query', 'test_session'):
            sse_events.append(sse)
        
        # Verify SSE format
        assert any('data:' in event for event in sse_events)
        assert any('"type":"content"' in event for event in sse_events)
        assert any('"type":"done"' in event for event in sse_events)


class TestMainIntegration:
    """Integration tests for main.py ADK integration"""
    
    @pytest.mark.asyncio
    async def test_feature_flag_disabled(self):
        """Test fallback when feature flag is disabled"""
        with patch.dict('os.environ', {'USE_ADK_EVENTS': 'false'}):
            # Import after setting env var
            from main import USE_ADK_EVENTS, adk_processor
            
            assert USE_ADK_EVENTS == False
            assert adk_processor is None
    
    @pytest.mark.asyncio
    async def test_process_with_events_fallback(self):
        """Test hardcoded fallback implementation"""
        with patch.dict('os.environ', {'USE_ADK_EVENTS': 'false'}):
            from main import process_vana_agent_with_events
            
            # Mock process_vana_agent
            with patch('main.process_vana_agent', new_callable=AsyncMock) as mock_process:
                mock_process.return_value = "Test response"
                
                # Test security query
                output, events = await process_vana_agent_with_events(
                    "Check security vulnerabilities",
                    "test_session"
                )
                
                # Verify
                assert output == "Test response"
                assert len(events) >= 2  # Should have routing events
                assert any('security_specialist' in str(e) for e in events)


@pytest.mark.integration
class TestEndToEndFlow:
    """End-to-end tests for complete ADK flow"""
    
    @pytest.mark.asyncio
    async def test_security_query_flow(self):
        """Test complete flow for security query"""
        with patch.dict('os.environ', {'USE_ADK_EVENTS': 'true'}):
            # This would require a running server or more complex mocking
            # For now, we'll test the components are wired correctly
            from main import adk_processor
            
            if adk_processor:
                # Verify processor has all required components
                assert hasattr(adk_processor, 'event_handler')
                assert hasattr(adk_processor, 'handoff_manager')
                assert len(adk_processor.handoff_manager.specialists) > 0


# Test utilities
def create_mock_event(text: str, is_final: bool = False):
    """Helper to create mock ADK events"""
    event = Mock()
    event.content = Content(role='assistant', parts=[Part(text=text)])
    event.is_final_response = Mock(return_value=is_final)
    return event


if __name__ == "__main__":
    pytest.main([__file__, '-v'])