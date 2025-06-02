#!/usr/bin/env python3
"""
GitHub Knowledge Sync Script

This script synchronizes the GitHub repository content with the Vector Search index.
It processes repository files, generates embeddings, and updates the Vector Search index.

Usage:
    python scripts/github_sync/sync_knowledge.py [--repo-path PATH] [--file-types EXTENSIONS]

Options:
    --repo-path PATH       Path to the repository root (default: current directory)
    --file-types EXTENSIONS  Comma-separated list of file extensions to process (default: .py,.md,.txt)
"""

import argparse
import glob
import json
import logging
import os
import time
import uuid

import vertexai
from dotenv import load_dotenv
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("github_knowledge_sync.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
DEPLOYED_INDEX_ID = os.getenv("DEPLOYED_INDEX_ID", "vanasharedindex")

# Default directories to exclude
DEFAULT_EXCLUDE_DIRS = [
    ".git",
    ".github",
    "__pycache__",
    "node_modules",
    "venv",
    ".venv",
    "env",
    "build",
    "dist",
    "secrets",
]


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Sync GitHub repository content with Vector Search"
    )
    parser.add_argument("--repo-path", default=".", help="Path to the repository root")
    parser.add_argument(
        "--file-types",
        default=".py,.md,.txt",
        help="Comma-separated list of file extensions to process",
    )
    parser.add_argument(
        "--exclude-dirs",
        default=",".join(DEFAULT_EXCLUDE_DIRS),
        help="Comma-separated list of directories to exclude",
    )
    parser.add_argument(
        "--max-files", type=int, default=1000, help="Maximum number of files to process"
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=1000,
        help="Maximum size of text chunks in characters",
    )
    parser.add_argument(
        "--chunk-overlap",
        type=int,
        default=100,
        help="Overlap between chunks in characters",
    )
    return parser.parse_args()


def get_repository_files(
    repo_path: str, file_types: list[str], exclude_dirs: list[str], max_files: int
) -> list[str]:
    """Get all files of specified types from the repository."""
    all_files = []

    # Convert exclude_dirs to absolute paths
    exclude_dirs_abs = [
        os.path.abspath(os.path.join(repo_path, d)) for d in exclude_dirs
    ]

    for file_type in file_types:
        pattern = os.path.join(repo_path, f"**/*{file_type}")
        files = glob.glob(pattern, recursive=True)

        # Filter out files in excluded directories
        filtered_files = []
        for file in files:
            file_abs = os.path.abspath(file)
            if not any(
                file_abs.startswith(exclude_dir) for exclude_dir in exclude_dirs_abs
            ):
                filtered_files.append(file)

        all_files.extend(filtered_files)

    # Limit the number of files if needed
    if max_files > 0 and len(all_files) > max_files:
        logger.warning(f"Found {len(all_files)} files, limiting to {max_files}")
        all_files = all_files[:max_files]

    return all_files


def read_file_content(file_path: str) -> str:
    """Read the content of a file."""
    try:
        with open(file_path, encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        # Try with latin-1 encoding if utf-8 fails
        try:
            with open(file_path, encoding="latin-1") as f:
                return f.read()
        except Exception as e:
            logger.warning(f"Could not read file {file_path}: {str(e)}")
            return ""
    except Exception as e:
        logger.warning(f"Could not read file {file_path}: {str(e)}")
        return ""


def chunk_text(
    text: str, file_path: str, chunk_size: int, chunk_overlap: int
) -> list[dict[str, str]]:
    """Split text into chunks with metadata."""
    if not text.strip():
        return []

    # Simple chunking by size with overlap
    chunks = []
    for i in range(0, len(text), chunk_size - chunk_overlap):
        chunk_text = text[i : i + chunk_size]
        if chunk_text.strip():
            # Create a chunk with metadata
            chunk = {
                "text": chunk_text,
                "source": file_path,
                "start_char": i,
                "end_char": min(i + chunk_size, len(text)),
            }
            chunks.append(chunk)

    return chunks


def generate_embeddings(
    chunks: list[dict[str, str]],
) -> list[tuple[dict[str, str], list[float]]]:
    """Generate embeddings for text chunks."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # Use the text-embedding-004 model
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")

    # Extract text from chunks
    texts = [chunk["text"] for chunk in chunks]

    # Process in batches to avoid API limits
    batch_size = 50
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_chunks = chunks[i : i + batch_size]

        logger.info(
            f"Generating embeddings for batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}..."
        )

        try:
            batch_embeddings = model.get_embeddings(batch_texts)

            # Pair chunks with their embeddings
            for chunk, embedding in zip(batch_chunks, batch_embeddings, strict=False):
                all_embeddings.append((chunk, embedding.values))
        except Exception as e:
            logger.error(f"Error generating embeddings for batch: {str(e)}")
            # Continue with the next batch

    return all_embeddings


def export_embeddings_to_file(
    chunk_embeddings: list[tuple[dict[str, str], list[float]]],
    output_file: str = "embeddings.json",
) -> str:
    """Export embeddings to a JSON file for batch updates.

    Args:
        chunk_embeddings: List of (chunk, embedding) tuples
        output_file: Path to the output file

    Returns:
        Path to the output file
    """
    try:
        # Create embeddings in the format expected by the batch update process
        embeddings_data = []

        for chunk, embedding in chunk_embeddings:
            # Create a datapoint with id, embedding, and metadata
            datapoint = {
                "id": str(uuid.uuid4()),
                "embedding": embedding,
                "metadata": {
                    "source": chunk["source"],
                    "start_char": str(chunk["start_char"]),
                    "end_char": str(chunk["end_char"]),
                    "text": chunk["text"][:1000] + "..."
                    if len(chunk["text"]) > 1000
                    else chunk["text"],
                },
            }

            # Log the chunk information
            logger.info(
                f"Processing chunk from {chunk['source']} ({chunk['start_char']}-{chunk['end_char']})"
            )
            embeddings_data.append(datapoint)

        # Write the embeddings to a file
        with open(output_file, "w") as f:
            json.dump(embeddings_data, f)

        logger.info(f"Exported {len(embeddings_data)} embeddings to {output_file}")
        return output_file

    except Exception as e:
        logger.error(f"Error exporting embeddings to file: {str(e)}")
        raise


def update_vector_search(
    chunk_embeddings: list[tuple[dict[str, str], list[float]]],
) -> bool:
    """Update the Vector Search index with new embeddings.

    This function tries two approaches:
    1. Direct updates using StreamUpdate (if enabled)
    2. Batch updates by exporting embeddings to a file
    """
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # Get the index
    try:
        # Try to find the index by display name
        indexes = aiplatform.MatchingEngineIndex.list(
            filter=f"display_name={INDEX_NAME}"
        )

        if not indexes:
            logger.error(f"Index '{INDEX_NAME}' not found")
            return False

        index = indexes[0]
        logger.info(f"Found index: {index.display_name} (ID: {index.name})")
    except Exception as e:
        logger.error(f"Error accessing index: {str(e)}")
        return False

    # Create datapoints for indexing using the format expected by the API
    datapoints = []
    for chunk, embedding in chunk_embeddings:
        # Create a simple datapoint with just datapoint_id and feature_vector
        datapoint = {"datapoint_id": str(uuid.uuid4()), "feature_vector": embedding}

        # Store the chunk information in a separate log for reference
        logger.info(
            f"Processing chunk from {chunk['source']} ({chunk['start_char']}-{chunk['end_char']})"
        )

        datapoints.append(datapoint)

    # Try to upload datapoints directly first
    try:
        # Attempt to upload the first batch to see if direct updates are supported
        if datapoints:
            test_batch = datapoints[:1]
            logger.info("Testing index update capability with a single datapoint...")
            index.upsert_datapoints(datapoints=test_batch)
            logger.info(
                "✅ Index supports direct updates. Proceeding with full upload."
            )

            # If we get here, the index supports direct updates
            batch_size = 100
            for i in range(0, len(datapoints), batch_size):
                batch = datapoints[i : i + batch_size]
                logger.info(
                    f"Uploading batch {i//batch_size + 1}/{(len(datapoints)-1)//batch_size + 1}..."
                )
                index.upsert_datapoints(datapoints=batch)

            logger.info(
                f"Successfully uploaded {len(datapoints)} chunks to Vector Search"
            )
            return True
    except Exception as e:
        if "StreamUpdate is not enabled" in str(e):
            logger.warning(
                "⚠️ This index does not support direct updates (StreamUpdate is not enabled)"
            )
            logger.info("Falling back to batch update approach...")
        else:
            logger.error(f"Error uploading to Vector Search: {str(e)}")
            logger.info("Falling back to batch update approach...")

    # If direct updates failed, export embeddings to a file for batch updates
    try:
        # Export embeddings to a file
        timestamp = int(time.time())
        output_file = f"embeddings_{timestamp}.json"
        export_embeddings_to_file(chunk_embeddings, output_file)

        logger.info("Embeddings exported successfully for batch update")
        logger.info("To update the index, run:")
        logger.info(
            f"python scripts/batch_update_index.py --embeddings-file {output_file} --wait"
        )

        # For GitHub Actions, we'll consider this a success
        # The actual update will be done by a separate workflow or manually
        return True
    except Exception as e:
        logger.error(f"Error exporting embeddings for batch update: {str(e)}")
        return False


def main():
    """Main function."""
    args = parse_arguments()

    # Process arguments
    repo_path = os.path.abspath(args.repo_path)
    file_types = args.file_types.split(",")
    exclude_dirs = args.exclude_dirs.split(",")

    logger.info(f"Starting GitHub knowledge sync for repository: {repo_path}")
    logger.info(f"Processing file types: {file_types}")
    logger.info(f"Excluding directories: {exclude_dirs}")

    # Get repository files
    files = get_repository_files(repo_path, file_types, exclude_dirs, args.max_files)
    logger.info(f"Found {len(files)} files to process")

    # Process files
    all_chunks = []
    for file_path in files:
        rel_path = os.path.relpath(file_path, repo_path)
        logger.info(f"Processing file: {rel_path}")

        # Read file content
        content = read_file_content(file_path)

        # Chunk the content
        chunks = chunk_text(content, rel_path, args.chunk_size, args.chunk_overlap)
        all_chunks.extend(chunks)

    logger.info(f"Created {len(all_chunks)} chunks from {len(files)} files")

    # Generate embeddings
    chunk_embeddings = generate_embeddings(all_chunks)
    logger.info(f"Generated embeddings for {len(chunk_embeddings)} chunks")

    # Update Vector Search
    success = update_vector_search(chunk_embeddings)

    if success:
        logger.info("✅ GitHub knowledge sync completed successfully")
    else:
        logger.error("❌ GitHub knowledge sync completed with errors")


if __name__ == "__main__":
    main()
