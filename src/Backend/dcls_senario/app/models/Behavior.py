from typing import Dict, Any, List, Optional, AsyncGenerator
from app.models.Action import Action
from app.core.workflow_manager import WorkflowManager
from datetime import datetime
import json
from app.core.agent_tool_protocol import parse_agent_response, execute_tool_calls

def event(event_name: str, require_variables: List[str] = None):
    """Event decorator that marks a method as handling a specific event."""  
    def decorator(func):
        func._event_name = event_name
        func._event_type = "event"
        func._require_variables = require_variables or []
        return func
    return decorator

def after_exec(event_name: str, require_variables: List[str] = None):
    """Decorator for handling events after code execution is completed."""
    def decorator(func):
        func._event_name = event_name
        func._event_type = "after_exec"
        func._require_variables = require_variables or []
        return func
    return decorator

def thinking(event_tag: str, textArray: List[str] = None, agentName: str = "", require_variables: List[str] = None):
    """Thinking event decorator that automatically sets the thinking state."""
    def decorator(func):
        func._event_tag = event_tag
        func._event_type = "thinking"
        func._textArray = textArray or []
        func._agentName = agentName
        func._require_variables = require_variables or []
        return func
    return decorator


def finnish(event_name: str, require_variables: List[str] = None):
    """Finish event decorator."""
    def decorator(func):
        func._event_name = event_name
        func._event_type = "finnish"
        func._require_variables = require_variables or []
        return func
    return decorator

class Behavior(Action):
    """Enhanced Action base class built on Action.
    Uses decorators to simplify event handling logic.
    """
    
    def __init__(self, step: Dict[str, Any], state: Optional[Dict[str, Any]] = None,
                 stream: bool = False, chapter_id: str = None, section_id: str = None,
                 name: str = None, ability: str = None, require_variables: List[str] = None,
                 agent_memory: Optional[Dict[str, Any]] = None):
        super().__init__(step, state or {})
        self.stream = stream
        self.chapter_id = chapter_id
        self.section_id = section_id
        self.name = name or "Base Action"
        self.ability = ability or "Basic action functionality"
        self.require_variables = require_variables or []
        self.input={}

        # Agent memory for storing learning and context across executions
        self.agent_memory = agent_memory or {}
        self._initialize_agent_memory()

        # 初始化Agent驱动系统
        self.frontend_memory = None
        self.code_generator = None
        self.agent = None
        self.user_goal = self.input.get("user_goal", "Complete data science analysis")

    def _create_appropriate_agent(self):
        """根据章节类型创建合适的Agent"""
        try:
            # 构建Agent上下文
            agent_context = {
                'state': self.state,
                'chapter_id': self.chapter_id,
                'section_id': self.section_id,
                'user_goal': self.user_goal,
                'frontend_memory': self.frontend_memory,
                'code_generator': self.code_generator
            }

        except Exception as e:
            print(f"⚠️ Could not create agent: {e}")
            return None

        # Add workflow-related properties
        self._initialize_workflow_properties()
        
        # Collect all decorated event handler methods
        self.event_handlers = {}
        self.after_exec_handlers = {}
        self.thinking_handlers = {}
        self.finnish_handlers = {}
        
        self._collect_handlers()
        self._has_errors = not self._validate_requirements()

    def _initialize_agent_memory(self):
        """Initialize agent memory structure for learning and context storage."""
        if not isinstance(self.agent_memory, dict):
            self.agent_memory = {}

        # Initialize memory sections if they don't exist
        memory_sections = [
            'learning_history',      # Store what the agent has learned
            'execution_context',     # Store execution context and patterns
            'error_patterns',        # Store common errors and solutions
            'optimization_insights', # Store optimization insights
            'domain_knowledge',      # Store domain-specific knowledge
            'interaction_patterns'   # Store patterns from user interactions
        ]

        for section in memory_sections:
            if section not in self.agent_memory:
                self.agent_memory[section] = []

    def update_agent_memory(self, section: str, content: Dict[str, Any]):
        """Update agent memory with new learning or context."""
        if section not in self.agent_memory:
            self.agent_memory[section] = []

        # Add timestamp to the memory entry
        memory_entry = {
            'timestamp': datetime.now().isoformat(),
            'chapter_id': self.chapter_id,
            'section_id': self.section_id,
            'content': content
        }

        self.agent_memory[section].append(memory_entry)

        # Keep memory size manageable (keep last 100 entries per section)
        if len(self.agent_memory[section]) > 100:
            self.agent_memory[section] = self.agent_memory[section][-100:]

    def get_agent_memory(self, section: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent entries from agent memory."""
        if section not in self.agent_memory:
            return []

        return self.agent_memory[section][-limit:] if limit > 0 else self.agent_memory[section]

    def clear_agent_memory(self, section: str = None):
        """Clear agent memory (specific section or all)."""
        if section:
            if section in self.agent_memory:
                self.agent_memory[section] = []
        else:
            self.agent_memory = {}
            self._initialize_agent_memory()
    
    def _collect_handlers(self):
        """Collect all handler methods marked with decorators."""
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
        """Initialize workflow-related properties."""
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

        # Establish lightweight alias bridges for robustness across chapters
        # 1) Prefer setting generic 'variables' if missing but 'column_names' exists
        try:
            if not self.get_variable("variables"):
                colnames = self.get_variable("column_names")
                if colnames:
                    self.add_variable("variables", colnames)
        except Exception:
            pass

        # 2) Provide 'data_preview' alias from earlier 'top_5_lines' if missing
        try:
            if not self.get_variable("data_preview"):
                top5 = self.get_variable("top_5_lines")
                if top5:
                    self.add_variable("data_preview", top5)
        except Exception:
            pass

        # 3) Provide 'comprehensive_eda_summary' alias from 'eda_summary' if missing
        #    This helps stages that require a comprehensive EDA summary to proceed
        #    when only a basic or earlier EDA summary is available.
        try:
            if not self.get_variable("comprehensive_eda_summary"):
                eda_summary = self.get_variable("eda_summary")
                if eda_summary:
                    self.add_variable("comprehensive_eda_summary", eda_summary)
        except Exception:
            pass
    
    def _get_stage_name_from_chapter_id(self) -> str:
        """Get stage name from chapter_id."""
        if not self.chapter_id:
            return "Unknown Stage"
        
        # Map chapter IDs to stage names
        stage_mapping = {
            "chapter_0_planning": "Planning & Analysis",
            "chapter_1_data_existence_establishment": "Data Existence Establishment",
            "chapter_2_data_integrity_assurance": "Data Integrity Assurance",
            "chapter_3_data_insight_acquisition": "Data Insight Acquisition",
            "chapter_4_methodology_strategy_formulation": "Methodology Strategy Formulation",
            "chapter_5_model_implementation_execution": "Model Implementation Execution",
            "chapter_6_stability_validation": "Stability Validation",
            "chapter_7_results_evaluation_confirmation": "Results Evaluation Confirmation"
        }
        
        return stage_mapping.get(self.chapter_id, self.chapter_id.replace("_", " ").title())
    
    def _get_chapter_name_from_chapter_id(self) -> str:
        """Get chapter name from chapter_id."""
        return self.stage_name  # 对于当前实现，章节名称和阶段名称相同
    
    def _extract_chapter_id(self) -> str:
        """Extract chapter_id from step or state."""
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
        """Extract section_id from step or state."""
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
        """Validate that required variables exist."""
        if not self.require_variables:
            return True
            
        missing_vars = []
        for var in self.require_variables:
            if not self.get_variable(var):
                missing_vars.append(var)
            else:
                self.input[var] = self.get_variable(var)
        
        if missing_vars:
            self.add_text(f"Action '{self.name}' is missing required variables: {missing_vars}")
            return False
        return True
    
    def _validate_handler_requirements(self, handler) -> bool:
        """Validate required variables for a handler."""
        if not hasattr(handler, '_require_variables'):
            return True
            
        missing_vars = []
        for var in handler._require_variables:
            if not self.get_variable(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.add_text(f"Event handler '{handler.__name__}' is missing required variables: {missing_vars}")
            return False
        return True
    
    # Workflow核心管理功能
    def initial_workflow_stages(self, selected_stages: List[str]) -> Dict[str, Any]:
        available_chapters = WorkflowManager.list_available_chapters()
        invalid_stages = [s for s in selected_stages if s not in available_chapters]
        
        if invalid_stages:
            return {
                "success": False,
                "error": f"Invalid stages: {invalid_stages}",
                "available_stages": list(available_chapters.keys())
            }
        
        workflow_config = {
            "id": f"custom_workflow_{len(selected_stages)}_stages",
            "name": "Custom VDS Workflow", 
            "description": f"Custom workflow includes {len(selected_stages)} stages",
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
            "message": f"Initialized workflow with {len(workflow_config['stages'])} stages, including the default planning stage"
        }
    
    def update_stage_steps(self, stage_execution_plan: List[str]):
        current_stage_id = self.chapter_id
        
        if not current_stage_id:
            self.add_text("Error: unable to determine current stage ID")
            return self
        
        # Validate that sections are valid
        try:
            available_sections = WorkflowManager.list_chapter_sections(current_stage_id)
            invalid_sections = [s for s in stage_execution_plan if s not in available_sections]
            
            if invalid_sections:
                self.add_text(f"Warning: invalid sections: {invalid_sections}")
                stage_execution_plan = [s for s in stage_execution_plan if s in available_sections]
        except Exception as e:
            self.add_text(f"Unable to validate section validity: {str(e)}")
        
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
    
    def get_full_csv_path(self) -> str:
        """
        Get the CSV file path from variables

        Returns:
            str: CSV file path as stored in variables
        """
        # Simply return the CSV path from variables - it should already be complete
        return self.get_variable("csv_file_path", "")

    # ==================== 前端记忆同步方法 ====================

    def get_frontend_memory_context(self) -> Dict[str, Any]:
        """获取前端记忆上下文"""
        if not self.frontend_memory:
            return {}

        return self.frontend_memory.create_agent_context(self.name)

    def get_analysis_history(self, analysis_type: str = None) -> List[Dict[str, Any]]:
        """获取分析历史"""
        if not self.frontend_memory:
            return []

        return self.frontend_memory.get_analysis_history(analysis_type)

    def get_insights_summary(self) -> Dict[str, Any]:
        """获取洞察摘要"""
        if not self.frontend_memory:
            return {}

        return self.frontend_memory.get_insights_summary()

    def get_goal_context(self) -> Dict[str, Any]:
        """获取目标上下文"""
        if not self.frontend_memory:
            return {"user_goal": self.user_goal}

        return self.frontend_memory.goal_context

    def get_available_data_info(self) -> Dict[str, Any]:
        """获取可用数据信息"""
        if not self.frontend_memory:
            return {}

        return self.frontend_memory._get_available_data_info()

    def get_current_stage(self) -> str:
        """获取当前阶段"""
        if not self.frontend_memory:
            return "unknown"

        return self.frontend_memory._identify_current_stage()

    def get_next_priorities(self) -> List[str]:
        """获取下一步优先级建议"""
        if not self.frontend_memory:
            return ["Continue with current analysis"]

        return self.frontend_memory._suggest_next_priorities()

    def has_frontend_variable(self, var_name: str) -> bool:
        """检查前端是否有某个变量"""
        if not self.frontend_memory:
            return False

        return self.frontend_memory.has_variable(var_name)

    def get_frontend_variable(self, var_name: str, default=None):
        """从前端获取变量值"""
        if not self.frontend_memory:
            return default

        return self.frontend_memory.get_variable(var_name, default)

    # ==================== 动态代码生成方法 ====================

    def generate_smart_data_loading_code(self, target_variable: str = None) -> str:
        """生成智能的数据加载代码"""
        if not self.code_generator:
            # 备用方案：基础代码
            csv_path = self.get_variable("csv_file_path", "")
            return f'''import pandas as pd
import numpy as np

# Load data
df = pd.read_csv("{csv_path}")
print(f"Data loaded: {{df.shape}}")
print(f"Columns: {{list(df.columns)}}")'''

        return self.code_generator.generate_safe_data_loading_code(target_variable)

    def generate_smart_missing_value_code(self) -> str:
        """生成智能的缺失值处理代码"""
        if not self.code_generator:
            return '''# Basic missing value handling
missing_values = df.isnull().sum()
print("Missing values per column:")
print(missing_values[missing_values > 0])'''

        return self.code_generator.generate_smart_missing_value_code()

    def generate_smart_column_removal_code(self) -> str:
        """生成智能的列移除代码"""
        if not self.code_generator:
            return '''# Basic column analysis
print("Column information:")
print(df.info())'''

        return self.code_generator.generate_smart_column_removal_code()

    def generate_correlation_analysis_code(self, target_variable: str = None) -> str:
        """生成相关性分析代码"""
        if not self.code_generator:
            return '''# Basic correlation analysis
import matplotlib.pyplot as plt
import seaborn as sns

numeric_cols = df.select_dtypes(include=[np.number]).columns
if len(numeric_cols) > 1:
    correlation_matrix = df[numeric_cols].corr()
    plt.figure(figsize=(10, 8))
    sns.heatmap(correlation_matrix, annot=True, cmap='coolwarm')
    plt.title('Correlation Matrix')
    plt.show()'''

        return self.code_generator.generate_correlation_analysis_code(target_variable)

    def generate_data_cleaning_pipeline(self, target_variable: str = None) -> str:
        """生成完整的数据清洗管道"""
        if not self.code_generator:
            return self.generate_smart_data_loading_code(target_variable)

        return self.code_generator.generate_data_cleaning_pipeline(target_variable)

    def get_data_summary(self) -> Dict[str, Any]:
        """获取数据摘要信息"""
        if not self.code_generator:
            return {}

        return self.code_generator.get_data_summary()

    # ==================== 增强的变量管理方法 ====================

    def ensure_required_variables(self) -> bool:
        """确保所有必需的变量都存在"""
        missing_vars = []

        # 首先检查本地变量
        for var in self.require_variables:
            if not self.get_variable(var):
                missing_vars.append(var)

        if missing_vars:
            print(f"⚠️ Missing required variables: {missing_vars}")

            # 尝试从前端记忆恢复
            if self.frontend_memory:
                recovered_vars = []
                for var in missing_vars[:]:  # 使用切片避免修改迭代中的列表
                    frontend_value = self.frontend_memory.get_variable(var)
                    if frontend_value is not None:
                        self.add_variable(var, frontend_value)
                        missing_vars.remove(var)
                        recovered_vars.append(var)
                        print(f"✅ Recovered {var} from frontend memory")

                if recovered_vars:
                    print(f"💾 Recovered {len(recovered_vars)} variables from frontend: {recovered_vars}")

            # 如果仍有缺失变量，尝试重新生成
            if missing_vars:
                print(f"🔄 Attempting to regenerate missing variables: {missing_vars}")
                self._regenerate_missing_variables(missing_vars)

                # 再次检查
                still_missing = [var for var in missing_vars if not self.get_variable(var)]
                if still_missing:
                    print(f"❌ Could not recover variables: {still_missing}")

                    # 提供恢复建议
                    if self.frontend_memory:
                        recovery_strategies = self.frontend_memory.suggest_variable_recovery(still_missing)
                        print(f"💡 Recovery suggestions: {recovery_strategies}")

        final_missing = [var for var in self.require_variables if not self.get_variable(var)]
        return len(final_missing) == 0

    def _regenerate_missing_variables(self, missing_vars: List[str]):
        """重新生成缺失的变量"""
        csv_path = self.get_variable("csv_file_path", "")

        if not csv_path:
            return

        try:
            import pandas as pd
            df = pd.read_csv(csv_path)

            # 重新生成常见的缺失变量
            if "column_names" in missing_vars:
                self.add_variable("column_names", list(df.columns))
                print("✅ Regenerated column_names")

            if "top_5_lines" in missing_vars:
                self.add_variable("top_5_lines", df.head().to_dict(orient="records"))
                print("✅ Regenerated top_5_lines")

            if "dataset_shape" in missing_vars:
                self.add_variable("dataset_shape", df.shape)
                print("✅ Regenerated dataset_shape")

        except Exception as e:
            print(f"❌ Error regenerating variables: {e}")

    # ==================== Agent驱动方法 ====================

    async def run_with_agent(self, task_description: str = None) -> AsyncGenerator[Dict[str, Any], None]:
        """使用Agent驱动的方式执行任务"""
        if not self.agent:
            yield {
                'type': 'error',
                'content': 'Agent not available. Falling back to traditional mode.',
                'timestamp': datetime.now().isoformat()
            }
            # 回退到传统模式
            traditional_result = self.run()
            if hasattr(traditional_result, '__aiter__'):
                async for item in traditional_result:
                    yield item
            else:
                yield {
                    'type': 'action',
                    'action': traditional_result,
                    'timestamp': datetime.now().isoformat()
                }
            return

        # 构建任务描述
        if not task_description:
            task_description = self._build_default_task_description()

        # 使用Agent处理任务
        try:
            async for result in self.agent.process_task(task_description):
                yield result
        except Exception as e:
            yield {
                'type': 'error',
                'content': f'Agent execution failed: {str(e)}',
                'timestamp': datetime.now().isoformat()
            }

    def _build_default_task_description(self) -> str:
        """构建默认的任务描述"""
        task_parts = []

        # 基本信息
        task_parts.append(f"执行 {self.name} 任务")
        task_parts.append(f"章节: {self.chapter_id}")
        task_parts.append(f"步骤: {self.section_id}")
        task_parts.append(f"用户目标: {self.user_goal}")

        # 能力描述
        if self.ability:
            task_parts.append(f"任务能力: {self.ability}")

        # 必需变量
        if self.require_variables:
            missing_vars = [var for var in self.require_variables if not self.get_variable(var)]
            if missing_vars:
                task_parts.append(f"注意: 缺少必需变量 {missing_vars}")
            else:
                task_parts.append("所有必需变量已准备就绪")

        # 当前状态
        if self.frontend_memory:
            current_stage = self.frontend_memory._identify_current_stage()
            task_parts.append(f"当前阶段: {current_stage}")

            next_priorities = self.frontend_memory._suggest_next_priorities()
            if next_priorities:
                task_parts.append(f"建议优先级: {next_priorities[0]}")

        return "\n".join(task_parts)

    def call_agent_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """调用Agent工具的便捷方法"""
        if not self.agent:
            return {'error': 'Agent not available'}

        # 构建工具调用字符串
        if tool_name == 'add_text':
            tool_call = f"<add-text>{kwargs.get('content', '')}</add-text>"
        elif tool_name == 'add_code':
            language = kwargs.get('language', 'python')
            code = kwargs.get('code', '')
            tool_call = f"<add-code language=\"{language}\">{code}</add-code>"
        elif tool_name == 'thinking':
            content = kwargs.get('content', '')
            tool_call = f"<thinking>{content}</thinking>"
        elif tool_name == 'call_execute':
            event = kwargs.get('event', 'default')
            code = kwargs.get('code', '')
            tool_call = f"<call-execute event=\"{event}\">{code}</call-execute>"
        elif tool_name == 'get_variable':
            variable = kwargs.get('variable', '')
            default = kwargs.get('default', '')
            tool_call = f"<get-variable variable=\"{variable}\" default=\"{default}\"/>"
        elif tool_name == 'set_variable':
            variable = kwargs.get('variable', '')
            value = kwargs.get('value', '')
            var_type = kwargs.get('type', 'str')
            tool_call = f"<set-variable variable=\"{variable}\" value=\"{value}\" type=\"{var_type}\"/>"
        else:
            # 自定义工具
            params = json.dumps(kwargs)
            tool_call = f"<custom-tool name=\"{tool_name}\" params=\"{params}\"></custom-tool>"

        # 解析和执行工具调用
        parsed = parse_agent_response(tool_call)
        results = execute_tool_calls(parsed, {'state': self.state})

        return results[0] if results else {'error': 'No results'}

    def agent_add_text(self, content: str) -> Dict[str, Any]:
        """Agent添加文本的便捷方法"""
        return self.call_agent_tool('add_text', content=content)

    def agent_add_code(self, code: str, language: str = 'python') -> Dict[str, Any]:
        """Agent添加代码的便捷方法"""
        return self.call_agent_tool('add_code', code=code, language=language)

    def agent_thinking(self, content: str) -> Dict[str, Any]:
        """Agent思考的便捷方法"""
        return self.call_agent_tool('thinking', content=content)

    def agent_execute_code(self, code: str, event: str = 'default') -> Dict[str, Any]:
        """Agent执行代码的便捷方法"""
        return self.call_agent_tool('call_execute', code=code, event=event)

    def get_agent_performance(self) -> Dict[str, Any]:
        """获取Agent性能指标"""
        if not self.agent:
            return {'error': 'Agent not available'}

        return self.agent.get_performance_summary()
