"""
EDA (Exploratory Data Analysis) tools
Provide stable visualization and analysis methods for data exploration
"""

import pandas as pd
import numpy as np
from typing import List, Optional
from scipy import stats
from ..utils.display import Display


class EDAToolkit(Display):
    """
    VDS Tools Exploratory Data Analysis Toolkit - Comprehensive EDA functionality
    
    This class provides a comprehensive suite of exploratory data analysis tools
    including correlation analysis, distribution analysis, missing value analysis,
    statistical summaries, data quality assessment, and feature importance analysis.
    """
    
    def __init__(self):
        """Initialize EDAToolkit"""
        super().__init__()
    
    def correlation_analysis(self, csv_file_path: str, target_column: str = None):
        """
        Generate comprehensive correlation analysis with visualization insights
        
        Args:
            csv_file_path: Path to CSV file
            target_column: Target column for correlation analysis (optional)
        """
        html_content = generate_correlation_analysis(csv_file_path, target_column)
        self.show(html_content)
    
    def distribution_analysis(self, csv_file_path: str, column_name: str):
        """
        Generate detailed distribution analysis for a specific column
        
        Args:
            csv_file_path: Path to CSV file
            column_name: Column to analyze
        """
        html_content = generate_distribution_analysis(csv_file_path, column_name)
        self.show(html_content)
    
    def missing_value_analysis(self, csv_file_path: str):
        """
        Generate comprehensive missing value analysis across all columns
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_missing_value_analysis(csv_file_path)
        self.show(html_content)
    
    def statistical_summary(self, csv_file_path: str, columns: Optional[List[str]] = None):
        """
        Generate comprehensive statistical summary for numeric columns
        
        Args:
            csv_file_path: Path to CSV file
            columns: Specific columns to analyze (if None, analyze all numeric columns)
        """
        html_content = generate_advanced_statistics(csv_file_path, columns)
        self.show(html_content)
    
    def data_quality_report(self, csv_file_path: str):
        """
        Generate comprehensive data quality assessment report
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_data_quality_report(csv_file_path)
        self.show(html_content)
    
    def feature_importance_analysis(self, csv_file_path: str, target_column: str, method: str = 'auto'):
        """
        Generate feature importance analysis using various methods
        
        Args:
            csv_file_path: Path to CSV file
            target_column: Target variable column
            method: Analysis method ('auto', 'correlation', 'mutual_info', 'random_forest')
        """
        html_content = generate_feature_importance_analysis(csv_file_path, target_column, method)
        self.show(html_content)
    
    def basic_data_audit(self, csv_file_path: str):
        """
        Generate basic data audit including file info, dimensions, and data types
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_basic_data_audit(csv_file_path)
        self.show(html_content)
    
    def data_type_analysis(self, csv_file_path: str):
        """
        Generate detailed data type analysis with conversion suggestions
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_data_type_analysis(csv_file_path)
        self.show(html_content)
    
    def temporal_analysis(self, csv_file_path: str):
        """
        Generate temporal dimension analysis for time-related columns
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_temporal_analysis(csv_file_path)
        self.show(html_content)
    
    def spatial_analysis(self, csv_file_path: str):
        """
        Generate spatial dimension analysis for location-related columns
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_spatial_analysis(csv_file_path)
        self.show(html_content)
    
    def multicollinearity_analysis(self, csv_file_path: str):
        """
        Generate multicollinearity analysis with VIF calculations and correlation matrix
        
        Args:
            csv_file_path: Path to CSV file
        """
        html_content = generate_multicollinearity_analysis(csv_file_path)
        self.show(html_content)
    
    def multi_column_distribution(self, csv_file_path: str, columns: List[str]) -> str:
        """
        Analyze distribution patterns across multiple columns
        
        Args:
            csv_file_path: Path to CSV file
            columns: List of columns to analyze
            
        Returns:
            HTML report with multi-column distribution analysis
        """
        try:
            data = pd.read_csv(csv_file_path)
            
            # Validate columns exist
            missing_cols = [col for col in columns if col not in data.columns]
            if missing_cols:
                return self._create_error_report(f"Columns not found: {missing_cols}")
            
            analysis_results = []
            
            for col in columns:
                series = data[col].dropna()
                if len(series) == 0:
                    continue
                
                col_info = {
                    'column': col,
                    'dtype': str(data[col].dtype),
                    'count': len(series),
                    'missing': data[col].isnull().sum(),
                    'unique': data[col].nunique(),
                    'unique_pct': f"{(data[col].nunique() / len(data)) * 100:.1f}%"
                }
                
                if pd.api.types.is_numeric_dtype(series):
                    col_info.update({
                        'mean': f"{series.mean():.3f}",
                        'median': f"{series.median():.3f}",
                        'std': f"{series.std():.3f}",
                        'skewness': f"{series.skew():.3f}",
                        'min': f"{series.min():.3f}",
                        'max': f"{series.max():.3f}"
                    })
                else:
                    top_value = series.value_counts().index[0] if len(series) > 0 else 'N/A'
                    col_info.update({
                        'most_frequent': str(top_value),
                        'most_freq_count': series.value_counts().iloc[0] if len(series) > 0 else 0
                    })
                
                analysis_results.append(col_info)
            
            # Create HTML report
            report_html = f"""
            <vds-container>
                <vds-info-panel>
                    <vds-title>Multi-Column Distribution Analysis</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Columns Analyzed</td><td class="vds-value">{len(analysis_results)}</td></tr>
                        <tr><td class="vds-label">Dataset Rows</td><td class="vds-value">{len(data):,}</td></tr>
                        <tr><td class="vds-label">File Path</td><td class="vds-value">{csv_file_path}</td></tr>
                    </table>
                </vds-info-panel>
                
                <vds-section>
                    <vds-title>Column Distribution Summary</vds-title>
                    <table class="vds-distribution-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Column</th>
                                <th class="vds-col-header">Type</th>
                                <th class="vds-col-header">Count</th>
                                <th class="vds-col-header">Missing</th>
                                <th class="vds-col-header">Unique</th>
                                <th class="vds-col-header">Unique %</th>
                                <th class="vds-col-header">Key Statistics</th>
                            </tr>
                        </thead>
                        <tbody>
            """
            
            for info in analysis_results:
                if 'mean' in info:  # Numeric column
                    key_stats = f"Mean: {info['mean']}, Median: {info['median']}, Std: {info['std']}"
                else:  # Categorical column
                    key_stats = f"Most frequent: {info.get('most_frequent', 'N/A')} ({info.get('most_freq_count', 0)} times)"
                
                report_html += f"""
                            <tr>
                                <td class="vds-col-name">{info['column']}</td>
                                <td class="vds-dtype">{info['dtype']}</td>
                                <td class="vds-count">{info['count']:,}</td>
                                <td class="vds-missing">{info['missing']:,}</td>
                                <td class="vds-unique">{info['unique']:,}</td>
                                <td class="vds-unique-pct">{info['unique_pct']}</td>
                                <td class="vds-key-stats">{key_stats}</td>
                            </tr>
                """
            
            report_html += """
                        </tbody>
                    </table>
                </vds-section>
            </vds-container>
            """
            
            return report_html
            
        except Exception as e:
            return self._create_error_report(f"Error in multi-column distribution analysis: {str(e)}")
    
    def comparative_analysis(self, csv_file_path: str, grouping_column: str, analysis_columns: List[str]) -> str:
        """
        Compare distributions and statistics across different groups
        
        Args:
            csv_file_path: Path to CSV file
            grouping_column: Column to group by
            analysis_columns: Columns to analyze within each group
            
        Returns:
            HTML report with comparative analysis
        """
        try:
            data = pd.read_csv(csv_file_path)
            
            if grouping_column not in data.columns:
                return self._create_error_report(f"Grouping column '{grouping_column}' not found")
            
            # Validate analysis columns
            missing_cols = [col for col in analysis_columns if col not in data.columns]
            if missing_cols:
                return self._create_error_report(f"Analysis columns not found: {missing_cols}")
            
            groups = data[grouping_column].unique()
            group_stats = []
            
            for group in groups:
                group_data = data[data[grouping_column] == group]
                group_info = {
                    'group': str(group),
                    'count': len(group_data),
                    'percentage': f"{(len(group_data) / len(data)) * 100:.1f}%"
                }
                
                # Analyze each column within this group
                col_stats = {}
                for col in analysis_columns:
                    if col in group_data.columns:
                        series = group_data[col].dropna()
                        if len(series) > 0:
                            if pd.api.types.is_numeric_dtype(series):
                                col_stats[col] = {
                                    'mean': f"{series.mean():.3f}",
                                    'median': f"{series.median():.3f}",
                                    'std': f"{series.std():.3f}",
                                    'missing': group_data[col].isnull().sum()
                                }
                            else:
                                top_val = series.value_counts().index[0] if len(series) > 0 else 'N/A'
                                col_stats[col] = {
                                    'top_value': str(top_val),
                                    'unique_count': series.nunique(),
                                    'missing': group_data[col].isnull().sum()
                                }
                
                group_info['column_stats'] = col_stats
                group_stats.append(group_info)
            
            # Create HTML report
            report_html = f"""
            <vds-container>
                <vds-info-panel>
                    <vds-title>Comparative Analysis by '{grouping_column}'</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Grouping Column</td><td class="vds-value">{grouping_column}</td></tr>
                        <tr><td class="vds-label">Number of Groups</td><td class="vds-value">{len(groups)}</td></tr>
                        <tr><td class="vds-label">Analysis Columns</td><td class="vds-value">{len(analysis_columns)}</td></tr>
                        <tr><td class="vds-label">Total Records</td><td class="vds-value">{len(data):,}</td></tr>
                    </table>
                </vds-info-panel>
                
                <vds-section>
                    <vds-title>Group Statistics Summary</vds-title>
                    <table class="vds-comparative-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Group</th>
                                <th class="vds-col-header">Count</th>
                                <th class="vds-col-header">Percentage</th>
            """
            
            # Add column headers
            for col in analysis_columns:
                report_html += f'<th class="vds-col-header">{col} Stats</th>'
            
            report_html += """
                            </tr>
                        </thead>
                        <tbody>
            """
            
            # Add group data
            for group_info in group_stats:
                report_html += f"""
                            <tr>
                                <td class="vds-group-name">{group_info['group']}</td>
                                <td class="vds-group-count">{group_info['count']:,}</td>
                                <td class="vds-group-pct">{group_info['percentage']}</td>
                """
                
                for col in analysis_columns:
                    if col in group_info['column_stats']:
                        stats = group_info['column_stats'][col]
                        if 'mean' in stats:  # Numeric
                            stats_text = f"μ={stats['mean']}, σ={stats['std']}, missing={stats['missing']}"
                        else:  # Categorical
                            stats_text = f"Top: {stats['top_value']}, unique={stats['unique_count']}, missing={stats['missing']}"
                    else:
                        stats_text = "No data"
                    
                    report_html += f'<td class="vds-col-stats">{stats_text}</td>'
                
                report_html += "</tr>"
            
            report_html += """
                        </tbody>
                    </table>
                </vds-section>
            </vds-container>
            """
            
            return report_html
            
        except Exception as e:
            return self._create_error_report(f"Error in comparative analysis: {str(e)}")
    
    def _create_error_report(self, error_message: str) -> str:
        """Create HTML error report"""
        return f"""
        <vds-error-panel>
            <table class="vds-error-table">
                <tr><td class="vds-error-label">EDA Error</td><td class="vds-error-value">{error_message}</td></tr>
            </table>
        </vds-error-panel>
        """
    
    @staticmethod
    def help():
        """
        Display comprehensive help information for agents and users
        
        This function provides detailed documentation about the EDAToolkit class,
        its methods, parameters, and usage scenarios for AI agents to understand and use.
        """
        help_content = """
        =============================================================================
        VDS TOOLS - EXPLORATORY DATA ANALYSIS (EDA) TOOLKIT HELP
        =============================================================================
        
        OVERVIEW:
        The EDAToolkit class provides comprehensive exploratory data analysis
        functionality with rich HTML reporting. It helps understand data patterns,
        relationships, distributions, and quality issues in datasets.
        
        CLASS INITIALIZATION:
        ---------------------
        toolkit = EDAToolkit()
        
        CORE ANALYSIS METHODS:
        ======================
        
        1. correlation_analysis(csv_file_path, target_column=None) -> str
        ----------------------------------------------------------------
        PURPOSE: Analyze correlation patterns between numeric variables
        WHEN TO USE: Understanding relationships between variables, feature selection
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - target_column (str, optional): Focus on correlations with this column
        OUTPUT: HTML report with correlation matrix, high correlation pairs, target correlations
        EXAMPLE:
        result = toolkit.correlation_analysis("data.csv", target_column="price")
        # Agent use case: "Find which variables are most correlated with price"
        
        2. distribution_analysis(csv_file_path, column_name) -> str
        ----------------------------------------------------------
        PURPOSE: Detailed statistical and distribution analysis of a single column
        WHEN TO USE: Understanding data distribution, identifying patterns, outliers
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - column_name (str): Column to analyze
        OUTPUT: HTML report with statistics, distribution shape, outliers (numeric) or frequency table (categorical)
        EXAMPLE:
        result = toolkit.distribution_analysis("data.csv", "age")
        # Agent use case: "Analyze the distribution of the age column"
        
        3. missing_value_analysis(csv_file_path) -> str
        ------------------------------------------------
        PURPOSE: Comprehensive analysis of missing values across all columns
        WHEN TO USE: Data quality assessment, planning data cleaning strategies
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        OUTPUT: HTML report with missing value counts, percentages, severity levels
        EXAMPLE:
        result = toolkit.missing_value_analysis("data.csv")
        # Agent use case: "Analyze missing value patterns in the dataset"
        
        4. statistical_summary(csv_file_path, columns=None) -> str
        ----------------------------------------------------------
        PURPOSE: Generate comprehensive statistical summary for numeric columns
        WHEN TO USE: Getting overview of numeric data characteristics
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - columns (List[str], optional): Specific columns to analyze (default: all numeric)
        OUTPUT: HTML report with detailed statistics including normality tests
        EXAMPLE:
        result = toolkit.statistical_summary("data.csv", ["price", "quantity", "rating"])
        # Agent use case: "Get statistical summary for key numeric columns"
        
        5. data_quality_report(csv_file_path) -> str
        ---------------------------------------------
        PURPOSE: Comprehensive data quality assessment across all columns
        WHEN TO USE: Overall data health check, identifying quality issues
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        OUTPUT: HTML report with quality scores, issue identification, column-wise assessment
        EXAMPLE:
        result = toolkit.data_quality_report("data.csv")
        # Agent use case: "Assess the overall quality of this dataset"
        
        6. feature_importance_analysis(csv_file_path, target_column, method='auto') -> str
        ---------------------------------------------------------------------------------
        PURPOSE: Analyze feature importance relative to a target variable
        WHEN TO USE: Feature selection, understanding predictive variables
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - target_column (str): Target variable for importance analysis
        - method (str): 'auto', 'correlation', 'mutual_info', 'random_forest' (default: 'auto')
        OUTPUT: HTML report with ranked feature importance scores
        EXAMPLE:
        result = toolkit.feature_importance_analysis("data.csv", "sales", method="random_forest")
        # Agent use case: "Which features are most important for predicting sales?"
        
        ADVANCED ANALYSIS METHODS:
        ==========================
        
        7. multi_column_distribution(csv_file_path, columns) -> str
        -----------------------------------------------------------
        PURPOSE: Analyze distribution patterns across multiple columns simultaneously
        WHEN TO USE: Comparing distributions, batch analysis of selected columns
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - columns (List[str]): List of columns to analyze
        OUTPUT: HTML report with side-by-side distribution summaries
        EXAMPLE:
        result = toolkit.multi_column_distribution("data.csv", ["age", "income", "score"])
        # Agent use case: "Compare the distributions of these key columns"
        
        8. comparative_analysis(csv_file_path, grouping_column, analysis_columns) -> str
        -------------------------------------------------------------------------------
        PURPOSE: Compare statistics and distributions across different groups
        WHEN TO USE: Group comparisons, segment analysis, A/B testing insights
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - grouping_column (str): Column to group by (e.g., 'category', 'region')
        - analysis_columns (List[str]): Columns to analyze within each group
        OUTPUT: HTML report with group-wise statistics and comparisons
        EXAMPLE:
        result = toolkit.comparative_analysis("data.csv", "category", ["price", "rating"])
        # Agent use case: "Compare price and rating statistics across different product categories"
        
        AGENT USAGE SCENARIOS:
        ======================
        
        1. INITIAL DATA EXPLORATION:
        When agent first encounters a dataset:
        toolkit = EDAToolkit()
        # Get overall quality assessment
        quality = toolkit.data_quality_report("new_data.csv")
        # Check missing value patterns
        missing = toolkit.missing_value_analysis("new_data.csv")
        # Get statistical overview
        stats = toolkit.statistical_summary("new_data.csv")
        
        2. RELATIONSHIP ANALYSIS:
        When agent needs to understand variable relationships:
        # Analyze correlations
        corr = toolkit.correlation_analysis("data.csv", target_column="target_var")
        # Feature importance for predictive modeling
        importance = toolkit.feature_importance_analysis("data.csv", "target_var")
        
        3. DETAILED COLUMN INVESTIGATION:
        When agent needs to understand specific columns:
        # Analyze individual column distributions
        dist1 = toolkit.distribution_analysis("data.csv", "suspicious_column")
        dist2 = toolkit.distribution_analysis("data.csv", "key_metric")
        
        4. GROUP COMPARISONS:
        When agent needs to compare segments:
        # Compare metrics across categories
        comparison = toolkit.comparative_analysis("data.csv", "segment", ["revenue", "count"])
        
        5. BATCH ANALYSIS:
        When agent needs to analyze multiple columns efficiently:
        # Compare distributions of related columns
        multi_dist = toolkit.multi_column_distribution("data.csv", 
                                                      ["metric1", "metric2", "metric3"])
        
        METHOD SELECTION GUIDANCE:
        ==========================
        
        - START WITH: data_quality_report() for overall assessment
        - FOR RELATIONSHIPS: correlation_analysis() and feature_importance_analysis()
        - FOR INDIVIDUAL COLUMNS: distribution_analysis()
        - FOR DATA ISSUES: missing_value_analysis()
        - FOR NUMERIC OVERVIEW: statistical_summary()
        - FOR GROUP INSIGHTS: comparative_analysis()
        - FOR BATCH PROCESSING: multi_column_distribution()
        
        OUTPUT FORMAT:
        ==============
        All methods return HTML strings using custom vds- tags:
        - vds-container: Main container
        - vds-info-panel: Summary information
        - vds-section: Analysis sections
        - Rich statistical tables with appropriate styling
        
        ERROR HANDLING:
        ===============
        All methods include comprehensive error handling and return
        structured HTML error reports when issues occur.
        
        INTEGRATION TIPS FOR AGENTS:
        ============================
        1. Start with data_quality_report() for overall health check
        2. Use correlation_analysis() before feature selection
        3. Use distribution_analysis() for suspicious columns
        4. Chain multiple analyses for comprehensive understanding
        5. Use comparative_analysis() for business insights
        6. Check for error panels in returned HTML
        7. Use method='auto' for intelligent defaults
        
        PERFORMANCE CONSIDERATIONS:
        ===========================
        - Large datasets: Use statistical_summary() with specific columns
        - Many groups: comparative_analysis() may be slow with 100+ groups
        - Feature importance: random_forest method requires sklearn
        - Memory usage: Methods handle large datasets efficiently
        
        =============================================================================
        """
        print(help_content)
        return help_content


def generate_correlation_analysis(csv_file_path: str, target_column: str = None) -> str:
    """
    Generate correlation analysis with visualization
    
    Args:
        csv_file_path: Path to CSV file
        target_column: Target column for correlation analysis
        
    Returns:
        HTML report with correlation analysis
    """
    try:
        data = pd.read_csv(csv_file_path)
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return _create_info_report("Insufficient numeric columns for correlation analysis")
        
        # Calculate correlation matrix
        corr_matrix = data[numeric_cols].corr()
        
        # Find highly correlated pairs
        high_corr_pairs = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_val = corr_matrix.iloc[i, j]
                if abs(corr_val) > 0.7:  # High correlation threshold
                    high_corr_pairs.append({
                        'Variable 1': corr_matrix.columns[i],
                        'Variable 2': corr_matrix.columns[j],
                        'Correlation': f"{corr_val:.3f}",
                        'Strength': 'Strong' if abs(corr_val) > 0.8 else 'Moderate'
                    })
        
        # Generate correlation table
        corr_html = """
        <vds-section>
            <vds-title>Correlation Analysis Results</vds-title>
            <table class="vds-correlation-table">
                <thead>
                    <tr>
                        <th class="vds-col-header">Variable 1</th>
                        <th class="vds-col-header">Variable 2</th>
                        <th class="vds-col-header">Correlation</th>
                        <th class="vds-col-header">Strength</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for pair in high_corr_pairs:
            corr_class = "vds-strong-corr" if pair['Strength'] == 'Strong' else "vds-moderate-corr"
            corr_html += f"""
                    <tr class="{corr_class}">
                        <td class="vds-var-name">{pair['Variable 1']}</td>
                        <td class="vds-var-name">{pair['Variable 2']}</td>
                        <td class="vds-corr-value">{pair['Correlation']}</td>
                        <td class="vds-corr-strength">{pair['Strength']}</td>
                    </tr>
            """
        
        if not high_corr_pairs:
            corr_html += """
                    <tr>
                        <td colspan="4" class="vds-no-data">No strong correlations found (threshold: 0.7)</td>
                    </tr>
            """
        
        corr_html += """
                </tbody>
            </table>
        </vds-section>
        """
        
        # Target column analysis if specified
        target_html = ""
        if target_column and target_column in numeric_cols:
            target_corrs = corr_matrix[target_column].abs().sort_values(ascending=False)
            target_corrs = target_corrs[target_corrs.index != target_column][:5]  # Top 5 excluding self
            
            target_html = f"""
            <vds-section>
                <vds-title>Top Correlations with '{target_column}'</vds-title>
                <table class="vds-target-corr-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Variable</th>
                            <th class="vds-col-header">Correlation</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for var, corr_val in target_corrs.items():
                original_corr = corr_matrix.loc[var, target_column]
                target_html += f"""
                        <tr>
                            <td class="vds-var-name">{var}</td>
                            <td class="vds-corr-value">{original_corr:.3f}</td>
                        </tr>
                """
            
            target_html += """
                    </tbody>
                </table>
            </vds-section>
            """
        
        return f"""
        <vds-container>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Numeric Variables</td><td class="vds-value">{len(numeric_cols)}</td></tr>
                    <tr><td class="vds-label">High Correlations Found</td><td class="vds-value">{len(high_corr_pairs)}</td></tr>
                </table>
            </vds-info-panel>
            {corr_html}
            {target_html}
        </vds-container>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in correlation analysis: {str(e)}")


def generate_distribution_analysis(csv_file_path: str, column_name: str) -> str:
    """
    Generate distribution analysis for a specific column
    
    Args:
        csv_file_path: Path to CSV file
        column_name: Column to analyze
        
    Returns:
        HTML report with distribution analysis
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if column_name not in data.columns:
            return _create_error_report(f"Column '{column_name}' not found in dataset")
        
        series = data[column_name].dropna()
        
        if len(series) == 0:
            return _create_info_report(f"Column '{column_name}' has no valid values")
        
        analysis_results = []
        
        if pd.api.types.is_numeric_dtype(series):
            # Numeric distribution analysis
            analysis_results.extend([
                ('Data Type', 'Numeric'),
                ('Count', f"{len(series):,}"),
                ('Missing Values', f"{data[column_name].isnull().sum():,}"),
                ('Mean', f"{series.mean():.3f}"),
                ('Median', f"{series.median():.3f}"),
                ('Standard Deviation', f"{series.std():.3f}"),
                ('Minimum', f"{series.min():.3f}"),
                ('Maximum', f"{series.max():.3f}"),
                ('Skewness', f"{series.skew():.3f}"),
                ('Kurtosis', f"{series.kurtosis():.3f}")
            ])
            
            # Check for normality
            if len(series) >= 8:  # Minimum sample size for Shapiro-Wilk
                try:
                    _, p_value = stats.shapiro(series.sample(min(5000, len(series))))
                    normality = "Normal" if p_value > 0.05 else "Non-normal"
                    analysis_results.append(('Distribution Shape', f"{normality} (p={p_value:.4f})"))
                except:
                    analysis_results.append(('Distribution Shape', "Could not determine"))
            
            # Outlier detection
            Q1 = series.quantile(0.25)
            Q3 = series.quantile(0.75)
            IQR = Q3 - Q1
            outliers = ((series < (Q1 - 1.5 * IQR)) | (series > (Q3 + 1.5 * IQR))).sum()
            analysis_results.append(('Outliers (IQR method)', f"{outliers} ({outliers/len(series)*100:.1f}%)"))
            
        else:
            # Categorical distribution analysis
            value_counts = series.value_counts()
            analysis_results.extend([
                ('Data Type', 'Categorical'),
                ('Count', f"{len(series):,}"),
                ('Missing Values', f"{data[column_name].isnull().sum():,}"),
                ('Unique Values', f"{series.nunique():,}"),
                ('Most Frequent', str(value_counts.index[0])),
                ('Most Frequent Count', f"{value_counts.iloc[0]:,}"),
                ('Least Frequent', str(value_counts.index[-1])),
                ('Least Frequent Count', f"{value_counts.iloc[-1]:,}")
            ])
            
            # Top 5 most frequent values
            top_5_html = """
            <vds-section>
                <vds-title>Top 5 Most Frequent Values</vds-title>
                <table class="vds-frequency-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Value</th>
                            <th class="vds-col-header">Count</th>
                            <th class="vds-col-header">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for value, count in value_counts.head(5).items():
                percentage = count / len(series) * 100
                top_5_html += f"""
                        <tr>
                            <td class="vds-cat-value">{value}</td>
                            <td class="vds-count-value">{count:,}</td>
                            <td class="vds-pct-value">{percentage:.1f}%</td>
                        </tr>
                """
            
            top_5_html += """
                    </tbody>
                </table>
            </vds-section>
            """
        
        # Create main analysis table
        analysis_html = f"""
        <vds-section>
            <vds-title>Distribution Analysis: '{column_name}'</vds-title>
            <table class="vds-analysis-table">
                <tbody>
        """
        
        for label, value in analysis_results:
            analysis_html += f"""
                    <tr>
                        <td class="vds-analysis-label">{label}</td>
                        <td class="vds-analysis-value">{value}</td>
                    </tr>
            """
        
        analysis_html += """
                </tbody>
            </table>
        </vds-section>
        """
        
        # Add frequency table for categorical data
        if not pd.api.types.is_numeric_dtype(series):
            analysis_html += top_5_html
        
        return f"""
        <vds-container>
            {analysis_html}
        </vds-container>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in distribution analysis: {str(e)}")


def generate_missing_value_analysis(csv_file_path: str) -> str:
    """
    Generate comprehensive missing value analysis
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with missing value analysis
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        # Calculate missing values per column
        missing_info = []
        total_cells = len(data) * len(data.columns)
        total_missing = 0
        
        for col in data.columns:
            missing_count = data[col].isnull().sum()
            if missing_count > 0:
                missing_pct = missing_count / len(data) * 100
                missing_info.append({
                    'Column': col,
                    'Missing Count': f"{missing_count:,}",
                    'Missing Percentage': f"{missing_pct:.1f}%",
                    'Data Type': str(data[col].dtype),
                    'Severity': 'High' if missing_pct > 30 else 'Medium' if missing_pct > 10 else 'Low'
                })
                total_missing += missing_count
        
        if not missing_info:
            return _create_info_report("No missing values found in the dataset")
        
        # Sort by missing percentage
        missing_info.sort(key=lambda x: float(x['Missing Percentage'].rstrip('%')), reverse=True)
        
        # Create summary statistics
        summary_stats = [
            ('Total Columns', len(data.columns)),
            ('Columns with Missing Values', len(missing_info)),
            ('Total Missing Cells', f"{total_missing:,}"),
            ('Overall Missing Percentage', f"{total_missing/total_cells*100:.2f}%")
        ]
        
        # Create HTML report
        summary_html = """
        <vds-info-panel>
            <vds-title>Missing Value Summary</vds-title>
            <table class="vds-summary-table">
        """
        
        for label, value in summary_stats:
            summary_html += f"""
                <tr><td class="vds-label">{label}</td><td class="vds-value">{value}</td></tr>
            """
        
        summary_html += """
            </table>
        </vds-info-panel>
        """
        
        # Create detailed missing value table
        detail_html = """
        <vds-section>
            <vds-title>Missing Values by Column</vds-title>
            <table class="vds-missing-table">
                <thead>
                    <tr>
                        <th class="vds-col-header">Column</th>
                        <th class="vds-col-header">Missing Count</th>
                        <th class="vds-col-header">Missing %</th>
                        <th class="vds-col-header">Data Type</th>
                        <th class="vds-col-header">Severity</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for info in missing_info:
            severity_class = f"vds-severity-{info['Severity'].lower()}"
            detail_html += f"""
                    <tr class="{severity_class}">
                        <td class="vds-col-name">{info['Column']}</td>
                        <td class="vds-missing-count">{info['Missing Count']}</td>
                        <td class="vds-missing-pct">{info['Missing Percentage']}</td>
                        <td class="vds-data-type">{info['Data Type']}</td>
                        <td class="vds-severity">{info['Severity']}</td>
                    </tr>
            """
        
        detail_html += """
                </tbody>
            </table>
        </vds-section>
        """
        
        return f"""
        <vds-container>
            {summary_html}
            {detail_html}
        </vds-container>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in missing value analysis: {str(e)}")


def _create_error_report(error_message: str) -> str:
    """Create HTML error report"""
    return f"""
    <vds-error-panel>
        <table class="vds-error-table">
            <tr><td class="vds-error-label">Analysis Error</td><td class="vds-error-value">{error_message}</td></tr>
        </table>
    </vds-error-panel>
    """


def _create_info_report(info_message: str) -> str:
    """Create HTML info report"""
    return f"""
    <vds-info-panel>
        <table class="vds-info-table">
            <tr><td class="vds-label">Information</td><td class="vds-value">{info_message}</td></tr>
        </table>
    </vds-info-panel>
    """


def generate_advanced_statistics(csv_file_path: str, columns: Optional[List[str]] = None) -> str:
    """
    Generate comprehensive statistical summary for dataset
    
    Args:
        csv_file_path: Path to CSV file
        columns: Specific columns to analyze (if None, analyze all numeric columns)
        
    Returns:
        HTML report with comprehensive statistics
    """
    try:
        import pandas as pd
        import numpy as np
        from scipy import stats
        data = pd.read_csv(csv_file_path)
        
        # Select columns to analyze
        if columns is None:
            numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        else:
            numeric_cols = [col for col in columns if col in data.columns and data[col].dtype in ['int64', 'float64']]
        
        if len(numeric_cols) == 0:
            return _create_info_report("No numeric columns found for statistical analysis")
        
        # Calculate comprehensive statistics
        stats_data = []
        for col in numeric_cols:
            series = data[col].dropna()
            if len(series) > 0:
                # Basic statistics
                basic_stats = {
                    'variable': col,
                    'count': len(series),
                    'mean': series.mean(),
                    'std': series.std(),
                    'min': series.min(),
                    'q25': series.quantile(0.25),
                    'median': series.median(),
                    'q75': series.quantile(0.75),
                    'max': series.max(),
                    'range': series.max() - series.min(),
                    'variance': series.var(),
                    'skewness': stats.skew(series),
                    'kurtosis': stats.kurtosis(series),
                    'missing_count': data[col].isnull().sum(),
                    'missing_pct': (data[col].isnull().sum() / len(data)) * 100
                }
                stats_data.append(basic_stats)
        
        # Generate HTML report
        html_content = f"""
        <vds-container>
            <vds-title>Advanced Statistical Summary</vds-title>
            
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Dataset</td><td class="vds-value">{csv_file_path}</td></tr>
                    <tr><td class="vds-label">Variables Analyzed</td><td class="vds-value">{len(stats_data)}</td></tr>
                    <tr><td class="vds-label">Total Observations</td><td class="vds-value">{len(data):,}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-subtitle>Comprehensive Statistics</vds-subtitle>
                <vds-table>
                    <table class="vds-data-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Variable</th>
                                <th class="vds-col-header">Count</th>
                                <th class="vds-col-header">Mean</th>
                                <th class="vds-col-header">Std Dev</th>
                                <th class="vds-col-header">Min</th>
                                <th class="vds-col-header">Q25</th>
                                <th class="vds-col-header">Median</th>
                                <th class="vds-col-header">Q75</th>
                                <th class="vds-col-header">Max</th>
                                <th class="vds-col-header">Skewness</th>
                                <th class="vds-col-header">Kurtosis</th>
                                <th class="vds-col-header">Missing %</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        for stat in stats_data:
            html_content += f"""
                            <tr>
                                <td class="vds-cell">{stat['variable']}</td>
                                <td class="vds-cell">{stat['count']:,}</td>
                                <td class="vds-cell">{stat['mean']:.4f}</td>
                                <td class="vds-cell">{stat['std']:.4f}</td>
                                <td class="vds-cell">{stat['min']:.4f}</td>
                                <td class="vds-cell">{stat['q25']:.4f}</td>
                                <td class="vds-cell">{stat['median']:.4f}</td>
                                <td class="vds-cell">{stat['q75']:.4f}</td>
                                <td class="vds-cell">{stat['max']:.4f}</td>
                                <td class="vds-cell">{stat['skewness']:.4f}</td>
                                <td class="vds-cell">{stat['kurtosis']:.4f}</td>
                                <td class="vds-cell">{stat['missing_pct']:.2f}%</td>
                            </tr>
            """
        
        html_content += """
                        </tbody>
                    </table>
                </vds-table>
            </vds-section>
        </vds-container>
        """
        
        return html_content
        
    except Exception as e:
        return _create_error_report(f"Error in advanced statistics: {str(e)}")


def generate_feature_importance_analysis(csv_file_path: str, target_column: str = None) -> str:
    """
    Generate feature importance analysis using multiple methods
    
    Args:
        csv_file_path: Path to CSV file
        target_column: Target column for supervised analysis (optional)
        
    Returns:
        HTML report with feature importance analysis
    """
    try:
        import pandas as pd
        import numpy as np
        import matplotlib.pyplot as plt
        import seaborn as sns
        from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
        from sklearn.feature_selection import mutual_info_regression, mutual_info_classif
        from sklearn.preprocessing import LabelEncoder
        import io
        import base64
        
        # Read data
        data = pd.read_csv(csv_file_path)
        
        # Get numeric columns
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return f"""
            <vds-container>
                <vds-title>Feature Importance Analysis</vds-title>
                <vds-warning-panel>
                    <p>Insufficient numeric columns for feature importance analysis.</p>
                    <p>Found {len(numeric_cols)} numeric columns, need at least 2.</p>
                </vds-warning-panel>
            </vds-container>
            """
        
        # Prepare data
        clean_data = data[numeric_cols].dropna()
        
        # Determine target column
        if target_column and target_column in clean_data.columns:
            target = clean_data[target_column]
            features = clean_data.drop(columns=[target_column])
        else:
            # Use correlation with first column as proxy
            target_column = clean_data.columns[0]
            target = clean_data[target_column] 
            features = clean_data.drop(columns=[target_column])
        
        if len(features.columns) == 0:
            return f"""
            <vds-container>
                <vds-title>Feature Importance Analysis</vds-title>
                <vds-warning-panel>
                    <p>No feature columns available after removing target column.</p>
                </vds-warning-panel>
            </vds-container>
            """
        
        # Initialize results storage
        importance_results = []
        
        # Method 1: Correlation-based importance
        correlations = features.corrwith(target).abs().sort_values(ascending=False)
        for col in correlations.index:
            importance_results.append({
                'feature': col,
                'correlation_importance': correlations[col],
                'correlation_rank': list(correlations.index).index(col) + 1
            })
        
        # Calculate composite score and create simple ranking
        for i, result in enumerate(importance_results):
            result['composite_score'] = result['correlation_importance']
        
        # Sort by composite score
        importance_results.sort(key=lambda x: x['composite_score'], reverse=True)
        
        # Build HTML report
        html_content = f"""
        <vds-container>
            <vds-title>Feature Importance Analysis Report</vds-title>
            
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Dataset</td><td class="vds-value">{csv_file_path}</td></tr>
                    <tr><td class="vds-label">Target Variable</td><td class="vds-value">{target_column}</td></tr>
                    <tr><td class="vds-label">Features Analyzed</td><td class="vds-value">{len(features.columns)}</td></tr>
                    <tr><td class="vds-label">Analysis Method</td><td class="vds-value">Correlation Analysis</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-subtitle>Feature Importance Rankings</vds-subtitle>
                <vds-table>
                    <table class="vds-data-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Feature</th>
                                <th class="vds-col-header">Correlation (abs)</th>
                                <th class="vds-col-header">Rank</th>
                                <th class="vds-col-header">Importance Level</th>
                            </tr>
                        </thead>
                        <tbody>
        """
        
        for i, result in enumerate(importance_results):
            corr_val = result['correlation_importance']
            if corr_val > 0.7:
                importance_level = '<span class="vds-status-good">High</span>'
            elif corr_val > 0.4:
                importance_level = '<span class="vds-status-warning">Medium</span>'
            else:
                importance_level = '<span class="vds-status-danger">Low</span>'
                
            html_content += f"""
                            <tr>
                                <td class="vds-cell">{result['feature']}</td>
                                <td class="vds-cell">{corr_val:.4f}</td>
                                <td class="vds-cell">{i + 1}</td>
                                <td class="vds-cell">{importance_level}</td>
                            </tr>
            """
        
        html_content += """
                        </tbody>
                    </table>
                </vds-table>
            </vds-section>
        </vds-container>
        """
        
        return html_content
        
    except Exception as e:
        return f"""
        <vds-container>
            <vds-error-panel>
                <vds-title>Feature Importance Analysis Error</vds-title>
                <table class="vds-error-table">
                    <tr><td class="vds-error-label">Error Type</td><td class="vds-error-value">{type(e).__name__}</td></tr>
                    <tr><td class="vds-error-label">Error Message</td><td class="vds-error-value">{str(e)}</td></tr>
                    <tr><td class="vds-error-label">File Path</td><td class="vds-error-value">{csv_file_path}</td></tr>
                </table>
            </vds-error-panel>
        </vds-container>
        """


def generate_data_quality_report(csv_file_path: str) -> str:
    """
    Generate comprehensive data quality assessment
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with data quality metrics
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        # Overall quality metrics
        total_cells = len(data) * len(data.columns)
        missing_cells = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        
        # Column-wise quality assessment
        quality_info = []
        for col in data.columns:
            col_info = {
                'column': col,
                'dtype': str(data[col].dtype),
                'non_null': data[col].count(),
                'null_count': data[col].isnull().sum(),
                'null_pct': f"{(data[col].isnull().sum() / len(data)) * 100:.1f}%",
                'unique_count': data[col].nunique(),
                'unique_pct': f"{(data[col].nunique() / len(data)) * 100:.1f}%"
            }
            
            # Data type specific checks
            if pd.api.types.is_numeric_dtype(data[col]):
                col_info['zeros'] = (data[col] == 0).sum()
                col_info['negatives'] = (data[col] < 0).sum() if data[col].dtype in ['int64', 'float64'] else 0
                col_info['infinites'] = np.isinf(data[col]).sum() if data[col].dtype == 'float64' else 0
            else:
                col_info['empty_strings'] = (data[col] == '').sum()
                col_info['whitespace_only'] = data[col].str.strip().eq('').sum() if data[col].dtype == 'object' else 0
            
            # Quality score (0-100)
            quality_score = 100
            if col_info['null_pct'] != '0.0%':
                quality_score -= float(col_info['null_pct'].rstrip('%'))
            if pd.api.types.is_numeric_dtype(data[col]) and col_info['infinites'] > 0:
                quality_score -= 10
            
            col_info['quality_score'] = f"{max(0, quality_score):.1f}"
            quality_info.append(col_info)
        
        # Create HTML report
        report_html = f"""
        <vds-container>
            <vds-info-panel>
                <vds-title>Data Quality Assessment Report</vds-title>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Dataset Shape</td><td class="vds-value">{data.shape[0]:,} rows × {data.shape[1]} columns</td></tr>
                    <tr><td class="vds-label">Total Cells</td><td class="vds-value">{total_cells:,}</td></tr>
                    <tr><td class="vds-label">Missing Cells</td><td class="vds-value">{missing_cells:,} ({(missing_cells/total_cells)*100:.2f}%)</td></tr>
                    <tr><td class="vds-label">Duplicate Rows</td><td class="vds-value">{duplicate_rows:,}</td></tr>
                    <tr><td class="vds-label">Overall Quality</td><td class="vds-value">{max(0, 100 - (missing_cells/total_cells)*100):.1f}%</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Column Quality Details</vds-title>
                <table class="vds-quality-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Column</th>
                            <th class="vds-col-header">Data Type</th>
                            <th class="vds-col-header">Non-Null</th>
                            <th class="vds-col-header">Null Count</th>
                            <th class="vds-col-header">Null %</th>
                            <th class="vds-col-header">Unique Count</th>
                            <th class="vds-col-header">Unique %</th>
                            <th class="vds-col-header">Issues</th>
                            <th class="vds-col-header">Quality Score</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for info in quality_info:
            # Identify issues
            issues = []
            if float(info['null_pct'].rstrip('%')) > 10:
                issues.append("High missing")
            if pd.api.types.is_numeric_dtype(data[info['column']]):
                if info.get('infinites', 0) > 0:
                    issues.append("Infinite values")
                if info.get('zeros', 0) > len(data) * 0.5:
                    issues.append("Many zeros")
            else:
                if info.get('empty_strings', 0) > 0:
                    issues.append("Empty strings")
            
            issues_text = ", ".join(issues) if issues else "None"
            quality_class = "vds-quality-good" if float(info['quality_score']) >= 90 else "vds-quality-medium" if float(info['quality_score']) >= 70 else "vds-quality-poor"
            
            report_html += f"""
                        <tr class="{quality_class}">
                            <td class="vds-col-name">{info['column']}</td>
                            <td class="vds-dtype">{info['dtype']}</td>
                            <td class="vds-count">{info['non_null']:,}</td>
                            <td class="vds-null-count">{info['null_count']:,}</td>
                            <td class="vds-null-pct">{info['null_pct']}</td>
                            <td class="vds-unique-count">{info['unique_count']:,}</td>
                            <td class="vds-unique-pct">{info['unique_pct']}</td>
                            <td class="vds-issues">{issues_text}</td>
                            <td class="vds-quality-score">{info['quality_score']}%</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-container>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in data quality report: {str(e)}")


def generate_feature_importance_analysis(csv_file_path: str, target_column: str, method: str = 'auto') -> str:
    """
    Generate feature importance analysis using various methods
    
    Args:
        csv_file_path: Path to CSV file
        target_column: Target variable column
        method: Analysis method ('auto', 'correlation', 'mutual_info', 'random_forest')
        
    Returns:
        HTML report with feature importance results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if target_column not in data.columns:
            return _create_error_report(f"Target column '{target_column}' not found in dataset")
        
        # Prepare features (exclude target and non-numeric columns)
        feature_cols = [col for col in data.columns if col != target_column and pd.api.types.is_numeric_dtype(data[col])]
        
        if not feature_cols:
            return _create_info_report("No numeric features found for importance analysis")
        
        X = data[feature_cols].fillna(data[feature_cols].mean())
        y = data[target_column].fillna(data[target_column].mean() if pd.api.types.is_numeric_dtype(data[target_column]) else data[target_column].mode()[0])
        
        importance_results = []
        
        # Auto method selection
        if method == 'auto':
            method = 'correlation' if pd.api.types.is_numeric_dtype(y) else 'mutual_info'
        
        if method == 'correlation' and pd.api.types.is_numeric_dtype(y):
            # Correlation-based importance
            correlations = X.corrwith(y).abs().sort_values(ascending=False)
            for feature, importance in correlations.items():
                importance_results.append({
                    'feature': feature,
                    'importance': f"{importance:.4f}",
                    'rank': len(importance_results) + 1
                })
        
        elif method == 'mutual_info':
            # Mutual information importance
            from sklearn.feature_selection import mutual_info_regression, mutual_info_classif
            
            if pd.api.types.is_numeric_dtype(y):
                mi_scores = mutual_info_regression(X, y, random_state=42)
            else:
                from sklearn.preprocessing import LabelEncoder
                le = LabelEncoder()
                y_encoded = le.fit_transform(y.astype(str))
                mi_scores = mutual_info_classif(X, y_encoded, random_state=42)
            
            mi_df = pd.DataFrame({'feature': feature_cols, 'importance': mi_scores}).sort_values('importance', ascending=False)
            for idx, row in mi_df.iterrows():
                importance_results.append({
                    'feature': row['feature'],
                    'importance': f"{row['importance']:.4f}",
                    'rank': len(importance_results) + 1
                })
        
        elif method == 'random_forest':
            # Random Forest importance
            from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
            
            if pd.api.types.is_numeric_dtype(y):
                rf = RandomForestRegressor(n_estimators=100, random_state=42)
            else:
                from sklearn.preprocessing import LabelEncoder
                le = LabelEncoder()
                y = le.fit_transform(y.astype(str))
                rf = RandomForestClassifier(n_estimators=100, random_state=42)
            
            rf.fit(X, y)
            feature_importance = pd.DataFrame({
                'feature': feature_cols,
                'importance': rf.feature_importances_
            }).sort_values('importance', ascending=False)
            
            for idx, row in feature_importance.iterrows():
                importance_results.append({
                    'feature': row['feature'],
                    'importance': f"{row['importance']:.4f}",
                    'rank': len(importance_results) + 1
                })
        
        # Create HTML report
        report_html = f"""
        <vds-container>
            <vds-info-panel>
                <vds-title>Feature Importance Analysis</vds-title>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Target Column</td><td class="vds-value">{target_column}</td></tr>
                    <tr><td class="vds-label">Method Used</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Features Analyzed</td><td class="vds-value">{len(feature_cols)}</td></tr>
                    <tr><td class="vds-label">Target Type</td><td class="vds-value">{'Numeric' if pd.api.types.is_numeric_dtype(data[target_column]) else 'Categorical'}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Feature Importance Rankings</vds-title>
                <table class="vds-importance-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Rank</th>
                            <th class="vds-col-header">Feature</th>
                            <th class="vds-col-header">Importance Score</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for result in importance_results[:20]:  # Show top 20 features
            rank_class = "vds-rank-high" if result['rank'] <= 5 else "vds-rank-medium" if result['rank'] <= 10 else "vds-rank-low"
            report_html += f"""
                        <tr class="{rank_class}">
                            <td class="vds-rank">{result['rank']}</td>
                            <td class="vds-feature-name">{result['feature']}</td>
                            <td class="vds-importance-score">{result['importance']}</td>
                        </tr>
            """
        
        if len(importance_results) > 20:
            report_html += f"<tr><td colspan='3' class='vds-info'>... and {len(importance_results) - 20} more features</td></tr>"
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-container>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in feature importance analysis: {str(e)}")


def generate_basic_data_audit(csv_file_path: str) -> str:
    """
    Generate basic data audit including file info, dimensions, and basic checks
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with basic data audit
    """
    try:
        import os
        
        # File-level information
        file_size_mb = os.path.getsize(csv_file_path) / (1024 * 1024)
        
        # Load data
        data = pd.read_csv(csv_file_path)
        
        # Basic checks
        total_cells = len(data) * len(data.columns)
        missing_cells = data.isnull().sum().sum()
        duplicate_rows = data.duplicated().sum()
        
        return f"""
        <vds-container>
            <vds-info-panel>
                <vds-title>Basic Data Audit</vds-title>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Data File Path</td><td class="vds-value">{csv_file_path}</td></tr>
                    <tr><td class="vds-label">File Size</td><td class="vds-value">{file_size_mb:.2f} MB</td></tr>
                    <tr><td class="vds-label">Number of Rows</td><td class="vds-value">{len(data):,}</td></tr>
                    <tr><td class="vds-label">Number of Columns</td><td class="vds-value">{len(data.columns)}</td></tr>
                    <tr><td class="vds-label">Total Cells</td><td class="vds-value">{total_cells:,}</td></tr>
                    <tr><td class="vds-label">Missing Cells</td><td class="vds-value">{missing_cells:,} ({(missing_cells/total_cells)*100:.2f}%)</td></tr>
                    <tr><td class="vds-label">Duplicate Rows</td><td class="vds-value">{duplicate_rows:,}</td></tr>
                    <tr><td class="vds-label">Data Accessibility</td><td class="vds-value">✓ Normal</td></tr>
                </table>
            </vds-info-panel>
        </vds-container>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in basic data audit: {str(e)}")


def generate_data_type_analysis(csv_file_path: str) -> str:
    """
    Generate detailed data type analysis with conversion suggestions
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with data type analysis
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        type_analysis = {}
        conversion_suggestions = []
        
        for col in data.columns:
            col_data = data[col]
            analysis = {
                'dtype': str(col_data.dtype),
                'non_null_count': col_data.count(),
                'null_count': col_data.isnull().sum(),
                'unique_count': col_data.nunique(),
                'memory_usage': col_data.memory_usage(deep=True)
            }
            
            # Check for potential type conversions
            if col_data.dtype == 'object':
                # Try to convert to numeric
                try:
                    numeric_converted = pd.to_numeric(col_data, errors='coerce')
                    if not numeric_converted.isnull().all():
                        conversion_rate = (1 - numeric_converted.isnull().sum() / len(col_data))
                        analysis['potential_numeric'] = True
                        analysis['numeric_conversion_rate'] = conversion_rate
                        if conversion_rate > 0.8:
                            conversion_suggestions.append(f"Suggest converting {col} to numeric type (conversion rate: {conversion_rate:.1%})")
                except:
                    pass
                
                # Check if should be categorical
                if analysis['unique_count'] < len(data) * 0.5:
                    conversion_suggestions.append(f"Suggest converting {col} to categorical type (unique value rate: {analysis['unique_count']/len(data):.1%})")
            
            type_analysis[col] = analysis
        
        # Create HTML report
        report_html = f"""
        <vds-container>
            <vds-info-panel>
                <vds-title>Data Type Analysis</vds-title>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Analyzed Columns</td><td class="vds-value">{len(type_analysis)}</td></tr>
                    <tr><td class="vds-label">Conversion Suggestions</td><td class="vds-value">{len(conversion_suggestions)}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Detailed Type Analysis</vds-title>
                <table class="vds-type-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Column Name</th>
                            <th class="vds-col-header">Data Type</th>
                            <th class="vds-col-header">Non-null Values</th>
                            <th class="vds-col-header">Unique Values</th>
                            <th class="vds-col-header">Memory Usage</th>
                            <th class="vds-col-header">Conversion Suggestions</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for col, info in type_analysis.items():
            memory_mb = info['memory_usage'] / 1024 / 1024
            suggestions = []
            if info.get('potential_numeric', False) and info['numeric_conversion_rate'] > 0.8:
                suggestions.append("→Numeric")
            elif info['dtype'] == 'object' and info['unique_count'] < len(data) * 0.5:
                suggestions.append("→Categorical")
            suggestion_text = ", ".join(suggestions) if suggestions else "None"
            
            report_html += f"""
                        <tr>
                            <td class="vds-col-name">{col}</td>
                            <td class="vds-dtype">{info['dtype']}</td>
                            <td class="vds-count">{info['non_null_count']:,}</td>
                            <td class="vds-count">{info['unique_count']:,}</td>
                            <td class="vds-memory">{memory_mb:.3f} MB</td>
                            <td class="vds-suggestion">{suggestion_text}</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        """
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in data type analysis: {str(e)}")


def generate_temporal_analysis(csv_file_path: str) -> str:
    """
    Generate temporal dimension analysis for time-related columns
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with temporal analysis
    """
    try:
        import re
        from datetime import datetime
        
        data = pd.read_csv(csv_file_path)
        
        temporal_analysis = {
            'temporal_columns': [],
            'time_span': None,
            'frequency': None,
            'continuity': None,
            'temporal_patterns': []
        }
        
        # Identify time-related columns
        time_patterns = [
            r'.*date.*', r'.*time.*', r'.*year.*', r'.*month.*', r'.*day.*',
            r'.*year.*', r'.*month.*', r'.*day.*', r'.*created.*', r'.*updated.*'
        ]
        
        found_columns = []
        for col in data.columns:
            col_lower = col.lower()
            is_temporal = any(re.match(pattern, col_lower, re.IGNORECASE) for pattern in time_patterns)
            
            if is_temporal:
                temporal_analysis['temporal_columns'].append(col)
                
                col_info = {'column': col, 'type': 'unknown', 'analysis': []}
                
                # Try to parse as datetime
                try:
                    if data[col].dtype == 'object':
                        parsed_dates = pd.to_datetime(data[col], errors='coerce')
                        if not parsed_dates.isnull().all():
                            col_info['type'] = 'datetime'
                            col_info['analysis'].append(f"Successfully parsed as date format")
                            
                            time_span = (parsed_dates.max() - parsed_dates.min()).days
                            col_info['analysis'].append(f"Time span: {time_span} days")
                            
                            # Analyze frequency
                            time_diffs = parsed_dates.diff().dropna()
                            if len(time_diffs) > 0:
                                median_diff = time_diffs.median()
                                if median_diff.days >= 30:
                                    frequency = "Monthly"
                                elif median_diff.days >= 7:
                                    frequency = "Weekly"
                                elif median_diff.days >= 1:
                                    frequency = "Daily"
                                else:
                                    frequency = "High-frequency"
                                col_info['analysis'].append(f"Collection frequency: {frequency}")
                except Exception as e:
                    col_info['analysis'].append(f"Time parsing failed: {str(e)}")
            
            elif data[col].dtype in ['int64', 'float64']:
                if 'timestamp' in col_lower or 'epoch' in col_lower:
                    temporal_analysis['temporal_columns'].append(col)
                    col_info = {'column': col, 'type': 'timestamp', 'analysis': ['Found timestamp column']}
                    found_columns.append(col_info)
                    continue
            
            if is_temporal:
                found_columns.append(col_info)
        
        # Create HTML report
        if found_columns:
            report_html = f"""
            <vds-container>
                <vds-info-panel>
                    <vds-title>Temporal Dimension Analysis</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Time-related Columns Found</td><td class="vds-value">{len(found_columns)}</td></tr>
                        <tr><td class="vds-label">Total Dataset Rows</td><td class="vds-value">{len(data):,}</td></tr>
                    </table>
                </vds-info-panel>
                
                <vds-section>
                    <vds-title>Detailed Time Column Analysis</vds-title>
                    <table class="vds-temporal-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Column Name</th>
                                <th class="vds-col-header">Type</th>
                                <th class="vds-col-header">Analysis Results</th>
                            </tr>
                        </thead>
                        <tbody>
            """
            
            for col_info in found_columns:
                analysis_text = "; ".join(col_info['analysis'])
                report_html += f"""
                            <tr>
                                <td class="vds-col-name">{col_info['column']}</td>
                                <td class="vds-type">{col_info['type']}</td>
                                <td class="vds-analysis">{analysis_text}</td>
                            </tr>
                """
            
            report_html += """
                        </tbody>
                    </table>
                </vds-section>
            </vds-container>
            """
        else:
            report_html = """
            <vds-container>
                <vds-info-panel>
                    <vds-title>Temporal Dimension Analysis</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Time-related Columns</td><td class="vds-value">Not Found</td></tr>
                        <tr><td class="vds-label">Data Type</td><td class="vds-value">Likely cross-sectional data with no obvious temporal dimension</td></tr>
                    </table>
                </vds-info-panel>
            </vds-container>
            """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in temporal analysis: {str(e)}")


def generate_spatial_analysis(csv_file_path: str) -> str:
    """
    Generate spatial dimension analysis for location-related columns
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with spatial analysis
    """
    try:
        import re
        
        data = pd.read_csv(csv_file_path)
        
        # Identify spatial-related columns
        spatial_patterns = [
            r'.*address.*', r'.*location.*', r'.*coordinate.*', r'.*longitude.*', r'.*latitude.*',
            r'.*address.*', r'.*location.*', r'.*coordinate.*', r'.*longitude.*', r'.*latitude.*',
            r'.*city.*', r'.*province.*', r'.*country.*', r'.*region.*', r'.*area.*',
            r'.*city.*', r'.*province.*', r'.*country.*', r'.*region.*', r'.*area.*',
            r'.*postal.*', r'.*zip.*', r'.*postcode.*'
        ]
        
        found_columns = []
        for col in data.columns:
            col_lower = col.lower()
            is_spatial = any(re.match(pattern, col_lower, re.IGNORECASE) for pattern in spatial_patterns)
            
            if is_spatial:
                col_info = {'column': col, 'analysis': []}
                
                if data[col].dtype == 'object':
                    unique_locations = data[col].nunique()
                    total_records = len(data)
                    
                    col_info['analysis'].append(f"Unique locations: {unique_locations}")
                    col_info['analysis'].append(f"Spatial coverage rate: {unique_locations/total_records:.3f}")
                    
                    # Location distribution
                    location_counts = data[col].value_counts()
                    top_location = location_counts.index[0] if len(location_counts) > 0 else "N/A"
                    col_info['analysis'].append(f"Most frequent location: {top_location} ({location_counts.iloc[0]} times)")
                    
                    # Sampling uniformity
                    count_std = location_counts.std()
                    count_mean = location_counts.mean()
                    uniformity_score = 1 - min(count_std / count_mean, 1) if count_mean > 0 else 0
                    col_info['analysis'].append(f"Sampling uniformity: {uniformity_score:.3f}")
                    
                elif data[col].dtype in ['int64', 'float64']:
                    # Numeric spatial data (like coordinates)
                    col_info['analysis'].append(f"Value range: {data[col].min()} to {data[col].max()}")
                    col_info['analysis'].append(f"Standard deviation: {data[col].std():.3f}")
                
                found_columns.append(col_info)
        
        # Create HTML report
        if found_columns:
            report_html = f"""
            <vds-container>
                <vds-info-panel>
                    <vds-title>Spatial Dimension Analysis</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Spatial-related Columns Found</td><td class="vds-value">{len(found_columns)}</td></tr>
                        <tr><td class="vds-label">Total Dataset Rows</td><td class="vds-value">{len(data):,}</td></tr>
                    </table>
                </vds-info-panel>
                
                <vds-section>
                    <vds-title>Detailed Spatial Column Analysis</vds-title>
                    <table class="vds-spatial-table">
                        <thead>
                            <tr>
                                <th class="vds-col-header">Column Name</th>
                                <th class="vds-col-header">Analysis Results</th>
                            </tr>
                        </thead>
                        <tbody>
            """
            
            for col_info in found_columns:
                analysis_text = "; ".join(col_info['analysis'])
                report_html += f"""
                            <tr>
                                <td class="vds-col-name">{col_info['column']}</td>
                                <td class="vds-analysis">{analysis_text}</td>
                            </tr>
                """
            
            report_html += """
                        </tbody>
                    </table>
                </vds-section>
            </vds-container>
            """
        else:
            report_html = """
            <vds-container>
                <vds-info-panel>
                    <vds-title>Spatial Dimension Analysis</vds-title>
                    <table class="vds-info-table">
                        <tr><td class="vds-label">Spatial-related Columns</td><td class="vds-value">Not Found</td></tr>
                        <tr><td class="vds-label">Data Type</td><td class="vds-value">Data may have no obvious spatial dimension</td></tr>
                    </table>
                </vds-info-panel>
            </vds-container>
            """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in spatial analysis: {str(e)}")


def generate_multicollinearity_analysis(csv_file_path: str) -> str:
    """
    Generate multicollinearity analysis with VIF calculations and correlation matrix
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML report with multicollinearity analysis
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        # Get numeric columns only
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return _create_info_report("At least 2 numeric columns are required for multicollinearity analysis")
        
        # Fill missing values
        data_processed = data[numeric_cols].fillna(data[numeric_cols].mean())
        
        # Calculate correlation matrix
        correlation_matrix = data_processed.corr()
        
        # Find highly correlated pairs
        high_correlation_pairs = []
        correlation_threshold = 0.9
        
        for i in range(len(correlation_matrix.columns)):
            for j in range(i+1, len(correlation_matrix.columns)):
                var1 = correlation_matrix.columns[i]
                var2 = correlation_matrix.columns[j]
                corr_value = correlation_matrix.iloc[i, j]
                
                if abs(corr_value) > correlation_threshold:
                    high_correlation_pairs.append({
                        'var1': var1,
                        'var2': var2,
                        'correlation': corr_value
                    })
        
        # VIF Analysis (for smaller datasets)
        vif_results = []
        if len(numeric_cols) <= 20:
            try:
                from statsmodels.stats.outliers_influence import variance_inflation_factor
                from statsmodels.tools.tools import add_constant
                
                # Remove columns with zero variance
                data_for_vif = data_processed.loc[:, data_processed.std() > 0]
                
                if len(data_for_vif.columns) > 1:
                    data_with_const = add_constant(data_for_vif)
                    
                    for i, col in enumerate(data_for_vif.columns):
                        try:
                            vif = variance_inflation_factor(data_with_const.values, i+1)
                            vif_level = "Very High" if vif > 10 else "High" if vif > 5 else "Medium" if vif > 2 else "Low"
                            vif_results.append({
                                'variable': col,
                                'vif': vif,
                                'level': vif_level
                            })
                        except:
                            vif_results.append({
                                'variable': col,
                                'vif': 'N/A',
                                'level': 'Calculation Failed'
                            })
            except ImportError:
                vif_results = [{'note': 'VIF analysis requires statsmodels library'}]
        
        # Create HTML report
        report_html = f"""
        <vds-container>
            <vds-info-panel>
                <vds-title>Multicollinearity Detection</vds-title>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Analyzed Variables</td><td class="vds-value">{len(numeric_cols)}</td></tr>
                    <tr><td class="vds-label">High Correlation Variable Pairs</td><td class="vds-value">{len(high_correlation_pairs)} (|r| > {correlation_threshold})</td></tr>
                    <tr><td class="vds-label">Correlation Threshold</td><td class="vds-value">{correlation_threshold}</td></tr>
                </table>
            </vds-info-panel>
        """
        
        if high_correlation_pairs:
            report_html += """
            <vds-section>
                <vds-title>Highly Correlated Variable Pairs</vds-title>
                <table class="vds-correlation-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Variable 1</th>
                            <th class="vds-col-header">Variable 2</th>
                            <th class="vds-col-header">Correlation</th>
                            <th class="vds-col-header">Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for pair in high_correlation_pairs:
                corr_class = "vds-corr-danger" if abs(pair['correlation']) > 0.95 else "vds-corr-warning"
                suggestion = "Consider removal" if abs(pair['correlation']) > 0.95 else "Monitor multicollinearity"
                
                report_html += f"""
                            <tr class="{corr_class}">
                                <td class="vds-var-name">{pair['var1']}</td>
                                <td class="vds-var-name">{pair['var2']}</td>
                                <td class="vds-corr-value">{pair['correlation']:.3f}</td>
                                <td class="vds-suggestion">{suggestion}</td>
                            </tr>
                """
            
            report_html += """
                    </tbody>
                </table>
            </vds-section>
            """
        
        if vif_results and 'note' not in vif_results[0]:
            report_html += """
            <vds-section>
                <vds-title>Variance Inflation Factor (VIF) Analysis</vds-title>
                <table class="vds-vif-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Variable</th>
                            <th class="vds-col-header">VIF Value</th>
                            <th class="vds-col-header">Multicollinearity Level</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for result in vif_results:
                vif_class = "vds-vif-danger" if isinstance(result['vif'], (int, float)) and result['vif'] > 10 else "vds-vif-warning" if isinstance(result['vif'], (int, float)) and result['vif'] > 5 else "vds-vif-good"
                vif_display = f"{result['vif']:.2f}" if isinstance(result['vif'], (int, float)) else str(result['vif'])
                
                report_html += f"""
                            <tr class="{vif_class}">
                                <td class="vds-var-name">{result['variable']}</td>
                                <td class="vds-vif-value">{vif_display}</td>
                                <td class="vds-vif-level">{result['level']}</td>
                            </tr>
                """
            
            report_html += """
                    </tbody>
                </table>
            </vds-section>
            """
        
        # Summary and recommendations
        multicollinear_vars = set()
        for pair in high_correlation_pairs:
            multicollinear_vars.add(pair['var2'])  # Mark second variable for potential removal
        
        high_vif_vars = [r['variable'] for r in vif_results if isinstance(r.get('vif'), (int, float)) and r['vif'] > 10]
        all_problematic = list(multicollinear_vars) + high_vif_vars
        unique_problematic = list(set(all_problematic))
        
        if unique_problematic:
            report_html += f"""
            <vds-section>
                <vds-title>Recommended Variables for Removal</vds-title>
                <p>Found {len(unique_problematic)} variables with multicollinearity issues:</p>
                <ul class="vds-recommendation-list">
            """
            for var in unique_problematic:
                report_html += f"<li>{var}</li>"
            report_html += """
                </ul>
            </vds-section>
            """
        
        report_html += "</vds-container>"
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in multicollinearity analysis: {str(e)}")