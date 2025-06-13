#!/usr/bin/env python3
"""
Test script to verify Vector Search functionality with explicit type conversion.
This script tests the embedding generation and vector search functionality
to ensure proper type handling.
"""

import os
import sys
import logging
import argparse
from typing import List, Dict, Any, Optional

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Import after path setup
try:
    # Try different import paths
    import sys
    import os

    # Add possible paths to sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(current_dir)

    possible_paths = [
        os.path.join(parent_dir, "adk-setup"),
        os.path.join(parent_dir, "adk_setup"),
        parent_dir
    ]

    for path in possible_paths:
        if path not in sys.path and os.path.exists(path):
            sys.path.insert(0, path)

    # Try imports
    try:
        from vana.tools.rag_tools import generate_embedding, get_vector_search_endpoint
        logger.info("Imported from vana.tools.rag_tools")
    except ImportError:
        try:
            import importlib.util

            # Try to find the module file
            module_paths = [
                os.path.join(parent_dir, "adk-setup", "vana", "tools", "rag_tools.py"),
                os.path.join(parent_dir, "vana", "tools", "rag_tools.py")
            ]

            module_path = None
            for path in module_paths:
                if os.path.exists(path):
                    module_path = path
                    break

            if not module_path:
                raise ImportError("Could not find rag_tools.py")

            # Load the module directly
            spec = importlib.util.spec_from_file_location("rag_tools", module_path)
            rag_tools = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(rag_tools)

            # Get the functions
            generate_embedding = rag_tools.generate_embedding
            get_vector_search_endpoint = rag_tools.get_vector_search_endpoint
            logger.info(f"Imported from {module_path}")
        except Exception as e:
            logger.error(f"Failed to import required modules: {e}")
            sys.exit(1)
except Exception as e:
    logger.error(f"Error setting up imports: {e}")
    sys.exit(1)

def test_embedding_generation(text: str) -> Optional[List[float]]:
    """Test embedding generation with explicit type checking."""
    try:
        logger.info(f"Generating embedding for: '{text}'")
        embedding = generate_embedding(text)

        # Validate embedding
        if not embedding:
            logger.error("Empty embedding returned")
            return None

        # Check types
        if not all(isinstance(value, float) for value in embedding):
            logger.warning("Embedding contains non-float values, converting...")
            embedding = [float(value) for value in embedding]

        logger.info(f"Successfully generated embedding with {len(embedding)} dimensions")
        logger.info(f"First 5 values: {embedding[:5]}")
        logger.info(f"Value types: {[type(v) for v in embedding[:5]]}")

        return embedding
    except Exception as e:
        logger.error(f"Error testing embedding generation: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None

def test_vector_search(query_embedding: List[float], top_k: int = 5) -> bool:
    """Test vector search with the generated embedding."""
    try:
        logger.info("Testing Vector Search...")

        # Get the Vector Search endpoint
        endpoint, deployed_index_id = get_vector_search_endpoint()

        if not endpoint or not deployed_index_id:
            logger.error("Failed to get Vector Search endpoint or deployed index ID")
            return False

        logger.info(f"Using endpoint: {endpoint}")
        logger.info(f"Using deployed index ID: {deployed_index_id}")

        # Try find_neighbors API
        try:
            logger.info("Testing find_neighbors API...")
            response = endpoint.find_neighbors(
                deployed_index_id=deployed_index_id,
                queries=[query_embedding],
                num_neighbors=top_k
            )

            if response and len(response) > 0 and len(response[0]) > 0:
                logger.info(f"✅ find_neighbors API successful! Found {len(response[0])} results")
                return True
            else:
                logger.warning("find_neighbors API returned empty results")
        except Exception as e:
            logger.warning(f"find_neighbors API failed: {e}")

        # Try match API as fallback
        try:
            logger.info("Testing match API...")
            response = endpoint.match(
                deployed_index_id=deployed_index_id,
                queries=[{"datapoint": query_embedding}],
                num_neighbors=top_k
            )

            if response and len(response) > 0:
                logger.info(f"✅ match API successful! Found {len(response[0])} results")
                return True
            else:
                logger.warning("match API returned empty results")
        except Exception as e:
            logger.error(f"match API failed: {e}")

        return False
    except Exception as e:
        logger.error(f"Error testing Vector Search: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def main() -> int:
    """Main function to run the test."""
    parser = argparse.ArgumentParser(description="Test Vector Search functionality")
    parser.add_argument("--query", type=str, default="Tell me about VANA's vector search implementation",
                        help="Query to test with")
    args = parser.parse_args()

    logger.info("Starting Vector Search test with explicit type conversion")

    # Test embedding generation
    embedding = test_embedding_generation(args.query)
    if not embedding:
        logger.error("❌ Embedding generation test failed")
        return 1

    logger.info("✅ Embedding generation test passed")

    # Test vector search
    success = test_vector_search(embedding)
    if not success:
        logger.error("❌ Vector Search test failed")
        return 1

    logger.info("✅ Vector Search test passed")
    logger.info("All tests completed successfully!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
