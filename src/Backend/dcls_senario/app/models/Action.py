from typing import Dict, Any, List, Optional
from app.core.config import SHOT_TYPES
from app.utils.helpers import generate_step_actions

class Action:
    def __init__(self, step: Dict[str, Any], state: Dict[str, Any]):
        self.step = step
        self.state = state.copy()  # 复制上下文，避免直接修改传入的对象
        
        # 确保state包含必要的键，特别是variables
        if "variables" not in self.state:
            self.state["variables"] = {}
        
        # 如果step中有variables，将其合并到state中
        if "variables" in step:
            self.state["variables"].update(step["variables"])
            
        self.actions: List[Dict[str, Any]] = []
        self.todo_list: List[str] = list(self.state.get("toDoList", []))
    
    def _get_context(self) -> Dict[str, Any]:
        """返回包含当前待办事项的上下文"""
        return {**self.state, "toDoList": self.todo_list}
    
    def add_text(self, content: str, delay: Optional[int] = None):
        action = {
            "action": "add",
            "shotType": SHOT_TYPES.DIALOGUE,
            "content": content,
            "state": self._get_context()
        }
        if delay is not None:
            action["delay"] = delay
        self.actions.append(action)
        return self
    
    def new_chapter(self, content: str, delay: Optional[int] = None):
        action = {
            "action": "new_chapter",
            "shotType": SHOT_TYPES.DIALOGUE,
            "content": content,
            "state": self._get_context()
        }
        if delay is not None:
            action["delay"] = delay
        self.actions.append(action)
        return self
    
    def new_section(self, content: str, delay: Optional[int] = None):
        action = {
            "action": "new_section",
            "shotType": SHOT_TYPES.DIALOGUE,
            "content": content,
            "state": self._get_context()
        }
        if delay is not None:
            action["delay"] = delay
        self.actions.append(action)
        return self
    
    def event(self, event_name: str="start"):
        if event_name == "start":
            return not self.todo_list
        if not self.todo_list:
            return False
        if self.todo_list[-1] == event_name:
            self.pop_todo()
            return True
        else:
            return False
    
    def is_thinking(self, textArray: List[str]=[], agentName: str="", customText: Optional[str] = None):
        action = {
            "action": "is_thinking",
            "shotType": SHOT_TYPES.THINKING,
            "state": self._get_context(),
            "textArray": textArray,
            "agentName": agentName,
            "customText": customText
        }
        self.actions.append(action)
        return self
    
    def finish_thinking(self):
        action = {
            "action": "finish_thinking",
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def update_workflow(self, workflow_chapters: List[str], next_stage_id: str = None):
        """
        添加工作流更新action，前端会通过 message.action.updated_workflow 访问

        Args:
            workflow_chapters: 更新后的章节列表
            next_stage_id: 可选的下一个阶段ID
        """
        # Import WorkflowManager to get actual available sections
        from app.core.workflow_manager import WorkflowManager

        # 构建符合前端期望的workflow模板格式
        workflow_template = {
            "name": "Dynamic Workflow",
            "stages": []
        }

        # 将章节列表转换为stages格式，使用实际可用的步骤
        for i, chapter_id in enumerate(workflow_chapters):
            # Get actual available sections for this chapter
            chapter_info = WorkflowManager.AVAILABLE_CHAPTERS.get(chapter_id, {})
            available_sections = chapter_info.get("sections", [f"{chapter_id}_section_1"])

            # Create steps for all available sections
            steps = []
            for section_id in available_sections:
                step = {
                    "id": f"{chapter_id}_{section_id}",
                    "step_id": f"{chapter_id}_{section_id}",
                    "title": f"{chapter_id} - {section_id}",
                    "description": f"Section: {section_id}"
                }
                steps.append(step)

            stage = {
                "id": chapter_id,
                "title": chapter_info.get("name", chapter_id.replace("_", " ").title()),
                "description": chapter_info.get("description", f"Stage {i+1}: {chapter_id}"),
                "steps": steps
            }
            workflow_template["stages"].append(stage)

        # 构建更新数据
        updated_workflow = {
            "workflowTemplate": workflow_template
        }

        if next_stage_id:
            updated_workflow["nextStageId"] = next_stage_id

        action = {
            "action": "update_workflow",
            "updated_workflow": updated_workflow,
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def set_effect_as_thinking(self, thinkingText: str = "finished thinking"):
        action = {
            "action": "set_effect_as_thinking",
            "thinkingText": thinkingText,
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def add_code(self, content: str, delay: Optional[int] = None, metadata: Optional[Dict[str, Any]] = None):
        action = {
            "action": "add",
            "shotType": SHOT_TYPES.ACTION,
            "content": content,
            "state": self._get_context()
        }
        if delay is not None:
            action["delay"] = delay
        if metadata:
            action["metadata"] = metadata
        self.actions.append(action)
        return self
    
    def exec_code(self, codecell_id: str = "lastAddedCellId", auto_debug: Optional[bool] = None):
        action = {
            "action": "exec",
            "codecell_id": codecell_id,
            "state": self._get_context()
        }
        if auto_debug is not None:
            action["auto_debug"] = auto_debug
        self.actions.append(action)
        return self
    
    def exe_code_cli(self, event_tag: str="", 
                        mark_finnish: str="", 
                        codecell_id: str="lastAddedCellId", 
                        auto_debug: Optional[bool] = None):
        if event_tag:
            self.push_todo(event_tag)
        self.exec_code(codecell_id=codecell_id,auto_debug=auto_debug)
        if mark_finnish:
            self.set_effect_as_thinking(thinkingText=mark_finnish)    
        return self
    
    def update_title(self, title: str):
        action = {
            "action": "update_title",
            "title": title,
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def push_todo(self, item: str):
        self.todo_list.append(item)
        return self
    
    def next_event(self, item: str):
        self.todo_list.append(item)
        action = {
            "action": "next_event",
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def pop_todo(self):
        if self.todo_list:
            self.todo_list.pop()
        return self
    
    def add_variable(self, variable_name: str, variable: str):
        # 确保variables键存在
        if "variables" not in self.state:
            self.state["variables"] = {}
        self.state["variables"][variable_name] = variable
        return self
    
    def push_variable(self, variable_name: str, variable: str):
        # 确保variables键存在
        if "variables" not in self.state:
            self.state["variables"] = {}
        if variable_name not in self.state["variables"]:
            self.state["variables"][variable_name] = []
        self.state["variables"][variable_name].append(variable)
        return self
    
    def update_variable(self, variable_name: str, variable: str):
        return self.add_variable(variable_name, variable)
    
    def get_variable(self, variable_name: str, default_value: str = ""):
        # 确保variables键存在
        if "variables" not in self.state:
            self.state["variables"] = {}

        # 首先检查variables字典
        if variable_name in self.state["variables"]:
            return self.state["variables"][variable_name]
        # 然后检查state的顶层
        elif variable_name in self.state:
            return self.state[variable_name]
        else:
            return default_value
    
    def pop_last_sub_variable(self, variable_name: str):
        if variable_name in self.state["variables"]:
            variable = self.get_variable(variable_name)
            
            if isinstance(variable, list):
                if variable:
                    last_sub_variable = variable.pop()
                    # print(f"[DEBUG] Popped {last_sub_variable} from '{variable_name}'.")
                    return last_sub_variable, len(variable)
                else:
                    # print(f"[DEBUG] The list for '{variable_name}' is empty.")
                    return None, 0
            else:
                # print(f"[DEBUG] Variable '{variable_name}' is not a list. Found: {type(variable).__name__}")
                return None, 0
        else:
            # print(f"[DEBUG] Variable '{variable_name}' not found in state.")
            return None, 0

    
    def get_variable_sub_key(self, variable_name: str, sub_key: str):
        # 确保variables键存在
        if "variables" not in self.state:
            self.state["variables"] = {}
        if variable_name not in self.state["variables"]:
            return None
        return self.state["variables"][variable_name].get(sub_key)
    
    def get_current_effect(self):
        if "effect" not in self.state:
            return None
        if "current" not in self.state["effect"]:
            return None
        if not self.state["effect"]["current"]:
            return None
        return self.state["effect"]["current"][0]
    
    def get_toDoList(self):
        return self.todo_list
    
    def is_last_todo(self,todo_item:str):
        if not self.todo_list:
            return False
        return self.todo_list[-1] == todo_item
    
    def to_tableh(self,pcs_hypothesis):
        """
        将单个假设对象或假设对象列表转换为Markdown表格
        
        Args:
            pcs_hypothesis: 单个字典对象或包含多个字典的列表，每个字典代表一个假设
            
        Returns:
            str: 格式化的Markdown表格字符串
        """
        # 如果输入是单个字典，将其转换为列表
        if isinstance(pcs_hypothesis, dict):
            json_list = [pcs_hypothesis]
        elif isinstance(pcs_hypothesis, list):
            json_list = pcs_hypothesis
        else:
            return ""
        
        # 如果列表为空，返回空字符串
        if len(json_list) == 0:
            return ""
        
        # 获取所有可能的键（列标题）
        all_keys = set()
        for item in json_list:
            all_keys.update(item.keys())
        keys = list(all_keys)
        
        # 创建表头
        markdown = "| " + " | ".join(keys) + " |\n"
        
        # 添加分隔行
        markdown += "| " + " | ".join(["---" for _ in keys]) + " |\n"
        
        # 添加数据行
        for item in json_list:
            row = []
            for key in keys:
                # 获取值，如果不存在则为空字符串
                row.append(str(item.get(key, "")))
            markdown += "| " + " | ".join(row) + " |\n"
        
        return markdown
    
    def json_pair_to_markdown_list(self,json_pair:Dict[str,Any]):
        markdown_str = ""
        for key, value in json_pair.items():
            markdown_str += f"- **{key}**: {value}\n"
        return markdown_str
        
    
    def build(self) -> Dict[str, Any]:
        # 对于非流式模式，直接返回actions列表
        return {
            "steps": self.actions
        }

    async def build_streaming(self):
        """构建流式响应的异步迭代器"""
        for action in self.actions:
            yield action
    
    def end_event(self):
        return self.build()
    
    def next_thinking_event(self,event_tag:str,textArray:List[str]=[],agentName:str="",customText:Optional[str]=None):
        self.is_thinking(textArray=textArray,agentName=agentName,customText=customText)
        self.next_event(event_tag)
        return self
    
    def think_event(self, event_name: str):
        if not self.todo_list:
            return False
        if self.todo_list[-1] == event_name:
            self.pop_todo()
            self.finish_thinking()
            return True
        else:
            return False
    
    def error_invalid_event(self):
        error_message = f"invalid event: {self.todo_list}"
        
        action = {
            "action": "error",
            "error_message": error_message,
            "state": self._get_context()
        }
        self.actions.append(action)

        return self.build()

    def generate_image(self,prompt:str):
        action = {
            "action": "command_call",
            "command": f"/image {prompt}",
            "command_id": f"img-{hash(prompt) % 10000}",
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def generate_video(self,prompt:str):
        action = {
            "action": "command_call",
            "command": f"/video {prompt}",
            "command_id": f"video-{hash(prompt) % 10000}",
            "state": self._get_context()
        }
        self.actions.append(action)
        return self
    
    def comunicate_with_agent(self,agent_name:str,content:str):
        action = {
            "action": "comunicate_with_agent",
            "agent_name": agent_name,
            "content": content,
            "state": self._get_context()
        }
        self.actions.append(action)
        return self