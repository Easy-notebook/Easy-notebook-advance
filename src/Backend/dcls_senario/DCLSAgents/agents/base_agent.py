from langchain_core.messages import SystemMessage, HumanMessage,AIMessage
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain
from langchain_openai import ChatOpenAI
import json
import re
from DCLSAgents.tools import *
import os
import logging
import time
import openai

class BaseDSLC_Agent():
    def __init__(
        self, 
        name: str,
        system_message: str,
        memory=None,
        llm=None,
        tools=None,
        max_turns=3
    ):
        self.name = name
        self.memory = memory or ConversationBufferMemory()
        self.llm = llm
        self.max_turns = max_turns
        
        self.system_message = SystemMessage(content=system_message)
        self.memory.chat_memory.add_message(self.system_message)
        
        self.tools = tools or []
        self.conversation = ConversationChain(
            llm=self.llm,
            memory=self.memory,
            verbose=False
        )
        
        # 设置日志
        self.setup_logger()
        self.logger.info(f"Initialized {self.name} agent")

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
        buffer = self.memory.chat_memory.messages
        num_tokens = self.llm.get_num_tokens_from_messages(buffer)
        return num_tokens

    def get_recent_k_conversations(self):
        """获取最近 k 轮对话"""
        return self.memory.chat_memory.messages[-self.max_turns:]  # 只获取最后 k 轮对话

    def execute(self, input_data):
        """执行Agent的任务，并通过 SystemMessage 和 HumanMessage 调用 LLM 生成响应"""
        #self.logger.info(f"Executing with input: {input_data[:100]}...")
        try:
            human_message = HumanMessage(content=input_data)
            ai_response = self.conversation.predict(input=human_message.content)
            self.logger.info(f"Execution completed successfully")
            return ai_response
        except Exception as e:
            self.logger.error(f"Error during execution: {str(e)}")
            raise
    
    def execute2(self, input_data):
        """执行Agent的任务，控制传递的对话轮次"""
        #self.logger.info(f"Executing with controlled turns, input: {input_data[:100]}...")
        try:
            human_message = HumanMessage(content=input_data)
            self.memory.chat_memory.add_message(human_message)
            recent_messages = self.get_recent_k_conversations()

            prompt = ChatPromptTemplate.from_messages(recent_messages)
            chain = LLMChain(llm=self.llm, prompt=prompt, verbose=True)

            ai_response = chain.run(input_data=input_data)
            self.memory.chat_memory.add_message(AIMessage(content=ai_response))
            self.logger.info("Execution with controlled turns completed successfully")
            return ai_response
        except Exception as e:
            self.logger.error(f"Error during controlled execution: {str(e)}")
            raise
    
    def chat_with_memory(self, prompt: str, memory: ConversationBufferMemory, stream_output: bool = False):
        """使用记忆进行对话，可选择是否使用流式输出
        
        Args:
            prompt: 输入的提示词
            memory: 对话记忆
            stream_output: 是否使用流式输出，默认为 False
        """
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                if not any(isinstance(msg, SystemMessage) for msg in memory.chat_memory.messages):
                    memory.chat_memory.add_message(self.system_message)
                memory.chat_memory.add_message(HumanMessage(content=prompt))
                chat_prompt = ChatPromptTemplate.from_messages(memory.chat_memory.messages)
                chain = chat_prompt | self.llm
                
                if stream_output:
                    # 使用流式输出
                    full_response = ""
                    for chunk in chain.stream({}):
                        if hasattr(chunk, 'content'):
                            chunk_content = chunk.content
                        else:
                            chunk_content = chunk
                        full_response += chunk_content
                        print(chunk_content, end="", flush=True)
                else:
                    # 使用普通输出
                    response = chain.invoke({})
                    full_response = response.content
                
                # 将完整响应添加到记忆中
                memory.chat_memory.add_message(AIMessage(content=full_response))
                return full_response, memory
                
            except openai.AuthenticationError as e:
                if "无效的令牌" in str(e):
                    if attempt == max_retries - 1:  # 最后一次尝试
                        self.logger.error(f"Authentication failed after {max_retries} attempts: {str(e)}")
                        raise
                    else:
                        self.logger.warning(f"Token error on attempt {attempt + 1}, retrying in {retry_delay} seconds...")
                        if memory.chat_memory.messages:
                            memory.chat_memory.messages.pop()
                        time.sleep(retry_delay)
                        continue
                else:
                    raise
                    
            except Exception as e:
                self.logger.error(f"Error during chat with memory: {str(e)}")
                raise

    def chat_without_memory(self,prompt: str, system_setting: str=None,  stream_output: bool = False):
        """不使用记忆进行对话，可选择是否使用流式输出
        
        Args:
            prompt: 输入的提示词
            stream_output: 是否使用流式输出，默认为 False
        """
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                # 创建临时的对话消息列表
                if system_setting:
                    messages = [SystemMessage(content=system_setting), HumanMessage(content=prompt)]
                else:
                    messages = [HumanMessage(content=prompt)]
                chat_prompt = ChatPromptTemplate.from_messages(messages)
                chain = chat_prompt | self.llm
                total_prompt_length = sum(len(message.content) for message in messages)
                if total_prompt_length > 120000:
                    try:
                        with open("debug.log", "w", encoding="utf-8") as debug_log:
                            debug_log.write("Chain content before reassigning:\n")
                            debug_log.write(repr(chain))
                    except Exception as e:
                        self.logger.error(f"Error writing chain debug info to debug.log: {e}")
                    self.logger.warning("Prompt length exceeds 120000 characters.")
                    chain = chat_prompt | ChatOpenAI(
                                            api_key="sk-iLOmdIAzvILZxzlY94AdC46e7bE145089aD6Fe7bAc3e7489",
                                            base_url="https://openkey.cloud/v1",
                                            model="o4-mini",
                                            temperature=1
                                        )
                                                            
                if stream_output:
                    # 使用流式输出
                    full_response = ""
                    for chunk in chain.stream({}):
                        if hasattr(chunk, 'content'):
                            chunk_content = chunk.content
                        else:
                            chunk_content = chunk
                        full_response += chunk_content
                        print(chunk_content, end="", flush=True)
                else:
                    response = chain.invoke({})
                    full_response = response.content
                
                return full_response
                
            except openai.AuthenticationError as e:
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
    
    def save_history_to_txt(self, filepath):
        """保存历史对话到文本文件，排除 SystemMessage"""
        messages = self.memory.chat_memory.messages
        filtered_messages = [
            {"type": type(msg).__name__, "content": msg.content}
            for msg in messages if not isinstance(msg, SystemMessage)
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
            for msg in loaded_messages:
                if msg["type"] == "HumanMessage":
                    self.memory.chat_memory.add_message(HumanMessage(content=msg["content"]))
                elif msg["type"] == "AIMessage":
                    self.memory.chat_memory.add_message(AIMessage(content=msg["content"]))
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
            
            debug_tool = DebugTool(llm=self.llm)
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
        from tools import UnitTestTool
        
        test_tool = UnitTestTool()
        results = test_tool.run(tool_input={
            "phase": "数据清理",
            "data_path": cleaned_data_path,
            "original_data_path": original_data_path
        })
        
        return results["all_passed"], results["report"]