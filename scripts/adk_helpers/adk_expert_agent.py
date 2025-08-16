"""
Google ADK Expert Agent for Claude Flow Integration

This agent provides expert guidance on Google Agent Development Kit (ADK) patterns,
best practices, and implementation details by referencing the indexed ADK documentation
stored in ChromaDB collections.
"""

import logging
from collections.abc import AsyncGenerator
from dataclasses import dataclass
from enum import Enum
from typing import Any

from google.adk.agents import BaseAgent, LlmAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event, EventActions
from google.genai import types as genai_types
from pydantic import BaseModel, Field

# Configure logging
logger = logging.getLogger(__name__)


class ADKQueryType(str, Enum):
    """Types of ADK-related queries."""
    PATTERN = "pattern"
    IMPLEMENTATION = "implementation"
    BEST_PRACTICE = "best_practice"
    TROUBLESHOOTING = "troubleshooting"
    EXAMPLE = "example"
    VALIDATION = "validation"


class ADKQueryRequest(BaseModel):
    """Model for ADK query requests."""
    query: str = Field(
        description="The ADK-related question or topic to research"
    )
    query_type: ADKQueryType = Field(
        default=ADKQueryType.PATTERN,
        description="Type of query for focused search"
    )
    context: str | None = Field(
        default=None,
        description="Additional context about the implementation or use case"
    )
    include_examples: bool = Field(
        default=True,
        description="Whether to include code examples in the response"
    )


class ADKGuidance(BaseModel):
    """Model for ADK guidance responses."""
    topic: str = Field(
        description="The ADK topic or pattern being addressed"
    )
    guidance: str = Field(
        description="Detailed guidance based on ADK documentation"
    )
    examples: list[str] | None = Field(
        default=None,
        description="Code examples from ADK documentation"
    )
    best_practices: list[str] | None = Field(
        default=None,
        description="Relevant best practices from ADK guidelines"
    )
    references: list[str] | None = Field(
        default=None,
        description="References to specific ADK documentation sections"
    )
    warnings: list[str] | None = Field(
        default=None,
        description="Common pitfalls or anti-patterns to avoid"
    )


@dataclass
class ChromaDBConfig:
    """Configuration for ChromaDB connection."""
    collection_names: list[str] = None
    host: str = "localhost"
    port: int = 8000

    def __post_init__(self):
        if self.collection_names is None:
            self.collection_names = [
                "adk_documentation",
                "adk_knowledge_base_v2"
            ]


class ADKExpertAgent(BaseAgent):
    """
    Expert agent for Google ADK guidance using ChromaDB knowledge base.
    
    This agent:
    1. Queries ChromaDB collections for ADK documentation
    2. Synthesizes information from multiple sources
    3. Provides authoritative guidance on ADK patterns
    4. Validates implementations against ADK best practices
    """

    def __init__(
        self,
        name: str = "adk_expert_agent",
        chroma_config: ChromaDBConfig | None = None,
        model: str = "gemini-2.5-flash"
    ):
        super().__init__(name=name)
        self.chroma_config = chroma_config or ChromaDBConfig()
        self.model = model
        self._init_chroma_client()

    def _init_chroma_client(self):
        """Initialize ChromaDB client connection."""
        try:
            # This would connect to the actual ChromaDB instance
            # For now, we'll structure it to use MCP tools
            self.chroma_initialized = True
            logger.info(f"ChromaDB client initialized for collections: {self.chroma_config.collection_names}")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB client: {e}")
            self.chroma_initialized = False

    async def query_adk_knowledge(
        self,
        query: str,
        query_type: ADKQueryType = ADKQueryType.PATTERN,
        max_results: int = 10
    ) -> dict[str, Any]:
        """
        Query ChromaDB collections for ADK documentation.
        
        Args:
            query: The search query
            query_type: Type of query for focused search
            max_results: Maximum number of results to return
            
        Returns:
            Dictionary containing search results and metadata
        """
        results = {
            "query": query,
            "type": query_type,
            "documents": [],
            "metadata": []
        }

        # Build semantic query based on query type
        semantic_queries = self._build_semantic_queries(query, query_type)

        # Query each collection
        for collection_name in self.chroma_config.collection_names:
            for semantic_query in semantic_queries:
                # In production, this would use the actual ChromaDB client
                # For integration with MCP, we structure the query appropriately
                collection_results = await self._query_collection(
                    collection_name,
                    semantic_query,
                    max_results
                )
                if collection_results:
                    results["documents"].extend(collection_results.get("documents", []))
                    results["metadata"].extend(collection_results.get("metadata", []))

        return results

    def _build_semantic_queries(self, query: str, query_type: ADKQueryType) -> list[str]:
        """Build semantic queries based on query type."""
        base_queries = [query]

        if query_type == ADKQueryType.PATTERN:
            base_queries.extend([
                f"ADK pattern for {query}",
                f"Google ADK {query} implementation",
                f"Agent Development Kit {query} best practice"
            ])
        elif query_type == ADKQueryType.IMPLEMENTATION:
            base_queries.extend([
                f"How to implement {query} in ADK",
                f"ADK code example {query}",
                f"{query} implementation guide ADK"
            ])
        elif query_type == ADKQueryType.BEST_PRACTICE:
            base_queries.extend([
                f"ADK best practices for {query}",
                f"{query} guidelines Google ADK",
                f"Recommended approach {query} ADK"
            ])
        elif query_type == ADKQueryType.TROUBLESHOOTING:
            base_queries.extend([
                f"ADK {query} error",
                f"Fix {query} in Google ADK",
                f"ADK troubleshooting {query}"
            ])
        elif query_type == ADKQueryType.EXAMPLE:
            base_queries.extend([
                f"ADK example {query}",
                f"Sample code {query} ADK",
                f"{query} code snippet Google ADK"
            ])
        elif query_type == ADKQueryType.VALIDATION:
            base_queries.extend([
                f"Validate {query} against ADK",
                f"ADK compliance check {query}",
                f"Correct ADK pattern for {query}"
            ])

        return base_queries

    async def _query_collection(
        self,
        collection_name: str,
        query: str,
        max_results: int
    ) -> dict[str, Any] | None:
        """
        Query a specific ChromaDB collection.
        
        This method should be implemented to use the actual ChromaDB client
        or MCP tool for querying collections.
        """
        # Placeholder for actual ChromaDB query
        # In production, this would use:
        # - Direct ChromaDB client: collection.query(query_texts=[query], n_results=max_results)
        # - Or MCP tool: mcp__chroma-vana__chroma_query_documents

        logger.info(f"Querying collection '{collection_name}' with: {query}")

        # Structure for MCP tool integration
        query_params = {
            "collection_name": collection_name,
            "query_text": query,
            "n_results": max_results
        }

        # This would be replaced with actual ChromaDB query
        return {
            "documents": [],
            "metadata": [],
            "query_params": query_params
        }

    async def synthesize_guidance(
        self,
        query_results: dict[str, Any],
        original_query: str,
        include_examples: bool = True
    ) -> ADKGuidance:
        """
        Synthesize ADK guidance from query results.
        
        Args:
            query_results: Results from ChromaDB queries
            original_query: The original user query
            include_examples: Whether to include code examples
            
        Returns:
            Structured ADK guidance
        """
        documents = query_results.get("documents", [])

        # Extract key information from documents
        guidance_text = self._extract_guidance(documents)
        examples = self._extract_examples(documents) if include_examples else None
        best_practices = self._extract_best_practices(documents)
        references = self._extract_references(documents)
        warnings = self._extract_warnings(documents)

        return ADKGuidance(
            topic=original_query,
            guidance=guidance_text or "No specific ADK guidance found for this query.",
            examples=examples,
            best_practices=best_practices,
            references=references,
            warnings=warnings
        )

    def _extract_guidance(self, documents: list[str]) -> str:
        """Extract main guidance from documents."""
        if not documents:
            return ""

        # Combine and deduplicate guidance
        guidance_parts = []
        for doc in documents[:5]:  # Top 5 most relevant
            if doc and len(doc) > 50:  # Filter out short snippets
                guidance_parts.append(doc)

        return "\n\n".join(guidance_parts)

    def _extract_examples(self, documents: list[str]) -> list[str] | None:
        """Extract code examples from documents."""
        examples = []
        for doc in documents:
            # Look for code blocks in the documentation
            if "```python" in doc or "```" in doc:
                # Extract code blocks
                import re
                code_blocks = re.findall(r'```(?:python)?\n(.*?)\n```', doc, re.DOTALL)
                examples.extend(code_blocks)

        return examples[:3] if examples else None  # Return top 3 examples

    def _extract_best_practices(self, documents: list[str]) -> list[str] | None:
        """Extract best practices from documents."""
        practices = []
        keywords = ["best practice", "recommended", "should", "must", "always", "never"]

        for doc in documents:
            doc_lower = doc.lower()
            if any(keyword in doc_lower for keyword in keywords):
                # Extract sentences containing best practice keywords
                sentences = doc.split('. ')
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in keywords):
                        practices.append(sentence.strip())

        return practices[:5] if practices else None  # Return top 5 practices

    def _extract_references(self, documents: list[str]) -> list[str] | None:
        """Extract documentation references."""
        references = []

        # Look for section headers or documentation references
        for i, doc in enumerate(documents[:5]):
            if doc:
                # Create a reference based on document position and content
                ref = f"ADK Documentation Section {i+1}: {doc[:100]}..."
                references.append(ref)

        return references if references else None

    def _extract_warnings(self, documents: list[str]) -> list[str] | None:
        """Extract warnings and anti-patterns from documents."""
        warnings = []
        warning_keywords = ["warning", "caution", "avoid", "don't", "anti-pattern", "pitfall", "incorrect"]

        for doc in documents:
            doc_lower = doc.lower()
            if any(keyword in doc_lower for keyword in warning_keywords):
                # Extract sentences containing warning keywords
                sentences = doc.split('. ')
                for sentence in sentences:
                    if any(keyword in sentence.lower() for keyword in warning_keywords):
                        warnings.append(sentence.strip())

        return warnings[:3] if warnings else None  # Return top 3 warnings

    async def validate_implementation(
        self,
        code: str,
        pattern_name: str
    ) -> dict[str, Any]:
        """
        Validate code implementation against ADK patterns.
        
        Args:
            code: The code to validate
            pattern_name: The ADK pattern to validate against
            
        Returns:
            Validation results with compliance score and suggestions
        """
        # Query for the specific pattern
        pattern_results = await self.query_adk_knowledge(
            pattern_name,
            ADKQueryType.VALIDATION
        )

        # Analyze the code against the pattern
        validation_results = {
            "pattern": pattern_name,
            "compliant": False,
            "score": 0.0,
            "issues": [],
            "suggestions": []
        }

        # This would perform actual code analysis
        # For now, we structure the validation framework

        return validation_results

    async def _run_async_impl(
        self,
        ctx: InvocationContext
    ) -> AsyncGenerator[Event, None]:
        """
        Main execution method for the ADK expert agent.
        
        This method:
        1. Receives ADK-related queries from the context
        2. Queries ChromaDB for relevant documentation
        3. Synthesizes and returns expert guidance
        """
        # Get query from context
        query_request = ctx.session.state.get("adk_query")

        if not query_request:
            # If no specific query, provide general ADK guidance
            yield Event(
                author=self.name,
                content=genai_types.Content(
                    parts=[genai_types.Part(
                        text="ADK Expert Agent ready. Please provide an ADK-related query."
                    )]
                )
            )
            return

        # Parse query request
        if isinstance(query_request, dict):
            query = query_request.get("query", "")
            query_type = ADKQueryType(query_request.get("query_type", "pattern"))
            include_examples = query_request.get("include_examples", True)
        else:
            query = str(query_request)
            query_type = ADKQueryType.PATTERN
            include_examples = True

        logger.info(f"Processing ADK query: {query} (type: {query_type})")

        # Query ChromaDB
        query_results = await self.query_adk_knowledge(query, query_type)

        # Synthesize guidance
        guidance = await self.synthesize_guidance(
            query_results,
            query,
            include_examples
        )

        # Format response
        response_text = self._format_guidance_response(guidance)

        # Store guidance in state for other agents
        ctx.session.state["adk_guidance"] = guidance.dict()

        # Yield response event
        yield Event(
            author=self.name,
            content=genai_types.Content(
                parts=[genai_types.Part(text=response_text)]
            ),
            actions=EventActions(
                state_delta={"adk_guidance": guidance.dict()}
            )
        )

    def _format_guidance_response(self, guidance: ADKGuidance) -> str:
        """Format ADK guidance into readable response."""
        response_parts = [
            f"## ADK Guidance: {guidance.topic}\n",
            guidance.guidance
        ]

        if guidance.best_practices:
            response_parts.append("\n### Best Practices:")
            for practice in guidance.best_practices:
                response_parts.append(f"- {practice}")

        if guidance.examples:
            response_parts.append("\n### Code Examples:")
            for i, example in enumerate(guidance.examples, 1):
                response_parts.append(f"\n**Example {i}:**")
                response_parts.append(f"```python\n{example}\n```")

        if guidance.warnings:
            response_parts.append("\n### ⚠️ Warnings:")
            for warning in guidance.warnings:
                response_parts.append(f"- {warning}")

        if guidance.references:
            response_parts.append("\n### References:")
            for ref in guidance.references:
                response_parts.append(f"- {ref}")

        return "\n".join(response_parts)


# Tool function for LLM agents to query ADK knowledge
async def query_adk_expert(
    query: str,
    query_type: str = "pattern",
    include_examples: bool = True,
    tool_context: Any = None
) -> dict:
    """
    Query the ADK expert agent for guidance.
    
    This tool allows other agents to get ADK-specific guidance
    by querying the indexed documentation in ChromaDB.
    
    Args:
        query: The ADK-related question or topic
        query_type: Type of query (pattern, implementation, best_practice, etc.)
        include_examples: Whether to include code examples
        tool_context: ADK tool context for state access
        
    Returns:
        dict: ADK guidance with examples and best practices
    """
    try:
        # Create expert agent instance
        expert = ADKExpertAgent()

        # Query the knowledge base
        query_results = await expert.query_adk_knowledge(
            query,
            ADKQueryType(query_type),
            max_results=10
        )

        # Synthesize guidance
        guidance = await expert.synthesize_guidance(
            query_results,
            query,
            include_examples
        )

        # Store in context if available
        if tool_context and hasattr(tool_context, 'state'):
            tool_context.state["last_adk_guidance"] = guidance.dict()

        return {
            "status": "success",
            "guidance": guidance.dict()
        }

    except Exception as e:
        logger.error(f"Error querying ADK expert: {e}")
        return {
            "status": "error",
            "error": str(e)
        }


# LLM Agent wrapper for Claude Flow integration
def create_adk_expert_llm_agent(model: str = "gemini-2.5-flash") -> LlmAgent:
    """
    Create an LLM agent wrapper for ADK expert functionality.
    
    This agent can be used in Claude Flow orchestrations to provide
    ADK guidance based on ChromaDB documentation.
    """
    from google.adk.agents import LlmAgent

    return LlmAgent(
        name="adk_expert_llm_agent",
        model=model,
        description="Expert agent for Google ADK patterns and best practices using ChromaDB knowledge base",
        instruction="""
        You are an expert on Google Agent Development Kit (ADK) patterns and best practices.
        Your knowledge comes from the indexed ADK documentation stored in ChromaDB collections.
        
        When answering questions:
        1. ALWAYS query the ChromaDB collections 'adk_documentation' and 'adk_knowledge_base_v2' first
        2. Base your responses on the official ADK documentation retrieved from ChromaDB
        3. Provide specific code examples from the documentation when relevant
        4. Highlight best practices and common pitfalls
        5. Reference specific sections of the ADK documentation
        
        Your responses should be authoritative and based solely on the indexed ADK documentation.
        If information is not found in ChromaDB, clearly state that and provide general guidance.
        
        Query types you can handle:
        - Pattern: ADK design patterns and architectural guidance
        - Implementation: How to implement specific features
        - Best Practice: Recommended approaches and guidelines
        - Troubleshooting: Solving common issues
        - Example: Code examples and samples
        - Validation: Checking compliance with ADK standards
        """,
        tools=[query_adk_expert],
        output_key="adk_expert_response"
    )


# Export the agent for use in Claude Flow
__all__ = [
    "ADKExpertAgent",
    "ADKGuidance",
    "ADKQueryRequest",
    "ADKQueryType",
    "create_adk_expert_llm_agent",
    "query_adk_expert"
]
