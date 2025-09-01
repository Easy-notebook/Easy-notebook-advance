import asyncio
import re
from collections import deque
from typing import AsyncGenerator, Dict, Any, List

from .base_agent import BaseAgentTemplate


class DebugConverter:
    """调试转换器，处理执行结果和代码"""
    
    def __init__(self):
        self.messages = []
        
    def _extract_image_metadata(self, image_data: str) -> Dict[str, str]:
        """Extract metadata from base64 image string."""
        pattern = r'data:image/(\w+);base64,'
        match = re.match(pattern, image_data)
        if not match:
            return {"format": "unknown"}
        return {"format": match.group(1)}

    def _process_execute_result(self, results: List[Dict]) -> List[Dict]:
        """Process execution results into chat messages."""
        messages = []
        
        for result in results:
            if result["type"] == "text":
                messages.append({
                    "role": "assistant",
                    "content": result["content"]
                })
            elif result["type"] == "image":
                messages.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": result["content"]
                            }
                        },
                        {
                            "type": "text",
                            "text": f"Image generated at {result['timestamp']}"
                        }
                    ]
                })
        
        return messages

    def _process_code(self, code: str) -> Dict:
        """Process executed code into a message."""
        return {
            "role": "user",
            "content": f"Executed Python Code:[需要debug的代码片段]\n```python\n{code}\n```"
        }

    def process_operation(self, operation: dict) -> List[Dict]:
        """Process operation into chat messages."""
        self.messages = []
        
        if "executeResult" in operation:
            self.messages.extend(
                self._process_execute_result(operation["executeResult"])
            )
        
        if "executeCode" in operation:
            self.messages.append(
                self._process_code(operation["executeCode"])
            )
        
        if "description" in operation:
            self.messages.append({
                "role": "user",
                "content": "代码原本的目标是响应:["+operation["description"]+"]"
            })
        
        if "historyCode" in operation:
            self.messages.append({
                "role": "user",
                "content": "历史代码:["+operation["historyCode"]+"]"
            })
            
        return self.messages


class DebugAgent(BaseAgentTemplate):
    """
    调试Agent类，专门处理代码调试和错误修复
    """

    def __init__(self, 
                 operation: Dict[str, Any] = None,
                 api_key: str = None,
                 base_url: str = None,
                 engine: str = "o4-mini",
                 role: str = None) -> None:
        """
        初始化调试代理
        """
        if role is None:
            role = """You're an AI debugging assistant for EasyRemote notebooks. Analyze code and fix issues step by step.

When analyzing code:
1. Understand the code's purpose
2. Identify all errors (syntax, logic, runtime)
3. Fix issues with minimal changes
4. Preserve original functionality

In your response:
1. Briefly explain what caused each error
2. For each fix, explain your reasoning
3. End with ONLY ONE code block containing the complete fixed code
4. Add comments to mark your fixes: # FIXED: explanation

Example:

the original code your received is:
```python
print "hello"
```
the error is:
[error-message-for-debug]
  Cell In[22], line 1
    print "hello"
    ^
SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...)?

your response should be:

the main purpose of the code is print "hello", but there is a syntax error, we should fix it.

In order to fix the syntax error, we should add parentheses required in original code.

Ok, my response is:

```python
print("hello")  # FIXED: Added parentheses for Python 3 syntax
```"""
        
        super().__init__(operation, api_key, base_url, engine, role)
        self.converter = DebugConverter()
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self.payload)
        
    def _build_system_messages(self) -> List[Dict[str, str]]:
        """构建系统消息"""
        return [{"role": "system", "content": self.role}]

    async def process(self) -> AsyncGenerator[str, None]:
        """处理调试Agent逻辑"""
        if not self.validate_operation():
            yield self._create_response_json("error", {
                "error": "Invalid operation parameters"
            })
            return
            
        async for response in self.handle_code_debug():
            yield response

    async def handle_code_debug(self) -> AsyncGenerator[str, None]:
        """处理代码调试，考虑记忆"""
        try:
            print("Operation received code_debug")
            print("Operation", self.operation)
            
            # 检查终止条件
            should_terminate, terminate_reason = self._should_terminate()
            if should_terminate:
                yield self._create_response_json("convertCurrentCodeCellToHybridCell", {})
                yield self._create_response_json("updateCurrentCellWithContent", {
                    "payload": {
                        "content": f"🛑 调试终止: {terminate_reason}\n\n建议:\n1. 回顾问题本质，重新分析需求\n2. 寻求人工帮助或查阅文档\n3. 尝试完全不同的实现方案\n4. 考虑简化问题，分步骤解决"
                    }
                })
                return
                
            # 检查是否有现成的解决方案
            working_solutions = self._get_working_solutions()
            current_error = self.current_context.get("error_message", "")
            
            initial_content = "Agent is thinking and tend to debug...\n\n"
            
            # 检查历史解决方案
            found_solution = False
            for error_pattern, solution in working_solutions.items():
                if error_pattern.lower() in current_error.lower():
                    initial_content += f"💡 发现类似问题的历史解决方案:\n**错误模式**: {error_pattern}\n**解决方案**: {solution}\n\n"
                    found_solution = True
                    break
                    
            # 检查应避免的方法
            failed_approaches = self._get_avoided_approaches()
            if failed_approaches:
                initial_content += f"⚠️ 避免以下已证明无效的方法:\n"
                for approach in failed_approaches[:3]:  # 只显示前3个
                    initial_content += f"- {approach}\n"
                initial_content += "\n"
                
            # 检查代码版本信息
            if self.agent_memory:
                situation = self.agent_memory.get("situation_tracking", {})
                code_evolution = situation.get("code_evolution", {})
                working_versions = code_evolution.get("working_versions", [])
                if working_versions:
                    initial_content += f"📋 检测到{len(working_versions)}个历史工作版本，如需要可建议回滚\n\n"
            
            # 使用DebugConverter处理操作
            chat_messages = self.converter.process_operation(self.payload)
            
            # 构建记忆感知的消息
            messages = self._build_system_messages()
            messages.extend(chat_messages)
            
            # 如果找到解决方案，添加特殊指令
            if found_solution:
                messages.append({
                    "role": "user",
                    "content": "请优先尝试上述历史解决方案，如果不适用再分析新的解决方案。"
                })
            
            # 发送初始响应
            yield self._create_response_json("convertCurrentCodeCellToHybridCell", {})
            
            yield self._create_response_json("updateCurrentCellWithContent", {
                "payload": {
                    "content": initial_content
                }
            })
            
            # 使用带缓冲的流式处理
            buffer = deque(maxlen=50)
            async for response in self._handle_openai_stream(messages, buffer):
                yield response
                
        except Exception as e:
            print(f"Error in handle_code_debug: {str(e)}")
            yield self._create_response_json("error", {
                "error": str(e)
            })

    async def _handle_openai_stream(
        self, 
        messages: List[Dict[str, str]], 
        buffer: deque
    ) -> AsyncGenerator[str, None]:
        """处理OpenAI API流式响应"""
        try:
            # Note: OpenAI SDK create() is synchronous, returns a Stream object
            stream = self.client.chat.completions.create(
                model=self.engine,
                messages=messages,
                stream=True,
                timeout=30.0
            )

            index = 0
            generated_analysis = ""
            last_flush_time = asyncio.get_event_loop().time()

            # Use regular for loop, not async for
            for chunk in stream:
                if not chunk.choices:
                    continue
                    
                content = chunk.choices[0].delta.content
                if not content:
                    continue
                    
                generated_analysis += content
                index += len(content)
                
                buffer.append(content)
                
                current_time = asyncio.get_event_loop().time()
                if current_time - last_flush_time >= 0.1 or len(buffer) >= 40:
                    combined_content = ''.join(buffer)
                    buffer.clear()
                    last_flush_time = current_time
                    
                    yield self._create_response_json("addNewContent2CurrentCell", {
                        "payload": {
                            "content": combined_content,
                        },
                        "status": "processing",
                        "index": index
                    })
                    
                    await asyncio.sleep(0.01)

                # Allow other coroutines to run
                await asyncio.sleep(0.001)
            
            # 发送剩余的缓冲区内容
            if buffer:
                combined_content = ''.join(buffer)
                yield self._create_response_json("addNewContent2CurrentCell", {
                    "payload": {
                        "content": combined_content,
                    },
                    "status": "processing",
                    "index": index
                })
            
            # 运行代码单元格
            yield self._create_response_json("runCurrentCodeCell", {
                "payload": {},
                "status": "processing"
            })
                
        except asyncio.TimeoutError:
            print("Stream timeout")
            yield self._create_response_json("error", {
                "payload": {},
                "error": "Stream timeout"
            })
        except Exception as e:
            print(f"Error in _handle_openai_stream: {str(e)}")
            yield self._create_response_json("error", {
                "payload": {},
                "error": str(e)
            })