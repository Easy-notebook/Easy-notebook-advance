from typing import Dict, Any, Optional
from DCLSAgents import DataCleaningAndEDA_Agent
from app.models.StepTemplate import StepTemplate

async def generate_data_cleaning_sequence_step2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
    
    # 初始化场景内agent（如果需要）
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
        # 分支1：待办事项为空
        if step_template.event("start"):
            csv_file_path = step_template.get_variable("csv_file_path")

            step_template.add_text("### 步骤2: 无效值分析") \
                        .add_code(
                                f"""import pandas as pd
data = pd.read_csv('{csv_file_path}')
print(data.info())
    """) \
                        .exe_code_cli(mark_finnish="查看当前数据信息") \
                        .next_event("查看当前数据信息")
            
            return step_template.end_event()
        
        if step_template.event("查看当前数据信息"):
            
            dataInfo = step_template.get_current_effect()
            step_template.add_variable("data_info",dataInfo) 
            
            step_template.add_text("让我们看看每个变量的值范围:") \
                        .add_code(
    f"""
data = pd.read_csv("{csv_file_path}")
data_describe = data.select_dtypes('number').describe()
data_describe = data_describe.to_string()
print(data_describe)
    """
                        ) \
                        .exe_code_cli( 
                            event_tag="finished_code_execution",
                            mark_finnish="查看每个变量的值范围"
                        )
                        
            return step_template.end_event()

        
        if step_template.event("finished_code_execution"):

            step_template.add_text("我正在寻找数据中的无效值问题:") \
                        .next_thinking_event(event_tag="analyze_invalid_value_problems",
                                        textArray=["数据清洗和EDA代理正在思考...","分析无效值问题..."])
            
            return step_template.end_event()
        
        if step_template.think_event("analyze_invalid_value_problems"):
            invalid_value_analysis_result = step_template.get_current_effect()
            invalid_value_problems = clean_agent.check_for_invalid_values_cli(invalid_value_analysis_result, context_description, variables)
            
            if invalid_value_problems =="no problem":
                step_template.add_text("我已检查了无效值问题, 数据没有问题。") \
                            .add_text("让我们继续下一步。")
            
            else:
                markdown_str=step_template.to_tableh(invalid_value_problems)
                
                step_template.add_variable("invalid_value_problems",invalid_value_problems) \
                            .add_text("according to the invalid value analysis result, we know there are some problems with the data:") \
                            .add_text(markdown_str)\
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
            
            return step_template.end_event()
        
        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("invalid_value_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info,"invalid_data_problem_resolved.csv")) \
                            .update_variable("csv_file_path","invalid_data_problem_resolved.csv") \
                            .exe_code_cli(mark_finnish=f"resolved {one_of_issue['problem']}")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["数据清洗和EDA代理正在思考...","生成清洗操作..."])
                else:
                    step_template.add_text("我已生成所有维度问题的清洗操作。") \
                    # step_template.add_text("I have generated the cleaning operations for all the dimen, final check the data.") \
    #                             .add_code(
    # f"""
    # data = pd.read_csv("{csv_file_path}")
    # data_describe = data.select_dtypes('number').describe()
    # data_describe = data_describe.to_string()
    # print(data_describe)
    # """
    #                 ) \
    #                 .exe_code_cli( 
    #                     # event_tag="finished_code_execution",
    #                     mark_finnish="finished check the processed data"
    #                 )
            
            else:
                step_template.add_text("Maybe there is no problem with invalid data, let's proceed to the next step.")
                
            return step_template.end_event()    
    
    else:
        
        # 分支1：待办事项为空
        if step_template.event("start"):
            csv_file_path = step_template.get_variable("csv_file_path")

            step_template.add_text("### Step2: Invalid Value Analysis") \
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
            
            step_template.add_text("Let's see the value range of each variable:") \
                        .add_code(
    f"""
data = pd.read_csv("{csv_file_path}")
data_describe = data.select_dtypes('number').describe()
data_describe = data_describe.to_string()
print(data_describe)
    """
                        ) \
                        .exe_code_cli( 
                            event_tag="finished_code_execution",
                            mark_finnish="finished glance at the value range of each variable"
                        )
                        
            return step_template.end_event()

        
        if step_template.event("finished_code_execution"):

            step_template.add_text("I am aiming to find the invalid value problems of the data:") \
                        .next_thinking_event(event_tag="analyze_invalid_value_problems",
                                        textArray=["Data Cleaning and EDA Agent is thinking...","analyzing the invalid value problems..."])
            
            return step_template.end_event()
        
        if step_template.think_event("analyze_invalid_value_problems"):
            invalid_value_analysis_result = step_template.get_current_effect()
            invalid_value_problems = clean_agent.check_for_invalid_values_cli(invalid_value_analysis_result, context_description, variables)
            
            if invalid_value_problems =="no problem":
                step_template.add_text("I have checked the invalid value problems, and there is no problem with the data.") \
                            .add_text("Let's proceed to the next step.")
            
            else:
                markdown_str=step_template.to_tableh(invalid_value_problems)
                
                step_template.add_variable("invalid_value_problems",invalid_value_problems) \
                            .add_text("according to the invalid value analysis result, we know there are some problems with the data:") \
                            .add_text(markdown_str)\
                            .next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
            
            return step_template.end_event()
        
        if step_template.think_event("generate_cleaning_operations"):
            one_of_issue, issue_left = step_template.pop_last_sub_variable("invalid_value_problems")
            data_info = step_template.get_variable("data_info")
            
            if one_of_issue:
                step_template.add_code(clean_agent.generate_cleaning_code_cli(csv_file_path, one_of_issue, context_description, variables, unit_check, data_info,"invalid_data_problem_resolved.csv")) \
                            .update_variable("csv_file_path","invalid_data_problem_resolved.csv") \
                            .exe_code_cli(mark_finnish=f"resolved {one_of_issue['problem']}")                       
                if issue_left:
                    step_template.next_thinking_event(event_tag="generate_cleaning_operations",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","generating cleaning operations..."])
                else:
                    step_template.add_text("I have generated the cleaning operations for all the dimension problems.") \
                    # step_template.add_text("I have generated the cleaning operations for all the dimen, final check the data.") \
    #                             .add_code(
    # f"""
    # data = pd.read_csv("{csv_file_path}")
    # data_describe = data.select_dtypes('number').describe()
    # data_describe = data_describe.to_string()
    # print(data_describe)
    # """
    #                 ) \
    #                 .exe_code_cli( 
    #                     # event_tag="finished_code_execution",
    #                     mark_finnish="finished check the processed data"
    #                 )
            
            else:
                step_template.add_text("Maybe there is no problem with invalid data, let's proceed to the next step.")
                
            return step_template.end_event()
        
    return None
    