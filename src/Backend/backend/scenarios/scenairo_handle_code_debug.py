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

async def handle_code_debug(operation: dict, lang: str = "en") -> AsyncGenerator[str, None]:
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
                "content": """You're an AI debugging assistant for EasyRemote notebooks. Analyze code and fix issues step by step.

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
```
"""
            }
        ]
        messages.extend(chat_messages)
        
        # 使用buffer来累积响应
        buffer = deque(maxlen=20)  # 减小缓冲区大小
        
        yield json.dumps({
            "type": "convertCurrentCodeCellToHybridCell",
            "data": {
            }
        }) + "\n"
        
        yield json.dumps({
            "type": "updateCurrentCellWithContent",
            "data": {
                "payload": {
                    "content": "Agent is thinking and tend to debug...\n"
                }
            }
        }) + "\n"
        
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
            model="o4-mini",
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
                    "type": "addNewContent2CurrentCell",
                    "data": {
                        "payload": {
                            "content": combined_content,
                        },
                        "status": "processing",
                        "index": index
                    }
                }) + "\n"
        
        if buffer:
            combined_content = ''.join(buffer)
            yield json.dumps({
                    "type": "addNewContent2CurrentCell",
                    "data": {
                        "payload": {
                            "content": combined_content,
                        },
                        "status": "processing",
                        "index": index
                    }
                }) + "\n"
        
        # 运行代码单元格
        yield json.dumps({
            "type": "runCurrentCodeCell",
            "data": {
                "payload": {},
                "status": "processing"
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