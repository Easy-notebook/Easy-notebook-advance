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

const AICommandInput = () => {
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
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleSubmit = useCallback(
        (command) => {
            try {
                setIsLoading(true);
                const timestamp = new Date().toLocaleTimeString();

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
                        input.startsWith('/')
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
                            ${input.startsWith('/') ? 'text-blue-600' : 'text-theme-600'}
                        `}
                    >
                        {input.startsWith('/') ? `⌘ ${t('emptyState.commandMode')}` : `💭 ${t('emptyState.questionMode')}`}
                    </div>
                </div>
            )}
        </div>
    );
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
                uploadConfig,
                abortControllerRef.current.signal
            );

            if (result && result.status === 'ok') {
                await usePreStageStore.getState().setCurrentFile(file);
                await usePreStageStore.getState().setCsvFilePath(file.name);
                await useAIPlanningContextStore.getState().resetAIPlanningContext();
                await useAIPlanningContextStore.getState().addVariable('csv_file_path', file.name);
                await setPreProblem();
                onFileUpload(file, result);
                setViewMode('dslc');
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
                    <div>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        {t('emptyState.uploading')}
                    </div>
                    : < div >
                        {/* <UploadSection
                            onFileUpload={handleFileUpload}
                            isUploading={isUploading}
                        /> */}
                        <AICommandInput />

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