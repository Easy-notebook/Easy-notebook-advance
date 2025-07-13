from typing import List, Dict, Any, Optional, Union, Iterator
from domain.interfaces import ILLMProvider, IConversation, Message
from DCLSAgents.engines import OpenAIEngine, Conversation


class OpenAIProvider(ILLMProvider):
    """OpenAI provider implementation using our custom engine"""
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 2.0
    ):
        self._engine = OpenAIEngine(
            api_key=api_key,
            base_url=base_url,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
            max_retries=max_retries,
            retry_delay=retry_delay
        )
    
    def generate(
        self, 
        messages: Union[List[Message], str], 
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response from messages"""
        if isinstance(messages, list):
            # Convert domain Message objects to engine format
            engine_messages = []
            for msg in messages:
                if hasattr(msg, 'role') and hasattr(msg, 'content'):
                    engine_messages.append({"role": msg.role, "content": msg.content})
                elif isinstance(msg, dict):
                    engine_messages.append(msg)
            messages = engine_messages
        
        return self._engine.generate(messages, stream=stream, **kwargs)
    
    def generate_with_system(
        self, 
        user_message: str, 
        system_message: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response with system message"""
        return self._engine.generate_with_system(
            user_message=user_message,
            system_message=system_message,
            stream=stream,
            **kwargs
        )
    
    def generate_json(
        self, 
        messages: Union[List[Message], str],
        **kwargs
    ) -> Dict[str, Any]:
        """Generate JSON response"""
        if isinstance(messages, list):
            # Convert domain Message objects to engine format
            engine_messages = []
            for msg in messages:
                if hasattr(msg, 'role') and hasattr(msg, 'content'):
                    engine_messages.append({"role": msg.role, "content": msg.content})
                elif isinstance(msg, dict):
                    engine_messages.append(msg)
            messages = engine_messages
        
        return self._engine.generate_json(messages, **kwargs)
    
    def count_tokens(self, text: str) -> int:
        """Count tokens in text"""
        return self._engine.count_tokens(text)
    
    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost for token usage"""
        return self._engine.estimate_cost(input_tokens, output_tokens)
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get model information"""
        return {
            'model': self._engine.model,
            'base_url': self._engine.base_url,
            'temperature': self._engine.temperature,
            'max_tokens': self._engine.max_tokens,
            'provider': 'openai'
        }
    
    def set_temperature(self, temperature: float) -> None:
        """Set model temperature"""
        self._engine.set_temperature(temperature)
    
    def set_max_tokens(self, max_tokens: int) -> None:
        """Set maximum tokens"""
        self._engine.set_max_tokens(max_tokens)
    
    def create_conversation(self) -> IConversation:
        """Create a new conversation instance"""
        return OpenAIConversation(self._engine.create_conversation())


class OpenAIConversation(IConversation):
    """OpenAI conversation implementation"""
    
    def __init__(self, engine_conversation: Conversation):
        self._conversation = engine_conversation
    
    def add_system_message(self, content: str) -> None:
        """Add system message to conversation"""
        self._conversation.add_system_message(content)
    
    def add_user_message(self, content: str) -> None:
        """Add user message to conversation"""
        self._conversation.add_user_message(content)
    
    def add_assistant_message(self, content: str) -> None:
        """Add assistant message to conversation"""
        self._conversation.add_assistant_message(content)
    
    def send_message(self, content: str, stream: bool = False, **kwargs) -> Union[str, Iterator[str]]:
        """Send message and get response"""
        return self._conversation.send_message(content, stream=stream, **kwargs)
    
    def get_history(self) -> List[Message]:
        """Get conversation history"""
        history = self._conversation.get_history()
        return [Message(role=msg["role"], content=msg["content"]) for msg in history]
    
    def clear_history(self, keep_system: bool = True) -> None:
        """Clear conversation history"""
        self._conversation.clear_history(keep_system)
    
    def get_token_count(self) -> int:
        """Get total token count for conversation"""
        return self._conversation.get_token_count()
    
    def save_conversation(self, filepath: str) -> None:
        """Save conversation to file"""
        self._conversation.save_conversation(filepath)
    
    def load_conversation(self, filepath: str) -> None:
        """Load conversation from file"""
        self._conversation.load_conversation(filepath)