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

"""Google Cloud Storage utility functions for bucket management.

This module provides utilities for Google Cloud Storage bucket operations
with graceful handling of optional dependencies. The module can be imported
and used in environments where google-cloud-storage is not available,
making it suitable for testing and development scenarios.

Key Features:
    - Safe bucket creation with existence checking
    - Graceful handling of missing google-cloud-storage dependency
    - Automatic gs:// prefix handling for bucket names
    - Comprehensive error handling and logging
    - Support for multi-region bucket creation

Dependencies:
    - google-cloud-storage: Optional, operations are skipped if not available
    - google-api-core: Optional, provides exception types for error handling

Example:
    >>> from app.utils.gcs import create_bucket_if_not_exists
    >>> 
    >>> # Create bucket for application storage
    >>> create_bucket_if_not_exists(
    ...     bucket_name="my-app-data",
    ...     project="my-gcp-project",
    ...     location="us-central1"
    ... )
"""

import logging

# Google Cloud Storage dependencies with optional import handling.
# During testing or in environments where GCS is not required, the
# google-cloud-storage package may not be installed. We provide fallback
# implementations to allow the module to be imported without dependency errors.
try:  # pragma: no cover - simple import wrapper
    import google.cloud.storage as storage  # type: ignore
    from google.api_core import exceptions  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    storage = None  # type: ignore

    class exceptions:  # type: ignore
        class NotFound(Exception):
            pass


def create_bucket_if_not_exists(bucket_name: str, project: str, location: str) -> None:
    """Create a Google Cloud Storage bucket if it doesn't already exist.
    
    Safely creates a new GCS bucket with the specified name and configuration.
    If the bucket already exists, the function logs this information and returns
    without error. Handles the google-cloud-storage dependency gracefully when
    not available.
    
    Args:
        bucket_name: Name of the bucket to create. Can include \"gs://\" prefix
                    which will be automatically stripped.
        project: Google Cloud project ID where the bucket should be created
        location: GCS location/region for the bucket (e.g., \"us-central1\",
                 \"europe-west1\", \"asia-east1\")
                 
    Raises:
        google.api_core.exceptions.Conflict: If bucket name is already taken
        google.api_core.exceptions.Forbidden: If insufficient permissions
        google.cloud.exceptions.GoogleCloudError: For other GCS-related errors
        
    Example:
        >>> # Create bucket in default US region
        >>> create_bucket_if_not_exists(
        ...     bucket_name=\"my-app-storage\",
        ...     project=\"my-gcp-project\",
        ...     location=\"us-central1\"
        ... )
        >>> 
        >>> # Handle gs:// prefix automatically
        >>> create_bucket_if_not_exists(
        ...     bucket_name=\"gs://my-app-logs\",
        ...     project=\"my-gcp-project\", 
        ...     location=\"europe-west1\"
        ... )
        
    Note:
        If google-cloud-storage is not installed, the function logs a warning
        and returns without error to support environments where GCS is not
        required (such as testing).
        
    Security Considerations:
        - Bucket names must be globally unique across all GCS
        - Consider bucket naming conventions for security and organization
        - Location choice affects data residency and latency
    """
    if storage is None:
        logging.info("google-cloud-storage not installed; skipping bucket check")
        return

    storage_client = storage.Client(project=project)

    if bucket_name.startswith("gs://"):
        bucket_name = bucket_name[5:]
    try:
        storage_client.get_bucket(bucket_name)
        logging.info(f"Bucket {bucket_name} already exists")
    except exceptions.NotFound:
        bucket = storage_client.create_bucket(
            bucket_name,
            location=location,
            project=project,
        )
        logging.info(f"Created bucket {bucket.name} in {bucket.location}")
