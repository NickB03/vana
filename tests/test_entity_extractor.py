#!/usr/bin/env python3
"""
Test script for the entity extractor
"""

import json
import logging
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import entity extractor
from tools.knowledge_graph.entity_extractor import EntityExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_entity_extractor():
    """Test the entity extractor"""
    logger.info("Testing entity extractor...")

    # Initialize entity extractor
    extractor = EntityExtractor()

    # Test text
    test_text = """
    VANA is a multi-agent system that uses Vector Search and Knowledge Graph for knowledge retrieval.
    It is built on Google's Agent Development Kit (ADK) and integrates with Vertex AI.
    The system can process documents, extract entities, and answer complex queries.
    """

    # Extract entities
    logger.info("Extracting entities from test text...")
    entities = extractor.extract_entities(test_text)

    # Print extracted entities
    logger.info(f"Extracted {len(entities)} entities:")
    for entity in entities:
        logger.info(
            f"  {entity['name']} ({entity['type']}): confidence={entity['confidence']}"
        )

    # Extract relationships
    logger.info("Extracting relationships from test text...")
    relationships = extractor.extract_relationships(test_text)

    # Print extracted relationships
    logger.info(f"Extracted {len(relationships)} relationships:")
    for rel in relationships:
        logger.info(
            f"  {rel['entity1']} {rel['relationship']} {rel['entity2']}: confidence={rel['confidence']}"
        )

    # Save extracted entities and relationships to output file
    output_file = os.path.join("tests", "test_data", "extracted_entities.json")
    try:
        with open(output_file, "w") as f:
            json.dump(
                {"entities": entities, "relationships": relationships}, f, indent=2
            )
        logger.info(f"Saved extracted entities and relationships to {output_file}")
    except Exception as e:
        logger.error(f"Error saving extracted entities: {str(e)}")

    return len(entities) > 0


def main():
    """Main function"""
    logger.info("Entity Extractor Test")

    # Create test_data directory if it doesn't exist
    os.makedirs(os.path.join("tests", "test_data"), exist_ok=True)

    # Test entity extractor
    success = test_entity_extractor()

    if success:
        logger.info("Entity extractor test completed successfully!")
        return 0
    else:
        logger.error("Entity extractor test failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
