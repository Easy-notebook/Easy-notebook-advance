from typing import Dict, Any, Type
from domain.interfaces import (
    IAgentFactory, IDataCleaningAgent, IAnalysisAgent, IPredictionAgent,
    IProblemDefinitionAgent, IResultsCommunicationAgent, ILLMProvider,
    AgentConfig, IDataStructureAgent, IGeneralAgent, IPCSAgent, IResultsEvaluationAgent
)
from infrastructure.agents.specialized import (
    DataCleaningAgent, ProblemDefinitionAgent, PredictionInferenceAgent,
    DataStructureAgent, GeneralAgent, PCSAgent, ResultsCommunicationAgent,
    ResultsEvaluationAgent
)


class AgentFactory(IAgentFactory):
    """Factory for creating agent instances"""
    
    def __init__(self, llm_provider: ILLMProvider):
        self._llm_provider = llm_provider
        self._agent_types = {
            'data_cleaning': DataCleaningAgent,
            'problem_definition': ProblemDefinitionAgent,
            'prediction': PredictionInferenceAgent,
            'data_structure': DataStructureAgent,
            'general': GeneralAgent,
            'pcs': PCSAgent,
            'results_communication': ResultsCommunicationAgent,
            'results_evaluation': ResultsEvaluationAgent,
        }
    
    def create_data_cleaning_agent(self, config: AgentConfig, **kwargs) -> IDataCleaningAgent:
        """Create data cleaning agent"""
        problem_description = kwargs.get('problem_description', '')
        context_description = kwargs.get('context_description', '')
        
        return DataCleaningAgent(
            llm_provider=self._llm_provider,
            config=config,
            problem_description=problem_description,
            context_description=context_description
        )
    
    def create_analysis_agent(self, config: AgentConfig, **kwargs) -> IAnalysisAgent:
        """Create analysis agent"""
        # TODO: Implement when AnalysisAgent is created
        raise NotImplementedError("AnalysisAgent not yet implemented")
    
    def create_prediction_agent(self, config: AgentConfig, **kwargs) -> IPredictionAgent:
        """Create prediction agent"""
        problem_description = kwargs.get('problem_description', '')
        context_description = kwargs.get('context_description', '')
        eda_summary = kwargs.get('eda_summary', '')
        
        return PredictionInferenceAgent(
            llm_provider=self._llm_provider,
            config=config,
            problem_description=problem_description,
            context_description=context_description,
            eda_summary=eda_summary
        )
    
    def create_problem_definition_agent(self, config: AgentConfig, **kwargs) -> IProblemDefinitionAgent:
        """Create problem definition agent"""
        problem_description = kwargs.get('problem_description', '')
        context_description = kwargs.get('context_description', '')
        
        return ProblemDefinitionAgent(
            llm_provider=self._llm_provider,
            config=config,
            problem_description=problem_description,
            context_description=context_description
        )
    
    def create_results_communication_agent(self, config: AgentConfig, **kwargs) -> IResultsCommunicationAgent:
        """Create results communication agent"""
        return ResultsCommunicationAgent(
            llm_provider=self._llm_provider,
            config=config
        )
    
    def create_data_structure_agent(self, config: AgentConfig, **kwargs) -> IDataStructureAgent:
        """Create data structure agent"""
        return DataStructureAgent(
            llm_provider=self._llm_provider,
            config=config
        )
    
    def create_general_agent(self, config: AgentConfig, **kwargs) -> IGeneralAgent:
        """Create general agent"""
        return GeneralAgent(
            llm_provider=self._llm_provider,
            config=config
        )
    
    def create_pcs_agent(self, config: AgentConfig, **kwargs) -> IPCSAgent:
        """Create PCS agent"""
        problem_description = kwargs.get('problem_description', '')
        context_description = kwargs.get('context_description', '')
        
        return PCSAgent(
            llm_provider=self._llm_provider,
            config=config,
            problem_description=problem_description,
            context_description=context_description
        )
    
    def create_results_evaluation_agent(self, config: AgentConfig, **kwargs) -> IResultsEvaluationAgent:
        """Create results evaluation agent"""
        problem_description = kwargs.get('problem_description', '')
        context_description = kwargs.get('context_description', '')
        best_five_result = kwargs.get('best_five_result', '')
        
        return ResultsEvaluationAgent(
            llm_provider=self._llm_provider,
            config=config,
            problem_description=problem_description,
            context_description=context_description,
            best_five_result=best_five_result
        )
    
    def get_available_agent_types(self) -> list[str]:
        """Get list of available agent types"""
        return list(self._agent_types.keys())
    
    def create_agent(self, agent_type: str, config: AgentConfig, **kwargs):
        """Create agent by type string"""
        if agent_type not in self._agent_types:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        agent_class = self._agent_types[agent_type]
        
        # Handle special parameters for different agent types
        if agent_type == 'data_cleaning':
            return self.create_data_cleaning_agent(config, **kwargs)
        elif agent_type == 'problem_definition':
            return self.create_problem_definition_agent(config, **kwargs)
        elif agent_type == 'prediction':
            return self.create_prediction_agent(config, **kwargs)
        elif agent_type == 'data_structure':
            return self.create_data_structure_agent(config, **kwargs)
        elif agent_type == 'general':
            return self.create_general_agent(config, **kwargs)
        elif agent_type == 'pcs':
            return self.create_pcs_agent(config, **kwargs)
        elif agent_type == 'results_communication':
            return self.create_results_communication_agent(config, **kwargs)
        elif agent_type == 'results_evaluation':
            return self.create_results_evaluation_agent(config, **kwargs)
        
        # Generic creation for future agents
        return agent_class(
            llm_provider=self._llm_provider,
            config=config,
            **kwargs
        )


class ConfigurableAgentFactory(AgentFactory):
    """Factory with configurable agent creation"""
    
    def __init__(self, llm_provider: ILLMProvider, default_configs: Dict[str, AgentConfig] = None):
        super().__init__(llm_provider)
        self._default_configs = default_configs or {}
    
    def create_data_cleaning_agent(self, config: AgentConfig = None, **kwargs) -> IDataCleaningAgent:
        """Create data cleaning agent with default config if none provided"""
        if config is None:
            config = self._default_configs.get('data_cleaning', AgentConfig())
        
        return super().create_data_cleaning_agent(config, **kwargs)
    
    def set_default_config(self, agent_type: str, config: AgentConfig) -> None:
        """Set default configuration for agent type"""
        self._default_configs[agent_type] = config
    
    def get_default_config(self, agent_type: str) -> AgentConfig:
        """Get default configuration for agent type"""
        return self._default_configs.get(agent_type, AgentConfig())


class CachedAgentFactory(AgentFactory):
    """Factory with caching for agent instances"""
    
    def __init__(self, llm_provider: ILLMProvider, cache_agents: bool = True):
        super().__init__(llm_provider)
        self._cache_agents = cache_agents
        self._agent_cache: Dict[str, Any] = {}
    
    def create_agent(self, agent_type: str, config: AgentConfig, cache_key: str = None, **kwargs):
        """Create agent with optional caching"""
        if not self._cache_agents or cache_key is None:
            return super().create_agent(agent_type, config, **kwargs)
        
        # Check cache
        if cache_key in self._agent_cache:
            return self._agent_cache[cache_key]
        
        # Create and cache
        agent = super().create_agent(agent_type, config, **kwargs)
        self._agent_cache[cache_key] = agent
        
        return agent
    
    def clear_cache(self) -> None:
        """Clear agent cache"""
        self._agent_cache.clear()
    
    def get_cached_agents(self) -> Dict[str, Any]:
        """Get all cached agents"""
        return self._agent_cache.copy()


class AgentBuilder:
    """Builder pattern for agent creation"""
    
    def __init__(self, factory: IAgentFactory):
        self._factory = factory
        self._agent_type = None
        self._config = AgentConfig()
        self._kwargs = {}
    
    def of_type(self, agent_type: str) -> 'AgentBuilder':
        """Set agent type"""
        self._agent_type = agent_type
        return self
    
    def with_config(self, config: AgentConfig) -> 'AgentBuilder':
        """Set agent configuration"""
        self._config = config
        return self
    
    def with_max_retries(self, max_retries: int) -> 'AgentBuilder':
        """Set max retries"""
        self._config.max_retries = max_retries
        return self
    
    def with_timeout(self, timeout: int) -> 'AgentBuilder':
        """Set timeout"""
        self._config.timeout = timeout
        return self
    
    def with_temperature(self, temperature: float) -> 'AgentBuilder':
        """Set temperature"""
        self._config.temperature = temperature
        return self
    
    def with_problem_description(self, description: str) -> 'AgentBuilder':
        """Set problem description"""
        self._kwargs['problem_description'] = description
        return self
    
    def with_context_description(self, description: str) -> 'AgentBuilder':
        """Set context description"""
        self._kwargs['context_description'] = description
        return self
    
    def build(self):
        """Build the agent"""
        if self._agent_type is None:
            raise ValueError("Agent type must be specified")
        
        return self._factory.create_agent(self._agent_type, self._config, **self._kwargs)


# Utility functions for common agent creation patterns
def create_standard_data_cleaning_agent(
    llm_provider: ILLMProvider,
    problem_description: str = "",
    context_description: str = ""
) -> IDataCleaningAgent:
    """Create a standard data cleaning agent with default configuration"""
    config = AgentConfig(
        max_retries=3,
        timeout=300,
        temperature=0.7
    )
    
    factory = AgentFactory(llm_provider)
    return factory.create_data_cleaning_agent(
        config=config,
        problem_description=problem_description,
        context_description=context_description
    )


def create_agent_from_config(
    agent_type: str,
    llm_provider: ILLMProvider,
    config_dict: Dict[str, Any]
) -> Any:
    """Create agent from configuration dictionary"""
    # Extract agent config
    agent_config = AgentConfig(
        max_retries=config_dict.get('max_retries', 3),
        timeout=config_dict.get('timeout', 300),
        temperature=config_dict.get('temperature', 0.7),
        max_tokens=config_dict.get('max_tokens'),
        custom_settings=config_dict.get('custom_settings', {})
    )
    
    # Extract other parameters
    kwargs = {k: v for k, v in config_dict.items() 
              if k not in ['max_retries', 'timeout', 'temperature', 'max_tokens', 'custom_settings']}
    
    factory = AgentFactory(llm_provider)
    return factory.create_agent(agent_type, agent_config, **kwargs)