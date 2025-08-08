from typing import Dict, Any, Optional
from app.core.config import llm, ResultsEvaluationAgent
from app.models.BaseAction import BaseAction, event, thinking, after_exec, finnish

class WorkflowInitialization(BaseAction):
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, stream: bool = False):
        super().__init__(
            step, 
            state, 
            stream,
            chapter_id="chapter_7_results_evaluation_confirmation",
            section_id="section_1_workflow_initialization",
            name="Results Evaluation Workflow Initialization",
            ability="Initialize comprehensive results evaluation workflow with final assessment framework and validation strategy",
            require_variables=["problem_description", "stability_analysis_summary"]
        )
        
    @event("start")
    def start(self):
        return self.new_chapter(self.chapter_name) \
            .add_text("**Chapter Goal**: Conduct comprehensive final results evaluation and validation") \
            .add_text("Establishing final assessment framework incorporating insights from all previous stages") \
            .next_thinking_event(
                event_tag="initialize_evaluation_framework",
                textArray=[
                    "Results Evaluation Agent analyzing comprehensive results...", 
                    "Initializing final evaluation framework...", 
                    "Preparing validation strategies..."
                ],
                agentName="Results Evaluation Agent"
            ) \
            .end_event()
    
    @thinking("initialize_evaluation_framework")
    def initialize_evaluation_framework(self):
        try:
            # Get comprehensive context for results evaluation
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            stability_analysis_summary = self.get_variable("stability_analysis_summary", [])
            final_stability_report = self.get_variable("final_stability_report", "")
            model_training_results = self.get_variable("model_training_results", {})
            batch_evaluation_results = self.get_variable("batch_evaluation_results", {})
            
            # Initialize Results Evaluation Agent
            results_agent = ResultsEvaluationAgent(
                problem_description=problem_description,
                context_description=context_description,
                best_five_result=str(stability_analysis_summary),
                llm=llm
            )
            
            # Generate comprehensive results evaluation framework
            results_evaluation_framework = results_agent.generate_results_evaluation_framework_cli(
                stability_summary=stability_analysis_summary,
                report_template=final_stability_report
            )
            
            # Validate evaluation framework
            if not results_evaluation_framework or not isinstance(results_evaluation_framework, list):
                # Generate fallback framework
                fallback_framework = self._generate_fallback_evaluation_framework(
                    stability_analysis_summary, model_training_results
                )
                results_evaluation_framework = fallback_framework
            
            return self.conclusion("evaluation_framework_generated", {
                "results_evaluation_framework": results_evaluation_framework,
                "total_framework_components": len(results_evaluation_framework) if isinstance(results_evaluation_framework, list) else 0,
                "status": "success" if isinstance(results_evaluation_framework, list) and len(results_evaluation_framework) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic framework
            basic_framework = self._generate_basic_evaluation_framework(str(e))
            return self.conclusion("evaluation_framework_generated", {
                "results_evaluation_framework": basic_framework,
                "total_framework_components": len(basic_framework),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_evaluation_framework(self, stability_summary, training_results):
        """Generate fallback evaluation framework when agent fails"""
        framework = []
        
        # Model performance evaluation
        framework.append({
            "evaluation_component": "Final Model Performance Assessment",
            "description": "Comprehensive evaluation of final model performance across all metrics",
            "evaluation_methods": [
                "Cross-validation performance analysis",
                "Test dataset performance validation",
                "Model robustness assessment",
                "Performance metric comparison"
            ],
            "success_criteria": "Model meets or exceeds baseline performance requirements",
            "priority": "High"
        })
        
        # Stability validation review
        framework.append({
            "evaluation_component": "Stability Validation Review",
            "description": "Review and validate stability analysis results from previous chapter",
            "evaluation_methods": [
                "Stability score verification",
                "Preprocessing variation impact analysis",
                "Model robustness confirmation",
                "Stability recommendation validation"
            ],
            "success_criteria": "Stability analysis confirms model reliability",
            "priority": "High"
        })
        
        # Test dataset generation and validation
        framework.append({
            "evaluation_component": "Test Dataset Validation",
            "description": "Generate and validate comprehensive test datasets for final evaluation",
            "evaluation_methods": [
                "Independent test dataset creation",
                "Dataset variation generation",
                "Data quality validation",
                "Representative sampling verification"
            ],
            "success_criteria": "Test datasets are comprehensive and representative",
            "priority": "Medium"
        })
        
        # Final report generation
        framework.append({
            "evaluation_component": "Comprehensive DCLS Report Generation",
            "description": "Generate final comprehensive DCLS methodology report with recommendations",
            "evaluation_methods": [
                "End-to-end methodology review",
                "Results consolidation and analysis",
                "Actionable recommendations generation",
                "Final report compilation"
            ],
            "success_criteria": "Complete DCLS report with actionable insights",
            "priority": "High"
        })
        
        return framework
    
    def _generate_basic_evaluation_framework(self, error_msg):
        """Generate basic evaluation framework when processing fails"""
        return [{
            "evaluation_component": "Basic Results Evaluation",
            "description": f"Standard results evaluation approach (fallback due to error: {error_msg})",
            "evaluation_methods": [
                "Basic model performance review",
                "Standard validation procedures",
                "Basic report generation"
            ],
            "success_criteria": "Complete basic evaluation and reporting",
            "priority": "Essential"
        }]
    
    @finnish("evaluation_framework_generated")
    def evaluation_framework_generated(self):
        framework_result = self.get_thinking("evaluation_framework_generated")
        results_evaluation_framework = framework_result.get("results_evaluation_framework", [])
        total_components = framework_result.get("total_framework_components", 0)
        status = framework_result.get("status", "unknown")
        
        # Store evaluation framework
        self.add_variable("results_evaluation_framework", results_evaluation_framework)
        
        # Display evaluation framework
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Results Evaluation Framework Generated**")
        
        if isinstance(results_evaluation_framework, list) and len(results_evaluation_framework) > 0:
            # Display framework in organized format
            framework_table = self.to_tableh(results_evaluation_framework)
            self.add_text("**Comprehensive Results Evaluation Framework:**")
            self.add_text(framework_table)
            
            # Framework analysis
            high_priority = len([c for c in results_evaluation_framework if c.get("priority", "").lower() == "high"])
            evaluation_types = set(c.get("evaluation_component", "Unknown").split()[0] for c in results_evaluation_framework)
            
            self.add_text(f"🔍 **Framework Overview**: {total_components} evaluation components identified")
            if high_priority > 0:
                self.add_text(f"🔴 **High Priority**: {high_priority} critical evaluation methods")
            if evaluation_types:
                types_text = ", ".join(list(evaluation_types)[:3])
                self.add_text(f"📋 **Evaluation Types**: {types_text}{'...' if len(evaluation_types) > 3 else ''}")
        else:
            self.add_text("⚠️ No specific evaluation framework could be generated")
        
        # Continue to test dataset strategy generation
        return self.add_text("Proceeding with test dataset strategy generation...") \
            .next_thinking_event(
                event_tag="generate_test_strategy",
                textArray=["Results Evaluation Agent strategizing...", "generating test dataset approach..."],
                agentName="Results Evaluation Agent"
            ) \
            .end_event()
    
    @thinking("generate_test_strategy")
    def generate_test_strategy(self):
        try:
            # Get evaluation framework for test strategy
            results_evaluation_framework = self.get_variable("results_evaluation_framework", [])
            csv_file_path = self.get_full_csv_path()
            stability_analysis_summary = self.get_variable("stability_analysis_summary", [])
            
            # Initialize Results Evaluation Agent
            problem_description = self.get_variable("problem_description")
            context_description = self.get_variable("context_description", "")
            
            results_agent = ResultsEvaluationAgent(
                problem_description=problem_description,
                context_description=context_description,
                best_five_result=str(stability_analysis_summary),
                llm=llm
            )
            
            # Generate test dataset strategy
            test_dataset_strategy = results_agent.generate_test_dataset_strategy_cli(
                evaluation_framework=results_evaluation_framework
            )
            
            # Validate test strategy
            if not test_dataset_strategy or not isinstance(test_dataset_strategy, list):
                # Generate fallback strategy
                fallback_strategy = self._generate_fallback_test_strategy(
                    results_evaluation_framework
                )
                test_dataset_strategy = fallback_strategy
            
            return self.conclusion("test_strategy_generated", {
                "test_dataset_strategy": test_dataset_strategy,
                "total_strategy_components": len(test_dataset_strategy) if isinstance(test_dataset_strategy, list) else 0,
                "status": "success" if isinstance(test_dataset_strategy, list) and len(test_dataset_strategy) > 0 else "fallback"
            })
            
        except Exception as e:
            # Error fallback with basic strategy
            basic_strategy = self._generate_basic_test_strategy(str(e))
            return self.conclusion("test_strategy_generated", {
                "test_dataset_strategy": basic_strategy,
                "total_strategy_components": len(basic_strategy),
                "status": "error_fallback",
                "error": str(e)
            })
        finally:
            return self.end_event()
    
    def _generate_fallback_test_strategy(self, evaluation_framework):
        """Generate fallback test strategy when agent fails"""
        strategy = []
        
        # Test dataset creation strategy
        strategy.append({
            "strategy_component": "Independent Test Dataset Creation",
            "description": "Create independent test datasets for final model validation",
            "implementation_approach": [
                "Generate holdout test sets from original data",
                "Create synthetic test variations for robustness testing",
                "Implement stratified sampling for representative testing",
                "Validate test dataset quality and distribution"
            ],
            "expected_deliverables": "Multiple test datasets for comprehensive evaluation",
            "validation_criteria": "Test datasets are independent and representative"
        })
        
        # Performance validation strategy
        strategy.append({
            "strategy_component": "Final Performance Validation",
            "description": "Validate model performance on independent test datasets",
            "implementation_approach": [
                "Execute model predictions on all test datasets",
                "Calculate comprehensive performance metrics",
                "Compare results with cross-validation performance",
                "Assess performance consistency across test variations"
            ],
            "expected_deliverables": "Comprehensive performance validation results",
            "validation_criteria": "Performance meets or exceeds expected thresholds"
        })
        
        # Results consolidation strategy
        strategy.append({
            "strategy_component": "Results Consolidation and Reporting",
            "description": "Consolidate all evaluation results into final DCLS report",
            "implementation_approach": [
                "Aggregate results from all evaluation components",
                "Generate comprehensive analysis and insights",
                "Create actionable recommendations",
                "Compile final DCLS methodology report"
            ],
            "expected_deliverables": "Complete DCLS analysis report with recommendations",
            "validation_criteria": "Report provides comprehensive insights and actionable guidance"
        })
        
        return strategy
    
    def _generate_basic_test_strategy(self, error_msg):
        """Generate basic test strategy when processing fails"""
        return [{
            "strategy_component": "Basic Test Dataset Strategy",
            "description": f"Standard test dataset approach (fallback due to error: {error_msg})",
            "implementation_approach": [
                "Create basic holdout test set",
                "Perform standard model validation",
                "Generate basic evaluation report"
            ],
            "expected_deliverables": "Basic test dataset and validation results",
            "validation_criteria": "Complete basic validation and reporting"
        }]
    
    @finnish("test_strategy_generated")
    def test_strategy_generated(self):
        strategy_result = self.get_thinking("test_strategy_generated")
        test_dataset_strategy = strategy_result.get("test_dataset_strategy", [])
        total_components = strategy_result.get("total_strategy_components", 0)
        status = strategy_result.get("status", "unknown")
        
        # Store test strategy
        self.add_variable("test_dataset_strategy", test_dataset_strategy)
        
        # Display test strategy
        status_icons = {"success": "✅", "fallback": "⚠️", "error_fallback": "🔧"}
        status_icon = status_icons.get(status, "📊")
        
        self.add_text(f"{status_icon} **Test Dataset Strategy Generated**")
        
        if isinstance(test_dataset_strategy, list) and len(test_dataset_strategy) > 0:
            # Display strategy in organized format
            strategy_table = self.to_tableh(test_dataset_strategy)
            self.add_text("**Comprehensive Test Dataset Strategy:**")
            self.add_text(strategy_table)
            
            # Strategy analysis
            strategy_components = set(s.get("strategy_component", "Unknown").split()[0] for s in test_dataset_strategy)
            self.add_text(f"🎯 **Strategy Overview**: {total_components} strategic components identified")
            if strategy_components:
                components_text = ", ".join(list(strategy_components)[:3])
                self.add_text(f"🔧 **Strategy Components**: {components_text}{'...' if len(strategy_components) > 3 else ''}")
        else:
            self.add_text("⚠️ No specific test dataset strategy could be generated")
        
        # Complete initialization
        return self.add_text("✅ **Results Evaluation Workflow Initialized Successfully**") \
            .add_text("🎯 **Initialization Summary:**") \
            .add_text("- Comprehensive evaluation framework established with multiple assessment components") \
            .add_text("- Test dataset strategy developed for independent validation procedures") \
            .add_text("- Results consolidation approach defined for final DCLS report generation") \
            .add_text("📊 **Next Phase**: Ready for test dataset generation and validation") \
            .end_event()

async def results_evaluation_step0(
    step: Dict[str, Any], 
    state: Optional[Dict[str, Any]] = None,
    stream: bool = False
) -> Dict[str, Any]:
    state = state or {}
    return WorkflowInitialization(step, state, stream).run()