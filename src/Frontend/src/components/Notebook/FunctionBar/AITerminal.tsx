import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAIAgentStore, EVENT_TYPES } from '../../../store/AIAgentStore';
import useStore from '../../../store/notebookStore';
import useOperatorStore from '../../../store/operatorStore';
import { detectActivityType } from '../../../utils/activityDetector';
import { Command } from 'lucide-react';
import { AgentMemoryService, AgentType } from '../../../services/agentMemoryService';
import type { QAItem } from '../../../store/AIAgentStore';

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
    const modalRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    // Dynamically adjust textarea height
    const adjustTextareaHeight = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Reset height to get correct scrollHeight
        textarea.style.height = 'auto';

        // Calculate rows (assume each row is 24px)
        const lineHeight = 24; // base line height
        const maxHeight = lineHeight * 4; // 4 rows max height
        const newHeight = Math.min(textarea.scrollHeight, maxHeight);

        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }, []);

    // Filter actions based on view mode
    const actionsToShow = useMemo(() => {
        if (!viewMode) return [];

        return actions.filter(action => {
            const isStepMode = viewMode === 'step';
            const isDemoMode = viewMode === 'demo';
            const isCreateMode = viewMode === 'create';

            // Step mode: only show actions for current step
            if (isStepMode && action.viewMode === 'step' &&
                (action.cellId ? getCurrentStepCellsIDs().includes(action.cellId) : false)) {
                return true;
            }
            
            // Demo mode: show all demo mode actions
            if (isDemoMode && action.viewMode === 'demo') {
                return true;
            }
            
            // Create mode: show actions for create or general/demo actions (backward compatible 'complete')
            if (isCreateMode && (action.viewMode === 'create' || action.viewMode === 'demo' || action.viewMode === 'complete')) {
                return true;
            }
            
            return false;
        });
    }, [actions, viewMode, getCurrentStepCellsIDs]);

    // Filter QAs based on view mode
    const qasToShow = useMemo(() => {
        if (!viewMode) return [];

        return qaList.filter(qa => {
            const isStepMode = viewMode === 'step';
            const isDemoMode = viewMode === 'demo';
            const isCreateMode = viewMode === 'create';

            // Step mode: only show QAs for current step
            if (isStepMode && qa.viewMode === 'step' &&
                (qa.cellId ? getCurrentStepCellsIDs().includes(qa.cellId) : false)) {
                return true;
            }
            
            // Demo mode: show all demo mode QAs
            if (isDemoMode && qa.viewMode === 'demo') {
                return true;
            }
            
            // Create mode: show QAs for create or general/demo QAs (backward compatible 'complete')
            if (isCreateMode && (qa.viewMode === 'create' || qa.viewMode === 'demo' || qa.viewMode === 'complete')) {
                return true;
            }
            
            return false;
        });
    }, [qaList, viewMode, getCurrentStepCellsIDs]);

    // Handle escape key to close and click outside
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowCommandInput(false);
                setInput('');
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
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

    // Listen for input changes to automatically adjust height
    useEffect(() => {
        adjustTextareaHeight();
    }, [input, adjustTextareaHeight]);

    // Helper method to infer user goals from questions
    const _inferGoalsFromQuestion = useCallback((question: string): string[] => {
        const inferredGoals: string[] = [];
        const lowerQuestion = question.toLowerCase();
        
        // Infer goals based on keywords
        if (lowerQuestion.includes('how to') || lowerQuestion.includes('how') || lowerQuestion.includes('method')) {
            inferredGoals.push('learning_method');
        }
        if (lowerQuestion.includes('error') || lowerQuestion.includes('bug') || lowerQuestion.includes('issue') || lowerQuestion.includes('problem')) {
            inferredGoals.push('debug_issue');
        }
        if (lowerQuestion.includes('data') || lowerQuestion.includes('dataset')) {
            inferredGoals.push('data_analysis');
        }
        if (lowerQuestion.includes('plot') || lowerQuestion.includes('chart') || lowerQuestion.includes('graph') || lowerQuestion.includes('visualize')) {
            inferredGoals.push('data_visualization');
        }
        if (lowerQuestion.includes('optimize') || lowerQuestion.includes('improve') || lowerQuestion.includes('enhance') || lowerQuestion.includes('performance')) {
            inferredGoals.push('code_optimization');
        }
        if (lowerQuestion.includes('explain') || lowerQuestion.includes('what is') || lowerQuestion.includes('describe') || lowerQuestion.includes('define')) {
            inferredGoals.push('concept_explanation');
        }
        
        return inferredGoals;
    }, []);

    // Helper method to infer user goals from commands
    const _inferGoalsFromCommand = useCallback((command: string): string[] => {
        const inferredGoals: string[] = [];
        const lowerCommand = command.toLowerCase();
        
        // Infer goals based on command patterns
        if (lowerCommand.includes('plot') || lowerCommand.includes('chart') || lowerCommand.includes('graph') || lowerCommand.includes('draw')) {
            inferredGoals.push('data_visualization');
        }
        if (lowerCommand.includes('load') || lowerCommand.includes('read') || lowerCommand.includes('import') || lowerCommand.includes('fetch') || lowerCommand.includes('get')) {
            inferredGoals.push('data_loading');
        }
        if (lowerCommand.includes('clean') || lowerCommand.includes('process') || lowerCommand.includes('transform') || lowerCommand.includes('parse') || lowerCommand.includes('format')) {
            inferredGoals.push('data_processing');
        }
        if (lowerCommand.includes('analyze') || lowerCommand.includes('analysis') || lowerCommand.includes('calculate') || lowerCommand.includes('statistics')) {
            inferredGoals.push('data_analysis');
        }
        if (lowerCommand.includes('model') || lowerCommand.includes('train') || lowerCommand.includes('predict') || lowerCommand.includes('ml') || lowerCommand.includes('ai')) {
            inferredGoals.push('machine_learning');
        }
        if (lowerCommand.includes('save') || lowerCommand.includes('export') || lowerCommand.includes('output') || lowerCommand.includes('write') || lowerCommand.includes('store')) {
            inferredGoals.push('data_export');
        }
        
        return inferredGoals;
    }, []);
    
    const handleSubmit = useCallback(async (command: string) => {
        try {
            setShowCommandInput(false);
            setIsLoading(true);
            const timestamp = new Date().toLocaleTimeString();
            const effectiveNotebookId = notebookId ?? `temp-session-${Date.now()}`;

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
                const detectionResult = detectActivityType(command);
                const enhancedActionData = {
                    ...actionData,
                    type: detectionResult.eventType,
                    agentName: detectionResult.agentName,
                    agentType: detectionResult.agentType,
                    taskDescription: detectionResult.taskDescription,
                    onProcess: true,
                    progressPercent: 0
                };
                addAction(enhancedActionData);

                // Prepare Command Agent memory context
                const commandMemoryContext = AgentMemoryService.prepareMemoryContextForBackend(
                    notebookId,
                    'command' as AgentType,
                    {
                        current_cell_id: currentCellId || undefined,
                        related_cells: getCurrentViewCells(),
                        command_id: commandId,
                        command_content: command
                    }
                );

                // Update user intent (inferred from command)
                AgentMemoryService.updateUserIntent(
                    effectiveNotebookId,
                    'command' as AgentType,
                    [command], // Goals explicitly expressed by user
                    _inferGoalsFromCommand(command), // Goals inferred from command
                    command, // Current focus
                    [] // Current blocks
                );

                // Record command interaction start
                AgentMemoryService.recordOperationInteraction(
                    effectiveNotebookId,
                    'command' as AgentType,
                    'command_started',
                    true,
                    {
                        command_id: commandId,
                        command: command,
                        start_time: new Date().toISOString(),
                        related_context: {
                            current_cell_id: currentCellId || undefined,
                            related_actions_count: actionsToShow.length,
                            view_mode: viewMode
                        }
                    }
                );

                useOperatorStore.getState().sendOperation(notebookId, {
                    type: 'user_command',
                    payload: {
                        current_view_mode: viewMode,
                        current_phase_id: currentPhaseId,
                        current_step_index: currentStepIndex,
                        content: command,
                        commandId: commandId,
                        // Add memory context
                        ...commandMemoryContext
                    }
                });
            } else {
                setIsRightSidebarCollapsed(true);
                setActiveView('qa');
                const qaId = `qa-${uuidv4()}`;
                const qaData: Omit<QAItem, 'timestamp' | 'onProcess'> & { onProcess?: boolean } = {
                    id: qaId,
                    type: 'user',
                    content: command,
                    resolved: false,
                    cellId: currentCellId || undefined,
                    viewMode,
                    onProcess: true
                };
                addQA(qaData);
                // Use smart detector to get activity information
                const detectionResult = detectActivityType(command);
                
                // Create enhanced activity information
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
                    progressPercent: 0
                };
                
                useAIAgentStore.getState().addAction(enhancedAction);

                // Prepare Agent memory context
                console.log('AITerminal: Preparing memory context', { notebookId, command });
                const memoryContext = AgentMemoryService.prepareMemoryContextForBackend(
                    notebookId,
                    'general' as AgentType,
                    {
                        current_cell_id: currentCellId || undefined,
                        related_cells: getCurrentViewCells(),
                        related_qa_ids: qasToShow.map(qa => qa.id),
                        current_qa_id: qaId,
                        question_content: command
                    }
                );
                console.log('AITerminal: Memory context preparation completed', memoryContext);

                // Update user intent (inferred from user question)
                AgentMemoryService.updateUserIntent(
                    effectiveNotebookId,
                    'general' as AgentType,
                    [command], // Goals explicitly expressed by user
                    _inferGoalsFromQuestion(command), // Inferred goals
                    command, // Current focus
                    [] // Current blocks (if any)
                );

                // Record QA interaction start
                AgentMemoryService.recordOperationInteraction(
                    effectiveNotebookId,
                    'general' as AgentType,
                    'qa_started',
                    true,
                    {
                        qa_id: qaId,
                        question: command,
                        start_time: new Date().toISOString(),
                        related_context: {
                            current_cell_id: currentCellId || undefined,
                            related_qa_count: qasToShow.length,
                            view_mode: viewMode
                        }
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
                        related_qas: qasToShow,
                        related_actions: actionsToShow,
                        related_cells: getCurrentViewCells(),
                        // Add memory context
                        ...memoryContext
                    }
                };
                console.log('AITerminal: Sending final payload', finalPayload);
                useOperatorStore.getState().sendOperation(notebookId, finalPayload);
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
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Prevent handling during IME composition
        if (isComposing) {
            return;
        }
        
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                handleSubmit(input.trim());
                setInput('');
            }
        }
    }, [input, handleSubmit, setInput, isComposing]);

    const handleCompositionStart = useCallback(() => {
        setIsComposing(true);
    }, []);

    const handleCompositionEnd = useCallback(() => {
        setIsComposing(false);
    }, []);


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
                                            ${input.startsWith('/') ? 'text-theme-600' : 'text-theme-600'}
                                        `} />
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onCompositionStart={handleCompositionStart}
                            onCompositionEnd={handleCompositionEnd}
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