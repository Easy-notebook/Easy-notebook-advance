// services/streamHandler.ts
import globalUpdateInterface from '../interfaces/globalUpdateInterface';

// Type definitions for stream data structures
export interface ToastMessage {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
}

export interface StreamPayload {
    mode?: 'complete' | 'step';
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
            }
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
            console.log('添加新的cell:', data);
            const cellType = data.data?.payload?.type;
            const description = data.data?.payload?.description;
            const content = data.data?.payload?.content;
            
            if (cellType && description) {
                await globalUpdateInterface.addNewCell2End(cellType, description);
            }
            if (content) {
                await globalUpdateInterface.addNewContent2CurrentCell(content);
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
                await globalUpdateInterface.initStreamingAnswer(qid.toString());
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
                await globalUpdateInterface.addContentToAnswer(contentQid.toString(), content.toString());
            } else {
                console.error('Missing QId or content in stream data:', data);
            }
            break;
        }

        case 'finishStreamingAnswer': {
            console.log('结束流式响应:', data);
            const finishQid = data.data?.payload?.QId || data.payload?.QId;
            if (finishQid !== undefined && finishQid !== null) {
                await globalUpdateInterface.finishStreamingAnswer(finishQid.toString());
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
            if (content) {
                await globalUpdateInterface.updateCurrentCellWithContent(content);
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

        default: {
            console.log(data);
            console.warn('未处理的流式响应类型:', data.type);
            break;
        }
    }
};