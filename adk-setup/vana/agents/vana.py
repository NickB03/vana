"""
Vana Agent Definition

This module defines the Vana agent, a primary agent interface that
leverages Google ADK and external tools via MCP for knowledge management.
"""

import os
import logging
import functools
from typing import List, Dict, Any, Optional
from google.generativeai.adk import base_agent
from google.generativeai.adk import agent as agent_lib
from google.generativeai.adk import tool as tool_lib
from tools.hybrid_search import HybridSearch
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient
from tools.web_search import WebSearchClient
from tools.document_processing.document_processor import DocumentProcessor

# Import ADK tools
from vana.tools.document_tools import (
    process_document_tool,
    extract_entities_from_text_tool,
    chunk_document_tool,
    extract_metadata_tool
)
from vana.tools.knowledge_graph_tools import (
    kg_extract_entities_tool,
    kg_link_entities_tool,
    kg_infer_relationships_tool,
    kg_process_document_tool,
    kg_store_feedback_tool,
    kg_analyze_feedback_tool
)
from vana.tools.feedback_tools import (
    store_search_feedback_tool,
    store_entity_feedback_tool,
    store_document_feedback_tool,
    store_general_feedback_tool,
    get_feedback_summary_tool
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
hybrid_search = HybridSearch()
kg_manager = KnowledgeGraphManager()
vector_search_client = VectorSearchClient()
web_search_client = WebSearchClient()

class VanaAgent(agent_lib.LlmAgent):
    """
    VANA Agent - Primary interface leveraging knowledge tools via MCP
    """

    name = "vana"
    model = "gemini-1.5-pro"

    system_prompt = """
    You are VANA (Versatile Agent Network Architecture), an intelligent assistant built with Google's Gemini 2.5 Pro model and enhanced with specialized knowledge tools.

    Your purpose is to assist users with accurate, helpful information while maintaining a clear, direct communication style. You engage thoughtfully with users, providing structured, concise responses that focus on practical utility.

    When answering questions:
    1. Use your built-in knowledge first for general information
    2. For specific or technical information, leverage your knowledge tools
    3. For time-sensitive or recent information, use your search capabilities
    4. Present information in clear, structured formats (bullet points, numbered steps)
    5. Cite sources appropriately when using external knowledge
    6. Acknowledge limitations when you cannot provide reliable information

    Your core capabilities include:
    - Providing factual information across diverse domains
    - Breaking down complex concepts into understandable components
    - Analyzing problems and suggesting practical solutions
    - Generating helpful content in response to specific requests
    - Assisting with code, technical concepts, and system designs
    - Retrieving recent information through web search
    - Accessing structured knowledge through Knowledge Graph
    - Combining semantic and structured knowledge through hybrid search

    When providing information:
    - Structure responses with clear headings, bullet points, or numbered steps
    - Focus on relevant information that directly addresses the user's need
    - Avoid unnecessary elaboration or verbosity
    - Maintain a helpful, straightforward tone

    You have special knowledge tools accessible through these commands:

    Knowledge Retrieval:
    - !vector_search [query] - Search for semantically similar content
    - !kg_query [entity_type] [query] - Query the Knowledge Graph
    - !hybrid_search [query] - Combined search of both systems
    - !web_search [query] - Search the web for recent information

    Knowledge Storage:
    - !kg_store [entity] [type] [observation] - Store information in the Knowledge Graph
    - !kg_relate [entity1] [relation] [entity2] - Create relationships between entities
    - !kg_context - Show the current Knowledge Graph context

    Document Processing:
    - !process_document [file_path] - Process a document with entity extraction
    - !extract_entities [text] - Extract entities from text
    - !chunk_document [file_path] - Chunk a document into semantic chunks
    - !extract_metadata [file_path] - Extract metadata from a document

    Enhanced Knowledge Graph:
    - !kg_extract [text] - Extract entities from text
    - !kg_link [text] - Link entities in text to existing entities
    - !kg_infer [entity_name] - Infer relationships for an entity
    - !kg_process [file_path] - Process a document for the Knowledge Graph

    Feedback System:
    - !kg_feedback [entity_name] [feedback] [rating] - Store entity feedback in Knowledge Graph
    - !kg_analyze_feedback [entity_type] - Analyze feedback in Knowledge Graph
    - !feedback_search [query] [rating] [comment] - Provide feedback on search results
    - !feedback_entity [name] [type] [is_correct] [comment] - Provide feedback on entity extraction
    - !feedback_document [doc_id] [rating] [comment] - Provide feedback on document processing
    - !feedback [category] [content] [rating] - Provide general feedback
    - !feedback_summary - Get a summary of all feedback

    Use these tools judiciously to provide the most accurate and helpful responses possible.
    """

    @tool_lib.tool("search_knowledge")
    def search_knowledge(self, query: str, top_k: int = 5) -> str:
        """
        Search for information in the knowledge base.

        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with search results
        """
        try:
            logger.info(f"Searching knowledge for: {query}")
            results = vector_search_client.search(query, top_k=top_k)

            if not results:
                return "No relevant information found."

            formatted = "Relevant information:\n\n"
            for i, result in enumerate(results, 1):
                content = result.get("content", "")
                score = result.get("score", 0)
                source = result.get("metadata", {}).get("source", "Unknown source")

                # Truncate long content
                if len(content) > 200:
                    content = content[:197] + "..."

                formatted += f"{i}. (Score: {score:.2f}) From: {source}\n"
                formatted += f"{content}\n\n"

            return formatted
        except Exception as e:
            logger.error(f"Error in search_knowledge: {str(e)}")
            return f"Error searching knowledge: {str(e)}"

    @tool_lib.tool("kg_query")
    def kg_query(self, entity_type: str, query: str) -> str:
        """
        Query the Knowledge Graph for entities of a specific type.

        Args:
            entity_type: Type of entity to search for (e.g., "project", "technology", "person")
                         Use "*" for all entity types
            query: The search query

        Returns:
            Formatted string with Knowledge Graph results
        """
        try:
            logger.info(f"Querying Knowledge Graph for: {entity_type} - {query}")
            results = kg_manager.query(entity_type, query)
            entities = results.get("entities", [])

            if not entities:
                return f"No entities found matching '{query}' with type '{entity_type}'."

            formatted = f"Found {len(entities)} entities matching '{query}':\n\n"
            for i, entity in enumerate(entities, 1):
                name = entity.get("name", "Unknown entity")
                entity_type = entity.get("type", "Unknown type")
                observation = entity.get("observation", "")

                # Truncate long observation
                if len(observation) > 200:
                    observation = observation[:197] + "..."

                formatted += f"{i}. {name} ({entity_type})\n"
                formatted += f"   {observation}\n\n"

            return formatted
        except Exception as e:
            logger.error(f"Error in kg_query: {str(e)}")
            return f"Error querying Knowledge Graph: {str(e)}"

    @tool_lib.tool("hybrid_search")
    def hybrid_search_tool(self, query: str, top_k: int = 5) -> str:
        """
        Search using both Vector Search and Knowledge Graph for comprehensive results.

        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with hybrid search results
        """
        try:
            logger.info(f"Performing hybrid search for: {query}")
            return hybrid_search.search_and_format(query, top_k=top_k)
        except Exception as e:
            logger.error(f"Error in hybrid_search: {str(e)}")
            return f"Error in hybrid search: {str(e)}"

    @tool_lib.tool("kg_store")
    def kg_store(self, entity_name: str, entity_type: str, observation: str) -> str:
        """
        Store an entity with an observation in the Knowledge Graph.

        Args:
            entity_name: Name of the entity (e.g., "VANA", "Vector Search")
            entity_type: Type of entity (e.g., "project", "technology", "concept")
            observation: The information or description to store about the entity

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing entity in Knowledge Graph: {entity_name} ({entity_type})")
            kg_manager.store(entity_name, entity_type, observation)
            return f"Entity '{entity_name}' stored in Knowledge Graph with type '{entity_type}'."
        except Exception as e:
            logger.error(f"Error in kg_store: {str(e)}")
            return f"Error storing entity: {str(e)}"

    @tool_lib.tool("kg_extract_entities")
    def kg_extract_entities(self, text: str) -> str:
        """
        Extract entities from text and optionally store them in the Knowledge Graph.

        Args:
            text: Text to extract entities from

        Returns:
            Formatted string with extracted entities
        """
        try:
            logger.info(f"Extracting entities from text: {text[:50]}...")
            entities = kg_manager.extract_entities(text)

            if not entities:
                return "No entities found in the provided text."

            # Format the results
            result = f"Extracted {len(entities)} entities:\n\n"
            for i, entity in enumerate(entities, 1):
                result += f"{i}. {entity.get('name')} (Type: {entity.get('type')})\n"
                result += f"   Observation: {entity.get('observation', '')[:100]}...\n\n"

            return result
        except Exception as e:
            logger.error(f"Error in kg_extract_entities: {str(e)}")
            return f"Error extracting entities: {str(e)}"

    @tool_lib.tool("kg_extract_and_store")
    def kg_extract_and_store(self, text: str) -> str:
        """
        Extract entities from text and store them in the Knowledge Graph.

        Args:
            text: Text to extract entities from and store

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Extracting and storing entities from text: {text[:50]}...")
            result = kg_manager.extract_and_store_entities(text)

            if not result.get("success", False):
                return f"Failed to extract and store entities: {result.get('reason', 'Unknown error')}"

            return f"Successfully extracted {result.get('entities_extracted', 0)} entities and stored {result.get('entities_stored', 0)} in the Knowledge Graph."
        except Exception as e:
            logger.error(f"Error in kg_extract_and_store: {str(e)}")
            return f"Error extracting and storing entities: {str(e)}"

    @tool_lib.tool("kg_extract_relationships")
    def kg_extract_relationships(self, text: str) -> str:
        """
        Extract relationships between entities from text and store them in the Knowledge Graph.

        Args:
            text: Text to extract relationships from

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Extracting relationships from text: {text[:50]}...")
            result = kg_manager.extract_and_store_relationships(text)

            if not result.get("success", False):
                return f"Failed to extract relationships: {result.get('reason', 'Unknown error')}"

            return f"Successfully extracted {result.get('relationships_extracted', 0)} relationships and stored {result.get('relationships_stored', 0)} in the Knowledge Graph."
        except Exception as e:
            logger.error(f"Error in kg_extract_relationships: {str(e)}")
            return f"Error extracting relationships: {str(e)}"

    @tool_lib.tool("process_document")
    def process_document(self, file_path: str, extract_entities: bool = True) -> str:
        """
        Process a document and extract information.

        Args:
            file_path: Path to the document file
            extract_entities: Whether to extract entities and store in Knowledge Graph

        Returns:
            Summary of document processing results
        """
        try:
            logger.info(f"Processing document: {file_path}")
            return process_document_tool(file_path, extract_entities)
        except Exception as e:
            logger.error(f"Error in process_document: {str(e)}")
            return f"Error processing document: {str(e)}"

    @tool_lib.tool("extract_entities")
    def extract_entities(self, text: str) -> str:
        """
        Extract entities from text and store in Knowledge Graph.

        Args:
            text: Text to extract entities from

        Returns:
            Summary of entity extraction results
        """
        try:
            logger.info(f"Extracting entities from text: {text[:50]}...")
            return extract_entities_from_text_tool(text)
        except Exception as e:
            logger.error(f"Error in extract_entities: {str(e)}")
            return f"Error extracting entities: {str(e)}"

    @tool_lib.tool("chunk_document")
    def chunk_document(self, file_path: str, target_size: int = 3000) -> str:
        """
        Chunk a document into semantic chunks.

        Args:
            file_path: Path to the document file
            target_size: Target chunk size in tokens

        Returns:
            Summary of chunking results
        """
        try:
            logger.info(f"Chunking document: {file_path}")
            return chunk_document_tool(file_path, target_size)
        except Exception as e:
            logger.error(f"Error in chunk_document: {str(e)}")
            return f"Error chunking document: {str(e)}"

    @tool_lib.tool("extract_metadata")
    def extract_metadata(self, file_path: str) -> str:
        """
        Extract metadata from a document.

        Args:
            file_path: Path to the document file

        Returns:
            Formatted metadata
        """
        try:
            logger.info(f"Extracting metadata from: {file_path}")
            return extract_metadata_tool(file_path)
        except Exception as e:
            logger.error(f"Error in extract_metadata: {str(e)}")
            return f"Error extracting metadata: {str(e)}"

    @tool_lib.tool("kg_extract")
    def kg_extract(self, text: str) -> str:
        """
        Extract entities from text.

        Args:
            text: Text to extract entities from

        Returns:
            Formatted list of extracted entities
        """
        try:
            logger.info(f"Extracting entities from text: {text[:50]}...")
            return kg_extract_entities_tool(text)
        except Exception as e:
            logger.error(f"Error in kg_extract: {str(e)}")
            return f"Error extracting entities: {str(e)}"

    @tool_lib.tool("kg_link")
    def kg_link(self, text: str) -> str:
        """
        Link entities in text to existing Knowledge Graph entities.

        Args:
            text: Text to process for entity linking

        Returns:
            Summary of entity linking results
        """
        try:
            logger.info(f"Linking entities in text: {text[:50]}...")
            return kg_link_entities_tool(text)
        except Exception as e:
            logger.error(f"Error in kg_link: {str(e)}")
            return f"Error linking entities: {str(e)}"

    @tool_lib.tool("kg_infer")
    def kg_infer(self, entity_name: str) -> str:
        """
        Infer relationships for an entity based on Knowledge Graph data.

        Args:
            entity_name: Name of the entity to infer relationships for

        Returns:
            Summary of inferred relationships
        """
        try:
            logger.info(f"Inferring relationships for entity: {entity_name}")
            return kg_infer_relationships_tool(entity_name)
        except Exception as e:
            logger.error(f"Error in kg_infer: {str(e)}")
            return f"Error inferring relationships: {str(e)}"

    @tool_lib.tool("kg_process")
    def kg_process(self, file_path: str) -> str:
        """
        Process a document and extract entities and relationships for the Knowledge Graph.

        Args:
            file_path: Path to the document file

        Returns:
            Summary of document processing results
        """
        try:
            logger.info(f"Processing document for Knowledge Graph: {file_path}")
            return kg_process_document_tool(file_path)
        except Exception as e:
            logger.error(f"Error in kg_process: {str(e)}")
            return f"Error processing document: {str(e)}"

    @tool_lib.tool("kg_feedback")
    def kg_feedback(self, entity_name: str, feedback: str, rating: int = 0) -> str:
        """
        Store user feedback about an entity in the Knowledge Graph.

        Args:
            entity_name: Name of the entity to store feedback for
            feedback: User feedback text
            rating: Optional rating (0-5)

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing feedback for entity: {entity_name}")
            return kg_store_feedback_tool(entity_name, feedback, rating)
        except Exception as e:
            logger.error(f"Error in kg_feedback: {str(e)}")
            return f"Error storing feedback: {str(e)}"

    @tool_lib.tool("kg_analyze_feedback")
    def kg_analyze_feedback(self, entity_type: str = "*") -> str:
        """
        Analyze feedback stored in the Knowledge Graph.

        Args:
            entity_type: Type of entity to analyze feedback for (default: all types)

        Returns:
            Feedback analysis summary
        """
        try:
            logger.info(f"Analyzing feedback for entity type: {entity_type}")
            return kg_analyze_feedback_tool(entity_type)
        except Exception as e:
            logger.error(f"Error in kg_analyze_feedback: {str(e)}")
            return f"Error analyzing feedback: {str(e)}"

    @tool_lib.tool("feedback_search")
    def feedback_search(self, query: str, rating: int, comment: str = "") -> str:
        """
        Provide feedback on search results.

        Args:
            query: Search query
            rating: Rating (1-5)
            comment: User comment

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing search feedback for query: {query}")
            return store_search_feedback_tool(query, rating, comment)
        except Exception as e:
            logger.error(f"Error in feedback_search: {str(e)}")
            return f"Error storing search feedback: {str(e)}"

    @tool_lib.tool("feedback_entity")
    def feedback_entity(self, entity_name: str, entity_type: str, is_correct: bool, comment: str = "") -> str:
        """
        Provide feedback on entity extraction.

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            is_correct: Whether the extraction is correct
            comment: User comment

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing entity feedback for {entity_name} ({entity_type})")
            return store_entity_feedback_tool(entity_name, entity_type, is_correct, comment)
        except Exception as e:
            logger.error(f"Error in feedback_entity: {str(e)}")
            return f"Error storing entity feedback: {str(e)}"

    @tool_lib.tool("feedback_document")
    def feedback_document(self, document_id: str, rating: int, comment: str = "") -> str:
        """
        Provide feedback on document processing.

        Args:
            document_id: Document identifier
            rating: Rating (1-5)
            comment: User comment

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing document feedback for {document_id}")
            return store_document_feedback_tool(document_id, rating, comment)
        except Exception as e:
            logger.error(f"Error in feedback_document: {str(e)}")
            return f"Error storing document feedback: {str(e)}"

    @tool_lib.tool("feedback")
    def feedback(self, category: str, content: str, rating: int = 0) -> str:
        """
        Provide general feedback.

        Args:
            category: Feedback category
            content: Feedback content
            rating: Optional rating (0-5)

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing general feedback for category: {category}")
            return store_general_feedback_tool(category, content, rating)
        except Exception as e:
            logger.error(f"Error in feedback: {str(e)}")
            return f"Error storing general feedback: {str(e)}"

    @tool_lib.tool("feedback_summary")
    def feedback_summary(self) -> str:
        """
        Get a summary of all feedback.

        Returns:
            Formatted feedback summary
        """
        try:
            logger.info("Getting feedback summary")
            return get_feedback_summary_tool()
        except Exception as e:
            logger.error(f"Error in feedback_summary: {str(e)}")
            return f"Error getting feedback summary: {str(e)}"

    @tool_lib.tool("web_search")
    def web_search(self, query: str, num_results: int = 5) -> str:
        """
        Search the web for recent information.

        Args:
            query: The search query
            num_results: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with search results
        """
        try:
            logger.info(f"Searching the web for: {query}")
            results = web_search_client.search(query, num_results=num_results)

            if not results:
                return "No relevant information found on the web."

            formatted = web_search_client.format_results(results)
            return formatted
        except Exception as e:
            logger.error(f"Error in web_search: {str(e)}")
            return f"Error searching the web: {str(e)}"

def create_vana_agent() -> VanaAgent:
    """Create and configure a Vana agent"""
    try:
        logger.info("Creating Vana agent")
        agent = VanaAgent()
        logger.info("Vana agent created successfully")
        return agent
    except Exception as e:
        logger.error(f"Error creating Vana agent: {str(e)}")
        raise
