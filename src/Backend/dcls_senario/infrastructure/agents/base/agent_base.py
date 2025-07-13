from abc import ABC
import logging
import time
from typing import Dict, Any, List, Optional
from datetime import datetime

from domain.interfaces import IAgent, ILLMProvider, AgentStatus, AgentResult, AgentConfig


class BaseAgent(IAgent):
    """Base implementation for all agents following OOP principles"""
    
    def __init__(
        self,
        name: str,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        logger: Optional[logging.Logger] = None
    ):
        self._name = name
        self._llm_provider = llm_provider
        self._config = config
        self._status = AgentStatus.IDLE
        self._logger = logger or self._setup_logger()
        
        # Execution tracking
        self._execution_count = 0
        self._total_tokens_used = 0
        self._total_cost = 0.0
        self._last_execution_time = None
        
        self._logger.info(f"Initialized agent: {self._name}")
    
    def _setup_logger(self) -> logging.Logger:
        """Setup logger for the agent"""
        logger = logging.getLogger(f"{self.__class__.__module__}.{self._name}")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def get_name(self) -> str:
        """Get agent name"""
        return self._name
    
    def get_status(self) -> AgentStatus:
        """Get current agent status"""
        return self._status
    
    def get_capabilities(self) -> List[str]:
        """Get list of agent capabilities - to be overridden by subclasses"""
        return ["basic_execution"]
    
    def validate_input(self, input_data: Any) -> bool:
        """Validate input data - basic validation, override in subclasses"""
        if input_data is None:
            self._logger.error("Input data cannot be None")
            return False
        return True
    
    def get_configuration(self) -> AgentConfig:
        """Get agent configuration"""
        return self._config
    
    def update_configuration(self, config: AgentConfig) -> None:
        """Update agent configuration"""
        self._config = config
        self._logger.info("Agent configuration updated")
    
    def execute(self, input_data: Any, **kwargs) -> AgentResult:
        """Execute agent task with proper error handling and tracking"""
        execution_start = time.time()
        self._status = AgentStatus.PROCESSING
        
        try:
            # Validate input
            if not self.validate_input(input_data):
                raise ValueError("Input validation failed")
            
            # Execute the main logic
            result = self._execute_internal(input_data, **kwargs)
            
            # Update tracking
            execution_time = time.time() - execution_start
            self._execution_count += 1
            self._last_execution_time = execution_time
            
            # Create result object
            agent_result = AgentResult(
                success=True,
                data=result,
                message="Execution completed successfully",
                execution_time=execution_time,
                tokens_used=result.get('tokens_used', 0) if isinstance(result, dict) else 0,
                cost=result.get('cost', 0.0) if isinstance(result, dict) else 0.0,
                metadata={
                    'execution_count': self._execution_count,
                    'agent_name': self._name,
                    'timestamp': datetime.now().isoformat(),
                    **kwargs
                }
            )
            
            # Update totals
            self._total_tokens_used += agent_result.tokens_used
            self._total_cost += agent_result.cost
            
            self._status = AgentStatus.COMPLETED
            self._logger.info(f"Execution completed in {execution_time:.2f}s")
            
            return agent_result
            
        except Exception as e:
            execution_time = time.time() - execution_start
            self._status = AgentStatus.ERROR
            self._logger.error(f"Execution failed: {str(e)}")
            
            return AgentResult(
                success=False,
                data=None,
                message=f"Execution failed: {str(e)}",
                execution_time=execution_time,
                tokens_used=0,
                cost=0.0,
                metadata={
                    'error_type': type(e).__name__,
                    'agent_name': self._name,
                    'timestamp': datetime.now().isoformat(),
                    **kwargs
                }
            )
    
    def _execute_internal(self, input_data: Any, **kwargs) -> Any:
        """Internal execution logic - to be implemented by subclasses"""
        raise NotImplementedError("Subclasses must implement _execute_internal")
    
    def _call_llm(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **llm_kwargs
    ) -> str:
        """Helper method to call LLM with consistent error handling"""
        try:
            if system_message:
                response = self._llm_provider.generate_with_system(
                    user_message=prompt,
                    system_message=system_message,
                    **llm_kwargs
                )
            else:
                response = self._llm_provider.generate(prompt, **llm_kwargs)
            
            return response
            
        except Exception as e:
            self._logger.error(f"LLM call failed: {str(e)}")
            raise
    
    def _call_llm_json(
        self,
        prompt: str,
        system_message: Optional[str] = None,
        **llm_kwargs
    ) -> Dict[str, Any]:
        """Helper method to call LLM and get JSON response"""
        try:
            if system_message:
                messages = [
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ]
            else:
                messages = prompt
            
            response = self._llm_provider.generate_json(messages, **llm_kwargs)
            return response
            
        except Exception as e:
            self._logger.error(f"LLM JSON call failed: {str(e)}")
            raise
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """Get execution statistics"""
        return {
            'execution_count': self._execution_count,
            'total_tokens_used': self._total_tokens_used,
            'total_cost': self._total_cost,
            'last_execution_time': self._last_execution_time,
            'average_execution_time': (
                self._last_execution_time / self._execution_count 
                if self._execution_count > 0 else 0
            )
        }
    
    def reset_stats(self) -> None:
        """Reset execution statistics"""
        self._execution_count = 0
        self._total_tokens_used = 0
        self._total_cost = 0.0
        self._last_execution_time = None
        self._logger.info("Execution statistics reset")


class ConversationalAgent(BaseAgent):
    """Base class for agents that maintain conversation history"""
    
    def __init__(
        self,
        name: str,
        llm_provider: ILLMProvider,
        config: AgentConfig,
        system_message: Optional[str] = None,
        logger: Optional[logging.Logger] = None
    ):
        super().__init__(name, llm_provider, config, logger)
        self._conversation = llm_provider.create_conversation()
        
        if system_message:
            self._conversation.add_system_message(system_message)
    
    def add_system_message(self, message: str) -> None:
        """Add system message to conversation"""
        self._conversation.add_system_message(message)
    
    def send_message(self, message: str, **kwargs) -> str:
        """Send message in conversation context"""
        return self._conversation.send_message(message, **kwargs)
    
    def get_conversation_history(self) -> List[Dict[str, str]]:
        """Get conversation history"""
        return [msg.__dict__ for msg in self._conversation.get_history()]
    
    def clear_conversation(self, keep_system: bool = True) -> None:
        """Clear conversation history"""
        self._conversation.clear_history(keep_system)
        self._logger.info("Conversation history cleared")
    
    def save_conversation(self, filepath: str) -> None:
        """Save conversation to file"""
        self._conversation.save_conversation(filepath)
        self._logger.info(f"Conversation saved to {filepath}")
    
    def load_conversation(self, filepath: str) -> None:
        """Load conversation from file"""
        self._conversation.load_conversation(filepath)
        self._logger.info(f"Conversation loaded from {filepath}")
    
    def get_conversation_token_count(self) -> int:
        """Get token count for current conversation"""
        return self._conversation.get_token_count()


class RetryableAgent(BaseAgent):
    """Agent with built-in retry logic"""
    
    def execute(self, input_data: Any, **kwargs) -> AgentResult:
        """Execute with retry logic"""
        max_retries = kwargs.get('max_retries', self._config.max_retries)
        
        for attempt in range(max_retries + 1):
            result = super().execute(input_data, **kwargs)
            
            if result.success:
                return result
            
            if attempt < max_retries:
                self._logger.warning(f"Attempt {attempt + 1} failed, retrying...")
                time.sleep(2 ** attempt)  # Exponential backoff
            else:
                self._logger.error(f"All {max_retries + 1} attempts failed")
        
        return result


class TimeLimitedAgent(BaseAgent):
    """Agent with execution time limits"""
    
    def execute(self, input_data: Any, **kwargs) -> AgentResult:
        """Execute with time limit"""
        import signal
        
        timeout = kwargs.get('timeout', self._config.timeout)
        
        def timeout_handler(signum, frame):
            raise TimeoutError(f"Execution timed out after {timeout} seconds")
        
        # Set timeout
        if timeout > 0:
            signal.signal(signal.SIGALRM, timeout_handler)
            signal.alarm(timeout)
        
        try:
            result = super().execute(input_data, **kwargs)
            return result
        finally:
            if timeout > 0:
                signal.alarm(0)  # Cancel the alarm