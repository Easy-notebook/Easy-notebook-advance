"""
Feature Engineering tools - Advanced feature creation and transformation
Provides comprehensive feature engineering capabilities integrated with ml_tools
"""

import pandas as pd
import numpy as np
from typing import List, Optional, Union
from sklearn.preprocessing import StandardScaler, MinMaxScaler

try:
    from ..core.ml_tools import (
        transform_features,
        reduce_dimensions,
        select_features,
        create_polynomial_features,
        discretize_features
    )
except ImportError:
    print("Warning: ml_tools not found, using fallback implementations")


class FeatureEngineering:
    """
    VDS Tools Feature Engineering Toolkit - Advanced feature creation and transformation
    
    This class provides comprehensive feature engineering capabilities including:
    - Feature transformation (scaling, normalization, etc.)
    - Dimensionality reduction (PCA, LDA)
    - Feature selection (variance, correlation, mutual info, etc.)
    - Polynomial feature creation
    - Feature discretization
    
    All methods return HTML-formatted reports suitable for Jupyter notebook display.
    """
    
    def __init__(self):
        """Initialize FeatureEngineeringToolkit"""
        pass
    
    def transform_features(self, csv_file_path: str, columns: Union[str, List[str]], 
                          method: str = 'standard', params: Optional[dict] = None,
                          keep_original: bool = True) -> str:
        """
        Advanced feature transformation with multiple scaling methods
        
        Args:
            csv_file_path: Path to CSV file
            columns: Columns to transform (string or list of strings)
            method: Transformation method ('standard', 'minmax', 'robust', 'log', 'sqrt', 'power')
            params: Additional parameters for transformation
            keep_original: Whether to keep original columns
            
        Returns:
            HTML formatted report with transformation results
            
        Examples:
            >>> toolkit = FeatureEngineeringToolkit()
            >>> result = toolkit.transform_features('data.csv', ['age', 'income'], 'standard')
            >>> result = toolkit.transform_features('data.csv', 'price', 'minmax', keep_original=False)
        """
        return advanced_feature_transformation(csv_file_path, columns, method, params, keep_original)
    
    def reduce_dimensions(self, csv_file_path: str, method: str = 'pca', 
                         n_components: Union[int, float] = 0.95,
                         target_column: Optional[str] = None,
                         keep_original: bool = True) -> str:
        """
        Advanced dimensionality reduction with PCA, LDA and other methods
        
        Args:
            csv_file_path: Path to CSV file
            method: Reduction method ('pca', 'lda')
            n_components: Number of components to keep (int) or variance to retain (float 0-1)
            target_column: Target column (required for LDA)
            keep_original: Whether to keep original features
            
        Returns:
            HTML formatted report with reduction results
            
        Examples:
            >>> toolkit = FeatureEngineeringToolkit()
            >>> result = toolkit.reduce_dimensions('data.csv', 'pca', 0.95)
            >>> result = toolkit.reduce_dimensions('data.csv', 'lda', 5, 'target')
        """
        return advanced_dimensionality_reduction(csv_file_path, method, n_components, target_column, keep_original)
    
    def select_features(self, csv_file_path: str, target_column: str, method: str = 'variance',
                       n_features: Optional[int] = None, params: Optional[dict] = None) -> str:
        """
        Advanced feature selection using multiple algorithms
        
        Args:
            csv_file_path: Path to CSV file
            target_column: Target variable column
            method: Selection method ('variance', 'correlation', 'mutual_info', 'rfe', 'lasso')
            n_features: Number of features to select
            params: Additional parameters for selection method
            
        Returns:
            HTML formatted report with selection results
            
        Examples:
            >>> toolkit = FeatureEngineeringToolkit()
            >>> result = toolkit.select_features('data.csv', 'target', 'correlation', 10)
            >>> result = toolkit.select_features('data.csv', 'target', 'variance', params={'threshold': 0.1})
        """
        return advanced_feature_selection(csv_file_path, target_column, method, n_features, params)
    
    def create_polynomial_features(self, csv_file_path: str, columns: Union[str, List[str]],
                                  degree: int = 2, interaction_only: bool = False,
                                  keep_original: bool = True) -> str:
        """
        Create polynomial and interaction features from existing columns
        
        Args:
            csv_file_path: Path to CSV file
            columns: Columns to create polynomial features from
            degree: Maximum polynomial degree (2-4 recommended)
            interaction_only: Whether to create only interaction features
            keep_original: Whether to keep original columns
            
        Returns:
            HTML formatted report with polynomial feature creation results
            
        Examples:
            >>> toolkit = FeatureEngineeringToolkit()
            >>> result = toolkit.create_polynomial_features('data.csv', ['x1', 'x2'], degree=2)
            >>> result = toolkit.create_polynomial_features('data.csv', 'feature', degree=3, interaction_only=True)
        """
        return create_polynomial_features_advanced(csv_file_path, columns, degree, interaction_only, keep_original)
    
    def discretize_features(self, csv_file_path: str, columns: Union[str, List[str]],
                           method: str = 'equal_width', n_bins: int = 10,
                           labels: Optional[List[str]] = None, keep_original: bool = True) -> str:
        """
        Convert continuous features into discrete bins
        
        Args:
            csv_file_path: Path to CSV file
            columns: Columns to discretize
            method: Discretization method ('equal_width', 'equal_freq', 'kmeans')
            n_bins: Number of bins to create
            labels: Custom labels for bins (optional)
            keep_original: Whether to keep original columns
            
        Returns:
            HTML formatted report with discretization results
            
        Examples:
            >>> toolkit = FeatureEngineeringToolkit()
            >>> result = toolkit.discretize_features('data.csv', 'age', 'equal_width', 5)
            >>> result = toolkit.discretize_features('data.csv', ['price', 'income'], 'equal_freq', 10)
        """
        return discretize_features_advanced(csv_file_path, columns, method, n_bins, labels, keep_original)
    
    def help(self) -> str:
        """
        Display comprehensive help information for Feature Engineering Toolkit
        
        Returns:
            HTML formatted help documentation
        """
        help_html = """
        <vds-help-panel>
            <vds-title>VDS Feature Engineering Toolkit - Help Documentation</vds-title>
            
            <vds-section>
                <vds-subtitle>Overview</vds-subtitle>
                <vds-content>
                    The Feature Engineering Toolkit provides advanced feature creation and transformation
                    capabilities for data science workflows. All methods return structured HTML reports
                    suitable for Jupyter notebook display.
                </vds-content>
            </vds-section>
            
            <vds-section>
                <vds-subtitle>Available Methods</vds-subtitle>
                
                <vds-method-group>
                    <vds-method-title>1. transform_features(csv_file_path, columns, method, params, keep_original)</vds-method-title>
                    <vds-method-desc>Apply scaling and normalization transformations to numeric features</vds-method-desc>
                    <vds-method-params>
                        • csv_file_path: Path to input CSV file<br>
                        • columns: Column name(s) to transform<br>
                        • method: 'standard', 'minmax', 'robust', 'log', 'sqrt', 'power'<br>
                        • params: Additional parameters (optional)<br>
                        • keep_original: Keep original columns (default: True)
                    </vds-method-params>
                    <vds-method-example>
                        Example: toolkit.transform_features('data.csv', ['age', 'income'], 'standard')
                    </vds-method-example>
                </vds-method-group>
                
                <vds-method-group>
                    <vds-method-title>2. reduce_dimensions(csv_file_path, method, n_components, target_column, keep_original)</vds-method-title>
                    <vds-method-desc>Reduce feature space using PCA, LDA and other dimensionality reduction techniques</vds-method-desc>
                    <vds-method-params>
                        • csv_file_path: Path to input CSV file<br>
                        • method: 'pca', 'lda'<br>
                        • n_components: Number of components or variance to retain<br>
                        • target_column: Target variable (required for LDA)<br>
                        • keep_original: Keep original features (default: True)
                    </vds-method-params>
                    <vds-method-example>
                        Example: toolkit.reduce_dimensions('data.csv', 'pca', 0.95)
                    </vds-method-example>
                </vds-method-group>
                
                <vds-method-group>
                    <vds-method-title>3. select_features(csv_file_path, target_column, method, n_features, params)</vds-method-title>
                    <vds-method-desc>Select most important features using various selection algorithms</vds-method-desc>
                    <vds-method-params>
                        • csv_file_path: Path to input CSV file<br>
                        • target_column: Target variable column<br>
                        • method: 'variance', 'correlation', 'mutual_info', 'rfe', 'lasso'<br>
                        • n_features: Number of features to select<br>
                        • params: Method-specific parameters (optional)
                    </vds-method-params>
                    <vds-method-example>
                        Example: toolkit.select_features('data.csv', 'target', 'correlation', 10)
                    </vds-method-example>
                </vds-method-group>
                
                <vds-method-group>
                    <vds-method-title>4. create_polynomial_features(csv_file_path, columns, degree, interaction_only, keep_original)</vds-method-title>
                    <vds-method-desc>Generate polynomial and interaction features from existing columns</vds-method-desc>
                    <vds-method-params>
                        • csv_file_path: Path to input CSV file<br>
                        • columns: Column name(s) to create features from<br>
                        • degree: Maximum polynomial degree (default: 2)<br>
                        • interaction_only: Create only interaction terms (default: False)<br>
                        • keep_original: Keep original columns (default: True)
                    </vds-method-params>
                    <vds-method-example>
                        Example: toolkit.create_polynomial_features('data.csv', ['x1', 'x2'], degree=2)
                    </vds-method-example>
                </vds-method-group>
                
                <vds-method-group>
                    <vds-method-title>5. discretize_features(csv_file_path, columns, method, n_bins, labels, keep_original)</vds-method-title>
                    <vds-method-desc>Convert continuous features into discrete categorical bins</vds-method-desc>
                    <vds-method-params>
                        • csv_file_path: Path to input CSV file<br>
                        • columns: Column name(s) to discretize<br>
                        • method: 'equal_width', 'equal_freq', 'kmeans'<br>
                        • n_bins: Number of bins to create (default: 10)<br>
                        • labels: Custom bin labels (optional)<br>
                        • keep_original: Keep original columns (default: True)
                    </vds-method-params>
                    <vds-method-example>
                        Example: toolkit.discretize_features('data.csv', 'age', 'equal_width', 5)
                    </vds-method-example>
                </vds-method-group>
            </vds-section>
            
            <vds-section>
                <vds-subtitle>Usage Tips</vds-subtitle>
                <vds-tips>
                    • Always check data types before transformation - only numeric columns can be processed<br>
                    • Use keep_original=True to compare before/after transformations<br>
                    • For PCA, n_components as float (0-1) specifies variance to retain<br>
                    • For LDA, target_column is required and should be categorical<br>
                    • Polynomial features grow exponentially - use degree=2-3 for most cases<br>
                    • Equal-frequency binning works better for skewed distributions
                </vds-tips>
            </vds-section>
            
            <vds-section>
                <vds-subtitle>Integration with ml_tools</vds-subtitle>
                <vds-content>
                    This toolkit integrates with the existing ml_tools module when available,
                    providing fallback implementations for core functionality. All methods
                    output structured HTML using custom vds- tags for consistent styling.
                </vds-content>
            </vds-section>
        </vds-help-panel>
        """
        return help_html


# Legacy function wrappers for backward compatibility
def advanced_feature_transformation(csv_file_path: str, columns: Union[str, List[str]], 
                                  method: str = 'standard', params: Optional[dict] = None,
                                  keep_original: bool = True) -> str:
    """
    Advanced feature transformation with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        columns: Columns to transform
        method: Transformation method ('standard', 'minmax', 'robust', 'log', 'sqrt', 'power')
        params: Additional parameters for transformation
        keep_original: Whether to keep original columns
        
    Returns:
        HTML formatted report with transformation results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if isinstance(columns, str):
            columns = [columns]
        
        # Validate columns exist and are numeric
        missing_cols = [col for col in columns if col not in data.columns]
        if missing_cols:
            return _create_error_report(f"Columns not found: {missing_cols}")
        
        non_numeric_cols = [col for col in columns if not pd.api.types.is_numeric_dtype(data[col])]
        if non_numeric_cols:
            return _create_error_report(f"Non-numeric columns cannot be transformed: {non_numeric_cols}")
        
        original_columns = list(data.columns)
        
        # Use ml_tools function if available
        if 'transform_features' in globals():
            transformed_data, scaler = transform_features(
                data=data,
                columns=columns, 
                method=method,
                params=params,
                keep_original=keep_original
            )
        else:
            # Fallback implementation
            transformed_data = data.copy()
            if method == 'standard':
                scaler = StandardScaler()
                transformed_values = scaler.fit_transform(data[columns])
                for i, col in enumerate(columns):
                    transformed_data[f"{col}_{method}"] = transformed_values[:, i]
            elif method == 'minmax':
                scaler = MinMaxScaler()
                transformed_values = scaler.fit_transform(data[columns])
                for i, col in enumerate(columns):
                    transformed_data[f"{col}_{method}"] = transformed_values[:, i]
            
            if not keep_original:
                transformed_data = transformed_data.drop(columns=columns)
        
        new_columns = [col for col in transformed_data.columns if col not in original_columns]
        
        # Calculate transformation statistics
        transform_stats = []
        for col in columns:
            original_stats = {
                'mean': data[col].mean(),
                'std': data[col].std(),
                'min': data[col].min(),
                'max': data[col].max()
            }
            
            new_col = f"{col}_{method}"
            if new_col in transformed_data.columns:
                new_stats = {
                    'mean': transformed_data[new_col].mean(),
                    'std': transformed_data[new_col].std(),
                    'min': transformed_data[new_col].min(),
                    'max': transformed_data[new_col].max()
                }
                
                transform_stats.append({
                    'column': col,
                    'new_column': new_col,
                    'original_mean': f"{original_stats['mean']:.3f}",
                    'new_mean': f"{new_stats['mean']:.3f}",
                    'original_std': f"{original_stats['std']:.3f}",
                    'new_std': f"{new_stats['std']:.3f}",
                    'original_range': f"[{original_stats['min']:.3f}, {original_stats['max']:.3f}]",
                    'new_range': f"[{new_stats['min']:.3f}, {new_stats['max']:.3f}]"
                })
        
        # Save transformed data
        output_path = csv_file_path.replace('.csv', f'_transformed_{method}.csv')
        transformed_data.to_csv(output_path, index=False)
        
        # Create HTML report
        report_html = f"""
        <vds-engineering-report>
            <vds-title>Advanced Feature Transformation Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Transformation Method</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Columns Transformed</td><td class="vds-value">{len(columns)}</td></tr>
                    <tr><td class="vds-label">New Columns Created</td><td class="vds-value">{len(new_columns)}</td></tr>
                    <tr><td class="vds-label">Keep Original</td><td class="vds-value">{keep_original}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Transformation Statistics</vds-title>
                <table class="vds-transform-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Original Column</th>
                            <th class="vds-col-header">New Column</th>
                            <th class="vds-col-header">Original Mean</th>
                            <th class="vds-col-header">New Mean</th>
                            <th class="vds-col-header">Original Std</th>
                            <th class="vds-col-header">New Std</th>
                            <th class="vds-col-header">Original Range</th>
                            <th class="vds-col-header">New Range</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for stat in transform_stats:
            report_html += f"""
                        <tr>
                            <td class="vds-col-name">{stat['column']}</td>
                            <td class="vds-new-col-name">{stat['new_column']}</td>
                            <td class="vds-stat-value">{stat['original_mean']}</td>
                            <td class="vds-stat-value">{stat['new_mean']}</td>
                            <td class="vds-stat-value">{stat['original_std']}</td>
                            <td class="vds-stat-value">{stat['new_std']}</td>
                            <td class="vds-range-value">{stat['original_range']}</td>
                            <td class="vds-range-value">{stat['new_range']}</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-engineering-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced feature transformation: {str(e)}")


def advanced_dimensionality_reduction(csv_file_path: str, method: str = 'pca', 
                                     n_components: Union[int, float] = 0.95,
                                     target_column: Optional[str] = None,
                                     keep_original: bool = True) -> str:
    """
    Advanced dimensionality reduction with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        method: Reduction method ('pca', 'lda')
        n_components: Number of components to keep
        target_column: Target column (required for LDA)
        keep_original: Whether to keep original features
        
    Returns:
        HTML formatted report with reduction results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        # Prepare features (only numeric columns)
        numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
        if target_column and target_column in numeric_cols:
            numeric_cols.remove(target_column)
        
        if not numeric_cols:
            return _create_error_report("No numeric columns found for dimensionality reduction")
        
        X = data[numeric_cols].fillna(data[numeric_cols].mean())
        target = data[target_column] if target_column and target_column in data.columns else None
        
        original_dimensions = len(numeric_cols)
        
        # Use ml_tools function if available
        if 'reduce_dimensions' in globals():
            reduced_data = reduce_dimensions(
                data=X,
                method=method,
                n_components=n_components,
                target=target,
                keep_original=keep_original
            )
        else:
            # Fallback implementation
            if method == 'pca':
                from sklearn.decomposition import PCA
                pca = PCA(n_components=n_components)
                transformed = pca.fit_transform(X)
                
                # Create column names
                cols = [f'PC{i+1}' for i in range(transformed.shape[1])]
                reduced_features = pd.DataFrame(transformed, columns=cols, index=X.index)
                
                if keep_original:
                    reduced_data = pd.concat([X, reduced_features], axis=1)
                else:
                    reduced_data = reduced_features
                    
                # Store explained variance for reporting
                explained_variance = pca.explained_variance_ratio_
                cumulative_variance = np.cumsum(explained_variance)
            else:
                return _create_error_report("LDA method requires ml_tools implementation")
        
        new_dimensions = len([col for col in reduced_data.columns if col.startswith(('PC', 'LD'))])
        
        # Add other columns back
        result_data = data.copy()
        for col in reduced_data.columns:
            if col not in result_data.columns:
                result_data[col] = reduced_data[col]
        
        # Save reduced data
        output_path = csv_file_path.replace('.csv', f'_reduced_{method}.csv')
        result_data.to_csv(output_path, index=False)
        
        # Create variance explanation table for PCA
        variance_html = ""
        if method == 'pca' and 'explained_variance' in locals():
            variance_html = """
            <vds-section>
                <vds-title>Explained Variance by Component</vds-title>
                <table class="vds-variance-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Component</th>
                            <th class="vds-col-header">Variance Explained</th>
                            <th class="vds-col-header">Cumulative Variance</th>
                        </tr>
                    </thead>
                    <tbody>
            """
            
            for i, (var, cum_var) in enumerate(zip(explained_variance[:10], cumulative_variance[:10])):
                variance_html += f"""
                        <tr>
                            <td class="vds-component">PC{i+1}</td>
                            <td class="vds-variance">{var:.4f} ({var*100:.2f}%)</td>
                            <td class="vds-cumulative">{cum_var:.4f} ({cum_var*100:.2f}%)</td>
                        </tr>
                """
            
            if len(explained_variance) > 10:
                variance_html += f"<tr><td colspan='3' class='vds-info'>... and {len(explained_variance) - 10} more components</td></tr>"
            
            variance_html += """
                    </tbody>
                </table>
            </vds-section>
            """
        
        # Create HTML report
        report_html = f"""
        <vds-engineering-report>
            <vds-title>Advanced Dimensionality Reduction Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Reduction Method</td><td class="vds-value">{method.upper()}</td></tr>
                    <tr><td class="vds-label">Original Dimensions</td><td class="vds-value">{original_dimensions}</td></tr>
                    <tr><td class="vds-label">New Dimensions</td><td class="vds-value">{new_dimensions}</td></tr>
                    <tr><td class="vds-label">Reduction Ratio</td><td class="vds-value">{(1 - new_dimensions/original_dimensions)*100:.1f}%</td></tr>
                    <tr><td class="vds-label">Target Column</td><td class="vds-value">{target_column or 'None'}</td></tr>
                    <tr><td class="vds-label">Keep Original</td><td class="vds-value">{keep_original}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            {variance_html}
        </vds-engineering-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced dimensionality reduction: {str(e)}")


def advanced_feature_selection(csv_file_path: str, target_column: str, method: str = 'variance',
                              n_features: Optional[int] = None, params: Optional[dict] = None) -> str:
    """
    Advanced feature selection with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        target_column: Target variable column
        method: Selection method ('variance', 'correlation', 'mutual_info', 'rfe', 'lasso')
        n_features: Number of features to select
        params: Additional parameters
        
    Returns:
        HTML formatted report with selection results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if target_column not in data.columns:
            return _create_error_report(f"Target column '{target_column}' not found")
        
        # Prepare features
        feature_cols = [col for col in data.columns if col != target_column and pd.api.types.is_numeric_dtype(data[col])]
        
        if not feature_cols:
            return _create_error_report("No numeric features found for selection")
        
        X = data[feature_cols].fillna(data[feature_cols].mean())
        y = data[target_column]
        
        original_features = len(feature_cols)
        
        # Use ml_tools function if available
        if 'select_features' in globals():
            selected_features = select_features(
                data=X,
                target=y,
                method=method,
                n_features=n_features,
                params=params
            )
        else:
            # Fallback implementation
            if method == 'variance':
                from sklearn.feature_selection import VarianceThreshold
                threshold = params.get('threshold', 0.0) if params else 0.0
                selector = VarianceThreshold(threshold=threshold)
                selector.fit(X)
                selected_features = X.columns[selector.get_support()].tolist()
            elif method == 'correlation':
                correlations = X.corrwith(y).abs().sort_values(ascending=False)
                if n_features:
                    selected_features = correlations.head(n_features).index.tolist()
                else:
                    threshold = params.get('threshold', 0.1) if params else 0.1
                    selected_features = correlations[correlations > threshold].index.tolist()
            else:
                return _create_error_report(f"Method '{method}' requires ml_tools implementation")
        
        # Calculate feature scores if possible
        feature_scores = []
        if method == 'correlation':
            correlations = X.corrwith(y).abs()
            for feature in selected_features:
                feature_scores.append({
                    'feature': feature,
                    'score': f"{correlations[feature]:.4f}",
                    'selected': True
                })
            
            # Add some unselected features for comparison
            unselected = [f for f in feature_cols if f not in selected_features][:5]
            for feature in unselected:
                feature_scores.append({
                    'feature': feature,
                    'score': f"{correlations[feature]:.4f}",
                    'selected': False
                })
        
        # Create selected dataset
        selected_data = data[selected_features + [target_column]].copy()
        
        # Save selected data
        output_path = csv_file_path.replace('.csv', f'_selected_{method}.csv')
        selected_data.to_csv(output_path, index=False)
        
        # Create HTML report
        report_html = f"""
        <vds-engineering-report>
            <vds-title>Advanced Feature Selection Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Selection Method</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Target Column</td><td class="vds-value">{target_column}</td></tr>
                    <tr><td class="vds-label">Original Features</td><td class="vds-value">{original_features}</td></tr>
                    <tr><td class="vds-label">Selected Features</td><td class="vds-value">{len(selected_features)}</td></tr>
                    <tr><td class="vds-label">Reduction Ratio</td><td class="vds-value">{(1 - len(selected_features)/original_features)*100:.1f}%</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Selected Features</vds-title>
                <table class="vds-selected-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Feature Name</th>
                            <th class="vds-col-header">Status</th>
        """
        
        if feature_scores and method == 'correlation':
            report_html += '<th class="vds-col-header">Correlation Score</th>'
        
        report_html += """
                        </tr>
                    </thead>
                    <tbody>
        """
        
        # Show selected features first
        for feature in selected_features[:20]:  # Limit to first 20
            report_html += f"""
                        <tr class="vds-selected">
                            <td class="vds-feature-name">{feature}</td>
                            <td class="vds-status">Selected</td>
            """
            if feature_scores and method == 'correlation':
                score = next((s['score'] for s in feature_scores if s['feature'] == feature), 'N/A')
                report_html += f'<td class="vds-score">{score}</td>'
            report_html += '</tr>'
        
        if len(selected_features) > 20:
            report_html += f"<tr><td colspan='3' class='vds-info'>... and {len(selected_features) - 20} more selected features</td></tr>"
        
        # Show some unselected features for comparison
        if feature_scores:
            unselected_shown = [s for s in feature_scores if not s['selected']][:5]
            if unselected_shown:
                report_html += "<tr><td colspan='3' class='vds-separator'>Top Unselected Features (for comparison)</td></tr>"
                for score_info in unselected_shown:
                    report_html += f"""
                        <tr class="vds-unselected">
                            <td class="vds-feature-name">{score_info['feature']}</td>
                            <td class="vds-status">Not Selected</td>
                            <td class="vds-score">{score_info['score']}</td>
                        </tr>
                    """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-engineering-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced feature selection: {str(e)}")


def create_polynomial_features_advanced(csv_file_path: str, columns: Union[str, List[str]],
                                       degree: int = 2, interaction_only: bool = False,
                                       keep_original: bool = True) -> str:
    """
    Advanced polynomial feature creation with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        columns: Columns to create polynomial features from
        degree: Maximum polynomial degree
        interaction_only: Whether to create only interaction features
        keep_original: Whether to keep original columns
        
    Returns:
        HTML formatted report with polynomial feature creation results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if isinstance(columns, str):
            columns = [columns]
        
        # Validate columns
        missing_cols = [col for col in columns if col not in data.columns]
        if missing_cols:
            return _create_error_report(f"Columns not found: {missing_cols}")
        
        non_numeric_cols = [col for col in columns if not pd.api.types.is_numeric_dtype(data[col])]
        if non_numeric_cols:
            return _create_error_report(f"Non-numeric columns: {non_numeric_cols}")
        
        original_columns = list(data.columns)
        
        # Use ml_tools function if available
        if 'create_polynomial_features' in globals():
            poly_data = create_polynomial_features(
                data=data,
                columns=columns,
                degree=degree,
                interaction_only=interaction_only,
                keep_original=keep_original
            )
        else:
            # Fallback implementation
            from sklearn.preprocessing import PolynomialFeatures
            poly = PolynomialFeatures(degree=degree, interaction_only=interaction_only, include_bias=False)
            
            # Transform the specified columns
            X_poly = poly.fit_transform(data[columns])
            feature_names = poly.get_feature_names_out(columns)
            
            # Create DataFrame with polynomial features
            poly_df = pd.DataFrame(X_poly, columns=feature_names, index=data.index)
            
            # Remove original features if they exist in polynomial features and we don't want originals
            if not keep_original:
                poly_df = poly_df.drop(columns=[col for col in columns if col in poly_df.columns], errors='ignore')
                result_data = data.drop(columns=columns)
                poly_data = pd.concat([result_data, poly_df], axis=1)
            else:
                poly_data = pd.concat([data, poly_df], axis=1)
        
        new_features = [col for col in poly_data.columns if col not in original_columns]
        
        # Analyze new features
        feature_analysis = []
        for feature in new_features[:20]:  # Limit analysis to first 20 features
            feature_info = {
                'feature': feature,
                'mean': f"{poly_data[feature].mean():.3f}",
                'std': f"{poly_data[feature].std():.3f}",
                'min': f"{poly_data[feature].min():.3f}",
                'max': f"{poly_data[feature].max():.3f}",
                'type': 'Interaction' if ' ' in feature else 'Polynomial'
            }
            feature_analysis.append(feature_info)
        
        # Save polynomial data
        output_path = csv_file_path.replace('.csv', f'_polynomial_deg{degree}.csv')
        poly_data.to_csv(output_path, index=False)
        
        # Create HTML report
        report_html = f"""
        <vds-engineering-report>
            <vds-title>Advanced Polynomial Feature Creation Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Polynomial Degree</td><td class="vds-value">{degree}</td></tr>
                    <tr><td class="vds-label">Interaction Only</td><td class="vds-value">{interaction_only}</td></tr>
                    <tr><td class="vds-label">Source Columns</td><td class="vds-value">{len(columns)}</td></tr>
                    <tr><td class="vds-label">New Features Created</td><td class="vds-value">{len(new_features)}</td></tr>
                    <tr><td class="vds-label">Total Columns</td><td class="vds-value">{len(poly_data.columns)}</td></tr>
                    <tr><td class="vds-label">Keep Original</td><td class="vds-value">{keep_original}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Source Columns</vds-title>
                <table class="vds-source-table">
                    <thead>
                        <tr><th class="vds-col-header">Column Name</th></tr>
                    </thead>
                    <tbody>
                        {''.join([f'<tr><td class="vds-col-name">{col}</td></tr>' for col in columns])}
                    </tbody>
                </table>
            </vds-section>
            
            <vds-section>
                <vds-title>New Polynomial Features (Sample)</vds-title>
                <table class="vds-poly-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Feature Name</th>
                            <th class="vds-col-header">Type</th>
                            <th class="vds-col-header">Mean</th>
                            <th class="vds-col-header">Std</th>
                            <th class="vds-col-header">Min</th>
                            <th class="vds-col-header">Max</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for analysis in feature_analysis:
            type_class = "vds-interaction" if analysis['type'] == 'Interaction' else "vds-polynomial"
            report_html += f"""
                        <tr class="{type_class}">
                            <td class="vds-feature-name">{analysis['feature']}</td>
                            <td class="vds-feature-type">{analysis['type']}</td>
                            <td class="vds-stat-value">{analysis['mean']}</td>
                            <td class="vds-stat-value">{analysis['std']}</td>
                            <td class="vds-stat-value">{analysis['min']}</td>
                            <td class="vds-stat-value">{analysis['max']}</td>
                        </tr>
            """
        
        if len(new_features) > 20:
            report_html += f"<tr><td colspan='6' class='vds-info'>... and {len(new_features) - 20} more polynomial features</td></tr>"
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-engineering-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced polynomial feature creation: {str(e)}")


def discretize_features_advanced(csv_file_path: str, columns: Union[str, List[str]],
                                method: str = 'equal_width', n_bins: int = 10,
                                labels: Optional[List[str]] = None, keep_original: bool = True) -> str:
    """
    Advanced feature discretization with VDS Tools integration
    
    Args:
        csv_file_path: Path to CSV file
        columns: Columns to discretize
        method: Discretization method ('equal_width', 'equal_freq', 'kmeans')
        n_bins: Number of bins
        labels: Custom labels for bins
        keep_original: Whether to keep original columns
        
    Returns:
        HTML formatted report with discretization results
    """
    try:
        data = pd.read_csv(csv_file_path)
        
        if isinstance(columns, str):
            columns = [columns]
        
        # Validate columns
        missing_cols = [col for col in columns if col not in data.columns]
        if missing_cols:
            return _create_error_report(f"Columns not found: {missing_cols}")
        
        non_numeric_cols = [col for col in columns if not pd.api.types.is_numeric_dtype(data[col])]
        if non_numeric_cols:
            return _create_error_report(f"Non-numeric columns: {non_numeric_cols}")
        
        original_columns = list(data.columns)
        
        # Use ml_tools function if available
        if 'discretize_features' in globals():
            discretized_data = discretize_features(
                data=data,
                columns=columns,
                method=method,
                n_bins=n_bins,
                labels=labels,
                keep_original=keep_original
            )
        else:
            # Fallback implementation
            discretized_data = data.copy()
            
            for col in columns:
                new_col = f"{col}_bin" if keep_original else col
                
                if method == 'equal_width':
                    discretized_data[new_col] = pd.cut(data[col], bins=n_bins, labels=labels)
                elif method == 'equal_freq':
                    try:
                        discretized_data[new_col] = pd.qcut(data[col], q=n_bins, labels=labels, duplicates='drop')
                    except ValueError:
                        discretized_data[new_col] = pd.cut(data[col], bins=n_bins, labels=labels)
                elif method == 'kmeans':
                    from sklearn.cluster import KMeans
                    kmeans = KMeans(n_clusters=n_bins, random_state=42)
                    discretized_data[new_col] = kmeans.fit_predict(data[col].values.reshape(-1, 1))
                
                if not keep_original:
                    discretized_data = discretized_data.drop(columns=[col])
        
        new_columns = [col for col in discretized_data.columns if col not in original_columns]
        
        # Analyze discretization results
        discretization_analysis = []
        for col in columns:
            new_col = f"{col}_bin" if keep_original else col
            if new_col in discretized_data.columns:
                # Get bin distribution
                value_counts = discretized_data[new_col].value_counts().sort_index()
                
                analysis_info = {
                    'original_column': col,
                    'new_column': new_col,
                    'bins_created': len(value_counts),
                    'min_bin_size': value_counts.min(),
                    'max_bin_size': value_counts.max(),
                    'avg_bin_size': f"{value_counts.mean():.1f}",
                    'original_range': f"[{data[col].min():.3f}, {data[col].max():.3f}]",
                    'unique_values': data[col].nunique()
                }
                discretization_analysis.append(analysis_info)
        
        # Save discretized data
        output_path = csv_file_path.replace('.csv', f'_discretized_{method}.csv')
        discretized_data.to_csv(output_path, index=False)
        
        # Create HTML report
        report_html = f"""
        <vds-engineering-report>
            <vds-title>Advanced Feature Discretization Report</vds-title>
            <vds-info-panel>
                <table class="vds-info-table">
                    <tr><td class="vds-label">Discretization Method</td><td class="vds-value">{method}</td></tr>
                    <tr><td class="vds-label">Number of Bins</td><td class="vds-value">{n_bins}</td></tr>
                    <tr><td class="vds-label">Columns Processed</td><td class="vds-value">{len(columns)}</td></tr>
                    <tr><td class="vds-label">New Columns Created</td><td class="vds-value">{len(new_columns)}</td></tr>
                    <tr><td class="vds-label">Custom Labels</td><td class="vds-value">{'Yes' if labels else 'No'}</td></tr>
                    <tr><td class="vds-label">Keep Original</td><td class="vds-value">{keep_original}</td></tr>
                    <tr><td class="vds-label">Output File</td><td class="vds-value">{output_path}</td></tr>
                </table>
            </vds-info-panel>
            
            <vds-section>
                <vds-title>Discretization Results</vds-title>
                <table class="vds-discretization-table">
                    <thead>
                        <tr>
                            <th class="vds-col-header">Original Column</th>
                            <th class="vds-col-header">New Column</th>
                            <th class="vds-col-header">Bins Created</th>
                            <th class="vds-col-header">Min Bin Size</th>
                            <th class="vds-col-header">Max Bin Size</th>
                            <th class="vds-col-header">Avg Bin Size</th>
                            <th class="vds-col-header">Original Range</th>
                            <th class="vds-col-header">Original Unique</th>
                        </tr>
                    </thead>
                    <tbody>
        """
        
        for analysis in discretization_analysis:
            report_html += f"""
                        <tr>
                            <td class="vds-col-name">{analysis['original_column']}</td>
                            <td class="vds-new-col-name">{analysis['new_column']}</td>
                            <td class="vds-bin-count">{analysis['bins_created']}</td>
                            <td class="vds-bin-size">{analysis['min_bin_size']}</td>
                            <td class="vds-bin-size">{analysis['max_bin_size']}</td>
                            <td class="vds-bin-size">{analysis['avg_bin_size']}</td>
                            <td class="vds-range-value">{analysis['original_range']}</td>
                            <td class="vds-unique-count">{analysis['unique_values']}</td>
                        </tr>
            """
        
        report_html += """
                    </tbody>
                </table>
            </vds-section>
        </vds-engineering-report>
        """
        
        return report_html
        
    except Exception as e:
        return _create_error_report(f"Error in advanced feature discretization: {str(e)}")


def _create_error_report(error_message: str) -> str:
    """Create HTML error report"""
    return f"""
    <vds-error-panel>
        <table class="vds-error-table">
            <tr><td class="vds-error-label">Feature Engineering Error</td><td class="vds-error-value">{error_message}</td></tr>
        </table>
    </vds-error-panel>
    """