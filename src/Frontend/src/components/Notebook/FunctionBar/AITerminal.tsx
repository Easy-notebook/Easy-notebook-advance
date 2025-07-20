import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAIAgentStore, EVENT_TYPES } from '../../../store/AIAgentStore';
import useStore from '../../../store/notebookStore';
import useOperatorStore from '../../../store/operatorStore';
import {
    createUserAskQuestionAction,
} from '../../../store/actionCreators';
import { Command } from 'lucide-react';

const CommandInput: React.FC = () => {
    const {
        showCommandInput,
        setShowCommandInput,
        addAction,
        setIsLoading,
        setActiveView,
        actions,
        qaList,
        addQA
    } = useAIAgentStore();

    const {
        currentCellId,
        viewMode,
        currentPhaseId,
        currentStepIndex,
        notebookId,
        getCurrentStepCellsIDs,
        getCurrentViewCells,
        setIsRightSidebarCollapsed
    } = useStore();

    const [input, setInput] = useState('');
    const modalRef = useRef(null);
    const textareaRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    // 动态调整文本框高度
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // 重置高度以获取正确的scrollHeight
        textarea.style.height = 'auto';

        // 计算行数（hypothesis每行20px）
        const lineHeight = 24; // 基础行高
        const maxHeight = lineHeight * 4; // 4行的最大高度
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, []);

    // Filter actions based on view mode
    const actionsToShow = useMemo(() => {
        if (!viewMode) return [];

        return actions.filter(action => {
            const isStepMode = viewMode === 'step';
            const isCompleteMode = viewMode === 'complete';

            return (isStepMode && action.viewMode === viewMode &&
                getCurrentStepCellsIDs().includes(action.cellId)) ||
                (isCompleteMode && action.viewMode === viewMode);
        });
    }, [actions, viewMode, getCurrentStepCellsIDs]);

    // Filter QAs based on view mode
    const qasToShow = useMemo(() => {
        if (!viewMode) return [];

        return qaList.filter(qa => {
            const isStepMode = viewMode === 'step';
            const isCompleteMode = viewMode === 'complete';

            return (isStepMode && qa.viewMode === viewMode &&
                getCurrentStepCellsIDs().includes(qa.cellId)) ||
                (isCompleteMode && qa.viewMode === viewMode);
        });
    }, [qaList, viewMode, getCurrentStepCellsIDs]);

    // Handle escape key to close and click outside
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                setShowCommandInput(false);
                setInput('');
            }
        };

        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setShowCommandInput(false);
                setInput('');
            }
        };

        if (showCommandInput) {
            document.addEventListener('keydown', handleEscape);
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('keydown', handleEscape);
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showCommandInput, setShowCommandInput]);

    // Auto focus input when modal opens
    useEffect(() => {
        if (showCommandInput && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [showCommandInput]);

    // 监听输入变化自动调整高度
    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    
    const handleSubmit = useCallback(async (command) => {
        try {
            setShowCommandInput(false);
            setIsLoading(true);
            const timestamp = new Date().toLocaleTimeString();

            if (command.startsWith('/')) {
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
                    onProcess: false
                };
                addAction(actionData);
                useOperatorStore.getState().sendOperation(notebookId, {
                    type: 'user_command',
                    payload: {
                        current_view_mode: viewMode,
                        current_phase_id: currentPhaseId,
                        current_step_index: currentStepIndex,
                        content: command,
                        commandId: commandId
                    }
                });
            } else {
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
                    onProcess: true
                };
                addQA(qaData);
                const action = createUserAskQuestionAction(command, qaId, currentCellId);
                useAIAgentStore.getState().addAction(action);

                useOperatorStore.getState().sendOperation(notebookId, {
                    type: 'user_question',
                    payload: {
                        content: command,
                        QId: [qaId],
                        current_view_mode: viewMode,
                        current_phase_id: currentPhaseId,
                        current_step_index: currentStepIndex,
                        related_qas: qasToShow,
                        related_actions: actionsToShow,
                        related_cells: getCurrentViewCells()
                    }
                });
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
        } finally {
            setTimeout(() => setIsLoading(false), 500);
        }
    }, [
        notebookId,
        viewMode,
        currentPhaseId,
        currentStepIndex,
        currentCellId,
        setShowCommandInput,
        setIsLoading,
        setActiveView,
        addAction,
        addQA,
        qasToShow,
        actionsToShow,
        getCurrentViewCells,
        setIsRightSidebarCollapsed
    ]);
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                handleSubmit(input.trim());
                setInput('');
            }
        }
    }, [input, handleSubmit, setInput]);


    if (!showCommandInput) return null;


    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 ">
            <div className="w-4/5 max-w-4xl transform transition-all duration-200" ref={modalRef}>
                <div className="relative bg-white rounded-xl shadow-xl">
                    <div
                        className={`
                            flex items-start gap-3 px-6 py-4 border-b border-gray-200
                            rounded-xl
                            focus:outline-none border-2 transition-all duration-200
                            ${isFocused ? 'border-theme-400' : 'border-gray-200'}
                            ${input.startsWith('/') ? 'font-mono' : 'font-normal'}
                        `}
                        >
                        <Command className={`w-6 h-6 text-gray-500 mt-1               
                                            ${input.startsWith('/') ? 'text-blue-600' : 'text-theme-600'}
                                        `} />
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Type a command (start with /) or ask a question..."
                            className="mt-1 w-full text-xl border-none outline-none focus:ring-0 bg-transparent resize-none overflow-y-auto min-h-[24px] max-h-24 leading-6"
                            rows={1}
                            style={{
                                wordWrap: 'break-word',
                                whiteSpace: 'pre-wrap'
                            }}
                        />
                    </div>
                    {input && (
                        <div className="max-h-60 overflow-y-auto p-3 border-t border-gray-100">
                            {input.startsWith('/') ? (
                                <div className="p-2 text-base text-gray-600">
                                    Executing command mode...
                                </div>
                            ) : (
                                <div className="p-2 text-base text-gray-600">
                                    Asking question mode...
                                </div>
                            )}
                        </div>
                    )}
                    <div className="absolute right-6 top-7 text-sm text-gray-400">
                        Shift + Enter for new line
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandInput;