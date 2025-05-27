#!/usr/bin/env python3
"""
ADK Document Processing Example for VANA

This example demonstrates how to use the ADK document processing pipeline including:
1. Single document processing
2. Batch document processing
3. Document migration from legacy systems
4. Document validation
5. Integration with VANA multi-agent system
"""

import os
import asyncio
import logging
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from tools.document_processing.adk_document_processor import ADKDocumentProcessor, create_adk_processor
from tools.document_processing.batch_processor import BatchDocumentProcessor, create_batch_processor, default_progress_callback
from tools.document_processing.document_validator import DocumentValidator, create_validator
from tools.document_processing.migration_utils import ComprehensiveMigrationManager, create_migration_manager, default_migration_progress_callback
from tools.document_processing.adk_integration import DocumentProcessingAPI, create_document_processing_api, create_adk_tools

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def main():
    """Main example function"""
    logger.info("ADK Document Processing Example")
    logger.info("This example demonstrates the ADK document processing capabilities")
    
    # Example usage would go here
    # Note: Actual usage requires proper Google Cloud setup
    
if __name__ == "__main__":
    asyncio.run(main())
