import logging
from typing import Any, Dict

from .memory_manager import MemoryManager

logger = logging.getLogger(__name__)


# Mock implementation of search_knowledge for testing
async def search_knowledge(query: str, top_k: int = 5) -> Dict[str, Any]:
    """Mock implementation of search_knowledge for testing."""
    logger.info(f"Mock search_knowledge called with query: {query}, top_k: {top_k}")

    # Return mock results
    return {
        "results": [
            {"content": f"Mock result 1 for query: {query}", "score": 0.95, "metadata": {"source": "mock_source_1.md"}},
            {"content": f"Mock result 2 for query: {query}", "score": 0.85, "metadata": {"source": "mock_source_2.md"}},
        ],
        "count": 2,
    }


class HybridSearchDelta:
    """Combines Vector Search and Knowledge Graph search results with delta-based updates."""

    def __init__(self, memory_manager: MemoryManager):
        self.memory_manager = memory_manager

    async def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Perform hybrid search across Vector Search and Knowledge Graph."""
        # Sync memory if needed
        self.memory_manager.sync_if_needed()

        # Get results from Vector Search
        vector_results = await search_knowledge(query, top_k)

        # Get relevant entities from Knowledge Graph
        kg_results = self._search_knowledge_graph(query, top_k)

        # Merge results
        merged_results = self._merge_results(vector_results, kg_results, top_k)

        return merged_results

    def _search_knowledge_graph(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search the Knowledge Graph for relevant entities."""
        # Implementation would connect to the knowledge graph search endpoint
        # This is a simplified example

        # Normally would implement semantic search on the graph
        # For now, just returning relevant entities by simple matching
        results = []
        for entity_id, entity in self.memory_manager.local_cache.items():
            # Simple text matching (would be more sophisticated in production)
            if query.lower() in entity.get("name", "").lower() or any(
                query.lower() in obs.lower() for obs in entity.get("observations", [])
            ):
                results.append(
                    {
                        "id": entity_id,
                        "name": entity.get("name"),
                        "type": entity.get("type"),
                        "observations": entity.get("observations", []),
                        "source": "knowledge_graph",
                    }
                )

                if len(results) >= top_k:
                    break

        return {"results": results, "count": len(results)}

    def _merge_results(
        self, vector_results: Dict[str, Any], kg_results: Dict[str, Any], top_k: int = 5
    ) -> Dict[str, Any]:
        """Merge Vector Search and Knowledge Graph results."""
        # This is a simple merge - production would use more sophisticated
        # relevance scoring and deduplication

        all_results = []

        # Add Vector Search results
        if "results" in vector_results:
            for result in vector_results["results"]:
                result["source_type"] = "vector_search"
                all_results.append(result)

        # Add Knowledge Graph results
        if "results" in kg_results:
            for result in kg_results["results"]:
                result["source_type"] = "knowledge_graph"
                all_results.append(result)

        # Simple deduplication by content
        seen_content = set()
        deduplicated_results = []

        for result in all_results:
            content = result.get("content", "")
            if not content or content not in seen_content:
                if content:
                    seen_content.add(content)
                deduplicated_results.append(result)

        # Limit to top_k results
        limited_results = deduplicated_results[:top_k]

        return {
            "results": limited_results,
            "count": len(limited_results),
            "sources": {"vector_search": vector_results.get("count", 0), "knowledge_graph": kg_results.get("count", 0)},
        }

    def format_results(self, results: Dict[str, Any]) -> str:
        """Format search results for display."""
        if not results or not results.get("results"):
            return "No results found."

        formatted = "Hybrid Search Results:\n\n"

        for i, result in enumerate(results["results"], 1):
            source_type = result.get("source_type", "unknown")

            if source_type == "vector_search":
                content = result.get("content", "")
                score = result.get("score", 0)
                metadata = result.get("metadata", {})
                source = metadata.get("source", "Unknown")

                formatted += f"{i}. [Vector Search] {source} (Score: {score:.2f})\n"
                formatted += f"{content}\n\n"

            elif source_type == "knowledge_graph":
                name = result.get("name", "")
                entity_type = result.get("type", "")
                observations = result.get("observations", [])

                formatted += f"{i}. [Knowledge Graph] {name} (Type: {entity_type})\n"
                for obs in observations:
                    formatted += f"- {obs}\n"
                formatted += "\n"

        # Add source statistics
        vs_count = results.get("sources", {}).get("vector_search", 0)
        kg_count = results.get("sources", {}).get("knowledge_graph", 0)
        formatted += f"Sources: {vs_count} from Vector Search, {kg_count} from Knowledge Graph"

        return formatted
