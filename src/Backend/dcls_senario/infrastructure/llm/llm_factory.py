from typing import Dict, Any, List, Type
from domain.interfaces import ILLMProvider, ILLMFactory
from infrastructure.llm.openai_provider import OpenAIProvider
from shared.config.settings import LLMConfig


class LLMFactory(ILLMFactory):
    """Factory for creating LLM providers"""
    
    def __init__(self):
        self._providers: Dict[str, Type[ILLMProvider]] = {
            'openai': OpenAIProvider,
            # Add more providers here as they are implemented
        }
        
        self._config_schemas = {
            'openai': {
                'api_key': {'type': 'string', 'required': True},
                'base_url': {'type': 'string', 'required': False, 'default': 'https://api.openai.com/v1'},
                'model': {'type': 'string', 'required': False, 'default': 'gpt-4'},
                'temperature': {'type': 'number', 'required': False, 'default': 0.7},
                'max_tokens': {'type': 'integer', 'required': False, 'default': None},
                'timeout': {'type': 'integer', 'required': False, 'default': 30},
                'max_retries': {'type': 'integer', 'required': False, 'default': 3},
                'retry_delay': {'type': 'number', 'required': False, 'default': 2.0}
            }
        }
    
    def create_provider(self, provider_type: str, **config) -> ILLMProvider:
        """Create LLM provider instance"""
        if provider_type not in self._providers:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        provider_class = self._providers[provider_type]
        
        # Validate configuration
        self._validate_config(provider_type, config)
        
        # Apply defaults
        config = self._apply_defaults(provider_type, config)
        
        return provider_class(**config)
    
    def create_from_config(self, config: LLMConfig) -> ILLMProvider:
        """Create provider from configuration object"""
        provider_config = {
            'api_key': config.api_key,
            'base_url': config.base_url,
            'model': config.model,
            'temperature': config.temperature,
            'max_tokens': config.max_tokens,
            'timeout': getattr(config, 'timeout', 30),
            'max_retries': getattr(config, 'max_retries', 3),
            'retry_delay': getattr(config, 'retry_delay', 2.0)
        }
        
        return self.create_provider(config.provider, **provider_config)
    
    def get_available_providers(self) -> List[str]:
        """Get list of available provider types"""
        return list(self._providers.keys())
    
    def get_provider_config_schema(self, provider_type: str) -> Dict[str, Any]:
        """Get configuration schema for provider type"""
        if provider_type not in self._config_schemas:
            raise ValueError(f"Unknown provider type: {provider_type}")
        
        return self._config_schemas[provider_type].copy()
    
    def register_provider(self, provider_type: str, provider_class: Type[ILLMProvider], config_schema: Dict[str, Any]):
        """Register a new provider type"""
        self._providers[provider_type] = provider_class
        self._config_schemas[provider_type] = config_schema
    
    def _validate_config(self, provider_type: str, config: Dict[str, Any]) -> None:
        """Validate provider configuration"""
        schema = self._config_schemas[provider_type]
        
        for key, requirements in schema.items():
            if requirements.get('required', False) and key not in config:
                raise ValueError(f"Required configuration key missing: {key}")
            
            if key in config:
                value = config[key]
                expected_type = requirements['type']
                
                if expected_type == 'string' and not isinstance(value, str):
                    raise ValueError(f"Configuration key {key} must be a string")
                elif expected_type == 'number' and not isinstance(value, (int, float)):
                    raise ValueError(f"Configuration key {key} must be a number")
                elif expected_type == 'integer' and not isinstance(value, int):
                    raise ValueError(f"Configuration key {key} must be an integer")
    
    def _apply_defaults(self, provider_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Apply default values to configuration"""
        schema = self._config_schemas[provider_type]
        result = config.copy()
        
        for key, requirements in schema.items():
            if key not in result and 'default' in requirements:
                result[key] = requirements['default']
        
        return result


class LLMProviderRegistry:
    """Registry for managing multiple LLM providers"""
    
    def __init__(self, factory: ILLMFactory):
        self._factory = factory
        self._providers: Dict[str, ILLMProvider] = {}
        self._default_provider: str = None
    
    def register_provider(self, name: str, provider_type: str, **config) -> None:
        """Register a named provider instance"""
        provider = self._factory.create_provider(provider_type, **config)
        self._providers[name] = provider
        
        if self._default_provider is None:
            self._default_provider = name
    
    def register_provider_instance(self, name: str, provider: ILLMProvider) -> None:
        """Register a provider instance directly"""
        self._providers[name] = provider
        
        if self._default_provider is None:
            self._default_provider = name
    
    def get_provider(self, name: str = None) -> ILLMProvider:
        """Get provider by name or default"""
        if name is None:
            name = self._default_provider
        
        if name is None:
            raise ValueError("No providers registered")
        
        if name not in self._providers:
            raise ValueError(f"Provider {name} not found")
        
        return self._providers[name]
    
    def set_default_provider(self, name: str) -> None:
        """Set default provider"""
        if name not in self._providers:
            raise ValueError(f"Provider {name} not found")
        self._default_provider = name
    
    def get_available_providers(self) -> List[str]:
        """Get list of registered provider names"""
        return list(self._providers.keys())
    
    def remove_provider(self, name: str) -> None:
        """Remove a provider"""
        if name in self._providers:
            del self._providers[name]
            
            if self._default_provider == name:
                self._default_provider = next(iter(self._providers.keys()), None)


# Singleton factory instance
_llm_factory = LLMFactory()


def get_llm_factory() -> ILLMFactory:
    """Get the global LLM factory instance"""
    return _llm_factory


def create_llm_provider(provider_type: str, **config) -> ILLMProvider:
    """Convenience function to create an LLM provider"""
    return _llm_factory.create_provider(provider_type, **config)