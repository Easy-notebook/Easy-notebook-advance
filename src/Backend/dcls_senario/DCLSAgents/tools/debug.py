import re
from typing import Dict, List, Optional, Union, Any
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

class DebugTool:
    """调试代码错误的工具 - 无LangChain版本"""
    
    def __init__(self, oracle=None):
        """初始化工具"""
        self.name = "debug"
        self.description = "调试代码错误的工具"
        
        if oracle is None:
            try:
                from app.utils.oracle import Oracle
                self.oracle = Oracle()
            except ImportError:
                self.oracle = None
        else:
            self.oracle = oracle
            
        if not self.oracle:
            raise ValueError("必须提供 Oracle 实例或确保 Oracle 类可用")
            
        self.all_error_messages: List[str] = []
        self.conversation_history: List[Dict[str, str]] = []
        
        # 添加系统消息到历史
        self.conversation_history.append({
            "role": "system",
            "content": "你是一个专业的代码调试助手，擅长分析和修复代码错误。请帮助用户定位和解决代码中的问题。"
        })
            
    def _chat_with_memory(self, prompt: str) -> str:
        """使用记忆进行对话"""
        # 添加用户消息到历史
        self.conversation_history.append({"role": "user", "content": prompt})
        
        # 使用Oracle生成响应
        response = self.oracle.generate(self.conversation_history)
        
        # 添加助手响应到历史
        self.conversation_history.append({"role": "assistant", "content": response})
        
        return response

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

    def run(self, tool_input: Dict[str, Any]) -> Dict:
        """运行调试工具 - 新接口"""
        code = tool_input.get("code", "")
        error_message = tool_input.get("error_message", "")
        output_message = tool_input.get("output_message", "")
        tools_description = tool_input.get("tools_description", "")
        is_test_error = tool_input.get("is_test_error", False)
        test_info = tool_input.get("test_info", "")
        
        return self._run(code, error_message, output_message, tools_description, is_test_error, test_info)
    
    def _run(self, code: str, error_message: str, output_message: str = "", 
             tools_description: str = "", 
             is_test_error: bool = False, test_info: str = "") -> Dict:
        """运行调试工具"""
        try:
            # 检查是否需要请求帮助
            if self._check_need_help(error_message):
                return {
                    "status": "need_help",
                    "message": "需要请求帮助"
                }
            
            # 根据错误类型选择不同的调试策略
            if is_test_error:
                return self._debug_test_failure(
                    code,
                    test_info or error_message,
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