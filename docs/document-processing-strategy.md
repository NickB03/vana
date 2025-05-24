# Document Processing Strategy for VANA

> **Note on Current Implementation Status (As of 2025-05-16):**
> This document outlines the target strategy for document processing in VANA, with Vertex AI Document AI as the intended primary parsing method.
> Currently, the primary implemented document processor (`tools/document_processing/document_processor.py`) uses PyPDF2 for PDF parsing and Pytesseract for image OCR.
> The integration of Vertex AI Document AI as described below is a planned enhancement and not yet the default operational mode in the existing `DocumentProcessor` class.

## 1. Overview

This document outlines VANA's comprehensive strategy for document processing, encompassing parsing, text extraction, semantic chunking, and considerations for storage and retrieval. This strategy aims to optimize knowledge retrieval quality while balancing system performance and resource utilization.

## 2. Document Processing Pipeline

The general flow for processing documents in VANA is:

```
Raw Document → [Parse/Extract Text] → [Semantic Chunking] → [Embedding Generation] → [Vector Storage] → [KG Enrichment (Optional)]
```
Each stage involves specific tools and considerations:

## 3. Document Parsing & Text Extraction

### 3.1. Target Primary Method: Vertex AI Document AI (Planned Enhancement)

The long-term strategy for VANA is to leverage **Google Cloud Vertex AI Document AI** for robust document parsing and text extraction. This service offers advanced capabilities for:
*   Handling a wide variety of file types (PDF, DOCX, PPTX, images, etc.).
*   Extracting text with high accuracy, including from complex layouts, tables, and forms.
*   Preserving document structure (headings, paragraphs, lists).
*   Optical Character Recognition (OCR) for scanned documents and images.
*   Extracting rich metadata from documents.

The integration would involve using the `google-cloud-documentai` Python client library. A conceptual function for parsing might look like:
```python
# Conceptual: Using Vertex AI Document AI
# from google.cloud import documentai_v1 as documentai
# def parse_with_document_ai(project_id, location, processor_id, file_path, mime_type):
#     client = documentai.DocumentProcessorServiceClient()
#     processor_name = client.processor_path(project_id, location, processor_id)
#     with open(file_path, "rb") as file_content:
#         raw_document = documentai.RawDocument(content=file_content.read(), mime_type=mime_type)
#     request = documentai.ProcessRequest(name=processor_name, raw_document=raw_document)
#     result = client.process_document(request=request)
#     return result.document # This is a Document AI Document object
```

### 3.2. Current Primary Method: `DocumentProcessor` (PyPDF2/Pytesseract)

As noted at the top, the currently implemented primary tool for document parsing and text extraction is `tools/document_processing/document_processor.py`.
*   **Capabilities:**
    *   Handles PDF files using `PyPDF2` for text-based PDFs.
    *   Uses `Pytesseract` (requiring Tesseract OCR engine to be installed) for OCR on image-based PDFs and image files (PNG, JPG, etc.).
    *   Processes plain text files (`.txt`, `.md`).
*   **Output:** Extracts raw text content from these documents.
*   **Limitations:** May struggle with complex layouts, tables, or heavily stylized PDFs compared to specialized services like Document AI. OCR quality depends on image resolution and clarity.
*   For detailed implementation, see [DocumentProcessor Implementation](document-processing.md).

### 3.3. Supported File Types (Current vs. Target)
*   **Current (`DocumentProcessor`):** Primarily `.pdf` (text and image-based), `.txt`, `.md`, and common image formats for OCR (`.png`, `.jpg`).
*   **Target (with Document AI):** Would expand to better support `.docx`, `.xlsx`, `.pptx`, `.html`, and provide more structured output (layout, tables, entities) from all supported types.

### 3.4. Multi-Modal Content Considerations
*   **Current:** Basic image processing via OCR is available.
*   **Target:** Vertex AI Document AI offers more advanced capabilities for extracting information from images within documents, understanding layouts, and potentially classifying image content.

## 4. Semantic Chunking Strategy

After text extraction, the content is divided into smaller, semantically coherent chunks by the `SemanticChunker` (`tools/document_processing/semantic_chunker.py`). This is vital for effective embedding and retrieval.

### 4.1. Core Principles
1.  **Structure Preservation:** Attempt to respect natural document boundaries like paragraphs or sections where possible.
2.  **Context Retention:** Ensure chunks are large enough to contain meaningful context but small enough for the embedding model's limits and typical query scope.
3.  **Overlap Implementation:** Use a small overlap between consecutive chunks to avoid losing context at chunk boundaries.
4.  **Metadata Enrichment:** Each chunk should be associated with metadata linking it back to the source document, its position (e.g., page number, section), and other relevant attributes.

### 4.2. Chunking Implementation
The `SemanticChunker` class implements the logic. It might use strategies like:
*   Splitting by paragraphs or sentences.
*   Fixed token count with overlap.
*   Recursive splitting based on different delimiters (e.g., newlines, sentences).
The specific Python code for chunking provided in the original version of this document was highly conceptual and assumed a Document AI output structure. The actual `SemanticChunker` works on the text extracted by the current `DocumentProcessor`.

### 4.3. Chunk Size Optimizations for Vertex AI Embedding Models
Chunk sizes should be optimized for the chosen embedding model (e.g., `text-embedding-004` or `textembedding-gecko`, both typically 768 dimensions).
*   **Input Token Limits:** While models like `text-embedding-004` might have large input token limits (e.g., 8192 tokens), optimal chunk sizes for retrieval are often smaller (e.g., a few hundred to 1000-2000 tokens) to ensure focused embeddings.
*   **Overlap:** A typical overlap might be 10-20% of the chunk size.
These parameters should be configurable in VANA.

## 5. Storage Strategy

### 5.1. Raw Documents
*   **Recommended Storage:** Google Cloud Storage (GCS).
*   **Organization:** By source, type, date, or other logical groupings (e.g., `gs://<your-bucket>/documents/source_type/YYYY-MM-DD/<doc_id>.<ext>`).

### 5.2. Processed Chunks & Embeddings
*   **Vector Embeddings:** Stored in **Vertex AI Vector Search**. Each chunk's embedding is an entry.
*   **Chunk Text & Metadata:** The text content of each chunk and its associated metadata (see schema below) should be stored in a way that allows quick retrieval based on the IDs returned by Vector Search. Options include:
    *   **Storing directly in Vector Search datapoint metadata (if size limits permit and filtering is not complex).**
    *   A separate metadata store like **Cloud Firestore**, **BigQuery**, or even a simpler key-value store, indexed by `chunk_id`.

### 5.3. Extracted Entities & Relationships (Optional Enrichment)
*   If entities and relationships are extracted from chunks (e.g., by a downstream NLP process or future agent capability), they are stored in the **Knowledge Graph** via the `KnowledgeGraphManager` and MCP server.

### 5.4. Metadata Schema for Chunks

```json
{
A consistent metadata schema is vital for effective filtering and context provision. Example fields:
```json
{
  "chunk_id": "STRING_UNIQUE_IDENTIFIER", // e.g., <doc_id>_chunk_<seq_num>
  "doc_id": "STRING_UNIQUE_DOCUMENT_ID",
  "source_uri": "STRING",          // URI of the original document (e.g., GCS path, web URL)
  "doc_title": "STRING",         // Title of the document
  "doc_type": "STRING",        // Category or type of the document (e.g., "guide", "api_spec", "report")
  "page_number": "INTEGER",      // Page number in the original document (for PDFs)
  "section_heading": "STRING", // Heading of the section this chunk belongs to
  "created_at_source": "ISO_DATETIME_STRING", // Original creation date of document content
  "ingested_at": "ISO_DATETIME_STRING",     // When this chunk was ingested into VANA
  "text_content_hash": "STRING", // Hash of the chunk's text for deduplication/versioning
  "token_count": "INTEGER",      // Number of tokens in this chunk
  "custom_tags": ["LIST", "OF", "STRINGS"] // User-defined tags
  // Other fields like author, keywords, summary could be added.
}
```
This metadata, along with the chunk's text, should be retrievable when a chunk ID is returned by a vector search.

## 6. Document Update and Deletion Strategy

*   **Document Addition:** New documents are processed through the full pipeline (parse, chunk, embed, index).
*   **Document Update:**
    *   **Re-process:** The simplest approach is to re-process the entire updated document, remove old chunks associated with that `doc_id` from Vector Search, and ingest the new chunks.
    *   **Diff-based (Advanced):** Compare document versions, identify changed sections, and only re-process/update affected chunks. This is more complex but can be more efficient for minor updates to large documents. Chunk ID stability is important here.
*   **Document Deletion:**
    *   Remove all associated chunks from Vertex AI Vector Search using their `chunk_id`s.
    *   Remove from raw document storage (e.g., GCS).
    *   Update or remove related entries in the Knowledge Graph if applicable.
    *   Maintain a deletion log for auditing.

## 7. Performance and Scalability Considerations

*   **Batch Processing:** Process documents and generate embeddings in batches for efficiency.
*   **Asynchronous Processing:** For large-scale ingestion, consider running document processing tasks asynchronously (e.g., using task queues like Celery or cloud services like Google Cloud Tasks/PubSub).
*   **Error Handling & Retries:** Implement robust error handling and retry mechanisms for each stage of the pipeline, especially for calls to external services.
*   **Monitoring:** Track processing times, success/failure rates, and resource utilization.
*   **Scalability:** Design the pipeline to handle a growing corpus of documents. Cloud-native services like Vertex AI Document AI and Vector Search are inherently scalable.

## 8. Testing and Evaluation Strategy

*   **Parsing Accuracy:** Test text extraction quality across different file types and layouts.
*   **Chunking Quality:** Evaluate the semantic coherence and appropriateness of generated chunks.
*   **Retrieval Relevance (End-to-End):** The ultimate test. Use a "golden dataset" of queries and expected relevant chunks/documents to measure precision, recall, MRR, NDCG, etc.
    *   The `tests/evaluate_retrieval.py` script, if current and functional, can be used for this.
*   **Performance Testing:** Measure processing throughput and latency.

This document processing strategy provides a framework for transforming raw documents into a searchable and structured knowledge base within VANA. The transition towards Vertex AI Document AI as the primary parser is a key part of this strategy's evolution.
