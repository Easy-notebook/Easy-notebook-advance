// services/streamHandler.ts
import globalUpdateInterface from '../interfaces/globalUpdateInterface';
import { AgentMemoryService, AgentType } from './agentMemoryService';
import useStore from '../store/notebookStore';

// 跟踪正在生成的 cells 的映射表
const generationCellTracker = new Map<string, string>(); // commandId -> cellId

// Type definitions for stream data structures
export interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

export interface StreamPayload {
    mode?: 'create' | 'step';
    phaseId?: string;
    index?: number;
    allow?: boolean;
    cellId?: string;
    content?: string;
    outputs?: any[];
    cell?: any;
    error?: string;
    type?: string;
    description?: string;
    QId?: string | number;
}

export interface StreamData {
    type: string;
    payload?: StreamPayload;
    data?: {
        payload?: StreamPayload;
    };
}

export interface GlobalUpdateInterface {
    setViewMode: (mode: string) => Promise<void>;
    setCurrentPhase: (phaseId: string) => Promise<void>;
    setCurrentStepIndex: (index: number) => Promise<void>;
    setAllowPagination: (allow: boolean) => Promise<void>;
    updateCell: (cellId: string, content: string) => Promise<void>;
    updateCellOutputs: (cellId: string, outputs: any[]) => Promise<void>;
    addCell: (cell: any, index?: number) => Promise<void>;
    deleteCell: (cellId: string) => Promise<void>;
    setError: (error: string) => Promise<void>;
    clearCells: () => Promise<void>;
    clearCellOutputs: (cellId: string) => Promise<void>;
    clearAllOutputs: () => Promise<void>;
    setCurrentCell: (cellId: string) => Promise<void>;
    setCurrentRunningPhaseId: (phaseId: string) => Promise<void>;
    addNewCell2End: (type: string, description: string) => Promise<void>;
    addNewContent2CurrentCell: (content: string) => Promise<void>;
    runCurrentCodeCell: () => Promise<void>;
    setCurrentCellMode_onlyCode: () => Promise<void>;
    setCurrentCellMode_onlyOutput: () => Promise<void>;
    setCurrentCellMode_complete: () => Promise<void>;
    initStreamingAnswer: (qid: string) => Promise<void>;
    addContentToAnswer: (qid: string, content: string) => Promise<void>;
    finishStreamingAnswer: (qid: string) => Promise<void>;
    addNewContent2CurrentCellDescription: (content: string) => Promise<void>;
    convertCurrentCodeCellToHybridCell: () => Promise<void>;
    updateCurrentCellWithContent: (content: string) => Promise<void>;
    addNewCell2Next: (type: string, description: string) => Promise<void>;
}

export type ShowToastFunction = (toast: ToastMessage) => Promise<void>;

export const handleStreamResponse = async (
    data: StreamData, 
    showToast: ShowToastFunction
): Promise<void> => {
    
    switch (data.type) {
        case 'update_view_mode': {
            const mode = data.payload?.mode;
            if (mode) {
                await globalUpdateInterface.setViewMode(mode);
                await showToast({
                    message: `切换到 ${mode === 'complete' ? 'Complete' : 'Step'} Mode 成功`,
                    type: "success"
                });
            }
            break;
        }

        case 'update_current_phase': {
            const phaseId = data.payload?.phaseId;
            if (phaseId) {
                await globalUpdateInterface.setCurrentPhase(phaseId);
                await globalUpdateInterface.setCurrentStepIndex(0);
                await showToast({
                    message: "当前阶段已更新",
                    type: "success"
                });
            }
            break;
        }

        case 'update_current_step_index': {
            const index = data.payload?.index;
            if (typeof index === 'number') {
                await globalUpdateInterface.setCurrentStepIndex(index);
                await showToast({
                    message: "当前步骤已更新",
                    type: "success"
                });
            }
            break;
        }

        case 'update_allow_pagination': {
            const allow = data.payload?.allow;
            if (typeof allow === 'boolean') {
                await globalUpdateInterface.setAllowPagination(allow);
                await showToast({
                    message: `翻页权限已 ${allow ? '启用' : '禁用'}`,
                    type: "success"
                });
            }
            break;
        }

        case 'update_cell': {
            const cellId = data.payload?.cellId;
            const content = data.payload?.content;
            const outputs = data.payload?.outputs;
            
            if (cellId) {
                if (content) {
                    await globalUpdateInterface.updateCell(cellId, content);
                }
                if (outputs) {
                    await globalUpdateInterface.updateCellOutputs(cellId, outputs);
                }
            }
            break;
        }

        case 'add_cell': {
            const cell = data.payload?.cell;
            const index = data.payload?.index;
            if (cell) {
                await globalUpdateInterface.addCell(cell, index);
            }
            break;
        }

        case 'delete_cell': {
            const cellId = data.payload?.cellId;
            if (cellId) {
                await globalUpdateInterface.deleteCell(cellId);
            }
            break;
        }

        case 'set_error': {
            const error = data.payload?.error;
            if (error) {
                await globalUpdateInterface.setError(error);
                
                // 记录失败的交互
                try {
                    const notebookState = (window as any).__notebookStore?.getState?.();
                    const notebookId = notebookState?.notebookId;
                    
                    if (notebookId) {
                        console.log('记录Agent错误:', error);
                        
                        // 根据错误类型判断Agent类型（简单启发式方法）
                        let agentType: AgentType = 'general';
                        if (error.includes('command') || error.includes('code generation')) {
                            agentType = 'command';
                        } else if (error.includes('debug') || error.includes('修复')) {
                            agentType = 'debug';
                        } else if (error.includes('output') || error.includes('分析')) {
                            agentType = 'output';
                        }
                        
                        AgentMemoryService.recordOperationInteraction(
                            notebookId,
                            agentType,
                            'error',
                            false,
                            {
                                error_message: error,
                                timestamp: new Date().toISOString()
                            }
                        );
                    }
                } catch (recordError) {
                    console.error('记录错误交互时出错:', recordError);
                }
            }
            break;
        }

        // 处理通用错误事件（后端有时发送 type: 'error'）
        case 'error': {
            const errorMsg = (data.payload as any)?.error || (data as any)?.error || 'Unknown error';
            const commandId = (data.payload as any)?.commandId || (data as any)?.commandId;
            const uniqueIdentifier = (data.payload as any)?.uniqueIdentifier || (data as any)?.uniqueIdentifier;

            console.error('Received error event:', { errorMsg, commandId, uniqueIdentifier });

            // Try to attach error to the related generation cell metadata for UI display
            let updated = false;
            if (uniqueIdentifier) {
                updated = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, {
                    metadata: { isGenerating: false, generationError: errorMsg, generationStatus: 'failed' }
                });
            }
            if (!updated && commandId && generationCellTracker.has(commandId)) {
                const targetId = generationCellTracker.get(commandId)!;
                useStore.getState().updateCellMetadata(targetId, {
                    isGenerating: false,
                    generationError: errorMsg,
                    generationStatus: 'failed'
                });
                updated = true;
            }

            await showToast({ message: `Error: ${errorMsg}`, type: 'error' });
            break;
        }

        case 'clear_cells': {
            await globalUpdateInterface.clearCells();
            break;
        }

        case 'clear_outputs': {
            const cellId = data.payload?.cellId;
            if (cellId) {
                await globalUpdateInterface.clearCellOutputs(cellId);
            } else {
                await globalUpdateInterface.clearAllOutputs();
            }
            break;
        }

        case 'set_current_cell': {
            const cellId = data.payload?.cellId;
            if (cellId) {
                await globalUpdateInterface.setCurrentCell(cellId);
            }
            break;
        }

        case 'set_running_phase': {
            const phaseId = data.payload?.phaseId;
            if (phaseId) {
                await globalUpdateInterface.setCurrentRunningPhaseId(phaseId);
            }
            break;
        }

        case 'ok': {
            console.log('操作成功:', data);
            break;
        }

        case 'addCell2EndWithContent': {
            const cellType = data.data?.payload?.type;
            const description = data.data?.payload?.description;
            const content = data.data?.payload?.content;
            const metadata = data.data?.payload?.metadata;
            const commandId = data.data?.payload?.commandId;
            const prompt = data.data?.payload?.prompt;
            const serverUniqueIdentifier = (data.data as any)?.payload?.uniqueIdentifier || metadata?.uniqueIdentifier;
            
            let newCellId = null;
            if (cellType && description) {
                const enableEdit = !metadata?.isGenerating; // 如果正在生成，不启用编辑
                
                // 如果是图片或视频生成任务，使用唯一标识符策略
                if ((cellType === 'image' || cellType === 'video') && metadata?.isGenerating && (prompt || serverUniqueIdentifier)) {
                    console.log('🎯 使用唯一标识符策略创建生成cell:', {
                        type: cellType,
                        prompt: (prompt || '').substring(0, 50),
                        commandId
                    });
                    
                    // 优先使用服务端提供的唯一标识符，否则回退到本地生成
                    const uniqueIdentifier = serverUniqueIdentifier || `gen-${Date.now()}-${(prompt || '').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
                    
                    newCellId = useStore.getState().addNewCellWithUniqueIdentifier(
                        cellType, 
                        description, 
                        enableEdit, 
                        uniqueIdentifier,
                        prompt
                    );
                    
                    // 同时保持commandId映射作为备份
                    if (commandId) {
                        generationCellTracker.set(commandId, newCellId);
                        // 还要存储uniqueIdentifier映射
                        generationCellTracker.set(`unique-${uniqueIdentifier}`, newCellId);
                        console.log('存储生成cell映射:', {
                            commandId: commandId,
                            uniqueIdentifier: uniqueIdentifier,
                            cellId: newCellId
                        });
                    }
                } else {
                    // 普通cell创建
                    newCellId = await globalUpdateInterface.addNewCell2End(cellType, description, enableEdit);
                    
                    // 如果这是一个生成任务且有 commandId，存储映射关系
                    if (newCellId && commandId && metadata?.isGenerating) {
                        generationCellTracker.set(commandId, newCellId);
                        console.log('存储生成cell映射:', commandId, '->', newCellId);
                    }
                }
            }
            if (content) {
                await globalUpdateInterface.addNewContent2CurrentCell(content);
            }
            
            // Handle metadata for the newly created cell
            if (metadata && newCellId) {
                // Update the cell's metadata in the store
                const cells = useStore.getState().cells;
                const targetCell = cells.find(cell => cell.id === newCellId);
                
                if (targetCell) {
                    // 使用专门的updateCellMetadata方法
                    useStore.getState().updateCellMetadata(newCellId, metadata);
                }
            }
            break;
        }

        case 'addNewContent2CurrentCell': {
            console.log('添加新的chunk到当前的cell');
            const content = data.data?.payload?.content;
            if (content) {
                await globalUpdateInterface.addNewContent2CurrentCell(content);
            }
            break;
        }

        case 'runCurrentCodeCell': {
            console.log('执行当前代码cell:', data);
            await globalUpdateInterface.runCurrentCodeCell();
            
            // 记录debug完成（如果这是debug flow的一部分）
            try {
                const notebookState = (window as any).__notebookStore?.getState?.();
                const notebookId = notebookState?.notebookId;
                
                if (notebookId) {
                    // 检查是否是debug上下文中的代码运行
                    const debugMemory = AgentMemoryService.getAgentMemory(notebookId, 'debug' as AgentType);
                    const currentContext = debugMemory?.current_context;
                    
                    if (currentContext && currentContext.interaction_status === 'in_progress') {
                        console.log('记录debug完成 - 代码已修复并运行');
                        
                        // 更新debug状态
                        AgentMemoryService.updateCurrentContext(
                            notebookId,
                            'debug' as AgentType,
                            {
                                interaction_status: 'completed',
                                debug_completion_time: new Date().toISOString(),
                                fix_applied: true
                            }
                        );
                        
                        // 记录成功的debug交互
                        AgentMemoryService.recordOperationInteraction(
                            notebookId,
                            'debug' as AgentType,
                            'debug_completed',
                            true,
                            {
                                completion_time: new Date().toISOString(),
                                fix_applied: true,
                                code_executed: true,
                                interaction_type: 'debug_session'
                            }
                        );
                    }
                }
            } catch (error) {
                console.error('记录debug完成时出错:', error);
            }
            break;
        }

        case 'setCurrentCellMode_onlyCode': {
            console.log('设置当前cell模式为只有代码:', data);
            await globalUpdateInterface.setCurrentCellMode_onlyCode();
            break;
        }

        case 'setCurrentCellMode_onlyOutput': {
            console.log('设置当前cell模式为只有输出:', data);
            await globalUpdateInterface.setCurrentCellMode_onlyOutput();
            
            // 记录代码生成完成
            try {
                const notebookState = (window as any).__notebookStore?.getState?.();
                const notebookId = notebookState?.notebookId;
                const commandId = data.data?.payload?.commandId;
                
                if (notebookId && commandId) {
                    console.log('记录代码生成完成 - commandId:', commandId);
                    
                    // 记录成功的代码生成交互
                    AgentMemoryService.recordOperationInteraction(
                        notebookId,
                        'command' as AgentType,
                        'user_command',
                        true,
                        {
                            command_id: commandId,
                            completion_time: new Date().toISOString(),
                            status: 'code_generated_and_executed'
                        }
                    );
                }
            } catch (error) {
                console.error('记录代码生成交互时出错:', error);
            }
            break;
        }

        case 'setCurrentCellMode_complete': {
            console.log('设置当前cell模式为完整:', data);
            await globalUpdateInterface.setCurrentCellMode_complete();
            break;
        }

        case 'initStreamingAnswer': {
            console.log('初始化流式响应:', data);
            const qid = data.data?.payload?.QId || data.payload?.QId;
            if (qid !== undefined && qid !== null) {
                const qidStr = Array.isArray(qid) ? qid[0] : qid.toString();
                await globalUpdateInterface.initStreamingAnswer(qidStr);
                
                // 记录QA交互开始
                try {
                    const notebookState = (window as any).__notebookStore?.getState?.();
                    const notebookId = notebookState?.notebookId;
                    
                    if (notebookId) {
                        console.log('记录QA交互开始 - qid:', qidStr);
                        
                        // 更新用户意图和当前上下文
                        AgentMemoryService.updateCurrentContext(
                            notebookId,
                            'general' as AgentType,
                            {
                                current_qa_id: qidStr,
                                interaction_start_time: new Date().toISOString(),
                                interaction_status: 'in_progress'
                            }
                        );
                    }
                } catch (error) {
                    console.error('记录QA开始时出错:', error);
                }
            } else {
                console.error('Missing QId in stream data:', data);
            }
            break;
        }

        case 'addContentToAnswer': {
            console.log('添加内容到流式响应:', data);
            const contentQid = data.data?.payload?.QId || data.payload?.QId;
            const content = data.data?.payload?.content || data.payload?.content;
            if (contentQid !== undefined && contentQid !== null && content) {
                const qidStr = Array.isArray(contentQid) ? contentQid[0] : contentQid.toString();
                await globalUpdateInterface.addContentToAnswer(qidStr, content.toString());
            } else {
                console.error('Missing QId or content in stream data:', data);
            }
            break;
        }

        case 'finishStreamingAnswer': {
            console.log('结束流式响应:', data);
            const finishQid = data.data?.payload?.QId || data.payload?.QId;
            if (finishQid !== undefined && finishQid !== null) {
                const qidStr = Array.isArray(finishQid) ? finishQid[0] : finishQid.toString();
                await globalUpdateInterface.finishStreamingAnswer(qidStr);
                
                // 记录Agent交互完成
                try {
                    const response = data.data?.payload?.response || '';
                    if (response) {
                        // 从全局状态获取notebook信息进行记录
                        const notebookState = (window as any).__notebookStore?.getState?.();
                        const notebookId = notebookState?.notebookId;
                        
                        if (notebookId) {
                            console.log('记录QA交互完成 - notebookId:', notebookId, '响应长度:', response.length);
                            
                            // 更新当前上下文状态
                            AgentMemoryService.updateCurrentContext(
                                notebookId,
                                'general' as AgentType,
                                {
                                    current_qa_id: qidStr,
                                    interaction_status: 'completed',
                                    completion_time: new Date().toISOString(),
                                    response_quality: response.length > 100 ? 'detailed' : 'brief'
                                }
                            );
                            
                            // 记录成功的问答交互
                            AgentMemoryService.recordOperationInteraction(
                                notebookId,
                                'general' as AgentType,
                                'qa_completed',
                                true, // 暂时标记为成功，后续可根据用户反馈调整
                                {
                                    question_id: qidStr,
                                    response_length: response.length,
                                    completion_time: new Date().toISOString(),
                                    response_preview: response.substring(0, 200), // 保存响应预览
                                    interaction_type: 'qa_session'
                                }
                            );
                            
                            // 根据响应质量学习成功模式
                            if (response.length > 200) {
                                AgentMemoryService.learnFromSuccess(
                                    notebookId,
                                    'general' as AgentType,
                                    'detailed_response',
                                    `生成了${response.length}字符的详细回答`
                                );
                            }
                        }
                    }
                } catch (error) {
                    console.error('记录QA交互时出错:', error);
                }
            } else {
                console.error('Missing QId in stream data:', data);
            }
            break;
        }

        case 'addNewContent2CurrentCellDescription': {
            console.log('添加新的chunk到当前的cell的描述');
            const content = data.data?.payload?.content;
            if (content) {
                await globalUpdateInterface.addNewContent2CurrentCellDescription(content);
            }
            break;
        }

        case 'convertCurrentCodeCellToHybridCell': {
            console.log('将当前代码cell转换为混合cell:', data);
            await globalUpdateInterface.convertCurrentCodeCellToHybridCell();
            break;
        }

        case 'updateCurrentCellWithContent': {
            console.log('更新当前cell的内容:', data);
            const content = data.data?.payload?.content;
            const cellId = data.data?.payload?.cellId;
            const commandId = data.data?.payload?.commandId;
            const uniqueIdentifier = data.data?.payload?.uniqueIdentifier;
            
            console.log('updateCurrentCellWithContent - cellId:', cellId, 'commandId:', commandId, 'uniqueIdentifier:', uniqueIdentifier, 'content length:', content?.length);
            
            if (content) {
                let targetCellId = cellId; // 如果直接提供了cellId，优先使用
                
                // 尝试使用uniqueIdentifier直接更新（最高优先级）
                if (!targetCellId && uniqueIdentifier) {
                    const success = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, { content });
                    if (success) {
                        console.log('✅ 通过uniqueIdentifier成功更新cell内容:', uniqueIdentifier);
                        break;
                    }
                }
                
                if (!targetCellId && commandId && generationCellTracker.has(commandId)) {
                    // 使用commandId从映射表获取cellId
                    targetCellId = generationCellTracker.get(commandId);
                    console.log('从映射表获取cellId用于内容更新:', commandId, '->', targetCellId);
                }
                
                if (targetCellId) {
                    // 直接更新指定的cell
                    console.log('更新指定cell的内容:', targetCellId, 'content preview:', content.substring(0, 100));
                    await globalUpdateInterface.updateCell(targetCellId, content);
                    console.log('✅ 指定cell内容更新完成');
                } else {
                    // 回退到原有逻辑
                    const lastAddedCellId = globalUpdateInterface.getAddedLastCellID();
                    console.log('回退逻辑 - lastAddedCellId:', lastAddedCellId);
                    
                    if (lastAddedCellId) {
                        // Check if the last added cell has generation metadata (likely a generation cell)
                        const cells = useStore.getState().cells;
                        const targetCell = cells.find(cell => cell.id === lastAddedCellId);
                        console.log('找到的targetCell:', targetCell?.id, 'isGenerating:', targetCell?.metadata?.isGenerating);
                        
                        if (targetCell && targetCell.metadata?.isGenerating) {
                            console.log('更新最后添加的生成cell内容:', lastAddedCellId);
                            await globalUpdateInterface.updateCell(lastAddedCellId, content);
                            console.log('✅ 生成cell内容更新完成');
                        } else {
                            // Fall back to updating the current cell
                            console.log('回退到更新当前cell');
                            await globalUpdateInterface.updateCurrentCellWithContent(content);
                            console.log('✅ 当前cell内容更新完成');
                        }
                    } else {
                        // Fall back to updating the current cell (existing behavior)
                        console.log('使用原有逻辑更新当前cell');
                        await globalUpdateInterface.updateCurrentCellWithContent(content);
                        console.log('✅ 原有逻辑更新完成');
                    }
                }
            } else {
                console.error('❌ updateCurrentCellWithContent - 没有content数据');
            }
            break;
        }

        case 'updateCurrentCellMetadata': {
            console.log('更新当前cell metadata:', data);
            const metadata = data.data?.payload?.metadata;
            const commandId = data.data?.payload?.commandId;
            const cellId = data.data?.payload?.cellId; 
            const uniqueIdentifier = data.data?.payload?.uniqueIdentifier;
            
            console.log('updateCurrentCellMetadata - metadata:', metadata);
            console.log('updateCurrentCellMetadata - commandId:', commandId);
            console.log('updateCurrentCellMetadata - cellId:', cellId);
            console.log('updateCurrentCellMetadata - uniqueIdentifier:', uniqueIdentifier);
            
            if (metadata) {
                let targetCellId = cellId; // 如果直接提供了cellId，优先使用
                
                // 尝试使用uniqueIdentifier直接更新（最高优先级）
                if (!targetCellId && uniqueIdentifier) {
                    const success = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, { metadata });
                    if (success) {
                        console.log('✅ 通过uniqueIdentifier成功更新cell metadata:', uniqueIdentifier);
                        
                        // 如果生成完成，清理相关映射
                        if (metadata.isGenerating === false || metadata.generationCompleted) {
                            if (commandId) generationCellTracker.delete(commandId);
                            generationCellTracker.delete(`unique-${uniqueIdentifier}`);
                            console.log('清理完成的生成任务映射:', { commandId, uniqueIdentifier });
                        }
                        break;
                    }
                }
                
                // 首先尝试使用 commandId 从映射表中获取 cellId
                if (!targetCellId && commandId && generationCellTracker.has(commandId)) {
                    targetCellId = generationCellTracker.get(commandId);
                    console.log('从映射表获取cellId:', commandId, '->', targetCellId);
                    
                    // 如果生成完成，清理映射表
                    if (metadata.isGenerating === false || metadata.generationCompleted) {
                        generationCellTracker.delete(commandId);
                        console.log('清理完成的生成任务映射:', commandId);
                    }
                } else if (!targetCellId) {
                    // 回退方案：尝试使用 lastAddedCellId
                    targetCellId = globalUpdateInterface.getAddedLastCellID();
                    console.log('使用lastAddedCellId作为fallback:', targetCellId);
                }
                
                if (targetCellId) {
                    console.log('🔄 正在更新cell metadata, cellId:', targetCellId, 'metadata:', metadata);
                    // Use the proper updateCellMetadata method
                    useStore.getState().updateCellMetadata(targetCellId, metadata);
                    console.log('✅ metadata更新完成');
                    
                    // 额外验证：检查更新后的状态
                    const updatedCells = useStore.getState().cells;
                    const updatedCell = updatedCells.find(c => c.id === targetCellId);
                    console.log('📋 验证更新后的cell:', { 
                        id: updatedCell?.id, 
                        contentLength: updatedCell?.content?.length,
                        metadata: updatedCell?.metadata 
                    });
                } else {
                    console.error('❌ 无法确定目标cellId，尝试使用当前选中的cell');
                    // 最后的回退方案：使用当前选中的cell
                    const currentSelectedCellId = useStore.getState().currentCellId;
                    if (currentSelectedCellId) {
                        console.log('使用当前选中的cell作为最后fallback:', currentSelectedCellId);
                        useStore.getState().updateCellMetadata(currentSelectedCellId, metadata);
                    } else {
                        console.error('❌ 完全无法确定目标cell，metadata更新失败');
                    }
                }
            } else {
                console.error('❌ updateCurrentCellMetadata - 没有metadata数据');
            }
            break;
        }

        case 'addNewPhase2Next': {
            console.log('添加新的phase到下一个:', data);
            const description = data.data?.payload?.description;
            const content = data.data?.payload?.content;
            
            if (description) {
                await globalUpdateInterface.addNewCell2Next('markdown', description);
            }
            if (content) {
                await globalUpdateInterface.addNewContent2CurrentCell(content);
            }
            break;
        }

        case 'update_notebook_title': {
            const title = data.payload?.title;
            if (title) {
                // 更新notebook标题
                console.log('更新notebook标题:', title);
                useStore.getState().updateTitle(title);
                await showToast({
                    message: `标题已更新: ${title}`,
                    type: "success"
                });
            }
            break;
        }

        case 'get_variable': {
            const variableName = data.payload?.variable_name;
            const defaultValue = data.payload?.default_value;
            console.log('获取变量:', variableName, '默认值:', defaultValue);
            // 这里可以添加获取变量的逻辑
            break;
        }

        case 'set_variable': {
            const variableName = data.payload?.variable_name;
            const variableValue = data.payload?.variable_value;
            const variableType = data.payload?.variable_type;
            console.log('设置变量:', variableName, '=', variableValue, '类型:', variableType);
            // 这里可以添加设置变量的逻辑
            break;
        }

        case 'remember_information': {
            const rememberType = data.payload?.type;
            const content = data.payload?.content;
            console.log('记忆信息:', rememberType, content);
            // 这里可以添加记忆信息的逻辑
            break;
        }

        case 'update_todo': {
            const action = data.payload?.action;
            const event = data.payload?.event;
            const content = data.payload?.content;
            console.log('更新TODO:', action, event, content);
            // 这里可以添加TODO管理的逻辑
            break;
        }

        case 'communicate_with_agent': {
            const targetAgent = data.payload?.target_agent;
            const message = data.payload?.message;
            console.log('与Agent通信:', targetAgent, message);
            // 这里可以添加Agent间通信的逻辑
            break;
        }

        case 'ask_agent_for_help': {
            const targetAgent = data.payload?.target_agent;
            const helpRequest = data.payload?.help_request;
            console.log('请求Agent帮助:', targetAgent, helpRequest);
            // 这里可以添加Agent帮助请求的逻辑
            break;
        }

        default: {
            console.log(data);
            console.warn('未处理的流式响应类型:', data.type);
            break;
        }
    }
};