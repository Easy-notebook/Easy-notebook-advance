from typing import Dict, Any, Optional
from DCLSAgents import DataCleaningAndEDA_Agent
from app.models.StepTemplate import StepTemplate

async def generate_exploratory_data_sequence_step3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    lang: str = "en"
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state, lang)
    
    if lang == "zh":
                    
        if step_template.event("start"):
            step_template.add_text("### 步骤3: 解决EDA问题") \
                        .add_text("我将一个一个解决EDA问题, 你可以在接下来的步骤中看到结果。") \
                        .next_thinking_event(event_tag="solve_eda_questions",
                                            textArray=["数据清洗和EDA代理正在思考...","解决EDA问题..."])
        
        
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
        
        if step_template.think_event("solve_eda_questions"):
            eda_question_is_working = step_template.get_variable("eda_question_is_working")
            if eda_question_is_working:
                step_template.add_text("")
                return step_template.end_event()
            
            eda_question, eda_questions_left = step_template.pop_last_sub_variable("eda_questions")
            
            data_info = step_template.get_variable("data_info")
            data_preview = step_template.get_variable("data_preview")
            
            if eda_question:
                step_template.add_text(f"#### Solving EDA Question: {eda_question['question']}") \
                            .add_text(f"Now,{eda_question['action']}") \
                            .add_variable("current_eda_question", eda_question) \
                            .add_code(clean_agent.generate_eda_code_cli(csv_file_path, eda_question,data_info,data_preview)) \
                            .exe_code_cli() \
                            .next_thinking_event(event_tag="analyze_eda_result",
                                            textArray=["数据清洗和EDA代理正在思考...","分析EDA结果..."]) 
            else:
                step_template.add_text("好的, 我已经解决了所有EDA问题, 让我们继续下一步。")
            
            return step_template.end_event()
        
        if step_template.think_event("analyze_eda_result"):
            
            eda_result = step_template.get_current_effect()
            current_eda_question = step_template.get_variable("current_eda_question")
            
            analysis_result = clean_agent.analyze_eda_result_cli(current_eda_question["question"],current_eda_question["action"],eda_result)
            step_template.push_variable("analysis_result",analysis_result)
            
            step_template.add_text(f"Ok, my analysis is {analysis_result}") \
                        .next_thinking_event(event_tag="solve_eda_questions",
                                            textArray=["数据清洗和EDA代理正在思考...","分析EDA结果..."])
            
            return step_template.end_event()
        
        
    else:
            
        if step_template.event("start"):
            step_template.add_text("### EDA Questions Solving") \
                        .add_text("I will solve the EDA questions one by one, and you can see the result in the following steps.") \
                        .next_thinking_event(event_tag="solve_eda_questions",
                                            textArray=["Data Cleaning and EDA Agent is thinking...","solving EDA questions..."])
        
        
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
        
        if step_template.think_event("solve_eda_questions"):
            eda_question_is_working = step_template.get_variable("eda_question_is_working")
            if eda_question_is_working:
                step_template.add_text("")
                return step_template.end_event()
            
            eda_question, eda_questions_left = step_template.pop_last_sub_variable("eda_questions")
            
            data_info = step_template.get_variable("data_info")
            data_preview = step_template.get_variable("data_preview")
            
            if eda_question:
                step_template.add_text(f"#### Solving EDA Question: {eda_question['question']}") \
                            .add_text(f"Now,{eda_question['action']}") \
                            .add_variable("current_eda_question", eda_question) \
                            .add_code(clean_agent.generate_eda_code_cli(csv_file_path, eda_question,data_info,data_preview)) \
                            .exe_code_cli() \
                            .next_thinking_event(event_tag="analyze_eda_result",
                                            textArray=["EDA Agent is thinking...","analyzing eda result..."]) 
            else:
                step_template.add_text("Ok, I have solved all the EDA questions, let's proceed to the next step.")
            
            return step_template.end_event()
        
        if step_template.think_event("analyze_eda_result"):
            
            eda_result = step_template.get_current_effect()
            current_eda_question = step_template.get_variable("current_eda_question")
            
            analysis_result = clean_agent.analyze_eda_result_cli(current_eda_question["question"],current_eda_question["action"],eda_result)
            step_template.push_variable("analysis_result",analysis_result)
            
            step_template.add_text(f"Ok, my analysis is {analysis_result}") \
                        .next_thinking_event(event_tag="solve_eda_questions",
                                            textArray=["EDA Agent is thinking...","analyzing eda result..."])
            
            return step_template.end_event()
        
    return None
    