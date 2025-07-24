from typing import Dict, Any, Optional
from app.core.config import llm, ResultsEvaluationAgent
from app.models.StepTemplate import StepTemplate

async def results_evaluation_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = StepTemplate(step, state)
    
    if step_template.event("start"):
        step_template.add_text("### Step 0: Results Evaluation Framework Initialization") \
                    .add_text("I will establish a comprehensive framework for final results evaluation, incorporating insights from all previous stages.") \
                    .next_thinking_event(event_tag="initialize_results_framework",
                                        textArray=["Results Evaluation Agent is analyzing...","Initializing evaluation framework..."])

        return step_template.end_event()
    
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    stability_analysis_summary = step_template.get_variable("stability_analysis_summary")
    evaluation_report_template = step_template.get_variable("evaluation_report_template")
    
    results_agent = ResultsEvaluationAgent(
        problem_description=problem_description,
        context_description=context_description,
        best_five_result=str(stability_analysis_summary),  # Convert to string as expected by agent
        llm=llm
    )
    
    if step_template.think_event("initialize_results_framework"):
        
        results_evaluation_framework = results_agent.generate_results_evaluation_framework_cli(
            stability_summary=stability_analysis_summary,
            report_template=evaluation_report_template
        )
        
        framework_table = step_template.to_tableh(results_evaluation_framework)
        
        step_template \
            .add_variable("results_evaluation_framework", results_evaluation_framework) \
            .add_text("Here is the comprehensive framework for final results evaluation and validation:") \
            .add_text(framework_table) \
            .next_thinking_event(event_tag="generate_test_strategy",
                                textArray=["Results Agent is working...","Generating test dataset strategy..."])
        
        return step_template.end_event()
    
    if step_template.think_event("generate_test_strategy"):
        
        test_dataset_strategy = results_agent.generate_test_dataset_strategy_cli(
            evaluation_framework=step_template.get_variable("results_evaluation_framework")
        )
        
        test_strategy_table = step_template.to_tableh(test_dataset_strategy)
        
        step_template \
            .add_variable("test_dataset_strategy", test_dataset_strategy) \
            .add_text("Here is the strategy for generating and validating test datasets:") \
            .add_text(test_strategy_table) \
            .add_text("✅ Results evaluation framework initialized successfully.") \
            .add_text("🎯 Ready for **Step 1: Test Dataset Generation**")
        
        return step_template.end_event()
            
    return None