import time
from pathlib import Path
from typing import AsyncGenerator, Dict, Any

from .base_agent import BaseAgentTemplate


class WebPageAgent(BaseAgentTemplate):
    """
    Handle /webpage, /react, /component commands.

    Generates HTML (single file) or a React component (single file),
    writes to notebooks/{notebook_id}/.sandbox/{slug}/, and streams UI events:
      1) add a Hybrid cell showing progress
      2) convert to LinkCell
      3) open in split view
    """

    # ---- Public API ---------------------------------------------------------

    def __init__(
        self,
        operation: Dict[str, Any] | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        engine: str = "gpt-5-mini",
        role: str = "You are a code generation agent.",
    ) -> None:
        super().__init__(operation, api_key, base_url, engine, role)

    def validate_operation(self) -> bool:
        content = self._get_payload_value("content", "")
        if not isinstance(content, str):
            return False
        c = content.strip()
        return c.startswith(("/webpage", "/react", "/component"))

    async def process(self) -> AsyncGenerator[str, None]:
        if not self.validate_operation():
            yield self._create_response_json("error", {"error": "Invalid command. Use /webpage, /react or /component."})
            return

        content = self._get_payload_value("content", "").strip()
        prompt = self._extract_prompt(content)
        gen_type = self._get_generation_type(content)

        notebook_id = self._get_notebook_id()
        if not notebook_id:
            raise ValueError("Missing notebook_id for /webpage; cannot write sandbox file")

        command_id = self._get_payload_value("commandId", f"web-{int(time.time())}")

        # Create sandbox path
        slug = self._make_slug(prompt)
        target_dir = self._create_sandbox_dir(notebook_id, slug)

        # 1) Start a Hybrid cell with progress text
        desc = f"Generating {'React component' if gen_type in ('react', 'component') else 'webpage'}: {prompt}"
        yield self._create_response_json(
            "addCell2EndWithContent",
            {
                "payload": {
                    "type": "Hybrid",
                    "content": "",
                    "commandId": command_id,
                    "description": desc,
                    "metadata": {
                        "generationType": gen_type,
                        "isGenerating": True,
                        "prompt": prompt,
                    },
                },
                "status": "processing",
            },
        )

        # 2) Query LLM
        try:
            sys_prompt = self._system_prompt(gen_type)
            user_prompt = self._user_prompt(gen_type, prompt)

            yield self._create_response_json(
                "addNewContent2CurrentCell",
                {
                    "payload": {
                        "content": "🤖 Generating with AI...\n",
                        "commandId": command_id,
                    },
                    "status": "processing",
                },
            )

            response = self.query(sys_prompt, user_prompt)
            generated = response.get("answer", "") if isinstance(response, dict) else str(response)

            if generated.startswith("QUERY_FAILED:"):
                raise RuntimeError(generated)

            yield self._create_response_json(
                "addNewContent2CurrentCell",
                {
                    "payload": {
                        "content": f"✅ Done. Output length: {len(generated)} chars\n",
                        "commandId": command_id,
                    },
                    "status": "processing",
                },
            )

        except Exception as e:
            yield self._create_response_json(
                "addNewContent2CurrentCell",
                {
                    "payload": {
                        "content": f"\n\n❌ Generation failed: {e}\n",
                        "commandId": command_id,
                    },
                    "status": "processing",
                },
            )
            return

        # 3) Extract fenced content and write to file
        if gen_type in ("react", "component"):
            final_content = self._extract_block(generated, "<react_content>", "</react_content>") or generated
            filename = "component.jsx"
            filetype = "jsx"
            file_text = f"// React Component — {prompt}\n{final_content}\n"
        else:
            final_content = self._extract_block(generated, "<html_content>", "</html_content>") or generated
            filename = "index.html"
            filetype = "html"
            file_text = final_content

        (target_dir / filename).write_text(file_text, encoding="utf-8")

        rel_path = f".sandbox/{slug}/{filename}"
        title = (prompt[:40] if prompt else f"Generated {gen_type.title()}").strip() or "Generated"

        # 4) Convert Hybrid -> LinkCell
        if gen_type in ("react", "component"):
            link_md = f"**React Component**: [{title}](./{rel_path})\n\n*Live-edit in the React sandbox*"
        else:
            link_md = f"[{title}](./{rel_path})"

        yield self._create_response_json(
            "convertCurrentHybridCellToLinkCell",
            {
                "payload": {
                    "content": link_md,
                    "commandId": command_id,
                    "metadata": {
                        "generationType": gen_type,
                        "isGenerating": False,
                        "sandboxPath": rel_path,
                        "fileType": filetype,
                        "isReactComponent": gen_type in ("react", "component"),
                    },
                },
                "status": "processing",
            },
        )

        # 5) Open in split view
        yield self._create_response_json(
            "open_link_in_split",
            {
                "payload": {
                    "href": f"./{rel_path}",
                    "label": title,
                    "notebook_id": notebook_id,
                    "commandId": command_id,
                    "fileType": filetype,
                    "openInReactLive": gen_type in ("react", "component"),
                },
                "status": "completed",
            },
        )

        # 6) Finish
        yield self._create_response_json(
            "ok",
            {
                "message": f"{gen_type} generated",
                "path": rel_path,
                "type": gen_type,
            },
        )

    # ---- Internals ----------------------------------------------------------

    def _extract_prompt(self, content: str) -> str:
        # Support "/webpage xxx", "/react xxx", "/component xxx"
        content = content.strip()
        if content.startswith("/react"):
            txt = content[6:].strip(": ").strip()
        elif content.startswith("/component"):
            txt = content[10:].strip(": ").strip()
        else:
            txt = content[8:].strip(": ").strip()
        return txt or "Untitled"

    def _get_generation_type(self, content: str) -> str:
        c = content.strip()
        if c.startswith("/react") or c.startswith("/component"):
            return "react"
        return "webpage"

    def _get_notebook_id(self) -> str:
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

    def _make_slug(self, prompt: str) -> str:
        base = "".join(ch if ch.isalnum() or ch == " " else "-" for ch in prompt.lower()).strip()
        base = "-".join(filter(None, base.split()))[:32] or "page"
        return f"{base}-{int(time.time())}"

    @staticmethod
    def _extract_block(text: str, start_tag: str, end_tag: str) -> str | None:
        s = text.find(start_tag)
        e = text.find(end_tag)
        if s == -1 or e == -1 or e <= s:
            return None
        return text[s + len(start_tag) : e].strip()

    # ---- Prompt Builders (short & strict) -----------------------------------

    def _system_prompt(self, gen_type: str) -> str:
        if gen_type == "react":
            # Short, strict, machine-friendly
            return (
                "You generate a single, self-contained React function component. "
                "Constraints:\n"
                "- Output ONLY inside <react_content>...</react_content>.\n"
                "- No extra text.\n"
                "- Use modern React (hooks) and JSX.\n"
                "- Tailwind classes allowed; no external imports.\n"
                "- Must call render(<MyComponent />) at the end.\n"
            )
        else:
            return (
                "You generate a single, self-contained HTML document. "
                "Constraints:\n"
                "- Output ONLY inside <html_content>...</html_content>.\n"
                "- No extra text.\n"
                "- Include <!DOCTYPE html>, <html>, <head>, <body>.\n"
                "- Inline CSS/JS only (no external links).\n"
                "- Responsive meta viewport required.\n"
                "- Keep it clean and professional.\n"
            )

    def _user_prompt(self, gen_type: str, prompt: str) -> str:
        if gen_type == "react":
            # Keep it compact
            return (
                f"Requirement: {prompt}\n\n"
                "<react_content>\n"
                "function MyComponent(){\n"
                "  const [count,setCount]=React.useState(0);\n"
                "  return (\n"
                "    <div className=\"p-4\">\n"
                "      {/* Replace this with your final component implementation per requirement */}\n"
                "      <button onClick={()=>setCount(count+1)}>Click {count}</button>\n"
                "    </div>\n"
                "  );\n"
                "}\n"
                "render(<MyComponent />);\n"
                "</react_content>\n"
            )
        else:
            return (
                f"Requirement: {prompt}\n\n"
                "<html_content>\n"
                "<!DOCTYPE html>\n"
                "<html lang=\"en\">\n"
                "<head>\n"
                "  <meta charset=\"UTF-8\" />\n"
                "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n"
                "  <title>Page</title>\n"
                "  <style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial}main{padding:24px;max-width:960px;margin:0 auto}</style>\n"
                "</head>\n"
                "<body>\n"
                "  <main>\n"
                "    <!-- Replace this with your final page implementation per requirement -->\n"
                "    <h1>Generated Page</h1>\n"
                "    <p>This is a starter scaffold.</p>\n"
                "  </main>\n"
                "</body>\n"
                "</html>\n"
                "</html_content>\n"
            )
