import { useState, useEffect, useRef, memo } from 'react';
import { Loader2 } from 'lucide-react';
import useNotebookStore from '../../../../store/notebookStore';

import MarkdownCell from '../../../Editor/MarkdownCell';
import HybridCell from '../../../Editor/HybridCell';
import CodeCell from '../../../Editor/CodeCell';
import AgentThinkingIndicator from '../UI/AgentThinkingIndicator';

import { SHOT_TYPES, ANIMATION } from '../store/useScriptStore';
import useScriptStore from '../store/useScriptStore';

const animations = {
    fadeIn: 'animate-fade-in',
    pulseOnce: 'animate-pulse-once',
    pulse: 'animate-pulse',
    slideIn: 'animate-slide-in',
    grow: 'animate-grow'
};

const Shot = memo(({ cell, onRemove }) => {
    const shotRef = useRef(null);
    const [isNew, setIsNew] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [animationClass, setAnimationClass] = useState('');

    useEffect(() => {
        if (shotRef.current) {
            if (isNew) {
                // 新增镜头时应用 fadeIn 动画
                setAnimationClass(animations.fadeIn);
            } else {
                // 更新镜头时应用 pulseOnce 动画
                setIsUpdating(true);
                setAnimationClass(animations.pulseOnce);
            }
            // 动画持续时间结束后清除动画类名，并更新状态
            const timer = setTimeout(() => {
                setAnimationClass('');
                setIsNew(false);
                setIsUpdating(false);
            }, ANIMATION.TRANSITION);
            return () => clearTimeout(timer);
        }
    }, [cell.timestamp, isNew]);

    /**
     * 根据镜头的状态和类型返回对应的背景颜色类名
     * @returns {string} Tailwind CSS 背景颜色类
     */
    const getBgColor = () => {
        if (isNew || isUpdating) {
            switch (cell.type) {
                case SHOT_TYPES.ACTION:
                    return 'bg-purple-50';
                case SHOT_TYPES.DIALOGUE:
                    return 'bg-blue-50';
                case SHOT_TYPES.ATTACHMENT:
                    return 'bg-green-50';
                case SHOT_TYPES.OUTCOME:
                    return 'bg-amber-50';
                case SHOT_TYPES.ERROR:
                    return 'bg-red-50';
                default:
                    return 'bg-yellow-50';
            }
        }
        return 'bg-white';
    };

    /**
     * 根据 cell 类型和其他属性获取显示在镜头左上角的标签信息
     * @returns {Object} 包含文本、背景和文字颜色的对象
     */
    const getTypeLabel = () => {
        let label;
        switch (cell.type) {
            case SHOT_TYPES.ACTION:
                label = { text: 'Action', bg: 'bg-purple-100', textColor: 'text-purple-800' };
                break;
            case SHOT_TYPES.DIALOGUE:
                label = { text: 'Dialogue', bg: 'bg-blue-100', textColor: 'text-blue-800' };
                break;
            case SHOT_TYPES.ATTACHMENT:
                label = { text: 'Attachment', bg: 'bg-green-100', textColor: 'text-green-800' };
                break;
            case SHOT_TYPES.OUTCOME:
                label = { text: 'Outcome', bg: 'bg-amber-100', textColor: 'text-amber-800' };
                break;
            case SHOT_TYPES.ERROR:
                label = { text: 'Error', bg: 'bg-red-100', textColor: 'text-red-800' };
                break;
            default:
                label = { text: 'Shot', bg: 'bg-gray-100', textColor: 'text-gray-800' };
        }
        // 如果 cell 存在 mode 信息且经过修改，则在标签文本后加上标记
        return {
            text: `${label.text} | ${cell.mode}${cell.isModified ? ' *' : ''}`,
            bg: label.bg,
            textColor: label.textColor
        };
    };

    // 生成镜头的唯一标识符（兼容特殊字符）
    const actionId = `cell-${cell.id}`.replace(/[^a-zA-Z0-9-_]/g, '-');
    const typeInfo = getTypeLabel();

    return (
        <div
            ref={shotRef}
            id={actionId}
            className={`relative border border-gray-200 rounded-md mb-3 transition-all duration-300 ${getBgColor()} ${animationClass} shadow-sm`}
            role="region"
            aria-label={`${typeInfo.text} cell`}
        >
            {/* 如果 metadata 指定显示类型标签，则渲染标签 */}
            {cell.metadata?.showTypeLabel !== false && (
                <div className={`absolute top-0 left-0 ${typeInfo.bg} px-2 py-1 text-xs ${typeInfo.textColor} rounded-tl-md rounded-br-md`}>
                    {typeInfo.text}
                </div>
            )}

            <div className={`p-4 ${cell.metadata?.showTypeLabel !== false ? 'pt-7' : ''}`}>
                {/* 渲染自定义图标和标题（如果存在） */}
                {cell.metadata?.icon && (
                    <div className="flex items-center mb-2">
                        {cell.metadata.icon}
                        {cell.metadata?.title && (
                            <span className="ml-2 font-medium text-gray-700">{cell.metadata.title}</span>
                        )}
                    </div>
                )}

                {/* 如果 cell 正在处理状态，显示加载动画和提示 */}
                {cell.metadata?.isProcessing && (
                    <div className="flex items-center text-blue-600 mb-2" aria-live="polite">
                        <Loader2 className="animate-spin mr-2" size={16} />
                        <span className="text-sm">Processing...</span>
                    </div>
                )}

                {/* 渲染 cell 内容，可以通过 metadata 传入自定义样式类名 */}
                <div className={cell.metadata?.className || ''}>
                    {cell.content}
                </div>
            </div>

            {/* 如果允许删除，并且 metadata 未隐藏删除按钮，则显示删除按钮 */}
            {onRemove && cell.metadata?.hideRemoveButton !== true && (
                <button
                    onClick={() => onRemove(cell.id)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100"
                    aria-label="Remove cell"
                >
                    ×
                </button>
            )}
        </div>
    );
});

/**
 * 主场景容器组件（AnimatedStepContainer）
 * 用于展示当前场景中所有镜头，并提供自动滚动、镜头渲染定制、删除操作等功能。
 *
 * @param {Object} props - 组件属性
 * @param {boolean} [props.allowRemoval=true] - 是否允许删除镜头
 * @param {string|null} [props.maxHeight=null] - 容器最大高度（超出则滚动）
 * @param {string} [props.className=""] - 自定义容器样式类名
 * @param {Function|null} [props.shotTypeRenderer=null] - 自定义镜头渲染器函数
 * @param {boolean} [props.autoScroll=true] - 新增镜头时是否自动滚动到底部
 * @param {boolean} [props.showRemoveButton=true] - 是否显示删除按钮（默认 true，可被 cell 的 metadata 覆盖）
 * @param {React.ReactNode|null} [props.emptyState=null] - 空镜头时展示的内容
 * @param {boolean} [props.useBuiltInRenderer=true] - 是否使用内置的渲染器
 * @param {string|null} [props.stepId=null] - 指定场景 id，用于切换场景
 */
const AnimatedStepContainer = ({
    allowRemoval = true,
    maxHeight = null,
    className = "",
    shotTypeRenderer = null,
    autoScroll = true,
    showRemoveButton = true,
    emptyState = null,
    useBuiltInRenderer = true,
}) => {
    const { actions, loading, removeShot } = useScriptStore();
    const containerRef = useRef(null);


    useEffect(() => {
        if (autoScroll && containerRef.current && actions.length > 0) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [actions.length, autoScroll]);

    const defaultRenderer = (cell, onRemoveHandler) => {
        const notebookCells = useNotebookStore.getState().cells;
        const notebookCell = notebookCells.find(c => c.id === cell.id);

        const shotProps = {
            cell: {
                id: cell.id,
                type: cell.type,
                content: cell.content,
                outputs: notebookCell?.outputs || cell.metadata?.outputs || [],
                enableEdit: cell.metadata?.enableEdit !== false,
                description: cell.metadata?.description || '',
                language: cell.metadata?.language || 'python',
                textArray: cell.textArray || [],
                agentName: cell.metadata?.agentName || 'AI',
                customText: cell.metadata?.customText || null
            },
            className: "w-full",
            onDelete: onRemoveHandler ? () => onRemoveHandler(cell.id) : undefined,
            onUpdate: cell.metadata?.onUpdate,
            dslcMode: true,
            finished_thinking: cell.metadata?.finished_thinking || false,
            thinkingText: cell.metadata?.thinkingText || "finished thinking",
            isStepMode: true
        };

        switch (cell.type) {
            case SHOT_TYPES.HYBRID:
                return <HybridCell key={cell.id} {...shotProps} />;
            case SHOT_TYPES.ACTION:
                return <CodeCell key={cell.id} {...shotProps} />;
            case SHOT_TYPES.DIALOGUE:
                return <MarkdownCell key={cell.id} {...shotProps} />;
            case SHOT_TYPES.THINKING:
                return <AgentThinkingIndicator key={cell.id} {...shotProps} />;
            default:
                return <Shot key={cell.id} cell={cell} onRemove={onRemoveHandler} />;
        }
    };

    const renderShot = (cell) => {
        if (cell.metadata?.couldVisibleInWritingMode === false && !useScriptStore.getState().isStepInDeductionMode()) {
            return null;
        }
        const shouldAllowRemoval =
            allowRemoval &&
            (cell.metadata?.hideRemoveButton !== undefined
                ? !cell.metadata.hideRemoveButton
                : showRemoveButton);

        if (shotTypeRenderer && typeof shotTypeRenderer === 'function') {
            return shotTypeRenderer(cell, shouldAllowRemoval ? removeShot : null);
        }
        if (useBuiltInRenderer) {
            return defaultRenderer(cell, shouldAllowRemoval ? removeShot : null);
        }
        return <Shot key={cell.id} cell={cell} onRemove={shouldAllowRemoval ? removeShot : null} />;
    };

    return (
        <div
            ref={containerRef}
            className={`flex flex-col w-full overflow-y-auto ${className}`}
            style={{ maxHeight: maxHeight || 'auto' }}
            role="list"
            aria-label="step cell container"
        >
            {actions.length === 0 && !loading && emptyState}
            {actions.map(renderShot)}
        </div>
    );
};

const ShotAnimations = () => (
    <style>{`
        @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
        animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
        }
        .animate-pulse {
        animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulseOnce {
        0% { background-color: inherit; }
        50% { background-color: rgba(243, 244, 246, 0.8); }
        100% { background-color: inherit; }
        }
        .animate-pulse-once {
        animation: pulseOnce 0.6s ease-in-out;
        }
        @keyframes slideIn {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
        animation: slideIn 0.4s ease-out;
        }
        @keyframes growHeight {
        from { max-height: 0; opacity: 0; }
        to { max-height: 1000px; opacity: 1; }
        }
        .animate-grow {
        animation: growHeight 0.5s ease-out;
        overflow: hidden;
        }
    `}</style>
);


const PersistentStepContainer = ({
    storageKey = 'animated-step-container',
    autoSave = true,
    saveInterval = 30000,
    ...props
}) => {
    const { exportScript, importScript } = useScriptStore();

    useEffect(() => {
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                importScript(parsedData);
            }
        } catch (error) {
            console.error('Error loading persistent step data:', error);
        }
    }, [storageKey, importScript]);

    useEffect(() => {
        if (!autoSave) return;
        const saveData = () => {
            try {
                const data = exportScript();
                localStorage.setItem(storageKey, JSON.stringify(data));
            } catch (error) {
                console.error('Error saving persistent step data:', error);
            }
        };
        const interval = setInterval(saveData, saveInterval);
        return () => {
            clearInterval(interval);
            saveData();
        };
    }, [autoSave, saveInterval, storageKey, exportScript]);

    return (
        <>
            {/* 注入动画 CSS */}
            <ShotAnimations />
            <AnimatedStepContainer {...props} />
        </>
    );
};

export {
    AnimatedStepContainer,
    PersistentStepContainer,
    Shot,
};

export default AnimatedStepContainer;
