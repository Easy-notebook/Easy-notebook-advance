from typing import Dict, Any, Optional
from app.models.BaseAction import BaseAction, event, thinking
from app.core.config import llm, PCSAgent


class DesignWorkflow(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
            chapter_id="chapter_0_planning",
            section_id="section_1_design_workflow", 
            name="DesignWorkflow",
            ability="Design a customized workflow based on existence first principles.",
            require_variables=["problem_name", "user_goal", "problem_description", "context_description"])
    
    @event("start")
    def generate_workflow(self):
        return self.update_title(f"{self.input['problem_name']}: Data Science Analysis") \
                    .add_text("I will analyze your goal and design a customized workflow based on existence first principles.") \
                    .next_thinking_event(event_tag="generate_workflow_thinking",
                                        textArray=["PCS Agent is analyzing your goal...","Applying existence first principles...","Designing optimal workflow..."])\
                    .end_event()
    
    @thinking("generate_workflow_thinking")
    def generate_workflow_thinking(self):
        # Define mapping from Chinese stage names to English chapter IDs
        stage_name_mapping = {
            "Data Existence Establishment": "chapter_1_data_existence_establishment",
            "Data Integrity Assurance": "chapter_2_data_integrity_assurance", 
            "Data Insight Acquisition": "chapter_3_data_insight_acquisition",
            "Methodology Strategy Formulation": "chapter_4_methodology_strategy_formulation",
            "Model Implementation Execution": "chapter_5_model_implementation_execution",
            "Stability Validation": "chapter_6_stability_validation",
            "Results Evaluation Confirmation": "chapter_7_results_evaluation_confirmation"
        }
        
        pcs_agent = PCSAgent(problem_description=self.input["problem_description"], context_description=self.input["context_description"], llm=llm)
        workflow_analysis = pcs_agent.generate_workflow_cli(self.input["user_goal"], self.input["problem_description"], self.input["context_description"])
        # workflow_analysis = {
        #     "minimal_workflow": ["Data Existence Establishment", "Data Integrity Assurance", "Data Insight Acquisition", "Methodology Strategy Formulation", "Model Implementation Execution", "Stability Validation", "Results Evaluation Confirmation"],
        #     "promise": "Based on the goal of Given the various features of houses in the dataset, we want to build a model to predict the sale price of a house in Ames, Iowa. There are 2930 records with 82 columns in total, including numeric, categorical columns. Some columns have missing values. We need to analyze the relationships between different features and the sale price to make an accurate prediction., I will need to establish variable definitions, observation units, and perform relevance analysis to form the PCS hypothesis in the Data Existence Establishment stage. Then, ensure the dataset is clean, complete, and structurally valid in the Data Integrity Assurance stage. Next, extract EDA summaries and build structured data understanding in the Data Insight Acquisition stage. After that, design feature engineering, modeling methods, and training strategies in the Methodology Strategy Formulation stage. Then execute model training and generate intermediate results for evaluation in the Model Implementation Execution stage. Validate the robustness and generalizability of the model under varied conditions in the Stability Validation stage. And finally, confirm effectiveness through a final DCLS report and provide actionable recommendations in the Results Evaluation Confirmation stage."
        # }
        # The PCS agent returns "minimal_workflow" not "selected_stages"
        selected_stages_raw = workflow_analysis.get("minimal_workflow", workflow_analysis.get("selected_stages", []))
        
        # Map Chinese stage names to English chapter IDs
        selected_stages = []
        for stage in selected_stages_raw:
            mapped_stage = stage_name_mapping.get(stage, stage)
            selected_stages.append(mapped_stage)
        workflow_result = {}  # Initialize workflow_result
        
        if selected_stages:
            workflow_result = self.initial_workflow_stages(selected_stages)
            stage_execution_plan = workflow_result.get("stage_execution_plan", [])
            if stage_execution_plan:
                self.update_stage_steps(stage_execution_plan)
        else:
            # Fallback if no stages selected
            self.add_text("警告：没有选择任何workflow阶段")

        final_workflow = workflow_result.get("workflow_config", {})
        
        # Ensure we have a valid workflow structure
        if not final_workflow or not isinstance(final_workflow, dict) or not final_workflow.get("stages"):
            print("WARNING: final_workflow is empty, invalid type, or has no stages, creating fallback workflow")
            final_workflow = {
                "id": "fallback_workflow",
                "name": "Default VDS Workflow",
                "description": "Fallback workflow configuration",
                "stages": [
                    {
                        "id": "chapter_0_planning",
                        "name": "Planning & Analysis",
                        "description": "Initial problem analysis and workflow planning",
                        "steps": [
                            {
                                "id": "section_1_design_workflow",
                                "step_id": "section_1_design_workflow",
                                "name": "Design Workflow",
                                "description": "Design customized workflow based on requirements"
                            }
                        ]
                    }
                ]
            }
        
        self.finish_thinking()
        self.update_workflow(final_workflow)
        self.add_text(workflow_analysis.get("promise", f"Based on your goal: {self.input['user_goal']}, I will execute the necessary stages to deliver your requirements."))        
        return self.end_event()

def generate_workflow(step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
    return DesignWorkflow(step, state, stream).run()