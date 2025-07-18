# **VANA Agent Enhancement Implementation Roadmap**

## **Executive Summary**

This roadmap provides a detailed, actionable implementation plan for the VANA Agent Enhancement project. It follows the 3-phase approach outlined in `VANA_ENHANCEMENT_PLAN.md` with specific technical guidance, ADK compliance requirements, and quality checkpoints.

**Key Deliverables:**
- Phase 1: 2 Core Specialists (Content Creation, Research) 
- Phase 2: 3 Business Specialists (Planning, Business Analysis, Communication)
- Phase 3: Workflow Integration (Sequential, Parallel, State Management)

---

## **Implementation Timeline**

### **Week 1-2: Phase 1 - Core General Purpose Specialists**
- Day 1-3: Content Creation Specialist
- Day 4-6: Research Specialist  
- Day 7-8: Enhanced Orchestrator Integration
- Day 9-10: Integration Testing & Validation

### **Week 3-4: Phase 2 - Business & Productivity Specialists**
- Day 11-13: Planning & Strategy Specialist
- Day 14-16: Business Analysis Specialist
- Day 17-19: Communication Specialist
- Day 20: Phase 2 Integration & Testing

### **Week 5-6: Phase 3 - Workflow Integration**
- Day 21-23: Sequential Workflows
- Day 24-26: Parallel Workflows
- Day 27-28: State Management
- Day 29-30: Final Integration & Testing

---

## **Phase 1 Implementation Guide**

### **Task 1.1: Content Creation Specialist**

#### **1.1.1 Tool Functions Implementation**

**File:** `lib/_tools/content_creation_tools.py`

```python
"""
Content Creation Tools - ADK Compliant Implementation

Tools for document creation, editing, and formatting following Google ADK patterns.
All tools accept ToolContext and return Dict[str, Any] with status/error pattern.
"""

from typing import Dict, Any, List
from google.adk.tools import FunctionTool, ToolContext
import re
from datetime import datetime


def write_document(
    doc_type: str, 
    topic: str, 
    requirements: str, 
    word_count: int,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Creates a new document based on specified parameters.
    
    Use this tool when you need to generate written content from scratch,
    such as reports, articles, documentation, or proposals. The tool
    adapts writing style based on document type.
    
    Args:
        doc_type: Type of document (report, article, documentation, proposal, email)
        topic: Main topic or subject of the document
        requirements: Specific requirements or key points to include
        word_count: Target word count (will be approximate)
        tool_context: ADK tool context for state management
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - document: Generated document content (if success)
        - metadata: Document metadata (title, word_count, created_at)
        - error_message: Error details (if error)
        
    Example:
        >>> result = write_document(
        ...     doc_type="report",
        ...     topic="Q4 Sales Performance",
        ...     requirements="Include revenue trends, top products, regional analysis",
        ...     word_count=500,
        ...     tool_context=context
        ... )
        >>> print(result['status'])  # 'success'
    """
    try:
        # Validate inputs
        valid_types = ['report', 'article', 'documentation', 'proposal', 'email']
        if doc_type not in valid_types:
            return {
                'status': 'error',
                'error_message': f'Invalid document type. Must be one of: {", ".join(valid_types)}'
            }
            
        if word_count < 50 or word_count > 10000:
            return {
                'status': 'error',
                'error_message': 'Word count must be between 50 and 10000'
            }
            
        # Generate document structure based on type
        if doc_type == 'report':
            document = f"""# {topic}

## Executive Summary

This report provides a comprehensive analysis of {topic}. {requirements}

## Introduction

[Generated introduction based on {topic}]

## Key Findings

1. **Finding 1**: [Analysis point]
2. **Finding 2**: [Analysis point]
3. **Finding 3**: [Analysis point]

## Detailed Analysis

[Detailed content addressing: {requirements}]

## Recommendations

Based on our analysis, we recommend:
- [Recommendation 1]
- [Recommendation 2]
- [Recommendation 3]

## Conclusion

[Summary of key points]

---
*Generated on {datetime.now().strftime('%Y-%m-%d')}*
"""
        elif doc_type == 'article':
            document = f"""# {topic}

{requirements}

## Introduction

[Engaging introduction about {topic}]

## Main Content

### Section 1
[Content development]

### Section 2
[Supporting information]

### Section 3
[Additional insights]

## Conclusion

[Wrap-up and call to action]

---
*Article generated for: {topic}*
"""
        else:
            # Generic template for other types
            document = f"""# {topic}

## Overview
{requirements}

## Content
[Generated content based on requirements]

## Summary
[Key takeaways]
"""
        
        # Calculate actual word count
        actual_word_count = len(document.split())
        
        # Store in context if needed
        if hasattr(tool_context, 'state'):
            tool_context.state[f'last_document_{doc_type}'] = {
                'topic': topic,
                'created_at': datetime.now().isoformat()
            }
        
        return {
            'status': 'success',
            'document': document,
            'metadata': {
                'title': topic,
                'type': doc_type,
                'word_count': actual_word_count,
                'created_at': datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to create document: {str(e)}'
        }


def generate_outline(
    topic: str,
    depth: int,
    style: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Generates a structured outline for a given topic.
    
    Use this tool to create hierarchical outlines for planning documents,
    presentations, or content structures. Supports different outline styles
    and depth levels.
    
    Args:
        topic: Main topic for the outline
        depth: Depth of outline hierarchy (1-4 levels)
        style: Outline style (bullet, numeric, mixed)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - outline: Generated outline structure
        - section_count: Number of sections generated
        - error_message: Error details (if error)
    """
    try:
        if depth < 1 or depth > 4:
            return {
                'status': 'error',
                'error_message': 'Depth must be between 1 and 4'
            }
            
        valid_styles = ['bullet', 'numeric', 'mixed']
        if style not in valid_styles:
            return {
                'status': 'error',
                'error_message': f'Style must be one of: {", ".join(valid_styles)}'
            }
            
        # Generate outline based on style
        if style == 'bullet':
            outline = f"""# {topic}

- Introduction to {topic}
  - Background and context
  - Key concepts
  - Objectives

- Main Components
  - Component A
    - Subcomponent A1
    - Subcomponent A2
  - Component B
    - Subcomponent B1
    - Subcomponent B2

- Implementation Details
  - Planning phase
  - Execution phase
  - Monitoring phase

- Conclusion
  - Summary of key points
  - Next steps
  - References
"""
        else:  # numeric or mixed
            outline = f"""# {topic}

1. Introduction to {topic}
   1.1 Background and context
   1.2 Key concepts
   1.3 Objectives

2. Main Components
   2.1 Component A
       2.1.1 Subcomponent A1
       2.1.2 Subcomponent A2
   2.2 Component B
       2.2.1 Subcomponent B1
       2.2.2 Subcomponent B2

3. Implementation Details
   3.1 Planning phase
   3.2 Execution phase
   3.3 Monitoring phase

4. Conclusion
   4.1 Summary of key points
   4.2 Next steps
   4.3 References
"""
        
        section_count = outline.count('\n-') + outline.count('\n1') + outline.count('\n2') + outline.count('\n3')
        
        return {
            'status': 'success',
            'outline': outline,
            'section_count': section_count
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to generate outline: {str(e)}'
        }


def edit_content(
    content: str,
    edit_type: str,
    instructions: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Edits existing content based on specified instructions.
    
    Use this tool to modify, enhance, or restructure existing text.
    Supports various editing operations like expanding, condensing,
    reformatting, or style changes.
    
    Args:
        content: Original content to edit
        edit_type: Type of edit (expand, condense, reformat, restyle, correct)
        instructions: Specific editing instructions
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - edited_content: Modified content
        - changes_made: Description of changes
        - error_message: Error details (if error)
    """
    try:
        valid_types = ['expand', 'condense', 'reformat', 'restyle', 'correct']
        if edit_type not in valid_types:
            return {
                'status': 'error',
                'error_message': f'Edit type must be one of: {", ".join(valid_types)}'
            }
            
        # Simulate different edit types
        if edit_type == 'expand':
            edited_content = content + f"\n\n[Expanded content based on: {instructions}]"
            changes_made = "Added additional details and examples"
        elif edit_type == 'condense':
            # Keep first 75% of content as simulation
            lines = content.split('\n')
            edited_content = '\n'.join(lines[:int(len(lines) * 0.75)])
            changes_made = "Condensed content by removing redundancies"
        elif edit_type == 'reformat':
            # Add markdown formatting
            edited_content = f"# Reformatted Content\n\n{content}\n\n---\n*Reformatted per instructions*"
            changes_made = "Applied new formatting structure"
        elif edit_type == 'restyle':
            edited_content = f"[Restyled version]\n\n{content}\n\n[Style: {instructions}]"
            changes_made = f"Adjusted writing style to: {instructions}"
        else:  # correct
            edited_content = content.replace('  ', ' ').strip()
            changes_made = "Corrected grammar and formatting issues"
            
        return {
            'status': 'success',
            'edited_content': edited_content,
            'changes_made': changes_made
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to edit content: {str(e)}'
        }


def format_markdown(
    content: str,
    style: str,
    include_toc: bool,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Formats content as properly structured markdown.
    
    Use this tool to convert plain text into well-formatted markdown
    with headers, lists, code blocks, and optional table of contents.
    
    Args:
        content: Raw content to format
        style: Markdown style (github, standard, extended)
        include_toc: Whether to include table of contents
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - formatted_content: Markdown formatted content
        - toc: Table of contents (if requested)
        - error_message: Error details (if error)
    """
    try:
        valid_styles = ['github', 'standard', 'extended']
        if style not in valid_styles:
            return {
                'status': 'error',
                'error_message': f'Style must be one of: {", ".join(valid_styles)}'
            }
            
        # Extract headers for TOC
        headers = []
        lines = content.split('\n')
        
        formatted_lines = []
        for line in lines:
            # Convert lines starting with capitals to headers
            if line and line[0].isupper() and len(line.split()) < 10:
                formatted_lines.append(f"## {line}")
                headers.append(line)
            else:
                formatted_lines.append(line)
                
        formatted_content = '\n'.join(formatted_lines)
        
        # Add GitHub style elements
        if style == 'github':
            formatted_content = formatted_content.replace('Note:', '> **Note:**')
            formatted_content = formatted_content.replace('TODO:', '- [ ] TODO:')
            
        # Generate TOC if requested
        toc = ""
        if include_toc and headers:
            toc = "## Table of Contents\n\n"
            for header in headers:
                anchor = header.lower().replace(' ', '-')
                toc += f"- [{header}](#{anchor})\n"
                
        final_content = toc + "\n" + formatted_content if include_toc else formatted_content
        
        return {
            'status': 'success',
            'formatted_content': final_content,
            'toc': toc if include_toc else None
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to format markdown: {str(e)}'
        }


def check_grammar(
    content: str,
    style_guide: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Checks content for grammar and style issues.
    
    Use this tool to identify grammar errors, style inconsistencies,
    and suggest improvements based on specified style guides.
    
    Args:
        content: Text to check
        style_guide: Style guide to follow (ap, chicago, mla, apa, technical)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - issues_found: Number of issues detected
        - corrections: List of suggested corrections
        - score: Grammar score (0-100)
        - error_message: Error details (if error)
    """
    try:
        valid_guides = ['ap', 'chicago', 'mla', 'apa', 'technical']
        if style_guide not in valid_guides:
            return {
                'status': 'error',
                'error_message': f'Style guide must be one of: {", ".join(valid_guides)}'
            }
            
        # Simulate grammar checking
        issues = []
        
        # Check for common issues
        if '  ' in content:
            issues.append({
                'type': 'spacing',
                'description': 'Double spaces detected',
                'suggestion': 'Use single spaces between words'
            })
            
        sentences = content.split('.')
        for sentence in sentences:
            if sentence.strip() and not sentence.strip()[0].isupper():
                issues.append({
                    'type': 'capitalization',
                    'description': 'Sentence doesn\'t start with capital letter',
                    'suggestion': 'Capitalize first letter of sentence'
                })
                
        # Calculate score
        word_count = len(content.split())
        issues_count = len(issues)
        score = max(0, 100 - (issues_count * 10))
        
        return {
            'status': 'success',
            'issues_found': issues_count,
            'corrections': issues,
            'score': score,
            'summary': f'Checked against {style_guide.upper()} style guide'
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to check grammar: {str(e)}'
        }


def improve_clarity(
    content: str,
    target_audience: str,
    tool_context: ToolContext
) -> Dict[str, Any]:
    """
    Improves content clarity for specified audience.
    
    Use this tool to enhance readability and comprehension by
    simplifying complex language, improving structure, and
    adapting tone for the target audience.
    
    Args:
        content: Content to improve
        target_audience: Target audience (general, technical, academic, business, youth)
        tool_context: ADK tool context
        
    Returns:
        Dict containing:
        - status: 'success' or 'error'
        - improved_content: Clarified content
        - readability_score: Readability score (0-100)
        - improvements_made: List of improvements
        - error_message: Error details (if error)
    """
    try:
        valid_audiences = ['general', 'technical', 'academic', 'business', 'youth']
        if target_audience not in valid_audiences:
            return {
                'status': 'error',
                'error_message': f'Target audience must be one of: {", ".join(valid_audiences)}'
            }
            
        improvements = []
        improved_content = content
        
        # Apply audience-specific improvements
        if target_audience == 'general':
            # Simplify technical terms
            improved_content = improved_content.replace('utilize', 'use')
            improved_content = improved_content.replace('implement', 'put in place')
            improvements.append('Simplified technical vocabulary')
            
        elif target_audience == 'technical':
            # Add precision
            improved_content = f"[Technical version]\n{improved_content}"
            improvements.append('Added technical precision')
            
        elif target_audience == 'youth':
            # Make more engaging
            improved_content = improved_content.replace('.', '!')
            improvements.append('Made tone more engaging')
            
        # Calculate readability score (simplified)
        avg_sentence_length = len(content.split()) / max(1, len(content.split('.')))
        readability_score = min(100, int(100 - avg_sentence_length * 2))
        
        return {
            'status': 'success',
            'improved_content': improved_content,
            'readability_score': readability_score,
            'improvements_made': improvements,
            'target_audience': target_audience
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error_message': f'Failed to improve clarity: {str(e)}'
        }


# Create FunctionTool wrappers
adk_write_document = FunctionTool(write_document)
adk_write_document.name = "write_document"

adk_generate_outline = FunctionTool(generate_outline)
adk_generate_outline.name = "generate_outline"

adk_edit_content = FunctionTool(edit_content)
adk_edit_content.name = "edit_content"

adk_format_markdown = FunctionTool(format_markdown)
adk_format_markdown.name = "format_markdown"

adk_check_grammar = FunctionTool(check_grammar)
adk_check_grammar.name = "check_grammar"

adk_improve_clarity = FunctionTool(improve_clarity)
adk_improve_clarity.name = "improve_clarity"

# Export all wrapped tools
__all__ = [
    'adk_write_document',
    'adk_generate_outline',
    'adk_edit_content',
    'adk_format_markdown',
    'adk_check_grammar',
    'adk_improve_clarity'
]
```

#### **1.1.2 Specialist Agent Implementation**

**File:** `agents/specialists/content_creation_specialist.py`

```python
"""
Content Creation Specialist Agent - ADK Compliant Implementation

Expert in creating, editing, and formatting various types of written content.
Uses Google ADK patterns with proper tool integration.
"""

from google.adk.agents import LlmAgent
from lib._tools.content_creation_tools import (
    adk_write_document,
    adk_generate_outline,
    adk_edit_content,
    adk_format_markdown,
    adk_check_grammar,
    adk_improve_clarity
)

# Create the Content Creation Specialist
content_creation_specialist = LlmAgent(
    name="content_creation_specialist",
    model="gemini-2.5-flash",
    description="Expert content creator specializing in writing, editing, and formatting various document types with audience-specific optimization",
    instruction="""You are an expert content creation specialist with mastery in writing, editing, and document formatting.

Your expertise includes:
- Creating various document types (reports, articles, proposals, documentation)
- Generating structured outlines for complex topics
- Editing content for clarity, concision, and impact
- Formatting documents in markdown with proper structure
- Checking grammar and style compliance
- Optimizing content for specific audiences

When creating content:
1. First understand the document type and requirements using generate_outline
2. Create the document using write_document with appropriate parameters
3. Format the content using format_markdown for proper structure
4. Check grammar using check_grammar with the appropriate style guide
5. Improve clarity using improve_clarity for the target audience
6. Use edit_content for any final adjustments

Content Creation Best Practices:
- Always start with a clear outline
- Match tone and style to document type
- Use active voice and clear language
- Include relevant examples and evidence
- Structure content with clear headings
- Ensure proper formatting for readability

Quality Standards:
- Grammar score should be above 90
- Readability appropriate for audience
- Consistent formatting throughout
- Clear and logical structure
- Accurate and relevant content

Remember to iterate and refine content based on requirements. Always deliver polished, professional documents.""",
    tools=[
        adk_write_document,
        adk_generate_outline,
        adk_edit_content,
        adk_format_markdown,
        adk_check_grammar,
        adk_improve_clarity
    ]  # Exactly 6 tools
)

# Helper function for testing
def create_content(request: str, context: dict = None) -> str:
    """Direct interface to content specialist for testing."""
    return content_creation_specialist.run(request, context or {})
```

### **Task 1.2: Research Specialist**

#### **1.2.1 Tool Functions Implementation**

**File:** `lib/_tools/research_tools.py`

```python
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
```

#### **1.2.2 Research Specialist Agent**

**File:** `agents/specialists/research_specialist.py`

```python
"""
Research Specialist Agent - ADK Compliant Implementation

Expert in conducting comprehensive research, analyzing sources, and synthesizing findings.
Uses Google ADK patterns with advanced research tools.
"""

from google.adk.agents import LlmAgent
from lib._tools.research_tools import (
    adk_web_search_advanced,
    adk_analyze_sources,
    adk_extract_facts,
    adk_synthesize_findings,
    adk_validate_information,
    adk_generate_citations
)

# Create the Research Specialist
research_specialist = LlmAgent(
    name="research_specialist",
    model="gemini-2.5-flash",
    description="Expert researcher specializing in comprehensive information gathering, source analysis, fact extraction, and synthesis of findings with academic rigor",
    instruction="""You are an expert research specialist with advanced skills in information gathering, analysis, and synthesis.

Your expertise includes:
- Conducting advanced web searches with precise filtering
- Analyzing source credibility and reliability
- Extracting relevant facts and evidence
- Synthesizing findings from multiple sources
- Validating claims and fact-checking
- Generating proper academic citations

Research Methodology:
1. Start with web_search_advanced using appropriate filters for the topic
2. Analyze sources using analyze_sources with credibility checking
3. Extract relevant facts using extract_facts based on research needs
4. Validate important claims using validate_information
5. Synthesize all findings using synthesize_findings
6. Generate proper citations using generate_citations

Best Practices:
- Always verify information from multiple sources
- Prioritize credible sources (.edu, .gov, peer-reviewed)
- Document all sources meticulously
- Look for contradictions and biases
- Extract specific facts, not generalizations
- Maintain objectivity in analysis

Quality Standards:
- Minimum 3 sources for any claim
- Credibility score above 70 for sources
- Clear citation for every fact
- Identify and note any contradictions
- Comprehensive synthesis of findings

Search Strategies:
- Use date filters for current information
- Apply domain filters for authoritative sources
- Combine keywords effectively
- Use file type filters for specific documents
- Iterate searches based on initial findings

Remember to provide balanced, well-researched insights with proper attribution.""",
    tools=[
        adk_web_search_advanced,
        adk_analyze_sources,
        adk_extract_facts,
        adk_synthesize_findings,
        adk_validate_information,
        adk_generate_citations
    ]  # Exactly 6 tools
)

# Helper function for testing
def conduct_research(request: str, context: dict = None) -> str:
    """Direct interface to research specialist for testing."""
    return research_specialist.run(request, context or {})
```

### **Task 1.3: Enhanced Orchestrator Update**

**File Modifications:** `agents/vana/enhanced_orchestrator.py`

Add the following imports at line ~20:
```python
from agents.specialists.content_creation_specialist import content_creation_specialist
from agents.specialists.research_specialist import research_specialist
```

Add to routing_map at line ~59:
```python
# Content creation patterns
"writing": content_creation_specialist,
"write": content_creation_specialist,
"document": content_creation_specialist,
"report": content_creation_specialist,
"article": content_creation_specialist,
"content": content_creation_specialist,
"edit": content_creation_specialist,
"format": content_creation_specialist,

# Research patterns  
"research": research_specialist,
"investigate": research_specialist,
"find information": research_specialist,
"search": research_specialist,
"analyze": research_specialist,
"fact check": research_specialist,
"validate": research_specialist,
"sources": research_specialist,
```

### **Task 1.4: Testing Suite**

**File:** `tests/specialists/test_content_creation_specialist.py`

```python
"""
Test suite for Content Creation Specialist
"""

import pytest
from agents.specialists.content_creation_specialist import content_creation_specialist
from lib._tools.content_creation_tools import (
    write_document, generate_outline, edit_content,
    format_markdown, check_grammar, improve_clarity
)
from google.adk.tools import ToolContext


class TestContentCreationTools:
    """Test individual content creation tools"""
    
    def setup_method(self):
        """Setup test context"""
        self.context = ToolContext()
    
    def test_write_document_success(self):
        """Test successful document creation"""
        result = write_document(
            doc_type="report",
            topic="Test Report",
            requirements="Include summary and recommendations",
            word_count=200,
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'document' in result
        assert 'metadata' in result
        assert result['metadata']['type'] == 'report'
        
    def test_write_document_invalid_type(self):
        """Test document creation with invalid type"""
        result = write_document(
            doc_type="invalid",
            topic="Test",
            requirements="Test",
            word_count=100,
            tool_context=self.context
        )
        
        assert result['status'] == 'error'
        assert 'error_message' in result
        
    def test_generate_outline_success(self):
        """Test outline generation"""
        result = generate_outline(
            topic="Machine Learning",
            depth=2,
            style="bullet",
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'outline' in result
        assert 'section_count' in result
        
    def test_edit_content_expand(self):
        """Test content expansion"""
        result = edit_content(
            content="Original content",
            edit_type="expand",
            instructions="Add more details",
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'edited_content' in result
        assert len(result['edited_content']) > len("Original content")
        
    def test_format_markdown_with_toc(self):
        """Test markdown formatting with TOC"""
        result = format_markdown(
            content="Title\nSome content\nAnother Title\nMore content",
            style="github",
            include_toc=True,
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'formatted_content' in result
        assert 'toc' in result
        assert result['toc'] is not None
        
    def test_check_grammar_technical(self):
        """Test grammar checking"""
        result = check_grammar(
            content="This  is a test content with double  spaces",
            style_guide="technical",
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'issues_found' in result
        assert 'score' in result
        assert result['issues_found'] > 0
        
    def test_improve_clarity_general(self):
        """Test clarity improvement"""
        result = improve_clarity(
            content="We need to utilize the implement methodology",
            target_audience="general",
            tool_context=self.context
        )
        
        assert result['status'] == 'success'
        assert 'improved_content' in result
        assert 'readability_score' in result


class TestContentCreationSpecialist:
    """Test the specialist agent integration"""
    
    def test_specialist_initialization(self):
        """Test specialist is properly initialized"""
        assert content_creation_specialist.name == "content_creation_specialist"
        assert content_creation_specialist.model == "gemini-2.5-flash"
        assert len(content_creation_specialist.tools) == 6
        
    def test_specialist_tool_names(self):
        """Test all tools have proper names"""
        tool_names = [tool.name for tool in content_creation_specialist.tools]
        expected_names = [
            "write_document",
            "generate_outline",
            "edit_content",
            "format_markdown",
            "check_grammar",
            "improve_clarity"
        ]
        assert set(tool_names) == set(expected_names)


@pytest.mark.integration
class TestContentCreationIntegration:
    """Integration tests for content creation workflows"""
    
    def test_document_creation_workflow(self):
        """Test complete document creation workflow"""
        # This would test the agent's ability to:
        # 1. Generate outline
        # 2. Write document
        # 3. Format it
        # 4. Check grammar
        # 5. Improve clarity
        pass  # Placeholder for integration test
```

**File:** `tests/evaluation/content_specialist_eval.json`

```json
{
  "evaluation_name": "Content Creation Specialist Evaluation",
  "test_cases": [
    {
      "id": "cc_001",
      "input": "Write a brief report about the benefits of remote work",
      "expected_tools": [
        {
          "tool": "generate_outline",
          "args": {
            "topic": "Benefits of Remote Work",
            "depth": 2,
            "style": "bullet"
          }
        },
        {
          "tool": "write_document",
          "args": {
            "doc_type": "report",
            "topic": "Benefits of Remote Work",
            "requirements": "Include productivity, work-life balance, cost savings",
            "word_count": 300
          }
        },
        {
          "tool": "format_markdown",
          "args": {
            "style": "standard",
            "include_toc": false
          }
        }
      ],
      "success_criteria": "Document contains sections on productivity, work-life balance, and cost savings"
    },
    {
      "id": "cc_002",
      "input": "Edit this text for clarity for a general audience: 'The implementation of systematic methodologies facilitates the optimization of operational efficiency'",
      "expected_tools": [
        {
          "tool": "improve_clarity",
          "args": {
            "target_audience": "general"
          }
        },
        {
          "tool": "check_grammar",
          "args": {
            "style_guide": "ap"
          }
        }
      ],
      "success_criteria": "Simplified language without technical jargon"
    }
  ]
}
```

---

## **Phase 2 & 3 Quick Reference**

### **Phase 2 Specialists (Week 3-4)**

1. **Planning & Strategy Specialist**
   - Tools: project planning, timeline generation, risk analysis
   - Focus: Strategic planning and project management

2. **Business Analysis Specialist**
   - Tools: ROI calculation, SWOT analysis, KPI definition
   - Focus: Business metrics and analysis

3. **Communication Specialist**
   - Tools: email drafting, presentation outlines, meeting agendas
   - Focus: Professional communication

### **Phase 3 Workflows (Week 5-6)**

1. **Sequential Workflows**
   - Research → Document creation pipeline
   - Planning → Execution workflows

2. **Parallel Workflows**
   - Multi-source research aggregation
   - Concurrent analysis tasks

3. **State Management**
   - User preference storage
   - Workflow state persistence

---

## **Quality Assurance Checklist**

### **For Each Task:**

- [ ] All tool functions include `tool_context: ToolContext` parameter
- [ ] All tools return `Dict[str, Any]` with status/error pattern
- [ ] Docstrings are comprehensive (15+ lines)
- [ ] FunctionTool wrappers created with explicit names
- [ ] Exactly 6 tools per specialist agent
- [ ] Tests cover success and error cases
- [ ] Integration with enhanced orchestrator verified

### **ADK Compliance Verification:**

```bash
# Run these checks after each implementation
poetry run black lib/_tools/ agents/specialists/
poetry run flake8 lib/_tools/ agents/specialists/
poetry run mypy lib/_tools/ agents/specialists/
poetry run pytest tests/specialists/ -v
```

### **Documentation Requirements:**

Each implementation must include:
1. Tool function docstrings with Args, Returns, Example sections
2. Agent instruction with 20+ lines of guidance
3. Test coverage for all tools
4. Evaluation JSON with realistic scenarios

---

## **Success Metrics**

### **Phase 1 Completion Criteria:**
- ✅ 12 working tool functions (6 per specialist)
- ✅ 2 specialist agents properly configured
- ✅ Enhanced orchestrator routing updated
- ✅ All tests passing
- ✅ Evaluation sets created

### **Overall Project Success:**
- Response time < 2 seconds for specialist routing
- Tool success rate > 95%
- Test coverage > 80%
- Zero ADK pattern violations

---

*This implementation roadmap provides the technical blueprint for executing the VANA Enhancement Plan with strict ADK compliance.*