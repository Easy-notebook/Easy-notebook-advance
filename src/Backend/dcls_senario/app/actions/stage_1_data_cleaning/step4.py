from typing import Dict, Any, Optional
from DCLSAgents import DataCleaningAndEDA_Agent
from app.models.StepTemplate import StepTemplate

async def generate_data_cleaning_sequence_step4(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state, lang)
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    unit_check = step_template.get_variable("unit_check")
    variables = step_template.get_variable("variables")
    hypothesis = step_template.get_variable("pcs_hypothesis")
    csv_file_path = step_template.get_variable("csv_file_path")

    
    clean_agent = DataCleaningAndEDA_Agent(
                                        problem_description=problem_description,
                                        context_description=context_description,
                                        check_unit=unit_check,
                                        var_json=variables,
                                        hyp_json=hypothesis)
    
    if lang == "zh":
        if step_template.event("start"):
            step_template.add_text("### 步骤4: 数据完整性检查") \
                        .add_code(
                                f"""import pandas as pd
data = pd.read_csv('{csv_file_path}')
print(data.info())
""") \
                        .exe_code_cli(mark_finnish="查看当前数据信息") \
                        .next_event("glance at current data info.")
            
            return step_template.end_event()

        if step_template.event("glance at current data info."):
            
            dataInfo = step_template.get_current_effect()
            step_template.add_variable("data_info",dataInfo) 
            
            step_template.add_text(f"我正在生成数据完整性检查代码用于{csv_file_path}") \
                        .next_thinking_event(event_tag="finnish_generate_data_integrity_check_code",
                                        textArray=["数据清洗和EDA代理正在思考...","生成数据完整性检查代码..."])
            
            return step_template.end_event()

        if step_template.think_event("finnish_generate_data_integrity_check_code"):
            data_integrity_check_code = clean_agent.generate_data_integrity_check_code_cli(csv_file_path)
            step_template.add_code(data_integrity_check_code) \
                        .exe_code_cli(mark_finnish="完成数据完整性检查") \
                        .next_thinking_event(event_tag="analyze_data_integrity_check_result",
                                        textArray=["数据清洗和EDA代理正在思考...","分析数据完整性检查结果..."])
            
            return step_template.end_event()

        if step_template.think_event("analyze_data_integrity_check_result"):
            data_integrity_check_result = step_template.get_current_effect()
            data_integrity_check_result = clean_agent.analyze_and_generate_fillna_operations_cli(data_integrity_check_result)
            
            if data_integrity_check_result=="no problem":
                step_template.add_text("好的, 数据完整性没有问题, 我们可以继续下一步。")
            
            else:
                markdown_str=step_template.to_tableh(data_integrity_check_result)
                
                step_template.add_text("根据数据完整性检查结果, 我们知道数据存在一些问题:") \
                            .add_variable("data_integrity_problems",data_integrity_check_result) \
                            .add_text(markdown_str) \
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                        textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
            
            return step_template.end_event()

        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("data_integrity_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info, "integrity_problem_resolved.csv")) \
                            .update_variable("csv_file_path","integrity_problem_resolved.csv") \
                            .exe_code_cli(mark_finnish="完成清洗操作")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
            else:
                step_template.add_text("我已完成了数据清洗, 让我们继续下一步。")        
        
    else:
    
        if step_template.event("start"):
            step_template.add_text("### Step4: Data Integrity Check") \
                        .add_code(
                                f"""import pandas as pd
data = pd.read_csv('{csv_file_path}')
print(data.info())
""") \
                        .exe_code_cli(mark_finnish="glance at current data info.") \
                        .next_event("glance at current data info.")
            
            return step_template.end_event()

        if step_template.event("glance at current data info."):
            
            dataInfo = step_template.get_current_effect()
            step_template.add_variable("data_info",dataInfo) 
            
            step_template.add_text(f"I am generating data integrity check code for {csv_file_path}") \
                        .next_thinking_event(event_tag="finnish_generate_data_integrity_check_code",
                                        textArray=["Data Cleaning and EDA Agent is thinking...","generating data integrity check code..."])
            
            return step_template.end_event()

        if step_template.think_event("finnish_generate_data_integrity_check_code"):
            data_integrity_check_code = clean_agent.generate_data_integrity_check_code_cli(csv_file_path)
            step_template.add_code(data_integrity_check_code) \
                        .exe_code_cli(mark_finnish="finished data integrity check") \
                        .next_thinking_event(event_tag="analyze_data_integrity_check_result",
                                        textArray=["Data Cleaning and EDA Agent is thinking...","analyzing data integrity check result..."])
            
            return step_template.end_event()

        if step_template.think_event("analyze_data_integrity_check_result"):
            data_integrity_check_result = step_template.get_current_effect()
            data_integrity_check_result = clean_agent.analyze_and_generate_fillna_operations_cli(data_integrity_check_result)
            
            if data_integrity_check_result=="no problem":
                step_template.add_text("Ok, there is no problem with the data integrity, we can proceed to the next step.")
            
            else:
                markdown_str=step_template.to_tableh(data_integrity_check_result)
                
                step_template.add_text("according to the data integrity check result, we know there are some problems with the data:") \
                            .add_variable("data_integrity_problems",data_integrity_check_result) \
                            .add_text(markdown_str) \
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                        textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
            
            return step_template.end_event()

        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("data_integrity_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info, "integrity_problem_resolved.csv")) \
                            .update_variable("csv_file_path","integrity_problem_resolved.csv") \
                            .exe_code_cli(mark_finnish="finished generate cleaning operations")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
            else:
                step_template.add_text("I have finished the data cleaning, let's proceed to the next step.")
                        
    return step_template.error_invalid_event()
    