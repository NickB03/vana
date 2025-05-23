# VANA Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered when using VANA. It covers problems related to Vector Search, Knowledge Graph, document processing, and web search integration.

## Vector Search Issues

### Issue: Vector Search Not Available

**Symptoms:**
- "Vector Search not available" error messages
- Empty search results
- `is_available()` returns False

**Solutions:**
1. Check environment variables:
   ```
   GOOGLE_CLOUD_PROJECT
   GOOGLE_CLOUD_LOCATION
   VECTOR_SEARCH_ENDPOINT_ID
   DEPLOYED_INDEX_ID
   ```

2. Verify service account credentials:
   ```bash
   # Check if credentials file exists
   ls -l $GOOGLE_APPLICATION_CREDENTIALS
   
   # Verify permissions
   gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
   ```

3. Check endpoint status:
   ```bash
   gcloud ai index-endpoints describe $VECTOR_SEARCH_ENDPOINT_ID \
     --project=$GOOGLE_CLOUD_PROJECT \
     --region=$GOOGLE_CLOUD_LOCATION
   ```

### Issue: Poor Search Results

**Symptoms:**
- Irrelevant search results
- Missing expected information
- Low precision and recall scores

**Solutions:**
1. Check embedding quality:
   ```python
   # Test embedding generation
   from tools.vector_search.vector_search_client import VectorSearchClient
   
   client = VectorSearchClient()
   embedding = client.generate_embedding("test query")
   print(f"Embedding dimensions: {len(embedding)}")
   ```

2. Verify index content:
   ```bash
   # List documents in index
   python scripts/list_vector_search_documents.py --limit 10
   ```

3. Optimize chunking strategy:
   - Adjust chunk size (smaller for precision, larger for context)
   - Increase chunk overlap
   - Use structure-aware chunking

## Knowledge Graph Issues

### Issue: Knowledge Graph Not Available

**Symptoms:**
- "Knowledge Graph not available" error messages
- Empty entity results
- `is_available()` returns False

**Solutions:**
1. Check MCP configuration:
   ```
   MCP_API_KEY
   MCP_SERVER_URL
   MCP_NAMESPACE
   ```

2. Test MCP connection:
   ```bash
   python scripts/test_mcp_connection.py
   ```

3. Restart MCP server:
   ```bash
   cd mcp-servers/n8n-mcp
   ./start-mcp-server.sh
   ```

### Issue: Entity Extraction Problems

**Symptoms:**
- Few or no entities extracted
- Missing relationships
- Incorrect entity types

**Solutions:**
1. Check entity extractor configuration:
   ```python
   # Test entity extraction
   from tools.knowledge_graph.entity_extractor import EntityExtractor
   
   extractor = EntityExtractor()
   entities = extractor.extract_entities("VANA is a Versatile Agent Network Architecture.")
   print(f"Extracted entities: {entities}")
   ```

2. Adjust extraction confidence threshold:
   ```python
   # Lower threshold for more entities (may include more false positives)
   extractor = EntityExtractor(confidence_threshold=0.5)
   ```

3. Add custom entity types:
   ```python
   # Add custom entity types
   extractor.add_entity_type("technology", ["VANA", "Vector Search", "Knowledge Graph"])
   ```

## Document Processing Issues

### Issue: Document Processing Failures

**Symptoms:**
- Error messages during document processing
- Missing chunks or metadata
- Incomplete document content

**Solutions:**
1. Check file format support:
   ```python
   # Check supported formats
   from tools.document_processing.document_processor import DocumentProcessor
   
   processor = DocumentProcessor()
   print(f"Supported formats: {processor.supported_formats}")
   ```

2. Verify file permissions:
   ```bash
   # Check file permissions
   ls -l path/to/document.pdf
   ```

3. Install missing dependencies:
   ```bash
   # For PDF support
   pip install pymupdf
   
   # For image support
   pip install pillow pytesseract
   ```

### Issue: Poor Chunking Quality

**Symptoms:**
- Chunks cut off mid-sentence
- Missing context in chunks
- Chunks too large or too small

**Solutions:**
1. Adjust chunking parameters:
   ```python
   # Customize chunking
   from tools.document_processing.semantic_chunker import SemanticChunker
   
   chunker = SemanticChunker(
       chunk_size=1000,  # Target size in characters
       chunk_overlap=200,  # Overlap between chunks
       respect_structure=True  # Preserve document structure
   )
   ```

2. Use structure-aware chunking:
   ```python
   # Enable structure-aware chunking
   chunker = SemanticChunker(strategy="structure")
   ```

3. Implement custom chunking rules:
   ```python
   # Add custom chunking rules
   chunker.add_boundary_rule(r"^## ", "heading")  # Markdown headings
   ```

## Web Search Issues

### Issue: Web Search Not Available

**Symptoms:**
- "Web search not available" error messages
- Empty web search results
- `available` property is False

**Solutions:**
1. Check API credentials:
   ```
   GOOGLE_SEARCH_API_KEY
   GOOGLE_SEARCH_ENGINE_ID
   ```

2. Verify API quota:
   - Check Google Cloud Console for quota usage
   - Consider upgrading to higher quota tier

3. Use mock web search for testing:
   ```python
   # Use mock web search
   from tools.web_search import MockWebSearchClient
   
   client = MockWebSearchClient()
   results = client.search("VANA architecture")
   print(f"Results: {results}")
   ```

### Issue: Poor Web Search Results

**Symptoms:**
- Irrelevant web results
- Missing expected information
- Low quality snippets

**Solutions:**
1. Improve query preprocessing:
   ```python
   # Enhance query
   from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
   
   search = EnhancedHybridSearchOptimized()
   preprocessed = search.preprocess_query("What is VANA architecture?")
   print(f"Preprocessed query: {preprocessed}")
   ```

2. Adjust source weights:
   ```python
   # Customize source weights
   search.source_weights = {
       "vector_search": 0.7,
       "knowledge_graph": 0.9,
       "web_search": 0.6
   }
   ```

3. Configure Custom Search Engine settings:
   - Visit Google Programmable Search Engine dashboard
   - Adjust site restrictions and search preferences

## Hybrid Search Issues

### Issue: Unbalanced Search Results

**Symptoms:**
- Results heavily biased toward one source
- Missing results from certain sources
- Poor diversity in results

**Solutions:**
1. Adjust source weights:
   ```python
   # Balance source weights
   from tools.enhanced_hybrid_search_optimized import EnhancedHybridSearchOptimized
   
   search = EnhancedHybridSearchOptimized()
   search.source_weights = {
       "vector_search": 0.7,
       "knowledge_graph": 0.7,
       "web_search": 0.7
   }
   ```

2. Improve diversity enforcement:
   ```python
   # Customize diversity settings
   search.max_consecutive_same_source = 2
   ```

3. Implement query classification:
   ```python
   # Use query classification
   category = search.classify_query("What is VANA architecture?")
   print(f"Query category: {category}")
   ```

### Issue: Slow Search Performance

**Symptoms:**
- High latency in search results
- Timeouts during search
- Performance degradation with complex queries

**Solutions:**
1. Implement caching:
   ```python
   # Add caching
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def cached_search(query, top_k=5):
       return search.search(query, top_k=top_k)
   ```

2. Optimize parallel execution:
   ```python
   # Use async execution
   import asyncio
   
   async def search_async(query, top_k=5):
       tasks = [
           vector_search_async(query, top_k),
           knowledge_graph_async(query),
           web_search_async(query, top_k)
       ]
       results = await asyncio.gather(*tasks)
       return combine_results(results)
   ```

3. Limit result size:
   ```python
   # Limit result size
   search.max_results_per_source = 5
   ```

## Environment Setup Issues

### Issue: Missing Dependencies

**Symptoms:**
- Import errors
- "Module not found" errors
- Functionality not available

**Solutions:**
1. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Check Python version:
   ```bash
   python --version  # Should be 3.9+
   ```

3. Set up virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   .venv\Scripts\activate     # Windows
   ```

### Issue: Environment Variable Problems

**Symptoms:**
- "Environment variable not set" errors
- Authentication failures
- Service connection issues

**Solutions:**
1. Check environment variables:
   ```bash
   # Linux/Mac
   env | grep GOOGLE
   env | grep MCP
   
   # Windows
   set | findstr GOOGLE
   set | findstr MCP
   ```

2. Set up environment variables:
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with correct values
   ```

3. Load environment variables:
   ```python
   # In Python
   from dotenv import load_dotenv
   load_dotenv()
   ```

## Evaluation Framework Issues

### Issue: Evaluation Failures

**Symptoms:**
- Errors during evaluation
- Missing metrics
- Incomplete evaluation reports

**Solutions:**
1. Check test queries:
   ```bash
   # Verify test queries file
   cat tests/test_data/comprehensive_test_queries.json
   ```

2. Run with verbose logging:
   ```bash
   python scripts/enhanced_evaluation.py --queries tests/test_data/comprehensive_test_queries.json --verbose
   ```

3. Test individual components:
   ```bash
   # Test Vector Search evaluation
   python scripts/enhanced_evaluation.py --vector-search --queries tests/test_data/comprehensive_test_queries.json
   ```

## Getting Help

If you continue to experience issues:

1. Check the logs:
   ```bash
   cat logs/vana.log
   ```

2. Run diagnostics:
   ```bash
   python scripts/run_diagnostics.py
   ```

3. Contact support:
   - File an issue on GitHub
   - Provide detailed error messages and logs
   - Include steps to reproduce the issue
