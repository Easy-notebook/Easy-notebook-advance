from typing import Dict, Any, List, Optional
from app.models.StepTemplate import StepTemplate
from app.core.workflow_manager import WorkflowManager

def event(event_name: str, require_variables: List[str] = None):
    """事件装饰器，标记处理特定事件的方法"""  
    def decorator(func):
        func._event_name = event_name
        func._event_type = "event"
        func._require_variables = require_variables or []
        return func
    return decorator

def after_exec(event_name: str, require_variables: List[str] = None):
    """代码执行完成后的事件装饰器"""
    def decorator(func):
        func._event_name = event_name
        func._event_type = "after_exec"
        func._require_variables = require_variables or []
        return func
    return decorator

def thinking(event_tag: str, textArray: List[str] = None, agentName: str = "", require_variables: List[str] = None):
    """思考事件装饰器，自动设置思考状态"""
    def decorator(func):
        func._event_tag = event_tag
        func._event_type = "thinking"
        func._textArray = textArray or []
        func._agentName = agentName
        func._require_variables = require_variables or []
        return func
    return decorator


def finnish(event_name: str, require_variables: List[str] = None):
    """结束事件装饰器"""
    def decorator(func):
        func._event_name = event_name
        func._event_type = "finnish"
        func._require_variables = require_variables or []
        return func
    return decorator

class BaseAction(StepTemplate):
    """
    基于StepTemplate的增强Action基类
    通过装饰器简化事件处理逻辑
    """
    
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None, 
                 stream: bool = False, chapter_id: str = None, section_id: str = None,
                 name: str = None, ability: str = None, require_variables: List[str] = None):
        super().__init__(step, state or {})
        self.stream = stream
        self.chapter_id = chapter_id
        self.section_id = section_id
        self.name = name or "Base Action"
        self.ability = ability or "Basic action functionality"
        self.require_variables = require_variables or []
        self.input={}
        
        # 工作流状态信息
        self.current_chapter_id = chapter_id or self._extract_chapter_id()
        self.current_section_id = section_id or self._extract_section_id()
        self.workflow_state = (state or {}).get("workflow_state", {})
        
        # 添加工作流相关属性
        self._initialize_workflow_properties()
        
        # 收集所有装饰的事件处理方法
        self.event_handlers = {}
        self.after_exec_handlers = {}
        self.thinking_handlers = {}
        self.finnish_handlers = {}
        
        self._collect_handlers()
        self._has_errors = not self._validate_requirements()
    
    def _collect_handlers(self):
        """收集所有用装饰器标记的处理方法"""
        for method_name in dir(self):
            method = getattr(self, method_name)
            if hasattr(method, '_event_type'):
                event_type = method._event_type
                
                if event_type == "event":
                    self.event_handlers[method._event_name] = method
                elif event_type == "after_exec":
                    self.after_exec_handlers[method._event_name] = method
                elif event_type == "thinking":
                    self.thinking_handlers[method._event_tag] = method
                elif event_type == "finnish":
                    self.finnish_handlers[method._event_name] = method
    
    def _initialize_workflow_properties(self):
        """初始化工作流相关属性"""
        # 从状态中获取工作流信息
        state = self.state or {}
        
        # 基本工作流属性
        self.problem_description = state.get("problem_description", "")
        self.context_description = state.get("context_description", "")
        self.user_goal = state.get("user_goal", "")
        
        # 阶段相关属性
        self.stage_name = self._get_stage_name_from_chapter_id()
        self.stage_goal = state.get("stage_goal", "")
        self.chapter_name = self._get_chapter_name_from_chapter_id()
        
        # 当前状态和可用操作
        self.current_data_state = state.get("current_data_state", {})
        self.available_actions = WorkflowManager().list_chapter_sections(self.chapter_id)
    
    def _get_stage_name_from_chapter_id(self) -> str:
        """从chapter_id获取阶段名称"""
        if not self.chapter_id:
            return "Unknown Stage"
        
        # 映射章节ID到阶段名称
        stage_mapping = {
            "chapter_1_data_existence_establishment": "Data Existence Establishment",
            "chapter_2_data_cleaning": "Data Cleaning",
            "chapter_3_exploratory_data_analysis": "Exploratory Data Analysis",
            "chapter_4_method_proposal": "Method Proposal",
            "chapter_5_model_training_evaluation": "Model Training and Evaluation",
            "chapter_6_results_evaluation": "Results Evaluation",
            "chapter_7_stability_analysis": "Stability Analysis"
        }
        
        return stage_mapping.get(self.chapter_id, self.chapter_id.replace("_", " ").title())
    
    def _get_chapter_name_from_chapter_id(self) -> str:
        """从chapter_id获取章节名称"""
        return self.stage_name  # 对于当前实现，章节名称和阶段名称相同
    
    def _extract_chapter_id(self) -> str:
        """从step或状态中提取chapter_id"""
        # 尝试从step中获取
        if hasattr(self, 'step') and self.step:
            chapter_id = self.step.get('chapter_id') or self.step.get('stage_id')
            if chapter_id:
                return chapter_id
        
        # 尝试从state中获取
        if self.state:
            chapter_id = self.state.get('chapter_id') or self.state.get('stage_id')
            if chapter_id:
                return chapter_id
        
        return ""
    
    def _extract_section_id(self) -> str:
        """从step或状态中提取section_id"""
        # 尝试从step中获取
        if hasattr(self, 'step') and self.step:
            section_id = self.step.get('section_id') or self.step.get('step_id')
            if section_id:
                return section_id
        
        # 尝试从state中获取
        if self.state:
            section_id = self.state.get('section_id') or self.state.get('step_id')
            if section_id:
                return section_id
        
        return ""
    
    def _validate_requirements(self) -> bool:
        """验证必需变量是否存在"""
        if not self.require_variables:
            return True
            
        missing_vars = []
        for var in self.require_variables:
            if not self.get_variable(var):
                missing_vars.append(var)
            else:
                self.input[var] = self.get_variable(var)
        
        if missing_vars:
            self.add_text(f"Action '{self.name}' 缺少必需变量: {missing_vars}")
            return False
        return True
    
    def _validate_handler_requirements(self, handler) -> bool:
        """验证处理器的必需变量"""
        if not hasattr(handler, '_require_variables'):
            return True
            
        missing_vars = []
        for var in handler._require_variables:
            if not self.get_variable(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.add_text(f"事件处理器 '{handler.__name__}' 缺少必需变量: {missing_vars}")
            return False
        return True
    
    # Workflow核心管理功能
    def initial_workflow_stages(self, selected_stages: List[str]) -> Dict[str, Any]:
        available_chapters = WorkflowManager.list_available_chapters()
        invalid_stages = [s for s in selected_stages if s not in available_chapters]
        
        if invalid_stages:
            return {
                "success": False,
                "error": f"无效的stages: {invalid_stages}",
                "available_stages": list(available_chapters.keys())
            }
        
        workflow_config = {
            "id": f"custom_workflow_{len(selected_stages)}_stages",
            "name": "Custom VDS Workflow", 
            "description": f"自定义workflow包含 {len(selected_stages)} 个阶段",
            "stages": []
        }
        
        # Always include chapter_0_planning as the first stage
        planning_stage_id = "chapter_0_planning"
        if planning_stage_id in available_chapters:
            planning_info = available_chapters[planning_stage_id]
            planning_sections = planning_info.get("sections", [])
            first_section = planning_sections[0] if planning_sections else "section_1_design_workflow"
            
            workflow_config["stages"].append({
                "id": planning_stage_id,
                "name": planning_info["name"],
                "description": planning_info["description"],
                "steps": [{
                    "id": f"{planning_stage_id}_{first_section}",
                    "step_id": f"{planning_stage_id}_{first_section}",
                    "name": first_section.replace("_", " ").title(),
                    "description": f"Execute {first_section} workflow step"
                }]
            })
        
        # Add all selected stages (excluding planning stage if already added)
        for stage_id in selected_stages:
            if stage_id == planning_stage_id:
                continue  # Skip if planning stage already added
                
            stage_info = available_chapters[stage_id]
            
            # Get first section for this stage (only show first step, others added dynamically)
            stage_sections = stage_info.get("sections", [])
            first_section = stage_sections[0] if stage_sections else "section_1_workflow_initialization"
            
            workflow_config["stages"].append({
                "id": stage_id,
                "name": stage_info["name"],
                "description": stage_info["description"],
                "steps": [{
                    "id": f"{stage_id}_{first_section}",
                    "step_id": f"{stage_id}_{first_section}",
                    "name": first_section.replace("_", " ").title(),
                    "description": f"Execute {first_section} workflow step"
                }]
            })
        
        initial_state = WorkflowManager.create_initial_state(workflow_config)
        
        return {
            "success": True,
            "action": "initial_workflow_stages",
            "selected_stages": selected_stages,
            "workflow_config": workflow_config,
            "initial_state": initial_state,
            "stage_execution_plan": [],  # Add missing field
            "message": f"已初始化包含 {len(workflow_config['stages'])} 个阶段的workflow，包含默认的planning阶段"
        }
    
    def update_stage_steps(self, stage_execution_plan: List[str]):
        current_stage_id = self.chapter_id
        
        if not current_stage_id:
            self.add_text("错误：无法确定当前阶段ID")
            return self
        
        # 验证sections是否有效
        try:
            available_sections = WorkflowManager.list_chapter_sections(current_stage_id)
            invalid_sections = [s for s in stage_execution_plan if s not in available_sections]
            
            if invalid_sections:
                self.add_text(f"警告：无效的sections: {invalid_sections}")
                stage_execution_plan = [s for s in stage_execution_plan if s in available_sections]
        except Exception as e:
            self.add_text(f"无法验证sections有效性: {str(e)}")
        
        current_workflow = self.state.get("current_workflow", {})
        
        new_steps = [{
            "id": f"{current_stage_id}_section_1_workflow_initialization",
            "step_id": f"{current_stage_id}_section_1_workflow_initialization", 
            "name": "Workflow Initialization",
            "description": "Initialize workflow for this stage",
            "status": "completed"
        }]
        
        for section_id in stage_execution_plan:
            if section_id != "section_1_workflow_initialization":
                new_steps.append({
                    "id": f"{current_stage_id}_{section_id}",
                    "step_id": f"{current_stage_id}_{section_id}",
                    "name": section_id.replace("_", " ").title(),
                    "description": f"Execute {section_id} workflow step",
                    "status": "pending"
                })
        
        if "stages" not in current_workflow:
            current_workflow["stages"] = []
        
        stage_found = False
        for stage in current_workflow["stages"]:
            if stage.get("id") == current_stage_id:
                stage["steps"] = new_steps
                stage_found = True
                break
        
        if not stage_found:
            current_workflow["stages"].append({
                "id": current_stage_id,
                "name": self.stage_name,
                "description": f"Stage: {self.stage_name}",
                "steps": new_steps
            })
        
        # 更新状态
        self.state["current_workflow"] = current_workflow
        
        # 只发送当前阶段的步骤更新，不影响其他阶段
        stage_update = {
            "action": "update_stage_steps",
            "stage_id": current_stage_id,
            "updated_steps": new_steps,
            "next_step_id": new_steps[0]["step_id"] if new_steps else None  # 第一个步骤作为跳转目标
        }
        
        # 添加阶段步骤更新action
        self.actions.append(stage_update)
        
        return self
    
    def run(self) -> Dict[str, Any]:
        """
        主运行方法，取代原本的最外层async def
        工作流使用时默认调用此方法
        """
        if self._has_errors:
            return self.end_event()
        
        # 处理开始事件
        if self.event("start") and "start" in self.event_handlers:
            handler = self.event_handlers["start"]
            if self._validate_handler_requirements(handler):
                return handler()
            else:
                return self.end_event()
        
        # 处理其他事件
        todo_list = self.get_toDoList()
        if todo_list:
            last_event = todo_list[-1]
            
            # 检查普通事件处理器
            if last_event in self.event_handlers and self.event(last_event):
                handler = self.event_handlers[last_event]
                if self._validate_handler_requirements(handler):
                    return handler()
                else:
                    return self.end_event()
            
            # 检查代码执行后事件处理器
            if last_event in self.after_exec_handlers and self.event(last_event):
                handler = self.after_exec_handlers[last_event]
                if self._validate_handler_requirements(handler):
                    return handler()
                else:
                    return self.end_event()
            
            # 检查思考开始处理器
            if last_event in self.thinking_handlers and self.event(last_event):
                handler = self.thinking_handlers[last_event]
                if self._validate_handler_requirements(handler):
                    return handler()
                else:
                    return self.end_event()
            
            # 检查结束事件处理器
            if last_event in self.finnish_handlers and self.event(last_event):
                handler = self.finnish_handlers[last_event]
                if self._validate_handler_requirements(handler):
                    return handler()
                else:
                    return self.end_event()
        
        return self.end_event()
    
    def next_thinking_event(self, event_tag: str, textArray: List[str] = None, agentName: str = ""):
        """触发思考事件"""
        self.is_thinking(
            textArray=textArray or ["Processing..."],
            agentName=agentName
        )
        self.next_event(event_tag)
        return self
    
    def conclusion(self, event_name: str, result: Any):
        """设置思考结论"""
        # 将结果保存到thinking结果中
        if not hasattr(self, '_thinking_results'):
            self._thinking_results = {}
        self._thinking_results[event_name] = result
        self.add_variable(event_name, result)
        self.finish_thinking()
        self.next_event(event_name)
        return self
    
    def get_thinking(self, event_name: str = None) -> Any:
        return self.get_variable(event_name)
