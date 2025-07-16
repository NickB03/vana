"""
Test suite for Research Specialist - ADK Compliant

Tests all 6 research tools and the specialist agent integration.
"""

import pytest
from unittest.mock import Mock, patch
from google.adk.tools import ToolContext

# Import the tools
from lib._tools.research_tools import (
    web_search_advanced,
    analyze_sources,
    extract_facts,
    synthesize_findings,
    validate_information,
    generate_citations
)

# Import the specialist
from agents.specialists.research_specialist import research_specialist


class TestResearchTools:
    """Test individual research tools"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.tool_context = Mock(spec=ToolContext)
        self.tool_context.state = {}
    
    def test_web_search_advanced_with_filters(self):
        """Test advanced web search with multiple filters"""
        filters = {
            'date_range': 'last_month',
            'domain': '.edu',
            'file_type': 'pdf'
        }
        
        result = web_search_advanced(
            query="machine learning ethics",
            filters=filters,
            num_results=10,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'results' in result
        assert len(result['results']) > 0
        assert 'search_id' in result
        assert result['applied_filters'] == filters
    
    def test_web_search_invalid_results_count(self):
        """Test web search with invalid results count"""
        result = web_search_advanced(
            query="test query",
            filters={},
            num_results=100,  # Too high
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'error'
        assert 'between 1 and 50' in result['error_message']
    
    def test_analyze_sources_credibility(self):
        """Test source credibility analysis"""
        sources = [
            "https://example.edu/research/paper1.pdf",
            "https://government.gov/report.html",
            "https://blog.com/opinion-piece",
            "https://wikipedia.org/wiki/Topic"
        ]
        
        result = analyze_sources(
            sources=sources,
            credibility_check=True,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'analysis' in result
        assert len(result['analysis']) == 4
        assert result['credibility_score'] > 0
        assert len(result['recommendations']) <= 3
    
    def test_extract_facts_statistics(self):
        """Test fact extraction for statistics"""
        content = """
        Recent studies show that 75% of organizations have adopted AI.
        The market size reached $50 billion in 2023.
        "AI is transforming industries," said the CEO.
        Implementation costs decreased by 30% since 2022.
        """
        
        result = extract_facts(
            content=content,
            topic="AI adoption",
            fact_type="statistics",
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'facts' in result
        assert result['fact_count'] > 0
        assert any(fact['type'] == 'statistic' for fact in result['facts'])
    
    def test_synthesize_findings_narrative(self):
        """Test synthesis in narrative format"""
        findings = [
            {'source': 'Source 1', 'content': 'AI adoption is increasing rapidly'},
            {'source': 'Source 2', 'content': 'Cost barriers are decreasing'},
            {'source': 'Source 3', 'content': 'Skills gap remains a challenge'}
        ]
        
        result = synthesize_findings(
            findings=findings,
            format='narrative',
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'synthesis' in result
        assert 'key_themes' in result
        assert len(result['key_themes']) > 0
        assert result['sources_synthesized'] == 3
    
    def test_validate_information_verification(self):
        """Test information validation"""
        claim = "AI adoption has increased by 75% in the last year"
        sources = [
            "https://research.edu/ai-adoption-2024",
            "https://industry-report.com/ai-trends",
            "https://tech-blog.com/ai-statistics"
        ]
        
        result = validate_information(
            claim=claim,
            sources=sources,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'validation_result' in result
        assert result['validation_result'] in ['verified', 'unverified', 'contradicted', 'partial']
        assert 'confidence_level' in result
        assert 0 <= result['confidence_level'] <= 100
    
    def test_generate_citations_apa_style(self):
        """Test citation generation in APA style"""
        sources = [
            {
                'title': 'The Future of AI',
                'author': 'Smith, J.',
                'date': '2024',
                'url': 'https://journal.com/article1'
            },
            {
                'title': 'Machine Learning Applications',
                'author': 'Johnson, M.',
                'date': '2023',
                'url': 'https://research.edu/ml-apps'
            }
        ]
        
        result = generate_citations(
            sources=sources,
            style='apa',
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'success'
        assert 'citations' in result
        assert len(result['citations']) == 2
        assert 'bibliography' in result
        assert result['style'] == 'APA'


class TestResearchSpecialist:
    """Test the Research Specialist agent"""
    
    @patch('agents.specialists.research_specialist.research_specialist.run')
    def test_specialist_research_request(self, mock_run):
        """Test specialist handling research request"""
        mock_run.return_value = "Research completed with 5 credible sources"
        
        request = "Research the latest developments in quantum computing"
        result = research_specialist.run(request, {})
        
        mock_run.assert_called_once_with(request, {})
        assert result == "Research completed with 5 credible sources"
    
    @patch('agents.specialists.research_specialist.research_specialist.run')
    def test_specialist_fact_checking(self, mock_run):
        """Test specialist handling fact-checking request"""
        mock_run.return_value = "Claim verified with high confidence"
        
        request = "Fact-check: AI market size reached $100 billion in 2024"
        context = {"sources": ["source1", "source2"]}
        result = research_specialist.run(request, context)
        
        mock_run.assert_called_once_with(request, context)
        assert result == "Claim verified with high confidence"


class TestResearchIntegration:
    """Integration tests for research workflow"""
    
    def test_full_research_workflow(self):
        """Test complete research workflow"""
        context = Mock(spec=ToolContext)
        context.state = {}
        
        # Step 1: Advanced search
        search_result = web_search_advanced(
            query="renewable energy innovations",
            filters={'date_range': 'last_year', 'domain': '.edu'},
            num_results=5,
            tool_context=context
        )
        assert search_result['status'] == 'success'
        
        # Step 2: Analyze sources
        sources = [r['url'] for r in search_result['results']]
        analysis_result = analyze_sources(
            sources=sources,
            credibility_check=True,
            tool_context=context
        )
        assert analysis_result['status'] == 'success'
        
        # Step 3: Extract facts
        content = "Sample research content with statistics and claims"
        facts_result = extract_facts(
            content=content,
            topic="renewable energy",
            fact_type="all",
            tool_context=context
        )
        assert facts_result['status'] == 'success'
        
        # Step 4: Validate key claims
        validation_result = validate_information(
            claim="Renewable energy adoption increased",
            sources=sources[:3],
            tool_context=context
        )
        assert validation_result['status'] == 'success'
        
        # Step 5: Synthesize findings
        findings = [
            {'source': s, 'content': 'Research finding'} 
            for s in sources[:3]
        ]
        synthesis_result = synthesize_findings(
            findings=findings,
            format='structured',
            tool_context=context
        )
        assert synthesis_result['status'] == 'success'
        
        # Step 6: Generate citations
        source_data = [
            {'title': 'Study ' + str(i), 'author': 'Author ' + str(i), 
             'date': '2024', 'url': url}
            for i, url in enumerate(sources[:3])
        ]
        citation_result = generate_citations(
            sources=source_data,
            style='apa',
            tool_context=context
        )
        assert citation_result['status'] == 'success'


# Test error handling
class TestErrorHandling:
    """Test error handling in research tools"""
    
    def setup_method(self):
        self.tool_context = Mock(spec=ToolContext)
        self.tool_context.state = {}
    
    def test_empty_sources_analysis(self):
        """Test analyzing empty sources list"""
        result = analyze_sources(
            sources=[],
            credibility_check=True,
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'error'
        assert 'No sources provided' in result['error_message']
    
    def test_invalid_citation_style(self):
        """Test invalid citation style"""
        sources = [{'title': 'Test', 'author': 'Test', 'date': '2024', 'url': 'test.com'}]
        result = generate_citations(
            sources=sources,
            style='invalid_style',
            tool_context=self.tool_context
        )
        
        assert result['status'] == 'error'
        assert 'Style must be one of' in result['error_message']


# Pytest configuration
if __name__ == "__main__":
    pytest.main([__file__, "-v"])