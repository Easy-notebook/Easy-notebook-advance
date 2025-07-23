import json
import os
import asyncio
import re
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import AsyncGenerator, Dict, List, Union
from collections import deque

load_dotenv()

class DebugConverter:
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

async def handle_code_output(operation: dict, lang: str = "en") -> AsyncGenerator[str, None]:
    """处理代码执行结果，使用OpenAI API分析输出"""
    try:
        print("Operation received code_output")
        print("Operation", operation)
        
        client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_API_BASE'))
        
        # 使用DebugConverter处理操作
        converter = DebugConverter()
        chat_messages = converter.process_operation(operation['payload'])
        
        # 添加系统消息
        messages = [
            {
                "role": "system",
                "content": "You are a code execution analyst. Analyze the code and its output, 注意从目的出发, 分析结果和输出的特征.抓住特点,精炼."
            }
        ]
        messages.extend(chat_messages)
        
        # 使用buffer来累积响应
        buffer = deque(maxlen=20)  # 减小缓冲区大小
        
        # 使用OpenAI流式处理来生成分析
        async for response in handle_openai_stream(client, messages, buffer):
            yield response
            
    except Exception as e:
        print(f"Error in handle_code_output: {str(e)}")
        yield json.dumps({
            "type": "error",
            "data": {
                "error": str(e)
            }
        }) + "\n"

async def handle_openai_stream(
    client: AsyncOpenAI, 
    messages: list, 
    buffer: deque
) -> AsyncGenerator[str, None]:
    """处理OpenAI API流式响应"""
    try:
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,
            timeout=30.0
        )

        index = 0
        generated_analysis = ""
        last_flush_time = asyncio.get_event_loop().time()
        
        async for chunk in stream:
            if not chunk.choices:
                continue
                
            content = chunk.choices[0].delta.content
            if not content:
                continue
                
            generated_analysis += content
            index += len(content)
            
            buffer.append(content)
            
            current_time = asyncio.get_event_loop().time()
            if current_time - last_flush_time >= 0.05 or len(buffer) >= 15:  # 50ms或缓冲>=15字符时刷新
                combined_content = ''.join(buffer)
                buffer.clear()
                last_flush_time = current_time
                
                yield json.dumps({
                    "type": "addNewContent2CurrentCellDescription",
                    "data": {
                        "payload": {
                            "content": combined_content,
                        },
                        "status": "processing",
                        "index": index
                    }
                }) + "\n"
        
        # 发送剩余的缓冲区内容
        if buffer:
            combined_content = ''.join(buffer)
            yield json.dumps({
                "type": "addNewContent2CurrentCellDescription",
                "data": {
                    "payload": {
                        "content": combined_content,
                    },
                    "status": "processing",
                    "index": index
                }
            }) + "\n"
            
    except asyncio.TimeoutError:
        print("Stream timeout")
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {},
                "error": "Stream timeout"
            }
        }) + "\n"
    except Exception as e:
        print(f"Error in handle_openai_stream: {str(e)}")
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {},
                "error": str(e)
            }
        }) + "\n"