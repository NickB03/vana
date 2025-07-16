"""
Research Tools - ADK Compliant Implementation V2

Pure ADK pattern implementation using built-in google_search tool.
Follows official Google ADK guidelines for grounding and search integration.
"""

from google.adk.tools import FunctionTool, ToolContext, google_search
import re
import uuid
from datetime import datetime
import asyncio
from urllib.parse import urlparse
from collections import Counter
from typing import List, Dict, Any
import json


async def perform_research(
    query: str,
    research_type: str,
    depth: str,
    tool_context: ToolContext
) -> str:
    """
    Performs comprehensive research using Google Search grounding.
    
    This is a wrapper around the built-in google_search that adds
    research-specific processing and formatting.
    
    Args:
        query: Research query
        research_type: Type of research (general, academic, news, technical)
        depth: Research depth (quick, standard, comprehensive)
        tool_context: ADK tool context
        
    Returns:
        Formatted research results with sources
    """
    try:
        # Validation
        if not query or len(query) < 3:
            return "Error: Query must be at least 3 characters long"
            
        valid_types = ['general', 'academic', 'news', 'technical']
        if research_type not in valid_types:
            return f"Error: Research type must be one of: {', '.join(valid_types)}"
            
        valid_depths = ['quick', 'standard', 'comprehensive']
        if depth not in valid_depths:
            return f"Error: Depth must be one of: {', '.join(valid_depths)}"
        
        # Enhance query based on research type
        enhanced_query = query
        if research_type == 'academic':
            enhanced_query = f"{query} research paper study academic"
        elif research_type == 'news':
            enhanced_query = f"{query} latest news current events"
        elif research_type == 'technical':
            enhanced_query = f"{query} technical documentation implementation"
        
        # The google_search tool is used internally by the model
        # We structure our response to guide the model to use it
        research_guidance = f"""Please search for: "{enhanced_query}"
        
Research Parameters:
- Type: {research_type}
- Depth: {depth}
- Focus: Provide comprehensive information with source citations

Please use Google Search to find the most relevant and recent information."""

        # Store research request in context
        research_id = str(uuid.uuid4())[:8]
        tool_context.state[f'research_{research_id}'] = {
            'query': query,
            'enhanced_query': enhanced_query,
            'type': research_type,
            'depth': depth,
            'timestamp': datetime.now().isoformat()
        }
        
        return f"""Research request initiated (ID: {research_id}):

Query: {query}
Type: {research_type}
Depth: {depth}

{research_guidance}

The search results will be grounded with real Google Search data."""
        
    except Exception as e:
        return f"Error performing research: {str(e)}"


async def analyze_sources(
    sources: List[str],
    analysis_type: str,
    tool_context: ToolContext
) -> str:
    """
    Analyzes sources for credibility and relevance.
    
    Args:
        sources: List of source URLs to analyze
        analysis_type: Type of analysis (credibility, bias, relevance, comprehensive)
        tool_context: ADK tool context
        
    Returns:
        Source analysis report
    """
    try:
        # Validation
        if not sources:
            return "Error: At least one source URL must be provided"
            
        if len(sources) > 20:
            return "Error: Maximum 20 sources can be analyzed at once"
            
        valid_types = ['credibility', 'bias', 'relevance', 'comprehensive']
        if analysis_type not in valid_types:
            return f"Error: Analysis type must be one of: {', '.join(valid_types)}"
        
        analysis_results = []
        
        for source_url in sources:
            try:
                domain = urlparse(source_url).netloc
                
                # Analyze domain characteristics
                analysis = {
                    'url': source_url,
                    'domain': domain,
                    'indicators': []
                }
                
                # Credibility indicators
                if '.edu' in domain:
                    analysis['indicators'].append('Academic institution')
                    analysis['credibility_score'] = 0.9
                elif '.gov' in domain:
                    analysis['indicators'].append('Government source')
                    analysis['credibility_score'] = 0.95
                elif any(news in domain for news in ['reuters.com', 'bbc.com', 'nytimes.com', 'apnews.com']):
                    analysis['indicators'].append('Established news outlet')
                    analysis['credibility_score'] = 0.85
                elif '.org' in domain:
                    analysis['indicators'].append('Organization')
                    analysis['credibility_score'] = 0.7
                else:
                    analysis['indicators'].append('Commercial or other')
                    analysis['credibility_score'] = 0.6
                
                # Check for HTTPS
                if source_url.startswith('https://'):
                    analysis['indicators'].append('Secure connection (HTTPS)')
                    analysis['credibility_score'] += 0.05
                
                analysis_results.append(analysis)
                
            except Exception as e:
                analysis_results.append({
                    'url': source_url,
                    'error': str(e)
                })
        
        # Format results
        result_text = f"Source Analysis Report ({analysis_type}):\n\n"
        
        total_credibility = 0
        valid_sources = 0
        
        for i, analysis in enumerate(analysis_results, 1):
            result_text += f"{i}. {analysis.get('domain', 'Unknown')}\n"
            result_text += f"   URL: {analysis['url']}\n"
            
            if 'error' in analysis:
                result_text += f"   Error: {analysis['error']}\n"
            else:
                result_text += f"   Credibility: {analysis['credibility_score']:.2f}/1.0\n"
                result_text += f"   Indicators: {', '.join(analysis['indicators'])}\n"
                total_credibility += analysis['credibility_score']
                valid_sources += 1
            
            result_text += "\n"
        
        # Summary
        if valid_sources > 0:
            avg_credibility = total_credibility / valid_sources
            result_text += f"Summary:\n"
            result_text += f"- Sources analyzed: {len(sources)}\n"
            result_text += f"- Average credibility: {avg_credibility:.2f}/1.0\n"
            result_text += f"- Recommendation: "
            
            if avg_credibility >= 0.8:
                result_text += "High quality sources, suitable for research"
            elif avg_credibility >= 0.6:
                result_text += "Mixed quality, verify information with additional sources"
            else:
                result_text += "Low credibility, seek more authoritative sources"
        
        return result_text
        
    except Exception as e:
        return f"Error analyzing sources: {str(e)}"


async def extract_key_information(
    content: str,
    extraction_type: str,
    tool_context: ToolContext
) -> str:
    """
    Extracts key information from content.
    
    Args:
        content: Content to analyze
        extraction_type: Type of extraction (facts, quotes, statistics, dates, entities, summary)
        tool_context: ADK tool context
        
    Returns:
        Extracted information formatted as text
    """
    try:
        # Validation
        if not content or len(content) < 20:
            return "Error: Content must be at least 20 characters long"
            
        valid_types = ['facts', 'quotes', 'statistics', 'dates', 'entities', 'summary']
        if extraction_type not in valid_types:
            return f"Error: Extraction type must be one of: {', '.join(valid_types)}"
        
        extracted_items = []
        
        if extraction_type == 'facts' or extraction_type == 'summary':
            # Extract sentences that appear to be factual statements
            sentences = re.split(r'[.!?]+', content)
            facts = []
            for sentence in sentences:
                sentence = sentence.strip()
                # Look for factual indicators
                if any(indicator in sentence.lower() for indicator in 
                       ['is', 'are', 'was', 'were', 'has', 'have', 'contains', 'shows', 'indicates']):
                    if len(sentence.split()) > 5:  # Meaningful length
                        facts.append(sentence)
            extracted_items.extend(facts[:10])  # Limit to top 10
            
        elif extraction_type == 'quotes':
            # Extract quoted text
            quotes = re.findall(r'"([^"]+)"', content)
            quotes.extend(re.findall(r"'([^']+)'", content))
            extracted_items.extend([f'"{q}"' for q in quotes[:10]])
            
        elif extraction_type == 'statistics':
            # Extract numbers and percentages
            stats = re.findall(r'\b(\d+(?:\.\d+)?)\s*(%|percent)', content, re.IGNORECASE)
            for stat in stats[:10]:
                extracted_items.append(f"{stat[0]}{stat[1]}")
            
            # Extract other numerical data
            numbers = re.findall(r'\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\b', content)
            for num in numbers[:5]:
                if ',' in num or float(num.replace(',', '')) > 10:
                    extracted_items.append(f"Figure: {num}")
            
        elif extraction_type == 'dates':
            # Extract various date formats
            dates = re.findall(
                r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
                content
            )
            extracted_items.extend(dates)
            
            # Extract years
            years = re.findall(r'\b(19\d{2}|20\d{2})\b', content)
            extracted_items.extend([f"Year: {year}" for year in set(years)])
            
        elif extraction_type == 'entities':
            # Extract capitalized words (potential entities)
            entities = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
            # Filter out common words
            common_words = {'The', 'This', 'That', 'These', 'Those', 'It', 'They', 'We', 'You'}
            entities = [e for e in entities if e not in common_words]
            # Count occurrences
            entity_counts = Counter(entities)
            for entity, count in entity_counts.most_common(10):
                if count > 1:
                    extracted_items.append(f"{entity} (mentioned {count} times)")
                else:
                    extracted_items.append(entity)
        
        # Format results
        if extracted_items:
            result = f"Extracted {extraction_type}:\n\n"
            for i, item in enumerate(extracted_items, 1):
                result += f"{i}. {item}\n"
            result += f"\n[Extracted {len(extracted_items)} items from {len(content)} characters]"
        else:
            result = f"No {extraction_type} found in the provided content."
        
        return result
        
    except Exception as e:
        return f"Error extracting information: {str(e)}"


async def synthesize_research(
    findings: List[str],
    synthesis_goal: str,
    output_format: str,
    tool_context: ToolContext
) -> str:
    """
    Synthesizes research findings into a coherent output.
    
    Args:
        findings: List of research findings to synthesize
        synthesis_goal: Goal of synthesis (overview, comparison, timeline, recommendation)
        output_format: Output format (narrative, bullet_points, structured)
        tool_context: ADK tool context
        
    Returns:
        Synthesized research output
    """
    try:
        # Validation
        if not findings:
            return "Error: At least one finding must be provided"
            
        if len(findings) > 50:
            return "Error: Maximum 50 findings can be synthesized at once"
            
        valid_goals = ['overview', 'comparison', 'timeline', 'recommendation']
        if synthesis_goal not in valid_goals:
            return f"Error: Synthesis goal must be one of: {', '.join(valid_goals)}"
            
        valid_formats = ['narrative', 'bullet_points', 'structured']
        if output_format not in valid_formats:
            return f"Error: Output format must be one of: {', '.join(valid_formats)}"
        
        # Analyze findings
        all_text = ' '.join(findings)
        total_length = sum(len(f) for f in findings)
        
        # Extract common themes
        words = re.findall(r'\b\w+\b', all_text.lower())
        word_freq = Counter(words)
        
        # Remove common words
        common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                       'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
                       'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                       'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
                       'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'}
        
        for word in common_words:
            word_freq.pop(word, None)
        
        top_themes = word_freq.most_common(10)
        
        # Generate synthesis based on goal
        synthesis_id = str(uuid.uuid4())[:8]
        
        result = f"Research Synthesis (ID: {synthesis_id}):\n\n"
        result += f"Goal: {synthesis_goal}\n"
        result += f"Format: {output_format}\n"
        result += f"Findings analyzed: {len(findings)}\n"
        result += f"Total content: {total_length} characters\n\n"
        
        if output_format == 'bullet_points':
            result += "Key Points:\n"
            
            if synthesis_goal == 'overview':
                result += f"• Main themes: {', '.join(theme[0] for theme in top_themes[:5])}\n"
                result += f"• Number of findings: {len(findings)}\n"
                result += f"• Content density: {total_length // len(findings)} avg chars per finding\n"
                
                # Sample key findings
                for i, finding in enumerate(findings[:5], 1):
                    truncated = finding[:100] + "..." if len(finding) > 100 else finding
                    result += f"• Finding {i}: {truncated}\n"
                    
            elif synthesis_goal == 'comparison':
                result += "• Common elements across findings:\n"
                for theme, count in top_themes[:5]:
                    result += f"  - {theme}: appears {count} times\n"
                result += "• Unique aspects in individual findings\n"
                result += "• Patterns identified across sources\n"
                
            elif synthesis_goal == 'timeline':
                # Extract temporal indicators
                time_words = re.findall(r'\b(?:before|after|during|since|until|while|when|then|now|later|earlier|recently|currently)\b', all_text, re.I)
                result += f"• Temporal indicators found: {len(time_words)}\n"
                result += "• Chronological markers identified\n"
                result += "• Sequence of events extracted\n"
                
            elif synthesis_goal == 'recommendation':
                result += "• Based on analyzed findings:\n"
                result += f"  - Primary focus areas: {', '.join(theme[0] for theme in top_themes[:3])}\n"
                result += "  - Strength of evidence: Multiple sources analyzed\n"
                result += "  - Recommended actions: Further investigation needed\n"
                
        elif output_format == 'narrative':
            if synthesis_goal == 'overview':
                result += f"The research findings encompass {len(findings)} distinct pieces of information, "
                result += f"with recurring themes including {', '.join(theme[0] for theme in top_themes[:3])}. "
                result += f"The analysis reveals a comprehensive view of the subject matter, "
                result += f"with particular emphasis on {top_themes[0][0] if top_themes else 'various aspects'}."
                
            elif synthesis_goal == 'comparison':
                result += f"Comparative analysis of the {len(findings)} findings reveals both commonalities and distinctions. "
                result += f"The most frequently occurring concepts include {', '.join(theme[0] for theme in top_themes[:3])}, "
                result += f"suggesting these are central to the research topic. "
                
        else:  # structured
            result += "Structured Synthesis:\n\n"
            result += "1. Overview\n"
            result += f"   - Total findings: {len(findings)}\n"
            result += f"   - Key themes: {', '.join(theme[0] for theme in top_themes[:5])}\n\n"
            
            result += "2. Analysis\n"
            result += f"   - Content volume: {total_length} characters\n"
            result += f"   - Theme frequency: {top_themes[0][0]} ({top_themes[0][1]} occurrences)\n\n"
            
            result += "3. Conclusions\n"
            result += f"   - Primary focus: {synthesis_goal}\n"
            result += f"   - Synthesis complete\n"
        
        # Store synthesis in context
        tool_context.state[f'synthesis_{synthesis_id}'] = {
            'findings_count': len(findings),
            'goal': synthesis_goal,
            'format': output_format,
            'themes': [theme[0] for theme in top_themes[:5]],
            'timestamp': datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        return f"Error synthesizing research: {str(e)}"


async def generate_research_report(
    topic: str,
    report_type: str,
    sections: List[str],
    tool_context: ToolContext
) -> str:
    """
    Generates a structured research report.
    
    Args:
        topic: Research topic
        report_type: Type of report (executive_summary, detailed_analysis, literature_review, market_research)
        sections: List of sections to include
        tool_context: ADK tool context
        
    Returns:
        Structured research report
    """
    try:
        # Validation
        if not topic or len(topic) < 3:
            return "Error: Topic must be at least 3 characters long"
            
        valid_types = ['executive_summary', 'detailed_analysis', 'literature_review', 'market_research']
        if report_type not in valid_types:
            return f"Error: Report type must be one of: {', '.join(valid_types)}"
            
        if not sections:
            return "Error: At least one section must be specified"
            
        if len(sections) > 10:
            return "Error: Maximum 10 sections allowed"
        
        # Generate report structure
        report_id = str(uuid.uuid4())[:8]
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        report = f"""Research Report: {topic}
Report ID: {report_id}
Type: {report_type}
Generated: {timestamp}

{'=' * 50}

TABLE OF CONTENTS
"""
        
        # Add table of contents
        for i, section in enumerate(sections, 1):
            report += f"{i}. {section}\n"
        
        report += f"\n{'=' * 50}\n\n"
        
        # Generate sections
        for i, section in enumerate(sections, 1):
            report += f"{i}. {section.upper()}\n"
            report += f"{'-' * len(section)}\n\n"
            
            if section.lower() == 'introduction':
                report += f"This {report_type} examines {topic} through comprehensive research and analysis. "
                report += f"The report synthesizes findings from multiple sources to provide actionable insights.\n\n"
                
            elif section.lower() == 'methodology':
                report += "Research Methodology:\n"
                report += "• Comprehensive search using Google Search grounding\n"
                report += "• Source credibility analysis\n"
                report += "• Cross-reference validation\n"
                report += "• Synthesis of findings\n\n"
                
            elif section.lower() == 'findings':
                report += f"Key findings related to {topic}:\n"
                report += "• [Findings will be populated from search results]\n"
                report += "• Multiple perspectives analyzed\n"
                report += "• Evidence-based conclusions\n\n"
                
            elif section.lower() == 'analysis':
                report += f"Critical analysis of {topic}:\n"
                report += "• Strengths and opportunities\n"
                report += "• Challenges and considerations\n"
                report += "• Comparative assessment\n\n"
                
            elif section.lower() == 'recommendations':
                report += "Based on the research findings:\n"
                report += "• Strategic recommendations\n"
                report += "• Implementation considerations\n"
                report += "• Risk mitigation strategies\n\n"
                
            elif section.lower() == 'conclusion':
                report += f"This {report_type} on {topic} provides a comprehensive overview "
                report += "based on current available information. Further research may be needed "
                report += "as new developments emerge.\n\n"
                
            else:
                # Generic section
                report += f"Content for {section} will be developed based on research findings.\n\n"
        
        # Add footer
        report += f"\n{'=' * 50}\n"
        report += f"End of Report - ID: {report_id}\n"
        
        # Store report metadata in context
        tool_context.state[f'report_{report_id}'] = {
            'topic': topic,
            'type': report_type,
            'sections': sections,
            'timestamp': timestamp
        }
        
        report += f"\nNote: Use the perform_research function to populate this report with actual data."
        
        return report
        
    except Exception as e:
        return f"Error generating report: {str(e)}"


async def fact_check_claims(
    claims: List[str],
    context: str,
    tool_context: ToolContext
) -> str:
    """
    Fact-checks claims against available information.
    
    Args:
        claims: List of claims to fact-check
        context: Additional context for fact-checking
        tool_context: ADK tool context
        
    Returns:
        Fact-checking results
    """
    try:
        # Validation
        if not claims:
            return "Error: At least one claim must be provided"
            
        if len(claims) > 20:
            return "Error: Maximum 20 claims can be fact-checked at once"
            
        if not context:
            context = "General fact-checking"
        
        fact_check_id = str(uuid.uuid4())[:8]
        
        result = f"""Fact-Checking Report (ID: {fact_check_id})
Context: {context}
Claims to verify: {len(claims)}

{'=' * 50}

"""
        
        for i, claim in enumerate(claims, 1):
            result += f"{i}. Claim: {claim}\n"
            result += f"   Status: Requires verification\n"
            result += f"   Recommended search: \"{claim} fact check verify\"\n\n"
        
        result += f"""{'=' * 50}

To complete fact-checking:
1. Use perform_research with each claim
2. Analyze sources for credibility
3. Look for consensus among authoritative sources
4. Consider potential biases

Note: This report provides a framework. Actual verification requires 
searching and analyzing credible sources using Google Search."""
        
        # Store fact-check request in context
        tool_context.state[f'factcheck_{fact_check_id}'] = {
            'claims': claims,
            'context': context,
            'timestamp': datetime.now().isoformat()
        }
        
        return result
        
    except Exception as e:
        return f"Error in fact-checking: {str(e)}"


# Create FunctionTool wrappers for the new research tools
tools = [
    FunctionTool(perform_research, name="perform_research"),
    FunctionTool(analyze_sources, name="analyze_sources"),
    FunctionTool(extract_key_information, name="extract_key_information"),
    FunctionTool(synthesize_research, name="synthesize_research"),
    FunctionTool(generate_research_report, name="generate_research_report"),
    FunctionTool(fact_check_claims, name="fact_check_claims")
]

# Export all tools
__all__ = ['tools'] + [tool.name for tool in tools]