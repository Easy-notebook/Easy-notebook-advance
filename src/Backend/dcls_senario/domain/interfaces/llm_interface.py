from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Iterator, Union
from dataclasses import dataclass


@dataclass
class Message:
    role: str
    content: str


@dataclass
class LLMResponse:
    content: str
    tokens_used: int
    cost: float
    model: str
    metadata: Dict[str, Any]


class ILLMProvider(ABC):
    """Abstract interface for Language Model providers"""
    
    @abstractmethod
    def generate(
        self, 
        messages: Union[List[Message], str], 
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response from messages"""
        pass
    
    @abstractmethod
    def generate_with_system(
        self, 
        user_message: str, 
        system_message: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response with system message"""
        pass
    
    @abstractmethod
    def generate_json(
        self, 
        messages: Union[List[Message], str],
        **kwargs
    ) -> Dict[str, Any]:
        """Generate JSON response"""
        pass
    
    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        pass
    
    @abstractmethod
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost for token usage"""
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        pass
    
    @abstractmethod
    def set_temperature(self, temperature: float) -> None:
        """Set model temperature"""
        pass
    
    @abstractmethod
    def set_max_tokens(self, max_tokens: int) -> None:
        """Set maximum tokens"""
        pass


class IConversation(ABC):
    """Abstract interface for conversation management"""
    
    @abstractmethod
    def add_system_message(self, content: str) -> None:
        """Add system message to conversation"""
        pass
    
    @abstractmethod
    def add_user_message(self, content: str) -> None:
        """Add user message to conversation"""
        pass
    
    @abstractmethod
    def add_assistant_message(self, content: str) -> None:
        """Add assistant message to conversation"""
        pass
    
    @abstractmethod
    def send_message(self, content: str, stream: bool = False, **kwargs) -> Union[str, Iterator[str]]:
        """Send message and get response"""
        pass
    
    @abstractmethod
    def get_history(self) -> List[Message]:
        """Get conversation history"""
        pass
    
    @abstractmethod
    def clear_history(self, keep_system: bool = True) -> None:
        """Clear conversation history"""
        pass
    
    @abstractmethod
    def get_token_count(self) -> int:
        """Get total token count for conversation"""
        pass
    
    @abstractmethod
    def save_conversation(self, filepath: str) -> None:
        """Save conversation to file"""
        pass
    
    @abstractmethod
    def load_conversation(self, filepath: str) -> None:
        """Load conversation from file"""
        pass


class ILLMFactory(ABC):
    """Abstract factory for creating LLM providers"""
    
    @abstractmethod
    def create_provider(self, provider_type: str, **config) -> ILLMProvider:
        """Create LLM provider instance"""
        pass
    
    @abstractmethod
    def get_available_providers(self) -> List[str]:
        """Get list of available provider types"""
        pass
    
    @abstractmethod
    def get_provider_config_schema(self, provider_type: str) -> Dict[str, Any]:
        """Get configuration schema for provider type"""
        pass