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

import asyncio
import logging
import os
from datetime import datetime

# These backup utilities rely on Google Cloud Storage.  Provide optional
# imports so that the module can be loaded when the dependency is missing
# (e.g. in the execution environment for the tests).
try:  # pragma: no cover
    import google.cloud.storage as storage  # type: ignore
    from google.api_core import exceptions  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    storage = None  # type: ignore

    class exceptions:  # type: ignore
        class NotFound(Exception):
            pass


async def backup_session_db_to_gcs_async(
    local_db_path: str,
    bucket_name: str,
    project_id: str,
    backup_prefix: str = "session_backups",
) -> str | None:
    """
    Upload a local SQLite session database file to Google Cloud Storage and return its GCS path.
    
    Asynchronously runs the upload in a thread pool (GCS client is not async). If the google-cloud-storage package is unavailable
    or the local database file does not exist, the function returns None. On success returns the produced `gs://{bucket}/{object}` path.
    
    Parameters:
        local_db_path (str): Filesystem path to the local SQLite database file to upload.
        bucket_name (str): Destination GCS bucket name (no `gs://` prefix).
        project_id (str): Google Cloud project ID used to construct the storage client.
        backup_prefix (str): Optional object prefix/virtual folder in the bucket for the backup file (default: "session_backups").
    
    Returns:
        str | None: The GCS URI of the uploaded backup (e.g. `gs://bucket/session_backups/vana_sessions_YYYYMMDD_HHMMSS.db`)
        or None if the upload was skipped or failed.
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; skipping session backup")
        return None

    # Check if file exists
    if not os.path.exists(local_db_path):
        logging.warning(f"Session database not found at {local_db_path}")
        return None

    try:
        # Run GCS operations in thread pool since they're not async
        def _upload_to_gcs() -> str:
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
    backup_filename: str | None = None,
    backup_prefix: str = "session_backups",
) -> bool:
    """
    Restore a local session SQLite database from a Google Cloud Storage backup.
    
    If `backup_filename` is None the function selects the latest `.db` file under the given `backup_prefix` in `bucket_name`. The function ensures the local directory for `local_db_path` exists and performs GCS I/O in a threadpool so it can be awaited from an async context.
    
    Parameters:
        local_db_path (str): Destination path for the restored database file.
        bucket_name (str): GCS bucket name (no `gs://` prefix).
        project_id (str): Google Cloud project ID.
        backup_filename (str | None): Specific object name to download; if None, the latest `.db` under `backup_prefix` is used.
        backup_prefix (str): Object prefix in the bucket where backups are stored.
    
    Returns:
        bool: True if the file was successfully downloaded to `local_db_path`, False otherwise.
    
    Notes:
        - If the `google-cloud-storage` dependency is not available, the function logs and returns False.
        - Missing backup files or GCS NotFound errors cause the function to return False (no exception is propagated).
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; skipping session restore")
        return False

    try:

        def _download_from_gcs() -> bool:
            """
            Download the specified or latest .db backup from GCS to the local path.
            
            If `backup_filename` is None, lists blobs under the given `backup_prefix` in `bucket_name`,
            selects the latest blob whose name ends with `.db` (sorted by name), and updates the
            nonlocal `backup_filename` to that blob's name. Then downloads the blob to `local_db_path`.
            
            Returns:
                bool: True if a backup was successfully downloaded; False if no backups or no `.db`
                files were found under the prefix.
            """
            storage_client = storage.Client(project=project_id)
            bucket = storage_client.bucket(bucket_name)

            nonlocal backup_filename
            if backup_filename is None:
                # Find latest backup
                blobs = list(bucket.list_blobs(prefix=f"{backup_prefix}/"))
                if not blobs:
                    logging.warning(
                        f"No session backups found in gs://{bucket_name}/{backup_prefix}/"
                    )
                    return False

                # Sort by name (timestamp is in filename) and get latest
                backup_blobs = [b for b in blobs if b.name.endswith(".db")]
                if not backup_blobs:
                    logging.warning(
                        f"No .db backup files found in gs://{bucket_name}/{backup_prefix}/"
                    )
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
            logging.info(
                f"Session database restored from {gcs_path} to {local_db_path}"
            )
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
    backup_prefix: str = "session_backups",
) -> str | None:
    """
    Synchronous wrapper that backs up a local SQLite session database to Google Cloud Storage and returns the resulting gs:// path.
    
    This function calls the async backup implementation and adapts to the current execution context:
    - If google-cloud-storage is not available, it returns None.
    - If called from within an active asyncio event loop, the async backup is executed in a worker thread with a fresh event loop and a 5-minute timeout.
    - If no asyncio event loop is running, it invokes the async backup via asyncio.run.
    
    Parameters:
        bucket_name: GCS bucket name (provide the raw bucket name, without a `gs://` prefix).
    
    Returns:
        The GCS path (e.g. `gs://{bucket}/{prefix}/{file}`) of the uploaded backup on success, or None on failure.
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; skipping session backup")
        return None

    try:
        # Check if we're already in an async context
        try:
            asyncio.get_running_loop()
            # We're in an async context, need to run in thread pool
            import concurrent.futures

            def run_async() -> str | None:
                # Create new event loop for this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        backup_session_db_to_gcs_async(
                            local_db_path, bucket_name, project_id, backup_prefix
                        )
                    )
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=300)  # 5 minute timeout

        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(
                backup_session_db_to_gcs_async(
                    local_db_path, bucket_name, project_id, backup_prefix
                )
            )

    except Exception as e:
        logging.error(f"Backup wrapper error: {e}")
        return None


def restore_session_db_from_gcs(
    local_db_path: str,
    bucket_name: str,
    project_id: str,
    backup_filename: str | None = None,
    backup_prefix: str = "session_backups",
) -> bool:
    """
    Restore the session SQLite database from a Google Cloud Storage backup (synchronous wrapper).
    
    This function synchronously restores a local session DB by running the asynchronous
    restore routine. If the google-cloud-storage dependency is not available this is a
    no-op that returns False. When called from inside an already-running asyncio event
    loop, the async restore is executed in a separate thread with a 5-minute timeout;
    otherwise it is run via asyncio.run. Returns True on successful restore, False on
    failure.
    Parameters:
        local_db_path (str): Local filesystem path to restore the database to.
        bucket_name (str): GCS bucket name (without the gs:// prefix).
        project_id (str): Google Cloud project ID.
        backup_filename (str | None): Specific backup filename to restore; if None the latest backup is used.
        backup_prefix (str): GCS prefix/directory where backups are stored.
    
    Returns:
        bool: True if the restore completed successfully, False otherwise.
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; skipping session restore")
        return False

    try:
        # Check if we're already in an async context
        try:
            asyncio.get_running_loop()
            # We're in an async context, need to run in thread pool
            import concurrent.futures

            def run_async() -> bool:
                # Create new event loop for this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    return new_loop.run_until_complete(
                        restore_session_db_from_gcs_async(
                            local_db_path,
                            bucket_name,
                            project_id,
                            backup_filename,
                            backup_prefix,
                        )
                    )
                finally:
                    new_loop.close()

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=300)  # 5 minute timeout

        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(
                restore_session_db_from_gcs_async(
                    local_db_path,
                    bucket_name,
                    project_id,
                    backup_filename,
                    backup_prefix,
                )
            )

    except Exception as e:
        logging.error(f"Restore wrapper error: {e}")
        return False


def setup_session_persistence_for_cloud_run(
    project_id: str, session_db_path: str = "/data/sessions/vana_sessions.db"
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
            project_id=project_id,
        )

    return f"sqlite:///{session_db_path}"


async def create_periodic_backup_job_async(
    local_db_path: str, bucket_name: str, project_id: str, interval_hours: int = 6
) -> asyncio.Task:
    """
    Create and start an asyncio Task that periodically backs up the local session SQLite DB to GCS.
    
    The returned Task runs an infinite loop that waits interval_hours between attempts and invokes
    backup_session_db_to_gcs_async to upload the DB. If Google Cloud Storage support is unavailable
    (the module-level `storage` is None), this returns a no-op Task that does nothing when awaited.
    Cancel the returned Task to stop the periodic backups.
    
    Args:
        local_db_path: Path to the local SQLite database file to back up.
        bucket_name: GCS bucket name where backups will be stored.
        project_id: Google Cloud project ID used to construct the storage client.
        interval_hours: Interval between backups in hours (default: 6).
    
    Returns:
        An asyncio.Task running the periodic backup loop (or a no-op Task if GCS is unavailable).
    """

    if storage is None:
        logging.info("google-cloud-storage not installed; periodic backup disabled")

        async def noop() -> None:
            """
            No-op asynchronous coroutine that does nothing.
            
            Useful as a placeholder task or default coroutine where an awaitable is required. Returns None.
            """
            return None

        return asyncio.create_task(noop())

    async def backup_loop() -> None:
        """
        Run an endless periodic loop that sleeps for `interval_hours` and attempts to back up the local session DB to GCS.
        
        This coroutine repeatedly:
        - waits for interval_hours (converted to seconds),
        - calls backup_session_db_to_gcs_async(local_db_path, bucket_name, project_id),
        - logs success when a GCS path is returned, logs a warning when the backup fails, and logs errors for unexpected exceptions.
        
        The coroutine captures and uses the surrounding closure variables: local_db_path, bucket_name, project_id, and interval_hours. It runs until cancelled (e.g., by cancelling the Task running it) and always returns None.
        """
        while True:
            await asyncio.sleep(interval_hours * 3600)  # Convert hours to seconds
            try:
                result = await backup_session_db_to_gcs_async(
                    local_db_path, bucket_name, project_id
                )
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
    local_db_path: str, bucket_name: str, project_id: str, interval_hours: int = 6
) -> None:
    """
    Start a background periodic backup of the local session SQLite database to GCS.
    
    If Google Cloud Storage client is unavailable, the function returns immediately without scheduling backups.
    If called from within an active asyncio event loop, schedules an asynchronous periodic backup task on that loop.
    If no event loop is running, starts a daemon thread that performs backups at the given interval.
    
    Parameters:
        local_db_path: Filesystem path to the local SQLite session database.
        bucket_name: Name of the GCS bucket to store backups.
        project_id: Google Cloud project ID used to construct the storage client.
        interval_hours: How often to run backups, in hours (default: 6).
    
    Returns:
        None
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; periodic backup disabled")
        return

    try:
        # Try to use async version if we're in an event loop
        loop = asyncio.get_running_loop()

        # Schedule the async task
        async def start_async() -> None:
            await create_periodic_backup_job_async(
                local_db_path, bucket_name, project_id, interval_hours
            )

        loop.create_task(start_async())  # noqa: RUF006
        logging.info(
            f"Started async periodic session backup every {interval_hours} hours"
        )
    except RuntimeError:
        # No event loop, fall back to threading
        import threading
        import time

        def backup_loop() -> None:
            while True:
                time.sleep(interval_hours * 3600)  # Convert hours to seconds
                backup_session_db_to_gcs(local_db_path, bucket_name, project_id)

        # Start backup thread
        backup_thread = threading.Thread(target=backup_loop, daemon=True)
        backup_thread.start()
        logging.info(
            f"Started threaded periodic session backup every {interval_hours} hours"
        )
