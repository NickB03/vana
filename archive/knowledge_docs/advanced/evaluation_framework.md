# Advanced Evaluation Framework for VANA

## Overview

VANA's advanced evaluation framework provides comprehensive metrics and tools for assessing the quality of knowledge retrieval. This framework enables continuous improvement of search quality through systematic evaluation and analysis.

## Evaluation Metrics

The evaluation framework includes the following metrics:

### Basic Metrics

1. **Precision**: Fraction of retrieved information that is relevant
   - Formula: `Precision = Relevant Retrieved / Total Retrieved`
   - Measures how many of the retrieved results are actually relevant

2. **Recall**: Fraction of relevant information that is retrieved
   - Formula: `Recall = Relevant Retrieved / Total Relevant`
   - Measures how much of the relevant information is actually retrieved

3. **F1 Score**: Harmonic mean of precision and recall
   - Formula: `F1 = 2 * (Precision * Recall) / (Precision + Recall)`
   - Balances precision and recall

### Advanced Metrics

4. **NDCG (Normalized Discounted Cumulative Gain)**: Measures ranking quality
   - Formula: `NDCG = DCG / IDCG`
   - Where:
     - `DCG = sum(rel_i / log2(i+1))` for each result i
     - `IDCG` is the DCG of the ideal ranking
   - Evaluates both relevance and ranking position

5. **MRR (Mean Reciprocal Rank)**: Average of reciprocal ranks of relevant results
   - Formula: `MRR = (1/|Q|) * sum(1/rank_i)` for each query i
   - Focuses on the position of the first relevant result

6. **MAP (Mean Average Precision)**: Mean of average precision for each query
   - Formula: `MAP = (1/|Q|) * sum(AP_i)` for each query i
   - Where `AP_i` is the average precision for query i
   - Provides a single-figure measure of quality across recall levels

7. **Latency**: Time to retrieve and rank results
   - Measured in milliseconds
   - Important for user experience

8. **Coverage**: Fraction of queries that return at least one result
   - Formula: `Coverage = Queries with Results / Total Queries`
   - Measures the system's ability to handle diverse queries

## Implementation

The evaluation framework is implemented in Python:

```python
def calculate_precision(results, expected_keywords):
    """
    Calculate precision of search results
    
    Args:
        results: List of search results
        expected_keywords: List of expected keywords
        
    Returns:
        Precision score (0-1)
    """
    if not results or not expected_keywords:
        return 0.0
    
    relevant_count = 0
    
    for result in results:
        content = result.get("content", "").lower()
        
        # Check if any expected keyword is in the content
        if any(keyword.lower() in content for keyword in expected_keywords):
            relevant_count += 1
    
    return relevant_count / len(results)

def calculate_recall(results, expected_keywords):
    """
    Calculate recall of search results
    
    Args:
        results: List of search results
        expected_keywords: List of expected keywords
        
    Returns:
        Recall score (0-1)
    """
    if not results or not expected_keywords:
        return 0.0
    
    found_keywords = set()
    
    for result in results:
        content = result.get("content", "").lower()
        
        # Find all expected keywords in the content
        for keyword in expected_keywords:
            if keyword.lower() in content:
                found_keywords.add(keyword.lower())
    
    return len(found_keywords) / len(expected_keywords)

def calculate_f1_score(precision, recall):
    """
    Calculate F1 score
    
    Args:
        precision: Precision score
        recall: Recall score
        
    Returns:
        F1 score (0-1)
    """
    if precision + recall == 0:
        return 0.0
    
    return 2 * (precision * recall) / (precision + recall)

def calculate_relevance_scores(results, expected_keywords):
    """
    Calculate relevance scores for NDCG
    
    Args:
        results: List of search results
        expected_keywords: List of expected keywords
        
    Returns:
        List of relevance scores
    """
    relevance_scores = []
    
    for result in results:
        content = result.get("content", "").lower()
        
        # Count how many expected keywords are in the content
        keyword_count = sum(1 for keyword in expected_keywords 
                           if keyword.lower() in content)
        
        # Normalize by total keywords
        relevance = keyword_count / len(expected_keywords)
        
        relevance_scores.append(relevance)
    
    return relevance_scores

def calculate_ndcg(relevance_scores):
    """
    Calculate NDCG (Normalized Discounted Cumulative Gain)
    
    Args:
        relevance_scores: List of relevance scores
        
    Returns:
        NDCG score (0-1)
    """
    if not relevance_scores:
        return 0.0
    
    # Calculate DCG
    dcg = relevance_scores[0]
    for i in range(1, len(relevance_scores)):
        dcg += relevance_scores[i] / math.log2(i + 2)
    
    # Calculate IDCG (ideal DCG)
    ideal_scores = sorted(relevance_scores, reverse=True)
    idcg = ideal_scores[0]
    for i in range(1, len(ideal_scores)):
        idcg += ideal_scores[i] / math.log2(i + 2)
    
    if idcg == 0:
        return 0.0
    
    return dcg / idcg

def calculate_mrr(results_list, expected_keywords_list):
    """
    Calculate Mean Reciprocal Rank
    
    Args:
        results_list: List of result lists for multiple queries
        expected_keywords_list: List of expected keywords lists for multiple queries
        
    Returns:
        MRR score (0-1)
    """
    if not results_list or not expected_keywords_list:
        return 0.0
    
    reciprocal_ranks = []
    
    for results, expected_keywords in zip(results_list, expected_keywords_list):
        # Find the first relevant result
        for i, result in enumerate(results):
            content = result.get("content", "").lower()
            
            # Check if any expected keyword is in the content
            if any(keyword.lower() in content for keyword in expected_keywords):
                reciprocal_ranks.append(1 / (i + 1))
                break
        else:
            # No relevant result found
            reciprocal_ranks.append(0)
    
    return sum(reciprocal_ranks) / len(reciprocal_ranks)

def calculate_map(results_list, expected_keywords_list):
    """
    Calculate Mean Average Precision
    
    Args:
        results_list: List of result lists for multiple queries
        expected_keywords_list: List of expected keywords lists for multiple queries
        
    Returns:
        MAP score (0-1)
    """
    if not results_list or not expected_keywords_list:
        return 0.0
    
    average_precisions = []
    
    for results, expected_keywords in zip(results_list, expected_keywords_list):
        relevant_count = 0
        precisions = []
        
        for i, result in enumerate(results):
            content = result.get("content", "").lower()
            
            # Check if any expected keyword is in the content
            if any(keyword.lower() in content for keyword in expected_keywords):
                relevant_count += 1
                precisions.append(relevant_count / (i + 1))
        
        if precisions:
            average_precisions.append(sum(precisions) / len(precisions))
        else:
            average_precisions.append(0)
    
    return sum(average_precisions) / len(average_precisions)

def measure_latency(func, *args, **kwargs):
    """
    Measure latency of a function
    
    Args:
        func: Function to measure
        *args: Function arguments
        **kwargs: Function keyword arguments
        
    Returns:
        Tuple of (function result, latency in milliseconds)
    """
    start_time = time.time()
    result = func(*args, **kwargs)
    end_time = time.time()
    
    latency = (end_time - start_time) * 1000  # Convert to milliseconds
    
    return result, latency
```

## Test Queries

The evaluation framework uses a set of test queries to evaluate search quality:

```python
TEST_QUERIES = [
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
    },
    {
        "query": "What is the Knowledge Graph in VANA?",
        "expected_keywords": ["structured", "entity", "relationship", "MCP", "knowledge"],
        "category": "technology",
        "difficulty": "medium"
    },
    {
        "query": "How does Hybrid Search combine results?",
        "expected_keywords": ["combine", "merge", "rank", "vector", "knowledge graph"],
        "category": "technology",
        "difficulty": "hard"
    },
    {
        "query": "What is semantic chunking?",
        "expected_keywords": ["document", "chunk", "semantic", "boundary", "context"],
        "category": "feature",
        "difficulty": "medium"
    },
    {
        "query": "How to set up the VANA environment?",
        "expected_keywords": ["virtual environment", "dependencies", "setup", "configuration", "launch"],
        "category": "setup",
        "difficulty": "easy"
    },
    {
        "query": "What APIs does VANA use?",
        "expected_keywords": ["Google", "Vertex AI", "ADK", "MCP", "API"],
        "category": "integration",
        "difficulty": "medium"
    },
    {
        "query": "How does VANA handle PDF documents?",
        "expected_keywords": ["PDF", "extract", "text", "process", "metadata"],
        "category": "feature",
        "difficulty": "medium"
    },
    {
        "query": "How does web search integration work?",
        "expected_keywords": ["web", "Google", "Custom Search", "API", "integration"],
        "category": "feature",
        "difficulty": "hard"
    },
    {
        "query": "What metrics are used to evaluate search quality?",
        "expected_keywords": ["precision", "recall", "F1", "NDCG", "evaluation"],
        "category": "evaluation",
        "difficulty": "medium"
    }
]
```

## Evaluation Process

The evaluation process consists of the following steps:

1. **Test Query Generation**: Create a diverse set of test queries
2. **Result Collection**: Retrieve results for each query
3. **Metric Calculation**: Calculate evaluation metrics
4. **Analysis**: Analyze results by category and difficulty
5. **Visualization**: Visualize results for better understanding
6. **Reporting**: Generate comprehensive evaluation reports

```python
def evaluate_search_method(search_method, test_queries, top_k=5):
    """
    Evaluate a search method
    
    Args:
        search_method: Function that takes a query and returns results
        test_queries: List of test queries
        top_k: Number of results to retrieve
        
    Returns:
        Evaluation results
    """
    results = []
    
    for test_case in test_queries:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        category = test_case.get("category", "general")
        difficulty = test_case.get("difficulty", "medium")
        
        logger.info(f"Query: {query} (Category: {category}, Difficulty: {difficulty})")
        
        # Get search results with latency measurement
        search_results, latency = measure_latency(search_method, query, top_k=top_k)
        
        # Calculate metrics
        precision = calculate_precision(search_results, expected_keywords)
        recall = calculate_recall(search_results, expected_keywords)
        f1 = calculate_f1_score(precision, recall)
        relevance_scores = calculate_relevance_scores(search_results, expected_keywords)
        ndcg = calculate_ndcg(relevance_scores)
        
        logger.info(f"  Precision: {precision:.2f}")
        logger.info(f"  Recall: {recall:.2f}")
        logger.info(f"  F1 Score: {f1:.2f}")
        logger.info(f"  NDCG: {ndcg:.2f}")
        logger.info(f"  Latency: {latency:.2f} ms")
        
        results.append({
            "query": query,
            "category": category,
            "difficulty": difficulty,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "ndcg": ndcg,
            "latency": latency,
            "result_count": len(search_results)
        })
    
    # Calculate average metrics
    avg_precision = sum(r["precision"] for r in results) / len(results)
    avg_recall = sum(r["recall"] for r in results) / len(results)
    avg_f1 = sum(r["f1"] for r in results) / len(results)
    avg_ndcg = sum(r["ndcg"] for r in results) / len(results)
    avg_latency = sum(r["latency"] for r in results) / len(results)
    
    logger.info("\nAverage Metrics:")
    logger.info(f"  Precision: {avg_precision:.2f}")
    logger.info(f"  Recall: {avg_recall:.2f}")
    logger.info(f"  F1 Score: {avg_f1:.2f}")
    logger.info(f"  NDCG: {avg_ndcg:.2f}")
    logger.info(f"  Latency: {avg_latency:.2f} ms")
    
    # Calculate metrics by category
    categories = set(r["category"] for r in results)
    category_metrics = {}
    
    for category in categories:
        category_results = [r for r in results if r["category"] == category]
        
        category_metrics[category] = {
            "precision": sum(r["precision"] for r in category_results) / len(category_results),
            "recall": sum(r["recall"] for r in category_results) / len(category_results),
            "f1": sum(r["f1"] for r in category_results) / len(category_results),
            "ndcg": sum(r["ndcg"] for r in category_results) / len(category_results),
            "latency": sum(r["latency"] for r in category_results) / len(category_results),
            "count": len(category_results)
        }
    
    # Calculate metrics by difficulty
    difficulties = set(r["difficulty"] for r in results)
    difficulty_metrics = {}
    
    for difficulty in difficulties:
        difficulty_results = [r for r in results if r["difficulty"] == difficulty]
        
        difficulty_metrics[difficulty] = {
            "precision": sum(r["precision"] for r in difficulty_results) / len(difficulty_results),
            "recall": sum(r["recall"] for r in difficulty_results) / len(difficulty_results),
            "f1": sum(r["f1"] for r in difficulty_results) / len(difficulty_results),
            "ndcg": sum(r["ndcg"] for r in difficulty_results) / len(difficulty_results),
            "latency": sum(r["latency"] for r in difficulty_results) / len(difficulty_results),
            "count": len(difficulty_results)
        }
    
    return {
        "results": results,
        "average": {
            "precision": avg_precision,
            "recall": avg_recall,
            "f1": avg_f1,
            "ndcg": avg_ndcg,
            "latency": avg_latency
        },
        "by_category": category_metrics,
        "by_difficulty": difficulty_metrics
    }
```

## Visualization

The evaluation framework includes visualization tools for better understanding of results:

```python
def visualize_results(evaluation_results, title="Search Evaluation Results"):
    """
    Visualize evaluation results
    
    Args:
        evaluation_results: Evaluation results
        title: Chart title
    """
    import matplotlib.pyplot as plt
    import numpy as np
    
    # Create figure
    fig, axs = plt.subplots(2, 2, figsize=(15, 10))
    fig.suptitle(title, fontsize=16)
    
    # Plot average metrics
    metrics = ["precision", "recall", "f1", "ndcg"]
    values = [evaluation_results["average"][m] for m in metrics]
    
    axs[0, 0].bar(metrics, values)
    axs[0, 0].set_title("Average Metrics")
    axs[0, 0].set_ylim(0, 1)
    
    # Plot metrics by category
    categories = list(evaluation_results["by_category"].keys())
    x = np.arange(len(categories))
    width = 0.2
    
    for i, metric in enumerate(metrics):
        values = [evaluation_results["by_category"][c][metric] for c in categories]
        axs[0, 1].bar(x + i*width, values, width, label=metric)
    
    axs[0, 1].set_title("Metrics by Category")
    axs[0, 1].set_xticks(x + width * 1.5)
    axs[0, 1].set_xticklabels(categories)
    axs[0, 1].legend()
    axs[0, 1].set_ylim(0, 1)
    
    # Plot metrics by difficulty
    difficulties = list(evaluation_results["by_difficulty"].keys())
    x = np.arange(len(difficulties))
    
    for i, metric in enumerate(metrics):
        values = [evaluation_results["by_difficulty"][d][metric] for d in difficulties]
        axs[1, 0].bar(x + i*width, values, width, label=metric)
    
    axs[1, 0].set_title("Metrics by Difficulty")
    axs[1, 0].set_xticks(x + width * 1.5)
    axs[1, 0].set_xticklabels(difficulties)
    axs[1, 0].legend()
    axs[1, 0].set_ylim(0, 1)
    
    # Plot latency
    categories = list(evaluation_results["by_category"].keys())
    latencies = [evaluation_results["by_category"][c]["latency"] for c in categories]
    
    axs[1, 1].bar(categories, latencies)
    axs[1, 1].set_title("Latency by Category (ms)")
    
    plt.tight_layout()
    plt.savefig("evaluation_results.png")
    plt.close()
```

## Reporting

The evaluation framework generates comprehensive reports:

```python
def generate_report(evaluation_results, output_file="evaluation_report.md"):
    """
    Generate evaluation report
    
    Args:
        evaluation_results: Evaluation results
        output_file: Output file path
    """
    with open(output_file, "w") as f:
        f.write("# Search Evaluation Report\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Average Metrics\n\n")
        f.write("| Metric | Value |\n")
        f.write("|--------|-------|\n")
        for metric, value in evaluation_results["average"].items():
            f.write(f"| {metric.capitalize()} | {value:.2f} |\n")
        
        f.write("\n## Metrics by Category\n\n")
        f.write("| Category | Precision | Recall | F1 | NDCG | Latency (ms) |\n")
        f.write("|----------|-----------|--------|----|----|-------------|\n")
        for category, metrics in evaluation_results["by_category"].items():
            f.write(f"| {category} | {metrics['precision']:.2f} | {metrics['recall']:.2f} | {metrics['f1']:.2f} | {metrics['ndcg']:.2f} | {metrics['latency']:.2f} |\n")
        
        f.write("\n## Metrics by Difficulty\n\n")
        f.write("| Difficulty | Precision | Recall | F1 | NDCG | Latency (ms) |\n")
        f.write("|------------|-----------|--------|----|----|-------------|\n")
        for difficulty, metrics in evaluation_results["by_difficulty"].items():
            f.write(f"| {difficulty} | {metrics['precision']:.2f} | {metrics['recall']:.2f} | {metrics['f1']:.2f} | {metrics['ndcg']:.2f} | {metrics['latency']:.2f} |\n")
        
        f.write("\n## Detailed Results\n\n")
        f.write("| Query | Category | Difficulty | Precision | Recall | F1 | NDCG | Latency (ms) |\n")
        f.write("|-------|----------|------------|-----------|--------|----|----|-------------|\n")
        for result in evaluation_results["results"]:
            f.write(f"| {result['query']} | {result['category']} | {result['difficulty']} | {result['precision']:.2f} | {result['recall']:.2f} | {result['f1']:.2f} | {result['ndcg']:.2f} | {result['latency']:.2f} |\n")
```

## Continuous Evaluation

The evaluation framework supports continuous evaluation:

```python
def schedule_evaluation(search_method, test_queries, interval_hours=24):
    """
    Schedule regular evaluation
    
    Args:
        search_method: Function that takes a query and returns results
        test_queries: List of test queries
        interval_hours: Evaluation interval in hours
    """
    import schedule
    
    def run_evaluation():
        logger.info(f"Running scheduled evaluation at {datetime.now()}")
        
        # Evaluate search method
        evaluation_results = evaluate_search_method(search_method, test_queries)
        
        # Generate report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"evaluation_report_{timestamp}.md"
        generate_report(evaluation_results, output_file=report_file)
        
        # Visualize results
        visualize_results(evaluation_results, title=f"Evaluation Results - {timestamp}")
        
        logger.info(f"Evaluation completed. Report saved to {report_file}")
    
    # Schedule evaluation
    schedule.every(interval_hours).hours.do(run_evaluation)
    
    # Run initial evaluation
    run_evaluation()
    
    # Keep running
    while True:
        schedule.run_pending()
        time.sleep(60)
```

## Future Enhancements

Planned enhancements for the evaluation framework:

1. **User Feedback Integration**: Incorporate user feedback into evaluation
2. **A/B Testing**: Compare different search implementations
3. **Query Diversity Analysis**: Analyze query diversity and coverage
4. **Failure Analysis**: Identify and analyze failed queries
5. **Automated Improvement Suggestions**: Generate suggestions for improvement
