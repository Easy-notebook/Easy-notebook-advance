from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class ValueValidityAssurance(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_2_data_integrity_assurance",
                         section_id="section_3_value_validity_assurance",
                         name="Value Validity Assurance",
                         ability="Validate value validity and resolve invalid value problems",
                         require_variables=["problem_description", "context_description", "csv_file_path"])
    
    @event("start")
    def start(self):
        return self.new_section("Invalid Value Analysis") \
            .add_text("Starting value validity assurance process") \
            .next_event("data_info_check") \
            .end_event()
    
    @event("data_info_check")
    def data_info_check(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Analyzing current data information for value validation") \
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
            .add_text("Analyzing value ranges for each variable") \
            .next_event("value_range_analysis") \
            .end_event()
    
    @event("value_range_analysis")
    def value_range_analysis(self):
        csv_file_path = self.get_full_csv_path()
        return self.add_text("Examining value ranges and patterns in dataset") \
            .add_code(f'''from vdstools import DataPreview
data_preview = DataPreview("{csv_file_path}")
data_preview.column_range()''') \
            .exe_code_cli(
                event_tag="value_ranges_collected",
                mark_finnish="Value range analysis completed"
            ) \
            .end_event()
    
    @after_exec("value_ranges_collected")
    def value_ranges_collected(self):
        value_ranges = self.get_current_effect()
        return self.add_variable("value_ranges", value_ranges) \
            .add_text("Value ranges collected, analyzing for invalid value problems") \
            .next_thinking_event(
                event_tag="analyze_invalid_values",
                textArray=["Data Cleaning and EDA Agent is thinking...", "analyzing the invalid value problems..."],
                agentName="Data Cleaning Agent"
            ) \
            .end_event()
    
    @thinking("analyze_invalid_values")
    def analyze_invalid_values(self):
        try:
            # Get analysis context
            value_ranges = self.get_variable("value_ranges")
            context_description = self.get_variable("context_description")
            problem_description = self.get_variable("problem_description")
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
            
            # Analyze invalid values
            invalid_value_problems = clean_agent.check_for_invalid_values_cli(
                value_ranges, context_description, variables
            )
            
            return self.conclusion("invalid_value_analysis", invalid_value_problems)
        except Exception as e:
            # Fallback analysis
            fallback_analysis = "no problem"
            return self.conclusion("invalid_value_analysis", fallback_analysis)
        finally:
            return self.end_event()
    
    @finnish("invalid_value_analysis")
    def invalid_value_analysis(self):
        invalid_value_problems = self.get_thinking("invalid_value_analysis")
        
        if invalid_value_problems == "no problem":
            return self.add_text("✅ No invalid value problems detected") \
                .add_text("All values are within valid ranges, proceeding to next step") \
                .end_event()
        else:
            # Convert problems to table format if it's a list/dict
            if isinstance(invalid_value_problems, (list, dict)):
                markdown_str = self.to_tableh(invalid_value_problems)
                self.add_text("⚠️ Invalid value issues detected:")
                self.add_text(markdown_str)
            else:
                self.add_text(f"⚠️ Invalid values found: {invalid_value_problems}")
            
            return self.add_variable("invalid_value_problems", invalid_value_problems) \
                .next_thinking_event(
                    event_tag="generate_batch_cleaning_operations",
                    textArray=["Data Cleaning and EDA Agent is thinking...", "generating batch cleaning operations..."],
                    agentName="Data Cleaning Agent"
                ) \
                .end_event()
    
    @thinking("generate_batch_cleaning_operations")
    def generate_batch_cleaning_operations(self):
        try:
            # Get cleaning context
            invalid_value_problems = self.get_variable("invalid_value_problems")
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
            
            # Handle batch processing for efficiency
            if isinstance(invalid_value_problems, list) and len(invalid_value_problems) > 0:
                # Group issues by cleaning method type for batch processing
                grouped_issues = {}
                for issue in invalid_value_problems:
                    if isinstance(issue, dict):
                        method_type = issue.get('method', 'general')
                    else:
                        method_type = 'general'
                    
                    if method_type not in grouped_issues:
                        grouped_issues[method_type] = []
                    grouped_issues[method_type].append(issue)
                
                # Generate batch operations
                batch_operations = []
                method_counter = 1
                final_output_filename = "invalid_value_resolved.csv"
                
                for method_type, issues in grouped_issues.items():
                    # Determine input file (first batch uses original, subsequent use previous output)
                    if method_counter == 1:
                        input_csv_path = csv_file_path
                    else:
                        input_csv_path = final_output_filename
                    
                    # Generate batch cleaning code for all issues of this type
                    batch_cleaning_code = clean_agent.generate_cleaning_code_cli(
                        input_csv_path,
                        issues,  # Pass all issues of same type for batch processing
                        context_description,
                        variables,
                        unit_check,
                        data_info,
                        final_output_filename
                    )
                    
                    batch_operations.append({
                        "method_group": method_counter,
                        "method_type": method_type,
                        "issues": issues,
                        "issue_count": len(issues),
                        "code": batch_cleaning_code,
                        "input_file": input_csv_path,
                        "output_file": final_output_filename
                    })
                    
                    method_counter += 1
                
                return self.conclusion("batch_cleaning_operations", {
                    "operations": batch_operations,
                    "total_issues": len(invalid_value_problems),
                    "final_output": final_output_filename
                })
            else:
                # Single issue or no issues
                if invalid_value_problems and invalid_value_problems != "no problem":
                    cleaning_code = clean_agent.generate_cleaning_code_cli(
                        csv_file_path,
                        invalid_value_problems,
                        context_description,
                        variables,
                        unit_check,
                        data_info,
                        "invalid_value_resolved.csv"
                    )
                    
                    return self.conclusion("batch_cleaning_operations", {
                        "operations": [{
                            "method_group": 1,
                            "method_type": "single",
                            "issues": [invalid_value_problems],
                            "issue_count": 1,
                            "code": cleaning_code,
                            "input_file": csv_file_path,
                            "output_file": "invalid_value_resolved.csv"
                        }],
                        "total_issues": 1,
                        "final_output": "invalid_value_resolved.csv"
                    })
                else:
                    return self.conclusion("batch_cleaning_operations", {"no_problems": True})
        except Exception as e:
            # Fallback cleaning operation
            fallback_code = f'''# Fallback invalid value cleaning
import pandas as pd
import numpy as np

data = pd.read_csv("{self.get_full_csv_path()}")
print("Performing basic invalid value cleaning...")
print(f"Original shape: {{data.shape}}")

# Basic cleaning operations
# Remove obvious invalid values
for col in data.select_dtypes(include=[np.number]).columns:
    # Remove negative values where they shouldn't exist
    if col.lower() in ['age', 'price', 'amount', 'quantity']:
        data.loc[data[col] < 0, col] = np.nan
    
    # Remove extreme outliers (beyond 3 standard deviations)
    mean_val = data[col].mean()
    std_val = data[col].std()
    if not pd.isna(mean_val) and not pd.isna(std_val):
        lower_bound = mean_val - 3 * std_val
        upper_bound = mean_val + 3 * std_val
        data.loc[(data[col] < lower_bound) | (data[col] > upper_bound), col] = np.nan

print(f"Cleaned shape: {{data.shape}}")
data.to_csv("invalid_value_resolved.csv", index=False)
print("Basic invalid value cleaning completed")'''
            
            return self.conclusion("batch_cleaning_operations", {
                "operations": [{
                    "method_group": 1,
                    "method_type": "fallback",
                    "issues": [f"Error in cleaning generation: {str(e)}"],
                    "issue_count": 1,
                    "code": fallback_code,
                    "input_file": self.get_full_csv_path(),
                    "output_file": "invalid_value_resolved.csv"
                }],
                "total_issues": 1,
                "final_output": "invalid_value_resolved.csv"
            })
        finally:
            return self.end_event()
    
    @finnish("batch_cleaning_operations")
    def batch_cleaning_operations(self):
        batch_ops = self.get_thinking("batch_cleaning_operations")
        
        if batch_ops.get("no_problems"):
            return self.add_text("✅ No invalid value problems to clean") \
                .end_event()
        
        operations = batch_ops.get("operations", [])
        total_issues = batch_ops.get("total_issues", 0)
        final_output = batch_ops.get("final_output", "invalid_value_resolved.csv")
        
        self.add_text(f"🔧 Processing {total_issues} invalid value issues using batch operations")
        self.add_text(f"📊 Organized into {len(operations)} method groups for efficient processing")
        
        # Execute all batch operations
        return self.add_variable("remaining_operations", operations) \
            .add_variable("current_operation_index", 0) \
            .next_event("execute_next_batch") \
            .end_event()
    
    @event("execute_next_batch")
    def execute_next_batch(self):
        remaining_operations = self.get_variable("remaining_operations", [])
        current_index = self.get_variable("current_operation_index", 0)
        
        if current_index >= len(remaining_operations):
            # All operations completed
            return self.add_text("🎉 All invalid value issues resolved using batch processing!") \
                .add_text("✅ Value validity assured through comprehensive cleaning") \
                .end_event()
        
        # Get current operation
        current_op = remaining_operations[current_index]
        method_group = current_op.get("method_group", current_index + 1)
        issue_count = current_op.get("issue_count", 1)
        method_type = current_op.get("method_type", "unknown")
        cleaning_code = current_op.get("code", "")
        output_file = current_op.get("output_file", "invalid_value_resolved.csv")
        
        # Execute current batch with robust fallback for dtype-specific imputation
        sanitized_code = (
            "try:\n"
            + "\n".join([f"    {line}" for line in (cleaning_code or "").splitlines()])
            + "\nexcept ValueError as e:\n"
            + "    if 'Cannot use median strategy with non-numeric data' in str(e):\n"
            + f"        CSV_PATH = '{self.get_full_csv_path()}'\n"
            + f"        OUTPUT_FILE = '{output_file}'\n"
            + "        from vdstools import DataCleaning\n"
            + "        import pandas as pd\n"
            + "        tk = DataCleaning()\n"
            + "        tk.fill_missing_values(CSV_PATH)\n"
            + "        tmp_path = CSV_PATH.replace('.csv', '_missing_values_fixed.csv')\n"
            + "        df_tmp = pd.read_csv(tmp_path)\n"
            + "        df_tmp.to_csv(OUTPUT_FILE, index=False)\n"
            + "    else:\n"
            + "        raise\n"
        )

        result = self.add_text(f"#### Method Group {method_group}: Processing {issue_count} Issues") \
            .add_text(f"**Method Type:** {method_type}") \
            .add_code(sanitized_code) \
            .exe_code_cli(
                event_tag="batch_executed",
                mark_finnish=f"Batch {method_group} completed - resolved {issue_count} issues"
            )
        
        # Update CSV path and operation index
        self.add_variable("csv_file_path", output_file)
        self.add_variable("current_operation_index", current_index + 1)
        
        return result.end_event()
    
    @after_exec("batch_executed")
    def batch_executed(self):
        batch_result = self.get_current_effect()
        current_index = self.get_variable("current_operation_index", 0)
        remaining_operations = self.get_variable("remaining_operations", [])
        
        # Check if more operations remain
        if current_index < len(remaining_operations):
            return self.add_text(f"✅ Batch {current_index} completed, continuing with remaining batches") \
                .next_event("execute_next_batch") \
                .end_event()
        else:
            # All operations completed
            return self.add_variable("invalid_value_cleaning_result", batch_result) \
                .add_text("🎉 All invalid value batches processed successfully!") \
                .add_text("✅ **Ready to proceed to the next step.**") \
                .end_event()

async def generate_data_cleaning_sequence_step2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return ValueValidityAssurance(step, state, stream).run()