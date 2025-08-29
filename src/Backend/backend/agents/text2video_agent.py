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
        engine: str = "gpt-5-mini",
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
        # 生成与 image agent 一致的唯一标识符策略
        prompt_hash = video_prompt[:20].replace(' ', '').lower()
        unique_identifier = f"gen-{generation_timestamp}-{prompt_hash}"
        yield self._create_response_json(
            "addCell2EndWithContent",
            {
                "payload": {
                    "type": "image",  # 使用image类型来显示视频
                    "content": "",
                    "commandId": command_id,
                    "prompt": video_prompt,  # 用于生成唯一标识符
                    "uniqueIdentifier": unique_identifier,
                    "description": f"Generating video: {video_prompt}",
                    "metadata": {
                        "isGenerating": True,
                        "generationStartTime": generation_timestamp,
                        "generationType": "video",
                        "start_time": generation_timestamp,
                        "prompt": video_prompt,
                        "uniqueIdentifier": unique_identifier,
                    },
                },
                "status": "processing",
            },
        )

        # 使用异步非阻塞方式启动视频生成
        try:
            task_id = await self.text2video_client.generate_video_async(video_prompt)
            if not task_id:
                raise ValueError("Failed to start video generation task")
            
            # 立即返回任务状态，不阻塞主流
            yield self._create_response_json(
                "video_generation_task_started",
                {
                    "payload": {
                        "taskId": task_id,
                        "commandId": command_id,
                        "uniqueIdentifier": unique_identifier,
                        "prompt": video_prompt,
                    },
                    "status": "processing",
                },
            )

            # 启动异步状态检查任务，不阻塞当前流
            asyncio.create_task(self._monitor_video_generation(
                task_id, command_id, unique_identifier, video_prompt, generation_timestamp
            ))

        except Exception as e:
            # 生成失败时更新状态
            yield self._create_response_json(
                "updateCurrentCellMetadata",
                {
                    "payload": {
                        "commandId": command_id,
                        "uniqueIdentifier": unique_identifier,
                        "metadata": {
                            "isGenerating": False,
                            "generationError": str(e),
                            "generationStatus": "failed",
                        },
                    },
                    "status": "error",
                },
            )

    async def _monitor_video_generation(self, task_id: str, command_id: str, unique_identifier: str, 
                                       video_prompt: str, generation_timestamp: int):
        """异步监控视频生成状态，独立于主流"""
        max_attempts = 60  # 最多检查60次，每次间隔10秒 = 10分钟
        attempt = 0
        
        while attempt < max_attempts:
            try:
                await asyncio.sleep(10)  # 非阻塞等待10秒
                status, video_url = await self.text2video_client.check_generation_status(task_id)
                
                if status in ["waiting", "active", "queued", "generating"]:
                    attempt += 1
                    continue
                elif status == "completed" and video_url:
                    # 生成完成，发送更新事件到前端
                    await self._send_video_completion_update(
                        video_url, command_id, unique_identifier, video_prompt, generation_timestamp
                    )
                    break
                else:
                    # 生成失败
                    await self._send_video_error_update(
                        command_id, unique_identifier, f"Generation failed with status: {status}"
                    )
                    break
                    
            except Exception as e:
                await self._send_video_error_update(
                    command_id, unique_identifier, f"Error monitoring generation: {str(e)}"
                )
                break
        
        if attempt >= max_attempts:
            await self._send_video_error_update(
                command_id, unique_identifier, "Generation timeout"
            )

    async def _send_video_completion_update(self, video_url: str, command_id: str, 
                                          unique_identifier: str, video_prompt: str, generation_timestamp: int):
        """发送视频生成完成的更新事件"""
        video_markdown = f"![{video_prompt}]({video_url})"
        
        # 这里需要通过某种机制发送更新到前端
        # 由于我们在独立的task中，需要使用WebSocket或其他推送机制
        # 暂时使用日志记录，实际实现需要添加推送机制
        print(f"Video generation completed: {unique_identifier}, URL: {video_url}")

    async def _send_video_error_update(self, command_id: str, unique_identifier: str, error_msg: str):
        """发送视频生成错误的更新事件"""
        print(f"Video generation error: {unique_identifier}, Error: {error_msg}")
