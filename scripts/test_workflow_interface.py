#!/usr/bin/env python3
"""
Test script for the WorkflowInterface.

This script tests the WorkflowInterface with real data.
"""

import json
import logging
import os
import sys
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the WorkflowInterface
try:
    from adk_setup.vana.workflows import WorkflowInterface
except ImportError:
    try:
        from vana.workflows import WorkflowInterface
    except ImportError:
        print(
            "Error: Could not import WorkflowInterface. Make sure the vana package is installed."
        )
        sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def test_memory_save():
    """Test the memory_save workflow."""
    logger.info("Testing memory_save workflow...")

    # Create the workflow interface
    workflow_interface = WorkflowInterface()

    # Create a test buffer
    buffer = [
        {"role": "user", "content": "How do I implement memory in VANA?"},
        {
            "role": "assistant",
            "content": "You can use the memory management system in VANA, which provides context-aware memory with different scopes (session, user, global). The system uses Vector Search for semantic retrieval and Knowledge Graph for entity tracking. You can save memory using the WorkflowInterface.trigger_memory_save method.",
        },
    ]

    # Add tags
    tags = ["memory", "vana", "test"]

    # Trigger the workflow
    logger.info(
        f"Triggering memory_save workflow with {len(buffer)} messages and tags: {tags}"
    )
    result = workflow_interface.trigger_memory_save(buffer, tags)

    # Log the result
    logger.info(f"Result: {json.dumps(result, indent=2)}")

    return result


def test_memory_sync():
    """Test the memory_sync workflow."""
    logger.info("Testing memory_sync workflow...")

    # Create the workflow interface
    workflow_interface = WorkflowInterface()

    # Create test user and session IDs
    user_id = f"test_user_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    session_id = f"test_session_{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Trigger the workflow
    logger.info(
        f"Triggering memory_sync workflow for user {user_id}, session {session_id}"
    )
    result = workflow_interface.trigger_memory_sync(user_id, session_id)

    # Log the result
    logger.info(f"Result: {json.dumps(result, indent=2)}")

    return result


def test_knowledge_graph_sync():
    """Test the knowledge_graph_sync workflow."""
    logger.info("Testing knowledge_graph_sync workflow...")

    # Create the workflow interface
    workflow_interface = WorkflowInterface()

    # Create test entities
    entities = [
        {
            "name": "VANA",
            "type": "project",
            "observation": "VANA is a multi-agent system using Google's ADK with context management and team coordination.",
        },
        {
            "name": "ADK",
            "type": "technology",
            "observation": "ADK (Agent Development Kit) is a framework from Google for building AI agents.",
        },
        {
            "name": "Vector Search",
            "type": "technology",
            "observation": "Vector Search is a technology for semantic search using embeddings.",
        },
    ]

    # Trigger the workflow
    logger.info(
        f"Triggering knowledge_graph_sync workflow with {len(entities)} entities"
    )
    result = workflow_interface.trigger_knowledge_graph_sync(entities)

    # Log the result
    logger.info(f"Result: {json.dumps(result, indent=2)}")

    return result


def test_document_processing():
    """Test the document_processing workflow."""
    logger.info("Testing document_processing workflow...")

    # Create the workflow interface
    workflow_interface = WorkflowInterface()

    # Create a test document
    document_path = "docs/n8n-workflow-implementation.md"

    # Check if the document exists
    if not os.path.exists(document_path):
        logger.error(f"Document not found: {document_path}")
        return {"error": f"Document not found: {document_path}"}

    # Set options
    options = {"chunk_size": 1000, "chunk_overlap": 200, "extract_entities": True}

    # Trigger the workflow
    logger.info(f"Triggering document_processing workflow for {document_path}")
    result = workflow_interface.trigger_document_processing(document_path, options)

    # Log the result
    logger.info(f"Result: {json.dumps(result, indent=2)}")

    return result


def main():
    """Main function."""
    # Print header
    print("\n" + "=" * 80)
    print("WorkflowInterface Test Script")
    print("=" * 80 + "\n")

    # Check if n8n is available
    workflow_interface = WorkflowInterface()
    if workflow_interface.n8n_available:
        print(f"n8n is available at {workflow_interface.n8n_url}")
        print("Using n8n for workflows")
    else:
        print("n8n is not available")
        print("Using direct implementation for workflows")

    # Print separator
    print("\n" + "-" * 80 + "\n")

    # Get the test to run
    if len(sys.argv) > 1:
        test_name = sys.argv[1]
    else:
        # Ask the user which test to run
        print("Which test would you like to run?")
        print("1. Memory Save")
        print("2. Memory Sync")
        print("3. Knowledge Graph Sync")
        print("4. Document Processing")
        print("5. All Tests")
        choice = input("Enter your choice (1-5): ")

        if choice == "1":
            test_name = "memory_save"
        elif choice == "2":
            test_name = "memory_sync"
        elif choice == "3":
            test_name = "knowledge_graph_sync"
        elif choice == "4":
            test_name = "document_processing"
        elif choice == "5":
            test_name = "all"
        else:
            print("Invalid choice. Exiting.")
            sys.exit(1)

    # Run the selected test
    if test_name == "memory_save" or test_name == "all":
        print("\n" + "-" * 80)
        print("Running Memory Save Test")
        print("-" * 80 + "\n")
        test_memory_save()

    if test_name == "memory_sync" or test_name == "all":
        print("\n" + "-" * 80)
        print("Running Memory Sync Test")
        print("-" * 80 + "\n")
        test_memory_sync()

    if test_name == "knowledge_graph_sync" or test_name == "all":
        print("\n" + "-" * 80)
        print("Running Knowledge Graph Sync Test")
        print("-" * 80 + "\n")
        test_knowledge_graph_sync()

    if test_name == "document_processing" or test_name == "all":
        print("\n" + "-" * 80)
        print("Running Document Processing Test")
        print("-" * 80 + "\n")
        test_document_processing()

    # Print footer
    print("\n" + "=" * 80)
    print("Test Completed")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
