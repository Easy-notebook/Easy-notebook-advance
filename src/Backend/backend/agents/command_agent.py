import asyncio
from collections import deque
from typing import AsyncGenerator, Dict, Any, List

from .base_agent import BaseAgentTemplate


class CommandAgent(BaseAgentTemplate):
    """
    命令处理Agent类，专门处理用户命令生成代码
    """

    def __init__(self, 
                 operation: Dict[str, Any] = None,
                 api_key: str = None,
                 base_url: str = None,
                 engine: str = "gpt-4o",
                 role: str = "You are an AI assistant that generates code based on user instructions.只输出python代码，除了代码以外的只能解释代码用用注释") -> None:
        """
        初始化命令代理
        """
        super().__init__(operation, api_key, base_url, engine, role)
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        content = self._get_payload_value("content")
        command_id = self._get_payload_value("commandId")
        return bool(content and command_id)
        
    def _build_system_messages(self) -> List[Dict[str, str]]:
        """构建系统消息"""
        return [
            {"role": "system", "content": self.role},
            {"role": "system", "content": "还有写绘图代码的时候用的字体一定是常见电脑里有的字体，不要用特殊字体"},
            {"role": "system", "content": "你的回答是专业的，直接回答问题，不要加入其他无关的内容"}
        ]

    async def process(self) -> AsyncGenerator[str, None]:
        """处理命令Agent逻辑"""
        if not self.validate_operation():
            yield self._create_response_json("error", {
                "error": "Invalid operation parameters - missing content or commandId"
            })
            return
            
        async for response in self.handle_user_command():
            yield response

    async def handle_user_command(self) -> AsyncGenerator[str, None]:
        """处理用户命令，生成代码，使用记忆系统"""
        try:
            content = self._get_payload_value("content")
            command_id = self._get_payload_value("commandId")
            
            # 检查终止条件
            should_terminate, terminate_reason = self._should_terminate()
            if should_terminate:
                yield self._create_response_json("addCell2EndWithContent", {
                    "payload": {
                        "type": "Hybrid",
                        "content": f"🛑 代码生成终止: {terminate_reason}",
                        "commandId": command_id,
                        "description": "代码生成已达到限制\n"
                    },
                    "status": "completed"
                })
                return
            
            # 检查用户偏好和历史成功方案
            user_prefs = self._get_user_preferences()
            working_solutions = self._get_working_solutions()
            
            initial_description = f"generate by request: {content}[这个是代码的预期]\n"
            
            # 添加偏好提示
            preferred_libs = user_prefs.get("preferred_libraries", [])
            if preferred_libs:
                initial_description += f"用户偏好库: {', '.join(preferred_libs[:3])}\n"
                
            # 检查是否有类似的成功方案
            for problem_type, solution in list(working_solutions.items())[:2]:
                if any(keyword in content.lower() for keyword in problem_type.lower().split()):
                    initial_description += f"参考方案: {solution[:100]}...\n"
            
            # 构建记忆感知的消息
            messages = self._build_system_messages()
            
            # 添加偏好信息到提示中
            if preferred_libs:
                messages.append({
                    "role": "user",
                    "content": f"请优先使用以下库（如果适用）: {', '.join(preferred_libs)}"
                })
            
            messages.append({"role": "user", "content": content})
            
            # 初始化响应
            yield self._create_response_json("addCell2EndWithContent", {
                "payload": {
                    "type": "Hybrid",
                    "content": "",
                    "commandId": command_id,
                    "description": initial_description
                },
                "status": "processing"
            })

            # 使用带缓冲的流式处理
            buffer = deque(maxlen=50)
            async for response in self._handle_openai_stream(messages, command_id, buffer):
                yield response
                
        except Exception as e:
            command_id = self._get_payload_value("commandId")
            print(f"Error in handle_user_command: {str(e)}")
            yield self._create_response_json("error", {
                "payload": {"commandId": command_id},
                "error": str(e)
            })

    async def _handle_openai_stream(
        self, 
        messages: List[Dict[str, str]], 
        command_id: str,
        buffer: deque
    ) -> AsyncGenerator[str, None]:
        """处理OpenAI API流式响应"""
        try:
            # 创建异步流
            stream = await self.client.chat.completions.create(
                model=self.engine,
                messages=messages,
                stream=True,
                timeout=30.0
            )

            index = 0
            generated_code = ""
            last_flush_time = asyncio.get_event_loop().time()
            
            async for chunk in stream:
                if not chunk.choices:
                    continue
                    
                content = chunk.choices[0].delta.content
                if not content:
                    continue
                    
                generated_code += content
                index += len(content)
                
                # 将内容添加到缓冲区
                buffer.append(content)
                
                # 检查是否需要刷新缓冲区
                current_time = asyncio.get_event_loop().time()
                if current_time - last_flush_time >= 0.1 or len(buffer) >= 40:
                    combined_content = ''.join(buffer)
                    buffer.clear()
                    last_flush_time = current_time
                    
                    # 发送累积的内容
                    yield self._create_response_json("addNewContent2CurrentCell", {
                        "payload": {
                            "content": combined_content,
                            "commandId": command_id,
                        },
                        "status": "processing",
                        "index": index
                    })
                    
                    # 添加小延迟避免阻塞
                    await asyncio.sleep(0.01)
            
            # 发送剩余的缓冲区内容
            if buffer:
                combined_content = ''.join(buffer)
                yield self._create_response_json("addNewContent2CurrentCell", {
                    "payload": {
                        "content": combined_content,
                        "commandId": command_id,
                    },
                    "status": "processing",
                    "index": index
                })
            
            # 运行代码单元格
            yield self._create_response_json("runCurrentCodeCell", {
                "payload": {"commandId": command_id},
                "status": "processing"
            })
            
            # 设置为输出模式
            yield self._create_response_json("setCurrentCellMode_onlyOutput", {
                "status": "completed",
                "payload": {
                    "commandId": command_id,
                    "response": generated_code
                }
            })
                
        except asyncio.TimeoutError:
            print("Stream timeout")
            yield self._create_response_json("error", {
                "payload": {"commandId": command_id},
                "error": "Stream timeout"
            })
        except Exception as e:
            print(f"Error in _handle_openai_stream: {str(e)}")
            yield self._create_response_json("error", {
                "payload": {"commandId": command_id},
                "error": str(e)
            })