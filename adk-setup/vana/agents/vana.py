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

# Import orchestration components
from vana.orchestration.task_router import TaskRouter
from vana.orchestration.result_synthesizer import ResultSynthesizer
from vana.context import ConversationContextManager
from vana.adk_integration import (
    ADKSessionAdapter,
    ADKToolAdapter,
    ADKStateManager,
    ADKEventHandler
)
from tools.hybrid_search import HybridSearch
from tools.enhanced_hybrid_search import EnhancedHybridSearch
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
from vana.tools.persistent_memory_tools import (
    search_persistent_memory_tool,
    store_entity_tool,
    create_relationship_tool
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
hybrid_search = EnhancedHybridSearch()
kg_manager = KnowledgeGraphManager()
vector_search_client = VectorSearchClient()
web_search_client = WebSearchClient()

class VanaAgent(agent_lib.LlmAgent):
    """
    VANA Agent - Primary interface leveraging knowledge tools via MCP
    """

    name = "vana"
    model = "gemini-1.5-pro"

    def __init__(self):
        """Initialize the Vana agent."""
        super().__init__()

        # Initialize orchestration components
        self.task_router = TaskRouter()
        self.result_synthesizer = ResultSynthesizer()

        # Initialize context management and ADK integration
        self.context_manager = ConversationContextManager()
        self.session_adapter = ADKSessionAdapter(self.context_manager)
        self.tool_adapter = ADKToolAdapter()
        self.state_manager = ADKStateManager(self.session_adapter, self.context_manager)
        self.event_handler = ADKEventHandler(
            self.session_adapter,
            self.state_manager,
            self.context_manager
        )

        # Initialize agent state
        self.current_context = None

    def determine_agent(self, task: str) -> str:
        """
        Determine which agent should handle a task.

        Args:
            task: Task description

        Returns:
            Agent ID
        """
        agent_id, confidence = self.task_router.route_task(task)
        logger.info(f"Task '{task}' routed to agent '{agent_id}' with confidence {confidence:.2f}")
        return agent_id

    def create_context(self, user_id: str, session_id: str, scope: str = None) -> Dict[str, Any]:
        """
        Create a new context for a conversation.

        Args:
            user_id: User ID
            session_id: Session ID
            scope: Context scope (session, user, or global)

        Returns:
            Context object
        """
        # Create session in ADK if available
        session_info = self.session_adapter.create_session(user_id, session_id)

        # Get context ID
        context_id = session_info["vana_context_id"]

        # Get the context
        self.current_context = self.context_manager.get_conversation_context(context_id)

        # Return serialized context
        return self.current_context.serialize()

    def synthesize_results(self, results: List[Dict[str, Any]]) -> str:
        """
        Synthesize results from multiple agents.

        Args:
            results: List of results from agents

        Returns:
            Synthesized result
        """
        synthesized = self.result_synthesizer.synthesize(results)
        return self.result_synthesizer.format(synthesized)

    def process_message(self, user_id: str, session_id: str, message: str) -> str:
        """
        Process a user message with context management.

        Args:
            user_id: User ID
            session_id: Session ID
            message: User message

        Returns:
            Assistant response
        """
        # Get or create context
        if not self.current_context:
            self.create_context(user_id, session_id)

        # Add message to context
        self.event_handler.handle_message_received(
            context_id=self.current_context.id,
            message=message
        )

        # Process message
        try:
            # Check if message is a command
            if message.startswith("!"):
                # Handle command
                response = self.handle_command(message)
            else:
                # Generate response
                response = self.generate_response(message)

            # Add response to context
            self.event_handler.handle_message_sent(
                context_id=self.current_context.id,
                message=response
            )

            # Sync state
            self.state_manager.sync_state(self.current_context.id)

            return response
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            error_response = f"Error processing message: {str(e)}"

            # Log error in context
            self.event_handler.handle_error(
                context_id=self.current_context.id,
                error_message=str(e),
                error_type="message_processing_error"
            )

            return error_response

    def handle_command(self, command: str) -> str:
        """
        Handle a command message.

        Args:
            command: Command message

        Returns:
            Command response
        """
        # Extract command name and arguments
        parts = command.split()
        cmd_name = parts[0][1:]  # Remove ! prefix
        args = parts[1:]

        # Handle different commands
        if cmd_name == "vector_search" and hasattr(self, "search_knowledge_tool"):
            query = " ".join(args)
            return self.search_knowledge_tool(query)
        elif cmd_name == "kg_query" and hasattr(self, "kg_query_tool"):
            if len(args) >= 2:
                entity_type = args[0]
                query = " ".join(args[1:])
                return self.kg_query_tool(entity_type, query)
            else:
                return "Usage: !kg_query [entity_type] [query]"
        elif cmd_name == "hybrid_search" and hasattr(self, "hybrid_search_tool"):
            query = " ".join(args)
            return self.hybrid_search_tool(query)
        elif cmd_name == "enhanced_search" and hasattr(self, "enhanced_search_tool"):
            query = " ".join(args)
            return self.enhanced_search_tool(query)
        elif cmd_name == "web_search" and hasattr(self, "web_search_tool"):
            query = " ".join(args)
            return self.web_search_tool(query)
        elif cmd_name == "memory_search" and hasattr(self, "memory_search"):
            query = " ".join(args)
            return self.memory_search(query)
        else:
            return f"Unknown command: {cmd_name}"

    def generate_response(self, message: str) -> str:
        """
        Generate a response to a user message.

        Args:
            message: User message

        Returns:
            Assistant response
        """
        try:
            # Get relevant memory
            if self.current_context:
                relevant_memory = self.context_manager.fetch_relevant_memory(
                    query=message,
                    user_id=self.current_context.user_id,
                    top_k=3
                )

                # Get relevant contexts
                relevant_contexts = self.context_manager.get_relevant_contexts(
                    query=message,
                    user_id=self.current_context.user_id,
                    top_k=2
                )

                # Summarize relevant contexts
                context_summaries = []
                for context in relevant_contexts:
                    if context.id != self.current_context.id:  # Skip current context
                        summary = self.context_manager.summarize_context(context)
                        if summary:
                            context_summaries.append(summary)

                # Add relevant information to prompt
                prompt = message
                if relevant_memory:
                    memory_text = "\n\nRelevant memory:\n" + "\n".join(
                        [f"- {item.get('content', '')}" for item in relevant_memory]
                    )
                    prompt += memory_text

                if context_summaries:
                    context_text = "\n\nRelevant context:\n" + "\n".join(
                        [f"- {summary}" for summary in context_summaries]
                    )
                    prompt += context_text
            else:
                prompt = message

            # Generate response using ADK
            response = super().generate_content(prompt)

            # Extract text from response
            if hasattr(response, "text"):
                return response.text
            elif hasattr(response, "parts"):
                return "".join([part.text for part in response.parts])
            else:
                return str(response)
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return f"Error generating response: {str(e)}"

    system_prompt = """
    # Project Vana — Lead Developer Role (Vana Protocol)

    ## Identity

    You are **Vana**, Lead Developer, Architect, and Strategist for Project Vana.
    You are a technical leader responsible for driving execution, maintaining project quality, and ensuring critical systems thinking.
    You operate with autonomy, tactical precision, and a collaborative but independent mindset.

    Nick is technical but not a coder. You support strategic advancement through clear actions, independent analysis, and rigor, not agreement or flattery.

    ## Core Responsibilities

    - Progress Project Vana's goals with autonomy and initiative
    - Manage integrations and outputs of Auggie (augment code agent)
    - Maintain clean project hygiene across code, documentation, and architecture
    - Execute real-world system changes through GitHub API and verified automation paths
    - Prioritize finding existing solutions before building new ones
    - Actively prevent risks through early identification and escalation

    ## Knowledge Access

    Vana has access to multiple knowledge sources:
    - **Vector Search**: For semantic similarity search across project documentation
    - **Knowledge Graph**: Via Context7 MCP server for structured knowledge and relationships
    - **Web Search**: For retrieving up-to-date information from the internet
    - **GitHub Repository**: For accessing the latest code and documentation

    When answering questions, Vana should:
    1. First check the local knowledge base via Vector Search
    2. Query the Knowledge Graph via Context7 MCP for structured information
    3. Use web search when information might be outdated or not available locally
    4. Combine information from multiple sources for comprehensive answers

    ## Personality and Interaction Principles

    - Communicate with energy, clarity, and focus — professional but not robotic
    - Avoid praise, affirmations, or agreement without validation
    - Prioritize critical thinking, counterexamples, and challenge assumptions when necessary
    - Maintain an engaged tone: brief wit is acceptable if it does not distract from shipping

    You have special knowledge tools accessible through these commands:

    Knowledge Retrieval:
    - !vector_search [query] - Search for semantically similar content
    - !kg_query [entity_type] [query] - Query the Knowledge Graph
    - !hybrid_search [query] - Combined search of Vector Search and Knowledge Graph
    - !enhanced_search [query] - Combined search of Vector Search, Knowledge Graph, and Web Search
    - !web_search [query] - Search the web for recent information
    - !memory_search [query] - Search the persistent memory system

    Knowledge Storage:
    - !kg_store [entity] [type] [observation] - Store information in the Knowledge Graph
    - !kg_relate [entity1] [relation] [entity2] - Create relationships between entities
    - !kg_context - Show the current Knowledge Graph context
    - !memory_store [entity] [type] [observation1, observation2, ...] - Store entity in persistent memory
    - !memory_relate [entity1] [relation] [entity2] - Create relationship in persistent memory

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

    @tool_lib.tool("enhanced_search")
    def enhanced_search_tool(self, query: str, top_k: int = 5) -> str:
        """
        Search using Vector Search, Knowledge Graph, and Web Search for comprehensive results.

        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with enhanced search results
        """
        try:
            logger.info(f"Performing enhanced search for: {query}")
            results = hybrid_search.search(query, top_k=top_k, include_web=True)
            return hybrid_search.format_results(results)
        except Exception as e:
            logger.error(f"Error in enhanced_search: {str(e)}")
            return f"Error in enhanced search: {str(e)}"

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

    @tool_lib.tool("memory_search")
    async def memory_search(self, query: str, top_k: int = 5) -> str:
        """
        Search the persistent memory system for relevant information.

        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)

        Returns:
            Formatted string with search results
        """
        try:
            logger.info(f"Searching persistent memory for: {query}")
            return await search_persistent_memory_tool(query, top_k)
        except Exception as e:
            logger.error(f"Error in memory_search: {str(e)}")
            return f"Error searching persistent memory: {str(e)}"

    @tool_lib.tool("memory_store")
    def memory_store(self, entity_name: str, entity_type: str, observations: List[str]) -> str:
        """
        Store an entity in the persistent memory system.

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            observations: List of observations about the entity

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing entity in persistent memory: {entity_name} ({entity_type})")
            return store_entity_tool(entity_name, entity_type, observations)
        except Exception as e:
            logger.error(f"Error in memory_store: {str(e)}")
            return f"Error storing entity in persistent memory: {str(e)}"

    @tool_lib.tool("memory_relate")
    def memory_relate(self, from_entity: str, relationship: str, to_entity: str) -> str:
        """
        Create a relationship between entities in the persistent memory system.

        Args:
            from_entity: Name of the source entity
            relationship: Type of relationship
            to_entity: Name of the target entity

        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Creating relationship in persistent memory: {from_entity} {relationship} {to_entity}")
            return create_relationship_tool(from_entity, relationship, to_entity)
        except Exception as e:
            logger.error(f"Error in memory_relate: {str(e)}")
            return f"Error creating relationship in persistent memory: {str(e)}"

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
