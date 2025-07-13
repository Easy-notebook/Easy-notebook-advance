from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum


class ExperimentStatus(Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ExperimentType(Enum):
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    CLUSTERING = "clustering"
    ANOMALY_DETECTION = "anomaly_detection"
    EXPLORATORY = "exploratory"


@dataclass
class ExperimentStep:
    step_name: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelConfiguration:
    model_type: str
    hyperparameters: Dict[str, Any]
    feature_selection: Optional[Dict[str, Any]] = None
    preprocessing: Optional[Dict[str, Any]] = None
    validation_strategy: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentConfiguration:
    problem_type: ExperimentType
    target_variable: Optional[str] = None
    feature_variables: List[str] = field(default_factory=list)
    test_size: float = 0.2
    random_state: int = 42
    cross_validation_folds: int = 5
    models_to_try: List[ModelConfiguration] = field(default_factory=list)
    evaluation_metrics: List[str] = field(default_factory=list)
    custom_settings: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ModelResult:
    model_name: str
    model_type: str
    training_score: float
    validation_score: float
    test_score: Optional[float] = None
    metrics: Dict[str, float] = field(default_factory=dict)
    hyperparameters: Dict[str, Any] = field(default_factory=dict)
    feature_importance: Optional[Dict[str, float]] = None
    training_time: float = 0.0
    prediction_time: float = 0.0
    model_size: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExperimentResults:
    best_model: Optional[ModelResult] = None
    all_models: List[ModelResult] = field(default_factory=list)
    data_analysis: Dict[str, Any] = field(default_factory=dict)
    feature_analysis: Dict[str, Any] = field(default_factory=dict)
    visualizations: List[str] = field(default_factory=list)
    insights: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    execution_summary: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Experiment:
    id: str
    name: str
    description: str
    created_at: datetime
    created_by: str
    
    # Configuration
    dataset_id: str
    configuration: ExperimentConfiguration
    
    # Execution tracking
    status: ExperimentStatus = ExperimentStatus.CREATED
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None
    
    # Progress tracking
    current_step: Optional[str] = None
    total_steps: int = 0
    completed_steps: int = 0
    steps: List[ExperimentStep] = field(default_factory=list)
    
    # Results
    results: Optional[ExperimentResults] = None
    
    # Metadata
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    
    def start_experiment(self) -> None:
        """Start the experiment"""
        self.status = ExperimentStatus.RUNNING
        self.started_at = datetime.now()
        self.current_step = "initialization"
    
    def complete_experiment(self) -> None:
        """Mark experiment as completed"""
        self.status = ExperimentStatus.COMPLETED
        self.completed_at = datetime.now()
        if self.started_at:
            self.duration = (self.completed_at - self.started_at).total_seconds()
    
    def fail_experiment(self, error_message: str) -> None:
        """Mark experiment as failed"""
        self.status = ExperimentStatus.FAILED
        self.completed_at = datetime.now()
        self.error_message = error_message
        if self.started_at:
            self.duration = (self.completed_at - self.started_at).total_seconds()
    
    def cancel_experiment(self) -> None:
        """Cancel the experiment"""
        self.status = ExperimentStatus.CANCELLED
        self.completed_at = datetime.now()
        if self.started_at:
            self.duration = (self.completed_at - self.started_at).total_seconds()
    
    def add_step(self, step: ExperimentStep) -> None:
        """Add a step to the experiment"""
        self.steps.append(step)
        self.total_steps = len(self.steps)
    
    def start_step(self, step_name: str) -> None:
        """Start a specific step"""
        self.current_step = step_name
        
        # Find and update the step
        for step in self.steps:
            if step.step_name == step_name:
                step.status = "running"
                step.started_at = datetime.now()
                break
        else:
            # Create new step if not found
            new_step = ExperimentStep(
                step_name=step_name,
                status="running",
                started_at=datetime.now()
            )
            self.add_step(new_step)
    
    def complete_step(self, step_name: str, result: Optional[Dict[str, Any]] = None) -> None:
        """Complete a specific step"""
        for step in self.steps:
            if step.step_name == step_name:
                step.status = "completed"
                step.completed_at = datetime.now()
                step.result = result
                if step.started_at:
                    step.duration = (step.completed_at - step.started_at).total_seconds()
                break
        
        # Update completed steps count
        self.completed_steps = len([s for s in self.steps if s.status == "completed"])
    
    def fail_step(self, step_name: str, error_message: str) -> None:
        """Mark a step as failed"""
        for step in self.steps:
            if step.step_name == step_name:
                step.status = "failed"
                step.completed_at = datetime.now()
                step.error_message = error_message
                if step.started_at:
                    step.duration = (step.completed_at - step.started_at).total_seconds()
                break
        
        # Fail the entire experiment
        self.fail_experiment(f"Step '{step_name}' failed: {error_message}")
    
    def get_progress_percentage(self) -> float:
        """Get experiment progress as percentage"""
        if self.total_steps == 0:
            return 0.0
        return (self.completed_steps / self.total_steps) * 100
    
    def get_step_by_name(self, step_name: str) -> Optional[ExperimentStep]:
        """Get step by name"""
        for step in self.steps:
            if step.step_name == step_name:
                return step
        return None
    
    def get_completed_steps(self) -> List[ExperimentStep]:
        """Get all completed steps"""
        return [step for step in self.steps if step.status == "completed"]
    
    def get_failed_steps(self) -> List[ExperimentStep]:
        """Get all failed steps"""
        return [step for step in self.steps if step.status == "failed"]
    
    def is_completed(self) -> bool:
        """Check if experiment is completed"""
        return self.status == ExperimentStatus.COMPLETED
    
    def is_running(self) -> bool:
        """Check if experiment is running"""
        return self.status == ExperimentStatus.RUNNING
    
    def has_failed(self) -> bool:
        """Check if experiment has failed"""
        return self.status == ExperimentStatus.FAILED
    
    def add_result(self, model_result: ModelResult) -> None:
        """Add a model result to the experiment"""
        if not self.results:
            self.results = ExperimentResults()
        
        self.results.all_models.append(model_result)
        
        # Update best model if this one is better
        if (not self.results.best_model or 
            model_result.validation_score > self.results.best_model.validation_score):
            self.results.best_model = model_result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert experiment to dictionary"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat(),
            "created_by": self.created_by,
            "dataset_id": self.dataset_id,
            "configuration": {
                "problem_type": self.configuration.problem_type.value,
                "target_variable": self.configuration.target_variable,
                "feature_variables": self.configuration.feature_variables,
                "test_size": self.configuration.test_size,
                "random_state": self.configuration.random_state,
                "cross_validation_folds": self.configuration.cross_validation_folds,
                "models_to_try": [model.__dict__ for model in self.configuration.models_to_try],
                "evaluation_metrics": self.configuration.evaluation_metrics,
                "custom_settings": self.configuration.custom_settings
            },
            "status": self.status.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration": self.duration,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "completed_steps": self.completed_steps,
            "steps": [step.__dict__ for step in self.steps],
            "results": self.results.__dict__ if self.results else None,
            "tags": self.tags,
            "metadata": self.metadata,
            "error_message": self.error_message
        }