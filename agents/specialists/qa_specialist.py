"""
QA Specialist Agent - Google ADK Implementation

This agent provides expert-level quality assurance guidance, testing strategies,
automation frameworks, and quality engineering best practices.

Specializations:
- Test strategy and planning
- Test automation frameworks and tools
- Performance and load testing
- Security testing and vulnerability assessment
- API testing and contract testing
- Quality metrics and continuous improvement
"""

import os
import sys

from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import relevant tools for QA analysis
from lib._tools import adk_list_directory, adk_read_file, adk_search_knowledge, adk_vector_search


def analyze_testing_strategy(context: str) -> str:
    """Analyze testing requirements and provide comprehensive testing strategy."""
    return f"""🧪 Testing Strategy Analysis for: {context}

## Test Pyramid Strategy
- **Unit Tests (70%)**: Fast, isolated tests with 80%+ code coverage
- **Integration Tests (20%)**: API, database, and service integration testing
- **E2E Tests (10%)**: Critical user journey automation with Playwright/Cypress
- **Manual Testing**: Exploratory testing and usability validation

## Test Automation Framework
- **Unit Testing**: Jest/Pytest with mocking and test doubles
- **API Testing**: Postman/Newman or REST Assured for contract testing
- **UI Testing**: Playwright for cross-browser E2E automation
- **Performance Testing**: K6 or JMeter for load and stress testing

## Quality Gates & Metrics
- **Code Coverage**: Minimum 80% with branch coverage analysis
- **Test Execution**: 100% automated test execution in CI/CD
- **Defect Density**: <1 defect per 1000 lines of code
- **Test Automation**: 90%+ of regression tests automated

## Testing Environments
- **Development**: Local testing with Docker containers
- **Staging**: Production-like environment for integration testing
- **Performance**: Dedicated environment for load testing
- **Security**: Isolated environment for penetration testing

## Test Data Management
- **Synthetic Data**: Generated test data for consistent testing
- **Data Masking**: Anonymized production data for realistic testing
- **Test Data Refresh**: Automated test data provisioning
- **Data Cleanup**: Automated cleanup after test execution

## Continuous Testing
- **Shift-Left**: Early testing in development lifecycle
- **Parallel Execution**: Concurrent test execution for faster feedback
- **Risk-Based Testing**: Prioritize testing based on business impact
- **Feedback Loops**: Rapid feedback to development teams

## Quality Assurance Process
- **Test Planning**: Risk assessment and test case prioritization
- **Defect Management**: Structured defect lifecycle with root cause analysis
- **Test Reporting**: Real-time dashboards and quality metrics
- **Continuous Improvement**: Regular retrospectives and process optimization"""


def evaluate_test_automation(context: str) -> str:
    """Evaluate test automation approach and provide optimization recommendations."""
    return f"""🤖 Test Automation Evaluation for: {context}

## Automation Framework Design
- **Page Object Model**: Maintainable UI test automation structure
- **Data-Driven Testing**: Parameterized tests with external data sources
- **Keyword-Driven**: Reusable test components and business logic
- **Hybrid Framework**: Combination approach for maximum flexibility

## Tool Selection & Integration
- **Web Testing**: Playwright for modern web applications
- **Mobile Testing**: Appium for cross-platform mobile automation
- **API Testing**: REST Assured or Postman for service testing
- **Performance**: K6 for modern load testing with JavaScript

## Test Execution Strategy
- **Parallel Execution**: Grid-based execution for faster results
- **Cross-Browser Testing**: Chrome, Firefox, Safari, Edge coverage
- **Cross-Platform**: Windows, macOS, Linux test execution
- **Cloud Testing**: BrowserStack or Sauce Labs for scalability

## Maintenance & Reliability
- **Flaky Test Management**: Identification and resolution of unstable tests
- **Test Refactoring**: Regular maintenance and optimization
- **Version Control**: Git-based test asset management
- **Documentation**: Comprehensive test documentation and guidelines

## Reporting & Analytics
- **Test Results**: Real-time test execution dashboards
- **Trend Analysis**: Historical test performance and quality trends
- **Failure Analysis**: Automated failure categorization and reporting
- **Quality Metrics**: Test coverage, execution time, and success rates

## Security Testing Integration
- **SAST Integration**: Static security testing in CI/CD pipeline
- **DAST Automation**: Dynamic security testing for web applications
- **Dependency Scanning**: Automated vulnerability assessment
- **Penetration Testing**: Regular security assessment and validation"""


# Create the QA Specialist Agent
qa_specialist = LlmAgent(
    name="qa_specialist",
    model="gemini-2.0-flash",
    description="Expert QA engineer specializing in test strategy, automation frameworks, performance testing, and quality engineering practices.",
    instruction="""You are an expert QA Specialist with comprehensive knowledge of:

## Core Expertise Areas
- **Test Strategy**: Test planning, risk assessment, test case design
- **Test Automation**: Selenium, Playwright, Cypress, Appium, REST Assured
- **Performance Testing**: JMeter, K6, LoadRunner, performance optimization
- **Security Testing**: OWASP, penetration testing, vulnerability assessment
- **API Testing**: REST/GraphQL testing, contract testing, service virtualization
- **Quality Engineering**: Continuous testing, DevOps integration, quality metrics
- **Test Management**: Test case management, defect tracking, reporting
- **Mobile Testing**: iOS/Android testing, device compatibility, app store guidelines

## Analysis Approach
1. **Requirements Analysis**: Understand functional and non-functional requirements
2. **Risk Assessment**: Identify high-risk areas requiring focused testing
3. **Test Strategy Design**: Develop comprehensive testing approach and framework
4. **Automation Planning**: Determine optimal automation strategy and tools
5. **Quality Metrics**: Define measurable quality goals and success criteria

## Response Style
- Provide specific, actionable testing recommendations
- Include automation strategy with tool selection rationale
- Suggest appropriate testing frameworks and methodologies
- Offer multiple testing approaches with effort and coverage trade-offs
- Include quality metrics and success criteria
- Consider CI/CD integration and continuous testing practices
- Provide implementation guidance and best practices

Always provide expert-level QA guidance that emphasizes comprehensive test coverage, automation efficiency, and continuous quality improvement.""",
    tools=[
        FunctionTool(func=analyze_testing_strategy),
        FunctionTool(func=evaluate_test_automation),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory,
    ],
)
