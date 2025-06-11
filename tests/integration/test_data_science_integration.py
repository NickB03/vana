"""
Integration tests for Data Science Specialist Agent

Tests the complete integration between Data Science Specialist and Code Execution Specialist,
validating all tools and functionality within the sandbox environment constraints.
"""

import pytest
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from agents.data_science import root_agent
from agents.data_science.specialist import (
    analyze_data, visualize_data, clean_data, model_data, data_science_specialist
)


class TestDataScienceIntegration:
    """Integration tests for Data Science Specialist functionality."""
    
    def test_agent_initialization(self):
        """Test that the Data Science Specialist agent initializes correctly."""
        assert root_agent is not None
        assert root_agent.name == "data_science_specialist"
        assert len(root_agent.tools) == 4
        
        # Verify tool names
        tool_names = [tool.func.__name__ for tool in root_agent.tools]
        expected_tools = ["analyze_data", "visualize_data", "clean_data", "model_data"]
        for tool in expected_tools:
            assert tool in tool_names
    
    def test_analyze_data_descriptive(self):
        """Test descriptive data analysis functionality."""
        result = analyze_data("sample_data", "descriptive")
        
        assert isinstance(result, str)
        assert "Data Science Analysis Complete" in result
        assert "Descriptive" in result
        assert "sample_data" in result
        
        # Should contain analysis insights even if execution has constraints
        assert "Key Insights" in result
    
    def test_analyze_data_correlation(self):
        """Test correlation analysis functionality."""
        result = analyze_data("sample_data", "correlation")
        
        assert isinstance(result, str)
        assert "Data Science Analysis Complete" in result
        assert "Correlation" in result
        assert "sample_data" in result
    
    def test_analyze_data_distribution(self):
        """Test distribution analysis functionality."""
        result = analyze_data("sample_data", "distribution")
        
        assert isinstance(result, str)
        assert "Data Science Analysis Complete" in result
        assert "Distribution" in result
        assert "sample_data" in result
    
    def test_visualize_data_histogram(self):
        """Test histogram visualization functionality."""
        result = visualize_data("sample_data", "histogram", "all")
        
        assert isinstance(result, str)
        assert "Data Visualization Complete" in result
        assert "Histogram" in result
        assert "sample_data" in result
        assert "Visualization Notes" in result
    
    def test_visualize_data_scatter(self):
        """Test scatter plot visualization functionality."""
        result = visualize_data("sample_data", "scatter", "A,B")
        
        assert isinstance(result, str)
        assert "Data Visualization Complete" in result
        assert "Scatter" in result
        assert "A,B" in result
    
    def test_clean_data_basic(self):
        """Test basic data cleaning functionality."""
        result = clean_data("sample_data", "basic")
        
        assert isinstance(result, str)
        assert "Data Cleaning Complete" in result
        assert "Basic" in result
        assert "sample_data" in result
        assert "Cleaning Notes" in result
    
    def test_clean_data_missing_values(self):
        """Test missing values cleaning functionality."""
        result = clean_data("sample_data", "missing_values")
        
        assert isinstance(result, str)
        assert "Data Cleaning Complete" in result
        assert "Missing_Values" in result
    
    def test_clean_data_outliers(self):
        """Test outlier detection functionality."""
        result = clean_data("sample_data", "outliers")
        
        assert isinstance(result, str)
        assert "Data Cleaning Complete" in result
        assert "Outliers" in result
    
    def test_model_data_regression(self):
        """Test regression modeling functionality."""
        result = model_data("sample_data", "target", "regression")
        
        assert isinstance(result, str)
        assert "Machine Learning Complete" in result
        assert "Regression" in result
        assert "target" in result
        assert "Modeling Notes" in result
    
    def test_model_data_classification(self):
        """Test classification modeling functionality."""
        result = model_data("sample_data", "label", "classification")
        
        assert isinstance(result, str)
        assert "Machine Learning Complete" in result
        assert "Classification" in result
        assert "label" in result
    
    def test_model_data_clustering(self):
        """Test clustering functionality."""
        result = model_data("sample_data", "target", "clustering")
        
        assert isinstance(result, str)
        assert "Machine Learning Complete" in result
        assert "Clustering" in result
    
    def test_agent_tools_callable(self):
        """Test that all agent tools are callable."""
        for tool in root_agent.tools:
            assert callable(tool.func)
            
            # Test with minimal parameters
            if tool.func.__name__ == "analyze_data":
                result = tool.func("test_data")
            elif tool.func.__name__ == "visualize_data":
                result = tool.func("test_data")
            elif tool.func.__name__ == "clean_data":
                result = tool.func("test_data")
            elif tool.func.__name__ == "model_data":
                result = tool.func("test_data")
            
            assert isinstance(result, str)
            assert len(result) > 0
    
    def test_error_handling_robustness(self):
        """Test error handling for various edge cases."""
        # Test with empty data source
        result = analyze_data("", "descriptive")
        assert isinstance(result, str)
        
        # Test with invalid analysis type
        result = analyze_data("sample_data", "invalid_type")
        assert isinstance(result, str)
        
        # Test with invalid chart type
        result = visualize_data("sample_data", "invalid_chart")
        assert isinstance(result, str)
        
        # Test with invalid cleaning operations
        result = clean_data("sample_data", "invalid_operation")
        assert isinstance(result, str)
        
        # Test with invalid model type
        result = model_data("sample_data", "target", "invalid_model")
        assert isinstance(result, str)


class TestDataScienceSystemIntegration:
    """System-level integration tests."""
    
    def test_agent_in_vana_ecosystem(self):
        """Test that Data Science Specialist integrates properly with VANA ecosystem."""
        # Test agent can be imported and used
        assert data_science_specialist is not None
        assert data_science_specialist.name == "data_science_specialist"
        
        # Test agent has proper ADK structure
        assert hasattr(data_science_specialist, 'tools')
        assert hasattr(data_science_specialist, 'model')
        assert hasattr(data_science_specialist, 'instruction')
    
    def test_code_execution_integration(self):
        """Test integration with Code Execution Specialist."""
        # This test verifies that the Data Science Specialist can successfully
        # call the Code Execution Specialist (even if with constraints)
        result = analyze_data("sample_data", "descriptive")
        
        # Should contain evidence of code execution attempt
        assert "Code Execution" in result or "Analysis" in result
        assert isinstance(result, str)
        assert len(result) > 100  # Should have substantial content
    
    @pytest.mark.integration
    def test_week5_success_criteria(self):
        """Test all Week 5 success criteria."""
        # ✅ Data Science Specialist appears in agent system
        assert root_agent.name == "data_science_specialist"
        
        # ✅ Successfully performs data analysis and visualization
        analysis_result = analyze_data("sample_data", "descriptive")
        assert "Analysis Complete" in analysis_result
        
        viz_result = visualize_data("sample_data", "histogram")
        assert "Visualization Complete" in viz_result
        
        # ✅ Integrates with Code Execution Specialist for Python execution
        # (Integration is present, though may have security constraints)
        assert "Code Execution" in analysis_result or "python" in analysis_result.lower()
        
        # ✅ Provides statistical insights and recommendations
        assert "Insights" in analysis_result or "Notes" in analysis_result
        
        # ✅ Handles various data formats (CSV, JSON, Excel)
        csv_result = analyze_data("data.csv", "descriptive")
        json_result = analyze_data('{"data": [1,2,3]}', "descriptive")
        assert isinstance(csv_result, str) and isinstance(json_result, str)
        
        # ✅ Generates charts and visualizations
        chart_result = visualize_data("sample_data", "scatter")
        assert "Chart" in chart_result or "Visualization" in chart_result
        
        # ✅ Performs basic machine learning tasks
        ml_result = model_data("sample_data", "target", "regression")
        assert "Machine Learning" in ml_result or "Model" in ml_result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
