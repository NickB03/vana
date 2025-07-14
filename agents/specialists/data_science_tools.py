"""
Data Science Specialist Tools - ADK Aligned Implementation

Simple, synchronous tools for data analysis without external dependencies.
Uses only Python standard library and basic statistics.
"""

import csv
import json
import math
import re
import statistics
from pathlib import Path
from typing import Any, Dict, List, Union

# Import Redis caching
from lib._shared_libraries.redis_cache_service import redis_cache


@redis_cache(namespace="data_science", ttl=3600)
def analyze_data_simple(data_json: str, analysis_type: str) -> str:
    """
    Perform basic data analysis without external dependencies.

    Args:
        data_json: JSON string containing data to analyze
        analysis_type: Type of analysis (descriptive, correlation, distribution)

    Returns:
        Formatted analysis results
    """
    try:
        # Parse data
        if isinstance(data_json, str):
            # Try to parse as JSON
            try:
                data = json.loads(data_json)
            except:
                # Try to parse as simple list of numbers
                data = [float(x) for x in data_json.strip("[]").split(",") if x.strip()]
        else:
            data = data_json

        if analysis_type == "descriptive":
            # Handle list of numbers
            if isinstance(data, list) and all(isinstance(x, (int, float)) for x in data):
                if len(data) == 0:
                    return "No data to analyze"

                std_dev = statistics.stdev(data) if len(data) > 1 else 0

                return f"""## Descriptive Statistics
- Count: {len(data)}
- Mean: {statistics.mean(data):.2f}
- Median: {statistics.median(data):.2f}
- Std Dev: {std_dev:.2f}
- Min: {min(data)}
- Max: {max(data)}
- Range: {max(data) - min(data)}"""

            # Handle list of dicts (like CSV data)
            elif isinstance(data, list) and all(isinstance(x, dict) for x in data):
                if len(data) == 0:
                    return "No records to analyze"

                summary = f"## Data Summary\n- Records: {len(data)}\n"

                if data:
                    fields = list(data[0].keys())
                    summary += f"- Fields: {', '.join(fields)}\n\n"

                    # Analyze numeric fields
                    for key in fields:
                        values = []
                        for row in data:
                            try:
                                val = float(row.get(key, 0))
                                values.append(val)
                            except (ValueError, TypeError):
                                continue

                        if values:
                            summary += f"### {key}\n"
                            summary += f"- Count: {len(values)}\n"
                            summary += f"- Mean: {statistics.mean(values):.2f}\n"
                            summary += f"- Min: {min(values)}\n"
                            summary += f"- Max: {max(values)}\n\n"

                return summary

        elif analysis_type == "correlation":
            # Simple correlation for 2 numeric lists
            if isinstance(data, dict) and len(data) == 2:
                keys = list(data.keys())
                x = data[keys[0]]
                y = data[keys[1]]

                if len(x) == len(y) and len(x) > 1:
                    # Pearson correlation coefficient
                    n = len(x)
                    sum_x = sum(x)
                    sum_y = sum(y)
                    sum_xy = sum(x[i] * y[i] for i in range(n))
                    sum_x2 = sum(x[i] ** 2 for i in range(n))
                    sum_y2 = sum(y[i] ** 2 for i in range(n))

                    num = n * sum_xy - sum_x * sum_y
                    den = ((n * sum_x2 - sum_x**2) * (n * sum_y2 - sum_y**2)) ** 0.5

                    if den != 0:
                        r = num / den
                        return f"""## Correlation Analysis
- Variables: {keys[0]} vs {keys[1]}
- Correlation coefficient: {r:.3f}
- Interpretation: {'Strong' if abs(r) > 0.7 else 'Moderate' if abs(r) > 0.3 else 'Weak'} {'positive' if r > 0 else 'negative'} correlation"""
                    else:
                        return "Cannot calculate correlation - no variance in data"
                else:
                    return "Correlation requires two arrays of equal length"

        elif analysis_type == "distribution":
            # Basic distribution analysis
            if isinstance(data, list) and all(isinstance(x, (int, float)) for x in data):
                if len(data) < 2:
                    return "Need at least 2 data points for distribution analysis"

                mean = statistics.mean(data)
                median = statistics.median(data)
                std_dev = statistics.stdev(data)

                # Simple skewness approximation
                skewness = 3 * (mean - median) / std_dev if std_dev != 0 else 0

                # Count values in quartiles
                sorted_data = sorted(data)
                q1 = sorted_data[len(sorted_data) // 4]
                q3 = sorted_data[3 * len(sorted_data) // 4]
                iqr = q3 - q1

                return f"""## Distribution Analysis
- Mean: {mean:.2f}
- Median: {median:.2f}
- Std Dev: {std_dev:.2f}
- Skewness (approx): {skewness:.2f}
- Q1 (25th percentile): {q1:.2f}
- Q3 (75th percentile): {q3:.2f}
- IQR: {iqr:.2f}
- Distribution shape: {'Normal' if abs(skewness) < 0.5 else 'Skewed ' + ('right' if skewness > 0 else 'left')}"""

        return f"Analysis type '{analysis_type}' not supported or data format not recognized"

    except Exception as e:
        return f"Error analyzing data: {str(e)}"


def generate_data_insights(data_summary: str) -> str:
    """
    Generate insights from data analysis results.

    Args:
        data_summary: Previous analysis summary text

    Returns:
        Actionable insights based on the analysis
    """
    insights = ["## Data Insights\n"]

    # Parse the summary for key information
    if "Mean:" in data_summary and "Median:" in data_summary:
        insights.append("- Central tendency metrics calculated successfully")

        # Extract mean and median values if possible
        try:
            mean_match = re.search(r"Mean:\s*([\d.-]+)", data_summary)
            median_match = re.search(r"Median:\s*([\d.-]+)", data_summary)
            if mean_match and median_match:
                mean = float(mean_match.group(1))
                median = float(median_match.group(1))
                if abs(mean - median) > 0.1 * max(abs(mean), abs(median)):
                    insights.append("- Significant difference between mean and median suggests skewed distribution")
        except:
            pass

    if "correlation" in data_summary.lower():
        if "Strong positive" in data_summary:
            insights.append("- Strong positive relationship detected - consider predictive modeling")
            insights.append("- Variables move together in the same direction")
        elif "Strong negative" in data_summary:
            insights.append("- Strong inverse relationship found - investigate causation")
            insights.append("- Variables move in opposite directions")
        elif "Weak" in data_summary:
            insights.append("- Weak correlation - variables appear independent")

    if "Records:" in data_summary:
        insights.append("- Dataset structure analyzed - consider data quality checks")

    if "Skewed" in data_summary:
        if "right" in data_summary:
            insights.append("- Right-skewed distribution - consider log transformation")
            insights.append("- May have outliers on the high end")
        elif "left" in data_summary:
            insights.append("- Left-skewed distribution - check for floor effects")

    if "Std Dev:" in data_summary:
        try:
            std_match = re.search(r"Std Dev:\s*([\d.-]+)", data_summary)
            if std_match:
                std = float(std_match.group(1))
                if std == 0:
                    insights.append("- Zero variance detected - all values may be identical")
        except:
            pass

    # Add recommendations
    insights.append("\n### Recommendations")
    insights.append("- Visualize distributions to identify outliers")
    insights.append("- Check for missing values before modeling")
    insights.append("- Consider feature engineering based on correlations")
    insights.append("- Validate assumptions before statistical testing")

    return "\n".join(insights)


def clean_data_basic(data_json: str, operations: str) -> str:
    """
    Perform basic data cleaning operations.

    Args:
        data_json: JSON string containing data to clean
        operations: Type of cleaning (basic, missing_values, outliers, duplicates)

    Returns:
        Cleaning report with statistics
    """
    try:
        # Parse data
        if isinstance(data_json, str):
            data = json.loads(data_json)
        else:
            data = data_json

        original_count = len(data) if isinstance(data, list) else 0

        if operations == "missing_values":
            if isinstance(data, list) and all(isinstance(x, dict) for x in data):
                # Count missing values
                missing_counts = {}
                for record in data:
                    for key, value in record.items():
                        if value is None or value == "" or (isinstance(value, float) and math.isnan(value)):
                            missing_counts[key] = missing_counts.get(key, 0) + 1

                # Clean missing values
                cleaned_data = []
                for record in data:
                    cleaned_record = {}
                    for key, value in record.items():
                        if value is None or value == "":
                            # Fill with appropriate default
                            if key in missing_counts:
                                # Use mode or median logic here
                                cleaned_record[key] = "Unknown" if isinstance(value, str) else 0
                        else:
                            cleaned_record[key] = value
                    cleaned_data.append(cleaned_record)

                report = f"""## Missing Values Analysis
- Original records: {original_count}
- Fields with missing values: {len(missing_counts)}

### Missing Value Counts:
"""
                for field, count in missing_counts.items():
                    percentage = (count / original_count * 100) if original_count > 0 else 0
                    report += f"- {field}: {count} ({percentage:.1f}%)\n"

                report += "\n✅ Missing values have been filled with defaults"
                return report

        elif operations == "outliers":
            if isinstance(data, list) and all(isinstance(x, (int, float)) for x in data):
                if len(data) < 4:
                    return "Need at least 4 data points for outlier detection"

                sorted_data = sorted(data)
                q1 = sorted_data[len(sorted_data) // 4]
                q3 = sorted_data[3 * len(sorted_data) // 4]
                iqr = q3 - q1

                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr

                outliers = [x for x in data if x < lower_bound or x > upper_bound]
                outlier_percentage = (len(outliers) / len(data) * 100) if data else 0

                return f"""## Outlier Detection
- Total values: {len(data)}
- Q1: {q1:.2f}
- Q3: {q3:.2f}
- IQR: {iqr:.2f}
- Lower bound: {lower_bound:.2f}
- Upper bound: {upper_bound:.2f}
- Outliers detected: {len(outliers)} ({outlier_percentage:.1f}%)

### Outlier Values:
{', '.join(f"{x:.2f}" for x in outliers[:10])}{'...' if len(outliers) > 10 else ''}

💡 Consider removing or transforming outliers based on domain knowledge"""

        elif operations == "duplicates":
            if isinstance(data, list):
                # For list of dicts, check for duplicate records
                if all(isinstance(x, dict) for x in data):
                    unique_data = []
                    seen = set()
                    duplicates = 0

                    for record in data:
                        # Create a hashable representation
                        record_tuple = tuple(sorted(record.items()))
                        if record_tuple not in seen:
                            seen.add(record_tuple)
                            unique_data.append(record)
                        else:
                            duplicates += 1

                    return f"""## Duplicate Detection
- Original records: {original_count}
- Unique records: {len(unique_data)}
- Duplicates removed: {duplicates}
- Reduction: {(duplicates / original_count * 100):.1f}% if {original_count > 0} else 0%

✅ Duplicate records have been identified"""

        else:  # basic cleaning
            return f"""## Basic Data Cleaning
- Data type: {type(data).__name__}
- Record count: {original_count if isinstance(data, list) else 'N/A'}

### Available Operations:
- missing_values: Handle null/empty values
- outliers: Detect statistical outliers
- duplicates: Find duplicate records

💡 Specify operation type for targeted cleaning"""

    except Exception as e:
        return f"Error cleaning data: {str(e)}"


def create_data_summary(data_json: str) -> str:
    """
    Create a comprehensive summary of the dataset.

    Args:
        data_json: JSON string containing data

    Returns:
        Formatted data summary
    """
    try:
        # Parse data
        if isinstance(data_json, str):
            data = json.loads(data_json)
        else:
            data = data_json

        summary = "## Dataset Summary\n\n"

        # Determine data structure
        if isinstance(data, list):
            summary += f"**Type**: List of {type(data[0]).__name__ if data else 'empty'}\n"
            summary += f"**Length**: {len(data)} items\n\n"

            if data and isinstance(data[0], dict):
                # Tabular data
                fields = list(data[0].keys())
                summary += f"**Fields**: {len(fields)}\n"
                summary += f"**Field Names**: {', '.join(fields)}\n\n"

                # Analyze field types
                summary += "### Field Analysis:\n"
                for field in fields:
                    values = [row.get(field) for row in data if field in row]
                    types = set(type(v).__name__ for v in values if v is not None)
                    null_count = sum(1 for v in values if v is None or v == "")

                    summary += f"- **{field}**:\n"
                    summary += f"  - Types: {', '.join(types)}\n"
                    summary += f"  - Non-null: {len(values) - null_count}/{len(data)}\n"

                    # For numeric fields, add range
                    numeric_values = []
                    for v in values:
                        try:
                            numeric_values.append(float(v))
                        except:
                            pass

                    if numeric_values:
                        summary += f"  - Range: [{min(numeric_values):.2f}, {max(numeric_values):.2f}]\n"

                    summary += "\n"

            elif data and isinstance(data[0], (int, float)):
                # Numeric array
                summary += "### Numeric Array Statistics:\n"
                summary += f"- Min: {min(data):.2f}\n"
                summary += f"- Max: {max(data):.2f}\n"
                summary += f"- Mean: {statistics.mean(data):.2f}\n"
                summary += f"- Median: {statistics.median(data):.2f}\n"

        elif isinstance(data, dict):
            summary += f"**Type**: Dictionary\n"
            summary += f"**Keys**: {len(data)}\n"
            summary += f"**Key Names**: {', '.join(data.keys())}\n\n"

            # Analyze values
            summary += "### Value Analysis:\n"
            for key, value in data.items():
                summary += f"- **{key}**: {type(value).__name__}"
                if isinstance(value, list):
                    summary += f" (length: {len(value)})"
                elif isinstance(value, dict):
                    summary += f" (keys: {len(value)})"
                summary += "\n"

        else:
            summary += f"**Type**: {type(data).__name__}\n"
            summary += "**Structure**: Single value or unsupported type\n"

        return summary

    except Exception as e:
        return f"Error creating summary: {str(e)}"
