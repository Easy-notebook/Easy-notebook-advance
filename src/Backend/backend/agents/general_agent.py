import json
import asyncio
from collections import deque
from typing import AsyncGenerator, List, Dict, Any
from .base_agent import BaseAgentTemplate

class GeneralAgent(BaseAgentTemplate):
    """
    通用Agent类，继承自BaseAgentTemplate
    """

    def __init__(self, 
                operation: Dict[str, Any] = None,
                api_key: str = None, 
                base_url: str = None, 
                engine: str = "o4-mini", 
                role: str = "You are AI Agent behind easyremote notebook.") -> None:
        """
        初始化通用代理
        """
        super().__init__(operation, api_key, base_url, engine, role)
        
    def validate_operation(self) -> bool:
        """验证操作参数"""
        return bool(self.operation)

    async def process(self) -> AsyncGenerator[str, None]:
        """处理通用Agent逻辑"""
        if not self.validate_operation():
            yield self._create_response_json("error", {
                "error": "Invalid operation parameters"
            })
            return
            
        async for response in self.handle_user_questions():
            yield response
    
    async def handle_user_questions(
        self, 
        content: str = None, 
        q_id: str = None, 
        related_qa_ids: List[str] = None,
        related_cells = None
    ) -> AsyncGenerator[str, None]:
        """
        对用户问题进行流式回答的生成器函数，使用记忆系统
        """
        # 使用传入参数或从operation中获取
        content = content or self._get_payload_value("content", "")
        q_id = q_id or self._get_payload_value("QId")
        related_qa_ids = related_qa_ids or self._get_payload_value("relatedQAIds", [])
        related_cells = related_cells or self._get_payload_value("related_cells", [])
        
        if not q_id:
            yield self._create_response_json("error", {
                "payload": {"QId": q_id},
                "error": "Missing QId in payload"
            })
            return
        
        # 检查终止条件
        should_terminate, terminate_reason = self._should_terminate()
        if should_terminate:
            yield self._create_response_json("initStreamingAnswer", {
                "payload": {"QId": q_id},
                "status": "processing"
            })
            yield self._create_response_json("addContentToAnswer", {
                "payload": {
                    "QId": q_id,
                    "content": f"🛑 问答终止: {terminate_reason}\n\n建议总结当前进展，整理思路后再继续。"
                },
                "status": "completed"
            })
            yield self._create_response_json("finishStreamingAnswer", {
                "payload": {"QId": q_id},
                "status": "completed"
            })
            return
        
        # 构造记忆感知的消息
        messages = self._build_system_messages()

        # 检查QA特定的记忆信息
        qa_context = self._extract_qa_context()
        current_qa_id = qa_context.get("current_qa_id")
        question_content = qa_context.get("question_content", content)
        
        # 检查是否有相关的成功解决方案
        working_solutions = self._get_working_solutions()
        solution_context = ""
        for problem_type, solution in list(working_solutions.items())[:2]:  # 最多显示2个
            if any(keyword in question_content.lower() for keyword in problem_type.lower().split()):
                solution_context += f"参考历史解决方案 - {problem_type}: {solution}\n"
                
        # 添加QA特定的上下文提示
        if current_qa_id and self.agent_memory:
            situation = self.agent_memory.get("situation_tracking", {})
            successful_qa = [
                interaction for interaction in situation.get("successful_interactions", [])
                if interaction.get("operation_type") == "qa_completed"
            ]
            if successful_qa:
                recent_successful_pattern = successful_qa[-1].get("operation_data", {})
                if recent_successful_pattern.get("response_length", 0) > 200:
                    solution_context += f"💡 根据历史记录，用户更偏好详细的回答\n"

        # 如果有相关历史，可以在这里拼接
        if related_qa_ids:
            messages.append({
                "role": "user",
                "content": f"relative QA history: {str(related_qa_ids)}"
            })
            
        if related_cells:
            messages.append({
                "role": "user",
                "content": f"related notebook cells: {str(related_cells)}"
            })

        # 添加解决方案上下文
        if solution_context:
            messages.append({
                "role": "user", 
                "content": f"历史相关解决方案:\n{solution_context}"
            })

        # 添加用户的问题
        messages.append({"role": "user", "content": content})

        # 发送初始流式回答通知
        yield self._create_response_json("initStreamingAnswer", {
            "payload": {"QId": q_id},
            "status": "processing"
        })

        # 使用 deque 作为缓存，边生成边输出
        buffer = deque(maxlen=50)

        try:
            # 调用 OpenAI 的 chat.completions 流式输出
            stream = await self.client.chat.completions.create(
                model=self.engine,   # 这里可替换为你实际使用的模型名称
                messages=messages,
                stream=True,
                timeout=30.0
            )

            index = 0
            full_response = ""
            last_flush_time = asyncio.get_event_loop().time()

            # 异步迭代流式响应
            async for chunk in stream:
                if not chunk.choices:
                    continue
                # 从流中取出返回的增量内容
                content_piece = chunk.choices[0].delta.content
                if not content_piece:
                    continue

                full_response += content_piece
                buffer.append(content_piece)
                index += len(content_piece)

                current_time = asyncio.get_event_loop().time()
                # 每隔一定时长或 buffer 达到一定大小就 flush
                if current_time - last_flush_time >= 0.1 or len(buffer) >= 40:
                    combined_content = ''.join(buffer)
                    buffer.clear()
                    last_flush_time = current_time

                    yield json.dumps({
                        "type": "addContentToAnswer",
                        "data": {
                            "payload": {
                                "QId": q_id,
                                "content": combined_content
                            },
                            "status": "processing",
                            "index": index
                        }
                    }) + "\n"

                    # 避免阻塞，稍作延迟
                    await asyncio.sleep(0.01)

            # 收尾，把剩余的 buffer 内容发送出去
            if buffer:
                combined_content = ''.join(buffer)
                yield json.dumps({
                    "type": "addContentToAnswer",
                    "data": {
                        "payload": {
                            "QId": q_id,
                            "content": combined_content
                        },
                        "status": "processing",
                        "index": index
                    }
                }) + "\n"

            # 最终完成
            yield json.dumps({
                "type": "finishStreamingAnswer",
                "data": {
                    "status": "completed",
                    "payload": {
                        "QId": q_id,
                        "response": full_response
                    }
                }
            }) + "\n"

        except asyncio.TimeoutError:
            error_msg = "Stream timeout"
            print(error_msg)
            yield json.dumps({
                "type": "error",
                "data": {
                    "payload": {"QId": q_id},
                    "error": error_msg
                }
            }) + "\n"

        except Exception as e:
            error_msg = f"Error in generate_streaming_answer: {str(e)}"
            print(error_msg)
            yield json.dumps({
                "type": "error",
                "data": {
                    "payload": {"QId": q_id},
                    "error": error_msg
                }
            }) + "\n"

    def _extract_qa_context(self) -> Dict[str, Any]:
        """提取QA特定的上下文信息"""
        qa_context = {}
        if self.current_context:
            qa_context["current_qa_id"] = self.current_context.get("current_qa_id")
            qa_context["question_content"] = self.current_context.get("question_content")
        return qa_context
