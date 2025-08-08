"""
VDS Tools - Comprehensive data science toolkit
Replaces hardcoded data operations in DCLS workflow with better display effects
Integrated with ml_tools for advanced data processing capabilities

This package provides class-based toolkits for data science workflows:
- DataPreviewToolkit: Enhanced data preview and information display
- DataCleaningToolkit: Comprehensive data cleaning and preprocessing  
- EDAToolkit: Exploratory data analysis and statistical insights

Each toolkit includes comprehensive help() functions for agent integration.
"""

# Import class-based toolkits (primary interface)
from .src.data_preview import DataPreview, datapreview, build_semantic_context, create_basic_variations
from .src.data_cleaning import DataCleaning
from .src.eda_tools import EDAToolkit
from .src.feature_engineering import FeatureEngineering
from .src.stability import evaluate_variations

# Import HTML output utilities
from .src.html_output import (
    display_html, html_output, print_html,
    HTMLRenderer, render_html, render_vds_container, render_vds_table,
    quick_display_html, quick_display_vds, help_html_output
)

# Import legacy function-based interfaces for backward compatibility
from .src.data_preview import enhanced_data_preview, smart_data_info, get_column_list
from .src.data_cleaning import (
    apply_cleaning_method,
    advanced_fill_missing_values,
    remove_columns_advanced,
    advanced_outlier_detection,
    categorical_encoding_advanced
)
from .src.eda_tools import (
    generate_correlation_analysis, 
    generate_distribution_analysis,
    generate_missing_value_analysis,
    generate_advanced_statistics,
    generate_data_quality_report,
    generate_feature_importance_analysis
)
from .src.feature_engineering import (
    advanced_feature_transformation,
    advanced_dimensionality_reduction,
    advanced_feature_selection,
    create_polynomial_features_advanced,
    discretize_features_advanced
)

__version__ = "2.0.0"

# Primary class-based interface
__all__ = [
    "DataPreview",
    "DataCleaning",
    "EDAToolkit",
    "FeatureEngineering",
    # Agent-oriented structured utilities
    "build_semantic_context",
    "create_basic_variations",
    "evaluate_variations",
    
    # HTML Output Utilities
    "display_html",
    "html_output", 
    "print_html",
    "HTMLRenderer",
    "render_html",
    "render_vds_container",
    "render_vds_table",
    "quick_display_html",
    "quick_display_vds",
    "help_html_output",
    
    # Legacy function interface
    "datapreview",
    
    # Data Preview Functions (Legacy)
    "enhanced_data_preview", 
    "smart_data_info",
    "get_column_list",
    
    # Data Cleaning Functions (Legacy)
    "apply_cleaning_method",
    "advanced_fill_missing_values",
    "remove_columns_advanced", 
    "advanced_outlier_detection",
    "categorical_encoding_advanced",
    
    # EDA Functions (Legacy)
    "generate_correlation_analysis",
    "generate_distribution_analysis", 
    "generate_missing_value_analysis",
    "generate_advanced_statistics",
    "generate_data_quality_report",
    "generate_feature_importance_analysis",

    # Feature Engineering Functions (Legacy)
    "advanced_feature_transformation",
    "advanced_dimensionality_reduction",
    "advanced_feature_selection",
    "create_polynomial_features_advanced",
    "discretize_features_advanced",
]


# Quick access functions for common operations
def quick_preview(csv_file_path: str, n_rows: int = 5):
    """
    Quick data preview using DataPreviewToolkit
    
    Args:
        csv_file_path: Path to CSV file
        n_rows: Number of rows to preview
    """
    toolkit = DataPreview()
    if n_rows == 5:
        toolkit.top5line(csv_file_path)
    elif n_rows == 10:
        toolkit.top10line(csv_file_path)
    else:
        toolkit.custom_preview(csv_file_path, n_rows)

def quick_clean(csv_file_path: str, operation: str = "missing_values"):
    """
    Quick data cleaning using DataCleaningToolkit
    
    Args:
        csv_file_path: Path to CSV file
        operation: Type of cleaning ('missing_values', 'duplicates', 'outliers', 'invalid_values')
    """
    toolkit = DataCleaning()
    if operation == "missing_values":
        toolkit.fill_missing_values(csv_file_path)
    elif operation == "duplicates":
        toolkit.remove_duplicates(csv_file_path)
    elif operation == "outliers":
        toolkit.remove_outliers(csv_file_path)
    elif operation == "invalid_values":
        toolkit.clean_invalid_values(csv_file_path)
    else:
        from .src.html_output import print_html
        print_html(f"<vds-error-panel>Unknown operation: {operation}</vds-error-panel>")

def quick_eda(csv_file_path: str, analysis: str = "quality"):
    """
    Quick EDA using EDAToolkit
    
    Args:
        csv_file_path: Path to CSV file
        analysis: Type of analysis ('quality', 'missing', 'stats', 'correlation')
    """
    toolkit = EDAToolkit()
    if analysis == "quality":
        toolkit.data_quality_report(csv_file_path)
    elif analysis == "missing":
        toolkit.missing_value_analysis(csv_file_path)
    elif analysis == "stats":
        toolkit.statistical_summary(csv_file_path)
    elif analysis == "correlation":
        toolkit.correlation_analysis(csv_file_path)
    else:
        from .src.html_output import print_html
        print_html(f"<vds-error-panel>Unknown analysis: {analysis}</vds-error-panel>")

# Add quick functions to __all__
__all__.extend(["quick_preview", "quick_clean", "quick_eda"])

def display_help():
    """
    Display comprehensive help for all VDS Tools
    
    This function provides an overview of all available toolkits and their
    help functions for agents and users.
    """
    help_content = """
    =============================================================================
    VDS TOOLS - COMPREHENSIVE DATA SCIENCE TOOLKIT
    =============================================================================
    
    OVERVIEW:
    VDS Tools provides three main class-based toolkits for comprehensive
    data science workflows, with rich HTML output and agent-friendly interfaces.
    
    MAIN TOOLKITS:
    ==============
    
    1. DataPreviewToolkit - Enhanced data preview and information display
    2. DataCleaningToolkit - Comprehensive data cleaning and preprocessing
    3. EDAToolkit - Exploratory data analysis and statistical insights
    
    QUICK START:
    ============
    
    # Import toolkits
    from vdstools import DataPreviewToolkit, DataCleaningToolkit, EDAToolkit
    
    # Initialize toolkits
    preview_tk = DataPreviewToolkit()
    cleaning_tk = DataCleaningToolkit()
    eda_tk = EDAToolkit()
    
    # Quick operations
    preview = preview_tk.top5line("data.csv")
    cleaning = cleaning_tk.fill_missing_values("data.csv")
    analysis = eda_tk.data_quality_report("data.csv")
    
    DETAILED HELP:
    ==============
    
    For detailed help on each toolkit, use:
    DataPreviewToolkit.help()    # Data preview functionality
    DataCleaningToolkit.help()   # Data cleaning functionality
    EDAToolkit.help()           # EDA functionality
    
    QUICK ACCESS FUNCTIONS:
    =======================
    
    For simple operations, use these convenience functions:
    - quick_preview(csv_file_path, n_rows=5)
    - quick_clean(csv_file_path, operation="missing_values")
    - quick_eda(csv_file_path, analysis="quality")
    
    LEGACY FUNCTIONS:
    =================
    
    All original function-based interfaces remain available for
    backward compatibility. See individual toolkit help for details.
    
    INTEGRATION TIPS FOR AGENTS:
    ============================
    
    1. START with DataPreviewToolkit.help() to understand data preview
    2. USE DataCleaningToolkit.help() for data cleaning guidance
    3. EXPLORE EDAToolkit.help() for analysis capabilities
    4. PREFER class-based interfaces for better organization
    5. USE quick_* functions for simple operations
    6. CHECK .help() methods for detailed parameter information
    
    =============================================================================
    """
    print(help_content)
    return help_content

# Add to __all__
__all__.append("display_help")