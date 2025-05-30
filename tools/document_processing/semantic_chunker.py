"""
Semantic Document Chunking for VANA

This module provides structure-aware document chunking that preserves
semantic boundaries and document hierarchy.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SemanticChunker:
    """Semantic document chunking implementation for VANA"""

    def __init__(self,
                 target_chunk_size: int = 3000,
                 min_chunk_size: int = 500,
                 overlap_size: int = 300):
        """
        Initialize the semantic chunker

        Args:
            target_chunk_size: Target token count per chunk
            min_chunk_size: Minimum chunk size to consider complete
            overlap_size: Token overlap between chunks
        """
        self.target_chunk_size = target_chunk_size
        self.min_chunk_size = min_chunk_size
        self.overlap_size = overlap_size

    def extract_sections(self, document: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract hierarchical sections from a document

        Args:
            document: Document object with text and metadata

        Returns:
            List of section objects with text and heading path
        """
        # Simple implementation - can be enhanced with more sophisticated section detection
        text = document.get("text", "")

        # Split by headings (assumes markdown-like format with # headings)
        heading_pattern = r'(^|\n)(#{1,6})\s+(.+?)(?=\n)'

        # Find all headings
        headings = re.finditer(heading_pattern, text, re.MULTILINE)

        # Extract sections
        sections = []
        last_pos = 0
        current_path = []

        for match in headings:
            # If this isn't the first heading, add the previous section
            if last_pos > 0:
                section_text = text[last_pos:match.start()]
                if section_text.strip():
                    sections.append({
                        "text": section_text.strip(),
                        "path": ".".join(current_path),
                        "heading": current_path[-1] if current_path else ""
                    })

            # Update current heading path
            level = len(match.group(2))  # Number of # characters
            heading_text = match.group(3).strip()

            # Adjust path based on heading level
            if level <= len(current_path):
                current_path = current_path[:level-1]
            current_path.append(heading_text)

            # Update position
            last_pos = match.end()

        # Add the last section
        if last_pos < len(text):
            section_text = text[last_pos:]
            if section_text.strip():
                sections.append({
                    "text": section_text.strip(),
                    "path": ".".join(current_path),
                    "heading": current_path[-1] if current_path else ""
                })

        # If no sections were found, treat the entire document as one section
        if not sections:
            sections.append({
                "text": text.strip(),
                "path": "",
                "heading": document.get("title", "")
            })

        return sections

    def split_into_paragraphs(self, text: str) -> List[str]:
        """
        Split text into paragraphs

        Args:
            text: Text to split

        Returns:
            List of paragraphs
        """
        # Split by double newlines (standard paragraph breaks)
        paragraphs = re.split(r'\n\s*\n', text)

        # Filter empty paragraphs
        return [p.strip() for p in paragraphs if p.strip()]

    def get_overlap_paragraphs(self, paragraphs: List[str], target_tokens: int) -> List[str]:
        """
        Get paragraphs to use as overlap context

        Args:
            paragraphs: List of paragraphs
            target_tokens: Approximate number of tokens for overlap

        Returns:
            List of paragraphs to use as overlap
        """
        overlap = []
        token_count = 0

        # Start from the end and work backwards
        for p in reversed(paragraphs):
            p_tokens = len(p.split())
            if token_count + p_tokens > target_tokens and token_count > 0:
                break

            overlap.insert(0, p)
            token_count += p_tokens

        return overlap

    def count_tokens(self, text: str) -> int:
        """
        Approximate token count (simplified)

        Args:
            text: Text to count tokens for

        Returns:
            Approximate token count
        """
        # Simple approximation (words + punctuation)
        return len(text.split())

    def chunk_document(self, document: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunk a document into semantic chunks

        Args:
            document: Document object with text and metadata

        Returns:
            List of chunk objects with text and metadata
        """
        # Extract sections
        sections = self.extract_sections(document)
        chunks = []

        # If document is very short, create a single chunk
        if len(document.get("text", "").split()) < self.min_chunk_size:
            chunks.append({
                "text": document.get("text", ""),
                "metadata": {
                    "source": document.get("source", ""),
                    "doc_id": document.get("doc_id", ""),
                    "section_path": "",
                    "heading": document.get("title", ""),
                    "token_count": len(document.get("text", "").split()),
                    "chunk_id": f"{document.get('doc_id', 'doc')}_0"
                }
            })
            logger.info(f"Created 1 semantic chunk from short document")
            return chunks

        for section in sections:
            # Get section metadata
            section_path = section.get("path", "")
            section_heading = section.get("heading", "")

            # Split section text into paragraphs
            paragraphs = self.split_into_paragraphs(section.get("text", ""))

            # If no paragraphs, skip section
            if not paragraphs:
                continue

            # If section is very short, add as a single chunk
            section_tokens = sum(self.count_tokens(p) for p in paragraphs)
            if section_tokens <= self.min_chunk_size:
                chunk_text = "\n\n".join(paragraphs)
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "source": document.get("source", ""),
                        "doc_id": document.get("doc_id", ""),
                        "section_path": section_path,
                        "heading": section_heading,
                        "token_count": section_tokens,
                        "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                    }
                })
                continue

            # Initialize chunk
            current_chunk = []
            current_tokens = 0

            for paragraph in paragraphs:
                # Count tokens in paragraph
                para_tokens = self.count_tokens(paragraph)

                # Handle very long paragraphs
                if para_tokens > self.target_chunk_size:
                    # If we have content in the current chunk, add it first
                    if current_chunk:
                        chunk_text = "\n\n".join(current_chunk)
                        chunks.append({
                            "text": chunk_text,
                            "metadata": {
                                "source": document.get("source", ""),
                                "doc_id": document.get("doc_id", ""),
                                "section_path": section_path,
                                "heading": section_heading,
                                "token_count": current_tokens,
                                "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                            }
                        })
                        current_chunk = []
                        current_tokens = 0

                    # Split the long paragraph into sentences
                    sentences = re.split(r'(?<=[.!?])\s+', paragraph)

                    # Create chunks from sentences
                    sent_chunk = []
                    sent_tokens = 0

                    for sentence in sentences:
                        sent_token_count = self.count_tokens(sentence)

                        if sent_tokens + sent_token_count > self.target_chunk_size and sent_tokens >= self.min_chunk_size:
                            # Add sentence chunk
                            sent_text = " ".join(sent_chunk)
                            chunks.append({
                                "text": sent_text,
                                "metadata": {
                                    "source": document.get("source", ""),
                                    "doc_id": document.get("doc_id", ""),
                                    "section_path": section_path,
                                    "heading": section_heading,
                                    "token_count": sent_tokens,
                                    "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                                }
                            })

                            # Start new sentence chunk
                            sent_chunk = [sentence]
                            sent_tokens = sent_token_count
                        else:
                            sent_chunk.append(sentence)
                            sent_tokens += sent_token_count

                    # Add final sentence chunk if not empty
                    if sent_chunk and sent_tokens >= self.min_chunk_size:
                        sent_text = " ".join(sent_chunk)
                        chunks.append({
                            "text": sent_text,
                            "metadata": {
                                "source": document.get("source", ""),
                                "doc_id": document.get("doc_id", ""),
                                "section_path": section_path,
                                "heading": section_heading,
                                "token_count": sent_tokens,
                                "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                            }
                        })
                    elif sent_chunk:
                        # If chunk is too small, start the next paragraph chunk with it
                        current_chunk = sent_chunk
                        current_tokens = sent_tokens

                # Normal paragraph processing
                elif current_tokens + para_tokens > self.target_chunk_size and current_tokens >= self.min_chunk_size:
                    # Create chunk
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "source": document.get("source", ""),
                            "doc_id": document.get("doc_id", ""),
                            "section_path": section_path,
                            "heading": section_heading,
                            "token_count": current_tokens,
                            "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                        }
                    })

                    # Start new chunk with overlap
                    overlap_paragraphs = self.get_overlap_paragraphs(current_chunk, self.overlap_size)
                    current_chunk = overlap_paragraphs + [paragraph]
                    current_tokens = sum(self.count_tokens(p) for p in overlap_paragraphs) + para_tokens
                else:
                    # Add paragraph to current chunk
                    current_chunk.append(paragraph)
                    current_tokens += para_tokens

            # Add final chunk if not empty
            if current_chunk and current_tokens >= self.min_chunk_size:
                chunk_text = "\n\n".join(current_chunk)
                chunks.append({
                    "text": chunk_text,
                    "metadata": {
                        "source": document.get("source", ""),
                        "doc_id": document.get("doc_id", ""),
                        "section_path": section_path,
                        "heading": section_heading,
                        "token_count": current_tokens,
                        "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                    }
                })
            elif current_chunk:
                # If the final chunk is too small, add it to the previous chunk if possible
                if chunks:
                    prev_chunk = chunks[-1]
                    prev_text = prev_chunk["text"]
                    prev_tokens = prev_chunk["metadata"]["token_count"]

                    # If combining wouldn't exceed target size too much
                    if prev_tokens + current_tokens <= self.target_chunk_size * 1.2:
                        combined_text = prev_text + "\n\n" + "\n\n".join(current_chunk)
                        chunks[-1]["text"] = combined_text
                        chunks[-1]["metadata"]["token_count"] = prev_tokens + current_tokens
                    else:
                        # Add as a separate chunk even though it's small
                        chunk_text = "\n\n".join(current_chunk)
                        chunks.append({
                            "text": chunk_text,
                            "metadata": {
                                "source": document.get("source", ""),
                                "doc_id": document.get("doc_id", ""),
                                "section_path": section_path,
                                "heading": section_heading,
                                "token_count": current_tokens,
                                "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                            }
                        })
                else:
                    # Add as a separate chunk even though it's small
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "source": document.get("source", ""),
                            "doc_id": document.get("doc_id", ""),
                            "section_path": section_path,
                            "heading": section_heading,
                            "token_count": current_tokens,
                            "chunk_id": f"{document.get('doc_id', 'doc')}_{len(chunks)}"
                        }
                    })

        # Add document metadata to all chunks
        for chunk in chunks:
            # Add document title
            if document.get("title"):
                chunk["metadata"]["title"] = document.get("title")

            # Add document metadata if available
            if document.get("metadata"):
                for key, value in document.get("metadata").items():
                    if key not in chunk["metadata"] and key not in ["token_count", "chunk_id"]:
                        chunk["metadata"][f"doc_{key}"] = value

        logger.info(f"Created {len(chunks)} semantic chunks from document")
        return chunks
