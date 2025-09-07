// AICommandInput.ant.responsive.tsx
import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
} from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Input, Button, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { SendHorizontal } from 'lucide-react';
import { usePipelineStore, PIPELINE_STAGES } from '@/components/Senario/Workflow/store/usePipelineStore';
import usePreStageStore from '@/components/Senario/Workflow/store/preStageStore';
import { generalResponse } from '@/components/Senario/Workflow/services/StageGeneralFunction';
import { useAIAgentStore, EVENT_TYPES } from '@Store/AIAgentStore';
import { AgentMemoryService, AgentType } from '@Services/agentMemoryService';
import useStore from '@Store/notebookStore';
import useOperatorStore from '@Store/operatorStore';
import { detectActivityType } from '../../../../utils/activityDetector';
import useCodeStore from '@Store/codeStore';
import { notebookApiIntegration } from '@Services/notebookServices';
import { useAIPlanningContextStore } from '@/components/Senario/Workflow/store/aiPlanningContext';

import type { UploadFile, AICommandInputProps, VDSQuestion } from './types';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT = '.csv,.xlsx,.xls';

const AICommandInput: React.FC<AICommandInputProps> = ({ files, setFiles }) => {
  const { t, i18n } = useTranslation();

  // -------- UI refs / state --------
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [input, setInput] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isMultiline, setIsMultiline] = useState<boolean>(false);

  // -------- Biz state --------
  const [isVDSMode, setIsVDSMode] = useState<boolean>(false);

  // Safely extract the underlying HTMLTextAreaElement from AntD's TextArea instance
  const extractHtmlTextArea = useCallback((node: unknown): HTMLTextAreaElement | null => {
    if (!node) return null;
    // AntD v5 wraps the native textarea inside resizableTextArea
    const anyNode = node as { resizableTextArea?: { textArea?: unknown } } | HTMLTextAreaElement;
    const inner = (anyNode as { resizableTextArea?: { textArea?: unknown } })?.resizableTextArea?.textArea;
    if (inner instanceof HTMLTextAreaElement) return inner;
    if (anyNode instanceof HTMLTextAreaElement) return anyNode;
    return null;
  }, []);

  const defaultPresetQuestions = useMemo<VDSQuestion[]>(
    () => [
      { problem_name: '代码解释与优化', problem_description: '/explain 帮我解释这段代码的功能并提供优化建议' },
      { problem_name: '数据分析咨询', problem_description: '如何对我的数据进行统计分析？' },
      { problem_name: '代码生成', problem_description: '/gen 生成一个Python函数来处理数据' },
    ],
    []
  );
  const [presetQuestions, setPresetQuestions] = useState<VDSQuestion[]>(defaultPresetQuestions);

  const { setPreStage } = usePipelineStore();
  const sendOperation = useOperatorStore((s) => s.sendOperation);

  const {
    addAction,
    setIsLoading,
    setActiveView,
    actions,
    qaList,
    addQA,
  } = useAIAgentStore();

  const {
    notebookId,
    viewMode,
    currentPhaseId,
    currentStepIndex,
    getCurrentViewCells,
    currentCellId,
    setIsRightSidebarCollapsed,
  } = useStore();

  // ---------- autosize 行数计算（控制单行/多行布局切换） ----------
  const calcIsMultiline = useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight || '22');
    const paddingTop = parseFloat(style.paddingTop || '0');
    const paddingBottom = parseFloat(style.paddingBottom || '0');
    const contentHeight = el.scrollHeight - paddingTop - paddingBottom;
    const rows = Math.round(contentHeight / lineHeight);
    setIsMultiline(rows > 1 || input.includes('\n'));
  }, [input]);

  useLayoutEffect(() => {
    calcIsMultiline();
  }, [input, calcIsMultiline]);

  // Keep the resize handler typed to satisfy AntD's onResize signature
  const handleTextAreaResize = useCallback((_: { width: number; height: number }) => {
    calcIsMultiline();
  }, [calcIsMultiline]);

  // ---------- 根据 VDS 模式和文件变化重置预设问题 ----------
  useEffect(() => {
    if (!isVDSMode && files.length === 0) {
      setPresetQuestions(defaultPresetQuestions);
    }
  }, [isVDSMode, files.length, defaultPresetQuestions]);

  // ---------- 上传逻辑 ----------
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files ?? []);
      if (!selectedFiles.length) return;

      const csv = selectedFiles.find((f) => /\.(csv|xlsx|xls)$/i.test(f.name));
      if (!csv) {
        // 业务保留：简单提醒
        alert('Please select a CSV or Excel file');
        // 清空 input 值，避免二次无法选同一文件
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      if (csv.size > MAX_SIZE) {
        alert(`File is too large. Maximum size allowed is ${MAX_SIZE / 1024 / 1024}MB`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const uploadConfig = {
        mode: 'unrestricted',
        allowedTypes: [
          '.csv',
          '.xlsx',
          '.xls',
          '.jpg',
          '.png',
          '.jpeg',
          '.gif',
          '.pdf',
          '.doc',
          '.docx',
          '.ppt',
          '.pptx',
          '.txt',
          '.md',
        ],
        maxFileSize: MAX_SIZE,
        targetDir: '.assets',
      };

      // 确保有 notebookId
      let currentNotebookId = notebookId;
      if (!currentNotebookId) {
        try {
          currentNotebookId = await notebookApiIntegration.initializeNotebook();
          useStore.getState().setNotebookId(currentNotebookId);
          useCodeStore.getState().setKernelReady(true);
        } catch (initError) {
          console.error('Failed to create notebook:', initError);
          alert('Failed to create notebook. Please try again.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }

      setIsUploading(true);

      try {
        // 确保内核 ready
        await useCodeStore.getState().initializeKernel();

        const result = await notebookApiIntegration.uploadFiles(currentNotebookId!, [csv], uploadConfig);

        if (result && (result as any).status === 'ok') {
          if (currentNotebookId !== notebookId) {
            useStore.getState().setNotebookId(currentNotebookId!);
          }

          const newFiles: UploadFile[] = [
            {
              id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
              name: csv.name,
              size: csv.size,
              type: csv.type,
              url: URL.createObjectURL(csv),
              file: csv,
            },
          ];
          setFiles(newFiles);

          await usePreStageStore.getState().setCurrentFile(csv);
          await usePreStageStore.getState().setCsvFilePath(csv.name);

          // 业务：开启 VDS
          setIsVDSMode(true);

          // 生成 VDS 预设问题（异步延时保持原逻辑）
          setTimeout(async () => {
            try {
              const cols = usePreStageStore.getState().getFileColumns();
              const info = usePreStageStore.getState().getDatasetInfo();
              const map = await generalResponse(
                'generate_question_choice_map',
                { column_info: cols, dataset_info: info },
                i18n.language
              );
              if (map?.message) {
                usePreStageStore.getState().updateChoiceMap(map.message);
                setPresetQuestions(map.message as VDSQuestion[]);
                if ((map.message as VDSQuestion[]).length && (map.message as VDSQuestion[])[0].problem_description) {
                  setInput((map.message as VDSQuestion[])[0].problem_description);
                }
              }
            } catch (genErr) {
              console.error('Error generating preset questions:', genErr);
            }
          }, 1000);
        } else {
          alert('Upload failed: ' + ((result as any)?.message || 'Unknown error'));
        }
      } catch (err: any) {
        console.error('Upload error:', err);
        alert(t('emptyState.uploadError') || 'Upload failed: ' + err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [notebookId, i18n.language, t, setFiles]
  );

  // Note: removeFile handler removed due to being unused.

  const onFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ---------- 提交逻辑 ----------
  const handleSubmit = useCallback(
    (command: string) => {
      if (!command) return;
      setIsLoading(true);
      const timestamp = new Date().toLocaleTimeString();

      try {
        // VDS：进入 problem define
        const hasCsv = files.length > 0 && /\.(csv|xlsx|xls)$/i.test(files[0].name);
        if (hasCsv && isVDSMode && command.trim()) {
          usePreStageStore.getState().setSelectedProblem('vds', command.trim(), 'VDS Analysis');

          const currentFile = files[0];
          const variables = {
            csv_file_path: currentFile?.name || '',
            problem_description: command.trim(),
            context_description: 'No additional context provided',
            problem_name: 'VDS Analysis',
            user_goal: command.trim(),
          };

          const aiPlanningStore = useAIPlanningContextStore.getState();
          Object.entries(variables).forEach(([key, value]) => {
            aiPlanningStore.addVariable(key, value as unknown as Record<string, unknown>);
          });

          setPreStage(PIPELINE_STAGES.PROBLEM_DEFINE);
          return;
        }

        // Command 模式
        if (command.startsWith('/')) {
          setActiveView('script');
          const commandId = `action-${Date.now()}`;
          const actionData = {
            id: commandId,
            type: EVENT_TYPES.USER_NEW_INSTRUCTION,
            timestamp,
            content: command,
            result: '',
            relatedQAIds: [] as string[],
            cellId: currentCellId,
            viewMode,
            onProcess: false,
            attachedFiles: files,
          };

          const detectionResult = detectActivityType(command);
          const enhancedActionData = {
            ...actionData,
            type: detectionResult.eventType,
            agentName: detectionResult.agentName,
            agentType: detectionResult.agentType,
            taskDescription: detectionResult.taskDescription,
            onProcess: true,
            progressPercent: 0,
          };
          addAction(enhancedActionData as any);

          sendOperation(useStore.getState().notebookId, {
            type: 'user_command',
            payload: {
              current_view_mode: viewMode,
              current_phase_id: currentPhaseId,
              current_step_index: currentStepIndex,
              content: command,
              commandId,
              files,
            },
          });
        } else {
          // QA 模式
          setIsRightSidebarCollapsed(true);
          setActiveView('qa');
          const qaId = `qa-${uuidv4()}`;
          const qaData = {
            id: qaId,
            type: 'user',
            timestamp,
            content: command,
            resolved: false,
            relatedActionId: null,
            cellId: currentCellId,
            viewMode,
            onProcess: true,
            attachedFiles: files,
          };
          addQA(qaData as any);

          const detectionResult = detectActivityType(command);
          const enhancedAction = {
            type: detectionResult.eventType,
            content: command,
            result: '',
            relatedQAIds: [qaId],
            cellId: currentCellId,
            viewMode: viewMode || 'create',
            onProcess: true,
            agentName: detectionResult.agentName,
            agentType: detectionResult.agentType,
            taskDescription: detectionResult.taskDescription,
            progressPercent: 0,
            metadata: {
              attachedFiles: files,
              hasFiles: files && files.length > 0,
            },
          };
          useAIAgentStore.getState().addAction(enhancedAction);

          const memoryContext = AgentMemoryService.prepareMemoryContextForBackend(
            useStore.getState().notebookId || '',
            'general' as AgentType,
            {
              current_cell_id: currentCellId ?? '',
              related_cells: getCurrentViewCells(),
              related_qa_ids: qaList.map((qa) => qa.id),
              current_qa_id: qaId,
              question_content: command,
            }
          );

          const finalPayload = {
            type: 'user_question',
            payload: {
              content: command,
              QId: [qaId],
              current_view_mode: viewMode,
              current_phase_id: currentPhaseId,
              current_step_index: currentStepIndex,
              related_qas: qaList,
              related_actions: actions,
              related_cells: getCurrentViewCells(),
              files,
              ...memoryContext,
            },
          };
          sendOperation(useStore.getState().notebookId, finalPayload);
        }

        setFiles([]);
      } catch (err) {
        console.error('Submit error:', err);
      } finally {
        // 与原行为一致：稍后关闭 loading
        setTimeout(() => setIsLoading(false), 500);
      }
    },
    [
      files,
      isVDSMode,
      setPreStage,
      setIsLoading,
      setActiveView,
      addAction,
      addQA,
      sendOperation,
      currentCellId,
      viewMode,
      currentPhaseId,
      currentStepIndex,
      qaList,
      actions,
      getCurrentViewCells,
      setIsRightSidebarCollapsed,
      setFiles,
    ]
  );

  const hasContent = useMemo(() => input.trim().length > 0 || files.length > 0, [input, files.length]);

  return (
    <div className="relative mb-6">
      {/* 胶囊外框 */}
      <div
        className="ai-bar"
        style={{
          position: 'relative',
          borderRadius: 28,
          border: `1px solid ${isFocused ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.12)'}`,
          boxShadow: isFocused ? '0 4px 18px rgba(0,0,0,0.08)' : '0 1px 6px rgba(0,0,0,0.04)',
          transition: 'transform .18s, box-shadow .18s, border-color .18s',
          transform: isFocused ? 'scale(1.01)' : 'none',
        }}
      >
        {/* 顶部主行（单行：含左右按钮；多行：仅输入） */}
        <div
          style={{
            position: 'relative',
            padding: isMultiline ? '10px 10px 0px 10px' : '10px 70px 10px 32px',
            border: 'none !important',
            outline: 'none !important',
          }}
        >
          {/* 单行：左侧 + */}
          {!isMultiline && (
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}>
              <Tooltip title={isUploading ? t('emptyState.uploading') : t('emptyState.upload')}>
                <Button
                  type="text"
                  shape="circle"
                  icon={<PlusOutlined />}
                  onClick={() => !isUploading && onFileUpload()}
                  loading={isUploading}
                />
              </Tooltip>
              {/* 文件 input —— 沿用原 handleFileChange */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept={ACCEPT}
                multiple
              />
            </div>
          )}

          {/* TextArea —— 无边框、autosize、自适应行数 */}
          <Input.TextArea
            ref={(node) => {
              taRef.current = extractHtmlTextArea(node);
            }}
            className="ai-bar-textarea ai-bar"
            variant="borderless"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                  handleSubmit(input.trim());
                  setInput('');
                }
              }
              // 延迟执行以获取最新 scrollHeight
              setTimeout(calcIsMultiline, 0);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onResize={handleTextAreaResize}
            autoSize={{ minRows: 1, maxRows: 12 }}
            placeholder={
              isVDSMode
                ? 'VDS模式 - 描述您想对数据进行的分析...'
                : input && input.startsWith('/')
                  ? t('emptyState.commandPlaceholder')
                  : t('emptyState.questionPlaceholder')
            }
          />

          {/* 单行：右侧 发送 */}
          {!isMultiline && (
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {/* <Button
                disabled={!hasContent}
                style={{
                  width: 48,
                  height: 24,
                  borderRadius: 12,
                  boxShadow: hasContent ? '0 6px 18px rgba(0,0,0,0.12)' : 'none',
                  // color: hasContent ? '#fff' : 'rgba(0,0,0,0.45)',
                }}
                className={`${
                  input.trim()
                    ? 'bg-theme-600 hover:bg-theme-700 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95'
                }`}
                onClick={() => {
                  if (input.trim()) {
                    handleSubmit(input.trim());
                    setInput('');
                  }
                }}
              >
                {input && input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
              </Button> */}
              <button
                type="button"
                onClick={() => {
                  if (input.trim()) {
                    handleSubmit(input.trim());
                    setInput('');
                  }
                }}
                disabled={!input.trim()}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all duration-300 ease-in-out text-sm font-medium transform ${
                  input.trim()
                    ? 'bg-theme-600 hover:bg-theme-700 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95'
                }`}
              >
                <SendHorizontal className="w-4 h-4" />
                {input && input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
              </button>
            </div>
          )}
        </div>

        {/* 多行：底部操作栏（左：+；右：发送） */}
        {isMultiline && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '6px 12px 10px',
            }}
          >
            {/* 底栏左：+ */}
            <Tooltip title={isUploading ? t('emptyState.uploading') : t('emptyState.upload')}>
              <Button
                type="text"
                shape="circle"
                icon={<PlusOutlined />}
                onClick={() => !isUploading && onFileUpload()}
                loading={isUploading}
              />
            </Tooltip>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept={ACCEPT}
              multiple
            />

            <div style={{ flex: 1 }} />
            <button
                type="button"
                onClick={() => {
                  if (input.trim()) {
                    handleSubmit(input.trim());
                    setInput('');
                  }
                }}
                disabled={!input.trim()}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all duration-300 ease-in-out text-sm font-medium transform ${
                  input.trim()
                    ? 'bg-theme-600 hover:bg-theme-700 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-lg'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95'
                }`}
              >
                <SendHorizontal className="w-4 h-4" />
                {input && input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
              </button>
          </div>
        )}
      </div>

      {/* 模式提示（保留） */}
      {
        input && (
          <div className="mt-2 ml-10">
            <div className="text-theme-600 font-medium transition-all duration-300 ease-in-out">
              {isVDSMode
                ? `🤖 VDS Agents Mode`
                : input && input.startsWith('/')
                  ? `⌘ ${t('emptyState.commandMode')}`
                  : `💭 ${t('emptyState.questionMode')}`}
            </div>
          </div>
        )
      }

      {/* 预设问题（保留原样式） */}
      {
        presetQuestions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presetQuestions.map((q, idx) => (
              <button
                key={`${q.problem_name}-${idx}`}
                onClick={() => setInput(q.problem_description)}
                className="p-3 text-left bg-gray-50 hover:bg-gray-100 border rounded-xl transition-all group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 text-sm truncate">{q.problem_name}</span>
                </div>
              </button>
            ))}
          </div>
        )
      }
    </div >
  );
};

export default AICommandInput;
