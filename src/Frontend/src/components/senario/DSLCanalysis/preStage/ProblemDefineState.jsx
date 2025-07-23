import ResizablePanel from '../UI/ResizableSplitPanel';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Send,
    Loader2,
    ArrowRight,
    ChevronUp,
    Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAIPlanningContextStore } from '../store/aiPlanningContext'
import usePreStageStore from '../store/preStageStore';
// Start of Selection
const ProblemDefineWorkload = ({ confirmProblem }) => {
    const { t } = useTranslation();
    /* ─────────── State ─────────── */
    const [stage, setStage] = useState('intro');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDataInfoInput, setShowDataInfoInput] = useState(false);
    const [datasetInfoInput, setDatasetInfoInput] = useState('');

    /* ─────────── Animation helpers ─────────── */
    const [slideDirection, setSlideDirection] = useState('right');
    const [bounce, setBounce] = useState(false);
    const [infoBoxAnimation, setInfoBoxAnimation] = useState('');

    /* ─────────── Refs ─────────── */
    const messagesEndRef = useRef(null);
    const isInitializedRef = useRef(false);

    /* ─────────── Store Access ─────────── */
    const currentFile = usePreStageStore(state => state.currentFile);
    const fileName = currentFile?.name;
    const choiceMap = usePreStageStore(state => state.choiceMap);
    const problem_description = usePreStageStore(state => state.problem_description);
    const target = usePreStageStore(state => state.selectedTarget);
    const dataBackground = usePreStageStore(state => state.dataBackground);
    const problem_name = usePreStageStore(state => state.problem_name);

    const setSelectedProblem = usePreStageStore(state => state.setSelectedProblem);
    const setDatasetInfoStore = usePreStageStore(state => state.setDatasetInfo);

    const addVariable = useAIPlanningContextStore(state => state.addVariable);

    /* ─────────── UI helpers ─────────── */
    const triggerBounce = useCallback(() => {
        setBounce(true);
        setTimeout(() => setBounce(false), 1000);
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    const getMessageClassNames = useCallback((role, messageStage) => {
        const base = 'rounded-2xl px-4 py-3 w-fit shadow-md';
        
        // 自定义问题环节使用更宽的宽度，所有消息框都增大
        const maxWidth = (messageStage === 'free_input') ? 'max-w-[85%]' : 'max-w-[60%]';
        
        if (role === 'user')
            return `${base} bg-white backdrop-blur-lg border border-theme-200 ${maxWidth} text-base`;
        if (role === 'system')
            return `${base} bg-white bg-opacity-20 backdrop-blur-lg rounded-full shadow-gray-300 ${maxWidth} text-base`;
        return `${base} bg-white bg-opacity-20 backdrop-blur-lg shadow-gray-300 ${maxWidth} text-base`;
    }, []);
    const generateId = () => Math.random().toString(36).substring(2, 11);

    /* ─────────── Messaging ─────────── */
    const pushMessage = useCallback((role, content, options, onSelect) => {
        setSlideDirection(Math.random() > 0.5 ? 'right' : 'left');
        setMessages((prev) => [
            ...prev,
            { id: generateId(), role, content, options, onSelect, stage },
        ]);
    }, [stage]);

    /* ─────────── Refs for Handlers ─────────── */
    const handleInitialChoiceRef = useRef(null);
    const handleConfirmRef = useRef(null);
    const showConfirmationRef = useRef(null);
    const handleTypeSelectRef = useRef(null);
    const handleDatasetInfoChoiceRef = useRef(null);
    const handleCancelDatasetInfoRef = useRef(null);
    const submitDatasetInfoRef = useRef(null);
    const handleAdjustmentChoiceRef = useRef(null);

    /* ─────────── Workflow Functions ─────────── */
    const resetWorkflow = useCallback(() => {
        setSelectedProblem(null, null, "");
        setDatasetInfoStore("");
        setDatasetInfoInput('');
        setShowDataInfoInput(false);
        setInput('');
        setLoading(false);
        setMessages([]);

        // 使用从 hook 订阅的 choiceMap，而不是 getState()
        const choices = choiceMap.map((item) => item.problem_description);

        setTimeout(() => {
            const assistantMessage = {
                id: generateId(),
                role: 'assistant',
                content: t('problemDefine.selectAnalysis'),
                options: choices,
                onSelect: handleInitialChoiceRef.current
            };

            setMessages([assistantMessage]);
            setStage('intro');
        }, 50);
    }, [choiceMap, setSelectedProblem, setDatasetInfoStore, t]);

    const handleSelect = useCallback((messageId, option, callback) => {
        triggerBounce();
        setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, options: undefined, onSelect: undefined } : m))
        );
        pushMessage('user', option);
        if (callback) setTimeout(() => callback(option), 600);
    }, [pushMessage, triggerBounce]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || loading) return;

        triggerBounce();
        pushMessage('user', text);
        setInput('');
        setLoading(true);

        // 1. 如果是在 free_input 阶段，处理自定义问题
        if (stage === 'free_input') {
            // 延迟到「loading」结束后执行
            setTimeout(() => {
                setLoading(false);

                // 把自定义问题写入 store
                usePreStageStore.getState().setSelectedProblem(
                    null,  // target
                    text,  // problem_description
                    text   // problem_name - 使用输入文本作为问题名称
                );

                // 推出下一步：询问数据背景（和 handleInitialChoice 里类似）
                pushMessage(
                    'assistant',
                    t('problemDefine.addBackground'),
                    [t('problemDefine.skip'), t('problemDefine.addDatasetInfo')],
                    handleDatasetInfoChoiceRef.current
                );
                setStage('dataBackground');
            }, 1200);

            return;
        }

        // 2. 其它阶段走原有逻辑
        setTimeout(() => setLoading(false), 1200);
    }, [
        input, loading, stage, triggerBounce, pushMessage, t,
        handleDatasetInfoChoiceRef,
    ]);

    const handleInitialChoice = useCallback((option) => {
        if (option === t('problemDefine.customProblem')) {
            pushMessage('assistant', t('problemDefine.describePrompt'));
            setStage('free_input');
            return;
        }

        // 查找选中的问题，添加空值检查
        const selectedChoiceRef = choiceMap?.find(choice => choice?.problem_description === option);
        console.log("selectedChoiceRef", selectedChoiceRef);
        if (!selectedChoiceRef) {
            console.error('Could not find matching problem description for:', option);
            // 提供回退选项
            pushMessage('assistant', 'Sorry, there was an issue with your selection. Please try again or describe your problem.');
            return;
        }

        // 使用store的setter更新问题类型和目标
        usePreStageStore.getState().setSelectedProblem(
            selectedChoiceRef.target,
            selectedChoiceRef.problem_description,
            selectedChoiceRef.problem_name
        );

        pushMessage(
            'assistant',
            `${selectedChoiceRef.problem_name ? t('problemDefine.selectedProblem', { problemName: selectedChoiceRef.problem_name }) : t('problemDefine.selectedAnalysis')}.\n\n${t('problemDefine.addBackground')}`,
            [t('problemDefine.skip'), t('problemDefine.addDatasetInfo')],
            handleDatasetInfoChoiceRef.current,
        );
        setStage('dataBackground');
    }, [pushMessage, choiceMap, t]);

    const handleCancelDatasetInfo = useCallback(() => {
        setInfoBoxAnimation('animate-fade-out');
        setTimeout(() => {
            setShowDataInfoInput(false);
            setInfoBoxAnimation('');
            pushMessage('system', t('problemDefine.infoCanceled'));
            showConfirmationRef.current();
        }, 300);
    }, [pushMessage, t]);

    const submitDatasetInfo = useCallback(() => {
        const info = datasetInfoInput.trim();
        if (!info) {
            pushMessage('system', t('problemDefine.infoEmpty'));
            return;
        }

        setInfoBoxAnimation('animate-fade-out');
        setTimeout(() => {
            setDatasetInfoStore(info);
            setShowDataInfoInput(false);
            setInfoBoxAnimation('');
            pushMessage('user', `${t('problemDefine.infoAdded')} "${info}"`);
            setDatasetInfoInput('');
            setTimeout(() => showConfirmationRef.current(), 400);
        }, 300);
    }, [datasetInfoInput, pushMessage, setDatasetInfoStore, t]);

    const showConfirmation = useCallback(() => {
        // 对于自定义问题，target可能为空，此时不要返回
        if (!target && !problem_description) {
            setTimeout(() => showConfirmationRef.current(), 20);
            return;
        }

        // 获取当前选中问题的name，添加空值检查
        const selectedProblem = choiceMap?.find(choice =>
            choice && choice.target === target
        );
        const problemName = selectedProblem?.problem_name || problem_description || 'Analysis';
        usePreStageStore.getState().setProblemName(problemName);
        
        // 确保即使是自定义问题也能正确设置
        if (target || problem_description) {
            usePreStageStore.getState().setSelectedProblem(target, problem_description, problemName);
        }

        const confirmText = t('problemDefine.confirmSettings', {
            problem: problem_description || 'Custom problem analysis',
            datasetInfo: dataBackground ? `- **Dataset Background:** ${dataBackground}` : ''
        });

        pushMessage(
            'assistant',
            confirmText,
            [t('problemDefine.confirmAndStart'), t('problemDefine.adjustSettings')],
            handleConfirmRef.current,
        );
        setStage('confirm');
    }, [dataBackground, pushMessage, problem_description, target, choiceMap, t]);

    const handleConfirm = useCallback((option) => {
        if (option === t('problemDefine.adjustSettings')) {
            pushMessage(
                'assistant',
                t('problemDefine.whatAdjust'),
                [t('problemDefine.changeType'), t('problemDefine.editDatasetInfo'), t('problemDefine.restartWorkflow')],
                handleAdjustmentChoiceRef.current,
            );
        } else {
            addVariable('csv_file_path', fileName);
            addVariable('problem_description', problem_description);
            addVariable('context_description', dataBackground);
            addVariable('problem_name', problem_name);
            
            // 确保problem_name存在，对于自定义问题可能使用problem_description作为名称
            if (problem_name || problem_description) {
                console.log("problem_name", problem_name || problem_description);
                confirmProblem();
            }
            else {
                console.log("problem_name is empty");
                // 如果实在没有问题名称，也允许继续
                confirmProblem();
            }
        }
    }, [pushMessage, confirmProblem, fileName, addVariable, problem_description, dataBackground, problem_name, t]);

    const handleAdjustmentChoice = useCallback((option) => {
        if (option === t('problemDefine.changeType')) {
            const problemOptions = choiceMap?.filter(item => item?.problem_description)
                .map(item => item.problem_description) || [];

            if (problemOptions.length === 0) {
                pushMessage('assistant', 'Sorry, no analysis options are available. Let\'s restart the workflow.');
                resetWorkflow();
                return;
            }

            pushMessage(
                'assistant',
                t('problemDefine.selectNewType'),
                problemOptions,
                handleTypeSelectRef.current,
            );
            setStage('chooseType');
        } else if (option === t('problemDefine.editDatasetInfo')) {
            setDatasetInfoInput(dataBackground || '');
            setInfoBoxAnimation('animate-float-in');
            setShowDataInfoInput(true);
            pushMessage('assistant', t('problemDefine.enterDatasetInfo'));
        } else {
            resetWorkflow();
        }
    }, [pushMessage, dataBackground, resetWorkflow, choiceMap, t]);

    const handleDatasetInfoChoice = useCallback((option) => {
        if (option === t('problemDefine.skip')) {
            showConfirmationRef.current();
        } else {
            setInfoBoxAnimation('animate-float-in');
            setShowDataInfoInput(true);
            pushMessage('assistant', t('problemDefine.enterDatasetInfo'));
        }
    }, [pushMessage, t]);

    const handleTypeSelect = useCallback((option) => {
        // 查找选中的问题，添加空值检查
        const selectedChoice = choiceMap?.find(choice => choice?.problem_description === option);
        if (!selectedChoice) {
            console.error('Could not find matching problem description for:', option);
            pushMessage('assistant', 'Sorry, there was an issue with your selection. Please try again.');
            return;
        }

        // 使用store的setter更新问题类型和目标
        setSelectedProblem(
            selectedChoice.problem_type,
            selectedChoice.target,
            selectedChoice.problem_description
        );

        pushMessage(
            'assistant',
            `${selectedChoice.problem_name ? `You selected ${selectedChoice.problem_name}` : 'You selected your analysis'}.
${t('problemDefine.addBackground')}`,
            [t('problemDefine.skip'), t('problemDefine.addDatasetInfo')],
            handleDatasetInfoChoiceRef.current,
        );
        setStage('dataBackground');
    }, [pushMessage, choiceMap, setSelectedProblem, t]);

    /* ─────────── Side Effects ─────────── */
    useEffect(scrollToBottom, [messages, scrollToBottom]);

    useEffect(() => {
        handleInitialChoiceRef.current = handleInitialChoice;
        handleConfirmRef.current = handleConfirm;
        showConfirmationRef.current = showConfirmation;
        handleTypeSelectRef.current = handleTypeSelect;
        handleDatasetInfoChoiceRef.current = handleDatasetInfoChoice;
        handleCancelDatasetInfoRef.current = handleCancelDatasetInfo;
        submitDatasetInfoRef.current = submitDatasetInfo;
        handleAdjustmentChoiceRef.current = handleAdjustmentChoice;
    }, [
        handleInitialChoice,
        handleConfirm,
        showConfirmation,
        handleTypeSelect,
        handleDatasetInfoChoice,
        handleCancelDatasetInfo,
        submitDatasetInfo,
        handleAdjustmentChoice
    ]);

    useEffect(() => {
        if (!isInitializedRef.current && messages.length === 0) {
            isInitializedRef.current = true;

            // 使用订阅的状态获取选项
            const problem_options = [...choiceMap.map((item) => item.problem_description), t('problemDefine.customProblem')];
            const assistantMessage = {
                id: generateId(),
                role: 'assistant',
                content: t('problemDefine.selectAnalysis'),
                options: problem_options,
                onSelect: handleInitialChoiceRef.current,
                stage: 'intro'
            };
            setTimeout(() => {
                setMessages([assistantMessage]);
                setStage('intro');
            }, 0);
        }
    }, [messages.length, choiceMap, t]);

    /* ─────────── JSX ─────────── */
    return (
        <div className="h-full w-full overflow-hidden flex items-center justify-center relative">
            <div
                className={`relative overflow-hidden ${bounce ? 'animate-bounce-small' : ''
                    } transition-all duration-500 ease-in-out w-[90%] max-w-4xl`}
            >
                <div className="flex flex-col">
                    {/* Chat area */}
                    <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 max-h-[75vh]">
                        {messages.map((m, idx) => (
                            <div
                                key={m.id}
                                className={`flex ${m.role === 'user' ? 'justify-end' : messages.length > 1 ? 'justify-start' : 'justify-center'}`}
                            >
                                <div
                                    className={`${getMessageClassNames(
                                        m.role,
                                        m.stage
                                    )} animate-slide-in-${m.role === 'user'
                                        ? slideDirection
                                        : slideDirection === 'right'
                                            ? 'left'
                                            : 'right'
                                        }`}
                                    style={{ animationDelay: `${idx * 0.1}s` }}
                                >
                                    <ReactMarkdown>
                                        {m.content}
                                    </ReactMarkdown>

                                    {m.options && m.options.length > 0 && (
                                        <div
                                            className="mt-4 flex flex-wrap gap-3 border-t border-white/20 pt-3 animate-fade-in"
                                            style={{ animationDelay: '0.3s' }}
                                        >
                                            {m.options.map((opt, i) => (
                                                <button
                                                    key={opt}
                                                    onClick={() => handleSelect(m.id, opt, m.onSelect)}
                                                    className={`px-4 py-2 text-sm rounded-2xl text-theme-700 transition-all duration-300 transform hover:scale-105 ${m.role === 'user'
                                                        ? 'bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 hover:shadow-md'
                                                        : 'border border-theme-200 hover:shadow-md hover:from-theme-100 hover:to-theme-200'
                                                        } animate-bounce-in`}
                                                    style={{
                                                        animationDelay: `${i * 0.1 + 0.3}s`,
                                                        boxShadow: '0 2px 10px rgba(231, 84, 128, 0.1)',
                                                    }}
                                                >
                                                    <span className="flex items-center space-x-1">
                                                        {opt.includes(t('problemDefine.confirmAndStart')) && (
                                                            <Sparkles size={12} className="mr-1 animate-pulse" />
                                                        )}
                                                        <span>{opt}</span>
                                                        {opt.includes(t('problemDefine.confirmAndStart')) && (
                                                            <ArrowRight size={12} className="ml-1 animate-slide-in-right" />
                                                        )}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Dataset info input box with enhanced animations */}
                        {showDataInfoInput && (
                            <div className={`flex justify-start w-full my-4 ${infoBoxAnimation || 'animate-float-in'}`}>
                                <div className="bg-white/90 backdrop-blur-sm border border-theme-200 rounded-2xl p-4 text-gray-800 shadow-lg w-full transition-all duration-300">
                                    <textarea
                                        value={datasetInfoInput}
                                        onChange={(e) => setDatasetInfoInput(e.target.value)}
                                        placeholder={t('problemDefine.datasetInputPlaceholder')}
                                        className="w-full p-3 border border-theme-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-500/50 focus:border-theme-400 min-h-[100px] text-sm transition-all duration-300 bg-white/70"
                                        rows={4}
                                        autoFocus
                                    />
                                    <div className="flex justify-end mt-3 space-x-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                                        <button
                                            onClick={handleCancelDatasetInfoRef.current}
                                            className="px-4 py-1.5 text-sm rounded-full text-gray-600 hover:bg-gray-100 border border-gray-300 transition-all duration-300 hover:scale-105 animate-slide-in-right"
                                            style={{ animationDelay: '0.3s' }}
                                        >
                                            {t('problemDefine.cancel')}
                                        </button>
                                        <button
                                            onClick={submitDatasetInfoRef.current}
                                            disabled={!datasetInfoInput.trim()}
                                            className={`px-4 py-1.5 text-sm rounded-full flex items-center space-x-1 transition-all duration-300 animate-slide-in-right ${!datasetInfoInput.trim()
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-theme-500 to-purple-500 text-white hover:shadow-lg transform hover:scale-105'
                                                }`}
                                            style={{ animationDelay: '0.4s' }}
                                        >
                                            <Sparkles size={14} className="mr-1 animate-spin-slow" />
                                            <span>{t('problemDefine.submit')}</span>
                                            <ArrowRight size={14} className="ml-1 animate-slide-in-right" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="border-t border-theme-100 bg-white/70 backdrop-blur-sm px-5 py-4 rounded-b-2xl">
                        {(stage === 'free_input' || stage === 'done') && !showDataInfoInput ? (
                            <form onSubmit={handleSubmit} className="flex space-x-4 items-center animate-fade-in">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={
                                        stage === 'free_input' ? t('problemDefine.problemInput') : t('problemDefine.followUpQuestion')
                                    }
                                    className="flex-1 px-5 py-3 border border-theme-200 rounded-full focus:outline-none focus:ring-2 focus:ring-theme-500/50 focus:border-theme-400 text-base transition-all duration-300 bg-white/80 shadow-inner hover:shadow"
                                    disabled={loading}
                                    aria-label="chat input"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim()}
                                    className={`rounded-full w-12 h-12 flex items-center justify-center transition-all duration-300 ${loading || !input.trim()
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        : 'bg-theme-500 text-white shadow-md hover:shadow-lg transform hover:scale-110'
                                        }`}
                                    aria-label="submit"
                                >
                                    <Send size={20} className={`${!loading && input.trim() ? 'animate-pulse' : ''}`} />
                                </button>
                            </form>
                        ) : !showDataInfoInput ? (
                            <div className="text-center text-sm text-gray-500 py-2 animate-fade-in">
                                {loading ? (
                                    <span className="flex items-center justify-center space-x-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span className="animate-pulse">{t('problemDefine.processing')}</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center space-x-2">
                                        <ChevronUp size={16} className="animate-bounce" />
                                        <span>{t('problemDefine.selectOptions')}</span>
                                        <ChevronUp size={16} className="animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </span>
                                )}
                            </div>
                        ) : null}

                        {/* loading dots */}
                        <div className="mt-2 flex justify-center">
                            <div className="flex space-x-1">
                                {[...Array(3)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-theme-500' : 'bg-theme-300'
                                            } animate-pulse`}
                                        style={{ animationDelay: `${i * 0.2}s` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProblemDefineState = ({ confirmProblem }) => {
    return (
        <ResizablePanel
            defaultSize={0}
            minSize={0}
            resizePanel="right"
            orientation="vertical"
            dragEnabled={true}
            accentColor="#e11d48"
            style={{
                height: '100%',
                width: '100%',
                overflow: 'hidden',
            }}
        >
            <div className="flex items-center justify-center w-full h-full">
                <ProblemDefineWorkload confirmProblem={confirmProblem} />
            </div>
        </ResizablePanel>
    );
};

export default ProblemDefineState;