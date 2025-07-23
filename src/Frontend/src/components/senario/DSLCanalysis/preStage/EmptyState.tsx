/**
 * EmptyState.jsx
 * 更新：CSV 文件上传后展示、VDS 模式下生成预设问题并自动填充，保持默认导出 EmptyState
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
  Upload,
  Sparkles,
  SendHorizontal,
  FileText,
  X,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { usePipelineStore, PIPELINE_STAGES } from '../store/pipelineController';
import usePreStageStore from '../store/preStageStore';
import { generalResponse } from '../stages/StageGeneralFunction';
import { useAIAgentStore, EVENT_TYPES } from '../../../../store/AIAgentStore';
import useStore from '../../../../store/notebookStore';
import useOperatorStore from '../../../../store/operatorStore';
import { createUserAskQuestionAction } from '../../../../store/actionCreators';
import useCodeStore from '../../../../store/codeStore';
import { notebookApiIntegration } from '../../../../services/notebookServices';
import { useAIPlanningContextStore } from '../store/aiPlanningContext';

/**
 * AI 和文件上传交互组件
 */
const AICommandInput = ({ files, setFiles }) => {
  const { t, i18n } = useTranslation();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVDSMode, setIsVDSMode] = useState(false);
  
  // 非VDS模式的预设问题 - 缩减到3个 - 使用useMemo避免重新创建
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
  
  const [presetQuestions, setPresetQuestions] = useState(defaultPresetQuestions);

  const { setStage } = usePipelineStore();
  const sendOperation = useOperatorStore((s) => s.sendOperation);
  const {
    addAction,
    setIsLoading,
    setActiveView,
    actions,
    qaList,
    addQA,
  } = useAIAgentStore();
  const { notebookId, viewMode, currentPhaseId, currentStepIndex, getCurrentViewCells, currentCellId, setIsRightSidebarCollapsed, setViewMode } = useStore();

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
  useEffect(() => adjustTextareaHeight(), [input, adjustTextareaHeight]);

  // 根据VDS模式状态动态显示预设问题
  useEffect(() => {
    if (!isVDSMode && files.length === 0) {
      // 如果不是VDS模式且没有文件，显示默认问题
      setPresetQuestions(defaultPresetQuestions);
    }
    // 如果是VDS模式，预设问题会通过文件上传或开关切换时设置
  }, [isVDSMode, files.length, defaultPresetQuestions]);


  // 处理上传 - 根据历史版本实现
  const handleFileChange = useCallback(async (e) => {
    console.log('=== File Upload Started ===');
    const selectedFiles = Array.from(e.target.files);
    console.log('Selected files count:', selectedFiles.length);
    console.log('Selected files:', selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
    if (!selectedFiles.length) {
      console.log('No files selected, aborting upload');
      return;
    }
    
    const csv = selectedFiles.find(f => /\.(csv|xlsx|xls)$/i.test(f.name));
    if (!csv) {
      console.log('No CSV/Excel file found in selection');
      alert('Please select a CSV or Excel file');
      return;
    }
    
    console.log('CSV file selected:', { name: csv.name, size: csv.size, type: csv.type });
    
    // Check file size against backend limit (10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB to match backend
    if (csv.size > maxSize) {
      console.error('File too large:', csv.size, 'bytes. Max allowed:', maxSize, 'bytes');
      alert(`File is too large. Maximum size allowed is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    const uploadConfig = {
      mode: 'unrestricted',
      allowedTypes: ['.csv', '.xlsx', '.xls','.jpg','.png','.jpeg','.gif','.pdf','.doc','.docx','.ppt','.pptx','.txt','.md'],
      maxFileSize: maxSize // Match backend limit
    };

    console.log('Upload config:', uploadConfig);
    console.log('Current Notebook ID:', notebookId);
    
    // 如果没有 notebookId，先创建一个
    let currentNotebookId = notebookId;
    if (!currentNotebookId) {
      console.log('No notebook ID available, creating new notebook...');
      try {
        currentNotebookId = await notebookApiIntegration.initializeNotebook();
        console.log('New notebook created with ID:', currentNotebookId);
        
        // 更新 store 中的 notebookId
        useStore.getState().setNotebookId(currentNotebookId);
        console.log('Notebook ID updated in store:', currentNotebookId);
        
        // 确保 codeStore 也标记为已初始化
        const codeStore = useCodeStore.getState();
        codeStore.setKernelReady(true);
        console.log('Kernel marked as ready in codeStore');
        
        // 验证 store 状态
        const updatedNotebookId = useStore.getState().notebookId;
        console.log('Verified notebook ID in store:', updatedNotebookId);
        
      } catch (initError) {
        console.error('Failed to create notebook:', initError);
        alert('Failed to create notebook. Please try again.');
        return;
      }
    }

    setIsUploading(true);
    
    try {
      console.log('Initializing kernel...');
      await useCodeStore.getState().initializeKernel();
      console.log('Kernel initialized successfully');
      
      console.log('Starting file upload...');
      const result = await notebookApiIntegration.uploadFiles(
        currentNotebookId,
        [csv],
        uploadConfig,
      );
      console.log('Upload result:', result);
      
      if (result && result.status === 'ok') {
        console.log('Upload successful! Files uploaded:', result.files);
        
        // 确保 notebookId 在上传成功后也是最新的
        if (currentNotebookId !== notebookId) {
          console.log('Updating notebookId after successful upload');
          useStore.getState().setNotebookId(currentNotebookId);
        }
        
        const newFiles = [{
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: csv.name,
          size: csv.size,
          type: csv.type,
          url: URL.createObjectURL(csv),
          file: csv
        }];
        setFiles(newFiles);
        console.log('Files added to state:', newFiles);
        
        // 记录初始化状态
        console.log('=== Post-upload state check ===');
        console.log('Current notebookId in component:', currentNotebookId);
        console.log('NotebookId in store:', useStore.getState().notebookId);
        console.log('CodeStore state:', useCodeStore.getState());
        
        // 设置当前文件到store
        console.log('Setting current file to store...');
        await usePreStageStore.getState().setCurrentFile(csv);
        await usePreStageStore.getState().setCsvFilePath(csv.name);
        console.log('File set to store successfully');
        
        // 启用VDS模式
        console.log('Enabling VDS mode...');
        setIsVDSMode(true);
        
        // 设置 VDS 预设问题
        console.log('Generating VDS preset questions...');
        setTimeout(async () => {
          try {
            const cols = usePreStageStore.getState().getFileColumns();
            const info = usePreStageStore.getState().getDatasetInfo();
            console.log('File columns:', cols);
            console.log('Dataset info:', info);
            
            const map = await generalResponse('generate_question_choice_map', { column_info: cols, dataset_info: info }, i18n.language);
            console.log('Generated question map:', map);
            
            if (map?.message) {
              usePreStageStore.getState().updateChoiceMap(map.message);
              // 设置VDS问题列表
              setPresetQuestions(map.message);
              // 填充第一个预设问题
              if (map.message.length) {
                setInput(map.message[0].problem_description);
              }
              console.log('VDS questions set successfully');
            }
          } catch (err) {
            console.error('Error generating preset questions:', err);
          }
        }, 1000);
      } else {
        console.error('Upload failed with result:', result);
        alert('Upload failed: ' + (result?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Upload error details:', err);
      console.error('Error stack:', err.stack);
      alert(t('emptyState.uploadError') || 'Upload failed: ' + err.message);
    } finally {
      console.log('Upload process finished, setting uploading to false');
      setIsUploading(false);
    }
  }, [notebookId, i18n.language, t, setFiles]);

  // 删除文件
  const removeFile = useCallback((fileId) => {
    setFiles(files => files.filter(file => file.id !== fileId));
    // 如果没有文件了，关闭VDS模式（useEffect会自动恢复默认预设问题）
    if (files.length <= 1) {
      setIsVDSMode(false);
    }
  }, [files.length]);

  // 点击上传按钮
  const onFileUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // VDS模式切换处理
  const handleVDSToggle = useCallback(async () => {
    const newVDSMode = !isVDSMode;
    setIsVDSMode(newVDSMode);
    
    if (!newVDSMode) {
      // 关闭VDS模式时显示默认预设问题
      setPresetQuestions(defaultPresetQuestions);
    } else {
      // 开启VDS模式时，如果有文件则使用已存储的VDS问题或重新生成
      if (files.length > 0) {
        const existingChoiceMap = usePreStageStore.getState().choiceMap;
        if (existingChoiceMap && existingChoiceMap.length > 0) {
          // 如果已经有VDS问题，直接使用
          setPresetQuestions(existingChoiceMap);
        } else {
          // 否则重新生成VDS相关问题
          try {
            const cols = usePreStageStore.getState().getFileColumns();
            const info = usePreStageStore.getState().getDatasetInfo();
            const map = await generalResponse('generate_question_choice_map', { column_info: cols, dataset_info: info }, i18n.language);
            if (map?.message) {
              usePreStageStore.getState().updateChoiceMap(map.message);
              setPresetQuestions(map.message);
            }
          } catch (err) {
            console.error('Error generating preset questions:', err);
            // 如果生成失败，至少设置一个空数组避免显示错误的问题
            setPresetQuestions([]);
          }
        }
      }
    }
  }, [isVDSMode, defaultPresetQuestions, files.length, i18n.language]);

  // 键盘事件处理
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSubmit(input.trim());
        setInput('');
      }
    }
  }, [input]);

  // 提交
  const handleSubmit = useCallback((command) => {
    if (!command) return;
    setIsLoading(true);
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      // 检查VDS模式 - 只有在VDS模式开启时才能跳转到problem define
      const hasCsv = files.length && files[0].name.match(/\.(csv|xlsx|xls)$/i);
      if (hasCsv && isVDSMode && command.trim()) {
        // 在跳转之前设置问题信息到store和规划上下文
        usePreStageStore.getState().setSelectedProblem(
          'vds',
          command.trim(),
          'VDS Analysis'
        );
        
        // 添加变量到规划上下文
        useAIPlanningContextStore.getState().addVariable('csv_file_path', files[0]?.name);
        useAIPlanningContextStore.getState().addVariable('problem_description', command.trim());
        useAIPlanningContextStore.getState().addVariable('problem_name', 'VDS Analysis');
        
        setStage(PIPELINE_STAGES.PROBLEM_DEFINE);
        return;
      }

      // 保留原有命令/QA逻辑
      if (command.startsWith('/')) {
        // Command 模式
        setActiveView('script');
        const commandId = `action-${Date.now()}`;
        const actionData = {
          id: commandId,
          type: EVENT_TYPES.USER_NEW_INSTRUCTION,
          timestamp,
          content: command,
          result: '',
          relatedQAIds: [],
          cellId: currentCellId,
          viewMode,
          onProcess: false,
          attachedFiles: files,
        };
        addAction(actionData);
        sendOperation(notebookId, {
          type: 'user_command',
          payload: {
            current_view_mode: viewMode,
            current_phase_id: currentPhaseId,
            current_step_index: currentStepIndex,
            content: command,
            commandId,
            files: files,
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
        addQA(qaData);
        const action = createUserAskQuestionAction(command, qaId, currentCellId, files);
        useAIAgentStore.getState().addAction(action);
        sendOperation(notebookId, {
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
            files: files
          }
        });
      }
      
      // 清空文件列表
      setFiles([]);
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [files, isVDSMode, setStage, setIsLoading, setActiveView, addAction, addQA, sendOperation, notebookId, currentCellId, viewMode, currentPhaseId, currentStepIndex, qaList, actions, getCurrentViewCells, setIsRightSidebarCollapsed, setFiles]);

  return (
    <div className="relative mb-6">
      {/* 输入框容器 */}
      <div
        className={`
          relative rounded-3xl transition-all duration-200
          border-0 margin-0 p-0
          ${isFocused ? 'shadow-lg' : 'shadow-sm'}
          ${input.startsWith('/') ? 'bg-slate-50' : 'bg-white'}
          focus:outline-none border-2 transition-all duration-200
          ${isFocused ? 'border-theme-400' : 'border-gray-200'}
          ${input.startsWith('/') ? 'font-mono' : 'font-normal'}
        `}
      >
        {/* 左侧图标 */}
        <div className="absolute left-0 top-7 -translate-y-1/2 px-3">
          <Sparkles
            className={`
              w-5 h-5 transition-colors duration-200
              ${input.startsWith('/') ? 'text-blue-600' : 'text-theme-600'}
            `}
          />
        </div>

        <button
          type="button"
          onClick={onFileUpload}
          disabled={isUploading}
          className={`
            absolute left-10 top-7 -translate-y-1/2
            flex items-center justify-center px-2 py-1.5 rounded-full
            transition-all duration-200
            ${isUploading 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer'}
          `}
        >
          <Upload className="w-4 h-4" />
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
              : input.startsWith('/')
                ? t('emptyState.commandPlaceholder')
                : t('emptyState.questionPlaceholder')
          }
          className={`
            w-full h-full pl-20 pr-36 py-3 pt-4 rounded-3xl
            text-base placeholder:text-gray-400
            resize-none leading-6
            focus:outline-none focus:ring-0
          `}
          rows={1}
          style={{
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
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
            transition-all duration-200 text-sm font-medium
            ${input.trim()
              ? 'bg-theme-600 hover:bg-theme-700 text-white cursor-pointer'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
          `}
        >
          <SendHorizontal className="w-4 h-4" />
          {input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
        </button>

        {/* VDS模式切换开关 - 只有上传文件后才显示 */}
        {files.length > 0 && (
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">VDS Agents</span>
            <button
              onClick={handleVDSToggle}
              className={`
                relative inline-flex h-4 w-7 items-center rounded-full transition-colors
                ${isVDSMode ? 'bg-theme-600' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  inline-block h-3 w-3 transform rounded-full bg-white transition-transform
                  ${isVDSMode ? 'translate-x-3.5' : 'translate-x-0.5'}
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
          <div className="pl-2 mb-2 flex flex-wrap gap-2">
            {files.map(file => (
              <div 
                key={file.id} 
                className="flex items-center gap-1.5 bg-gray-100 rounded-3xl px-3 py-1.5 text-sm"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="truncate max-w-xs">{file.name}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
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
        <div className="mt-2 ml-10">
          <div
            className={`
              ${isVDSMode ? 'text-theme-600' : input.startsWith('/') ? 'text-blue-600' : 'text-theme-600'}
            `}
          >
            {isVDSMode 
              ? `🤖 VDS Agents Mode`
              : input.startsWith('/') 
                ? `⌘ ${t('emptyState.commandMode')}` 
                : `💭 ${t('emptyState.questionMode')}`
            }
          </div>
        </div>
      )}

      {/* 预设问题展示 */}
      {presetQuestions.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presetQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setInput(q.problem_description)}
              className="p-3 text-left bg-gray-50 hover:bg-gray-100 border rounded-xl transition-all group"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-gray-800 text-sm truncate">{q.problem_name}</span>
                <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// TypingTitle 组件 - 恢复原来的样式
const TypingTitle = () => {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [isTypingDone, setIsTypingDone] = useState(false);
    const [showCursor, setShowCursor] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const typingSpeed = 35;
    const deletingSpeed = 20;

    const startTyping = useCallback((fullText) => {
        setIsDeleting(false);
        let index = 0;
        const interval = setInterval(() => {
            setText(fullText.slice(0, index + 1));
            index++;
            if (index === fullText.length) {
                clearInterval(interval);
                setIsTypingDone(true);
                // Hide cursor after 2 seconds of completion
                setTimeout(() => {
                    setShowCursor(false);
                }, 2000);
            }
        }, typingSpeed);

        return () => clearInterval(interval);
    }, []);

    const deleteText = useCallback((onComplete) => {
        setIsDeleting(true);
        setIsTypingDone(false);
        setShowCursor(true);

        let index = text.length;
        const interval = setInterval(() => {
            setText(prev => prev.slice(0, index - 1));
            index--;
            if (index === 0) {
                clearInterval(interval);
                onComplete();
            }
        }, deletingSpeed);

        return () => clearInterval(interval);
    }, [text.length]);

    // Function to change text with deletion animation
    const changeText = useCallback((newText) => {
        deleteText(() => {
            startTyping(newText);
        });
    }, [deleteText, startTyping]);

    useEffect(() => {
        const cleanup = startTyping(t('emptyState.title'));
        return () => cleanup();
    }, [startTyping, t]);

    // Expose changeText method to parent
    useEffect(() => {
        if (window) {
            window.changeTypingText = changeText;
        }
        return () => {
            if (window) {
                delete window.changeTypingText;
            }
        };
    }, [changeText]);

    return (
        <div className="relative">
            <style>
                {`
                @keyframes typing-cursor {
                    0%, 100% { 
                        transform: scaleY(1) scaleX(1);
                        opacity: 0.9;
                    }
                    50% { 
                        transform: scaleY(0.7) scaleX(1.2);
                        opacity: 0.7;
                    }
                }
                @keyframes done-cursor {
                    0%, 49% { 
                        opacity: 1;
                    }
                    50%, 100% { 
                        opacity: 0;
                    }
                }
                @keyframes deleting-cursor {
                    0%, 100% { 
                        transform: scaleY(1) scaleX(1);
                        opacity: 1;
                    }
                    50% { 
                        transform: scaleY(0.7) scaleX(1.2);
                        opacity: 0.7;
                    }
                }
                .cursor-typing {
                    background: #f3f4f6;
                    animation: typing-cursor ${typingSpeed * 2}ms ease-in-out infinite;
                }
                .cursor-done {
                    background: #f3f4f6;
                    animation: done-cursor 1.2s steps(1) infinite;
                }
                .cursor-deleting {
                    background: #f3f4f6;
                    animation: deleting-cursor ${deletingSpeed * 2}ms ease-in-out infinite;
                }
                .title-container {
                    display: inline;
                    position: relative;
                }
                .cursor {
                    display: inline-block;
                    position: relative;
                    vertical-align: text-top;
                    margin-left: 3px;
                    margin-top: 5px;
                }
                `}
            </style>
            <div className="title-container">
                <span className="text-4xl font-bold mb-4 leading-tight theme-grad-text">
                    {text}
                    {showCursor && (
                        <div
                            className={`cursor w-1 h-8 rounded-sm inline-block ${isDeleting
                                ? 'cursor-deleting'
                                : isTypingDone
                                    ? 'cursor-done'
                                    : 'cursor-typing'
                                }`}
                        />
                    )}
                </span>
            </div>
        </div>
    );
};

const Divider = () => {
    const { t } = useTranslation();
    return (
        <div className="relative mb-4 max-w-lg mx-auto">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
                <span className="px-8 text-base text-gray-400 bg-white">
                    {t('emptyState.orStartScratch')}
                </span>
            </div>
        </div>
    );
};

const ActionButton = ({ onClick, children, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-3 px-6 py-3 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-theme-700'} rounded-full transition-all duration-200 text-lg`}
    >
        <PlusCircle size={24} />
        {children}
    </button>
);

/**
 * 页头：标题和副标题
 */
const Header = () => (
    <div className="text-center mb-8 flex flex-col items-center justify-center">
        <TypingTitle />
    </div>
);

/**
 * EmptyState 主组件
 */
const EmptyState = ({ onAddCell, onFileUpload }) => {
    const { t } = useTranslation();
    const [files, setFiles] = useState([]);

    return (
        <div
            className="relative flex flex-col items-center justify-center"
            style={{ height: "calc(100vh - 96px)" }}
        >
            <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
                <Header />
                
                <AICommandInput files={files} setFiles={setFiles} />
                
                <Divider />
                
                <div className="flex justify-center gap-6">
                    <ActionButton onClick={() => onAddCell('markdown')}>
                        {t('emptyState.addText') || 'Add Text'}
                    </ActionButton>
                    <ActionButton onClick={() => onAddCell('code')}>
                        {t('emptyState.addCode') || 'Add Code'}
                    </ActionButton>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;