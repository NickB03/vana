#!/usr/bin/env python3
"""
Batch Document Processing Utilities for VANA ADK

This module provides utilities for batch processing documents including:
1. Batch upload management
2. Progress tracking and monitoring
3. Error handling and retry logic
4. Performance optimization
"""

import os
import asyncio
import logging
import json
import time
from typing import List, Dict, Any, Optional, Callable, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path
import concurrent.futures
from collections import defaultdict

from tools.document_processing.adk_document_processor import ADKDocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BatchProcessingConfig:
    """Configuration for batch processing"""
    max_concurrent_uploads: int = 5
    max_retries: int = 3
    retry_delay_seconds: float = 1.0
    retry_backoff_multiplier: float = 2.0
    progress_update_interval: int = 10
    enable_performance_monitoring: bool = True
    chunk_size: int = 100
    timeout_seconds: int = 300

@dataclass
class ProcessingResult:
    """Result of processing a single file"""
    file_path: str
    success: bool
    document_id: Optional[str] = None
    rag_file_name: Optional[str] = None
    error: Optional[str] = None
    processing_time_seconds: float = 0.0
    retry_count: int = 0
    file_size_mb: float = 0.0

@dataclass
class BatchProcessingStats:
    """Statistics for batch processing"""
    total_files: int = 0
    processed_files: int = 0
    successful_files: int = 0
    failed_files: int = 0
    total_size_mb: float = 0.0
    total_processing_time_seconds: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate"""
        if self.processed_files == 0:
            return 0.0
        return self.successful_files / self.processed_files
    
    @property
    def avg_processing_time_seconds(self) -> float:
        """Calculate average processing time"""
        if self.successful_files == 0:
            return 0.0
        return self.total_processing_time_seconds / self.successful_files
    
    @property
    def throughput_files_per_second(self) -> float:
        """Calculate throughput in files per second"""
        if not self.start_time or not self.end_time:
            return 0.0
        
        duration = (self.end_time - self.start_time).total_seconds()
        if duration == 0:
            return 0.0
        
        return self.processed_files / duration

class ProgressTracker:
    """Progress tracking for batch operations"""
    
    def __init__(self, total_files: int, update_interval: int = 10):
        self.total_files = total_files
        self.update_interval = update_interval
        self.processed_files = 0
        self.successful_files = 0
        self.failed_files = 0
        self.start_time = datetime.now()
        self.last_update_time = self.start_time
        self.callbacks: List[Callable] = []
    
    def add_callback(self, callback: Callable):
        """Add a progress callback function"""
        self.callbacks.append(callback)
    
    def update(self, result: ProcessingResult):
        """Update progress with a processing result"""
        self.processed_files += 1
        
        if result.success:
            self.successful_files += 1
        else:
            self.failed_files += 1
        
        # Check if we should send an update
        now = datetime.now()
        if (self.processed_files % self.update_interval == 0 or 
            self.processed_files == self.total_files or
            (now - self.last_update_time).total_seconds() >= 30):
            
            self._send_update()
            self.last_update_time = now
    
    def _send_update(self):
        """Send progress update to all callbacks"""
        progress_info = {
            "total_files": self.total_files,
            "processed_files": self.processed_files,
            "successful_files": self.successful_files,
            "failed_files": self.failed_files,
            "progress_percentage": (self.processed_files / self.total_files) * 100,
            "elapsed_time_seconds": (datetime.now() - self.start_time).total_seconds()
        }
        
        for callback in self.callbacks:
            try:
                callback(progress_info)
            except Exception as e:
                logger.warning(f"Error in progress callback: {e}")
    
    def get_final_stats(self) -> Dict[str, Any]:
        """Get final processing statistics"""
        end_time = datetime.now()
        duration = (end_time - self.start_time).total_seconds()
        
        return {
            "total_files": self.total_files,
            "processed_files": self.processed_files,
            "successful_files": self.successful_files,
            "failed_files": self.failed_files,
            "success_rate": self.successful_files / self.processed_files if self.processed_files > 0 else 0,
            "duration_seconds": duration,
            "throughput_files_per_second": self.processed_files / duration if duration > 0 else 0,
            "start_time": self.start_time.isoformat(),
            "end_time": end_time.isoformat()
        }

class RetryManager:
    """Manages retry logic for failed operations"""
    
    def __init__(self, config: BatchProcessingConfig):
        self.config = config
        self.retry_counts = defaultdict(int)
    
    async def execute_with_retry(self, 
                                operation: Callable,
                                operation_id: str,
                                *args, **kwargs) -> Tuple[bool, Any, int]:
        """
        Execute an operation with retry logic
        
        Args:
            operation: Async function to execute
            operation_id: Unique identifier for the operation
            *args, **kwargs: Arguments to pass to the operation
            
        Returns:
            Tuple of (success, result, retry_count)
        """
        retry_count = 0
        last_error = None
        
        while retry_count <= self.config.max_retries:
            try:
                result = await operation(*args, **kwargs)
                return True, result, retry_count
                
            except Exception as e:
                last_error = e
                retry_count += 1
                
                if retry_count <= self.config.max_retries:
                    delay = self.config.retry_delay_seconds * (self.config.retry_backoff_multiplier ** (retry_count - 1))
                    logger.warning(f"Operation {operation_id} failed (attempt {retry_count}), retrying in {delay:.2f}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Operation {operation_id} failed after {retry_count} attempts: {e}")
        
        return False, last_error, retry_count

class BatchDocumentProcessor:
    """High-level batch document processor with advanced features"""
    
    def __init__(self, 
                 adk_processor: ADKDocumentProcessor,
                 config: Optional[BatchProcessingConfig] = None):
        """
        Initialize batch processor
        
        Args:
            adk_processor: ADK document processor instance
            config: Batch processing configuration
        """
        self.adk_processor = adk_processor
        self.config = config or BatchProcessingConfig()
        self.retry_manager = RetryManager(self.config)
        
        # Processing state
        self.is_processing = False
        self.current_batch_id = None
        self.processing_history = []
    
    def validate_batch(self, file_paths: List[str]) -> Tuple[List[str], List[str], Dict[str, Any]]:
        """
        Validate a batch of files before processing
        
        Args:
            file_paths: List of file paths to validate
            
        Returns:
            Tuple of (valid_files, invalid_files, validation_summary)
        """
        valid_files = []
        invalid_files = []
        validation_errors = []
        total_size_mb = 0.0
        
        for file_path in file_paths:
            is_valid, error_msg = self.adk_processor.validate_file(file_path)
            
            if is_valid:
                valid_files.append(file_path)
                try:
                    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
                    total_size_mb += file_size_mb
                except:
                    pass
            else:
                invalid_files.append(file_path)
                validation_errors.append({"file": file_path, "error": error_msg})
        
        validation_summary = {
            "total_files": len(file_paths),
            "valid_files": len(valid_files),
            "invalid_files": len(invalid_files),
            "total_size_mb": total_size_mb,
            "validation_errors": validation_errors
        }
        
        return valid_files, invalid_files, validation_summary
    
    async def process_file_with_retry(self, file_path: str) -> ProcessingResult:
        """
        Process a single file with retry logic
        
        Args:
            file_path: Path to the file to process
            
        Returns:
            ProcessingResult object
        """
        start_time = time.time()
        
        # Get file size for statistics
        try:
            file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        except:
            file_size_mb = 0.0
        
        # Execute with retry
        success, result, retry_count = await self.retry_manager.execute_with_retry(
            self.adk_processor.upload_file_to_rag_corpus,
            f"upload_{os.path.basename(file_path)}",
            file_path
        )
        
        processing_time = time.time() - start_time
        
        if success and result.get("success", False):
            return ProcessingResult(
                file_path=file_path,
                success=True,
                document_id=result.get("document_id"),
                rag_file_name=result.get("rag_file_name"),
                processing_time_seconds=processing_time,
                retry_count=retry_count,
                file_size_mb=file_size_mb
            )
        else:
            error_msg = str(result) if not success else result.get("error", "Unknown error")
            return ProcessingResult(
                file_path=file_path,
                success=False,
                error=error_msg,
                processing_time_seconds=processing_time,
                retry_count=retry_count,
                file_size_mb=file_size_mb
            )
    
    async def process_batch(self, 
                           file_paths: List[str],
                           progress_callback: Optional[Callable] = None,
                           validate_first: bool = True) -> Dict[str, Any]:
        """
        Process a batch of files with advanced features
        
        Args:
            file_paths: List of file paths to process
            progress_callback: Optional progress callback function
            validate_first: Whether to validate files before processing
            
        Returns:
            Dictionary containing batch processing results
        """
        if self.is_processing:
            raise RuntimeError("Batch processing is already in progress")
        
        self.is_processing = True
        batch_start_time = datetime.now()
        self.current_batch_id = f"batch_{batch_start_time.strftime('%Y%m%d_%H%M%S')}"
        
        try:
            # Validate files if requested
            if validate_first:
                valid_files, invalid_files, validation_summary = self.validate_batch(file_paths)
                logger.info(f"Validation: {len(valid_files)} valid, {len(invalid_files)} invalid files")
                
                if not valid_files:
                    return {
                        "success": False,
                        "error": "No valid files to process",
                        "validation_summary": validation_summary
                    }
                
                files_to_process = valid_files
            else:
                files_to_process = file_paths
                validation_summary = {"validation_skipped": True}
            
            # Initialize progress tracking
            progress_tracker = ProgressTracker(len(files_to_process), self.config.progress_update_interval)
            
            if progress_callback:
                progress_tracker.add_callback(progress_callback)
            
            # Process files in chunks to manage memory and concurrency
            all_results = []
            chunk_size = self.config.chunk_size
            
            for i in range(0, len(files_to_process), chunk_size):
                chunk = files_to_process[i:i + chunk_size]
                logger.info(f"Processing chunk {i//chunk_size + 1}/{(len(files_to_process) + chunk_size - 1)//chunk_size}")
                
                # Create semaphore for this chunk
                semaphore = asyncio.Semaphore(self.config.max_concurrent_uploads)
                
                async def process_with_semaphore(file_path: str) -> ProcessingResult:
                    async with semaphore:
                        result = await self.process_file_with_retry(file_path)
                        progress_tracker.update(result)
                        return result
                
                # Process chunk concurrently
                chunk_tasks = [process_with_semaphore(fp) for fp in chunk]
                
                try:
                    chunk_results = await asyncio.wait_for(
                        asyncio.gather(*chunk_tasks, return_exceptions=True),
                        timeout=self.config.timeout_seconds
                    )
                    
                    # Handle any exceptions in results
                    for j, result in enumerate(chunk_results):
                        if isinstance(result, Exception):
                            error_result = ProcessingResult(
                                file_path=chunk[j],
                                success=False,
                                error=f"Processing exception: {str(result)}"
                            )
                            all_results.append(error_result)
                        else:
                            all_results.append(result)
                            
                except asyncio.TimeoutError:
                    logger.error(f"Chunk processing timed out after {self.config.timeout_seconds} seconds")
                    # Add timeout results for remaining files in chunk
                    for fp in chunk:
                        timeout_result = ProcessingResult(
                            file_path=fp,
                            success=False,
                            error="Processing timeout"
                        )
                        all_results.append(timeout_result)
            
            # Calculate final statistics
            batch_end_time = datetime.now()
            processing_duration = (batch_end_time - batch_start_time).total_seconds()
            
            successful_results = [r for r in all_results if r.success]
            failed_results = [r for r in all_results if not r.success]
            
            total_size_mb = sum(r.file_size_mb for r in all_results)
            total_processing_time = sum(r.processing_time_seconds for r in successful_results)
            
            batch_stats = BatchProcessingStats(
                total_files=len(files_to_process),
                processed_files=len(all_results),
                successful_files=len(successful_results),
                failed_files=len(failed_results),
                total_size_mb=total_size_mb,
                total_processing_time_seconds=total_processing_time,
                start_time=batch_start_time,
                end_time=batch_end_time
            )
            
            # Create batch result
            batch_result = {
                "success": True,
                "batch_id": self.current_batch_id,
                "validation_summary": validation_summary,
                "processing_stats": asdict(batch_stats),
                "results": [asdict(r) for r in all_results],
                "successful_files": [r.file_path for r in successful_results],
                "failed_files": [{"file": r.file_path, "error": r.error} for r in failed_results],
                "performance_metrics": {
                    "duration_seconds": processing_duration,
                    "throughput_files_per_second": batch_stats.throughput_files_per_second,
                    "avg_processing_time_seconds": batch_stats.avg_processing_time_seconds,
                    "success_rate": batch_stats.success_rate
                }
            }
            
            # Store in processing history
            self.processing_history.append(batch_result)
            
            logger.info(f"Batch processing completed: {len(successful_results)}/{len(all_results)} files successful")
            return batch_result
            
        except Exception as e:
            error_msg = f"Batch processing error: {str(e)}"
            logger.error(error_msg)
            
            return {
                "success": False,
                "error": error_msg,
                "batch_id": self.current_batch_id
            }
            
        finally:
            self.is_processing = False
            self.current_batch_id = None
    
    def get_processing_history(self) -> List[Dict[str, Any]]:
        """Get batch processing history"""
        return self.processing_history.copy()
    
    def export_batch_report(self, batch_id: str, output_path: str) -> bool:
        """
        Export detailed batch report
        
        Args:
            batch_id: ID of the batch to export
            output_path: Path to output file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Find batch in history
            batch_result = None
            for batch in self.processing_history:
                if batch.get("batch_id") == batch_id:
                    batch_result = batch
                    break
            
            if not batch_result:
                logger.error(f"Batch {batch_id} not found in processing history")
                return False
            
            # Create detailed report
            report = {
                "batch_report": batch_result,
                "processor_config": asdict(self.config),
                "adk_processor_stats": self.adk_processor.get_processing_statistics(),
                "report_generated": datetime.now().isoformat()
            }
            
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"Batch report exported to {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting batch report: {str(e)}")
            return False

# Utility functions
def create_batch_processor(adk_processor: ADKDocumentProcessor, **config_kwargs) -> BatchDocumentProcessor:
    """Create a batch processor with custom configuration"""
    config = BatchProcessingConfig(**config_kwargs)
    return BatchDocumentProcessor(adk_processor, config)

async def quick_batch_process(file_paths: List[str], 
                             adk_processor: ADKDocumentProcessor,
                             progress_callback: Optional[Callable] = None,
                             **config_kwargs) -> Dict[str, Any]:
    """Quick batch processing with default settings"""
    processor = create_batch_processor(adk_processor, **config_kwargs)
    return await processor.process_batch(file_paths, progress_callback)

def default_progress_callback(progress_info: Dict[str, Any]):
    """Default progress callback that logs to console"""
    percentage = progress_info["progress_percentage"]
    processed = progress_info["processed_files"]
    total = progress_info["total_files"]
    successful = progress_info["successful_files"]
    failed = progress_info["failed_files"]
    
    logger.info(f"Progress: {percentage:.1f}% ({processed}/{total}) - Success: {successful}, Failed: {failed}")
