import re
from typing import Dict, List, Any, Optional, Tuple

class StreamingTemplateParser:
    """流式XML标签解析器 - 将LLM输出的XML标签转换为前端JSON格式"""
    
    def __init__(self):
        self.buffer = ""  # 缓存不完整的内容
        self.text_buffer = ""  # 缓存纯文本内容
        self.in_tag = False  # 是否正在处理标签内容
        self.current_tag = None  # 当前正在处理的标签信息
        self.pending_tag_start = None  # 等待结束标签的开始标签信息
        
    def parse_chunk(self, chunk: str) -> List[Dict[str, Any]]:
        """解析单个文本块，返回完整的前端actions列表"""
        actions = []
        if not chunk:
            return actions

        self.buffer += chunk

        # 如果正在等待结束标签，优先查找结束标签
        if self.pending_tag_start:
            end_tag_pattern = rf'</{re.escape(self.pending_tag_start["name"])}>'
            end_tag_match = re.search(end_tag_pattern, self.buffer)

            if end_tag_match:
                # 找到结束标签，提取内容
                content = self.buffer[:end_tag_match.start()]

                # 创建action
                attributes = self.pending_tag_start["attributes"]
                action = self._create_action_from_tag(self.pending_tag_start["name"], content, attributes)
                if action:
                    actions.append(action)

                # 清理状态
                self.buffer = self.buffer[end_tag_match.end():]
                self.pending_tag_start = None

                # 继续处理剩余内容
                if self.buffer:
                    actions.extend(self.parse_chunk(""))
                return actions
            else:
                # 还没有找到结束标签，继续等待
                return actions

        # 正常处理标签
        while True:
            # 查找标签开始
            tag_start_match = re.search(r'<([a-zA-Z-]+)(?:\s+([^>]*?))?>', self.buffer)

            if not tag_start_match:
                # 没有找到标签开始，处理剩余文本
                if len(self.buffer) > 50:  # 如果buffer足够长，输出部分文本
                    text_to_output = self.buffer[:-20]  # 保留20个字符防止标签被截断
                    if text_to_output.strip():
                        actions.append(self._create_text_action(text_to_output))
                    self.buffer = self.buffer[len(text_to_output):]
                break

            # 输出标签前的文本
            before_tag = self.buffer[:tag_start_match.start()]
            if before_tag.strip():
                actions.append(self._create_text_action(before_tag.strip()))

            # 获取标签信息
            tag_name = tag_start_match.group(1)
            attributes_str = tag_start_match.group(2) or ""

            # 查找对应的结束标签
            end_tag_pattern = rf'</{re.escape(tag_name)}>'
            remaining_buffer = self.buffer[tag_start_match.end():]
            end_tag_match = re.search(end_tag_pattern, remaining_buffer)

            if end_tag_match:
                # 找到完整的标签对
                content = remaining_buffer[:end_tag_match.start()]

                # 创建对应的action
                attributes = self._parse_attributes(attributes_str)
                action = self._create_action_from_tag(tag_name, content, attributes)
                if action:
                    actions.append(action)

                # 移除已处理的内容（包括结束标签）
                processed_length = tag_start_match.end() + end_tag_match.end()
                self.buffer = self.buffer[processed_length:]
            else:
                # 没有找到结束标签
                if tag_start_match.group(0).endswith('/>'):
                    # 自闭合标签
                    attributes = self._parse_attributes(attributes_str)
                    action = self._create_action_from_tag(tag_name, "", attributes)
                    if action:
                        actions.append(action)
                    self.buffer = self.buffer[tag_start_match.end():]
                else:
                    # 不完整的标签，设置等待状态
                    self.pending_tag_start = {
                        "name": tag_name,
                        "attributes": self._parse_attributes(attributes_str)
                    }
                    # 移除开始标签，保留内容等待结束标签
                    self.buffer = self.buffer[tag_start_match.end():]
                    break

        return actions
        
    def _extract_immediate_text(self) -> str:
        """提取可以立即输出的纯文本内容"""
        if not self.buffer or self.in_tag:
            return ""
            
        # 查找下一个可能的标签开始位置
        next_tag_pos = self.buffer.find('<')
        
        if next_tag_pos == -1:
            # 没有找到标签，如果缓冲区长度超过阈值，输出部分内容
            if len(self.buffer) > 50:  # 阈值可调整
                immediate = self.buffer[:-20]  # 保留20个字符以防标签被截断
                self.buffer = self.buffer[len(immediate):]
                return immediate
        elif next_tag_pos > 0:
            # 找到标签，输出标签前的内容
            immediate = self.buffer[:next_tag_pos]
            self.buffer = self.buffer[next_tag_pos:]
            return immediate
            
        return ""
    
    def finalize(self) -> List[Dict[str, Any]]:
        """结束解析，处理剩余内容"""
        actions = []
        
        # 处理剩余的文本内容
        if self.text_buffer.strip():
            actions.append(self._create_text_action(self.text_buffer.strip()))
            
        # 处理不完整的标签内容（作为文本处理）
        if self.buffer.strip():
            actions.append(self._create_text_action(self.buffer.strip()))
            
        # 重置状态
        self.buffer = ""
        self.text_buffer = ""
        self.in_tag = False
        self.current_tag = None
        self.pending_tag_start = None
        
        return actions
    
    def _try_parse_tag_start(self) -> Tuple[Optional[Dict[str, Any]], int]:
        """尝试解析标签开始，返回(action, consumed_chars)"""
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
                'content_start': len(self.buffer) - len(remaining_content)
            }
            return None, 0
    
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
    
    def _create_text_action(self, text: str) -> Dict[str, Any]:
        """创建文本内容的前端action"""
        return {
            "type": "addNewContent2CurrentCell",
            "data": {
                "payload": {
                    "content": text
                }
            }
        }
    
    def _create_tag_start_action(self, tag_name: str, attributes: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """创建标签开始时的action（用于创建cell等）"""
        
        if tag_name == "new-section":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "markdown",
                        "description": "New Section",
                        "content": "## ",  # 先创建标题框架
                        "metadata": {"isStreaming": True}
                    }
                }
            }
            
        elif tag_name == "add-code":
            language = attributes.get("language", "python")
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "code",
                        "description": f"Code Block ({language})",
                        "content": content,  # 使用实际内容
                        "language": language,
                        "metadata": {"isStreaming": False}  # 标记为非流式，因为内容已完整
                    }
                }
            }
            
        elif tag_name == "thinking":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "markdown",
                        "description": "Thinking Process",
                        "content": "**🤔 Thinking:** ",
                        "metadata": {"isThinking": True, "isStreaming": True}
                    }
                }
            }
            
        elif tag_name == "draw-image":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "image",
                        "description": "Generated Image",
                        "content": "",
                        "metadata": {
                            "isGenerating": True,
                            "generationType": "image",
                            "isStreaming": True
                        }
                    }
                }
            }
            
        return None
    
    def _create_tag_content_update(self, tag_info: Dict[str, Any], content: str) -> Optional[Dict[str, Any]]:
        """创建标签内容更新的action（流式更新当前cell）"""
        if not content.strip():
            return None
            
        tag_name = tag_info["name"]
        
        if tag_name in ["add-text", "new-section", "thinking", "add-code", "draw-image", "create-video"]:
            return {
                "type": "addNewContent2CurrentCell",
                "data": {
                    "payload": {
                        "content": content
                    }
                }
            }
        
        return None
    
    def _create_tag_end_action(self, tag_info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """创建标签结束时的action（完成当前操作）"""
        tag_name = tag_info["name"]
        
        if tag_name == "call-execute":
            event_name = tag_info["attributes"].get("event", "execute")
            return {
                "type": "runCurrentCodeCell",
                "payload": {
                    "event": event_name,
                    "auto_execute": True
                }
            }
            
        elif tag_name in ["get-variable", "set-variable", "remember", "update-todo"]:
            # 这些是立即执行的操作
            return self._create_action_from_tag(tag_name, tag_info["content"], tag_info["attributes"])
            
        elif tag_name in ["add-text", "new-section", "thinking", "add-code", "draw-image", "create-video"]:
            # 标记流式完成
            return {
                "type": "updateCurrentCellMetadata",
                "data": {
                    "payload": {
                        "metadata": {
                            "isStreaming": False,
                            "streamingCompleted": True
                        }
                    }
                }
            }
        
        return None
    
    def _create_action_from_tag(self, tag_name: str, content: str, attributes: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """根据XML标签创建前端action"""
        
        if tag_name == "update-title":
            return {
                "type": "update_notebook_title",
                "payload": {
                    "title": content
                }
            }
            
        elif tag_name == "new-chapter":
            return {
                "type": "update_current_phase", 
                "payload": {
                    "phaseId": content.lower().replace(" ", "_"),
                    "phaseName": content
                }
            }
            
        elif tag_name == "new-section":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "markdown",
                        "description": content,
                        "content": f"### {content}"
                    }
                }
            }
            
        elif tag_name == "add-text":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "markdown",
                        "description": "Text Content",
                        "content": content
                    }
                }
            }
            
        elif tag_name == "add-code":
            language = attributes.get("language", "python")
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "code",
                        "description": f"Code Block ({language})",
                        "content": content,
                        "language": language
                    }
                }
            }
            
        elif tag_name == "thinking":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "markdown",
                        "description": "Thinking Process",
                        "content": f"**🤔 Thinking:** {content}",
                        "metadata": {
                            "isThinking": True
                        }
                    }
                }
            }
            
        elif tag_name == "call-execute":
            event_name = attributes.get("event", "execute")
            return {
                "type": "runCurrentCodeCell",
                "payload": {
                    "event": event_name,
                    "auto_execute": True
                }
            }
            
        elif tag_name == "get-variable":
            var_name = attributes.get("variable", "")
            default_value = attributes.get("default", "")
            return {
                "type": "get_variable",
                "payload": {
                    "variable_name": var_name,
                    "default_value": default_value
                }
            }
            
        elif tag_name == "set-variable":
            var_name = attributes.get("variable", "")
            var_value = attributes.get("value", content)
            var_type = attributes.get("type", "str")
            return {
                "type": "set_variable", 
                "payload": {
                    "variable_name": var_name,
                    "variable_value": var_value,
                    "variable_type": var_type
                }
            }
            
        elif tag_name == "remember":
            remember_type = attributes.get("type", "insight")
            return {
                "type": "remember_information",
                "payload": {
                    "type": remember_type,
                    "content": content
                }
            }
            
        elif tag_name == "update-todo":
            action = attributes.get("action", "add")
            event = attributes.get("event", "")
            return {
                "type": "update_todo",
                "payload": {
                    "action": action,
                    "event": event,
                    "content": content
                }
            }
            
        elif tag_name == "answer":
            return {
                "type": "finishStreamingAnswer",
                "data": {
                    "payload": {
                        "response": content,
                        "final_answer": True
                    }
                }
            }
            
        elif tag_name == "draw-image":
            # draw-image标签应该触发图片生成，模拟/image命令
            return {
                "type": "trigger_image_generation",
                "payload": {
                    "content": f"/image {content}",
                    "prompt": content,
                    "commandId": f"img-{hash(content) % 10000}"
                }
            }
        
        elif tag_name == "create-webpage":
            return {
                "type": "trigger_webpage_generation",
                "payload": {
                    "content": f"/webpage {content}",
                    "prompt": content,
                    "commandId": f"web-{hash(content) % 10000}"
                }
            }
            
        elif tag_name == "create-video":
            return {
                "type": "addCell2EndWithContent",
                "data": {
                    "payload": {
                        "type": "video", 
                        "description": "Generated Video",
                        "content": content,
                        "metadata": {
                            "isGenerating": True,
                            "generationType": "video"
                        }
                    }
                }
            }
            
        elif tag_name == "cummunicate":
            target_agent = attributes.get("to", "")
            return {
                "type": "communicate_with_agent",
                "payload": {
                    "target_agent": target_agent,
                    "message": content
                }
            }
            
        elif tag_name == "ask-for-help":
            target_agent = attributes.get("to", "")
            return {
                "type": "ask_agent_for_help",
                "payload": {
                    "target_agent": target_agent,
                    "help_request": content
                }
            }
        
        return None