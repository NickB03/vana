#!/usr/bin/env python3
"""
Document Processor for VANA

This module provides document processing capabilities including:
1. PDF extraction
2. Metadata enrichment
3. Document structure recognition
4. Multi-modal support
"""

import io
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

# Import semantic chunker
from tools.document_processing.semantic_chunker import SemanticChunker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import PDF processing libraries
try:
    import PyPDF2

    PDF_SUPPORT = True
except ImportError:
    logger.warning("PyPDF2 not available. PDF support will be limited.")
    PDF_SUPPORT = False

# Try to import image processing libraries
try:
    import pytesseract
    from PIL import Image

    IMAGE_SUPPORT = True
except ImportError:
    logger.warning("PIL or pytesseract not available. Image support will be limited.")
    IMAGE_SUPPORT = False


class DocumentProcessor:
    """Document processor for VANA"""

    def __init__(
        self,
        chunker: Optional[SemanticChunker] = None,
        extract_metadata: bool = True,
        extract_images: bool = True,
        ocr_images: bool = True,
    ):
        """
        Initialize the document processor

        Args:
            chunker: Semantic chunker instance (creates one if None)
            extract_metadata: Whether to extract metadata from documents
            extract_images: Whether to extract images from documents
            ocr_images: Whether to perform OCR on extracted images
        """
        self.chunker = chunker or SemanticChunker()
        self.extract_metadata = extract_metadata
        self.extract_images = extract_images and IMAGE_SUPPORT
        self.ocr_images = ocr_images and IMAGE_SUPPORT

    def process_document(
        self,
        file_path: str = None,
        content: Union[str, bytes] = None,
        file_type: str = None,
        metadata: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """
        Process a document from file or content

        Args:
            file_path: Path to document file
            content: Document content (text or bytes)
            file_type: Document type (pdf, txt, md, etc.)
            metadata: Additional metadata

        Returns:
            Processed document with text, metadata, and chunks
        """
        if not file_path and not content:
            raise ValueError("Either file_path or content must be provided")

        # Initialize document
        document = {
            "doc_id": metadata.get("doc_id") if metadata else None,
            "source": metadata.get("source") if metadata else None,
            "title": metadata.get("title") if metadata else None,
            "metadata": metadata or {},
            "text": "",
            "chunks": [],
            "images": [],
        }

        # Generate doc_id if not provided
        if not document["doc_id"]:
            document["doc_id"] = f"doc_{datetime.now().strftime('%Y%m%d%H%M%S')}"

        # Determine file type if not provided
        if file_path and not file_type:
            file_type = os.path.splitext(file_path)[1].lower().lstrip(".")

        # Process based on file type
        if file_type == "pdf":
            self._process_pdf(file_path, content, document)
        elif file_type in ["txt", "md", "markdown"]:
            self._process_text(file_path, content, document)
        elif file_type in ["jpg", "jpeg", "png", "gif"]:
            self._process_image(file_path, content, document)
        else:
            # Default to text processing
            self._process_text(file_path, content, document)

        # Extract metadata if enabled
        if self.extract_metadata:
            self._enrich_metadata(document)

        # Chunk the document
        document["chunks"] = self.chunker.chunk_document(document)

        return document

    def _process_pdf(self, file_path: str, content: bytes, document: Dict[str, Any]) -> None:
        """Process a PDF document"""
        if not PDF_SUPPORT:
            logger.warning("PDF support not available. Install PyPDF2 for PDF processing.")
            document["text"] = "PDF processing not available. Install PyPDF2."
            return

        try:
            # Open PDF file
            if file_path:
                pdf_file = open(file_path, "rb")
            else:
                pdf_file = io.BytesIO(content)

            # Create PDF reader
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            # Extract text from each page
            text = ""
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n\n"

            # Set document text
            document["text"] = text

            # Extract metadata
            if hasattr(pdf_reader, "metadata") and pdf_reader.metadata:
                info = pdf_reader.metadata
                document["metadata"].update(
                    {
                        "title": info.get("/Title", document["title"]),
                        "author": info.get("/Author"),
                        "subject": info.get("/Subject"),
                        "keywords": info.get("/Keywords"),
                        "creator": info.get("/Creator"),
                        "producer": info.get("/Producer"),
                        "creation_date": info.get("/CreationDate"),
                        "modification_date": info.get("/ModDate"),
                        "page_count": len(pdf_reader.pages),
                    }
                )

            # Extract images if enabled
            if self.extract_images:
                # This is a simplified implementation
                # A more robust implementation would extract images from PDF
                # using libraries like PyMuPDF (fitz)
                document["metadata"]["has_images"] = True

            # Close file if opened
            if file_path:
                pdf_file.close()

        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            document["text"] = f"Error processing PDF: {str(e)}"

    def _process_text(self, file_path: str, content: Union[str, bytes], document: Dict[str, Any]) -> None:
        """Process a text document"""
        try:
            # Get text content
            if file_path:
                with open(file_path, "r", encoding="utf-8") as f:
                    text = f.read()
            elif isinstance(content, bytes):
                text = content.decode("utf-8")
            else:
                text = content

            # Set document text
            document["text"] = text

            # Extract title from first line if not provided
            if not document["title"] and text:
                first_line = text.split("\n")[0].strip()
                if first_line and len(first_line) < 100:  # Reasonable title length
                    document["title"] = first_line

            # Set source from file path if not provided
            if file_path and not document["source"]:
                document["source"] = os.path.basename(file_path)

        except Exception as e:
            logger.error(f"Error processing text: {str(e)}")
            document["text"] = f"Error processing text: {str(e)}"

    def _process_image(self, file_path: str, content: bytes, document: Dict[str, Any]) -> None:
        """Process an image document"""
        if not IMAGE_SUPPORT:
            logger.warning("Image support not available. Install PIL and pytesseract for image processing.")
            document["text"] = "Image processing not available. Install PIL and pytesseract."
            return

        try:
            # Open image
            if file_path:
                image = Image.open(file_path)
            else:
                import io

                image = Image.open(io.BytesIO(content))

            # Add image to document
            document["images"].append(
                {"width": image.width, "height": image.height, "format": image.format, "mode": image.mode}
            )

            # Perform OCR if enabled
            if self.ocr_images:
                text = pytesseract.image_to_string(image)
                document["text"] = text

            # Set source from file path if not provided
            if file_path and not document["source"]:
                document["source"] = os.path.basename(file_path)

        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            document["text"] = f"Error processing image: {str(e)}"

    def _enrich_metadata(self, document: Dict[str, Any]) -> None:
        """Enrich document metadata"""
        text = document["text"]

        # Extract potential keywords
        keywords = self._extract_keywords(text)
        if keywords:
            document["metadata"]["keywords"] = keywords

        # Detect language
        language = self._detect_language(text)
        if language:
            document["metadata"]["language"] = language

        # Estimate reading time
        word_count = len(text.split())
        reading_time = word_count / 200  # Average reading speed: 200 words per minute
        document["metadata"]["word_count"] = word_count
        document["metadata"]["reading_time_minutes"] = round(reading_time, 1)

        # Detect document structure
        structure = self._detect_structure(text)
        if structure:
            document["metadata"]["structure"] = structure

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract potential keywords from text"""
        # Simple keyword extraction based on frequency
        # A more sophisticated implementation would use NLP techniques

        # Tokenize and clean text
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

        # Remove common stop words
        stop_words = {"the", "and", "is", "in", "to", "of", "for", "with", "on", "at", "from", "by"}
        filtered_words = [w for w in words if w not in stop_words]

        # Count word frequency
        word_counts = {}
        for word in filtered_words:
            word_counts[word] = word_counts.get(word, 0) + 1

        # Get top keywords
        keywords = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:10]

        return [k for k, _ in keywords]

    def _detect_language(self, text: str) -> Optional[str]:
        """Detect document language"""
        # Simple language detection based on common words
        # A more sophisticated implementation would use a language detection library

        # Sample of text for efficiency
        sample = text[:1000].lower()

        # Count common words in different languages
        english_words = {"the", "and", "is", "in", "to", "of", "for", "with", "on", "at"}
        spanish_words = {"el", "la", "es", "en", "y", "de", "para", "con", "por", "un"}
        french_words = {"le", "la", "est", "en", "et", "de", "pour", "avec", "sur", "un"}

        english_count = sum(1 for word in sample.split() if word in english_words)
        spanish_count = sum(1 for word in sample.split() if word in spanish_words)
        french_count = sum(1 for word in sample.split() if word in french_words)

        # Determine language based on highest count
        if english_count > spanish_count and english_count > french_count:
            return "english"
        elif spanish_count > english_count and spanish_count > french_count:
            return "spanish"
        elif french_count > english_count and french_count > spanish_count:
            return "french"

        # Default to English if no clear winner
        return "english"

    def _detect_structure(self, text: str) -> Dict[str, Any]:
        """Detect document structure"""
        structure = {
            "has_headings": False,
            "has_lists": False,
            "has_code_blocks": False,
            "has_tables": False,
            "section_count": 0,
        }

        # Check for headings (markdown style)
        headings = re.findall(r"^#{1,6}\s+.+$", text, re.MULTILINE)
        if headings:
            structure["has_headings"] = True
            structure["section_count"] = len(headings)

        # Check for lists
        lists = re.findall(r"^\s*[-*]\s+.+$", text, re.MULTILINE)
        if lists:
            structure["has_lists"] = True
            structure["list_count"] = len(lists)

        # Check for code blocks
        code_blocks = re.findall(r"```[\s\S]*?```", text)
        if code_blocks:
            structure["has_code_blocks"] = True
            structure["code_block_count"] = len(code_blocks)

        # Check for tables (markdown style)
        tables = re.findall(r"\|[^|]+\|[^|]+\|", text)
        if tables:
            structure["has_tables"] = True

        return structure

    def batch_process_documents(
        self, file_paths: List[str] = None, directory: str = None, file_types: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Process multiple documents

        Args:
            file_paths: List of file paths to process
            directory: Directory to scan for documents
            file_types: List of file types to process (e.g., ["pdf", "txt"])

        Returns:
            List of processed documents
        """
        documents = []

        # Process specific files
        if file_paths:
            for file_path in file_paths:
                try:
                    document = self.process_document(file_path=file_path)
                    documents.append(document)
                except Exception as e:
                    logger.error(f"Error processing {file_path}: {str(e)}")

        # Process files in directory
        if directory:
            if not file_types:
                file_types = ["pdf", "txt", "md", "markdown", "jpg", "jpeg", "png"]

            for root, _, files in os.walk(directory):
                for file in files:
                    file_ext = os.path.splitext(file)[1].lower().lstrip(".")
                    if file_ext in file_types:
                        file_path = os.path.join(root, file)
                        try:
                            document = self.process_document(file_path=file_path)
                            documents.append(document)
                        except Exception as e:
                            logger.error(f"Error processing {file_path}: {str(e)}")

        return documents
