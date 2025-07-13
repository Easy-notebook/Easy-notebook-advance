"""Domain-related exceptions"""

from .base_exceptions import DCLSException


class DomainException(DCLSException):
    """Base exception for domain-related errors"""
    pass


class DatasetException(DomainException):
    """Exception for dataset-related errors"""
    pass


class ExperimentException(DomainException):
    """Exception for experiment-related errors"""
    pass


class ModelException(DomainException):
    """Exception for model-related errors"""
    pass


class ValidationException(DomainException):
    """Exception for validation errors"""
    pass


class BusinessRuleViolationException(DomainException):
    """Exception for business rule violations"""
    pass


class DataQualityException(DatasetException):
    """Exception for data quality issues"""
    pass


class ExperimentStateException(ExperimentException):
    """Exception for invalid experiment state transitions"""
    pass


class ModelTrainingException(ModelException):
    """Exception for model training errors"""
    pass


class FeatureEngineeringException(DomainException):
    """Exception for feature engineering errors"""
    pass