import asyncio
import uuid
import requests
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, Any
from .base_agent import BaseAgentTemplate
from utils.text2image import Text2ImageAPI

class Text2ImageAgent(BaseAgentTemplate):
    def __init__(self, 
                operation: Dict[str, Any] = None,
                api_key: str = None, 
                base_url: str = None, 
                engine: str = "gpt-5-mini", 
                role: str = "You are a video generation AI agent.") -> None:
        super().__init__(operation, api_key, base_url, engine, role)
        self.text2image_client = Text2ImageAPI()

    def validate_operation(self) -> bool:
        content = self._get_payload_value("content", "")
        command_id = self._get_payload_value("commandId")
        return bool(content and command_id and content.startswith("/image"))
        
    async def process(self) -> AsyncGenerator[str, None]:
        if not self.validate_operation():
            yield self._create_response_json("error", {
                "error": "Invalid operation parameters or not a /image command"
            })
            return
            
        async for response in self.handle_image_generation():
            yield response

    def _extract_image_prompt(self, content: str) -> str:
        return content[6:].strip()

    def _get_notebook_id(self) -> str:
        return self._get_payload_value("notebook_id", "")

    def _create_assets_dir(self, notebook_id: str) -> Path:
        assets_dir = Path(f"./notebooks/{notebook_id}/.assets")
        assets_dir.mkdir(parents=True, exist_ok=True)
        return assets_dir

    def _generate_image_filename(self, extension: str = "png") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"image_{timestamp}_{unique_id}.{extension}"

    async def _download_and_save_image(self, image_url: str, notebook_id: str) -> str:
        assets_dir = self._create_assets_dir(notebook_id)
        filename = self._generate_image_filename()
        file_path = assets_dir / filename
        
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: requests.get(image_url, stream=True, timeout=60)
        )
        response.raise_for_status()
        
        with open(file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        return f"/assets/{notebook_id}/{filename}"

    async def handle_image_generation(self) -> AsyncGenerator[str, None]:
        content = self._get_payload_value("content", "")
        command_id = self._get_payload_value("commandId")
        image_prompt = self._extract_image_prompt(content)
        notebook_id = self._get_notebook_id()
            
        # 创建正在生成的image cell - 使用新的唯一标识符策略
        generation_timestamp = int(datetime.now().timestamp() * 1000)
        # Use a fixed unique identifier (server-generated) and keep it consistent across subsequent events
        prompt_hash = image_prompt[:20].replace(' ', '').lower()
        unique_identifier = f"gen-{generation_timestamp}-{prompt_hash}"
        yield self._create_response_json("addCell2EndWithContent", {
            "payload": {
                "type": "image",
                "content": "",
                "commandId": command_id,
                "prompt": image_prompt,  # used to generate a unique identifier
                "uniqueIdentifier": unique_identifier,
                "description": f"Generating image: {image_prompt}",
                "metadata": {
                    "isGenerating": True,
                    "generationStartTime": generation_timestamp,
                    "generationType": "image",
                    "start_time": generation_timestamp,
                    "prompt": image_prompt,
                    "uniqueIdentifier": unique_identifier
                }
            },
            "status": "processing"
        })
        
        image_url = self.text2image_client.generate_text2image(prompt=image_prompt)
        # image_url = "https://ark-content-generation-v2-ap-southeast-1.tos-ap-southeast-1.volces.com/seedream-3-0-t2i/0217544010991536d76cd7acfd572da46abbcedd46e0f23e878c6.jpeg?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20250805%2Fap-southeast-1%2Ftos%2Frequest&X-Tos-Date=20250805T133820Z&X-Tos-Expires=86400&X-Tos-Signature=a3b71a744e9dcb43ed4cdef2bc49c64b285f40a77c6bc9e9efad74799fc5d593&X-Tos-SignedHeaders=host"

        if image_url:
            print(f"[DEBUG] 开始处理图片: {image_url}")
            # try:
            #     local_asset_url = await self._download_and_save_image(image_url, notebook_id)
            #     print(f"[DEBUG] 图片保存成功: {local_asset_url}")
            # except Exception as e:
            #     print(f"[DEBUG] 下载图片失败，使用原始URL: {e}")
            #     local_asset_url = image_url
            
            image_markdown = f"![{image_prompt}]({image_url})"
            print(f"[DEBUG] 准备发送 updateCurrentCellWithContent 事件")
            
            # Continue using the same unique identifier as creation
            
            yield self._create_response_json("updateCurrentCellWithContent", {
                "payload": {
                    "content": image_markdown,
                    "commandId": command_id,
                    "uniqueIdentifier": unique_identifier,  # 添加唯一标识符
                },
                "status": "processing"
            })
            print(f"[DEBUG] updateCurrentCellWithContent 事件已发送 - uniqueIdentifier: {unique_identifier}")
            
            yield self._create_response_json("updateCurrentCellMetadata", {
                "payload": {
                    "commandId": command_id,
                    "uniqueIdentifier": unique_identifier,  # 添加唯一标识符
                    "metadata": {
                        "isGenerating": False,
                        "generationCompleted": True,
                        "generationEndTime": int(datetime.now().timestamp() * 1000),
                        # Use the remote URL directly; enable download logic above if local caching is needed
                        "imageUrl": image_url
                    }
                },
                "status": "processing"
            })
            print(f"[DEBUG] updateCurrentCellMetadata 事件已发送")
            
            # 设置为完成模式 - 类似 command_agent 的结束方式
            yield self._create_response_json("setCurrentCellMode_complete", {
                "status": "completed",
                "payload": {
                    "commandId": command_id,
                    "response": f"Image generation completed: {image_prompt}"
                }
            })