from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.Behavior import Behavior, event, thinking, finnish

class TrainingEvaluationStrategyDevelopment(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_4_methodology_strategy_formulation",
                         section_id="section_3_training_evaluation_strategy_development",
                         name="Training and Evaluation Strategy Development",
                         ability="Develop comprehensive training and evaluation strategies for machine learning models",
                         require_variables=["problem_description", "feature_engineering_methods", "model_methods"])
    
    @event("start")
    def start(self):
        return self.new_section("Training and Evaluation Strategy Development") \
            .add_text("Developing comprehensive training and evaluation strategy based on proposed methods") \
            .add_text("Creating systematic approach for model training, validation, and performance assessment") \
            .next_thinking_event(
                event_tag="develop_training_strategy",
                textArray=["Prediction and Inference Agent is thinking...", "developing training strategy..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("develop_training_strategy")
    def develop_training_strategy(self):
        try:
            # Get comprehensive context for strategy development
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            feature_engineering_methods = self.get_variable("feature_engineering_methods", [])
            model_methods = self.get_variable("model_methods", [])
            data_quality_assessment = self.get_variable("data_quality_assessment", {})
            
            # Validate required inputs
            if not feature_engineering_methods or not model_methods:
                return self.conclusion("insufficient_methods", {
                    "status": "missing_requirements",
                    "feature_methods_available": len(feature_engineering_methods) if feature_engineering_methods else 0,
                    "model_methods_available": len(model_methods) if model_methods else 0,
                    "message": "Insufficient feature engineering or model methods for strategy development"
                })
            
            # Initialize prediction agent with comprehensive context
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Generate comprehensive training and evaluation strategy
            training_strategy = prediction_agent.generate_training_evaluation_strategy_cli(
                feature_engineering_methods, model_methods
            )
            
            # Validate strategy results
            if not training_strategy or not isinstance(training_strategy, list):
                # Generate fallback strategy
                fallback_strategy = self._generate_fallback_strategy(
                    feature_engineering_methods, model_methods, data_quality_assessment
                )
                training_strategy = fallback_strategy
            
            # Process and enhance strategy with additional considerations
            enhanced_strategy = self._enhance_training_strategy(
                training_strategy, data_quality_assessment, problem_description
            )
            
            return self.conclusion("training_strategy_developed", {
                "training_strategy": enhanced_strategy,
                "total_components": len(enhanced_strategy) if isinstance(enhanced_strategy, list) else 0,
                "status": "success" if isinstance(training_strategy, list) and len(training_strategy) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic strategy
            basic_strategy = self._generate_basic_strategy(str(e), feature_engineering_methods, model_methods)
            return self.conclusion("training_strategy_developed", {
                "training_strategy": basic_strategy,
                "total_components": len(basic_strategy),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_strategy(self, feature_methods, model_methods, quality_assessment):
        """Generate fallback training strategy when agent fails"""
        strategy = []
        
        # Data preparation strategy
        strategy.append({
            "phase": "Data Preparation",
            "strategy_component": "Feature Engineering Pipeline",
            "description": f"Implement {len(feature_methods)} feature engineering methods in sequence",
            "implementation_steps": [
                "Apply data cleaning and preprocessing",
                "Execute feature transformations",
                "Validate feature engineering results"
            ],
            "success_criteria": "All features properly transformed and validated",
            "estimated_time": "2-3 hours"
        })
        
        # Model training strategy
        strategy.append({
            "phase": "Model Training",
            "strategy_component": "Multi-Model Training Approach",
            "description": f"Train and compare {len(model_methods)} different model types",
            "implementation_steps": [
                "Split data into training/validation/test sets",
                "Train each model with cross-validation",
                "Track performance metrics for each model"
            ],
            "success_criteria": "All models trained with performance metrics recorded",
            "estimated_time": "4-6 hours"
        })
        
        # Model evaluation strategy
        strategy.append({
            "phase": "Model Evaluation",
            "strategy_component": "Comprehensive Performance Assessment",
            "description": "Evaluate models using multiple metrics and validation techniques",
            "implementation_steps": [
                "Calculate performance metrics (accuracy, precision, recall, etc.)",
                "Perform cross-validation analysis",
                "Generate confusion matrices and performance visualizations"
            ],
            "success_criteria": "Clear performance comparison and best model identification",
            "estimated_time": "2-3 hours"
        })
        
        # Model selection strategy
        strategy.append({
            "phase": "Model Selection",
            "strategy_component": "Optimal Model Selection",
            "description": "Select best performing model based on comprehensive evaluation",
            "implementation_steps": [
                "Compare all model performances",
                "Consider interpretability vs performance trade-offs",
                "Select final model with justification"
            ],
            "success_criteria": "Best model selected with clear rationale",
            "estimated_time": "1-2 hours"
        })
        
        return strategy
    
    def _enhance_training_strategy(self, base_strategy, quality_assessment, problem_description):
        """Enhance training strategy with additional considerations"""
        if not isinstance(base_strategy, list):
            return base_strategy
        
        enhanced_strategy = []
        for component in base_strategy:
            enhanced_component = dict(component)
            
            # Add data quality considerations
            if quality_assessment:
                readiness_score = quality_assessment.get("readiness_score", 100)
                if readiness_score < 90:
                    if "implementation_steps" in enhanced_component:
                        enhanced_component["implementation_steps"].insert(0, 
                            f"Address data quality issues (current score: {readiness_score:.1f}%)")
            
            # Add problem-specific considerations
            if "classification" in problem_description.lower():
                if enhanced_component.get("phase") == "Model Evaluation":
                    enhanced_component["additional_metrics"] = ["ROC-AUC", "F1-Score", "Precision-Recall Curve"]
            elif any(keyword in problem_description.lower() for keyword in ["regression", "predict", "forecast"]):
                if enhanced_component.get("phase") == "Model Evaluation":
                    enhanced_component["additional_metrics"] = ["MAE", "MSE", "R-squared", "MAPE"]
            
            enhanced_strategy.append(enhanced_component)
        
        return enhanced_strategy
    
    def _generate_basic_strategy(self, error_msg, feature_methods, model_methods):
        """Generate basic strategy when processing fails"""
        return [{
            "phase": "Complete ML Pipeline",
            "strategy_component": "Standard ML Development Process",
            "description": f"Follow standard machine learning pipeline (fallback due to error: {error_msg})",
            "implementation_steps": [
                "Prepare data with available feature methods",
                "Train models using available model methods",
                "Evaluate and select best performing model"
            ],
            "success_criteria": "Complete ML model development pipeline executed",
            "estimated_time": "6-10 hours",
            "available_methods": f"{len(feature_methods)} feature methods, {len(model_methods)} model methods"
        }]
    
    @finnish("training_strategy_developed")
    def training_strategy_developed(self):
        strategy_result = self.get_thinking("training_strategy_developed")
        training_strategy = strategy_result.get("training_strategy", [])
        total_components = strategy_result.get("total_components", 0)
        status = strategy_result.get("status", "unknown")
        
        # Store training strategy
        self.add_variable("training_strategy", training_strategy)
        
        # Display strategy
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Training and Evaluation Strategy Developed**")
        
        if isinstance(training_strategy, list) and len(training_strategy) > 0:
            # Display strategy in organized format
            strategy_table = self.to_tableh(training_strategy)
            self.add_text("**Comprehensive Training and Evaluation Strategy:**")
            self.add_text(strategy_table)
            
            # Strategy analysis
            phases = set(component.get("phase", "Unknown") for component in training_strategy)
            total_estimated_time = self._calculate_total_time(training_strategy)
            
            self.add_text(f"📋 **Strategy Overview**: {total_components} strategic components across {len(phases)} phases")
            if total_estimated_time:
                self.add_text(f"⏱️ **Estimated Timeline**: {total_estimated_time}")
            
            # Phase breakdown
            if len(phases) > 1:
                phase_counts = {}
                for component in training_strategy:
                    phase = component.get("phase", "Unknown")
                    phase_counts[phase] = phase_counts.get(phase, 0) + 1
                
                phase_summary = ", ".join([f"{count} {phase.lower()} step{'s' if count > 1 else ''}" 
                                         for phase, count in phase_counts.items()])
                self.add_text(f"📊 **Phase Distribution**: {phase_summary}")
        else:
            self.add_text("⚠️ No specific training strategy could be generated")
        
        return self.add_text("✅ **Training and Evaluation Strategy Development Completed**") \
            .add_text("Comprehensive strategy ready for methodology consolidation and implementation") \
            .end_event()
    
    def _calculate_total_time(self, strategy):
        """Calculate total estimated time from strategy components"""
        total_hours = 0
        for component in strategy:
            time_estimate = component.get("estimated_time", "")
            if isinstance(time_estimate, str) and "hour" in time_estimate.lower():
                # Extract hours from strings like "2-3 hours" or "4-6 hours"
                import re
                hours_match = re.findall(r'\d+', time_estimate)
                if hours_match:
                    # Take the maximum value if range is given
                    max_hours = max(int(h) for h in hours_match)
                    total_hours += max_hours
        
        return f"approximately {total_hours} hours" if total_hours > 0 else None
    
    @finnish("insufficient_methods")
    def insufficient_methods(self):
        result = self.get_thinking("insufficient_methods")
        message = result.get("message", "Insufficient methods available")
        feature_count = result.get("feature_methods_available", 0)
        model_count = result.get("model_methods_available", 0)
        
        # Generate minimal strategy with available methods
        minimal_strategy = [{
            "phase": "Basic Training Strategy",
            "strategy_component": "Standard ML Approach",
            "description": "Basic machine learning training approach with available methods",
            "implementation_steps": [
                "Use available preprocessing methods",
                "Apply basic model training",
                "Perform standard evaluation"
            ],
            "success_criteria": "Complete basic ML pipeline",
            "available_resources": f"{feature_count} feature methods, {model_count} model methods"
        }]
        
        self.add_variable("training_strategy", minimal_strategy)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text(f"**Available Resources**: {feature_count} feature methods, {model_count} model methods") \
            .add_text("**Alternative Approach**: Using basic training strategy with available methods") \
            .add_text("Minimal strategy developed for model training and evaluation") \
            .end_event()

async def generate_method_proposal_sequence_step2(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return TrainingEvaluationStrategyDevelopment(step, state, stream).run()
    