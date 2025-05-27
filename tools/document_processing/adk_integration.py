#!/usr/bin/env python3
"""
ADK Document Processing Integration for VANA

This module provides integration components for ADK document processing including:
1. Document processing API wrappers
2. Error handling and retry logic
3. Monitoring and logging components
4. Document lifecycle management
5. Integration with VANA multi-agent system
"""

import os
import asyncio
import logging
import json
from typing import List, Dict, Any, Optional, Callable, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path

# Google ADK imports
try:
    from google.adk.agents import LlmAgent
    from google.adk.tools import FunctionTool
    from google.adk.memory import VertexAiRagMemoryService
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    # Create mock classes for development
    class LlmAgent:
        pass
    class FunctionTool:
        def __init__(self, func):
            self.func = func
    class VertexAiRagMemoryService:
        pass

# VANA imports
from tools.document_processing.adk_document_processor import ADKDocumentProcessor
from tools.document_processing.batch_processor import BatchDocumentProcessor, BatchProcessingConfig
from tools.document_processing.document_validator import DocumentValidator
from tools.document_processing.migration_utils import ComprehensiveMigrationManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DocumentProcessingRequest:
    """Request for document processing"""
    request_id: str
    file_paths: List[str]
    processing_type: str  # "single", "batch", "migration"
    options: Dict[str, Any]
    requester: str
    timestamp: str

@dataclass
class DocumentProcessingResponse:
    """Response from document processing"""
    request_id: str
    success: bool
    results: List[Dict[str, Any]]
    error_message: Optional[str] = None
    processing_time_seconds: float = 0.0
    timestamp: str = ""

class DocumentProcessingAPI:
    """High-level API for document processing operations"""

    def __init__(self,
                 adk_processor: ADKDocumentProcessor,
                 enable_validation: bool = True,
                 enable_monitoring: bool = True):
        """
        Initialize document processing API

        Args:
            adk_processor: ADK document processor instance
            enable_validation: Whether to enable document validation
            enable_monitoring: Whether to enable monitoring
        """
        self.adk_processor = adk_processor
        self.enable_validation = enable_validation
        self.enable_monitoring = enable_monitoring

        # Initialize components
        if enable_validation:
            self.validator = DocumentValidator()

        self.batch_processor = BatchDocumentProcessor(adk_processor)
        self.migration_manager = ComprehensiveMigrationManager(adk_processor)

        # Request tracking
        self.active_requests: Dict[str, DocumentProcessingRequest] = {}
        self.request_history: List[DocumentProcessingResponse] = []

        # Monitoring
        self.api_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_documents_processed": 0,
            "total_processing_time_seconds": 0.0
        }

    def generate_request_id(self) -> str:
        """Generate unique request ID"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        return f"req_{timestamp}"

    async def process_single_document(self,
                                     file_path: str,
                                     requester: str = "api",
                                     validate_first: bool = None,
                                     **options) -> DocumentProcessingResponse:
        """
        Process a single document

        Args:
            file_path: Path to the document
            requester: Identifier of the requester
            validate_first: Whether to validate before processing
            **options: Additional processing options

        Returns:
            DocumentProcessingResponse
        """
        request_id = self.generate_request_id()
        start_time = datetime.now()

        # Create request
        request = DocumentProcessingRequest(
            request_id=request_id,
            file_paths=[file_path],
            processing_type="single",
            options=options,
            requester=requester,
            timestamp=start_time.isoformat()
        )

        self.active_requests[request_id] = request
        self.api_stats["total_requests"] += 1

        try:
            logger.info(f"Processing single document: {file_path} (Request: {request_id})")

            # Validate if requested
            if validate_first or (validate_first is None and self.enable_validation):
                validation_report = self.validator.validate_document(file_path)
                if not validation_report.is_valid:
                    error_msg = f"Document validation failed: {validation_report.error_count} errors"
                    return self._create_error_response(request_id, error_msg, start_time)

            # Process document
            result = await self.adk_processor.upload_file_to_rag_corpus(
                file_path,
                display_name=options.get("display_name"),
                description=options.get("description")
            )

            # Create response
            processing_time = (datetime.now() - start_time).total_seconds()

            response = DocumentProcessingResponse(
                request_id=request_id,
                success=result.get("success", False),
                results=[result],
                processing_time_seconds=processing_time,
                timestamp=datetime.now().isoformat()
            )

            # Update statistics
            if response.success:
                self.api_stats["successful_requests"] += 1
                self.api_stats["total_documents_processed"] += 1
            else:
                self.api_stats["failed_requests"] += 1
                response.error_message = result.get("error", "Unknown error")

            self.api_stats["total_processing_time_seconds"] += processing_time

            logger.info(f"Single document processing completed: {response.success} (Request: {request_id})")
            return response

        except Exception as e:
            error_msg = f"Error processing document: {str(e)}"
            logger.error(f"Single document processing failed: {error_msg} (Request: {request_id})")
            return self._create_error_response(request_id, error_msg, start_time)

        finally:
            # Clean up
            if request_id in self.active_requests:
                del self.active_requests[request_id]

    async def process_batch_documents(self,
                                     file_paths: List[str],
                                     requester: str = "api",
                                     progress_callback: Optional[Callable] = None,
                                     **options) -> DocumentProcessingResponse:
        """
        Process multiple documents in batch

        Args:
            file_paths: List of file paths
            requester: Identifier of the requester
            progress_callback: Optional progress callback
            **options: Additional processing options

        Returns:
            DocumentProcessingResponse
        """
        request_id = self.generate_request_id()
        start_time = datetime.now()

        # Create request
        request = DocumentProcessingRequest(
            request_id=request_id,
            file_paths=file_paths,
            processing_type="batch",
            options=options,
            requester=requester,
            timestamp=start_time.isoformat()
        )

        self.active_requests[request_id] = request
        self.api_stats["total_requests"] += 1

        try:
            logger.info(f"Processing batch of {len(file_paths)} documents (Request: {request_id})")

            # Process batch
            batch_result = await self.batch_processor.process_batch(
                file_paths,
                progress_callback=progress_callback,
                validate_first=options.get("validate_first", self.enable_validation)
            )

            # Create response
            processing_time = (datetime.now() - start_time).total_seconds()

            response = DocumentProcessingResponse(
                request_id=request_id,
                success=batch_result.get("success", False),
                results=batch_result.get("results", []),
                processing_time_seconds=processing_time,
                timestamp=datetime.now().isoformat()
            )

            # Update statistics
            if response.success:
                self.api_stats["successful_requests"] += 1
                successful_docs = batch_result.get("processing_stats", {}).get("successful_files", 0)
                self.api_stats["total_documents_processed"] += successful_docs
            else:
                self.api_stats["failed_requests"] += 1
                response.error_message = batch_result.get("error", "Unknown batch processing error")

            self.api_stats["total_processing_time_seconds"] += processing_time

            logger.info(f"Batch processing completed: {response.success} (Request: {request_id})")
            return response

        except Exception as e:
            error_msg = f"Error processing batch: {str(e)}"
            logger.error(f"Batch processing failed: {error_msg} (Request: {request_id})")
            return self._create_error_response(request_id, error_msg, start_time)

        finally:
            # Clean up
            if request_id in self.active_requests:
                del self.active_requests[request_id]

    async def migrate_documents(self,
                               source_directory: str,
                               requester: str = "api",
                               progress_callback: Optional[Callable] = None,
                               **options) -> DocumentProcessingResponse:
        """
        Migrate documents from legacy system

        Args:
            source_directory: Source directory containing documents
            requester: Identifier of the requester
            progress_callback: Optional progress callback
            **options: Additional migration options

        Returns:
            DocumentProcessingResponse
        """
        request_id = self.generate_request_id()
        start_time = datetime.now()

        # Get file list for request tracking
        try:
            file_paths = self.adk_processor.process_directory(source_directory)
        except:
            file_paths = []

        # Create request
        request = DocumentProcessingRequest(
            request_id=request_id,
            file_paths=file_paths,
            processing_type="migration",
            options=options,
            requester=requester,
            timestamp=start_time.isoformat()
        )

        self.active_requests[request_id] = request
        self.api_stats["total_requests"] += 1

        try:
            logger.info(f"Migrating documents from {source_directory} (Request: {request_id})")

            # Perform migration
            migration_result = await self.migration_manager.migrate_documents_from_filesystem(
                source_directory,
                file_extensions=options.get("file_extensions"),
                progress_callback=progress_callback
            )

            # Create response
            processing_time = (datetime.now() - start_time).total_seconds()

            response = DocumentProcessingResponse(
                request_id=request_id,
                success=migration_result.get("success", False),
                results=[migration_result],
                processing_time_seconds=processing_time,
                timestamp=datetime.now().isoformat()
            )

            # Update statistics
            if response.success:
                self.api_stats["successful_requests"] += 1
                successful_docs = migration_result.get("migration_summary", {}).get("successful_migrations", 0)
                self.api_stats["total_documents_processed"] += successful_docs
            else:
                self.api_stats["failed_requests"] += 1
                response.error_message = migration_result.get("error", "Unknown migration error")

            self.api_stats["total_processing_time_seconds"] += processing_time

            logger.info(f"Migration completed: {response.success} (Request: {request_id})")
            return response

        except Exception as e:
            error_msg = f"Error during migration: {str(e)}"
            logger.error(f"Migration failed: {error_msg} (Request: {request_id})")
            return self._create_error_response(request_id, error_msg, start_time)

        finally:
            # Clean up
            if request_id in self.active_requests:
                del self.active_requests[request_id]

    def _create_error_response(self,
                              request_id: str,
                              error_message: str,
                              start_time: datetime) -> DocumentProcessingResponse:
        """Create error response"""
        processing_time = (datetime.now() - start_time).total_seconds()
        self.api_stats["failed_requests"] += 1
        self.api_stats["total_processing_time_seconds"] += processing_time

        return DocumentProcessingResponse(
            request_id=request_id,
            success=False,
            results=[],
            error_message=error_message,
            processing_time_seconds=processing_time,
            timestamp=datetime.now().isoformat()
        )

    def get_api_statistics(self) -> Dict[str, Any]:
        """Get API statistics"""
        stats = self.api_stats.copy()

        # Calculate derived statistics
        if stats["total_requests"] > 0:
            stats["success_rate"] = stats["successful_requests"] / stats["total_requests"]
        else:
            stats["success_rate"] = 0.0

        if stats["successful_requests"] > 0:
            stats["avg_processing_time_seconds"] = stats["total_processing_time_seconds"] / stats["successful_requests"]
        else:
            stats["avg_processing_time_seconds"] = 0.0

        stats["active_requests_count"] = len(self.active_requests)

        return stats

    def get_active_requests(self) -> List[Dict[str, Any]]:
        """Get list of active requests"""
        return [asdict(request) for request in self.active_requests.values()]

class ADKDocumentProcessingTools:
    """ADK-compatible tools for document processing"""

    def __init__(self, api: DocumentProcessingAPI):
        """
        Initialize ADK tools

        Args:
            api: Document processing API instance
        """
        self.api = api

        if not ADK_AVAILABLE:
            logger.warning("Google ADK not available - tools will have limited functionality")

    def create_function_tools(self) -> List[FunctionTool]:
        """Create ADK FunctionTool instances for document processing"""
        if not ADK_AVAILABLE:
            return []

        tools = []

        # Single document processing tool
        async def process_document_tool(file_path: str,
                                       display_name: str = None,
                                       description: str = None,
                                       validate_first: bool = True) -> Dict[str, Any]:
            """
            Process a single document and upload to RAG Corpus

            Args:
                file_path: Path to the document file
                display_name: Optional display name for the document
                description: Optional description of the document
                validate_first: Whether to validate the document before processing

            Returns:
                Dictionary containing processing results
            """
            try:
                response = await self.api.process_single_document(
                    file_path=file_path,
                    requester="adk_tool",
                    validate_first=validate_first,
                    display_name=display_name,
                    description=description
                )

                return {
                    "success": response.success,
                    "request_id": response.request_id,
                    "results": response.results,
                    "error_message": response.error_message,
                    "processing_time_seconds": response.processing_time_seconds
                }

            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"Tool execution error: {str(e)}"
                }

        tools.append(FunctionTool(process_document_tool))

        # Batch processing tool
        async def process_batch_documents_tool(file_paths: List[str],
                                              validate_first: bool = True,
                                              max_concurrent: int = 5) -> Dict[str, Any]:
            """
            Process multiple documents in batch

            Args:
                file_paths: List of file paths to process
                validate_first: Whether to validate documents before processing
                max_concurrent: Maximum number of concurrent uploads

            Returns:
                Dictionary containing batch processing results
            """
            try:
                response = await self.api.process_batch_documents(
                    file_paths=file_paths,
                    requester="adk_tool",
                    validate_first=validate_first,
                    max_concurrent=max_concurrent
                )

                return {
                    "success": response.success,
                    "request_id": response.request_id,
                    "total_files": len(file_paths),
                    "results_summary": {
                        "successful": sum(1 for r in response.results if r.get("success", False)),
                        "failed": sum(1 for r in response.results if not r.get("success", False))
                    },
                    "error_message": response.error_message,
                    "processing_time_seconds": response.processing_time_seconds
                }

            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"Tool execution error: {str(e)}"
                }

        tools.append(FunctionTool(process_batch_documents_tool))

        # Migration tool
        async def migrate_documents_tool(source_directory: str,
                                        file_extensions: List[str] = None) -> Dict[str, Any]:
            """
            Migrate documents from a directory to ADK RAG Corpus

            Args:
                source_directory: Directory containing documents to migrate
                file_extensions: List of file extensions to include (e.g., ['.pdf', '.txt'])

            Returns:
                Dictionary containing migration results
            """
            try:
                response = await self.api.migrate_documents(
                    source_directory=source_directory,
                    requester="adk_tool",
                    file_extensions=file_extensions
                )

                migration_summary = response.results[0].get("migration_summary", {}) if response.results else {}

                return {
                    "success": response.success,
                    "request_id": response.request_id,
                    "migration_summary": migration_summary,
                    "error_message": response.error_message,
                    "processing_time_seconds": response.processing_time_seconds
                }

            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"Tool execution error: {str(e)}"
                }

        tools.append(FunctionTool(migrate_documents_tool))

        # Validation tool
        def validate_documents_tool(file_paths: List[str]) -> Dict[str, Any]:
            """
            Validate documents before processing

            Args:
                file_paths: List of file paths to validate

            Returns:
                Dictionary containing validation results
            """
            try:
                if not self.api.enable_validation:
                    return {
                        "success": False,
                        "error_message": "Document validation is disabled"
                    }

                validation_reports = self.api.validator.validate_batch(file_paths)

                valid_files = [r.file_path for r in validation_reports if r.is_valid]
                invalid_files = [
                    {"file": r.file_path, "errors": r.error_count, "warnings": r.warning_count}
                    for r in validation_reports if not r.is_valid
                ]

                return {
                    "success": True,
                    "total_files": len(file_paths),
                    "valid_files": valid_files,
                    "invalid_files": invalid_files,
                    "validation_summary": {
                        "valid_count": len(valid_files),
                        "invalid_count": len(invalid_files),
                        "total_errors": sum(r.error_count for r in validation_reports),
                        "total_warnings": sum(r.warning_count for r in validation_reports)
                    }
                }

            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"Tool execution error: {str(e)}"
                }

        tools.append(FunctionTool(validate_documents_tool))

        # Status tool
        def get_processing_status_tool() -> Dict[str, Any]:
            """
            Get current document processing status and statistics

            Returns:
                Dictionary containing processing status and statistics
            """
            try:
                api_stats = self.api.get_api_statistics()
                active_requests = self.api.get_active_requests()
                processor_stats = self.api.adk_processor.get_processing_statistics()

                return {
                    "success": True,
                    "api_statistics": api_stats,
                    "active_requests": active_requests,
                    "processor_statistics": processor_stats,
                    "timestamp": datetime.now().isoformat()
                }

            except Exception as e:
                return {
                    "success": False,
                    "error_message": f"Tool execution error: {str(e)}"
                }

        tools.append(FunctionTool(get_processing_status_tool))

        return tools

class DocumentLifecycleManager:
    """Manages document lifecycle in ADK system"""

    def __init__(self,
                 adk_processor: ADKDocumentProcessor,
                 memory_service: Optional[VertexAiRagMemoryService] = None):
        """
        Initialize lifecycle manager

        Args:
            adk_processor: ADK document processor instance
            memory_service: Optional ADK memory service
        """
        self.adk_processor = adk_processor
        self.memory_service = memory_service

        # Document tracking
        self.document_registry: Dict[str, Dict[str, Any]] = {}
        self.lifecycle_log: List[Dict[str, Any]] = []

    def register_document(self,
                         document_id: str,
                         metadata: Dict[str, Any],
                         lifecycle_stage: str = "uploaded") -> bool:
        """
        Register a document in the lifecycle system

        Args:
            document_id: Unique document identifier
            metadata: Document metadata
            lifecycle_stage: Current lifecycle stage

        Returns:
            True if successful, False otherwise
        """
        try:
            self.document_registry[document_id] = {
                "document_id": document_id,
                "metadata": metadata,
                "lifecycle_stage": lifecycle_stage,
                "registered_timestamp": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }

            # Log lifecycle event
            self._log_lifecycle_event(document_id, "registered", {"stage": lifecycle_stage})

            logger.info(f"Document registered: {document_id} (stage: {lifecycle_stage})")
            return True

        except Exception as e:
            logger.error(f"Error registering document {document_id}: {str(e)}")
            return False

    def update_document_stage(self,
                             document_id: str,
                             new_stage: str,
                             metadata_updates: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update document lifecycle stage

        Args:
            document_id: Document identifier
            new_stage: New lifecycle stage
            metadata_updates: Optional metadata updates

        Returns:
            True if successful, False otherwise
        """
        try:
            if document_id not in self.document_registry:
                logger.warning(f"Document not found in registry: {document_id}")
                return False

            old_stage = self.document_registry[document_id]["lifecycle_stage"]
            self.document_registry[document_id]["lifecycle_stage"] = new_stage
            self.document_registry[document_id]["last_updated"] = datetime.now().isoformat()

            if metadata_updates:
                self.document_registry[document_id]["metadata"].update(metadata_updates)

            # Log lifecycle event
            self._log_lifecycle_event(document_id, "stage_updated", {
                "old_stage": old_stage,
                "new_stage": new_stage,
                "metadata_updates": metadata_updates
            })

            logger.info(f"Document stage updated: {document_id} ({old_stage} -> {new_stage})")
            return True

        except Exception as e:
            logger.error(f"Error updating document stage {document_id}: {str(e)}")
            return False

    def _log_lifecycle_event(self,
                            document_id: str,
                            event_type: str,
                            event_data: Dict[str, Any]):
        """Log a lifecycle event"""
        event = {
            "document_id": document_id,
            "event_type": event_type,
            "event_data": event_data,
            "timestamp": datetime.now().isoformat()
        }

        self.lifecycle_log.append(event)

    def get_document_info(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Get document information"""
        return self.document_registry.get(document_id)

    def get_documents_by_stage(self, stage: str) -> List[Dict[str, Any]]:
        """Get documents in a specific lifecycle stage"""
        return [
            doc for doc in self.document_registry.values()
            if doc["lifecycle_stage"] == stage
        ]

    def get_lifecycle_log(self, document_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get lifecycle log, optionally filtered by document ID"""
        if document_id:
            return [event for event in self.lifecycle_log if event["document_id"] == document_id]
        return self.lifecycle_log.copy()

# Utility functions
def create_document_processing_api(adk_processor: ADKDocumentProcessor, **kwargs) -> DocumentProcessingAPI:
    """Create document processing API with default settings"""
    return DocumentProcessingAPI(adk_processor, **kwargs)

def create_adk_tools(api: DocumentProcessingAPI) -> ADKDocumentProcessingTools:
    """Create ADK tools for document processing"""
    return ADKDocumentProcessingTools(api)

def create_lifecycle_manager(adk_processor: ADKDocumentProcessor, **kwargs) -> DocumentLifecycleManager:
    """Create document lifecycle manager"""
    return DocumentLifecycleManager(adk_processor, **kwargs)
