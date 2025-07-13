import os
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from enum import Enum
import json
from pathlib import Path


class Environment(Enum):
    DEVELOPMENT = "development"
    TESTING = "testing"
    PRODUCTION = "production"


class LogLevel(Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


@dataclass
class LLMConfig:
    provider: str
    api_key: str
    base_url: str
    model: str
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    timeout: int = 30
    max_retries: int = 3
    retry_delay: float = 2.0
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LLMConfig':
        return cls(
            provider=data['provider'],
            api_key=data['api_key'],
            base_url=data.get('base_url', 'https://api.openai.com/v1'),
            model=data.get('model', 'gpt-4'),
            temperature=data.get('temperature', 0.7),
            max_tokens=data.get('max_tokens'),
            timeout=data.get('timeout', 30),
            max_retries=data.get('max_retries', 3),
            retry_delay=data.get('retry_delay', 2.0)
        )
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'provider': self.provider,
            'api_key': self.api_key,
            'base_url': self.base_url,
            'model': self.model,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'timeout': self.timeout,
            'max_retries': self.max_retries,
            'retry_delay': self.retry_delay
        }


@dataclass
class DatabaseConfig:
    connection_string: str
    max_connections: int = 10
    timeout: int = 30
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'DatabaseConfig':
        return cls(
            connection_string=data['connection_string'],
            max_connections=data.get('max_connections', 10),
            timeout=data.get('timeout', 30)
        )


@dataclass
class StorageConfig:
    type: str  # 'file', 'memory', 'database', 'cloud'
    base_path: str
    auto_backup: bool = True
    backup_interval: int = 3600  # seconds
    max_file_size: int = 100 * 1024 * 1024  # 100MB
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StorageConfig':
        return cls(
            type=data['type'],
            base_path=data['base_path'],
            auto_backup=data.get('auto_backup', True),
            backup_interval=data.get('backup_interval', 3600),
            max_file_size=data.get('max_file_size', 100 * 1024 * 1024)
        )


@dataclass
class LoggingConfig:
    level: LogLevel
    file_path: Optional[str] = None
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5
    format_string: str = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LoggingConfig':
        return cls(
            level=LogLevel(data.get('level', 'INFO')),
            file_path=data.get('file_path'),
            max_file_size=data.get('max_file_size', 10 * 1024 * 1024),
            backup_count=data.get('backup_count', 5),
            format_string=data.get('format_string', '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        )


@dataclass
class AgentDefaultConfig:
    max_retries: int = 3
    timeout: int = 300
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    enable_caching: bool = True
    cache_ttl: int = 3600  # seconds
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentDefaultConfig':
        return cls(
            max_retries=data.get('max_retries', 3),
            timeout=data.get('timeout', 300),
            temperature=data.get('temperature', 0.7),
            max_tokens=data.get('max_tokens'),
            enable_caching=data.get('enable_caching', True),
            cache_ttl=data.get('cache_ttl', 3600)
        )


@dataclass
class SecurityConfig:
    encrypt_storage: bool = False
    encryption_key: Optional[str] = None
    rate_limit_requests: int = 100
    rate_limit_window: int = 3600  # seconds
    allowed_file_types: List[str] = field(default_factory=lambda: ['.csv', '.json', '.txt'])
    max_upload_size: int = 50 * 1024 * 1024  # 50MB
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SecurityConfig':
        return cls(
            encrypt_storage=data.get('encrypt_storage', False),
            encryption_key=data.get('encryption_key'),
            rate_limit_requests=data.get('rate_limit_requests', 100),
            rate_limit_window=data.get('rate_limit_window', 3600),
            allowed_file_types=data.get('allowed_file_types', ['.csv', '.json', '.txt']),
            max_upload_size=data.get('max_upload_size', 50 * 1024 * 1024)
        )


@dataclass
class AppConfig:
    environment: Environment
    debug: bool
    secret_key: str
    
    # Component configurations
    llm: LLMConfig
    storage: StorageConfig
    logging: LoggingConfig
    agent_defaults: AgentDefaultConfig
    security: SecurityConfig
    database: Optional[DatabaseConfig] = None
    
    # Application-specific settings
    data_directory: str = "./data"
    temp_directory: str = "./temp"
    max_concurrent_experiments: int = 5
    experiment_timeout: int = 3600  # seconds
    
    # Feature flags
    features: Dict[str, bool] = field(default_factory=dict)
    
    # Custom settings
    custom: Dict[str, Any] = field(default_factory=dict)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AppConfig':
        return cls(
            environment=Environment(data['environment']),
            debug=data.get('debug', False),
            secret_key=data['secret_key'],
            llm=LLMConfig.from_dict(data['llm']),
            storage=StorageConfig.from_dict(data['storage']),
            logging=LoggingConfig.from_dict(data.get('logging', {})),
            agent_defaults=AgentDefaultConfig.from_dict(data.get('agent_defaults', {})),
            security=SecurityConfig.from_dict(data.get('security', {})),
            database=DatabaseConfig.from_dict(data['database']) if 'database' in data else None,
            data_directory=data.get('data_directory', './data'),
            temp_directory=data.get('temp_directory', './temp'),
            max_concurrent_experiments=data.get('max_concurrent_experiments', 5),
            experiment_timeout=data.get('experiment_timeout', 3600),
            features=data.get('features', {}),
            custom=data.get('custom', {})
        )
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        """Create configuration from environment variables"""
        # Get environment
        env = Environment(os.getenv('DCLS_ENVIRONMENT', 'development'))
        
        # Load from environment-specific file
        config_file = f"shared/config/environments/{env.value}.json"
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                config_data = json.load(f)
        else:
            config_data = {}
        
        # Override with environment variables
        config_data.update({
            'environment': env.value,
            'debug': os.getenv('DCLS_DEBUG', 'false').lower() == 'true',
            'secret_key': os.getenv('DCLS_SECRET_KEY', 'dev-secret-key'),
            'llm': {
                'provider': os.getenv('DCLS_LLM_PROVIDER', 'openai'),
                'api_key': os.getenv('DCLS_LLM_API_KEY', ''),
                'base_url': os.getenv('DCLS_LLM_BASE_URL', 'https://api.openai.com/v1'),
                'model': os.getenv('DCLS_LLM_MODEL', 'gpt-4'),
                'temperature': float(os.getenv('DCLS_LLM_TEMPERATURE', '0.7')),
            },
            'storage': {
                'type': os.getenv('DCLS_STORAGE_TYPE', 'file'),
                'base_path': os.getenv('DCLS_STORAGE_PATH', './data'),
            },
            'logging': {
                'level': os.getenv('DCLS_LOG_LEVEL', 'INFO'),
                'file_path': os.getenv('DCLS_LOG_FILE'),
            }
        })
        
        return cls.from_dict(config_data)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary"""
        result = {
            'environment': self.environment.value,
            'debug': self.debug,
            'secret_key': self.secret_key,
            'llm': self.llm.to_dict(),
            'storage': self.storage.__dict__,
            'logging': self.logging.__dict__,
            'agent_defaults': self.agent_defaults.__dict__,
            'security': self.security.__dict__,
            'data_directory': self.data_directory,
            'temp_directory': self.temp_directory,
            'max_concurrent_experiments': self.max_concurrent_experiments,
            'experiment_timeout': self.experiment_timeout,
            'features': self.features,
            'custom': self.custom
        }
        
        if self.database:
            result['database'] = self.database.__dict__
        
        return result
    
    def save_to_file(self, filepath: str) -> None:
        """Save configuration to JSON file"""
        config_dict = self.to_dict()
        # Remove sensitive information
        if 'api_key' in config_dict['llm']:
            config_dict['llm']['api_key'] = '***'
        config_dict['secret_key'] = '***'
        
        with open(filepath, 'w') as f:
            json.dump(config_dict, f, indent=2)
    
    def validate(self) -> List[str]:
        """Validate configuration and return list of errors"""
        errors = []
        
        # Validate LLM configuration
        if not self.llm.api_key:
            errors.append("LLM API key is required")
        
        if not self.llm.provider:
            errors.append("LLM provider is required")
        
        # Validate storage configuration
        if not self.storage.base_path:
            errors.append("Storage base path is required")
        
        # Validate directories exist or can be created
        for directory in [self.data_directory, self.temp_directory]:
            try:
                Path(directory).mkdir(parents=True, exist_ok=True)
            except Exception as e:
                errors.append(f"Cannot create directory {directory}: {str(e)}")
        
        # Validate numeric values
        if self.agent_defaults.timeout <= 0:
            errors.append("Agent timeout must be positive")
        
        if self.max_concurrent_experiments <= 0:
            errors.append("Max concurrent experiments must be positive")
        
        return errors
    
    def get_feature_flag(self, feature_name: str, default: bool = False) -> bool:
        """Get feature flag value"""
        return self.features.get(feature_name, default)
    
    def set_feature_flag(self, feature_name: str, enabled: bool) -> None:
        """Set feature flag value"""
        self.features[feature_name] = enabled


class ConfigManager:
    """Configuration manager with caching and validation"""
    
    def __init__(self):
        self._config: Optional[AppConfig] = None
        self._config_file: Optional[str] = None
    
    def load_from_file(self, config_file: str) -> AppConfig:
        """Load configuration from file"""
        with open(config_file, 'r') as f:
            config_data = json.load(f)
        
        self._config = AppConfig.from_dict(config_data)
        self._config_file = config_file
        
        # Validate configuration
        errors = self._config.validate()
        if errors:
            raise ValueError(f"Configuration validation failed: {', '.join(errors)}")
        
        return self._config
    
    def load_from_env(self) -> AppConfig:
        """Load configuration from environment"""
        self._config = AppConfig.from_env()
        
        # Validate configuration
        errors = self._config.validate()
        if errors:
            raise ValueError(f"Configuration validation failed: {', '.join(errors)}")
        
        return self._config
    
    def get_config(self) -> AppConfig:
        """Get current configuration"""
        if self._config is None:
            # Try to load from environment if no config is loaded
            self.load_from_env()
        
        return self._config
    
    def reload_config(self) -> AppConfig:
        """Reload configuration from source"""
        if self._config_file:
            return self.load_from_file(self._config_file)
        else:
            return self.load_from_env()
    
    def update_config(self, updates: Dict[str, Any]) -> None:
        """Update configuration with new values"""
        if self._config is None:
            raise ValueError("No configuration loaded")
        
        # This is a simplified update - in practice, you'd want more sophisticated merging
        for key, value in updates.items():
            if hasattr(self._config, key):
                setattr(self._config, key, value)


# Global configuration manager instance
_config_manager = ConfigManager()


def get_config() -> AppConfig:
    """Get the global configuration instance"""
    return _config_manager.get_config()


def load_config_from_file(config_file: str) -> AppConfig:
    """Load configuration from file"""
    return _config_manager.load_from_file(config_file)


def load_config_from_env() -> AppConfig:
    """Load configuration from environment"""
    return _config_manager.load_from_env()


def reload_config() -> AppConfig:
    """Reload configuration"""
    return _config_manager.reload_config()