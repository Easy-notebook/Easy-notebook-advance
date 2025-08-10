from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Action import Action

async def stability_analysis_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
        
    step_template = Action(step, state)
    
    if step_template.event("start"):
        step_template.new_chapter("Stability Analysis Strategy") \
                    .add_text("I will generate a comprehensive stability analysis plan to evaluate model robustness across different data preprocessing variations.") \
                    .next_thinking_event(event_tag="generate_stability_strategy",
                                        textArray=["PCS Agent is analyzing...","Generating stability analysis strategy..."])

        return step_template.end_event()
    
    problem_description = step_template.get_variable("problem_description")
    context_description = step_template.get_variable("context_description")
    csv_file_path = step_template.get_variable("csv_file_path")
    model_training_code = step_template.get_variable("model_training_code")
    
    pcs_agent = PCSAgent(
        problem_description=problem_description,
        context_description=context_description,
        llm=llm
    )
    
    if step_template.think_event("generate_stability_strategy"):
        
        eda_summary = step_template.get_variable("eda_summary")
        training_strategy = step_template.get_variable("training_strategy")
        
        stability_strategy = pcs_agent.generate_stability_strategy_cli(
            eda_summary=eda_summary,
            model_training_strategy=training_strategy
        )
        
        stability_strategy_table = step_template.to_tableh(stability_strategy)
        
        step_template \
            .add_variable("stability_strategy", stability_strategy) \
            .add_text("Here is the comprehensive plan for evaluating model stability across different data preprocessing variations:") \
            .add_text(stability_strategy_table) \
            .next_thinking_event(event_tag="generate_dataset_variations",
                                textArray=["PCS Agent is working...","Generating dataset variation parameters..."])
        
        return step_template.end_event()
    
    if step_template.think_event("generate_dataset_variations"):
        
        dataset_variations = pcs_agent.generate_dataset_variations_cli(
            stability_strategy=step_template.get_variable("stability_strategy"),
            csv_file_path=csv_file_path,
            model_training_code=model_training_code
        )
        
        variations_table = step_template.to_tableh(dataset_variations)
        
        step_template \
            .add_variable("dataset_variations", dataset_variations) \
            .add_text("Generating multiple dataset variations for stability analysis:") \
            .add_text(variations_table) \
            .next_thinking_event(event_tag="generate_variations_code",
                                textArray=["PCS Agent is working...","Generating dataset variations code..."])
        
        return step_template.end_event()
    
    if step_template.think_event("generate_variations_code"):
        
        # 生成创建数据集变体的代码
        variations_code = pcs_agent.generate_dataset_variations_code_cli(
            csv_file_path=csv_file_path,
            dataset_variations=step_template.get_variable("dataset_variations")
        )
        
        step_template \
            .add_variable("dataset_variations_code", variations_code) \
            .add_text("The following code will create multiple dataset variations for stability testing:") \
            .add_code(variations_code) \
            .exe_code_cli(mark_finnish="created dataset variations") \
            .next_thinking_event(event_tag="analyze_variations_creation",
                                textArray=["PCS Agent is analyzing...","Analyzing created dataset variations..."])
        
        return step_template.end_event()
    
    if step_template.think_event("analyze_variations_creation"):
        
        variations_results = step_template.get_current_effect()
        
        step_template \
            .add_variable("variations_creation_results", variations_results) \
            .add_text("Multiple dataset variations have been generated and are ready for model evaluation.") \
            .add_text(f"Variations Creation Results:\n{variations_results}") \
            .add_text("✅ Stability analysis strategy and dataset variations completed successfully.") \
        
        return step_template.end_event()
            
    return None