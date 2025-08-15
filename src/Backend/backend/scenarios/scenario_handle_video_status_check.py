import json
import asyncio
from utils.text2video import Text2VideoAPI

async def handle_video_status_check(operation):
    """处理视频生成状态查询"""
    try:
        payload = operation.get("payload", {})
        task_id = payload.get("taskId")
        unique_identifier = payload.get("uniqueIdentifier")
        command_id = payload.get("commandId")
        
        if not task_id:
            yield json.dumps({
                "type": "error",
                "data": {
                    "error": "Missing taskId in payload",
                    "payload": payload
                }
            }) + "\n"
            return
        
        # 创建Text2VideoAPI实例
        video_client = Text2VideoAPI()
        
        # 检查生成状态
        status, video_url = await video_client.check_generation_status(task_id)
        
        if status is None:
            yield json.dumps({
                "type": "video_generation_status_update",
                "data": {
                    "payload": {
                        "taskId": task_id,
                        "uniqueIdentifier": unique_identifier,
                        "commandId": command_id,
                        "status": "error",
                        "error": "Failed to check generation status"
                    }
                }
            }) + "\n"
            return
        
        # 构建状态更新响应
        response_payload = {
            "taskId": task_id,
            "uniqueIdentifier": unique_identifier,
            "commandId": command_id,
            "status": status
        }
        
        # 如果生成完成且有视频URL，添加到响应中
        if status == "completed" and video_url:
            response_payload["videoUrl"] = video_url
            response_payload["prompt"] = payload.get("prompt", "Generated Video")
        elif status not in ["waiting", "active", "queued", "generating"]:
            # 如果状态不是正在处理的状态，但也不是completed，则认为是失败
            response_payload["status"] = "failed" 
            response_payload["error"] = f"Unexpected status: {status}"
        
        yield json.dumps({
            "type": "video_generation_status_update",
            "data": {
                "payload": response_payload,
                "status": "processing"
            }
        }) + "\n"
        
    except Exception as e:
        error_msg = f"Error in handle_video_status_check: {str(e)}"
        print(error_msg)
        
        yield json.dumps({
            "type": "error", 
            "data": {
                "error": error_msg,
                "payload": operation.get("payload", {})
            }
        }) + "\n"