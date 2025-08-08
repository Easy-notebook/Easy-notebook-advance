from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent, PredictionAndInferenceAgent
from app.models.BaseAction import BaseAction, event, thinking, finnish

class WorkflowInitialization(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_5_model_implementation_execution",
            section_id="section_1_workflow_initialization",
            name="Model Implementation Workflow Initialization",
            ability="Initialize model implementation execution workflow using intelligent action selection and target variable identification",
            require_variables=["problem_description", "consolidated_methodology"]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("**Chapter Goal**: Implement and execute the comprehensive methodology strategy") \
            .add_text("Identifying target variables and executing feature engineering and model training pipeline") \
            .next_thinking_event(
                event_tag="identify_target_variable",
                textArray=[
                    "Prediction and Inference Agent analyzing...", 
                    "Identifying target variable for prediction...", 
                    "Analyzing dataset structure and problem context..."
                ],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("identify_target_variable")
    def identify_target_variable(self):
        try:
            # Get comprehensive context for target variable identification
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            csv_file_path = self.get_full_csv_path()
            data_info = self.get_variable("data_info", [])
            consolidated_methodology = self.get_variable("consolidated_methodology", {})
            
            # Initialize prediction agent for target variable identification
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Identify target variable based on problem context and data structure
            response_variable_analysis = prediction_agent.identify_response_variable_cli(csv_file_path)
            
            # Validate response variable analysis
            if not response_variable_analysis or not isinstance(response_variable_analysis, list):
                # Fallback target variable identification
                fallback_analysis = self._generate_fallback_target_analysis(
                    problem_description, data_info, csv_file_path
                )
                response_variable_analysis = fallback_analysis
            
            return self.conclusion("target_variable_identified", {
                "response_variable_analysis": response_variable_analysis,
                "total_candidates": len(response_variable_analysis) if isinstance(response_variable_analysis, list) else 0,
                "status": "success" if isinstance(response_variable_analysis, list) and len(response_variable_analysis) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic target analysis
            basic_analysis = self._generate_basic_target_analysis(str(e), problem_description, data_info)
            return self.conclusion("target_variable_identified", {
                "response_variable_analysis": basic_analysis,
                "total_candidates": len(basic_analysis),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_target_analysis(self, problem_description, data_info, csv_file_path):
        """Generate fallback target variable analysis when agent fails"""
        analysis = []
        
        # Analyze problem description for target hints
        is_classification = any(keyword in problem_description.lower() 
                              for keyword in ["classify", "classification", "predict category", "binary", "class"])
        is_regression = any(keyword in problem_description.lower() 
                           for keyword in ["predict", "forecast", "estimate", "price", "value", "amount"])
        
        if isinstance(data_info, list) and len(data_info) > 0:
            # Try to identify potential target variables from column names
            potential_targets = []
            for col in data_info:
                col_lower = str(col).lower()
                if any(target_word in col_lower for target_word in 
                       ["target", "label", "y", "output", "price", "amount", "class", "category"]):
                    potential_targets.append(col)
            
            # If we found potential targets
            if potential_targets:
                for i, target in enumerate(potential_targets[:3]):  # Top 3 candidates
                    analysis.append({
                        "variable_name": target,
                        "confidence_score": 0.8 - (i * 0.2),  # Decreasing confidence
                        "rationale": f"Column name suggests target variable for {'classification' if is_classification else 'regression'} task",
                        "variable_type": "categorical" if is_classification else "numerical",
                        "recommendation": "High" if i == 0 else "Medium"
                    })
            else:
                # Generic fallback
                analysis.append({
                    "variable_name": "target_variable",
                    "confidence_score": 0.5,
                    "rationale": "Target variable to be determined based on problem requirements",
                    "variable_type": "categorical" if is_classification else "numerical", 
                    "recommendation": "Manual selection required"
                })
        else:
            # Basic fallback when no data info available
            analysis.append({
                "variable_name": "response_variable",
                "confidence_score": 0.3,
                "rationale": f"Fallback analysis - {'classification' if is_classification else 'regression'} target to be defined",
                "variable_type": "categorical" if is_classification else "numerical",
                "recommendation": "Manual identification needed"
            })
        
        return analysis
    
    def _generate_basic_target_analysis(self, error_msg, problem_description, data_info):
        """Generate basic target analysis when processing fails"""
        is_classification = "classif" in problem_description.lower()
        
        return [{
            "variable_name": "target_to_be_defined",
            "confidence_score": 0.2,
            "rationale": f"Basic analysis due to error: {error_msg}",
            "variable_type": "categorical" if is_classification else "numerical",
            "recommendation": "Manual target variable definition required"
        }]
    
    @finnish("target_variable_identified")
    def target_variable_identified(self):
        target_result = self.get_thinking("target_variable_identified")
        response_variable_analysis = target_result.get("response_variable_analysis", [])
        total_candidates = target_result.get("total_candidates", 0)
        status = target_result.get("status", "unknown")
        
        # Store target variable analysis
        self.add_variable("response_variable_analysis", response_variable_analysis)
        
        # Display target variable analysis
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Target Variable Analysis Completed**")
        
        if isinstance(response_variable_analysis, list) and len(response_variable_analysis) > 0:
            # Display target variable candidates
            target_table = self.to_tableh(response_variable_analysis)
            self.add_text("**Target Variable Candidates:**")
            self.add_text("Based on problem description, context, and dataset structure:")
            self.add_text(target_table)
            
            # Analysis summary
            high_confidence = len([t for t in response_variable_analysis if t.get("confidence_score", 0) > 0.7])
            variable_types = set(t.get("variable_type", "unknown") for t in response_variable_analysis)
            
            self.add_text(f"🎯 **Target Analysis Summary**: {total_candidates} candidate{'s' if total_candidates > 1 else ''} identified")
            if high_confidence > 0:
                self.add_text(f"🔴 **High Confidence**: {high_confidence} strong candidate{'s' if high_confidence > 1 else ''}")
            if variable_types:
                types_text = ", ".join(variable_types)
                self.add_text(f"📊 **Variable Types**: {types_text}")
        else:
            self.add_text("⚠️ No target variable candidates could be identified")
        
        # Continue to stage action selection
        return self.add_text("Proceeding with implementation workflow action selection...") \
            .next_thinking_event(
                event_tag="select_implementation_actions",
                textArray=["PCS Agent analyzing implementation requirements...", "selecting optimal execution actions..."],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("select_implementation_actions")
    def select_implementation_actions(self):
        try:
            # Get user goal and current state for intelligent action selection
            user_goal = self.input.get("user_goal", "Execute comprehensive machine learning implementation")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            consolidated_methodology = self.get_variable("consolidated_methodology", {})
            implementation_plan = self.get_variable("implementation_plan", [])
            
            # Define current data state (after methodology formulation)
            current_data_state = "Methodology strategy formulated, ready for implementation execution"
            
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_1_workflow_initialization",
                "section_2_feature_engineering_integration",
                "section_3_modeling_method_integration", 
                "section_4_model_training_execution"
            ]
            
            # Use PCS Agent to intelligently select necessary actions
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Define stage goal for Model Implementation Execution
            stage_goal = "Execute comprehensive model implementation including feature engineering integration, model method integration, and model training based on formulated methodology strategy"
            
            stage_analysis = pcs_agent.select_stage_actions_cli(
                stage_name=self.stage_name,
                stage_goal=stage_goal,
                available_actions=available_sections,
                current_data_state=current_data_state,
                user_goal=user_goal
            )
            
            # Validate and process analysis results
            if stage_analysis and not stage_analysis.get("error"):
                selected_actions = [action["action_id"] for action in stage_analysis.get("selected_actions", [])]
                execution_order = stage_analysis.get("execution_order", selected_actions)
                stage_execution_plan = stage_analysis.get("stage_execution_plan", f"Execute selected sections: {', '.join(execution_order)}")
                goal_relevance = stage_analysis.get("goal_relevance_analysis", "")
                
                action_selection = {
                    "execution_order": execution_order,
                    "stage_execution_plan": stage_execution_plan,
                    "goal_relevance": goal_relevance,
                    "selected_actions": stage_analysis.get("selected_actions", []),
                    "skip_actions": stage_analysis.get("skip_actions", [])
                }
            else:
                # Fallback to essential sections if PCS analysis fails
                essential_sections = [
                    "section_1_workflow_initialization",
                    "section_2_feature_engineering_integration",
                    "section_3_modeling_method_integration",
                    "section_4_model_training_execution"
                ]
                
                action_selection = {
                    "execution_order": essential_sections,
                    "stage_execution_plan": f"Executing essential implementation sections: {', '.join(essential_sections)}",
                    "goal_relevance": "Using fallback strategy for comprehensive model implementation execution",
                    "selected_actions": [{"action_id": s, "necessity": "essential", "contribution_to_goal": "Core implementation functionality"} for s in essential_sections],
                    "skip_actions": []
                }
                
            return self.conclusion("implementation_actions_selected", action_selection)
        except Exception as e:
            # Error fallback with minimal essential sections
            error_sections = ["section_1_workflow_initialization", "section_2_feature_engineering_integration", "section_4_model_training_execution"]
            
            error_selection = {
                "execution_order": error_sections,
                "stage_execution_plan": f"Error fallback: executing core sections: {', '.join(error_sections)}",
                "goal_relevance": f"Using error fallback due to: {str(e)}",
                "selected_actions": [{"action_id": s, "necessity": "error_fallback", "contribution_to_goal": "Essential functionality"} for s in error_sections],
                "skip_actions": []
            }
            return self.conclusion("implementation_actions_selected", error_selection)
        finally:
            return self.end_event()

    @finnish("implementation_actions_selected")
    def implementation_actions_selected(self):
        action_selection = self.get_thinking("implementation_actions_selected")
        
        # Display stage analysis and goal relevance
        goal_relevance = action_selection.get("goal_relevance", "")
        if goal_relevance:
            self.add_text(f"**Implementation Strategy**: {goal_relevance}")
        
        # Display execution plan
        stage_execution_plan = action_selection.get("stage_execution_plan", "")
        self.add_text(f"**Execution Plan**: {stage_execution_plan}")
        
        # Display selected actions
        selected_actions = action_selection.get("selected_actions", [])
        if selected_actions:
            self.add_text(f"**Selected Implementation Actions** ({len(selected_actions)} actions for model execution):")
            
            for action in selected_actions:
                necessity = action.get("necessity", "unknown")
                action_id = action.get("action_id", "unknown")
                contribution = action.get("contribution_to_goal", "")
                
                # Use icons to indicate necessity
                necessity_icon = "🔴" if necessity == 'essential' else "🟡" if necessity == 'helpful' else "🟢"
                if necessity == 'error_fallback':
                    necessity_icon = "⚠️"
                
                display_text = f"{necessity_icon} **{action_id}**"
                if contribution:
                    display_text += f": {contribution}"
                
                self.add_text(display_text)
        
        # Display skipped actions if any
        skip_actions = action_selection.get("skip_actions", [])
        if skip_actions:
            self.add_text("**Skipped Actions** (not essential for your goal):")
            for skip_action in skip_actions:
                action_id = skip_action.get("action_id", "unknown")
                skip_reason = skip_action.get("skip_reason", "Not required for current objectives")
                self.add_text(f"⏭️ **{action_id}**: {skip_reason}")
        
        # Update the workflow with selected steps
        execution_order = action_selection.get("execution_order", [])
        return self.update_stage_steps(execution_order) \
            .add_variable("implementation_action_selection", action_selection) \
            .add_variable("selected_implementation_actions", [action["action_id"] for action in selected_actions]) \
            .end_event()

async def model_training_and_evaluation_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()