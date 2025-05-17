import React, {
    useCallback,
    useRef,
    useMemo,
    useState,
    useEffect,
} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { Sparkles, CheckCircle } from 'lucide-react';

import {
    Play,
    Trash2,
    Loader2,
    X,
    RefreshCw,
    Square,
    Code,
    Monitor,
    Layout,
    InfoIcon,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

import { AnsiUp } from 'ansi_up';
import ReactMarkdown from 'react-markdown';

import useStore from '../../store/notebookStore';
import useCodeStore, { DISPLAY_MODES } from '../../store/codeStore';
import { sendCurrentCellExecuteCodeError_should_debug } from '../../store/autoActions';

const ansi_up = new AnsiUp();

const processOutput = (output) => {
    if (!output) return null;

    if (output.type === 'image') {
        try {
            return {
                ...output,
                content:
                    typeof output.content === 'object'
                        ? JSON.stringify(output.content)
                        : String(output.content),
                key: output.key || `image-${Date.now()}-${Math.random()}`,
            };
        } catch (error) {
            console.error('Error processing image output:', error);
            return {
                type: 'error',
                content: 'Error processing image output',
                key: `error-${Date.now()}-${Math.random()}`,
            };
        }
    }

    if (output.type === 'text' || output.type === 'error') {
        try {
            return {
                ...output,
                content: String(output.content || ''),
                key: output.key || `${output.type}-${Date.now()}-${Math.random()}`,
            };
        } catch (error) {
            console.error('Error processing text/error output:', error);
            return {
                type: 'error',
                content: 'Error processing output',
                key: `error-${Date.now()}-${Math.random()}`,
            };
        }
    }

    return output;
};

const CodeCell = ({ cell, onDelete, isStepMode = false, dslcMode = false, finished_thinking = false, thinkingText = "finished thinking" }) => {
    // 合并 useStore 的调用
    const {
        currentCellId,
        setCurrentCell,
        cells,
        updateCell,
        clearCellOutputs,
        setEditingCellId,
    } = useStore();

    const getCellExecState = useCodeStore((state) => state.getCellExecState);
    const executeCell = useCodeStore((state) => state.executeCell);
    const cancelCellExecution = useCodeStore((state) => state.cancelCellExecution);
    const setCellMode = useCodeStore((state) => state.setCellMode);

    // 当前 cell 的执行状态
    const cellExec = getCellExecState(cell.id);
    const isExecuting = cellExec.isExecuting;
    const isCancelling = cellExec.isCancelling;
    const elapsedTime = cellExec.elapsedTime || 0;

    // 当前 cell 的显示模式
    const cellMode =
        useCodeStore((state) => state.cellModes[cell.id]) || DISPLAY_MODES.COMPLETE;

    // 添加一个状态来控制是否显示thinking状态
    const [showThinking, setShowThinking] = useState(true);

    // 检查是否为 DSLC JSON 指令
    const isDslcCommand = useMemo(() => {
        if (!cell.content || !dslcMode) return false;
        try {
            const content =
                typeof cell.content === 'string'
                    ? cell.content
                    : String(cell.content);
            if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
                const cmd = JSON.parse(content.trim());
                return cmd.dslc_command === true;
            }
        } catch (e) {
            console.error('DSLC 指令解析错误:', e);
            return false;
        }
        return false;
    }, [cell.content, dslcMode]);

    // 执行 DSLC 指令
    useEffect(() => {
        if (isDslcCommand && dslcMode && cell.content) {
            try {
                const cmd = JSON.parse(cell.content);
                if (cmd.action === 'execute' && cmd.code) {
                    // 更新单元格代码内容
                    updateCell(cell.id, cmd.code);
                    // 延迟执行代码以确保内容已更新
                    setTimeout(() => {
                        executeCell(cell.id);
                    }, 100);
                }
            } catch (e) {
                console.error('DSLC 指令解析错误:', e);
            }
        }
    }, [isDslcCommand, dslcMode, cell.id, cell.content, updateCell, executeCell]);

    // 输出处理
    const processedOutputs = useMemo(() => {
        if (cell.outputs && Array.isArray(cell.outputs)) {
            return cell.outputs
                .map(processOutput)
                .filter(Boolean)
                .map((output) => ({
                    ...output,
                    key: output.key || `output-${Date.now()}-${Math.random()}`,
                }));
        }
        return [];
    }, [cell.outputs]);

    // 输出动画控制状态
    const [outputVisible, setOutputVisible] = useState(false);

    // 监听输出变化，添加动画效果
    useEffect(() => {
        if (processedOutputs.length > 0) {
            setOutputVisible(true);
        } else {
            setOutputVisible(false);
        }
    }, [processedOutputs.length]);

    // DSLC 模式下输出调试日志
    useEffect(() => {
        if (dslcMode && processedOutputs.length > 0) {
            console.log('DSLC 模式下有输出:', cell.id, processedOutputs);
        }
    }, [dslcMode, processedOutputs, cell.id]);

    // 执行状态变量
    const wasExecuting = useRef(false);
    const prevMode = useRef(null);
    const [isTransitioningToOutput, setIsTransitioningToOutput] = useState(false);

    // 时间格式化
    const formatElapsedTime = useCallback((seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
                .toString()
                .padStart(2, '0')}`;
        }
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);

    // 执行 / 取消
    const handleExecute = useCallback(() => {
        executeCell(cell.id);
    }, [cell.id, executeCell]);

    const handleCancel = useCallback(() => {
        cancelCellExecution(cell.id);
    }, [cell.id, cancelCellExecution]);

    // 更新代码内容
    const handleChange = useCallback(
        (value) => {
            updateCell(cell.id, value);
        },
        [cell.id, updateCell]
    );

    // 清空输出
    const handleClearOutput = useCallback(() => {
        clearCellOutputs(cell.id);
    }, [cell.id, clearCellOutputs]);

    const editorRef = useRef(null);
    const codeContainerRef = useRef(null);
    const isCurrentCell = currentCellId === cell.id;

    // 快捷键：Ctrl+Enter 执行、Alt+↑/↓ 切换上下单元格
    const handleKeyDown = useCallback(
        (event) => {
            if (event.ctrlKey && event.key === 'Enter') {
                event.preventDefault();
                handleExecute();
            } else if (
                event.altKey &&
                (event.key === 'ArrowUp' || event.key === 'ArrowDown')
            ) {
                event.preventDefault();
                const currentIndex = cells.findIndex((c) => c.id === cell.id);
                const newIndex =
                    event.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;

                if (newIndex >= 0 && newIndex < cells.length) {
                    const targetCell = cells[newIndex];
                    setTimeout(() => {
                        if (targetCell.type === 'code') {
                            setCurrentCell(targetCell.id);
                            if (editorRef.current) {
                                editorRef.current.focus();
                            }
                        } else if (targetCell.type === 'markdown') {
                            setCurrentCell(targetCell.id);
                            setEditingCellId(targetCell.id);
                        }
                    }, 0);
                }
            }
        },
        [cell.id, cells, handleExecute, setCurrentCell, setEditingCellId]
    );

    // 渲染输出
    const renderOutput = useCallback((output) => {
        if (!output) return null;
        try {
            if (output.type === 'image') {
                return (
                    <div
                        key={output.key}
                        className="output-image-container flex justify-center items-center"
                    >
                        <div className="max-w-[80%] flex justify-center">
                            <img
                                src={
                                    typeof output.content === 'string'
                                        ? output.content
                                        : String(output.content)
                                }
                                alt={`Output ${output.key}`}
                                className="max-w-full h-auto object-contain"
                                onError={(e) => {
                                    console.error('Image load error:', e);
                                    e.target.style.display = 'none';
                                    const errorText = document.createElement('div');
                                    errorText.className = 'text-center text-red-500';
                                    errorText.textContent = 'Image load error';
                                    e.target.parentNode.appendChild(errorText);
                                }}
                            />
                        </div>
                    </div>
                );
            }
            if (output.type === 'error' || output.type === 'text') {
                const htmlContent = ansi_up.ansi_to_html(String(output.content || ''));
                return (
                    <pre
                        key={output.key}
                        className={`font-mono text-sm whitespace-pre-wrap break-words ${output.type === 'error' ? 'text-red-500' : ''
                            }`}
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                );
            }
        } catch (error) {
            console.error('Error rendering output:', error);
            return (
                <pre
                    key={`error-${Date.now()}-${Math.random()}`}
                    className="text-red-500"
                >
                    Error rendering output
                </pre>
            );
        }
        return null;
    }, []);

    // 切换显示模式
    const toggleCellMode = useCallback(() => {
        let newMode;
        if (cellMode === DISPLAY_MODES.COMPLETE) {
            newMode = DISPLAY_MODES.CODE_ONLY;
        } else if (cellMode === DISPLAY_MODES.CODE_ONLY) {
            newMode = DISPLAY_MODES.OUTPUT_ONLY;
        } else {
            newMode = DISPLAY_MODES.COMPLETE;
        }
        setCellMode(cell.id, newMode);
    }, [cellMode, cell.id, setCellMode]);

    const renderDisplayModeButton = () => {
        let icon;
        let title;
        switch (cellMode) {
            case DISPLAY_MODES.COMPLETE:
                icon = <Layout className="w-4 h-4" />;
                title = 'Complete mode';
                break;
            case DISPLAY_MODES.CODE_ONLY:
                icon = <Code className="w-4 h-4" />;
                title = 'Code Only';
                break;
            case DISPLAY_MODES.OUTPUT_ONLY:
                icon = <Monitor className="w-4 h-4" />;
                title = 'Output Only';
                break;
            default:
                icon = <Layout className="w-4 h-4" />;
                title = 'Complete mode';
        }
        return (
            <button
                onClick={toggleCellMode}
                className="p-2 hover:bg-gray-200 rounded"
                disabled={isStepMode && processedOutputs.length > 0}
                title={title}
            >
                {icon}
            </button>
        );
    };

    // 检测是否需要展示 AI Debug 按钮
    const showAIdebug = useMemo(() => {
        return cell.outputs && cell.outputs.length > 0 && cell.outputs[0].content === '[error-message-for-debug]';
    }, [cell.outputs]);

    // 执行按钮
    const renderExecuteButton = useCallback(() => {
        if (isExecuting) {
            return (
                <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-red-600 rounded flex items-center gap-2"
                    disabled={isCancelling}
                    title="Cancel execution"
                >
                    {isCancelling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Square className="w-4 h-4" />
                            <span className="text-xs">{formatElapsedTime(elapsedTime)}</span>
                        </>
                    )}
                </button>
            );
        }
        return (
            <button
                onClick={handleExecute}
                className="p-2 hover:bg-yellow-600 rounded"
                title="Execute cell (Ctrl+Enter)"
            >
                <Play className="w-4 h-4" />
            </button>
        );
    }, [
        isExecuting,
        isCancelling,
        elapsedTime,
        handleCancel,
        handleExecute,
        formatElapsedTime,
    ]);

    // —— 展开/收缩逻辑 ——  
    const EXPAND_THRESHOLD = 200; // 阈值高度
    const [isExpanded, setIsExpanded] = useState(false);
    const [isUserToggled, setIsUserToggled] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const codeBlockWrapperRef = useRef(null);
    const [contentHeight, setContentHeight] = useState(0);

    // 当有新输出时，自动展开代码区域便于查看
    useEffect(() => {
        if (processedOutputs.length > 0 && !isExpanded && contentHeight > EXPAND_THRESHOLD) {
            setIsExpanded(true);
            setIsUserToggled(true);
        }
    }, [processedOutputs.length, isExpanded, contentHeight]);

    // 当 cell 内容变化时重置用户切换状态
    useEffect(() => {
        setIsUserToggled(false);
    }, [cell.content]);

    // 使用 ResizeObserver 监听代码区域高度变化
    useEffect(() => {
        if (!codeBlockWrapperRef.current) return;

        const ro = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const newHeight = entry.target.scrollHeight;
                setContentHeight(newHeight);
                if (!isUserToggled) {
                    if (newHeight > EXPAND_THRESHOLD) {
                        setIsExpanded(false);
                    } else {
                        setIsExpanded(true);
                    }
                }
            }
        });
        ro.observe(codeBlockWrapperRef.current);

        return () => {
            ro.disconnect();
        };
    }, [cell.content, isUserToggled]);

    // 复制代码
    const handleCopyCode = useCallback(() => {
        navigator.clipboard.writeText(cell.content || '').then(
            () => {
                console.log('Code copied to clipboard');
            },
            (err) => {
                console.error('Copy failed:', err);
            }
        );
    }, [cell.content]);

    // 处理收缩时的滚动
    const handleCollapse = useCallback(() => {
        setIsUserToggled(true);
        setIsExpanded(false);

        if (codeContainerRef.current) {
            setTimeout(() => {
                codeContainerRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 100);
        }
    }, []);

    // DSLC 模式下隐藏工具栏或代码区域
    const shouldHideToolbar = dslcMode;
    const shouldHideCode = dslcMode && processedOutputs.length > 0;

    // 添加执行中占位符
    const renderExecutingPlaceholder = useCallback(() => {
        if (!isExecuting || processedOutputs.length > 0) return null;

        return (
            <div className="p-4 border-t rounded-b-lg flex flex-col items-center justify-center min-h-[100px] bg-gray-50 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <div className="text-sm text-gray-600 font-medium">Executing code...</div>
                </div>
                <div className="text-xs text-gray-500">Time elapsed: {formatElapsedTime(elapsedTime)}</div>
            </div>
        );
    }, [isExecuting, processedOutputs.length, elapsedTime, formatElapsedTime]);

    // 增强切换模式效果 - 立即切换到输出模式
    useEffect(() => {
        if (isExecuting && !wasExecuting.current) {
            // 保存当前模式用于执行后恢复
            prevMode.current = cellMode;

            // 立即切换到输出模式，不等待
            if (cellMode !== DISPLAY_MODES.OUTPUT_ONLY) {
                setCellMode(cell.id, DISPLAY_MODES.OUTPUT_ONLY);
            }
        }

        // 记录上一次的执行状态，用于检测状态变化
        wasExecuting.current = isExecuting;
    }, [isExecuting, cellMode, cell.id, setCellMode]);

    // 添加一个新的状态来控制工具栏的显示
    const [showToolbar, setShowToolbar] = useState(false);

    return (
        <div
            data-cell-id={cell.id}
            className={`code-cell-container codeCell bg-white/90 shadow-sm rounded-lg backdrop-blur-sm`}
            ref={codeContainerRef}
            style={{
                width: finished_thinking && dslcMode && showThinking ? 'fit-content' : '',
            }}
            onMouseEnter={() => setShowToolbar(true)}
            onMouseLeave={() => setShowToolbar(false)}
        >
            <div
                className={`mb-4 rounded-xl border backdrop-blur-md transition-all duration-500 ease-out 
                    ${isExecuting ? 'border-yellow-400/50 shadow-lg bg-white/95' : 'bg-white/90 text-black'}
                    ${isTransitioningToOutput ? 'transform scale-y-95 opacity-90' : ''}
                    hover:shadow-md
                `}
                onTransitionEnd={() => {
                    if (isTransitioningToOutput) {
                        setIsTransitioningToOutput(false);
                    }
                }}
            >
                {/* 顶部工具栏 - DSLC 模式下隐藏 */}
                {!shouldHideToolbar && (
                    <div className={`flex items-center justify-between p-2 rounded-t-lg border-none transition-opacity duration-200 ${showToolbar ? 'opacity-100' : 'opacity-0'}`}>
                        <div className="flex items-center gap-2">
                            {renderExecuteButton()}
                            <button
                                onClick={() => {
                                    console.log(`Initializing kernel for cell ${cell.id}`);
                                    useStore.getState().clearAllOutputs();
                                    useCodeStore.getState().restartKernel();
                                }}
                                className="p-2 hover:bg-rose-600 rounded"
                                title="Restart kernel"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleClearOutput}
                                className="p-2 hover:bg-yellow-600 rounded"
                                disabled={!processedOutputs.length}
                                title="Clear outputs"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {renderDisplayModeButton()}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(cell.id)}
                                    className="p-2 hover:bg-gray-600 rounded text-red-500"
                                    title="Delete cell"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {/* 右侧：AI Debug / Tooltip */}
                        <div className="flex items-center gap-2 relative">
                            {cell.description && <button className="peer p-2 text-black rounded-md hover:bg-rose-100">
                                <InfoIcon className="w-4 h-4" />
                            </button>}
                            <div className="absolute top-full right-0 px-5 py-3 rounded-lg opacity-0 peer-hover:opacity-100 transition-opacity w-[320px] break-words invisible peer-hover:visible z-50">
                                <div className="absolute inset-0 rounded-lg shadow-lg">
                                    <div className="absolute inset-0 bg-gradient-to-r from-rose-100/50 via-purple-100/50 to-pink-100/50 animate-gradient" />
                                </div>
                                <div className="relative z-10">
                                    <ReactMarkdown className="text-[15px] leading-relaxed tracking-wide text-gray-800">
                                        {cell.description || 'no ai description'}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            {showAIdebug && (
                                <button
                                    onClick={() => {
                                        console.log('AI Debug clicked!');
                                        useStore.getState().setCurrentCell(cell.id);
                                        sendCurrentCellExecuteCodeError_should_debug();
                                    }}
                                    className="px-2 py-1 bg-cyan-500 text-white rounded-md relative transition-all duration-300 ease-in-out hover:bg-cyan-600 hover:ring-2 hover:ring-cyan-300 hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-lg"
                                    title="AI Debug"
                                >
                                    <span className="flex items-center gap-1">
                                        <Sparkles size={14} /> Debug
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* 代码块区域：在 DSLC 指令执行时隐藏 */}
                {!shouldHideCode &&
                    (cellMode === DISPLAY_MODES.COMPLETE ||
                        cellMode === DISPLAY_MODES.CODE_ONLY) && (
                        <div
                            className="relative"
                            onMouseEnter={() => setIsHovering(true)}
                            onMouseLeave={() => setIsHovering(false)}
                        >
                            <div
                                className="relative overflow-hidden rounded-lg"
                                style={{
                                    maxHeight: contentHeight > EXPAND_THRESHOLD
                                        ? isExpanded
                                            ? `${contentHeight}px`
                                            : `${EXPAND_THRESHOLD}px`
                                        : 'none',
                                    transition: 'max-height 300ms ease-in-out',
                                    willChange: 'max-height',
                                }}
                            >
                                {/* Copy button - only show on hover */}
                                <div 
                                    className={`absolute top-2 right-2 z-10 flex flex-row gap-2 items-center transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                                >
                                    <button
                                        onClick={handleCopyCode}
                                        className="p-1.5 text-xs bg-gray-700/80 text-white rounded hover:bg-gray-600 transition-colors"
                                        title="Copy code"
                                    >
                                        Copy
                                    </button>
                                </div>

                                <div
                                    className="h-full overflow-auto"
                                    ref={codeBlockWrapperRef}
                                >
                                    <CodeMirror
                                        value={typeof cell.content === 'string' ? cell.content : String(cell.content || '')}
                                        height="auto"
                                        extensions={[python()]}
                                        onChange={handleChange}
                                        onKeyDown={handleKeyDown}
                                        theme={dracula}
                                        style={{
                                            fontSize: '16px',
                                            lineHeight: '1.5',
                                        }}
                                        readOnly={isExecuting || dslcMode}
                                        autoFocus={isCurrentCell && !dslcMode}
                                        ref={editorRef}
                                    />
                                    {isExecuting && !processedOutputs.length && (
                                        <div className="absolute inset-0 bg-gray-800/50 flex items-center justify-center rounded-b-lg">
                                            <Loader2 className="w-16 h-16 animate-spin text-red-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Expand/Collapse button */}
                                {contentHeight > EXPAND_THRESHOLD && (
                                    <div
                                        className={`absolute bottom-0 left-0 right-0 flex justify-center items-center z-30 transition-opacity duration-200 ${isHovering ? 'opacity-100' : 'opacity-0'}`}
                                    >
                                        {!isExpanded ? (
                                            <button
                                                onClick={() => {
                                                    setIsUserToggled(true);
                                                    setIsExpanded(true);
                                                }}
                                                className="px-4 py-1.5 text-sm bg-gray-900/90 text-white rounded-t-lg shadow-lg hover:bg-gray-800 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 flex items-center gap-1"
                                                title="Expand"
                                            >
                                                <span>Expand</span>
                                                <ChevronDown className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    setIsUserToggled(true);
                                                    setIsExpanded(false);
                                                    handleCollapse();
                                                }}
                                                className="px-4 py-1.5 text-sm bg-gray-900/90 text-white rounded-t-lg shadow-lg hover:bg-gray-800 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 flex items-center gap-1"
                                                title="Collapse"
                                            >
                                                <span>Collapse</span>
                                                <ChevronUp className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Gradient overlay for collapsed state */}
                                {!isExpanded && contentHeight > EXPAND_THRESHOLD && (
                                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-800 to-transparent pointer-events-none"></div>
                                )}
                            </div>
                        </div>
                    )}

                {/* 输出区域 - 添加执行状态标签和动画 */}
                {(cellMode === DISPLAY_MODES.COMPLETE || cellMode === DISPLAY_MODES.OUTPUT_ONLY || shouldHideCode) && (
                    <>
                        {/* 执行中占位符 */}
                        {renderExecutingPlaceholder()}

                        {/* 实际输出内容 */}
                        <div onClick={() => setShowThinking(!showThinking)}>
                            {finished_thinking && dslcMode && showThinking ? (
                                <div className="flex flex-col justify-center px-2"
                                >
                                    <div className="flex items-center gap-2 p-1"
                                    style={{
                                        width: 'fit-content',
                                    }}
                                    >
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-gray-600 font-medium">{thinkingText}</span>
                                    </div>
                                </div>
                            ) :
                                (processedOutputs.length > 0 && (
                                    <div
                                        className={`p-4 rounded-b-lg space-y-4 output-container relative transition-all duration-300 ease-in-out ${outputVisible ? 'opacity-100' : 'opacity-0'}`}
                                        key={`output-${processedOutputs.length}`}
                                    >
                                        <div className="relative">
                                            {isExecuting && cellMode !== DISPLAY_MODES.OUTPUT_ONLY && (
                                                <div className="absolute -top-2 right-0 flex items-center gap-1 text-xs bg-yellow-50 px-2 py-0.5 rounded-full border border-yellow-200">
                                                    <Loader2 className="w-3 h-3 animate-spin text-yellow-500" />
                                                    <span className="text-yellow-700">Running</span>
                                                </div>
                                            )}

                                            {
                                                processedOutputs.map((output, index) => (
                                                    <div
                                                        key={output.key}
                                                        className="transition-all duration-300"
                                                        style={{
                                                            opacity: outputVisible ? 1 : 0,
                                                            transform: outputVisible ? 'translateY(0)' : 'translateY(8px)',
                                                            transition: `opacity 300ms ease-out ${index * 50}ms, transform 300ms ease-out ${index * 50}ms`
                                                        }}
                                                    >
                                                        {renderOutput(output)}
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                )}
            </div>
        </div >
    );
};

export default React.memo(CodeCell);
