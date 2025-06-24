# ADK Document Processing Pipeline for VANA

This module provides a comprehensive document processing pipeline that migrates from custom document processing (PyPDF2/Pytesseract) to Google ADK RAG Corpus for document ingestion.

## Overview

The ADK document processing system includes:

1. **ADK Document Processor** - Core document upload functionality using `vertexai.rag`
2. **Batch Processing** - Efficient processing of multiple documents with progress tracking
3. **Document Validation** - Comprehensive validation and quality assessment
4. **Migration Utilities** - Tools for migrating from legacy document processing systems
5. **Integration Components** - API wrappers and ADK tool integration
6. **Document Lifecycle Management** - Track documents through their processing lifecycle

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VANA Multi-Agent System                     │
├─────────────────────────────────────────────────────────────────┤
│                  ADK Integration Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Document API    │  │ ADK Tools       │  │ Lifecycle Mgr   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   Processing Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Batch Processor │  │ Migration Utils │  │ Document Valid. │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Core Layer                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ADK Processor   │  │ Legacy Processor│  │ Semantic Chunker│ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                   Storage Layer                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Google ADK RAG  │  │ Vertex AI       │  │ Cloud Storage   │ │
│  │ Corpus          │  │ Embeddings      │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Basic Setup

```python
import os
from tools.document_processing import (
    create_adk_processor,
    create_batch_processor,
    create_validator
)

# Set environment variables
os.environ["GOOGLE_CLOUD_PROJECT"] = "your-project-id"
os.environ["GOOGLE_CLOUD_LOCATION"] = "us-central1"
os.environ["RAG_CORPUS_NAME"] = "your-rag-corpus"

# Initialize processors
adk_processor = create_adk_processor()
batch_processor = create_batch_processor(adk_processor)
validator = create_validator()
```

### 2. Single Document Processing

```python
import asyncio

async def process_single_document():
    # Validate document first
    validation_report = validator.validate_document("document.pdf")

    if validation_report.is_valid:
        # Process document
        result = await adk_processor.upload_file_to_rag_corpus(
            "document.pdf",
            display_name="My Document",
            description="Important document for processing"
        )

        if result["success"]:
            print(f"Document uploaded: {result['rag_file_name']}")
        else:
            print(f"Upload failed: {result['error']}")
    else:
        print(f"Validation failed: {validation_report.error_count} errors")

# Run the async function
asyncio.run(process_single_document())
```

### 3. Batch Processing

```python
async def process_batch():
    # Get list of files
    file_paths = adk_processor.process_directory("documents/", recursive=True)

    # Process batch with progress tracking
    def progress_callback(progress_info):
        percentage = progress_info["progress_percentage"]
        print(f"Progress: {percentage:.1f}%")

    result = await batch_processor.process_batch(
        file_paths,
        progress_callback=progress_callback,
        validate_first=True
    )

    if result["success"]:
        stats = result["processing_stats"]
        print(f"Processed {stats['successful_files']}/{stats['total_files']} files")

asyncio.run(process_batch())
```

### 4. Document Migration

```python
from tools.document_processing import create_migration_manager

async def migrate_documents():
    migration_manager = create_migration_manager(adk_processor)

    result = await migration_manager.migrate_documents_from_filesystem(
        "legacy_documents/",
        progress_callback=lambda info: print(f"Migration: {info['progress_percentage']:.1f}%")
    )

    if result["success"]:
        summary = result["migration_summary"]
        print(f"Migrated {summary['successful_migrations']} documents")

asyncio.run(migrate_documents())
```

## Components

### ADK Document Processor (`adk_document_processor.py`)

Core component for uploading documents to Google ADK RAG Corpus.

**Key Features:**
- Document validation and metadata extraction
- RAG Corpus integration using `vertexai.rag.upload_file`
- Batch import from Google Cloud Storage
- Processing statistics and monitoring
- Error handling and retry logic

**Main Classes:**
- `ADKDocumentProcessor` - Main processor class
- `ADKDocumentMigrator` - Migration utilities

### Batch Processor (`batch_processor.py`)

Handles efficient batch processing of multiple documents.

**Key Features:**
- Concurrent processing with configurable limits
- Progress tracking and callbacks
- Retry logic with exponential backoff
- Performance monitoring and statistics
- Chunked processing for memory management

**Main Classes:**
- `BatchDocumentProcessor` - Main batch processor
- `ProgressTracker` - Progress monitoring
- `RetryManager` - Retry logic management

### Document Validator (`document_validator.py`)

Comprehensive document validation and quality assessment.

**Key Features:**
- File format and size validation
- Content integrity checks
- Security scanning
- Metadata validation
- Customizable validation rules

**Main Classes:**
- `DocumentValidator` - Main validation engine
- `ValidationRule` - Individual validation rules
- `DocumentValidationReport` - Validation results

### Migration Utilities (`migration_utils.py`)

Tools for migrating from legacy document processing systems.

**Key Features:**
- Legacy document extraction
- Format conversion between systems
- Progress tracking for migrations
- Data mapping and transformation
- Migration history and reporting

**Main Classes:**
- `ComprehensiveMigrationManager` - End-to-end migration
- `LegacyDocumentExtractor` - Extract from legacy systems
- `DocumentFormatConverter` - Format conversion
- `MigrationProgressTracker` - Migration progress

### ADK Integration (`adk_integration.py`)

Integration components for VANA multi-agent system.

**Key Features:**
- High-level document processing API
- ADK-compatible function tools
- Document lifecycle management
- Request tracking and monitoring
- Error handling and response formatting

**Main Classes:**
- `DocumentProcessingAPI` - High-level API
- `ADKDocumentProcessingTools` - ADK function tools
- `DocumentLifecycleManager` - Lifecycle tracking

## Configuration

### Environment Variables

```bash
# Required
export GOOGLE_CLOUD_PROJECT="your-project-id"
export GOOGLE_CLOUD_LOCATION="us-central1"
export RAG_CORPUS_NAME="your-rag-corpus"

# Optional
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
export GOOGLE_CLOUD_LOCATION="us-central1"
```

### Processor Configuration

```python
# ADK Processor Configuration
adk_processor = create_adk_processor(
    rag_corpus_name="my-corpus",
    project_id="my-project",
    location="us-central1",
    max_file_size_mb=100,
    enable_batch_processing=True
)

# Batch Processor Configuration
batch_processor = create_batch_processor(
    adk_processor,
    max_concurrent_uploads=5,
    max_retries=3,
    retry_delay_seconds=1.0,
    progress_update_interval=10,
    chunk_size=100,
    timeout_seconds=300
)
```

## Supported File Formats

- **PDF Documents** (.pdf) - Up to 100MB
- **Text Files** (.txt) - Up to 50MB
- **Markdown** (.md, .markdown) - Up to 50MB
- **Microsoft Word** (.docx) - Up to 100MB
- **PowerPoint** (.pptx) - Up to 200MB
- **Images** (.jpg, .jpeg, .png, .gif) - Up to 50MB

## Error Handling

The system includes comprehensive error handling:

```python
try:
    result = await adk_processor.upload_file_to_rag_corpus("document.pdf")
    if result["success"]:
        print("Success!")
    else:
        print(f"Error: {result['error']}")
except Exception as e:
    print(f"Unexpected error: {str(e)}")
```

## Monitoring and Logging

### Processing Statistics

```python
# Get processor statistics
stats = adk_processor.get_processing_statistics()
print(f"Documents processed: {stats['documents_processed']}")
print(f"Success rate: {stats['success_rate']:.1%}")
print(f"Average processing time: {stats['avg_processing_time_seconds']:.2f}s")

# Get API statistics
api_stats = api.get_api_statistics()
print(f"Total requests: {api_stats['total_requests']}")
print(f"Active requests: {api_stats['active_requests_count']}")
```

### Logging Configuration

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set specific log levels
logging.getLogger('tools.document_processing.adk_document_processor').setLevel(logging.DEBUG)
```

## Examples

See `examples/adk_processing_example.py` for a comprehensive demonstration of all features.

### Running the Example

```bash
cd tools/document_processing/examples
python adk_processing_example.py
```

## Testing

### Unit Tests

```bash
# Run all document processing tests
python -m pytest tools/document_processing/tests/

# Run specific test modules
python -m pytest tools/document_processing/tests/test_adk_processor.py
python -m pytest tools/document_processing/tests/test_batch_processor.py
python -m pytest tools/document_processing/tests/test_validator.py
```

### Integration Tests

```bash
# Run integration tests (requires ADK setup)
python -m pytest tools/document_processing/tests/integration/
```

## Performance Considerations

### Batch Processing

- Use batch processing for multiple documents
- Configure `max_concurrent_uploads` based on your quota limits
- Monitor memory usage with large document sets
- Use chunked processing for very large batches

### File Size Limits

- Respect Google ADK file size limits
- Validate documents before processing
- Consider splitting large documents

### Rate Limiting

- ADK has rate limits for embedding requests
- Configure `max_embedding_requests_per_min` appropriately
- Use retry logic for rate limit errors

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
   gcloud auth application-default login
   ```

2. **RAG Corpus Not Found**
   ```python
   # Ensure RAG Corpus exists and is properly named
   corpus_name = "projects/PROJECT/locations/LOCATION/ragCorpora/CORPUS"
   ```

3. **File Upload Failures**
   - Check file format support
   - Verify file size limits
   - Ensure proper permissions

4. **Import Errors**
   ```bash
   pip install google-cloud-aiplatform
   pip install vertexai
   ```

### Debug Mode

```python
import logging
logging.getLogger('tools.document_processing').setLevel(logging.DEBUG)
```

## Migration from Legacy System

### Step-by-Step Migration

1. **Assessment**
   ```python
   # Validate existing documents
   validator = create_validator()
   reports = validator.validate_batch(legacy_file_paths)
   ```

2. **Test Migration**
   ```python
   # Run dry-run migration
   result = await migrator.migrate_documents(
       "legacy_docs/",
       dry_run=True
   )
   ```

3. **Full Migration**
   ```python
   # Perform actual migration
   result = await migrator.migrate_documents(
       "legacy_docs/",
       progress_callback=migration_progress_callback
   )
   ```

4. **Verification**
   ```python
   # Verify migration results
   migration_report = migrator.export_migration_report("migration_report.json")
   ```

## Contributing

When contributing to the document processing system:

1. Follow the existing code structure
2. Add comprehensive error handling
3. Include logging for debugging
4. Write unit tests for new features
5. Update documentation

## License

This module is part of the VANA project and follows the project's licensing terms.
