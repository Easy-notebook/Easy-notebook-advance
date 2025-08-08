from typing import Dict, Any, Optional
from app.models.BaseAction import BaseAction, event, after_exec, finnish

class CurrentDataStateAssessment(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_3_data_insight_acquisition",
                         section_id="section_2_current_data_state_assessment",
                         name="Current Data State Assessment",
                         ability="Assess current data state and extract comprehensive data information for insight analysis",
                         require_variables=["csv_file_path"])
    
    @event("start")
    def start(self):
        return self.new_section("Data Preview") \
            .add_text("Assessing current data state for insight acquisition") \
            .add_text("Extracting variable names and data preview information") \
            .next_event("extract_data_info") \
            .end_event()
    
    @event("extract_data_info")
    def extract_data_info(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Reading dataset and extracting column information:") \
            .add_code(f'''import pandas as pd

# Load the dataset and extract basic information
data = pd.read_csv("{csv_file_path}")

# Get column names and basic structure
variables = list(data.columns)
print("Dataset Variables:")
print(variables)

# Get basic dataset information
print("\\nDataset Shape:", data.shape)
print(f"Total Rows: {{data.shape[0]}}")
print(f"Total Columns: {{data.shape[1]}}")

# Data types overview
print("\\nData Types:")
print(data.dtypes.to_string())

variables''') \
            .exe_code_cli(
                event_tag="data_info_extracted",
                mark_finnish="Data variable information extracted"
            ) \
            .end_event()
    
    @after_exec("data_info_extracted")
    def data_info_extracted(self):
        data_info = self.get_current_effect()
        return self.add_variable("data_info", data_info) \
            .add_text("Variable information extracted, generating data preview") \
            .next_event("generate_data_preview") \
            .end_event()
    
    @event("generate_data_preview")
    def generate_data_preview(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Generating comprehensive data preview:") \
            .add_code(f'''import pandas as pd

# Load data and generate comprehensive preview
data = pd.read_csv("{csv_file_path}")

# Display first 5 rows
print("=== First 5 Rows ===")
preview_data = data.head()
print(preview_data.to_string())

# Basic statistical summary for numeric columns
print("\\n=== Statistical Summary ===")
if len(data.select_dtypes(include=['number']).columns) > 0:
    print(data.describe().to_string())
else:
    print("No numeric columns found for statistical summary")

# Missing value summary
print("\\n=== Missing Values Summary ===")
missing_counts = data.isnull().sum()
missing_percentages = (missing_counts / len(data)) * 100
missing_summary = pd.DataFrame({{
    'Missing Count': missing_counts,
    'Missing Percentage': missing_percentages.round(2)
}})
missing_summary = missing_summary[missing_summary['Missing Count'] > 0]
if not missing_summary.empty:
    print(missing_summary.to_string())
else:
    print("No missing values found")

# Return preview for variable storage
preview_data.to_dict(orient="records")''') \
            .exe_code_cli(
                event_tag="preview_generated",
                mark_finnish="Comprehensive data preview generated"
            ) \
            .end_event()
    
    @after_exec("preview_generated")
    def preview_generated(self):
        data_preview = self.get_current_effect()
        return self.add_variable("data_preview", data_preview) \
            .add_text("Data preview completed, assessing data quality indicators") \
            .next_event("data_quality_assessment") \
            .end_event()
    
    @event("data_quality_assessment")
    def data_quality_assessment(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Performing data quality assessment for insight readiness:") \
            .add_code(f'''import pandas as pd
import numpy as np

# Load data for quality assessment
data = pd.read_csv("{csv_file_path}")

print("=== Data Quality Assessment ===")

# 1. Completeness Assessment
total_cells = data.shape[0] * data.shape[1]
missing_cells = data.isnull().sum().sum()
completeness = ((total_cells - missing_cells) / total_cells) * 100
print(f"Data Completeness: {{completeness:.2f}}%")

# 2. Uniqueness Assessment
print("\\n=== Uniqueness Analysis ===")
for col in data.columns:
    unique_count = data[col].nunique()
    total_count = len(data[col])
    uniqueness = (unique_count / total_count) * 100
    print(f"{{col}}: {{unique_count}} unique values ({{uniqueness:.1f}}% unique)")

# 3. Data Type Consistency
print("\\n=== Data Type Analysis ===")
numeric_cols = data.select_dtypes(include=[np.number]).columns.tolist()
categorical_cols = data.select_dtypes(include=['object']).columns.tolist()
datetime_cols = data.select_dtypes(include=['datetime64']).columns.tolist()

print(f"Numeric columns ({{len(numeric_cols)}}): {{numeric_cols}}")
print(f"Categorical columns ({{len(categorical_cols)}}): {{categorical_cols}}")
print(f"Datetime columns ({{len(datetime_cols)}}): {{datetime_cols}}")

# 4. Outlier Detection for numeric columns
if numeric_cols:
    print("\\n=== Outlier Detection (IQR Method) ===")
    outlier_summary = {{}}
    for col in numeric_cols[:5]:  # Check first 5 numeric columns
        Q1 = data[col].quantile(0.25)
        Q3 = data[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        outliers = ((data[col] < lower_bound) | (data[col] > upper_bound)).sum()
        outlier_percentage = (outliers / len(data)) * 100
        outlier_summary[col] = {{"count": outliers, "percentage": outlier_percentage}}
        print(f"{{col}}: {{outliers}} outliers ({{outlier_percentage:.2f}}%)")

print("\\n=== Data Readiness Summary ===")
readiness_score = completeness
if readiness_score >= 90:
    readiness_status = "Excellent - Ready for comprehensive analysis"
elif readiness_score >= 75:
    readiness_status = "Good - Ready for most analysis tasks"
elif readiness_score >= 60:
    readiness_status = "Fair - May need additional preprocessing"
else:
    readiness_status = "Poor - Requires significant preprocessing"

print(f"Data Readiness Score: {{readiness_score:.1f}}%")
print(f"Status: {{readiness_status}}")

# Return summary for storage
{{
    "completeness": completeness,
    "readiness_score": readiness_score,
    "readiness_status": readiness_status,
    "numeric_columns": numeric_cols,
    "categorical_columns": categorical_cols,
    "total_rows": data.shape[0],
    "total_columns": data.shape[1]
}}''') \
            .exe_code_cli(
                event_tag="quality_assessed",
                mark_finnish="Data quality assessment completed"
            ) \
            .end_event()
    
    @after_exec("quality_assessed")
    def quality_assessed(self):
        quality_assessment = self.get_current_effect()
        
        # Extract key metrics for display
        if isinstance(quality_assessment, dict):
            readiness_score = quality_assessment.get("readiness_score", 0)
            readiness_status = quality_assessment.get("readiness_status", "Unknown")
            total_rows = quality_assessment.get("total_rows", 0)
            total_columns = quality_assessment.get("total_columns", 0)
            
            status_icon = "🟢" if readiness_score >= 90 else "🟡" if readiness_score >= 75 else "🟠" if readiness_score >= 60 else "🔴"
            
            self.add_text(f"{status_icon} **Data Readiness**: {readiness_score:.1f}% - {readiness_status}")
            self.add_text(f"📊 **Dataset Size**: {total_rows:,} rows × {total_columns} columns")
        
        return self.add_variable("data_quality_assessment", quality_assessment) \
            .add_text("✅ Current data state assessment completed") \
            .add_text("Dataset is ready for targeted inquiry generation and insight extraction") \
            .end_event()

async def generate_exploratory_data_sequence_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return CurrentDataStateAssessment(step, state, stream).run()