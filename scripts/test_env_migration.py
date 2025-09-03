#!/usr/bin/env python3
"""Test script for environment variable migration.

This script thoroughly tests the migration from ENVIRONMENT/ENV to NODE_ENV,
ensuring backwards compatibility and proper conflict detection.

Usage:
    python scripts/test_env_migration.py
    
    # Run with verbose output
    python scripts/test_env_migration.py --verbose
    
    # Test specific scenario
    python scripts/test_env_migration.py --test="node_env_only"
"""

import os
import sys
import argparse
import subprocess
from typing import Dict, Any, List, Tuple, Optional
from pathlib import Path

# Add the project root to Python path so we can import our modules
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from app.utils.migration_helper import EnvironmentMigrationHelper, MigrationPhase
    from app.configuration.environment import get_environment_manager, reset_environment_manager
except ImportError as e:
    print(f"❌ Error importing modules: {e}")
    print("Make sure you're running from the project root and dependencies are installed")
    sys.exit(1)


class EnvironmentTester:
    """Test environment variable migration scenarios."""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.original_env = self._save_current_env()
        self.passed = 0
        self.total = 0
        
    def _save_current_env(self) -> Dict[str, Optional[str]]:
        """Save current environment variables to restore later."""
        return {
            "NODE_ENV": os.environ.get("NODE_ENV"),
            "ENVIRONMENT": os.environ.get("ENVIRONMENT"),
            "ENV": os.environ.get("ENV")
        }
    
    def _restore_env(self):
        """Restore original environment variables."""
        for key, value in self.original_env.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value
    
    def _clear_env_vars(self):
        """Clear all environment variables for testing."""
        for key in ["NODE_ENV", "ENVIRONMENT", "ENV"]:
            os.environ.pop(key, None)
    
    def _set_env_vars(self, env_vars: Dict[str, str]):
        """Set environment variables for testing."""
        self._clear_env_vars()
        for key, value in env_vars.items():
            os.environ[key] = value
    
    def test_scenario(self, 
                     name: str,
                     env_vars: Dict[str, str], 
                     expected_env: str,
                     expected_source: str,
                     expected_phase: MigrationPhase,
                     should_have_conflicts: bool = False) -> bool:
        """Test a specific environment variable scenario."""
        self.total += 1
        
        try:
            # Set up test environment
            self._set_env_vars(env_vars)
            
            # Reset environment manager to pick up new environment variables
            reset_environment_manager()
            
            # Test migration helper
            status = EnvironmentMigrationHelper.get_migration_status()
            
            # Test environment manager
            env_manager = get_environment_manager()
            current_config = env_manager.get_config()
            
            # Validate results
            issues = []
            
            if status.current_env != expected_env:
                issues.append(f"Wrong environment: got {status.current_env}, expected {expected_env}")
            
            if status.source != expected_source:
                issues.append(f"Wrong source: got {status.source}, expected {expected_source}")
            
            if status.phase != expected_phase:
                issues.append(f"Wrong phase: got {status.phase}, expected {expected_phase}")
            
            if should_have_conflicts and not status.conflicts:
                issues.append("Expected conflicts but none found")
            
            if not should_have_conflicts and status.conflicts:
                issues.append(f"Unexpected conflicts: {status.conflicts}")
            
            if current_config.environment.value != expected_env:
                issues.append(f"Environment manager mismatch: got {current_config.environment.value}, expected {expected_env}")
            
            # Check validation
            validation_passed = EnvironmentMigrationHelper.validate_migration()
            if should_have_conflicts and validation_passed:
                issues.append("Validation should have failed due to conflicts")
            
            if not should_have_conflicts and not validation_passed:
                issues.append("Validation should have passed")
            
            # Report results
            if not issues:
                self.passed += 1
                if self.verbose:
                    print(f"✅ PASS: {name}")
                    print(f"   Env: {env_vars} → {status.current_env} ({status.source}) [{status.phase.value}]")
                    if status.recommendations:
                        print(f"   Recommendations: {len(status.recommendations)} items")
                else:
                    print(f"✅ PASS: {name}")
                return True
            else:
                print(f"❌ FAIL: {name}")
                for issue in issues:
                    print(f"   - {issue}")
                if self.verbose:
                    print(f"   Env vars: {env_vars}")
                    print(f"   Status: {status.to_dict()}")
                return False
                
        except Exception as e:
            print(f"❌ ERROR: {name} - Exception: {e}")
            if self.verbose:
                import traceback
                traceback.print_exc()
            return False
        finally:
            self._clear_env_vars()
    
    def run_all_tests(self) -> bool:
        """Run comprehensive test suite."""
        print("🧪 Running environment variable migration tests...\n")
        
        # Test scenarios: (name, env_vars, expected_env, expected_source, expected_phase, has_conflicts)
        test_cases = [
            # Basic scenarios
            ("no_env_vars", {}, "development", "default", MigrationPhase.NOT_STARTED, False),
            ("node_env_only", {"NODE_ENV": "production"}, "production", "NODE_ENV", MigrationPhase.COMPLETED, False),
            ("environment_only", {"ENVIRONMENT": "staging"}, "staging", "ENVIRONMENT", MigrationPhase.NOT_STARTED, False),
            ("env_only", {"ENV": "testing"}, "testing", "ENV", MigrationPhase.NOT_STARTED, False),
            
            # Priority testing (NODE_ENV should win)
            ("node_env_priority", {"NODE_ENV": "production", "ENVIRONMENT": "production"}, "production", "NODE_ENV", MigrationPhase.IN_PROGRESS, False),
            ("node_env_over_env", {"NODE_ENV": "production", "ENV": "testing"}, "production", "NODE_ENV", MigrationPhase.CONFLICTED, True),
            ("environment_over_env", {"ENVIRONMENT": "staging", "ENV": "testing"}, "staging", "ENVIRONMENT", MigrationPhase.CONFLICTED, True),
            
            # Conflict scenarios
            ("conflict_node_env_environment", {"NODE_ENV": "production", "ENVIRONMENT": "staging"}, "production", "NODE_ENV", MigrationPhase.CONFLICTED, True),
            ("conflict_node_env_env", {"NODE_ENV": "production", "ENV": "testing"}, "production", "NODE_ENV", MigrationPhase.CONFLICTED, True),
            ("conflict_environment_env", {"ENVIRONMENT": "staging", "ENV": "testing"}, "staging", "ENVIRONMENT", MigrationPhase.CONFLICTED, True),
            
            # All variables set scenarios  
            ("all_same", {"NODE_ENV": "production", "ENVIRONMENT": "production", "ENV": "production"}, "production", "NODE_ENV", MigrationPhase.IN_PROGRESS, False),
            ("all_different", {"NODE_ENV": "production", "ENVIRONMENT": "staging", "ENV": "testing"}, "production", "NODE_ENV", MigrationPhase.CONFLICTED, True),
            
            # Case sensitivity
            ("case_insensitive", {"NODE_ENV": "Production"}, "production", "NODE_ENV", MigrationPhase.COMPLETED, False),
            ("mixed_case", {"NODE_ENV": "DEVELOPMENT", "ENVIRONMENT": "development"}, "development", "NODE_ENV", MigrationPhase.IN_PROGRESS, False),
            
            # Edge cases
            ("local_environment", {"NODE_ENV": "local"}, "local", "NODE_ENV", MigrationPhase.COMPLETED, False),
            ("unusual_environment", {"NODE_ENV": "custom-env"}, "custom-env", "NODE_ENV", MigrationPhase.COMPLETED, False),
        ]
        
        # Run all test cases
        for name, env_vars, expected_env, expected_source, expected_phase, has_conflicts in test_cases:
            self.test_scenario(name, env_vars, expected_env, expected_source, expected_phase, has_conflicts)
        
        # Test migration utility functions
        self._test_utility_functions()
        
        return self.passed == self.total
    
    def _test_utility_functions(self):
        """Test utility functions in migration helper."""
        print("\n🔧 Testing utility functions...")
        
        # Test normalized environment function
        self._set_env_vars({"ENVIRONMENT": "staging"})
        normalized = EnvironmentMigrationHelper.get_normalized_environment()
        if normalized == "staging":
            print("✅ PASS: get_normalized_environment with legacy variable")
            self.passed += 1
        else:
            print(f"❌ FAIL: get_normalized_environment returned {normalized}, expected staging")
        self.total += 1
        
        # Test migration completion check
        self._set_env_vars({"NODE_ENV": "production"})
        if EnvironmentMigrationHelper.get_migration_status().migration_complete:
            print("✅ PASS: migration_complete detection")
            self.passed += 1
        else:
            print("❌ FAIL: migration_complete should be True with NODE_ENV only")
        self.total += 1
        
        # Test validation with conflicts
        self._set_env_vars({"NODE_ENV": "production", "ENVIRONMENT": "staging"})
        if not EnvironmentMigrationHelper.validate_migration():
            print("✅ PASS: validation fails with conflicts")
            self.passed += 1
        else:
            print("❌ FAIL: validation should fail with conflicts")
        self.total += 1
        
        # Test migration report
        try:
            report = EnvironmentMigrationHelper.create_migration_report()
            if isinstance(report, dict) and "migration_status" in report:
                print("✅ PASS: migration report generation")
                self.passed += 1
            else:
                print("❌ FAIL: migration report format invalid")
        except Exception as e:
            print(f"❌ FAIL: migration report threw exception: {e}")
        self.total += 1
        
        self._clear_env_vars()
    
    def run_integration_test(self) -> bool:
        """Test integration with actual environment configuration."""
        print("\n🔗 Running integration tests...")
        
        test_passed = True
        
        # Test that environment manager uses our migration logic
        try:
            self._set_env_vars({"NODE_ENV": "testing"})
            
            # Create fresh environment manager
            from app.configuration.environment import EnvironmentManager
            manager = EnvironmentManager()
            config = manager.get_config()
            
            if config.environment.value == "testing":
                print("✅ PASS: Environment manager integration")
                self.passed += 1
            else:
                print(f"❌ FAIL: Environment manager returned {config.environment.value}, expected testing")
                test_passed = False
            self.total += 1
            
        except Exception as e:
            print(f"❌ ERROR: Integration test failed: {e}")
            test_passed = False
            self.total += 1
        finally:
            self._clear_env_vars()
        
        return test_passed
    
    def run_performance_test(self) -> bool:
        """Test performance of migration detection."""
        print("\n⚡ Running performance tests...")
        
        import time
        
        # Test performance of status detection
        self._set_env_vars({"NODE_ENV": "production", "ENVIRONMENT": "production"})
        
        start_time = time.time()
        for _ in range(1000):
            EnvironmentMigrationHelper.get_migration_status()
        end_time = time.time()
        
        duration = end_time - start_time
        avg_time = duration / 1000 * 1000  # Convert to milliseconds
        
        if avg_time < 1.0:  # Less than 1ms average
            print(f"✅ PASS: Performance test (avg: {avg_time:.3f}ms per call)")
            self.passed += 1
            self.total += 1
            return True
        else:
            print(f"❌ FAIL: Performance test too slow (avg: {avg_time:.3f}ms per call)")
            self.total += 1
            return False
    
    def print_summary(self):
        """Print test summary."""
        print(f"\n📊 Test Results: {self.passed}/{self.total} tests passed")
        
        success_rate = (self.passed / self.total * 100) if self.total > 0 else 0
        
        if self.passed == self.total:
            print("🎉 All tests passed! Migration is ready.")
            print("✅ Environment variable migration implementation is working correctly")
        else:
            print(f"⚠️  {self.total - self.passed} tests failed ({success_rate:.1f}% success rate)")
            print("❌ Fix issues before proceeding with migration")
        
        # Restore original environment
        self._restore_env()
    
    def cleanup(self):
        """Cleanup after tests."""
        self._restore_env()


def main():
    """Main test runner."""
    parser = argparse.ArgumentParser(description="Test environment variable migration")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--test", "-t", help="Run specific test scenario")
    parser.add_argument("--integration", "-i", action="store_true", help="Run integration tests only")
    parser.add_argument("--performance", "-p", action="store_true", help="Run performance tests only")
    
    args = parser.parse_args()
    
    tester = EnvironmentTester(verbose=args.verbose)
    
    try:
        success = True
        
        if args.test:
            # Run specific test (implementation would need to be added)
            print(f"Running specific test: {args.test}")
            print("❌ Specific test selection not implemented yet")
            success = False
        elif args.integration:
            success = tester.run_integration_test()
        elif args.performance:
            success = tester.run_performance_test()
        else:
            # Run full test suite
            success = (
                tester.run_all_tests() and 
                tester.run_integration_test() and 
                tester.run_performance_test()
            )
        
        tester.print_summary()
        
        sys.exit(0 if success else 1)
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Test runner error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)
    finally:
        tester.cleanup()


if __name__ == "__main__":
    main()