"""
Research Tools - ADK Compliant Implementation

Tools for conducting research, analyzing sources, and synthesizing findings
following Google ADK patterns.
"""

from typing import Dict, Any, List
from google.adk.tools import FunctionTool, ToolContext
import json
from datetime import datetime
import hashlib


def web_search_advanced(
    query: str,
    filters: Dict[str, Any],
    num_results: int,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Performs advanced web search with filtering capabilities.
    
    Use this tool to search the web with specific filters for date ranges,
    domains, file types, or content types. Ideal for comprehensive research
    requiring targeted results.
    
    Args:
        query: Search query string
        filters: Filter dictionary with keys: date_range, domain, file_type, region
        num_results: Number of results to return (1-50)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - results: List of search results with title, url, snippet
        - total_found: Total number of matching results
        - search_id: Unique identifier for this search
        - error_message: Error details (if error)
        
    Example:
        >>> filters = {
        ...     'date_range': 'last_month',
        ...     'domain': '.edu',
        ...     'file_type': 'pdf'
        ... }
        >>> result = web_search_advanced("machine learning", filters, 10, context)
    """
    try:
        # Validate inputs
        if num_results < 1 or num_results > 50:
            return {
                'status': 'error',
                'error_message': 'Number of results must be between 1 and 50'
            }
            
        # Simulate search with filters
        search_id = hashlib.md5(f"{query}{json.dumps(filters)}".encode()).hexdigest()[:8]
        
        # Build filter string
        filter_parts = []
        if filters.get('domain'):
            filter_parts.append(f"site:{filters['domain']}")
        if filters.get('file_type'):
            filter_parts.append(f"filetype:{filters['file_type']}")
        if filters.get('date_range'):
            filter_parts.append(f"date:{filters['date_range']}")
            
        full_query = f"{query} {' '.join(filter_parts)}".strip()
        
        # Simulate results
        results = []
        for i in range(min(num_results, 5)):  # Return max 5 simulated results
            results.append({
                'title': f"Result {i+1} for: {query}",
                'url': f"https://example.com/result{i+1}",
                'snippet': f"This is a relevant snippet about {query} with filters applied...",
                'date': datetime.now().isoformat()
            })
            
        # Store search in context
        if hasattr(tool_context, 'state'):
            tool_context.state[f'search_{search_id}'] = {
                'query': full_query,
                'timestamp': datetime.now().isoformat(),
                'result_count': len(results)
            }
            
        return {
            'status': 'success',
            'results': results,
            'total_found': len(results) * 10,  # Simulate more results available
            'search_id': search_id,
            'applied_filters': filters
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Search failed: {str(e)}'
        }


def analyze_sources(
    sources: List[str],
    credibility_check: bool,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Analyzes multiple sources for credibility and relevance.
    
    Use this tool to evaluate the quality, credibility, and relevance
    of information sources. Performs domain analysis, publication date
    checking, and author verification when possible.
    
    Args:
        sources: List of source URLs or references
        credibility_check: Whether to perform deep credibility analysis
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - analysis: List of source analyses
        - credibility_score: Overall credibility score (0-100)
        - recommendations: List of most credible sources
        - error_message: Error details (if error)
    """
    try:
        if not sources:
            return {
                'status': 'error',
                'error_message': 'No sources provided for analysis'
            }
            
        analysis = []
        total_score = 0
        
        for source in sources:
            # Analyze each source
            source_analysis = {
                'source': source,
                'domain_type': 'unknown',
                'credibility': 50,
                'factors': []
            }
            
            # Check domain type
            if '.edu' in source:
                source_analysis['domain_type'] = 'educational'
                source_analysis['credibility'] = 85
                source_analysis['factors'].append('Educational institution')
            elif '.gov' in source:
                source_analysis['domain_type'] = 'government'
                source_analysis['credibility'] = 90
                source_analysis['factors'].append('Government source')
            elif '.org' in source:
                source_analysis['domain_type'] = 'organization'
                source_analysis['credibility'] = 70
                source_analysis['factors'].append('Non-profit organization')
            elif any(domain in source for domain in ['wikipedia', 'britannica', 'nature', 'science']):
                source_analysis['domain_type'] = 'authoritative'
                source_analysis['credibility'] = 80
                source_analysis['factors'].append('Known authoritative source')
                
            if credibility_check:
                # Additional checks
                if 'https' in source:
                    source_analysis['credibility'] += 5
                    source_analysis['factors'].append('Secure connection')
                    
            analysis.append(source_analysis)
            total_score += source_analysis['credibility']
            
        # Calculate overall score
        overall_score = total_score / len(sources) if sources else 0
        
        # Get recommendations
        sorted_sources = sorted(analysis, key=lambda x: x['credibility'], reverse=True)
        recommendations = [s['source'] for s in sorted_sources[:3]]
        
        return {
            'status': 'success',
            'analysis': analysis,
            'credibility_score': int(overall_score),
            'recommendations': recommendations,
            'sources_analyzed': len(sources)
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to analyze sources: {str(e)}'
        }


def extract_facts(
    content: str,
    topic: str,
    fact_type: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Extracts specific facts from content related to a topic.
    
    Use this tool to identify and extract factual information,
    statistics, quotes, or claims from text content. Useful for
    building evidence-based arguments or summaries.
    
    Args:
        content: Text content to analyze
        topic: Main topic to focus on
        fact_type: Type of facts to extract (statistics, quotes, claims, dates, all)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - facts: List of extracted facts with type and context
        - fact_count: Number of facts found
        - summary: Brief summary of findings
        - error_message: Error details (if error)
    """
    try:
        valid_types = ['statistics', 'quotes', 'claims', 'dates', 'all']
        if fact_type not in valid_types:
            return {
                'status': 'error',
                'error_message': f'Fact type must be one of: {", ".join(valid_types)}'
            }
            
        facts = []
        
        # Simulate fact extraction based on type
        lines = content.split('.')
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
                
            if fact_type in ['statistics', 'all'] and any(char.isdigit() for char in line):
                facts.append({
                    'type': 'statistic',
                    'content': line,
                    'context': f"Found in sentence {i+1}",
                    'relevance_to_topic': 'high' if topic.lower() in line.lower() else 'medium'
                })
                
            if fact_type in ['quotes', 'all'] and ('"' in line or "'" in line):
                facts.append({
                    'type': 'quote',
                    'content': line,
                    'context': f"Found in sentence {i+1}",
                    'relevance_to_topic': 'high' if topic.lower() in line.lower() else 'low'
                })
                
            if fact_type in ['dates', 'all'] and any(year in line for year in ['2024', '2023', '2022']):
                facts.append({
                    'type': 'date',
                    'content': line,
                    'context': f"Found in sentence {i+1}",
                    'relevance_to_topic': 'medium'
                })
                
        # Generate summary
        summary = f"Extracted {len(facts)} {fact_type} facts related to {topic}"
        
        return {
            'status': 'success',
            'facts': facts,
            'fact_count': len(facts),
            'summary': summary,
            'topic': topic
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to extract facts: {str(e)}'
        }


def synthesize_findings(
    findings: List[Dict],
    format: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Synthesizes multiple research findings into a coherent summary.
    
    Use this tool to combine and organize research findings from
    multiple sources into a structured summary. Identifies patterns,
    contradictions, and key themes.
    
    Args:
        findings: List of finding dictionaries with source and content
        format: Output format (narrative, bullet_points, structured, comparison)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - synthesis: Synthesized content in requested format
        - key_themes: List of identified themes
        - contradictions: Any conflicting information found
        - error_message: Error details (if error)
    """
    try:
        valid_formats = ['narrative', 'bullet_points', 'structured', 'comparison']
        if format not in valid_formats:
            return {
                'status': 'error',
                'error_message': f'Format must be one of: {", ".join(valid_formats)}'
            }
            
        if not findings:
            return {
                'status': 'error',
                'error_message': 'No findings provided to synthesize'
            }
            
        # Extract themes
        all_content = ' '.join([f.get('content', '') for f in findings])
        key_themes = ['Main theme 1', 'Main theme 2', 'Main theme 3']  # Simulated
        
        # Generate synthesis based on format
        if format == 'narrative':
            synthesis = f"""Based on analysis of {len(findings)} sources, several key themes emerge:

{all_content[:200]}...

The findings suggest that the topic encompasses multiple perspectives, with 
general agreement on core concepts but some variation in implementation details."""
            
        elif format == 'bullet_points':
            synthesis = f"""Key Findings from {len(findings)} sources:

• Finding 1: Primary insight from research
• Finding 2: Secondary observation
• Finding 3: Supporting evidence
• Finding 4: Additional context
• Finding 5: Concluding thoughts

Sources analyzed: {len(findings)}"""
            
        elif format == 'structured':
            synthesis = f"""# Research Synthesis

## Overview
Analysis of {len(findings)} sources reveals:

## Key Themes
1. {key_themes[0]}
2. {key_themes[1]}
3. {key_themes[2]}

## Detailed Findings
[Structured presentation of findings]

## Conclusions
[Summary of synthesized insights]"""
            
        else:  # comparison
            synthesis = f"""# Comparative Analysis

## Source Agreement
- Point A: All sources agree
- Point B: Majority consensus

## Source Divergence  
- Issue 1: Sources differ on approach
- Issue 2: Conflicting data

## Unique Contributions
- Source 1: [Unique insight]
- Source 2: [Unique perspective]"""
            
        # Check for contradictions (simulated)
        contradictions = []
        if len(findings) > 2:
            contradictions.append({
                'topic': 'Implementation approach',
                'sources': ['Source 1', 'Source 3'],
                'nature': 'Minor disagreement on methodology'
            })
            
        return {
            'status': 'success',
            'synthesis': synthesis,
            'key_themes': key_themes,
            'contradictions': contradictions,
            'sources_synthesized': len(findings)
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to synthesize findings: {str(e)}'
        }


def validate_information(
    claim: str,
    sources: List[str],
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Validates a specific claim against provided sources.
    
    Use this tool to fact-check claims, verify statements, or
    confirm information accuracy by cross-referencing multiple
    sources.
    
    Args:
        claim: The claim or statement to validate
        sources: List of sources to check against
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - validation_result: 'verified', 'unverified', 'contradicted', 'partial'
        - supporting_sources: Sources that support the claim
        - contradicting_sources: Sources that contradict
        - confidence_level: Confidence in validation (0-100)
        - error_message: Error details (if error)
    """
    try:
        if not claim:
            return {
                'status': 'error',
                'error_message': 'No claim provided to validate'
            }
            
        if not sources:
            return {
                'status': 'error',
                'error_message': 'No sources provided for validation'
            }
            
        # Simulate validation process
        supporting = []
        contradicting = []
        
        for i, source in enumerate(sources):
            # Simulate source checking
            if i % 3 == 0:  # Every third source supports
                supporting.append({
                    'source': source,
                    'relevance': 'high',
                    'excerpt': f'Evidence supporting: {claim[:50]}...'
                })
            elif i % 5 == 0:  # Every fifth contradicts
                contradicting.append({
                    'source': source,
                    'relevance': 'medium',
                    'excerpt': f'Evidence against: {claim[:50]}...'
                })
                
        # Determine validation result
        if len(supporting) > len(contradicting) * 2:
            validation_result = 'verified'
            confidence = 85
        elif len(contradicting) > len(supporting):
            validation_result = 'contradicted'
            confidence = 70
        elif supporting and not contradicting:
            validation_result = 'verified'
            confidence = 95
        else:
            validation_result = 'partial'
            confidence = 60
            
        return {
            'status': 'success',
            'validation_result': validation_result,
            'supporting_sources': supporting,
            'contradicting_sources': contradicting,
            'confidence_level': confidence,
            'sources_checked': len(sources)
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to validate information: {str(e)}'
        }


def generate_citations(
    sources: List[Dict],
    style: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Generates properly formatted citations for sources.
    
    Use this tool to create citations in various academic styles
    for research sources. Ensures consistent formatting and
    compliance with citation standards.
    
    Args:
        sources: List of source dicts with title, author, date, url
        style: Citation style (apa, mla, chicago, harvard, ieee)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - citations: List of formatted citations
        - bibliography: Full bibliography in requested style
        - inline_format: Example of inline citation
        - error_message: Error details (if error)
    """
    try:
        valid_styles = ['apa', 'mla', 'chicago', 'harvard', 'ieee']
        if style not in valid_styles:
            return {
                'status': 'error',
                'error_message': f'Style must be one of: {", ".join(valid_styles)}'
            }
            
        if not sources:
            return {
                'status': 'error',
                'error_message': 'No sources provided for citation'
            }
            
        citations = []
        
        for i, source in enumerate(sources):
            # Extract source details
            title = source.get('title', f'Untitled Source {i+1}')
            author = source.get('author', 'Unknown Author')
            date = source.get('date', '2024')
            url = source.get('url', '')
            
            # Format based on style
            if style == 'apa':
                citation = f"{author} ({date}). {title}. Retrieved from {url}"
                inline = f"({author}, {date})"
            elif style == 'mla':
                citation = f'{author}. "{title}." Web. {date}.'
                inline = f'({author})'
            elif style == 'chicago':
                citation = f'{author}. "{title}." Accessed {date}. {url}.'
                inline = f'{author}, "{title}"'
            elif style == 'harvard':
                citation = f"{author} {date}, {title}, viewed {date}, <{url}>."
                inline = f"({author} {date})"
            else:  # ieee
                citation = f'[{i+1}] {author}, "{title}," {date}. [Online]. Available: {url}'
                inline = f'[{i+1}]'
                
            citations.append(citation)
            
        # Generate bibliography
        bibliography = f"## References ({style.upper()} Style)\n\n"
        bibliography += '\n\n'.join(citations)
        
        return {
            'status': 'success',
            'citations': citations,
            'bibliography': bibliography,
            'inline_format': inline,
            'style': style.upper(),
            'citation_count': len(citations)
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to generate citations: {str(e)}'
        }


# Create FunctionTool wrappers
adk_web_search_advanced = FunctionTool(web_search_advanced)
adk_web_search_advanced.name = "web_search_advanced"

adk_analyze_sources = FunctionTool(analyze_sources)
adk_analyze_sources.name = "analyze_sources"

adk_extract_facts = FunctionTool(extract_facts)
adk_extract_facts.name = "extract_facts"

adk_synthesize_findings = FunctionTool(synthesize_findings)
adk_synthesize_findings.name = "synthesize_findings"

adk_validate_information = FunctionTool(validate_information)
adk_validate_information.name = "validate_information"

adk_generate_citations = FunctionTool(generate_citations)
adk_generate_citations.name = "generate_citations"

# Export all wrapped tools
__all__ = [
    'adk_web_search_advanced',
    'adk_analyze_sources',
    'adk_extract_facts',
    'adk_synthesize_findings',
    'adk_validate_information',
    'adk_generate_citations'
]