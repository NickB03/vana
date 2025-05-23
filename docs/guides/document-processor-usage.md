# DocumentProcessor Usage Guide

[Home](../../index.md) > [Guides](../index.md) > DocumentProcessor Usage

This guide explains how to use the `DocumentProcessor` (`tools/document_processing/document_processor.py`) in VANA. This tool is responsible for parsing various document formats, extracting text content, and preparing it for further processing like embedding generation and ingestion into knowledge systems.

## 1. Prerequisites

*   **VANA Installation:** Complete VANA project setup as per the [Installation Guide](installation-guide.md).
*   **Configuration:** Ensure your `.env` file is correctly configured, especially if the `DocumentProcessor` relies on any cloud services (e.g., planned Vertex AI Document AI integration).
*   **External Dependencies (for current PyPDF2/Pytesseract implementation):**
    *   **Tesseract OCR:** If processing images or image-based PDFs, Tesseract OCR must be installed on your system and its executable must be in your system's PATH.
    *   Python packages like `PyPDF2`, `Pillow`, `pytesseract` should be installed (usually via `dashboard/requirements.txt`).
*   **Virtual Environment:** Activate your Python virtual environment.

## 2. Importing and Initializing the DocumentProcessor

```python
from tools.document_processing.document_processor import DocumentProcessor
from tools.document_processing.semantic_chunker import SemanticChunker # If using separately
from config import environment # To ensure .env is loaded

# Initialize the DocumentProcessor
# It might take configuration for chunking or specific parsers
try:
    # Example: Initialize with default SemanticChunker settings
    # The actual constructor might differ, check the source code.
    # It might also take parameters for OCR language, etc.
    chunker = SemanticChunker() # Default chunker
    doc_processor = DocumentProcessor(chunker=chunker)
    print("DocumentProcessor initialized successfully.")
except Exception as e:
    print(f"Error initializing DocumentProcessor: {e}")
    doc_processor = None
```

## 3. Core Functionalities

The primary function of the `DocumentProcessor` is to take a file path as input, parse the document, extract its text content, and then (optionally) split that content into smaller, semantically relevant chunks.

### 3.1. Processing a Document

The main method is typically `process_document` or similar.

```python
if doc_processor:
    # Supported file types usually include .txt, .md, .pdf, .png, .jpg, .tiff
    file_path = "path/to/your/document.pdf" # Replace with an actual file path

    try:
        # The process_document method should return structured data,
        # e.g., a dictionary or an object containing metadata and extracted chunks.
        processed_data = doc_processor.process_document(file_path)
        
        if processed_data:
            print(f"\nProcessed data for: {file_path}")
            print(f"  Source Path: {processed_data.get('source_path')}")
            print(f"  Detected MIME Type: {processed_data.get('mime_type')}")
            print(f"  Total Chunks: {len(processed_data.get('chunks', []))}")
            
            # Displaying the first few chunks (if any)
            for i, chunk in enumerate(processed_data.get('chunks', [])[:3]):
                print(f"\n  Chunk {i+1}:")
                print(f"    Content (first 100 chars): {chunk.get('text_content', '')[:100]}...")
                # Chunks might also have metadata like page number, coordinates, etc.
                # print(f"    Metadata: {chunk.get('metadata')}") 
        else:
            print(f"  No data returned from processing {file_path}.")
            
    except FileNotFoundError:
        print(f"Error: File not found at {file_path}")
    except Exception as e:
        print(f"Error processing document {file_path}: {e}")
```

**Expected Output Structure (`processed_data`):**
The `process_document` method typically returns a dictionary or a custom object with fields like:
*   `source_path`: The original path of the processed document.
*   `mime_type`: The detected MIME type of the file.
*   `raw_text_content` (optional): The full extracted text before chunking.
*   `chunks`: A list of dictionaries or objects, where each represents a semantic chunk. Each chunk might contain:
    *   `text_content`: The text of the chunk.
    *   `metadata`: A dictionary with information like page number (for PDFs), chunk sequence, source document ID, etc. Coordinates or other positional information might also be included if extracted by the parser.

### 3.2. Supported Document Types

The current `DocumentProcessor` (based on PyPDF2/Pytesseract) typically supports:
*   **Plain Text:** `.txt`, `.md` (treated as plain text).
*   **PDFs (`.pdf`):**
    *   **Text-based PDFs:** Text is extracted directly using PyPDF2.
    *   **Image-based PDFs (Scanned):** OCR is applied using Pytesseract (requires Tesseract to be installed). The processor might try direct text extraction first and fall back to OCR if little or no text is found.
*   **Images (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`):** Text is extracted using OCR (Pytesseract).

*Future Enhancement: The planned integration with Vertex AI Document AI will significantly expand parsing capabilities and improve extraction quality, potentially handling more complex layouts, tables, forms, etc.*

### 3.3. Semantic Chunking

After text extraction, the `DocumentProcessor` uses a `SemanticChunker` (e.g., `tools/document_processing/semantic_chunker.py`) to split the raw text into smaller, meaningful pieces. This is crucial for effective embedding generation, as embeddings are typically generated per chunk.

The `SemanticChunker` might use various strategies:
*   Fixed-size chunks with overlap.
*   Sentence-based splitting.
*   Paragraph-based splitting.
*   More advanced NLP techniques to identify semantic boundaries.

The chunking strategy (e.g., chunk size, overlap) might be configurable when initializing the `DocumentProcessor` or `SemanticChunker`.

## 4. Using Different Parsers (Conceptual for Future Vertex AI Integration)

While the current version primarily uses PyPDF2/Pytesseract, the `DocumentProcessor` is designed to be extensible. In the future, when Vertex AI Document AI is the primary parser:

*   Initialization might involve specifying the Vertex AI processor ID.
*   The `process_document` method would internally call the Vertex AI Document AI service.
*   The returned `processed_data` would be richer, potentially including detailed layout information, form fields, table data, and higher-quality text extraction.

## 5. Error Handling

*   **FileNotFoundError:** Ensure the file path provided to `process_document` is correct.
*   **Unsupported File Type:** The processor might raise an error or return no content if the file type is not supported.
*   **OCR Errors:** If Tesseract is not installed or configured correctly, OCR operations will fail. Ensure Tesseract is in the system PATH.
*   **Permissions:** Ensure the application has read permissions for the input file.
*   **Corrupted Files:** Processing might fail for corrupted or malformed document files.

Always wrap calls to `process_document` in `try...except` blocks.

## 6. Output Usage

The `chunks` generated by `DocumentProcessor` are typically used for:
1.  **Embedding Generation:** Each chunk's `text_content` is passed to an embedding model (e.g., via `VectorSearchClient.generate_embeddings`).
2.  **Indexing:** The generated embeddings, along with the chunk text and metadata, are then uploaded to Vertex AI Vector Search (or another vector store). The chunk ID (often derived from document ID and chunk sequence) is used as the datapoint ID in the vector store.

```python
# Conceptual continuation from processing a document:
# if processed_data and processed_data.get('chunks'):
#     chunks_for_embedding = [chunk['text_content'] for chunk in processed_data['chunks']]
#     
#     # Assume vs_client is an initialized VectorSearchClient
#     if vs_client and chunks_for_embedding:
#         try:
#             embeddings_response = vs_client.generate_embeddings(texts=chunks_for_embedding)
#             
#             datapoints_to_upload = []
#             for i, prediction in enumerate(embeddings_response.predictions):
#                 embedding_vector = prediction.get('embedding', [])
#                 chunk_id = f"{processed_data.get('source_path')}_chunk_{i}" # Example ID
#                 # Store original text and other metadata as needed for your application
#                 datapoints_to_upload.append({
#                     "id": chunk_id,
#                     "embedding": embedding_vector,
#                     "text_content": processed_data['chunks'][i]['text_content'], # For context retrieval
#                     "metadata": processed_data['chunks'][i]['metadata']
#                 })
#             
#             # Now, upload these datapoints to Vector Search
#             # (See VectorSearchClient Usage Guide for upload details)
#             # e.g., vs_client.upsert_datapoints_from_list(datapoints_to_upload) if such a method exists
#             print(f"Prepared {len(datapoints_to_upload)} datapoints for upload.")
#
#         except Exception as e:
#             print(f"Error during embedding or datapoint preparation: {e}")
```

## 7. Best Practices

*   **File Paths:** Use absolute paths for documents if unsure about the script's working directory.
*   **Error Logging:** Implement robust logging around document processing calls to track successes, failures, and processing times.
*   **Large Files:** Be mindful of memory usage and processing time for very large documents. The `DocumentProcessor` might have internal limits or stream processing capabilities for huge files (check implementation).
*   **OCR Quality:** For scanned documents, the quality of OCR (and thus text extraction) depends heavily on the image quality and Tesseract's capabilities. Preprocessing images (e.g., deskewing, binarization) can sometimes improve OCR results.

This guide provides a general overview of using the `DocumentProcessor`. For specific details on supported MIME types, chunking strategies, and configuration options, refer to the source code of `tools/document_processing/document_processor.py` and `tools/document_processing/semantic_chunker.py`.
