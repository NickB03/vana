#!/usr/bin/env python3
"""
ADK Document Processor for VANA

This module provides Google ADK-based document processing capabilities including:
1. RAG Corpus document upload using vertexai.rag
2. Batch document processing utilities
3. Document metadata management
4. Integration with Google ADK memory systems
"""

import os
import re
import logging
import json
import asyncio
from typing import List, Dict, Any, Optional, Union, BinaryIO, Tuple
from datetime import datetime
from pathlib import Path
import hashlib
import mimetypes

# Google Cloud and ADK imports
try:
    from vertexai import rag
    from google.cloud import aiplatform
    from google.cloud import storage
    from google.adk.memory import VertexAiRagMemoryService
    ADK_SUPPORT = True
except ImportError as e:
    logging.warning(f"ADK/Vertex AI imports not available: {e}")
    ADK_SUPPORT = False

# Import existing semantic chunker for compatibility
from tools.document_processing.semantic_chunker import SemanticChunker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ADKDocumentProcessor:
    """Google ADK-based document processor for VANA"""
    
    def __init__(self, 
                 rag_corpus_name: Optional[str] = None,
                 project_id: Optional[str] = None,
                 location: str = "us-central1",
                 chunker: Optional[SemanticChunker] = None,
                 enable_batch_processing: bool = True,
                 max_file_size_mb: int = 100):
        """
        Initialize the ADK document processor
        
        Args:
            rag_corpus_name: Name of the RAG Corpus for document storage
            project_id: Google Cloud project ID
            location: Google Cloud location
            chunker: Semantic chunker instance (creates one if None)
            enable_batch_processing: Whether to enable batch processing
            max_file_size_mb: Maximum file size in MB
        """
        if not ADK_SUPPORT:
            raise ImportError("Google ADK and Vertex AI libraries are required")
        
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT")
        self.location = location or os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        self.rag_corpus_name = rag_corpus_name or os.getenv("RAG_CORPUS_NAME")
        self.chunker = chunker or SemanticChunker()
        self.enable_batch_processing = enable_batch_processing
        self.max_file_size_mb = max_file_size_mb
        
        # Initialize Vertex AI
        aiplatform.init(project=self.project_id, location=self.location)
        
        # Initialize storage client for file uploads
        self.storage_client = storage.Client(project=self.project_id)
        
        # Document processing statistics
        self.processing_stats = {
            "documents_processed": 0,
            "documents_failed": 0,
            "total_size_mb": 0.0,
            "processing_time_seconds": 0.0
        }
        
        logger.info(f"ADK Document Processor initialized for project {self.project_id}")
        logger.info(f"RAG Corpus: {self.rag_corpus_name}")
    
    def get_rag_corpus_name(self) -> str:
        """Get the full RAG Corpus resource name"""
        if not self.rag_corpus_name:
            raise ValueError("RAG Corpus name not configured")
        
        # If already a full resource name, return as-is
        if self.rag_corpus_name.startswith("projects/"):
            return self.rag_corpus_name
        
        # Otherwise, construct the full resource name
        return f"projects/{self.project_id}/locations/{self.location}/ragCorpora/{self.rag_corpus_name}"
    
    def validate_file(self, file_path: str) -> Tuple[bool, str]:
        """
        Validate a file for processing
        
        Args:
            file_path: Path to the file
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if not os.path.exists(file_path):
                return False, f"File does not exist: {file_path}"
            
            # Check file size
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
            if file_size_mb > self.max_file_size_mb:
                return False, f"File too large: {file_size_mb:.2f}MB > {self.max_file_size_mb}MB"
            
            # Check file type
            mime_type, _ = mimetypes.guess_type(file_path)
            supported_types = {
                'application/pdf',
                'text/plain',
                'text/markdown',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'image/jpeg',
                'image/png',
                'image/gif'
            }
            
            if mime_type not in supported_types:
                return False, f"Unsupported file type: {mime_type}"
            
            return True, ""
            
        except Exception as e:
            return False, f"Error validating file: {str(e)}"
    
    def generate_document_id(self, file_path: str, content_hash: Optional[str] = None) -> str:
        """
        Generate a unique document ID
        
        Args:
            file_path: Path to the file
            content_hash: Optional content hash
            
        Returns:
            Unique document ID
        """
        # Use file path and timestamp for uniqueness
        base_name = os.path.basename(file_path)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        if content_hash:
            return f"{base_name}_{timestamp}_{content_hash[:8]}"
        else:
            return f"{base_name}_{timestamp}"
    
    def calculate_content_hash(self, file_path: str) -> str:
        """
        Calculate SHA-256 hash of file content
        
        Args:
            file_path: Path to the file
            
        Returns:
            SHA-256 hash of the content
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Extract metadata from a file
        
        Args:
            file_path: Path to the file
            
        Returns:
            Dictionary containing file metadata
        """
        try:
            stat = os.stat(file_path)
            mime_type, encoding = mimetypes.guess_type(file_path)
            
            metadata = {
                "file_name": os.path.basename(file_path),
                "file_path": file_path,
                "file_size_bytes": stat.st_size,
                "file_size_mb": round(stat.st_size / (1024 * 1024), 2),
                "mime_type": mime_type,
                "encoding": encoding,
                "created_time": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "processed_time": datetime.now().isoformat(),
                "content_hash": self.calculate_content_hash(file_path)
            }
            
            return metadata
            
        except Exception as e:
            logger.error(f"Error extracting metadata from {file_path}: {str(e)}")
            return {
                "file_name": os.path.basename(file_path),
                "file_path": file_path,
                "error": str(e),
                "processed_time": datetime.now().isoformat()
            }
    
    async def upload_file_to_rag_corpus(self, 
                                       file_path: str, 
                                       display_name: Optional[str] = None,
                                       description: Optional[str] = None) -> Dict[str, Any]:
        """
        Upload a file to the RAG Corpus using vertexai.rag.upload_file
        
        Args:
            file_path: Path to the file to upload
            display_name: Display name for the file
            description: Description of the file
            
        Returns:
            Dictionary containing upload result and metadata
        """
        start_time = datetime.now()
        
        try:
            # Validate file
            is_valid, error_msg = self.validate_file(file_path)
            if not is_valid:
                return {
                    "success": False,
                    "error": error_msg,
                    "file_path": file_path
                }
            
            # Extract metadata
            metadata = self.extract_metadata(file_path)
            
            # Generate document ID
            doc_id = self.generate_document_id(file_path, metadata.get("content_hash"))
            
            # Set display name if not provided
            if not display_name:
                display_name = metadata["file_name"]
            
            # Upload file to RAG Corpus
            logger.info(f"Uploading {file_path} to RAG Corpus...")
            
            # Use vertexai.rag.upload_file
            upload_response = await rag.upload_file(
                corpus_name=self.get_rag_corpus_name(),
                path=file_path,
                display_name=display_name,
                description=description or f"Document uploaded from {file_path}"
            )
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Update statistics
            self.processing_stats["documents_processed"] += 1
            self.processing_stats["total_size_mb"] += metadata["file_size_mb"]
            self.processing_stats["processing_time_seconds"] += processing_time
            
            result = {
                "success": True,
                "document_id": doc_id,
                "rag_file_name": upload_response.name,
                "display_name": display_name,
                "metadata": metadata,
                "processing_time_seconds": processing_time,
                "upload_response": {
                    "name": upload_response.name,
                    "state": str(upload_response.state) if hasattr(upload_response, 'state') else 'unknown'
                }
            }
            
            logger.info(f"Successfully uploaded {file_path} as {upload_response.name}")
            return result
            
        except Exception as e:
            # Update failure statistics
            self.processing_stats["documents_failed"] += 1
            
            error_msg = f"Error uploading {file_path} to RAG Corpus: {str(e)}"
            logger.error(error_msg)
            
            return {
                "success": False,
                "error": error_msg,
                "file_path": file_path,
                "processing_time_seconds": (datetime.now() - start_time).total_seconds()
            }
    
    async def batch_upload_files(self, 
                                file_paths: List[str],
                                max_concurrent: int = 5,
                                progress_callback: Optional[callable] = None) -> List[Dict[str, Any]]:
        """
        Upload multiple files to RAG Corpus in batches
        
        Args:
            file_paths: List of file paths to upload
            max_concurrent: Maximum number of concurrent uploads
            progress_callback: Optional callback function for progress updates
            
        Returns:
            List of upload results
        """
        if not self.enable_batch_processing:
            raise ValueError("Batch processing is disabled")
        
        logger.info(f"Starting batch upload of {len(file_paths)} files")
        
        # Create semaphore to limit concurrent uploads
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def upload_with_semaphore(file_path: str, index: int) -> Dict[str, Any]:
            async with semaphore:
                result = await self.upload_file_to_rag_corpus(file_path)
                
                # Call progress callback if provided
                if progress_callback:
                    progress_callback(index + 1, len(file_paths), result)
                
                return result
        
        # Create tasks for all uploads
        tasks = [
            upload_with_semaphore(file_path, i) 
            for i, file_path in enumerate(file_paths)
        ]
        
        # Execute all uploads concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results and handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    "success": False,
                    "error": str(result),
                    "file_path": file_paths[i]
                })
            else:
                processed_results.append(result)
        
        # Log summary
        successful = sum(1 for r in processed_results if r.get("success", False))
        failed = len(processed_results) - successful
        
        logger.info(f"Batch upload completed: {successful} successful, {failed} failed")
        
        return processed_results
    
    def import_files_from_gcs(self, 
                             gcs_uri: str,
                             chunk_size: int = 1000,
                             max_embedding_requests_per_min: int = 1000) -> Dict[str, Any]:
        """
        Import files from Google Cloud Storage using vertexai.rag.import_files
        
        Args:
            gcs_uri: GCS URI containing files to import
            chunk_size: Size of chunks for processing
            max_embedding_requests_per_min: Rate limit for embedding requests
            
        Returns:
            Dictionary containing import result
        """
        try:
            logger.info(f"Importing files from GCS: {gcs_uri}")
            
            # Use vertexai.rag.import_files for bulk import
            import_response = rag.import_files(
                corpus_name=self.get_rag_corpus_name(),
                paths=[gcs_uri],
                chunk_size=chunk_size,
                max_embedding_requests_per_min=max_embedding_requests_per_min
            )
            
            result = {
                "success": True,
                "import_response": {
                    "name": import_response.name if hasattr(import_response, 'name') else 'unknown',
                    "operation_id": str(import_response) if import_response else 'unknown'
                },
                "gcs_uri": gcs_uri,
                "chunk_size": chunk_size,
                "max_embedding_requests_per_min": max_embedding_requests_per_min
            }
            
            logger.info(f"Successfully initiated import from {gcs_uri}")
            return result
            
        except Exception as e:
            error_msg = f"Error importing files from {gcs_uri}: {str(e)}"
            logger.error(error_msg)
            
            return {
                "success": False,
                "error": error_msg,
                "gcs_uri": gcs_uri
            }
    
    def process_directory(self, 
                         directory_path: str,
                         file_extensions: Optional[List[str]] = None,
                         recursive: bool = True) -> List[str]:
        """
        Get list of files in a directory for processing
        
        Args:
            directory_path: Path to the directory
            file_extensions: List of file extensions to include (e.g., ['.pdf', '.txt'])
            recursive: Whether to search recursively
            
        Returns:
            List of file paths
        """
        if not os.path.exists(directory_path):
            raise ValueError(f"Directory does not exist: {directory_path}")
        
        if file_extensions is None:
            file_extensions = ['.pdf', '.txt', '.md', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.gif']
        
        file_paths = []
        
        if recursive:
            for root, dirs, files in os.walk(directory_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    if any(file.lower().endswith(ext.lower()) for ext in file_extensions):
                        file_paths.append(file_path)
        else:
            for file in os.listdir(directory_path):
                file_path = os.path.join(directory_path, file)
                if os.path.isfile(file_path) and any(file.lower().endswith(ext.lower()) for ext in file_extensions):
                    file_paths.append(file_path)
        
        logger.info(f"Found {len(file_paths)} files in {directory_path}")
        return file_paths
    
    def get_processing_statistics(self) -> Dict[str, Any]:
        """
        Get document processing statistics
        
        Returns:
            Dictionary containing processing statistics
        """
        stats = self.processing_stats.copy()
        
        # Calculate derived statistics
        total_docs = stats["documents_processed"] + stats["documents_failed"]
        if total_docs > 0:
            stats["success_rate"] = stats["documents_processed"] / total_docs
        else:
            stats["success_rate"] = 0.0
        
        if stats["documents_processed"] > 0:
            stats["avg_processing_time_seconds"] = stats["processing_time_seconds"] / stats["documents_processed"]
            stats["avg_file_size_mb"] = stats["total_size_mb"] / stats["documents_processed"]
        else:
            stats["avg_processing_time_seconds"] = 0.0
            stats["avg_file_size_mb"] = 0.0
        
        return stats
    
    def reset_statistics(self):
        """Reset processing statistics"""
        self.processing_stats = {
            "documents_processed": 0,
            "documents_failed": 0,
            "total_size_mb": 0.0,
            "processing_time_seconds": 0.0
        }
        logger.info("Processing statistics reset")


class ADKDocumentMigrator:
    """Utility class for migrating documents from legacy systems to ADK"""
    
    def __init__(self, 
                 adk_processor: ADKDocumentProcessor,
                 legacy_processor: Optional[Any] = None):
        """
        Initialize the document migrator
        
        Args:
            adk_processor: ADK document processor instance
            legacy_processor: Legacy document processor instance
        """
        self.adk_processor = adk_processor
        self.legacy_processor = legacy_processor
        
        # Migration tracking
        self.migration_log = []
    
    def validate_migration_source(self, source_path: str) -> Tuple[bool, str, List[str]]:
        """
        Validate migration source and get file list
        
        Args:
            source_path: Path to source directory or file
            
        Returns:
            Tuple of (is_valid, error_message, file_list)
        """
        try:
            if os.path.isfile(source_path):
                is_valid, error_msg = self.adk_processor.validate_file(source_path)
                if is_valid:
                    return True, "", [source_path]
                else:
                    return False, error_msg, []
            
            elif os.path.isdir(source_path):
                file_list = self.adk_processor.process_directory(source_path)
                if not file_list:
                    return False, "No supported files found in directory", []
                
                # Validate each file
                valid_files = []
                invalid_files = []
                
                for file_path in file_list:
                    is_valid, _ = self.adk_processor.validate_file(file_path)
                    if is_valid:
                        valid_files.append(file_path)
                    else:
                        invalid_files.append(file_path)
                
                if not valid_files:
                    return False, f"No valid files found. Invalid files: {len(invalid_files)}", []
                
                if invalid_files:
                    logger.warning(f"Found {len(invalid_files)} invalid files that will be skipped")
                
                return True, "", valid_files
            
            else:
                return False, f"Source path does not exist: {source_path}", []
                
        except Exception as e:
            return False, f"Error validating migration source: {str(e)}", []
    
    async def migrate_documents(self, 
                               source_path: str,
                               progress_callback: Optional[callable] = None,
                               dry_run: bool = False) -> Dict[str, Any]:
        """
        Migrate documents from legacy system to ADK
        
        Args:
            source_path: Path to source directory or file
            progress_callback: Optional callback for progress updates
            dry_run: If True, only validate without actually migrating
            
        Returns:
            Dictionary containing migration results
        """
        migration_start = datetime.now()
        
        try:
            # Validate migration source
            is_valid, error_msg, file_list = self.validate_migration_source(source_path)
            if not is_valid:
                return {
                    "success": False,
                    "error": error_msg,
                    "source_path": source_path
                }
            
            logger.info(f"Starting migration of {len(file_list)} files from {source_path}")
            
            if dry_run:
                logger.info("DRY RUN: No files will be actually migrated")
                return {
                    "success": True,
                    "dry_run": True,
                    "files_to_migrate": len(file_list),
                    "file_list": file_list,
                    "source_path": source_path
                }
            
            # Perform actual migration
            migration_results = await self.adk_processor.batch_upload_files(
                file_list, 
                progress_callback=progress_callback
            )
            
            # Analyze results
            successful_migrations = [r for r in migration_results if r.get("success", False)]
            failed_migrations = [r for r in migration_results if not r.get("success", False)]
            
            migration_time = (datetime.now() - migration_start).total_seconds()
            
            # Log migration
            migration_record = {
                "timestamp": migration_start.isoformat(),
                "source_path": source_path,
                "total_files": len(file_list),
                "successful": len(successful_migrations),
                "failed": len(failed_migrations),
                "migration_time_seconds": migration_time,
                "results": migration_results
            }
            
            self.migration_log.append(migration_record)
            
            result = {
                "success": True,
                "migration_summary": {
                    "total_files": len(file_list),
                    "successful_migrations": len(successful_migrations),
                    "failed_migrations": len(failed_migrations),
                    "success_rate": len(successful_migrations) / len(file_list) if file_list else 0,
                    "migration_time_seconds": migration_time
                },
                "detailed_results": migration_results,
                "source_path": source_path
            }
            
            logger.info(f"Migration completed: {len(successful_migrations)}/{len(file_list)} files successful")
            return result
            
        except Exception as e:
            error_msg = f"Error during migration: {str(e)}"
            logger.error(error_msg)
            
            return {
                "success": False,
                "error": error_msg,
                "source_path": source_path,
                "migration_time_seconds": (datetime.now() - migration_start).total_seconds()
            }
    
    def get_migration_history(self) -> List[Dict[str, Any]]:
        """
        Get migration history
        
        Returns:
            List of migration records
        """
        return self.migration_log.copy()
    
    def export_migration_report(self, output_path: str) -> bool:
        """
        Export migration report to JSON file
        
        Args:
            output_path: Path to output file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            report = {
                "migration_history": self.migration_log,
                "processor_statistics": self.adk_processor.get_processing_statistics(),
                "report_generated": datetime.now().isoformat()
            }
            
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"Migration report exported to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting migration report: {str(e)}")
            return False


# Utility functions for easy access
def create_adk_processor(**kwargs) -> ADKDocumentProcessor:
    """Create an ADK document processor with default settings"""
    return ADKDocumentProcessor(**kwargs)

def create_migrator(adk_processor: ADKDocumentProcessor, **kwargs) -> ADKDocumentMigrator:
    """Create a document migrator"""
    return ADKDocumentMigrator(adk_processor, **kwargs)

async def quick_upload(file_path: str, **processor_kwargs) -> Dict[str, Any]:
    """Quick upload of a single file"""
    processor = create_adk_processor(**processor_kwargs)
    return await processor.upload_file_to_rag_corpus(file_path)

async def quick_batch_upload(file_paths: List[str], **processor_kwargs) -> List[Dict[str, Any]]:
    """Quick batch upload of multiple files"""
    processor = create_adk_processor(**processor_kwargs)
    return await processor.batch_upload_files(file_paths)
