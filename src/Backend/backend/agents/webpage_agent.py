import time
from pathlib import Path
from typing import AsyncGenerator
from typing import Dict, Any

from .base_agent import BaseAgentTemplate


class WebPageAgent(BaseAgentTemplate):
    def __init__(self,
                 operation: Dict[str, Any] = None,
                 api_key: str = None,
                 base_url: str = None,
                 engine: str = "openai/gpt-oss-120b",
                 role: str = "You are a webpage generation AI agent.") -> None:
        super().__init__(operation, api_key, base_url, engine, role)
    """
    处理 /webpage 命令：使用 LLM 生成专业的 HTML 网页内容，
    写入 notebooks/{notebook_id}/.sandbox/{slug}/index.html，并通过流事件引导前端添加 LinkCell 并分屏展示。
    """

    def validate_operation(self) -> bool:
        content = self._get_payload_value("content", "")
        return isinstance(content, str) and content.strip().startswith("/webpage")

    def _extract_prompt(self, content: str) -> str:
        # 支持 '/webpage xxx' 或 '/webpage: xxx' 等格式
        txt = content.strip()[8:].strip(": ")
        return txt or "Generated Webpage"

    def _get_notebook_id(self) -> str:
        # 尝试从多处获取 notebook_id
        nb_id = self._get_payload_value("notebook_id", "")
        if nb_id:
            return nb_id
        ctx = self._get_payload_value("current_context", {}) or {}
        return ctx.get("notebook_id", "")

    def _create_sandbox_dir(self, notebook_id: str, slug: str) -> Path:
        base = Path(f"./notebooks/{notebook_id}/.sandbox")
        base.mkdir(parents=True, exist_ok=True)
        target = base / slug
        target.mkdir(parents=True, exist_ok=True)
        return target

    def _build_system_messages(self):
        """构建系统消息，指导 LLM 生成专业的 HTML 内容"""
        return [{
            "role": "system",
            "content": """你是一个专业的网页开发专家。用户会给你一个网页需求，你需要生成一个完整的、专业的、美观的 HTML 网页。

要求：
1. 生成完整的 HTML 文档，包含 DOCTYPE、html、head、body 等标准结构
2. 使用现代的 CSS 样式，包含响应式设计
3. 如果需要，可以包含 JavaScript 交互功能
4. 样式要美观、专业，使用合适的颜色搭配和布局
5. 确保所有 CSS 和 JS 都内联在 HTML 文件中（不使用外部链接）
6. 支持中文内容，设置合适的字体
7. 添加适当的 meta 标签和 viewport 设置
8. 内容要丰富完整，不要留空的标签

重要：请严格按照以下格式输出，不要添加任何其他文字：

<html_content>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>页面标题</title>
    <style>
        /* 完整的CSS样式 */
    </style>
</head>
<body>
    <!-- 完整的页面内容 -->
</body>
</html>
</html_content>"""
        }]

    async def process(self) -> AsyncGenerator[str, None]:
        if not self.validate_operation():
            yield self._create_response_json("error", {"error": "Invalid /webpage command"})
            return

        content = self._get_payload_value("content", "")
        prompt = self._extract_prompt(content)

        # notebook_id 注入保障
        notebook_id = self._get_notebook_id()
        if not notebook_id:
            op_nb = (self.operation or {}).get("payload", {}).get("notebook_id")
            if op_nb:
                notebook_id = op_nb
        if not notebook_id:
            raise ValueError("Missing notebook_id for /webpage; cannot write sandbox file")

        command_id = self._get_payload_value("commandId", f"web-{int(time.time())}")

        # 生成 slug 与目标目录
        base_slug = ''.join(ch for ch in prompt.strip().lower()[:24] if ch.isalnum() or ch == ' ').strip().replace(' ', '-') or 'page'
        slug = f"{base_slug}-{int(time.time())}"
        target_dir = self._create_sandbox_dir(notebook_id, slug)

        # 1) 首先创建一个 Hybrid Cell 来显示生成过程
        yield self._create_response_json("addCell2EndWithContent", {
            "payload": {
                "type": "Hybrid",
                "content": "",
                "commandId": command_id,
                "description": f"正在生成网页: {prompt}",
                "metadata": {
                    "generationType": "webpage",
                    "isGenerating": True,
                    "prompt": prompt
                }
            },
            "status": "processing"
        })

        # 2) 使用 LLM 生成 HTML 内容
        html_content = ""
        try:
            # 构建完整的查询
            full_query = f"请为以下需求生成一个专业的网页：{prompt}"

            # 显示生成进度
            yield self._create_response_json("addNewContent2CurrentCell", {
                "payload": {
                    "content": "🤖 正在使用 AI 生成专业网页内容...\n",
                    "commandId": command_id,
                },
                "status": "processing"
            })

            # 使用 LLM 生成 HTML 内容
            # 构建系统消息
            system_messages = self._build_system_messages()
            system_prompt = system_messages[0]["content"]

            # 调用 Oracle 的 query 方法
            response = self.query(system_prompt, full_query)

            # 处理响应
            if isinstance(response, dict):
                html_content = response.get("answer", "")
            else:
                html_content = response

            # 检查是否查询失败
            if html_content.startswith('QUERY_FAILED:'):
                raise Exception(f"LLM query failed: {html_content}")

            # 显示生成完成
            yield self._create_response_json("addNewContent2CurrentCell", {
                "payload": {
                    "content": f"✅ AI 生成完成！内容长度: {len(html_content)} 字符\n",
                    "commandId": command_id,
                },
                "status": "processing"
            })

        except Exception as e:
            yield self._create_response_json("addNewContent2CurrentCell", {
                "payload": {
                    "content": f"\n\n❌ 生成失败: {str(e)}\n",
                    "commandId": command_id,
                },
                "status": "processing"
            })
            return

        # 3) 提取 HTML 内容并保存文件
        final_html = html_content
        (target_dir / "index.html").write_text(final_html, encoding="utf-8")

        rel_path = f".sandbox/{slug}/index.html"
        title = f"{prompt[:40]}" if prompt else "Generated Webpage"
        link_md = f"[{title}](./{rel_path})"

        # 4) 转换为 LinkCell
        yield self._create_response_json("convertCurrentHybridCellToLinkCell", {
            "payload": {
                "content": link_md,
                "commandId": command_id,
                "metadata": {
                    "generationType": "webpage",
                    "isGenerating": False,
                    "sandboxPath": rel_path
                }
            },
            "status": "processing"
        })

        # 5) 让前端分屏打开该 HTML
        yield self._create_response_json("open_link_in_split", {
            "payload": {
                "href": f"./{rel_path}",
                "label": title,
                "notebook_id": notebook_id,
                "commandId": command_id
            },
            "status": "completed"
        })

        # 6) 结束
        yield self._create_response_json("ok", {"message": "webpage generated", "path": rel_path})


