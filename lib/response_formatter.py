"""
Response Formatter for VANA

Ensures all responses are clean, unified, and from VANA's perspective only.
Removes any agent handoff artifacts and maintains consistent voice.
"""

import re
from typing import Dict, List, Optional, Tuple


class ResponseFormatter:
    """Format agent responses to maintain VANA's unified voice"""
    
    # Patterns that indicate agent handoffs or internal communication
    HANDOFF_PATTERNS = [
        r'\[.*?specialist.*?\]',
        r'<.*?handoff.*?>',
        r'(?i)handing off to',
        r'(?i)routing to specialist',
        r'(?i)calling agent',
        r'(?i)transferring to',
        r'(?i)delegating to',
        r'(?i)specialist says:',
        r'(?i)agent response:',
        r'->.*?:',  # Arrow notation
        r'##.*?specialist.*?##',
        r'---.*?handoff.*?---',
        r'(?i)invoking.*?agent',
        r'(?i)passing to',
        r'(?i)forwarding to'
    ]
    
    # Patterns for internal thinking/processing
    THINKING_PATTERNS = [
        r'\[thinking\].*?\[/thinking\]',
        r'<thinking>.*?</thinking>',
        r'(?i)internal:.*?(?=\n|$)',
        r'(?i)debug:.*?(?=\n|$)',
        r'(?i)processing:.*?(?=\n|$)'
    ]
    
    @classmethod
    def format_response(cls, response: str) -> str:
        """
        Format response to ensure clean output from VANA's perspective.
        
        Args:
            response: Raw response from agent system
            
        Returns:
            Cleaned response with unified voice
        """
        if not response:
            return "I'm ready to help you. What would you like to know?"
        
        # Remove handoff artifacts
        cleaned = response
        for pattern in cls.HANDOFF_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove internal thinking (unless specifically requested to show)
        for pattern in cls.THINKING_PATTERNS:
            cleaned = re.sub(pattern, '', cleaned, flags=re.IGNORECASE | re.DOTALL)
        
        # Clean up extra whitespace and newlines
        cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
        cleaned = re.sub(r' {2,}', ' ', cleaned)
        cleaned = cleaned.strip()
        
        # Ensure response isn't empty after cleaning
        if not cleaned:
            return "I've processed your request. How else can I help you?"
        
        return cleaned
    
    @classmethod
    def extract_thinking(cls, response: str) -> Tuple[str, List[Dict[str, str]]]:
        """
        Extract thinking/processing steps for optional display.
        
        Args:
            response: Raw response from agent system
            
        Returns:
            Tuple of (cleaned_response, thinking_steps)
        """
        thinking_steps = []
        
        # Extract handoff information
        handoff_matches = []
        for pattern in cls.HANDOFF_PATTERNS:
            matches = re.finditer(pattern, response, flags=re.IGNORECASE)
            for match in matches:
                handoff_matches.append({
                    'type': 'handoff',
                    'content': match.group(0),
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Sort by position and convert to thinking steps
        handoff_matches.sort(key=lambda x: x['start'])
        
        for match in handoff_matches:
            # Parse the handoff to extract agent info
            content = match['content']
            
            # Try to identify which specialist
            specialist = None
            if 'security' in content.lower():
                specialist = 'Security Specialist'
                icon = '🔒'
            elif 'architecture' in content.lower():
                specialist = 'Architecture Specialist'
                icon = '🏗️'
            elif 'data' in content.lower():
                specialist = 'Data Science Specialist'
                icon = '📊'
            elif 'qa' in content.lower() or 'test' in content.lower():
                specialist = 'QA Specialist'
                icon = '🧪'
            elif 'ui' in content.lower() or 'ux' in content.lower():
                specialist = 'UI/UX Specialist'
                icon = '🎨'
            elif 'devops' in content.lower():
                specialist = 'DevOps Specialist'
                icon = '🚀'
            else:
                specialist = 'Specialist Agent'
                icon = '🤖'
            
            thinking_steps.append({
                'icon': icon,
                'summary': f'Consulting {specialist}',
                'detail': content.strip()
            })
        
        # Clean the response
        cleaned = cls.format_response(response)
        
        # Add final step
        if thinking_steps:
            thinking_steps.append({
                'icon': '✅',
                'summary': 'Preparing final response',
                'detail': 'Aggregating insights from specialists'
            })
        
        return cleaned, thinking_steps
    
    @classmethod
    def format_error(cls, error: Exception) -> str:
        """
        Format error messages in a user-friendly way.
        
        Args:
            error: Exception that occurred
            
        Returns:
            User-friendly error message
        """
        error_str = str(error).lower()
        
        if 'api key' in error_str or 'authentication' in error_str:
            return "I'm having trouble accessing my capabilities. Please check that all API keys are properly configured."
        elif 'timeout' in error_str:
            return "The request took longer than expected. Please try again with a simpler query."
        elif 'rate limit' in error_str:
            return "I've hit a rate limit. Please wait a moment before trying again."
        elif 'connection' in error_str or 'network' in error_str:
            return "I'm having trouble connecting to my services. Please check your internet connection."
        else:
            return "I encountered an unexpected issue. Please try rephrasing your request or try again later."
    
    @classmethod
    def ensure_markdown_formatting(cls, response: str) -> str:
        """
        Ensure response has proper markdown formatting.
        
        Args:
            response: Response text
            
        Returns:
            Response with enhanced markdown formatting
        """
        # Fix code blocks
        response = re.sub(r'```(\w+)?\n', r'```\1\n', response)
        
        # Ensure lists have proper spacing
        response = re.sub(r'(\n)(\d+\.|[-*])\s', r'\n\n\2 ', response)
        
        # Fix headers
        response = re.sub(r'(\n)(#{1,6})\s', r'\n\n\2 ', response)
        
        return response