import json
import re
import os
import logging
import time
from typing import Optional, Union, List, Dict, Any

# Import tools without LangChain
try:
    from DCLSAgents.tools import ImageToTextTool, UnitTestTool, DebugTool
except ImportError:
    # If tools import fails, define dummy classes
    class ImageToTextTool:
        def __init__(self, *args, **kwargs):
            pass
        def run(self, tool_input):
            return "ImageToTextTool not available"
    
    class UnitTestTool:
        def __init__(self, *args, **kwargs):
            pass
        def run(self, tool_input):
            return {"status": "error", "message": "UnitTestTool not available"}
    
    class DebugTool:
        def __init__(self, *args, **kwargs):
            pass
        def run(self, tool_input):
            return {"status": "error", "message": "DebugTool not available"}

# Import the enhanced Oracle class
try:
    from app.utils.oracle import Oracle, OracleError, OracleAPIError, OracleValidationError
except ImportError:
    # Fallback for different import paths
    try:
        import sys
        import os
        sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'utils'))
        from oracle import Oracle, OracleError, OracleAPIError, OracleValidationError
    except ImportError:
        # If Oracle is not available, define dummy classes
        class OracleError(Exception):
            pass
        class OracleAPIError(OracleError):
            pass
        class OracleValidationError(OracleError):
            pass
        Oracle = None

class BaseDSLC_Agent():
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
        
        # Initialize conversation history (replacing LangChain memory)
        self.conversation_history = []
        self.conversation_history.append({
            "role": "system",
            "content": system_message
        })
        
        # Initialize Oracle if not provided and Oracle class is available
        if oracle is None and Oracle is not None:
            try:
                # Use provided API key or fallback to default/environment
                if not api_key:
                    api_key = os.getenv("OPENAI_API_KEY", "sk-iLOmdIAzvILZxzlY94AdC46e7bE145089aD6Fe7bAc3e7489")
                
                self.oracle = Oracle(
                    api_key=api_key,
                    base_url=base_url,
                    model=model,
                    temperature=0.7,
                    enable_logging=True
                )
            except (OracleError, OracleValidationError) as e:
                logging.error(f"Failed to initialize Oracle: {e}")
                # Fallback to original LLM if Oracle fails
                self.oracle = None
        else:
            self.oracle = oracle if Oracle is not None else None
        
        self.tools = tools or []
        
        # 设置日志
        self.setup_logger()
        self.logger.info(f"Initialized {self.name} agent with {'enhanced Oracle' if self.oracle else 'legacy LLM'}")

    def setup_logger(self):
        """设置日志记录器"""
        # 配置日志记录器
        self.logger = logging.getLogger(self.name)
        self.logger.setLevel(logging.INFO)
        
        # 检查是否已经有处理器，如果有则不添加新的
        if not self.logger.handlers:
            # 控制台处理器
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            
            # 设置格式
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            console_handler.setFormatter(formatter)
            
            # 添加处理器
            self.logger.addHandler(console_handler)
            
            self.logger.info(f"Logger setup completed for {self.name}")

    def get_memory_token(self):
        """获取对话历史的token数量估算"""
        if self.oracle:
            total_tokens = 0
            for msg in self.conversation_history:
                total_tokens += self.oracle.count_tokens(msg.get("content", ""))
            return total_tokens
        else:
            # 简单估算：4个字符约等于1个token
            total_chars = sum(len(msg.get("content", "")) for msg in self.conversation_history)
            return total_chars // 4

    def get_recent_k_conversations(self):
        """获取最近 k 轮对话"""
        # 保留系统消息，然后取最近的对话轮次
        system_msgs = [msg for msg in self.conversation_history if msg["role"] == "system"]
        other_msgs = [msg for msg in self.conversation_history if msg["role"] != "system"]
        return system_msgs + other_msgs[-self.max_turns*2:]  # user+assistant = 2条消息为1轮

    def execute(self, input_data):
        """执行Agent的任务"""
        try:
            if self.oracle:
                # 使用Oracle执行
                self.conversation_history.append({"role": "user", "content": input_data})
                response = self.oracle.generate(self.conversation_history)
                self.conversation_history.append({"role": "assistant", "content": response})
                self.logger.info("Execution completed successfully")
                return response
            else:
                # 回退方案：如果没有Oracle和LLM，返回错误
                self.logger.error("No LLM provider available")
                return "Error: No LLM provider available"
        except Exception as e:
            self.logger.error(f"Error during execution: {str(e)}")
            raise
    
    def execute2(self, input_data):
        """执行Agent的任务，控制传递的对话轮次"""
        try:
            if self.oracle:
                # 添加用户消息
                self.conversation_history.append({"role": "user", "content": input_data})
                
                # 获取最近的对话
                recent_messages = self.get_recent_k_conversations()
                
                # 使用Oracle生成响应
                response = self.oracle.generate(recent_messages)
                
                # 添加助手响应
                self.conversation_history.append({"role": "assistant", "content": response})
                
                self.logger.info("Execution with controlled turns completed successfully")
                return response
            else:
                self.logger.error("No LLM provider available")
                return "Error: No LLM provider available"
        except Exception as e:
            self.logger.error(f"Error during controlled execution: {str(e)}")
            raise
    
    def chat_with_memory(self, prompt: str, memory=None, stream_output: bool = False):
        """使用记忆进行对话，可选择是否使用流式输出
        
        Args:
            prompt: 输入的提示词
            memory: 对话记忆（忽略，使用内部历史）
            stream_output: 是否使用流式输出，默认为 False
        """
        try:
            if self.oracle:
                # 使用内部对话历史
                self.conversation_history.append({"role": "user", "content": prompt})
                
                # 使用Oracle生成响应
                response = self.oracle.generate(self.conversation_history, stream=stream_output)
                
                if stream_output:
                    # Handle streaming response
                    full_response = ""
                    for chunk in response:
                        full_response += chunk
                        print(chunk, end="", flush=True)
                    response = full_response
                
                # 添加响应到历史
                self.conversation_history.append({"role": "assistant", "content": response})
                
                # 为了兼容性，返回(response, self)
                return response, self
            else:
                self.logger.error("No Oracle available for chat with memory")
                return "Error: No LLM provider available", self
                
        except Exception as e:
            self.logger.error(f"Error during chat with memory: {str(e)}")
            raise

    def chat_without_memory(self, prompt: str, system_setting: str=None, stream_output: bool = False):
        """不使用记忆进行对话，可选择是否使用流式输出
        
        Args:
            prompt: 输入的提示词
            system_setting: 系统设置消息
            stream_output: 是否使用流式输出，默认为 False
        """
        # Try using Oracle first if available
        if self.oracle:
            try:
                return self._chat_without_memory_oracle(prompt, system_setting, stream_output)
            except (OracleError, OracleAPIError) as e:
                self.logger.warning(f"Oracle failed, falling back to legacy LLM: {e}")
                # Fall through to legacy implementation
        
        # Legacy implementation
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                # Use direct Oracle API without langchain
                if system_setting:
                    full_prompt = f"System: {system_setting}\n\nUser: {prompt}"
                else:
                    full_prompt = prompt
                
                # Use Oracle directly for chat without memory
                if self.oracle:
                    response = self.oracle.chat(full_prompt)
                    return response
                
                # Fallback error if no Oracle available
                raise Exception("No Oracle available for chat")
                
                total_prompt_length = len(full_prompt)
                if total_prompt_length > 120000:
                    try:
                        with open("debug.log", "w", encoding="utf-8") as debug_log:
                            debug_log.write("Prompt content before processing:\n")
                            debug_log.write(repr(full_prompt))
                    except Exception as e:
                        self.logger.error(f"Error writing prompt debug info to debug.log: {e}")
                    self.logger.warning("Prompt length exceeds 120000 characters.")
                
                # This should not be reached since Oracle should handle the request above
                self.logger.error("Reached unreachable code in chat_without_memory")
                return "Error: Unable to process request"
                
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
                    
            except Exception as e:
                self.logger.error(f"Error during chat without memory: {str(e)}")
                raise

    def _chat_without_memory_oracle(self, prompt: str, system_setting: str=None, stream_output: bool = False):
        """使用Oracle进行无记忆对话"""
        try:
            # Use Oracle's generate_with_system method for cleaner implementation
            if system_setting:
                response = self.oracle.generate_with_system(
                    user_message=prompt,
                    system_message=system_setting,
                    stream=stream_output
                )
            else:
                response = self.oracle.generate(prompt, stream=stream_output)
            
            if stream_output:
                # Handle streaming response
                full_response = ""
                for chunk in response:
                    full_response += chunk
                    print(chunk, end="", flush=True)
                return full_response
            else:
                return response
                
        except Exception as e:
            self.logger.error(f"Error in Oracle chat without memory: {str(e)}")
            raise OracleError(f"Oracle conversation failed: {e}")
    
    def parse_llm_json(self, response):
        """
        使用正则表达式解析 LLM 返回的响应中的 JSON 数据。
        """
        try:
            code_match = re.search(r"```json\n(.*?)\n```", response, re.DOTALL)
            if code_match:
                json_str = code_match.group(1).strip()
                return json.loads(json_str)
            return f"未找到JSON数据，原始响应: {response}"
        except json.JSONDecodeError as e:
            return f"JSON解析错误: {str(e)}，原始响应: {response}"

    def generate_json_response(self, prompt: str, system_setting: str = None) -> Dict[str, Any]:
        """使用Oracle生成JSON响应
        
        Args:
            prompt: 输入提示词
            system_setting: 系统设置消息
            
        Returns:
            解析后的JSON字典
        """
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
                # Fall back to text parsing
                
        # Fallback: generate text response and parse JSON
        text_response = self.chat_without_memory(prompt, system_setting)
        return self.parse_llm_json(text_response)

    def get_token_usage_info(self) -> Dict[str, Any]:
        """获取Oracle的token使用信息"""
        if self.oracle:
            return self.oracle.get_model_info()
        return {"message": "Oracle not available, using legacy LLM"}

    def estimate_request_cost(self, text: str) -> float:
        """估算请求成本"""
        if self.oracle:
            try:
                input_tokens = self.oracle.count_tokens(text)
                # Estimate output tokens as 25% of input (rough estimation)
                output_tokens = int(input_tokens * 0.25)
                return self.oracle.estimate_cost(input_tokens, output_tokens)
            except Exception as e:
                self.logger.warning(f"Cost estimation failed: {e}")
        return 0.0

    def create_oracle_conversation(self) -> Optional['Conversation']:
        """创建Oracle对话实例"""
        if self.oracle:
            return self.oracle.create_conversation()
        return None
    
    def save_history_to_txt(self, filepath):
        """保存历史对话到文本文件，排除 SystemMessage"""
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
        """从文本文件加载历史对话到 Agent"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                loaded_messages = json.load(f)
            
            # 清除现有历史（保留系统消息）
            system_msgs = [msg for msg in self.conversation_history if msg["role"] == "system"]
            self.conversation_history = system_msgs
            
            # 加载历史消息
            for msg in loaded_messages:
                if isinstance(msg, dict) and "role" in msg and "content" in msg:
                    if msg["role"] in ["user", "assistant"]:
                        self.conversation_history.append(msg)
                elif isinstance(msg, dict) and "type" in msg and "content" in msg:
                    # 兼容旧格式
                    if msg["type"] == "HumanMessage":
                        self.conversation_history.append({"role": "user", "content": msg["content"]})
                    elif msg["type"] == "AIMessage":
                        self.conversation_history.append({"role": "assistant", "content": msg["content"]})
            
            return f"历史对话已从 {filepath} 加载"
        except Exception as e:
            return f"加载失败: {str(e)}"
        
    def execute_generated_code(self, generated_code: str, save_path: str = None, is_debug: bool = False, retry_count: int = 0, max_retries: int = 3) -> str:
        """执行LLM生成的Python代码
        
        Args:
            generated_code: 生成的代码字符串
            save_path: 保存代码的路径
            is_debug: 是否为调试模式
            retry_count: 当前重试次数
            max_retries: 最大重试次数
        """
        self.logger.info(f"Executing generated code{' (debug mode)' if is_debug else ''} - Attempt {retry_count + 1}/{max_retries}")
        
        if retry_count >= max_retries:
            self.logger.warning(f"Reached maximum retry attempts ({max_retries})")
            return "代码执行失败，已达到最大重试次数，需要重新生成代码。"
            
        code_match = re.search(r"```python\n(.*?)\n```", generated_code, re.DOTALL)
        if not code_match:
            self.logger.error("Failed to extract code from generated text")
            return "无法提取生成的代码，请检查代码格式。"
        
        extracted_code = code_match.group(1)
        
        if not is_debug:
            path_setup_code = '''import matplotlib.pyplot as plt
import matplotlib as mpl
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False
'''
            extracted_code = path_setup_code + extracted_code
        
        output = []
        original_print = print
        def capture_print(*args, **kwargs):
            output.append(' '.join(map(str, args)))
        
        try:
            globals()['print'] = capture_print
            exec(extracted_code, globals())
            globals()['print'] = original_print
            
            execution_output = '\n'.join(output)
            if 'result' in globals() and globals()['result'] is not None:
                result = str(globals()['result'])
            elif execution_output:
                result = execution_output
            else:
                result = "代码执行成功，但没有输出结果"
            
            if save_path:
                os.makedirs(os.path.dirname(save_path), exist_ok=True)
                # 如果是debug模式，保存修复后的代码；否则保存原始代码
                code_to_save = extracted_code if is_debug else code_match.group(1)
                with open(save_path, 'w', encoding='utf-8') as f:
                    f.write(code_to_save)
                self.logger.info(f"Successful code saved to {save_path}")
            
            self.logger.info("Code execution completed successfully")
            return result
            
        except Exception as e:
            globals()['print'] = original_print
            self.logger.error(f"Error during code execution: {str(e)}")
            import sys
            import traceback
            exc_type, exc_value, exc_traceback = sys.exc_info()
            tb = traceback.extract_tb(exc_traceback)
            
            error_info = []
            code_lines = extracted_code.splitlines()
            
            for frame in tb:
                if frame.filename == '<string>':
                    line_no = frame.lineno
                    if 1 <= line_no <= len(code_lines):
                        state = code_lines[line_no-1].strip()
                        error_info.append(f"第{line_no}行: {state}")
            
            if error_info:
                error_message = f"error_message: {str(e)}\n错误位置:\n" + "\n调用: ".join(error_info)
            else:
                error_message = str(e)
                
            output_message = '\n'.join(output)
            
            debug_tool = DebugTool(oracle=self.oracle)
            print(extracted_code)
            print(error_message)
            debug_result = debug_tool.run(tool_input={
                "code": extracted_code,
                "error_message": error_message,
                "output_message": output_message,
                "tools_description": "代码调试工具"
            })
            
            if debug_result["status"] == "need_help":
                return f"代码执行失败，需要人工帮助调试。error_message: {error_message}"
            elif debug_result["status"] == "success":
                # 递归尝试执行修复后的代码，增加重试计数
                return self.execute_generated_code(
                    f"```python\n{debug_result['fixed_code']}\n```",
                    save_path,
                    is_debug=True,
                    retry_count=retry_count + 1,
                    max_retries=max_retries
                )
            else:
                return f"代码执行失败: {error_message}\n调试失败: {debug_result['message']}"
            
    def run_unit_tests(self, cleaned_data_path: str, original_data_path: str = None) -> str:
        """
        运行数据清理阶段的单元测试
        
        Args:
            cleaned_data_path: 清理后的数据文件路径
            original_data_path: 原始数据文件路径(可选)
        
        Returns:
            Tuple[bool, str]: (是否全部通过, 测试报告)
        """
        try:
            test_tool = UnitTestTool()
            results = test_tool.run(tool_input={
                "phase": "数据清理",
                "data_path": cleaned_data_path,
                "original_data_path": original_data_path
            })
            
            return results["all_passed"], results["report"]
        except Exception as e:
            self.logger.error(f"Unit test execution failed: {e}")
            return False, f"单元测试执行失败: {str(e)}"