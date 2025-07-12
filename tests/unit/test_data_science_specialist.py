"""
Unit tests for Data Science Specialist
Tests data analysis and ML recommendation tools
"""

import json

import pytest

from agents.specialists.data_science_tools import (
    analyze_data_simple,
    explain_statistical_concept,
    recommend_ml_approach,
    suggest_visualization,
)


class TestDataScienceTools:
    """Test suite for data science analysis tools"""

    def test_analyze_data_simple_basic_stats(self):
        """Test basic statistical analysis"""
        data = {"values": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
        result = analyze_data_simple(json.dumps(data), "descriptive")

        assert "Data Analysis Results" in result
        assert "Count: 10" in result
        assert "Mean: 5.5" in result
        assert "Median: 5.5" in result
        assert "Min: 1" in result
        assert "Max: 10" in result

    def test_analyze_data_simple_correlation(self):
        """Test correlation analysis"""
        data = {"x": [1, 2, 3, 4, 5], "y": [2, 4, 6, 8, 10]}  # Perfect correlation
        result = analyze_data_simple(json.dumps(data), "correlation")

        assert "Correlation Analysis" in result
        assert "correlation: 1.0" in result  # Perfect positive correlation

    def test_analyze_data_simple_timeseries(self):
        """Test time series analysis"""
        data = {"dates": ["2024-01-01", "2024-01-02", "2024-01-03"], "values": [100, 110, 120]}
        result = analyze_data_simple(json.dumps(data), "timeseries")

        assert "Time Series Analysis" in result
        assert "Data points: 3" in result
        assert "Trend" in result

    def test_analyze_data_simple_error_handling(self):
        """Test error handling for invalid data"""
        result = analyze_data_simple("invalid json", "descriptive")
        assert "Error" in result

        result = analyze_data_simple(json.dumps({}), "descriptive")
        assert "Error" in result or "No data" in result

    def test_recommend_ml_approach_classification(self):
        """Test ML recommendations for classification"""
        problem = {"type": "classification", "features": 10, "samples": 1000, "classes": 3}
        result = recommend_ml_approach(json.dumps(problem))

        assert "ML Approach Recommendation" in result
        assert "Classification Problem" in result
        assert any(model in result for model in ["Random Forest", "SVM", "Neural Network", "Logistic Regression"])

    def test_recommend_ml_approach_regression(self):
        """Test ML recommendations for regression"""
        problem = {"type": "regression", "features": 5, "samples": 500, "target": "continuous"}
        result = recommend_ml_approach(json.dumps(problem))

        assert "Regression Problem" in result
        assert any(model in result for model in ["Linear Regression", "Random Forest", "Neural Network"])

    def test_recommend_ml_approach_clustering(self):
        """Test ML recommendations for clustering"""
        problem = {"type": "clustering", "features": 20, "samples": 5000}
        result = recommend_ml_approach(json.dumps(problem))

        assert "Clustering Problem" in result
        assert any(model in result for model in ["K-Means", "DBSCAN", "Hierarchical"])

    def test_recommend_ml_approach_small_dataset(self):
        """Test recommendations for small datasets"""
        problem = {"type": "classification", "features": 50, "samples": 50, "classes": 2}  # Small dataset
        result = recommend_ml_approach(json.dumps(problem))

        assert "small dataset" in result.lower()
        assert "overfitting" in result.lower() or "regularization" in result.lower()

    def test_explain_statistical_concept_mean(self):
        """Test explanation of mean"""
        result = explain_statistical_concept("mean")

        assert "Mean" in result
        assert "average" in result.lower()
        assert "Example:" in result

    def test_explain_statistical_concept_correlation(self):
        """Test explanation of correlation"""
        result = explain_statistical_concept("correlation")

        assert "Correlation" in result
        assert "relationship" in result.lower()
        assert any(term in result.lower() for term in ["positive", "negative", "strength"])

    def test_explain_statistical_concept_p_value(self):
        """Test explanation of p-value"""
        result = explain_statistical_concept("p-value")

        assert "P-value" in result or "p-value" in result
        assert "probability" in result.lower()
        assert "null hypothesis" in result.lower()

    def test_explain_statistical_concept_unknown(self):
        """Test handling of unknown concepts"""
        result = explain_statistical_concept("unknown_concept_xyz")

        assert "not available" in result or "don't have" in result
        assert "mean" in result  # Should list available concepts

    def test_suggest_visualization_distribution(self):
        """Test visualization suggestions for distributions"""
        data_desc = {"type": "distribution", "variables": ["age"], "samples": 1000}
        result = suggest_visualization(json.dumps(data_desc))

        assert "Visualization Recommendations" in result
        assert any(viz in result for viz in ["Histogram", "Box plot", "Density"])

    def test_suggest_visualization_comparison(self):
        """Test visualization suggestions for comparisons"""
        data_desc = {"type": "comparison", "groups": 5, "metric": "sales"}
        result = suggest_visualization(json.dumps(data_desc))

        assert any(viz in result for viz in ["Bar chart", "Column chart"])

    def test_suggest_visualization_timeseries(self):
        """Test visualization suggestions for time series"""
        data_desc = {"type": "timeseries", "duration": "1 year", "frequency": "daily"}
        result = suggest_visualization(json.dumps(data_desc))

        assert "Line chart" in result
        assert "time" in result.lower()

    def test_suggest_visualization_correlation_matrix(self):
        """Test visualization for multiple correlations"""
        data_desc = {"type": "correlation", "variables": 10}
        result = suggest_visualization(json.dumps(data_desc))

        assert "Heatmap" in result or "heat map" in result.lower()
        assert "correlation matrix" in result.lower()


class TestDataScienceEdgeCases:
    """Test edge cases and error conditions"""

    def test_analyze_empty_dataset(self):
        """Test analysis of empty data"""
        data = {"values": []}
        result = analyze_data_simple(json.dumps(data), "descriptive")

        assert "Error" in result or "empty" in result.lower()

    def test_analyze_single_value(self):
        """Test analysis with single data point"""
        data = {"values": [42]}
        result = analyze_data_simple(json.dumps(data), "descriptive")

        # Should handle gracefully
        assert "Count: 1" in result
        assert "42" in result

    def test_correlation_mismatched_lengths(self):
        """Test correlation with mismatched array lengths"""
        data = {"x": [1, 2, 3], "y": [4, 5]}  # Different length
        result = analyze_data_simple(json.dumps(data), "correlation")

        assert "Error" in result or "length" in result.lower()

    def test_ml_recommendation_missing_fields(self):
        """Test ML recommendations with missing required fields"""
        problem = {"type": "classification"}  # Missing other fields
        result = recommend_ml_approach(json.dumps(problem))

        # Should provide generic recommendations
        assert "ML Approach" in result
        assert "Classification" in result

    def test_extreme_values_handling(self):
        """Test handling of extreme values"""
        data = {"values": [1, 2, 3, 1000000]}  # Outlier
        result = analyze_data_simple(json.dumps(data), "descriptive")

        assert "Mean:" in result
        assert "Note:" in result or "outlier" in result.lower()

    def test_nan_handling(self):
        """Test handling of null/undefined values"""
        data = {"values": [1, 2, None, 4, 5]}
        result = analyze_data_simple(json.dumps(data), "descriptive")

        # Should filter out None values
        assert "Count: 4" in result  # Only valid values
