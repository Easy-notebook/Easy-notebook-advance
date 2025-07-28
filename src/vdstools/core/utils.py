"""
Utility functions for VDS Tools
"""

import pandas as pd
import numpy as np
import os
from typing import Union, List, Optional, Dict, Any


def validate_csv_path(csv_file_path: str) -> bool:
    """Validate CSV file path"""
    if not isinstance(csv_file_path, str):
        raise TypeError("CSV file path must be a string")
    
    if not os.path.exists(csv_file_path):
        raise FileNotFoundError(f"CSV file not found: {csv_file_path}")
    
    if not csv_file_path.lower().endswith('.csv'):
        raise ValueError("File must be a CSV file")
    
    return True


def format_file_size(size_bytes: int) -> str:
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0 B"
    
    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = int(np.floor(np.log(size_bytes) / np.log(1024)))
    p = np.power(1024, i)
    s = round(size_bytes / p, 2)
    
    return f"{s} {size_names[i]}"


def safe_division(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division that handles division by zero"""
    try:
        if denominator == 0:
            return default
        return numerator / denominator
    except (ZeroDivisionError, TypeError):
        return default


def normalize_column_names(columns: Union[str, List[str]]) -> List[str]:
    """Normalize column names to list format"""
    if isinstance(columns, str):
        return [columns]
    elif isinstance(columns, list):
        return columns
    else:
        raise TypeError("Columns must be string or list of strings")


def detect_column_types(data: pd.DataFrame) -> Dict[str, List[str]]:
    """Detect and categorize column types"""
    numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = data.select_dtypes(include=['object', 'category']).columns.tolist()
    datetime_cols = data.select_dtypes(include=['datetime64']).columns.tolist()
    boolean_cols = data.select_dtypes(include=['bool']).columns.tolist()
    
    return {
        'numeric': numeric_cols,
        'categorical': categorical_cols,
        'datetime': datetime_cols,
        'boolean': boolean_cols
    }


def create_summary_stats(data: pd.DataFrame, column: str) -> Dict[str, Any]:
    """Create summary statistics for a column"""
    if column not in data.columns:
        raise ValueError(f"Column '{column}' not found in data")
    
    series = data[column].dropna()
    
    if pd.api.types.is_numeric_dtype(series):
        return {
            'count': len(series),
            'missing': data[column].isnull().sum(),
            'mean': series.mean(),
            'median': series.median(),
            'std': series.std(),
            'min': series.min(),
            'max': series.max(),
            'q25': series.quantile(0.25),
            'q75': series.quantile(0.75),
            'unique': series.nunique()
        }
    else:
        return {
            'count': len(series),
            'missing': data[column].isnull().sum(),
            'unique': series.nunique(),
            'mode': series.mode()[0] if len(series.mode()) > 0 else None,
            'mode_freq': series.value_counts().iloc[0] if len(series) > 0 else 0,
            'most_common': series.value_counts().head(3).to_dict()
        }


def generate_correlation_matrix(data: pd.DataFrame, method: str = 'pearson') -> pd.DataFrame:
    """Generate correlation matrix for numeric columns"""
    numeric_data = data.select_dtypes(include=[np.number])
    
    if numeric_data.empty:
        raise ValueError("No numeric columns found for correlation analysis")
    
    return numeric_data.corr(method=method)


def detect_outliers_iqr(series: pd.Series, multiplier: float = 1.5) -> pd.Series:
    """Detect outliers using IQR method"""
    Q1 = series.quantile(0.25)
    Q3 = series.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    return (series < lower_bound) | (series > upper_bound)


def detect_outliers_zscore(series: pd.Series, threshold: float = 3.0) -> pd.Series:
    """Detect outliers using Z-score method"""
    z_scores = np.abs((series - series.mean()) / series.std())
    return z_scores > threshold


def create_html_table(data: pd.DataFrame, title: str = "", max_rows: int = 100) -> str:
    """Create HTML table with VDS styling"""
    if len(data) > max_rows:
        data = data.head(max_rows)
        truncated_note = f"<p class='vds-note'>Showing first {max_rows} rows of {len(data)} total rows</p>"
    else:
        truncated_note = ""
    
    html = f"""
    <vds-section>
        <vds-title>{title}</vds-title>
        {truncated_note}
        <vds-table class="vds-data-table">
            <vds-thead>
                <vds-tr>
    """
    
    # Add headers
    for col in data.columns:
        html += f'<vds-th class="vds-col-header">{col}</vds-th>'
    
    html += """
                </vds-tr>
            </vds-thead>
            <vds-tbody>
    """
    
    # Add data rows
    for idx, row in data.iterrows():
        html += '<vds-tr>'
        for col in data.columns:
            value = row[col]
            cell_class = "vds-cell"
            
            if pd.isna(value):
                formatted_value = '<span class="vds-null">NULL</span>'
                cell_class += " vds-missing"
            elif isinstance(value, (int, float)):
                cell_class += " vds-numeric"
                if isinstance(value, float):
                    formatted_value = f"{value:.3f}"
                else:
                    formatted_value = str(value)
            else:
                cell_class += " vds-categorical"
                formatted_value = str(value)
            
            html += f'<vds-td class="{cell_class}">{formatted_value}</vds-td>'
        html += '</vds-tr>'
    
    html += """
            </vds-tbody>
        </vds-table>
    </vds-section>
    """
    
    return html