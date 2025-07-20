// src/store/autoActions.ts
import useOperatorStore from './operatorStore';
import useStore from './notebookStore';
import useCodeStore from './codeStore';

/**
 * 操作类型定义
 */
export interface Operation {
    type: string;
    payload: Record<string, any>;
}

/**
 * 代码输出操作载荷接口
 */
export interface CodeOutputPayload {
    executeResult: any[];
    executeCode: string;
    cellId: string;
    description?: string;
}

/**
 * 代码错误调试操作载荷接口
 */
export interface CodeErrorPayload {
    error: any[];
    executeCode: string;
    HistoryCode: string;
    cellId: string;
    description: string;
}

/**
 * 发送当前单元格执行代码结果
 */
export const sendCurrentCellExecuteCodeResult = (): void => {
    const currentCell = useStore.getState().getCurrentCell();
    if (!currentCell) {
        console.warn('No current cell found, cannot send execute code result.');
        return;
    }

    if (currentCell.type !== 'code') {
        console.warn('Current cell is not a code cell, cannot send execute code result.');
        return;
    }
    
    const executeResult = currentCell.outputs;

    if (!executeResult) {
        console.warn('No execute result found, cannot send execute code result.');
        useCodeStore.getState().executeCell(currentCell.id);
        return;
    }
    
    const operation: Operation = {
        type: 'code_output',
        payload: {
            executeResult: executeResult,
            executeCode: currentCell.content,
            cellId: currentCell.id,
            description: currentCell.description
        } as CodeOutputPayload
    };
    
    useOperatorStore.getState().sendOperation(useStore.getState().notebookId, operation);
}

/**
 * 发送当前单元格执行代码错误(需要调试)
 */
export const sendCurrentCellExecuteCodeError_should_debug = (): void => {
    const currentCell = useStore.getState().getCurrentCell();
    const historyCode = useStore.getState().getHistoryCode();
    
    if (!currentCell) {
        console.warn('No current cell found, cannot send execute code error.');
        return;
    }

    if (currentCell.type !== 'code') {
        console.warn('Current cell is not a code cell, cannot send execute code error.');
        return;
    }

    const operation: Operation = {
        type: 'code_error_should_debug',
        payload: {
            error: currentCell.outputs,
            executeCode: currentCell.content,
            HistoryCode: historyCode,
            cellId: currentCell.id,
            description: currentCell.description ? currentCell.description : ''
        } as CodeErrorPayload
    };
    
    useOperatorStore.getState().sendOperation(useStore.getState().notebookId, operation);
}