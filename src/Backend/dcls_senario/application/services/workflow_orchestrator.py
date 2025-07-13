from typing import Dict, Any, List, Optional
import logging
from datetime import datetime

from domain.interfaces import (
    IDataCleaningAgent, IAnalysisAgent, IPredictionAgent,
    IProblemDefinitionAgent, IResultsCommunicationAgent,
    IExperimentRepository, IDatasetRepository, AgentResult
)
from domain.models import Experiment, ExperimentStatus, ExperimentStep
from shared.exceptions import WorkflowException, AgentExecutionException


class WorkflowOrchestrator:
    """Orchestrates the complete data science workflow"""
    
    def __init__(
        self,
        problem_definition_agent: IProblemDefinitionAgent,
        data_cleaning_agent: IDataCleaningAgent,
        analysis_agent: IAnalysisAgent,
        prediction_agent: IPredictionAgent,
        results_communication_agent: IResultsCommunicationAgent,
        experiment_repository: IExperimentRepository,
        dataset_repository: IDatasetRepository,
        logger: Optional[logging.Logger] = None
    ):
        self._problem_definition_agent = problem_definition_agent
        self._data_cleaning_agent = data_cleaning_agent
        self._analysis_agent = analysis_agent
        self._prediction_agent = prediction_agent
        self._results_communication_agent = results_communication_agent
        self._experiment_repository = experiment_repository
        self._dataset_repository = dataset_repository
        self._logger = logger or logging.getLogger(__name__)
        
        # Define workflow steps
        self._workflow_steps = [
            "problem_definition",
            "data_analysis", 
            "data_cleaning",
            "exploratory_analysis",
            "feature_engineering",
            "model_training",
            "model_evaluation",
            "results_communication"
        ]
    
    def execute_complete_workflow(
        self,
        experiment_id: str,
        dataset_path: str,
        problem_description: str,
        context_description: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute the complete data science workflow"""
        try:
            # Load or create experiment
            experiment = self._get_or_create_experiment(
                experiment_id, dataset_path, problem_description, context_description
            )
            
            # Initialize workflow steps
            self._initialize_workflow_steps(experiment)
            
            # Start experiment
            experiment.start_experiment()
            self._experiment_repository.update_experiment_status(experiment_id, "running")
            
            self._logger.info(f"Starting workflow execution for experiment {experiment_id}")
            
            # Execute each step
            workflow_results = {}
            
            # Step 1: Problem Definition and Data Collection
            problem_result = self._execute_problem_definition_step(
                experiment, dataset_path, problem_description, context_description
            )
            workflow_results["problem_definition"] = problem_result
            
            # Step 2: Data Analysis
            data_analysis_result = self._execute_data_analysis_step(
                experiment, dataset_path
            )
            workflow_results["data_analysis"] = data_analysis_result
            
            # Step 3: Data Cleaning
            cleaning_result = self._execute_data_cleaning_step(
                experiment, dataset_path, problem_result
            )
            workflow_results["data_cleaning"] = cleaning_result
            cleaned_dataset_path = cleaning_result.data.get("cleaned_dataset_path", dataset_path)
            
            # Step 4: Exploratory Analysis
            eda_result = self._execute_exploratory_analysis_step(
                experiment, cleaned_dataset_path
            )
            workflow_results["exploratory_analysis"] = eda_result
            
            # Step 5: Feature Engineering (if applicable)
            feature_result = self._execute_feature_engineering_step(
                experiment, cleaned_dataset_path, eda_result
            )
            workflow_results["feature_engineering"] = feature_result
            
            # Step 6: Model Training
            training_result = self._execute_model_training_step(
                experiment, cleaned_dataset_path, feature_result
            )
            workflow_results["model_training"] = training_result
            
            # Step 7: Model Evaluation
            evaluation_result = self._execute_model_evaluation_step(
                experiment, training_result
            )
            workflow_results["model_evaluation"] = evaluation_result
            
            # Step 8: Results Communication
            communication_result = self._execute_results_communication_step(
                experiment, workflow_results
            )
            workflow_results["results_communication"] = communication_result
            
            # Complete experiment
            experiment.complete_experiment()
            self._experiment_repository.update_experiment_status(experiment_id, "completed")
            
            self._logger.info(f"Workflow execution completed for experiment {experiment_id}")
            
            return {
                "experiment_id": experiment_id,
                "status": "completed",
                "results": workflow_results,
                "execution_time": experiment.duration,
                "summary": communication_result.data
            }
            
        except Exception as e:
            self._logger.error(f"Workflow execution failed for experiment {experiment_id}: {str(e)}")
            
            # Mark experiment as failed
            if 'experiment' in locals():
                experiment.fail_experiment(str(e))
                self._experiment_repository.update_experiment_status(experiment_id, "failed")
            
            raise WorkflowException(f"Workflow execution failed: {str(e)}") from e
    
    def _get_or_create_experiment(
        self,
        experiment_id: str,
        dataset_path: str,
        problem_description: str,
        context_description: str
    ) -> Experiment:
        """Get existing experiment or create new one"""
        experiment_data = self._experiment_repository.load_experiment(experiment_id)
        
        if experiment_data:
            # Load existing experiment
            experiment = Experiment.from_dict(experiment_data)
        else:
            # Create new experiment
            from domain.models.experiment import ExperimentConfiguration, ExperimentType
            
            config = ExperimentConfiguration(
                problem_type=ExperimentType.EXPLORATORY,  # Will be determined in problem definition
                test_size=0.2,
                random_state=42
            )
            
            experiment = Experiment(
                id=experiment_id,
                name=f"Experiment_{experiment_id}",
                description=problem_description,
                created_at=datetime.now(),
                created_by="system",
                dataset_id=dataset_path,
                configuration=config
            )
            
            # Save experiment
            self._experiment_repository.save_experiment(experiment_id, experiment.to_dict())
        
        return experiment
    
    def _initialize_workflow_steps(self, experiment: Experiment) -> None:
        """Initialize workflow steps in experiment"""
        for step_name in self._workflow_steps:
            step = ExperimentStep(
                step_name=step_name,
                status="pending"
            )
            experiment.add_step(step)
    
    def _execute_problem_definition_step(
        self,
        experiment: Experiment,
        dataset_path: str,
        problem_description: str,
        context_description: str
    ) -> AgentResult:
        """Execute problem definition and data collection step"""
        experiment.start_step("problem_definition")
        
        try:
            # Analyze problem statement
            problem_result = self._problem_definition_agent.analyze_problem_statement(
                problem_description, context_description
            )
            
            if not problem_result.success:
                raise AgentExecutionException("Problem definition analysis failed")
            
            # Identify variables
            variables_result = self._problem_definition_agent.identify_variables(
                dataset_path, context_description
            )
            
            # Suggest hypotheses
            hypotheses_result = self._problem_definition_agent.suggest_hypotheses(
                context_description, variables_result.data if variables_result.success else {}
            )
            
            # Combine results
            combined_result = AgentResult(
                success=True,
                data={
                    "problem_analysis": problem_result.data,
                    "variables": variables_result.data if variables_result.success else {},
                    "hypotheses": hypotheses_result.data if hypotheses_result.success else {}
                },
                message="Problem definition completed successfully",
                execution_time=problem_result.execution_time,
                tokens_used=problem_result.tokens_used,
                cost=problem_result.cost,
                metadata={"step": "problem_definition"}
            )
            
            experiment.complete_step("problem_definition", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("problem_definition", str(e))
            raise
    
    def _execute_data_analysis_step(
        self,
        experiment: Experiment,
        dataset_path: str
    ) -> AgentResult:
        """Execute initial data analysis step"""
        experiment.start_step("data_analysis")
        
        try:
            # Analyze dataset structure
            analysis_result = self._data_cleaning_agent.analyze_dataset(dataset_path)
            
            if not analysis_result.success:
                raise AgentExecutionException("Data analysis failed")
            
            # Generate data summary
            summary_result = self._data_cleaning_agent.generate_data_summary(dataset_path)
            
            combined_result = AgentResult(
                success=True,
                data={
                    "analysis": analysis_result.data,
                    "summary": summary_result.data if summary_result.success else {}
                },
                message="Data analysis completed successfully",
                execution_time=analysis_result.execution_time,
                tokens_used=analysis_result.tokens_used,
                cost=analysis_result.cost,
                metadata={"step": "data_analysis"}
            )
            
            experiment.complete_step("data_analysis", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("data_analysis", str(e))
            raise
    
    def _execute_data_cleaning_step(
        self,
        experiment: Experiment,
        dataset_path: str,
        problem_result: AgentResult
    ) -> AgentResult:
        """Execute data cleaning step"""
        experiment.start_step("data_cleaning")
        
        try:
            # Identify data quality issues
            issues_result = self._data_cleaning_agent.identify_issues(dataset_path)
            
            if not issues_result.success:
                raise AgentExecutionException("Issue identification failed")
            
            # Generate cleaning plan
            plan_result = self._data_cleaning_agent.generate_cleaning_plan(
                dataset_path, issues_result.data["issues"]
            )
            
            if not plan_result.success:
                raise AgentExecutionException("Cleaning plan generation failed")
            
            # Execute cleaning
            cleaning_result = self._data_cleaning_agent.execute_cleaning(
                dataset_path, plan_result.data
            )
            
            if not cleaning_result.success:
                raise AgentExecutionException("Data cleaning execution failed")
            
            # Validate cleaned data
            validation_result = self._data_cleaning_agent.validate_cleaned_data(
                dataset_path, cleaning_result.data["cleaned_dataset_path"]
            )
            
            combined_result = AgentResult(
                success=True,
                data={
                    "issues": issues_result.data,
                    "cleaning_plan": plan_result.data,
                    "cleaning_execution": cleaning_result.data,
                    "validation": validation_result.data if validation_result.success else {},
                    "cleaned_dataset_path": cleaning_result.data["cleaned_dataset_path"]
                },
                message="Data cleaning completed successfully",
                execution_time=cleaning_result.execution_time,
                tokens_used=cleaning_result.tokens_used,
                cost=cleaning_result.cost,
                metadata={"step": "data_cleaning"}
            )
            
            experiment.complete_step("data_cleaning", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("data_cleaning", str(e))
            raise
    
    def _execute_exploratory_analysis_step(
        self,
        experiment: Experiment,
        dataset_path: str
    ) -> AgentResult:
        """Execute exploratory data analysis step"""
        experiment.start_step("exploratory_analysis")
        
        try:
            # Perform EDA
            eda_result = self._analysis_agent.perform_eda(dataset_path)
            
            if not eda_result.success:
                raise AgentExecutionException("EDA execution failed")
            
            # Generate insights
            insights_result = self._analysis_agent.generate_insights(
                dataset_path, eda_result.data
            )
            
            # Create visualizations
            viz_result = self._analysis_agent.create_visualizations(
                dataset_path, {"type": "comprehensive"}
            )
            
            combined_result = AgentResult(
                success=True,
                data={
                    "eda": eda_result.data,
                    "insights": insights_result.data if insights_result.success else {},
                    "visualizations": viz_result.data if viz_result.success else {}
                },
                message="Exploratory analysis completed successfully",
                execution_time=eda_result.execution_time,
                tokens_used=eda_result.tokens_used,
                cost=eda_result.cost,
                metadata={"step": "exploratory_analysis"}
            )
            
            experiment.complete_step("exploratory_analysis", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("exploratory_analysis", str(e))
            raise
    
    def _execute_feature_engineering_step(
        self,
        experiment: Experiment,
        dataset_path: str,
        eda_result: AgentResult
    ) -> AgentResult:
        """Execute feature engineering step"""
        experiment.start_step("feature_engineering")
        
        try:
            # For now, return a placeholder result
            # TODO: Implement feature engineering agent
            result = AgentResult(
                success=True,
                data={"features_engineered": False, "original_features": True},
                message="Feature engineering step completed (placeholder)",
                execution_time=0,
                tokens_used=0,
                cost=0,
                metadata={"step": "feature_engineering", "status": "placeholder"}
            )
            
            experiment.complete_step("feature_engineering", result.data)
            return result
            
        except Exception as e:
            experiment.fail_step("feature_engineering", str(e))
            raise
    
    def _execute_model_training_step(
        self,
        experiment: Experiment,
        dataset_path: str,
        feature_result: AgentResult
    ) -> AgentResult:
        """Execute model training step"""
        experiment.start_step("model_training")
        
        try:
            # Suggest models
            models_result = self._prediction_agent.suggest_models(dataset_path, "classification")
            
            if not models_result.success:
                raise AgentExecutionException("Model suggestion failed")
            
            # Train models
            training_result = self._prediction_agent.train_models(
                dataset_path, models_result.data.get("models", [])
            )
            
            if not training_result.success:
                raise AgentExecutionException("Model training failed")
            
            combined_result = AgentResult(
                success=True,
                data={
                    "suggested_models": models_result.data,
                    "training_results": training_result.data
                },
                message="Model training completed successfully",
                execution_time=training_result.execution_time,
                tokens_used=training_result.tokens_used,
                cost=training_result.cost,
                metadata={"step": "model_training"}
            )
            
            experiment.complete_step("model_training", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("model_training", str(e))
            raise
    
    def _execute_model_evaluation_step(
        self,
        experiment: Experiment,
        training_result: AgentResult
    ) -> AgentResult:
        """Execute model evaluation step"""
        experiment.start_step("model_evaluation")
        
        try:
            # Evaluate models
            models = training_result.data.get("training_results", {}).get("models", [])
            
            evaluation_result = self._prediction_agent.evaluate_models(
                models, training_result.data.get("test_data_path", "")
            )
            
            if not evaluation_result.success:
                raise AgentExecutionException("Model evaluation failed")
            
            experiment.complete_step("model_evaluation", evaluation_result.data)
            return evaluation_result
            
        except Exception as e:
            experiment.fail_step("model_evaluation", str(e))
            raise
    
    def _execute_results_communication_step(
        self,
        experiment: Experiment,
        workflow_results: Dict[str, Any]
    ) -> AgentResult:
        """Execute results communication step"""
        experiment.start_step("results_communication")
        
        try:
            # Generate report
            report_result = self._results_communication_agent.generate_report(
                workflow_results, "comprehensive"
            )
            
            if not report_result.success:
                raise AgentExecutionException("Report generation failed")
            
            # Create summary
            summary_result = self._results_communication_agent.create_summary(
                workflow_results, "technical"
            )
            
            # Generate recommendations
            recommendations_result = self._results_communication_agent.generate_recommendations(
                workflow_results
            )
            
            combined_result = AgentResult(
                success=True,
                data={
                    "report": report_result.data,
                    "summary": summary_result.data if summary_result.success else {},
                    "recommendations": recommendations_result.data if recommendations_result.success else {}
                },
                message="Results communication completed successfully",
                execution_time=report_result.execution_time,
                tokens_used=report_result.tokens_used,
                cost=report_result.cost,
                metadata={"step": "results_communication"}
            )
            
            experiment.complete_step("results_communication", combined_result.data)
            return combined_result
            
        except Exception as e:
            experiment.fail_step("results_communication", str(e))
            raise
    
    def get_experiment_status(self, experiment_id: str) -> Dict[str, Any]:
        """Get current experiment status"""
        experiment_data = self._experiment_repository.load_experiment(experiment_id)
        
        if not experiment_data:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = Experiment.from_dict(experiment_data)
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.status.value,
            "progress": experiment.get_progress_percentage(),
            "current_step": experiment.current_step,
            "completed_steps": experiment.completed_steps,
            "total_steps": experiment.total_steps,
            "duration": experiment.duration,
            "error_message": experiment.error_message
        }
    
    def cancel_experiment(self, experiment_id: str) -> None:
        """Cancel running experiment"""
        experiment_data = self._experiment_repository.load_experiment(experiment_id)
        
        if not experiment_data:
            raise ValueError(f"Experiment {experiment_id} not found")
        
        experiment = Experiment.from_dict(experiment_data)
        experiment.cancel_experiment()
        
        self._experiment_repository.update_experiment_status(experiment_id, "cancelled")
        self._logger.info(f"Experiment {experiment_id} cancelled")