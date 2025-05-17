// services/streamHandler.js
import globalUpdateInterface from '../interfaces/globalUpdateInterface';

export const handleStreamResponse = async (data, showToast) => {
    switch (data.type) {
        case 'update_view_mode': {
            await globalUpdateInterface.setViewMode(data.payload.mode);
            await showToast({
                message: `切换到 ${data.payload.mode === 'complete' ? 'Complete' : 'Step'} Mode 成功`,
                type: "success"
            });
            break;
        }

        case 'update_current_phase': {
            await globalUpdateInterface.setCurrentPhase(data.payload.phaseId);
            await globalUpdateInterface.setCurrentStepIndex(0);
            await showToast({
                message: "当前阶段已更新",
                type: "success"
            });
            break;
        }

        case 'update_current_step_index': {
            await globalUpdateInterface.setCurrentStepIndex(data.payload.index);
            await showToast({
                message: "当前步骤已更新",
                type: "success"
            });
            break;
        }

        case 'update_allow_pagination': {
            await globalUpdateInterface.setAllowPagination(data.payload.allow);
            await showToast({
                message: `翻页权限已 ${data.payload.allow ? '启用' : '禁用'}`,
                type: "success"
            });
            break;
        }

        case 'update_cell': {
            if (data.payload.content) {
                await globalUpdateInterface.updateCell(data.payload.cellId, data.payload.content);
            }
            if (data.payload.outputs) {
                await globalUpdateInterface.updateCellOutputs(data.payload.cellId, data.payload.outputs);
            }
            break;
        }

        case 'add_cell': {
            await globalUpdateInterface.addCell(data.payload.cell, data.payload.index);
            break;
        }

        case 'delete_cell': {
            await globalUpdateInterface.deleteCell(data.payload.cellId);
            break;
        }

        case 'set_error': {
            await globalUpdateInterface.setError(data.payload.error);
            break;
        }

        case 'clear_cells': {
            await globalUpdateInterface.clearCells();
            break;
        }

        case 'clear_outputs': {
            if (data.payload.cellId) {
                await globalUpdateInterface.clearCellOutputs(data.payload.cellId);
            } else {
                await globalUpdateInterface.clearAllOutputs();
            }
            break;
        }

        case 'set_current_cell': {
            await globalUpdateInterface.setCurrentCell(data.payload.cellId);
            break;
        }

        case 'set_running_phase': {
            await globalUpdateInterface.setCurrentRunningPhaseId(data.payload.phaseId);
            break;
        }

        case 'ok': {
            console.log('操作成功:', data);
            break;
        }

        case 'addCell2EndWithContent': {
            console.log('添加新的cell:', data);
            await globalUpdateInterface.addNewCell2End(data.data.payload.type, data.data.payload.description);
            await globalUpdateInterface.addNewContent2CurrentCell(data.data.payload.content);
            break;
        }

        case 'addNewContent2CurrentCell': {
            console.log('添加新的chunk到当前的cell');
            await globalUpdateInterface.addNewContent2CurrentCell(data.data.payload.content);
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
            if (!qid) {
                console.error('Missing QId in stream data:', data);
                return;
            }
            await globalUpdateInterface.initStreamingAnswer(qid.toString());
            break;
        }

        case 'addContentToAnswer': {
            console.log('添加内容到流式响应:', data);
            const contentQid = data.data?.payload?.QId || data.payload?.QId;
            const content = data.data?.payload?.content || data.payload?.content;
            if (!contentQid || !content) {
                console.error('Missing QId or content in stream data:', data);
                return;
            }
            await globalUpdateInterface.addContentToAnswer(contentQid.toString(), content.toString());
            break;
        }

        case 'finishStreamingAnswer': {
            console.log('结束流式响应:', data);
            const finishQid = data.data?.payload?.QId || data.payload?.QId;
            if (!finishQid) {
                console.error('Missing QId in stream data:', data);
                return;
            }
            await globalUpdateInterface.finishStreamingAnswer(finishQid.toString());
            break;
        }

        case 'addNewContent2CurrentCellDescription': {
            console.log('添加新的chunk到当前的cell的描述');
            await globalUpdateInterface.addNewContent2CurrentCellDescription(data.data.payload.content);
            break;
        }

        case 'convertCurrentCodeCellToHybridCell': {
            console.log('将当前代码cell转换为混合cell:', data);
            await globalUpdateInterface.convertCurrentCodeCellToHybridCell();
            break;
        }

        case 'updateCurrentCellWithContent': {
            console.log('更新当前cell的内容:', data);
            await globalUpdateInterface.updateCurrentCellWithContent(data.data.payload.content);
            break;
        }

        case 'addNewPhase2Next': {
            console.log('添加新的phase到下一个:', data);
            await globalUpdateInterface.addNewCell2Next('markdown', data.data.payload.description);
            await globalUpdateInterface.addNewContent2CurrentCell(data.data.payload.content);
            break;
        }

        default: {
            console.log(data);
            console.warn('未处理的流式响应类型:', data.type);
            break;
        }
    }
};
