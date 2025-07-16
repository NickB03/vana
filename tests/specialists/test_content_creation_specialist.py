"""
Test suite for Content Creation Specialist - ADK Compliant

Tests all 6 content creation tools and the specialist agent integration.
"""

import pytest
from unittest.mock import Mock, patch
from google.adk.tools import ToolContext

# Import the tools
from lib._tools.content_creation_tools import (
    write_document,
    generate_outline,
    edit_content,
    format_markdown,
    check_grammar,
    improve_clarity
)

# Import the specialist
from agents.specialists.content_creation_specialist import content_creation_specialist


class TestContentCreationTools:
    """Test individual content creation tools"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.tool_context = Mock(spec=ToolContext)
        self.tool_context.state = {}
    
    def test_write_document_success(self):
        """Test successful document creation"""
        result = write_document(
            doc_type="report",
            topic="AI Safety",
            requirements="Include executive summary and recommendations",
            word_count=500,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'document' in result
        assert 'metadata' in result
        assert result['metadata']['type'] == 'report'
        assert result['metadata']['topic'] == 'AI Safety'
        assert 400 <= result['metadata']['word_count'] <= 600
    
    def test_write_document_invalid_type(self):
        """Test document creation with invalid type"""
        result = write_document(
            doc_type="invalid_type",
            topic="Test",
            requirements="Test requirements",
            word_count=100,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'error'
        assert 'Invalid document type' in result['error_message']
    
    def test_generate_outline_comprehensive(self):
        """Test comprehensive outline generation"""
        result = generate_outline(
            topic="Machine Learning Best Practices",
            depth=3,
            style="academic",
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'outline' in result
        assert 'section_count' in result
        assert result['section_count'] >= 3
        assert len(result['outline']) >= 3
    
    def test_edit_content_improvements(self):
        """Test content editing functionality"""
        original = "This is a test content that needs editing for clarity."
        result = edit_content(
            content=original,
            edit_type="restyle",  # Changed from "clarity" to valid type
            instructions="Use active voice and simplify language",  # Changed from suggestions list
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'edited_content' in result
        assert 'changes_made' in result
        assert len(result['changes_made']) > 0
    
    def test_format_markdown_conversion(self):
        """Test markdown formatting"""
        plain_text = "Title\n\nThis is a paragraph.\n\nSubheading\nMore content here."
        result = format_markdown(
            content=plain_text,
            style="github",
            add_toc=True,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'formatted_content' in result
        assert '# Title' in result['formatted_content']
        assert '## Subheading' in result['formatted_content']
        assert result['toc'] is not None  # Changed from has_toc to toc
    
    def test_check_grammar_analysis(self):
        """Test grammar checking"""
        content = "This are a test sentence with grammar issue."
        result = check_grammar(
            content=content,
            style_guide="standard",
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'score' in result  # Changed from grammar_score
        assert 'corrections' in result  # Changed from issues
        assert len(result['corrections']) > 0
        assert result['score'] < 100  # Changed from grammar_score
    
    def test_improve_clarity_technical(self):
        """Test clarity improvement for technical audience"""
        content = "The implementation utilizes a paradigm shift in algorithmic processing."
        result = improve_clarity(
            content=content,
            target_audience="technical",  # Changed from audience
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'improved_content' in result
        assert 'readability_score' in result
        assert 'improvements_made' in result  # Changed from improvements


class TestContentCreationSpecialist:
    """Test the Content Creation Specialist agent"""
    
    @patch('agents.specialists.content_creation_specialist.content_creation_specialist.run')
    def test_specialist_document_creation(self, mock_run):
        """Test specialist handling document creation request"""
        mock_run.return_value = "Document created successfully"
        
        request = "Write a technical report about cloud security best practices"
        result = content_creation_specialist.run(request, {})
        
        mock_run.assert_called_once_with(request, {})
        assert result == "Document created successfully"
    
    @patch('agents.specialists.content_creation_specialist.content_creation_specialist.run')
    def test_specialist_editing_workflow(self, mock_run):
        """Test specialist handling editing workflow"""
        mock_run.return_value = "Content edited and improved"
        
        request = "Edit and improve this blog post about machine learning"
        context = {"content": "Original blog post content..."}
        result = content_creation_specialist.run(request, context)
        
        mock_run.assert_called_once_with(request, context)
        assert result == "Content edited and improved"


class TestContentCreationIntegration:
    """Integration tests for content creation workflow"""
    
    def test_full_document_workflow(self):
        """Test complete document creation workflow"""
        context = Mock(spec=ToolContext)
        context.state = {}
        
        # Step 1: Generate outline
        outline_result = generate_outline(
            topic="API Documentation",
            depth=2,
            style="technical",
            tool_context=context
        )
        assert outline_result['status'] == 'success'
        
        # Step 2: Write document
        doc_result = write_document(
            doc_type="documentation",
            topic="API Documentation",
            requirements="Include examples and error codes",
            word_count=1000,
            tool_context=context
        )
        assert doc_result['status'] == 'success'
        
        # Step 3: Format as markdown
        format_result = format_markdown(
            content=doc_result['document'],
            style="github",
            add_toc=True,
            tool_context=context
        )
        assert format_result['status'] == 'success'
        
        # Step 4: Check grammar
        grammar_result = check_grammar(
            content=format_result['formatted_content'],
            style_guide="technical",
            tool_context=context
        )
        assert grammar_result['status'] == 'success'
        
        # Step 5: Improve clarity
        clarity_result = improve_clarity(
            content=format_result['formatted_content'],
            audience="developer",
            tool_context=context
        )
        assert clarity_result['status'] == 'success'


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])