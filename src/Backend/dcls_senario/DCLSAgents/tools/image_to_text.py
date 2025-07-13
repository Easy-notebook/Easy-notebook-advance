import base64
from PIL import Image
import os
from typing import Dict, Any, Optional

class ImageToTextTool:
    """将图片转换为文本描述的工具 - 无LangChain版本"""
    
    def __init__(self, oracle=None):
        """
        初始化图片转文本工具
        
        Args:
            oracle: Oracle实例，如果未提供将尝试导入和创建
        """
        self.name = "image_to_text"
        self.description = "将图片转换为文本描述的工具"
        
        if oracle is None:
            try:
                from app.utils.oracle import Oracle
                self.oracle = Oracle()
            except ImportError:
                self.oracle = None
        else:
            self.oracle = oracle
            
        if not self.oracle:
            raise ValueError("必须提供 Oracle 实例或确保 Oracle 类可用")

    def _encode_image(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def run(self, tool_input: Dict[str, Any]) -> str:
        """运行工具 - 新接口"""
        image_path = tool_input.get("image_path", "")
        prompt = tool_input.get("prompt", "请描述这张图片")
        return self._run(image_path, prompt)
    
    def _run(self, image_path: str, prompt: str = "请描述这张图片") -> str:
        """运行工具"""
        try:
            if not os.path.exists(image_path):
                return "错误:图片文件不存在"
            try:
                Image.open(image_path)
            except:
                return "错误:文件不是有效的图片格式"

            base64_image = self._encode_image(image_path)

            # 使用Oracle的消息格式
            messages = [
                {"role": "system", "content": "你是一个专业的数据分析师。"},
                {
                    "role": "user", 
                    "content": f"{prompt}\n\n[图片已编码为base64格式但此版本暂不支持图片处理]"
                }
            ]

            # 注意：当前Oracle版本可能不支持图片，这里提供文本替代
            response = self.oracle.generate(messages)
            return response

        except Exception as e:
            return f"错误:图片处理失败 - {str(e)}"