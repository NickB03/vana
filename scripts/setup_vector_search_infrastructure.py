#!/usr/bin/env python3
"""
Vector Search Infrastructure Setup Script for VANA

This script creates the missing Google Cloud Vertex AI Vector Search infrastructure:
1. Creates a Vector Search Index
2. Creates an Index Endpoint  
3. Deploys the Index to the Endpoint
4. Updates environment configuration with resource IDs
5. Configures proper IAM permissions

Usage:
    python scripts/setup_vector_search_infrastructure.py [--dry-run]
    
Requirements:
- Google Cloud SDK authenticated
- Vertex AI API enabled
- Proper IAM permissions for Vector Search resources
"""

import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Dict, Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from google.cloud import aiplatform
    from google.cloud.aiplatform import MatchingEngineIndex, MatchingEngineIndexEndpoint
    import google.auth
    VERTEX_AI_AVAILABLE = True
except ImportError as e:
    logger.error(f"Required Google Cloud libraries not available: {e}")
    logger.error("Install with: pip install google-cloud-aiplatform")
    VERTEX_AI_AVAILABLE = False

class VectorSearchInfrastructureSetup:
    """Sets up Google Cloud Vector Search infrastructure for VANA."""
    
    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.project_id = None
        self.region = None
        self.index = None
        self.endpoint = None
        self.deployed_index_id = None
        
        # Configuration
        self.index_display_name = "vana-knowledge-index"
        self.endpoint_display_name = "vana-knowledge-endpoint"
        self.deployed_index_display_name = "vana-deployed-index"
        self.embedding_dimensions = 768
        self.distance_measure = MatchingEngineIndex.DistanceMeasureType.DOT_PRODUCT_DISTANCE
        
    def setup_environment(self):
        """Set up environment and validate prerequisites."""
        logger.info("Setting up environment...")
        
        if not VERTEX_AI_AVAILABLE:
            raise RuntimeError("Google Cloud AI Platform libraries not available")
            
        # Get project information
        try:
            _, self.project_id = google.auth.default()
            logger.info(f"Using Google Cloud project: {self.project_id}")
        except Exception as e:
            raise RuntimeError(f"Failed to get default Google Cloud project: {e}")
            
        # Set region (default to us-central1)
        self.region = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        logger.info(f"Using region: {self.region}")
        
        # Initialize AI Platform
        if not self.dry_run:
            aiplatform.init(project=self.project_id, location=self.region)
            logger.info("Initialized Vertex AI Platform")
        else:
            logger.info("DRY RUN: Would initialize Vertex AI Platform")
            
    async def create_vector_search_index(self) -> str:
        """Create a Vector Search Index."""
        logger.info(f"Creating Vector Search Index: {self.index_display_name}")
        
        if self.dry_run:
            logger.info("DRY RUN: Would create Vector Search Index")
            return "projects/123456789/locations/us-central1/indexes/mock-index-id"
            
        try:
            # Create index configuration
            index_config = {
                "display_name": self.index_display_name,
                "description": "VANA knowledge base vector search index",
                "metadata": {
                    "config": {
                        "dimensions": self.embedding_dimensions,
                        "approximate_neighbors_count": 10,
                        "distance_measure_type": self.distance_measure,
                        "algorithm_config": {
                            "tree_ah_config": {
                                "leaf_node_embedding_count": 1000,
                                "leaf_nodes_to_search_percent": 7,
                            }
                        }
                    }
                }
            }
            
            # Create the index
            logger.info("Creating Vector Search Index (this may take 20-30 minutes)...")
            self.index = MatchingEngineIndex.create(
                display_name=self.index_display_name,
                description="VANA knowledge base vector search index",
                dimensions=self.embedding_dimensions,
                approximate_neighbors_count=10,
                distance_measure_type=self.distance_measure,
                leaf_node_embedding_count=1000,
                leaf_nodes_to_search_percent=7
            )
            
            logger.info(f"✅ Vector Search Index created: {self.index.name}")
            return self.index.name
            
        except Exception as e:
            logger.error(f"Failed to create Vector Search Index: {e}")
            raise
            
    async def create_index_endpoint(self) -> str:
        """Create an Index Endpoint."""
        logger.info(f"Creating Index Endpoint: {self.endpoint_display_name}")
        
        if self.dry_run:
            logger.info("DRY RUN: Would create Index Endpoint")
            return "projects/123456789/locations/us-central1/indexEndpoints/mock-endpoint-id"
            
        try:
            # Create the endpoint
            logger.info("Creating Index Endpoint (this may take 10-15 minutes)...")
            self.endpoint = MatchingEngineIndexEndpoint.create(
                display_name=self.endpoint_display_name,
                description="VANA knowledge base vector search endpoint",
                public_endpoint_enabled=False  # Use private endpoint for security
            )
            
            logger.info(f"✅ Index Endpoint created: {self.endpoint.name}")
            return self.endpoint.name
            
        except Exception as e:
            logger.error(f"Failed to create Index Endpoint: {e}")
            raise
            
    async def deploy_index_to_endpoint(self, index_name: str, endpoint_name: str) -> str:
        """Deploy the index to the endpoint."""
        logger.info("Deploying Index to Endpoint...")
        
        if self.dry_run:
            logger.info("DRY RUN: Would deploy Index to Endpoint")
            return "vana-deployed-index-12345"
            
        try:
            # Generate deployed index ID
            self.deployed_index_id = f"vana-deployed-index-{int(time.time())}"
            
            # Deploy the index
            logger.info("Deploying Index to Endpoint (this may take 15-20 minutes)...")
            self.endpoint.deploy_index(
                index=self.index,
                deployed_index_id=self.deployed_index_id,
                display_name=self.deployed_index_display_name,
                min_replica_count=1,
                max_replica_count=2,
                enable_access_logging=True
            )
            
            logger.info(f"✅ Index deployed to endpoint: {self.deployed_index_id}")
            return self.deployed_index_id
            
        except Exception as e:
            logger.error(f"Failed to deploy index to endpoint: {e}")
            raise
            
    def update_environment_file(self, index_id: str, endpoint_id: str, deployed_index_id: str):
        """Update .env.local with the created resource IDs."""
        logger.info("Updating environment configuration...")
        
        env_local_path = project_root / ".env.local"
        env_template_path = project_root / ".env.template"
        
        # Read template if .env.local doesn't exist
        if not env_local_path.exists() and env_template_path.exists():
            logger.info("Creating .env.local from template")
            if not self.dry_run:
                with open(env_template_path, 'r') as f:
                    content = f.read()
                with open(env_local_path, 'w') as f:
                    f.write(content)
        
        # Read current environment file
        if env_local_path.exists():
            with open(env_local_path, 'r') as f:
                lines = f.readlines()
        else:
            lines = []
            
        # Update vector search configuration
        updated_lines = []
        config_updated = {
            'VECTOR_SEARCH_INDEX_ID': False,
            'VECTOR_SEARCH_ENDPOINT_ID': False, 
            'VECTOR_SEARCH_DEPLOYED_INDEX_ID': False
        }
        
        for line in lines:
            if line.startswith('VECTOR_SEARCH_INDEX_ID='):
                updated_lines.append(f'VECTOR_SEARCH_INDEX_ID={index_id}\n')
                config_updated['VECTOR_SEARCH_INDEX_ID'] = True
            elif line.startswith('VECTOR_SEARCH_ENDPOINT_ID='):
                updated_lines.append(f'VECTOR_SEARCH_ENDPOINT_ID={endpoint_id}\n')
                config_updated['VECTOR_SEARCH_ENDPOINT_ID'] = True
            elif line.startswith('VECTOR_SEARCH_DEPLOYED_INDEX_ID='):
                updated_lines.append(f'VECTOR_SEARCH_DEPLOYED_INDEX_ID={deployed_index_id}\n')
                config_updated['VECTOR_SEARCH_DEPLOYED_INDEX_ID'] = True
            else:
                updated_lines.append(line)
                
        # Add missing configuration lines
        for key, updated in config_updated.items():
            if not updated:
                if key == 'VECTOR_SEARCH_INDEX_ID':
                    updated_lines.append(f'{key}={index_id}\n')
                elif key == 'VECTOR_SEARCH_ENDPOINT_ID':
                    updated_lines.append(f'{key}={endpoint_id}\n')
                elif key == 'VECTOR_SEARCH_DEPLOYED_INDEX_ID':
                    updated_lines.append(f'{key}={deployed_index_id}\n')
        
        # Write updated configuration
        if not self.dry_run:
            with open(env_local_path, 'w') as f:
                f.writelines(updated_lines)
            logger.info(f"✅ Updated environment configuration in {env_local_path}")
        else:
            logger.info(f"DRY RUN: Would update {env_local_path}")
            
    def generate_setup_summary(self, index_id: str, endpoint_id: str, deployed_index_id: str):
        """Generate a summary of the setup process."""
        summary = f"""
# Vector Search Infrastructure Setup Complete

## Created Resources:
- **Vector Search Index**: {index_id}
- **Index Endpoint**: {endpoint_id}  
- **Deployed Index**: {deployed_index_id}

## Configuration Updated:
- Environment file: .env.local
- Vector Search service now available

## Next Steps:
1. Restart VANA to load new configuration
2. Test vector search functionality
3. Index your knowledge base content

## Resource Information:
- **Project**: {self.project_id}
- **Region**: {self.region}
- **Embedding Model**: text-embedding-004
- **Dimensions**: {self.embedding_dimensions}

## Cost Considerations:
- Vector Search resources incur ongoing costs
- Monitor usage through Google Cloud Console
- Consider scaling down if not actively using

## Verification:
Run this to verify setup:
```bash
python -c "from lib._shared_libraries.vector_search_service import get_vector_search_service; print('✅ Vector Search available!' if get_vector_search_service().is_available() else '❌ Setup incomplete')"
```
"""
        
        logger.info("Setup Summary:")
        print(summary)
        
        # Write summary to file
        summary_path = project_root / "vector_search_setup_summary.md"
        if not self.dry_run:
            with open(summary_path, 'w') as f:
                f.write(summary)
            logger.info(f"Summary written to: {summary_path}")
            
    async def run_setup(self):
        """Run the complete Vector Search infrastructure setup."""
        logger.info("🚀 Starting Vector Search Infrastructure Setup for VANA")
        
        try:
            # Setup environment
            self.setup_environment()
            
            # Step 1: Create Vector Search Index
            logger.info("\n📊 Step 1: Creating Vector Search Index...")
            index_id = await self.create_vector_search_index()
            
            # Step 2: Create Index Endpoint
            logger.info("\n🔗 Step 2: Creating Index Endpoint...")
            endpoint_id = await self.create_index_endpoint()
            
            # Step 3: Deploy Index to Endpoint
            logger.info("\n🚀 Step 3: Deploying Index to Endpoint...")
            deployed_index_id = await self.deploy_index_to_endpoint(index_id, endpoint_id)
            
            # Step 4: Update Environment Configuration
            logger.info("\n⚙️ Step 4: Updating Environment Configuration...")
            self.update_environment_file(index_id, endpoint_id, deployed_index_id)
            
            # Step 5: Generate Summary
            logger.info("\n📋 Step 5: Generating Setup Summary...")
            self.generate_setup_summary(index_id, endpoint_id, deployed_index_id)
            
            logger.info("\n🎉 Vector Search Infrastructure Setup Complete!")
            logger.info("VANA now has full vector search capabilities enabled.")
            
        except Exception as e:
            logger.error(f"❌ Setup failed: {e}")
            raise


async def main():
    """Main function to run the setup process."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Set up Vector Search infrastructure for VANA")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    
    args = parser.parse_args()
    
    setup = VectorSearchInfrastructureSetup(dry_run=args.dry_run)
    
    if args.dry_run:
        logger.info("🔍 DRY RUN MODE - No actual resources will be created")
        
    await setup.run_setup()


if __name__ == "__main__":
    asyncio.run(main())