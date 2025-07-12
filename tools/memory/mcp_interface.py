import logging
import os
from datetime import datetime

import requests

try:
    from .buffer_manager import MemoryBufferManager
    from .enhanced_operations import EnhancedMemoryOperations
except ImportError:
    # Fall back to absolute import if relative import fails
    from tools.memory.buffer_manager import MemoryBufferManager

    try:
        from tools.memory.enhanced_operations import EnhancedMemoryOperations
    except ImportError:
        # Create a mock class if enhanced operations are not available
        class EnhancedMemoryOperations:
            def __init__(self, *args, **kwargs):
                pass


# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MemoryMCP:
    def __init__(self, buffer_manager=None):
        self.buffer_manager = buffer_manager or MemoryBufferManager()
        self.enhanced_memory = EnhancedMemoryOperations()
        self.webhook_url = os.environ.get("N8N_WEBHOOK_URL")

        if not self.webhook_url:
            logger.warning("N8N_WEBHOOK_URL not set in environment variables")

        self.webhook_auth = None
        webhook_user = os.environ.get("N8N_WEBHOOK_USER")
        webhook_password = os.environ.get("N8N_WEBHOOK_PASSWORD")

        if webhook_user and webhook_password:
            self.webhook_auth = (webhook_user, webhook_password)

    def handle_command(self, command):
        """Handle memory-related commands"""
        command_parts = command.strip().lower().split()
        base_command = command_parts[0]
        args = command_parts[1:] if len(command_parts) > 1 else []

        # Basic memory commands
        if base_command == "!memory_on":
            self.buffer_manager.start_recording()
            return "Memory recording started. All conversations will be buffered until saved with !rag or discarded with !memory_off."

        elif base_command == "!memory_off":
            self.buffer_manager.stop_recording()
            buffer_size = len(self.buffer_manager.get_buffer())
            self.buffer_manager.clear()
            return f"Memory recording stopped. Buffer cleared ({buffer_size} messages discarded)."

        elif base_command == "!rag":
            if not self.buffer_manager.memory_on:
                return "Error: Memory recording is not active. Use !memory_on first to start recording."

            buffer = self.buffer_manager.get_buffer()
            if not buffer:
                return "Error: Memory buffer is empty. Have a conversation first before saving."

            # Check for tags in the command
            tags = []
            if args and args[0] == "tag":
                tags = args[1:]
                logger.info(f"Tagging memory with: {tags}")

            response = self._trigger_save_workflow(buffer, tags)

            if response and response.get("success"):
                self.buffer_manager.clear()
                return response.get("message", "Memory saved to knowledge base.")
            else:
                error_msg = response.get("message", "Unknown error") if response else "Failed to connect to webhook"
                return f"Error saving memory: {error_msg}"

        # Enhanced memory commands
        elif base_command == "!memory_filter":
            if len(args) < 2:
                return "Error: !memory_filter requires at least a filter type and query. Example: !memory_filter date 'project planning' 2023-01-01 2023-12-31"

            filter_type = args[0]
            query = args[1]

            if filter_type == "date":
                if len(args) < 4:
                    return "Error: Date filter requires start and end dates. Example: !memory_filter date 'project planning' 2023-01-01 2023-12-31"

                start_date = args[2]
                end_date = args[3]

                try:
                    results = self.enhanced_memory.filter_memories_by_date(query, start_date, end_date)
                    return self._format_memory_results(
                        results,
                        f"Memories for '{query}' between {start_date} and {end_date}",
                    )
                except Exception as e:
                    logger.error(f"Error filtering memories by date: {e}")
                    return f"Error filtering memories: {str(e)}"

            elif filter_type == "tags":
                if len(args) < 3:
                    return "Error: Tags filter requires at least one tag. Example: !memory_filter tags 'project planning' important meeting"

                tags = args[2:]

                try:
                    results = self.enhanced_memory.filter_memories_by_tags(query, tags)
                    return self._format_memory_results(results, f"Memories for '{query}' with tags: {', '.join(tags)}")
                except Exception as e:
                    logger.error(f"Error filtering memories by tags: {e}")
                    return f"Error filtering memories: {str(e)}"

            else:
                return f"Unknown filter type: {filter_type}. Supported types: date, tags"

        elif base_command == "!memory_analytics":
            try:
                analytics = self.enhanced_memory.get_memory_analytics()
                return self._format_analytics_results(analytics)
            except Exception as e:
                logger.error(f"Error getting memory analytics: {e}")
                return f"Error getting memory analytics: {str(e)}"

        elif base_command == "!memory_help":
            return self._get_help_text()

        return f"Unknown command: {command}"

    def _format_memory_results(self, results, title):
        """Format memory results for display"""
        if not results:
            return f"{title}\nNo memories found."

        formatted = f"{title}\n\n"
        for i, result in enumerate(results[:5]):  # Limit to 5 results
            text = result.get("text", "")
            score = result.get("score", 0)
            source = result.get("metadata", {}).get("source", "Unknown")
            timestamp = result.get("metadata", {}).get("timestamp", "Unknown date")

            formatted += f"{i + 1}. [{timestamp}] (Score: {score:.2f})\n"
            formatted += f"   Source: {source}\n"
            formatted += f"   {text[:200]}...\n\n"

        if len(results) > 5:
            formatted += f"...and {len(results) - 5} more results."

        return formatted

    def _format_analytics_results(self, analytics):
        """Format analytics results for display"""
        if not analytics:
            return "No analytics available."

        if "error" in analytics:
            return f"Error retrieving analytics: {analytics['error']}"

        formatted = "Memory Analytics\n\n"

        # Total memories
        total = analytics.get("total_memories", 0)
        formatted += f"Total memories: {total}\n"

        # Memory by source
        sources = analytics.get("sources", {})
        if sources:
            formatted += "\nMemories by source:\n"
            for source, count in sources.items():
                formatted += f"- {source}: {count}\n"

        # Memory by date
        date_counts = analytics.get("date_counts", {})
        if date_counts:
            formatted += "\nMemories by date (last 7 days):\n"
            for date, count in date_counts.items():
                formatted += f"- {date}: {count}\n"

        return formatted

    def _get_help_text(self):
        """Get help text for memory commands"""
        help_text = """
Memory Commands:

Basic Commands:
- !memory_on - Start recording the conversation
- !memory_off - Stop recording and clear the buffer
- !rag - Save the current buffer to the knowledge base
- !rag tag <tag1> <tag2> ... - Save with tags

Enhanced Commands:
- !memory_filter date <query> <start_date> <end_date> - Filter memories by date
- !memory_filter tags <query> <tag1> <tag2> ... - Filter memories by tags
- !memory_analytics - Get analytics about stored memories
- !memory_help - Show this help text
"""
        return help_text

    def _trigger_save_workflow(self, buffer, tags=None):
        """
        Trigger n8n workflow to save memory

        Args:
            buffer: The memory buffer to save
            tags: Optional list of tags to apply to the memory
        """
        if not self.webhook_url:
            logger.error("Cannot trigger workflow: N8N_WEBHOOK_URL not set")
            return None

        payload = {
            "buffer": buffer,
            "memory_on": self.buffer_manager.memory_on,
            "timestamp": datetime.now().isoformat(),
        }

        # Add tags if provided
        if tags:
            payload["tags"] = tags
            logger.info(f"Adding tags to memory: {tags}")

        try:
            logger.info(f"Triggering webhook at {self.webhook_url}")
            response = requests.post(self.webhook_url, json=payload, auth=self.webhook_auth, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error triggering save workflow: {e}")
            return None
