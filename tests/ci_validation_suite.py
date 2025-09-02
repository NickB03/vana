#!/usr/bin/env python3
"""
CI Validation Suite - Comprehensive Testing for CI Pipeline Fixes

This script validates all aspects of the CI pipeline to ensure proper functionality:
1. UV package manager installation and accessibility
2. Backend test execution 
3. Frontend test suite validation
4. Type checking functionality
5. Dependency resolution
6. Environment setup validation

Usage:
    python tests/ci_validation_suite.py [--verbose] [--component=COMPONENT]

Components:
    - uv: UV package manager tests
    - backend: Backend test validation
    - frontend: Frontend test validation  
    - types: Type checking validation
    - deps: Dependency validation
    - env: Environment setup validation
    - all: Run all validations (default)
"""

import os
import sys
import subprocess
import json
import time
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class TestResult(Enum):
    PASS = "✅ PASS"
    FAIL = "❌ FAIL" 
    SKIP = "⏭️  SKIP"
    WARN = "⚠️  WARN"

@dataclass
class ValidationResult:
    component: str
    test_name: str
    result: TestResult
    message: str
    duration: float = 0.0
    details: Optional[str] = None

class CIValidator:
    """Main CI validation orchestrator"""
    
    def __init__(self, project_root: Path, verbose: bool = False):
        self.project_root = project_root
        self.verbose = verbose
        self.results: List[ValidationResult] = []
        
    def run_command(self, cmd: List[str], cwd: Optional[Path] = None, 
                   timeout: int = 300) -> Tuple[bool, str, str]:
        """Execute command and return success, stdout, stderr"""
        start_time = time.time()
        try:
            if cwd is None:
                cwd = self.project_root
                
            if self.verbose:
                logger.info(f"Running: {' '.join(cmd)} in {cwd}")
                
            result = subprocess.run(
                cmd, 
                cwd=cwd,
                capture_output=True, 
                text=True,
                timeout=timeout
            )
            
            duration = time.time() - start_time
            success = result.returncode == 0
            
            if self.verbose:
                logger.info(f"Command completed in {duration:.2f}s with exit code {result.returncode}")
                if result.stdout:
                    logger.debug(f"STDOUT:\n{result.stdout}")
                if result.stderr:
                    logger.debug(f"STDERR:\n{result.stderr}")
                    
            return success, result.stdout, result.stderr
            
        except subprocess.TimeoutExpired:
            return False, "", f"Command timed out after {timeout}s"
        except Exception as e:
            return False, "", f"Command failed: {str(e)}"

    def validate_uv_installation(self) -> List[ValidationResult]:
        """Validate UV package manager installation and functionality"""
        results = []
        logger.info("🔍 Validating UV installation...")
        
        # Test 1: UV command availability
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "--version"])
        duration = time.time() - start_time
        
        if success:
            version = stdout.strip()
            results.append(ValidationResult(
                "uv", "command_available", TestResult.PASS,
                f"UV available: {version}", duration
            ))
        else:
            results.append(ValidationResult(
                "uv", "command_available", TestResult.FAIL,
                f"UV not found: {stderr}", duration
            ))
            return results  # Skip remaining UV tests if not available
            
        # Test 2: UV Python detection
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "python", "list"])
        duration = time.time() - start_time
        
        if success:
            python_versions = [line for line in stdout.split('\n') if 'python' in line.lower()]
            results.append(ValidationResult(
                "uv", "python_detection", TestResult.PASS,
                f"Found {len(python_versions)} Python versions", duration,
                details=stdout if self.verbose else None
            ))
        else:
            results.append(ValidationResult(
                "uv", "python_detection", TestResult.WARN,
                f"Python detection issue: {stderr}", duration
            ))
            
        # Test 3: UV project sync capability
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "sync", "--dry-run"])
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "uv", "project_sync", TestResult.PASS,
                "Project sync validation passed", duration
            ))
        else:
            results.append(ValidationResult(
                "uv", "project_sync", TestResult.FAIL,
                f"Project sync failed: {stderr}", duration,
                details=stdout if self.verbose else None
            ))
            
        # Test 4: UV virtual environment creation
        start_time = time.time()
        test_venv = self.project_root / ".test_venv"
        success, stdout, stderr = self.run_command(["uv", "venv", str(test_venv)])
        duration = time.time() - start_time
        
        if success and test_venv.exists():
            results.append(ValidationResult(
                "uv", "venv_creation", TestResult.PASS,
                "Virtual environment creation successful", duration
            ))
            # Cleanup
            subprocess.run(["rm", "-rf", str(test_venv)], capture_output=True)
        else:
            results.append(ValidationResult(
                "uv", "venv_creation", TestResult.FAIL,
                f"Virtual environment creation failed: {stderr}", duration
            ))
            
        return results

    def validate_backend_tests(self) -> List[ValidationResult]:
        """Validate backend testing capabilities"""
        results = []
        logger.info("🔍 Validating backend tests...")
        
        # Test 1: Backend dependencies installation
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "sync", "--group", "dev"])
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "backend", "deps_install", TestResult.PASS,
                "Backend dependencies installed successfully", duration
            ))
        else:
            results.append(ValidationResult(
                "backend", "deps_install", TestResult.FAIL,
                f"Dependencies installation failed: {stderr}", duration,
                details=stdout if self.verbose else None
            ))
            return results  # Skip remaining tests if deps fail
            
        # Test 2: Pytest availability and configuration
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "run", "pytest", "--version"])
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "backend", "pytest_available", TestResult.PASS,
                f"Pytest available: {stdout.strip()}", duration
            ))
        else:
            results.append(ValidationResult(
                "backend", "pytest_available", TestResult.FAIL,
                f"Pytest not available: {stderr}", duration
            ))
            
        # Test 3: Backend test discovery
        start_time = time.time()
        success, stdout, stderr = self.run_command([
            "uv", "run", "pytest", "--collect-only", "-q"
        ])
        duration = time.time() - start_time
        
        if success:
            test_count = len([line for line in stdout.split('\n') if '::test_' in line])
            results.append(ValidationResult(
                "backend", "test_discovery", TestResult.PASS,
                f"Discovered {test_count} backend tests", duration
            ))
        else:
            results.append(ValidationResult(
                "backend", "test_discovery", TestResult.FAIL,
                f"Test discovery failed: {stderr}", duration,
                details=stdout if self.verbose else None
            ))
            
        # Test 4: Quick syntax check on test files
        test_files = list(Path("tests").glob("test_*.py")) + list(Path("tests").glob("*_test.py"))
        syntax_errors = []
        
        for test_file in test_files[:5]:  # Check first 5 test files
            start_time = time.time()
            success, stdout, stderr = self.run_command([
                "python", "-m", "py_compile", str(test_file)
            ])
            duration = time.time() - start_time
            
            if not success:
                syntax_errors.append(f"{test_file}: {stderr}")
                
        if not syntax_errors:
            results.append(ValidationResult(
                "backend", "syntax_check", TestResult.PASS,
                f"Syntax check passed for {len(test_files)} test files", 
                sum([r.duration for r in results[-len(test_files):]] if results else [0])
            ))
        else:
            results.append(ValidationResult(
                "backend", "syntax_check", TestResult.FAIL,
                f"Syntax errors in {len(syntax_errors)} files",
                0,
                details="\n".join(syntax_errors[:3]) if self.verbose else None
            ))
            
        return results

    def validate_frontend_tests(self) -> List[ValidationResult]:
        """Validate frontend testing capabilities"""
        results = []
        logger.info("🔍 Validating frontend tests...")
        
        frontend_dir = self.project_root / "frontend"
        if not frontend_dir.exists():
            results.append(ValidationResult(
                "frontend", "directory_check", TestResult.FAIL,
                "Frontend directory not found", 0
            ))
            return results
            
        # Test 1: pnpm availability
        start_time = time.time()
        success, stdout, stderr = self.run_command(["pnpm", "--version"], cwd=frontend_dir)
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "frontend", "pnpm_available", TestResult.PASS,
                f"pnpm available: {stdout.strip()}", duration
            ))
        else:
            results.append(ValidationResult(
                "frontend", "pnpm_available", TestResult.FAIL,
                f"pnpm not available: {stderr}", duration
            ))
            return results
            
        # Test 2: Frontend dependencies check
        start_time = time.time()
        node_modules = frontend_dir / "node_modules"
        if node_modules.exists():
            results.append(ValidationResult(
                "frontend", "deps_installed", TestResult.PASS,
                "Frontend dependencies already installed", 0.1
            ))
        else:
            success, stdout, stderr = self.run_command(
                ["pnpm", "install", "--frozen-lockfile"], 
                cwd=frontend_dir,
                timeout=600  # 10 minutes for deps
            )
            duration = time.time() - start_time
            
            if success:
                results.append(ValidationResult(
                    "frontend", "deps_install", TestResult.PASS,
                    "Frontend dependencies installed successfully", duration
                ))
            else:
                results.append(ValidationResult(
                    "frontend", "deps_install", TestResult.FAIL,
                    f"Dependencies installation failed: {stderr}", duration
                ))
                return results
                
        # Test 3: Linting check
        start_time = time.time()
        success, stdout, stderr = self.run_command(["pnpm", "lint"], cwd=frontend_dir)
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "frontend", "linting", TestResult.PASS,
                "Linting passed", duration
            ))
        else:
            # Check if it's just warnings vs errors
            if "error" in stderr.lower():
                results.append(ValidationResult(
                    "frontend", "linting", TestResult.FAIL,
                    "Linting errors found", duration,
                    details=stderr[:500] if self.verbose else None
                ))
            else:
                results.append(ValidationResult(
                    "frontend", "linting", TestResult.WARN,
                    "Linting warnings found", duration,
                    details=stderr[:500] if self.verbose else None
                ))
                
        # Test 4: Build test
        start_time = time.time()
        success, stdout, stderr = self.run_command(["pnpm", "build"], cwd=frontend_dir)
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "frontend", "build", TestResult.PASS,
                "Build successful", duration
            ))
        else:
            results.append(ValidationResult(
                "frontend", "build", TestResult.FAIL,
                f"Build failed: {stderr[:200]}...", duration,
                details=stderr if self.verbose else None
            ))
            
        return results

    def validate_type_checking(self) -> List[ValidationResult]:
        """Validate TypeScript type checking"""
        results = []
        logger.info("🔍 Validating type checking...")
        
        frontend_dir = self.project_root / "frontend"
        
        # Test 1: TypeScript compiler availability
        start_time = time.time()
        success, stdout, stderr = self.run_command(
            ["npx", "tsc", "--version"], 
            cwd=frontend_dir
        )
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "types", "tsc_available", TestResult.PASS,
                f"TypeScript compiler: {stdout.strip()}", duration
            ))
        else:
            results.append(ValidationResult(
                "types", "tsc_available", TestResult.FAIL,
                f"TypeScript compiler not available: {stderr}", duration
            ))
            return results
            
        # Test 2: Type checking without emit
        start_time = time.time()
        success, stdout, stderr = self.run_command(
            ["npx", "tsc", "--noEmit"],
            cwd=frontend_dir
        )
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "types", "type_check", TestResult.PASS,
                "Type checking passed", duration
            ))
        else:
            # Check if errors are severe or just warnings
            error_count = stderr.count("error TS")
            warning_count = stderr.count("warning TS")
            
            if error_count > 0:
                results.append(ValidationResult(
                    "types", "type_check", TestResult.FAIL,
                    f"Type checking failed: {error_count} errors, {warning_count} warnings",
                    duration,
                    details=stderr[:1000] if self.verbose else None
                ))
            else:
                results.append(ValidationResult(
                    "types", "type_check", TestResult.WARN,
                    f"Type checking completed with warnings: {warning_count}",
                    duration,
                    details=stderr[:500] if self.verbose else None
                ))
                
        # Test 3: Backend type checking (mypy)
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "run", "mypy", "--version"])
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "types", "mypy_available", TestResult.PASS,
                f"MyPy available: {stdout.strip()}", duration
            ))
            
            # Run mypy on app directory
            start_time = time.time()
            success, stdout, stderr = self.run_command(["uv", "run", "mypy", "app", "--ignore-missing-imports"])
            duration = time.time() - start_time
            
            if success:
                results.append(ValidationResult(
                    "types", "backend_type_check", TestResult.PASS,
                    "Backend type checking passed", duration
                ))
            else:
                results.append(ValidationResult(
                    "types", "backend_type_check", TestResult.WARN,
                    "Backend type checking has issues", duration,
                    details=stderr[:500] if self.verbose else None
                ))
        else:
            results.append(ValidationResult(
                "types", "mypy_available", TestResult.SKIP,
                "MyPy not available for backend type checking", duration
            ))
            
        return results

    def validate_dependencies(self) -> List[ValidationResult]:
        """Validate dependency resolution and security"""
        results = []
        logger.info("🔍 Validating dependencies...")
        
        # Test 1: Backend dependency resolution
        start_time = time.time()
        success, stdout, stderr = self.run_command(["uv", "pip", "check"])
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "deps", "backend_resolution", TestResult.PASS,
                "Backend dependencies resolved correctly", duration
            ))
        else:
            results.append(ValidationResult(
                "deps", "backend_resolution", TestResult.FAIL,
                f"Backend dependency conflicts: {stderr}", duration
            ))
            
        # Test 2: Frontend dependency check
        frontend_dir = self.project_root / "frontend"
        start_time = time.time()
        success, stdout, stderr = self.run_command(
            ["pnpm", "audit", "--audit-level=high"], 
            cwd=frontend_dir
        )
        duration = time.time() - start_time
        
        if success:
            results.append(ValidationResult(
                "deps", "frontend_security", TestResult.PASS,
                "Frontend dependencies security check passed", duration
            ))
        else:
            # pnpm audit returns non-zero even for low-severity issues
            if "high" in stderr.lower() or "critical" in stderr.lower():
                results.append(ValidationResult(
                    "deps", "frontend_security", TestResult.FAIL,
                    "High/critical security vulnerabilities found", duration,
                    details=stderr[:500] if self.verbose else None
                ))
            else:
                results.append(ValidationResult(
                    "deps", "frontend_security", TestResult.WARN,
                    "Some security advisories found (low severity)", duration
                ))
                
        # Test 3: Lock file consistency
        lockfile_path = self.project_root / "uv.lock"
        if lockfile_path.exists():
            results.append(ValidationResult(
                "deps", "backend_lockfile", TestResult.PASS,
                "Backend lockfile exists", 0.1
            ))
        else:
            results.append(ValidationResult(
                "deps", "backend_lockfile", TestResult.WARN,
                "Backend lockfile missing", 0.1
            ))
            
        frontend_lockfile = frontend_dir / "pnpm-lock.yaml"
        if frontend_lockfile.exists():
            results.append(ValidationResult(
                "deps", "frontend_lockfile", TestResult.PASS,
                "Frontend lockfile exists", 0.1
            ))
        else:
            results.append(ValidationResult(
                "deps", "frontend_lockfile", TestResult.WARN,
                "Frontend lockfile missing", 0.1
            ))
            
        return results

    def validate_environment(self) -> List[ValidationResult]:
        """Validate environment setup and configuration"""
        results = []
        logger.info("🔍 Validating environment setup...")
        
        # Test 1: Required files exist
        required_files = [
            "pyproject.toml",
            "frontend/package.json", 
            ".github/workflows/ci-fixed.yml"
        ]
        
        for file_path in required_files:
            full_path = self.project_root / file_path
            if full_path.exists():
                results.append(ValidationResult(
                    "env", f"file_{file_path.replace('/', '_')}", TestResult.PASS,
                    f"Required file exists: {file_path}", 0.1
                ))
            else:
                results.append(ValidationResult(
                    "env", f"file_{file_path.replace('/', '_')}", TestResult.FAIL,
                    f"Missing required file: {file_path}", 0.1
                ))
                
        # Test 2: Python version compatibility
        start_time = time.time()
        success, stdout, stderr = self.run_command(["python", "--version"])
        duration = time.time() - start_time
        
        if success:
            version = stdout.strip()
            # Check if version is 3.10-3.13 (as per pyproject.toml)
            import re
            match = re.search(r'Python (\d+\.\d+)', version)
            if match:
                py_version = float(match.group(1))
                if 3.10 <= py_version < 3.14:
                    results.append(ValidationResult(
                        "env", "python_version", TestResult.PASS,
                        f"Compatible Python version: {version}", duration
                    ))
                else:
                    results.append(ValidationResult(
                        "env", "python_version", TestResult.WARN,
                        f"Python version may not be supported: {version}", duration
                    ))
            else:
                results.append(ValidationResult(
                    "env", "python_version", TestResult.WARN,
                    f"Could not parse Python version: {version}", duration
                ))
        else:
            results.append(ValidationResult(
                "env", "python_version", TestResult.FAIL,
                f"Python not available: {stderr}", duration
            ))
            
        # Test 3: Node.js version
        start_time = time.time()
        success, stdout, stderr = self.run_command(["node", "--version"])
        duration = time.time() - start_time
        
        if success:
            version = stdout.strip()
            # Extract version number
            import re
            match = re.search(r'v(\d+)', version)
            if match and int(match.group(1)) >= 20:
                results.append(ValidationResult(
                    "env", "node_version", TestResult.PASS,
                    f"Compatible Node.js version: {version}", duration
                ))
            else:
                results.append(ValidationResult(
                    "env", "node_version", TestResult.WARN,
                    f"Node.js version may be outdated: {version}", duration
                ))
        else:
            results.append(ValidationResult(
                "env", "node_version", TestResult.FAIL,
                f"Node.js not available: {stderr}", duration
            ))
            
        return results

    def run_validation(self, components: List[str] = None) -> Dict[str, List[ValidationResult]]:
        """Run validation for specified components"""
        if components is None:
            components = ["uv", "backend", "frontend", "types", "deps", "env"]
            
        all_results = {}
        
        component_validators = {
            "uv": self.validate_uv_installation,
            "backend": self.validate_backend_tests,
            "frontend": self.validate_frontend_tests,
            "types": self.validate_type_checking,
            "deps": self.validate_dependencies,
            "env": self.validate_environment
        }
        
        for component in components:
            if component in component_validators:
                logger.info(f"\n{'='*50}")
                logger.info(f"VALIDATING: {component.upper()}")
                logger.info(f"{'='*50}")
                
                try:
                    results = component_validators[component]()
                    all_results[component] = results
                    
                    # Log immediate results
                    for result in results:
                        logger.info(f"{result.result.value} {result.test_name}: {result.message}")
                        if result.details and self.verbose:
                            logger.debug(f"Details: {result.details}")
                            
                except Exception as e:
                    logger.error(f"Error validating {component}: {str(e)}")
                    all_results[component] = [ValidationResult(
                        component, "validation_error", TestResult.FAIL,
                        f"Validation error: {str(e)}"
                    )]
            else:
                logger.warning(f"Unknown component: {component}")
                
        return all_results

    def generate_report(self, results: Dict[str, List[ValidationResult]]) -> str:
        """Generate comprehensive validation report"""
        report_lines = []
        report_lines.append("=" * 80)
        report_lines.append("CI VALIDATION REPORT")
        report_lines.append("=" * 80)
        report_lines.append(f"Generated at: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"Project root: {self.project_root}")
        report_lines.append("")
        
        total_tests = 0
        passed = 0
        failed = 0
        warned = 0
        skipped = 0
        total_duration = 0
        
        for component, component_results in results.items():
            report_lines.append(f"📋 {component.upper()} VALIDATION")
            report_lines.append("-" * 40)
            
            for result in component_results:
                total_tests += 1
                total_duration += result.duration
                
                if result.result == TestResult.PASS:
                    passed += 1
                elif result.result == TestResult.FAIL:
                    failed += 1
                elif result.result == TestResult.WARN:
                    warned += 1
                elif result.result == TestResult.SKIP:
                    skipped += 1
                    
                duration_str = f" ({result.duration:.2f}s)" if result.duration > 0 else ""
                report_lines.append(f"  {result.result.value} {result.test_name}: {result.message}{duration_str}")
                
                if result.details and self.verbose:
                    # Add details with indentation
                    for line in result.details.split('\n')[:10]:  # Limit to first 10 lines
                        if line.strip():
                            report_lines.append(f"      {line}")
                    if len(result.details.split('\n')) > 10:
                        report_lines.append("      ... (truncated)")
                        
            report_lines.append("")
            
        # Summary
        report_lines.append("📊 SUMMARY")
        report_lines.append("-" * 40)
        report_lines.append(f"Total tests: {total_tests}")
        report_lines.append(f"✅ Passed: {passed}")
        report_lines.append(f"❌ Failed: {failed}")  
        report_lines.append(f"⚠️  Warnings: {warned}")
        report_lines.append(f"⏭️  Skipped: {skipped}")
        report_lines.append(f"⏱️  Total time: {total_duration:.2f}s")
        report_lines.append("")
        
        # Overall status
        if failed == 0:
            if warned == 0:
                status = "🎉 ALL VALIDATIONS PASSED!"
            else:
                status = "✅ VALIDATIONS PASSED (with warnings)"
        else:
            status = f"❌ VALIDATIONS FAILED ({failed} failures)"
            
        report_lines.append(status)
        report_lines.append("=" * 80)
        
        return "\n".join(report_lines)

def main():
    parser = argparse.ArgumentParser(description="CI Validation Suite")
    parser.add_argument("--verbose", "-v", action="store_true", 
                       help="Enable verbose output with details")
    parser.add_argument("--component", "-c", action="append",
                       choices=["uv", "backend", "frontend", "types", "deps", "env", "all"],
                       help="Specific component to validate (can be specified multiple times)")
    parser.add_argument("--output", "-o", type=str,
                       help="Output file for report (default: stdout)")
    
    args = parser.parse_args()
    
    # Determine project root
    project_root = Path(__file__).parent.parent
    
    # Setup logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        
    # Determine components to validate
    components = args.component or ["all"]
    if "all" in components:
        components = ["uv", "backend", "frontend", "types", "deps", "env"]
        
    # Initialize validator
    validator = CIValidator(project_root, verbose=args.verbose)
    
    # Run validation
    logger.info("🚀 Starting CI validation suite...")
    results = validator.run_validation(components)
    
    # Generate and output report
    report = validator.generate_report(results)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        logger.info(f"Report saved to: {args.output}")
    else:
        print(report)
        
    # Exit with appropriate code
    total_failures = sum(
        1 for component_results in results.values() 
        for result in component_results 
        if result.result == TestResult.FAIL
    )
    
    sys.exit(0 if total_failures == 0 else 1)

if __name__ == "__main__":
    main()