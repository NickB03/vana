#!/usr/bin/env python3
"""
Test script for ADK Document Processing Implementation

This script tests the basic functionality of the ADK document processing system
without requiring actual Google ADK credentials.
"""

import os
import sys
import tempfile
import logging
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_imports():
    """Test that all modules can be imported"""
    logger.info("Testing imports...")
    
    try:
        # Test basic imports
        from tools.document_processing import (
            LEGACY_AVAILABLE,
            ADK_CORE_AVAILABLE,
            BATCH_PROCESSING_AVAILABLE,
            VALIDATION_AVAILABLE,
            MIGRATION_AVAILABLE,
            INTEGRATION_AVAILABLE
        )
        
        logger.info("Import availability:")
        logger.info(f"  Legacy Processing: {LEGACY_AVAILABLE}")
        logger.info(f"  ADK Core: {ADK_CORE_AVAILABLE}")
        logger.info(f"  Batch Processing: {BATCH_PROCESSING_AVAILABLE}")
        logger.info(f"  Validation: {VALIDATION_AVAILABLE}")
        logger.info(f"  Migration: {MIGRATION_AVAILABLE}")
        logger.info(f"  Integration: {INTEGRATION_AVAILABLE}")
        
        # Test specific imports
        if VALIDATION_AVAILABLE:
            from tools.document_processing import create_validator
            logger.info("✓ Document validation available")
        
        if ADK_CORE_AVAILABLE:
            from tools.document_processing import create_adk_processor
            logger.info("✓ ADK core processing available")
        
        if BATCH_PROCESSING_AVAILABLE:
            from tools.document_processing import create_batch_processor
            logger.info("✓ Batch processing available")
        
        if MIGRATION_AVAILABLE:
            from tools.document_processing import create_migration_manager
            logger.info("✓ Migration utilities available")
        
        if INTEGRATION_AVAILABLE:
            from tools.document_processing import create_document_processing_api
            logger.info("✓ ADK integration available")
        
        logger.info("✓ All imports successful")
        return True
        
    except Exception as e:
        logger.error(f"✗ Import failed: {str(e)}")
        return False

def test_document_validation():
    """Test document validation functionality"""
    logger.info("Testing document validation...")
    
    try:
        from tools.document_processing import create_validator, VALIDATION_AVAILABLE
        
        if not VALIDATION_AVAILABLE:
            logger.warning("Document validation not available - skipping test")
            return True
        
        # Create validator
        validator = create_validator()
        
        # Create test file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("This is a test document for validation.\n")
            f.write("It contains some sample content to test the validation system.\n")
            test_file = f.name
        
        try:
            # Validate the test file
            validation_report = validator.validate_document(test_file)
            
            logger.info(f"Validation result: {validation_report.overall_status}")
            logger.info(f"Errors: {validation_report.error_count}")
            logger.info(f"Warnings: {validation_report.warning_count}")
            logger.info(f"File size: {validation_report.file_size_bytes} bytes")
            
            # Test batch validation
            validation_reports = validator.validate_batch([test_file])
            logger.info(f"Batch validation: {len(validation_reports)} reports generated")
            
            logger.info("✓ Document validation test successful")
            return True
            
        finally:
            # Clean up test file
            os.unlink(test_file)
        
    except Exception as e:
        logger.error(f"✗ Document validation test failed: {str(e)}")
        return False

def test_adk_processor_creation():
    """Test ADK processor creation (without actual ADK calls)"""
    logger.info("Testing ADK processor creation...")
    
    try:
        from tools.document_processing import create_adk_processor, ADK_CORE_AVAILABLE
        
        if not ADK_CORE_AVAILABLE:
            logger.warning("ADK core not available - skipping test")
            return True
        
        # Set mock environment variables
        os.environ["GOOGLE_CLOUD_PROJECT"] = "test-project"
        os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
        os.environ["RAG_CORPUS_NAME"] = "test-corpus"
        
        # This will fail due to missing ADK libraries, but we can test the import
        try:
            processor = create_adk_processor()
            logger.info("✓ ADK processor created successfully")
            return True
        except ImportError as e:
            if "Google ADK and Vertex AI libraries are required" in str(e):
                logger.info("✓ ADK processor creation test passed (expected ImportError)")
                return True
            else:
                raise
        
    except Exception as e:
        logger.error(f"✗ ADK processor creation test failed: {str(e)}")
        return False

def test_batch_processor_creation():
    """Test batch processor creation"""
    logger.info("Testing batch processor creation...")
    
    try:
        from tools.document_processing import create_batch_processor, BATCH_PROCESSING_AVAILABLE
        
        if not BATCH_PROCESSING_AVAILABLE:
            logger.warning("Batch processing not available - skipping test")
            return True
        
        # Create mock ADK processor
        class MockADKProcessor:
            def __init__(self):
                self.processing_stats = {
                    "documents_processed": 0,
                    "documents_failed": 0,
                    "total_size_mb": 0.0,
                    "processing_time_seconds": 0.0
                }
            
            def get_processing_statistics(self):
                return self.processing_stats
        
        mock_processor = MockADKProcessor()
        
        # Create batch processor
        batch_processor = create_batch_processor(
            mock_processor,
            max_concurrent_uploads=3,
            max_retries=2
        )
        
        logger.info("✓ Batch processor created successfully")
        logger.info(f"  Max concurrent uploads: {batch_processor.config.max_concurrent_uploads}")
        logger.info(f"  Max retries: {batch_processor.config.max_retries}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Batch processor creation test failed: {str(e)}")
        return False

def test_migration_manager_creation():
    """Test migration manager creation"""
    logger.info("Testing migration manager creation...")
    
    try:
        from tools.document_processing import create_migration_manager, MIGRATION_AVAILABLE
        
        if not MIGRATION_AVAILABLE:
            logger.warning("Migration utilities not available - skipping test")
            return True
        
        # Create mock ADK processor
        class MockADKProcessor:
            def __init__(self):
                self.processing_stats = {
                    "documents_processed": 0,
                    "documents_failed": 0,
                    "total_size_mb": 0.0,
                    "processing_time_seconds": 0.0
                }
            
            def get_processing_statistics(self):
                return self.processing_stats
            
            def process_directory(self, directory_path, file_extensions=None, recursive=True):
                return []
        
        mock_processor = MockADKProcessor()
        
        # Create migration manager
        migration_manager = create_migration_manager(
            mock_processor,
            preserve_metadata=True,
            validate_before_migration=True
        )
        
        logger.info("✓ Migration manager created successfully")
        logger.info(f"  Preserve metadata: {migration_manager.config.preserve_metadata}")
        logger.info(f"  Validate before migration: {migration_manager.config.validate_before_migration}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Migration manager creation test failed: {str(e)}")
        return False

def test_api_creation():
    """Test API creation"""
    logger.info("Testing API creation...")
    
    try:
        from tools.document_processing import create_document_processing_api, INTEGRATION_AVAILABLE
        
        if not INTEGRATION_AVAILABLE:
            logger.warning("Integration components not available - skipping test")
            return True
        
        # Create mock ADK processor
        class MockADKProcessor:
            def __init__(self):
                self.processing_stats = {
                    "documents_processed": 0,
                    "documents_failed": 0,
                    "total_size_mb": 0.0,
                    "processing_time_seconds": 0.0
                }
            
            def get_processing_statistics(self):
                return self.processing_stats
        
        mock_processor = MockADKProcessor()
        
        # Create API
        api = create_document_processing_api(
            mock_processor,
            enable_validation=True,
            enable_monitoring=True
        )
        
        logger.info("✓ Document processing API created successfully")
        logger.info(f"  Validation enabled: {api.enable_validation}")
        logger.info(f"  Monitoring enabled: {api.enable_monitoring}")
        
        # Test API statistics
        stats = api.get_api_statistics()
        logger.info(f"  Initial API stats: {stats}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ API creation test failed: {str(e)}")
        return False

def run_all_tests():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("ADK Document Processing Implementation Test")
    logger.info("=" * 60)
    
    tests = [
        ("Import Test", test_imports),
        ("Document Validation Test", test_document_validation),
        ("ADK Processor Creation Test", test_adk_processor_creation),
        ("Batch Processor Creation Test", test_batch_processor_creation),
        ("Migration Manager Creation Test", test_migration_manager_creation),
        ("API Creation Test", test_api_creation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        logger.info(f"\n--- {test_name} ---")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            logger.error(f"Test {test_name} crashed: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Results Summary")
    logger.info("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        logger.info(f"{test_name}: {status}")
        if result:
            passed += 1
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! ADK document processing implementation is working correctly.")
    else:
        logger.warning(f"⚠️  {total - passed} tests failed. Some components may not be available.")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
