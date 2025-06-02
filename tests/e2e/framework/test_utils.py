"""
Test Utilities for VANA E2E Testing Framework.

This module provides utility functions for the VANA E2E testing framework.
"""

import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)


def extract_key_information(text: str) -> list[str]:
    """
    Extract key information points from a text.

    Args:
        text (str): The text to extract key information from.

    Returns:
        List[str]: A list of key information points.
    """
    if not text:
        return []

    # Try to extract numbered or bulleted points
    bullet_pattern = (
        r"(?:^|\n)(?:\d+\.\s|\*\s|-\s|\•\s)(.+?)(?=(?:\n(?:\d+\.\s|\*\s|-\s|\•\s))|$)"
    )
    bullet_matches = re.findall(bullet_pattern, text, re.MULTILINE)

    if bullet_matches:
        # Clean up the matches
        return [point.strip() for point in bullet_matches if point.strip()]

    # If no bullet points found, try to extract sentences
    # Split by common sentence terminators
    sentences = re.split(r"(?<=[.!?])\s+", text)

    # Filter out very short sentences and clean up
    key_sentences = [
        sentence.strip()
        for sentence in sentences
        if len(sentence.strip()) > 15  # Ignore very short sentences
    ]

    # If we have too many sentences, just return the most important ones
    # (first few and last few)
    if len(key_sentences) > 10:
        return key_sentences[:3] + key_sentences[-3:]

    return key_sentences


def parse_json_response(text: str) -> Optional[dict[str, Any]]:
    """
    Attempt to extract and parse JSON from a text response.

    Args:
        text (str): The text that may contain JSON.

    Returns:
        Optional[Dict[str, Any]]: The parsed JSON as a dictionary, or None if no valid JSON found.
    """
    import json

    # Try to find JSON-like content between curly braces
    json_pattern = r"\{(?:[^{}]|(?R))*\}"
    json_matches = re.findall(json_pattern, text)

    if not json_matches:
        return None

    # Try to parse each match as JSON
    for match in json_matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue

    return None


def calculate_response_metrics(response: str) -> dict[str, Any]:
    """
    Calculate metrics about a response.

    Args:
        response (str): The response text.

    Returns:
        Dict[str, Any]: A dictionary of metrics.
    """
    if not response:
        return {
            "word_count": 0,
            "character_count": 0,
            "sentence_count": 0,
            "average_word_length": 0,
            "average_sentence_length": 0,
        }

    # Count words
    words = re.findall(r"\b\w+\b", response)
    word_count = len(words)

    # Count characters (excluding whitespace)
    character_count = len(re.sub(r"\s", "", response))

    # Count sentences
    sentences = re.split(r"(?<=[.!?])\s+", response)
    sentence_count = len(sentences)

    # Calculate averages
    average_word_length = character_count / word_count if word_count > 0 else 0
    average_sentence_length = word_count / sentence_count if sentence_count > 0 else 0

    return {
        "word_count": word_count,
        "character_count": character_count,
        "sentence_count": sentence_count,
        "average_word_length": round(average_word_length, 2),
        "average_sentence_length": round(average_sentence_length, 2),
    }


def check_response_coherence(question: str, response: str) -> dict[str, Any]:
    """
    Check if a response is coherent with the question.

    Args:
        question (str): The question text.
        response (str): The response text.

    Returns:
        Dict[str, Any]: A dictionary with coherence metrics.
    """
    # Extract key words from question (excluding stop words)
    stop_words = {
        "a",
        "an",
        "the",
        "and",
        "or",
        "but",
        "is",
        "are",
        "was",
        "were",
        "in",
        "on",
        "at",
        "to",
        "for",
        "with",
        "by",
        "about",
        "like",
        "through",
        "over",
        "before",
        "after",
        "between",
        "under",
        "during",
        "me",
        "my",
        "myself",
        "we",
        "our",
        "ours",
        "ourselves",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
        "he",
        "him",
        "his",
        "himself",
        "she",
        "her",
        "hers",
        "herself",
        "it",
        "its",
        "itself",
        "they",
        "them",
        "their",
        "theirs",
        "themselves",
        "what",
        "which",
        "who",
        "whom",
        "this",
        "that",
        "these",
        "those",
        "am",
        "is",
        "are",
        "was",
        "were",
        "be",
        "been",
        "being",
        "have",
        "has",
        "had",
        "having",
        "do",
        "does",
        "did",
        "doing",
        "can",
        "could",
        "should",
        "would",
        "ought",
        "i",
        "im",
        "i'm",
        "ive",
        "i've",
        "ill",
        "i'll",
        "id",
        "i'd",
    }

    question_words = set(
        word.lower()
        for word in re.findall(r"\b\w+\b", question)
        if word.lower() not in stop_words
    )

    # Count how many key question words appear in the response
    response_lower = response.lower()
    matched_words = [word for word in question_words if word in response_lower]

    # Calculate coherence score
    coherence_score = len(matched_words) / len(question_words) if question_words else 0

    return {
        "coherence_score": round(coherence_score, 2),
        "matched_keywords": matched_words,
        "total_keywords": len(question_words),
        "is_coherent": coherence_score >= 0.3,  # Threshold for coherence
    }
