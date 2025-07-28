/**
 * 无状态工作流API客户端
 * Stateless Workflow API Client for Finite State Machine Backend
 * 
 * 后端是有限状态机，不存储任何运行时状态
 * Backend is a finite state machine that doesn't store runtime state
 * 所有状态数据都存储在前端
 * All state data is stored in frontend
 */

import constants from '../stages/constants';

class WorkflowAPIClient {
    constructor() {
        this.baseURL = constants.API.WORKFLOW_BASE_URL || 'http://localhost:28600/api/workflow';
        this.maxContextLength = 8000; // 最大上下文长度
        this.maxHistoryItems = 50; // 最大历史记录数
    }

    /**
     * 压缩上下文数据以避免过长
     */
    compressContext(context) {
        if (!context) return context;
        
        const compressed = { ...context };
        
        // 压缩历史记录
        if (compressed.agent_thinking_history && compressed.agent_thinking_history.length > this.maxHistoryItems) {
            // 保留最近的记录和关键里程碑
            const recent = compressed.agent_thinking_history.slice(-this.maxHistoryItems * 0.7);
            const milestones = compressed.agent_thinking_history
                .filter(item => item.is_milestone || item.confidence_level > 0.8)
                .slice(-this.maxHistoryItems * 0.3);
            
            compressed.agent_thinking_history = [...milestones, ...recent];
        }
        
        // 压缩步骤结果 - 只保留关键信息
        if (compressed.step_results) {
            Object.keys(compressed.step_results).forEach(stepId => {
                const result = compressed.step_results[stepId];
                if (result && typeof result === 'object') {
                    compressed.step_results[stepId] = {
                        status: result.status,
                        summary: result.summary || this.summarizeStepResult(result),
                        key_outputs: result.key_outputs || result.outputs,
                        timestamp: result.timestamp
                    };
                }
            });
        }
        
        // 检查总长度
        const contextStr = JSON.stringify(compressed);
        if (contextStr.length > this.maxContextLength) {
            return this.aggressiveCompress(compressed);
        }
        
        return compressed;
    }

    /**
     * 激进压缩 - 当常规压缩仍然过长时使用
     */
    aggressiveCompress(context) {
        const compressed = { ...context };
        
        // 只保留最核心的信息
        if (compressed.agent_thinking_history) {
            compressed.agent_thinking_history = compressed.agent_thinking_history
                .filter(item => item.is_milestone || item.confidence_level > 0.9)
                .slice(-10);
        }
        
        // 为每个阶段创建总结
        if (compressed.stage_results) {
            Object.keys(compressed.stage_results).forEach(stageId => {
                const result = compressed.stage_results[stageId];
                compressed.stage_results[stageId] = {
                    status: 'completed',
                    summary: `Stage ${stageId} completed with ${result.steps?.length || 0} steps`,
                    completedAt: result.completedAt
                };
            });
        }
        
        return compressed;
    }

    /**
     * 为步骤结果创建总结
     */
    summarizeStepResult(result) {
        if (!result) return 'No result';
        
        if (result.code) {
            return `Executed code with ${result.outputs?.length || 0} outputs`;
        }
        
        if (result.analysis) {
            return result.analysis.substring(0, 200) + '...';
        }
        
        return JSON.stringify(result).substring(0, 100) + '...';
    }

    /**
     * 获取工作流模板配置 (无状态)
     * Get workflow template configuration (stateless)
     */
    async getWorkflowTemplate(templateType = 'data_analysis') {
        try {
            const response = await fetch(`${this.baseURL}/template?type=${templateType}`, {
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get workflow template:', error);
            throw error;
        }
    }

    /**
     * 获取智能建议 (目标驱动)
     * Get intelligent suggestions (goal-driven)
     */
    async getIntelligentSuggestions(currentContext) {
        try {
            const response = await fetch(`${this.baseURL}/intelligent_suggestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(currentContext)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get intelligent suggestions:', error);
            throw error;
        }
    }

    /**
     * 执行步骤 (无状态 - 前端提供所有上下文)
     * Execute step (stateless - frontend provides all context)
     */
    async executeStep(stepRequest) {
        try {
            // 压缩上下文和前端状态
            const compressedContext = this.compressContext(stepRequest.context);
            const compressedFrontendState = this.compressContext(stepRequest.frontend_state);
            
            const response = await fetch(`${this.baseURL}/execute_step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    // 前端提供所有必要的上下文信息
                    stage_id: stepRequest.stage_id,
                    step_id: stepRequest.step_id,
                    step_index: stepRequest.step_index,
                    context: compressedContext,
                    variables: stepRequest.variables,
                    user_preferences: stepRequest.user_preferences,
                    frontend_state: compressedFrontendState
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to execute step:', error);
            throw error;
        }
    }

    /**
     * 获取下一步建议 (无状态决策)
     * Get next step suggestion (stateless decision)
     */
    async getNextStepSuggestion(currentContext) {
        try {
            const response = await fetch(`${this.baseURL}/next_step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_stage: currentContext.current_stage,
                    current_step: currentContext.current_step,
                    step_results: currentContext.step_results,
                    context: currentContext.context,
                    variables: currentContext.variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get next step suggestion:', error);
            throw error;
        }
    }

    /**
     * 获取阶段转换建议 (无状态决策)
     * Get stage transition suggestion (stateless decision)
     */
    async getStageTransitionSuggestion(currentContext) {
        try {
            const response = await fetch(`${this.baseURL}/stage_transition`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_stage: currentContext.current_stage,
                    completed_steps: currentContext.completed_steps,
                    context: currentContext.context,
                    variables: currentContext.variables,
                    stage_results: currentContext.stage_results
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get stage transition suggestion:', error);
            throw error;
        }
    }

    /**
     * 验证步骤完成度 (无状态验证)
     * Validate step completion (stateless validation)
     */
    async validateStepCompletion(validationRequest) {
        try {
            const response = await fetch(`${this.baseURL}/validate_step`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stage_id: validationRequest.stage_id,
                    step_id: validationRequest.step_id,
                    step_results: validationRequest.step_results,
                    context: validationRequest.context,
                    variables: validationRequest.variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to validate step completion:', error);
            throw error;
        }
    }

    /**
     * 获取可用操作列表 (基于当前状态)
     * Get available actions list (based on current state)
     */
    async getAvailableActions(currentContext) {
        try {
            const response = await fetch(`${this.baseURL}/available_actions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_stage: currentContext.current_stage,
                    current_step: currentContext.current_step,
                    context: currentContext.context,
                    variables: currentContext.variables
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get available actions:', error);
            throw error;
        }
    }

    /**
     * 获取Agent建议 (无状态推理)
     * Get agent suggestions (stateless reasoning)
     */
    async getAgentSuggestion(agentRequest) {
        try {
            const response = await fetch(`${this.baseURL}/agent_suggestion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agent_type: agentRequest.agent_type,
                    task: agentRequest.task,
                    context: agentRequest.context,
                    variables: agentRequest.variables,
                    constraints: agentRequest.constraints
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get agent suggestion:', error);
            throw error;
        }
    }
}

// 创建单例实例
const workflowAPIClient = new WorkflowAPIClient();

export default workflowAPIClient;