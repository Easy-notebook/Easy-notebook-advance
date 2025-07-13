# DCLS Project - OOP Architecture Design

## New Project Structure

```
/src/Backend/dcls_senario/
├── domain/                          # Core business logic
│   ├── __init__.py
│   ├── models/                      # Domain models
│   │   ├── __init__.py
│   │   ├── dataset.py              # Dataset domain model
│   │   ├── experiment.py           # Experiment domain model
│   │   ├── analysis_result.py      # Analysis results
│   │   └── workflow.py             # Workflow models
│   ├── services/                    # Domain services
│   │   ├── __init__.py
│   │   ├── data_processing.py      # Data processing business logic
│   │   ├── model_training.py       # Model training logic
│   │   └── analysis_engine.py      # Analysis business logic
│   └── interfaces/                  # Domain interfaces
│       ├── __init__.py
│       ├── agent_interface.py      # Agent contracts
│       ├── llm_interface.py        # LLM provider contracts
│       └── storage_interface.py    # Storage contracts
│
├── application/                     # Application layer
│   ├── __init__.py
│   ├── use_cases/                  # Application use cases
│   │   ├── __init__.py
│   │   ├── data_analysis_workflow.py
│   │   ├── model_training_workflow.py
│   │   └── experiment_execution.py
│   ├── services/                   # Application services
│   │   ├── __init__.py
│   │   ├── workflow_orchestrator.py
│   │   ├── agent_manager.py
│   │   └── result_processor.py
│   └── dto/                        # Data transfer objects
│       ├── __init__.py
│       ├── experiment_dto.py
│       └── analysis_dto.py
│
├── infrastructure/                  # Infrastructure layer
│   ├── __init__.py
│   ├── llm/                        # LLM implementations
│   │   ├── __init__.py
│   │   ├── openai_provider.py      # Our new OpenAI engine
│   │   ├── langchain_provider.py   # Legacy Langchain wrapper
│   │   └── llm_factory.py          # Factory for LLM providers
│   ├── storage/                    # Data storage
│   │   ├── __init__.py
│   │   ├── file_storage.py
│   │   └── memory_storage.py
│   ├── agents/                     # Agent implementations
│   │   ├── __init__.py
│   │   ├── base/                   # Base agent implementations
│   │   │   ├── __init__.py
│   │   │   ├── agent_base.py
│   │   │   └── conversation_agent.py
│   │   ├── specialized/            # Specialized agents
│   │   │   ├── __init__.py
│   │   │   ├── data_cleaning_agent.py
│   │   │   ├── analysis_agent.py
│   │   │   └── prediction_agent.py
│   │   └── factory/                # Agent factory
│   │       ├── __init__.py
│   │       └── agent_factory.py
│   └── external/                   # External service integrations
│       ├── __init__.py
│       └── api_clients.py
│
├── presentation/                    # Presentation layer
│   ├── __init__.py
│   ├── api/                        # REST API
│   │   ├── __init__.py
│   │   ├── endpoints/
│   │   │   ├── __init__.py
│   │   │   ├── experiments.py
│   │   │   └── analysis.py
│   │   └── middleware/
│   │       ├── __init__.py
│   │       └── error_handler.py
│   └── cli/                        # Command line interface
│       ├── __init__.py
│       └── commands.py
│
├── shared/                         # Shared utilities
│   ├── __init__.py
│   ├── config/                     # Configuration management
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   └── environments/
│   │       ├── development.py
│   │       ├── testing.py
│   │       └── production.py
│   ├── exceptions/                 # Custom exceptions
│   │   ├── __init__.py
│   │   ├── base_exceptions.py
│   │   ├── domain_exceptions.py
│   │   └── infrastructure_exceptions.py
│   ├── logging/                    # Logging configuration
│   │   ├── __init__.py
│   │   └── logger_config.py
│   ├── utils/                      # Utilities
│   │   ├── __init__.py
│   │   ├── file_utils.py
│   │   ├── validation.py
│   │   └── serialization.py
│   └── constants/                  # Application constants
│       ├── __init__.py
│       ├── model_constants.py
│       └── system_constants.py
│
├── tests/                          # Test suite
│   ├── __init__.py
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── main.py                         # Application entry point
├── requirements.txt
└── .env.example                    # Environment variables template
```

## Core Design Principles

### 1. **Clean Architecture**
- **Domain Layer**: Core business logic, independent of external concerns
- **Application Layer**: Use cases and application-specific business rules
- **Infrastructure Layer**: External dependencies (databases, APIs, frameworks)
- **Presentation Layer**: User interfaces (API, CLI, Web)

### 2. **Dependency Inversion**
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- All dependencies injected through constructors

### 3. **Single Responsibility Principle**
- Each class has one reason to change
- Clear separation of concerns
- Focused, cohesive modules

### 4. **Open/Closed Principle**
- Open for extension, closed for modification
- Use strategy pattern for algorithms
- Factory pattern for object creation

### 5. **Interface Segregation**
- Small, focused interfaces
- Clients don't depend on unused methods
- Multiple specific interfaces better than one general

## Key Architectural Patterns

### 1. **Repository Pattern**
```python
# Domain interface
class IExperimentRepository(ABC):
    @abstractmethod
    def save(self, experiment: Experiment) -> None: ...
    
    @abstractmethod
    def find_by_id(self, experiment_id: str) -> Optional[Experiment]: ...

# Infrastructure implementation
class FileExperimentRepository(IExperimentRepository):
    def save(self, experiment: Experiment) -> None: ...
```

### 2. **Factory Pattern**
```python
# Abstract factory for agents
class IAgentFactory(ABC):
    @abstractmethod
    def create_data_cleaning_agent(self) -> IDataCleaningAgent: ...
    
    @abstractmethod
    def create_analysis_agent(self) -> IAnalysisAgent: ...

# Concrete factory
class DefaultAgentFactory(IAgentFactory):
    def __init__(self, llm_provider: ILLMProvider, config: AgentConfig):
        self._llm_provider = llm_provider
        self._config = config
```

### 3. **Strategy Pattern**
```python
# LLM strategy interface
class ILLMProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str) -> str: ...
    
    @abstractmethod
    def generate_with_context(self, messages: List[Message]) -> str: ...

# Concrete strategies
class OpenAIProvider(ILLMProvider): ...
class LangchainProvider(ILLMProvider): ...
```

### 4. **Command Pattern**
```python
# For workflow execution
class ICommand(ABC):
    @abstractmethod
    def execute(self) -> CommandResult: ...

class DataCleaningCommand(ICommand):
    def __init__(self, agent: IDataCleaningAgent, dataset: Dataset):
        self._agent = agent
        self._dataset = dataset
```

### 5. **Observer Pattern**
```python
# For workflow progress tracking
class IWorkflowObserver(ABC):
    @abstractmethod
    def on_step_completed(self, step: WorkflowStep, result: StepResult): ...

class LoggingObserver(IWorkflowObserver): ...
class ProgressObserver(IWorkflowObserver): ...
```

## Dependency Injection Container

```python
class DIContainer:
    def __init__(self):
        self._services = {}
        self._singletons = {}
    
    def register_singleton(self, interface_type: Type, implementation: callable):
        self._services[interface_type] = ('singleton', implementation)
    
    def register_transient(self, interface_type: Type, implementation: callable):
        self._services[interface_type] = ('transient', implementation)
    
    def resolve(self, service_type: Type) -> Any:
        # Implementation for dependency resolution
        pass
```

## Configuration Management

```python
# Environment-based configuration
@dataclass
class DatabaseConfig:
    host: str
    port: int
    database: str

@dataclass
class LLMConfig:
    provider: str
    model: str
    api_key: str
    base_url: str
    temperature: float

@dataclass
class AppConfig:
    environment: str
    debug: bool
    database: DatabaseConfig
    llm: LLMConfig
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        # Load from environment variables
        pass
```

## Error Handling Strategy

```python
# Exception hierarchy
class DCLSException(Exception):
    """Base exception for DCLS system"""
    pass

class DomainException(DCLSException):
    """Domain-related exceptions"""
    pass

class InfrastructureException(DCLSException):
    """Infrastructure-related exceptions"""
    pass

class AgentException(InfrastructureException):
    """Agent-related exceptions"""
    pass

class LLMProviderException(InfrastructureException):
    """LLM provider exceptions"""
    pass

# Global error handler
class ErrorHandler:
    def handle_exception(self, exc: Exception) -> ErrorResponse:
        if isinstance(exc, DomainException):
            return self._handle_domain_error(exc)
        elif isinstance(exc, InfrastructureException):
            return self._handle_infrastructure_error(exc)
        else:
            return self._handle_unknown_error(exc)
```

## Migration Strategy

### Phase 1: Foundation
1. Create new directory structure
2. Implement core interfaces and abstract classes
3. Set up dependency injection container
4. Create configuration management system

### Phase 2: Infrastructure
1. Migrate LLM providers to new architecture
2. Implement agent base classes
3. Create factories and repositories
4. Set up logging and error handling

### Phase 3: Domain & Application
1. Create domain models and services
2. Implement use cases and workflows
3. Migrate existing agent logic
4. Create application services

### Phase 4: Presentation & Testing
1. Create new API layer
2. Implement CLI interface
3. Add comprehensive tests
4. Performance optimization

### Phase 5: Legacy Migration
1. Gradually migrate existing functionality
2. Maintain backward compatibility during transition
3. Update documentation
4. Remove legacy code

This architecture provides a solid foundation for maintainable, testable, and extensible code while addressing all the identified issues in the current codebase.