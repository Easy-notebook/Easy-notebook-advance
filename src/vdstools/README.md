# VDS Tools

Simple data science toolkit for DCLS workflow.

Replaces hardcoded data operations with better visual output for Jupyter notebooks.

## Features

- Enhanced data preview with HTML output
- Data cleaning tools using ml_tools integration
- EDA analysis tools with structured reports
- Custom vds-prefixed HTML tags for frontend styling

## Installation

```bash
pip install -e .
```

## Usage

```python
from vdstools import enhanced_data_preview, apply_cleaning_method

# Enhanced data preview
result = enhanced_data_preview("data.csv", n_rows=5)

# Data cleaning
result = apply_cleaning_method("data.csv", "fill_missing_values")
```