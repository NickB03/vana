#!/usr/bin/env python3
"""
Memory Data Migration Tool

This script provides functionality for exporting and importing memory data
between different environments, with support for schema versioning and
conflict resolution.
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Import components
try:
    from config.environment import EnvironmentConfig
    from tools.mcp_memory_client import MCPMemoryClient
    from tools.memory_manager import MemoryManager
except ImportError as e:
    logger.error(f"Error importing required components: {e}")
    logger.error("Make sure you're running this script from the project root directory.")
    sys.exit(1)

# Schema version for exported data
SCHEMA_VERSION = "1.0.0"


def export_memory_data(output_file: str, include_relationships: bool = True) -> bool:
    """
    Export memory data to a file.

    Args:
        output_file: Path to output file
        include_relationships: Whether to include relationships

    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Exporting memory data to {output_file}...")

    try:
        # Initialize memory client
        mcp_client = MCPMemoryClient()

        # Check if MCP server is available
        if not mcp_client._verify_connection():
            logger.error("MCP server is not available")
            return False

        # Get all entities
        initial_data = mcp_client.get_initial_data()

        if "error" in initial_data:
            logger.error(f"Error getting data from MCP server: {initial_data['error']}")
            return False

        entities = initial_data.get("entities", [])
        logger.info(f"Retrieved {len(entities)} entities from MCP server")

        # Get relationships if requested
        relationships = []
        if include_relationships:
            # Note: This is a placeholder. The actual implementation would depend
            # on the MCP server API for retrieving relationships.
            logger.warning("Relationship export not fully implemented")

        # Create export data
        export_data = {
            "schema_version": SCHEMA_VERSION,
            "export_timestamp": datetime.now().isoformat(),
            "source": {"endpoint": mcp_client.endpoint, "namespace": mcp_client.namespace},
            "entities": entities,
            "relationships": relationships,
        }

        # Write to file
        with open(output_file, "w") as f:
            json.dump(export_data, f, indent=2)

        logger.info(
            f"Successfully exported {len(entities)} entities and {len(relationships)} relationships to {output_file}"
        )
        return True
    except Exception as e:
        logger.error(f"Error exporting memory data: {e}")
        return False


def import_memory_data(input_file: str, conflict_strategy: str = "skip") -> bool:
    """
    Import memory data from a file.

    Args:
        input_file: Path to input file
        conflict_strategy: Strategy for handling conflicts (skip, overwrite, merge)

    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Importing memory data from {input_file}...")

    try:
        # Read input file
        with open(input_file, "r") as f:
            import_data = json.load(f)

        # Validate schema version
        schema_version = import_data.get("schema_version")
        if not schema_version:
            logger.error("Invalid import file: missing schema_version")
            return False

        # Check if schema version is compatible
        if not _is_compatible_schema(schema_version):
            logger.error(f"Incompatible schema version: {schema_version}")
            return False

        # Get entities and relationships
        entities = import_data.get("entities", [])
        relationships = import_data.get("relationships", [])

        logger.info(f"Found {len(entities)} entities and {len(relationships)} relationships in import file")

        # Initialize memory client
        mcp_client = MCPMemoryClient()

        # Check if MCP server is available
        if not mcp_client._verify_connection():
            logger.error("MCP server is not available")
            return False

        # Import entities
        success_count = 0
        skip_count = 0
        error_count = 0

        for entity in entities:
            try:
                # Extract entity data
                entity_name = entity.get("name")
                entity_type = entity.get("type")
                observations = entity.get("observations", [])

                if not entity_name or not entity_type:
                    logger.warning(f"Skipping entity with missing name or type: {entity}")
                    skip_count += 1
                    continue

                # Check if entity already exists
                existing = mcp_client.retrieve_entity(entity_name)

                if "entity" in existing and conflict_strategy != "overwrite":
                    if conflict_strategy == "skip":
                        logger.info(f"Skipping existing entity: {entity_name}")
                        skip_count += 1
                        continue
                    elif conflict_strategy == "merge":
                        # Merge observations
                        existing_observations = existing["entity"].get("observations", [])
                        merged_observations = list(set(existing_observations + observations))
                        observations = merged_observations
                        logger.info(f"Merging entity: {entity_name}")

                # Store entity
                result = mcp_client.store_entity(entity_name, entity_type, observations)

                if "error" in result:
                    logger.error(f"Error storing entity {entity_name}: {result['error']}")
                    error_count += 1
                else:
                    success_count += 1
                    logger.debug(f"Imported entity: {entity_name}")
            except Exception as e:
                logger.error(f"Error importing entity: {e}")
                error_count += 1

        # Import relationships
        rel_success_count = 0
        rel_error_count = 0

        for relationship in relationships:
            try:
                # Extract relationship data
                from_entity = relationship.get("from")
                rel_type = relationship.get("relationship")
                to_entity = relationship.get("to")

                if not from_entity or not rel_type or not to_entity:
                    logger.warning(f"Skipping relationship with missing data: {relationship}")
                    continue

                # Create relationship
                result = mcp_client.create_relationship(from_entity, rel_type, to_entity)

                if "error" in result:
                    logger.error(f"Error creating relationship: {result['error']}")
                    rel_error_count += 1
                else:
                    rel_success_count += 1
                    logger.debug(f"Imported relationship: {from_entity} {rel_type} {to_entity}")
            except Exception as e:
                logger.error(f"Error importing relationship: {e}")
                rel_error_count += 1

        logger.info(f"Import summary: {success_count} entities imported, {skip_count} skipped, {error_count} errors")
        logger.info(f"Relationship import summary: {rel_success_count} imported, {rel_error_count} errors")

        return True
    except Exception as e:
        logger.error(f"Error importing memory data: {e}")
        return False


def _is_compatible_schema(version: str) -> bool:
    """
    Check if schema version is compatible.

    Args:
        version: Schema version to check

    Returns:
        True if compatible, False otherwise
    """
    try:
        # Parse versions
        current_parts = [int(x) for x in SCHEMA_VERSION.split(".")]
        version_parts = [int(x) for x in version.split(".")]

        # Check major version
        if version_parts[0] != current_parts[0]:
            return False

        # If major versions match, it's compatible
        return True
    except Exception:
        return False


def transfer_memory_data(source_env: str, target_env: str, conflict_strategy: str = "skip") -> bool:
    """
    Transfer memory data between environments.

    Args:
        source_env: Source environment (development, test, production)
        target_env: Target environment (development, test, production)
        conflict_strategy: Strategy for handling conflicts (skip, overwrite, merge)

    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Transferring memory data from {source_env} to {target_env}...")

    try:
        # Create temporary file for export
        temp_file = f"memory_export_{int(time.time())}.json"

        # Set source environment
        os.environ["VANA_ENV"] = source_env

        # Export data
        if not export_memory_data(temp_file):
            logger.error("Failed to export data from source environment")
            return False

        # Set target environment
        os.environ["VANA_ENV"] = target_env

        # Import data
        if not import_memory_data(temp_file, conflict_strategy):
            logger.error("Failed to import data to target environment")
            return False

        # Clean up temporary file
        os.remove(temp_file)

        logger.info(f"Successfully transferred memory data from {source_env} to {target_env}")
        return True
    except Exception as e:
        logger.error(f"Error transferring memory data: {e}")
        return False


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Memory Data Migration Tool")

    subparsers = parser.add_subparsers(dest="command", help="Command to execute")

    # Export command
    export_parser = subparsers.add_parser("export", help="Export memory data")
    export_parser.add_argument("--output", "-o", required=True, help="Output file path")
    export_parser.add_argument("--no-relationships", action="store_true", help="Exclude relationships")

    # Import command
    import_parser = subparsers.add_parser("import", help="Import memory data")
    import_parser.add_argument("--input", "-i", required=True, help="Input file path")
    import_parser.add_argument(
        "--conflict", choices=["skip", "overwrite", "merge"], default="skip", help="Conflict resolution strategy"
    )

    # Transfer command
    transfer_parser = subparsers.add_parser("transfer", help="Transfer memory data between environments")
    transfer_parser.add_argument(
        "--source", required=True, choices=["development", "test", "production"], help="Source environment"
    )
    transfer_parser.add_argument(
        "--target", required=True, choices=["development", "test", "production"], help="Target environment"
    )
    transfer_parser.add_argument(
        "--conflict", choices=["skip", "overwrite", "merge"], default="skip", help="Conflict resolution strategy"
    )

    return parser.parse_args()


def main():
    """Main function."""
    args = parse_args()

    if args.command == "export":
        success = export_memory_data(args.output, not args.no_relationships)
    elif args.command == "import":
        success = import_memory_data(args.input, args.conflict)
    elif args.command == "transfer":
        success = transfer_memory_data(args.source, args.target, args.conflict)
    else:
        logger.error("No command specified")
        return 1

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
