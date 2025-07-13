"""Infrastructure-related exceptions"""

from .base_exceptions import DCLSException


class InfrastructureException(DCLSException):
    """Base exception for infrastructure-related errors"""
    pass


class AgentException(InfrastructureException):
    """Exception for agent-related errors"""
    pass


class LLMProviderException(InfrastructureException):
    """Exception for LLM provider errors"""
    pass


class StorageException(InfrastructureException):
    """Exception for storage-related errors"""
    pass


class ConfigurationException(InfrastructureException):
    """Exception for configuration errors"""
    pass


class WorkflowException(InfrastructureException):
    """Exception for workflow execution errors"""
    pass


class AgentExecutionException(AgentException):
    """Exception for agent execution errors"""
    pass


class AgentTimeoutException(AgentException):
    """Exception for agent timeout errors"""
    pass


class AgentValidationException(AgentException):
    """Exception for agent input validation errors"""
    pass


class LLMConnectionException(LLMProviderException):
    """Exception for LLM connection errors"""
    pass


class LLMRateLimitException(LLMProviderException):
    """Exception for LLM rate limit errors"""
    pass


class LLMAuthenticationException(LLMProviderException):
    """Exception for LLM authentication errors"""
    pass


class FileStorageException(StorageException):
    """Exception for file storage errors"""
    pass


class DatabaseStorageException(StorageException):
    """Exception for database storage errors"""
    pass


class CloudStorageException(StorageException):
    """Exception for cloud storage errors"""
    pass


class ConfigurationValidationException(ConfigurationException):
    """Exception for configuration validation errors"""
    pass


class EnvironmentConfigurationException(ConfigurationException):
    """Exception for environment configuration errors"""
    pass


class WorkflowStepException(WorkflowException):
    """Exception for workflow step errors"""
    pass


class WorkflowTimeoutException(WorkflowException):
    """Exception for workflow timeout errors"""
    pass


class DependencyInjectionException(InfrastructureException):
    """Exception for dependency injection errors"""
    pass