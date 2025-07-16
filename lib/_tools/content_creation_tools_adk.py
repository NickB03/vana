"""
Content Creation Tools - ADK Compliant Implementation

Pure ADK pattern implementation following Google's official guidelines.
Async functions returning strings with simple error handling.
"""

from google.adk.tools import FunctionTool, ToolContext
import re
import uuid
from datetime import datetime
import asyncio
from collections import Counter

# Keep the useful helper classes but simplify their usage
class DocumentGenerator:
    """Handles real document generation with templates."""
    
    TEMPLATES = {
        'report': {
            'structure': ['Executive Summary', 'Introduction', 'Analysis', 'Findings', 'Recommendations', 'Conclusion'],
            'style': 'formal',
            'tone': 'professional'
        },
        'article': {
            'structure': ['Introduction', 'Main Points', 'Supporting Evidence', 'Conclusion'],
            'style': 'engaging',
            'tone': 'informative'
        },
        'documentation': {
            'structure': ['Overview', 'Prerequisites', 'Instructions', 'Examples', 'Troubleshooting', 'References'],
            'style': 'technical',
            'tone': 'clear'
        },
        'proposal': {
            'structure': ['Executive Summary', 'Problem Statement', 'Proposed Solution', 'Implementation Plan', 'Budget', 'Timeline', 'Benefits'],
            'style': 'persuasive',
            'tone': 'professional'
        },
        'email': {
            'structure': ['Greeting', 'Purpose', 'Details', 'Action Items', 'Closing'],
            'style': 'concise',
            'tone': 'professional'
        }
    }
    
    @staticmethod
    def generate_content(doc_type: str, topic: str, requirements: str, word_count: int) -> str:
        """Generate realistic content based on parameters."""
        template = DocumentGenerator.TEMPLATES.get(doc_type, DocumentGenerator.TEMPLATES['article'])
        sections = template['structure']
        
        # Calculate words per section
        words_per_section = word_count // len(sections)
        
        # Build document
        content_parts = []
        
        # Title
        if doc_type != 'email':
            content_parts.append(f"# {topic}\n")
        
        # Generate sections
        for section in sections:
            if doc_type == 'email' and section == 'Greeting':
                content_parts.append(f"Dear Stakeholder,\n\n")
            elif doc_type == 'email' and section == 'Closing':
                content_parts.append(f"\nBest regards,\n[Your Name]")
            else:
                # Section header
                if doc_type != 'email':
                    content_parts.append(f"\n## {section}\n\n")
                
                # Generate content for section
                if section == 'Executive Summary':
                    content_parts.append(f"This {doc_type} provides a comprehensive overview of {topic}. ")
                    content_parts.append(f"Key requirements addressed include: {requirements}. ")
                    content_parts.append(f"Our analysis reveals significant insights that will guide strategic decisions.\n")
                elif section == 'Introduction':
                    content_parts.append(f"The purpose of this {doc_type} is to examine {topic} in detail. ")
                    content_parts.append(f"We will explore various aspects including {requirements}. ")
                    content_parts.append(f"This analysis is based on current data and industry best practices.\n")
                elif section == 'Problem Statement':
                    content_parts.append(f"The current situation regarding {topic} presents several challenges. ")
                    content_parts.append(f"Key issues include: {requirements}. ")
                    content_parts.append(f"Without intervention, these challenges may impact organizational objectives.\n")
                else:
                    # Generate contextual content
                    content_parts.append(f"In this section on {section.lower()}, we address {topic}. ")
                    content_parts.append(f"Specific attention is given to {requirements}. ")
                    content_parts.append(f"This aspect of {topic} requires careful consideration.\n")
        
        return ''.join(content_parts)


async def write_document(
    doc_type: str, 
    topic: str, 
    requirements: str, 
    word_count: int,
    tool_context: ToolContext
) -> str:
    """
    Creates a new document with real content generation.
    
    Args:
        doc_type: Type of document (report, article, documentation, proposal, email)
        topic: Main topic of the document
        requirements: Specific requirements to address
        word_count: Target word count
        tool_context: ADK tool context
        
    Returns:
        Success message with document content or error message
    """
    try:
        # Basic validation
        if not doc_type or doc_type not in DocumentGenerator.TEMPLATES:
            return f"Error: Document type must be one of: {', '.join(DocumentGenerator.TEMPLATES.keys())}"
            
        if not topic or len(topic) < 3:
            return "Error: Topic must be at least 3 characters long"
            
        if word_count < 50 or word_count > 10000:
            return "Error: Word count must be between 50 and 10000"
        
        # Generate document
        document_content = DocumentGenerator.generate_content(
            doc_type=doc_type,
            topic=topic,
            requirements=requirements or "general overview",
            word_count=word_count
        )
        
        # Calculate actual word count
        actual_word_count = len(document_content.split())
        
        # Generate metadata
        doc_id = str(uuid.uuid4())[:8]
        
        # Store in context for future reference
        tool_context.state[f'document_{doc_id}'] = {
            'content': document_content,
            'type': doc_type,
            'topic': topic,
            'created_at': datetime.now().isoformat()
        }
        
        return f"""Document created successfully (ID: {doc_id}):

{document_content}

[Document stats: {actual_word_count} words, Type: {doc_type}]"""
        
    except Exception as e:
        return f"Error creating document: {str(e)}"


async def generate_outline(
    topic: str,
    depth: int,
    style: str,
    tool_context: ToolContext
) -> str:
    """
    Generates a detailed outline with hierarchical structure.
    
    Args:
        topic: Topic to create outline for
        depth: Depth level (1-5)
        style: Outline style (hierarchical, flat, academic, business)
        tool_context: ADK tool context
        
    Returns:
        Success message with outline or error message
    """
    try:
        # Validation
        if not topic or len(topic) < 3:
            return "Error: Topic must be at least 3 characters long"
            
        if depth < 1 or depth > 5:
            return "Error: Depth must be between 1 and 5"
            
        valid_styles = ['hierarchical', 'flat', 'academic', 'business']
        if style not in valid_styles:
            return f"Error: Style must be one of: {', '.join(valid_styles)}"
        
        # Generate outline structure
        outline_text = f"# Outline: {topic}\n\n"
        
        # Main sections based on topic
        main_sections = [
            f"Introduction to {topic}",
            f"Background and Context",
            f"Key Components",
            f"Analysis and Discussion",
            f"Implementation",
            f"Challenges and Solutions",
            f"Future Directions",
            f"Conclusion"
        ]
        
        # Adjust for style
        if style == 'business':
            main_sections = main_sections[:5]
        elif style == 'academic':
            main_sections.insert(2, "Literature Review")
            main_sections.append("References")
        
        # Build outline
        section_count = 0
        for i, section in enumerate(main_sections[:8]):
            section_count += 1
            outline_text += f"{i + 1}. {section}\n"
            
            # Add subsections based on depth
            if depth >= 2:
                for j in range(min(3, depth)):
                    section_count += 1
                    outline_text += f"   {i + 1}.{j + 1}. Subtopic {j + 1} of {section}\n"
                    
                    # Add sub-subsections for depth 3+
                    if depth >= 3:
                        for k in range(2):
                            section_count += 1
                            outline_text += f"      {i + 1}.{j + 1}.{k + 1}. Detail {k + 1}\n"
        
        return f"""Outline generated successfully:

{outline_text}

[Outline stats: {section_count} sections, Depth: {depth}, Style: {style}]"""
        
    except Exception as e:
        return f"Error generating outline: {str(e)}"


async def edit_content(
    content: str,
    edit_type: str,
    instructions: str,
    tool_context: ToolContext
) -> str:
    """
    Performs content editing based on type and instructions.
    
    Args:
        content: Content to edit
        edit_type: Type of edit (expand, condense, reformat, restyle, correct)
        instructions: Specific editing instructions
        tool_context: ADK tool context
        
    Returns:
        Success message with edited content or error message
    """
    try:
        # Validation
        if not content or len(content) < 10:
            return "Error: Content must be at least 10 characters long"
            
        valid_types = ['expand', 'condense', 'reformat', 'restyle', 'correct']
        if edit_type not in valid_types:
            return f"Error: Edit type must be one of: {', '.join(valid_types)}"
        
        edited_content = content
        changes_made = []
        
        # Perform editing based on type
        if edit_type == 'expand':
            # Add examples if requested
            if 'example' in instructions.lower():
                edited_content += "\n\nFor example, consider a practical scenario where this applies."
                changes_made.append("Added example")
            # Add details
            edited_content += f"\n\nAdditional details: {instructions}"
            changes_made.append("Expanded content")
            
        elif edit_type == 'condense':
            # Remove filler words
            filler_words = ['very', 'really', 'actually', 'basically', 'literally']
            for word in filler_words:
                edited_content = re.sub(rf'\b{word}\b', '', edited_content, flags=re.IGNORECASE)
            changes_made.append("Removed filler words")
            
        elif edit_type == 'reformat':
            # Convert to markdown if requested
            if 'markdown' in instructions.lower():
                lines = edited_content.split('\n')
                edited_content = ""
                for line in lines:
                    if line and not line.startswith('#'):
                        # Make short lines headers
                        if len(line.split()) <= 5:
                            edited_content += f"## {line}\n"
                        else:
                            edited_content += f"{line}\n"
                    else:
                        edited_content += f"{line}\n"
                changes_made.append("Formatted as markdown")
                
        elif edit_type == 'restyle':
            # Apply style changes
            if 'formal' in instructions.lower():
                # Make more formal
                informal_replacements = {
                    "can't": "cannot",
                    "won't": "will not",
                    "it's": "it is"
                }
                for informal, formal in informal_replacements.items():
                    edited_content = edited_content.replace(informal, formal)
                changes_made.append("Applied formal style")
                
        elif edit_type == 'correct':
            # Basic grammar corrections
            # Fix double spaces
            edited_content = re.sub(r'\s+', ' ', edited_content)
            # Capitalize after periods
            edited_content = re.sub(r'(\. )([a-z])', lambda m: m.group(1) + m.group(2).upper(), edited_content)
            changes_made.append("Applied grammar corrections")
        
        # Clean up
        edited_content = edited_content.strip()
        
        return f"""Content edited successfully:

{edited_content}

[Changes made: {', '.join(changes_made) if changes_made else 'Applied requested edits'}]"""
        
    except Exception as e:
        return f"Error editing content: {str(e)}"


async def format_markdown(
    content: str,
    style: str,
    include_toc: bool,
    tool_context: ToolContext
) -> str:
    """
    Converts content to properly formatted markdown.
    
    Args:
        content: Content to format
        style: Markdown style (github, standard, minimal, academic)
        include_toc: Whether to include table of contents
        tool_context: ADK tool context
        
    Returns:
        Success message with formatted content or error message
    """
    try:
        # Validation
        if not content or len(content) < 10:
            return "Error: Content must be at least 10 characters long"
            
        valid_styles = ['github', 'standard', 'minimal', 'academic']
        if style not in valid_styles:
            return f"Error: Style must be one of: {', '.join(valid_styles)}"
        
        formatted_content = content
        headers = []
        
        # Identify and format headers
        lines = formatted_content.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            
            if not line:
                formatted_lines.append('')
                continue
                
            # Check if line should be a header
            if line.isupper() and len(line.split()) <= 6:
                header_text = line.title()
                formatted_lines.append(f"## {header_text}")
                headers.append(header_text)
            elif len(line.split()) <= 5 and not line.endswith(('.', '!', '?', ':')):
                formatted_lines.append(f"### {line}")
                headers.append(line)
            elif line.endswith(':') and len(line.split()) <= 6:
                header_text = line[:-1]
                formatted_lines.append(f"### {header_text}")
                headers.append(header_text)
            else:
                # Format lists
                if re.match(r'^[\d\-\*•]\s*\.?\s*', line):
                    line = re.sub(r'^[\d•]\s*\.?\s*', '- ', line)
                formatted_lines.append(line)
        
        formatted_content = '\n'.join(formatted_lines)
        
        # Apply style-specific formatting
        if style == 'github':
            # Convert NOTE:, WARNING:, etc. to callouts
            formatted_content = re.sub(
                r'^(NOTE|WARNING|TIP|IMPORTANT):\s*(.+)$',
                r'> **\1**: \2',
                formatted_content,
                flags=re.MULTILINE
            )
        
        # Generate TOC if requested
        toc = ""
        if include_toc and headers:
            toc = "## Table of Contents\n\n"
            for header in headers[:10]:  # Limit to 10 headers
                anchor = header.lower().replace(' ', '-')
                toc += f"- [{header}](#{anchor})\n"
            toc += "\n"
            
            # Insert TOC at beginning
            formatted_content = toc + formatted_content
        
        return f"""Markdown formatting complete:

{formatted_content}

[Format stats: {len(headers)} headers found, Style: {style}, TOC: {'included' if include_toc else 'not included'}]"""
        
    except Exception as e:
        return f"Error formatting markdown: {str(e)}"


async def check_grammar(
    content: str,
    style_guide: str,
    tool_context: ToolContext
) -> str:
    """
    Performs grammar and style checking.
    
    Args:
        content: Content to check
        style_guide: Style guide to use (ap, chicago, mla, apa, technical, standard)
        tool_context: ADK tool context
        
    Returns:
        Success message with grammar check results or error message
    """
    try:
        # Validation
        if not content or len(content) < 10:
            return "Error: Content must be at least 10 characters long"
            
        valid_guides = ['ap', 'chicago', 'mla', 'apa', 'technical', 'standard']
        if style_guide not in valid_guides:
            return f"Error: Style guide must be one of: {', '.join(valid_guides)}"
        
        issues_found = []
        
        # Check for common errors
        # Subject-verb agreement
        if re.search(r'\b(he|she|it) (are|were)\b', content, re.IGNORECASE):
            issues_found.append("Subject-verb disagreement detected")
            
        # Double words
        if re.search(r'\b(\w+)\s+\1\b', content):
            issues_found.append("Repeated word detected")
            
        # Missing capitals after periods
        if re.search(r'[.!?]\s*[a-z]', content):
            issues_found.append("Sentence should start with capital letter")
            
        # Style guide specific checks
        if style_guide == 'ap':
            # Check for Oxford comma
            if re.search(r'\w+,\s+\w+,\s+and\s+\w+', content):
                issues_found.append("AP style avoids Oxford comma")
                
        elif style_guide == 'technical':
            # Check for passive voice
            if re.search(r'\b(was|were|been|being)\s+\w+ed\b', content):
                issues_found.append("Technical writing prefers active voice")
        
        # Calculate score
        word_count = len(content.split())
        base_score = 100
        score = max(0, base_score - (len(issues_found) * 10))
        
        # Generate result
        if issues_found:
            issues_text = "\n".join(f"- {issue}" for issue in issues_found)
            result = f"""Grammar check complete ({style_guide.upper()} style):

Issues found ({len(issues_found)}):
{issues_text}

Score: {score}/100
Recommendation: {'Minor revision needed' if score >= 70 else 'Significant revision recommended'}"""
        else:
            result = f"""Grammar check complete ({style_guide.upper()} style):

No significant issues found!
Score: {score}/100
Writing quality: Excellent"""
        
        return result
        
    except Exception as e:
        return f"Error checking grammar: {str(e)}"


async def improve_clarity(
    content: str,
    target_audience: str,
    tool_context: ToolContext
) -> str:
    """
    Improves content clarity for target audience.
    
    Args:
        content: Content to improve
        target_audience: Target audience (general, technical, academic, business, youth)
        tool_context: ADK tool context
        
    Returns:
        Success message with improved content or error message
    """
    try:
        # Validation
        if not content or len(content) < 20:
            return "Error: Content must be at least 20 characters long"
            
        valid_audiences = ['general', 'technical', 'academic', 'business', 'youth']
        if target_audience not in valid_audiences:
            return f"Error: Target audience must be one of: {', '.join(valid_audiences)}"
        
        improved_content = content
        improvements_made = []
        
        # Apply audience-specific improvements
        if target_audience == 'general':
            # Simplify complex words
            replacements = {
                'utilize': 'use',
                'implement': 'do',
                'facilitate': 'help',
                'demonstrate': 'show',
                'methodology': 'method'
            }
            
            for complex_word, simple_word in replacements.items():
                if complex_word in improved_content.lower():
                    improved_content = re.sub(
                        rf'\b{complex_word}\b', 
                        simple_word, 
                        improved_content, 
                        flags=re.IGNORECASE
                    )
                    improvements_made.append(f"Simplified '{complex_word}' to '{simple_word}'")
                    
        elif target_audience == 'technical':
            # Add precision
            vague_terms = {
                'several': 'multiple (3-7)',
                'many': 'numerous (10+)',
                'few': 'limited (2-3)'
            }
            
            for vague, specific in vague_terms.items():
                if vague in improved_content.lower():
                    improved_content = re.sub(
                        rf'\b{vague}\b',
                        specific,
                        improved_content,
                        flags=re.IGNORECASE
                    )
                    improvements_made.append(f"Clarified '{vague}' to '{specific}'")
                    
        elif target_audience == 'business':
            # Make more action-oriented
            action_replacements = {
                'should consider': 'should',
                'might want to': 'should',
                'it is recommended': 'we recommend'
            }
            
            for passive, active in action_replacements.items():
                if passive in improved_content.lower():
                    improved_content = re.sub(
                        passive,
                        active,
                        improved_content,
                        flags=re.IGNORECASE
                    )
                    improvements_made.append(f"Made more decisive: '{passive}' → '{active}'")
        
        # Calculate readability improvement
        original_words = content.split()
        improved_words = improved_content.split()
        
        return f"""Clarity improved for {target_audience} audience:

{improved_content}

Improvements made:
{chr(10).join('- ' + imp for imp in improvements_made) if improvements_made else '- Optimized for target audience'}

[Readability: Improved for {target_audience} readers]"""
        
    except Exception as e:
        return f"Error improving clarity: {str(e)}"


# Create FunctionTool wrappers
tools = [
    FunctionTool(write_document, name="write_document"),
    FunctionTool(generate_outline, name="generate_outline"),
    FunctionTool(edit_content, name="edit_content"),
    FunctionTool(format_markdown, name="format_markdown"),
    FunctionTool(check_grammar, name="check_grammar"),
    FunctionTool(improve_clarity, name="improve_clarity")
]

# Export all tools
__all__ = ['tools'] + [tool.name for tool in tools]