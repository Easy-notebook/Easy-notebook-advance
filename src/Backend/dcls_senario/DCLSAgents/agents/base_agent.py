import json
import re
import os
import logging
import time
from typing import Optional, Dict, Any
from app.utils.oracle import Oracle, OracleError, OracleAPIError, OracleValidationError


class BaseDSLC_Agent:
    def __init__(
        self, 
        name: str,
        system_message: str,
        memory=None,
        llm=None,
        oracle: Optional[Oracle] = None,
        tools=None,
        max_turns=3,
        api_key: Optional[str] = None,
        base_url: str = "https://openkey.cloud/v1",
        model: str = "gpt-4o"
    ):
        self.name = name
        self.system_message_content = system_message
        self.llm = llm  # Keep for backward compatibility
        self.max_turns = max_turns
        self.tools = tools or []
        
        # Initialize conversation history
        self.conversation_history = [{"role": "system", "content": system_message}]
        
        # Initialize Oracle
        self.oracle = self._init_oracle(oracle, api_key, base_url, model)
        
        # Setup logging
        self.setup_logger()
        self.logger.info(f"Initialized {self.name} agent with {'enhanced Oracle' if self.oracle else 'legacy LLM'}")

    def _init_oracle(self, oracle, api_key, base_url, model):
        """Initialize Oracle instance"""
        if oracle is not None:
            return oracle
        
        if Oracle is None:
            return None
        
        try:
            if not api_key:
                api_key = os.getenv("OPENAI_API_KEY", "sk-iLOmdIAzvILZxzlY94AdC46e7bE145089aD6Fe7bAc3e7489")
            
            return Oracle(
                api_key=api_key,
                base_url=base_url,
                model=model,
                temperature=0.7,
                enable_logging=True
            )
        except (OracleError, OracleValidationError) as e:
            logging.error(f"Failed to initialize Oracle: {e}")
            return None

    def setup_logger(self):
        """Setup logging configuration"""
        self.logger = logging.getLogger(self.name)
        self.logger.setLevel(logging.INFO)
        
        if not self.logger.handlers:
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(formatter)
            
            self.logger.addHandler(console_handler)
            self.logger.info(f"Logger setup completed for {self.name}")

    def get_memory_token(self):
        """Get estimated token count for conversation history"""
        if self.oracle:
            return sum(self.oracle.count_tokens(msg.get("content", "")) for msg in self.conversation_history)
        else:
            # Simple estimation: 4 characters ≈ 1 token
            total_chars = sum(len(msg.get("content", "")) for msg in self.conversation_history)
            return total_chars // 4

    def get_recent_k_conversations(self):
        """Get recent k conversation turns"""
        system_msgs = [msg for msg in self.conversation_history if msg["role"] == "system"]
        other_msgs = [msg for msg in self.conversation_history if msg["role"] != "system"]
        return system_msgs + other_msgs[-self.max_turns*2:]  # user+assistant = 2 messages per turn

    def execute(self, input_data):
        """Execute Agent task with full conversation history"""
        try:
            if not self.oracle:
                self.logger.error("No LLM provider available")
                return "Error: No LLM provider available"
            
            self.conversation_history.append({"role": "user", "content": input_data})
            response = self.oracle.generate(self.conversation_history)
            self.conversation_history.append({"role": "assistant", "content": response})
            
            self.logger.info("Execution completed successfully")
            return response
        except Exception as e:
            self.logger.error(f"Error during execution: {str(e)}")
            raise
    
    def execute2(self, input_data):
        """Execute Agent task with controlled conversation turns"""
        try:
            if not self.oracle:
                self.logger.error("No LLM provider available")
                return "Error: No LLM provider available"
            
            self.conversation_history.append({"role": "user", "content": input_data})
            recent_messages = self.get_recent_k_conversations()
            response = self.oracle.generate(recent_messages)
            self.conversation_history.append({"role": "assistant", "content": response})
            
            self.logger.info("Execution with controlled turns completed successfully")
            return response
        except Exception as e:
            self.logger.error(f"Error during controlled execution: {str(e)}")
            raise
    
    def chat_with_memory(self, prompt: str, memory=None, stream_output: bool = False):
        """Chat with memory, optionally with streaming output"""
        try:
            if not self.oracle:
                self.logger.error("No Oracle available for chat with memory")
                return "Error: No LLM provider available", self
            
            self.conversation_history.append({"role": "user", "content": prompt})
            response = self.oracle.generate(self.conversation_history, stream=stream_output)
            
            if stream_output:
                full_response = self._handle_streaming_response(response)
                response = full_response
            
            self.conversation_history.append({"role": "assistant", "content": response})
            return response, self
        except Exception as e:
            self.logger.error(f"Error during chat with memory: {str(e)}")
            raise

    def _handle_streaming_response(self, response):
        """Handle streaming response"""
        full_response = ""
        for chunk in response:
            full_response += chunk
            print(chunk, end="", flush=True)
        return full_response

    def chat_without_memory(self, prompt: str, system_setting: str = None, stream_output: bool = False):
        """Chat without memory, optionally with streaming output"""
        if self.oracle:
            try:
                return self._chat_without_memory_oracle(prompt, system_setting, stream_output)
            except (OracleError, OracleAPIError) as e:
                self.logger.warning(f"Oracle failed, falling back to legacy LLM: {e}")

        # Legacy implementation with retry logic
        return self._chat_legacy_with_retry(prompt, system_setting, stream_output)

    def _chat_without_memory_oracle(self, prompt: str, system_setting: str = None, stream_output: bool = False):
        """Use Oracle for chat without memory"""
        try:
            # Check for long context and switch model if needed
            self._check_and_switch_long_context_model(prompt, system_setting)
            
            if system_setting:
                response = self.oracle.generate_with_system(
                    user_message=prompt,
                    system_message=system_setting,
                    stream=stream_output
                )
            else:
                response = self.oracle.generate(prompt, stream=stream_output)
            
            if stream_output:
                return self._handle_streaming_response(response)
            return response
        except Exception as e:
            self.logger.error(f"Error in Oracle chat without memory: {str(e)}")
            raise OracleError(f"Oracle conversation failed: {e}")

    def _check_and_switch_long_context_model(self, prompt: str, system_setting: str = None):
        """Check prompt length and switch to long context model if necessary"""
        full_prompt = f"System: {system_setting}\n\nUser: {prompt}" if system_setting else prompt
        total_prompt_length = len(full_prompt)
        
        if total_prompt_length > 120000:
            self.logger.warning(f"Prompt length ({total_prompt_length}) exceeds 120000 characters.")
            
            if self.oracle and hasattr(self.oracle, 'set_model'):
                current_model = self.oracle.model
                if current_model not in ["gpt-4-turbo", "gpt-4o", "gpt-4o-mini"]:
                    try:
                        self.oracle.set_model("gpt-4-turbo")
                        self.logger.info(f"Switched from {current_model} to gpt-4-turbo for long context")
                    except Exception as e:
                        self.logger.warning(f"Failed to switch to long context model: {e}")

    def _chat_legacy_with_retry(self, prompt: str, system_setting: str = None, stream_output: bool = False):
        """Legacy implementation with retry logic"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                full_prompt = self._build_legacy_prompt(prompt, system_setting)
                
                if not self.oracle:
                    raise Exception("No Oracle available for chat")
                
                response = self.oracle.generate(full_prompt)
                return response
                
            except Exception as e:
                if "无效的令牌" in str(e):
                    if attempt == max_retries - 1:
                        self.logger.error(f"Authentication failed after {max_retries} attempts: {str(e)}")
                        raise
                    else:
                        self.logger.warning(f"Token error on attempt {attempt + 1}, retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)
                        continue
                else:
                    raise

    def _build_legacy_prompt(self, prompt: str, system_setting: str = None):
        """Build prompt for legacy implementation"""
        if system_setting:
            full_prompt = f"System: {system_setting}\n\nUser: {prompt}"
        else:
            full_prompt = prompt
        
        # Check prompt length and switch to long context model if necessary
        total_prompt_length = len(full_prompt)
        if total_prompt_length > 120000:
            try:
                with open("debug.log", "w", encoding="utf-8") as debug_log:
                    debug_log.write("Prompt content before processing:\n")
                    debug_log.write(repr(full_prompt))
            except Exception as e:
                self.logger.error(f"Error writing prompt debug info to debug.log: {e}")
            
            self.logger.warning("Prompt length exceeds 120000 characters.")
            
            # Switch to long context model if Oracle is available
            if self.oracle and hasattr(self.oracle, 'set_model'):
                current_model = self.oracle.model
                if current_model not in ["gpt-4-turbo", "gpt-4o", "gpt-4o-mini"]:
                    try:
                        self.oracle.set_model("gpt-4-turbo")
                        self.logger.info(f"Switched from {current_model} to gpt-4-turbo for long context")
                    except Exception as e:
                        self.logger.warning(f"Failed to switch to long context model: {e}")
        
        return full_prompt
    
    def parse_llm_json(self, response):
        """Parse JSON data from LLM response using regex"""
        try:
            code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
            if code_match:
                json_str = code_match.group(1).strip()
                return json.loads(json_str)
            return f"未找到JSON数据，原始响应: {response}"
        except json.JSONDecodeError as e:
            return f"JSON解析错误: {str(e)}，原始响应: {response}"

    def generate_json_response(self, prompt: str, system_setting: str = None) -> Dict[str, Any]:
        """Generate JSON response using Oracle"""
        if self.oracle:
            try:
                if system_setting:
                    messages = [
                        {"role": "system", "content": system_setting},
                        {"role": "user", "content": prompt}
                    ]
                    return self.oracle.generate_json(messages)
                else:
                    return self.oracle.generate_json(prompt)
            except (OracleError, OracleAPIError) as e:
                self.logger.warning(f"Oracle JSON generation failed: {e}")
                
        # Fallback: generate text response and parse JSON
        text_response = self.chat_without_memory(prompt, system_setting)
        return self.parse_llm_json(text_response)

    def get_token_usage_info(self) -> Dict[str, Any]:
        """Get Oracle token usage information"""
        if self.oracle:
            return self.oracle.get_model_info()
        return {"message": "Oracle not available, using legacy LLM"}

    def estimate_request_cost(self, text: str) -> float:
        """Estimate request cost"""
        if self.oracle:
            try:
                input_tokens = self.oracle.count_tokens(text)
                # Estimate output tokens as 25% of input
                output_tokens = int(input_tokens * 0.25)
                return self.oracle.estimate_cost(input_tokens, output_tokens)
            except Exception as e:
                self.logger.warning(f"Cost estimation failed: {e}")
        return 0.0
    
    def save_history_to_txt(self, filepath):
        """Save conversation history to text file, excluding SystemMessage"""
        filtered_messages = [
            msg for msg in self.conversation_history 
            if msg["role"] != "system"
        ]
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(filtered_messages, f, ensure_ascii=False, indent=4)
            return f"对话历史已保存到 {filepath}"
        except Exception as e:
            return f"保存失败: {str(e)}"

    def load_history_from_txt(self, filepath):
        """Load conversation history from text file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                loaded_messages = json.load(f)
            
            # Clear existing history (keep system messages)
            system_msgs = [msg for msg in self.conversation_history if msg["role"] == "system"]
            self.conversation_history = system_msgs
            
            # Load historical messages
            for msg in loaded_messages:
                if self._is_valid_message(msg):
                    self.conversation_history.append(self._normalize_message(msg))
            
            return f"历史对话已从 {filepath} 加载"
        except Exception as e:
            return f"加载失败: {str(e)}"

    def _is_valid_message(self, msg):
        """Check if message is valid"""
        if isinstance(msg, dict):
            # New format
            if "role" in msg and "content" in msg:
                return msg["role"] in ["user", "assistant"]
            # Old format compatibility
            if "type" in msg and "content" in msg:
                return msg["type"] in ["HumanMessage", "AIMessage"]
        return False

    def _normalize_message(self, msg):
        """Normalize message to standard format"""
        if "role" in msg:
            return msg
        elif "type" in msg:
            # Convert old format to new format
            if msg["type"] == "HumanMessage":
                return {"role": "user", "content": msg["content"]}
            elif msg["type"] == "AIMessage":
                return {"role": "assistant", "content": msg["content"]}
        return msg