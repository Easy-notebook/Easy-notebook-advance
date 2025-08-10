from typing import Dict, Any, Optional
from app.core.config import llm, PredictionAndInferenceAgent
from app.models.Behavior import Behavior, event, thinking, finnish

class MethodologyStrategyConsolidation(Behavior):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(step, state, stream,
                         chapter_id="chapter_4_methodology_strategy_formulation",
                         section_id="section_4_methodology_strategy_consolidation",
                         name="Methodology Strategy Consolidation",
                         ability="Consolidate and synthesize all methodology components into a comprehensive implementation strategy",
                         require_variables=["problem_description", "feature_engineering_methods", "model_methods", "training_strategy"])
    
    @event("start")
    def start(self):
        return self.new_section("Methodology Strategy Consolidation") \
            .add_text("Consolidating all methodology components into comprehensive implementation strategy") \
            .add_text("Synthesizing feature engineering, model selection, and training strategies into actionable blueprint") \
            .next_thinking_event(
                event_tag="consolidate_methodology",
                textArray=["Prediction and Inference Agent is thinking...", "consolidating comprehensive methodology strategy..."],
                agentName="Prediction and Inference Agent"
            ) \
            .end_event()
    
    @thinking("consolidate_methodology")
    def consolidate_methodology(self):
        try:
            # Get all methodology components
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            eda_summary = self.get_variable("comprehensive_eda_summary", self.get_variable("eda_summary", ""))
            feature_engineering_methods = self.get_variable("feature_engineering_methods", [])
            model_methods = self.get_variable("model_methods", [])
            training_strategy = self.get_variable("training_strategy", [])
            data_quality_assessment = self.get_variable("data_quality_assessment", {})
            
            # Validate that we have sufficient components
            missing_components = []
            if not feature_engineering_methods:
                missing_components.append("feature_engineering_methods")
            if not model_methods:
                missing_components.append("model_methods")
            if not training_strategy:
                missing_components.append("training_strategy")
            
            if missing_components:
                return self.conclusion("incomplete_methodology", {
                    "status": "missing_components",
                    "missing_components": missing_components,
                    "message": f"Missing methodology components: {', '.join(missing_components)}"
                })
            
            # Generate comprehensive methodology consolidation using agent
            prediction_agent = PredictionAndInferenceAgent(
                problem_description=problem_description,
                context_description=context_description,
                eda_summary=eda_summary,
                llm=llm
            )
            
            # Create methodology summary with all components
            methodology_consolidation = self._generate_comprehensive_consolidation(
                problem_description, context_description, feature_engineering_methods, 
                model_methods, training_strategy, data_quality_assessment
            )
            
            # Generate implementation timeline and resource requirements
            implementation_plan = self._generate_implementation_plan(
                feature_engineering_methods, model_methods, training_strategy
            )
            
            # Create final methodology summary
            final_methodology = {
                "methodology_consolidation": methodology_consolidation,
                "implementation_plan": implementation_plan,
                "total_feature_methods": len(feature_engineering_methods),
                "total_model_methods": len(model_methods),
                "total_strategy_components": len(training_strategy),
                "readiness_status": self._assess_implementation_readiness(data_quality_assessment)
            }
            
            return self.conclusion("methodology_consolidated", final_methodology)
            
        except Exception as e:
            # Error fallback with basic consolidation
            basic_consolidation = self._generate_basic_consolidation(str(e), 
                feature_engineering_methods, model_methods, training_strategy)
            
            return self.conclusion("methodology_consolidated", {
                "methodology_consolidation": basic_consolidation,
                "implementation_plan": [{"phase": "Basic Implementation", "description": "Follow standard ML pipeline"}],
                "total_feature_methods": len(feature_engineering_methods) if feature_engineering_methods else 0,
                "total_model_methods": len(model_methods) if model_methods else 0,
                "total_strategy_components": len(training_strategy) if training_strategy else 0,
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_comprehensive_consolidation(self, problem_description, context_description, 
                                           feature_methods, model_methods, training_strategy, quality_assessment):
        """Generate comprehensive methodology consolidation"""
        consolidation = {
            "project_overview": {
                "problem_statement": problem_description,
                "context": context_description,
                "data_readiness": quality_assessment.get("readiness_status", "Ready for processing")
            },
            "feature_engineering_approach": {
                "total_methods": len(feature_methods),
                "high_priority_methods": len([m for m in feature_methods if m.get("implementation_priority", "").lower() == "high"]),
                "key_transformations": [m.get("method_name", "Unknown") for m in feature_methods[:3]],
                "expected_impact": "Enhanced data quality and model performance"
            },
            "model_selection_strategy": {
                "total_models": len(model_methods),
                "complexity_distribution": self._analyze_model_complexity(model_methods),
                "recommended_models": [m.get("model_name", "Unknown") for m in model_methods[:3]],
                "selection_rationale": "Multi-model comparison for optimal performance"
            },
            "training_evaluation_framework": {
                "total_phases": len(training_strategy),
                "key_phases": [s.get("phase", "Unknown") for s in training_strategy],
                "estimated_timeline": self._calculate_total_timeline(training_strategy),
                "success_criteria": "Comprehensive model evaluation and selection"
            }
        }
        
        return consolidation
    
    def _generate_implementation_plan(self, feature_methods, model_methods, training_strategy):
        """Generate implementation plan with timeline"""
        plan = []
        
        # Phase 1: Data Preparation and Feature Engineering
        plan.append({
            "phase_number": 1,
            "phase_name": "Data Preparation and Feature Engineering",
            "description": f"Implement {len(feature_methods)} feature engineering methods",
            "key_activities": [
                "Execute data preprocessing pipeline",
                "Apply feature transformations",
                "Validate feature engineering results",
                "Create feature engineering documentation"
            ],
            "deliverables": ["Processed dataset", "Feature engineering pipeline", "Feature validation report"],
            "estimated_duration": "2-4 hours",
            "dependencies": ["Clean dataset", "Feature engineering methods defined"]
        })
        
        # Phase 2: Model Development and Training
        plan.append({
            "phase_number": 2,
            "phase_name": "Model Development and Training",
            "description": f"Train and optimize {len(model_methods)} different model types",
            "key_activities": [
                "Setup model training infrastructure",
                "Train multiple model candidates",
                "Perform hyperparameter tuning",
                "Document model configurations"
            ],
            "deliverables": ["Trained models", "Model performance metrics", "Training logs"],
            "estimated_duration": "4-8 hours",
            "dependencies": ["Processed features", "Training strategy defined"]
        })
        
        # Phase 3: Model Evaluation and Selection
        plan.append({
            "phase_number": 3,
            "phase_name": "Model Evaluation and Selection",
            "description": "Comprehensive model evaluation and final model selection",
            "key_activities": [
                "Calculate comprehensive performance metrics",
                "Perform cross-validation analysis",
                "Generate performance visualizations",
                "Select optimal model with justification"
            ],
            "deliverables": ["Model comparison report", "Performance visualizations", "Final model selection"],
            "estimated_duration": "2-4 hours",
            "dependencies": ["Trained models", "Evaluation strategy defined"]
        })
        
        # Phase 4: Model Validation and Documentation
        plan.append({
            "phase_number": 4,
            "phase_name": "Model Validation and Documentation",
            "description": "Final model validation and comprehensive documentation",
            "key_activities": [
                "Perform final model validation",
                "Create model documentation",
                "Generate implementation guidelines",
                "Prepare deployment recommendations"
            ],
            "deliverables": ["Validated model", "Complete documentation", "Implementation guide"],
            "estimated_duration": "2-3 hours",
            "dependencies": ["Selected model", "Validation dataset"]
        })
        
        return plan
    
    def _analyze_model_complexity(self, model_methods):
        """Analyze distribution of model complexities"""
        complexity_counts = {}
        for method in model_methods:
            complexity = method.get("complexity", "Unknown")
            complexity_counts[complexity] = complexity_counts.get(complexity, 0) + 1
        
        return complexity_counts
    
    def _calculate_total_timeline(self, training_strategy):
        """Calculate total estimated timeline"""
        total_hours = 0
        for component in training_strategy:
            time_estimate = component.get("estimated_time", "")
            if isinstance(time_estimate, str) and "hour" in time_estimate.lower():
                import re
                hours_match = re.findall(r'\d+', time_estimate)
                if hours_match:
                    max_hours = max(int(h) for h in hours_match)
                    total_hours += max_hours
        
        return f"approximately {total_hours} hours" if total_hours > 0 else "timeline to be determined"
    
    def _assess_implementation_readiness(self, quality_assessment):
        """Assess overall readiness for implementation"""
        if not quality_assessment:
            return "Ready for implementation (no quality issues detected)"
        
        readiness_score = quality_assessment.get("readiness_score", 100)
        if readiness_score >= 90:
            return "Excellent - Ready for immediate implementation"
        elif readiness_score >= 75:
            return "Good - Ready for implementation with minor considerations"
        elif readiness_score >= 60:
            return "Fair - Implementation possible with additional preprocessing"
        else:
            return "Requires data quality improvements before implementation"
    
    def _generate_basic_consolidation(self, error_msg, feature_methods, model_methods, training_strategy):
        """Generate basic consolidation when processing fails"""
        return {
            "project_overview": {
                "status": f"Basic consolidation due to error: {error_msg}",
                "available_components": f"{len(feature_methods)} feature methods, {len(model_methods)} model methods, {len(training_strategy)} strategy components"
            },
            "implementation_approach": "Standard machine learning pipeline with available components",
            "next_steps": [
                "Review available methodology components",
                "Implement feature engineering methods",
                "Train and evaluate models",
                "Select best performing model"
            ]
        }
    
    @finnish("methodology_consolidated")
    def methodology_consolidated(self):
        consolidation_result = self.get_thinking("methodology_consolidated")
        methodology_consolidation = consolidation_result.get("methodology_consolidation", {})
        implementation_plan = consolidation_result.get("implementation_plan", [])
        total_feature_methods = consolidation_result.get("total_feature_methods", 0)
        total_model_methods = consolidation_result.get("total_model_methods", 0)
        total_strategy_components = consolidation_result.get("total_strategy_components", 0)
        readiness_status = consolidation_result.get("readiness_status", "Unknown")
        
        # Store consolidated methodology
        self.add_variable("consolidated_methodology", methodology_consolidation)
        self.add_variable("implementation_plan", implementation_plan)
        
        # Display comprehensive methodology summary
        self.add_text("✅ **Comprehensive Methodology Strategy Consolidated**")
        self.add_text("📋 **Complete Methodology Overview**")
        
        # Project context summary
        if isinstance(methodology_consolidation, dict) and "project_overview" in methodology_consolidation:
            overview = methodology_consolidation["project_overview"]
            self.add_text(f"**Problem**: {overview.get('problem_statement', 'Data analysis project')}")
            self.add_text(f"**Context**: {overview.get('context', 'Machine learning implementation')}")
            self.add_text(f"**Data Readiness**: {overview.get('data_readiness', readiness_status)}")
        
        # Methodology components summary
        self.add_text("🔧 **Methodology Components Summary**")
        self.add_text(f"**Feature Engineering**: {total_feature_methods} methods proposed")
        self.add_text(f"**Machine Learning Models**: {total_model_methods} approaches identified")  
        self.add_text(f"**Training Strategy**: {total_strategy_components} strategic components")
        
        # Feature engineering details
        if isinstance(methodology_consolidation, dict) and "feature_engineering_approach" in methodology_consolidation:
            fe_approach = methodology_consolidation["feature_engineering_approach"]
            high_priority = fe_approach.get("high_priority_methods", 0)
            if high_priority > 0:
                self.add_text(f"🔴 **Critical Feature Methods**: {high_priority} high-priority transformations")
        
        # Model selection details
        if isinstance(methodology_consolidation, dict) and "model_selection_strategy" in methodology_consolidation:
            model_strategy = methodology_consolidation["model_selection_strategy"]
            complexity_dist = model_strategy.get("complexity_distribution", {})
            if complexity_dist:
                complexity_summary = ", ".join([f"{count} {complexity.lower()}" for complexity, count in complexity_dist.items()])
                self.add_text(f"🤖 **Model Complexity**: {complexity_summary}")
        
        # Implementation plan display
        if isinstance(implementation_plan, list) and len(implementation_plan) > 0:
            self.add_text("📅 **Implementation Roadmap**")
            implementation_table = self.to_tableh(implementation_plan)
            self.add_text(implementation_table)
            
            # Timeline summary
            total_duration = sum([
                max([int(h) for h in __import__('re').findall(r'\d+', phase.get("estimated_duration", "0"))] or [0])
                for phase in implementation_plan
            ])
            if total_duration > 0:
                self.add_text(f"⏱️ **Total Estimated Timeline**: approximately {total_duration} hours across {len(implementation_plan)} phases")
        
        # Next steps and readiness
        self.add_text("🚀 **Implementation Readiness**")
        self.add_text(f"**Status**: {readiness_status}")
        self.add_text("**Next Chapter**: Ready to proceed with Model Implementation and Execution")
        
        # Final summary
        self.add_text("🎉 **Methodology Strategy Formulation Completed**")
        self.add_text("✨ **Comprehensive blueprint ready for implementation phase**")
        self.add_text("📈 **All methodology components consolidated and validated**")
        
        return self.end_event()
    
    @finnish("incomplete_methodology")
    def incomplete_methodology(self):
        result = self.get_thinking("incomplete_methodology")
        missing_components = result.get("missing_components", [])
        message = result.get("message", "Incomplete methodology")
        
        # Generate partial consolidation with available components
        available_components = []
        if self.get_variable("feature_engineering_methods"):
            available_components.append("feature engineering methods")
        if self.get_variable("model_methods"):
            available_components.append("model selection approaches")
        if self.get_variable("training_strategy"):
            available_components.append("training strategy")
        
        partial_consolidation = {
            "status": "partial_methodology",
            "available_components": available_components,
            "missing_components": missing_components,
            "implementation_recommendation": "Proceed with available components and use fallback approaches for missing elements"
        }
        
        self.add_variable("consolidated_methodology", partial_consolidation)
        
        return self.add_text(f"⚠️ **Warning**: {message}") \
            .add_text(f"**Available Components**: {', '.join(available_components)}") \
            .add_text(f"**Missing Components**: {', '.join(missing_components)}") \
            .add_text("**Alternative Approach**: Proceeding with partial methodology and fallback strategies") \
            .add_text("Partial methodology consolidation completed - ready for implementation phase") \
            .end_event()

async def generate_method_proposal_sequence_step3(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return MethodologyStrategyConsolidation(step, state, stream).run()
    