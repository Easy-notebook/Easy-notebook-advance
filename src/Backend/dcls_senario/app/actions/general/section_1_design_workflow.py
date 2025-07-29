from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.StepTemplate import StepTemplate

async def generate_workflow(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        problem_name = step_template.get_variable("problem_name")
        step_template.update_title(f"{problem_name}: Data Science Analysis") \
                    .add_text("I will analyze your goal and design a customized workflow based on existence first principles.") \
                    .next_thinking_event(event_tag="generate_workflow",
                                        textArray=["PCS Agent is analyzing your goal...","Applying existence first principles...","Designing optimal workflow..."])
        
        return step_template.end_event()
    
    if step_template.event("generate_workflow"):
        user_goal = step_template.get_variable("user_goal")
        problem_description = step_template.get_variable("problem_description")
        context_description = step_template.get_variable("context_description")

        pcs_agent = PCSAgent(problem_description=problem_description, context_description=context_description, llm=llm)
        workflow_analysis = pcs_agent.generate_workflow_cli(user_goal, problem_description, context_description)
        
        # 生成promise文本
        promise_text = workflow_analysis.get("promise", f"Based on your goal: {user_goal}, I will execute the necessary stages to deliver your requirements.")
        
        # 从workflow分析中提取需要的章节
        minimal_workflow = workflow_analysis.get("minimal_workflow", [])
        
        # 映射stage名称到chapter ID
        stage_to_chapter_mapping = {
            "Data Existence Establishment": "chapter_1_data_existence_establishment",
            "Data Integrity Assurance": "chapter_2_data_integrity_assurance", 
            "Data Insight Acquisition": "chapter_3_data_insight_acquisition",
            "Methodology Strategy Formulation": "chapter_4_methodology_strategy_formulation",
            "Model Implementation Execution": "chapter_5_model_implementation_execution",
            "Stability Validation": "chapter_6_stability_validation",
            "Results Evaluation Confirmation": "chapter_7_results_evaluation_confirmation"
        }
        
        # 创建动态workflow配置
        selected_chapters = []
        for stage in minimal_workflow:
            if stage in stage_to_chapter_mapping:
                selected_chapters.append(stage_to_chapter_mapping[stage])
        
        # 如果没有匹配到章节，使用默认的核心章节
        if not selected_chapters:
            selected_chapters = [
                "chapter_1_data_existence_establishment",
                "chapter_3_data_insight_acquisition", 
                "chapter_5_model_implementation_execution"
            ]
        
        # 生成最终的workflow配置
        dynamic_workflow = {
            "analysis": workflow_analysis,
            "selected_chapters": selected_chapters,
            "execution_strategy": workflow_analysis.get("execution_strategy", "sequential"),
            "customization_reason": f"Customized based on goal: {user_goal}"
        }
        
        step_template.add_text(promise_text) \
                    .add_text(f"Based on my analysis, I will execute {len(selected_chapters)} chapters: {', '.join(selected_chapters)}") \
                    .add_variable("dynamic_workflow", dynamic_workflow) \
                    .add_variable("workflow_analysis", workflow_analysis)
        
        return step_template.end_event()

    return None