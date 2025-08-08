from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.BaseAction import BaseAction, event, thinking, finnish

class FeatureAndModelMethodProposal(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_4_methodology_strategy_formulation",
                         section_id="section_2_feature_and_model_method_proposal",
                         name="Feature and Model Method Proposal",
                         ability="Generate comprehensive feature engineering approaches and machine learning model recommendations",
                         require_variables=["problem_description", "comprehensive_eda_summary"])
    
    @event("start")
    def start(self):
        return self.new_section("Feature Engineering and Model Method Proposal") \
            .add_text("Generating comprehensive feature engineering strategies and model recommendations") \
            .add_text("Based on data insights, analyzing optimal feature transformation and model selection approaches") \
            .next_thinking_event(
                event_tag="analyze_feature_requirements",
                textArray=["Prediction and Inference Agent is thinking...", "analyzing feature engineering requirements..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("analyze_feature_requirements")
    def analyze_feature_requirements(self):
        try:
            # Get comprehensive context for feature engineering analysis
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            data_quality_assessment = self.get_variable("data_quality_assessment", {})
            data_info = self.get_variable("data_info", [])
            
            # Validate required inputs
            if not eda_summary:
                return self.conclusion("no_eda_summary", {
                    "status": "missing_input",
                    "message": "No EDA summary available for feature engineering analysis"
                })
            
            # Initialize prediction agent with comprehensive context
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Generate feature engineering method recommendations
            feature_engineering_methods = prediction_agent.suggest_feature_engineering_methods_cli()
            
            # Validate feature engineering results
            if not feature_engineering_methods or not isinstance(feature_engineering_methods, list):
                # Fallback feature engineering methods
                fallback_methods = self._generate_fallback_feature_methods(data_info)
                feature_engineering_methods = fallback_methods
            
            return self.conclusion("feature_methods_generated", {
                "feature_methods": feature_engineering_methods,
                "status": "success" if isinstance(feature_engineering_methods, list) and len(feature_engineering_methods) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic feature methods
            basic_methods = self._generate_basic_feature_methods(str(e))
            return self.conclusion("feature_methods_generated", {
                "feature_methods": basic_methods,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_feature_methods(self, data_info):
        """Generate fallback feature engineering methods when agent fails"""
        methods = []
        
        # Basic feature engineering approaches
        methods.append({
            "method_name": "Numerical Feature Scaling",
            "description": "Standardize numerical features using StandardScaler or MinMaxScaler",
            "rationale": "Ensure all numerical features are on the same scale for model training",
            "implementation_priority": "High",
            "expected_impact": "Improved model convergence and performance"
        })
        
        methods.append({
            "method_name": "Categorical Feature Encoding",
            "description": "Apply one-hot encoding or label encoding for categorical variables",
            "rationale": "Convert categorical variables to numerical format for machine learning",
            "implementation_priority": "High", 
            "expected_impact": "Enable categorical data usage in models"
        })
        
        methods.append({
            "method_name": "Missing Value Treatment",
            "description": "Handle missing values through imputation or deletion strategies",
            "rationale": "Ensure data completeness for reliable model training",
            "implementation_priority": "High",
            "expected_impact": "Improved data quality and model reliability"
        })
        
        if isinstance(data_info, list) and len(data_info) > 5:
            methods.append({
                "method_name": "Feature Selection",
                "description": "Apply correlation analysis and feature importance to select relevant features",
                "rationale": "Reduce dimensionality and focus on most predictive features",
                "implementation_priority": "Medium",
                "expected_impact": "Reduced overfitting and improved model interpretability"
            })
        
        return methods
    
    def _generate_basic_feature_methods(self, error_msg):
        """Generate basic feature methods when processing fails"""
        return [{
            "method_name": "Basic Data Preprocessing",
            "description": f"Apply standard preprocessing pipeline (fallback due to error: {error_msg})",
            "rationale": "Ensure data is in proper format for machine learning",
            "implementation_priority": "Essential",
            "expected_impact": "Basic data preparation for modeling"
        }]
    
    @finnish("feature_methods_generated")
    def feature_methods_generated(self):
        feature_result = self.get_thinking("feature_methods_generated")
        feature_methods = feature_result.get("feature_methods", [])
        status = feature_result.get("status", "unknown")
        
        # Store feature engineering methods
        self.add_variable("feature_engineering_methods", feature_methods)
        
        # Display feature engineering methods
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Feature Engineering Methods Generated**")
        
        if isinstance(feature_methods, list) and len(feature_methods) > 0:
            # Display feature methods in organized format
            feature_table = self.to_tableh(feature_methods)
            self.add_text("**Recommended Feature Engineering Approaches:**")
            self.add_text(feature_table)
            
            # Summary
            high_priority = len([m for m in feature_methods if m.get("implementation_priority", "").lower() == "high"])
            self.add_text(f"📈 **Summary**: {len(feature_methods)} feature engineering methods proposed")
            if high_priority > 0:
                self.add_text(f"🔴 **High Priority**: {high_priority} critical methods identified")
        else:
            self.add_text("⚠️ No specific feature engineering methods could be generated")
        
        # Continue to model method generation
        return self.add_text("Proceeding to generate machine learning model recommendations...") \
            .next_thinking_event(
                event_tag="generate_model_methods",
                textArray=["Prediction and Inference Agent is thinking...", "generating model method recommendations..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @finnish("no_eda_summary")
    def no_eda_summary(self):
        result = self.get_thinking("no_eda_summary")
        message = result.get("message", "No EDA summary available")
        
        # Create basic feature methods without EDA
        basic_methods = self._generate_fallback_feature_methods([])
        self.add_variable("feature_engineering_methods", basic_methods)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text("**Alternative Approach**: Using standard feature engineering methods") \
            .add_text("Proceeding with basic feature engineering recommendations...") \
            .next_event("generate_model_methods") \
            .end_event()
    
    @thinking("generate_model_methods")
    def generate_model_methods(self):
        try:
            # Get context for model method generation
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            feature_methods = self.get_variable("feature_engineering_methods", [])
            data_quality_assessment = self.get_variable("data_quality_assessment", {})
            
            # Initialize prediction agent
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Generate model method recommendations
            model_methods = prediction_agent.suggest_modeling_methods_cli()
            
            # Validate model methods
            if not model_methods or not isinstance(model_methods, list):
                # Fallback model methods
                fallback_models = self._generate_fallback_model_methods(problem_description)
                model_methods = fallback_models
            
            return self.conclusion("model_methods_generated", {
                "model_methods": model_methods,
                "total_methods": len(model_methods) if isinstance(model_methods, list) else 0,
                "status": "success" if isinstance(model_methods, list) and len(model_methods) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic models
            basic_models = self._generate_basic_model_methods(str(e))
            return self.conclusion("model_methods_generated", {
                "model_methods": basic_models,
                "total_methods": len(basic_models),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_model_methods(self, problem_description):
        """Generate fallback model methods when agent fails"""
        methods = []
        
        # Determine if it's likely a classification or regression problem
        is_classification = any(keyword in problem_description.lower() 
                              for keyword in ["classify", "classification", "predict category", "binary", "class"])
        
        if is_classification:
            methods.extend([
                {
                    "model_name": "Random Forest Classifier",
                    "description": "Ensemble method combining multiple decision trees",
                    "rationale": "Robust performance with good interpretability and handling of mixed data types",
                    "complexity": "Medium",
                    "expected_performance": "High accuracy with good generalization"
                },
                {
                    "model_name": "Gradient Boosting Classifier",
                    "description": "Sequential ensemble method focusing on difficult cases",
                    "rationale": "Often achieves high performance on structured data",
                    "complexity": "High", 
                    "expected_performance": "High accuracy but may overfit"
                },
                {
                    "model_name": "Logistic Regression",
                    "description": "Linear model for binary and multiclass classification",
                    "rationale": "Simple, interpretable baseline with fast training",
                    "complexity": "Low",
                    "expected_performance": "Good baseline performance"
                }
            ])
        else:
            # Regression methods
            methods.extend([
                {
                    "model_name": "Random Forest Regressor",
                    "description": "Ensemble method for regression tasks",
                    "rationale": "Robust performance with feature importance insights",
                    "complexity": "Medium",
                    "expected_performance": "Good accuracy with low overfitting risk"
                },
                {
                    "model_name": "Gradient Boosting Regressor",
                    "description": "Sequential boosting for regression",
                    "rationale": "High performance on structured regression problems",
                    "complexity": "High",
                    "expected_performance": "High accuracy but requires tuning"
                },
                {
                    "model_name": "Linear Regression",
                    "description": "Simple linear model for continuous targets",
                    "rationale": "Interpretable baseline with fast training",
                    "complexity": "Low", 
                    "expected_performance": "Good baseline for linear relationships"
                }
            ])
        
        return methods
    
    def _generate_basic_model_methods(self, error_msg):
        """Generate basic model methods when processing fails"""
        return [{
            "model_name": "Automated Model Selection",
            "description": f"Use automated ML approach to select best model (fallback due to error: {error_msg})",
            "rationale": "Systematic model comparison when specific recommendations unavailable",
            "complexity": "Medium",
            "expected_performance": "Model-dependent performance through comparison"
        }]
    
    @finnish("model_methods_generated")
    def model_methods_generated(self):
        model_result = self.get_thinking("model_methods_generated")
        model_methods = model_result.get("model_methods", [])
        total_methods = model_result.get("total_methods", 0)
        status = model_result.get("status", "unknown")
        
        # Store model methods
        self.add_variable("model_methods", model_methods)
        
        # Display model methods
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Machine Learning Model Methods Generated**")
        
        if isinstance(model_methods, list) and len(model_methods) > 0:
            # Display model methods in organized format
            model_table = self.to_tableh(model_methods)
            self.add_text("**Recommended Machine Learning Models:**")
            self.add_text(model_table)
            
            # Analysis summary
            complexity_counts = {}
            for method in model_methods:
                complexity = method.get("complexity", "Unknown")
                complexity_counts[complexity] = complexity_counts.get(complexity, 0) + 1
            
            self.add_text(f"🤖 **Model Summary**: {total_methods} machine learning approaches recommended")
            
            if complexity_counts:
                complexity_text = ", ".join([f"{count} {complexity.lower()} complexity" for complexity, count in complexity_counts.items()])
                self.add_text(f"📊 **Complexity Distribution**: {complexity_text}")
        else:
            self.add_text("⚠️ No specific model methods could be generated")
        
        # Completion summary
        feature_methods_count = len(self.get_variable("feature_engineering_methods", []))
        return self.add_text("✅ **Feature and Model Method Proposal Completed**") \
            .add_text(f"📈 **Total Recommendations**: {feature_methods_count} feature methods + {total_methods} model methods") \
            .add_text("Ready to proceed with training and evaluation strategy development") \
            .end_event()

async def generate_method_proposal_sequence_step1(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return FeatureAndModelMethodProposal(step, state, stream).run()
    