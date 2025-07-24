"""
Oracle.py - Clean and simplified version
Provides OpenAI API integration with proper error handling
"""

import openai
import json
import logging
import time
import os
from typing import List, Dict, Any, Optional, Union, Iterator
from dataclasses import dataclass


@dataclass
class Message:
    role: str
    content: str
    
    def __post_init__(self):
        valid_roles = ['system', 'user', 'assistant']
        if self.role not in valid_roles:
            raise ValueError(f"Invalid role: {self.role}. Must be one of {valid_roles}")
        if not self.content or not self.content.strip():
            raise ValueError("Message content cannot be empty")


class OracleError(Exception):
    """Base exception for Oracle-related errors"""
    pass


class OracleAPIError(OracleError):
    """API-related errors"""
    pass


class OracleValidationError(OracleError):
    """Input validation errors"""
    pass


class Oracle:
    """
    Simplified Oracle class for OpenAI API integration
    """
    
    SUPPORTED_MODELS = {
        "gpt-4": 8192,
        "gpt-4-turbo": 128000,
        "gpt-4o": 128000,
        "gpt-4o-mini": 128000,
        "gpt-3.5-turbo": 4096,
        "gpt-3.5-turbo-16k": 16384
    }
    
    MODEL_PRICING = {
        "gpt-4": {"input": 0.03, "output": 0.06},
        "gpt-4-turbo": {"input": 0.01, "output": 0.03},
        "gpt-3.5-turbo": {"input": 0.0015, "output": 0.002},
        "gpt-4o": {"input": 0.005, "output": 0.015},
        "gpt-4o-mini": {"input": 0.00015, "output": 0.0006}
    }

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://api.openai.com/v1",
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 2.0,
        enable_logging: bool = True
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise OracleValidationError("API key required via parameter or OPENAI_API_KEY env var")
        
        self._validate_init_params(model, temperature, max_tokens, timeout, max_retries, retry_delay)
        
        self.base_url = base_url
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        self._init_client()
        self._setup_logging(enable_logging)
    
    def _validate_init_params(self, model, temperature, max_tokens, timeout, max_retries, retry_delay):
        """Validate initialization parameters"""
        if model not in self.SUPPORTED_MODELS:
            raise OracleValidationError(f"Unsupported model: {model}")
        if not 0 <= temperature <= 2:
            raise OracleValidationError("Temperature must be between 0 and 2")
        if max_tokens is not None and max_tokens <= 0:
            raise OracleValidationError("max_tokens must be positive")
        if timeout <= 0:
            raise OracleValidationError("timeout must be positive")
        if max_retries < 0 or retry_delay < 0:
            raise OracleValidationError("max_retries and retry_delay must be non-negative")
    
    def _init_client(self):
        """Initialize OpenAI client"""
        try:
            self.client = openai.OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout
            )
        except Exception as e:
            raise OracleAPIError(f"Failed to initialize OpenAI client: {e}")
    
    def _setup_logging(self, enable_logging):
        """Setup logging"""
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
        if enable_logging and not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)

    def _validate_messages(self, messages: Union[List[Message], List[Dict[str, str]], str]) -> List[Dict[str, str]]:
        """Validate and prepare messages for API call"""
        if isinstance(messages, str):
            return self._validate_string_message(messages)
        elif isinstance(messages, list):
            return self._validate_list_messages(messages)
        else:
            raise OracleValidationError(f"Invalid messages type: {type(messages)}")
    
    def _validate_string_message(self, message: str) -> List[Dict[str, str]]:
        """Validate single string message"""
        if not message.strip():
            raise OracleValidationError("Message content cannot be empty")
        return [{"role": "user", "content": message.strip()}]
    
    def _validate_list_messages(self, messages: list) -> List[Dict[str, str]]:
        """Validate list of messages"""
        if not messages:
            raise OracleValidationError("Messages list cannot be empty")
        
        prepared_messages = []
        valid_roles = ['system', 'user', 'assistant']
        
        for i, msg in enumerate(messages):
            if isinstance(msg, Message):
                prepared_messages.append({"role": msg.role, "content": msg.content})
            elif isinstance(msg, dict):
                if "role" not in msg or "content" not in msg:
                    raise OracleValidationError(f"Message {i} missing 'role' or 'content'")
                if msg["role"] not in valid_roles:
                    raise OracleValidationError(f"Invalid role in message {i}: {msg['role']}")
                if not msg["content"] or not msg["content"].strip():
                    raise OracleValidationError(f"Empty content in message {i}")
                prepared_messages.append({"role": msg["role"], "content": msg["content"].strip()})
            else:
                raise OracleValidationError(f"Invalid message type at index {i}: {type(msg)}")
        
        return prepared_messages

    def _safe_get_response_content(self, response) -> str:
        """Safely extract content from API response"""
        try:
            if not hasattr(response, 'choices') or not response.choices:
                raise OracleAPIError("No choices in API response")
            
            choice = response.choices[0]
            if not hasattr(choice, 'message') or not hasattr(choice.message, 'content'):
                raise OracleAPIError("Invalid response structure")
            
            content = choice.message.content
            if content is None:
                raise OracleAPIError("Response content is None")
            
            return content
            
        except (IndexError, AttributeError) as e:
            raise OracleAPIError(f"Error accessing response content: {e}")

    def _handle_stream_response(self, response) -> Iterator[str]:
        """Safely handle streaming response"""
        try:
            for chunk in response:
                try:
                    if self._is_valid_chunk(chunk):
                        yield chunk.choices[0].delta.content
                except (IndexError, AttributeError) as e:
                    self.logger.warning(f"Skipping malformed chunk: {e}")
                    continue
        except Exception as e:
            self.logger.error(f"Error in stream response: {e}")
            raise OracleAPIError(f"Stream processing error: {e}")
    
    def _is_valid_chunk(self, chunk) -> bool:
        """Check if chunk is valid"""
        return (hasattr(chunk, 'choices') and 
                chunk.choices and 
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                hasattr(chunk.choices[0].delta, 'content') and
                chunk.choices[0].delta.content is not None)

    def generate(
        self,
        messages: Union[List[Message], List[Dict[str, str]], str],
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response with error handling and retries"""
        prepared_messages = self._validate_messages(messages)
        self._check_token_limits(prepared_messages)
        
        for attempt in range(self.max_retries + 1):
            try:
                self.logger.info(f"Generating response (attempt {attempt + 1}/{self.max_retries + 1})")
                
                api_params = self._build_api_params(prepared_messages, stream, **kwargs)
                response = self.client.chat.completions.create(**api_params)
                
                if stream:
                    return self._handle_stream_response(response)
                else:
                    content = self._safe_get_response_content(response)
                    self.logger.info("Response generated successfully")
                    return content
                    
            except openai.AuthenticationError as e:
                self.logger.error(f"Authentication error: {str(e)}")
                raise OracleAPIError(f"Authentication failed: {e}")
            except openai.RateLimitError as e:
                if attempt < self.max_retries:
                    wait_time = self.retry_delay * (2 ** attempt)
                    self.logger.warning(f"Rate limit hit, waiting {wait_time}s")
                    time.sleep(wait_time)
                    continue
                raise OracleAPIError(f"Rate limit exceeded: {e}")
            except openai.APIError as e:
                if attempt < self.max_retries:
                    self.logger.warning(f"API error on attempt {attempt + 1}, retrying")
                    time.sleep(self.retry_delay)
                    continue
                raise OracleAPIError(f"API error: {e}")
            except Exception as e:
                self.logger.error(f"Unexpected error: {str(e)}")
                raise OracleError(f"Unexpected error: {e}")
        
        raise OracleAPIError("Failed after all retry attempts")
    
    def _check_token_limits(self, messages: List[Dict[str, str]]):
        """Check if messages approach token limits"""
        total_tokens = sum(self.count_tokens(msg["content"]) for msg in messages)
        model_limit = self.SUPPORTED_MODELS[self.model]
        if total_tokens > model_limit * 0.8:
            self.logger.warning(f"Input tokens ({total_tokens}) approaching limit ({model_limit})")
    
    def _build_api_params(self, messages: List[Dict[str, str]], stream: bool, **kwargs) -> dict:
        """Build API parameters"""
        api_params = {
            "model": self.model,
            "messages": messages,
            "temperature": self.temperature,
            "stream": stream,
            **kwargs
        }
        
        if self.max_tokens:
            api_params["max_tokens"] = self.max_tokens
        
        return api_params

    def generate_with_system(
        self,
        user_message: str,
        system_message: Optional[str] = None,
        stream: bool = False,
        **kwargs
    ) -> Union[str, Iterator[str]]:
        """Generate response with optional system message"""
        if not user_message or not user_message.strip():
            raise OracleValidationError("User message cannot be empty")
        
        messages = []
        if system_message and system_message.strip():
            messages.append({"role": "system", "content": system_message.strip()})
        messages.append({"role": "user", "content": user_message.strip()})
        
        return self.generate(messages, stream=stream, **kwargs)

    def generate_json(
        self,
        messages: Union[List[Message], List[Dict[str, str]], str],
        **kwargs
    ) -> Dict[str, Any]:
        """Generate JSON response with validation"""
        kwargs["response_format"] = {"type": "json_object"}
        response = self.generate(messages, stream=False, **kwargs)
        
        if not response or not response.strip():
            raise OracleAPIError("Empty response received for JSON request")
        
        try:
            parsed_json = json.loads(response)
            if not isinstance(parsed_json, dict):
                raise ValueError("Response is not a JSON object")
            return parsed_json
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {e}")
            self.logger.error(f"Raw response: {response}")
            raise OracleAPIError(f"Invalid JSON response: {e}")

    def count_tokens(self, text: str) -> int:
        """Count tokens with fallback estimation"""
        if not text:
            return 0
        
        try:
            import tiktoken
            try:
                encoding = tiktoken.encoding_for_model(self.model)
            except KeyError:
                encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except ImportError:
            self.logger.warning("tiktoken not available, using estimation")
            return len(text) // 4
        except Exception as e:
            self.logger.warning(f"Token counting failed: {e}, using estimation")
            return len(text) // 4

    def estimate_cost(self, input_tokens: int, output_tokens: int) -> float:
        """Estimate cost with current pricing"""
        if input_tokens < 0 or output_tokens < 0:
            raise OracleValidationError("Token counts must be non-negative")
        
        model_pricing = self.MODEL_PRICING.get(self.model, self.MODEL_PRICING["gpt-4"])
        input_cost = (input_tokens / 1000) * model_pricing["input"]
        output_cost = (output_tokens / 1000) * model_pricing["output"]
        
        return input_cost + output_cost

    def create_conversation(self) -> "Conversation":
        """Create a new conversation instance"""
        return Conversation(self)

    def set_model(self, model: str):
        """Change the model with validation"""
        if model not in self.SUPPORTED_MODELS:
            raise OracleValidationError(f"Unsupported model: {model}")
        self.model = model

    def set_temperature(self, temperature: float):
        """Change temperature with validation"""
        if not 0 <= temperature <= 2:
            raise OracleValidationError("Temperature must be between 0 and 2")
        self.temperature = temperature

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "model": self.model,
            "max_tokens": self.SUPPORTED_MODELS[self.model],
            "pricing": self.MODEL_PRICING.get(self.model, {}),
            "temperature": self.temperature
        }

    def __str__(self) -> str:
        return f"Oracle(model={self.model}, base_url={self.base_url})"


class Conversation:
    """Simplified conversation management"""
    
    def __init__(self, engine: Oracle):
        if not isinstance(engine, Oracle):
            raise OracleValidationError("Engine must be an Oracle instance")
        
        self.engine = engine
        self.messages: List[Dict[str, str]] = []
        self.total_tokens = 0
        self.conversation_id = f"conv_{int(time.time())}"

    def add_system_message(self, content: str):
        """Add system message with validation"""
        if not content or not content.strip():
            raise OracleValidationError("System message content cannot be empty")
        
        # Remove existing system messages to avoid conflicts
        self.messages = [msg for msg in self.messages if msg["role"] != "system"]
        self.messages.insert(0, {"role": "system", "content": content.strip()})

    def add_user_message(self, content: str):
        """Add user message with validation"""
        if not content or not content.strip():
            raise OracleValidationError("User message content cannot be empty")
        
        self.messages.append({"role": "user", "content": content.strip()})

    def add_assistant_message(self, content: str):
        """Add assistant message with validation"""
        if not content or not content.strip():
            raise OracleValidationError("Assistant message content cannot be empty")
        
        self.messages.append({"role": "assistant", "content": content.strip()})

    def generate_response(self, stream: bool = False, **kwargs) -> Union[str, Iterator[str]]:
        """Generate response and update conversation"""
        if not self.messages:
            raise OracleValidationError("No messages in conversation")
        
        response = self.engine.generate(self.messages, stream=stream, **kwargs)
        
        if not stream:
            self.add_assistant_message(response)
            self.total_tokens += self.engine.count_tokens(response)
        
        return response

    def send_message(self, content: str, stream: bool = False, **kwargs) -> Union[str, Iterator[str]]:
        """Send user message and get response"""
        self.add_user_message(content)
        self.total_tokens += self.engine.count_tokens(content)
        return self.generate_response(stream=stream, **kwargs)

    def clear_history(self, keep_system: bool = True):
        """Clear conversation history"""
        if keep_system:
            system_messages = [msg for msg in self.messages if msg["role"] == "system"]
            self.messages = system_messages
        else:
            self.messages = []
        self.total_tokens = 0

    def get_history(self) -> List[Dict[str, str]]:
        """Get conversation history"""
        return self.messages.copy()

    def get_token_count(self) -> int:
        """Get total token count"""
        return self.total_tokens

    def get_message_count(self) -> int:
        """Get total message count"""
        return len(self.messages)

    def save_conversation(self, filepath: str):
        """Save conversation to file"""
        if not filepath:
            raise OracleValidationError("Filepath cannot be empty")
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    "conversation_id": self.conversation_id,
                    "messages": self.messages,
                    "total_tokens": self.total_tokens,
                    "model": self.engine.model,
                    "timestamp": time.time()
                }, f, ensure_ascii=False, indent=2)
        except IOError as e:
            raise OracleError(f"Failed to save conversation: {e}")

    def load_conversation(self, filepath: str):
        """Load conversation from file"""
        if not filepath:
            raise OracleValidationError("Filepath cannot be empty")
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.messages = data["messages"]
                self.total_tokens = data.get("total_tokens", 0)
                self.conversation_id = data.get("conversation_id", f"loaded_{int(time.time())}")
        except (IOError, json.JSONDecodeError, KeyError) as e:
            raise OracleError(f"Failed to load conversation: {e}")

    def __len__(self) -> int:
        return len(self.messages)

    def __str__(self) -> str:
        return f"Conversation(id={self.conversation_id}, messages={len(self.messages)}, tokens={self.total_tokens})"