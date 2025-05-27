"""
Document Processing Package for VANA

This package provides comprehensive document processing capabilities including:
- Legacy document processing (PyPDF2/Pytesseract)
- ADK document processing (Google Vertex AI RAG)
- Batch processing and migration utilities
- Document validation and quality assessment
- Integration with VANA multi-agent system
"""

# Legacy document processing
try:
    from .document_processor import DocumentProcessor
    from .semantic_chunker import SemanticChunker
    LEGACY_AVAILABLE = True
except ImportError:
    LEGACY_AVAILABLE = False

# ADK document processing
try:
    from .adk_document_processor import (
        ADKDocumentProcessor,
        ADKDocumentMigrator,
        create_adk_processor,
        create_migrator,
        quick_upload,
        quick_batch_upload
    )
    ADK_CORE_AVAILABLE = True
except ImportError:
    ADK_CORE_AVAILABLE = False

# Batch processing
try:
    from .batch_processor import (
        BatchDocumentProcessor,
        BatchProcessingConfig,
        ProcessingResult,
        BatchProcessingStats,
        ProgressTracker,
        RetryManager,
        create_batch_processor,
        quick_batch_process,
        default_progress_callback
    )
    BATCH_PROCESSING_AVAILABLE = True
except ImportError:
    BATCH_PROCESSING_AVAILABLE = False

# Document validation
try:
    from .document_validator import (
        DocumentValidator,
        ValidationRule,
        ValidationResult,
        DocumentValidationReport,
        create_validator,
        quick_validate,
        quick_batch_validate
    )
    VALIDATION_AVAILABLE = True
except ImportError:
    VALIDATION_AVAILABLE = False

# Migration utilities
try:
    from .migration_utils import (
        ComprehensiveMigrationManager,
        MigrationConfig,
        DocumentMapping,
        LegacyDocumentExtractor,
        DocumentFormatConverter,
        MigrationProgressTracker,
        create_migration_manager,
        quick_migrate_directory,
        default_migration_progress_callback
    )
    MIGRATION_AVAILABLE = True
except ImportError:
    MIGRATION_AVAILABLE = False

# ADK integration
try:
    from .adk_integration import (
        DocumentProcessingAPI,
        DocumentProcessingRequest,
        DocumentProcessingResponse,
        ADKDocumentProcessingTools,
        DocumentLifecycleManager,
        create_document_processing_api,
        create_adk_tools,
        create_lifecycle_manager
    )
    INTEGRATION_AVAILABLE = True
except ImportError:
    INTEGRATION_AVAILABLE = False

# Build __all__ dynamically based on available components
__all__ = []

if LEGACY_AVAILABLE:
    __all__.extend([
        'DocumentProcessor',
        'SemanticChunker'
    ])

if ADK_CORE_AVAILABLE:
    __all__.extend([
        'ADKDocumentProcessor',
        'ADKDocumentMigrator',
        'create_adk_processor',
        'create_migrator',
        'quick_upload',
        'quick_batch_upload'
    ])

if BATCH_PROCESSING_AVAILABLE:
    __all__.extend([
        'BatchDocumentProcessor',
        'BatchProcessingConfig',
        'ProcessingResult',
        'BatchProcessingStats',
        'ProgressTracker',
        'RetryManager',
        'create_batch_processor',
        'quick_batch_process',
        'default_progress_callback'
    ])

if VALIDATION_AVAILABLE:
    __all__.extend([
        'DocumentValidator',
        'ValidationRule',
        'ValidationResult',
        'DocumentValidationReport',
        'create_validator',
        'quick_validate',
        'quick_batch_validate'
    ])

if MIGRATION_AVAILABLE:
    __all__.extend([
        'ComprehensiveMigrationManager',
        'MigrationConfig',
        'DocumentMapping',
        'LegacyDocumentExtractor',
        'DocumentFormatConverter',
        'MigrationProgressTracker',
        'create_migration_manager',
        'quick_migrate_directory',
        'default_migration_progress_callback'
    ])

if INTEGRATION_AVAILABLE:
    __all__.extend([
        'DocumentProcessingAPI',
        'DocumentProcessingRequest',
        'DocumentProcessingResponse',
        'ADKDocumentProcessingTools',
        'DocumentLifecycleManager',
        'create_document_processing_api',
        'create_adk_tools',
        'create_lifecycle_manager'
    ])

# Availability flags
__all__.extend([
    'LEGACY_AVAILABLE',
    'ADK_CORE_AVAILABLE',
    'BATCH_PROCESSING_AVAILABLE',
    'VALIDATION_AVAILABLE',
    'MIGRATION_AVAILABLE',
    'INTEGRATION_AVAILABLE'
])
