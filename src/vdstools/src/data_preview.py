"""
Data preview tools - Replace simple data.head() operations
Provide richer, more readable data preview functionality
"""

import pandas as pd
import numpy as np
from typing import List
from ..utils.display import Display

class DataPreview(Display):
    """
    VDS Tools Data Preview Toolkit - Enhanced data preview and information display
    
    This class provides comprehensive data preview functionality with rich HTML output
    for Jupyter notebook integration, replacing simple data.head() operations.
    """
    
    def __init__(self, csv_file_path: str = None):
        """
        Initialize DataPreviewToolkit
        
        Args:
            csv_file_path: Optional path to CSV file for immediate loading
        """
        super().__init__()
        self.csv_file_path = csv_file_path
        self.data = None
        if csv_file_path:
            self._load_data()

    def _load_data(self):
        """Load data from CSV file"""
        try:
            self.data = pd.read_csv(self.csv_file_path)
        except Exception as e:
            print(f"Error loading data: {e}")
            self.data = None
    
    def top5line(self, csv_file_path: str = None):
        """
        Display first 5 rows with comprehensive data information
        
        Args:
            csv_file_path: Path to CSV file (optional if set in __init__)
        """
        file_path = csv_file_path or self.csv_file_path
        if not file_path:
            html_content = self._create_error_report("No CSV file path provided")
        else:
            html_content = enhanced_data_preview(file_path, n_rows=5)
        self.show(html_content)
    
    def top10line(self, csv_file_path: str = None):
        """
        Display first 10 rows with comprehensive data information
        
        Args:
            csv_file_path: Path to CSV file (optional if set in __init__)
        """
        file_path = csv_file_path or self.csv_file_path
        if not file_path:
            html_content = self._create_error_report("No CSV file path provided")
        else:
            html_content = enhanced_data_preview(file_path, n_rows=10)
        self.show(html_content)
    
    def custom_preview(self, csv_file_path: str = None, n_rows: int = 5, 
                      include_stats: bool = True):
        """
        Display custom number of rows with optional statistics
        
        Args:
            csv_file_path: Path to CSV file (optional if set in __init__)
            n_rows: Number of rows to display
            include_stats: Whether to include statistical information
        """
        file_path = csv_file_path or self.csv_file_path
        if not file_path:
            html_content = self._create_error_report("No CSV file path provided")
        else:
            html_content = enhanced_data_preview(file_path, n_rows=n_rows)
        self.show(html_content)
    
    def data_info(self, csv_file_path: str = None):
        """
        Display comprehensive dataset information
        
        Args:
            csv_file_path: Path to CSV file (optional if set in __init__)
        """
        file_path = csv_file_path or self.csv_file_path
        if not file_path:
            html_content = self._create_error_report("No CSV file path provided")
        else:
            html_content = smart_data_info(file_path)
        self.show(html_content)
    
    def column_list(self, csv_file_path: str = None) -> List[str]:
        """
        Get list of column names
        
        Args:
            csv_file_path: Path to CSV file (optional if set in __init__)
            
        Returns:
            List of column names
        """
        file_path = csv_file_path or self.csv_file_path
        if not file_path:
            return []
        return get_column_list(file_path)
    
    def _create_error_report(self, error_message: str) -> str:
        """Create HTML error report"""
        return f"""
        <vds-error-panel>
            <table class="vds-error-table">
                <tr><td class="vds-error-label">Preview Error</td><td class="vds-error-value">{error_message}</td></tr>
            </table>
        </vds-error-panel>
        """
        
    def help(self):
        """
        Display comprehensive help information for agents and users
        
        This function provides detailed documentation about the DataPreviewToolkit class,
        its methods, parameters, and usage scenarios for AI agents to understand and use.
        """
        help_content = """
        =============================================================================
        VDS TOOLS - DATA PREVIEW TOOLKIT HELP
        =============================================================================
        
        OVERVIEW:
        The DataPreviewToolkit class provides enhanced data preview functionality
        to replace simple data.head() operations with rich, structured HTML output
        suitable for Jupyter notebooks and web interfaces.
        
        CLASS INITIALIZATION:
        ---------------------
        toolkit = DataPreviewToolkit(csv_file_path="path/to/data.csv")
        toolkit = DataPreviewToolkit()  # Initialize without file
        
        CORE METHODS:
        =============
        
        1. top5line(csv_file_path=None) -> str
        -----------------------------------
        PURPOSE: Display first 5 rows with comprehensive dataset information
        WHEN TO USE: Quick data overview, replacing data.head() calls
        PARAMETERS:
        - csv_file_path (str, optional): Path to CSV file
        OUTPUT: HTML with dataset info, column details, first 5 rows, variable list
        EXAMPLE:
        result = toolkit.top5line("data.csv")
        # Agent use case: "Show me the first few rows of the dataset"
        
        2. top10line(csv_file_path=None) -> str
        ------------------------------------
        PURPOSE: Display first 10 rows with comprehensive dataset information
        WHEN TO USE: More detailed preview, exploring larger datasets
        PARAMETERS:
        - csv_file_path (str, optional): Path to CSV file
        OUTPUT: HTML with dataset info, column details, first 10 rows, variable list
        EXAMPLE:
        result = toolkit.top10line("data.csv")
        # Agent use case: "I need to see more rows to understand the data pattern"
        
        3. custom_preview(csv_file_path=None, n_rows=5, include_stats=True) -> str
        -----------------------------------------------------------------------
        PURPOSE: Display custom number of rows with optional statistics
        WHEN TO USE: Flexible preview requirements, custom row counts
        PARAMETERS:
        - csv_file_path (str, optional): Path to CSV file
        - n_rows (int): Number of rows to display (default: 5)
        - include_stats (bool): Include statistical information (default: True)
        OUTPUT: HTML with customized data preview
        EXAMPLE:
        result = toolkit.custom_preview("data.csv", n_rows=15)
        # Agent use case: "Show me the first 15 rows of the dataset"
        
        4. data_info(csv_file_path=None) -> str
        ---------------------------------------
        PURPOSE: Display comprehensive dataset information without row data
        WHEN TO USE: Understanding dataset structure, memory usage, missing values
        PARAMETERS:
        - csv_file_path (str, optional): Path to CSV file
        OUTPUT: HTML with detailed dataset statistics
        EXAMPLE:
        result = toolkit.data_info("data.csv")
        # Agent use case: "Tell me about this dataset's characteristics"
        
        5. column_list(csv_file_path=None) -> List[str]
        -----------------------------------------------
        PURPOSE: Get list of column names from dataset
        WHEN TO USE: Column name extraction, validation, iteration
        PARAMETERS:
        - csv_file_path (str, optional): Path to CSV file
        OUTPUT: Python list of column names
        EXAMPLE:
        columns = toolkit.column_list("data.csv")
        # Agent use case: "What columns are in this dataset?"
        
        AGENT USAGE SCENARIOS:
        ======================
        
        1. DATA EXPLORATION:
        When agent needs to understand a dataset:
        toolkit = DataPreviewToolkit()
        overview = toolkit.top5line("new_dataset.csv")
        info = toolkit.data_info("new_dataset.csv")
        
        2. COLUMN ANALYSIS:
        When agent needs to work with specific columns:
        columns = toolkit.column_list("data.csv")
        for col in columns:
            # Process each column
        
        3. CUSTOM PREVIEW:
        When agent needs specific number of rows:
        preview = toolkit.custom_preview("data.csv", n_rows=20)
        
        4. WORKFLOW INTEGRATION:
        Replace hardcoded operations:
        # Old way: data = pd.read_csv("file.csv"); print(data.head())
        # New way: result = toolkit.top5line("file.csv")
        
        OUTPUT FORMAT:
        ==============
        All methods return HTML strings using custom vds- tags:
        - vds-container: Main container
        - vds-info-panel: Information panel
        - vds-section: Content sections
        - vds-table: Data tables
        - vds-title: Section titles
        
        ERROR HANDLING:
        ===============
        All methods include comprehensive error handling and return
        structured HTML error reports when issues occur.
        
        INTEGRATION TIPS FOR AGENTS:
        ============================
        1. Always specify csv_file_path parameter when calling methods
        2. Use top5line() for quick overviews
        3. Use data_info() for dataset characteristics
        4. Use column_list() for column-based operations
        5. Check for error panels in returned HTML
        6. Use custom_preview() for specific requirements
        
        =============================================================================
        """
        self.show(help_content)

# Legacy function for backward compatibility
def datapreview(csv_file_path: str) -> DataPreview:
    """
    Legacy function for backward compatibility
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        DataPreviewToolkit instance
    """
    return DataPreview(csv_file_path)

def enhanced_data_preview(csv_file_path: str, n_rows: int = 5) -> str:
    """
    Enhanced data preview function, replacing simple data.head()
    
    Args:
        csv_file_path: Path to CSV file
        n_rows: Number of rows to display
        
    Returns:
        Formatted HTML string with data preview and basic info
    """
    try:
        # Read data
        data = pd.read_csv(csv_file_path)
        
        # Basic info table
        info_html = f"""
        <vds-info-panel>
            <table class="vds-info-table">
                <tr><td class="vds-label">File Path</td><td class="vds-value">{csv_file_path}</td></tr>
                <tr><td class="vds-label">Data Shape</td><td class="vds-value">{data.shape[0]:,} rows × {data.shape[1]} columns</td></tr>
                <tr><td class="vds-label">Memory Usage</td><td class="vds-value">{data.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB</td></tr>
                <tr><td class="vds-label">Missing Values</td><td class="vds-value">{data.isnull().sum().sum():,} cells</td></tr>
            </table>
        </vds-info-panel>
        """
        
        # Column info table
        columns_html = """
        <vds-section>
            <vds-title>Column Information Overview</vds-title>
            <table class="vds-columns-table">
                <thead>
                    <tr>
                        <th class="vds-col-header">Column Name</th>
                        <th class="vds-col-header">Data Type</th>
                        <th class="vds-col-header">Missing Values</th>
                        <th class="vds-col-header">Unique Values</th>
                    </tr>
                </thead>
                <tbody>
        """
        
        for col in data.columns:
            dtype_str = str(data[col].dtype)
            null_count = data[col].isnull().sum()
            unique_count = data[col].nunique()
            
            # Add CSS class based on data type
            dtype_class = "vds-numeric" if dtype_str in ['int64', 'float64'] else "vds-categorical"
            
            columns_html += f"""
                    <tr class="{dtype_class}">
                        <td class="vds-col-name">{col}</td>
                        <td class="vds-col-type">{dtype_str}</td>
                        <td class="vds-col-missing">{null_count} ({null_count/len(data)*100:.1f}%)</td>
                        <td class="vds-col-unique">{unique_count}</td>
                    </tr>
            """
        
        columns_html += """
                </tbody>
            </table>
        </vds-section>
        """
        
        # Data preview table
        preview_html = f"""
        <vds-section>
            <vds-title>Data Preview (First {n_rows} Rows)</vds-title>
            <vds-table class="vds-preview-table">
                <vds-thead>
                    <vds-tr>
                        <vds-th class="vds-row-header">Row Index</vds-th>
        """
        
        # Add column headers
        for col in data.columns:
            dtype_str = str(data[col].dtype)
            dtype_class = "vds-numeric" if dtype_str in ['int64', 'float64'] else "vds-categorical"
            preview_html += f'<vds-th class="vds-col-header {dtype_class}">{col}</vds-th>'
        
        preview_html += """
                    </vds-tr>
                </vds-thead>
                <vds-tbody>
        """
        
        # Add data rows
        preview_data = data.head(n_rows)
        for idx, row in preview_data.iterrows():
            preview_html += f'<vds-tr><vds-td class="vds-row-index">{idx}</vds-td>'
            
            for col in preview_data.columns:
                value = row[col]
                cell_class = "vds-cell"
                
                if pd.isna(value):
                    formatted_value = '<span class="vds-null">NULL</span>'
                    cell_class += " vds-missing"
                elif isinstance(value, float):
                    cell_class += " vds-numeric"
                    if abs(value) > 1e6 or (abs(value) < 1e-3 and value != 0):
                        formatted_value = f"{value:.2e}"
                    else:
                        formatted_value = f"{value:.3f}"
                elif isinstance(value, str):
                    cell_class += " vds-categorical"
                    formatted_value = str(value)  # No truncation
                else:
                    if isinstance(value, (int, float)):
                        cell_class += " vds-numeric"
                    else:
                        cell_class += " vds-categorical"
                    formatted_value = str(value)
                
                preview_html += f'<vds-td class="{cell_class}">{formatted_value}</vds-td>'
            
            preview_html += '</vds-tr>'
        
        preview_html += """
                </vds-tbody>
            </vds-table>
        </vds-section>
        """
        
        # Variables list
        variables_list = list(data.columns)
        variables_html = f"""
        <vds-section>
            <vds-title>Variable List</vds-title>
            <vds-code-block>
                <code>variables = {variables_list}</code>
            </vds-code-block>
        </vds-section>
        """
        
        return f"""
        <vds-container>
            {info_html}
            {columns_html}
            {preview_html}
            {variables_html}
        </vds-container>
        """
        
    except Exception as e:
        return f"""
        <vds-error-panel>
            <table class="vds-error-table">
                <tr><td class="vds-error-label">Error Type</td><td class="vds-error-value">{type(e).__name__}</td></tr>
                <tr><td class="vds-error-label">Error Message</td><td class="vds-error-value">{str(e)}</td></tr>
                <tr><td class="vds-error-label">File Path</td><td class="vds-error-value">{csv_file_path}</td></tr>
            </table>
        </vds-error-panel>
        """


def smart_data_info(csv_file_path: str) -> str:
    """
    Smart data information display, returns formatted info table
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        HTML formatted data information
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        # Basic statistics
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        categorical_cols = data.select_dtypes(include=['object', 'category']).columns
        missing_ratio = data.isnull().sum().sum() / (data.shape[0] * data.shape[1]) * 100
        duplicate_count = data.duplicated().sum()
        
        return f"""
        <vds-info-panel>
            <vds-title>Dataset Statistics</vds-title>
            <table class="vds-stats-table">
                <tr><td class="vds-stat-label">Total Rows</td><td class="vds-stat-value">{data.shape[0]:,}</td></tr>
                <tr><td class="vds-stat-label">Total Columns</td><td class="vds-stat-value">{data.shape[1]}</td></tr>
                <tr><td class="vds-stat-label">Numeric Columns</td><td class="vds-stat-value">{len(numeric_cols)}</td></tr>
                <tr><td class="vds-stat-label">Categorical Columns</td><td class="vds-stat-value">{len(categorical_cols)}</td></tr>
                <tr><td class="vds-stat-label">Missing Ratio</td><td class="vds-stat-value">{missing_ratio:.2f}%</td></tr>
                <tr><td class="vds-stat-label">Duplicate Rows</td><td class="vds-stat-value">{duplicate_count}</td></tr>
                <tr><td class="vds-stat-label">Memory Usage</td><td class="vds-stat-value">{data.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB</td></tr>
            </table>
        </vds-info-panel>
        """
        
    except Exception as e:
        return f"""
        <vds-error-panel>
            <table class="vds-error-table">
                <tr><td class="vds-error-label">Error</td><td class="vds-error-value">{str(e)}</td></tr>
            </table>
        </vds-error-panel>
        """


def get_column_list(csv_file_path: str) -> List[str]:
    """
    Get list of column names from CSV file
    
    Args:
        csv_file_path: Path to CSV file
        
    Returns:
        List of column names
    """
    try:
        data = pd.read_csv(csv_file_path)
        return list(data.columns)
    except Exception as e:
        print(f"Error reading file: {e}")
        return []