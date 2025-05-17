from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.base_language import BaseLanguageModel
import re
from typing import Dict, List, Optional, Union
from DCLSAgents.prompts.debug_prompts import (
    DEBUG_TEMPLATE,
    DEBUG_LOCATE_TEMPLATE,
    DEBUG_FIX_TEMPLATE, 
    DEBUG_MERGE_TEMPLATE,
    DEBUG_ASK_FOR_HELP_TEMPLATE,
    DEBUG_TEST_LOCATE_TEMPLATE,
    DEBUG_TEST_FIX_TEMPLATE,
    DEBUG_TEST_MERGE_TEMPLATE
)
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate
from langchain.schema import AIMessage, HumanMessage, SystemMessage

class DebugInput(BaseModel):
    """输入参数模型"""
    code: str = Field(..., description="需要调试的代码")
    error_message: str = Field(..., description="error_message")
    output_message: str = Field("", description="代码输出信息(可选)")
    tools_description: str = Field("", description="工具描述(可选)")
    is_test_error: bool = Field(False, description="是否为测试错误")
    test_info: str = Field("", description="测试相关信息")

class DebugTool(BaseTool):
    name: str = "debug"
    description: str = "调试代码错误的工具"
    args_schema: type[BaseModel] = DebugInput
    
    llm: BaseLanguageModel = Field(description="Language Model to use")
    all_error_messages: List[str] = Field(default_factory=list, description="存储所有error_message的列表")
    memory: ConversationBufferMemory = Field(default_factory=lambda: ConversationBufferMemory(), description="对话记忆")
    
    def __init__(self, llm: BaseLanguageModel):
        """初始化工具"""
        super().__init__(llm=llm)
        if not llm:
            raise ValueError("必须提供 LLM 实例")
        self.memory = ConversationBufferMemory()
        # 添加系统消息
        system_message = SystemMessage(content="你是一个专业的代码调试助手，擅长分析和修复代码错误。请帮助用户定位和解决代码中的问题。")
        self.memory.chat_memory.add_message(system_message)
            
    def _chat_with_memory(self, prompt: str) -> str:
        """使用记忆进行对话"""
        self.memory.chat_memory.add_message(HumanMessage(content=prompt))
        chat_prompt = ChatPromptTemplate.from_messages(self.memory.chat_memory.messages)
        chain = chat_prompt | self.llm
        response = chain.invoke({})
        reply = response.content
        self.memory.chat_memory.add_message(AIMessage(content=reply))
        return reply

    def _locate_error(self, wrong_code: str, error_messages: str, output_messages: str) -> str:
        """定位错误"""
        prompt = DEBUG_LOCATE_TEMPLATE.format(
            wrong_code=wrong_code,
            error_messages=error_messages,
            output_messages=output_messages,
        )
        prompt = DEBUG_TEMPLATE + prompt
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)
        
    def _fix_error(self, error_code: str, error_messages: str, output_messages: str) -> str:
        """修复错误"""
        prompt = DEBUG_FIX_TEMPLATE.format(
            most_relevant_code_snippet=error_code,
            error_messages=error_messages,
            output_messages=output_messages,
        )
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)

    def _merge_code(self, wrong_code: str, error_snippet: str, fixed_snippet: str) -> str:
        """合并修复的代码"""
        prompt = DEBUG_MERGE_TEMPLATE.format(
            wrong_code=wrong_code,
            most_relevant_code_snippet=error_snippet,
            code_snippet_after_correction=fixed_snippet
        )
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)

    def _check_need_help(self, error_message: str) -> bool:
        """检查是否需要请求帮助"""
        self.all_error_messages.append(error_message)
        if len(self.all_error_messages) >= 3:
            prompt = DEBUG_ASK_FOR_HELP_TEMPLATE.format(
                i=len(self.all_error_messages),
                all_error_messages="\n".join(self.all_error_messages)
            )
            response = self._chat_with_memory(prompt)
            return "<HELP>" in response
        return False

    def _extract_code(self, text: str) -> str:
        """从文本中提取代码块"""
        pattern = r"```python\n(.*?)\n```"
        matches = re.findall(pattern, text, re.DOTALL)
        return matches[-1] if matches else ""

    def _debug_test_failure(self, code: str, test_info: str, output_message: str = "") -> Dict:
        """处理测试失败的情况"""
        try:
            # 1. 定位测试失败的代码片段
            error_snippet = self._locate_test_error(
                code,
                test_info,
                output_message
            )
            
            # 2. 修复测试问题
            fixed_snippet = self._fix_test_error(
                error_snippet,
                test_info,
                output_message
            )
            
            # 3. 合并修复后的代码
            fixed_code = self._merge_test_fix(code, error_snippet, fixed_snippet)
            
            return {
                "status": "success",
                "fixed_code": fixed_code
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"测试调试过程出错: {str(e)}"
            }

    def _locate_test_error(self, code: str,test_info: str, output_message: str) -> str:
        """定位测试失败的代码位置"""
        prompt = DEBUG_TEST_LOCATE_TEMPLATE.format(
            code=code,
            test_info=test_info,
            output_message=output_message
        )
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)

    def _fix_test_error(self, error_snippet: str, test_info: str, output_message: str) -> str:
        """修复测试失败的代码"""
        prompt = DEBUG_TEST_FIX_TEMPLATE.format(
            error_snippet=error_snippet,
            test_info=test_info,
            output_message=output_message
        )
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)

    def _merge_test_fix(self, original_code: str, error_snippet: str, fixed_snippet: str) -> str:
        """合并测试修复的代码"""
        prompt = DEBUG_TEST_MERGE_TEMPLATE.format(
            original_code=original_code,
            error_snippet=error_snippet,
            fixed_snippet=fixed_snippet
        )
        response = self._chat_with_memory(prompt)
        return self._extract_code(response)

    def _debug_runtime_error(self, code: str, error_message: str, output_message: str = "") -> Dict:
        """处理运行时错误"""
        try:
            # 1. 定位错误
            error_snippet = self._locate_error(
                code, 
                error_message, 
                output_message, 
            )
            
            # 2. 修复错误
            fixed_snippet = self._fix_error(
                error_snippet, 
                error_message, 
                output_message
            )
            
            # 3. 合并代码
            fixed_code = self._merge_code(code, error_snippet, fixed_snippet)
            
            return {
                "status": "success",
                "fixed_code": fixed_code
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"调试过程出错: {str(e)}"
            }

    def _run(self, code: str, error_message: str, output_message: str = "", 
             tools_description: str = "", 
             is_test_error: bool = False) -> Dict:
        """运行调试工具"""
        try:
            # 检查是否需要请求帮助
            if self._check_need_help(error_message):
                return {
                    "status": "need_help",
                    "message": "需要请求帮助"
                }
            
            # 根据错误类型选择不同的调试策略
            if is_test_error :
                return self._debug_test_failure(
                    code,
                    error_message,
                    output_message
                )
            else:
                # 原有的错误调试逻辑
                return self._debug_runtime_error(
                    code,
                    error_message,
                    output_message,
                )
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"调试过程出错: {str(e)}"
            } 