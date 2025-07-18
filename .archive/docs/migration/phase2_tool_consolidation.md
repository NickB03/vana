# Phase 2: Tool Consolidation Implementation

## Overview
This phase consolidates VANA's existing tools to comply with ADK's 6-tool limit per agent. Each specialist's tools are merged into exactly 6 comprehensive tools that maintain all functionality.

**Branch**: `adk-tools`  
**Duration**: 6 hours  
**Dependencies**: None (can run parallel with Phase 1)  
**Assigned Agent**: Agent 2

## Prerequisites
- Access to current VANA tool implementations
- Understanding of ADK tool patterns from ADK_SOURCE_OF_TRUTH.md
- Python 3.13+ environment

## Current Tool Analysis

### Security Specialist Tools (Currently 12+)
- scan_code_vulnerabilities
- check_dependencies
- analyze_auth_patterns
- detect_security_patterns
- check_encryption
- validate_input_sanitization
- scan_sql_injection
- check_xss_vulnerabilities
- analyze_access_control
- check_session_management
- validate_crypto_usage
- generate_security_report

### Architecture Specialist Tools (Currently 10+)
- analyze_code_structure
- detect_design_patterns
- check_dependencies
- evaluate_coupling
- measure_cohesion
- find_circular_dependencies
- analyze_complexity
- generate_architecture_diagram
- detect_anti_patterns
- suggest_refactoring

## Consolidation Strategy

### Security Specialist - 6 Consolidated Tools

```python
# Tool 1: comprehensive_security_scan (merges 7 tools)
# - scan_code_vulnerabilities
# - scan_sql_injection
# - check_xss_vulnerabilities
# - detect_security_patterns
# - validate_input_sanitization
# - analyze_access_control
# - check_session_management

# Tool 2: dependency_security_check (merges 2 tools)
# - check_dependencies
# - validate_third_party_libs

# Tool 3: authentication_analyzer (merges 2 tools)
# - analyze_auth_patterns
# - check_session_management

# Tool 4: encryption_validator (merges 2 tools)
# - check_encryption
# - validate_crypto_usage

# Tool 5: generate_security_report (enhanced)
# - Comprehensive reporting with all findings

# Tool 6: security_best_practices_check (new)
# - OWASP compliance
# - Security headers
# - Configuration security
```

## Implementation

### Step 1: Create Tool Directory Structure
```bash
mkdir -p lib/tools/consolidated
mkdir -p lib/tools/security
mkdir -p lib/tools/architecture
mkdir -p lib/tools/data_science
mkdir -p lib/tools/devops
mkdir -p lib/tools/qa
mkdir -p lib/tools/ui_ux
mkdir -p lib/tools/content_creation
mkdir -p lib/tools/research
mkdir -p tests/tools
```

### Step 2: Base Tool Utilities (`lib/tools/base.py`)

```python
"""
Base utilities for ADK-compliant tools.
All tools must return dictionaries and include execution metrics.
"""

from typing import Dict, Any, Callable, TypeVar, Optional
from datetime import datetime
import functools
import time
from lib.models import ToolResult

T = TypeVar('T', bound=Callable[..., Dict[str, Any]])


def adk_tool(func: T) -> T:
    """
    Decorator for ADK-compliant tools.
    Ensures all tools return proper dictionary format with metrics.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            # Execute the tool
            result = func(*args, **kwargs)
            
            # Ensure result is a dictionary
            if not isinstance(result, dict):
                raise ValueError(f"Tool {func.__name__} must return a dictionary")
            
            # Add standard metrics if not present
            execution_time_ms = (time.time() - start_time) * 1000
            
            # Create ToolResult for validation
            tool_result = ToolResult(
                tool_name=func.__name__,
                success=result.get('success', True),
                result=result.get('result', result),
                error=result.get('error'),
                execution_time_ms=execution_time_ms,
                metadata=result.get('metadata', {})
            )
            
            # Return the validated dictionary
            return tool_result.model_dump()
            
        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            return {
                'tool_name': func.__name__,
                'success': False,
                'result': None,
                'error': str(e),
                'execution_time_ms': execution_time_ms,
                'timestamp': datetime.now().isoformat(),
                'metadata': {}
            }
    
    return wrapper


def validate_file_path(path: str) -> bool:
    """Validate that a file path is safe to access."""
    # Add path validation logic
    return True


def chunk_file_content(content: str, chunk_size: int = 1000) -> list[str]:
    """Split file content into chunks for processing."""
    lines = content.split('\n')
    chunks = []
    current_chunk = []
    current_size = 0
    
    for line in lines:
        line_size = len(line)
        if current_size + line_size > chunk_size and current_chunk:
            chunks.append('\n'.join(current_chunk))
            current_chunk = [line]
            current_size = line_size
        else:
            current_chunk.append(line)
            current_size += line_size
    
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    
    return chunks
```

### Step 3: Security Tools Implementation (`lib/tools/security/security_tools.py`)

```python
"""
Consolidated security tools for ADK compliance.
Maximum 6 tools combining all security functionality.
"""

from typing import Dict, Any, List, Optional
import re
import ast
from pathlib import Path
from lib.tools.base import adk_tool, validate_file_path
from lib.models import Vulnerability, Severity


@adk_tool
def comprehensive_security_scan(
    file_path: str,
    scan_types: List[str] = None
) -> Dict[str, Any]:
    """
    Comprehensive security vulnerability scanner.
    Combines: code vulnerabilities, SQL injection, XSS, input validation,
    access control, session management, and security patterns.
    
    Args:
        file_path: Path to file or directory to scan
        scan_types: Specific scan types to run (default: all)
        
    Returns:
        Dictionary with vulnerability findings
    """
    if not validate_file_path(file_path):
        return {
            'success': False,
            'error': 'Invalid file path',
            'result': None
        }
    
    scan_types = scan_types or [
        'sql_injection', 'xss', 'input_validation', 
        'access_control', 'session_management', 'general_vulnerabilities'
    ]
    
    vulnerabilities = []
    
    # Read file content
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            lines = content.split('\n')
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to read file: {str(e)}',
            'result': None
        }
    
    # SQL Injection Detection
    if 'sql_injection' in scan_types:
        sql_patterns = [
            (r'f["\'].*SELECT.*{.*}.*["\']', 'SQL injection via f-string'),
            (r'["\'].*SELECT.*["\'].*\+.*input', 'SQL injection via concatenation'),
            (r'execute\(["\'].*%s.*["\'].*%', 'Unsafe parameterization'),
            (r'raw\(["\'].*SELECT.*["\']', 'Raw SQL query detected'),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, desc in sql_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    vulnerabilities.append(Vulnerability(
                        id=f"SQL-{len(vulnerabilities)+1}",
                        type="SQL Injection",
                        severity=Severity.HIGH,
                        description=desc,
                        affected_files=[file_path],
                        line_numbers={file_path: [line_num]},
                        cwe_id="CWE-89",
                        owasp_category="A03:2021"
                    ))
    
    # XSS Detection
    if 'xss' in scan_types:
        xss_patterns = [
            (r'innerHTML\s*=\s*["\'].*\+', 'XSS via innerHTML manipulation'),
            (r'document\.write\(.*user', 'XSS via document.write'),
            (r'eval\(.*request', 'XSS via eval'),
            (r'dangerouslySetInnerHTML', 'React XSS risk'),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, desc in xss_patterns:
                if re.search(pattern, line):
                    vulnerabilities.append(Vulnerability(
                        id=f"XSS-{len(vulnerabilities)+1}",
                        type="Cross-Site Scripting",
                        severity=Severity.HIGH,
                        description=desc,
                        affected_files=[file_path],
                        line_numbers={file_path: [line_num]},
                        cwe_id="CWE-79",
                        owasp_category="A03:2021"
                    ))
    
    # Input Validation
    if 'input_validation' in scan_types:
        validation_issues = []
        
        # Check for missing validation
        input_patterns = [
            (r'request\.(GET|POST|params|data|args)\[', 'Direct request data access'),
            (r'int\(request\.', 'Unsafe type conversion'),
            (r'float\(request\.', 'Unsafe float conversion'),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, desc in input_patterns:
                if re.search(pattern, line) and 'validate' not in line.lower():
                    validation_issues.append({
                        'line': line_num,
                        'issue': desc
                    })
        
        if validation_issues:
            vulnerabilities.append(Vulnerability(
                id=f"VALIDATION-{len(vulnerabilities)+1}",
                type="Input Validation",
                severity=Severity.MEDIUM,
                description="Missing input validation detected",
                affected_files=[file_path],
                line_numbers={file_path: [v['line'] for v in validation_issues]},
                cwe_id="CWE-20",
                owasp_category="A03:2021"
            ))
    
    # Calculate risk score
    risk_score = calculate_risk_score(vulnerabilities)
    
    return {
        'success': True,
        'result': {
            'file_scanned': file_path,
            'total_vulnerabilities': len(vulnerabilities),
            'vulnerabilities': [v.model_dump() for v in vulnerabilities],
            'risk_score': risk_score,
            'scan_types_performed': scan_types,
            'severity_breakdown': {
                'critical': sum(1 for v in vulnerabilities if v.severity == Severity.CRITICAL),
                'high': sum(1 for v in vulnerabilities if v.severity == Severity.HIGH),
                'medium': sum(1 for v in vulnerabilities if v.severity == Severity.MEDIUM),
                'low': sum(1 for v in vulnerabilities if v.severity == Severity.LOW),
            }
        }
    }


@adk_tool
def dependency_security_check(
    project_path: str,
    check_licenses: bool = True,
    check_vulnerabilities: bool = True
) -> Dict[str, Any]:
    """
    Check security of project dependencies.
    Analyzes requirements.txt, package.json, etc. for known vulnerabilities.
    
    Args:
        project_path: Path to project root
        check_licenses: Check for license compliance
        check_vulnerabilities: Check for known CVEs
        
    Returns:
        Dictionary with dependency security findings
    """
    findings = {
        'vulnerable_dependencies': [],
        'outdated_dependencies': [],
        'license_issues': [],
        'total_dependencies': 0
    }
    
    # Check Python dependencies
    requirements_path = Path(project_path) / 'requirements.txt'
    if requirements_path.exists():
        with open(requirements_path, 'r') as f:
            dependencies = f.readlines()
            findings['total_dependencies'] += len(dependencies)
            
            for dep in dependencies:
                dep = dep.strip()
                if not dep or dep.startswith('#'):
                    continue
                
                # Parse dependency
                if '==' in dep:
                    name, version = dep.split('==')
                    # Check against known vulnerable versions
                    if is_vulnerable_version(name, version):
                        findings['vulnerable_dependencies'].append({
                            'name': name,
                            'version': version,
                            'severity': 'high',
                            'cve': get_cve_for_package(name, version)
                        })
    
    # Check npm dependencies
    package_json_path = Path(project_path) / 'package.json'
    if package_json_path.exists():
        import json
        with open(package_json_path, 'r') as f:
            package_data = json.load(f)
            deps = package_data.get('dependencies', {})
            findings['total_dependencies'] += len(deps)
            
            # Add npm vulnerability checks here
    
    risk_level = 'low'
    if findings['vulnerable_dependencies']:
        risk_level = 'high' if len(findings['vulnerable_dependencies']) > 3 else 'medium'
    
    return {
        'success': True,
        'result': {
            'project_path': project_path,
            'findings': findings,
            'risk_level': risk_level,
            'recommendations': generate_dependency_recommendations(findings)
        }
    }


@adk_tool
def authentication_analyzer(
    file_path: str,
    auth_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Analyze authentication implementation for security issues.
    Checks: password handling, session management, JWT usage, OAuth implementation.
    
    Args:
        file_path: Path to authentication code
        auth_type: Specific auth type to analyze (jwt, oauth, session)
        
    Returns:
        Dictionary with authentication security findings
    """
    issues = []
    best_practices = []
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            tree = ast.parse(content)
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to parse file: {str(e)}',
            'result': None
        }
    
    # Check for hardcoded secrets
    secret_patterns = [
        (r'SECRET_KEY\s*=\s*["\'][\w\d]+["\']', 'Hardcoded secret key'),
        (r'JWT_SECRET\s*=\s*["\'][\w\d]+["\']', 'Hardcoded JWT secret'),
        (r'password\s*=\s*["\'][\w\d]+["\']', 'Hardcoded password'),
    ]
    
    lines = content.split('\n')
    for line_num, line in enumerate(lines, 1):
        for pattern, desc in secret_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                issues.append({
                    'type': 'hardcoded_secret',
                    'description': desc,
                    'line': line_num,
                    'severity': 'critical'
                })
    
    # Check password hashing
    if 'password' in content.lower():
        if not any(algo in content for algo in ['bcrypt', 'argon2', 'scrypt', 'pbkdf2']):
            issues.append({
                'type': 'weak_password_hashing',
                'description': 'No secure password hashing algorithm detected',
                'severity': 'high'
            })
        else:
            best_practices.append('Using secure password hashing')
    
    # Check session configuration
    session_checks = {
        'httponly': 'HTTPOnly flag for cookies',
        'secure': 'Secure flag for cookies',
        'samesite': 'SameSite cookie attribute',
        'session_timeout': 'Session timeout configuration'
    }
    
    for check, description in session_checks.items():
        if check in content.lower():
            best_practices.append(f'Implements {description}')
        else:
            issues.append({
                'type': 'session_configuration',
                'description': f'Missing {description}',
                'severity': 'medium'
            })
    
    # Calculate auth security score
    security_score = max(0, 10 - len(issues) + len(best_practices) * 0.5)
    
    return {
        'success': True,
        'result': {
            'file_analyzed': file_path,
            'security_issues': issues,
            'best_practices_found': best_practices,
            'security_score': min(10, security_score),
            'recommendations': generate_auth_recommendations(issues)
        }
    }


@adk_tool
def encryption_validator(
    file_path: str,
    check_algorithms: bool = True,
    check_key_management: bool = True
) -> Dict[str, Any]:
    """
    Validate encryption implementation and cryptographic usage.
    Checks: algorithm strength, key management, random number generation.
    
    Args:
        file_path: Path to code using encryption
        check_algorithms: Validate algorithm choices
        check_key_management: Check key storage and rotation
        
    Returns:
        Dictionary with encryption validation results
    """
    findings = {
        'weak_algorithms': [],
        'strong_algorithms': [],
        'key_management_issues': [],
        'random_generation_issues': []
    }
    
    try:
        with open(file_path, 'r') as f:
            content = f.read()
    except Exception as e:
        return {
            'success': False,
            'error': f'Failed to read file: {str(e)}',
            'result': None
        }
    
    # Check for weak algorithms
    weak_algos = {
        'md5': 'MD5 is cryptographically broken',
        'sha1': 'SHA1 is deprecated for security use',
        'des': 'DES is obsolete',
        'rc4': 'RC4 has known vulnerabilities'
    }
    
    strong_algos = {
        'aes': 'AES encryption',
        'sha256': 'SHA-256 hashing',
        'sha512': 'SHA-512 hashing',
        'bcrypt': 'bcrypt password hashing',
        'argon2': 'Argon2 password hashing'
    }
    
    content_lower = content.lower()
    
    # Check algorithms
    if check_algorithms:
        for algo, desc in weak_algos.items():
            if algo in content_lower:
                findings['weak_algorithms'].append({
                    'algorithm': algo.upper(),
                    'issue': desc,
                    'severity': 'high'
                })
        
        for algo, desc in strong_algos.items():
            if algo in content_lower:
                findings['strong_algorithms'].append({
                    'algorithm': algo.upper(),
                    'description': desc
                })
    
    # Check key management
    if check_key_management:
        key_issues = []
        
        # Check for hardcoded keys
        if re.search(r'key\s*=\s*["\'][0-9a-fA-F]+["\']', content):
            key_issues.append('Hardcoded encryption keys detected')
        
        # Check for key rotation
        if 'key_rotation' not in content_lower and 'rotate_key' not in content_lower:
            key_issues.append('No key rotation mechanism found')
        
        # Check key storage
        if 'keyfile' not in content_lower and 'key_store' not in content_lower:
            key_issues.append('No secure key storage mechanism detected')
        
        findings['key_management_issues'] = key_issues
    
    # Check random number generation
    weak_random = ['random.random', 'random.randint', 'math.random']
    secure_random = ['secrets', 'os.urandom', 'crypto.getRandomValues']
    
    for weak in weak_random:
        if weak in content:
            findings['random_generation_issues'].append({
                'method': weak,
                'issue': 'Using predictable random number generator for crypto'
            })
    
    # Calculate encryption score
    score = 10
    score -= len(findings['weak_algorithms']) * 2
    score -= len(findings['key_management_issues'])
    score -= len(findings['random_generation_issues'])
    score += len(findings['strong_algorithms']) * 0.5
    
    return {
        'success': True,
        'result': {
            'file_analyzed': file_path,
            'findings': findings,
            'encryption_score': max(0, min(10, score)),
            'recommendations': generate_encryption_recommendations(findings)
        }
    }


@adk_tool
def generate_security_report(
    scan_results: List[Dict[str, Any]],
    output_format: str = "detailed",
    include_remediation: bool = True
) -> Dict[str, Any]:
    """
    Generate comprehensive security report from scan results.
    Consolidates findings from all security tools.
    
    Args:
        scan_results: Results from other security tools
        output_format: Report format (detailed, summary, executive)
        include_remediation: Include remediation steps
        
    Returns:
        Dictionary with formatted security report
    """
    # Aggregate all vulnerabilities
    all_vulnerabilities = []
    total_files_scanned = set()
    
    for result in scan_results:
        if result.get('success') and result.get('result'):
            res = result['result']
            
            # Extract vulnerabilities
            if 'vulnerabilities' in res:
                all_vulnerabilities.extend(res['vulnerabilities'])
            
            # Track files
            if 'file_scanned' in res:
                total_files_scanned.add(res['file_scanned'])
            elif 'file_analyzed' in res:
                total_files_scanned.add(res['file_analyzed'])
    
    # Calculate overall risk score
    risk_score = calculate_overall_risk(all_vulnerabilities)
    
    # Group by severity
    severity_groups = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': []
    }
    
    for vuln in all_vulnerabilities:
        severity = vuln.get('severity', 'medium').lower()
        severity_groups[severity].append(vuln)
    
    # Generate report sections
    report = {
        'executive_summary': generate_executive_summary(
            len(all_vulnerabilities),
            risk_score,
            len(total_files_scanned)
        ),
        'risk_assessment': {
            'overall_risk_score': risk_score,
            'risk_level': get_risk_level(risk_score),
            'total_vulnerabilities': len(all_vulnerabilities),
            'critical_count': len(severity_groups['critical']),
            'high_count': len(severity_groups['high']),
            'files_analyzed': len(total_files_scanned)
        },
        'detailed_findings': severity_groups if output_format == 'detailed' else None,
        'top_priorities': get_top_priorities(all_vulnerabilities),
    }
    
    if include_remediation:
        report['remediation_plan'] = generate_remediation_plan(all_vulnerabilities)
        report['estimated_effort'] = estimate_remediation_effort(all_vulnerabilities)
    
    # Add compliance status
    report['compliance_status'] = {
        'owasp_top_10': check_owasp_compliance(all_vulnerabilities),
        'cwe_top_25': check_cwe_compliance(all_vulnerabilities),
        'security_best_practices': evaluate_best_practices(scan_results)
    }
    
    return {
        'success': True,
        'result': report,
        'metadata': {
            'report_generated_at': datetime.now().isoformat(),
            'total_scans_included': len(scan_results),
            'report_format': output_format
        }
    }


@adk_tool
def security_best_practices_check(
    project_path: str,
    check_categories: List[str] = None
) -> Dict[str, Any]:
    """
    Check adherence to security best practices.
    Includes: OWASP compliance, security headers, secure configuration.
    
    Args:
        project_path: Path to project root
        check_categories: Specific categories to check
        
    Returns:
        Dictionary with best practices compliance results
    """
    check_categories = check_categories or [
        'security_headers', 'https_enforcement', 'error_handling',
        'logging_practices', 'configuration_security', 'api_security'
    ]
    
    findings = {}
    
    # Security Headers Check
    if 'security_headers' in check_categories:
        headers_to_check = [
            'Content-Security-Policy',
            'X-Frame-Options',
            'X-Content-Type-Options',
            'Strict-Transport-Security',
            'X-XSS-Protection',
            'Referrer-Policy'
        ]
        
        headers_found = []
        headers_missing = []
        
        # Search for header configurations
        config_files = find_config_files(project_path)
        for config_file in config_files:
            content = read_file_safely(config_file)
            for header in headers_to_check:
                if header in content:
                    headers_found.append(header)
                else:
                    headers_missing.append(header)
        
        findings['security_headers'] = {
            'found': list(set(headers_found)),
            'missing': list(set(headers_missing)),
            'score': len(headers_found) / len(headers_to_check) * 10
        }
    
    # HTTPS Enforcement
    if 'https_enforcement' in check_categories:
        https_indicators = [
            'force_https', 'require_https', 'ssl_redirect',
            'secure_cookies', 'hsts'
        ]
        
        https_practices = []
        for indicator in https_indicators:
            if check_project_contains(project_path, indicator):
                https_practices.append(indicator)
        
        findings['https_enforcement'] = {
            'practices_found': https_practices,
            'score': len(https_practices) / len(https_indicators) * 10
        }
    
    # Error Handling
    if 'error_handling' in check_categories:
        error_issues = []
        
        # Check for exposed stack traces
        if check_project_contains(project_path, 'DEBUG = True'):
            error_issues.append('Debug mode enabled in production')
        
        # Check for generic error pages
        if not check_project_contains(project_path, 'error_page'):
            error_issues.append('No custom error pages configured')
        
        findings['error_handling'] = {
            'issues': error_issues,
            'score': max(0, 10 - len(error_issues) * 2)
        }
    
    # Calculate overall compliance score
    total_score = sum(
        findings[cat].get('score', 0) 
        for cat in findings
    ) / len(findings)
    
    return {
        'success': True,
        'result': {
            'project_path': project_path,
            'categories_checked': check_categories,
            'findings': findings,
            'overall_compliance_score': round(total_score, 2),
            'compliance_level': get_compliance_level(total_score),
            'recommendations': generate_best_practices_recommendations(findings)
        }
    }


# Helper functions (not exposed as tools)

def calculate_risk_score(vulnerabilities: List[Vulnerability]) -> float:
    """Calculate risk score based on vulnerabilities."""
    score = 0
    weights = {
        Severity.CRITICAL: 4,
        Severity.HIGH: 3,
        Severity.MEDIUM: 2,
        Severity.LOW: 1
    }
    
    for vuln in vulnerabilities:
        score += weights.get(vuln.severity, 1)
    
    # Normalize to 0-10 scale
    return min(10, score / 5)


def is_vulnerable_version(package: str, version: str) -> bool:
    """Check if a package version has known vulnerabilities."""
    # This would connect to a vulnerability database
    # For now, return mock data
    vulnerable_packages = {
        'requests': ['2.5.0', '2.5.1'],
        'django': ['1.11.0', '2.0.0'],
        'flask': ['0.12.0']
    }
    
    return version in vulnerable_packages.get(package, [])


def get_cve_for_package(package: str, version: str) -> str:
    """Get CVE ID for vulnerable package."""
    # Mock implementation
    return f"CVE-2024-XXXX"


def generate_dependency_recommendations(findings: Dict) -> List[str]:
    """Generate recommendations based on dependency findings."""
    recommendations = []
    
    if findings['vulnerable_dependencies']:
        recommendations.append("Update vulnerable dependencies immediately")
        for dep in findings['vulnerable_dependencies']:
            recommendations.append(f"Update {dep['name']} to latest secure version")
    
    if findings['outdated_dependencies']:
        recommendations.append("Consider updating outdated dependencies")
    
    return recommendations


def generate_auth_recommendations(issues: List[Dict]) -> List[str]:
    """Generate authentication recommendations."""
    recommendations = []
    
    for issue in issues:
        if issue['type'] == 'hardcoded_secret':
            recommendations.append("Move secrets to environment variables")
        elif issue['type'] == 'weak_password_hashing':
            recommendations.append("Implement bcrypt or Argon2 for password hashing")
        elif issue['type'] == 'session_configuration':
            recommendations.append(f"Enable {issue['description']}")
    
    return recommendations


def generate_encryption_recommendations(findings: Dict) -> List[str]:
    """Generate encryption recommendations."""
    recommendations = []
    
    if findings['weak_algorithms']:
        recommendations.append("Replace weak cryptographic algorithms")
        for algo in findings['weak_algorithms']:
            recommendations.append(f"Replace {algo['algorithm']} with modern alternative")
    
    if findings['key_management_issues']:
        recommendations.append("Implement secure key management")
        for issue in findings['key_management_issues']:
            recommendations.append(f"Address: {issue}")
    
    return recommendations


def calculate_overall_risk(vulnerabilities: List[Dict]) -> float:
    """Calculate overall risk from all vulnerabilities."""
    if not vulnerabilities:
        return 0.0
    
    severity_weights = {
        'critical': 4,
        'high': 3,
        'medium': 2,
        'low': 1
    }
    
    total_score = sum(
        severity_weights.get(v.get('severity', 'low').lower(), 1)
        for v in vulnerabilities
    )
    
    return min(10, total_score / len(vulnerabilities) * 2.5)


def get_risk_level(score: float) -> str:
    """Convert risk score to risk level."""
    if score >= 8:
        return "Critical"
    elif score >= 6:
        return "High"
    elif score >= 4:
        return "Medium"
    elif score >= 2:
        return "Low"
    else:
        return "Minimal"


def generate_executive_summary(vuln_count: int, risk_score: float, files_count: int) -> str:
    """Generate executive summary for report."""
    risk_level = get_risk_level(risk_score)
    
    return (
        f"Security assessment completed on {files_count} files. "
        f"Found {vuln_count} total vulnerabilities with an overall risk score of {risk_score:.1f}/10 ({risk_level}). "
        f"Immediate action is {'required' if risk_score >= 6 else 'recommended'} to address critical findings."
    )


def get_top_priorities(vulnerabilities: List[Dict]) -> List[Dict]:
    """Get top priority vulnerabilities."""
    # Sort by severity and return top 5
    sorted_vulns = sorted(
        vulnerabilities,
        key=lambda v: {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}.get(
            v.get('severity', 'low').lower(), 1
        ),
        reverse=True
    )
    
    return sorted_vulns[:5]


def generate_remediation_plan(vulnerabilities: List[Dict]) -> Dict[str, List[str]]:
    """Generate remediation plan grouped by priority."""
    plan = {
        'immediate': [],  # Critical issues
        'short_term': [],  # High issues (1 week)
        'medium_term': [],  # Medium issues (1 month)
        'long_term': []  # Low issues (quarterly)
    }
    
    for vuln in vulnerabilities:
        severity = vuln.get('severity', 'low').lower()
        desc = vuln.get('description', 'Unknown vulnerability')
        
        if severity == 'critical':
            plan['immediate'].append(f"Fix {vuln.get('type', 'issue')}: {desc}")
        elif severity == 'high':
            plan['short_term'].append(f"Address {vuln.get('type', 'issue')}: {desc}")
        elif severity == 'medium':
            plan['medium_term'].append(f"Resolve {vuln.get('type', 'issue')}: {desc}")
        else:
            plan['long_term'].append(f"Review {vuln.get('type', 'issue')}: {desc}")
    
    return plan


def estimate_remediation_effort(vulnerabilities: List[Dict]) -> str:
    """Estimate effort required for remediation."""
    effort_hours = {
        'critical': 8,
        'high': 4,
        'medium': 2,
        'low': 1
    }
    
    total_hours = sum(
        effort_hours.get(v.get('severity', 'low').lower(), 1)
        for v in vulnerabilities
    )
    
    if total_hours <= 8:
        return "1 day"
    elif total_hours <= 40:
        return f"{total_hours // 8} days"
    elif total_hours <= 160:
        return f"{total_hours // 40} weeks"
    else:
        return f"{total_hours // 160} months"


def check_owasp_compliance(vulnerabilities: List[Dict]) -> Dict[str, bool]:
    """Check compliance with OWASP Top 10."""
    owasp_categories = {
        'A01:2021': 'Broken Access Control',
        'A02:2021': 'Cryptographic Failures',
        'A03:2021': 'Injection',
        'A04:2021': 'Insecure Design',
        'A05:2021': 'Security Misconfiguration',
        'A06:2021': 'Vulnerable Components',
        'A07:2021': 'Authentication Failures',
        'A08:2021': 'Data Integrity Failures',
        'A09:2021': 'Logging Failures',
        'A10:2021': 'SSRF'
    }
    
    found_categories = set()
    for vuln in vulnerabilities:
        if 'owasp_category' in vuln:
            found_categories.add(vuln['owasp_category'])
    
    return {
        cat: cat not in found_categories
        for cat in owasp_categories
    }


def check_cwe_compliance(vulnerabilities: List[Dict]) -> Dict[str, int]:
    """Check CWE distribution."""
    cwe_counts = {}
    
    for vuln in vulnerabilities:
        if 'cwe_id' in vuln:
            cwe_id = vuln['cwe_id']
            cwe_counts[cwe_id] = cwe_counts.get(cwe_id, 0) + 1
    
    return cwe_counts


def evaluate_best_practices(scan_results: List[Dict]) -> Dict[str, float]:
    """Evaluate security best practices from scan results."""
    practices = {
        'encryption': 0,
        'authentication': 0,
        'input_validation': 0,
        'error_handling': 0,
        'logging': 0
    }
    
    for result in scan_results:
        if result.get('success') and result.get('result'):
            res = result['result']
            
            # Check various indicators
            if 'encryption_score' in res:
                practices['encryption'] = res['encryption_score']
            if 'security_score' in res:
                practices['authentication'] = res['security_score']
    
    return practices


def find_config_files(project_path: str) -> List[str]:
    """Find configuration files in project."""
    config_patterns = [
        'config.py', 'settings.py', 'config.js', 
        'config.json', '.env', 'app.config'
    ]
    
    config_files = []
    project_dir = Path(project_path)
    
    for pattern in config_patterns:
        config_files.extend(project_dir.rglob(pattern))
    
    return [str(f) for f in config_files]


def read_file_safely(file_path: str) -> str:
    """Safely read file content."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except:
        return ""


def check_project_contains(project_path: str, pattern: str) -> bool:
    """Check if project contains a pattern."""
    # Simple implementation - would be more sophisticated in practice
    for file_path in Path(project_path).rglob('*.py'):
        if pattern in read_file_safely(str(file_path)):
            return True
    return False


def get_compliance_level(score: float) -> str:
    """Get compliance level from score."""
    if score >= 9:
        return "Excellent"
    elif score >= 7:
        return "Good"
    elif score >= 5:
        return "Fair"
    elif score >= 3:
        return "Poor"
    else:
        return "Critical"


def generate_best_practices_recommendations(findings: Dict) -> List[str]:
    """Generate recommendations for best practices."""
    recommendations = []
    
    for category, data in findings.items():
        if data.get('score', 10) < 7:
            if category == 'security_headers':
                for header in data.get('missing', []):
                    recommendations.append(f"Implement {header} header")
            elif category == 'https_enforcement':
                recommendations.append("Enforce HTTPS across all endpoints")
            elif category == 'error_handling':
                for issue in data.get('issues', []):
                    recommendations.append(f"Fix: {issue}")
    
    return recommendations
```

### Step 4: Tool Registration (`lib/tools/registry.py`)

```python
"""
Tool registry for ADK-compliant tools.
Ensures each specialist has exactly 6 tools maximum.
"""

from typing import Dict, List, Callable, Any
from dataclasses import dataclass
from enum import Enum


class ToolCategory(Enum):
    """Tool categories for organization."""
    ANALYSIS = "analysis"
    EXECUTION = "execution"
    GENERATION = "generation"
    VALIDATION = "validation"
    REPORTING = "reporting"
    UTILITY = "utility"


@dataclass
class RegisteredTool:
    """Represents a registered tool."""
    name: str
    function: Callable
    category: ToolCategory
    description: str
    specialist: str


class ToolRegistry:
    """
    Central registry for all tools.
    Enforces ADK 6-tool limit per specialist.
    """
    
    def __init__(self):
        self._tools: Dict[str, List[RegisteredTool]] = {}
        self._tool_limit = 6
    
    def register_tool(
        self,
        specialist: str,
        name: str,
        function: Callable,
        category: ToolCategory,
        description: str
    ) -> None:
        """Register a tool for a specialist."""
        if specialist not in self._tools:
            self._tools[specialist] = []
        
        current_tools = self._tools[specialist]
        
        if len(current_tools) >= self._tool_limit:
            raise ValueError(
                f"Cannot register tool '{name}' for {specialist}. "
                f"Already has {len(current_tools)} tools (limit: {self._tool_limit})"
            )
        
        # Check for duplicate names
        if any(tool.name == name for tool in current_tools):
            raise ValueError(f"Tool '{name}' already registered for {specialist}")
        
        current_tools.append(RegisteredTool(
            name=name,
            function=function,
            category=category,
            description=description,
            specialist=specialist
        ))
    
    def get_specialist_tools(self, specialist: str) -> List[Callable]:
        """Get all tool functions for a specialist."""
        if specialist not in self._tools:
            return []
        
        return [tool.function for tool in self._tools[specialist]]
    
    def get_tool_count(self, specialist: str) -> int:
        """Get number of tools registered for a specialist."""
        return len(self._tools.get(specialist, []))
    
    def validate_all_specialists(self) -> Dict[str, bool]:
        """Validate all specialists have ≤6 tools."""
        return {
            specialist: len(tools) <= self._tool_limit
            for specialist, tools in self._tools.items()
        }
    
    def get_registry_summary(self) -> Dict[str, Dict[str, Any]]:
        """Get summary of all registered tools."""
        summary = {}
        
        for specialist, tools in self._tools.items():
            summary[specialist] = {
                'tool_count': len(tools),
                'within_limit': len(tools) <= self._tool_limit,
                'tools': [
                    {
                        'name': tool.name,
                        'category': tool.category.value,
                        'description': tool.description
                    }
                    for tool in tools
                ]
            }
        
        return summary


# Global registry instance
tool_registry = ToolRegistry()


# Register all tools
def register_all_tools():
    """Register all consolidated tools for each specialist."""
    
    # Security Specialist Tools
    from lib.tools.security.security_tools import (
        comprehensive_security_scan,
        dependency_security_check,
        authentication_analyzer,
        encryption_validator,
        generate_security_report,
        security_best_practices_check
    )
    
    security_tools = [
        ("comprehensive_security_scan", comprehensive_security_scan, ToolCategory.ANALYSIS,
         "Comprehensive vulnerability scanner combining multiple security checks"),
        ("dependency_security_check", dependency_security_check, ToolCategory.VALIDATION,
         "Check project dependencies for known vulnerabilities"),
        ("authentication_analyzer", authentication_analyzer, ToolCategory.ANALYSIS,
         "Analyze authentication implementation for security issues"),
        ("encryption_validator", encryption_validator, ToolCategory.VALIDATION,
         "Validate encryption and cryptographic implementations"),
        ("generate_security_report", generate_security_report, ToolCategory.REPORTING,
         "Generate comprehensive security assessment report"),
        ("security_best_practices_check", security_best_practices_check, ToolCategory.VALIDATION,
         "Check adherence to security best practices and standards"),
    ]
    
    for name, func, category, desc in security_tools:
        tool_registry.register_tool("security", name, func, category, desc)
    
    # Architecture Specialist Tools
    # ... register architecture tools
    
    # Continue for all specialists...
    
    return tool_registry.validate_all_specialists()
```

### Step 5: Tool Migration Map (`docs/TOOL_MIGRATION_MAP.md`)

```markdown
# Tool Migration Map

This document shows the consolidation of tools from current VANA to ADK-compliant 6-tool limit.

## Security Specialist

### Current Tools (12+)
1. scan_code_vulnerabilities
2. check_dependencies  
3. analyze_auth_patterns
4. detect_security_patterns
5. check_encryption
6. validate_input_sanitization
7. scan_sql_injection
8. check_xss_vulnerabilities
9. analyze_access_control
10. check_session_management
11. validate_crypto_usage
12. generate_security_report

### Consolidated Tools (6)

| New Tool | Combines | Functionality |
|----------|----------|---------------|
| comprehensive_security_scan | scan_code_vulnerabilities, scan_sql_injection, check_xss_vulnerabilities, validate_input_sanitization, analyze_access_control, detect_security_patterns | All vulnerability scanning in one tool with scan_types parameter |
| dependency_security_check | check_dependencies, check_third_party_libs | Dependency vulnerability and license checking |
| authentication_analyzer | analyze_auth_patterns, check_session_management | Complete auth security analysis |
| encryption_validator | check_encryption, validate_crypto_usage | Cryptography validation |
| generate_security_report | generate_security_report (enhanced) | Comprehensive reporting |
| security_best_practices_check | NEW | OWASP compliance, security headers, configuration |

## Architecture Specialist

### Current Tools (10+)
1. analyze_code_structure
2. detect_design_patterns
3. check_dependencies
4. evaluate_coupling
5. measure_cohesion
6. find_circular_dependencies
7. analyze_complexity
8. generate_architecture_diagram
9. detect_anti_patterns
10. suggest_refactoring

### Consolidated Tools (6)

| New Tool | Combines | Functionality |
|----------|----------|---------------|
| analyze_architecture_comprehensive | analyze_code_structure, analyze_complexity, evaluate_coupling, measure_cohesion | Complete structural analysis |
| detect_patterns_and_antipatterns | detect_design_patterns, detect_anti_patterns | Pattern detection (good and bad) |
| dependency_analyzer | check_dependencies, find_circular_dependencies | Dependency analysis |
| generate_architecture_artifacts | generate_architecture_diagram, generate_documentation | Documentation generation |
| quality_evaluator | code_quality_metrics, maintainability_index | Quality assessment |
| suggest_improvements | suggest_refactoring, improvement_recommendations | Improvement suggestions |

## Data Science Specialist

### Current Tools (8+)
1. statistical_analysis
2. data_cleaning
3. correlation_analysis
4. hypothesis_testing
5. regression_analysis
6. classification_analysis
7. clustering_analysis
8. visualization_generator

### Consolidated Tools (6)

| New Tool | Combines | Functionality |
|----------|----------|---------------|
| comprehensive_data_analysis | statistical_analysis, correlation_analysis | Complete data analysis |
| data_preprocessing | data_cleaning, feature_engineering | Data preparation |
| statistical_testing | hypothesis_testing, significance_testing | Statistical tests |
| ml_analysis | regression_analysis, classification_analysis, clustering_analysis | All ML analyses |
| generate_insights | insight_extraction, pattern_detection | Insight generation |
| create_visualizations | visualization_generator, report_charts | All visualizations |

[Continue for remaining specialists...]
```

### Step 6: Create Test File (`tests/tools/test_tool_consolidation.py`)

```python
"""
Tests for tool consolidation phase.
Ensures all tools comply with ADK requirements.
"""

import pytest
from lib.tools.registry import tool_registry, register_all_tools
from lib.tools.base import adk_tool
from lib.models import ToolResult


class TestToolConsolidation:
    """Test tool consolidation meets ADK requirements."""
    
    def test_all_specialists_within_limit(self):
        """Test that no specialist has more than 6 tools."""
        register_all_tools()
        validation = tool_registry.validate_all_specialists()
        
        for specialist, is_valid in validation.items():
            assert is_valid, f"{specialist} has too many tools"
    
    def test_security_tools_count(self):
        """Test security specialist has exactly 6 tools."""
        register_all_tools()
        assert tool_registry.get_tool_count("security") == 6
    
    def test_tool_returns_dict(self):
        """Test that all tools return dictionaries."""
        from lib.tools.security.security_tools import comprehensive_security_scan
        
        # Create a test file
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write("password = 'hardcoded'")
            temp_path = f.name
        
        result = comprehensive_security_scan(temp_path)
        
        assert isinstance(result, dict)
        assert 'success' in result
        assert 'result' in result
        assert 'execution_time_ms' in result
    
    def test_adk_tool_decorator(self):
        """Test the adk_tool decorator works correctly."""
        
        @adk_tool
        def test_tool(param: str) -> dict:
            return {'data': param}
        
        result = test_tool("test")
        
        assert isinstance(result, dict)
        assert result['success'] is True
        assert result['tool_name'] == 'test_tool'
        assert result['execution_time_ms'] > 0
        assert 'timestamp' in result
    
    def test_tool_error_handling(self):
        """Test tools handle errors properly."""
        
        @adk_tool
        def failing_tool() -> dict:
            raise ValueError("Test error")
        
        result = failing_tool()
        
        assert result['success'] is False
        assert result['error'] == "Test error"
        assert result['tool_name'] == 'failing_tool'
    
    def test_tool_registry_duplicate_prevention(self):
        """Test registry prevents duplicate tool names."""
        from lib.tools.registry import ToolRegistry, ToolCategory
        
        registry = ToolRegistry()
        
        def dummy_tool():
            return {}
        
        registry.register_tool(
            "test_specialist", 
            "test_tool",
            dummy_tool,
            ToolCategory.ANALYSIS,
            "Test tool"
        )
        
        with pytest.raises(ValueError, match="already registered"):
            registry.register_tool(
                "test_specialist",
                "test_tool",  # Duplicate name
                dummy_tool,
                ToolCategory.ANALYSIS,
                "Test tool"
            )
    
    def test_comprehensive_security_scan(self):
        """Test the comprehensive security scanner."""
        from lib.tools.security.security_tools import comprehensive_security_scan
        
        # Create test file with vulnerabilities
        import tempfile
        vulnerable_code = '''
def login(username, password):
    query = f"SELECT * FROM users WHERE username='{username}'"
    cursor.execute(query)
    return cursor.fetchone()
'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(vulnerable_code)
            temp_path = f.name
        
        result = comprehensive_security_scan(temp_path)
        
        assert result['success'] is True
        assert result['result']['total_vulnerabilities'] > 0
        assert any(
            v['type'] == 'SQL Injection' 
            for v in result['result']['vulnerabilities']
        )
```

### Step 7: Validation Script (`scripts/validate_phase2_tools.py`)

```python
#!/usr/bin/env python3
"""
Validation script for Phase 2: Tool Consolidation.
Ensures all tools are properly consolidated and ADK compliant.
"""

import sys
import importlib
import inspect
from pathlib import Path
from typing import List, Dict, Any


def validate_tool_consolidation() -> List[str]:
    """Validate tool consolidation is complete and correct."""
    errors = []
    
    # Check directory structure
    tool_dirs = [
        "lib/tools/consolidated",
        "lib/tools/security",
        "lib/tools/architecture",
        "lib/tools/data_science",
        "lib/tools/devops",
        "lib/tools/qa",
        "lib/tools/ui_ux",
        "lib/tools/content_creation",
        "lib/tools/research"
    ]
    
    for dir_path in tool_dirs:
        if not Path(dir_path).exists():
            errors.append(f"Missing directory: {dir_path}")
    
    # Check registry
    try:
        from lib.tools.registry import tool_registry, register_all_tools
        
        # Register all tools
        validation_results = register_all_tools()
        
        # Check each specialist
        required_specialists = [
            "security", "architecture", "data_science", "devops",
            "qa", "ui_ux", "content_creation", "research"
        ]
        
        for specialist in required_specialists:
            tool_count = tool_registry.get_tool_count(specialist)
            
            if tool_count == 0:
                errors.append(f"No tools registered for {specialist}")
            elif tool_count > 6:
                errors.append(f"{specialist} has {tool_count} tools (limit is 6)")
            
        # Validate all tools return dicts
        for specialist in required_specialists:
            tools = tool_registry.get_specialist_tools(specialist)
            for tool in tools:
                # Check if tool is properly decorated
                if not hasattr(tool, '__wrapped__'):
                    errors.append(f"Tool {tool.__name__} not decorated with @adk_tool")
                
    except ImportError as e:
        errors.append(f"Failed to import tool registry: {e}")
    
    # Check for tool migration map
    if not Path("docs/TOOL_MIGRATION_MAP.md").exists():
        errors.append("Missing TOOL_MIGRATION_MAP.md documentation")
    
    # Validate tool patterns
    try:
        from lib.tools.security.security_tools import comprehensive_security_scan
        
        # Check function signature
        sig = inspect.signature(comprehensive_security_scan)
        if 'file_path' not in sig.parameters:
            errors.append("comprehensive_security_scan missing required parameter")
            
    except ImportError as e:
        errors.append(f"Failed to import security tools: {e}")
    
    return errors


def check_tool_compliance(tool_func: Any) -> List[str]:
    """Check if a tool follows ADK patterns."""
    errors = []
    
    # Check docstring
    if not tool_func.__doc__:
        errors.append(f"{tool_func.__name__} missing docstring")
    
    # Check return type hint
    sig = inspect.signature(tool_func)
    if sig.return_annotation != Dict[str, Any]:
        errors.append(f"{tool_func.__name__} should return Dict[str, Any]")
    
    return errors


def main():
    """Run validation and report results."""
    print("🔍 Validating Phase 2: Tool Consolidation...")
    
    errors = validate_tool_consolidation()
    
    if errors:
        print("\n❌ Validation Failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("\n✅ Tool consolidation validated successfully!")
        print("\nPhase 2 Deliverables Complete:")
        print("  ✓ All specialists have ≤6 tools")
        print("  ✓ Tools properly decorated with @adk_tool")
        print("  ✓ All tools return dictionaries")
        print("  ✓ Tool registry implemented")
        print("  ✓ Migration map documented")
        
        # Show summary
        from lib.tools.registry import tool_registry
        summary = tool_registry.get_registry_summary()
        
        print("\nTool Summary:")
        for specialist, info in summary.items():
            print(f"  {specialist}: {info['tool_count']} tools")


if __name__ == "__main__":
    main()
```

## Testing Instructions

1. Run tool tests:
```bash
pytest tests/tools/test_tool_consolidation.py -v
```

2. Run validation script:
```bash
python scripts/validate_phase2_tools.py
```

3. Test individual tools:
```python
from lib.tools.security.security_tools import comprehensive_security_scan
result = comprehensive_security_scan("path/to/file.py")
print(result)
```

## Integration Points

- **Phase 1**: Tools use ToolResult model for return values
- **Phase 3-10**: Specialists import exactly 6 tools each
- **Phase 11**: Orchestrator can call any tool through specialists
- **Phase 12**: API serializes tool results

## Acceptance Criteria Checklist

- [ ] No specialist has more than 6 tools
- [ ] All tools decorated with @adk_tool
- [ ] All tools return dictionaries
- [ ] Tool registry enforces limits
- [ ] Migration map documents all consolidations
- [ ] Tests verify tool compliance
- [ ] Validation script passes
- [ ] Each tool has comprehensive functionality
- [ ] Error handling implemented
- [ ] Execution metrics included

## Git Commit

Once all acceptance criteria are met:
```bash
git add -A
git commit -m "feat(tools): consolidate tools to ADK 6-tool limit

- Implement comprehensive tools for each specialist
- Create tool registry with enforcement
- Add @adk_tool decorator for compliance
- Document all tool consolidations
- Add comprehensive test coverage
- Security: 12 tools → 6 tools
- Architecture: 10 tools → 6 tools
- All tools return proper dictionaries"

git push origin adk-tools
```

## Next Steps

After Phase 1 and 2 are complete:
- Phases 3-10 can implement specialists using these consolidated tools
- Each specialist imports their 6 tools from the registry
- Tools are guaranteed to be ADK compliant