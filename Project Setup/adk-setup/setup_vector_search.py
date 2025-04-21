import os
from google.cloud import aiplatform
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment variables
project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
location = os.getenv("GOOGLE_CLOUD_LOCATION")
index_name = os.getenv("VECTOR_SEARCH_INDEX_NAME")
dimensions = int(os.getenv("VECTOR_SEARCH_DIMENSIONS"))

# Initialize Vertex AI
aiplatform.init(project=project_id, location=location)

print(f"Setting up Vector Search index '{index_name}' in project '{project_id}', location '{location}'")

# Create a Vector Search index
try:
    # Check if index already exists and delete it
    try:
        indexes = aiplatform.MatchingEngineIndex.list(
            filter=f"display_name={index_name}"
        )

        if indexes:
            print(f"Vector Search index '{index_name}' already exists. Deleting it to recreate with new settings...")
            for idx in indexes:
                try:
                    idx.delete()
                    print(f"Deleted existing index: {idx.resource_name}")
                except Exception as e:
                    print(f"Warning: Could not delete existing index: {str(e)}")
    except Exception as e:
        print(f"Warning: Could not list existing indexes: {str(e)}")

    # Create a new index
    print(f"Creating new Vector Search index '{index_name}'...")
    index = aiplatform.MatchingEngineIndex.create_tree_ah_index(
        display_name=index_name,
        dimensions=dimensions,
        approximate_neighbors_count=150,
        distance_measure_type="DOT_PRODUCT_DISTANCE",
        leaf_node_embedding_count=500,
        description="VANA shared knowledge index",
        shard_size="SHARD_SIZE_SMALL"  # Using SMALL shard size which is compatible with more machine types
    )
    print(f"Vector Search index created with name: {index.resource_name}")

    # Check if index endpoint already exists and delete it
    try:
        endpoints = aiplatform.MatchingEngineIndexEndpoint.list(
            filter=f"display_name={index_name}"
        )

        if endpoints:
            print(f"Vector Search index endpoint '{index_name}' already exists. Deleting it to recreate...")
            for ep in endpoints:
                try:
                    ep.delete()
                    print(f"Deleted existing endpoint: {ep.resource_name}")
                except Exception as e:
                    print(f"Warning: Could not delete existing endpoint: {str(e)}")
    except Exception as e:
        print(f"Warning: Could not list existing endpoints: {str(e)}")

    # Create a new index endpoint
    print(f"Creating new Vector Search index endpoint '{index_name}'...")
    endpoint = aiplatform.MatchingEngineIndexEndpoint.create(
        display_name=index_name,
        description="VANA shared knowledge endpoint",
        public_endpoint_enabled=True
    )
    print(f"Vector Search index endpoint created with name: {endpoint.resource_name}")

    # Deploy the index to the endpoint if not already deployed
    try:
        # In newer versions of the API, we can use get_deployed_indexes
        deployed_indexes = endpoint.deployed_indexes
        index_already_deployed = any(
            deployed_index.index == index.resource_name for deployed_index in deployed_indexes
        )
    except AttributeError:
        # If deployed_indexes is not available, assume index is not deployed
        index_already_deployed = False

    if index_already_deployed:
        print(f"Index '{index_name}' is already deployed to endpoint.")
    else:
        # Deploy the index to the endpoint
        print(f"Deploying index '{index_name}' to endpoint...")
        endpoint.deploy_index(
            index=index,
            deployed_index_id=index_name.replace("-", ""),
            machine_type="e2-standard-2",  # Using a machine type that supports SHARD_SIZE_SMALL
            min_replica_count=1,
            max_replica_count=1
        )
        print(f"Index '{index_name}' deployed to endpoint successfully.")

    print("\nVector Search setup completed successfully!")
    print(f"Index name: {index.resource_name}")
    print(f"Endpoint name: {endpoint.resource_name}")

except Exception as e:
    print(f"Error setting up Vector Search: {str(e)}")
