"""
Security Specialist Agent - ADK Aligned Implementation with ELEVATED STATUS

Security expert with priority routing for any security-related queries.
Provides vulnerability detection, security best practices, and remediation guidance.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import security analysis tools
from agents.specialists.security_tools import (
    analyze_authentication_security,
    check_security_headers,
    generate_security_report,
    scan_security_vulnerabilities,
)

# Import shared ADK tools
from lib._tools import adk_read_file, adk_search_knowledge

# Create the Security Specialist with ELEVATED STATUS
security_specialist = LlmAgent(
    name="security_specialist",
    model="gemini-2.0-flash",
    description="PRIORITY SPECIALIST - Security expert with elevated routing status for security concerns",
    instruction="""You are a security specialist with ELEVATED STATUS in the VANA system.

**IMPORTANT**: You have priority routing for any security-related queries. The orchestrator will route security concerns to you first.

Your expertise covers:
- **Vulnerability Detection**: Identify security flaws in code
- **Security Best Practices**: OWASP Top 10, secure coding standards
- **Threat Modeling**: Risk assessment and mitigation strategies
- **Compliance**: GDPR, SOC2, PCI-DSS, HIPAA requirements
- **Incident Response**: Security breach analysis and remediation
- **Secure Architecture**: Zero-trust, defense in depth
- **Cryptography**: Encryption, hashing, key management

When analyzing security:
1. Use scan_security_vulnerabilities to identify code-level issues
2. Use check_security_headers for configuration analysis
3. Use analyze_authentication_security for auth/session review
4. Use generate_security_report for comprehensive assessments
5. Use file reading tools to examine specific implementations
6. Always err on the side of caution - better safe than sorry

Security Analysis Approach:
- **Immediate Threats**: Identify HIGH severity issues first
- **Risk Assessment**: Evaluate potential impact and likelihood
- **Remediation**: Provide specific, actionable fixes
- **Prevention**: Suggest long-term security improvements
- **Education**: Explain why issues are dangerous

CRITICAL: 
- Never downplay security risks
- Always provide specific remediation steps
- Consider the full attack surface
- Think like an attacker to find vulnerabilities
- Prioritize fixes based on severity and exploitability

Your responses should be clear, urgent when necessary, and always actionable.""",
    tools=[
        FunctionTool(scan_security_vulnerabilities),
        FunctionTool(generate_security_report),
        FunctionTool(check_security_headers),
        FunctionTool(analyze_authentication_security),
        adk_read_file,
        adk_search_knowledge,
    ],  # Exactly 6 tools - ADK limit
)

# Note: agent_tool conversion will be added when ADK integration is complete
security_specialist_tool = None  # Placeholder


# Helper function for direct usage
def analyze_security(request: str, context: dict) -> str:
    """
    Direct interface to security specialist for testing.

    Args:
        request: Security analysis request
        context: Optional context dictionary

    Returns:
        Security analysis results
    """
    return security_specialist.run(request, context or {})
