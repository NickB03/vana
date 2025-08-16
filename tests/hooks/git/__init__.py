"""
Git Hook Integration Testing Framework
=====================================

Comprehensive test suite for Git hook integration with Claude Code and Claude Flow systems.

Modules:
- git_hook_test_suite: Core Git hook functionality testing
- git_performance_benchmarks: Performance benchmarking and timing standards  
- git_integration_test_runner: End-to-end integration testing
- git_test_automation: Automated CI/CD testing scripts

Usage:
    # Run all Git hook tests
    ./run_git_hook_tests.sh full
    
    # Run quick validation
    ./run_git_hook_tests.sh quick
    
    # Run CI/CD optimized tests
    ./run_git_hook_tests.sh ci
    
    # Run specific test suite
    ./run_git_hook_tests.sh [unit|integration|performance|e2e]

Author: Tester Agent (Git Integration Specialist)
"""

from .git_hook_test_suite import GitTestEnvironment, TestGitHookIntegration, TestGitHookCoordination
from .git_performance_benchmarks import GitPerformanceBenchmarker, TestGitPerformanceBenchmarks
from .git_integration_test_runner import GitIntegrationTestRunner, TestGitIntegrationRunner
from .git_test_automation import GitTestAutomation

__all__ = [
    "GitTestEnvironment",
    "TestGitHookIntegration", 
    "TestGitHookCoordination",
    "GitPerformanceBenchmarker",
    "TestGitPerformanceBenchmarks", 
    "GitIntegrationTestRunner",
    "TestGitIntegrationRunner",
    "GitTestAutomation"
]

__version__ = "1.0.0"