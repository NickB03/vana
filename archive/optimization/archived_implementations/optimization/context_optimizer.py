# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Context window optimization for multi-agent systems.

This module provides intelligent context management strategies:
- Dynamic context compression based on relevance
- Semantic truncation using importance scoring
- Token budget management across agent hierarchy
- Context caching and reuse
"""

import hashlib
import logging
import re
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ContextChunk:
    """A chunk of context with metadata for importance scoring."""

    content: str
    timestamp: datetime
    agent_name: str
    chunk_type: str  # 'instruction', 'state', 'event', 'result'
    importance: float = 0.5  # 0.0 (low) to 1.0 (high)
    token_count: int = 0

    def calculate_token_count(self) -> int:
        """Estimate token count (rough approximation: 1 token ≈ 4 chars)."""
        self.token_count = len(self.content) // 4
        return self.token_count


class ContextOptimizer:
    """Intelligent context window management and optimization."""

    def __init__(
        self,
        max_context_tokens: int = 32_000,
        compression_threshold: float = 0.8,
        enable_caching: bool = True,
    ):
        """Initialize context optimizer.

        Args:
            max_context_tokens: Maximum tokens to keep in context
            compression_threshold: Start compression when context exceeds this fraction
            enable_caching: Enable context caching
        """
        self.max_context_tokens = max_context_tokens
        self.compression_threshold = compression_threshold
        self.enable_caching = enable_caching

        # Context cache: hash -> (content, timestamp)
        self.cache: OrderedDict[str, tuple[str, datetime]] = OrderedDict()
        self.cache_max_size = 100
        self.cache_ttl_hours = 24

        # Importance weights by chunk type
        self.importance_weights = {
            "instruction": 1.0,  # Always keep instructions
            "state": 0.8,  # Keep most state
            "result": 0.7,  # Results are important
            "event": 0.5,  # Events are less critical
        }

        logger.info(
            f"ContextOptimizer initialized: max_tokens={max_context_tokens}, "
            f"compression_threshold={compression_threshold}, caching={enable_caching}"
        )

    def compress_context(
        self,
        chunks: list[ContextChunk],
        target_tokens: int | None = None,
    ) -> tuple[list[ContextChunk], dict[str, Any]]:
        """Compress context by removing least important chunks.

        Args:
            chunks: List of context chunks
            target_tokens: Target token count (uses max_context_tokens if None)

        Returns:
            Tuple of (compressed_chunks, metrics)
        """
        target_tokens = target_tokens or self.max_context_tokens

        # Calculate current size
        total_tokens = sum(c.token_count or c.calculate_token_count() for c in chunks)

        if total_tokens <= target_tokens:
            return chunks, {
                "original_tokens": total_tokens,
                "compressed_tokens": total_tokens,
                "compression_ratio": 1.0,
                "chunks_removed": 0,
            }

        # Score chunks by importance
        scored_chunks = []
        for chunk in chunks:
            # Base score from importance
            score = chunk.importance

            # Boost score based on chunk type
            score *= self.importance_weights.get(chunk.chunk_type, 0.5)

            # Boost recent chunks
            age_hours = (datetime.now() - chunk.timestamp).total_seconds() / 3600
            recency_factor = max(0.5, 1.0 - (age_hours / 24))
            score *= recency_factor

            scored_chunks.append((score, chunk))

        # Sort by score (descending)
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # Keep chunks until we hit target
        compressed_chunks = []
        running_tokens = 0
        for score, chunk in scored_chunks:
            if running_tokens + chunk.token_count <= target_tokens:
                compressed_chunks.append(chunk)
                running_tokens += chunk.token_count
            elif chunk.chunk_type == "instruction":
                # Always keep instructions
                compressed_chunks.append(chunk)
                running_tokens += chunk.token_count

        # Restore chronological order
        compressed_chunks.sort(key=lambda c: c.timestamp)

        metrics = {
            "original_tokens": total_tokens,
            "compressed_tokens": running_tokens,
            "compression_ratio": running_tokens / total_tokens if total_tokens > 0 else 1.0,
            "chunks_removed": len(chunks) - len(compressed_chunks),
            "chunks_kept": len(compressed_chunks),
        }

        logger.info(
            f"Context compressed: {total_tokens} -> {running_tokens} tokens "
            f"({metrics['compression_ratio']:.1%} retained, "
            f"{metrics['chunks_removed']} chunks removed)"
        )

        return compressed_chunks, metrics

    def semantic_truncate(
        self,
        text: str,
        max_tokens: int,
        preserve_start: int = 500,
        preserve_end: int = 500,
    ) -> tuple[str, dict[str, Any]]:
        """Semantically truncate text while preserving important parts.

        Args:
            text: Text to truncate
            max_tokens: Maximum tokens to keep
            preserve_start: Tokens to always keep from start
            preserve_end: Tokens to always keep from end

        Returns:
            Tuple of (truncated_text, metrics)
        """
        estimated_tokens = len(text) // 4

        if estimated_tokens <= max_tokens:
            return text, {
                "original_tokens": estimated_tokens,
                "truncated_tokens": estimated_tokens,
                "truncated": False,
            }

        # Calculate character counts
        chars_per_token = 4
        preserve_start_chars = preserve_start * chars_per_token
        preserve_end_chars = preserve_end * chars_per_token
        max_chars = max_tokens * chars_per_token

        # Keep start and end
        start_text = text[:preserve_start_chars]
        end_text = text[-preserve_end_chars:]

        # Calculate middle portion budget
        middle_budget = max_chars - preserve_start_chars - preserve_end_chars

        if middle_budget > 0:
            # Extract middle, prioritizing complete sentences
            middle_start = preserve_start_chars
            middle_end = len(text) - preserve_end_chars
            middle_text = text[middle_start:middle_end]

            # Find sentence boundaries
            sentences = re.split(r'[.!?]\s+', middle_text)

            # Keep sentences that fit in budget
            selected_sentences = []
            current_length = 0

            for sentence in sentences:
                if current_length + len(sentence) <= middle_budget:
                    selected_sentences.append(sentence)
                    current_length += len(sentence)

            middle_excerpt = '. '.join(selected_sentences)
            truncated = f"{start_text}\n\n[...context truncated...]\n\n{middle_excerpt}\n\n[...]\n\n{end_text}"
        else:
            truncated = f"{start_text}\n\n[...context truncated...]\n\n{end_text}"

        truncated_tokens = len(truncated) // 4

        metrics = {
            "original_tokens": estimated_tokens,
            "truncated_tokens": truncated_tokens,
            "truncated": True,
            "compression_ratio": truncated_tokens / estimated_tokens if estimated_tokens > 0 else 1.0,
        }

        logger.debug(
            f"Text truncated: {estimated_tokens} -> {truncated_tokens} tokens"
        )

        return truncated, metrics

    def cache_context(self, content: str, key: str | None = None) -> str:
        """Cache context and return cache key.

        Args:
            content: Content to cache
            key: Optional cache key (auto-generated if None)

        Returns:
            Cache key
        """
        if not self.enable_caching:
            return key or ""

        # Generate key if not provided
        if key is None:
            key = hashlib.md5(content.encode()).hexdigest()

        # Store in cache
        self.cache[key] = (content, datetime.now())

        # Enforce max size
        if len(self.cache) > self.cache_max_size:
            self.cache.popitem(last=False)

        return key

    def get_cached_context(self, key: str) -> str | None:
        """Retrieve cached context.

        Args:
            key: Cache key

        Returns:
            Cached content or None if not found/expired
        """
        if not self.enable_caching or key not in self.cache:
            return None

        content, timestamp = self.cache[key]

        # Check if expired
        age = datetime.now() - timestamp
        if age > timedelta(hours=self.cache_ttl_hours):
            del self.cache[key]
            return None

        # Move to end (LRU)
        self.cache.move_to_end(key)
        return content

    def optimize_agent_context(
        self,
        agent_name: str,
        instruction: str,
        session_state: dict[str, Any],
        events: list[Any],
        max_tokens: int | None = None,
    ) -> tuple[str, dict[str, Any]]:
        """Optimize context for a specific agent invocation.

        Args:
            agent_name: Name of the agent
            instruction: Agent instruction/prompt
            session_state: Current session state
            events: Session events
            max_tokens: Maximum tokens (uses configured max if None)

        Returns:
            Tuple of (optimized_context, metrics)
        """
        max_tokens = max_tokens or self.max_context_tokens

        # Create context chunks
        chunks: list[ContextChunk] = []

        # Add instruction (highest priority)
        chunks.append(
            ContextChunk(
                content=instruction,
                timestamp=datetime.now(),
                agent_name=agent_name,
                chunk_type="instruction",
                importance=1.0,
            )
        )
        chunks[-1].calculate_token_count()

        # Add relevant state (medium priority)
        for key, value in session_state.items():
            if key.startswith("_"):  # Skip internal state
                continue

            state_str = f"{key}: {value}"
            chunk = ContextChunk(
                content=state_str,
                timestamp=datetime.now(),
                agent_name=agent_name,
                chunk_type="state",
                importance=0.8,
            )
            chunk.calculate_token_count()
            chunks.append(chunk)

        # Add recent events (lower priority)
        for event in events[-10:]:  # Only last 10 events
            event_str = f"Event from {getattr(event, 'author', 'unknown')}"
            chunk = ContextChunk(
                content=event_str,
                timestamp=getattr(event, 'timestamp', datetime.now()),
                agent_name=agent_name,
                chunk_type="event",
                importance=0.5,
            )
            chunk.calculate_token_count()
            chunks.append(chunk)

        # Compress if needed
        compressed_chunks, compression_metrics = self.compress_context(
            chunks, target_tokens=max_tokens
        )

        # Build optimized context
        context_parts = [chunk.content for chunk in compressed_chunks]
        optimized_context = "\n\n".join(context_parts)

        metrics = {
            "agent_name": agent_name,
            **compression_metrics,
            "total_chunks": len(chunks),
            "optimization_applied": compression_metrics["compression_ratio"] < 1.0,
        }

        return optimized_context, metrics

    def get_stats(self) -> dict[str, Any]:
        """Get optimizer statistics.

        Returns:
            Dictionary of statistics
        """
        return {
            "cache_size": len(self.cache),
            "cache_max_size": self.cache_max_size,
            "cache_hit_rate": 0.0,  # Would need to track hits/misses
            "max_context_tokens": self.max_context_tokens,
            "compression_threshold": self.compression_threshold,
        }


# Global instance
_context_optimizer: ContextOptimizer | None = None


def get_context_optimizer() -> ContextOptimizer:
    """Get or create global context optimizer.

    Returns:
        Global ContextOptimizer instance
    """
    global _context_optimizer
    if _context_optimizer is None:
        _context_optimizer = ContextOptimizer()
    return _context_optimizer


def reset_context_optimizer() -> None:
    """Reset the global context optimizer (for testing)."""
    global _context_optimizer
    _context_optimizer = None
