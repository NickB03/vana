"""
Entity Extractor for VANA Knowledge Graph

This module provides advanced entity extraction capabilities for the Knowledge Graph.
It identifies entities, their types, and relationships from text content.
"""

import logging
import re
from typing import Any

import spacy

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to load spaCy model, with graceful fallback
try:
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except (ImportError, OSError):
    logger.warning("spaCy model not available. Using fallback entity extraction.")
    SPACY_AVAILABLE = False

# Entity type mapping
ENTITY_TYPE_MAP = {
    "PERSON": "person",
    "ORG": "organization",
    "GPE": "location",
    "LOC": "location",
    "PRODUCT": "product",
    "EVENT": "event",
    "WORK_OF_ART": "work",
    "LAW": "law",
    "DATE": "date",
    "TIME": "time",
    "MONEY": "money",
    "QUANTITY": "quantity",
    "PERCENT": "percent",
    "FACILITY": "facility",
    "NORP": "group",
}

# Custom entity patterns for VANA-specific entities
CUSTOM_PATTERNS = [
    {"label": "technology", "pattern": [{"LOWER": "vector"}, {"LOWER": "search"}]},
    {"label": "technology", "pattern": [{"LOWER": "knowledge"}, {"LOWER": "graph"}]},
    {"label": "technology", "pattern": [{"LOWER": "hybrid"}, {"LOWER": "search"}]},
    {"label": "technology", "pattern": [{"LOWER": "vertex"}, {"LOWER": "ai"}]},
    {"label": "technology", "pattern": [{"LOWER": "google"}, {"LOWER": "adk"}]},
    {
        "label": "technology",
        "pattern": [{"LOWER": "agent"}, {"LOWER": "development"}, {"LOWER": "kit"}],
    },
    {"label": "project", "pattern": [{"LOWER": "vana"}]},
    {
        "label": "project",
        "pattern": [
            {"LOWER": "versatile"},
            {"LOWER": "agent"},
            {"LOWER": "network"},
            {"LOWER": "architecture"},
        ],
    },
    {"label": "concept", "pattern": [{"LOWER": "semantic"}, {"LOWER": "chunking"}]},
    {"label": "concept", "pattern": [{"LOWER": "entity"}, {"LOWER": "extraction"}]},
    {"label": "concept", "pattern": [{"LOWER": "entity"}, {"LOWER": "linking"}]},
]

# Add custom patterns to spaCy if available
if SPACY_AVAILABLE:
    ruler = nlp.add_pipe("entity_ruler", before="ner")
    patterns = []
    for pattern in CUSTOM_PATTERNS:
        patterns.append({"label": pattern["label"], "pattern": pattern["pattern"]})
    ruler.add_patterns(patterns)


class EntityExtractor:
    """Advanced entity extraction for Knowledge Graph"""

    def __init__(self):
        """Initialize the entity extractor"""
        self.spacy_available = SPACY_AVAILABLE

    def extract_entities(self, text: str) -> list[dict[str, Any]]:
        """
        Extract entities from text

        Args:
            text: Text to extract entities from

        Returns:
            List of entity dictionaries with name, type, and observation
        """
        if not text or not text.strip():
            return []

        if self.spacy_available:
            return self._extract_with_spacy(text)
        else:
            return self._extract_fallback(text)

    def _extract_with_spacy(self, text: str) -> list[dict[str, Any]]:
        """Extract entities using spaCy"""
        doc = nlp(text)
        entities = []

        # Track entities to avoid duplicates
        seen_entities = set()

        for ent in doc.ents:
            # Map entity type
            entity_type = ENTITY_TYPE_MAP.get(ent.label_, "unknown")
            if ent.label_ in ["technology", "project", "concept"]:
                entity_type = ent.label_

            # Create entity key for deduplication
            entity_key = f"{ent.text.lower()}:{entity_type}"

            if entity_key not in seen_entities:
                # Extract context (sentence containing the entity)
                sentence = next(
                    (
                        sent.text
                        for sent in doc.sents
                        if ent.start >= sent.start and ent.end <= sent.end
                    ),
                    "",
                )

                # Create entity
                entity = {
                    "name": ent.text,
                    "type": entity_type,
                    "observation": sentence
                    or text[
                        max(0, ent.start_char - 50) : min(len(text), ent.end_char + 50)
                    ],
                    "confidence": 0.8,  # Default confidence for spaCy entities
                }

                entities.append(entity)
                seen_entities.add(entity_key)

        return entities

    def _extract_fallback(self, text: str) -> list[dict[str, Any]]:
        """Fallback entity extraction using regex patterns"""
        entities = []

        # Simple pattern matching for custom entities
        for pattern_dict in CUSTOM_PATTERNS:
            pattern_text = " ".join(
                [token["LOWER"] for token in pattern_dict["pattern"]]
            )
            pattern = re.compile(r"\b" + pattern_text + r"\b", re.IGNORECASE)

            for match in pattern.finditer(text):
                # Find sentence containing the entity (simple approximation)
                start_pos = max(0, text.rfind(".", 0, match.start()) + 1)
                end_pos = text.find(".", match.end())
                if end_pos == -1:
                    end_pos = len(text)

                sentence = text[start_pos:end_pos].strip()

                entity = {
                    "name": match.group(0),
                    "type": pattern_dict["label"],
                    "observation": sentence,
                    "confidence": 0.6,  # Lower confidence for regex matching
                }

                entities.append(entity)

        return entities

    def extract_relationships(self, text: str) -> list[dict[str, Any]]:
        """
        Extract relationships between entities

        Args:
            text: Text to extract relationships from

        Returns:
            List of relationship dictionaries with entity1, relationship, entity2
        """
        if not text or not text.strip() or not self.spacy_available:
            return []

        doc = nlp(text)
        relationships = []

        # Extract entities first
        entities = self._extract_with_spacy(text)
        entity_spans = {}

        for entity in entities:
            # Find all occurrences of the entity in the text
            entity_name = entity["name"]
            for match in re.finditer(r"\b" + re.escape(entity_name) + r"\b", text):
                span_key = (match.start(), match.end())
                entity_spans[span_key] = entity

        # Simple relationship extraction based on dependency parsing
        for sent in doc.sents:
            sent_entities = []

            # Find entities in this sentence
            for span_key, entity in entity_spans.items():
                start, end = span_key
                if any(token.idx >= start and token.idx < end for token in sent):
                    sent_entities.append((entity, start, end))

            # Need at least two entities to form a relationship
            if len(sent_entities) < 2:
                continue

            # Find potential relationships between entities
            for i, (entity1, start1, end1) in enumerate(sent_entities):
                for entity2, start2, end2 in sent_entities[i + 1 :]:
                    # Skip self-relationships
                    if entity1["name"] == entity2["name"]:
                        continue

                    # Extract text between entities as potential relationship
                    if start2 > end1:
                        between_text = text[end1:start2].strip()

                        # Simple heuristic: relationship is a verb phrase between entities
                        if 1 < len(between_text.split()) < 6:
                            relationship = {
                                "entity1": entity1["name"],
                                "relationship": between_text,
                                "entity2": entity2["name"],
                                "confidence": 0.5,
                                "observation": sent.text,
                            }
                            relationships.append(relationship)

        return relationships

    def enrich_entity(self, entity: dict[str, Any], text: str) -> dict[str, Any]:
        """
        Enrich entity with additional information from text

        Args:
            entity: Entity dictionary
            text: Text to extract additional information from

        Returns:
            Enriched entity dictionary
        """
        if not self.spacy_available or not text or not text.strip():
            return entity

        doc = nlp(text)
        entity_name = entity["name"]
        entity_type = entity["type"]

        # Find mentions of the entity in the text
        mentions = []
        for match in re.finditer(r"\b" + re.escape(entity_name) + r"\b", text):
            start, end = match.span()
            # Find the sentence containing this mention
            for sent in doc.sents:
                if sent.start_char <= start and sent.end_char >= end:
                    mentions.append(sent.text)
                    break

        # Combine mentions into a more comprehensive observation
        if mentions:
            entity["observation"] = " ".join(mentions)

        # Extract attributes based on entity type
        if entity_type == "person":
            # Look for titles, roles, etc.
            for token in doc:
                if token.text.lower() == entity_name.lower():
                    # Check for compound nouns that might be titles
                    if token.head.dep_ == "compound" and token.head.pos_ == "NOUN":
                        entity["title"] = token.head.text

        return entity
