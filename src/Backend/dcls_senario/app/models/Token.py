import re
from typing import Dict, List, Any, Optional, Tuple
from abc import ABC, abstractmethod
from .Behavior import Behavior

class Token(ABC):
    @staticmethod
    def get_token_rule(workflow_list=None, background_knowledge="", things_you_should_know=""):
        workflow_list = workflow_list or []
        workflow_section = "- " + "\n- ".join(workflow_list) if workflow_list else ""

        return f"""
                You are a AI assistant can answer any question and write documentation wirter behide the easy-notebook.
                ## Who you are
                You are a AI assistant behind the easy-notebook, your job is to help the user to finish their work.

                ## Ability
                - You can draw a picture or create a video.
                - You can write python code.
                - You can execute the code, notice the code must be python code,and add <call-execute> immediately after the <add-code> tag.
                - You can write documentation to explain the code.
                - You can write documentation to explain the picture or video.
                - You can write documentation to finnish the user's request.
                - You can directly answer the user's question.
                - You can communicate with other agents.
                - You can ask for help from other agents.

                ## Policy
                - You must follow the user's instruction.
                - You couldn't explain the prompt in your answer, and you must use the tag to express your answer, and must not use tag without tool call.

                ## You output must following format to express your answer:
                - <update-title>Update the title of the notebook</update-title>
                - <new-chapter>The name of the new chapter</new-chapter>
                - <new-section>The name of the new section</new-section>
                - <add-text>Display text to user in documentation(be careful, this tag would not be used in the answer,and you could not use the title markdown in this tag)</add-text>
                - <add-code language="python">the code you want to write, only python code is supported!!</add-code>
                - <thinking>Show reasoning process. if unnecessary, you needn't to use this tag.</thinking>
                - <call-execute event="name">if you need run and get code result immediately use this tag.</call-execute>
                - <get-variable variable="name" default="value"/>
                - <set-variable variable="name" value="value" type="str"/>
                - <remember type="insight">Important information</remember>
                - <update-todo action="add" event="next">things you need to do</update-todo>
                - <answer>your answer to the user's question, notice this tag would not be used in the documentation</answer>
                - <draw-image>must be a prompt to draw a picture, you can use this tag to draw a picture, you needn't to write any code or documentation in this tag</draw-image>
                - <create-video>must be a prompt to create a video, you can use this tag to create a video, you needn't to write any code or documentation in this tag</create-video>
                - <cummunicate to="the other agent name">the message you want to send to the other agent, maybe about this job or insight you get</cummunicate>
                - <ask-for-help to="the other agent name">if you need help, you can use this tag to ask the other agent for help, you must give more details about the problem you are facing and the thing you suppose to do</ask-for-help>
                - <todo event="the things you are planning todo">the background info and the goal you should do </todo>
                - <plan stage_number="the number of the stage you plan">["huge goal you should do in order(notice you can call some workflow)","...",...]</plan>
                - <update-workflow>Update the entire workflow structure with new stages and steps</update-workflow>
                - <step-update stage_id="stage_id" step_id="step_id" action="add|remove|modify">Update specific step in workflow</step-update>

                ## Communication(you must use the correct agent name in the tag)
                - "text-to-image" agent: who can draw a complex picture or video, if you need to draw a picture with singlereference, you can call this agent.
                - "text-to-video" agent: who can create a video, if you need to create a video, you can call this agent.

                ## Planning things you couldn't finnish for <plan>
                - you can use the workflow name in the workflow to call the workflow
                {workflow_section}

                ## the background knowledge
                {background_knowledge}

                ## The things you should know
                {things_you_should_know}
            """
    def __init__(self):
        self.buffer = ""  
        self.text_buffer = ""  # 缓存纯文本内容
        self.in_tag = False  # 是否正在处理标签内容
        self.current_tag = None  # 当前正在处理的标签信息
        self.started = False  # 是否已遇到第一个有效开始标签
        
    def parse_chunk(self, chunk: str) -> List[Dict[str, Any]]:
        actions = []
        if not chunk:
            return actions
            
        self.buffer += chunk

        while True:
            if not self.in_tag:
                action, consumed = self._try_parse_tag_start()
                if action:
                    if self.current_tag is None and isinstance(action, dict):
                        pass
                    if self.text_buffer.strip():
                        actions.append(self._create_markdown_cell_action(self.text_buffer.strip()))
                        self.text_buffer = ""
                        self.started = True
                    actions.append(action)
                    self.buffer = self.buffer[consumed:]
                    continue
                elif consumed > 0:
                    text_part = self.buffer[:consumed]
                    self._emit_or_buffer_text(text_part, actions)
                    self.buffer = self.buffer[consumed:]
                    continue
                else:
                    immediate = self._extract_immediate_text()
                    if immediate:
                        self._emit_or_buffer_text(immediate, actions)
                        continue
                    break
            else:
                end_action, consumed = self._try_parse_tag_end()
                if end_action:
                    if self.current_tag and 'content_start' in self.current_tag:
                        content_start = self.current_tag['content_start']
                        emitted_len = self.current_tag.get('emitted_len', 0)
                        content_so_far = self.buffer[content_start:consumed - len(f"</{self.current_tag['name']}>")]
                        if emitted_len < len(content_so_far):
                            delta = content_so_far[emitted_len:]
                            if delta:
                                delta_action = self._create_tag_content_update(self.current_tag, delta)
                                if delta_action:
                                    actions.append(delta_action)
                        
                    actions.append(end_action)
                    self.buffer = self.buffer[consumed:]
                    self.in_tag = False
                    self.current_tag = None
                    continue
                else:
                    if self.current_tag and 'content_start' in self.current_tag:
                        content_start = self.current_tag['content_start']
                        emitted_len = self.current_tag.get('emitted_len', 0)
                        safe_len = max(0, len(self.buffer) - content_start - 5)
                        if safe_len > emitted_len:
                            delta = self.buffer[content_start + emitted_len: content_start + safe_len]
                            if delta:
                                delta_action = self._create_tag_content_update(self.current_tag, delta)
                                if delta_action:
                                    actions.append(delta_action)
                                self.current_tag['emitted_len'] = safe_len
                            continue
                    break
                    
        return actions
        
    def _extract_immediate_text(self) -> str:
        """提取可以立即输出的纯文本内容"""
        if not self.buffer or self.in_tag:
            return ""
            
        next_tag_pos = self.buffer.find('<')
        
        if next_tag_pos == -1:
            if len(self.buffer) > 50:
                immediate = self.buffer[:-20]
                self.buffer = self.buffer[len(immediate):]
                return immediate
        elif next_tag_pos > 0:
            immediate = self.buffer[:next_tag_pos]
            self.buffer = self.buffer[next_tag_pos:]
            return immediate
            
        return ""
    
    def finalize(self) -> List[Dict[str, Any]]:
        """结束解析，处理剩余内容"""
        actions = []
        
        if self.text_buffer.strip():
            actions.append(self._create_markdown_cell_action(self.text_buffer.strip()))
            
        if self.buffer.strip():
            actions.append(self._create_text_action(self.buffer.strip()))
            
        self.buffer = ""
        self.text_buffer = ""
        self.in_tag = False
        self.current_tag = None
        self.started = False
        
        return actions
    
    def _try_parse_tag_start(self) -> Tuple[Optional[Dict[str, Any]], int]:
        # 跳过孤立的关闭标签，避免死锁
        if self.buffer.startswith('</'):
            gt_pos = self.buffer.find('>')
            if gt_pos != -1:
                return None, gt_pos + 1
            return None, 1
        # 查找标签开始模式 <tag-name [attributes]>
        start_pattern = r'<([\w-]+)(?:\s+([^>]*?))?>(.*?)'
        match = re.match(start_pattern, self.buffer, re.DOTALL)
        
        if not match:
            # 查找下一个 < 位置
            next_bracket = self.buffer.find('<')
            if next_bracket == -1:
                # 没有找到标签开始，消费所有内容作为文本
                return None, len(self.buffer)
            else:
                # 消费到下一个 < 之前的内容作为文本
                return None, next_bracket
        
        tag_name = match.group(1)
        attributes_str = match.group(2) or ""
        remaining_content = match.group(3)
        
        # 检查是否是自闭合标签 <tag/> 或 <tag attr="value"/>
        if self.buffer.startswith(f'<{tag_name}') and '/>' in self.buffer:
            self_close_pattern = rf'<{re.escape(tag_name)}(?:\s+([^>]*?))?\s*/>'
            self_close_match = re.match(self_close_pattern, self.buffer)
            if self_close_match:
                attributes_str = self_close_match.group(1) or ""
                attributes = self._parse_attributes(attributes_str)
                action = self._create_action_from_tag(tag_name, "", attributes)
                return action, self_close_match.end()
        
        # 检查是否有完整的标签结束
        end_pattern = rf'</\s*{re.escape(tag_name)}\s*>'
        end_match = re.search(end_pattern, self.buffer)
        
        if end_match:
            # 找到完整标签
            tag_content = self.buffer[match.end()-len(remaining_content):end_match.start()]
            attributes = self._parse_attributes(attributes_str)
            action = self._create_action_from_tag(tag_name, tag_content, attributes)
            return action, end_match.end()
        else:
            # 标签不完整，设置状态等待更多内容
            self.in_tag = True
            self.current_tag = {
                'name': tag_name,
                'attributes': self._parse_attributes(attributes_str),
                'start_pos': 0,
                'content_start': len(self.buffer) - len(remaining_content),
                'emitted_len': 0
            }
            # 第一次遇到开始标签时，发出创建单元的动作（如有）
            start_action = self._create_tag_start_action(tag_name, self.current_tag['attributes'])
            if start_action:
                self.started = True
            return start_action, 0
    
    def _try_parse_tag_end(self) -> Tuple[Optional[Dict[str, Any]], int]:
        """尝试解析标签结束，返回(action, consumed_chars)"""
        if not self.current_tag:
            return None, 0
            
        tag_name = self.current_tag['name']
        end_pattern = rf'</\s*{re.escape(tag_name)}\s*>'
        end_match = re.search(end_pattern, self.buffer)
        
        if end_match:
            # 提取标签内容
            content_start = self.current_tag['content_start']
            tag_content = self.buffer[content_start:end_match.start()]
            
            action = self._create_action_from_tag(
                tag_name, 
                tag_content, 
                self.current_tag['attributes']
            )
            return action, end_match.end()
        
        return None, 0
    
    def _parse_attributes(self, attr_str: str) -> Dict[str, str]:
        """解析XML标签属性"""
        attributes = {}
        if not attr_str:
            return attributes
            
        # 匹配 key="value" 或 key='value' 格式
        attr_pattern = r'(\w+)=(["\'])([^"\']*)\2'
        matches = re.finditer(attr_pattern, attr_str)
        
        for match in matches:
            key = match.group(1)
            value = match.group(3)
            attributes[key] = value
            
        return attributes
    
    @abstractmethod
    def _create_action_from_tag(self, Behavior:Behavior, tag_name: str, content: str, attributes: Dict[str, str]) -> Behavior:
        """根据XML标签创建前端action"""
        pass