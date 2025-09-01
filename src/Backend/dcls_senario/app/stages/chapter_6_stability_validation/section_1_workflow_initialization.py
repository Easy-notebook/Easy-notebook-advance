from typing import Dict, Any, Optional
from app.core.config import llm, PCSAgent
from app.models.Behavior import Behavior, event, thinking, after_exec, finnish

class WorkflowInitialization(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_6_stability_validation",
            section_id="section_1_workflow_initialization",
            name="Stability Validation Workflow Initialization",
            ability="Initialize comprehensive stability validation workflow with intelligent action selection and dataset variation generation",
            require_variables=["problem_description", "consolidated_methodology"]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("**Chapter Goal**: Validate model stability and robustness across different data variations") \
            .add_text("Generating comprehensive stability analysis strategy and dataset variations for thorough model validation") \
            .next_thinking_event(
                event_tag="select_stability_actions",
                textArray=[
                    "PCS Agent analyzing stability requirements...", 
                    "Evaluating model robustness strategies...", 
                    "Selecting optimal validation approaches..."
                ],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("select_stability_actions")
    def select_stability_actions(self):
        try:
            # Get user goal and current state for intelligent action selection
            user_goal = self.input.get("user_goal", "Validate model stability and robustness")
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            consolidated_methodology = self.get_variable("consolidated_methodology", {})
            implementation_plan = self.get_variable("implementation_plan", [])
            
            # Define current data state (after model implementation)
            current_data_state = "Models implemented and trained, ready for stability validation"
            
            # Get available sections for this stage
            available_sections = self.available_actions if isinstance(self.available_actions, list) else [
                "section_1_workflow_initialization",
                "section_2_multi_variation_evaluation_execution",
                "section_3_stability_analysis_consolidation"
            ]
            
            # Use PCS Agent to intelligently select necessary actions
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Define stage goal for Stability Validation
            stage_goal = "Validate model stability and robustness through comprehensive multi-variation evaluation and analysis"
            
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
                    "section_2_multi_variation_evaluation_execution",
                    "section_3_stability_analysis_consolidation"
                ]
                
                action_selection = {
                    "execution_order": essential_sections,
                    "stage_execution_plan": f"Executing essential stability validation sections: {', '.join(essential_sections)}",
                    "goal_relevance": "Using fallback strategy for comprehensive stability validation",
                    "selected_actions": [{"action_id": s, "necessity": "essential", "contribution_to_goal": "Core stability validation functionality"} for s in essential_sections],
                    "skip_actions": []
                }
                
            return self.conclusion("stability_actions_selected", action_selection)
        except Exception as e:
            # Error fallback with minimal essential sections
            error_sections = ["section_1_workflow_initialization", "section_2_multi_variation_evaluation_execution"]
            
            error_selection = {
                "execution_order": error_sections,
                "stage_execution_plan": f"Error fallback: executing core sections: {', '.join(error_sections)}",
                "goal_relevance": f"Using error fallback due to: {str(e)}",
                "selected_actions": [{"action_id": s, "necessity": "error_fallback", "contribution_to_goal": "Essential functionality"} for s in error_sections],
                "skip_actions": []
            }
            return self.conclusion("stability_actions_selected", error_selection)
        finally:
            return self.end_event()

    @finnish("stability_actions_selected")
    def stability_actions_selected(self):
        action_selection = self.get_thinking("stability_actions_selected")
        
        # Display stage analysis and goal relevance
        goal_relevance = action_selection.get("goal_relevance", "")
        if goal_relevance:
            self.add_text(f"**Stability Strategy**: {goal_relevance}")
        
        # Display execution plan
        stage_execution_plan = action_selection.get("stage_execution_plan", "")
        self.add_text(f"**Validation Plan**: {stage_execution_plan}")
        
        # Display selected actions
        selected_actions = action_selection.get("selected_actions", [])
        if selected_actions:
            self.add_text(f"**Selected Validation Actions** ({len(selected_actions)} actions for stability validation):")
            
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
        
        # Continue to stability strategy generation
        return self.add_text("Proceeding with comprehensive stability analysis strategy generation...") \
            .next_thinking_event(
                event_tag="generate_stability_strategy",
                textArray=["PCS Agent analyzing model requirements...", "generating stability validation strategy..."],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("generate_stability_strategy")
    def generate_stability_strategy(self):
        try:
            # Get comprehensive context for stability strategy
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            training_strategy = self.get_variable("training_strategy", [])
            consolidated_methodology = self.get_variable("consolidated_methodology", {})
            model_training_code = self.get_variable("model_training_code", "")
            
            # Initialize PCS Agent for stability strategy generation
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Generate comprehensive stability strategy
            stability_strategy = pcs_agent.generate_stability_strategy_cli(
                eda_summary=eda_summary,
                model_training_strategy=training_strategy
            )
            
            # Validate stability strategy
            if not stability_strategy or not isinstance(stability_strategy, list):
                # Generate fallback stability strategy
                fallback_strategy = self._generate_fallback_stability_strategy(
                    problem_description, training_strategy
                )
                stability_strategy = fallback_strategy
            
            return self.conclusion("stability_strategy_generated", {
                "stability_strategy": stability_strategy,
                "total_components": len(stability_strategy) if isinstance(stability_strategy, list) else 0,
                "status": "success" if isinstance(stability_strategy, list) and len(stability_strategy) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic stability strategy
            basic_strategy = self._generate_basic_stability_strategy(str(e))
            return self.conclusion("stability_strategy_generated", {
                "stability_strategy": basic_strategy,
                "total_components": len(basic_strategy),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_stability_strategy(self, problem_description, training_strategy):
        """Generate fallback stability strategy when agent fails"""
        strategy = []
        
        # Data variation stability testing
        strategy.append({
            "validation_type": "Data Variation Analysis",
            "description": "Evaluate model performance across different data preprocessing variations",
            "validation_methods": [
                "Feature scaling variations (StandardScaler, MinMaxScaler, RobustScaler)",
                "Missing value imputation variations (mean, median, mode, KNN)",
                "Outlier handling variations (removal, clipping, transformation)",
                "Feature selection variations (correlation, importance-based)"
            ],
            "success_criteria": "Model performance remains stable (variance < 5%) across variations",
            "priority": "High"
        })
        
        # Cross-validation stability
        strategy.append({
            "validation_type": "Cross-Validation Robustness",
            "description": "Test model consistency across different data splits",
            "validation_methods": [
                "K-fold cross-validation with different random seeds",
                "Stratified cross-validation for balanced evaluation",
                "Time-based splits for temporal data",
                "Bootstrap sampling validation"
            ],
            "success_criteria": "CV scores have low standard deviation (< 2% of mean)",
            "priority": "High"
        })
        
        # Hyperparameter sensitivity analysis
        strategy.append({
            "validation_type": "Hyperparameter Sensitivity",
            "description": "Analyze model stability to hyperparameter changes",
            "validation_methods": [
                "Small perturbations to optimal hyperparameters",
                "Grid search around optimal values",
                "Random hyperparameter sampling",
                "Bayesian optimization stability analysis"
            ],
            "success_criteria": "Performance degrades gracefully with parameter changes",
            "priority": "Medium"
        })
        
        # Determine problem-specific validations
        if "classification" in problem_description.lower():
            strategy.append({
                "validation_type": "Classification Stability",
                "description": "Test classification-specific stability metrics",
                "validation_methods": [
                    "Precision-recall curve stability",
                    "ROC-AUC consistency across folds",
                    "Confusion matrix stability analysis",
                    "Class probability calibration stability"
                ],
                "success_criteria": "Classification metrics remain consistent",
                "priority": "Medium"
            })
        else:
            strategy.append({
                "validation_type": "Regression Stability", 
                "description": "Test regression-specific stability metrics",
                "validation_methods": [
                    "Prediction interval consistency",
                    "Residual distribution stability",
                    "R-squared stability across splits",
                    "Feature coefficient stability"
                ],
                "success_criteria": "Regression metrics show low variance",
                "priority": "Medium"
            })
        
        return strategy
    
    def _generate_basic_stability_strategy(self, error_msg):
        """Generate basic stability strategy when processing fails"""
        return [{
            "validation_type": "Basic Stability Testing",
            "description": f"Standard stability validation approach (fallback due to error: {error_msg})",
            "validation_methods": [
                "Cross-validation consistency testing",
                "Basic data variation analysis",
                "Performance metric stability assessment"
            ],
            "success_criteria": "Model shows reasonable stability across basic tests",
            "priority": "Essential"
        }]
    
    @finnish("stability_strategy_generated")
    def stability_strategy_generated(self):
        strategy_result = self.get_thinking("stability_strategy_generated")
        stability_strategy = strategy_result.get("stability_strategy", [])
        total_components = strategy_result.get("total_components", 0)
        status = strategy_result.get("status", "unknown")
        
        # Store stability strategy
        self.add_variable("stability_strategy", stability_strategy)
        
        # Display stability strategy
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Stability Validation Strategy Generated**")
        
        if isinstance(stability_strategy, list) and len(stability_strategy) > 0:
            # Display strategy in organized format
            strategy_table = self.to_tableh(stability_strategy)
            self.add_text("**Comprehensive Stability Validation Strategy:**")
            self.add_text(strategy_table)
            
            # Strategy analysis
            high_priority = len([s for s in stability_strategy if s.get("priority", "").lower() == "high"])
            validation_types = set(s.get("validation_type", "Unknown") for s in stability_strategy)
            
            self.add_text(f"🔍 **Strategy Overview**: {total_components} validation components identified")
            if high_priority > 0:
                self.add_text(f"🔴 **High Priority**: {high_priority} critical validation methods")
            if validation_types:
                types_text = ", ".join(list(validation_types)[:3])
                self.add_text(f"📋 **Validation Types**: {types_text}{'...' if len(validation_types) > 3 else ''}")
        else:
            self.add_text("⚠️ No specific stability strategy could be generated")
        
        # Continue to dataset variation generation
        return self.add_text("Proceeding with dataset variation generation for stability testing...") \
            .next_thinking_event(
                event_tag="generate_dataset_variations",
                textArray=["PCS Agent analyzing variation requirements...", "generating dataset variations..."],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("generate_dataset_variations")
    def generate_dataset_variations(self):
        try:
            # Get context for dataset variation generation
            stability_strategy = self.get_variable("stability_strategy", [])
            csv_file_path = self.get_full_csv_path()
            data_info = self.get_variable("data_info", [])
            feature_engineering_methods = self.get_variable("feature_engineering_methods", [])
            
            # Initialize PCS Agent
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Generate dataset variations based on stability strategy
            dataset_variations = pcs_agent.generate_dataset_variations_cli(
                stability_strategy=stability_strategy,
                csv_file_path=csv_file_path,
                model_training_code=self.get_variable("model_training_code", "")
            )
            
            # Validate dataset variations
            if not dataset_variations or not isinstance(dataset_variations, list):
                # Generate fallback variations
                fallback_variations = self._generate_fallback_dataset_variations(
                    stability_strategy, feature_engineering_methods
                )
                dataset_variations = fallback_variations
            
            return self.conclusion("dataset_variations_generated", {
                "dataset_variations": dataset_variations,
                "total_variations": len(dataset_variations) if isinstance(dataset_variations, list) else 0,
                "status": "success" if isinstance(dataset_variations, list) and len(dataset_variations) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic variations
            basic_variations = self._generate_basic_dataset_variations(str(e))
            return self.conclusion("dataset_variations_generated", {
                "dataset_variations": basic_variations,
                "total_variations": len(basic_variations),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_dataset_variations(self, stability_strategy, feature_methods):
        """Generate fallback dataset variations when agent fails"""
        variations = []
        
        # Scaling variations
        variations.append({
            "variation_name": "StandardScaler_Variation",
            "description": "Standard scaling normalization",
            "preprocessing_steps": "StandardScaler for numerical features",
            "expected_impact": "Zero mean, unit variance features",
            "validation_metric": "performance_stability"
        })
        
        variations.append({
            "variation_name": "MinMaxScaler_Variation", 
            "description": "Min-max scaling normalization",
            "preprocessing_steps": "MinMaxScaler to [0,1] range",
            "expected_impact": "Features scaled to [0,1] range",
            "validation_metric": "performance_stability"
        })
        
        # Missing value variations
        variations.append({
            "variation_name": "MeanImputation_Variation",
            "description": "Mean imputation for missing values",
            "preprocessing_steps": "Fill missing values with column mean",
            "expected_impact": "No missing values, preserves distribution center",
            "validation_metric": "robustness_to_missing_data"
        })
        
        variations.append({
            "variation_name": "MedianImputation_Variation",
            "description": "Median imputation for missing values", 
            "preprocessing_steps": "Fill missing values with column median",
            "expected_impact": "Robust to outliers in imputation",
            "validation_metric": "robustness_to_missing_data"
        })
        
        # Outlier handling variations
        variations.append({
            "variation_name": "OutlierClipping_Variation",
            "description": "Outlier clipping using IQR method",
            "preprocessing_steps": "Clip outliers beyond 1.5*IQR",
            "expected_impact": "Reduced outlier influence",
            "validation_metric": "outlier_robustness"
        })
        
        return variations
    
    def _generate_basic_dataset_variations(self, error_msg):
        """Generate basic dataset variations when processing fails"""
        return [{
            "variation_name": "BasicPreprocessing_Variation",
            "description": f"Standard preprocessing variation (fallback due to error: {error_msg})",
            "preprocessing_steps": "Basic scaling and imputation",
            "expected_impact": "Standard data preparation",
            "validation_metric": "basic_stability"
        }]
    
    @finnish("dataset_variations_generated")
    def dataset_variations_generated(self):
        variation_result = self.get_thinking("dataset_variations_generated")
        dataset_variations = variation_result.get("dataset_variations", [])
        total_variations = variation_result.get("total_variations", 0)
        status = variation_result.get("status", "unknown")
        
        # Store dataset variations
        self.add_variable("dataset_variations", dataset_variations)
        
        # Display dataset variations
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Dataset Variations Generated**")
        
        if isinstance(dataset_variations, list) and len(dataset_variations) > 0:
            # Display variations in organized format
            variations_table = self.to_tableh(dataset_variations)
            self.add_text("**Dataset Variations for Stability Testing:**")
            self.add_text(variations_table)
            
            # Variation analysis
            variation_types = set(v.get("variation_name", "").split("_")[0] for v in dataset_variations)
            self.add_text(f"🔄 **Variation Summary**: {total_variations} preprocessing variations generated")
            if variation_types:
                types_text = ", ".join(list(variation_types)[:4])
                self.add_text(f"🧪 **Variation Types**: {types_text}{'...' if len(variation_types) > 4 else ''}")
        else:
            self.add_text("⚠️ No dataset variations could be generated")
        
        # Continue to variation code generation  
        return self.add_text("Generating code to create dataset variations...") \
            .next_thinking_event(
                event_tag="generate_variations_code",
                textArray=["PCS Agent generating implementation code...", "creating variation generation code..."],
                agentName="PCS Agent"
            ) \
            .end_event()
    
    @thinking("generate_variations_code")
    def generate_variations_code(self):
        try:
            # Get context for code generation
            dataset_variations = self.get_variable("dataset_variations", [])
            csv_file_path = self.get_full_csv_path()
            
            # Initialize PCS Agent
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            pcs_agent = PCSAgent(
                problem_description=problem_description,
                context_description=context_description,
                llm=llm
            )
            
            # Prefer stable vdstools utility to create basic variations
            # This avoids large dynamic code blocks and increases reliability
            variations_code = f'''from vdstools import create_basic_variations
import json

result = create_basic_variations("{csv_file_path}")
print(result)'''
            
            return self.conclusion("variations_code_generated", {
                "variations_code": variations_code,
                "status": "success" if isinstance(variations_code, str) and len(variations_code) > 100 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic code
            basic_code = self._generate_basic_variations_code(csv_file_path, str(e))
            return self.conclusion("variations_code_generated", {
                "variations_code": basic_code,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_variations_code(self, csv_file_path, variations):
        """Generate fallback code for dataset variations"""
        code = f'''import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.impute import SimpleImputer
import os

# Load original dataset
print("Loading original dataset for variation generation...")
original_data = pd.read_csv("{csv_file_path}")
print(f"Original dataset shape: {{original_data.shape}}")

# Create directory for dataset variations
variations_dir = "stability_variations"
os.makedirs(variations_dir, exist_ok=True)

# Initialize variation results
variation_results = []

# Generate dataset variations
print("\\n=== Generating Dataset Variations for Stability Testing ===")
'''
        
        # Add specific variation code based on available variations
        if isinstance(variations, list) and len(variations) > 0:
            for i, variation in enumerate(variations[:5]):  # Limit to 5 variations
                variation_name = variation.get("variation_name", f"variation_{i+1}")
                
                if "StandardScaler" in variation_name:
                    code += f'''
# {variation_name}: Standard scaling
print("Creating {variation_name}...")
data_std = original_data.copy()
scaler_std = StandardScaler()
numeric_cols = data_std.select_dtypes(include=[np.number]).columns
data_std[numeric_cols] = scaler_std.fit_transform(data_std[numeric_cols])
std_path = os.path.join(variations_dir, "{variation_name}.csv")
data_std.to_csv(std_path, index=False)
variation_results.append({{"variation": "{variation_name}", "path": std_path, "shape": data_std.shape}})
'''
                elif "MinMax" in variation_name:
                    code += f'''
# {variation_name}: MinMax scaling
print("Creating {variation_name}...")
data_minmax = original_data.copy()
scaler_minmax = MinMaxScaler()
numeric_cols = data_minmax.select_dtypes(include=[np.number]).columns
data_minmax[numeric_cols] = scaler_minmax.fit_transform(data_minmax[numeric_cols])
minmax_path = os.path.join(variations_dir, "{variation_name}.csv")
data_minmax.to_csv(minmax_path, index=False)
variation_results.append({{"variation": "{variation_name}", "path": minmax_path, "shape": data_minmax.shape}})
'''
                elif "Imputation" in variation_name:
                    strategy = "mean" if "Mean" in variation_name else "median"
                    code += f'''
# {variation_name}: {strategy.title()} imputation
print("Creating {variation_name}...")
data_imputed = original_data.copy()
imputer = SimpleImputer(strategy='{strategy}')
numeric_cols = data_imputed.select_dtypes(include=[np.number]).columns
data_imputed[numeric_cols] = imputer.fit_transform(data_imputed[numeric_cols])
imputed_path = os.path.join(variations_dir, "{variation_name}.csv")
data_imputed.to_csv(imputed_path, index=False)
variation_results.append({{"variation": "{variation_name}", "path": imputed_path, "shape": data_imputed.shape}})
'''
        
        code += '''
# Summary of created variations
print("\\n=== Dataset Variation Generation Results ===")
for result in variation_results:
    print(f"✅ {result['variation']}: {result['shape'][0]} rows × {result['shape'][1]} columns")
    print(f"   📁 Saved to: {result['path']}")

print(f"\\n🎉 Successfully created {len(variation_results)} dataset variations for stability testing")
variation_results'''
        
        return code
    
    def _generate_basic_variations_code(self, csv_file_path, error_msg):
        """Generate basic variations code when processing fails"""
        return f'''# Basic dataset variation generation (fallback)
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler

print("Basic dataset variation generation due to error: {error_msg}")

# Load original dataset
original_data = pd.read_csv("{csv_file_path}")
print(f"Original dataset shape: {{original_data.shape}}")

# Create basic variation with standard scaling
data_scaled = original_data.copy()
scaler = StandardScaler()
numeric_cols = data_scaled.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 0:
    data_scaled[numeric_cols] = scaler.fit_transform(data_scaled[numeric_cols])

# Save basic variation
data_scaled.to_csv("basic_stability_variation.csv", index=False)
print("✅ Created basic stability variation: basic_stability_variation.csv")

"Basic variation created successfully"'''
    
    @finnish("variations_code_generated") 
    def variations_code_generated(self):
        code_result = self.get_thinking("variations_code_generated")
        variations_code = code_result.get("variations_code", "")
        status = code_result.get("status", "unknown")
        
        # Store variations code
        self.add_variable("dataset_variations_code", variations_code)
        
        # Display and execute code
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Dataset Variation Code Generated**")
        self.add_text("**Executing code to create dataset variations:**")
        
        if variations_code:
            return self.add_code(variations_code) \
                .exe_code_cli(
                    event_tag="variations_created",
                    mark_finnish="Dataset variations created successfully"
                ) \
                .end_event()
        else:
            return self.add_text("⚠️ No variation code could be generated") \
                .add_variable("variations_creation_results", "No variations created") \
                .end_event()
    
    @after_exec("variations_created")
    def variations_created(self):
        variations_results = self.get_current_effect()
        self.add_variable("variations_creation_results", variations_results)
        # If dataset_variations not set, derive from creation results
        try:
            existing = self.get_variable("dataset_variations", [])
            if (not existing) and isinstance(variations_results, dict) and isinstance(variations_results.get("created"), list):
                derived = []
                for item in variations_results.get("created", []):
                    name = item.get("name") or item.get("variation") or "variation"
                    path = item.get("path") or ""
                    derived.append({
                        "variation_name": name,
                        "path": path,
                        "shape": item.get("shape")
                    })
                self.add_variable("dataset_variations", derived)
        except Exception:
            pass

        return self.add_text("✅ **Dataset Variations Creation Completed**") \
            .add_text("**Creation Results:**") \
            .add_text(str(variations_results)) \
            .add_text("🎯 **Stability Validation Workflow Initialized Successfully**") \
            .add_text("📊 Dataset variations ready for multi-variation evaluation execution") \
            .update_stage_steps(self.get_variable("stability_action_selection", {}).get("execution_order", [])) \
            .end_event()

def stability_analysis_step0(
    step: Dict[str, Any],
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()

# 添加标准的generate函数名
def generate(step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
    return stability_analysis_step0(step, state, stream)