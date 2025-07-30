from typing import Dict, Any, Optional
from app.models.StepTemplate import StepTemplate

async def generate_data_loading_and_hypothesis_proposal_step_1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    csv_file_path = step_template.get_variable("csv_file_path")
    
    # 分支1：待办事项为空
    if step_template.event("start"):
        step_template.new_section("Data preview") \
                     .add_text("read the first 5 rows of the CSV file and extract the variable names and data preview") \
                     .add_code(
                         f'''import pandas as pd
# Correcting the file path by wrapping it in quotes.
data = pd.read_csv("{csv_file_path}")  # File path needs to be a string.

# Using the head() function to preview the first few rows of data.
preview = data.head().to_dict(orient="records")

# Retrieving the column names.
variables = list(data.columns)

print(variables)''',
                     ) \
                    .exe_code_cli(
                        event_tag="code_exec_1",
                        mark_finnish="finished glance at the each column of the data"
                    )        
        return step_template.end_event()
    
    # 分支2：待办事项不为空且最后一个为 "code_exec_1"
    if step_template.event("code_exec_1"):
        effect = state["effect"]
        variables = effect["current"][0]
        
        if isinstance(variables, list) and isinstance(variables[0], dict) and "content" in variables[0]:
            variables_str = variables[0]["content"].strip()
        elif isinstance(variables, list) and isinstance(variables[0], str):
            variables_str = variables[0].strip()
        else:
            # Fallback or debug information
            variables_str = str(variables)
            if isinstance(variables, list) and len(variables) > 0:
                print(f"Debug - Type of variables[0]: {type(variables[0])}")
        
        # Continue with the rest of the code
        variables_list = variables_str.strip("[]").replace("'", "").split(", ")
        
        step_template \
            .add_variable("variables", variables_str) \
            .add_text(
                f"ok we know there are {len(variables_list)} variables, let's see the top 5 rows of the data"
            ) \
            .add_code(f"""
            from vdstools import DataPreview
            data_preview = DataPreview("{csv_file_path}")
            data_preview.top5line()
            """) \
            .exe_code_cli(mark_finnish="finished glance at the top 5 rows of the data")
        
        return step_template.end_event()
    
    return None
    