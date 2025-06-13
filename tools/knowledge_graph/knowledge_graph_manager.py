#!/usr/bin/env python3
"""
Knowledge Graph Manager for VANA Memory System

This module provides a client for interacting with the MCP Knowledge Graph.
It complements the Vector Search client to provide structured knowledge representation.

The Knowledge Graph Manager provides:
1. Storage and retrieval of entities and relationships
2. Entity extraction from text
3. Entity linking and enrichment
4. Relationship inference
"""

import logging
import os
from typing import Any, Dict, List, Optional, Union

import requests

from tools.knowledge_graph.entity_extractor import EntityExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class KnowledgeGraphManager:
    """Client for interacting with MCP Knowledge Graph"""

    def __init__(self):
        """Initialize the Knowledge Graph manager"""
        self.api_key = os.environ.get("MCP_API_KEY")
        self.server_url = os.environ.get("MCP_SERVER_URL", "PLACEHOLDER_MCP_SERVER_URL")
        self.namespace = os.environ.get("MCP_NAMESPACE", "vana-project")
        self.entity_extractor = EntityExtractor()

    def is_available(self) -> bool:
        """Check if Knowledge Graph is available"""
        if not self.api_key or not self.server_url:
            return False

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/ping", headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.info(f"Knowledge Graph is not available: {e}")
            return False

    def query(self, entity_type: str, query_text: str) -> Dict[str, Any]:
        """Query the Knowledge Graph for entities"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"entities": []}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/query",
                params={"namespace": self.namespace, "entity_type": entity_type, "query": query_text},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error querying Knowledge Graph: {e}")
            return {"entities": []}

    def store(self, entity_name: str, entity_type: str, observation: str) -> Dict[str, Any]:
        """Store information in the Knowledge Graph"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.post(
                f"{self.server_url}/api/kg/store",
                json={
                    "namespace": self.namespace,
                    "entities": [{"name": entity_name, "type": entity_type, "observation": observation}],
                },
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error storing in Knowledge Graph: {e}")
            return {"success": False}

    def get_context(self) -> Dict[str, Any]:
        """Get the current Knowledge Graph context"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"context": {}}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/context",
                params={"namespace": self.namespace},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting Knowledge Graph context: {e}")
            return {"context": {}}

    def query_related(self, entity_name: str, relationship_type: str) -> Dict[str, Any]:
        """Query for entities related to a specific entity"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"entities": []}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/related",
                params={"namespace": self.namespace, "entity": entity_name, "relationship": relationship_type},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error querying related entities: {e}")
            return {"entities": []}

    def store_relationship(self, entity1: str, relationship: str, entity2: str) -> Dict[str, Any]:
        """Store a relationship between two entities"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.post(
                f"{self.server_url}/api/kg/relationship",
                json={
                    "namespace": self.namespace,
                    "entity1": entity1,
                    "relationship": relationship,
                    "entity2": entity2,
                },
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error storing relationship: {e}")
            return {"success": False}

    def delete(self, entity_name: str) -> Dict[str, Any]:
        """Delete an entity from the Knowledge Graph"""
        if not self.is_available():
            logger.info("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.delete(
                f"{self.server_url}/api/kg/entity",
                params={"namespace": self.namespace, "entity": entity_name},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error deleting entity: {e}")
            return {"success": False}

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from text using advanced entity extraction

        Args:
            text: Text to extract entities from

        Returns:
            List of entity dictionaries with name, type, and observation
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for entity extraction")
            return []

        # First try local entity extraction
        try:
            logger.info("Extracting entities using local entity extractor")
            entities = self.entity_extractor.extract_entities(text)

            if entities:
                logger.info(f"Extracted {len(entities)} entities locally")
                return entities
        except Exception as e:
            logger.error(f"Error in local entity extraction: {str(e)}")

        # Fall back to MCP Knowledge Graph extraction if available
        if not self.is_available():
            logger.warning("Knowledge Graph is not available for entity extraction")
            return []

        try:
            logger.info("Extracting entities using MCP Knowledge Graph")
            response = requests.post(
                f"{self.server_url}/api/kg/extract",
                json={"namespace": self.namespace, "text": text},
                headers={"Authorization": f"Bearer {self.api_key}"},
            )
            response.raise_for_status()
            entities = response.json().get("entities", [])
            logger.info(f"Extracted {len(entities)} entities from MCP Knowledge Graph")
            return entities
        except Exception as e:
            logger.error(f"Error extracting entities from MCP: {str(e)}")
            return []

    def extract_and_store_entities(self, text: str) -> Dict[str, Any]:
        """
        Extract entities from text and store them in the Knowledge Graph

        Args:
            text: Text to extract entities from

        Returns:
            Dictionary with success status and number of entities stored
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for entity extraction and storage")
            return {"success": False, "reason": "Empty text provided"}

        # Extract entities
        entities = self.extract_entities(text)

        if not entities:
            logger.warning("No entities extracted from text")
            return {"success": False, "reason": "No entities extracted"}

        # Store entities
        stored_count = 0
        for entity in entities:
            try:
                result = self.store(
                    entity_name=entity["name"], entity_type=entity["type"], observation=entity["observation"]
                )

                if result.get("success", False):
                    stored_count += 1
            except Exception as e:
                logger.error(f"Error storing entity {entity['name']}: {str(e)}")

        return {"success": stored_count > 0, "entities_extracted": len(entities), "entities_stored": stored_count}

    def extract_and_store_relationships(self, text: str) -> Dict[str, Any]:
        """
        Extract relationships from text and store them in the Knowledge Graph

        Args:
            text: Text to extract relationships from

        Returns:
            Dictionary with success status and number of relationships stored
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for relationship extraction")
            return {"success": False, "reason": "Empty text provided"}

        # Extract relationships
        try:
            relationships = self.entity_extractor.extract_relationships(text)

            if not relationships:
                logger.warning("No relationships extracted from text")
                return {"success": False, "reason": "No relationships extracted"}

            # Store relationships
            stored_count = 0
            for rel in relationships:
                try:
                    result = self.store_relationship(
                        entity1=rel["entity1"], relationship=rel["relationship"], entity2=rel["entity2"]
                    )

                    if result.get("success", False):
                        stored_count += 1
                except Exception as e:
                    logger.error(f"Error storing relationship: {str(e)}")

            return {
                "success": stored_count > 0,
                "relationships_extracted": len(relationships),
                "relationships_stored": stored_count,
            }
        except Exception as e:
            logger.error(f"Error in relationship extraction: {str(e)}")
            return {"success": False, "reason": str(e)}

    def link_entities(self, text: str, existing_entities: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Link entities in text to existing entities in the Knowledge Graph

        Args:
            text: Text to process for entity linking
            existing_entities: Optional list of existing entities to link against
                              (if None, will query the Knowledge Graph)

        Returns:
            Dictionary with success status and linked entities
        """
        if not text or not text.strip():
            logger.warning("Empty text provided for entity linking")
            return {"success": False, "reason": "Empty text provided"}

        # Extract entities from text
        extracted_entities = self.extract_entities(text)

        if not extracted_entities:
            logger.warning("No entities extracted from text for linking")
            return {"success": False, "reason": "No entities extracted"}

        # Get existing entities if not provided
        if existing_entities is None:
            try:
                # Query all entity types
                existing_entities = []
                for entity_type in ["*", "person", "organization", "location", "technology", "project", "concept"]:
                    result = self.query(entity_type, "")
                    if "entities" in result:
                        existing_entities.extend(result["entities"])
            except Exception as e:
                logger.error(f"Error querying existing entities: {str(e)}")
                return {"success": False, "reason": f"Error querying existing entities: {str(e)}"}

        if not existing_entities:
            logger.warning("No existing entities found for linking")
            return {"success": False, "reason": "No existing entities found"}

        # Link entities
        linked_entities = []
        for extracted in extracted_entities:
            # Look for exact matches first
            exact_matches = [
                existing for existing in existing_entities if existing["name"].lower() == extracted["name"].lower()
            ]

            # Look for partial matches if no exact matches found
            partial_matches = []
            if not exact_matches:
                # Check for entities that are contained within each other
                partial_matches = [
                    existing
                    for existing in existing_entities
                    if (
                        existing["name"].lower() in extracted["name"].lower()
                        or extracted["name"].lower() in existing["name"].lower()
                    )
                    and existing["type"] == extracted["type"]
                ]

            if exact_matches:
                # Use the existing entity but update with new observation
                for match in exact_matches:
                    try:
                        # Enrich the existing entity with new information
                        enriched_observation = self._merge_observations(
                            match.get("observation", ""), extracted.get("observation", "")
                        )

                        updated = self.store(
                            entity_name=match["name"], entity_type=match["type"], observation=enriched_observation
                        )

                        if updated.get("success", False):
                            linked_entities.append(
                                {
                                    "extracted": extracted["name"],
                                    "linked_to": match["name"],
                                    "type": match["type"],
                                    "action": "updated",
                                    "confidence": 1.0,  # Exact match
                                }
                            )
                    except Exception as e:
                        logger.error(f"Error updating entity during linking: {str(e)}")

            elif partial_matches:
                # Handle partial matches - link to the most similar entity
                best_match = max(
                    partial_matches, key=lambda x: self._calculate_similarity(x["name"], extracted["name"])
                )

                try:
                    # Create a relationship between the entities
                    relationship = "related_to"
                    if best_match["name"].lower() in extracted["name"].lower():
                        relationship = "is_part_of"
                    elif extracted["name"].lower() in best_match["name"].lower():
                        relationship = "contains"

                    # Store the relationship
                    rel_result = self.store_relationship(
                        entity1=extracted["name"], relationship=relationship, entity2=best_match["name"]
                    )

                    # Also store the new entity
                    created = self.store(
                        entity_name=extracted["name"],
                        entity_type=extracted["type"],
                        observation=extracted.get("observation", ""),
                    )

                    if created.get("success", False) and rel_result.get("success", False):
                        linked_entities.append(
                            {
                                "extracted": extracted["name"],
                                "linked_to": best_match["name"],
                                "type": extracted["type"],
                                "action": "linked",
                                "relationship": relationship,
                                "confidence": 0.8,  # Partial match
                            }
                        )
                except Exception as e:
                    logger.error(f"Error linking entity with partial match: {str(e)}")

            else:
                # No match, store as new entity
                try:
                    created = self.store(
                        entity_name=extracted["name"],
                        entity_type=extracted["type"],
                        observation=extracted.get("observation", ""),
                    )

                    if created.get("success", False):
                        linked_entities.append(
                            {
                                "extracted": extracted["name"],
                                "linked_to": None,
                                "type": extracted["type"],
                                "action": "created",
                                "confidence": 1.0,  # New entity
                            }
                        )
                except Exception as e:
                    logger.error(f"Error creating entity during linking: {str(e)}")

        return {
            "success": len(linked_entities) > 0,
            "entities_extracted": len(extracted_entities),
            "entities_linked": len(linked_entities),
            "linked_entities": linked_entities,
        }

    def _merge_observations(self, obs1: str, obs2: str) -> str:
        """
        Intelligently merge two observations, avoiding duplication

        Args:
            obs1: First observation
            obs2: Second observation

        Returns:
            Merged observation
        """
        if not obs1:
            return obs2
        if not obs2:
            return obs1

        # Split into sentences
        sentences1 = [s.strip() for s in obs1.split(".") if s.strip()]
        sentences2 = [s.strip() for s in obs2.split(".") if s.strip()]

        # Remove duplicates
        unique_sentences = list(sentences1)
        for s2 in sentences2:
            if not any(self._is_similar_sentence(s2, s1) for s1 in sentences1):
                unique_sentences.append(s2)

        # Join sentences
        return ". ".join(unique_sentences) + "."

    def _is_similar_sentence(self, s1: str, s2: str) -> bool:
        """Check if two sentences are similar"""
        # Simple implementation - can be enhanced with more sophisticated similarity metrics
        s1_words = set(s1.lower().split())
        s2_words = set(s2.lower().split())

        if not s1_words or not s2_words:
            return False

        # Calculate Jaccard similarity
        intersection = len(s1_words.intersection(s2_words))
        union = len(s1_words.union(s2_words))

        return intersection / union > 0.7  # Threshold for similarity

    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """Calculate string similarity"""
        # Simple implementation - can be enhanced with more sophisticated similarity metrics
        s1_words = set(s1.lower().split())
        s2_words = set(s2.lower().split())

        if not s1_words or not s2_words:
            return 0.0

        # Calculate Jaccard similarity
        intersection = len(s1_words.intersection(s2_words))
        union = len(s1_words.union(s2_words))

        return intersection / union

    def process_document(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a document to extract entities, relationships, and enrich the Knowledge Graph

        Args:
            document: Document dictionary with text and metadata

        Returns:
            Dictionary with processing results
        """
        if not document or "text" not in document or not document["text"]:
            logger.warning("Invalid document provided for processing")
            return {"success": False, "reason": "Invalid document"}

        text = document["text"]
        doc_id = document.get("doc_id", "unknown")
        source = document.get("source", "unknown")
        title = document.get("title", "")

        logger.info(f"Processing document {doc_id} from {source}")

        # Extract entities
        entities = self.extract_entities(text)
        logger.info(f"Extracted {len(entities)} entities from document {doc_id}")

        # Extract relationships
        relationships = self.entity_extractor.extract_relationships(text)
        logger.info(f"Extracted {len(relationships)} relationships from document {doc_id}")

        # Store document as an entity
        doc_entity_name = title or f"Document-{doc_id}"
        doc_entity_type = "document"
        doc_observation = f"Document: {title}. Source: {source}. ID: {doc_id}."

        doc_entity_result = self.store(
            entity_name=doc_entity_name, entity_type=doc_entity_type, observation=doc_observation
        )

        # Store entities
        stored_entities = []
        for entity in entities:
            try:
                result = self.store(
                    entity_name=entity["name"], entity_type=entity["type"], observation=entity.get("observation", "")
                )

                if result.get("success", False):
                    stored_entities.append(entity["name"])

                    # Create relationship between document and entity
                    self.store_relationship(entity1=doc_entity_name, relationship="contains", entity2=entity["name"])
            except Exception as e:
                logger.error(f"Error storing entity {entity['name']}: {str(e)}")

        # Store relationships
        stored_relationships = []
        for rel in relationships:
            try:
                result = self.store_relationship(
                    entity1=rel["entity1"], relationship=rel["relationship"], entity2=rel["entity2"]
                )

                if result.get("success", False):
                    stored_relationships.append(f"{rel['entity1']} {rel['relationship']} {rel['entity2']}")
            except Exception as e:
                logger.error(f"Error storing relationship: {str(e)}")

        return {
            "success": len(stored_entities) > 0 or len(stored_relationships) > 0,
            "document": doc_id,
            "entities_extracted": len(entities),
            "entities_stored": len(stored_entities),
            "relationships_extracted": len(relationships),
            "relationships_stored": len(stored_relationships),
        }

    def infer_relationships(self, entity_name: str) -> Dict[str, Any]:
        """
        Infer potential relationships for an entity based on existing Knowledge Graph data

        Args:
            entity_name: Name of the entity to infer relationships for

        Returns:
            Dictionary with inferred relationships
        """
        if not self.is_available():
            logger.warning("Knowledge Graph is not available for relationship inference")
            return {"success": False, "reason": "Knowledge Graph not available"}

        # Get entity information
        try:
            entity_result = self.query("*", entity_name)
            entities = entity_result.get("entities", [])

            if not entities:
                logger.warning(f"Entity {entity_name} not found in Knowledge Graph")
                return {"success": False, "reason": "Entity not found"}

            # Find the matching entity
            entity = next((e for e in entities if e["name"].lower() == entity_name.lower()), None)

            if not entity:
                logger.warning(f"Entity {entity_name} not found in Knowledge Graph")
                return {"success": False, "reason": "Entity not found"}

            # Get related entities
            related_result = self.query_related(entity_name, "*")
            related_entities = related_result.get("entities", [])

            # Get all entities of the same type
            same_type_result = self.query(entity["type"], "")
            same_type_entities = same_type_result.get("entities", [])

            # Filter out the current entity and already related entities
            related_names = [r["name"] for r in related_entities]
            same_type_entities = [
                e for e in same_type_entities if e["name"] != entity_name and e["name"] not in related_names
            ]

            # Infer relationships based on common patterns
            inferred_relationships = []

            # 1. Infer relationships based on entity type
            if entity["type"] == "technology":
                # Technologies might be used by projects
                projects_result = self.query("project", "")
                projects = projects_result.get("entities", [])

                for project in projects:
                    if project["name"] not in related_names:
                        # Check if project observation mentions the technology
                        if entity_name.lower() in project.get("observation", "").lower():
                            inferred_relationships.append(
                                {
                                    "entity1": project["name"],
                                    "relationship": "uses",
                                    "entity2": entity_name,
                                    "confidence": 0.7,
                                    "reason": f"Project {project['name']} mentions {entity_name} in its description",
                                }
                            )

            elif entity["type"] == "project":
                # Projects might use technologies
                techs_result = self.query("technology", "")
                technologies = techs_result.get("entities", [])

                for tech in technologies:
                    if tech["name"] not in related_names:
                        # Check if project observation mentions the technology
                        if tech["name"].lower() in entity.get("observation", "").lower():
                            inferred_relationships.append(
                                {
                                    "entity1": entity_name,
                                    "relationship": "uses",
                                    "entity2": tech["name"],
                                    "confidence": 0.7,
                                    "reason": f"Project {entity_name} mentions {tech['name']} in its description",
                                }
                            )

            # 2. Infer relationships based on co-occurrence in documents
            docs_result = self.query("document", "")
            documents = docs_result.get("entities", [])

            entity_docs = []
            for doc in documents:
                # Check if document contains the entity
                doc_entities_result = self.query_related(doc["name"], "contains")
                doc_entities = doc_entities_result.get("entities", [])

                if any(e["name"] == entity_name for e in doc_entities):
                    entity_docs.append(doc)

            # For each document containing the entity, find other entities in the same document
            for doc in entity_docs:
                doc_entities_result = self.query_related(doc["name"], "contains")
                doc_entities = doc_entities_result.get("entities", [])

                for doc_entity in doc_entities:
                    if doc_entity["name"] != entity_name and doc_entity["name"] not in related_names:
                        # Infer relationship based on co-occurrence
                        inferred_relationships.append(
                            {
                                "entity1": entity_name,
                                "relationship": "related_to",
                                "entity2": doc_entity["name"],
                                "confidence": 0.6,
                                "reason": f"Both entities appear in document {doc['name']}",
                            }
                        )

            # Store inferred relationships if requested
            stored_count = 0
            for rel in inferred_relationships:
                if rel["confidence"] >= 0.7:  # Only store high-confidence relationships
                    try:
                        result = self.store_relationship(
                            entity1=rel["entity1"], relationship=rel["relationship"], entity2=rel["entity2"]
                        )

                        if result.get("success", False):
                            stored_count += 1
                    except Exception as e:
                        logger.error(f"Error storing inferred relationship: {str(e)}")

            return {
                "success": True,
                "entity": entity_name,
                "inferred_relationships": inferred_relationships,
                "stored_relationships": stored_count,
            }

        except Exception as e:
            logger.error(f"Error inferring relationships: {str(e)}")
            return {"success": False, "reason": str(e)}
