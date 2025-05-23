# Knowledge Base Expansion Guide

This guide explains how to expand the VANA Knowledge Base with new documents and evaluate the results.

## Overview

The VANA Knowledge Base consists of two main components:

1. **Vector Search**: Stores document chunks for semantic search
2. **Knowledge Graph**: Stores entities and relationships for structured knowledge

The Knowledge Base Expansion process:

1. Processes documents from a directory
2. Extracts entities and relationships
3. Adds document chunks to Vector Search
4. Adds entities and relationships to Knowledge Graph
5. Evaluates the quality of the Knowledge Base

## Prerequisites

Before expanding the Knowledge Base, ensure you have:

1. Set up the VANA environment
2. Configured Vector Search and Knowledge Graph
3. Prepared documents to add to the Knowledge Base

## Document Preparation

Documents should be placed in the `knowledge_docs` directory or a subdirectory. The following file types are supported:

- PDF (`.pdf`)
- Text (`.txt`)
- Markdown (`.md`, `.markdown`)

For best results, documents should:

- Have clear titles (first line or metadata)
- Be well-structured with headings and sections
- Contain relevant information about VANA, Vector Search, Knowledge Graph, etc.

## Expanding the Knowledge Base

### Using the Script

The easiest way to expand the Knowledge Base is to use the provided script:

```bash
./scripts/run_knowledge_base_update.sh
```

This script will:

1. Process all documents in the `knowledge_docs` directory
2. Add them to Vector Search and Knowledge Graph
3. Evaluate the quality of the Knowledge Base
4. Save logs to the `logs` directory

### Manual Expansion

You can also expand the Knowledge Base manually using the Python scripts:

```bash
# Expand Knowledge Base
python scripts/expand_knowledge_base.py knowledge_docs --recursive --output logs/expansion.json

# Evaluate Knowledge Base
python scripts/evaluate_knowledge_base.py --output logs/evaluation.json
```

### Advanced Options

The `expand_knowledge_base.py` script supports the following options:

- `--file-types`: Specify file types to process (default: pdf, txt, md, markdown)
- `--recursive`: Process subdirectories
- `--no-vector-search`: Don't add documents to Vector Search
- `--no-knowledge-graph`: Don't add documents to Knowledge Graph
- `--output`: Output file for processing statistics

Example:

```bash
python scripts/expand_knowledge_base.py docs/architecture --file-types md txt --recursive --output logs/architecture_expansion.json
```

The `evaluate_knowledge_base.py` script supports the following options:

- `--queries`: JSON file containing test queries
- `--output`: Output file for evaluation results
- `--top-k`: Number of results to retrieve (default: 5)
- `--vector-search`: Evaluate Vector Search
- `--knowledge-graph`: Evaluate Knowledge Graph
- `--hybrid-search`: Evaluate Hybrid Search

Example:

```bash
python scripts/evaluate_knowledge_base.py --queries custom_queries.json --top-k 10 --output logs/custom_evaluation.json
```

## Custom Test Queries

You can create custom test queries to evaluate the Knowledge Base. Create a JSON file with the following format:

```json
[
  {
    "query": "What is VANA?",
    "expected_keywords": ["Versatile Agent Network Architecture", "intelligent", "agent", "system", "ADK"],
    "category": "general",
    "difficulty": "easy"
  },
  {
    "query": "How does Vector Search work?",
    "expected_keywords": ["embedding", "semantic", "similarity", "Vertex AI", "index"],
    "category": "technology",
    "difficulty": "medium"
  }
]
```

Each query should include:

- `query`: The search query
- `expected_keywords`: Keywords that should appear in the results
- `category`: Category of the query (general, technology, implementation, etc.)
- `difficulty`: Difficulty of the query (easy, medium, hard)

## Evaluation Metrics

The evaluation script calculates the following metrics:

- **Precision**: Fraction of retrieved information that is relevant
- **Recall**: Fraction of relevant information that is retrieved
- **F1 Score**: Harmonic mean of precision and recall
- **NDCG**: Normalized Discounted Cumulative Gain for ranking quality

These metrics are calculated for:

- Vector Search
- Knowledge Graph
- Hybrid Search

The results are broken down by:

- Query category
- Query difficulty

## Logs and Reports

The expansion and evaluation scripts generate detailed logs and reports:

- **Expansion Log**: Contains statistics about the documents processed, entities extracted, and chunks added to Vector Search
- **Evaluation Log**: Contains metrics for Vector Search, Knowledge Graph, and Hybrid Search

These logs are saved to the `logs` directory with a timestamp.

## Troubleshooting

If you encounter issues with the Knowledge Base expansion:

1. Check that Vector Search and Knowledge Graph are properly configured
2. Verify that the documents are in the correct format
3. Check the logs for error messages
4. Try processing a single document to isolate the issue

Common issues:

- **Vector Search not available**: Check the Vector Search configuration
- **Knowledge Graph not available**: Check the Knowledge Graph configuration
- **Document processing failed**: Check the document format and encoding
- **Low evaluation metrics**: Add more relevant documents to the Knowledge Base
