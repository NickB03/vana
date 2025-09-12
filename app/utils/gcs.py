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

import logging

# These utilities interact with Google Cloud Storage.  During testing the
# ``google-cloud-storage`` package is not installed so we provide a small shim
# allowing the module to be imported without the dependency.
try:  # pragma: no cover - simple import wrapper
    import google.cloud.storage as storage  # type: ignore
    from google.api_core import exceptions  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    storage = None  # type: ignore

    class exceptions:  # type: ignore
        class NotFound(Exception):
            pass


def create_bucket_if_not_exists(bucket_name: str, project: str, location: str) -> None:
    """
    Create the Google Cloud Storage bucket if it does not already exist.
    
    If the google-cloud-storage package is not installed, the function returns without performing any checks.
    Accepts bucket names with or without the "gs://" prefix; when the bucket is missing it will be created in the specified project and location.
    
    Parameters:
        bucket_name (str): Name of the bucket to create; may include a leading "gs://".
        project (str): Google Cloud project ID where the bucket should exist.
        location (str): Location/region to create the bucket in (no default; pass the desired region).
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
