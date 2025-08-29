import asyncio
import re
from collections import deque
from typing import AsyncGenerator, Dict, Any, List

from .base_agent import BaseAgentTemplate


class OutputConverter:
    """输出转换器，处理执行结果和代码分析"""
    
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
            "content": f"Executed Python Code:\n```python\n{code}\n```"
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
            
        return self.messages


class OutputAgent(BaseAgentTemplate):
    """
    输出分析Agent类，专门处理代码执行结果分析
    """

    def __init__(self, 
                 operation: Dict[str, Any] = None,
                 api_key: str = None,
                 base_url: str = None,
                 engine: str = "gpt-4o",
                 role: str = "You are a code execution analyst. Analyze the code and its output, 注意从目的出发, 分析结果和输出的特征.抓住特点,精炼.") -> None:
        """
        初始化输出分析代理
        """
        super().__init__(operation, api_key, base_url, engine, role)
        self.converter = OutputConverter()
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self.payload)
        
    def _build_system_messages(self) -> List[Dict[str, str]]:
        """构建系统消息"""
        return [{"role": "system", "content": self.role}]

    async def process(self) -> AsyncGenerator[str, None]:
        """处理输出分析Agent逻辑"""
        if not self.validate_operation():
            yield self._create_response_json("error", {
                "error": "Invalid operation parameters"
            })
            return
            
        async for response in self.handle_code_output():
            yield response

    async def handle_code_output(self) -> AsyncGenerator[str, None]:
        """处理代码输出分析，使用记忆系统"""
        try:
            print("Operation received code_output")
            print("Operation", self.operation)
            
            # 检查终止条件
            should_terminate, terminate_reason = self._should_terminate()
            if should_terminate:
                yield self._create_response_json("addNewContent2CurrentCellDescription", {
                    "payload": {
                        "content": f"🛑 输出分析终止: {terminate_reason}\n\n建议手动分析当前输出结果。"
                    }
                })
                return
            
            # 检查历史输出分析模式
            successful_patterns = self._get_successful_analysis_patterns()
            
            initial_content = ""
            if successful_patterns:
                initial_content += f"💡 基于历史成功经验，将采用以下分析模式:\n"
                for pattern in successful_patterns[:2]:
                    initial_content += f"- {pattern}\n"
                initial_content += "\n"
            
            # 使用OutputConverter处理操作
            chat_messages = self.converter.process_operation(self.payload)
            
            # 构建记忆感知的消息
            messages = self._build_system_messages()
            
            # 添加历史分析模式指导
            if successful_patterns:
                messages.append({
                    "role": "user",
                    "content": f"请参考以下成功的分析模式: {', '.join(successful_patterns[:3])}"
                })
            
            messages.extend(chat_messages)
            
            # 如果有初始内容，先发送
            if initial_content:
                yield self._create_response_json("addNewContent2CurrentCellDescription", {
                    "payload": {
                        "content": initial_content
                    }
                })
            
            # 使用带缓冲的流式处理
            buffer = deque(maxlen=50)
            async for response in self._handle_openai_stream(messages, buffer):
                yield response
                
        except Exception as e:
            print(f"Error in handle_code_output: {str(e)}")
            yield self._create_response_json("error", {
                "error": str(e)
            })

    def _get_successful_analysis_patterns(self) -> List[str]:
        """获取成功的分析模式"""
        if not self.agent_memory:
            return []
            
        situation = self.agent_memory.get("situation_tracking", {})
        successful_interactions = situation.get("successful_interactions", [])
        
        patterns = []
        for interaction in successful_interactions[-5:]:  # 最近5次成功交互
            if interaction.get("operation_type") == "code_output":
                analysis_approach = interaction.get("analysis_approach", "")
                if analysis_approach and analysis_approach not in patterns:
                    patterns.append(analysis_approach)
        
        return patterns

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
                    
                    yield self._create_response_json("addNewContent2CurrentCellDescription", {
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
                yield self._create_response_json("addNewContent2CurrentCellDescription", {
                    "payload": {
                        "content": combined_content,
                    },
                    "status": "processing",
                    "index": index
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