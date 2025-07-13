# Data Science Specialist Documentation

**Status**: Phase 3 Complete ✅  
**Model**: Gemini 2.5 Flash  
**Tools**: 6 (Pure Python analytics tools)  
**Special**: No external dependencies (pandas/numpy free)  
**Location**: `agents/specialists/data_science_specialist.py`

## Overview

The Data Science Specialist is a domain expert focused on statistical analysis, data processing, and insights generation using only Python's standard library. It provides data analysis capabilities without requiring heavy dependencies like pandas or numpy.

## Capabilities

- **Statistical Analysis**: Descriptive stats, correlations, distributions
- **Data Insights**: Pattern recognition and recommendations
- **Data Cleaning**: Missing values, outliers, duplicates
- **Data Summarization**: Comprehensive dataset overviews
- **Pure Python**: No external dependencies required
- **Fast Analysis**: Optimized for small to medium datasets

## Tools

1. `analyze_data_simple` - Statistical analysis (descriptive, correlation, distribution)
2. `generate_data_insights` - Extract actionable insights
3. `clean_data_basic` - Data preprocessing and cleaning
4. `create_data_summary` - Dataset summarization
5. Reserved for future ML tools
6. Reserved for future visualization tools

See [Data Science Tools API](../tools/data-science-tools.md) for detailed tool documentation.

## Agent Configuration

```python
data_science_specialist = LlmAgent(
    model="gemini-2.5-flash",
    tools=[
        analyze_data_simple,
        generate_data_insights,
        clean_data_basic,
        create_data_summary,
        # Future: predict_simple, visualize_basic
    ],
    instruction="""You are a data science expert specializing in statistical analysis..."""
)
```

## Usage Examples

### Basic Statistics
```python
response = orchestrator.route_request(
    "Analyze this sales data: [100, 150, 120, 180, 140]"
)
```

### Data Cleaning
```python
response = orchestrator.route_request(
    "Clean this dataset and identify missing values and outliers"
)
```

### Correlation Analysis
```python
response = orchestrator.route_request(
    "Find correlation between temperature and ice cream sales"
)
```

## Routing Keywords

The orchestrator routes to Data Science Specialist for:
- analyze, analysis, statistics, statistical, stats
- data, dataset, correlation, distribution, mean, median
- clean, cleaning, outliers, missing, duplicates
- insights, patterns, trends, summary, summarize

## Supported Data Formats

### Numeric Arrays
```python
# Simple list
[1, 2, 3, 4, 5]

# JSON string
"[1, 2, 3, 4, 5]"
```

### Tabular Data
```python
# List of dictionaries
[
    {"name": "A", "value": 10},
    {"name": "B", "value": 20}
]
```

### Paired Data
```python
# For correlation analysis
{
    "x": [1, 2, 3, 4],
    "y": [2, 4, 6, 8]
}
```

### Time Series
```python
[
    {"date": "2024-01-01", "value": 100},
    {"date": "2024-01-02", "value": 105}
]
```

## Performance Characteristics

- **Response Time**: 50-200ms (fastest specialist)
- **Dataset Size**: Optimal for <10,000 rows
- **Memory Efficient**: No large arrays
- **Pure Python**: No compilation needed

## Analysis Types

### Descriptive Statistics
- Count, Mean, Median
- Standard Deviation
- Min, Max, Range
- Quartiles

### Correlation Analysis
- Pearson correlation coefficient
- Relationship strength
- Positive/negative correlation
- Linear relationships only

### Distribution Analysis
- Skewness detection
- Quartile analysis
- IQR calculation
- Outlier identification

### Data Quality
- Missing value detection
- Duplicate identification
- Outlier detection (IQR method)
- Data type validation

## Best Practices

1. **Start Simple**: Use descriptive stats first
2. **Clean First**: Remove outliers before correlation
3. **Check Format**: Ensure proper data structure
4. **Small Datasets**: Best for <10K rows
5. **Combine Analyses**: Use multiple tools together
6. **Track Changes**: Monitor data quality metrics

## Integration with Other Specialists

### With Architecture Specialist
```python
"Analyze code complexity metrics across all modules"
```

### With Security Specialist
```python
"Analyze security vulnerability trends over time"
```

### With DevOps Specialist
```python
"Analyze deployment performance metrics"
```

## Common Use Cases

1. **A/B Testing**: Compare metrics between groups
2. **Performance Analysis**: System metrics over time
3. **Quality Metrics**: Code quality trends
4. **User Analytics**: Behavior pattern analysis
5. **Business Intelligence**: Sales/revenue analysis

## Insights Generation

The specialist provides:
- **Pattern Detection**: Identifies trends
- **Anomaly Detection**: Finds outliers
- **Recommendations**: Actionable next steps
- **Interpretations**: Plain English explanations
- **Warnings**: Data quality issues

Example insights:
```
- Significant positive correlation detected (r=0.85)
- Right-skewed distribution suggests outliers
- 15% missing values in 'age' field
- Recommend log transformation for normalization
```

## Limitations

### No Advanced ML
- No predictive modeling
- No clustering algorithms
- No neural networks
- No time series forecasting

### No Visualization
- Text-based outputs only
- No charts or graphs
- No interactive plots

### Pure Python Constraints
- Slower than numpy for large data
- Limited mathematical functions
- No matrix operations
- Basic statistics only

## Error Handling

Data science tools handle errors gracefully:
- Empty data: "No data to analyze"
- Invalid format: "Error: Invalid JSON format"
- Non-numeric: "Cannot calculate statistics"
- Type mismatch: "Incompatible data types"

## Data Privacy

- All analysis is performed in-memory
- No data persistence
- No external API calls
- Secure processing

## Comparison with Full Stack

| Feature | VANA DS | Pandas/Sklearn |
|---------|---------|----------------|
| Dependencies | None | Many |
| Speed (<1K rows) | Fast | Fast |
| Speed (>10K rows) | Slow | Fast |
| Memory | Low | High |
| Features | Basic | Advanced |
| Learning Curve | Easy | Steep |

## Future Enhancements

Planned additions (Phase 5):
- Simple prediction models
- Basic visualization
- Time series analysis
- Clustering algorithms
- Feature engineering

## Tips for Best Results

1. **Format data properly**: Use standard structures
2. **Keep datasets small**: <10K rows optimal
3. **Use appropriate analysis**: Match type to data
4. **Combine with insights**: Always generate insights
5. **Validate results**: Cross-check important findings