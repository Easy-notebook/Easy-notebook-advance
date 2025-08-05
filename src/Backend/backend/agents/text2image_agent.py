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
                engine: str = "gpt-4o-mini", 
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
            
        # 开始视频生成流程
        yield self._create_response_json("initStreamingAnswer", {
            "payload": {"commandId": command_id},
            "status": "processing"
        })
        
        # 创建正在生成的image cell
        yield self._create_response_json("addCell2EndWithContent", {
            "payload": {
                "type": "image",
                "content": "",
                "commandId": command_id,
                "description": f"Generating image: {image_prompt}",
                "metadata": {
                    "isGenerating": True,
                    "generationStartTime": int(datetime.now().timestamp() * 1000),
                    "generationType": "image",
                    "start_time": int(datetime.now().timestamp() * 1000),
                    "prompt": image_prompt
                }
            },
            "status": "processing"
        })
        
        image_url = self.text2image_client.generate_text2image(prompt=image_prompt)

        if image_url and notebook_id: 
            local_asset_url = await self._download_and_save_image(image_url, notebook_id)
            image_markdown = f"![{image_prompt}]({image_url})"
            
            yield self._create_response_json("updateCurrentCellWithContent", {
                "payload": {
                    "content": image_markdown,
                    "commandId": command_id,
                },
                "status": "processing"
            })
            
            yield self._create_response_json("updateCurrentCellMetadata", {
                "payload": {
                    "commandId": command_id,
                    "metadata": {
                        "isGenerating": False,
                        "generationCompleted": True,
                        "generationEndTime": int(datetime.now().timestamp() * 1000),
                        "imageUrl": local_asset_url
                    }
                },
                "status": "processing"
            })
            
        yield self._create_response_json("finishStreamingAnswer", {
            "payload": {"commandId": command_id},
            "status": "completed"
        })