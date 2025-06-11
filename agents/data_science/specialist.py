"""
Data Science Specialist Agent - Google ADK Implementation

This agent provides expert-level data science analysis, machine learning guidance,
statistical analysis, and data visualization recommendations.

Specializations:
- Data analysis and statistical modeling
- Machine learning and predictive analytics
- Data visualization and reporting
- Data cleaning and preprocessing
- Feature engineering and model evaluation
- Business intelligence and insights generation
"""

import os
import sys
from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import relevant tools for data science analysis
from lib._tools import (
    adk_vector_search, adk_search_knowledge, adk_read_file, adk_list_directory
)

def analyze_data(context: str) -> str:
    """Analyze data requirements and provide comprehensive data analysis strategy."""
    return f"""📊 Data Analysis Strategy for: {context}

## Data Assessment & Exploration
- **Data Quality Check**: Missing values, outliers, data types validation
- **Exploratory Data Analysis**: Descriptive statistics, distributions, correlations
- **Data Profiling**: Cardinality, uniqueness, patterns, anomaly detection
- **Feature Analysis**: Variable importance, multicollinearity, feature relationships

## Statistical Analysis Approach
- **Descriptive Statistics**: Central tendency, variability, distribution shape
- **Inferential Statistics**: Hypothesis testing, confidence intervals, significance tests
- **Correlation Analysis**: Pearson, Spearman, partial correlations
- **Time Series Analysis**: Trend, seasonality, stationarity, forecasting

## Recommended Analysis Techniques
- **Univariate Analysis**: Histograms, box plots, Q-Q plots, normality tests
- **Bivariate Analysis**: Scatter plots, correlation matrices, cross-tabulations
- **Multivariate Analysis**: PCA, factor analysis, cluster analysis
- **Advanced Methods**: Regression analysis, ANOVA, non-parametric tests

## Tools & Technologies
- **Python Stack**: Pandas, NumPy, SciPy, Statsmodels, Seaborn, Matplotlib
- **R Ecosystem**: dplyr, ggplot2, tidyr, caret, randomForest
- **Visualization**: Plotly, Bokeh, D3.js, Tableau, Power BI
- **Big Data**: Spark, Dask, Vaex for large-scale data processing

## Data Quality & Validation
- **Missing Data**: Imputation strategies, pattern analysis, impact assessment
- **Outlier Detection**: Statistical methods, isolation forest, local outlier factor
- **Data Validation**: Schema validation, business rule checks, consistency tests
- **Bias Detection**: Sampling bias, selection bias, measurement bias analysis"""

def visualize_data(context: str) -> str:
    """Provide data visualization recommendations and best practices."""
    return f"""📈 Data Visualization Strategy for: {context}

## Visualization Selection Framework
- **Categorical Data**: Bar charts, pie charts, treemaps, sankey diagrams
- **Numerical Data**: Histograms, box plots, violin plots, density plots
- **Relationships**: Scatter plots, correlation heatmaps, pair plots
- **Time Series**: Line charts, area charts, candlestick, seasonal decomposition

## Advanced Visualization Techniques
- **Multidimensional**: Parallel coordinates, radar charts, 3D scatter plots
- **Geographic**: Choropleth maps, bubble maps, heat maps, flow maps
- **Network**: Node-link diagrams, adjacency matrices, arc diagrams
- **Interactive**: Dashboards, drill-down capabilities, filtering, brushing

## Design Principles & Best Practices
- **Color Theory**: Perceptually uniform scales, colorblind-friendly palettes
- **Typography**: Readable fonts, appropriate sizing, hierarchy
- **Layout**: Grid systems, white space, alignment, visual balance
- **Accessibility**: WCAG compliance, alternative text, keyboard navigation

## Tool Recommendations
- **Python**: Matplotlib, Seaborn, Plotly, Bokeh, Altair
- **R**: ggplot2, plotly, shiny, leaflet, DT
- **JavaScript**: D3.js, Chart.js, Highcharts, Observable
- **BI Tools**: Tableau, Power BI, Looker, Qlik Sense

## Dashboard Design Strategy
- **KPI Hierarchy**: Primary, secondary, tertiary metrics organization
- **User Experience**: Intuitive navigation, responsive design, performance
- **Storytelling**: Narrative flow, progressive disclosure, guided exploration
- **Interactivity**: Filters, drill-downs, cross-filtering, real-time updates"""

def clean_data(context: str) -> str:
    """Provide data cleaning and preprocessing recommendations."""
    return f"""🧹 Data Cleaning Strategy for: {context}

## Data Quality Assessment
- **Completeness**: Missing value patterns, data availability analysis
- **Accuracy**: Data validation rules, cross-reference checks, outlier detection
- **Consistency**: Format standardization, duplicate detection, referential integrity
- **Timeliness**: Data freshness, update frequency, temporal consistency

## Missing Data Handling
- **Deletion Methods**: Listwise, pairwise, complete case analysis
- **Imputation Techniques**: Mean/median, mode, forward/backward fill
- **Advanced Imputation**: KNN, MICE, iterative imputation, model-based
- **Missing Data Patterns**: MCAR, MAR, MNAR analysis and treatment

## Outlier Detection & Treatment
- **Statistical Methods**: Z-score, IQR, modified Z-score, Grubbs test
- **Machine Learning**: Isolation Forest, Local Outlier Factor, One-Class SVM
- **Domain-Specific**: Business rules, expert knowledge, contextual analysis
- **Treatment Options**: Removal, transformation, capping, separate modeling

## Data Transformation Techniques
- **Normalization**: Min-max scaling, z-score standardization, robust scaling
- **Encoding**: One-hot, label, ordinal, target, binary encoding
- **Feature Engineering**: Polynomial features, interaction terms, binning
- **Text Processing**: Tokenization, stemming, lemmatization, TF-IDF

## Validation & Quality Control
- **Data Profiling**: Automated quality reports, statistical summaries
- **Validation Rules**: Business logic checks, constraint validation
- **Monitoring**: Data drift detection, quality metrics tracking
- **Documentation**: Data lineage, transformation logs, quality reports"""

def model_data(context: str) -> str:
    """Provide machine learning modeling recommendations and best practices."""
    return f"""🤖 Machine Learning Strategy for: {context}

## Problem Formulation & Approach
- **Problem Type**: Classification, regression, clustering, recommendation
- **Success Metrics**: Accuracy, precision, recall, F1, AUC, business KPIs
- **Data Requirements**: Sample size, feature availability, label quality
- **Constraints**: Interpretability, latency, computational resources

## Algorithm Selection Framework
- **Linear Models**: Linear/Logistic regression, Ridge, Lasso, Elastic Net
- **Tree-Based**: Decision trees, Random Forest, Gradient Boosting, XGBoost
- **Neural Networks**: MLP, CNN, RNN, LSTM, Transformer architectures
- **Ensemble Methods**: Bagging, boosting, stacking, voting classifiers

## Feature Engineering Strategy
- **Selection Techniques**: Univariate tests, recursive elimination, LASSO
- **Creation Methods**: Polynomial features, interactions, domain knowledge
- **Dimensionality Reduction**: PCA, t-SNE, UMAP, feature selection
- **Temporal Features**: Lag variables, rolling statistics, seasonal decomposition

## Model Development Pipeline
- **Data Splitting**: Train/validation/test, stratification, time-based splits
- **Cross-Validation**: K-fold, stratified, time series, nested CV
- **Hyperparameter Tuning**: Grid search, random search, Bayesian optimization
- **Model Selection**: Performance metrics, complexity trade-offs, business value

## Evaluation & Validation
- **Performance Metrics**: Classification/regression specific metrics
- **Model Interpretation**: SHAP, LIME, permutation importance, partial dependence
- **Robustness Testing**: Adversarial examples, data drift, edge cases
- **Business Validation**: A/B testing, pilot studies, stakeholder feedback

## Deployment Considerations
- **Model Serving**: REST APIs, batch processing, real-time inference
- **Monitoring**: Performance drift, data quality, prediction accuracy
- **Maintenance**: Retraining schedules, model versioning, rollback strategies
- **Scalability**: Distributed training, model compression, edge deployment"""

# Create the Data Science Specialist Agent
data_science_specialist = LlmAgent(
    name="data_science",
    model="gemini-2.0-flash",
    description="Expert data scientist specializing in statistical analysis, machine learning, data visualization, and business intelligence.",
    instruction="""You are an expert Data Science Specialist with deep knowledge of:

## Core Expertise Areas
- **Statistical Analysis**: Descriptive/inferential statistics, hypothesis testing, experimental design
- **Machine Learning**: Supervised/unsupervised learning, deep learning, ensemble methods
- **Data Visualization**: Statistical graphics, dashboards, interactive visualizations
- **Data Engineering**: ETL pipelines, data quality, preprocessing, feature engineering
- **Business Intelligence**: KPI development, reporting, predictive analytics
- **Tools & Technologies**: Python/R ecosystems, SQL, cloud platforms, visualization tools

## Analysis Approach
1. **Problem Understanding**: Define business objectives and success metrics
2. **Data Assessment**: Evaluate data quality, completeness, and suitability
3. **Methodology Selection**: Choose appropriate statistical/ML techniques
4. **Implementation Strategy**: Provide step-by-step analysis workflow
5. **Validation & Interpretation**: Ensure robust results and actionable insights

## Response Style
- Provide specific, actionable data science recommendations
- Include statistical methodology with implementation guidance
- Suggest appropriate tools and technologies with rationale
- Offer multiple approaches with trade-offs analysis
- Include validation strategies and interpretation guidelines
- Consider business context and practical constraints
- Provide code examples and best practices when relevant

Always provide expert-level data science guidance that balances statistical rigor with practical business value.""",
    
    tools=[
        FunctionTool(func=analyze_data),
        FunctionTool(func=visualize_data),
        FunctionTool(func=clean_data),
        FunctionTool(func=model_data),
        adk_vector_search,
        adk_search_knowledge,
        adk_read_file,
        adk_list_directory
    ]
)
