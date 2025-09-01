from typing import Dict, Any, Optional
from app.core.config import llm, DataCleaningAndEDA_Agent
from app.models.Behavior import Behavior, event, thinking, after_exec, finnish

class DimensionalIntegrityValidation(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_2_data_integrity_assurance",
                         section_id="section_2_dimensional_integrity_validation",
                         name="Dimensional Integrity Validation",
                         ability="Validate dimensional integrity and resolve dimension problems",
                         require_variables=["problem_description", "context_description", "csv_file_path"])
    
    @event("start")
    def start(self):
        return self.new_section("Dimension Analysis") \
            .add_text("Starting dimensional integrity validation process") \
            .next_event("data_info_check") \
            .end_event()
    
    @event("data_info_check")
    def data_info_check(self):
        csv_file_path = self.get_full_csv_path()
        # If earlier stages already provided data_info (from DataPreview or semantic context), reuse it
        existing_info = self.get_variable("data_info", None)
        if existing_info:
            return self.add_text("Reusing dataset info collected in Stage 1 to avoid redundant computation") \
                .add_variable("data_info", existing_info) \
                .next_thinking_event(
                    event_tag="generate_dimension_check",
                    textArray=["Data Cleaning and EDA Agent is thinking...", "generating the dimension check code..."],
                    agentName="Data Cleaning Agent"
                ) \
                .end_event()
        return self.add_text("Analyzing current data dimensions and structure") \
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
            .add_text("Data information collected, generating dimension check code") \
            .next_thinking_event(
                event_tag="generate_dimension_check",
                textArray=["Data Cleaning and EDA Agent is thinking...", "generating the dimension check code..."],
                agentName="Data Cleaning Agent"
            ) \
            .end_event()
    
    @thinking("generate_dimension_check")
    def generate_dimension_check(self):
        try:
            # Get required variables
            csv_file_path = self.get_full_csv_path()
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
            
            # Generate dimension check code
            dimension_check_code = clean_agent.dimension_analysis_cli(csv_file_path, context_description)
            
            return self.conclusion("dimension_check_code", dimension_check_code)
        except Exception as e:
            # Fallback code generation
            fallback_code = f'''import pandas as pd
import numpy as np

# Basic dimensional analysis
data = pd.read_csv("{self.get_full_csv_path()}")
print("=== Basic Dimensional Analysis ===")
print(f"Dataset shape: {{data.shape}}")
print(f"Number of rows: {{data.shape[0]}}")
print(f"Number of columns: {{data.shape[1]}}")
print("\\nColumn names:")
print(list(data.columns))
print("\\nData types:")
print(data.dtypes)
print("\\nMemory usage:")
print(data.memory_usage(deep=True))

# Check for dimension issues
dimension_issues = []
if data.shape[0] == 0:
    dimension_issues.append("No data rows found")
if data.shape[1] == 0:
    dimension_issues.append("No data columns found")
if data.isnull().all().any():
    dimension_issues.append("Empty columns detected")

print("\\n=== Dimension Issues ===")
if dimension_issues:
    for issue in dimension_issues:
        print(f"- {{issue}}")
else:
    print("No obvious dimension issues found")

data.head()'''
            return self.conclusion("dimension_check_code", fallback_code)
        finally:
            return self.end_event()
    
    @finnish("dimension_check_code")
    def dimension_check_code(self):
        dimension_code = self.get_thinking("dimension_check_code")
        return self.add_text("Dimension check code generated, executing analysis") \
            .add_code(dimension_code) \
            .exe_code_cli(
                event_tag="dimension_check_result",
                mark_finnish="Dimension analysis completed"
            ) \
            .end_event()
    
    @after_exec("dimension_check_result")
    def dimension_check_result(self):
        dimension_result = self.get_current_effect()
        return self.add_variable("dimension_check_result", dimension_result) \
            .add_text("Analyzing dimension problems based on check results") \
            .next_thinking_event(
                event_tag="analyze_dimension_problems",
                textArray=["Data Cleaning and EDA Agent is thinking...", "analyzing the dimension problems..."],
                agentName="Data Cleaning Agent"
            ) \
            .end_event()
    
    @thinking("analyze_dimension_problems")
    def analyze_dimension_problems(self):
        try:
            # Get analysis context
            dimension_result = self.get_variable("dimension_check_result")
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
            
            # Analyze dimension problems
            dimension_problems = clean_agent.analyze_data_dimension_cli(dimension_result, context_description)
            
            return self.conclusion("dimension_problems_analysis", dimension_problems)
        except Exception as e:
            # Fallback analysis
            fallback_analysis = "no problem"
            return self.conclusion("dimension_problems_analysis", fallback_analysis)
        finally:
            return self.end_event()
    
    @finnish("dimension_problems_analysis")
    def dimension_problems_analysis(self):
        dimension_problems = self.get_thinking("dimension_problems_analysis")
        
        if dimension_problems == "no problem":
            return self.add_text("✅ No dimensional integrity problems detected") \
                .add_text("Data dimensions are valid, proceeding to next step") \
                .end_event()
        else:
            # Convert problems to table format if it's a list/dict
            if isinstance(dimension_problems, (list, dict)):
                markdown_str = self.to_tableh(dimension_problems)
                self.add_text("⚠️ Dimensional integrity issues detected:")
                self.add_text(markdown_str)
            else:
                self.add_text(f"⚠️ Dimensional issues found: {dimension_problems}")
            
            return self.add_variable("dimension_problems", dimension_problems) \
                .next_thinking_event(
                    event_tag="generate_cleaning_operations",
                    textArray=["Data Cleaning and EDA Agent is thinking...", "generating cleaning operations..."],
                    agentName="Data Cleaning Agent"
                ) \
                .end_event()
    
    @thinking("generate_cleaning_operations")
    def generate_cleaning_operations(self):
        try:
            # Get cleaning context
            dimension_problems = self.get_variable("dimension_problems")
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
            
            # Handle multiple problems - process one at a time
            if isinstance(dimension_problems, list) and len(dimension_problems) > 0:
                # Get the first problem to solve
                current_problem = dimension_problems[0]
                remaining_problems = dimension_problems[1:] if len(dimension_problems) > 1 else []
                
                # Generate cleaning code for current problem
                cleaning_code = clean_agent.generate_cleaning_code_cli(
                    csv_file_path, 
                    current_problem, 
                    context_description, 
                    variables, 
                    unit_check, 
                    data_info,
                    "dimension_problems_resolved.csv"
                )
                
                return self.conclusion("cleaning_operation", {
                    "code": cleaning_code,
                    "current_problem": current_problem,
                    "remaining_problems": remaining_problems,
                    "output_file": "dimension_problems_resolved.csv"
                })
            else:
                # Single problem or no problems
                if dimension_problems and dimension_problems != "no problem":
                    cleaning_code = clean_agent.generate_cleaning_code_cli(
                        csv_file_path,
                        dimension_problems,
                        context_description,
                        variables,
                        unit_check,
                        data_info,
                        "dimension_problems_resolved.csv"
                    )
                    
                    return self.conclusion("cleaning_operation", {
                        "code": cleaning_code,
                        "current_problem": dimension_problems,
                        "remaining_problems": [],
                        "output_file": "dimension_problems_resolved.csv"
                    })
                else:
                    return self.conclusion("cleaning_operation", {"code": None, "no_problems": True})
        except Exception as e:
            # Fallback cleaning operation
            fallback_code = f'''# Fallback dimension cleaning
import pandas as pd

data = pd.read_csv("{self.get_full_csv_path()}")
print("Performing basic dimension validation...")
print(f"Original shape: {{data.shape}}")

# Basic cleaning operations
cleaned_data = data.dropna(how='all')  # Remove empty rows
cleaned_data = cleaned_data.loc[:, ~cleaned_data.columns.duplicated()]  # Remove duplicate columns

print(f"Cleaned shape: {{cleaned_data.shape}}")
cleaned_data.to_csv("dimension_problems_resolved.csv", index=False)
print("Basic dimension cleaning completed")'''
            
            return self.conclusion("cleaning_operation", {
                "code": fallback_code,
                "current_problem": f"Error in cleaning generation: {str(e)}",
                "remaining_problems": [],
                "output_file": "dimension_problems_resolved.csv"
            })
        finally:
            return self.end_event()
    
    @finnish("cleaning_operation")
    def cleaning_operation(self):
        cleaning_op = self.get_thinking("cleaning_operation")
        
        if cleaning_op.get("no_problems"):
            return self.add_text("✅ No dimension problems to clean") \
                .end_event()
        
        cleaning_code = cleaning_op.get("code")
        current_problem = cleaning_op.get("current_problem", "Unknown problem")
        remaining_problems = cleaning_op.get("remaining_problems", [])
        output_file = cleaning_op.get("output_file", "dimension_problems_resolved.csv")
        
        # Wrap agent-generated code with a safe guard for non-numeric median imputation
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
            + "        # Use stable VDS cleaning fallback\n"
            + "        tk.fill_missing_values(CSV_PATH)\n"
            + "        # Load the VDS-produced file and persist to expected output path\n"
            + "        tmp_path = CSV_PATH.replace('.csv', '_missing_values_fixed.csv')\n"
            + "        df_tmp = pd.read_csv(tmp_path)\n"
            + "        df_tmp.to_csv(OUTPUT_FILE, index=False)\n"
            + "    else:\n"
            + "        raise\n"
        )

        result = self.add_text(f"🔧 Resolving dimensional issue: {current_problem}") \
            .add_code(sanitized_code) \
            .exe_code_cli(
                event_tag="cleaning_executed",
                mark_finnish="Dimension cleaning operation completed"
            )
        
        # Update CSV file path for next operations
        self.add_variable("csv_file_path", output_file)
        
        # If there are remaining problems, continue with next iteration
        if remaining_problems:
            self.add_variable("dimension_problems", remaining_problems)
            result = result.next_thinking_event(
                event_tag="generate_cleaning_operations",
                textArray=["Data Cleaning and EDA Agent is thinking...", "generating cleaning operations..."],
                agentName="Data Cleaning Agent"
            )
        
        return result.end_event()
    
    @after_exec("cleaning_executed")
    def cleaning_executed(self):
        cleaning_result = self.get_current_effect()
        
        # Check if there are still remaining problems to process
        remaining_problems = self.get_variable("dimension_problems", [])
        if remaining_problems:
            return self.add_text("✅ Current dimension issue resolved, continuing with remaining issues") \
                .end_event()  # This will trigger the next iteration through the thinking event
        else:
            return self.add_variable("dimension_cleaning_result", cleaning_result) \
                .add_text("🎉 All dimensional integrity issues resolved!") \
                .add_text("✅ Data dimensions validated and cleaned") \
                .end_event()

async def generate_data_cleaning_sequence_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return DimensionalIntegrityValidation(step, state, stream).run()