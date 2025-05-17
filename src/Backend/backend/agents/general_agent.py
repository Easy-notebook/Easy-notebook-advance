import os
import json
import asyncio
from collections import deque
from typing import AsyncGenerator, Dict, List, Any

from dotenv import load_dotenv
from openai import AsyncOpenAI

load_dotenv()

class GeneralAgent:
    """
    一个简单的 ChatGPT 代理类，用于演示如何从原有代码中
    提取并封装核心的 AI Agent 功能。
    """

    def __init__(self, 
                api_key: str = None, 
                base_url: str = None, 
                engine: str = "o4-mini", 
                role: str = "You are AI Agent behind easyremote notebook.") -> None:
        """
        初始化代理，创建 AsyncOpenAI 客户端
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.base_url = base_url or os.getenv('OPENAI_API_BASE')
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
        self.engine = engine
        self.role = role

    async def handle_user_questions(
        self, 
        content: str, 
        q_id: str, 
        related_qa_ids: List[str] = None,
        related_cells = None
    ) -> AsyncGenerator[str, None]:
        """
        对用户问题进行流式回答的生成器函数。
        
        参数：
            content: 当前用户提问的内容
            q_id: 问题 ID，用于在返回数据中跟踪该问题
            related_qa_ids: 关联历史 QA 的 ID 列表（可选）
        
        返回：
            一个异步生成器，依次返回每段回答内容的 JSON 字符串。
        """
        # 构造初始消息
        messages = [
            {"role": "system", "content": self.role}
        ]

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

        # 添加用户的问题
        messages.append({"role": "user", "content": content})

        # 发送初始流式回答通知
        yield json.dumps({
            "type": "initStreamingAnswer",
            "data": {
                "payload": {"QId": q_id},
                "status": "processing"
            }
        }) + "\n"

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
