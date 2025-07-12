#!/usr/bin/env python3
"""
Document Migration Utilities for VANA ADK

This module provides utilities for migrating documents from legacy systems to ADK including:
1. Legacy document processor integration
2. Format conversion utilities
3. Progress tracking for migrations
4. Data mapping and transformation
"""

import asyncio
import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from tools.document_processing.adk_document_processor import ADKDocumentMigrator, ADKDocumentProcessor

# Import legacy and new processors
from tools.document_processing.document_processor import DocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MigrationConfig:
    """Configuration for document migration"""

    source_system: str = "legacy"  # "legacy", "filesystem", "database"
    target_system: str = "adk"
    preserve_metadata: bool = True
    preserve_chunks: bool = True
    validate_before_migration: bool = True
    validate_after_migration: bool = True
    backup_original: bool = True
    max_concurrent_migrations: int = 5
    retry_failed_migrations: bool = True
    max_retries: int = 3


@dataclass
class DocumentMapping:
    """Mapping between legacy and ADK document formats"""

    legacy_id: str
    legacy_path: str
    legacy_metadata: Dict[str, Any]
    adk_document_id: Optional[str] = None
    adk_rag_file_name: Optional[str] = None
    migration_status: str = "pending"  # "pending", "in_progress", "completed", "failed"
    migration_timestamp: Optional[str] = None
    error_message: Optional[str] = None


class LegacyDocumentExtractor:
    """Extracts documents from legacy systems"""

    def __init__(self, legacy_processor: Optional[DocumentProcessor] = None):
        """
        Initialize legacy document extractor

        Args:
            legacy_processor: Legacy document processor instance
        """
        self.legacy_processor = legacy_processor or DocumentProcessor()
        self.extraction_log = []

    def extract_document(self, file_path: str) -> Dict[str, Any]:
        """
        Extract document using legacy processor

        Args:
            file_path: Path to the document

        Returns:
            Dictionary containing extracted document data
        """
        try:
            logger.info(f"Extracting document with legacy processor: {file_path}")

            # Process document with legacy processor
            legacy_document = self.legacy_processor.process_document(file_path=file_path)

            # Log extraction
            extraction_record = {
                "file_path": file_path,
                "extraction_timestamp": datetime.now().isoformat(),
                "success": True,
                "chunks_count": len(legacy_document.get("chunks", [])),
                "text_length": len(legacy_document.get("text", "")),
                "metadata_keys": list(legacy_document.get("metadata", {}).keys()),
            }
            self.extraction_log.append(extraction_record)

            return legacy_document

        except Exception as e:
            error_msg = f"Error extracting document {file_path}: {str(e)}"
            logger.error(error_msg)

            # Log failed extraction
            extraction_record = {
                "file_path": file_path,
                "extraction_timestamp": datetime.now().isoformat(),
                "success": False,
                "error": error_msg,
            }
            self.extraction_log.append(extraction_record)

            return {
                "doc_id": None,
                "source": file_path,
                "title": None,
                "metadata": {"extraction_error": error_msg},
                "text": "",
                "chunks": [],
                "images": [],
            }

    def extract_batch(self, file_paths: List[str]) -> List[Dict[str, Any]]:
        """
        Extract multiple documents

        Args:
            file_paths: List of file paths

        Returns:
            List of extracted documents
        """
        logger.info(f"Extracting {len(file_paths)} documents with legacy processor")

        extracted_documents = []
        for file_path in file_paths:
            document = self.extract_document(file_path)
            extracted_documents.append(document)

        successful = sum(1 for doc in extracted_documents if doc.get("text"))
        logger.info(f"Legacy extraction completed: {successful}/{len(file_paths)} successful")

        return extracted_documents

    def get_extraction_log(self) -> List[Dict[str, Any]]:
        """Get extraction log"""
        return self.extraction_log.copy()


class DocumentFormatConverter:
    """Converts documents between different formats"""

    def __init__(self):
        """Initialize format converter"""
        self.conversion_log = []

    def convert_legacy_to_adk_metadata(self, legacy_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert legacy metadata format to ADK format

        Args:
            legacy_metadata: Legacy metadata dictionary

        Returns:
            ADK-compatible metadata dictionary
        """
        try:
            # Map legacy metadata fields to ADK format
            adk_metadata = {}

            # Direct mappings
            field_mappings = {
                "title": "title",
                "author": "author",
                "subject": "subject",
                "keywords": "keywords",
                "creator": "creator",
                "producer": "producer",
                "creation_date": "created_date",
                "modification_date": "modified_date",
                "page_count": "page_count",
                "word_count": "word_count",
                "language": "language",
                "file_name": "source_filename",
                "file_path": "source_filepath",
                "file_size_bytes": "file_size_bytes",
                "mime_type": "content_type",
            }

            for legacy_key, adk_key in field_mappings.items():
                if legacy_key in legacy_metadata:
                    adk_metadata[adk_key] = legacy_metadata[legacy_key]

            # Handle special conversions
            if "structure" in legacy_metadata:
                structure = legacy_metadata["structure"]
                adk_metadata["has_headings"] = structure.get("has_headings", False)
                adk_metadata["has_lists"] = structure.get("has_lists", False)
                adk_metadata["has_tables"] = structure.get("has_tables", False)
                adk_metadata["section_count"] = structure.get("section_count", 0)

            # Add migration metadata
            adk_metadata["migration_source"] = "legacy_processor"
            adk_metadata["migration_timestamp"] = datetime.now().isoformat()

            return adk_metadata

        except Exception as e:
            logger.error(f"Error converting metadata: {str(e)}")
            return {
                "migration_source": "legacy_processor",
                "migration_timestamp": datetime.now().isoformat(),
                "conversion_error": str(e),
            }

    def convert_legacy_chunks_to_adk(self, legacy_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Convert legacy chunks format to ADK format

        Args:
            legacy_chunks: List of legacy chunk dictionaries

        Returns:
            List of ADK-compatible chunk dictionaries
        """
        try:
            adk_chunks = []

            for i, chunk in enumerate(legacy_chunks):
                adk_chunk = {
                    "chunk_id": chunk.get("metadata", {}).get("chunk_id", f"chunk_{i}"),
                    "text": chunk.get("text", ""),
                    "metadata": {
                        "source": chunk.get("metadata", {}).get("source", ""),
                        "section_path": chunk.get("metadata", {}).get("section_path", ""),
                        "heading": chunk.get("metadata", {}).get("heading", ""),
                        "token_count": chunk.get("metadata", {}).get("token_count", 0),
                        "chunk_index": i,
                        "migration_source": "legacy_processor",
                    },
                }

                # Preserve additional metadata
                legacy_metadata = chunk.get("metadata", {})
                for key, value in legacy_metadata.items():
                    if key not in adk_chunk["metadata"]:
                        adk_chunk["metadata"][f"legacy_{key}"] = value

                adk_chunks.append(adk_chunk)

            return adk_chunks

        except Exception as e:
            logger.error(f"Error converting chunks: {str(e)}")
            return []

    def convert_legacy_document_to_adk(self, legacy_document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert complete legacy document to ADK format

        Args:
            legacy_document: Legacy document dictionary

        Returns:
            ADK-compatible document dictionary
        """
        try:
            adk_document = {
                "document_id": legacy_document.get("doc_id"),
                "title": legacy_document.get("title"),
                "content": legacy_document.get("text", ""),
                "metadata": self.convert_legacy_to_adk_metadata(legacy_document.get("metadata", {})),
                "chunks": self.convert_legacy_chunks_to_adk(legacy_document.get("chunks", [])),
                "conversion_timestamp": datetime.now().isoformat(),
            }

            # Log conversion
            conversion_record = {
                "legacy_doc_id": legacy_document.get("doc_id"),
                "adk_document_id": adk_document["document_id"],
                "conversion_timestamp": datetime.now().isoformat(),
                "success": True,
                "chunks_converted": len(adk_document["chunks"]),
                "content_length": len(adk_document["content"]),
            }
            self.conversion_log.append(conversion_record)

            return adk_document

        except Exception as e:
            error_msg = f"Error converting document: {str(e)}"
            logger.error(error_msg)

            # Log failed conversion
            conversion_record = {
                "legacy_doc_id": legacy_document.get("doc_id"),
                "conversion_timestamp": datetime.now().isoformat(),
                "success": False,
                "error": error_msg,
            }
            self.conversion_log.append(conversion_record)

            return {
                "document_id": legacy_document.get("doc_id"),
                "title": legacy_document.get("title"),
                "content": "",
                "metadata": {"conversion_error": error_msg},
                "chunks": [],
                "conversion_timestamp": datetime.now().isoformat(),
            }

    def get_conversion_log(self) -> List[Dict[str, Any]]:
        """Get conversion log"""
        return self.conversion_log.copy()


class MigrationProgressTracker:
    """Tracks progress of document migration"""

    def __init__(self, total_documents: int):
        """
        Initialize progress tracker

        Args:
            total_documents: Total number of documents to migrate
        """
        self.total_documents = total_documents
        self.processed_documents = 0
        self.successful_migrations = 0
        self.failed_migrations = 0
        self.start_time = datetime.now()
        self.document_mappings: List[DocumentMapping] = []
        self.progress_callbacks: List[Callable] = []

    def add_progress_callback(self, callback: Callable):
        """Add a progress callback function"""
        self.progress_callbacks.append(callback)

    def update_progress(self, mapping: DocumentMapping):
        """
        Update progress with a document mapping

        Args:
            mapping: Document mapping with migration status
        """
        # Update or add mapping
        existing_mapping = None
        for i, existing in enumerate(self.document_mappings):
            if existing.legacy_id == mapping.legacy_id:
                existing_mapping = i
                break

        if existing_mapping is not None:
            self.document_mappings[existing_mapping] = mapping
        else:
            self.document_mappings.append(mapping)

        # Update counters
        self.processed_documents = len(
            [m for m in self.document_mappings if m.migration_status in ["completed", "failed"]]
        )
        self.successful_migrations = len([m for m in self.document_mappings if m.migration_status == "completed"])
        self.failed_migrations = len([m for m in self.document_mappings if m.migration_status == "failed"])

        # Call progress callbacks
        progress_info = self.get_progress_info()
        for callback in self.progress_callbacks:
            try:
                callback(progress_info)
            except Exception as e:
                logger.warning(f"Error in progress callback: {e}")

    def get_progress_info(self) -> Dict[str, Any]:
        """Get current progress information"""
        elapsed_time = (datetime.now() - self.start_time).total_seconds()

        return {
            "total_documents": self.total_documents,
            "processed_documents": self.processed_documents,
            "successful_migrations": self.successful_migrations,
            "failed_migrations": self.failed_migrations,
            "progress_percentage": (
                (self.processed_documents / self.total_documents) * 100 if self.total_documents > 0 else 0
            ),
            "success_rate": (
                (self.successful_migrations / self.processed_documents) * 100 if self.processed_documents > 0 else 0
            ),
            "elapsed_time_seconds": elapsed_time,
            "estimated_remaining_seconds": (
                (elapsed_time / self.processed_documents) * (self.total_documents - self.processed_documents)
                if self.processed_documents > 0
                else 0
            ),
        }

    def get_document_mappings(self) -> List[DocumentMapping]:
        """Get all document mappings"""
        return self.document_mappings.copy()

    def export_migration_report(self, output_path: str) -> bool:
        """
        Export migration report

        Args:
            output_path: Path to output file

        Returns:
            True if successful, False otherwise
        """
        try:
            report = {
                "migration_summary": self.get_progress_info(),
                "document_mappings": [asdict(mapping) for mapping in self.document_mappings],
                "export_timestamp": datetime.now().isoformat(),
            }

            with open(output_path, "w") as f:
                json.dump(report, f, indent=2)

            logger.info(f"Migration report exported to {output_path}")
            return True

        except Exception as e:
            logger.error(f"Error exporting migration report: {str(e)}")
            return False


class ComprehensiveMigrationManager:
    """Manages end-to-end document migration from legacy to ADK"""

    def __init__(
        self,
        adk_processor: ADKDocumentProcessor,
        config: Optional[MigrationConfig] = None,
    ):
        """
        Initialize migration manager

        Args:
            adk_processor: ADK document processor instance
            config: Migration configuration
        """
        self.adk_processor = adk_processor
        self.config = config or MigrationConfig()

        # Initialize components
        self.legacy_extractor = LegacyDocumentExtractor()
        self.format_converter = DocumentFormatConverter()
        self.adk_migrator = ADKDocumentMigrator(adk_processor)

        # Migration state
        self.is_migrating = False
        self.current_migration_id = None

    async def migrate_documents_from_filesystem(
        self,
        source_directory: str,
        file_extensions: Optional[List[str]] = None,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Migrate documents from filesystem

        Args:
            source_directory: Source directory containing documents
            file_extensions: List of file extensions to include
            progress_callback: Optional progress callback

        Returns:
            Dictionary containing migration results
        """
        if self.is_migrating:
            raise RuntimeError("Migration is already in progress")

        self.is_migrating = True
        migration_start = datetime.now()
        self.current_migration_id = f"migration_{migration_start.strftime('%Y%m%d_%H%M%S')}"

        try:
            # Get list of files to migrate
            file_paths = self.adk_processor.process_directory(source_directory, file_extensions, recursive=True)

            if not file_paths:
                return {
                    "success": False,
                    "error": f"No files found in {source_directory}",
                    "migration_id": self.current_migration_id,
                }

            logger.info(f"Starting migration of {len(file_paths)} files from {source_directory}")

            # Initialize progress tracker
            progress_tracker = MigrationProgressTracker(len(file_paths))
            if progress_callback:
                progress_tracker.add_progress_callback(progress_callback)

            # Process files in batches
            migration_results = []
            semaphore = asyncio.Semaphore(self.config.max_concurrent_migrations)

            async def migrate_single_file(file_path: str) -> DocumentMapping:
                async with semaphore:
                    return await self._migrate_single_document(file_path, progress_tracker)

            # Create tasks for all files
            tasks = [migrate_single_file(fp) for fp in file_paths]

            # Execute migrations
            mappings = await asyncio.gather(*tasks, return_exceptions=True)

            # Process results
            for i, mapping in enumerate(mappings):
                if isinstance(mapping, Exception):
                    error_mapping = DocumentMapping(
                        legacy_id=f"error_{i}",
                        legacy_path=file_paths[i],
                        legacy_metadata={},
                        migration_status="failed",
                        migration_timestamp=datetime.now().isoformat(),
                        error_message=str(mapping),
                    )
                    migration_results.append(error_mapping)
                else:
                    migration_results.append(mapping)

            # Calculate final statistics
            migration_end = datetime.now()
            migration_duration = (migration_end - migration_start).total_seconds()

            successful_count = sum(1 for m in migration_results if m.migration_status == "completed")
            failed_count = sum(1 for m in migration_results if m.migration_status == "failed")

            migration_summary = {
                "migration_id": self.current_migration_id,
                "source_directory": source_directory,
                "total_files": len(file_paths),
                "successful_migrations": successful_count,
                "failed_migrations": failed_count,
                "success_rate": successful_count / len(file_paths) if file_paths else 0,
                "migration_duration_seconds": migration_duration,
                "start_time": migration_start.isoformat(),
                "end_time": migration_end.isoformat(),
            }

            result = {
                "success": True,
                "migration_summary": migration_summary,
                "document_mappings": [asdict(m) for m in migration_results],
                "migration_id": self.current_migration_id,
            }

            logger.info(f"Migration completed: {successful_count}/{len(file_paths)} files successful")
            return result

        except Exception as e:
            error_msg = f"Migration error: {str(e)}"
            logger.error(error_msg)

            return {
                "success": False,
                "error": error_msg,
                "migration_id": self.current_migration_id,
                "migration_duration_seconds": (datetime.now() - migration_start).total_seconds(),
            }

        finally:
            self.is_migrating = False
            self.current_migration_id = None

    async def _migrate_single_document(
        self, file_path: str, progress_tracker: MigrationProgressTracker
    ) -> DocumentMapping:
        """
        Migrate a single document

        Args:
            file_path: Path to the document
            progress_tracker: Progress tracker instance

        Returns:
            DocumentMapping with migration result
        """
        migration_start = datetime.now()

        # Create initial mapping
        mapping = DocumentMapping(
            legacy_id=os.path.basename(file_path),
            legacy_path=file_path,
            legacy_metadata={},
            migration_status="in_progress",
            migration_timestamp=migration_start.isoformat(),
        )

        try:
            # Step 1: Extract document with legacy processor
            legacy_document = self.legacy_extractor.extract_document(file_path)
            mapping.legacy_metadata = legacy_document.get("metadata", {})

            # Step 2: Convert format if needed
            if self.config.preserve_metadata or self.config.preserve_chunks:
                self.format_converter.convert_legacy_document_to_adk(legacy_document)

            # Step 3: Upload to ADK
            upload_result = await self.adk_processor.upload_file_to_rag_corpus(file_path)

            if upload_result.get("success", False):
                mapping.adk_document_id = upload_result.get("document_id")
                mapping.adk_rag_file_name = upload_result.get("rag_file_name")
                mapping.migration_status = "completed"
                mapping.migration_timestamp = datetime.now().isoformat()
            else:
                mapping.migration_status = "failed"
                mapping.error_message = upload_result.get("error", "Unknown upload error")
                mapping.migration_timestamp = datetime.now().isoformat()

        except Exception as e:
            mapping.migration_status = "failed"
            mapping.error_message = str(e)
            mapping.migration_timestamp = datetime.now().isoformat()

        # Update progress
        progress_tracker.update_progress(mapping)

        return mapping

    def get_migration_statistics(self) -> Dict[str, Any]:
        """Get comprehensive migration statistics"""
        return {
            "legacy_extractor_log": self.legacy_extractor.get_extraction_log(),
            "format_converter_log": self.format_converter.get_conversion_log(),
            "adk_migrator_history": self.adk_migrator.get_migration_history(),
            "adk_processor_stats": self.adk_processor.get_processing_statistics(),
        }


# Utility functions
def create_migration_manager(adk_processor: ADKDocumentProcessor, **config_kwargs) -> ComprehensiveMigrationManager:
    """Create a migration manager with custom configuration"""
    config = MigrationConfig(**config_kwargs)
    return ComprehensiveMigrationManager(adk_processor, config)


async def quick_migrate_directory(
    source_directory: str,
    adk_processor: ADKDocumentProcessor,
    progress_callback: Optional[Callable] = None,
    **config_kwargs,
) -> Dict[str, Any]:
    """Quick migration of a directory"""
    manager = create_migration_manager(adk_processor, **config_kwargs)
    return await manager.migrate_documents_from_filesystem(source_directory, progress_callback=progress_callback)


def default_migration_progress_callback(progress_info: Dict[str, Any]):
    """Default migration progress callback"""
    percentage = progress_info["progress_percentage"]
    processed = progress_info["processed_documents"]
    total = progress_info["total_documents"]
    successful = progress_info["successful_migrations"]
    failed = progress_info["failed_migrations"]

    logger.info(
        f"Migration Progress: {percentage:.1f}% ({processed}/{total}) - Success: {successful}, Failed: {failed}"
    )
