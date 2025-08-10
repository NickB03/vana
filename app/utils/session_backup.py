# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import os
import logging
import shutil
import asyncio
import threading
from datetime import datetime
from typing import Optional

import aiofiles
import google.cloud.storage as storage
from google.api_core import exceptions


async def backup_session_db_to_gcs_async(
    local_db_path: str, 
    bucket_name: str, 
    project_id: str,
    backup_prefix: str = "session_backups"
) -> Optional[str]:
    """Async backup local session database to Google Cloud Storage.
    
    Args:
        local_db_path: Path to local SQLite database file
        bucket_name: GCS bucket name (without gs:// prefix)
        project_id: Google Cloud project ID
        backup_prefix: Prefix for backup files in GCS
        
    Returns:
        GCS path of backup file if successful, None if failed
    """
    # Check if file exists
    if not os.path.exists(local_db_path):
        logging.warning(f"Session database not found at {local_db_path}")
        return None
    
    try:
        # Run GCS operations in thread pool since they're not async
        def _upload_to_gcs():
            storage_client = storage.Client(project=project_id)
            bucket = storage_client.bucket(bucket_name)
            
            # Create timestamped backup filename
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{backup_prefix}/vana_sessions_{timestamp}.db"
            
            blob = bucket.blob(backup_filename)
            blob.upload_from_filename(local_db_path)
            
            return f"gs://{bucket_name}/{backup_filename}"
        
        # Execute in thread pool to avoid blocking
        loop = asyncio.get_event_loop()
        gcs_path = await loop.run_in_executor(None, _upload_to_gcs)
        
        logging.info(f"Session database backed up to {gcs_path}")
        return gcs_path
        
    except Exception as e:
        logging.error(f"Failed to backup session database: {e}")
        return None


async def restore_session_db_from_gcs_async(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    backup_filename: Optional[str] = None,
    backup_prefix: str = "session_backups"
) -> bool:
    """Async restore session database from Google Cloud Storage backup.
    
    Args:
        local_db_path: Path where to restore the database
        bucket_name: GCS bucket name (without gs:// prefix)
        project_id: Google Cloud project ID
        backup_filename: Specific backup file to restore (if None, uses latest)
        backup_prefix: Prefix for backup files in GCS
        
    Returns:
        True if restore successful, False otherwise
    """
    try:
        def _download_from_gcs():
            storage_client = storage.Client(project=project_id)
            bucket = storage_client.bucket(bucket_name)
            
            nonlocal backup_filename
            if backup_filename is None:
                # Find latest backup
                blobs = list(bucket.list_blobs(prefix=f"{backup_prefix}/"))
                if not blobs:
                    logging.warning(f"No session backups found in gs://{bucket_name}/{backup_prefix}/")
                    return False
                
                # Sort by name (timestamp is in filename) and get latest
                backup_blobs = [b for b in blobs if b.name.endswith('.db')]
                if not backup_blobs:
                    logging.warning(f"No .db backup files found in gs://{bucket_name}/{backup_prefix}/")
                    return False
                    
                latest_blob = sorted(backup_blobs, key=lambda x: x.name)[-1]
                backup_filename = latest_blob.name
            
            blob = bucket.blob(backup_filename)
            blob.download_to_filename(local_db_path)
            
            return True
        
        # Create directory if it doesn't exist
        local_dir = os.path.dirname(local_db_path)
        if local_dir:
            os.makedirs(local_dir, exist_ok=True)
        
        # Execute download in thread pool
        loop = asyncio.get_event_loop()
        success = await loop.run_in_executor(None, _download_from_gcs)
        
        if success:
            gcs_path = f"gs://{bucket_name}/{backup_filename}"
            logging.info(f"Session database restored from {gcs_path} to {local_db_path}")
            return True
        else:
            return False
            
    except exceptions.NotFound:
        logging.warning(f"Backup file not found: gs://{bucket_name}/{backup_filename}")
        return False
    except Exception as e:
        logging.error(f"Failed to restore session database: {e}")
        return False


def backup_session_db_to_gcs(
    local_db_path: str, 
    bucket_name: str, 
    project_id: str,
    backup_prefix: str = "session_backups"
) -> Optional[str]:
    """Backup local session database to Google Cloud Storage (sync wrapper).
    
    Args:
        local_db_path: Path to local SQLite database file
        bucket_name: GCS bucket name (without gs:// prefix)
        project_id: Google Cloud project ID
        backup_prefix: Prefix for backup files in GCS
        
    Returns:
        GCS path of backup file if successful, None if failed
    """
    try:
        # Check if we're already in an async context
        try:
            loop = asyncio.get_running_loop()
            # We're in an async context, need to run in thread pool
            import concurrent.futures
            
            def run_async():
                # Create new event loop for this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        backup_session_db_to_gcs_async(local_db_path, bucket_name, project_id, backup_prefix)
                    )
                finally:
                    new_loop.close()
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=300)  # 5 minute timeout
                
        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(backup_session_db_to_gcs_async(local_db_path, bucket_name, project_id, backup_prefix))
            
    except Exception as e:
        logging.error(f"Backup wrapper error: {e}")
        return None


def restore_session_db_from_gcs(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    backup_filename: Optional[str] = None,
    backup_prefix: str = "session_backups"
) -> bool:
    """Restore session database from Google Cloud Storage backup (sync wrapper).
    
    Args:
        local_db_path: Path where to restore the database
        bucket_name: GCS bucket name (without gs:// prefix)
        project_id: Google Cloud project ID
        backup_filename: Specific backup file to restore (if None, uses latest)
        backup_prefix: Prefix for backup files in GCS
        
    Returns:
        True if restore successful, False otherwise
    """
    try:
        # Check if we're already in an async context
        try:
            loop = asyncio.get_running_loop()
            # We're in an async context, need to run in thread pool
            import concurrent.futures
            
            def run_async():
                # Create new event loop for this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        restore_session_db_from_gcs_async(local_db_path, bucket_name, project_id, backup_filename, backup_prefix)
                    )
                finally:
                    new_loop.close()
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=300)  # 5 minute timeout
                
        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(restore_session_db_from_gcs_async(local_db_path, bucket_name, project_id, backup_filename, backup_prefix))
            
    except Exception as e:
        logging.error(f"Restore wrapper error: {e}")
        return False


def setup_session_persistence_for_cloud_run(
    project_id: str,
    session_db_path: str = "/data/sessions/vana_sessions.db"
) -> str:
    """Setup session persistence configuration for Cloud Run deployment.
    
    This function configures session storage for Cloud Run with persistent volumes.
    
    Args:
        project_id: Google Cloud project ID
        session_db_path: Path to session database in persistent volume
        
    Returns:
        Session service URI for ADK configuration
    """
    bucket_name = f"{project_id}-vana-session-storage"
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(session_db_path), exist_ok=True)
    
    # Try to restore from latest backup if database doesn't exist
    if not os.path.exists(session_db_path):
        logging.info("Session database not found, attempting to restore from backup...")
        restore_session_db_from_gcs(
            local_db_path=session_db_path,
            bucket_name=bucket_name,
            project_id=project_id
        )
    
    return f"sqlite:///{session_db_path}"


async def create_periodic_backup_job_async(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    interval_hours: int = 6
) -> asyncio.Task:
    """Create an async periodic backup job for session database.
    
    Args:
        local_db_path: Path to local SQLite database
        bucket_name: GCS bucket name for backups
        project_id: Google Cloud project ID
        interval_hours: Backup interval in hours
        
    Returns:
        The backup task that can be cancelled if needed
    """
    async def backup_loop():
        while True:
            await asyncio.sleep(interval_hours * 3600)  # Convert hours to seconds
            try:
                result = await backup_session_db_to_gcs_async(local_db_path, bucket_name, project_id)
                if result:
                    logging.info(f"Periodic backup successful: {result}")
                else:
                    logging.warning("Periodic backup failed")
            except Exception as e:
                logging.error(f"Periodic backup error: {e}")
    
    # Start backup task
    backup_task = asyncio.create_task(backup_loop())
    logging.info(f"Started async periodic session backup every {interval_hours} hours")
    return backup_task


def create_periodic_backup_job(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    interval_hours: int = 6
):
    """Create a periodic backup job for session database (sync wrapper).
    
    Note: This is a simple implementation. For production, consider using
    Cloud Scheduler or Kubernetes CronJobs for more robust scheduling.
    
    Args:
        local_db_path: Path to local SQLite database
        bucket_name: GCS bucket name for backups
        project_id: Google Cloud project ID
        interval_hours: Backup interval in hours
    """
    try:
        # Try to use async version if we're in an event loop
        loop = asyncio.get_running_loop()
        # Schedule the async task
        async def start_async():
            await create_periodic_backup_job_async(
                local_db_path, bucket_name, project_id, interval_hours
            )
        
        task = loop.create_task(start_async())
        logging.info(f"Started async periodic session backup every {interval_hours} hours")
    except RuntimeError:
        # No event loop, fall back to threading
        import threading
        import time
        
        def backup_loop():
            while True:
                time.sleep(interval_hours * 3600)  # Convert hours to seconds
                backup_session_db_to_gcs(local_db_path, bucket_name, project_id)
        
        # Start backup thread
        backup_thread = threading.Thread(target=backup_loop, daemon=True)
        backup_thread.start()
        logging.info(f"Started threaded periodic session backup every {interval_hours} hours")