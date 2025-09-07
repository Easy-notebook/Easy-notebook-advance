// services/streamHandler.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import globalUpdateInterface from '../interfaces/globalUpdateInterface';
import { EVENT_TYPES } from '../store/AIAgentStore';
import { AgentMemoryService, AgentType } from './agentMemoryService';
import useStore from '../store/notebookStore';
import { agentLog, networkLog, uiLog } from '../utils/logger';
import { getActivityFromOperation, getWorkflowStageDescription } from '../utils/activityDetector';

/** -------------------------
 * Utilities: payload + guards
 * ------------------------- */
type LooseObj = Record<string, any>;

const generationCellTracker = new Map<string, string>(); // commandId / unique-<id> -> cellId
let lastStreamingQaId: string | null = null;
const activeVideoPolls = new Map<string, NodeJS.Timeout>();

/** 统一取 payload（兼容 data.payload、data.data?.payload、以及把 data.data 当 payload 的后端） */
function getPayload(data: LooseObj): LooseObj {
  return (data?.data?.payload ?? data?.payload ?? data?.data ?? {}) as LooseObj;
}

/** 取字符串（自动转字符串） */
function toStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  return Array.isArray(v) ? String(v[0]) : String(v);
}

/** 安全读取：优先从 payload 拿，失败回退顶层 */
function gp<T = any>(data: LooseObj, key: string): T | undefined {
  const p = getPayload(data);
  return (p?.[key] ?? data?.[key]) as T | undefined;
}
function gps(data: LooseObj, key: string): string | undefined {
  const v = gp<any>(data, key);
  return v === undefined ? undefined : toStr(v);
}

/** 轻量 once-per-tick 去抖：避免同类型/同 key 的重复处理被 Store 合并导致“看起来第二个没执行” */
const seenThisTick = new Set<string>();
function onceKey(type: string, extras: (string | undefined)[]) {
  return [type, ...extras.filter(Boolean)].join('|');
}
async function withOncePerTick<T>(key: string, fn: () => Promise<T>): Promise<T | undefined> {
  if (seenThisTick.has(key)) {
    // 已经在同一 tick 内处理过相同 key，跳过
    return undefined;
  }
  seenThisTick.add(key);
  try {
    return await fn();
  } finally {
    // 下一轮事件循环清除，允许后续同类型再次执行
    queueMicrotask(() => seenThisTick.delete(key));
  }
}

/** 生成去重/追踪用的 actionKey */
function makeActionKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 统一的类型规范化 */
const normalizeCellTypeForStore = (
  t: string | undefined | null
): 'code' | 'markdown' | 'hybrid' | 'image' | 'link' => {
  if (!t) return 'markdown';
  if (t === 'Hybrid') return 'hybrid';
  if (t === 'image' || t === 'video') return 'image';
  if (t === 'thinking') return 'markdown';
  if (t === 'link') return 'link';
  return (['code', 'markdown', 'hybrid', 'image', 'link'] as const).includes(t as any)
    ? (t as any)
    : 'markdown';
};

/** -------------------------
 * Video polling (kept logic)
 * ------------------------- */
const startVideoGenerationPolling = async (
  taskId: string,
  uniqueIdentifier: string,
  commandId?: string
) => {
  if (activeVideoPolls.has(taskId)) clearInterval(activeVideoPolls.get(taskId)!);

  let attempts = 0;
  const maxAttempts = 60;

  const pollInterval = setInterval(async () => {
    try {
      attempts++;
      const notebookState = useStore.getState();
      const notebookId = notebookState.notebookId;
      if (!notebookId) {
        networkLog.error('Unable to get notebookId - stopping poll', { taskId });
        clearInterval(pollInterval);
        activeVideoPolls.delete(taskId);
        return;
      }
      const { default: useOperatorStore } = await import('../store/operatorStore');
      const statusCommand = {
        type: 'check_video_generation_status',
        payload: { taskId, uniqueIdentifier, commandId },
      };
      useOperatorStore.getState().sendOperation(notebookId, statusCommand);

      if (attempts >= maxAttempts) {
        networkLog.warn('Video generation poll timeout', { taskId, attempts });
        clearInterval(pollInterval);
        activeVideoPolls.delete(taskId);
        const ok = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, {
          metadata: {
            isGenerating: false,
            generationError: 'Generation timeout',
            generationStatus: 'timeout',
          },
        });
        if (ok) agentLog.info('Video generation timeout status updated', { taskId });
      }
    } catch (error) {
      networkLog.error('Video generation status poll error', { taskId, error });
      clearInterval(pollInterval);
      activeVideoPolls.delete(taskId);
    }
  }, 10000);

  activeVideoPolls.set(taskId, pollInterval);
  networkLog.info('Video generation status polling started', { taskId, uniqueIdentifier });
};

/** -------------------------
 * Public handler
 * ------------------------- */
export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
export type ShowToastFunction = (toast: ToastMessage) => Promise<void>;

export interface StreamPayload extends LooseObj {}
export interface StreamData {
  type: string;
  payload?: StreamPayload;
  data?: { payload?: StreamPayload } & LooseObj;
}

export const handleStreamResponse = async (
  data: StreamData,
  showToast: ShowToastFunction
): Promise<void> => {
  const type = data?.type;
  const payload = getPayload(data);

  // 生成一个“本事件唯一 key”，尽量用稳定字段；没有则只用 type
  const ek = onceKey(type, [
    payload?.commandId ? String(payload.commandId) : undefined,
    payload?.uniqueIdentifier ? String(payload.uniqueIdentifier) : undefined,
    payload?.QId !== undefined ? toStr(payload.QId) : undefined,
  ]);

  // 使用去抖，避免“同类型相邻事件”在 Store 合并策略下看起来有一个没执行
  await withOncePerTick(ek, async () => {
    switch (type) {
      case 'update_view_mode': {
        const mode = payload?.mode;
        if (mode) {
          await globalUpdateInterface.setViewMode(mode);
          await showToast({
            message: `切换到 ${mode === 'create' ? 'Create' : 'Step'} Mode 成功`,
            type: 'success',
          });
        }
        break;
      }

      case 'update_current_phase': {
        const rawPhaseId = gps(data, 'phaseId');
        const phaseName = gps(data, 'phaseName');
        if (rawPhaseId || phaseName) {
          const requested = rawPhaseId || phaseName!;
          const state = useStore.getState();
          const allPhases = (state.tasks || []).flatMap((t: any) => t.phases || []);
          const matched =
            allPhases.find((p: any) => p.id === requested) ||
            allPhases.find((p: any) => p.title === requested || p.title === phaseName);
          const resolvedId = matched?.id || requested;

          agentLog.debug('[update_current_phase]', {
            requested,
            phaseName,
            resolvedId,
            phases: allPhases.map((p: any) => ({ id: p.id, title: p.title })),
          });

          await globalUpdateInterface.setCurrentPhase(resolvedId);
          await globalUpdateInterface.setCurrentStepIndex(0);
          await showToast({
            message: `当前阶段已更新: ${matched?.title || resolvedId}`,
            type: 'success',
          });
        }
        break;
      }

      case 'update_current_step_index': {
        const index = gp<number>(data, 'index');
        if (typeof index === 'number') {
          await globalUpdateInterface.setCurrentStepIndex(index);
          await showToast({ message: '当前步骤已更新', type: 'success' });
        }
        break;
      }

      case 'update_allow_pagination': {
        const allow = gp<boolean>(data, 'allow');
        if (typeof allow === 'boolean') {
          await globalUpdateInterface.setAllowPagination(allow);
          await showToast({ message: `翻页权限已 ${allow ? '启用' : '禁用'}`, type: 'success' });
        }
        break;
      }

      case 'update_cell': {
        const cellId = gps(data, 'cellId');
        const content = gp<string>(data, 'content');
        const outputs = gp<any[]>(data, 'outputs');
        if (cellId) {
          if (typeof content === 'string') await globalUpdateInterface.updateCell(cellId, content);
          if (outputs) await globalUpdateInterface.updateCellOutputs(cellId, outputs);
        }
        break;
      }

      case 'add_cell': {
        const cell = gp<any>(data, 'cell');
        const index = gp<number>(data, 'index');
        if (cell) await globalUpdateInterface.addCell(cell, index);
        break;
      }

      case 'delete_cell': {
        const cellId = gps(data, 'cellId');
        if (cellId) await globalUpdateInterface.deleteCell(cellId);
        break;
      }

      case 'set_error': {
        const error = gp<string>(data, 'error');
        if (error) {
          await globalUpdateInterface.setError(error);
          try {
            const notebookState = (window as any).__notebookStore?.getState?.();
            const notebookId = notebookState?.notebookId;
            if (notebookId) {
              let agentType: AgentType = 'general';
              const e = error.toLowerCase();
              if (e.includes('command') || e.includes('code generation')) agentType = 'command';
              else if (e.includes('debug') || e.includes('修复')) agentType = 'debug';
              else if (e.includes('output') || e.includes('分析')) agentType = 'output';

              AgentMemoryService.recordOperationInteraction(notebookId, agentType, 'error', false, {
                error_message: error,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (recordError) {
            agentLog.error('Failed to record error interaction', { error: recordError });
          }
        }
        break;
      }

      case 'error': {
        const errorMsg = gp<string>(data, 'error') || (data as any)?.error || 'Unknown error';
        const commandId = gps(data, 'commandId');
        const uniqueIdentifier = gps(data, 'uniqueIdentifier');
        agentLog.error('Received error event', { errorMsg, commandId, uniqueIdentifier });

        let updated = false;
        if (uniqueIdentifier) {
          updated = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, {
            metadata: { isGenerating: false, generationError: errorMsg, generationStatus: 'failed' },
          });
        }
        if (!updated && commandId && generationCellTracker.has(commandId)) {
          const targetId = generationCellTracker.get(commandId)!;
          useStore.getState().updateCellMetadata(targetId, {
            isGenerating: false,
            generationError: errorMsg,
            generationStatus: 'failed',
          });
        }
        await showToast({ message: `Error: ${errorMsg}`, type: 'error' });
        break;
      }

      case 'clear_cells': {
        await globalUpdateInterface.clearCells();
        break;
      }

      case 'clear_outputs': {
        const cellId = gps(data, 'cellId');
        if (cellId) await globalUpdateInterface.clearCellOutputs(cellId);
        else await globalUpdateInterface.clearAllOutputs();
        break;
      }

      case 'set_current_cell': {
        const cellId = gps(data, 'cellId');
        if (cellId) await globalUpdateInterface.setCurrentCell(cellId);
        break;
      }

      case 'set_running_phase': {
        const phaseId = gps(data, 'phaseId');
        if (phaseId) await globalUpdateInterface.setCurrentRunningPhaseId(phaseId);
        break;
      }

      case 'ok': {
        agentLog.info('Operation successful', { data });
        const messageMaybe = gp<string>(data, 'message');
        const maybePath = gp<string>(data, 'path');
        if ((messageMaybe && messageMaybe.includes('webpage generated')) || (maybePath && maybePath.includes('.sandbox'))) {
          try {
            window.dispatchEvent(new CustomEvent('refreshFileList'));
            uiLog.info('Triggered file list refresh for webpage generation');
          } catch (e) {
            uiLog.warn('Failed to trigger file list refresh', { error: e });
          }
        }
        break;
      }

      case 'addCell2EndWithContent': {
        const cellType = gps(data, 'type');
        const description = gps(data, 'description');
        const content = gp<string>(data, 'content');
        const metadata = gp<any>(data, 'metadata') || {};
        const commandId = gps(data, 'commandId');
        const prompt = gps(data, 'prompt');
        const serverUniqueIdentifier = gps(data, 'uniqueIdentifier') || metadata?.uniqueIdentifier;

        let newCellId: string | null = null;
        if (cellType && description) {
          const enableEdit = !metadata?.isGenerating;
          if ((cellType === 'image' || cellType === 'video') && metadata?.isGenerating && (prompt || serverUniqueIdentifier)) {
            const uniqueIdentifier =
              serverUniqueIdentifier ||
              `gen-${Date.now()}-${(prompt || '').substring(0, 20).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
            const normalizedType = normalizeCellTypeForStore(cellType);
            newCellId = useStore.getState().addNewCellWithUniqueIdentifier(
              normalizedType,
              description,
              enableEdit,
              uniqueIdentifier!,
              prompt
            );
            if (commandId) {
              generationCellTracker.set(commandId, newCellId);
              generationCellTracker.set(`unique-${uniqueIdentifier}`, newCellId);
            }
          } else {
            const normalizedType2 = normalizeCellTypeForStore(cellType);
            try {
              newCellId = await globalUpdateInterface.addNewCell2End(normalizedType2, description, enableEdit);
            } catch (e) {
              console.error('Error creating cell:', e);
            }
            if (newCellId && commandId && metadata?.isGenerating) {
              generationCellTracker.set(commandId, newCellId);
            }
          }
        }

        if (typeof content === 'string' && newCellId) {
          const target = useStore.getState().cells.find((c) => c.id === newCellId);
          const appended = `${target?.content || ''}${content}`;
          useStore.getState().updateCell(newCellId, appended);
        } else if (typeof content === 'string' && !newCellId) {
          try {
            const lastId = globalUpdateInterface.getAddedLastCellID();
            const state = useStore.getState();
            const targetId = lastId || state.currentCellId;
            if (targetId) {
              const target = state.cells.find((c) => c.id === targetId);
              const appended = `${target?.content || ''}${content}`;
              state.updateCell(targetId, appended);
            } else {
              const createdId = await globalUpdateInterface.addNewCell2End('markdown', payload?.description || 'Text');
              await globalUpdateInterface.updateCell(createdId, content);
            }
          } catch (e) {
            console.error('Fallback failed to handle content:', e);
          }
        }

        if (metadata && newCellId) {
          try {
            useStore.getState().updateCellMetadata(newCellId, metadata);
          } catch (e) {
            console.error('Error updating metadata:', e);
          }
        }
        break;
      }

      case 'addNewContent2CurrentCell': {
        const content = gp<string>(data, 'content');
        if (typeof content === 'string') {
          const state = useStore.getState();
          if (!state.currentCellId) {
            const streamingCandidate = [...state.cells].reverse().find((c) => (c.metadata as any)?.isStreaming === true);
            if (streamingCandidate) {
              state.setCurrentCell(streamingCandidate.id);
              state.setEditingCellId(streamingCandidate.id);
            }
          }
          const currentCell = state.cells.find((c) => c.id === state.currentCellId);
          const isFirstChunk = !currentCell || String(currentCell?.content ?? '').trim() === '';
          if (isFirstChunk) {
            const { useAIAgentStore } = await import('../store/AIAgentStore');
            useAIAgentStore.getState().addAction({
              type: EVENT_TYPES.AI_GENERATING_TEXT,
              content: 'Generating content for cell',
              result: '',
              relatedQAIds: [],
              cellId: state.currentCellId,
              viewMode: state.viewMode,
              onProcess: true,
              agentName: 'Content Generator',
              agentType: 'text_creator',
              taskDescription: `Streaming content to cell`,
              progressPercent: 0,
              metadata: { actionKey: makeActionKey('gen-txt') },
            });
          }
          await globalUpdateInterface.addNewContent2CurrentCell(content);
        }
        break;
      }

      case 'runCurrentCodeCell': {
        const { useAIAgentStore } = await import('../store/AIAgentStore');
        const actionKey = makeActionKey('run-code');
        useAIAgentStore.getState().addAction({
          type: EVENT_TYPES.AI_RUNNING_CODE,
          content: 'Executing code cell',
          result: '',
          relatedQAIds: [],
          cellId: useStore.getState().currentCellId,
          viewMode: useStore.getState().viewMode,
          onProcess: true,
          agentName: 'Code Executor',
          agentType: 'code_generator',
          taskDescription: 'Running current code cell',
          progressPercent: 0,
          metadata: { actionKey },
        });
        const latestId = useAIAgentStore.getState().actions[0]?.id;

        try {
          await globalUpdateInterface.runCurrentCodeCell();
          if (latestId) {
            useAIAgentStore.getState().updateAction(latestId, {
              onProcess: false,
              result: 'Code executed successfully',
              progressPercent: 100,
            });
          }
        } catch (error) {
          if (latestId) {
            useAIAgentStore.getState().updateAction(latestId, {
              onProcess: false,
              errorMessage: `Execution failed: ${String(error)}`,
              progressPercent: 0,
            });
          }
        }

        // debug 记录（保留原逻辑）
        try {
          const notebookState = (window as any).__notebookStore?.getState?.();
          const notebookId = notebookState?.notebookId;
          if (notebookId) {
            const debugMemory: any = AgentMemoryService.getAgentMemory(notebookId, 'debug' as AgentType);
            const currentContext = (debugMemory as any)?.current_context;
            if (currentContext && currentContext.interaction_status === 'in_progress') {
              AgentMemoryService.updateCurrentContext(notebookId, 'debug' as AgentType, {
                interaction_status: 'completed',
                debug_completion_time: new Date().toISOString(),
                fix_applied: true,
              });
              AgentMemoryService.recordOperationInteraction(
                notebookId,
                'debug' as AgentType,
                'debug_completed',
                true,
                {
                  completion_time: new Date().toISOString(),
                  fix_applied: true,
                  code_executed: true,
                  interaction_type: 'debug_session',
                }
              );
              useAIAgentStore.getState().addAction({
                type: EVENT_TYPES.AI_FIXING_BUGS,
                content: 'Debug process completed',
                result: 'Code fixed and executed successfully',
                relatedQAIds: [],
                cellId: useStore.getState().currentCellId,
                viewMode: useStore.getState().viewMode,
                onProcess: false,
                agentName: 'Debug Assistant',
                agentType: 'debug_assistant',
                taskDescription: 'Completed debug process and code execution',
                progressPercent: 100,
                metadata: { actionKey: makeActionKey('debug-done') },
              });
            }
          }
        } catch (error) {
          agentLog.error('Failed to record debug completion', { error });
        }
        break;
      }

      case 'setCurrentCellMode_onlyCode': {
        await globalUpdateInterface.setCurrentCellMode_onlyCode();
        break;
      }

      case 'setCurrentCellMode_onlyOutput': {
        await globalUpdateInterface.setCurrentCellMode_onlyOutput();
        try {
          const notebookState = (window as any).__notebookStore?.getState?.();
          const notebookId = notebookState?.notebookId;
          const commandId = gps(data, 'commandId');
          if (notebookId && commandId) {
            AgentMemoryService.recordOperationInteraction(notebookId, 'command', 'user_command', true, {
              command_id: commandId,
              completion_time: new Date().toISOString(),
              status: 'code_generated_and_executed',
            });
          }
        } catch (error) {
          agentLog.error('Failed to record code generation interaction', { error });
        }
        break;
      }

      case 'setCurrentCellMode_complete': {
        await globalUpdateInterface.setCurrentCellMode_complete();
        break;
      }

      case 'initStreamingAnswer': {
        const qidStr = gps(data, 'QId');
        if (qidStr) {
          await globalUpdateInterface.initStreamingAnswer(qidStr);
          lastStreamingQaId = qidStr;
          try {
            const notebookState = (window as any).__notebookStore?.getState?.();
            const notebookId = notebookState?.notebookId;
            if (notebookId) {
              AgentMemoryService.updateCurrentContext(notebookId, 'general', {
                current_qa_id: qidStr,
                interaction_start_time: new Date().toISOString(),
                interaction_status: 'in_progress',
              });
            }
          } catch (e) {
            console.error('记录QA开始时出错:', e);
          }
        } else {
          console.error('Missing QId in stream data:', data);
        }
        break;
      }

      case 'addContentToAnswer': {
        const qidStr = gps(data, 'QId');
        const content = gp<string>(data, 'content');
        if (qidStr && typeof content === 'string') {
          await globalUpdateInterface.addContentToAnswer(qidStr, content);
        } else {
          console.error('Missing QId or content in stream data:', data);
        }
        break;
      }

      case 'finishStreamingAnswer': {
        let qidStr = gps(data, 'QId') ?? lastStreamingQaId ?? null;
        const finalResponse = gp<string>(data, 'response') || '';
        if (!qidStr) {
          try {
            const state = (require('../store/AIAgentStore') as any).useAIAgentStore?.getState?.();
            const candidate = state?.qaList?.find?.((q: any) => q.onProcess);
            qidStr = candidate?.id || null;
          } catch {}
        }
        if (qidStr) {
          await globalUpdateInterface.finishStreamingAnswer(qidStr, finalResponse);
          lastStreamingQaId = null;
          try {
            const notebookState = (window as any).__notebookStore?.getState?.();
            const notebookId = notebookState?.notebookId;
            if (notebookId && finalResponse) {
              AgentMemoryService.updateCurrentContext(notebookId, 'general', {
                current_qa_id: qidStr,
                interaction_status: 'completed',
                completion_time: new Date().toISOString(),
                response_quality: finalResponse.length > 100 ? 'detailed' : 'brief',
              });
              AgentMemoryService.recordOperationInteraction(notebookId, 'general', 'qa_completed', true, {
                question_id: qidStr,
                response_length: finalResponse.length,
                completion_time: new Date().toISOString(),
                response_preview: finalResponse.substring(0, 200),
                interaction_type: 'qa_session',
              });
            }
          } catch (e) {
            console.error('记录QA交互时出错:', e);
          }
        } else {
          console.error('Missing QId in stream data:', data);
        }
        break;
      }

      case 'addNewContent2CurrentCellDescription': {
        const content = gp<string>(data, 'content');
        if (typeof content === 'string') {
          await globalUpdateInterface.addNewContent2CurrentCellDescription(content);
        }
        break;
      }

      case 'convertCurrentCodeCellToHybridCell': {
        await globalUpdateInterface.convertCurrentCodeCellToHybridCell();
        break;
      }

      case 'convertCurrentHybridCellToLinkCell': {
        const content = gp<string>(data, 'content');
        const metadata = gp<any>(data, 'metadata') || {};
        if (typeof content === 'string') {
          const state = useStore.getState();
          const currentCell = state.cells.find((c) => c.id === state.currentCellId);
          if (currentCell) {
            state.updateCell(currentCell.id, content);
            state.updateCellType(currentCell.id, 'link');
            if (metadata) state.updateCellMetadata(currentCell.id, metadata);
          }
        }
        break;
      }

      case 'updateCurrentCellWithContent': {
        const content = gp<string>(data, 'content');
        let targetCellId = gps(data, 'cellId');
        const commandId = gps(data, 'commandId');
        const uniqueIdentifier = gps(data, 'uniqueIdentifier');

        if (typeof content === 'string') {
          if (!targetCellId && uniqueIdentifier) {
            const ok = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, { content });
            if (ok) return;
          }
          if (!targetCellId && commandId && generationCellTracker.has(commandId)) {
            targetCellId = generationCellTracker.get(commandId);
          }
          if (targetCellId) {
            await globalUpdateInterface.updateCell(targetCellId, content);
          } else {
            const lastAdded = globalUpdateInterface.getAddedLastCellID();
            if (lastAdded) {
              const cells = useStore.getState().cells;
              const c = cells.find((x) => x.id === lastAdded);
              if (c && c.metadata?.isGenerating) {
                await globalUpdateInterface.updateCell(lastAdded, content);
              } else {
                await globalUpdateInterface.updateCurrentCellWithContent(content);
              }
            } else {
              await globalUpdateInterface.updateCurrentCellWithContent(content);
            }
          }
        } else {
          console.error('updateCurrentCellWithContent: no content');
        }
        break;
      }

      case 'tiptap_update': {
        const cellId = gps(data, 'cellId');
        const content = gp<string>(data, 'content');
        const replace = gp<boolean>(data, 'replace') ?? false;
        if (!cellId || typeof content !== 'string') {
          console.warn('tiptap_update: invalid payload', { cellId, contentType: typeof content });
          break;
        }
        const state = useStore.getState();
        const target = state.cells.find((c) => c.id === cellId);
        if (!target) {
          console.warn('tiptap_update: cell not found', cellId);
          break;
        }
        if (replace) state.updateCell(cellId, content);
        else state.updateCell(cellId, (target.content || '') + content);
        if (state.editingCellId !== cellId) state.setEditingCellId(cellId);
        break;
      }

      case 'updateCurrentCellMetadata': {
        const metadata = gp<any>(data, 'metadata');
        const commandId = gps(data, 'commandId');
        let cellId = gps(data, 'cellId');
        const uniqueIdentifier = gps(data, 'uniqueIdentifier');

        if (metadata) {
          if (!cellId && uniqueIdentifier) {
            const ok = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, { metadata });
            if (ok) {
              if (metadata.isGenerating === false || metadata.generationCompleted) {
                if (commandId) generationCellTracker.delete(commandId);
                generationCellTracker.delete(`unique-${uniqueIdentifier}`);
              }
              break;
            }
          }
          if (!cellId && commandId && generationCellTracker.has(commandId)) {
            cellId = generationCellTracker.get(commandId)!;
            if (metadata.isGenerating === false || metadata.generationCompleted) {
              generationCellTracker.delete(commandId);
            }
          } else if (!cellId) {
            cellId = globalUpdateInterface.getAddedLastCellID();
          }

          if (cellId) {
            useStore.getState().updateCellMetadata(cellId, metadata);
          } else {
            const currentSelected = useStore.getState().currentCellId;
            if (currentSelected) useStore.getState().updateCellMetadata(currentSelected, metadata);
            else console.error('updateCurrentCellMetadata: cannot resolve target cell');
          }
        } else {
          console.error('updateCurrentCellMetadata: missing metadata');
        }
        break;
      }

      case 'addNewPhase2Next': {
        const description = gps(data, 'description');
        const content = gp<string>(data, 'content');
        if (description) await globalUpdateInterface.addNewCell2Next('markdown', description);
        if (typeof content === 'string') await globalUpdateInterface.addNewContent2CurrentCell(content);
        break;
      }

      case 'update_notebook_title': {
        const title = gps(data, 'title');
        if (title) {
          useStore.getState().updateTitle(title);
          await showToast({ message: `标题已更新: ${title}`, type: 'success' });
        }
        break;
      }

      case 'get_variable':
      case 'set_variable':
      case 'remember_information':
      case 'update_todo': {
        // 原样保留日志即可
        break;
      }

      case 'communicate_with_agent': {
        const targetAgent = gps(data, 'target_agent') || 'Communication Agent';
        const message = gps(data, 'message') || '';
        const { useAIAgentStore } = await import('../store/AIAgentStore');
        useAIAgentStore.getState().addAction({
          type: EVENT_TYPES.AI_UNDERSTANDING,
          content: `Agent communication: ${message}`,
          result: '',
          relatedQAIds: [],
          cellId: useStore.getState().currentCellId,
          viewMode: useStore.getState().viewMode,
          onProcess: true,
          agentName: targetAgent,
          agentType: 'workflow_manager',
          taskDescription: `Communicating with ${targetAgent}: ${message}`,
          progressPercent: 0,
          metadata: { actionKey: makeActionKey('communicate') },
        });
        break;
      }

      case 'open_link_in_split': {
        const href = gps(data, 'href');
        const label = gps(data, 'label') || 'Webpage';
        const notebookId = gps(data, 'notebook_id');
        if (href && notebookId) {
          try {
            const linkMarkdown = `[${label}](${href})`;
            await new Promise((r) => setTimeout(r, 100));
            const state = useStore.getState();
            const existing = [...state.cells].reverse().find(
              (c) => c.type === 'link' && typeof c.content === 'string' && (c.content.includes(href) || c.content === linkMarkdown)
            );
            if (existing) {
              state.setDetachedCellId(existing.id);
            } else {
              const cellId = await globalUpdateInterface.addNewCell2End('link', '网页预览');
              await globalUpdateInterface.updateCell(cellId, linkMarkdown);
              state.setDetachedCellId(cellId);
            }
            const { default: usePreviewStore } = await import('../store/previewStore');
            const filePath = href.replace(/^\.\//, '');
            const fileName = filePath.split('/').pop() || filePath;
            const ext = fileName.split('.').pop()?.toLowerCase();
            const fileType =
              ext === 'jsx' || ext === 'tsx'
                ? 'jsx'
                : ext === 'html' || ext === 'htm'
                ? 'html'
                : ext === 'csv'
                ? 'csv'
                : ext === 'pdf'
                ? 'pdf'
                : ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext || '')
                ? 'image'
                : 'text';
            const fileObj = { name: fileName, path: filePath, type: fileType } as any;
            await usePreviewStore.getState().previewFile(notebookId, filePath, { file: fileObj } as any);
            try {
              window.dispatchEvent(new CustomEvent('refreshFileList'));
            } catch (e) {
              uiLog.warn('Failed to trigger file list refresh', { error: e });
            }
            const contentType = fileType === 'jsx' ? 'React组件' : fileType === 'html' ? '网页' : '文件';
            await showToast({ message: `${contentType}已生成并打开预览: ${label}`, type: 'success' });
          } catch (e: any) {
            console.error('open_link_in_split failed:', e);
            await showToast({ message: `分屏预览失败: ${e?.message || String(e)}`, type: 'error' });
          }
        } else {
          console.warn('open_link_in_split: missing href or notebookId', { href, notebookId });
        }
        break;
      }

      case 'ask_agent_for_help': {
        const targetAgent = gps(data, 'target_agent') || 'Help Agent';
        const helpRequest = gps(data, 'help_request') || '';
        const { useAIAgentStore } = await import('../store/AIAgentStore');
        useAIAgentStore.getState().addAction({
          type: EVENT_TYPES.AI_CRITICAL_THINKING,
          content: `Requesting help from ${targetAgent}`,
          result: '',
          relatedQAIds: [],
          cellId: useStore.getState().currentCellId,
          viewMode: useStore.getState().viewMode,
          onProcess: true,
          agentName: targetAgent,
          agentType: 'debug_assistant',
          taskDescription: `Help request: ${helpRequest}`,
          progressPercent: 0,
          metadata: { actionKey: makeActionKey('help') },
        });
        break;
      }

      case 'trigger_image_generation': {
        const prompt = gps(data, 'prompt');
        const commandId = gps(data, 'commandId');
        if (prompt && commandId) {
          const { useAIAgentStore } = await import('../store/AIAgentStore');
          const activityInfo = getActivityFromOperation('trigger_image_generation', prompt);
          useAIAgentStore.getState().addAction({
            type: activityInfo.eventType,
            content: prompt,
            result: '',
            relatedQAIds: [],
            cellId: null,
            viewMode: useStore.getState().viewMode,
            onProcess: true,
            agentName: activityInfo.agentName,
            agentType: activityInfo.agentType,
            taskDescription: activityInfo.taskDescription,
            progressPercent: 0,
            metadata: { actionKey: makeActionKey('gen-img') },
          });

          const notebookState = useStore.getState();
          const notebookId = notebookState.notebookId;
          const { default: useOperatorStore } = await import('../store/operatorStore');
          useOperatorStore.getState().sendOperation(notebookId, {
            type: 'user_command',
            payload: {
              content: `/image ${prompt}`,
              commandId,
              current_view_mode: notebookState.viewMode,
              current_phase_id: notebookState.currentPhaseId,
              current_step_index: notebookState.currentStepIndex,
              notebook_id: notebookId,
            },
          });
          await showToast({ message: `开始生成图片: ${prompt.substring(0, 30)}...`, type: 'info' });

          try {
            const { useAIAgentStore } = require('../store/AIAgentStore');
            const state = useAIAgentStore.getState();
            const runningQA = state.qaList.find((q: any) => q.onProcess) || state.qaList[0];
            if (runningQA) {
              state.addToolCallToQA(runningQA.id, {
                type: 'draw-image',
                content: prompt,
                agent: 'image-generator',
              });
            }
          } catch {}
        }
        break;
      }

      case 'trigger_webpage_generation': {
        const prompt = gps(data, 'prompt');
        const commandId = gps(data, 'commandId');
        if (prompt && commandId) {
          try {
            const { useAIAgentStore } = await import('../store/AIAgentStore');
            const activityInfo = getActivityFromOperation('trigger_webpage_generation', prompt);
            useAIAgentStore.getState().addAction({
              type: activityInfo.eventType,
              content: prompt,
              result: '',
              relatedQAIds: [],
              cellId: null,
              viewMode: useStore.getState().viewMode,
              onProcess: true,
              agentName: activityInfo.agentName,
              agentType: activityInfo.agentType,
              taskDescription: activityInfo.taskDescription,
              progressPercent: 0,
              metadata: { actionKey: makeActionKey('gen-web') },
            });
          } catch {}
          const notebookState = useStore.getState();
          const notebookId = notebookState.notebookId;
          const { default: useOperatorStore } = await import('../store/operatorStore');
          useOperatorStore.getState().sendOperation(notebookId, {
            type: 'user_command',
            payload: {
              content: `/webpage ${prompt}`,
              commandId,
              current_view_mode: notebookState.viewMode,
              current_phase_id: notebookState.currentPhaseId,
              current_step_index: notebookState.currentStepIndex,
              notebook_id: notebookId,
            },
          });
          await showToast({ message: `开始生成网页: ${prompt.substring(0, 30)}...`, type: 'info' });

          try {
            const { useAIAgentStore } = require('../store/AIAgentStore');
            const state = useAIAgentStore.getState();
            const runningQA = state.qaList.find((q: any) => q.onProcess) || state.qaList[0];
            if (runningQA) {
              state.addToolCallToQA(runningQA.id, {
                type: 'create-webpage',
                content: prompt,
                agent: 'webpage-generator',
              });
            }
          } catch {}
        }
        break;
      }

      case 'trigger_video_generation': {
        const prompt = gps(data, 'prompt');
        const commandId = gps(data, 'commandId');
        if (prompt && commandId) {
          try {
            const { useAIAgentStore } = await import('../store/AIAgentStore');
            const activityInfo = getActivityFromOperation('trigger_video_generation', prompt);
            useAIAgentStore.getState().addAction({
              type: activityInfo.eventType,
              content: prompt,
              result: '',
              relatedQAIds: [],
              cellId: null,
              viewMode: useStore.getState().viewMode,
              onProcess: true,
              agentName: activityInfo.agentName,
              agentType: activityInfo.agentType,
              taskDescription: activityInfo.taskDescription,
              progressPercent: 0,
              metadata: { actionKey: makeActionKey('gen-video') },
            });
          } catch {}
          const notebookState = useStore.getState();
          const notebookId = notebookState.notebookId;
          const { default: useOperatorStore } = await import('../store/operatorStore');
          useOperatorStore.getState().sendOperation(notebookId, {
            type: 'user_command',
            payload: {
              content: `/video ${prompt}`,
              commandId,
              current_view_mode: notebookState.viewMode,
              current_phase_id: notebookState.currentPhaseId,
              current_step_index: notebookState.currentStepIndex,
              notebook_id: notebookId,
            },
          });
          await showToast({ message: `开始生成视频: ${prompt.substring(0, 30)}...`, type: 'info' });

          try {
            const { useAIAgentStore } = require('../store/AIAgentStore');
            const state = useAIAgentStore.getState();
            const runningQA = state.qaList.find((q: any) => q.onProcess) || state.qaList[0];
            if (runningQA) {
              state.addToolCallToQA(runningQA.id, {
                type: 'create-video',
                content: prompt,
                agent: 'video-generator',
              });
            }
          } catch {}
        }
        break;
      }

      case 'video_generation_task_started': {
        const taskId = gps(data, 'taskId');
        const commandId = gps(data, 'commandId');
        const uniqueIdentifier = gps(data, 'uniqueIdentifier');
        if (taskId && uniqueIdentifier) {
          startVideoGenerationPolling(taskId, uniqueIdentifier, commandId!);
          await showToast({ message: '视频生成任务已启动，正在后台处理...', type: 'info' });
        }
        break;
      }

      case 'video_generation_status_update': {
        const taskId = gps(data, 'taskId');
        const status = gps(data, 'status');
        const videoUrl = gps(data, 'videoUrl');
        const uniqueIdentifier = gps(data, 'uniqueIdentifier');
        const prompt = gps(data, 'prompt');
        const errMsg = gps(data, 'error');

        if (status === 'completed' && videoUrl && uniqueIdentifier) {
          if (activeVideoPolls.has(taskId!)) {
            clearInterval(activeVideoPolls.get(taskId!)!);
            activeVideoPolls.delete(taskId!);
          }
          const md = `![${prompt || 'Generated Video'}](${videoUrl})`;
          const ok1 = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, { content: md });
          const ok2 = useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, {
            metadata: {
              isGenerating: false,
              generationCompleted: true,
              generationEndTime: Date.now(),
              videoUrl,
              generationStatus: 'completed',
            },
          });
          if (ok1 && ok2) await showToast({ message: '视频生成完成！', type: 'success' });
        } else if (status === 'failed' || errMsg) {
          if (activeVideoPolls.has(taskId!)) {
            clearInterval(activeVideoPolls.get(taskId!)!);
            activeVideoPolls.delete(taskId!);
          }
          const ok = uniqueIdentifier
            ? useStore.getState().updateCellByUniqueIdentifier(uniqueIdentifier, {
                metadata: {
                  isGenerating: false,
                  generationError: errMsg || 'Generation failed',
                  generationStatus: 'failed',
                },
              })
            : false;
          if (ok) await showToast({ message: `视频生成失败: ${errMsg || 'Unknown error'}`, type: 'error' });
        }
        break;
      }

      case 'workflow_stage_changed': {
        const phaseId = gps(data, 'phaseId') || gps(data, 'chapter');
        if (phaseId) {
          const stageDescription = getWorkflowStageDescription(phaseId);
          const { useAIAgentStore } = await import('../store/AIAgentStore');
          useAIAgentStore.getState().addAction({
            type: EVENT_TYPES.WORKFLOW_STAGE_CHANGE,
            content: `Entering new stage: ${stageDescription}`,
            result: 'Stage switched successfully',
            relatedQAIds: [],
            cellId: null,
            viewMode: useStore.getState().viewMode,
            onProcess: false,
            agentName: 'Workflow Manager',
            agentType: 'workflow_manager',
            taskDescription: `Workflow stage changed: ${stageDescription}`,
            workflowContext: { chapter: phaseId, stage: stageDescription },
            metadata: { actionKey: makeActionKey('wf-stage') },
          });
          await globalUpdateInterface.setCurrentPhase(phaseId);
          await globalUpdateInterface.setCurrentStepIndex(0);
          await showToast({ message: `当前阶段已更新: ${stageDescription}`, type: 'success' });
        }
        break;
      }

      case 'task_completed': {
        const taskType = gps(data, 'taskType') || 'unknown';
        const taskResult = gps(data, 'result') || '任务完成';
        const agentType = gps(data, 'agentType') || 'general';
        const { useAIAgentStore } = await import('../store/AIAgentStore');
        useAIAgentStore.getState().addAction({
          type: EVENT_TYPES.TASK_COMPLETED,
          content: `Task completed: ${taskType}`,
          result: taskResult,
          relatedQAIds: [],
          cellId: null,
          viewMode: useStore.getState().viewMode,
          onProcess: false,
          agentName: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
          agentType: agentType as any,
          taskDescription: `Completed task: ${taskType}`,
          metadata: { actionKey: makeActionKey('task-done') },
        });
        break;
      }

      case 'task_failed': {
        const taskType = gps(data, 'taskType') || 'unknown';
        const errorMessage = gps(data, 'error') || '任务失败';
        const agentType = gps(data, 'agentType') || 'general';
        const { useAIAgentStore } = await import('../store/AIAgentStore');
        useAIAgentStore.getState().addAction({
          type: EVENT_TYPES.TASK_FAILED,
          content: `Task failed: ${taskType}`,
          result: '',
          relatedQAIds: [],
          cellId: null,
          viewMode: useStore.getState().viewMode,
          onProcess: false,
          agentName: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
          agentType: agentType as any,
          taskDescription: `Task failed: ${taskType}`,
          errorMessage,
          metadata: { actionKey: makeActionKey('task-fail') },
        });
        break;
      }

      default: {
        console.warn('未处理的流式响应类型:', type, data);
        break;
      }
    }
  });
};
