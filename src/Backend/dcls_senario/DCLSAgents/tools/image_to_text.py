from langchain.tools import BaseTool
from langchain.pydantic_v1 import BaseModel, Field
from langchain.base_language import BaseLanguageModel
import base64
from PIL import Image
import os

class ImageToTextInput(BaseModel):
    """输入参数模型"""
    image_path: str = Field(..., description="图片文件路径")
    prompt: str = Field(default="请描述这张图片", description="提示词")

class ImageToTextTool(BaseTool):
    name: str = "image_to_text"
    description: str = "将图片转换为文本描述的工具"
    args_schema: type[BaseModel] = ImageToTextInput
    
    llm: BaseLanguageModel = Field(description="Language Model to use")
    
    def __init__(self, llm: BaseLanguageModel):
        super().__init__(llm=llm)
        if not llm:
            raise ValueError("必须提供 LLM 实例")

    def _encode_image(self, image_path: str) -> str:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

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

            messages = [
                {"role": "system", "content": "你是一个专业的数据分析师。"},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
                    ]
                }
            ]

            response = self.llm.invoke(messages)
            return response.content

        except Exception as e:
            return f"错误:图片处理失败 - {str(e)}"