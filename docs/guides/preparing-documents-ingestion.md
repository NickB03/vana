# Preparing Documents for Ingestion

[Home](../../index.md) > [Guides](../index.md) > Preparing Documents for Ingestion

This guide outlines best practices and considerations for preparing your documents before ingesting them into VANA using the `DocumentProcessor`. Proper preparation can significantly improve the quality of text extraction, semantic chunking, embedding generation, and ultimately, search relevance.

## 1. Overview of the Ingestion Process

Before diving into preparation, it's helpful to understand the typical ingestion flow in VANA:

1.  **Document Collection:** Gather the documents you want to ingest.
2.  **Preparation (This Guide):** Pre-process documents for optimal results.
3.  **Processing with `DocumentProcessor`:**
    *   Text extraction (direct or OCR).
    *   Semantic chunking.
4.  **Embedding Generation:** Convert text chunks into vector embeddings using a model like Vertex AI's `text-embedding-004` (via `VectorSearchClient`).
5.  **Indexing:** Upload embeddings and associated metadata (chunk text, source document info) to Vertex AI Vector Search.
6.  **Knowledge Graph Enrichment (Optional):** Extract entities and relationships from chunks and store them in the MCP Knowledge Graph via `KnowledgeGraphManager`.

This guide focuses on Step 2.

## 2. Supported File Formats

Ensure your documents are in a format supported by the current `DocumentProcessor` implementation (PyPDF2/Pytesseract):

*   **Plain Text:** `.txt`, `.md` (Markdown is typically treated as plain text for extraction).
*   **PDF (`.pdf`):** Both text-based and image-based (scanned) PDFs.
*   **Images (`.png`, `.jpg`, `.jpeg`, `.tiff`, `.bmp`):** For OCR.

*Future: Vertex AI Document AI integration will likely expand this list and improve handling of complex formats like DOCX, PPTX, HTML, etc., and provide better layout-aware parsing.*

## 3. Content Quality and Formatting

### 3.1. Text-Based Documents (.txt, .md, text-based .pdf)
*   **Clean Text:** Remove any irrelevant boilerplate, headers/footers (if not part of the main content), or control characters that are not part of the meaningful text.
*   **Consistent Formatting:** While not strictly necessary for plain text, consistent use of paragraphs and section breaks can help the `SemanticChunker`.
*   **Encoding:** Ensure files are in a common encoding, preferably UTF-8, to avoid character interpretation issues.
*   **Markdown:** For `.md` files, consider if you want the Markdown syntax itself to be part of the ingested text or if you prefer to render it to plain text first (the current `DocumentProcessor` likely treats it as plain text).

### 3.2. PDF Documents
*   **Prefer Text-Based PDFs:** If you have a choice, always use text-based (native) PDFs over scanned/image-based PDFs. Text extraction is far more accurate and faster from native PDFs.
*   **OCR Quality for Scanned PDFs:**
    *   **Resolution:** Scan documents at a good resolution (e.g., 300 DPI or higher).
    *   **Clarity:** Ensure the scan is clear, without excessive skew, noise, or poor contrast.
    *   **Language:** If Tesseract OCR is used, ensure it's configured for the correct language(s) present in the document. The `DocumentProcessor` might have options for this.
    *   **Layout:** Complex layouts (multi-column, tables, figures with captions) in scanned PDFs can be challenging for standard OCR. Vertex AI Document AI (planned) is much better at handling these.
*   **Password Protection:** Remove any password protection that prevents text extraction.
*   **Annotations/Comments:** Decide if PDF annotations or comments should be part of the ingested content. Standard text extraction might ignore them.

### 3.3. Image Documents
*   **Resolution & Clarity:** Similar to scanned PDFs, use high-resolution, clear images for OCR.
*   **Text Orientation:** Ensure text is correctly oriented (not upside down or excessively skewed).
*   **Noise Reduction:** Clean up any noise or artifacts in the image.
*   **File Format:** Use common, lossless (like PNG, TIFF) or high-quality lossy (like JPG) formats.

## 4. Structuring Content for Semantic Chunking

The `SemanticChunker` aims to divide documents into meaningful segments. You can help it by:

*   **Clear Paragraphs:** Use clear paragraph breaks (e.g., double line breaks in text files).
*   **Headings and Subheadings:** Well-structured documents with headings often lead to better chunk boundaries if the chunker is designed to recognize them (e.g., by splitting at headings or keeping heading context with chunks).
*   **Logical Flow:** Ensure the document has a logical flow. Disjointed content might be harder to chunk semantically.
*   **Avoid Very Long Sentences/Paragraphs:** If possible, break down extremely long sentences or paragraphs into more digestible units, as these can sometimes exceed optimal chunk sizes.

## 5. Metadata Considerations

While the `DocumentProcessor` automatically extracts some metadata (like file path, MIME type, page numbers), consider if you need to associate additional custom metadata with your documents or chunks. This metadata can be very useful for filtering search results or providing context.

*   **Source Information:** Document origin, author, creation date, version.
*   **Categorization:** Tags, keywords, topics, security/access level.
*   **Business Context:** Associated project, department, client, etc.

**How to associate custom metadata:**
*   **Filename Conventions:** You might encode some metadata in filenames if your ingestion pipeline can parse it.
*   **Sidecar Files:** Store metadata in a separate file (e.g., a JSON file with the same base name as the document) that your ingestion script can read.
*   **Document Properties:** Some file formats (like PDF, DOCX) have internal metadata properties. The parser might be able to extract these.
*   **Manual Input:** For small batches, metadata might be input manually during the ingestion process.

This custom metadata would typically be added to the `metadata` field of each chunk before indexing into Vector Search.

## 6. Pre-computation and Pre-analysis (Advanced)

*   **Entity Extraction:** If you have specific entities you want to ensure are captured or linked, you might run a separate Named Entity Recognition (NER) process before or after the `DocumentProcessor` and store these entities.
*   **Summarization:** For very long documents, you might generate summaries that can be indexed alongside or instead of full chunks for certain use cases.
*   **Language Detection:** If dealing with multilingual documents, detect the language to ensure correct OCR settings or text processing steps.

## 7. Batching and Organization

*   Organize documents into logical batches or directories if that helps manage the ingestion process.
*   Keep track of which documents have been processed and ingested to avoid duplicates or missed files.

## 8. Iterative Refinement

*   **Test with a Sample Set:** Before ingesting a large corpus, test the preparation and ingestion process with a representative sample of your documents.
*   **Review Extracted Text and Chunks:** Check the quality of text extraction and how the `SemanticChunker` is dividing the content.
*   **Adjust Preparation Steps:** Based on the review, you might need to adjust your document preparation steps (e.g., improve scan quality, clean up text further, modify chunking parameters if configurable).

By carefully preparing your documents, you lay a strong foundation for VANA's knowledge processing pipeline, leading to more accurate embeddings, better search results, and a more valuable knowledge base.
