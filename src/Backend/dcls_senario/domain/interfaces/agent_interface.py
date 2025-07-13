from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum


class AgentStatus(Enum):
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentResult:
    success: bool
    data: Any
    message: str
    execution_time: float
    tokens_used: int
    cost: float
    metadata: Dict[str, Any]


@dataclass
class AgentConfig:
    max_retries: int = 3
    timeout: int = 300
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    custom_settings: Dict[str, Any] = None


class IAgent(ABC):
    """Base interface for all agents"""
    
    @abstractmethod
    def get_name(self) -> str:
        """Get agent name"""
        pass
    
    @abstractmethod
    def get_status(self) -> AgentStatus:
        """Get current agent status"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """Get list of agent capabilities"""
        pass
    
    @abstractmethod
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data"""
        pass
    
    @abstractmethod
    def execute(self, input_data: Any, **kwargs) -> AgentResult:
        """Execute agent task"""
        pass
    
    @abstractmethod
    def get_configuration(self) -> AgentConfig:
        """Get agent configuration"""
        pass
    
    @abstractmethod
    def update_configuration(self, config: AgentConfig) -> None:
        """Update agent configuration"""
        pass


class IDataProcessingAgent(IAgent):
    """Interface for data processing agents"""
    
    @abstractmethod
    def analyze_dataset(self, dataset_path: str) -> AgentResult:
        """Analyze dataset structure and quality"""
        pass
    
    @abstractmethod
    def generate_data_summary(self, dataset_path: str) -> AgentResult:
        """Generate comprehensive data summary"""
        pass


class IDataCleaningAgent(IDataProcessingAgent):
    """Interface for data cleaning agents"""
    
    @abstractmethod
    def identify_issues(self, dataset_path: str) -> AgentResult:
        """Identify data quality issues"""
        pass
    
    @abstractmethod
    def generate_cleaning_plan(self, dataset_path: str, issues: List[str]) -> AgentResult:
        """Generate data cleaning plan"""
        pass
    
    @abstractmethod
    def execute_cleaning(self, dataset_path: str, cleaning_plan: Dict[str, Any]) -> AgentResult:
        """Execute data cleaning operations"""
        pass
    
    @abstractmethod
    def validate_cleaned_data(self, original_path: str, cleaned_path: str) -> AgentResult:
        """Validate cleaned data quality"""
        pass


class IAnalysisAgent(IDataProcessingAgent):
    """Interface for data analysis agents"""
    
    @abstractmethod
    def perform_eda(self, dataset_path: str) -> AgentResult:
        """Perform exploratory data analysis"""
        pass
    
    @abstractmethod
    def generate_insights(self, dataset_path: str, analysis_results: Dict[str, Any]) -> AgentResult:
        """Generate insights from analysis"""
        pass
    
    @abstractmethod
    def create_visualizations(self, dataset_path: str, viz_config: Dict[str, Any]) -> AgentResult:
        """Create data visualizations"""
        pass


class IPredictionAgent(IAgent):
    """Interface for prediction/modeling agents"""
    
    @abstractmethod
    def suggest_models(self, dataset_path: str, problem_type: str) -> AgentResult:
        """Suggest appropriate models for the problem"""
        pass
    
    @abstractmethod
    def train_models(self, dataset_path: str, model_configs: List[Dict[str, Any]]) -> AgentResult:
        """Train multiple models"""
        pass
    
    @abstractmethod
    def evaluate_models(self, models: List[Any], test_data_path: str) -> AgentResult:
        """Evaluate trained models"""
        pass
    
    @abstractmethod
    def generate_predictions(self, model: Any, data_path: str) -> AgentResult:
        """Generate predictions using trained model"""
        pass


class IProblemDefinitionAgent(IAgent):
    """Interface for problem definition agents"""
    
    @abstractmethod
    def analyze_problem_statement(self, problem_description: str, context: str) -> AgentResult:
        """Analyze and structure problem statement"""
        pass
    
    @abstractmethod
    def identify_variables(self, dataset_path: str, problem_context: str) -> AgentResult:
        """Identify and categorize variables"""
        pass
    
    @abstractmethod
    def suggest_hypotheses(self, problem_context: str, variables: Dict[str, Any]) -> AgentResult:
        """Suggest testable hypotheses"""
        pass


class IResultsCommunicationAgent(IAgent):
    """Interface for results communication agents"""
    
    @abstractmethod
    def generate_report(self, results: Dict[str, Any], template: str) -> AgentResult:
        """Generate comprehensive report"""
        pass
    
    @abstractmethod
    def create_summary(self, results: Dict[str, Any], audience: str) -> AgentResult:
        """Create audience-specific summary"""
        pass
    
    @abstractmethod
    def generate_recommendations(self, analysis_results: Dict[str, Any]) -> AgentResult:
        """Generate actionable recommendations"""
        pass


class IDataStructureAgent(IDataProcessingAgent):
    """Interface for data structure exploration agents"""
    
    @abstractmethod
    def perform_dimensionality_reduction(self, dataset_path: str, method: str) -> AgentResult:
        """Perform dimensionality reduction analysis"""
        pass
    
    @abstractmethod
    def perform_clustering(self, dataset_path: str, algorithm: str) -> AgentResult:
        """Perform clustering analysis"""
        pass
    
    @abstractmethod
    def explore_data_structure(self, dataset_path: str) -> AgentResult:
        """Explore overall data structure"""
        pass


class IPCSAgent(IAgent):
    """Interface for PCS (Predictability, Causality, Stability) evaluation agents"""
    
    @abstractmethod
    def analyze_pcs_evaluation_result(self, conclusion: str, result: Any) -> AgentResult:
        """Analyze PCS evaluation results"""
        pass
    
    @abstractmethod
    def evaluate_problem_definition_cli(self, problem_description: str, context_description: str, 
                                      var_json: str, unit_check: str, relevant_variables_analysis: str) -> AgentResult:
        """Evaluate problem definition using PCS principles"""
        pass
    
    @abstractmethod
    def execute_stability_analysis(self, csv_file_path: str, cleaning_code: str) -> AgentResult:
        """Execute stability analysis for data cleaning"""
        pass
    
    @abstractmethod
    def generate_stability_analysis_code(self, csv_file_path: str, cleaning_code: str) -> AgentResult:
        """Generate code for stability analysis"""
        pass


class IResultsEvaluationAgent(IAgent):
    """Interface for results evaluation agents"""
    
    @abstractmethod
    def generate_test_datasets_code(self, multiple_datasets_code_path: str, original_dataset_path: str) -> AgentResult:
        """Generate code for creating test datasets"""
        pass
    
    @abstractmethod
    def generate_and_execute_test_datasets(self, multiple_datasets_code_path: str, original_dataset_path: str, 
                                         data_dir: str, max_attempts: int = 3) -> AgentResult:
        """Generate and execute test datasets creation"""
        pass
    
    @abstractmethod
    def generate_model_evaluation_code(self, model_training_code_path: str, train_dataset_path: str, 
                                     eval_dataset_path: str) -> AgentResult:
        """Generate model evaluation code"""
        pass
    
    @abstractmethod
    def generate_and_execute_model_evaluation(self, model_training_code_path: str, train_dataset_path: str, 
                                            eval_dataset_path: str, max_attempts: int = 5) -> AgentResult:
        """Generate and execute model evaluation"""
        pass


class IGeneralAgent(IAgent):
    """Interface for general-purpose agents"""
    
    @abstractmethod
    def process_general_request(self, request: str, context: Dict[str, Any]) -> AgentResult:
        """Process general data science requests"""
        pass


class IAgentFactory(ABC):
    """Abstract factory for creating agents"""
    
    @abstractmethod
    def create_data_cleaning_agent(self, config: AgentConfig) -> IDataCleaningAgent:
        """Create data cleaning agent"""
        pass
    
    @abstractmethod
    def create_analysis_agent(self, config: AgentConfig) -> IAnalysisAgent:
        """Create analysis agent"""
        pass
    
    @abstractmethod
    def create_prediction_agent(self, config: AgentConfig) -> IPredictionAgent:
        """Create prediction agent"""
        pass
    
    @abstractmethod
    def create_problem_definition_agent(self, config: AgentConfig) -> IProblemDefinitionAgent:
        """Create problem definition agent"""
        pass
    
    @abstractmethod
    def create_results_communication_agent(self, config: AgentConfig) -> IResultsCommunicationAgent:
        """Create results communication agent"""
        pass
    
    @abstractmethod
    def create_data_structure_agent(self, config: AgentConfig) -> IDataStructureAgent:
        """Create data structure exploration agent"""
        pass
    
    @abstractmethod
    def create_pcs_agent(self, config: AgentConfig) -> IPCSAgent:
        """Create PCS evaluation agent"""
        pass
    
    @abstractmethod
    def create_results_evaluation_agent(self, config: AgentConfig) -> IResultsEvaluationAgent:
        """Create results evaluation agent"""
        pass
    
    @abstractmethod
    def create_general_agent(self, config: AgentConfig) -> IGeneralAgent:
        """Create general-purpose agent"""
        pass
    
    @abstractmethod
    def get_available_agent_types(self) -> List[str]:
        """Get list of available agent types"""
        pass