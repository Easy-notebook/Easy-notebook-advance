"""
Base classes and utilities for VDS Tools
"""

import pandas as pd
import numpy as np
from typing import Union, List, Optional, Dict, Any
import warnings
import os


class BaseProcessor:
    """Base class for all VDS Tools processors"""
    
    def __init__(self):
        self.name = self.__class__.__name__
        
    def validate_input(self, data: pd.DataFrame, required_columns: Optional[List[str]] = None) -> bool:
        """Validate input data"""
        if not isinstance(data, pd.DataFrame):
            raise TypeError("Input data must be a pandas DataFrame")
        
        if data.empty:
            raise ValueError("Input DataFrame is empty")
        
        if required_columns:
            missing_cols = [col for col in required_columns if col not in data.columns]
            if missing_cols:
                raise ValueError(f"Required columns not found: {missing_cols}")
        
        return True
    
    def log_operation(self, operation: str, details: Dict[str, Any]) -> str:
        """Log operation details and return HTML report"""
        timestamp = pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S")
        
        log_html = f"""
        <vds-operation-log>
            <vds-title>{self.name} - {operation}</vds-title>
            <table class="vds-log-table">
                <tr><td class="vds-label">Timestamp</td><td class="vds-value">{timestamp}</td></tr>
        """
        
        for key, value in details.items():
            log_html += f'<tr><td class="vds-label">{key}</td><td class="vds-value">{value}</td></tr>'
        
        log_html += """
            </table>
        </vds-operation-log>
        """
        
        return log_html