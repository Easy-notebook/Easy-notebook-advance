"""
新架构的API端点 - 兼容现有前端协议，但使用新的OOP架构
"""

import logging
import os
from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from app.models.planner import (
    SequenceRequest, 
    FeedbackRequest, 
    SequenceResponse, 
    FeedbackResponse, 
    GenerateRequest,
    GenerateResponse,
)
from app.utils.helpers import get_stage_or_abort, validate_step_index, create_streaming_response

# Import new architecture components
from shared.config.settings import get_config
from shared.di_container import DIContainerBuilder
from infrastructure.llm.llm_factory import LLMFactory
from infrastructure.agents.factory.agent_factory import AgentFactory
from presentation.api.step_template_adapter import (
    StepTemplateAdapter, 
    AgentStepBuilder,
    create_step_template_from_agent_result
)
from domain.interfaces import ILLMProvider, IDataCleaningAgent, IPredictionAgent, IProblemDefinitionAgent, AgentConfig

logger = logging.getLogger("app")
router = APIRouter()

# Global service provider - initialized on first request
_service_provider = None


def get_service_provider():
    """Get or create service provider"""
    global _service_provider
    if _service_provider is None:
        _service_provider = _setup_service_provider()
    return _service_provider


def _setup_service_provider():
    """Setup service provider with dependency injection"""
    try:
        config = get_config()
        
        builder = DIContainerBuilder()
        
        # Register LLM provider
        def create_llm_provider() -> ILLMProvider:
            factory = LLMFactory()
            return factory.create_from_config(config.llm)
        
        builder.add_singleton(ILLMProvider, factory=create_llm_provider)
        
        # Register agent factory
        def create_agent_factory(llm_provider: ILLMProvider) -> AgentFactory:
            return AgentFactory(llm_provider)
        
        builder.add_singleton(AgentFactory, factory=create_agent_factory)
        
        # Register agents as singletons with default configs
        def create_data_cleaning_agent(factory: AgentFactory) -> IDataCleaningAgent:
            agent_config = AgentConfig(
                max_retries=config.agent_defaults.max_retries,
                timeout=config.agent_defaults.timeout,
                temperature=config.agent_defaults.temperature,
                max_tokens=config.agent_defaults.max_tokens
            )
            return factory.create_data_cleaning_agent(agent_config)
        
        def create_problem_definition_agent(factory: AgentFactory) -> IProblemDefinitionAgent:
            agent_config = AgentConfig(
                max_retries=config.agent_defaults.max_retries,
                timeout=config.agent_defaults.timeout,
                temperature=config.agent_defaults.temperature,
                max_tokens=config.agent_defaults.max_tokens
            )
            return factory.create_problem_definition_agent(agent_config)
        
        def create_prediction_agent(factory: AgentFactory) -> IPredictionAgent:
            agent_config = AgentConfig(
                max_retries=config.agent_defaults.max_retries,
                timeout=config.agent_defaults.timeout,
                temperature=config.agent_defaults.temperature,
                max_tokens=config.agent_defaults.max_tokens
            )
            return factory.create_prediction_agent(agent_config)
        
        builder.add_singleton(IDataCleaningAgent, factory=create_data_cleaning_agent)
        builder.add_singleton(IProblemDefinitionAgent, factory=create_problem_definition_agent)
        builder.add_singleton(IPredictionAgent, factory=create_prediction_agent)
        
        return builder.build_provider()
        
    except Exception as e:
        logger.error(f"Failed to setup service provider: {str(e)}")
        raise


@router.post("/debug/toggle", response_model=Dict[str, Any])
async def toggle_debug_mode():
    """切换调试模式状态"""    
    current_mode = os.environ.get("DEBUG_MODE", "false").lower() == "true"
    new_mode = not current_mode
    
    os.environ["DEBUG_MODE"] = str(new_mode).lower()
    logger.info(f"调试模式已{'启用' if new_mode else '禁用'}")
    
    return {
        "debug_mode": new_mode,
        "message": f"调试模式已{'启用' if new_mode else '禁用'}",
        "delay_multiplier": float(os.environ.get("DEBUG_DELAY_MULTIPLIER", "3"))
    }


@router.post("/debug/set_delay", response_model=Dict[str, Any])
async def set_debug_delay(multiplier: float = 3.0):
    """设置调试模式下的延迟倍数"""
    if multiplier < 1.0:
        raise HTTPException(status_code=400, detail="延迟倍数必须大于等于1.0")
    
    os.environ["DEBUG_DELAY_MULTIPLIER"] = str(multiplier)
    logger.info(f"调试延迟倍数已设置为 {multiplier}")
    
    return {
        "debug_mode": os.environ.get("DEBUG_MODE", "false").lower() == "true",
        "message": f"调试延迟倍数已设置为 {multiplier}",
        "delay_multiplier": multiplier
    }


@router.get("/debug/status", response_model=Dict[str, Any])
async def get_debug_status():
    """获取当前调试模式状态"""
    debug_mode = os.environ.get("DEBUG_MODE", "false").lower() == "true"
    delay_multiplier = float(os.environ.get("DEBUG_DELAY_MULTIPLIER", "3"))
    
    return {
        "debug_mode": debug_mode,
        "delay_multiplier": delay_multiplier,
        "status": "启用" if debug_mode else "禁用"
    }


@router.post("/actions", response_model=SequenceResponse)
async def planner_sequence(request: SequenceRequest):
    """
    使用新架构获取指定阶段和步骤的操作序列
    """
    try:
        stage = get_stage_or_abort(request.stage_id)
        step = validate_step_index(stage, request.step_index)
        
        # Get service provider
        service_provider = get_service_provider()
        
        # Route to appropriate agent based on stage and step
        sequence = await _generate_sequence_with_new_architecture(
            request.stage_id,
            request.step_index,
            step,
            request.state,
            service_provider,
            stream=request.stream
        )
        
        if not sequence:
            raise HTTPException(status_code=404, detail=f"Sequence for step {request.step_index} not found")
        
        next_step = request.step_index + 1 if request.step_index + 1 < len(stage["steps"]) else None
        
        # Add metadata to sequence
        sequence["stage_id"] = request.stage_id
        sequence["step"] = step
        sequence["next_step"] = next_step
        
        return create_streaming_response(sequence)
        
    except Exception as e:
        logger.error(f"Error in planner_sequence: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_sequence_with_new_architecture(
    stage_id: str,
    step_index: int,
    step_data: Dict[str, Any],
    state: Dict[str, Any],
    service_provider,
    stream: bool = True
) -> Dict[str, Any]:
    """使用新架构生成操作序列"""
    
    try:
        # Extract parameters from state
        csv_path = state.get('variables', {}).get('csv_path', '')
        problem_description = state.get('variables', {}).get('problem_description', '')
        context_description = state.get('variables', {}).get('context_description', '')
        
        # Route based on stage and step
        if stage_id == "stage_0" and step_index == 0:
            # Problem definition and data loading
            return await _handle_problem_definition_step(
                step_data, state, service_provider, 
                csv_path, problem_description, context_description
            )
        
        elif stage_id == "stage_1":
            # Data cleaning steps
            return await _handle_data_cleaning_step(
                step_data, state, service_provider,
                csv_path, problem_description, context_description, step_index
            )
        
        elif stage_id == "stage_3":
            # Model development steps
            return await _handle_prediction_step(
                step_data, state, service_provider,
                csv_path, problem_description, context_description, step_index
            )
        
        else:
            # Fallback to original system for unimplemented stages
            from app.actions import get_sequence_generator
            return await get_sequence_generator(stage_id, step_index, state, stream=stream)
            
    except Exception as e:
        logger.error(f"Error generating sequence: {str(e)}")
        # Fallback to original system
        from app.actions import get_sequence_generator
        return await get_sequence_generator(stage_id, step_index, state, stream=stream)


async def _handle_problem_definition_step(
    step_data: Dict[str, Any],
    state: Dict[str, Any],
    service_provider,
    csv_path: str,
    problem_description: str,
    context_description: str
) -> Dict[str, Any]:
    """处理问题定义步骤"""
    
    try:
        # Get problem definition agent
        problem_agent = service_provider.get_service(IProblemDefinitionAgent)
        
        # Create step builder
        builder = AgentStepBuilder(step_data, state)
        
        # Start execution
        builder.start_agent_execution("问题定义Agent", "分析问题和数据集")
        
        if csv_path and problem_description:
            # Execute problem definition
            result = problem_agent.execute({
                'operation': 'full_analysis',
                'dataset_path': csv_path,
                'problem_description': problem_description,
                'context_description': context_description
            })
            
            builder.complete_agent_execution(result, "问题定义Agent", "问题分析完成")
            
            # Update state with results
            if result.success and isinstance(result.data, dict):
                state['variables'].update({
                    'variable_analysis': result.data.get('变量描述', {}),
                    'observation_unit': result.data.get('观测单位', ''),
                    'variable_relevance': result.data.get('变量相关性', {})
                })
        else:
            # Missing required parameters
            builder.complete_agent_execution(
                type('Result', (), {
                    'success': False,
                    'message': '缺少必要的参数：数据集路径或问题描述',
                    'data': None,
                    'execution_time': 0,
                    'tokens_used': 0,
                    'cost': 0
                })(),
                "问题定义Agent",
                "参数不足"
            )
        
        return builder.build()
        
    except Exception as e:
        logger.error(f"Error in problem definition step: {str(e)}")
        raise


async def _handle_data_cleaning_step(
    step_data: Dict[str, Any],
    state: Dict[str, Any],
    service_provider,
    csv_path: str,
    problem_description: str,
    context_description: str,
    step_index: int
) -> Dict[str, Any]:
    """处理数据清理步骤"""
    
    try:
        # Get data cleaning agent
        cleaning_agent = service_provider.get_service(IDataCleaningAgent)
        
        # Create step builder
        builder = AgentStepBuilder(step_data, state)
        
        if step_index == 0:
            # Data analysis step
            builder.start_agent_execution("数据清理Agent", "分析数据质量")
            
            if csv_path:
                result = cleaning_agent.analyze_dataset(csv_path)
                builder.add_analysis_step(result)
                
                # Update state
                if result.success:
                    state['variables']['data_analysis'] = result.data
            else:
                builder.complete_agent_execution(
                    type('Result', (), {
                        'success': False,
                        'message': '缺少数据集路径',
                        'data': None,
                        'execution_time': 0,
                        'tokens_used': 0,
                        'cost': 0
                    })(),
                    "数据清理Agent",
                    "参数错误"
                )
        
        elif step_index == 1:
            # Issue identification step
            builder.start_agent_execution("数据清理Agent", "识别数据质量问题")
            
            if csv_path:
                result = cleaning_agent.identify_issues(csv_path)
                builder.complete_agent_execution(result, "数据清理Agent", "问题识别完成")
                
                if result.success:
                    state['variables']['data_issues'] = result.data
            else:
                builder.complete_agent_execution(
                    type('Result', (), {'success': False, 'message': '缺少数据集路径'})(),
                    "数据清理Agent",
                    "参数错误"
                )
        
        elif step_index == 2:
            # Cleaning plan generation
            builder.start_agent_execution("数据清理Agent", "生成数据清理计划")
            
            if csv_path and state.get('variables', {}).get('data_issues'):
                issues = state['variables']['data_issues'].get('issues', [])
                result = cleaning_agent.generate_cleaning_plan(csv_path, issues)
                builder.add_cleaning_step(result)
                
                if result.success:
                    state['variables']['cleaning_plan'] = result.data
            else:
                builder.complete_agent_execution(
                    type('Result', (), {'success': False, 'message': '缺少必要的前置数据'})(),
                    "数据清理Agent",
                    "数据不足"
                )
        
        elif step_index == 3:
            # Execute cleaning
            builder.start_agent_execution("数据清理Agent", "执行数据清理")
            
            if csv_path and state.get('variables', {}).get('cleaning_plan'):
                cleaning_plan = state['variables']['cleaning_plan']
                result = cleaning_agent.execute_cleaning(csv_path, cleaning_plan)
                builder.complete_agent_execution(result, "数据清理Agent", "数据清理完成")
                
                if result.success:
                    state['variables']['cleaned_dataset_path'] = result.data.get('cleaned_dataset_path')
            else:
                builder.complete_agent_execution(
                    type('Result', (), {'success': False, 'message': '缺少清理计划'})(),
                    "数据清理Agent",
                    "计划缺失"
                )
        
        return builder.build()
        
    except Exception as e:
        logger.error(f"Error in data cleaning step: {str(e)}")
        raise


async def _handle_prediction_step(
    step_data: Dict[str, Any],
    state: Dict[str, Any],
    service_provider,
    csv_path: str,
    problem_description: str,
    context_description: str,
    step_index: int
) -> Dict[str, Any]:
    """处理预测建模步骤"""
    
    try:
        # Get prediction agent
        prediction_agent = service_provider.get_service(IPredictionAgent)
        
        # Create step builder
        builder = AgentStepBuilder(step_data, state)
        
        if step_index == 0:
            # Model suggestion step
            builder.start_agent_execution("预测建模Agent", "建议适合的模型")
            
            cleaned_path = state.get('variables', {}).get('cleaned_dataset_path', csv_path)
            if cleaned_path:
                result = prediction_agent.suggest_models(cleaned_path, "classification")
                builder.add_modeling_step(result)
                
                if result.success:
                    state['variables']['suggested_models'] = result.data
            else:
                builder.complete_agent_execution(
                    type('Result', (), {'success': False, 'message': '缺少数据集路径'})(),
                    "预测建模Agent",
                    "数据缺失"
                )
        
        elif step_index == 1:
            # Model training step
            builder.start_agent_execution("预测建模Agent", "训练模型")
            
            cleaned_path = state.get('variables', {}).get('cleaned_dataset_path', csv_path)
            suggested_models = state.get('variables', {}).get('suggested_models', {}).get('models', [])
            
            if cleaned_path and suggested_models:
                result = prediction_agent.train_models(cleaned_path, suggested_models)
                builder.complete_agent_execution(result, "预测建模Agent", "模型训练完成")
                
                if result.success:
                    state['variables']['training_results'] = result.data
            else:
                builder.complete_agent_execution(
                    type('Result', (), {'success': False, 'message': '缺少模型建议或数据集'})(),
                    "预测建模Agent",
                    "前置条件不满足"
                )
        
        return builder.build()
        
    except Exception as e:
        logger.error(f"Error in prediction step: {str(e)}")
        raise


@router.post("/reflection", response_model=FeedbackResponse)
async def planner_feedback(request: FeedbackRequest):
    """接收前端对执行结果的反馈 - 保持原有逻辑"""    
    
    # 判断目标是否达成
    target_achieved = False
    if request.state:
        toDoList = request.state.get("toDoList", [])
        if toDoList == []:
            target_achieved = True

    return {
        "status": "received", 
        "message": "Feedback processed", 
        "targetAchieved": target_achieved,
        "state": request.state
    }


@router.post("/generate", response_model=GenerateResponse)
async def generate_response(request: GenerateRequest):
    """生成响应 - 使用新架构"""
    try:
        # Get service provider
        service_provider = get_service_provider()
        
        # Use a general agent for response generation
        # For now, fallback to original implementation
        from app.actions import general_response
        return await general_response(request.issue, request.context)
        
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        # Fallback to original implementation
        from app.actions import general_response
        return await general_response(request.issue, request.context)