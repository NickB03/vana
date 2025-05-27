#!/usr/bin/env python3
"""
Document Validation Tools for VANA ADK

This module provides comprehensive document validation capabilities including:
1. File format validation
2. Content integrity checks
3. Metadata validation
4. Security scanning
5. Quality assessment
"""

import os
import re
import logging
import json
import hashlib
import mimetypes
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
# Optional dependency for better file type detection
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ValidationRule:
    """Represents a validation rule"""
    name: str
    description: str
    severity: str  # 'error', 'warning', 'info'
    enabled: bool = True

@dataclass
class ValidationResult:
    """Result of a validation check"""
    rule_name: str
    passed: bool
    severity: str
    message: str
    details: Optional[Dict[str, Any]] = None

@dataclass
class DocumentValidationReport:
    """Comprehensive validation report for a document"""
    file_path: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    validation_timestamp: str
    overall_status: str  # 'valid', 'warning', 'invalid'
    results: List[ValidationResult]
    metadata: Dict[str, Any]

    @property
    def error_count(self) -> int:
        return sum(1 for r in self.results if not r.passed and r.severity == 'error')

    @property
    def warning_count(self) -> int:
        return sum(1 for r in self.results if not r.passed and r.severity == 'warning')

    @property
    def is_valid(self) -> bool:
        return self.error_count == 0

class DocumentValidator:
    """Comprehensive document validator"""

    def __init__(self):
        """Initialize the document validator"""
        self.validation_rules = self._initialize_default_rules()
        self.custom_rules = []

        # Supported file types and their characteristics
        self.supported_mime_types = {
            'application/pdf': {
                'extensions': ['.pdf'],
                'max_size_mb': 100,
                'description': 'PDF Document'
            },
            'text/plain': {
                'extensions': ['.txt'],
                'max_size_mb': 50,
                'description': 'Plain Text'
            },
            'text/markdown': {
                'extensions': ['.md', '.markdown'],
                'max_size_mb': 50,
                'description': 'Markdown Document'
            },
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
                'extensions': ['.docx'],
                'max_size_mb': 100,
                'description': 'Microsoft Word Document'
            },
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
                'extensions': ['.pptx'],
                'max_size_mb': 200,
                'description': 'Microsoft PowerPoint Presentation'
            },
            'image/jpeg': {
                'extensions': ['.jpg', '.jpeg'],
                'max_size_mb': 50,
                'description': 'JPEG Image'
            },
            'image/png': {
                'extensions': ['.png'],
                'max_size_mb': 50,
                'description': 'PNG Image'
            },
            'image/gif': {
                'extensions': ['.gif'],
                'max_size_mb': 50,
                'description': 'GIF Image'
            }
        }

        # Security patterns to check for
        self.security_patterns = {
            'suspicious_urls': re.compile(r'https?://(?:bit\.ly|tinyurl|t\.co|goo\.gl|short\.link)', re.IGNORECASE),
            'email_addresses': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
            'phone_numbers': re.compile(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'),
            'credit_card_patterns': re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'),
            'ssn_patterns': re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
        }

    def _initialize_default_rules(self) -> List[ValidationRule]:
        """Initialize default validation rules"""
        return [
            ValidationRule("file_exists", "File must exist", "error"),
            ValidationRule("file_readable", "File must be readable", "error"),
            ValidationRule("file_size_check", "File size must be within limits", "error"),
            ValidationRule("file_type_supported", "File type must be supported", "error"),
            ValidationRule("file_extension_match", "File extension must match MIME type", "warning"),
            ValidationRule("file_not_empty", "File must not be empty", "error"),
            ValidationRule("filename_valid", "Filename must be valid", "warning"),
            ValidationRule("content_encoding_check", "Content encoding must be valid", "warning"),
            ValidationRule("security_scan", "File must pass security scan", "warning"),
            ValidationRule("metadata_extraction", "Metadata must be extractable", "info")
        ]

    def add_custom_rule(self, rule: ValidationRule):
        """Add a custom validation rule"""
        self.custom_rules.append(rule)
        logger.info(f"Added custom validation rule: {rule.name}")

    def get_enabled_rules(self) -> List[ValidationRule]:
        """Get all enabled validation rules"""
        all_rules = self.validation_rules + self.custom_rules
        return [rule for rule in all_rules if rule.enabled]

    def validate_file_exists(self, file_path: str) -> ValidationResult:
        """Validate that file exists"""
        try:
            exists = os.path.exists(file_path)
            return ValidationResult(
                rule_name="file_exists",
                passed=exists,
                severity="error",
                message="File exists" if exists else f"File does not exist: {file_path}"
            )
        except Exception as e:
            return ValidationResult(
                rule_name="file_exists",
                passed=False,
                severity="error",
                message=f"Error checking file existence: {str(e)}"
            )

    def validate_file_readable(self, file_path: str) -> ValidationResult:
        """Validate that file is readable"""
        try:
            with open(file_path, 'rb') as f:
                f.read(1)  # Try to read one byte
            return ValidationResult(
                rule_name="file_readable",
                passed=True,
                severity="error",
                message="File is readable"
            )
        except PermissionError:
            return ValidationResult(
                rule_name="file_readable",
                passed=False,
                severity="error",
                message="Permission denied: file is not readable"
            )
        except Exception as e:
            return ValidationResult(
                rule_name="file_readable",
                passed=False,
                severity="error",
                message=f"Error reading file: {str(e)}"
            )

    def validate_file_size(self, file_path: str) -> ValidationResult:
        """Validate file size"""
        try:
            file_size = os.path.getsize(file_path)
            file_size_mb = file_size / (1024 * 1024)

            # Determine MIME type to get size limits
            mime_type, _ = mimetypes.guess_type(file_path)

            if mime_type in self.supported_mime_types:
                max_size_mb = self.supported_mime_types[mime_type]['max_size_mb']

                if file_size_mb <= max_size_mb:
                    return ValidationResult(
                        rule_name="file_size_check",
                        passed=True,
                        severity="error",
                        message=f"File size OK: {file_size_mb:.2f}MB <= {max_size_mb}MB",
                        details={"file_size_mb": file_size_mb, "max_size_mb": max_size_mb}
                    )
                else:
                    return ValidationResult(
                        rule_name="file_size_check",
                        passed=False,
                        severity="error",
                        message=f"File too large: {file_size_mb:.2f}MB > {max_size_mb}MB",
                        details={"file_size_mb": file_size_mb, "max_size_mb": max_size_mb}
                    )
            else:
                # Default size limit for unknown types
                max_size_mb = 100
                passed = file_size_mb <= max_size_mb
                return ValidationResult(
                    rule_name="file_size_check",
                    passed=passed,
                    severity="warning",
                    message=f"File size: {file_size_mb:.2f}MB (unknown type, using default limit {max_size_mb}MB)",
                    details={"file_size_mb": file_size_mb, "max_size_mb": max_size_mb}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="file_size_check",
                passed=False,
                severity="error",
                message=f"Error checking file size: {str(e)}"
            )

    def validate_file_type(self, file_path: str) -> ValidationResult:
        """Validate file type is supported"""
        try:
            mime_type, _ = mimetypes.guess_type(file_path)

            if mime_type in self.supported_mime_types:
                return ValidationResult(
                    rule_name="file_type_supported",
                    passed=True,
                    severity="error",
                    message=f"Supported file type: {mime_type}",
                    details={"mime_type": mime_type, "description": self.supported_mime_types[mime_type]['description']}
                )
            else:
                return ValidationResult(
                    rule_name="file_type_supported",
                    passed=False,
                    severity="error",
                    message=f"Unsupported file type: {mime_type}",
                    details={"mime_type": mime_type}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="file_type_supported",
                passed=False,
                severity="error",
                message=f"Error determining file type: {str(e)}"
            )

    def validate_file_extension(self, file_path: str) -> ValidationResult:
        """Validate file extension matches MIME type"""
        try:
            file_ext = Path(file_path).suffix.lower()
            mime_type, _ = mimetypes.guess_type(file_path)

            if mime_type in self.supported_mime_types:
                expected_extensions = self.supported_mime_types[mime_type]['extensions']

                if file_ext in expected_extensions:
                    return ValidationResult(
                        rule_name="file_extension_match",
                        passed=True,
                        severity="warning",
                        message=f"File extension matches MIME type: {file_ext} -> {mime_type}",
                        details={"extension": file_ext, "mime_type": mime_type}
                    )
                else:
                    return ValidationResult(
                        rule_name="file_extension_match",
                        passed=False,
                        severity="warning",
                        message=f"File extension mismatch: {file_ext} does not match {mime_type}",
                        details={"extension": file_ext, "mime_type": mime_type, "expected_extensions": expected_extensions}
                    )
            else:
                return ValidationResult(
                    rule_name="file_extension_match",
                    passed=False,
                    severity="warning",
                    message=f"Cannot validate extension for unknown MIME type: {mime_type}",
                    details={"extension": file_ext, "mime_type": mime_type}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="file_extension_match",
                passed=False,
                severity="warning",
                message=f"Error validating file extension: {str(e)}"
            )

    def validate_file_not_empty(self, file_path: str) -> ValidationResult:
        """Validate file is not empty"""
        try:
            file_size = os.path.getsize(file_path)

            if file_size > 0:
                return ValidationResult(
                    rule_name="file_not_empty",
                    passed=True,
                    severity="error",
                    message=f"File is not empty: {file_size} bytes",
                    details={"file_size_bytes": file_size}
                )
            else:
                return ValidationResult(
                    rule_name="file_not_empty",
                    passed=False,
                    severity="error",
                    message="File is empty (0 bytes)",
                    details={"file_size_bytes": file_size}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="file_not_empty",
                passed=False,
                severity="error",
                message=f"Error checking if file is empty: {str(e)}"
            )

    def validate_filename(self, file_path: str) -> ValidationResult:
        """Validate filename is valid"""
        try:
            filename = os.path.basename(file_path)

            # Check for invalid characters
            invalid_chars = set('<>:"/\\|?*')
            has_invalid_chars = any(char in filename for char in invalid_chars)

            # Check length
            max_filename_length = 255
            too_long = len(filename) > max_filename_length

            # Check for reserved names (Windows)
            reserved_names = {'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'}
            name_without_ext = Path(filename).stem.upper()
            is_reserved = name_without_ext in reserved_names

            issues = []
            if has_invalid_chars:
                issues.append("contains invalid characters")
            if too_long:
                issues.append(f"too long ({len(filename)} > {max_filename_length})")
            if is_reserved:
                issues.append("uses reserved name")

            if not issues:
                return ValidationResult(
                    rule_name="filename_valid",
                    passed=True,
                    severity="warning",
                    message="Filename is valid",
                    details={"filename": filename, "length": len(filename)}
                )
            else:
                return ValidationResult(
                    rule_name="filename_valid",
                    passed=False,
                    severity="warning",
                    message=f"Invalid filename: {', '.join(issues)}",
                    details={"filename": filename, "issues": issues}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="filename_valid",
                passed=False,
                severity="warning",
                message=f"Error validating filename: {str(e)}"
            )

    def validate_content_encoding(self, file_path: str) -> ValidationResult:
        """Validate content encoding for text files"""
        try:
            mime_type, _ = mimetypes.guess_type(file_path)

            # Only check encoding for text files
            if not mime_type or not mime_type.startswith('text/'):
                return ValidationResult(
                    rule_name="content_encoding_check",
                    passed=True,
                    severity="warning",
                    message="Encoding check skipped (not a text file)",
                    details={"mime_type": mime_type}
                )

            # Try to read file with different encodings
            encodings_to_try = ['utf-8', 'utf-16', 'latin-1', 'cp1252']

            for encoding in encodings_to_try:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        f.read()

                    return ValidationResult(
                        rule_name="content_encoding_check",
                        passed=True,
                        severity="warning",
                        message=f"Valid encoding detected: {encoding}",
                        details={"encoding": encoding, "mime_type": mime_type}
                    )
                except UnicodeDecodeError:
                    continue

            return ValidationResult(
                rule_name="content_encoding_check",
                passed=False,
                severity="warning",
                message="Could not determine valid encoding",
                details={"tried_encodings": encodings_to_try}
            )

        except Exception as e:
            return ValidationResult(
                rule_name="content_encoding_check",
                passed=False,
                severity="warning",
                message=f"Error checking content encoding: {str(e)}"
            )

    def validate_security(self, file_path: str) -> ValidationResult:
        """Perform basic security validation"""
        try:
            security_issues = []

            # Check file size for potential zip bombs or similar
            file_size = os.path.getsize(file_path)
            if file_size > 500 * 1024 * 1024:  # 500MB
                security_issues.append("File is very large (potential security risk)")

            # For text files, scan content for suspicious patterns
            mime_type, _ = mimetypes.guess_type(file_path)
            if mime_type and mime_type.startswith('text/'):
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(10000)  # Read first 10KB

                    for pattern_name, pattern in self.security_patterns.items():
                        matches = pattern.findall(content)
                        if matches:
                            security_issues.append(f"Found {pattern_name}: {len(matches)} matches")

                except Exception:
                    pass  # Ignore encoding errors for security scan

            if not security_issues:
                return ValidationResult(
                    rule_name="security_scan",
                    passed=True,
                    severity="warning",
                    message="No security issues detected",
                    details={"file_size_bytes": file_size}
                )
            else:
                return ValidationResult(
                    rule_name="security_scan",
                    passed=False,
                    severity="warning",
                    message=f"Security issues detected: {', '.join(security_issues)}",
                    details={"issues": security_issues, "file_size_bytes": file_size}
                )

        except Exception as e:
            return ValidationResult(
                rule_name="security_scan",
                passed=False,
                severity="warning",
                message=f"Error during security scan: {str(e)}"
            )

    def extract_metadata(self, file_path: str) -> ValidationResult:
        """Extract and validate metadata"""
        try:
            stat = os.stat(file_path)
            mime_type, encoding = mimetypes.guess_type(file_path)

            # Calculate file hash
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(chunk)

            metadata = {
                "file_name": os.path.basename(file_path),
                "file_size_bytes": stat.st_size,
                "file_size_mb": round(stat.st_size / (1024 * 1024), 2),
                "mime_type": mime_type,
                "encoding": encoding,
                "created_time": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "sha256_hash": sha256_hash.hexdigest()
            }

            return ValidationResult(
                rule_name="metadata_extraction",
                passed=True,
                severity="info",
                message="Metadata extracted successfully",
                details=metadata
            )

        except Exception as e:
            return ValidationResult(
                rule_name="metadata_extraction",
                passed=False,
                severity="info",
                message=f"Error extracting metadata: {str(e)}"
            )

    def validate_document(self, file_path: str) -> DocumentValidationReport:
        """
        Perform comprehensive validation of a document

        Args:
            file_path: Path to the document to validate

        Returns:
            DocumentValidationReport with validation results
        """
        validation_start = datetime.now()

        # Initialize report
        try:
            file_name = os.path.basename(file_path)
            file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
            mime_type, _ = mimetypes.guess_type(file_path)
        except:
            file_name = os.path.basename(file_path)
            file_size = 0
            mime_type = "unknown"

        results = []

        # Run all enabled validation rules
        enabled_rules = self.get_enabled_rules()

        for rule in enabled_rules:
            try:
                if rule.name == "file_exists":
                    result = self.validate_file_exists(file_path)
                elif rule.name == "file_readable":
                    result = self.validate_file_readable(file_path)
                elif rule.name == "file_size_check":
                    result = self.validate_file_size(file_path)
                elif rule.name == "file_type_supported":
                    result = self.validate_file_type(file_path)
                elif rule.name == "file_extension_match":
                    result = self.validate_file_extension(file_path)
                elif rule.name == "file_not_empty":
                    result = self.validate_file_not_empty(file_path)
                elif rule.name == "filename_valid":
                    result = self.validate_filename(file_path)
                elif rule.name == "content_encoding_check":
                    result = self.validate_content_encoding(file_path)
                elif rule.name == "security_scan":
                    result = self.validate_security(file_path)
                elif rule.name == "metadata_extraction":
                    result = self.extract_metadata(file_path)
                else:
                    # Skip unknown rules
                    continue

                results.append(result)

            except Exception as e:
                # Create error result for failed validation
                error_result = ValidationResult(
                    rule_name=rule.name,
                    passed=False,
                    severity=rule.severity,
                    message=f"Validation rule failed: {str(e)}"
                )
                results.append(error_result)

        # Determine overall status
        error_count = sum(1 for r in results if not r.passed and r.severity == 'error')
        warning_count = sum(1 for r in results if not r.passed and r.severity == 'warning')

        if error_count > 0:
            overall_status = "invalid"
        elif warning_count > 0:
            overall_status = "warning"
        else:
            overall_status = "valid"

        # Extract metadata from results
        metadata = {}
        for result in results:
            if result.rule_name == "metadata_extraction" and result.details:
                metadata = result.details
                break

        # Create validation report
        report = DocumentValidationReport(
            file_path=file_path,
            file_name=file_name,
            file_size_bytes=file_size,
            mime_type=mime_type or "unknown",
            validation_timestamp=validation_start.isoformat(),
            overall_status=overall_status,
            results=results,
            metadata=metadata
        )

        logger.info(f"Validation completed for {file_name}: {overall_status} ({error_count} errors, {warning_count} warnings)")
        return report

    def validate_batch(self, file_paths: List[str]) -> List[DocumentValidationReport]:
        """
        Validate multiple documents

        Args:
            file_paths: List of file paths to validate

        Returns:
            List of DocumentValidationReport objects
        """
        logger.info(f"Starting batch validation of {len(file_paths)} files")

        reports = []
        for i, file_path in enumerate(file_paths):
            logger.info(f"Validating file {i+1}/{len(file_paths)}: {os.path.basename(file_path)}")
            report = self.validate_document(file_path)
            reports.append(report)

        # Log summary
        valid_count = sum(1 for r in reports if r.overall_status == "valid")
        warning_count = sum(1 for r in reports if r.overall_status == "warning")
        invalid_count = sum(1 for r in reports if r.overall_status == "invalid")

        logger.info(f"Batch validation completed: {valid_count} valid, {warning_count} warnings, {invalid_count} invalid")

        return reports

    def export_validation_report(self, reports: List[DocumentValidationReport], output_path: str) -> bool:
        """
        Export validation reports to JSON file

        Args:
            reports: List of validation reports
            output_path: Path to output file

        Returns:
            True if successful, False otherwise
        """
        try:
            # Convert reports to dictionaries
            report_data = {
                "validation_summary": {
                    "total_files": len(reports),
                    "valid_files": sum(1 for r in reports if r.overall_status == "valid"),
                    "warning_files": sum(1 for r in reports if r.overall_status == "warning"),
                    "invalid_files": sum(1 for r in reports if r.overall_status == "invalid"),
                    "total_errors": sum(r.error_count for r in reports),
                    "total_warnings": sum(r.warning_count for r in reports)
                },
                "reports": [asdict(report) for report in reports],
                "export_timestamp": datetime.now().isoformat()
            }

            with open(output_path, 'w') as f:
                json.dump(report_data, f, indent=2)

            logger.info(f"Validation report exported to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting validation report: {str(e)}")
            return False

# Utility functions
def create_validator() -> DocumentValidator:
    """Create a document validator with default settings"""
    return DocumentValidator()

def quick_validate(file_path: str) -> DocumentValidationReport:
    """Quick validation of a single file"""
    validator = create_validator()
    return validator.validate_document(file_path)

def quick_batch_validate(file_paths: List[str]) -> List[DocumentValidationReport]:
    """Quick batch validation of multiple files"""
    validator = create_validator()
    return validator.validate_batch(file_paths)
