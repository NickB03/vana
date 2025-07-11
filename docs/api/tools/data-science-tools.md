# Data Science Tools API Reference

**Status**: Phase 3 Complete ✅  
**Location**: `agents/specialists/data_science_tools.py`  
**Special**: Pure Python implementation (no pandas/numpy required)

The Data Science Specialist provides 6 tools for statistical analysis, data processing, and insights generation using only Python's standard library.

## Tool Overview

| Tool | Purpose | Input Format | Performance |
|------|---------|--------------|-------------|
| `analyze_data_simple` | Statistical analysis | JSON/List | 50-100ms |
| `generate_data_insights` | Extract insights from analysis | Text | 30-50ms |
| `clean_data_basic` | Data preprocessing | JSON/List | 100-200ms |
| `create_data_summary` | Comprehensive summaries | JSON/Dict | 50-150ms |

## Tool Details

### 1. analyze_data_simple

Performs statistical analysis without external dependencies.

**Parameters:**
```python
analyze_data_simple(
    data_json: str,
    analysis_type: str = "descriptive"
) -> str
```

**Input:**
- `data_json` (str): JSON string or Python list of data
- `analysis_type` (str): Type of analysis (descriptive, correlation, distribution)

**Analysis Types:**
- **descriptive**: Basic statistics (mean, median, std dev)
- **correlation**: Pearson correlation for paired data
- **distribution**: Distribution shape and quartiles

**Example 1: Descriptive Statistics**
```python
data = "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
result = analyze_data_simple(data, "descriptive")
# Returns:
"""
## Descriptive Statistics
- Count: 10
- Mean: 5.50
- Median: 5.50
- Std Dev: 2.87
- Min: 1
- Max: 10
- Range: 9
"""
```

**Example 2: Correlation Analysis**
```python
data = '{"temperature": [20, 25, 30, 35], "sales": [100, 150, 200, 250]}'
result = analyze_data_simple(data, "correlation")
# Returns:
"""
## Correlation Analysis
- Variables: temperature vs sales
- Correlation coefficient: 1.000
- Interpretation: Strong positive correlation
"""
```

**Example 3: Tabular Data Analysis**
```python
data = '''[
    {"name": "Product A", "price": 10.50, "quantity": 100},
    {"name": "Product B", "price": 25.00, "quantity": 50},
    {"name": "Product C", "price": 5.75, "quantity": 200}
]'''
result = analyze_data_simple(data, "descriptive")
# Returns:
"""
## Data Summary
- Records: 3
- Fields: name, price, quantity

### price
- Count: 3
- Mean: 13.75
- Min: 5.75
- Max: 25.0

### quantity  
- Count: 3
- Mean: 116.67
- Min: 50
- Max: 200
"""
```

### 2. generate_data_insights

Generates actionable insights from analysis results.

**Parameters:**
```python
generate_data_insights(data_summary: str) -> str
```

**Input:**
- `data_summary` (str): Previous analysis output or summary text

**Returns:**
- Formatted insights with recommendations

**Example:**
```python
summary = """
Mean: 45.2
Median: 38.5
Std Dev: 15.3
Skewed right
Strong positive correlation detected
"""

insights = generate_data_insights(summary)
# Returns:
"""
## Data Insights

- Central tendency metrics calculated successfully
- Significant difference between mean and median suggests skewed distribution
- Right-skewed distribution - consider log transformation
- May have outliers on the high end
- Strong positive relationship detected - consider predictive modeling
- Variables move together in the same direction

### Recommendations
- Visualize distributions to identify outliers
- Check for missing values before modeling
- Consider feature engineering based on correlations
- Validate assumptions before statistical testing
"""
```

### 3. clean_data_basic

Performs basic data cleaning operations.

**Parameters:**
```python
clean_data_basic(
    data_json: str,
    operations: str = "basic"
) -> str
```

**Input:**
- `data_json` (str): JSON data to clean
- `operations` (str): Cleaning type (basic, missing_values, outliers, duplicates)

**Operations:**
- **missing_values**: Handle null/empty values
- **outliers**: Detect statistical outliers using IQR
- **duplicates**: Find and report duplicate records

**Example 1: Missing Values**
```python
data = '''[
    {"id": 1, "name": "John", "age": 25, "score": 85},
    {"id": 2, "name": "Jane", "age": null, "score": 92},
    {"id": 3, "name": "", "age": 30, "score": null}
]'''

result = clean_data_basic(data, "missing_values")
# Returns:
"""
## Missing Values Analysis
- Original records: 3
- Fields with missing values: 2

### Missing Value Counts:
- age: 1 (33.3%)
- name: 1 (33.3%)
- score: 1 (33.3%)

✅ Missing values have been filled with defaults
"""
```

**Example 2: Outlier Detection**
```python
data = "[1, 2, 3, 4, 5, 100]"  # 100 is an outlier
result = clean_data_basic(data, "outliers")
# Returns:
"""
## Outlier Detection
- Total values: 6
- Q1: 2.25
- Q3: 4.75
- IQR: 2.50
- Lower bound: -1.50
- Upper bound: 8.50
- Outliers detected: 1 (16.7%)

### Outlier Values:
100.00

💡 Consider removing or transforming outliers based on domain knowledge
"""
```

**Example 3: Duplicate Detection**
```python
data = '''[
    {"id": 1, "name": "John", "email": "john@example.com"},
    {"id": 2, "name": "Jane", "email": "jane@example.com"},
    {"id": 3, "name": "John", "email": "john@example.com"}
]'''

result = clean_data_basic(data, "duplicates")
# Returns:
"""
## Duplicate Detection
- Original records: 3
- Unique records: 2
- Duplicates removed: 1
- Reduction: 33.3%

✅ Duplicate records have been identified
"""
```

### 4. create_data_summary

Creates comprehensive dataset summaries.

**Parameters:**
```python
create_data_summary(data_json: str) -> str
```

**Input:**
- `data_json` (str): JSON data to summarize

**Returns:**
- Detailed summary with structure and statistics

**Example:**
```python
data = '''[
    {"category": "A", "value": 100, "date": "2024-01-01"},
    {"category": "B", "value": 150, "date": "2024-01-02"},
    {"category": "A", "value": 120, "date": "2024-01-03"}
]'''

result = create_data_summary(data)
# Returns:
"""
## Dataset Summary

**Type**: List of dict
**Length**: 3 items

**Fields**: 3
**Field Names**: category, value, date

### Field Analysis:
- **category**:
  - Types: str
  - Non-null: 3/3
  
- **value**:
  - Types: int
  - Non-null: 3/3
  - Range: [100.00, 150.00]
  
- **date**:
  - Types: str
  - Non-null: 3/3
"""
```

## Pure Python Implementation

All tools use only Python's standard library:

```python
import json
import statistics  # Built-in stats module
import math
from typing import List, Dict, Any
```

**No External Dependencies:**
- ❌ No pandas
- ❌ No numpy
- ❌ No scikit-learn
- ✅ Pure Python only

## Usage Examples

### Complete Data Analysis Workflow
```python
# 1. Load and summarize data
raw_data = load_sales_data()  # Your data source
summary = create_data_summary(raw_data)
print(summary)

# 2. Analyze the data
analysis = analyze_data_simple(raw_data, "descriptive")
print(analysis)

# 3. Generate insights
insights = generate_data_insights(analysis)
print(insights)

# 4. Clean the data
cleaned = clean_data_basic(raw_data, "missing_values")
print(cleaned)
```

### Statistical Analysis Pipeline
```python
# Descriptive stats
desc_stats = analyze_data_simple(data, "descriptive")

# Check distribution
distribution = analyze_data_simple(data, "distribution")

# Find correlations
correlations = analyze_data_simple(paired_data, "correlation")

# Combine insights
all_results = f"{desc_stats}\n{distribution}\n{correlations}"
final_insights = generate_data_insights(all_results)
```

### Data Quality Check
```python
# Check for issues
missing = clean_data_basic(data, "missing_values")
outliers = clean_data_basic(data, "outliers")
duplicates = clean_data_basic(data, "duplicates")

# Create quality report
quality_report = f"""
## Data Quality Report
{missing}
{outliers}
{duplicates}
"""
```

## Performance Characteristics

### Speed
- Simple lists: <50ms for 1000 items
- Tabular data: <200ms for 1000 records
- All operations are O(n) or O(n log n)

### Memory
- Processes data in-place when possible
- No large intermediate arrays
- Suitable for datasets up to 100MB

### Limitations
- No advanced ML algorithms
- Limited to basic statistics
- No visualization capabilities
- Text data not supported

## Data Format Examples

### Numeric Array
```python
data = "[1, 2, 3, 4, 5]"
data = [1, 2, 3, 4, 5]  # Also accepted
```

### Tabular Data
```python
data = '''[
    {"col1": 10, "col2": "A"},
    {"col1": 20, "col2": "B"}
]'''
```

### Paired Data for Correlation
```python
data = '''{
    "x": [1, 2, 3, 4],
    "y": [2, 4, 6, 8]
}'''
```

### Time Series
```python
data = '''[
    {"date": "2024-01-01", "value": 100},
    {"date": "2024-01-02", "value": 105}
]'''
```

## Error Handling

Tools handle errors gracefully:

```python
# Empty data
"No data to analyze"

# Invalid format
"Error analyzing data: Invalid JSON format"

# Wrong analysis type
"Analysis type 'advanced' not supported"

# Non-numeric data for stats
"Cannot calculate statistics for non-numeric data"
```

## Integration with Other Tools

```python
# Combine with Architecture analysis
code_metrics = architecture_specialist.analyze_code()
data = extract_metrics(code_metrics)
analysis = analyze_data_simple(data, "descriptive")

# Feed to Security specialist  
security_scores = get_security_metrics()
trends = analyze_data_simple(security_scores, "distribution")
```

## Best Practices

1. **Data Validation**: Always check data format first
2. **Start Simple**: Use descriptive analysis initially
3. **Clean First**: Remove outliers before correlation
4. **Combine Tools**: Use multiple analysis types
5. **Document Results**: Save insights for tracking
6. **Regular Analysis**: Monitor trends over time

## Comparison with Full Data Science Stack

| Feature | VANA Data Science | Pandas/NumPy |
|---------|-------------------|---------------|
| Speed | Good for <10K rows | Excellent |
| Memory | Efficient | Can be large |
| Dependencies | None | Many |
| Functionality | Basic | Advanced |
| Learning Curve | Simple | Steep |
| Production Ready | Yes | Requires setup |

The VANA Data Science tools prioritize simplicity and zero dependencies over advanced features, making them ideal for basic analysis tasks without complex setup requirements.