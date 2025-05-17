# usage.py
import json
from typing import AsyncGenerator, Dict, Any

from dotenv import load_dotenv
from agents.general_agent import GeneralAgent

load_dotenv()

async def handle_user_questions(operation: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """
    处理用户问题并生成流式回答
    """
    try:
        agent = GeneralAgent()
        print(operation)

        related_cells = operation.get("payload", {}).get("related_cells", [])
        related_qa_ids = operation.get("payload", {}).get("relatedQAIds", [])
        content = operation.get("payload", {}).get("content", "")
        q_id = operation.get("payload", {}).get("QId")

        if not q_id:
            raise ValueError("Missing QId in payload")

        async for chunk in agent.handle_user_questions(content, q_id, related_qa_ids, related_cells):
            yield chunk

    except Exception as e:
        error_msg = f"Error in handle_user_questions: {str(e)}"
        print(error_msg)
        yield json.dumps({
            "type": "error",
            "data": {
                "payload": {"QId": operation.get('payload', {}).get('QId')},
                "error": error_msg
            }
        }) + "\n"
