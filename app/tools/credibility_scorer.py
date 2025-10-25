"""Credibility and relevance scoring for web search results.

This module provides algorithms to calculate trust scores for search results
based on multiple factors including domain authority, security, freshness,
and content quality.

Classes:
    CredibilityScorer: Calculates source credibility (0.0-1.0)
    RelevanceScorer: Calculates query relevance (0.0-1.0)
"""

import re
from datetime import datetime
from urllib.parse import urlparse


class CredibilityScorer:
    """Calculate credibility scores for search results.

    Scoring Algorithm:
        credibility = (domain_authority * 0.40) +
                     (https * 0.15) +
                     (freshness * 0.25) +
                     (content_quality * 0.20)

    Known high-authority domains and TLDs receive higher scores.
    """

    # Known high-authority domains with credibility scores
    AUTHORITY_DOMAINS = {
        # Educational & Research
        "wikipedia.org": 0.90,
        "arxiv.org": 0.92,
        "ieee.org": 0.93,
        "nature.com": 0.94,
        "science.org": 0.94,
        "nih.gov": 0.95,
        # Technical Documentation
        "github.com": 0.88,
        "stackoverflow.com": 0.87,
        "docs.python.org": 0.90,
        "developer.mozilla.org": 0.90,
        # News & Media
        "reuters.com": 0.88,
        "apnews.com": 0.88,
        "bbc.com": 0.87,
        # Developer Resources
        "medium.com": 0.75,
        "dev.to": 0.75,
        "hashnode.com": 0.75,
    }

    # TLD-based trust scores
    TRUSTED_TLDS = {
        "edu": 0.95,  # Educational institutions
        "gov": 0.95,  # Government sites
        "org": 0.85,  # Organizations (varies)
        "mil": 0.95,  # Military
        "ac": 0.90,  # Academic (e.g., .ac.uk)
    }

    def calculate_credibility(
        self,
        url: str,
        domain: str,
        is_https: bool,
        published_date: str | None,
        content_length: int,
    ) -> float:
        """Calculate credibility score (0.0-1.0) based on multiple factors.

        Args:
            url: Full URL of the result
            domain: Domain name (e.g., 'example.com')
            is_https: Whether URL uses HTTPS
            published_date: Publication date in ISO 8601 format (optional)
            content_length: Length of content snippet

        Returns:
            Credibility score between 0.0 and 1.0

        Algorithm:
            - Domain Authority: 40% weight
            - HTTPS: 15% weight
            - Freshness: 25% weight
            - Content Quality: 20% weight
        """
        score = 0.0

        # Domain Authority (40%)
        domain_score = self._score_domain_authority(domain)
        score += domain_score * 0.4

        # HTTPS (15%)
        https_score = 1.0 if is_https else 0.5
        score += https_score * 0.15

        # Freshness (25%)
        freshness_score = self._score_freshness(published_date)
        score += freshness_score * 0.25

        # Content Quality (20%)
        quality_score = self._score_content_quality(content_length)
        score += quality_score * 0.2

        return round(score, 2)

    def _score_domain_authority(self, domain: str) -> float:
        """Score domain authority based on known trusted domains and TLDs.

        Args:
            domain: Domain name to score

        Returns:
            Authority score between 0.0 and 1.0
        """
        # Check specific domain
        if domain in self.AUTHORITY_DOMAINS:
            return self.AUTHORITY_DOMAINS[domain]

        # Check TLD
        tld = domain.split(".")[-1] if "." in domain else ""
        if tld in self.TRUSTED_TLDS:
            return self.TRUSTED_TLDS[tld]

        # Default for unknown domains
        return 0.60

    def _score_freshness(self, published_date: str | None) -> float:
        """Score based on publication date recency.

        Args:
            published_date: Publication date in ISO 8601 format

        Returns:
            Freshness score between 0.0 and 1.0

        Scoring Curve:
            - Last 30 days: 1.0
            - Last 90 days: 0.9
            - Last 180 days: 0.8
            - Last year: 0.7
            - Last 2 years: 0.6
            - Older: 0.5
            - Unknown: 0.5 (neutral score)
        """
        if not published_date:
            return 0.5  # Unknown date = medium score

        try:
            pub_date = datetime.fromisoformat(published_date.replace("Z", "+00:00"))
            now = datetime.now(pub_date.tzinfo)
            days_old = (now - pub_date).days

            # Scoring curve
            if days_old <= 30:
                return 1.0  # Last month
            if days_old <= 90:
                return 0.9  # Last quarter
            if days_old <= 180:
                return 0.8  # Last 6 months
            if days_old <= 365:
                return 0.7  # Last year
            if days_old <= 730:
                return 0.6  # Last 2 years
            return 0.5  # Older

        except Exception:
            return 0.5  # Parse error = neutral score

    def _score_content_quality(self, content_length: int) -> float:
        """Score based on content length as a proxy for depth.

        Args:
            content_length: Length of content snippet in characters

        Returns:
            Quality score between 0.0 and 1.0

        Rationale:
            Longer snippets generally indicate more comprehensive content.
        """
        if content_length >= 500:
            return 1.0
        if content_length >= 300:
            return 0.8
        if content_length >= 150:
            return 0.6
        return 0.4


class RelevanceScorer:
    """Calculate relevance scores for search results.

    Scoring Algorithm:
        relevance = (title_match * 0.50) +
                   (snippet_match * 0.30) +
                   (keyword_density * 0.20)

    Higher scores indicate better match with the user's query.
    """

    def calculate_relevance(self, query: str, title: str, snippet: str) -> float:
        """Calculate relevance score (0.0-1.0) based on query match.

        Args:
            query: User's search query
            title: Result title
            snippet: Result snippet/excerpt

        Returns:
            Relevance score between 0.0 and 1.0

        Algorithm:
            - Title Match: 50% weight (exact match or word overlap)
            - Snippet Match: 30% weight (query words in snippet)
            - Keyword Density: 20% weight (frequency of query words)
        """
        score = 0.0
        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Title Match (50%)
        title_score = self._calculate_match_score(
            query_lower, title.lower(), query_words
        )
        score += title_score * 0.5

        # Snippet Match (30%)
        snippet_score = self._calculate_match_score(
            query_lower, snippet.lower(), query_words
        )
        score += snippet_score * 0.3

        # Keyword Density (20%)
        combined_text = f"{title} {snippet}".lower()
        density_score = self._calculate_keyword_density(query_words, combined_text)
        score += density_score * 0.2

        return round(score, 2)

    def _calculate_match_score(
        self, query: str, text: str, query_words: set[str]
    ) -> float:
        """Calculate how well text matches query.

        Args:
            query: Original query string (lowercased)
            text: Text to match against (lowercased)
            query_words: Set of query words for comparison

        Returns:
            Match score between 0.0 and 1.0
        """
        # Exact match = highest score
        if query in text:
            return 1.0

        # Partial word match
        text_words = set(text.split())
        matching_words = query_words.intersection(text_words)

        if not query_words:
            return 0.0

        match_ratio = len(matching_words) / len(query_words)
        return match_ratio

    def _calculate_keyword_density(self, query_words: set[str], text: str) -> float:
        """Calculate keyword density in text.

        Args:
            query_words: Set of query words to search for
            text: Text to analyze

        Returns:
            Density score between 0.0 and 1.0

        Rationale:
            Higher keyword frequency indicates better relevance.
            Normalized by capping at 20% density = 1.0 score.
        """
        if not text:
            return 0.0

        text_words = text.split()
        if not text_words:
            return 0.0

        keyword_count = sum(1 for word in text_words if word in query_words)
        density = keyword_count / len(text_words)

        # Normalize to 0.0-1.0 (cap at 20% density = 1.0 score)
        return min(density / 0.2, 1.0)
