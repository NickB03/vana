# Tech Context: VANA

## 1. Core Programming Language & Runtime
*   **Python:** Version 3.9+ is the primary language for all backend services, tools, and scripts.

## 2. Key Frameworks & Libraries
*   **Streamlit:** Used for the frontend UI of the monitoring dashboard (`dashboard/app.py`).
*   **Flask:** Used for the backend API server of the monitoring dashboard (`dashboard/flask_app.py`).
*   **Google Cloud Client Libraries for Python:**
    *   `google-cloud-aiplatform`: For interacting with Vertex AI services, especially Vector Search and Embeddings.
    *   `google-cloud-storage`: Potentially used for document storage if part of the document pipeline.
    *   `google-cloud-documentai`: Planned for primary document parsing (currently not fully implemented in `DocumentProcessor`).
*   **Requests:** For making HTTP requests to external APIs (e.g., MCP Knowledge Graph server, Google Custom Search API).
*   **python-dotenv:** For loading environment variables from `.env` files.
*   **PyPDF2:** Currently used by `DocumentProcessor` for PDF text extraction (as a fallback or primary until Document AI is integrated).
*   **Pillow (PIL Fork):** Used by `DocumentProcessor` for image manipulation.
*   **Pytesseract:** Used by `DocumentProcessor` for OCR on images.
*   **Plotly & Altair:** Used by the Streamlit dashboard for creating charts and visualizations.
*   **Pandas:** Used by the Streamlit dashboard for data manipulation before visualization.

## 2.1. Tool Standardization Framework (Phase 4A)
*   **Python Dataclasses:** Used for `StandardToolResponse`, `PerformanceMetrics`, and other structured data
*   **Python Enums:** Used for `ToolErrorType` classification system
*   **Python Type Hints:** Comprehensive typing throughout the standardization framework
*   **Python Decorators:** `@standardized_tool_wrapper` for consistent tool execution monitoring
*   **Threading:** Background resource monitoring for performance profiling
*   **JSON:** Export/import of performance metrics and analytics data
*   **Time & Statistics:** Performance timing and statistical analysis
*   **Traceback:** Enhanced error reporting with full stack traces
*   **Logging:** Structured logging with appropriate levels for different error types

## 2.2. Performance Optimization Framework (NEW - Phase 4B)
*   **Python functools.lru_cache:** LRU caching with configurable maxsize for task analysis
*   **Python hashlib:** MD5 hashing for cache key generation and task similarity detection
*   **Python threading.RLock:** Thread-safe cache operations for concurrent access
*   **Python collections.deque:** Efficient FIFO queue for cache eviction and metrics history
*   **Python collections.defaultdict:** Optimized data structures for performance tracking
*   **Python time module:** High-precision timing for performance measurement
*   **Python statistics module:** Statistical analysis for performance trends and benchmarking
*   **Python dataclasses:** Structured data for cache entries and performance snapshots
*   **Python typing:** Comprehensive type hints for cache and performance components
*   **JSON serialization:** Performance metrics export and cache persistence

## 3. Cloud Services & Platforms
*   **Google Cloud Platform (GCP):**
    *   **Vertex AI:**
        *   **Vector Search:** Core for semantic search and knowledge retrieval.
        *   **Text Embedding Models:** (e.g., `text-embedding-004`) Used to generate embeddings for Vector Search.
        *   **Document AI:** Planned primary service for document parsing and extraction.
    *   **Google Cloud Storage (GCS):** Potentially used for storing raw documents or intermediate files in the document processing pipeline.
*   **MCP (Model Context Protocol) Server:**
    *   Used for Knowledge Graph integration.
    *   Currently configured to potentially use a community-hosted server (`mcp.community.augment.co`) or a local development server.
*   **Google Custom Search API:** Used by `WebSearchClient` for real-time web search (transitioning to Brave MCP).

## 4. Development & Operational Tools
*   **Git & GitHub:** For version control and repository hosting.
*   **Virtual Environments (`venv`):** For managing Python dependencies.
*   **pip:** For Python package installation.
*   **Shell Scripts (`.sh`):** For various operational tasks, running tests, or launching services.
*   **Tesseract OCR Engine:** External dependency required for OCR functionality in the current `DocumentProcessor`.

## 5. Key Data Formats & Protocols
*   **JSON:** Widely used for API request/response payloads, configuration files (e.g., dashboard credentials), and data interchange.
*   **Markdown:** Primary format for documentation.
*   **HTTP/S & REST APIs:** For communication with GCP services, MCP server, and the internal Flask dashboard API.
*   **Text files (.txt, .md):** Input for document processing.
*   **PDF files:** Input for document processing.
*   **Image files (JPG, PNG, etc.):** Input for document processing with OCR.

## 6. Configuration Management
*   **`.env` files:** For storing environment-specific variables (API keys, endpoints, project IDs).
*   **`config/environment.py`:** Python module for loading and providing access to these configurations based on `VANA_ENV`.

## 7. Noteworthy Deprecated/Archived Technologies (for historical context)
*   **Google ADK (Agent Development Kit):** The previous foundation for a multi-agent system.
*   **Ragie.ai:** Previously used for vector search before transitioning to Vertex AI.
*   **CrewAI:** Mentioned as explored but abandoned.
