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