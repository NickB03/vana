#!/usr/bin/env python3
"""
VANA Memory Population Script

This script populates the VANA memory systems with essential knowledge including:
- System architecture and capabilities
- Agent descriptions and specializations
- Tool documentation and usage patterns
- Common workflows and troubleshooting guides

Usage:
    python scripts/populate_vana_memory.py [--dry-run] [--verbose]
"""

import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import VANA components
from lib._shared_libraries.adk_memory_service import get_adk_memory_service
from lib._shared_libraries.session_manager import get_adk_session_manager

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class VANAMemoryPopulator:
    """Populates VANA memory systems with essential knowledge."""

    def __init__(self, dry_run: bool = False):
        self.dry_run = dry_run
        self.memory_service = None
        self.session_manager = None
        self.populated_count = 0

    async def initialize_services(self):
        """Initialize ADK memory and session services."""
        try:
            self.memory_service = get_adk_memory_service()
            self.session_manager = get_adk_session_manager()

            if not self.memory_service or not self.memory_service.is_available():
                raise Exception("ADK Memory Service not available")

            if not self.session_manager:
                raise Exception("ADK Session Manager not available")

            logger.info("✅ ADK services initialized successfully")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize ADK services: {e}")
            import traceback

            logger.debug(f"Full error: {traceback.format_exc()}")
            return False

    def get_vana_system_knowledge(self) -> List[Dict[str, Any]]:
        """Get core VANA system knowledge for memory population."""

        knowledge_base = [
            # System Overview
            {
                "content": "VANA is a comprehensive multi-agent AI system with 24 specialized agents and 59+ tools for autonomous task execution. It uses Google ADK (Agent Development Kit) for agent orchestration and includes optimization framework with Strategy Orchestrator, Dynamic Agent Factory, Tool Optimizer, Coordination Manager, and VANA Optimizer.",
                "metadata": {
                    "type": "system_overview",
                    "priority": "critical",
                    "category": "architecture",
                    "tags": ["vana", "multi-agent", "adk", "optimization"],
                },
            },
            # Agent Capabilities
            {
                "content": "VANA includes specialized agents: Research Agent (data gathering), Analysis Agent (data processing), Strategy Agent (planning), Coordination Manager (agent orchestration), Tool Optimizer (performance monitoring), Dynamic Agent Factory (agent lifecycle), Memory Management Agent (knowledge storage), and 17 other specialized agents for comprehensive task automation.",
                "metadata": {
                    "type": "agent_capabilities",
                    "priority": "high",
                    "category": "agents",
                    "tags": ["agents", "specialization", "capabilities"],
                },
            },
            # Tool Ecosystem
            {
                "content": "VANA provides 59+ tools including: file operations (read, write, list), search capabilities (web search with Brave API, vector search, knowledge search), system tools (echo, health status, task monitoring), agent coordination tools, and memory management tools. All tools follow ADK patterns with proper error handling and monitoring.",
                "metadata": {
                    "type": "tool_documentation",
                    "priority": "high",
                    "category": "tools",
                    "tags": ["tools", "adk", "search", "file-ops"],
                },
            },
            # Memory Architecture
            {
                "content": "VANA uses Google ADK memory systems: VertexAiRagMemoryService for semantic search, session state management for conversation context, load_memory tool for agent memory access, and search_knowledge tool for RAG pipeline queries. Memory hierarchy: Session Memory → RAG Corpus → Vector Search → Web Search.",
                "metadata": {
                    "type": "memory_architecture",
                    "priority": "high",
                    "category": "memory",
                    "tags": ["memory", "rag", "adk", "search"],
                },
            },
            # Optimization Framework
            {
                "content": "VANA Optimization Framework includes 5 components: Strategy Orchestrator (AGOR-inspired dynamic strategy selection), Dynamic Agent Factory (on-demand agent creation), Tool Optimizer (performance monitoring and caching), Coordination Manager (enhanced agent communication), and VANA Optimizer (unified optimization system). Provides 30-50% memory reduction and 20-40% performance improvements.",
                "metadata": {
                    "type": "optimization_framework",
                    "priority": "high",
                    "category": "optimization",
                    "tags": ["optimization", "performance", "strategy", "coordination"],
                },
            },
            # Development Environment
            {
                "content": "VANA development uses Cloud Run environments: vana-dev (1 vCPU/1 GiB) for testing, vana-prod (2 vCPU/2 GiB) for production. Uses Poetry for dependency management, Python 3.13, Google Cloud authentication with Vertex AI, and comprehensive testing framework with Playwright for validation.",
                "metadata": {
                    "type": "development_environment",
                    "priority": "medium",
                    "category": "development",
                    "tags": ["cloud-run", "poetry", "testing", "playwright"],
                },
            },
            # API Configuration
            {
                "content": "VANA requires environment variables: GOOGLE_GENAI_USE_VERTEXAI=true, GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}, GOOGLE_CLOUD_LOCATION=us-central1, BRAVE_API_KEY for web search. Uses FastAPI with ADK integration via get_fast_api_app() for production deployment.",
                "metadata": {
                    "type": "api_configuration",
                    "priority": "medium",
                    "category": "configuration",
                    "tags": ["environment", "api", "fastapi", "vertex-ai"],
                },
            },
            # Common Workflows
            {
                "content": "Common VANA workflows: 1) Research tasks use Research Agent → Analysis Agent → Strategy Agent coordination. 2) Tool optimization uses Tool Optimizer for caching and performance monitoring. 3) Agent coordination uses Coordination Manager for multi-agent communication. 4) Memory management uses !memory_on, !memory_off, !rag commands for session recording.",
                "metadata": {
                    "type": "common_workflows",
                    "priority": "medium",
                    "category": "workflows",
                    "tags": ["workflows", "coordination", "research", "memory"],
                },
            },
            # Troubleshooting
            {
                "content": "VANA troubleshooting: Import hanging issues resolved with Poetry environment recreation and lazy loading. Memory search returning fallback results indicates empty RAG corpus - use memory population script. Tool failures often due to API key configuration - check environment variables. Agent coordination issues may require session state debugging.",
                "metadata": {
                    "type": "troubleshooting",
                    "priority": "medium",
                    "category": "troubleshooting",
                    "tags": ["troubleshooting", "debugging", "import-issues", "memory"],
                },
            },
            # User Interaction Patterns
            {
                "content": "VANA user interaction patterns: Users can request complex multi-step tasks, agent coordination, research and analysis workflows, tool optimization, and memory management. System provides real-time progress updates, comprehensive results, and maintains conversation context across sessions.",
                "metadata": {
                    "type": "user_interaction",
                    "priority": "medium",
                    "category": "interaction",
                    "tags": ["user-interaction", "workflows", "progress", "context"],
                },
            },
        ]

        return knowledge_base

    def get_agent_specific_knowledge(self) -> List[Dict[str, Any]]:
        """Get detailed knowledge about specific VANA agents."""

        agent_knowledge = [
            {
                "content": "Research Agent specializes in data gathering, web search, information synthesis, and source validation. Uses brave_search_mcp for web queries, search_knowledge for internal knowledge, and vector_search for semantic similarity. Provides comprehensive research reports with proper source citations.",
                "metadata": {
                    "type": "agent_specific",
                    "agent": "research_agent",
                    "priority": "high",
                    "category": "agents",
                    "tags": ["research", "data-gathering", "search", "citations"],
                },
            },
            {
                "content": "Analysis Agent processes and analyzes data, creates insights, generates reports, and performs statistical analysis. Works with Research Agent outputs, uses analytical tools, and provides structured analysis with visualizations and recommendations.",
                "metadata": {
                    "type": "agent_specific",
                    "agent": "analysis_agent",
                    "priority": "high",
                    "category": "agents",
                    "tags": ["analysis", "insights", "reports", "statistics"],
                },
            },
            {
                "content": "Strategy Agent creates strategic plans, coordinates multi-agent workflows, optimizes task execution, and manages project timelines. Uses AGOR-inspired dynamic strategy selection and coordinates with other agents via session state sharing.",
                "metadata": {
                    "type": "agent_specific",
                    "agent": "strategy_agent",
                    "priority": "high",
                    "category": "agents",
                    "tags": ["strategy", "planning", "coordination", "agor"],
                },
            },
            {
                "content": "Coordination Manager orchestrates multi-agent communication, manages task distribution, monitors agent performance, and ensures workflow efficiency. Implements enhanced communication patterns and maintains agent coordination state.",
                "metadata": {
                    "type": "agent_specific",
                    "agent": "coordination_manager",
                    "priority": "high",
                    "category": "agents",
                    "tags": [
                        "coordination",
                        "communication",
                        "orchestration",
                        "performance",
                    ],
                },
            },
            {
                "content": "Tool Optimizer monitors tool performance, implements intelligent caching, manages API rate limits, and optimizes resource usage. Provides performance metrics and prevents API abuse through smart caching strategies.",
                "metadata": {
                    "type": "agent_specific",
                    "agent": "tool_optimizer",
                    "priority": "high",
                    "category": "agents",
                    "tags": ["optimization", "caching", "performance", "rate-limits"],
                },
            },
        ]

        return agent_knowledge

    async def populate_memory_batch(
        self, knowledge_items: List[Dict[str, Any]], batch_name: str
    ):
        """Populate memory with a batch of knowledge items using ADK session pattern."""

        logger.info(f"📚 Populating {batch_name} ({len(knowledge_items)} items)")

        if self.dry_run:
            logger.info(
                f"🔍 DRY RUN: Would populate {len(knowledge_items)} items for {batch_name}"
            )
            for item in knowledge_items:
                logger.info(
                    f"  - {item['metadata']['type']}: {item['content'][:100]}..."
                )
            return len(knowledge_items)

        success_count = 0

        for i, item in enumerate(knowledge_items):
            try:
                # Add timestamp to metadata
                item["metadata"]["populated_at"] = datetime.now().isoformat()
                item["metadata"]["source"] = "vana_memory_population"

                # Create session with knowledge content (let ADK generate session_id)
                session = await self.session_manager.create_session(
                    app_name="vana_knowledge_population",
                    user_id="system",
                    initial_state=item["metadata"],
                )

                # Add knowledge content as a message to the session
                from google.adk.events import Event
                from google.genai.types import Content, Part

                # Create content for the session
                knowledge_content = Content(
                    parts=[Part(text=item["content"])], role="assistant"
                )

                # Create an event with the knowledge content
                knowledge_event = Event(
                    invocation_id=f"knowledge_population_{i}",
                    author="system",
                    content=knowledge_content,
                    timestamp=datetime.now().timestamp(),
                )

                # Add event to session
                await self.session_manager.session_service.append_event(
                    session, knowledge_event
                )

                # Add the session to memory using ADK pattern
                await self.memory_service.add_session_to_memory(session)

                success_count += 1
                logger.info(
                    f"✅ Added: {item['metadata']['type']} (session: {session.id})"
                )

            except Exception as e:
                logger.error(f"❌ Failed to add {item['metadata']['type']}: {e}")
                import traceback

                logger.debug(f"Full error: {traceback.format_exc()}")

        logger.info(
            f"📊 {batch_name}: {success_count}/{len(knowledge_items)} items populated"
        )
        return success_count

    async def populate_all_memory(self):
        """Populate all VANA memory systems with knowledge."""

        logger.info("🚀 Starting VANA memory population...")

        # Initialize services
        if not await self.initialize_services():
            return False

        total_populated = 0

        try:
            # Populate system knowledge
            system_knowledge = self.get_vana_system_knowledge()
            count = await self.populate_memory_batch(
                system_knowledge, "System Knowledge"
            )
            total_populated += count

            # Populate agent-specific knowledge
            agent_knowledge = self.get_agent_specific_knowledge()
            count = await self.populate_memory_batch(agent_knowledge, "Agent Knowledge")
            total_populated += count

            self.populated_count = total_populated

            logger.info("🎉 Memory population completed!")
            logger.info(f"📊 Total items populated: {total_populated}")

            return True

        except Exception as e:
            logger.error(f"❌ Memory population failed: {e}")
            return False

    async def test_memory_search(self):
        """Test memory search functionality with populated content."""

        logger.info("🔍 Testing memory search functionality...")

        test_queries = [
            "What is VANA?",
            "How do VANA agents coordinate?",
            "What tools are available in VANA?",
            "How does the optimization framework work?",
            "What is the Research Agent's role?",
        ]

        for query in test_queries:
            try:
                logger.info(f"Testing query: '{query}'")

                # Test memory search
                results = await self.memory_service.search_memory(query, top_k=3)

                if results and len(results) > 0:
                    logger.info(f"✅ Found {len(results)} results")
                    for i, result in enumerate(results[:2]):
                        content_preview = result.get("content", "")[:100]
                        score = result.get("score", 0)
                        logger.info(
                            f"  {i + 1}. Score: {score:.2f} - {content_preview}..."
                        )
                else:
                    logger.warning(f"⚠️ No results found for: {query}")

            except Exception as e:
                logger.error(f"❌ Search failed for '{query}': {e}")

        logger.info("🔍 Memory search testing completed")


async def main():
    """Main execution function."""

    import argparse

    parser = argparse.ArgumentParser(description="Populate VANA memory systems")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be populated without actually doing it",
    )
    parser.add_argument("--verbose", action="store_true", help="Enable verbose logging")
    parser.add_argument(
        "--test-only",
        action="store_true",
        help="Only test memory search, do not populate",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    populator = VANAMemoryPopulator(dry_run=args.dry_run)

    if args.test_only:
        # Initialize services and test search
        if await populator.initialize_services():
            await populator.test_memory_search()
        return

    # Populate memory
    success = await populator.populate_all_memory()

    if success:
        # Test the populated memory
        await populator.test_memory_search()

        logger.info("\n🎉 VANA Memory Population Completed Successfully!")
        logger.info(f"📊 Total items populated: {populator.populated_count}")
        logger.info(
            "🧠 Memory systems are now ready for intelligent agent interactions"
        )

        if not args.dry_run:
            logger.info("\n🚀 Next steps:")
            logger.info("1. Deploy updated system to vana-dev")
            logger.info("2. Test agent memory usage with real queries")
            logger.info("3. Validate knowledge-based responses")
    else:
        logger.error("\n❌ Memory population failed. Check logs for details.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
