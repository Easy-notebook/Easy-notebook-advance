import asyncio
import uuid
import requests
from datetime import datetime
from pathlib import Path
from typing import AsyncGenerator, Dict, Any
from .base_agent import BaseAgentTemplate
from utils.text2video import Text2VideoAPI


class Text2VideoAgent(BaseAgentTemplate):
    def __init__(
        self,
        operation: Dict[str, Any] = None,
        api_key: str = None,
        base_url: str = None,
        engine: str = "gpt-4o-mini",
        role: str = "You are a video generation AI agent.",
    ) -> None:
        super().__init__(operation, api_key, base_url, engine, role)
        self.text2video_client = Text2VideoAPI()

    def validate_operation(self) -> bool:
        content = self._get_payload_value("content", "")
        command_id = self._get_payload_value("commandId")
        return bool(content and command_id and content.startswith("/video"))

    async def process(self) -> AsyncGenerator[str, None]:
        if not self.validate_operation():
            yield self._create_response_json(
                "error",
                {"error": "Invalid operation parameters or not a /video command"},
            )
            return

        async for response in self.handle_video_generation():
            yield response

    def _extract_video_prompt(self, content: str) -> str:
        return content[6:].strip()

    def _get_notebook_id(self) -> str:
        return self._get_payload_value("notebook_id", "")

    def _create_assets_dir(self, notebook_id: str) -> Path:
        assets_dir = Path(f"./notebooks/{notebook_id}/.assets")
        assets_dir.mkdir(parents=True, exist_ok=True)
        return assets_dir

    def _generate_video_filename(self, extension: str = "mp4") -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        return f"video_{timestamp}_{unique_id}.{extension}"

    async def _download_and_save_video(self, video_url: str, notebook_id: str) -> str:
        assets_dir = self._create_assets_dir(notebook_id)
        filename = self._generate_video_filename()
        file_path = assets_dir / filename

        response = await asyncio.get_event_loop().run_in_executor(
            None, lambda: requests.get(video_url, stream=True, timeout=60)
        )
        response.raise_for_status()

        with open(file_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

        return f"/assets/{notebook_id}/{filename}"

    async def handle_video_generation(self) -> AsyncGenerator[str, None]:
        content = self._get_payload_value("content", "")
        command_id = self._get_payload_value("commandId")
        video_prompt = self._extract_video_prompt(content)
        notebook_id = self._get_notebook_id()

        # 创建正在生成的video cell - 使用新的唯一标识符策略
        generation_timestamp = int(datetime.now().timestamp() * 1000)
        yield self._create_response_json(
            "addCell2EndWithContent",
            {
                "payload": {
                    "type": "image",  # 使用image类型来显示视频
                    "content": "",
                    "commandId": command_id,
                    "prompt": video_prompt,  # 用于生成唯一标识符
                    "description": f"Generating video: {video_prompt}",
                    "metadata": {
                        "isGenerating": True,
                        "generationStartTime": generation_timestamp,
                        "generationType": "video",
                        "start_time": generation_timestamp,
                        "prompt": video_prompt,
                    },
                },
                "status": "processing",
            },
        )

        # video_url = self.text2video_client.generate_video_and_get_result(prompt=video_prompt)
        video_url = "https://ark-content-generation-ap-southeast-1.tos-ap-southeast-1.volces.com/seedance-1-0-lite-t2v/02175437639118200000000000000000000ffffc0a8401bdbf53b.mp4?X-Tos-Algorithm=TOS4-HMAC-SHA256&X-Tos-Credential=AKLTYWJkZTExNjA1ZDUyNDc3YzhjNTM5OGIyNjBhNDcyOTQ%2F20250805%2Fap-southeast-1%2Ftos%2Frequest&X-Tos-Date=20250805T064712Z&X-Tos-Expires=86400&X-Tos-Signature=017cc9ee211babbd4d87f8312281b3e5e6d5176ca37b017db4f2df7da98cdc68&X-Tos-SignedHeaders=host"

        if video_url:
            local_asset_url = await self._download_and_save_video(
                video_url, notebook_id
            )
            video_markdown = f"![{video_prompt}]({video_url})"
            
            # 生成与创建时相同的唯一标识符
            unique_identifier = f"gen-{generation_timestamp}-{video_prompt[:20].replace(' ', '').lower()}"

            yield self._create_response_json(
                "updateCurrentCellWithContent",
                {
                    "payload": {
                        "content": video_markdown,
                        "commandId": command_id,
                        "uniqueIdentifier": unique_identifier,  # 添加唯一标识符
                    },
                    "status": "processing",
                },
            )

            yield self._create_response_json(
                "updateCurrentCellMetadata",
                {
                    "payload": {
                        "commandId": command_id,
                        "uniqueIdentifier": unique_identifier,  # 添加唯一标识符
                        "metadata": {
                            "isGenerating": False,
                            "generationCompleted": True,
                            "generationEndTime": int(datetime.now().timestamp() * 1000),
                            "videoUrl": local_asset_url,
                        },
                    },
                    "status": "processing",
                },
            )

            # 设置为完成模式 - 类似 command_agent 的结束方式
            yield self._create_response_json(
                "setCurrentCellMode_complete",
                {
                    "status": "completed",
                    "payload": {
                        "commandId": command_id,
                        "response": f"Video generation completed: {video_prompt}",
                    },
                },
            )
