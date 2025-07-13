"""
智能Action执行器
Intelligent Action Executor

负责动态加载和执行actions，支持：
- 动态导入action模块
- 智能重试机制
- 结果质量评估
- 执行监控和日志
"""

from typing import Dict, Any, List, Optional, Callable
import importlib
import asyncio
import time
from dataclasses import dataclass
from enum import Enum
import traceback

from application.workflow.goal_driven_planner import StepDefinition, StepStatus

class ExecutionResult(Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL_SUCCESS = "partial_success"
    RETRY_NEEDED = "retry_needed"
    SKIPPED = "skipped"

@dataclass
class ActionResult:
    """Action执行结果"""
    step_id: str
    execution_result: ExecutionResult
    step_status: StepStatus
    outputs: Dict[str, Any]
    execution_time: float
    error_message: Optional[str] = None
    quality_score: float = 0.0
    retry_count: int = 0
    thinking_logs: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.thinking_logs is None:
            self.thinking_logs = []

class ActionExecutor:
    """智能Action执行器"""
    
    def __init__(self):
        self.execution_cache = {}
        self.retry_policies = self._load_retry_policies()
        self.quality_evaluators = self._load_quality_evaluators()
        
    def _load_retry_policies(self) -> Dict[str, Dict[str, Any]]:
        """加载重试策略"""
        return {
            "default": {
                "max_retries": 3,
                "retry_delay": 2.0,
                "backoff_factor": 1.5
            },
            "data_loading": {
                "max_retries": 5,
                "retry_delay": 1.0,
                "backoff_factor": 2.0
            },
            "analysis_heavy": {
                "max_retries": 2,
                "retry_delay": 5.0,
                "backoff_factor": 1.0
            }
        }
    
    def _load_quality_evaluators(self) -> Dict[str, Callable]:
        """加载质量评估器"""
        return {
            "data_preview": self._evaluate_data_preview_quality,
            "variable_description": self._evaluate_variable_description_quality,
            "observation_analysis": self._evaluate_observation_analysis_quality,
            "relevance_analysis": self._evaluate_relevance_analysis_quality,
            "hypothesis_proposal": self._evaluate_hypothesis_quality,
            "default": self._evaluate_default_quality
        }
    
    async def execute_step(self, step_definition: StepDefinition, 
                          frontend_state: Dict[str, Any],
                          context: Dict[str, Any]) -> ActionResult:
        """执行单个步骤"""
        start_time = time.time()
        
        try:
            # 检查缓存
            cache_key = self._generate_cache_key(step_definition, frontend_state)
            if cache_key in self.execution_cache:
                cached_result = self.execution_cache[cache_key]
                if self._is_cache_valid(cached_result, step_definition):
                    return cached_result
            
            # 动态加载action函数
            action_function = await self._load_action_function(step_definition)
            
            # 执行action
            result = await self._execute_with_retry(
                action_function, step_definition, frontend_state, context
            )
            
            execution_time = time.time() - start_time
            
            # 评估质量
            quality_score = await self._evaluate_quality(step_definition, result)
            
            # 创建执行结果
            action_result = ActionResult(
                step_id=step_definition.step_id,
                execution_result=ExecutionResult.SUCCESS,
                step_status=StepStatus.COMPLETED,
                outputs=result,
                execution_time=execution_time,
                quality_score=quality_score
            )
            
            # 缓存结果
            self.execution_cache[cache_key] = action_result
            
            return action_result
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_message = f"Execution failed: {str(e)}\n{traceback.format_exc()}"
            
            return ActionResult(
                step_id=step_definition.step_id,
                execution_result=ExecutionResult.FAILURE,
                step_status=StepStatus.FAILED,
                outputs={},
                execution_time=execution_time,
                error_message=error_message
            )
    
    async def _load_action_function(self, step_definition: StepDefinition) -> Callable:
        """动态加载action函数"""
        try:
            module = importlib.import_module(step_definition.action_module)
            action_function = getattr(module, step_definition.action_function)
            return action_function
        except (ImportError, AttributeError) as e:
            raise ValueError(f"Cannot load action function {step_definition.action_function} "
                           f"from module {step_definition.action_module}: {e}")
    
    async def _execute_with_retry(self, action_function: Callable, 
                                step_definition: StepDefinition,
                                frontend_state: Dict[str, Any],
                                context: Dict[str, Any]) -> Dict[str, Any]:
        """带重试机制的执行"""
        retry_policy = self._get_retry_policy(step_definition)
        last_exception = None
        
        for attempt in range(retry_policy["max_retries"] + 1):
            try:
                # 准备执行参数
                step_params = self._prepare_step_params(step_definition, frontend_state, context)
                
                # 执行action函数
                if asyncio.iscoroutinefunction(action_function):
                    result = await action_function(**step_params)
                else:
                    result = action_function(**step_params)
                
                # 验证结果
                if self._validate_result(result, step_definition):
                    return result
                else:
                    raise ValueError("Action result validation failed")
                    
            except Exception as e:
                last_exception = e
                if attempt < retry_policy["max_retries"]:
                    delay = retry_policy["retry_delay"] * (retry_policy["backoff_factor"] ** attempt)
                    await asyncio.sleep(delay)
                    continue
                else:
                    break
        
        raise last_exception or Exception("Unknown execution error")
    
    def _prepare_step_params(self, step_definition: StepDefinition,
                           frontend_state: Dict[str, Any],
                           context: Dict[str, Any]) -> Dict[str, Any]:
        """准备步骤执行参数"""
        # 构建符合现有action函数签名的参数
        step_info = {
            "step_id": step_definition.step_id,
            "step_index": step_definition.step_index,
            "name": step_definition.name,
            "description": step_definition.description
        }
        
        # 合并前端状态和上下文
        state = {
            **frontend_state,
            **context,
            "toDoList": frontend_state.get("completed_steps", [])
        }
        
        return {
            "step": step_info,
            "state": state,
            "stream": False  # 目前不支持流式处理
        }
    
    def _validate_result(self, result: Any, step_definition: StepDefinition) -> bool:
        """验证action执行结果"""
        if result is None:
            return False
        
        # 检查result是否是字典格式
        if not isinstance(result, dict):
            return False
        
        # 检查是否包含必要的字段
        required_fields = ["actions"]  # StepTemplate应该返回actions列表
        for field in required_fields:
            if field not in result:
                return False
        
        return True
    
    def _get_retry_policy(self, step_definition: StepDefinition) -> Dict[str, Any]:
        """获取重试策略"""
        # 根据步骤类型选择重试策略
        if "data" in step_definition.step_id.lower():
            return self.retry_policies["data_loading"]
        elif "analysis" in step_definition.step_id.lower():
            return self.retry_policies["analysis_heavy"]
        else:
            return self.retry_policies["default"]
    
    async def _evaluate_quality(self, step_definition: StepDefinition, 
                              result: Dict[str, Any]) -> float:
        """评估执行结果质量"""
        evaluator = self.quality_evaluators.get(
            step_definition.step_id, 
            self.quality_evaluators["default"]
        )
        
        return await evaluator(result, step_definition)
    
    async def _evaluate_data_preview_quality(self, result: Dict[str, Any], 
                                           step_definition: StepDefinition) -> float:
        """评估数据预览质量"""
        quality_score = 0.5  # 基础分数
        
        # 检查是否有actions
        if "actions" in result and len(result["actions"]) > 0:
            quality_score += 0.2
        
        # 检查是否有text内容
        text_actions = [action for action in result.get("actions", []) 
                       if action.get("action") == "add"]
        if len(text_actions) >= 2:
            quality_score += 0.2
        
        # 检查是否包含thinking过程
        thinking_actions = [action for action in result.get("actions", [])
                          if action.get("action") == "is_thinking"]
        if thinking_actions:
            quality_score += 0.1
        
        return min(1.0, quality_score)
    
    async def _evaluate_variable_description_quality(self, result: Dict[str, Any],
                                                   step_definition: StepDefinition) -> float:
        """评估变量描述质量"""
        quality_score = 0.6
        
        actions = result.get("actions", [])
        
        # 检查是否有足够的描述内容
        text_content_length = sum(
            len(action.get("content", "")) for action in actions
            if action.get("action") == "add"
        )
        
        if text_content_length > 500:
            quality_score += 0.2
        elif text_content_length > 200:
            quality_score += 0.1
        
        # 检查是否有变量添加
        variable_actions = [action for action in actions
                          if action.get("action") == "add_variable"]
        if variable_actions:
            quality_score += 0.2
        
        return min(1.0, quality_score)
    
    async def _evaluate_observation_analysis_quality(self, result: Dict[str, Any],
                                                   step_definition: StepDefinition) -> float:
        """评估观察分析质量"""
        return await self._evaluate_default_quality(result, step_definition)
    
    async def _evaluate_relevance_analysis_quality(self, result: Dict[str, Any],
                                                 step_definition: StepDefinition) -> float:
        """评估相关性分析质量"""
        quality_score = 0.5
        
        actions = result.get("actions", [])
        
        # 检查是否有thinking过程
        thinking_actions = [action for action in actions
                          if action.get("action") == "is_thinking"]
        if thinking_actions:
            quality_score += 0.2
        
        # 检查是否有分析结果
        analysis_content = [action for action in actions
                          if action.get("action") == "add" and 
                          "analysis" in action.get("content", "").lower()]
        if analysis_content:
            quality_score += 0.3
        
        return min(1.0, quality_score)
    
    async def _evaluate_hypothesis_quality(self, result: Dict[str, Any],
                                         step_definition: StepDefinition) -> float:
        """评估假设提出质量"""
        quality_score = 0.4
        
        actions = result.get("actions", [])
        
        # 检查是否有假设内容
        hypothesis_content = [action for action in actions
                            if action.get("action") == "add" and
                            ("hypothesis" in action.get("content", "").lower() or
                             "假设" in action.get("content", ""))]
        if hypothesis_content:
            quality_score += 0.4
        
        # 检查内容长度和深度
        total_content_length = sum(
            len(action.get("content", "")) for action in actions
            if action.get("action") == "add"
        )
        
        if total_content_length > 300:
            quality_score += 0.2
        
        return min(1.0, quality_score)
    
    async def _evaluate_default_quality(self, result: Dict[str, Any],
                                       step_definition: StepDefinition) -> float:
        """默认质量评估"""
        if not result or "actions" not in result:
            return 0.0
        
        actions = result["actions"]
        if not actions:
            return 0.2
        
        # 基于actions数量和类型的简单评估
        quality_score = 0.5
        
        if len(actions) >= 2:
            quality_score += 0.2
        
        action_types = set(action.get("action") for action in actions)
        if len(action_types) > 1:
            quality_score += 0.1
        
        return min(1.0, quality_score)
    
    def _generate_cache_key(self, step_definition: StepDefinition,
                           frontend_state: Dict[str, Any]) -> str:
        """生成缓存键"""
        state_hash = hash(str(sorted(frontend_state.items())))
        return f"{step_definition.step_id}_{step_definition.step_index}_{state_hash}"
    
    def _is_cache_valid(self, cached_result: ActionResult, 
                       step_definition: StepDefinition) -> bool:
        """检查缓存是否有效"""
        # 简单的缓存有效性检查
        return (cached_result.execution_result == ExecutionResult.SUCCESS and
                cached_result.quality_score >= 0.7)
    
    async def execute_batch(self, steps: List[StepDefinition],
                           frontend_state: Dict[str, Any],
                           context: Dict[str, Any]) -> List[ActionResult]:
        """批量执行步骤"""
        results = []
        current_state = frontend_state.copy()
        
        for step in steps:
            result = await self.execute_step(step, current_state, context)
            results.append(result)
            
            # 更新状态用于下一个步骤
            if result.execution_result == ExecutionResult.SUCCESS:
                current_state["completed_steps"] = current_state.get("completed_steps", []) + [step.step_id]
                current_state["step_results"] = current_state.get("step_results", {})
                current_state["step_results"][step.step_id] = result.outputs
        
        return results
    
    def clear_cache(self):
        """清理缓存"""
        self.execution_cache.clear()
    
    def get_execution_stats(self) -> Dict[str, Any]:
        """获取执行统计信息"""
        if not self.execution_cache:
            return {"total_executions": 0}
        
        results = list(self.execution_cache.values())
        
        return {
            "total_executions": len(results),
            "success_rate": len([r for r in results if r.execution_result == ExecutionResult.SUCCESS]) / len(results),
            "average_quality": sum(r.quality_score for r in results) / len(results),
            "average_execution_time": sum(r.execution_time for r in results) / len(results),
            "cache_size": len(self.execution_cache)
        }