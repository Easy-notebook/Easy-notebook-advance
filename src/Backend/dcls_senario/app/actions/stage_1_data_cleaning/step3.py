from typing import Dict, Any, Optional
from DCLSAgents import DataCleaningAndEDA_Agent
from app.models.StepTemplate import StepTemplate

async def generate_data_cleaning_sequence_step3(
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
            step_template.add_text("### 步骤3: 缺失值分析") \
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
            
            step_template.add_text("我已生成缺失值检查代码并获取结果, 让我们看看:") \
                        .add_code(
    f"""
data = pd.read_csv("{csv_file_path}")
missing_data = data.isna().sum() / len(data.index)
missing_data_sorted = missing_data.sort_values()    
missing_data_str = missing_data_sorted.to_string()
print(missing_data_str)
    """ 
                        ) \
                        .exe_code_cli(
                            event_tag="finished_get_missing_value_code_execution",
                            mark_finnish="查看缺失值检查代码"
                        )
                        
            return step_template.end_event()
        
        
        if step_template.event("finished_get_missing_value_code_execution"):    
            missing_value_str = step_template.get_current_effect()
            missing_value_code = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str)
            
            step_template.add_variable("missing_value_str",missing_value_str) \
                        .add_text("我正在生成缺失值检查代码以可视化缺失值, 请稍等...") \
                        .next_thinking_event(event_tag="finnish_generate_missing_value_check_code",
                                        textArray=["数据清洗和EDA代理正在思考...","生成缺失值检查代码..."])
                        
            return step_template.end_event()

        
        if step_template.think_event("finnish_generate_missing_value_check_code"):    
            missing_value_str = step_template.get_current_effect()
            missing_value_code = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str)
            
            step_template.add_variable("missing_value_str",missing_value_str) \
                        .add_text("我已生成缺失值检查代码并获取结果, 让我们看看:") \
                        .add_code(missing_value_code) \
                        .exe_code_cli(
                            event_tag="finished_missing_value_check_code_execution",
                        )
                        
            return step_template.end_event()
        
        if step_template.event("finished_missing_value_check_code_execution"):
        # if step_template.event("finished_get_missing_value_code_execution"):
            # missing_value_str = step_template.get_variable("missing_value_str")
            missing_value_check_result = step_template.get_current_effect()
            # missing_value_problems = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str, missing_value_check_result, unit_check)
            missing_value_problems = clean_agent.missing_value_analysis_cli(csv_file_path, "", missing_value_check_result, unit_check)
            
            
            if missing_value_problems == "no problem":
                step_template.add_text("我已检查了缺失值问题, 数据没有问题。") \
                            .add_text("让我们继续下一步。")
            else:
                markdown_str = step_template.to_tableh(missing_value_problems)
                
                step_template.add_text("according to the missing value analysis result, we know there are some problems with the data:") \
                            .add_variable("missing_value_problems",missing_value_problems) \
                            .add_text(markdown_str) \
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
            return step_template.end_event()    
        
        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("missing_value_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info,"missing_value_resolved.csv")) \
                            .update_variable("csv_file_path","missing_value_resolved.csv") \
                            .exe_code_cli(mark_finnish="完成清洗操作")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
                    
            else:
                step_template.add_text("可能数据缺失值没有问题, 让我们继续下一步。")
                
            return step_template.end_event()
    
        
    else:
        if step_template.event("start"):
            step_template.add_text("### Step3: Missing Value Analysis") \
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
            
            step_template.add_text("I have generated the missing value check code and get the result, let's see:") \
                        .add_code(
    f"""
data = pd.read_csv("{csv_file_path}")
missing_data = data.isna().sum() / len(data.index)
missing_data_sorted = missing_data.sort_values()    
missing_data_str = missing_data_sorted.to_string()
print(missing_data_str)
""" 
                        ) \
                        .exe_code_cli(
                            event_tag="finished_get_missing_value_code_execution",
                            mark_finnish="finished get the missing value check code"
                        )
                        
            return step_template.end_event()
        
        
        if step_template.event("finished_get_missing_value_code_execution"):    
            missing_value_str = step_template.get_current_effect()
            missing_value_code = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str)
            
            step_template.add_variable("missing_value_str",missing_value_str) \
                        .add_text("I am generating the missing value check code for visualizing the missing value, please wait...") \
                        .next_thinking_event(event_tag="finnish_generate_missing_value_check_code",
                                        textArray=["Data Cleaning and EDA Agent is thinking...","generating the missing value check code..."])
                        
            return step_template.end_event()

        
        if step_template.think_event("finnish_generate_missing_value_check_code"):    
            missing_value_str = step_template.get_current_effect()
            missing_value_code = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str)
            
            step_template.add_variable("missing_value_str",missing_value_str) \
                        .add_text("I have generated the missing value check code and get the result, let's see:") \
                        .add_code(missing_value_code) \
                        .exe_code_cli(
                            event_tag="finished_missing_value_check_code_execution",
                        )
                        
            return step_template.end_event()
        
        if step_template.event("finished_missing_value_check_code_execution"):
        # if step_template.event("finished_get_missing_value_code_execution"):
            # missing_value_str = step_template.get_variable("missing_value_str")
            missing_value_check_result = step_template.get_current_effect()
            # missing_value_problems = clean_agent.missing_value_analysis_cli(csv_file_path, missing_value_str, missing_value_check_result, unit_check)
            missing_value_problems = clean_agent.missing_value_analysis_cli(csv_file_path, "", missing_value_check_result, unit_check)
            
            
            if missing_value_problems == "no problem":
                step_template.add_text("I have checked the missing value problems, and there is no problem with the data.") \
                            .add_text("Let's proceed to the next step.")
            else:
                markdown_str = step_template.to_tableh(missing_value_problems)
                
                step_template.add_text("according to the missing value analysis result, we know there are some problems with the data:") \
                            .add_variable("missing_value_problems",missing_value_problems) \
                            .add_text(markdown_str) \
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
            return step_template.end_event()    
        
        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("missing_value_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info,"missing_value_resolved.csv")) \
                            .update_variable("csv_file_path","missing_value_resolved.csv") \
                            .exe_code_cli(mark_finnish="finished generate cleaning operations")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
                    
            else:
                step_template.add_text("Maybe there is no problem with the data missing value, let's proceed to the next step.")
                
            return step_template.end_event()
        
    return None
    