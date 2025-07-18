"""
Input validation and sanitization utilities for VANA tools.

Provides comprehensive validation for user inputs to prevent
security issues and ensure data integrity.
"""

import re
import html
from typing import Any, List, Dict, Optional
from urllib.parse import urlparse
from lib._tools.exceptions import ValidationError


class InputValidator:
    """Validates and sanitizes user inputs."""
    
    # Dangerous patterns that could indicate injection attempts
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',  # Script tags
        r'javascript:',                  # JavaScript protocol
        r'on\w+\s*=',                   # Event handlers
        r'<iframe',                     # Iframes
        r'<object',                     # Objects
        r'<embed',                      # Embeds
        r'\$\{.*?\}',                   # Template injection
        r'{{.*?}}',                     # Template injection
        r'<%.*?%>',                     # Server-side injection
        r'<\?.*?\?>',                   # PHP tags
        r'exec\s*\(',                   # Code execution
        r'eval\s*\(',                   # Code evaluation
        r'__import__',                  # Python import
        r'require\s*\(',                # Node.js require
        r'\\x[0-9a-fA-F]{2}',          # Hex encoding
        r'\\u[0-9a-fA-F]{4}',          # Unicode encoding
    ]
    
    # SQL injection patterns
    SQL_PATTERNS = [
        r"('\s*(OR|AND)\s*'?\d*'?\s*=\s*'?\d*)",  # OR 1=1
        r'(;\s*DROP\s+TABLE)',                      # DROP TABLE
        r'(;\s*DELETE\s+FROM)',                     # DELETE FROM
        r'(UNION\s+SELECT)',                        # UNION SELECT
        r'(INSERT\s+INTO)',                         # INSERT INTO
        r'(UPDATE\s+\w+\s+SET)',                    # UPDATE SET
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r'\.\.[/\\]',           # ../
        r'\.\.',               # .. alone
        r'^[/\\]',             # Absolute paths
        r'^[A-Za-z]:[/\\]',    # Windows absolute paths
        r'~[/\\]',             # Home directory
    ]
    
    @staticmethod
    def sanitize_text(text: str, allow_html: bool = False) -> str:
        """
        Sanitize text input by removing dangerous content.
        
        Args:
            text: Input text to sanitize
            allow_html: Whether to allow HTML (will be escaped if False)
            
        Returns:
            Sanitized text
            
        Raises:
            ValidationError: If dangerous content is detected
        """
        if not isinstance(text, str):
            raise ValidationError(f"Expected string input, got {type(text).__name__}")
            
        # Check for dangerous patterns
        for pattern in InputValidator.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                raise ValidationError("Potentially dangerous content detected")
                
        # Check for SQL injection
        for pattern in InputValidator.SQL_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                raise ValidationError("SQL injection pattern detected")
                
        # Escape HTML if not allowed
        if not allow_html:
            text = html.escape(text)
            
        # Remove null bytes
        text = text.replace('\x00', '')
        
        # Normalize whitespace
        text = re.sub(r'[\x0b\x0c\r]', '\n', text)  # Normalize line endings
        text = re.sub(r'[ \t]+', ' ', text)         # Normalize spaces
        text = re.sub(r'\n{3,}', '\n\n', text)      # Limit consecutive newlines
        
        return text.strip()
    
    @staticmethod
    def validate_url(url: str, allowed_schemes: List[str] = None) -> str:
        """
        Validate and sanitize URL.
        
        Args:
            url: URL to validate
            allowed_schemes: List of allowed URL schemes (default: ['http', 'https'])
            
        Returns:
            Validated URL
            
        Raises:
            ValidationError: If URL is invalid or uses disallowed scheme
        """
        if not url:
            raise ValidationError("URL cannot be empty")
            
        # Default allowed schemes
        if allowed_schemes is None:
            allowed_schemes = ['http', 'https']
            
        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValidationError("Invalid URL format")
            
        # Check scheme
        if parsed.scheme not in allowed_schemes:
            raise ValidationError(f"URL scheme must be one of: {', '.join(allowed_schemes)}")
            
        # Check for dangerous schemes
        dangerous_schemes = ['javascript', 'data', 'vbscript', 'file']
        if parsed.scheme in dangerous_schemes:
            raise ValidationError("Dangerous URL scheme detected")
            
        # Ensure URL has netloc (domain)
        if not parsed.netloc:
            raise ValidationError("URL must include domain")
            
        # Check for suspicious patterns
        if '..' in url or '\\' in url:
            raise ValidationError("URL contains suspicious patterns")
            
        return url
    
    @staticmethod
    def validate_filename(filename: str, allow_paths: bool = False) -> str:
        """
        Validate filename for security issues.
        
        Args:
            filename: Filename to validate
            allow_paths: Whether to allow path separators
            
        Returns:
            Validated filename
            
        Raises:
            ValidationError: If filename contains dangerous patterns
        """
        if not filename:
            raise ValidationError("Filename cannot be empty")
            
        # Check for path traversal
        for pattern in InputValidator.PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, filename):
                raise ValidationError("Path traversal pattern detected")
                
        # Check for null bytes
        if '\x00' in filename:
            raise ValidationError("Null byte in filename")
            
        # If paths not allowed, check for separators
        if not allow_paths and ('/' in filename or '\\' in filename):
            raise ValidationError("Path separators not allowed in filename")
            
        # Check for reserved names (Windows)
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
                         'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
                         'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
        
        base_name = filename.split('.')[0].upper()
        if base_name in reserved_names:
            raise ValidationError("Reserved filename detected")
            
        # Limit length
        if len(filename) > 255:
            raise ValidationError("Filename too long (max 255 characters)")
            
        return filename
    
    @staticmethod
    def validate_number(value: Any, min_val: Optional[float] = None, 
                       max_val: Optional[float] = None, 
                       allow_float: bool = True) -> float:
        """
        Validate numeric input.
        
        Args:
            value: Value to validate
            min_val: Minimum allowed value
            max_val: Maximum allowed value
            allow_float: Whether to allow floating point numbers
            
        Returns:
            Validated number
            
        Raises:
            ValidationError: If value is not a valid number or out of range
        """
        try:
            if isinstance(value, str):
                # Check for dangerous patterns in string
                if re.search(r'[^0-9.\-+eE]', value):
                    raise ValidationError("Invalid characters in number")
                    
            num = float(value)
            
            if not allow_float and num != int(num):
                raise ValidationError("Floating point numbers not allowed")
                
            if not allow_float:
                num = int(num)
                
        except (ValueError, TypeError):
            raise ValidationError(f"Invalid number: {value}")
            
        # Check bounds
        if min_val is not None and num < min_val:
            raise ValidationError(f"Number must be at least {min_val}")
            
        if max_val is not None and num > max_val:
            raise ValidationError(f"Number must be at most {max_val}")
            
        # Check for special values
        if not (-1e308 < num < 1e308):  # Approximate float bounds
            raise ValidationError("Number out of valid range")
            
        return num
    
    @staticmethod
    def validate_list(items: List[Any], max_items: int = 100,
                     item_validator: Optional[callable] = None) -> List[Any]:
        """
        Validate list input.
        
        Args:
            items: List to validate
            max_items: Maximum allowed items
            item_validator: Optional function to validate each item
            
        Returns:
            Validated list
            
        Raises:
            ValidationError: If list is invalid
        """
        if not isinstance(items, list):
            raise ValidationError("Input must be a list")
            
        if len(items) > max_items:
            raise ValidationError(f"List too long (max {max_items} items)")
            
        if item_validator:
            validated_items = []
            for i, item in enumerate(items):
                try:
                    validated_items.append(item_validator(item))
                except ValidationError as e:
                    raise ValidationError(f"Item {i}: {str(e)}")
            return validated_items
            
        return items
    
    @staticmethod
    def validate_dict(data: Dict[str, Any], required_keys: List[str] = None,
                     allowed_keys: List[str] = None) -> Dict[str, Any]:
        """
        Validate dictionary input.
        
        Args:
            data: Dictionary to validate
            required_keys: List of required keys
            allowed_keys: List of allowed keys (if None, all keys allowed)
            
        Returns:
            Validated dictionary
            
        Raises:
            ValidationError: If dictionary is invalid
        """
        if not isinstance(data, dict):
            raise ValidationError("Input must be a dictionary")
            
        # Check required keys
        if required_keys:
            missing = set(required_keys) - set(data.keys())
            if missing:
                raise ValidationError(f"Missing required keys: {', '.join(missing)}")
                
        # Check allowed keys
        if allowed_keys is not None:
            extra = set(data.keys()) - set(allowed_keys)
            if extra:
                raise ValidationError(f"Unknown keys: {', '.join(extra)}")
                
        return data
    
    @staticmethod
    def sanitize_for_logging(text: str, max_length: int = 1000) -> str:
        """
        Sanitize text for safe logging.
        
        Args:
            text: Text to sanitize
            max_length: Maximum length for log output
            
        Returns:
            Sanitized text safe for logging
        """
        # Remove control characters
        text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
        
        # Truncate if too long
        if len(text) > max_length:
            text = text[:max_length] + '...[truncated]'
            
        # Escape special characters
        text = text.replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t')
        
        return text


class ContentValidator:
    """Validates content-specific inputs."""
    
    @staticmethod
    def validate_document_type(doc_type: str) -> str:
        """Validate document type."""
        valid_types = ['report', 'article', 'documentation', 'proposal', 'email']
        
        doc_type = doc_type.lower().strip()
        if doc_type not in valid_types:
            raise ValidationError(f"Document type must be one of: {', '.join(valid_types)}")
            
        return doc_type
    
    @staticmethod
    def validate_word_count(count: Any) -> int:
        """Validate word count parameter."""
        count = InputValidator.validate_number(count, min_val=10, max_val=50000, allow_float=False)
        return int(count)
    
    @staticmethod
    def validate_style_guide(guide: str) -> str:
        """Validate style guide parameter."""
        valid_guides = ['ap', 'chicago', 'mla', 'apa', 'technical', 'standard']
        
        guide = guide.lower().strip()
        if guide not in valid_guides:
            raise ValidationError(f"Style guide must be one of: {', '.join(valid_guides)}")
            
        return guide
    
    @staticmethod
    def validate_audience(audience: str) -> str:
        """Validate target audience parameter."""
        valid_audiences = ['general', 'technical', 'academic', 'business', 'youth']
        
        audience = audience.lower().strip()
        if audience not in valid_audiences:
            raise ValidationError(f"Target audience must be one of: {', '.join(valid_audiences)}")
            
        return audience


class ResearchValidator:
    """Validates research-specific inputs."""
    
    @staticmethod
    def validate_search_query(query: str) -> str:
        """Validate search query."""
        query = InputValidator.sanitize_text(query)
        
        if len(query) < 3:
            raise ValidationError("Search query must be at least 3 characters")
            
        if len(query) > 500:
            raise ValidationError("Search query too long (max 500 characters)")
            
        # Check for excessive special characters
        special_char_count = len(re.findall(r'[^a-zA-Z0-9\s]', query))
        if special_char_count > len(query) * 0.3:
            raise ValidationError("Search query contains too many special characters")
            
        return query
    
    @staticmethod
    def validate_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate search filters."""
        allowed_keys = ['date_range', 'domain', 'file_type', 'language', 'region']
        
        filters = InputValidator.validate_dict(filters, allowed_keys=allowed_keys)
        
        # Validate specific filter values
        if 'date_range' in filters:
            valid_ranges = ['last_week', 'last_month', 'last_year', 'anytime']
            if filters['date_range'] not in valid_ranges:
                raise ValidationError(f"Date range must be one of: {', '.join(valid_ranges)}")
                
        if 'file_type' in filters:
            valid_types = ['pdf', 'doc', 'html', 'txt', 'any']
            if filters['file_type'] not in valid_types:
                raise ValidationError(f"File type must be one of: {', '.join(valid_types)}")
                
        if 'domain' in filters:
            # Basic domain validation
            domain = filters['domain']
            if not re.match(r'^[a-zA-Z0-9.-]+$', domain):
                raise ValidationError("Invalid domain format")
                
        return filters
    
    @staticmethod
    def validate_citation_style(style: str) -> str:
        """Validate citation style."""
        valid_styles = ['apa', 'mla', 'chicago', 'harvard', 'simple']
        
        style = style.lower().strip()
        if style not in valid_styles:
            raise ValidationError(f"Citation style must be one of: {', '.join(valid_styles)}")
            
        return style