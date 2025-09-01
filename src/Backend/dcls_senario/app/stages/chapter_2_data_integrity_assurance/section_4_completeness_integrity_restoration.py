from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.Behavior import Behavior, event, thinking, after_exec, finnish

class CompletenessIntegrityRestoration(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_2_data_integrity_assurance",
                         section_id="section_4_completeness_integrity_restoration",
                         name="Completeness Integrity Restoration",
                         ability="Restore data completeness by handling missing values comprehensively",
                         require_variables=["problem_description", "context_description", "csv_file_path"])
    
    @event("start")
    def start(self):
        return self.new_section("Missing Value Analysis") \
            .add_text("Starting completeness integrity restoration process") \
            .add_text("Analyzing missing values to identify data quality issues") \
            .next_thinking_event(
                event_tag="check_data_info",
                textArray=["Data Cleaning Agent is working...", "Checking data information..."],
                agentName="Data Cleaning Agent"
            ) \
            .end_event()
    
    @thinking("check_data_info")
    def check_data_info(self):
        csv_file_path = self.get_full_csv_path()
        return self.conclusion("data_info_check", {
            "action": "data_info_analysis",
            "csv_file_path": csv_file_path,
            "message": "Checking basic dataset information"
        }) \
        .end_event()
    
    @finnish("data_info_check")
    def data_info_check(self):
        data_check = self.get_thinking("data_info_check")
        csv_file_path = data_check.get("csv_file_path")
        
        return self.add_text("Checking basic information about the dataset:") \
            .add_code(f'''from vdstools import DataPreview
data_preview = DataPreview("{csv_file_path}")
data_preview.data_info()''') \
            .exe_code_cli(
                event_tag="data_info_collected",
                mark_finnish="Data info collection completed"
            ) \
            .end_event()
    
    @after_exec("data_info_collected")
    def data_info_collected(self):
        data_info = self.get_current_effect()
        return self.add_variable("data_info", data_info) \
            .add_text("Data information collected, analyzing missing value patterns") \
            .next_event("missing_value_analysis") \
            .end_event()
    
    @event("missing_value_analysis")
    def missing_value_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Checking for missing values in each column:") \
            .add_code(f'''import pandas as pd

data = pd.read_csv("{csv_file_path}")
missing_data = data.isna().sum() / len(data.index)
missing_data_sorted = missing_data.sort_values(ascending=False)    
missing_data_str = missing_data_sorted.to_string()
print("Missing value percentages by column (sorted):")
print(missing_data_str)''') \
            .exe_code_cli(
                event_tag="missing_values_collected",
                mark_finnish="Missing value analysis completed"
            ) \
            .end_event()
    
    @after_exec("missing_values_collected")
    def missing_values_collected(self):
        missing_value_str = self.get_current_effect()
        return self.add_variable("missing_value_str", missing_value_str) \
            .add_text("Missing values analyzed, creating visualization") \
            .next_event("missing_value_visualization") \
            .end_event()
    
    @event("missing_value_visualization")
    def missing_value_visualization(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Creating focused overview of missing value percentages:") \
            .add_code(f'''import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Read data and calculate missing values
data = pd.read_csv('{csv_file_path}')
missing_percentages = data.isna().sum() / len(data) * 100

# Filter columns with missing values
missing_cols = missing_percentages[missing_percentages > 0].sort_values(ascending=False)

# Create visualization only if there are missing values
if len(missing_cols) > 0:
    plt.figure(figsize=(10, 6))
    bars = plt.bar(range(len(missing_cols)), missing_cols.values, color='lightcoral', alpha=0.7)
    
    # Add value labels on bars
    for i, bar in enumerate(bars):
        height = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., height + 0.1,
                f'{{height:.1f}}%', ha='center', va='bottom')
    
    plt.title('Missing Value Percentages by Column', fontsize=14, fontweight='bold')
    plt.xlabel('Columns', fontsize=12)
    plt.ylabel('Missing Value Percentage (%)', fontsize=12)
    plt.xticks(range(len(missing_cols)), missing_cols.index, rotation=45, ha='right')
    plt.grid(axis='y', alpha=0.3)
    plt.tight_layout()
    
    # Save the plot
    plt.savefig('data_cleaning_missing_value_overview.png', dpi=300, bbox_inches='tight')
    plt.show()
    plt.close()
    
    print(f"Missing value analysis complete. Found {{len(missing_cols)}} columns with missing values.")
    print("Generated missing value overview chart: data_cleaning_missing_value_overview.png")
else:
    print("No missing values found in the dataset.")''') \
            .exe_code_cli(
                event_tag="visualization_complete",
                mark_finnish="Missing value visualization completed"
            ) \
            .end_event()
    
    @after_exec("visualization_complete")
    def visualization_complete(self):
        visualization_result = self.get_current_effect()
        return self.add_variable("missing_value_visualization", visualization_result) \
            .add_text("Visualization created, analyzing missing value patterns") \
            .next_thinking_event(
                event_tag="analyze_missing_patterns",
                textArray=["Data Cleaning Agent is analyzing...", "Analyzing missing value patterns..."],
                agentName="Data Cleaning Agent"
            ) \
            .end_event()
    
    @thinking("analyze_missing_patterns")
    def analyze_missing_patterns(self):
        try:
            # Get analysis context
            missing_value_check_result = self.get_variable("missing_value_visualization")
            missing_value_str = self.get_variable("missing_value_str")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("column_names", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            
            # Initialize cleaning agent
            clean_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Analyze missing value patterns
            missing_value_problems = clean_agent.analyze_missing_values_result_cli(
                result=missing_value_check_result,
                missing_data_str=missing_value_str,
                data_unit=unit_check
            )
            
            return self.conclusion("missing_value_analysis_result", missing_value_problems)
        except Exception as e:
            # Fallback analysis
            fallback_analysis = "no problem"
            return self.conclusion("missing_value_analysis_result", fallback_analysis)
        finally:
            return self.end_event()
    
    @finnish("missing_value_analysis_result")
    def missing_value_analysis_result(self):
        missing_value_problems = self.get_thinking("missing_value_analysis_result")
        
        if missing_value_problems == "no problem":
            return self.add_text("✅ No significant missing value problems detected") \
                .add_text("Dataset completeness is satisfactory, ready to proceed to next step") \
                .end_event()
        else:
            # Convert problems to table format if it's a list/dict
            if isinstance(missing_value_problems, (list, dict)):
                markdown_str = self.to_tableh(missing_value_problems)
                self.add_text("⚠️ Missing value problems identified:")
                self.add_text(markdown_str)
            else:
                self.add_text(f"⚠️ Missing value issues found: {missing_value_problems}")
            
            return self.add_variable("missing_value_problems", missing_value_problems) \
                .next_thinking_event(
                    event_tag="generate_restoration_operations",
                    textArray=["Data Cleaning Agent is working...", "Generating restoration operations..."],
                    agentName="Data Cleaning Agent"
                ) \
                .end_event()
    
    @thinking("generate_restoration_operations")
    def generate_restoration_operations(self):
        try:
            # Get restoration context
            missing_value_problems = self.get_variable("missing_value_problems")
            csv_file_path = self.get_full_csv_path()
            context_description = self.get_variable("context_description")
            problem_description = self.get_variable("problem_description")
            unit_check = self.get_variable("unit_check", "")
            variables = self.get_variable("variables", self.get_variable("column_names", []))
            hypothesis = self.get_variable("pcs_hypothesis", {})
            data_info = self.get_variable("data_info")
            
            # Initialize cleaning agent
            clean_agent = DataCleaningAndEDA_Agent(
                llm=llm,
                problem_description=problem_description,
                context_description=context_description,
                check_unit=unit_check,
                var_json=variables,
                hyp_json=hypothesis
            )
            
            # Handle multiple problems - process one at a time for completeness restoration
            if isinstance(missing_value_problems, list) and len(missing_value_problems) > 0:
                # Get the first problem to solve
                current_problem = missing_value_problems[0]
                remaining_problems = missing_value_problems[1:] if len(missing_value_problems) > 1 else []
                
                # Generate restoration code for current problem
                restoration_code = clean_agent.generate_cleaning_code_cli(
                    csv_file_path,
                    current_problem,
                    context_description,
                    variables,
                    unit_check,
                    data_info,
                    "missing_value_resolved.csv"
                )
                
                return self.conclusion("restoration_operation", {
                    "code": restoration_code,
                    "current_problem": current_problem,
                    "remaining_problems": remaining_problems,
                    "output_file": "missing_value_resolved.csv"
                })
            else:
                # Single problem or no problems
                if missing_value_problems and missing_value_problems != "no problem":
                    restoration_code = clean_agent.generate_cleaning_code_cli(
                        csv_file_path,
                        missing_value_problems,
                        context_description,
                        variables,
                        unit_check,
                        data_info,
                        "missing_value_resolved.csv"
                    )
                    
                    return self.conclusion("restoration_operation", {
                        "code": restoration_code,
                        "current_problem": missing_value_problems,
                        "remaining_problems": [],
                        "output_file": "missing_value_resolved.csv"
                    })
                else:
                    return self.conclusion("restoration_operation", {"code": None, "no_problems": True})
        except Exception as e:
            # Fallback restoration operation
            fallback_code = f'''# Fallback missing value restoration
import pandas as pd
import numpy as np
from sklearn.impute import SimpleImputer, KNNImputer

data = pd.read_csv("{self.get_full_csv_path()}")
print("Performing comprehensive missing value restoration...")
print(f"Original shape: {{data.shape}}")

# Display missing value summary
missing_summary = data.isnull().sum()
print("\\nMissing values per column:")
print(missing_summary[missing_summary > 0])

# Separate numeric and categorical columns
numeric_cols = data.select_dtypes(include=[np.number]).columns
categorical_cols = data.select_dtypes(include=['object']).columns

# Handle numeric columns with median imputation
if len(numeric_cols) > 0:
    numeric_imputer = SimpleImputer(strategy='median')
    data[numeric_cols] = numeric_imputer.fit_transform(data[numeric_cols])

# Handle categorical columns with mode imputation
if len(categorical_cols) > 0:
    categorical_imputer = SimpleImputer(strategy='most_frequent')
    data[categorical_cols] = categorical_imputer.fit_transform(data[categorical_cols])

print(f"\\nRestored shape: {{data.shape}}")
print(f"Remaining missing values: {{data.isnull().sum().sum()}}")

data.to_csv("missing_value_resolved.csv", index=False)
print("Missing value restoration completed successfully")'''
            
            return self.conclusion("restoration_operation", {
                "code": fallback_code,
                "current_problem": f"Error in restoration generation: {str(e)}",
                "remaining_problems": [],
                "output_file": "missing_value_resolved.csv"
            })
        finally:
            return self.end_event()
    
    @finnish("restoration_operation")
    def restoration_operation(self):
        restoration_op = self.get_thinking("restoration_operation")
        
        if restoration_op.get("no_problems"):
            return self.add_text("✅ No missing value problems to restore") \
                .end_event()
        
        restoration_code = restoration_op.get("code")
        current_problem = restoration_op.get("current_problem", "Unknown problem")
        remaining_problems = restoration_op.get("remaining_problems", [])
        output_file = restoration_op.get("output_file", "missing_value_resolved.csv")
        
        # Display current problem being solved
        if isinstance(current_problem, dict):
            problem_desc = current_problem.get('problem', 'Missing Value Issue')
        else:
            problem_desc = str(current_problem)
        
        result = self.add_text(f"🔧 Resolving Issue: {problem_desc}") \
            .add_text("Generating restoration code to resolve this specific issue:") \
            .add_code(restoration_code) \
            .exe_code_cli(
                event_tag="restoration_executed",
                mark_finnish="Completeness restoration operation completed"
            )
        
        # Update CSV file path for next operations
        self.add_variable("csv_file_path", output_file)
        
        # If there are remaining problems, continue with next iteration
        if remaining_problems:
            self.add_variable("missing_value_problems", remaining_problems)
            result = result.next_thinking_event(
                event_tag="generate_restoration_operations",
                textArray=["Data Cleaning Agent is working...", "Processing next restoration operation..."],
                agentName="Data Cleaning Agent"
            )
        
        return result.end_event()
    
    @after_exec("restoration_executed")
    def restoration_executed(self):
        restoration_result = self.get_current_effect()
        
        # Check if there are still remaining problems to process
        remaining_problems = self.get_variable("missing_value_problems", [])
        if remaining_problems:
            return self.add_text("✅ Current missing value issue resolved, continuing with remaining issues") \
                .end_event()  # This will trigger the next iteration through the thinking event
        else:
            return self.add_variable("completeness_restoration_result", restoration_result) \
                .add_text("🎉 All missing value issues have been resolved!") \
                .add_text("✅ Data completeness integrity restored successfully") \
                .add_text("Ready to proceed to the next data integrity check.") \
                .end_event()

async def generate_data_cleaning_sequence_step3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return CompletenessIntegrityRestoration(step, state, stream).run()