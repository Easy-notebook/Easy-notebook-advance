import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  SendHorizontal,
  FileText,
  X,
  PlusCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// ------- Type Definitions -------
interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  file: File;
}

interface AICommandInputProps {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
}

interface VDSQuestion {
  problem_name: string;
  problem_description: string;
}
// ---------------------------------

import { usePipelineStore, PIPELINE_STAGES } from '@WorkflowMode/store/usePipelineStore';
import usePreStageStore from '@WorkflowMode/store/preStageStore';
import { generalResponse } from '@WorkflowMode/services/StageGeneralFunction';
import { useAIAgentStore, EVENT_TYPES } from '@Store/AIAgentStore';
import { AgentMemoryService, AgentType } from '@Services/agentMemoryService';
import useStore from '@Store/notebookStore';
import useOperatorStore from '@Store/operatorStore';
import { createUserAskQuestionAction } from '@Store/actionCreators';
import useCodeStore from '@Store/codeStore';
import { notebookApiIntegration } from '@Services/notebookServices';
import { useAIPlanningContextStore } from '@WorkflowMode/store/aiPlanningContext';

// 扩展 window，避免 TS 报错
declare global {
  interface Window {
    changeTypingText?: (newText: string) => void;
  }
}

/**
 * AI 和文件上传交互组件
 */
const AICommandInput: React.FC<AICommandInputProps> = ({ files, setFiles }) => {
  const { t, i18n } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVDSMode, setIsVDSMode] = useState(false);

  // const defaultPresetQuestions: VDSQuestion[] = useMemo(() => [], []);
  const defaultPresetQuestions = useMemo(() => [
    {
      problem_name: "代码解释与优化",
      problem_description: "/explain 帮我解释这段代码的功能并提供优化建议"
    },
    {
      problem_name: "数据分析咨询",
      problem_description: "如何对我的数据进行统计分析？"
    },
    {
      problem_name: "代码生成",
      problem_description: "/gen 生成一个Python函数来处理数据"
    }
  ], []);
  
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
  const { notebookId, viewMode, currentPhaseId, currentStepIndex, getCurrentViewCells, currentCellId, setIsRightSidebarCollapsed } = useStore();

  // 调整文本域高度 - 所有情况下起始都是2行高度
  const adjustTextareaHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lh = 24;
    const mh = lh * 2; // 固定为2行高度
    const nh = Math.min(ta.scrollHeight, mh);
    ta.style.height = `${nh}px`;
    ta.style.overflowY = ta.scrollHeight > mh ? 'auto' : 'hidden';
  }, []);
  useEffect(() => { adjustTextareaHeight(); }, [input, adjustTextareaHeight]);

  // 根据VDS模式状态动态显示预设问题
  useEffect(() => {
    if (!isVDSMode && files.length === 0) {
      setPresetQuestions(defaultPresetQuestions);
    }
  }, [isVDSMode, files.length, defaultPresetQuestions]);

  // 处理上传
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    if (!selectedFiles.length) return;
    const csv = selectedFiles.find(f => /\.(csv|xlsx|xls)$/i.test(f.name));
    if (!csv) {
      alert('Please select a CSV or Excel file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (csv.size > maxSize) {
      alert(`File is too large. Maximum size allowed is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    const uploadConfig = {
      mode: 'unrestricted',
      allowedTypes: ['.csv', '.xlsx', '.xls', '.jpg', '.png', '.jpeg', '.gif', '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.md'],
      maxFileSize: maxSize,
      targetDir: '.assets'
    };

    // 如果没有 notebookId，先创建一个
    let currentNotebookId = notebookId;
    if (!currentNotebookId) {
      try {
        currentNotebookId = await notebookApiIntegration.initializeNotebook();
        useStore.getState().setNotebookId(currentNotebookId);
        useCodeStore.getState().setKernelReady(true);
      } catch (initError) {
        console.error('Failed to create notebook:', initError);
        alert('Failed to create notebook. Please try again.');
        return;
      }
    }

    setIsUploading(true);

    try {
      await useCodeStore.getState().initializeKernel();
      const result = await notebookApiIntegration.uploadFiles(
        currentNotebookId!,
        [csv],
        uploadConfig,
      );
      if (result && (result as any).status === 'ok') {
        if (currentNotebookId !== notebookId) {
          useStore.getState().setNotebookId(currentNotebookId!);
        }
        const newFiles: UploadFile[] = [{
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          name: csv.name,
          size: csv.size,
          type: csv.type,
          url: URL.createObjectURL(csv),
          file: csv
        }];
        setFiles(newFiles);

        await usePreStageStore.getState().setCurrentFile(csv);
        await usePreStageStore.getState().setCsvFilePath(csv.name);

        setIsVDSMode(true);

        setTimeout(async () => {
          try {
            const cols = usePreStageStore.getState().getFileColumns();
            const info = usePreStageStore.getState().getDatasetInfo();
            const map = await generalResponse('generate_question_choice_map', { column_info: cols, dataset_info: info }, i18n.language);
            if (map?.message) {
              usePreStageStore.getState().updateChoiceMap(map.message);
              setPresetQuestions(map.message as VDSQuestion[]);
              if (map.message.length && map.message[0].problem_description) {
                setInput(map.message[0].problem_description);
              }
            }
          } catch (err) {
            console.error('Error generating preset questions:', err);
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
  }, [notebookId, i18n.language, t, setFiles]);

  // 删除文件
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const next = prev.filter(file => file.id !== fileId);
      if (next.length === 0) setIsVDSMode(false);
      return next;
    });
  }, [setFiles]);

  // 点击上传按钮
  const onFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // VDS模式切换处理
  const handleVDSToggle = useCallback(async () => {
    const newVDSMode = !isVDSMode;
    setIsVDSMode(newVDSMode);

    if (!newVDSMode) {
      setPresetQuestions(defaultPresetQuestions);
    } else if (files.length > 0) {
      const existingChoiceMap = usePreStageStore.getState().choiceMap as VDSQuestion[] | undefined;
      if (!existingChoiceMap || existingChoiceMap.length === 0) {
        try {
          const cols = usePreStageStore.getState().getFileColumns();
          const info = usePreStageStore.getState().getDatasetInfo();
          const map = await generalResponse('generate_question_choice_map', { column_info: cols, dataset_info: info }, i18n.language);
          if (map?.message) {
            usePreStageStore.getState().updateChoiceMap(map.message);
            setPresetQuestions(map.message as VDSQuestion[]);
          }
        } catch (err) {
          console.error('Error generating preset questions:', err);
          setPresetQuestions([]);
        }
      }
    }
  }, [isVDSMode, defaultPresetQuestions, files.length, i18n.language]);

  // 提交
  const handleSubmit = useCallback((command: string) => {
    if (!command) return;
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString();

    try {
      // 仅 VDS 模式时进入 problem define
      const hasCsv = files.length > 0 && /\.(csv|xlsx|xls)$/i.test(files[0].name);
      if (hasCsv && isVDSMode && command.trim()) {
        usePreStageStore.getState().setSelectedProblem('vds', command.trim(), 'VDS Analysis');

        const currentFile = files[0];
        const variables = {
          csv_file_path: currentFile?.name || '',
          problem_description: command.trim(),
          context_description: 'No additional context provided',
          problem_name: 'VDS Analysis',
          user_goal: command.trim()
        };

        const aiPlanningStore = useAIPlanningContextStore.getState();
        Object.entries(variables).forEach(([key, value]) => {
          aiPlanningStore.addVariable(key, value);
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
        addAction(actionData as any);
        sendOperation(useStore.getState().notebookId, {
          type: 'user_command',
          payload: {
            current_view_mode: viewMode,
            current_phase_id: currentPhaseId,
            current_step_index: currentStepIndex,
            content: command,
            commandId,
            files,
          }
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
        const action = createUserAskQuestionAction(command, [qaId], currentCellId);
        useAIAgentStore.getState().addAction(action);

        const memoryContext = AgentMemoryService.prepareMemoryContextForBackend(
          useStore.getState().notebookId || '',
          'general' as AgentType,
          {
            current_cell_id: currentCellId ?? '',
            related_cells: getCurrentViewCells(),
            related_qa_ids: qaList.map(qa => qa.id),
            current_qa_id: qaId,
            question_content: command
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
            ...memoryContext
          }
        };
        sendOperation(useStore.getState().notebookId, finalPayload);
      }

      setFiles([]);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [files, isVDSMode, setPreStage, setIsLoading, setActiveView, addAction, addQA, sendOperation, currentCellId, viewMode, currentPhaseId, currentStepIndex, qaList, actions, getCurrentViewCells, setIsRightSidebarCollapsed, setFiles]);

  // 键盘事件处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSubmit(input.trim());
        setInput('');
      }
    }
  }, [input, handleSubmit]);

  return (
    <div className="relative mb-6">
      {/* 输入框容器 */}
      <div
        className={`
          relative rounded-full transition-all duration-300 ease-in-out
          border-0 margin-0 p-0 transform
          ${isFocused ? 'shadow-lg shadow-theme-200/50' : 'shadow-sm'}
          ${input && input.startsWith('/') ? 'bg-slate-50' : 'bg-white'}
          focus:outline-none border-2 transition-all duration-300
          ${isFocused ? 'border-theme-400 scale-[1.02]' : 'border-black'}
          ${input && input.startsWith('/') ? 'font-mono' : 'font-normal'}
          hover:shadow-md
        `}
      >
        {/* 左侧图标 */}
        {/* <div className="absolute left-0 top-7 -translate-y-1/2 px-3">
          <Sparkles className={`w-5 h-5 transition-all duration-300 transform ${
            isFocused ? 'text-theme-600 animate-pulse scale-110' : 'text-theme-500'
          }`} />
        </div> */}

        <button
          type="button"
          onClick={onFileUpload}
          disabled={isUploading}
          className={`
            absolute left-3 top-7 -translate-y-1/2
            flex items-center justify-center px-2 py-1.5 rounded-full
            transition-all duration-300 ease-in-out transform
            `}
          aria-label="Upload file"
        >
          <PlusCircle className={`w-6 h-6 transition-all duration-300 ${
            isUploading ? 'animate-spin' : ''
          }`} />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".csv,.xlsx,.xls"
            multiple
          />
        </button>

        {/* 文本输入区域 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            isVDSMode 
              ? 'VDS模式 - 描述您想对数据进行的分析...'
              : input && input.startsWith('/')
                ? t('emptyState.commandPlaceholder')
                : t('emptyState.questionPlaceholder')
          }
          className="w-full h-full pl-16 pr-36 py-3 pt-4 rounded-3xl text-base placeholder:text-gray-400 resize-none leading-6 focus:outline-none focus:ring-0"
          rows={1}
          style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}
        />

        {/* 提交按钮 */}
        <button
          type="button"
          onClick={() => {
            if (input.trim()) {
              handleSubmit(input.trim());
              setInput('');
            }
          }}
          disabled={!input.trim()}
          className={`
            absolute right-2 top-7 -translate-y-1/2
            flex items-center gap-1.5 px-4 py-1.5 rounded-full
            transition-all duration-300 ease-in-out text-sm font-medium transform
            ${input.trim()
              ? 'bg-theme-600 hover:bg-theme-700 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed scale-95'}
          `}
        >
          <SendHorizontal className="w-4 h-4" />
          {input && input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
        </button>

        {/* VDS模式切换开关 - 只有上传文件后才显示 */}
        {files.length > 0 && (
          <div className="absolute right-2 bottom-2 flex items-center gap-2 animate-fade-in">
            <span className={`text-xs transition-all duration-300 ${
              isVDSMode ? 'text-theme-600 font-medium' : 'text-gray-500'
            }`}>VDS Agents</span>
            <button
              onClick={handleVDSToggle}
              className={`
                relative inline-flex h-4 w-7 items-center rounded-full 
                transition-all duration-300 ease-in-out transform hover:scale-110 active:scale-95
                ${isVDSMode ? 'bg-theme-600 shadow-sm' : 'bg-gray-300 hover:bg-gray-400'}
              `}
              aria-pressed={isVDSMode}
              aria-label="Toggle VDS mode"
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white 
                  transition-all duration-300 ease-out shadow-sm
                  ${isVDSMode ? 'translate-x-3.5 scale-110' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>
        )}

        {/* Shift + Enter 提示 */}
        {isFocused && (
          <div className="absolute -top-5 right-2 text-xs text-gray-400 bg-white px-2">
            {t('emptyState.pressShiftEnter')}
          </div>
        )}

        {/* 已上传文件列表 */}
        {files.length > 0 && (
          <div className="pl-2 mb-2 flex flex-wrap gap-2 animate-fade-in">
            {files.map((file: UploadFile, index) => (
              <div 
                key={file.id} 
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 rounded-3xl px-3 py-1.5 text-sm
                           transition-all duration-300 ease-in-out transform hover:scale-105 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <FileText className="w-4 h-4 text-gray-500 transition-colors duration-200" />
                <span className="truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-1 text-gray-400 hover:text-red-500 transition-all duration-300 
                           transform hover:scale-110 hover:rotate-90 active:scale-95"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 模式提示 */}
      {input && (
        <div className="mt-2 ml-10 animate-fade-in">
          <div className="text-theme-600 font-medium transition-all duration-300 ease-in-out transform hover:scale-105">
            {isVDSMode 
              ? `🤖 VDS Agents Mode`
              : input && input.startsWith('/') 
                ? `⌘ ${t('emptyState.commandMode')}` 
                : `💭 ${t('emptyState.questionMode')}`
            }
          </div>
        </div>
      )}

      {presetQuestions.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q.problem_description)}
              className="p-3 text-left bg-gray-50 hover:bg-gray-100 border rounded-xl transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-theme-500 flex-shrink-0" />
                <span className="font-medium text-gray-800 text-sm truncate">{q.problem_name}</span>
                <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-theme-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// TypingTitle 组件
const TypingTitle: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [isTypingDone, setIsTypingDone] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const typingSpeed = 35;
  const deletingSpeed = 20;

  const startTyping = useCallback((fullText: string) => {
    setIsDeleting(false);
    let index = 0;
    const interval = window.setInterval(() => {
      setText(fullText.slice(0, index + 1));
      index++;
      if (index === fullText.length) {
        window.clearInterval(interval);
        setIsTypingDone(true);
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, typingSpeed);
    return () => window.clearInterval(interval);
  }, []);

  const deleteText = useCallback((onComplete: () => void) => {
    setIsDeleting(true);
    setIsTypingDone(false);
    setShowCursor(true);
    let index = text.length;
    const interval = window.setInterval(() => {
      setText(prev => prev.slice(0, index - 1));
      index--;
      if (index === 0) {
        window.clearInterval(interval);
        onComplete();
      }
    }, deletingSpeed);
    return () => window.clearInterval(interval);
  }, [text.length]);

  const changeText = useCallback((newText: string) => {
    deleteText(() => {
      startTyping(newText);
    });
  }, [deleteText, startTyping]);

  useEffect(() => {
    const cleanup = startTyping(t('emptyState.title'));
    return () => cleanup();
  }, [startTyping, t]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.changeTypingText = changeText;
      return () => { delete window.changeTypingText; };
    }
    return;
  }, [changeText]);

  return (
    <div className="relative">
      <style>{`
        @keyframes typing-cursor {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.9; }
          50% { transform: scaleY(0.7) scaleX(1.2); opacity: 0.7; }
        }
        @keyframes done-cursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes deleting-cursor {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
          50% { transform: scaleY(0.7) scaleX(1.2); opacity: 0.7; }
        }
        .cursor-typing { background: #f3f4f6; animation: typing-cursor ${typingSpeed * 2}ms ease-in-out infinite; }
        .cursor-done { background: #f3f4f6; animation: done-cursor 1.2s steps(1) infinite; }
        .cursor-deleting { background: #f3f4f6; animation: deleting-cursor ${deletingSpeed * 2}ms ease-in-out infinite; }
        .title-container { display: inline; position: relative; }
        .cursor { display: inline-block; position: relative; vertical-align: text-top; margin-left: 3px; margin-top: 5px; }
      `}</style>
      <div className="title-container">
        <span className="text-4xl font-bold mb-4 leading-tight theme-grad-text">
          {text}
          {showCursor && (
            <div
              className={`cursor w-1 h-8 rounded-sm inline-block ${
                isDeleting ? 'cursor-deleting' : (isTypingDone ? 'cursor-done' : 'cursor-typing')
              }`}
            />
          )}
        </span>
      </div>
    </div>
  );
};

const Header: React.FC = () => (
  <div className="text-center mb-8 flex flex-col items-center justify-center">
    <TypingTitle />
  </div>
);

/**
 * EmptyState 主组件
 */
type AddCellFn = ((type: 'markdown' | 'code') => void) | (() => void);

interface EmptyStateProps {
  onAddCell: AddCellFn;
  onFileUpload?: () => void;
}

function isTypedAddCell(fn: AddCellFn): fn is (type: 'markdown' | 'code') => void {
  // 依据函数参数长度判断是否需要传参
  return fn.length >= 1;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAddCell }) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 上滑手势相关
  const touchStartY = useRef<number | null>(null);
  const isSwipeInProgress = useRef(false);

  // 鼠标长按相关
  const longPressTimerRef = useRef<number | null>(null);
  const longPressActiveRef = useRef(false);
  const lastTriggerAtRef = useRef<number>(0);

  // 滚轮累计（下滑触发）
  const wheelDownAccumRef = useRef<number>(0);

  const safeTrigger = useCallback(async () => {
    const now = Date.now();
    if (now - lastTriggerAtRef.current < 1000) return; // 触发节流
    lastTriggerAtRef.current = now;
    await createNewNotebook();
  }, []);

  // 创建新的 notebook
  const createNewNotebook = useCallback(async () => {
    if (isCreatingNotebook) return;
    setIsCreatingNotebook(true);
    try {
      const newNotebookId = await notebookApiIntegration.initializeNotebook();
      useStore.getState().setNotebookId(newNotebookId);
      useCodeStore.getState().setKernelReady(true);

      // 默认插入一个 markdown 单元
      if (isTypedAddCell(onAddCell)) {
        onAddCell('markdown');
      } 
    } catch (error) {
      console.error('Failed to create new notebook:', error);
      alert('Failed to create new notebook. Please try again.');
    } finally {
      setIsCreatingNotebook(false);
      // 重置滚轮累计，避免下一次轻微滚动立即触发
      wheelDownAccumRef.current = 0;
    }
  }, [isCreatingNotebook, onAddCell]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isCreatingNotebook || isSwipeInProgress.current) return;
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    setSwipeDistance(0);
  }, [isCreatingNotebook]);

  // 触摸移动（上滑）
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (isCreatingNotebook || !touchStartY.current || isSwipeInProgress.current) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY.current;
    if (deltaY < 0) {
      const distance = Math.min(Math.abs(deltaY), 120);
      setSwipeDistance(distance);
    }
  }, [isCreatingNotebook]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (isCreatingNotebook || isSwipeInProgress.current) return;
    const threshold = 80;
    if (swipeDistance > threshold) {
      isSwipeInProgress.current = true;
      void safeTrigger();
    }
    touchStartY.current = null;
    setSwipeDistance(0);
    window.setTimeout(() => { isSwipeInProgress.current = false; }, 300);
  }, [swipeDistance, safeTrigger, isCreatingNotebook]);

  // 鼠标长按 + 上滑
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isCreatingNotebook || isSwipeInProgress.current) return;
    if (e.button !== 0) return; // 仅左键

    touchStartY.current = e.clientY;
    setSwipeDistance(0);
    longPressActiveRef.current = false;

    // 300ms 认定为“长按”
    longPressTimerRef.current = window.setTimeout(() => {
      longPressActiveRef.current = true;
    }, 300);

    const handleMouseMove = (event: MouseEvent) => {
      if (!touchStartY.current || isSwipeInProgress.current) return;
      // 未达到长按不计算上滑
      if (!longPressActiveRef.current) return;

      const deltaY = event.clientY - touchStartY.current;
      if (deltaY < 0) {
        const distance = Math.min(Math.abs(deltaY), 120);
        setSwipeDistance(distance);
      }
    };

    const handleMouseUp = () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const threshold = 80;
      if (longPressActiveRef.current && swipeDistance > threshold && !isSwipeInProgress.current) {
        isSwipeInProgress.current = true;
        void safeTrigger();
      }

      touchStartY.current = null;
      setSwipeDistance(0);
      longPressActiveRef.current = false;

      window.setTimeout(() => { isSwipeInProgress.current = false; }, 300);

      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [swipeDistance, safeTrigger, isCreatingNotebook]);

  // 滚轮下滑触发
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (isCreatingNotebook) return;
    // 下滑 deltaY > 0，累计距离
    if (e.deltaY > 0) {
      wheelDownAccumRef.current += e.deltaY;
      // 设定一个合理阈值（屏幕上滚动约半屏）
      const WHEEL_THRESHOLD = 220;
      if (wheelDownAccumRef.current >= WHEEL_THRESHOLD) {
        wheelDownAccumRef.current = 0;
        void safeTrigger();
      }
    } else {
      // 上滑时稍微衰减，避免误触
      wheelDownAccumRef.current = Math.max(0, wheelDownAccumRef.current + e.deltaY); // e.deltaY < 0
    }
  }, [safeTrigger, isCreatingNotebook]);

  // 底部浮动提示点击触发
  const handleBottomHintClick = useCallback(() => {
    if (!isCreatingNotebook) {
      void safeTrigger();
    }
  }, [safeTrigger, isCreatingNotebook]);

  // 添加自定义样式
  const customStyles = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes swipe-up {
      from { transform: translateY(10px); opacity: 0.8; }
      to { transform: translateY(0); opacity: 1; }
    }
    .animate-fade-in {
      animation: fade-in 0.4s ease-out;
    }
    .animate-slide-in {
      animation: slide-in 0.5s ease-out;
    }
    .animate-swipe-up {
      animation: swipe-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <div
        ref={containerRef}
        className="relative flex flex-col items-center justify-start overflow-hidden"
        style={{ 
          height: 'calc(100vh - 96px)',
          paddingTop: 'calc((100vh - 96px) * 0.35)',
          transform: `translateY(${-swipeDistance * 0.4}px)`,
          transition: swipeDistance === 0 ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
        }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
    >
      {/* 上滑提示和创建动画（可点击触发） */}
      {(swipeDistance > 0 || isCreatingNotebook) && (
        <button
          type="button"
          onClick={handleBottomHintClick}
          className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center transition-all duration-400 ease-out cursor-pointer select-none hover:scale-105 active:scale-95"
          style={{
            height: `${Math.max(swipeDistance, isCreatingNotebook ? 120 : 0)}px`,
            opacity: swipeDistance > 20 || isCreatingNotebook ? 1 : swipeDistance / 20
          }}
          aria-live="polite"
          aria-label="Create a new Notebook"
        >
          {!isCreatingNotebook ? (
            <>
              <div
                className="w-8 h-8 border-2 border-theme-600 rounded-full flex items-center justify-center transition-all duration-300 ease-out mb-2 animate-swipe-up"
                style={{
                  transform: `scale(${Math.min(swipeDistance / 70, 1.3)}) rotate(${swipeDistance * 2}deg)`,
                  backgroundColor: swipeDistance > 60 ? '#3b82f6' : 'transparent',
                  boxShadow: swipeDistance > 40 ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
                }}
              >
                <PlusCircle
                  className={`w-4 h-4 transition-colors duration-200 ${
                    swipeDistance > 60 ? 'text-white' : 'text-theme-600'
                  }`}
                />
              </div>
              <div className="text-theme-600 text-sm font-medium animate-fade-in transition-all duration-300">
                {swipeDistance > 60 ? '✨ 松开或点击创建新的 Notebook' : '👆 上滑 / 点击创建新的 Notebook（滚轮下滑也可触发）'}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-theme-600 rounded-full animate-spin border-t-transparent mb-2" />
              <div className="text-theme-600 text-sm">正在创建新的 Notebook...</div>
            </div>
          )}
        </button>
      )}

      <div className="w-full max-w-4xl mx-auto px-4 py-6 text-center transform transition-all duration-500 ease-out animate-swipe-up"
           style={{ 
             transform: `translateY(${-Math.min(swipeDistance * 0.2, 20)}px)`,
             marginTop: '0'
           }}>
        <Header />
        <AICommandInput files={files} setFiles={setFiles} />
      </div>
      </div>
    </>
  );
};

export default EmptyState;