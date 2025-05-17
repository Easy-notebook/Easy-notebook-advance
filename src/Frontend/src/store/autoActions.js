import useOperatorStore from './operatorStore'; // 导入operatorStore
import useStore from './notebookStore'; // 引入 notebookStore，用来更新对应 cell 的 outputs
import useCodeStore from './codeStore';

export const sendCurrentCellExecuteCodeResult = () => {
    
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
    
    const operation = {
        type: 'code_output',
        payload: {
            executeResult: executeResult,
            executeCode: currentCell.content,
            cellId: currentCell.id,
            description: currentCell.description
        }
    };
    useOperatorStore.getState().sendOperation(useStore.getState().notebookId, operation);
}

export const sendCurrentCellExecuteCodeError_should_debug = () => {
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

    const operation = {
        type: 'code_error_should_debug',
        payload: {
            error: currentCell.outputs,
            executeCode: currentCell.content,
            HistoryCode: historyCode,
            cellId: currentCell.id,
            description: currentCell.description?currentCell.description:''
        }
    };
    useOperatorStore.getState().sendOperation(useStore.getState().notebookId, operation);
}