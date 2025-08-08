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
from datetime import datetime
from typing import Optional

import google.cloud.storage as storage
from google.api_core import exceptions


def backup_session_db_to_gcs(
    local_db_path: str, 
    bucket_name: str, 
    project_id: str,
    backup_prefix: str = "session_backups"
) -> Optional[str]:
    """Backup local session database to Google Cloud Storage.
    
    Args:
        local_db_path: Path to local SQLite database file
        bucket_name: GCS bucket name (without gs:// prefix)
        project_id: Google Cloud project ID
        backup_prefix: Prefix for backup files in GCS
        
    Returns:
        GCS path of backup file if successful, None if failed
    """
    if not os.path.exists(local_db_path):
        logging.warning(f"Session database not found at {local_db_path}")
        return None
    
    try:
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.bucket(bucket_name)
        
        # Create timestamped backup filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"{backup_prefix}/vana_sessions_{timestamp}.db"
        
        blob = bucket.blob(backup_filename)
        blob.upload_from_filename(local_db_path)
        
        gcs_path = f"gs://{bucket_name}/{backup_filename}"
        logging.info(f"Session database backed up to {gcs_path}")
        return gcs_path
        
    except Exception as e:
        logging.error(f"Failed to backup session database: {e}")
        return None


def restore_session_db_from_gcs(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    backup_filename: Optional[str] = None,
    backup_prefix: str = "session_backups"
) -> bool:
    """Restore session database from Google Cloud Storage backup.
    
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
        storage_client = storage.Client(project=project_id)
        bucket = storage_client.bucket(bucket_name)
        
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
        
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(local_db_path), exist_ok=True)
        
        # Download backup to local path
        blob.download_to_filename(local_db_path)
        
        gcs_path = f"gs://{bucket_name}/{backup_filename}"
        logging.info(f"Session database restored from {gcs_path} to {local_db_path}")
        return True
        
    except exceptions.NotFound:
        logging.warning(f"Backup file not found: gs://{bucket_name}/{backup_filename}")
        return False
    except Exception as e:
        logging.error(f"Failed to restore session database: {e}")
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


def create_periodic_backup_job(
    local_db_path: str,
    bucket_name: str, 
    project_id: str,
    interval_hours: int = 6
):
    """Create a periodic backup job for session database.
    
    Note: This is a simple implementation. For production, consider using
    Cloud Scheduler or Kubernetes CronJobs for more robust scheduling.
    
    Args:
        local_db_path: Path to local SQLite database
        bucket_name: GCS bucket name for backups
        project_id: Google Cloud project ID
        interval_hours: Backup interval in hours
    """
    import threading
    import time
    
    def backup_loop():
        while True:
            time.sleep(interval_hours * 3600)  # Convert hours to seconds
            backup_session_db_to_gcs(local_db_path, bucket_name, project_id)
    
    # Start backup thread
    backup_thread = threading.Thread(target=backup_loop, daemon=True)
    backup_thread.start()
    logging.info(f"Started periodic session backup every {interval_hours} hours")