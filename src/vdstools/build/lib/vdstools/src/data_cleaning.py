"""
Data cleaning tools - Wrapper for ml_tools functions
Provide stable data processing methods for common data issues
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
from ..utils.display import Display

from ..core.ml_tools import (
    fill_missing_values_tools,
    remove_columns_tools, 
    handle_outliers_tools,
    encode_categorical_tools
)

class DataCleaning(Display):
    """
    VDS Tools Data Cleaning Toolkit - Comprehensive data cleaning and preprocessing
    
    This class provides a unified interface for common data cleaning operations
    including missing value handling, outlier detection, duplicate removal,
    and data type optimization with rich HTML reporting.
    """
    
    def __init__(self):
        """Initialize DataCleaningToolkit"""
        super().__init__()
    
    def clean_invalid_values(self, csv_file_path: str, **kwargs):
        """
        Clean invalid values in dataset (negative values, extreme outliers)
        
        Args:
            csv_file_path: Path to CSV file
            **kwargs: Additional parameters for customization
        """
        html_content = apply_cleaning_method(csv_file_path, "remove_invalid_values", **kwargs)
        self.show(html_content)
    
    def fill_missing_values(self, csv_file_path: str, **kwargs):
        """
        Fill missing values using appropriate strategies
        
        Args:
            csv_file_path: Path to CSV file
            **kwargs: Additional parameters (method, columns, etc.)
        """
        html_content = apply_cleaning_method(csv_file_path, "fill_missing_values", **kwargs)
        self.show(html_content)
    
    def remove_outliers(self, csv_file_path: str, **kwargs):
        """
        Remove or clip outliers using statistical methods
        
        Args:
            csv_file_path: Path to CSV file
            **kwargs: Additional parameters (method, sensitivity, etc.)
        """
        html_content = apply_cleaning_method(csv_file_path, "remove_outliers", **kwargs)
        self.show(html_content)
    
    def remove_duplicates(self, csv_file_path: str, **kwargs):
        """
        Remove duplicate rows from dataset
        
        Args:
            csv_file_path: Path to CSV file
            **kwargs: Additional parameters
            
        Returns:
            HTML formatted cleaning report
        """
        return apply_cleaning_method(csv_file_path, "remove_duplicates", **kwargs)
    
    def optimize_data_types(self, csv_file_path: str, **kwargs):
        """
        Optimize data types for better memory usage
        
        Args:
            csv_file_path: Path to CSV file
            **kwargs: Additional parameters
            
        Returns:
            HTML formatted cleaning report
        """
        return apply_cleaning_method(csv_file_path, "fix_data_types", **kwargs)
    
    def advanced_missing_fill(self, csv_file_path: str, target_columns: Union[str, List[str]], 
                             method: str = 'auto', group_columns: Optional[Union[str, List[str]]] = None,
                             time_column: Optional[str] = None, fill_value: Optional[Any] = None,
                             max_group_null_ratio: float = 0.8):
        """
        Advanced missing values filling with grouping and time-series support
        
        Args:
            csv_file_path: Path to CSV file
            target_columns: Columns to fill missing values
            method: Filling method ('auto', 'mean', 'median', 'mode', 'ffill', 'bfill', 'interpolate', 'constant', 'knn')
            group_columns: Grouping columns for group-based filling
            time_column: Time column for time-series filling
            fill_value: Value for constant filling
            max_group_null_ratio: Maximum allowed null ratio within groups
            
        Returns:
            HTML formatted report with filling results
        """
        return advanced_fill_missing_values(
            csv_file_path, target_columns, method, group_columns,
            time_column, fill_value, max_group_null_ratio
        )
    
    def advanced_column_removal(self, csv_file_path: str, strategy: Union[str, List[str], None] = None,
                               columns: Optional[List[str]] = None, threshold: Union[float, Dict[str, float]] = 0.5,
                               exclude_columns: Optional[List[str]] = None, min_unique_ratio: float = 0.01,
                               correlation_threshold: float = 0.95):
        """
        Advanced column removal with multiple strategies
        
        Args:
            csv_file_path: Path to CSV file
            strategy: Removal strategy ('missing', 'constant', 'correlation', 'variance')
            columns: Direct columns to remove
            threshold: Threshold values for strategies
            exclude_columns: Columns to exclude from removal
            min_unique_ratio: Minimum unique value ratio
            correlation_threshold: Correlation threshold
            
        Returns:
            HTML formatted report with removal results
        """
        return remove_columns_advanced(
            csv_file_path, strategy, columns, threshold,
            exclude_columns, min_unique_ratio, correlation_threshold
        )
    
    def advanced_outlier_handling(self, csv_file_path: str, target_columns: Union[str, List[str]],
                                 method: str = 'iqr', strategy: str = 'clip', sensitivity: str = 'medium',
                                 group_columns: Optional[Union[str, List[str]]] = None):
        """
        Advanced outlier detection and handling
        
        Args:
            csv_file_path: Path to CSV file
            target_columns: Columns to process for outliers
            method: Detection method ('iqr', 'zscore', 'isolation_forest', 'dbscan', 'mad')
            strategy: Handling strategy ('clip', 'remove')
            sensitivity: Detection sensitivity ('low', 'medium', 'high')
            group_columns: Grouping columns
            
        Returns:
            HTML formatted report with outlier handling results
        """
        return advanced_outlier_detection(
            csv_file_path, target_columns, method, strategy, sensitivity, group_columns
        )
    
    def encode_categorical_data(self, csv_file_path: str, target_columns: Union[str, List[str]],
                               method: str = 'auto', group_columns: Optional[Union[str, List[str]]] = None,
                               handle_unknown: str = 'ignore', keep_original: bool = True):
        """
        Advanced categorical encoding
        
        Args:
            csv_file_path: Path to CSV file
            target_columns: Columns to encode
            method: Encoding method ('auto', 'label', 'onehot', 'frequency', 'count')
            group_columns: Grouping columns for group-based encoding
            handle_unknown: How to handle unknown categories
            keep_original: Whether to keep original columns
            
        Returns:
            HTML formatted report with encoding results
        """
        return categorical_encoding_advanced(
            csv_file_path, target_columns, method, group_columns, handle_unknown, keep_original
        )
    
    def help(self):
        """
        Display comprehensive help information for agents and users
        
        This function provides detailed documentation about the DataCleaningToolkit class,
        its methods, parameters, and usage scenarios for AI agents to understand and use.
        """
        help_content = """
        =============================================================================
        VDS TOOLS - DATA CLEANING TOOLKIT HELP
        =============================================================================
        
        OVERVIEW:
        The DataCleaningToolkit class provides comprehensive data cleaning functionality
        with intelligent automation and rich HTML reporting. It handles common data
        quality issues including missing values, outliers, duplicates, and data types.
        
        CLASS INITIALIZATION:
        ---------------------
        toolkit = DataCleaningToolkit()
        
        BASIC CLEANING METHODS:
        =======================
        
        1. clean_invalid_values(csv_file_path, **kwargs) -> str
        -------------------------------------------------------
        PURPOSE: Clean invalid values (negative values in positive columns, extreme outliers)
        WHEN TO USE: Data contains obviously incorrect values, data entry errors
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - **kwargs: Additional customization parameters
        OUTPUT: HTML report with issues fixed and output file path
        EXAMPLE:
        result = toolkit.clean_invalid_values("data.csv")
        # Agent use case: "Clean up invalid values in the dataset"
        
        2. fill_missing_values(csv_file_path, **kwargs) -> str
        -------------------------------------------------------
        PURPOSE: Fill missing values using appropriate strategies
        WHEN TO USE: Dataset has missing values that need to be handled
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - **kwargs: Additional parameters for customization
        OUTPUT: HTML report with missing value filling results
        EXAMPLE:
        result = toolkit.fill_missing_values("data.csv")
        # Agent use case: "Handle missing values in the dataset"
        
        3. remove_outliers(csv_file_path, **kwargs) -> str
        ---------------------------------------------------
        PURPOSE: Remove or clip outliers using statistical methods
        WHEN TO USE: Dataset contains outliers that affect analysis
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - **kwargs: Method-specific parameters
        OUTPUT: HTML report with outlier handling results
        EXAMPLE:
        result = toolkit.remove_outliers("data.csv")
        # Agent use case: "Remove outliers from numeric columns"
        
        4. remove_duplicates(csv_file_path, **kwargs) -> str
        -----------------------------------------------------
        PURPOSE: Remove duplicate rows from dataset
        WHEN TO USE: Dataset contains duplicate entries
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - **kwargs: Additional parameters
        OUTPUT: HTML report with duplicate removal results
        EXAMPLE:
        result = toolkit.remove_duplicates("data.csv")
        # Agent use case: "Remove duplicate rows from the dataset"
        
        5. optimize_data_types(csv_file_path, **kwargs) -> str
        -------------------------------------------------------
        PURPOSE: Optimize data types for better memory usage and processing
        WHEN TO USE: Dataset has inefficient data types, high memory usage
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - **kwargs: Optimization parameters
        OUTPUT: HTML report with data type optimization results
        EXAMPLE:
        result = toolkit.optimize_data_types("data.csv")
        # Agent use case: "Optimize data types to reduce memory usage"
        
        ADVANCED CLEANING METHODS:
        ==========================
        
        6. advanced_missing_fill(csv_file_path, target_columns, method='auto', ...) -> str
        -----------------------------------------------------------------------------------
        PURPOSE: Advanced missing value filling with grouping and time-series support
        WHEN TO USE: Complex missing value patterns, need sophisticated filling strategies
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - target_columns (str|List[str]): Columns to fill
        - method (str): 'auto', 'mean', 'median', 'mode', 'ffill', 'bfill', 'interpolate', 'constant', 'knn'
        - group_columns (str|List[str], optional): Columns for group-based filling
        - time_column (str, optional): Time column for time-series filling
        - fill_value (Any, optional): Value for constant filling
        - max_group_null_ratio (float): Maximum null ratio in groups (default: 0.8)
        OUTPUT: Detailed HTML report with column-wise filling results
        EXAMPLE:
        result = toolkit.advanced_missing_fill("data.csv", ["age", "income"], method="median")
        # Agent use case: "Fill missing values in age and income columns using median"
        
        7. advanced_column_removal(csv_file_path, strategy=None, ...) -> str
        -------------------------------------------------------------------
        PURPOSE: Remove columns based on multiple strategies (missing ratio, correlation, etc.)
        WHEN TO USE: Need to reduce dimensionality, remove redundant or poor-quality columns
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - strategy (str|List[str]): 'missing', 'constant', 'correlation', 'variance'
        - columns (List[str], optional): Direct columns to remove
        - threshold (float|Dict): Threshold values for strategies (default: 0.5)
        - exclude_columns (List[str], optional): Columns to protect from removal
        - min_unique_ratio (float): Minimum unique value ratio (default: 0.01)
        - correlation_threshold (float): High correlation threshold (default: 0.95)
        OUTPUT: HTML report with removed columns and reasons
        EXAMPLE:
        result = toolkit.advanced_column_removal("data.csv", strategy="missing", threshold=0.3)
        # Agent use case: "Remove columns with more than 30% missing values"
        
        8. advanced_outlier_handling(csv_file_path, target_columns, method='iqr', ...) -> str
        --------------------------------------------------------------------------------------
        PURPOSE: Sophisticated outlier detection and handling with multiple methods
        WHEN TO USE: Need precise outlier control, group-based outlier detection
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - target_columns (str|List[str]): Columns to process
        - method (str): 'iqr', 'zscore', 'isolation_forest', 'dbscan', 'mad' (default: 'iqr')
        - strategy (str): 'clip', 'remove' (default: 'clip')
        - sensitivity (str): 'low', 'medium', 'high' (default: 'medium')
        - group_columns (str|List[str], optional): Grouping columns
        OUTPUT: Detailed HTML report with outlier detection results
        EXAMPLE:
        result = toolkit.advanced_outlier_handling("data.csv", ["price", "quantity"], method="zscore")
        # Agent use case: "Detect and handle outliers in price and quantity using z-score method"
        
        9. encode_categorical_data(csv_file_path, target_columns, method='auto', ...) -> str
        -----------------------------------------------------------------------------------
        PURPOSE: Encode categorical variables using various methods
        WHEN TO USE: Need to convert categorical data for machine learning
        PARAMETERS:
        - csv_file_path (str): Path to CSV file
        - target_columns (str|List[str]): Columns to encode
        - method (str): 'auto', 'label', 'onehot', 'frequency', 'count' (default: 'auto')
        - group_columns (str|List[str], optional): Grouping columns
        - handle_unknown (str): How to handle new categories (default: 'ignore')
        - keep_original (bool): Keep original columns (default: True)
        OUTPUT: HTML report with encoding results and new columns
        EXAMPLE:
        result = toolkit.encode_categorical_data("data.csv", ["category", "region"], method="onehot")
        # Agent use case: "One-hot encode the category and region columns"
        
        AGENT USAGE SCENARIOS:
        ======================
        
        1. COMPREHENSIVE DATA CLEANING:
        When agent needs to clean a messy dataset:
        toolkit = DataCleaningToolkit()
        # Step 1: Handle invalid values
        result1 = toolkit.clean_invalid_values("raw_data.csv")
        # Step 2: Fill missing values
        result2 = toolkit.fill_missing_values("raw_data_invalid_values_fixed.csv")
        # Step 3: Remove outliers
        result3 = toolkit.remove_outliers("raw_data_missing_values_fixed.csv")
        
        2. TARGETED CLEANING:
        When agent needs specific cleaning operations:
        # Remove columns with high missing values
        result = toolkit.advanced_column_removal("data.csv", strategy="missing", threshold=0.4)
        
        3. PREPROCESSING FOR ML:
        When preparing data for machine learning:
        # Encode categorical variables
        result1 = toolkit.encode_categorical_data("data.csv", ["category"], method="onehot")
        # Optimize data types
        result2 = toolkit.optimize_data_types("data_categorical_encoded.csv")
        
        4. QUALITY ASSESSMENT AND FIXING:
        When agent needs to assess and fix data quality:
        # Remove duplicates first
        result1 = toolkit.remove_duplicates("data.csv")
        # Then handle missing values strategically
        result2 = toolkit.advanced_missing_fill("data_duplicates_removed.csv", 
                                               ["important_col"], method="median")
        
        OUTPUT FORMAT:
        ==============
        All methods return HTML strings using custom vds- tags:
        - vds-cleaning-report: Main cleaning report container
        - vds-info-panel: Summary information
        - vds-section: Detailed results sections
        - Progress tracking with issue counts and file paths
        
        ERROR HANDLING:
        ===============
        All methods include comprehensive error handling and return
        structured HTML error reports when issues occur.
        
        INTEGRATION TIPS FOR AGENTS:
        ============================
        1. Always start with basic cleaning methods for general issues
        2. Use advanced methods for specific, complex requirements
        3. Check output file paths in reports for chaining operations
        4. Monitor memory usage with optimize_data_types()
        5. Use appropriate methods based on data type (numeric vs categorical)
        6. Consider order: invalid values → duplicates → missing values → outliers → encoding
        7. Preserve important columns using exclude_columns parameter
        
        FILE OUTPUT PATTERN:
        ===================
        Methods create new files with descriptive suffixes:
        - original.csv → original_invalid_values_fixed.csv
        - original.csv → original_missing_values_fixed.csv
        - original.csv → original_outliers_fixed.csv
        - original.csv → original_duplicates_removed.csv
        - original.csv → original_types_optimized.csv
        
        =============================================================================
        """
        self.show(help_content)


def apply_cleaning_method(csv_file_path: str, method: str, **kwargs) -> str:
    """
    Apply data cleaning method and return HTML report
    
    Args:
        csv_file_path: Path to CSV file
        method: Cleaning method name
        **kwargs: Method-specific parameters
        
    Returns:
        HTML formatted cleaning report
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if method == "remove_invalid_values":
            return _handle_invalid_values(data, csv_file_path, **kwargs)
        elif method == "fill_missing_values":
            return _handle_missing_values(data, csv_file_path, **kwargs)
        elif method == "remove_outliers":
            return _handle_outliers(data, csv_file_path, **kwargs)
        elif method == "remove_duplicates":
            return _handle_duplicates(data, csv_file_path, **kwargs)
        elif method == "fix_data_types":
            return _fix_data_types(data, csv_file_path, **kwargs)
        else:
            return _create_error_report(f"Unknown cleaning method: {method}")
            
    except Exception as e:
        return _create_error_report(f"Error in cleaning process: {str(e)}")


def _handle_invalid_values(data: pd.DataFrame, csv_file_path: str, **kwargs) -> str:
    """Handle invalid values in dataset"""
    issues_fixed = []
    
    # Check for common invalid value patterns
    for col in data.columns:
        if pd.api.types.is_numeric_dtype(data[col]):
            # Check for negative values in columns that should be positive
            if col.lower() in ['age', 'price', 'amount', 'count', 'area', 'size']:
                negative_count = (data[col] < 0).sum()
                if negative_count > 0:
                    data[col] = data[col].abs()  # Convert to absolute values
                    issues_fixed.append(f"Fixed {negative_count} negative values in {col}")
            
            # Check for extremely large values (potential data entry errors)
            q99 = data[col].quantile(0.99)
            q75 = data[col].quantile(0.75)
            if q99 > q75 * 10:  # If 99th percentile is 10x larger than 75th percentile
                outlier_count = (data[col] > q99).sum()
                data.loc[data[col] > q99, col] = q99  # Cap at 99th percentile
                issues_fixed.append(f"Capped {outlier_count} extreme values in {col}")
    
    # Save cleaned data
    output_path = csv_file_path.replace('.csv', '_invalid_values_fixed.csv')
    data.to_csv(output_path, index=False)
    
    return _create_cleaning_report("Invalid Values Cleaning", issues_fixed, output_path)


def _handle_missing_values(data: pd.DataFrame, csv_file_path: str, **kwargs) -> str:
    """Handle missing values using ml_tools"""
    issues_fixed = []
    
    try:
        # Get columns with missing values
        missing_cols = data.columns[data.isnull().any()].tolist()
        
        if not missing_cols:
            return _create_info_report("No missing values found in dataset")
        
        # Apply different strategies based on column type and missing ratio
        for col in missing_cols:
            missing_ratio = data[col].isnull().sum() / len(data)
            
            if missing_ratio > 0.5:
                # Remove columns with >50% missing values
                data = data.drop(columns=[col])
                issues_fixed.append(f"Removed column '{col}' (missing ratio: {missing_ratio:.1%})")
            else:
                # Fill missing values using appropriate method
                if pd.api.types.is_numeric_dtype(data[col]):
                    method = 'median' if missing_ratio > 0.1 else 'mean'
                else:
                    method = 'mode'
                
                original_nulls = data[col].isnull().sum()
                
                if 'fill_missing_values_tools' in globals():
                    data = fill_missing_values_tools(data, col, method=method)
                else:
                    # Fallback implementation
                    if method == 'median':
                        data[col].fillna(data[col].median(), inplace=True)
                    elif method == 'mean':
                        data[col].fillna(data[col].mean(), inplace=True)
                    elif method == 'mode':
                        mode_val = data[col].mode()
                        if len(mode_val) > 0:
                            data[col].fillna(mode_val[0], inplace=True)
                
                filled_count = original_nulls - data[col].isnull().sum()
                issues_fixed.append(f"Filled {filled_count} missing values in '{col}' using {method}")
        
    except Exception as e:
        issues_fixed.append(f"Error in missing value handling: {str(e)}")
    
    # Save cleaned data
    output_path = csv_file_path.replace('.csv', '_missing_values_fixed.csv')
    data.to_csv(output_path, index=False)
    
    return _create_cleaning_report("Missing Values Cleaning", issues_fixed, output_path)


def _handle_outliers(data: pd.DataFrame, csv_file_path: str, **kwargs) -> str:
    """Handle outliers using ml_tools"""
    issues_fixed = []
    
    try:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            original_count = len(data)
            
            if 'handle_outliers_tools' in globals():
                data = handle_outliers_tools(
                    data, 
                    col, 
                    method='iqr', 
                    strategy='clip',
                    sensitivity='medium'
                )
            else:
                # Fallback IQR method
                Q1 = data[col].quantile(0.25)
                Q3 = data[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outliers_count = ((data[col] < lower_bound) | (data[col] > upper_bound)).sum()
                
                # Clip outliers
                data[col] = data[col].clip(lower=lower_bound, upper=upper_bound)
                
                if outliers_count > 0:
                    issues_fixed.append(f"Clipped {outliers_count} outliers in '{col}'")
        
    except Exception as e:
        issues_fixed.append(f"Error in outlier handling: {str(e)}")
    
    # Save cleaned data
    output_path = csv_file_path.replace('.csv', '_outliers_fixed.csv')
    data.to_csv(output_path, index=False)
    
    return _create_cleaning_report("Outliers Cleaning", issues_fixed, output_path)


def _handle_duplicates(data: pd.DataFrame, csv_file_path: str, **kwargs) -> str:
    """Handle duplicate rows"""
    original_count = len(data)
    data = data.drop_duplicates()
    duplicates_removed = original_count - len(data)
    
    issues_fixed = [f"Removed {duplicates_removed} duplicate rows"] if duplicates_removed > 0 else ["No duplicate rows found"]
    
    # Save cleaned data
    output_path = csv_file_path.replace('.csv', '_duplicates_removed.csv')
    data.to_csv(output_path, index=False)
    
    return _create_cleaning_report("Duplicate Removal", issues_fixed, output_path)


def _fix_data_types(data: pd.DataFrame, csv_file_path: str, **kwargs) -> str:
    """Fix data types for better memory usage and processing"""
    issues_fixed = []
    original_memory = data.memory_usage(deep=True).sum()
    
    try:
        for col in data.columns:
            if data[col].dtype == 'object':
                # Check if it's actually numeric
                try:
                    numeric_data = pd.to_numeric(data[col], errors='coerce')
                    if not numeric_data.isnull().all():
                        data[col] = numeric_data
                        issues_fixed.append(f"Converted '{col}' to numeric type")
                        continue
                except:
                    pass
                
                # Check if it should be categorical
                unique_ratio = data[col].nunique() / len(data)
                if unique_ratio < 0.1:  # Less than 10% unique values
                    data[col] = data[col].astype('category')
                    issues_fixed.append(f"Converted '{col}' to category type")
            
            elif data[col].dtype in ['int64', 'float64']:
                # Optimize numeric types
                if data[col].dtype == 'int64':
                    if data[col].min() >= 0 and data[col].max() <= 255:
                        data[col] = data[col].astype('uint8')
                        issues_fixed.append(f"Optimized '{col}' to uint8")
                    elif data[col].max() <= 32767:
                        data[col] = data[col].astype('int16')
                        issues_fixed.append(f"Optimized '{col}' to int16")
                elif data[col].dtype == 'float64':
                    data[col] = data[col].astype('float32')
                    issues_fixed.append(f"Optimized '{col}' to float32")
        
        new_memory = data.memory_usage(deep=True).sum()
        memory_saved = (original_memory - new_memory) / 1024 / 1024
        
        if memory_saved > 0:
            issues_fixed.append(f"Saved {memory_saved:.2f} MB of memory")
        
    except Exception as e:
        issues_fixed.append(f"Error in data type optimization: {str(e)}")
    
    # Save cleaned data
    output_path = csv_file_path.replace('.csv', '_types_optimized.csv')
    data.to_csv(output_path, index=False)
    
    return _create_cleaning_report("Data Type Optimization", issues_fixed, output_path)


def _create_cleaning_report(title: str, issues_fixed: List[str], output_path: str) -> str:
    """Create HTML report for cleaning operations"""
    issues_html = ""
    for issue in issues_fixed:
        issues_html += f'<tr><td class="vds-issue-item">✓ {issue}</td></tr>'
    
    return f"""
    <vds-cleaning-report>
        <vds-title>{title} Report</vds-title>
        <table class="vds-report-table">
            <thead>
                <tr><th class="vds-report-header">Issues Fixed</th></tr>
            </thead>
            <tbody>
                {issues_html}
            </tbody>
        </table>
        <vds-info-panel>
            <table class="vds-info-table">
                <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                <tr><td class="vds-label">Total Issues</td><td class="vds-value">{len(issues_fixed)}</td></tr>
            </table>
        </vds-info-panel>
    </vds-cleaning-report>
    """


def _create_error_report(error_message: str) -> str:
    """Create HTML error report"""
    return f"""
    <vds-error-panel>
        <table class="vds-error-table">
            <tr><td class="vds-error-label">Cleaning Error</td><td class="vds-error-value">{error_message}</td></tr>
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


def advanced_fill_missing_values(csv_file_path: str, target_columns: Union[str, List[str]], 
                                method: str = 'auto', group_columns: Optional[Union[str, List[str]]] = None,
                                time_column: Optional[str] = None, fill_value: Optional[Any] = None,
                                max_group_null_ratio: float = 0.8) -> str:
    """
    Advanced missing values filling with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        target_columns: Columns to fill missing values
        method: Filling method ('auto', 'mean', 'median', 'mode', 'ffill', 'bfill', 'interpolate', 'constant', 'knn')
        group_columns: Grouping columns for group-based filling
        time_column: Time column for time-series filling
        fill_value: Value for constant filling
        max_group_null_ratio: Maximum allowed null ratio within groups
        
    Returns:
        HTML formatted report with filling results
    """
    try:
        data = pd.read_csv(csv_file_path)
        original_missing = data.isnull().sum().sum()
        
        # Use ml_tools function if available
        if 'fill_missing_values_tools' in globals():
            cleaned_data = fill_missing_values_tools(
                data=data,
                target_columns=target_columns,
                method=method,
                group_columns=group_columns,
                time_column=time_column,
                fill_value=fill_value,
                max_group_null_ratio=max_group_null_ratio
            )
        else:
            # Fallback implementation
            cleaned_data = data.copy()
            if isinstance(target_columns, str):
                target_columns = [target_columns]
            
            for col in target_columns:
                if col in cleaned_data.columns:
                    if method == 'auto':
                        if pd.api.types.is_numeric_dtype(cleaned_data[col]):
                            cleaned_data[col].fillna(cleaned_data[col].mean(), inplace=True)
                        else:
                            mode_val = cleaned_data[col].mode()
                            if len(mode_val) > 0:
                                cleaned_data[col].fillna(mode_val[0], inplace=True)
        
        final_missing = cleaned_data.isnull().sum().sum()
        filled_count = original_missing - final_missing
        
        # Save cleaned data
        output_path = csv_file_path.replace('.csv', '_missing_filled_advanced.csv')
        cleaned_data.to_csv(output_path, index=False)
        
        # Create detailed report
        missing_info = []
        for col in target_columns if isinstance(target_columns, list) else [target_columns]:
            if col in data.columns:
                original_nulls = data[col].isnull().sum()
                final_nulls = cleaned_data[col].isnull().sum()
                filled = original_nulls - final_nulls
                if original_nulls > 0:
                    missing_info.append({
                        'column': col,
                        'original_missing': original_nulls,
                        'filled': filled,
                        'remaining': final_nulls,
                        'fill_rate': f"{(filled/original_nulls)*100:.1f}%" if original_nulls > 0 else "0%"
                    })
        
        report_html = f"""
        <vds-cleaning-report>
            <vds-title>Advanced Missing Values Filling Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Method Used</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Total Missing Before</td><td class="vds-value">{original_missing:,}</td></tr>
                    <tr><td class="vds-label">Total Filled</td><td class="vds-value">{filled_count:,}</td></tr>
                    <tr><td class="vds-label">Remaining Missing</td><td class="vds-value">{final_missing:,}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Column-wise Filling Results</vds-title>
                <table class="vds-detailed-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Column</th>
                            <th class="vds-col-header">Original Missing</th>
                            <th class="vds-col-header">Filled</th>
                            <th class="vds-col-header">Remaining</th>
                            <th class="vds-col-header">Fill Rate</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for info in missing_info:
            report_html += f"""
                        <tr>
                            <td class="vds-col-name">{info['column']}</td>
                            <td class="vds-missing-count">{info['original_missing']:,}</td>
                            <td class="vds-filled-count">{info['filled']:,}</td>
                            <td class="vds-remaining-count">{info['remaining']:,}</td>
                            <td class="vds-fill-rate">{info['fill_rate']}</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-cleaning-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced missing values filling: {str(e)}")


def remove_columns_advanced(csv_file_path: str, strategy: Union[str, List[str], None] = None,
                          columns: Optional[List[str]] = None, threshold: Union[float, Dict[str, float]] = 0.5,
                          exclude_columns: Optional[List[str]] = None, min_unique_ratio: float = 0.01,
                          correlation_threshold: float = 0.95) -> str:
    """
    Advanced column removal with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        strategy: Removal strategy ('missing', 'constant', 'correlation', 'variance')
        columns: Direct columns to remove
        threshold: Threshold values for strategies
        exclude_columns: Columns to exclude from removal
        min_unique_ratio: Minimum unique value ratio
        correlation_threshold: Correlation threshold
        
    Returns:
        HTML formatted report with removal results
    """
    try:
        data = pd.read_csv(csv_file_path)
        original_columns = list(data.columns)
        original_count = len(original_columns)
        
        # Use ml_tools function if available
        if 'remove_columns_tools' in globals():
            cleaned_data = remove_columns_tools(
                data=data,
                strategy=strategy,
                columns=columns,
                threshold=threshold,
                exclude_columns=exclude_columns,
                min_unique_ratio=min_unique_ratio,
                correlation_threshold=correlation_threshold
            )
        else:
            # Fallback implementation
            cleaned_data = data.copy()
            columns_to_drop = set()
            
            if columns:
                columns_to_drop.update([col for col in columns if col in cleaned_data.columns])
            
            if strategy:
                strategies = [strategy] if isinstance(strategy, str) else strategy
                for strat in strategies:
                    if strat == 'missing':
                        missing_ratio = cleaned_data.isnull().mean()
                        cols = missing_ratio[missing_ratio > threshold].index
                        if exclude_columns:
                            cols = [col for col in cols if col not in exclude_columns]
                        columns_to_drop.update(cols)
            
            if columns_to_drop:
                cleaned_data = cleaned_data.drop(columns=list(columns_to_drop))
        
        removed_columns = [col for col in original_columns if col not in cleaned_data.columns]
        remaining_count = len(cleaned_data.columns)
        
        # Save cleaned data
        output_path = csv_file_path.replace('.csv', '_columns_removed.csv')
        cleaned_data.to_csv(output_path, index=False)
        
        return f"""
        <vds-cleaning-report>
            <vds-title>Advanced Column Removal Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Strategy Used</td><td class="vds-value">{strategy}</td></tr>
                    <tr><td class="vds-label">Original Columns</td><td class="vds-value">{original_count}</td></tr>
                    <tr><td class="vds-label">Removed Columns</td><td class="vds-value">{len(removed_columns)}</td></tr>
                    <tr><td class="vds-label">Remaining Columns</td><td class="vds-value">{remaining_count}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Removed Columns</vds-title>
                <table class="vds-removed-table">
                    <thead>
                        <tr><th class="vds-col-header">Column Name</th></tr>
                    </thead>
                    <tbody>
                        {''.join([f'<tr><td class="vds-col-name">{col}</td></tr>' for col in removed_columns])}
                    </tbody>
                </table>
            </vds-section>
        </vds-cleaning-report>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in advanced column removal: {str(e)}")


def advanced_outlier_detection(csv_file_path: str, target_columns: Union[str, List[str]],
                              method: str = 'iqr', strategy: str = 'clip', sensitivity: str = 'medium',
                              group_columns: Optional[Union[str, List[str]]] = None) -> str:
    """
    Advanced outlier detection and handling with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        target_columns: Columns to process for outliers
        method: Detection method ('iqr', 'zscore', 'isolation_forest', 'dbscan', 'mad')
        strategy: Handling strategy ('clip', 'remove')
        sensitivity: Detection sensitivity ('low', 'medium', 'high')
        group_columns: Grouping columns
        
    Returns:
        HTML formatted report with outlier handling results
    """
    try:
        data = pd.read_csv(csv_file_path)
        original_rows = len(data)
        
        # Calculate outliers before processing
        outlier_info = []
        if isinstance(target_columns, str):
            target_columns = [target_columns]
        
        for col in target_columns:
            if col in data.columns and pd.api.types.is_numeric_dtype(data[col]):
                if method == 'iqr':
                    Q1 = data[col].quantile(0.25)
                    Q3 = data[col].quantile(0.75)
                    IQR = Q3 - Q1
                    threshold = 1.5 if sensitivity == 'medium' else (3.0 if sensitivity == 'low' else 1.0)
                    outliers = ((data[col] < (Q1 - threshold * IQR)) | (data[col] > (Q3 + threshold * IQR))).sum()
                    outlier_info.append({'column': col, 'outliers': outliers, 'percentage': f"{(outliers/len(data))*100:.1f}%"})
        
        # Use ml_tools function if available
        if 'handle_outliers_tools' in globals():
            cleaned_data = handle_outliers_tools(
                data=data,
                target_columns=target_columns,
                method=method,
                strategy=strategy,
                sensitivity=sensitivity,
                group_columns=group_columns
            )
        else:
            # Fallback implementation
            cleaned_data = data.copy()
            for col in target_columns:
                if col in cleaned_data.columns and pd.api.types.is_numeric_dtype(cleaned_data[col]):
                    Q1 = cleaned_data[col].quantile(0.25)
                    Q3 = cleaned_data[col].quantile(0.75)
                    IQR = Q3 - Q1
                    lower = Q1 - 1.5 * IQR
                    upper = Q3 + 1.5 * IQR
                    
                    if strategy == 'clip':
                        cleaned_data[col] = cleaned_data[col].clip(lower=lower, upper=upper)
                    else:  # remove
                        outlier_mask = (cleaned_data[col] < lower) | (cleaned_data[col] > upper)
                        cleaned_data = cleaned_data.loc[~outlier_mask]
        
        final_rows = len(cleaned_data)
        rows_affected = original_rows - final_rows
        
        # Save cleaned data
        output_path = csv_file_path.replace('.csv', '_outliers_handled.csv')
        cleaned_data.to_csv(output_path, index=False)
        
        report_html = f"""
        <vds-cleaning-report>
            <vds-title>Advanced Outlier Detection Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Method Used</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Strategy Used</td><td class="vds-value">{strategy}</td></tr>
                    <tr><td class="vds-label">Sensitivity</td><td class="vds-value">{sensitivity}</td></tr>
                    <tr><td class="vds-label">Original Rows</td><td class="vds-value">{original_rows:,}</td></tr>
                    <tr><td class="vds-label">Final Rows</td><td class="vds-value">{final_rows:,}</td></tr>
                    <tr><td class="vds-label">Rows Affected</td><td class="vds-value">{rows_affected:,}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Outlier Detection Results</vds-title>
                <table class="vds-outlier-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Column</th>
                            <th class="vds-col-header">Outliers Detected</th>
                            <th class="vds-col-header">Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for info in outlier_info:
            report_html += f"""
                        <tr>
                            <td class="vds-col-name">{info['column']}</td>
                            <td class="vds-outlier-count">{info['outliers']:,}</td>
                            <td class="vds-outlier-pct">{info['percentage']}</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-cleaning-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced outlier detection: {str(e)}")


def categorical_encoding_advanced(csv_file_path: str, target_columns: Union[str, List[str]],
                                 method: str = 'auto', group_columns: Optional[Union[str, List[str]]] = None,
                                 handle_unknown: str = 'ignore', keep_original: bool = True) -> str:
    """
    Advanced categorical encoding with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        target_columns: Columns to encode
        method: Encoding method ('auto', 'label', 'onehot', 'frequency', 'count')
        group_columns: Grouping columns for group-based encoding
        handle_unknown: How to handle unknown categories
        keep_original: Whether to keep original columns
        
    Returns:
        HTML formatted report with encoding results
    """
    try:
        data = pd.read_csv(csv_file_path)
        original_columns = list(data.columns)
        
        # Use ml_tools function if available
        if 'encode_categorical_tools' in globals():
            encoded_data = encode_categorical_tools(
                data=data,
                target_columns=target_columns,
                method=method,
                group_columns=group_columns,
                handle_unknown=handle_unknown,
                keep_original=keep_original
            )
        else:
            # Fallback implementation
            encoded_data = data.copy()
            if isinstance(target_columns, str):
                target_columns = [target_columns]
            
            for col in target_columns:
                if col in encoded_data.columns and encoded_data[col].dtype == 'object':
                    if method == 'auto' or method == 'onehot':
                        dummies = pd.get_dummies(encoded_data[col], prefix=col)
                        encoded_data = pd.concat([encoded_data, dummies], axis=1)
                        if not keep_original:
                            encoded_data.drop(columns=[col], inplace=True)
        
        new_columns = [col for col in encoded_data.columns if col not in original_columns]
        
        # Save encoded data
        output_path = csv_file_path.replace('.csv', '_categorical_encoded.csv')
        encoded_data.to_csv(output_path, index=False)
        
        return f"""
        <vds-cleaning-report>
            <vds-title>Advanced Categorical Encoding Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Method Used</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Original Columns</td><td class="vds-value">{len(original_columns)}</td></tr>
                    <tr><td class="vds-label">Final Columns</td><td class="vds-value">{len(encoded_data.columns)}</td></tr>
                    <tr><td class="vds-label">New Columns Added</td><td class="vds-value">{len(new_columns)}</td></tr>
                    <tr><td class="vds-label">Keep Original</td><td class="vds-value">{keep_original}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>New Encoded Columns</vds-title>
                <table class="vds-encoded-table">
                    <thead>
                        <tr><th class="vds-col-header">New Column Name</th></tr>
                    </thead>
                    <tbody>
                        {''.join([f'<tr><td class="vds-col-name">{col}</td></tr>' for col in new_columns[:20]])}
                        {f'<tr><td class="vds-info">... and {len(new_columns) - 20} more columns</td></tr>' if len(new_columns) > 20 else ''}
                    </tbody>
                </table>
            </vds-section>
        </vds-cleaning-report>
        """
        
    except Exception as e:
        return _create_error_report(f"Error in advanced categorical encoding: {str(e)}")