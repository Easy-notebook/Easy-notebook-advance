import json
import os
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI
from typing import AsyncGenerator
from collections import deque
from functools import partial

load_dotenv()

async def handle_user_command(operation: dict, lang: str = "en") -> AsyncGenerator[str, None]:
    """处理用户命令，使用OpenAI API生成代码"""
    try:
        # 使用异步OpenAI客户端
        client = AsyncOpenAI(
            api_key=os.getenv('OPENAI_API_KEY'),
            base_url=os.getenv('OPENAI_API_BASE')
        )    
        
        messages = [
            {"role": "system", "content": "You are an AI assistant that generates code based on user instructions.只输出python代码，除了代码以外的只能解释代码用用注释"},
            {"role": "system", "content": "还有写绘图代码的时候用的字体一定是常见电脑里有的字体，不要用特殊字体"},
            {"role": "system", "content": "你的回答是专业的，直接回答问题，不要加入其他无关的内容"},
        ]

        if content := operation.get("payload", {}).get("content"):
            messages.append({"role": "user", "content": content})
        
        command_id = operation.get("payload", {}).get("commandId")
        
        # 初始化响应
        yield json.dumps({
            "type": "addCell2EndWithContent",
            "data": {
                "payload": {
                    "type": "Hybrid",
                    "content": "",
                    "commandId": command_id,
                    "description": f"generate by request: {content}[这个是代码的预期]\n"
                },
                "status": "processing"
            }
        }) + "\n"

        # 使用带缓冲的流式处理
        buffer = deque(maxlen=20)  # 减小缓冲区大小
        async for response in handle_openai_stream(client, messages, command_id, buffer):
            yield response
            
    except Exception as e:
        print(f"Error in handle_user_command: {str(e)}")
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {"commandId": command_id},
                "error": str(e)
            }
        }) + "\n"

async def handle_openai_stream(
    client: AsyncOpenAI, 
    messages: list, 
    command_id: str,
    buffer: deque
) -> AsyncGenerator[str, None]:
    """处理OpenAI API流式响应"""
    try:
        # 创建异步流
        stream = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            stream=True,
            timeout=30.0  # 设置超时时间
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
            if current_time - last_flush_time >= 0.05 or len(buffer) >= 15:  # 50ms或缓冲>=15字符时刷新
                combined_content = ''.join(buffer)
                buffer.clear()
                last_flush_time = current_time
                
                # 发送累积的内容
                yield json.dumps({
                    "type": "addNewContent2CurrentCell",
                    "data": {
                        "payload": {
                            "content": combined_content,
                            "commandId": command_id,
                        },
                        "status": "processing",
                        "index": index
                    }
                }) + "\n"
        
        # 发送剩余的缓冲区内容
        if buffer:
            combined_content = ''.join(buffer)
            yield json.dumps({
                "type": "addNewContent2CurrentCell",
                "data": {
                    "payload": {
                        "content": combined_content,
                        "commandId": command_id,
                    },
                    "status": "processing",
                    "index": index
                }
            }) + "\n"
        
        # 运行代码单元格
        yield json.dumps({
            "type": "runCurrentCodeCell",
            "data": {
                "payload": {"commandId": command_id},
                "status": "processing"
            }
        }) + "\n"
        
        # 设置为输出模式
        yield json.dumps({
            "type": "setCurrentCellMode_onlyOutput",
            "data": {
                "status": "completed",
                "payload": {
                    "commandId": command_id,
                    "response": generated_code
                }
            }
        }) + "\n"
            
    except asyncio.TimeoutError:
        print("Stream timeout")
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {"commandId": command_id},
                "error": "Stream timeout"
            }
        }) + "\n"
    except Exception as e:
        print(f"Error in handle_openai_stream: {str(e)}")
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {"commandId": command_id},
                "error": str(e)
            }
        }) + "\n"