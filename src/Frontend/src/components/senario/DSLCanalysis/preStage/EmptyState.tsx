/**
 * EmptyState.jsx
 */

import {
    useState,
    useEffect,
    useRef,
    useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import {
    Upload,
    Sparkles,
    SendHorizontal,
    PlusCircle,
    Loader,
    FileText,
    X,
    ArrowRight,
} from 'lucide-react';
import { useAIPlanningContextStore } from '../store/aiPlanningContext'

import { useAIAgentStore, EVENT_TYPES } from '../../../../store/AIAgentStore';
import useStore from '../../../../store/notebookStore';
import useOperatorStore from '../../../../store/operatorStore';
import { createUserAskQuestionAction } from '../../../../store/actionCreators';
import useCodeStore from '../../../../store/codeStore';
import { notebookApiIntegration } from '../../../../services/notebookServices';
import usePreStageStore from '../store/preStageStore';
import { generalResponse } from '../stages/StageGeneralFunction';

const AICommandInput = ({ files, setFiles }) => {
    const { t } = useTranslation();
    // 这里根据自己的 store 改成正确的引入
    const {
        addAction,
        setIsLoading,
        setActiveView,
        actions,
        qaList,
        addQA,
    } = useAIAgentStore();
    
    const isUploading = usePreStageStore(state => state.isUploading);
    const {
        currentCellId,
        viewMode,
        currentPhaseId,
        currentStepIndex,
        notebookId,
        getCurrentViewCells,
        setIsRightSidebarCollapsed,
    } = useStore();

    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleSubmit = useCallback(
        (command) => {
            try {
                setIsLoading(true);
                const timestamp = new Date().toLocaleTimeString();

                // 检查是否有CSV文件
                const hasCsvFile = files.some(file => 
                    file.name.toLowerCase().endsWith('.csv') || 
                    file.name.toLowerCase().endsWith('.xlsx') || 
                    file.name.toLowerCase().endsWith('.xls')
                );

                if (hasCsvFile) {
                    // 如果有CSV文件，进入VDS数据分析模式
                    setActiveView('qa');
                    const qaId = `qa-${uuidv4()}`;
                    const qaData = {
                        id: qaId,
                        type: 'user',
                        timestamp,
                        content: `VDS数据分析模式：${command}`,
                        resolved: false,
                        relatedActionId: null,
                        cellId: currentCellId,
                        viewMode: 'vds', // 设置为VDS模式
                        onProcess: true,
                        attachedFiles: files,
                    };
                    addQA(qaData);

                    const action = createUserAskQuestionAction(`VDS数据分析：${command}`, qaId, currentCellId, files);
                    useAIAgentStore.getState().addAction(action);

                    useOperatorStore.getState().sendOperation(notebookId, {
                        type: 'vds_data_analysis',
                        payload: {
                            content: command,
                            QId: [qaId],
                            current_view_mode: 'vds',
                            current_phase_id: currentPhaseId,
                            current_step_index: currentStepIndex,
                            related_qas: qaList,
                            related_actions: actions,
                            related_cells: getCurrentViewCells(),
                            files: files,
                            analysis_mode: 'vds'
                        },
                    });
                } else if (command.startsWith('/')) {
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
                        attachedFiles: files, // 添加附件信息
                    };
                    addAction(actionData);

                    useOperatorStore.getState().sendOperation(notebookId, {
                        type: 'user_command',
                        payload: {
                            current_view_mode: viewMode,
                            current_phase_id: currentPhaseId,
                            current_step_index: currentStepIndex,
                            content: command,
                            commandId,
                            files: files, // 发送文件信息
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
                        attachedFiles: files, // 添加附件信息
                    };
                    addQA(qaData);

                    const action = createUserAskQuestionAction(command, qaId, currentCellId, files);
                    useAIAgentStore.getState().addAction(action);

                    useOperatorStore.getState().sendOperation(notebookId, {
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
                            files: files, // 发送文件信息
                        },
                    });
                }
                
                // 清空文件列表
                setFiles([]);
            } catch (error) {
                console.error('Error in handleSubmit:', error);
            } finally {
                setTimeout(() => setIsLoading(false), 500);
            }
        },
        [
            notebookId,
            viewMode,
            currentPhaseId,
            currentStepIndex,
            currentCellId,
            addAction,
            addQA,
            qaList,
            actions,
            setIsLoading,
            setIsRightSidebarCollapsed,
            setActiveView,
            getCurrentViewCells,
            files,
        ]
    );

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim()) {
                    handleSubmit(input.trim());
                    setInput('');
                }
            }
        },
        [handleSubmit, input]
    );

    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // 先重置高度，让后续 scrollHeight 计算更准确
        textarea.style.height = 'auto';

        // 你在 Tailwind 里用了 leading-6，约等于 24px
        const lineHeight = 24;
        const maxHeight = lineHeight * 4; // 最多 4 行
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, []);

    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    const onFileUpload = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        const uploadConfig = {
            mode: 'unrestricted',
            allowedTypes: ['.csv', '.xlsx', '.xls','.jpg','.png','.jpeg','.gif','.pdf','.doc','.docx','.ppt','.pptx','.txt','.md'],
            maxFileSize: 100 * 1024 * 1024 // 10MB
        };

        setIsUploading(true);
        useCodeStore.getState().initializeKernel();
        const result = notebookApiIntegration.uploadFiles(
            useStore.getState().notebookId,
            selectedFiles,
            uploadConfig,
        );
        if (result) {
            const newFiles = selectedFiles.map(file => ({
                id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file), // 实际应用中应该是服务器返回的URL
                file
            }));
            setFiles(prev => [...prev, ...newFiles]);
        }
        setIsUploading(false);
        // // 清空input，以便可以重复上传同一个文件
        // e.target.value = null;
        // }, 1000);
    }, []);

    const removeFile = useCallback((fileId) => {
        setFiles(files => files.filter(file => file.id !== fileId));
    }, []);

    return (
        <div className="relative mb-6 max-w-4xl mx-auto px-4 sm:px-0">
            {/* 已上传文件列表 */}
            {files.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {files.map(file => (
                        <div 
                            key={file.id} 
                            className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        >
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="truncate max-w-[200px] sm:max-w-xs text-gray-700">{file.name}</span>
                            <button
                                onClick={() => removeFile(file.id)}
                                className="ml-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300 rounded"
                                aria-label={`Remove ${file.name}`}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* 输入框容器 */}
            <div
                className={`
                    relative rounded-2xl transition-all duration-300 ease-out
                    bg-white border shadow-sm overflow-hidden
                    ${isFocused 
                        ? 'shadow-lg border-gray-300 ring-1 ring-gray-200 scale-[1.02]' 
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }
                    ${input.startsWith('/') ? 'bg-blue-50/50 border-blue-200' : 'bg-white'}
                `}
            >
                {/* 左侧工具栏 */}
                <div className="absolute left-3 sm:left-4 bottom-3 sm:bottom-4 flex items-center gap-2">
                    {/* AI图标 */}
                    <div className="flex items-center justify-center" aria-hidden="true">
                        <Sparkles
                            className={`
                                w-5 h-5 transition-all duration-300
                                ${input.startsWith('/') 
                                    ? 'text-blue-500 animate-pulse' 
                                    : isFocused 
                                        ? 'text-gray-600' 
                                        : 'text-gray-400'
                                }
                            `}
                        />
                    </div>

                    {/* 上传按钮 */}
                    <button
                        type="button"
                        onClick={onFileUpload}
                        disabled={isUploading}
                        className={`
                            flex items-center justify-center w-8 h-8 rounded-lg
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-gray-300
                            ${isUploading 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700 cursor-pointer'}
                        `}
                        aria-label="Upload files"
                    >
                        {isUploading ? (
                            <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Upload className="w-4 h-4" aria-hidden="true" />
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            multiple
                            accept=".csv,.xlsx,.xls,.jpg,.png,.jpeg,.gif,.pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                            aria-label="Upload files"
                        />
                    </button>
                </div>

                {/* 文本输入区域 */}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={
                        files.some(file => 
                            file.name.toLowerCase().endsWith('.csv') || 
                            file.name.toLowerCase().endsWith('.xlsx') || 
                            file.name.toLowerCase().endsWith('.xls')
                        )
                            ? 'VDS数据分析模式 - 描述你想对数据进行的分析...'
                            : input.startsWith('/')
                                ? t('emptyState.commandPlaceholder')
                                : t('emptyState.questionPlaceholder')
                    }
                    className={`
                        w-full pl-14 sm:pl-16 pr-12 sm:pr-16 py-4 bg-transparent
                        text-base placeholder:text-gray-400
                        resize-none leading-6 min-h-[56px]
                        focus:outline-none focus:ring-0 border-0
                        ${input.startsWith('/') ? 'font-mono' : 'font-normal'}
                    `}
                    rows={1}
                    style={{
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                    }}
                    aria-label={
                        input.startsWith('/') 
                            ? 'Command input' 
                            : 'Message input'
                    }
                />

                {/* 右侧发送按钮 */}
                <div className="absolute right-3 sm:right-4 bottom-3 sm:bottom-4">
                    <button
                        type="submit"
                        onClick={() => {
                            if (input.trim()) {
                                handleSubmit(input.trim());
                                setInput('');
                            }
                        }}
                        disabled={!input.trim()}
                        className={`
                            flex items-center justify-center w-8 h-8 rounded-lg
                            transition-all duration-200
                            focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${input.trim()
                                ? 'bg-gray-900 hover:bg-gray-800 text-white cursor-pointer transform hover:scale-105 focus:ring-gray-500'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed focus:ring-gray-300'}
                        `}
                        aria-label={input.startsWith('/') ? t('emptyState.executeBtnText') : t('emptyState.askBtnText')}
                    >
                        <SendHorizontal className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Shift + Enter 提示 */}
                {isFocused && (
                    <div className="absolute -top-8 right-4 text-xs text-gray-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                        {t('emptyState.pressShiftEnter')}
                    </div>
                )}
            </div>
            

            {/* 模式提示 */}
            {input && (
                <div className="mt-3 flex items-center justify-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div
                        className={`
                            text-xs px-3 py-1 rounded-full border transition-all duration-300
                            ${files.some(file => 
                                file.name.toLowerCase().endsWith('.csv') || 
                                file.name.toLowerCase().endsWith('.xlsx') || 
                                file.name.toLowerCase().endsWith('.xls')
                            )
                                ? 'text-green-600 bg-green-50 border-green-200 shadow-sm'
                                : input.startsWith('/') 
                                    ? 'text-blue-600 bg-blue-50 border-blue-200 shadow-sm' 
                                    : 'text-gray-600 bg-gray-50 border-gray-200'}
                        `}
                    >
                        {files.some(file => 
                            file.name.toLowerCase().endsWith('.csv') || 
                            file.name.toLowerCase().endsWith('.xlsx') || 
                            file.name.toLowerCase().endsWith('.xls')
                        ) 
                            ? `📊 VDS数据分析模式` 
                            : input.startsWith('/') 
                                ? `⌘ ${t('emptyState.commandMode')}` 
                                : `💭 ${t('emptyState.questionMode')}`
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * 问题建议选择组件
 */
const ProblemSuggestionPanel = ({ 
    onSelectProblem, 
    onCustomProblem, 
    onConfirmProblem,
    selectedProblem,
    customProblem,
    setCustomProblem,
    datasetBackground,
    setDatasetBackground,
    showBackgroundInput,
    setShowBackgroundInput,
    setShowProblemSuggestions
}) => {
    const { t } = useTranslation();
    const choiceMap = usePreStageStore(state => state.choiceMap);
    const currentFile = usePreStageStore(state => state.currentFile);
    
    const [step, setStep] = useState('select'); // 'select', 'background', 'confirm'
    
    const handleProblemSelect = (problem) => {
        onSelectProblem(problem);
        setStep('background');
    };
    
    const handleCustomSubmit = () => {
        if (customProblem.trim()) {
            onCustomProblem(customProblem.trim());
            setStep('background');
        }
    };
    
    const handleBackgroundSubmit = () => {
        setStep('confirm');
    };
    
    const handleFinalConfirm = () => {
        onConfirmProblem();
    };
    
    if (step === 'select') {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => setShowProblemSuggestions(false)}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <ArrowRight className="w-4 h-4 rotate-180" />
                            {t('emptyState.backToMain')}
                        </button>
                        <div></div> {/* 占位符保持居中 */}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {t('emptyState.chooseAnalysisType')}
                    </h2>
                    <p className="text-gray-600">
                        {t('emptyState.fileUploaded')} <span className="font-medium">{currentFile?.name}</span>
                    </p>
                </div>
                
                {/* 建议问题列表 */}
                <div className="grid gap-4 mb-8">
                    {choiceMap.map((choice, index) => (
                        <button
                            key={index}
                            onClick={() => handleProblemSelect(choice)}
                            className="group p-6 bg-white border-2 border-gray-200 rounded-2xl text-left hover:border-blue-300 hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Sparkles className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-800 mb-2">
                                        {choice.problem_name}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        {choice.problem_description}
                                    </p>
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
                
                {/* 自定义问题输入 */}
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6">
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <PlusCircle className="w-5 h-5" />
                        {t('emptyState.customProblem')}
                    </h3>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={customProblem}
                            onChange={(e) => setCustomProblem(e.target.value)}
                            placeholder={t('emptyState.customProblemPlaceholder')}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                        />
                        <button
                            onClick={handleCustomSubmit}
                            disabled={!customProblem.trim()}
                            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                                customProblem.trim()
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {t('emptyState.confirm')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    if (step === 'background') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {t('emptyState.addDatasetBackground')}
                    </h2>
                    <p className="text-gray-600">
                        {t('emptyState.backgroundOptional')}
                    </p>
                </div>
                
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-6">
                    <textarea
                        value={datasetBackground}
                        onChange={(e) => setDatasetBackground(e.target.value)}
                        placeholder={t('emptyState.backgroundPlaceholder')}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 resize-none h-32 transition-colors"
                    />
                </div>
                
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={handleBackgroundSubmit}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                        {t('emptyState.skip')}
                    </button>
                    <button
                        onClick={handleBackgroundSubmit}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors transform hover:scale-105"
                    >
                        {t('emptyState.continue')}
                    </button>
                </div>
            </div>
        );
    }
    
    if (step === 'confirm') {
        const problemText = selectedProblem 
            ? `${selectedProblem.problem_name}: ${selectedProblem.problem_description}`
            : customProblem;
            
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                        {t('emptyState.confirmProblem')}
                    </h2>
                    <p className="text-gray-600">
                        {t('emptyState.reviewSettings')}
                    </p>
                </div>
                
                <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 mb-8 space-y-4">
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">{t('emptyState.analysisType')}</h4>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{problemText}</p>
                    </div>
                    
                    <div>
                        <h4 className="font-semibold text-gray-800 mb-2">{t('emptyState.dataFile')}</h4>
                        <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{currentFile?.name}</p>
                    </div>
                    
                    {datasetBackground && (
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">{t('emptyState.datasetBackground')}</h4>
                            <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{datasetBackground}</p>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={() => setStep('select')}
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                    >
                        {t('emptyState.goBack')}
                    </button>
                    <button
                        onClick={handleFinalConfirm}
                        className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors transform hover:scale-105 flex items-center gap-2"
                    >
                        <Sparkles className="w-5 h-5" />
                        {t('emptyState.startAnalysis')}
                    </button>
                </div>
            </div>
        );
    }
    
    return null;
};

/**
 * 拖拽悬浮提示组件
 */
export const DragOverlay = () => {
    const { t } = useTranslation();
    return (
    <div className="fixed inset-0 bg-theme-50 bg-opacity-90 flex items-center justify-center z-50 pointer-events-none">
        <div className="text-center">
            <Upload className="w-16 h-16 text-theme-700 mx-auto mb-4 animate-bounce" />
            <p className="text-xl font-medium text-theme-700">
                {t('emptyState.dragDropHint')}
            </p>
        </div>
    </div>
)};

// 文件上传进度组件
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

/**
 * 页头：标题和副标题
 */
export const Header = () => (
    <div className="text-center mb-8 flex flex-col items-center justify-center">
        <TypingTitle />
        {/* <p className="text-gray-600 text-xl">
            AI-Assisted Data Analysis, Just Like Taking Notes
        </p> */}
    </div>
);

/**
 * 上传区域
 */
export const UploadSection = ({ onFileUpload, isUploading }) => {
    const { t } = useTranslation();
    return (
    <div className="flex justify-center items-start gap-8 mb-12">
        <div>
            <button
                onClick={onFileUpload}
                disabled={isUploading}
                className={`px-8 py-3 ${isUploading ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-theme-700 hover:text-white hover:bg-theme-700 border-2 border-theme-700'} rounded-lg transition-all duration-200 font-medium text-lg flex items-center justify-center`}
            >
                {isUploading ? (
                    <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        {t('emptyState.uploading')}
                    </>
                ) : (
                    t('emptyState.selectDataFile')
                )}
            </button>
        </div>
    </div>
)};

/**
 * 分割线
 */
export const Divider = () => {
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
)};

/**
 * 操作按钮
 */
export const ActionButton = ({ onClick, children, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-3 px-6 py-3 ${disabled ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-theme-700'} rounded-full transition-all duration-200 text-lg`}
    >
        <PlusCircle size={24} />
        {children}
    </button>
);

export const UploadButton = ({ onFileUpload, isUploading }) => {
    const { t } = useTranslation();
    return (
    <button
        onClick={onFileUpload}
        disabled={isUploading}
        className={`flex items-center gap-3 px-6 py-3 ${isUploading ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-theme-700'} rounded-full transition-all duration-200 text-lg`}
    >
        <Upload className="w-6 h-6" />
        {t('emptyState.uploadCSV')}
    </button>
)};

/**
 * 底部提示
 */
export const Footer = () => {
    const { t } = useTranslation();
    return (
    <div className="mt-16 text-gray-400">
        <p className="text-base leading-relaxed">
            {t('emptyState.analysisDisplay')}
        </p>
    </div>
)};

/**
 * 空状态主组件
 * 负责组合以上组件，并处理拖拽上传逻辑
 */
const EmptyState = ({ onAddCell, onFileUpload }) => {
    const { t, i18n } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [dragCounter, setDragCounter] = useState(0);
    const [showProblemSuggestions, setShowProblemSuggestions] = useState(false);
    const [selectedProblem, setSelectedProblem] = useState(null);
    const [customProblem, setCustomProblem] = useState('');
    const [datasetBackground, setDatasetBackground] = useState('');
    const [showBackgroundInput, setShowBackgroundInput] = useState(false);
    const [files, setFiles] = useState([]);
    const { setViewMode } = useStore();
    const abortControllerRef = useRef(new AbortController());
    const isUploading = usePreStageStore(state => state.isUploading);


    const setPreProblem = useCallback(async () => {
        const fileColumns = usePreStageStore.getState().getFileColumns();
        const datasetInfo = usePreStageStore.getState().getDatasetInfo();
        const choiceMap = await generalResponse(
            "generate_question_choice_map",
            {
                "column_info": fileColumns,
                "dataset_info": datasetInfo
            },
            i18n.language
        );
        // console.log("choiceMap", choiceMap);
        usePreStageStore.getState().updateChoiceMap(choiceMap["message"]);
    }, [i18n.language]);

    const handleProblemSelect = useCallback((problem) => {
        setSelectedProblem(problem);
        usePreStageStore.getState().setSelectedProblem(
            problem.target,
            problem.problem_description,
            problem.problem_name
        );
    }, []);

    const handleCustomProblem = useCallback((problemText) => {
        setCustomProblem(problemText);
        usePreStageStore.getState().setSelectedProblem(
            'custom',
            problemText,
            'Custom Analysis'
        );
    }, []);

    const handleConfirmProblem = useCallback(() => {
        const currentFile = usePreStageStore.getState().currentFile;
        const problem_description = usePreStageStore.getState().problem_description;
        const problem_name = usePreStageStore.getState().problem_name;
        
        // 添加变量到规划上下文
        useAIPlanningContextStore.getState().addVariable('csv_file_path', currentFile?.name);
        useAIPlanningContextStore.getState().addVariable('problem_description', problem_description);
        useAIPlanningContextStore.getState().addVariable('context_description', datasetBackground);
        useAIPlanningContextStore.getState().addVariable('problem_name', problem_name);
        
        // 设置背景信息到store
        if (datasetBackground) {
            usePreStageStore.getState().setDatasetInfo(datasetBackground);
        }
        
        // 跳转到DSLC模式
        setViewMode('dslc');
        onFileUpload(currentFile, { status: 'ok' });
    }, [datasetBackground, setViewMode, onFileUpload]);

    const handleFileUploadProcess = useCallback(async (file) => {
        if (!file || isUploading) return;
        
        await usePreStageStore.getState().setCurrentFile(file);
        await usePreStageStore.getState().changeIsUploading();

        abortControllerRef.current = new AbortController();

        try {
            const uploadConfig = {
                mode: 'unrestricted',
                allowedTypes: ['.csv', '.xlsx', '.xls'],
                maxFileSize: 100 * 1024 * 1024 // 100MB
            };
            await useCodeStore.getState().initializeKernel();
            
            const result = await notebookApiIntegration.uploadFiles(
                useStore.getState().notebookId,
                [file],
                uploadConfig
            );

            if (result && result.status === 'ok') {
                await usePreStageStore.getState().setCurrentFile(file);
                await usePreStageStore.getState().setCsvFilePath(file.name);
                await useAIPlanningContextStore.getState().resetAIPlanningContext();
                await useAIPlanningContextStore.getState().addVariable('csv_file_path', file.name);
                
                // 添加文件到显示列表
                const newFile = {
                    id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    url: URL.createObjectURL(file),
                    file
                };
                setFiles(prev => [...prev, newFile]);
                
                await setPreProblem();
                setShowProblemSuggestions(true);
                // onFileUpload(file, result);
                // setViewMode('dslc');
            } else {
                console.error('Upload failed with result:', result);
                alert('File upload failed, please try again');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('An error occurred during file upload');
        } finally {
            usePreStageStore.getState().changeIsUploading();
        }
    }, [onFileUpload, setViewMode, setPreProblem, isUploading]);
    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragCounter((prev) => prev + 1);
            if (e.dataTransfer.items?.length > 0) {
                setIsDragging(true);
            }
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragCounter((prev) => prev - 1);
            if (dragCounter === 1) {
                setIsDragging(false);
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            setDragCounter(0);

            const files = Array.from(e.dataTransfer.files);
            const validExtensions = ['.xlsx', '.xls', '.csv'];
            const validFiles = files.filter((file) =>
                validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
            );

            if (validFiles.length > 0) {
                console.log('Valid files dropped:', validFiles);
                // 处理文件上传逻辑
                handleFileUploadProcess(validFiles[0]);
            }
        };

        window.addEventListener('dragenter', handleDragEnter);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragenter', handleDragEnter);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
        };
    }, [dragCounter, onFileUpload, setViewMode, handleFileUploadProcess]);

    /**
     * 手动选择文件
     */
    const handleFileUpload = () => {
        if (isUploading) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.xlsx,.xls';
        input.click();
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                // console.log('File selected:', file);
                handleFileUploadProcess(file);
            }
        };
    };

    return (
        <div
            className="relative flex flex-col items-center justify-center"
            style={{ height: "calc(100vh - 96px)" }}
        >
            {/* 拖拽悬浮提示 */}
            {isDragging && <DragOverlay />}

            <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
                <Header />

                {isUploading ?
                    <div className="flex items-center justify-center">
                        <Loader className="w-6 h-6 mr-3 animate-spin text-blue-600" />
                        <span className="text-gray-700 text-lg">
                            {t('emptyState.uploading')}
                        </span>
                    </div>
                    : showProblemSuggestions ?
                        <ProblemSuggestionPanel
                            onSelectProblem={handleProblemSelect}
                            onCustomProblem={handleCustomProblem}
                            onConfirmProblem={handleConfirmProblem}
                            selectedProblem={selectedProblem}
                            customProblem={customProblem}
                            setCustomProblem={setCustomProblem}
                            datasetBackground={datasetBackground}
                            setDatasetBackground={setDatasetBackground}
                            showBackgroundInput={showBackgroundInput}
                            setShowBackgroundInput={setShowBackgroundInput}
                            setShowProblemSuggestions={setShowProblemSuggestions}
                        />
                    : <div>
                        <AICommandInput files={files} setFiles={setFiles} />

                        <Divider />

                        <div className="flex justify-center gap-6">
                            <ActionButton
                                onClick={() => onAddCell('markdown')}
                                disabled={isUploading}
                            >
                                {t('emptyState.addText')}
                            </ActionButton>
                            <ActionButton
                                onClick={() => onAddCell('code')}
                                disabled={isUploading}
                            >
                                {t('emptyState.addCode')}
                            </ActionButton>
                            <UploadButton
                                onFileUpload={handleFileUpload}
                                isUploading={isUploading}
                            />
                        </div>
                    </div>
                }
                {/* <Footer /> */}
            </div>
        </div >
    );
};

export default EmptyState;