# Document Processing Strategy for VANA

## Overview

This document outlines VANA's comprehensive strategy for document processing, including chunking, storage, and retrieval. This strategy is designed to optimize knowledge retrieval quality while balancing system performance and resource utilization.

## Document Processing Pipeline

```
Raw Document → Parse/Extract → Semantic Chunking →
Embedding Generation → Vector Storage → Knowledge Graph Extraction
```

## Document Parsing & Extraction

### Primary Method: Vertex AI Document AI

VANA will use Google's Document AI for initial document parsing:

```python
from google.cloud import documentai_v1 as documentai

def parse_document(project_id, location, processor_id, file_path, mime_type):
    """Parse document using Document AI"""
    # Initialize Document AI client
    client = documentai.DocumentProcessorServiceClient()
    processor_name = f"projects/{project_id}/locations/{location}/processors/{processor_id}"

    # Read document content
    with open(file_path, "rb") as file:
        content = file.read()

    # Configure document
    raw_document = documentai.RawDocument(content=content, mime_type=mime_type)

    # Process document
    request = documentai.ProcessRequest(
        name=processor_name,
        raw_document=raw_document
    )

    result = client.process_document(request=request)
    document = result.document

    return document
```

### File Type Support

The system will support:
- PDF documents (priority)
- Plain text (.txt)
- Markdown (.md)
- Microsoft Office (.docx, .xlsx, .pptx)
- HTML (.html)
- Image files with OCR (.jpg, .png, .gif)

### Multi-Modal Support

VANA now includes support for processing multi-modal content:

1. **Image Processing**
   - OCR for text extraction from images
   - Image metadata extraction
   - Image content classification

2. **PDF Advanced Processing**
   - Extract text, tables, and images
   - Preserve document structure
   - Extract metadata (title, author, creation date)
   - Handle scanned PDFs with OCR

## Semantic Chunking Strategy

### Core Principles

1. **Structure Preservation**: Maintain document hierarchy and semantic boundaries
2. **Context Retention**: Include sufficient context in each chunk
3. **Overlap Implementation**: Implement strategic overlap between chunks
4. **Metadata Enrichment**: Attach comprehensive metadata to each chunk

### Chunking Implementation

```python
def semantic_document_chunking(document, target_chunk_size=3000, min_chunk_size=500, overlap=300):
    """
    Perform semantic chunking respecting document structure

    Args:
        document: Parsed Document AI document
        target_chunk_size: Target token count per chunk (3000 recommended for text-embedding-004)
        min_chunk_size: Minimum chunk size to consider complete
        overlap: Token overlap between chunks

    Returns:
        List of chunk objects with text and metadata
    """
    # Extract document structure
    sections = extract_document_sections(document)
    chunks = []

    for section in sections:
        # Get section metadata
        section_path = section.get("path", "")
        section_heading = section.get("heading", "")

        # Split section text into paragraphs
        paragraphs = split_into_paragraphs(section.get("text", ""))

        # Initialize chunk
        current_chunk = []
        current_tokens = 0

        for paragraph in paragraphs:
            # Count tokens in paragraph
            para_tokens = len(paragraph.split())

            # If adding paragraph exceeds target AND we have content, create a chunk
            if current_tokens + para_tokens > target_chunk_size and current_tokens >= min_chunk_size:
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
                overlap_paragraphs = get_overlap_paragraphs(current_chunk, overlap)
                current_chunk = overlap_paragraphs + [paragraph]
                current_tokens = count_tokens(overlap_paragraphs) + para_tokens
            else:
                # Add paragraph to current chunk
                current_chunk.append(paragraph)
                current_tokens += para_tokens

        # Add final chunk if not empty
        if current_chunk and current_tokens >= min_chunk_size:
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

    return chunks
```

### Size Optimizations for Vertex AI

- **text-embedding-004**: 2048-4096 tokens per chunk, 256-512 token overlap
- **textembedding-gecko**: 512-1024 tokens per chunk, 100-150 token overlap

## Storage Strategy

### Primary Storage

1. **Raw Documents**: Google Cloud Storage
   - Organized by document type, date, and source
   - Example path: `gs://{bucket_name}/documents/{doc_type}/{YYYY-MM-DD}/{doc_id}.{ext}`

2. **Processed Chunks**: Vertex AI Vector Search + Metadata Store
   - Vector representations in Vector Search
   - Extended metadata in Cloud Firestore/BigQuery

3. **Extracted Entities**: Knowledge Graph (via MCP)
   - Entities, relationships, and attributes

### Metadata Storage Schema

```json
{
  "doc_id": "unique_document_identifier",
  "chunk_id": "unique_chunk_identifier",
  "source": "document_source_or_url",
  "doc_type": "document_category",
  "created_date": "ISO date",
  "last_updated": "ISO date",
  "section_path": "hierarchical_path",
  "heading": "section_heading",
  "author": "document_author",
  "token_count": 2048,
  "languages": ["en"],
  "tags": ["tag1", "tag2"],
  "confidence": 0.95,

  // Enhanced metadata
  "keywords": ["keyword1", "keyword2"],
  "summary": "Brief summary of the content",
  "reading_time_minutes": 5.2,
  "structure": {
    "has_headings": true,
    "has_lists": true,
    "has_code_blocks": false,
    "has_tables": true,
    "section_count": 8
  },

  // Multi-modal metadata
  "has_images": true,
  "image_count": 3,
  "images": [
    {
      "id": "img_001",
      "width": 800,
      "height": 600,
      "format": "JPEG",
      "ocr_text": "Text extracted from image"
    }
  ],

  // PDF-specific metadata
  "page_count": 15,
  "title": "Document title from PDF metadata",
  "subject": "Document subject",
  "producer": "PDF producer software"
}
```

## Document Update Strategy

1. **Document Addition**
   - Process document through entire pipeline
   - Generate unique doc_id and chunk_ids
   - Store in all systems (GCS, Vector Search, Knowledge Graph)

2. **Document Update**
   - Compare document versions for changes
   - Process only changed sections
   - Update affected chunks while preserving chunk IDs where possible
   - Update timestamp metadata

3. **Document Deletion**
   - Remove from all storage systems
   - Maintain deletion log for auditing
   - Update any related entities in Knowledge Graph

## Performance Optimizations

1. **Batch Processing**: Process documents in batches for efficiency
2. **Caching**: Implement caching for frequently accessed documents
3. **Incremental Updates**: Process only changed documents or sections
4. **Asynchronous Processing**: Run document processing as background tasks

## Implementation Considerations

1. **Error Handling**: Implement robust error handling for each pipeline stage
2. **Monitoring**: Track document processing metrics (success rate, processing time)
3. **Version Control**: Maintain document version history
4. **Security**: Ensure proper access controls and encryption
5. **Scalability**: Design for growing document corpus

## Testing Strategy

1. **Pipeline Testing**: Verify end-to-end document processing
2. **Chunking Quality**: Evaluate semantic coherence of chunks
3. **Retrieval Testing**: Measure precision, recall, F1 score, and NDCG of document retrieval
4. **Performance Testing**: Monitor resource usage, processing time, and latency
5. **Multi-Modal Testing**: Verify image processing and OCR accuracy
6. **PDF Processing Testing**: Test extraction from various PDF formats and structures
7. **Metadata Extraction Testing**: Verify accuracy of extracted metadata

### Comprehensive Evaluation Framework

VANA now includes a comprehensive evaluation framework for measuring retrieval quality:

```python
# Run the evaluation framework
python tests/evaluate_retrieval.py

# View results
cat logs/retrieval_evaluation_summary_*.json
```

The evaluation framework measures:

1. **Precision**: Fraction of retrieved information that is relevant
2. **Recall**: Fraction of relevant information that is retrieved
3. **F1 Score**: Harmonic mean of precision and recall
4. **NDCG**: Normalized Discounted Cumulative Gain for ranking quality
5. **Latency**: Time taken to retrieve results

Results are categorized by:
- Query category (general, technology, implementation, etc.)
- Query difficulty (easy, medium, hard)

This allows for targeted improvements to specific aspects of the retrieval system.
