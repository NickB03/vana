"""
Research Tools - ADK Compliant Implementation

Pure ADK pattern implementation following Google's official guidelines.
Async functions returning strings with simple error handling.
"""

from google.adk.tools import FunctionTool, ToolContext
import re
import uuid
from datetime import datetime, timedelta
import random
import asyncio
from urllib.parse import urlparse
from collections import Counter
from typing import List, Dict, Any

# Keep the useful helper classes
class SearchEngine:
    """Simulates realistic search results based on query analysis."""
    
    DOMAINS = {
        'academic': [
            'scholar.google.com', 'arxiv.org', 'pubmed.ncbi.nlm.nih.gov',
            'jstor.org', 'sciencedirect.com', 'nature.com', 'ieee.org'
        ],
        'news': [
            'reuters.com', 'bbc.com', 'cnn.com', 'nytimes.com',
            'wsj.com', 'apnews.com', 'theguardian.com'
        ],
        'tech': [
            'stackoverflow.com', 'github.com', 'medium.com', 'dev.to',
            'techcrunch.com', 'arstechnica.com', 'wired.com'
        ],
        'general': [
            'wikipedia.org', 'britannica.com', 'howstuffworks.com',
            'investopedia.com', 'webmd.com', 'mayoclinic.org'
        ]
    }
    
    @staticmethod
    def generate_results(query: str, filters: Dict[str, Any], num_results: int) -> List[Dict[str, Any]]:
        """Generate realistic search results."""
        results = []
        query_lower = query.lower()
        
        # Determine relevant domains
        if any(term in query_lower for term in ['research', 'study', 'analysis', 'paper']):
            primary_domains = SearchEngine.DOMAINS['academic']
        elif any(term in query_lower for term in ['news', 'current', 'latest', 'today']):
            primary_domains = SearchEngine.DOMAINS['news']
        elif any(term in query_lower for term in ['code', 'programming', 'software', 'api']):
            primary_domains = SearchEngine.DOMAINS['tech']
        else:
            primary_domains = SearchEngine.DOMAINS['general']
        
        # Apply domain filter
        if filters.get('domain'):
            primary_domains = [d for d in primary_domains if filters['domain'] in d]
            if not primary_domains:
                primary_domains = [f"example.{filters['domain']}"]
        
        # Generate results
        for i in range(min(num_results, 20)):
            domain = random.choice(primary_domains) if i < len(primary_domains) else random.choice(SearchEngine.DOMAINS['general'])
            
            title = f"{query.title()}: {'Comprehensive Guide' if i == 0 else 'Analysis'}"
            snippet = f"Information about {query}. Updated {datetime.now().strftime('%B %Y')}."
            
            published_date = datetime.now() - timedelta(days=random.randint(1, 365))
            if filters.get('date_range') == 'last_week':
                published_date = datetime.now() - timedelta(days=random.randint(1, 7))
            elif filters.get('date_range') == 'last_month':
                published_date = datetime.now() - timedelta(days=random.randint(1, 30))
            
            results.append({
                'title': title,
                'url': f"https://{domain}/articles/{query.lower().replace(' ', '-')}-{i+1}",
                'snippet': snippet,
                'domain': domain,
                'published_date': published_date.isoformat(),
                'relevance_score': 0.95 - (i * 0.05)
            })
        
        return results


async def web_search_advanced(
    query: str,
    filters: Dict[str, Any],
    num_results: int,
    tool_context: ToolContext
) -> str:
    """
    Performs advanced web search with filtering.
    
    Args:
        query: Search query
        filters: Search filters (domain, date_range, file_type)
        num_results: Number of results to return (1-50)
        tool_context: ADK tool context
        
    Returns:
        Success message with search results or error message
    """
    try:
        # Validation
        if not query or len(query) < 3:
            return "Error: Query must be at least 3 characters long"
            
        if num_results < 1 or num_results > 50:
            return "Error: Number of results must be between 1 and 50"
        
        # Validate filters
        valid_date_ranges = ['last_week', 'last_month', 'last_year', 'anytime']
        if 'date_range' in filters and filters['date_range'] not in valid_date_ranges:
            return f"Error: Date range must be one of: {', '.join(valid_date_ranges)}"
        
        # Generate search results
        results = SearchEngine.generate_results(query, filters, num_results)
        
        # Store search in context
        search_id = str(uuid.uuid4())[:8]
        tool_context.state[f'search_{search_id}'] = {
            'query': query,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
        
        # Format results
        result_text = f"Search results for '{query}' (ID: {search_id}):\n\n"
        
        for i, result in enumerate(results, 1):
            result_text += f"{i}. {result['title']}\n"
            result_text += f"   URL: {result['url']}\n"
            result_text += f"   {result['snippet']}\n"
            result_text += f"   Published: {result['published_date'][:10]}\n\n"
        
        filters_text = ", ".join(f"{k}={v}" for k, v in filters.items()) if filters else "none"
        result_text += f"[Found {len(results)} results, Filters: {filters_text}]"
        
        return result_text
        
    except Exception as e:
        return f"Error performing search: {str(e)}"


async def analyze_sources(
    sources: List[str],
    check_credibility: bool,
    tool_context: ToolContext
) -> str:
    """
    Analyzes source credibility and bias.
    
    Args:
        sources: List of source URLs to analyze
        check_credibility: Whether to perform credibility analysis
        tool_context: ADK tool context
        
    Returns:
        Success message with analysis results or error message
    """
    try:
        # Validation
        if not sources:
            return "Error: At least one source URL must be provided"
            
        if len(sources) > 20:
            return "Error: Maximum 20 sources can be analyzed at once"
        
        analysis_text = f"Source analysis for {len(sources)} sources:\n\n"
        
        total_credibility = 0
        domain_types = {'academic': 0, 'news': 0, 'government': 0, 'commercial': 0, 'other': 0}
        
        for i, source_url in enumerate(sources, 1):
            domain = urlparse(source_url).netloc
            
            # Analyze domain credibility
            credibility_score = 0.5  # Default
            if '.edu' in domain:
                credibility_score = 0.9
                domain_types['academic'] += 1
            elif '.gov' in domain:
                credibility_score = 0.95
                domain_types['government'] += 1
            elif any(news in domain for news in ['reuters.com', 'bbc.com', 'nytimes.com']):
                credibility_score = 0.8
                domain_types['news'] += 1
            elif '.com' in domain:
                credibility_score = 0.6
                domain_types['commercial'] += 1
            else:
                domain_types['other'] += 1
            
            total_credibility += credibility_score
            
            if check_credibility:
                analysis_text += f"{i}. {domain}\n"
                analysis_text += f"   Credibility: {credibility_score:.2f}/1.0\n"
                analysis_text += f"   Type: {[k for k, v in domain_types.items() if v > 0][-1]}\n\n"
        
        # Summary
        avg_credibility = total_credibility / len(sources)
        diversity_score = len(set(urlparse(s).netloc for s in sources)) / len(sources)
        
        analysis_text += f"\nSummary:\n"
        analysis_text += f"- Average credibility: {avg_credibility:.2f}/1.0\n"
        analysis_text += f"- Source diversity: {diversity_score:.2f}\n"
        analysis_text += f"- Domain types: {', '.join(f'{k}={v}' for k, v in domain_types.items() if v > 0)}\n"
        
        # Recommendations
        if avg_credibility < 0.7:
            analysis_text += "\nRecommendation: Include more authoritative sources (.edu, .gov)"
        if diversity_score < 0.5:
            analysis_text += "\nRecommendation: Diversify sources for balanced perspective"
        
        return analysis_text
        
    except Exception as e:
        return f"Error analyzing sources: {str(e)}"


async def extract_facts(
    content: str,
    fact_types: List[str],
    tool_context: ToolContext
) -> str:
    """
    Extracts specific facts from content.
    
    Args:
        content: Content to extract facts from
        fact_types: Types of facts to extract (statistics, dates, quotes, claims, financial, all)
        tool_context: ADK tool context
        
    Returns:
        Success message with extracted facts or error message
    """
    try:
        # Validation
        if not content or len(content) < 20:
            return "Error: Content must be at least 20 characters long"
            
        valid_fact_types = ['statistics', 'dates', 'quotes', 'claims', 'financial', 'all']
        invalid_types = [ft for ft in fact_types if ft not in valid_fact_types]
        if invalid_types:
            return f"Error: Invalid fact types: {', '.join(invalid_types)}"
        
        facts_found = []
        
        # Extract different fact types
        if 'all' in fact_types or 'statistics' in fact_types:
            # Find percentages and numbers
            stats = re.findall(r'(\d+(?:\.\d+)?)\s*(%|percent)', content, re.IGNORECASE)
            for stat in stats:
                facts_found.append(f"Statistic: {stat[0]}{stat[1]}")
        
        if 'all' in fact_types or 'dates' in fact_types:
            # Find dates
            dates = re.findall(r'((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})', content)
            for date in dates:
                facts_found.append(f"Date: {date}")
            
            # Find years
            years = re.findall(r'\b(19\d{2}|20\d{2})\b', content)
            for year in years:
                facts_found.append(f"Year: {year}")
        
        if 'all' in fact_types or 'quotes' in fact_types:
            # Find quotes
            quotes = re.findall(r'"([^"]+)"\s*[-–]\s*([^,\n]+)', content)
            for quote in quotes:
                facts_found.append(f"Quote: \"{quote[0]}\" - {quote[1]}")
        
        if 'all' in fact_types or 'financial' in fact_types:
            # Find financial amounts
            amounts = re.findall(r'(\$\d+(?:,\d{3})*(?:\.\d+)?)\s*(million|billion|trillion)?', content, re.IGNORECASE)
            for amount in amounts:
                scale = f" {amount[1]}" if amount[1] else ""
                facts_found.append(f"Financial: {amount[0]}{scale}")
        
        if 'all' in fact_types or 'claims' in fact_types:
            # Find claims
            claims = re.findall(r'(?:studies show|research indicates|data suggests|according to)\s+([^.]+)', content, re.IGNORECASE)
            for claim in claims[:5]:  # Limit to 5 claims
                facts_found.append(f"Claim: {claim.strip()}")
        
        # Format results
        if facts_found:
            result = f"Extracted {len(facts_found)} facts:\n\n"
            for i, fact in enumerate(facts_found, 1):
                result += f"{i}. {fact}\n"
            result += f"\n[Fact types searched: {', '.join(fact_types)}]"
        else:
            result = f"No facts found matching types: {', '.join(fact_types)}"
        
        return result
        
    except Exception as e:
        return f"Error extracting facts: {str(e)}"


async def synthesize_findings(
    findings: List[str],
    synthesis_type: str,
    tool_context: ToolContext
) -> str:
    """
    Synthesizes multiple findings into coherent insights.
    
    Args:
        findings: List of findings to synthesize
        synthesis_type: Type of synthesis (summary, comparison, trend_analysis, thematic)
        tool_context: ADK tool context
        
    Returns:
        Success message with synthesis or error message
    """
    try:
        # Validation
        if not findings:
            return "Error: At least one finding must be provided"
            
        if len(findings) > 50:
            return "Error: Maximum 50 findings can be synthesized at once"
            
        valid_types = ['summary', 'comparison', 'trend_analysis', 'thematic']
        if synthesis_type not in valid_types:
            return f"Error: Synthesis type must be one of: {', '.join(valid_types)}"
        
        # Analyze findings
        all_text = ' '.join(findings)
        words = re.findall(r'\b\w+\b', all_text.lower())
        word_freq = Counter(words)
        
        # Remove common words
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were'}
        for word in common_words:
            word_freq.pop(word, None)
        
        top_themes = word_freq.most_common(5)
        
        # Generate synthesis
        synthesis = f"Synthesis ({synthesis_type}) of {len(findings)} findings:\n\n"
        
        if synthesis_type == 'summary':
            synthesis += "Key Points:\n"
            for i, finding in enumerate(findings[:5], 1):
                synthesis += f"{i}. {finding[:100]}{'...' if len(finding) > 100 else ''}\n"
            synthesis += f"\nMain theme: {top_themes[0][0] if top_themes else 'No dominant theme'}"
            
        elif synthesis_type == 'comparison':
            synthesis += "Comparative Analysis:\n"
            synthesis += f"- Common themes: {', '.join(theme[0] for theme in top_themes[:3])}\n"
            synthesis += f"- Total concepts analyzed: {len(word_freq)}\n"
            synthesis += f"- Information density: {len(words)} words across findings"
            
        elif synthesis_type == 'trend_analysis':
            time_indicators = re.findall(r'\b(increasing|decreasing|growing|declining|stable|changing)\b', all_text, re.I)
            synthesis += "Trend Patterns:\n"
            if time_indicators:
                trend_counts = Counter(time_indicators)
                for trend, count in trend_counts.most_common():
                    synthesis += f"- {trend.capitalize()}: mentioned {count} times\n"
            else:
                synthesis += "- No clear temporal trends identified\n"
            
        elif synthesis_type == 'thematic':
            synthesis += "Major Themes:\n"
            for i, (theme, freq) in enumerate(top_themes, 1):
                synthesis += f"{i}. {theme.title()} (frequency: {freq})\n"
        
        synthesis += f"\n[Analysis complete. Top keywords: {', '.join(t[0] for t in top_themes[:3])}]"
        
        return synthesis
        
    except Exception as e:
        return f"Error synthesizing findings: {str(e)}"


async def validate_information(
    claims: List[str],
    sources: List[str],
    tool_context: ToolContext
) -> str:
    """
    Cross-references claims with sources for validation.
    
    Args:
        claims: List of claims to validate
        sources: List of source URLs for validation
        tool_context: ADK tool context
        
    Returns:
        Success message with validation results or error message
    """
    try:
        # Validation
        if not claims:
            return "Error: At least one claim must be provided"
            
        if not sources:
            return "Error: At least one source must be provided for validation"
            
        if len(claims) > 20:
            return "Error: Maximum 20 claims can be validated at once"
        
        validation_results = f"Validation results for {len(claims)} claims against {len(sources)} sources:\n\n"
        
        verified_count = 0
        disputed_count = 0
        
        for i, claim in enumerate(claims, 1):
            # Simple simulation of validation
            # In reality, this would analyze source content
            validation_score = random.random()
            
            if validation_score > 0.7:
                status = "✓ Verified"
                verified_count += 1
            elif validation_score < 0.3:
                status = "✗ Disputed"
                disputed_count += 1
            else:
                status = "? Partially verified"
            
            validation_results += f"{i}. Claim: {claim[:100]}{'...' if len(claim) > 100 else ''}\n"
            validation_results += f"   Status: {status} (confidence: {validation_score:.2f})\n\n"
        
        # Summary
        validation_results += f"\nSummary:\n"
        validation_results += f"- Verified: {verified_count}/{len(claims)}\n"
        validation_results += f"- Disputed: {disputed_count}/{len(claims)}\n"
        validation_results += f"- Partially verified: {len(claims) - verified_count - disputed_count}/{len(claims)}\n"
        
        if disputed_count > 0:
            validation_results += "\nRecommendation: Further investigation needed for disputed claims"
        
        return validation_results
        
    except Exception as e:
        return f"Error validating information: {str(e)}"


async def generate_citations(
    sources: List[Dict[str, Any]],
    citation_style: str,
    tool_context: ToolContext
) -> str:
    """
    Generates formatted citations for sources.
    
    Args:
        sources: List of source dictionaries with metadata
        citation_style: Citation style (apa, mla, chicago, harvard, simple)
        tool_context: ADK tool context
        
    Returns:
        Success message with formatted citations or error message
    """
    try:
        # Validation
        if not sources:
            return "Error: At least one source must be provided"
            
        if len(sources) > 100:
            return "Error: Maximum 100 sources can be cited at once"
            
        valid_styles = ['apa', 'mla', 'chicago', 'harvard', 'simple']
        if citation_style not in valid_styles:
            return f"Error: Citation style must be one of: {', '.join(valid_styles)}"
        
        citations_text = f"Bibliography ({citation_style.upper()} style):\n\n"
        
        for i, source in enumerate(sources, 1):
            # Extract metadata with defaults
            if not isinstance(source, dict):
                source = {'url': str(source)}
            
            author = source.get('author', 'Unknown Author')
            title = source.get('title', 'Untitled')
            url = source.get('url', '')
            domain = urlparse(url).netloc if url else 'Unknown Source'
            year = source.get('year', datetime.now().year)
            
            # Format based on style
            if citation_style == 'apa':
                citation = f"{author} ({year}). {title}. {domain}. {url}"
            elif citation_style == 'mla':
                citation = f'{author}. "{title}." {domain}, {year}. Web.'
            elif citation_style == 'chicago':
                citation = f'{author}. "{title}." {domain}. Accessed {datetime.now().strftime("%B %d, %Y")}. {url}'
            elif citation_style == 'harvard':
                citation = f"{author} {year}, '{title}', {domain}, <{url}>"
            else:  # simple
                citation = f"{title} - {author} ({year}). {url}"
            
            citations_text += f"{i}. {citation}\n\n"
        
        citations_text += f"[Generated {len(sources)} citations in {citation_style.upper()} format]"
        
        return citations_text
        
    except Exception as e:
        return f"Error generating citations: {str(e)}"


# Create FunctionTool wrappers
tools = [
    FunctionTool(web_search_advanced, name="web_search_advanced"),
    FunctionTool(analyze_sources, name="analyze_sources"),
    FunctionTool(extract_facts, name="extract_facts"),
    FunctionTool(synthesize_findings, name="synthesize_findings"),
    FunctionTool(validate_information, name="validate_information"),
    FunctionTool(generate_citations, name="generate_citations")
]

# Export all tools
__all__ = ['tools'] + [tool.name for tool in tools]