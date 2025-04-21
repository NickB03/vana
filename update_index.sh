#!/bin/bash
# Update Vector Search index using gcloud command-line tool

# Load environment variables
source .env

# Set variables
GCS_URI="gs://${GOOGLE_CLOUD_PROJECT}-vector-search/embeddings.jsonl"

# Update the index
echo "Updating index ${VECTOR_SEARCH_INDEX_NAME} with embeddings from ${GCS_URI}..."
gcloud ai vector-search indexes update ${VECTOR_SEARCH_INDEX_NAME} \
  --project=${GOOGLE_CLOUD_PROJECT} \
  --location=${GOOGLE_CLOUD_LOCATION} \
  --contents-delta-uri=${GCS_URI} \
  --is-complete-overwrite=false

echo "Update command completed."
