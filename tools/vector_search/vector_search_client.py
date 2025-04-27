"""
Vector Search Client for VANA Memory System

This module provides a client for interacting with Vertex AI Vector Search.
It replaces the legacy Ragie.ai client with a more scalable and integrated solution.
"""

import os
import uuid
import requests
from google.cloud import aiplatform
from typing import List, Dict, Any, Optional, Union

class VectorSearchClient:
    """Client for interacting with Vertex AI Vector Search"""
    
    def __init__(self):
        """Initialize the Vector Search client"""
        self.project = os.environ.get("GOOGLE_CLOUD_PROJECT")
        self.location = os.environ.get("GOOGLE_CLOUD_LOCATION")
        self.endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
        self.deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")
        
        # Initialize Vertex AI if credentials are available
        if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            try:
                aiplatform.init(project=self.project, location=self.location)
                
                # Get the index endpoint
                self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
                    index_endpoint_name=self.endpoint_id
                )
            except Exception as e:
                print(f"Error initializing Vertex AI: {e}")
                self.index_endpoint = None
        else:
            self.index_endpoint = None
    
    def is_available(self) -> bool:
        """Check if Vector Search is available"""
        if not self.index_endpoint:
            return False
        
        try:
            # Simple test query with a zero vector
            self.index_endpoint.match(
                deployed_index_id=self.deployed_index_id,
                queries=[{"datapoint": [0.0] * 768}],
                num_neighbors=1
            )
            return True
        except Exception as e:
            print(f"Vector Search is not available: {e}")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using Vertex AI text-embedding-004 model"""
        endpoint = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project}/locations/{self.location}/publishers/google/models/text-embedding-004:predict"
        
        try:
            response = requests.post(
                endpoint,
                headers={"Authorization": f"Bearer {self._get_auth_token()}"},
                json={"instances": [{"content": text}]}
            )
            response.raise_for_status()
            
            return response.json()["predictions"][0]["embeddings"]
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant content using Vector Search"""
        if not self.is_available():
            print("Vector Search is not available")
            return []
        
        try:
            # Generate embedding for the query
            query_embedding = self.generate_embedding(query)
            
            if not query_embedding:
                print("Failed to generate embedding for query")
                return []
            
            # Search the index
            response = self.index_endpoint.match(
                deployed_index_id=self.deployed_index_id,
                queries=[{"datapoint": query_embedding}],
                num_neighbors=top_k
            )
            
            # Format results
            results = []
            for match in response[0]:
                results.append({
                    "content": match.document,
                    "score": match.distance,
                    "metadata": match.restricts
                })
            
            return results
        except Exception as e:
            print(f"Error searching Vector Search: {e}")
            return []
    
    def upload_embedding(self, content: str, metadata: Dict[str, Any] = None) -> bool:
        """Upload content with embedding to Vector Search"""
        if not self.is_available():
            print("Vector Search is not available")
            return False
        
        try:
            # Generate embedding for the content
            embedding = self.generate_embedding(content)
            
            if not embedding:
                print("Failed to generate embedding for content")
                return False
            
            # Create datapoint
            datapoint = {
                "id": str(uuid.uuid4()),
                "feature_vector": embedding,
                "restricts": metadata or {}
            }
            
            # Upload to Vector Search
            self.index_endpoint.upsert_datapoints(
                deployed_index_id=self.deployed_index_id,
                datapoints=[datapoint]
            )
            
            return True
        except Exception as e:
            print(f"Error uploading to Vector Search: {e}")
            return False
    
    def batch_upload_embeddings(self, items: List[Dict[str, Any]]) -> bool:
        """Upload multiple items with embeddings to Vector Search in batch"""
        if not self.is_available():
            print("Vector Search is not available")
            return False
        
        try:
            datapoints = []
            
            for item in items:
                content = item.get("content", "")
                metadata = item.get("metadata", {})
                
                # Generate embedding for the content
                embedding = self.generate_embedding(content)
                
                if not embedding:
                    print(f"Failed to generate embedding for content: {content[:50]}...")
                    continue
                
                # Create datapoint
                datapoint = {
                    "id": str(uuid.uuid4()),
                    "feature_vector": embedding,
                    "restricts": metadata
                }
                
                datapoints.append(datapoint)
            
            if not datapoints:
                print("No valid datapoints to upload")
                return False
            
            # Upload to Vector Search in batches of 100
            batch_size = 100
            for i in range(0, len(datapoints), batch_size):
                batch = datapoints[i:i+batch_size]
                self.index_endpoint.upsert_datapoints(
                    deployed_index_id=self.deployed_index_id,
                    datapoints=batch
                )
            
            return True
        except Exception as e:
            print(f"Error batch uploading to Vector Search: {e}")
            return False
    
    def _get_auth_token(self) -> str:
        """Get authentication token for Google Cloud API"""
        try:
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account
            
            credentials = service_account.Credentials.from_service_account_file(
                os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"),
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            
            credentials.refresh(Request())
            return credentials.token
        except Exception as e:
            print(f"Error getting auth token: {e}")
            return ""
