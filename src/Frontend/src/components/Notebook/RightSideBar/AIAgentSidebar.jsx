import { useState, useCallback, useMemo } from 'react';
import {
  Loader2,
  MessageSquare,
  UploadCloud,
  Eye,
  BookOpen,
  Code,
  PlayCircle,
  BarChart2,
  Bug,
  Wrench,
  AlertTriangle,
  MessageCircle,
  ShieldCheck,
  Server,
  Command,
  CircleX,
  Clock,
  LucideMessageCircle,
  Layers,
  ChevronDown,
  ChevronUp,
  Edit
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import useStore from '../../../store/notebookStore';
import { useAIAgentStore, EVENT_TYPES } from '../../../store/AIAgentStore';

/**
 * 可折叠的 Markdown 渲染组件。
 * 1. 默认仅显示一定行数（maxLines），并提供"展开/收起"按钮。
 * 2. 无需再区分是否是代码，任何输入都按 Markdown 进行渲染。
 */
const ExpandableText = ({ text, maxLines = 3 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => setIsExpanded(!isExpanded);

  const lines = text.split('\n');
  const exceedsMaxLines = lines.length > maxLines;

  return (
    <div className="relative">
      <div
        className={`
          text-sm text-gray-700 whitespace-pre-wrap transition-all duration-300
          ${!isExpanded && exceedsMaxLines ? 'line-clamp-3' : ''}
        `}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </ReactMarkdown>
      </div>

      {exceedsMaxLines && (
        <button
          onClick={toggleExpand}
          className="mt-2 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors duration-300"
        >
          {isExpanded ? 'Collapse Details' : 'View Details'}
        </button>
      )}
    </div>
  );
};

// 获取事件类型对应的标签
const getEventLabel = (type) => {
  const labelConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: {
      text: 'Question',
      color: 'bg-rose-100 text-rose-800'
    },
    [EVENT_TYPES.USER_NEW_INSTRUCTION]: {
      text: 'Instruction',
      color: 'bg-green-100 text-green-800'
    },
    [EVENT_TYPES.USER_FILE_UPLOAD]: {
      text: 'Upload',
      color: 'bg-purple-100 text-purple-800'
    },
    [EVENT_TYPES.AI_UNDERSTANDING]: {
      text: 'Understanding',
      color: 'bg-yellow-100 text-yellow-800'
    },
    [EVENT_TYPES.AI_EXPLAINING_PROCESS]: {
      text: 'Explaining',
      color: 'bg-indigo-100 text-indigo-800'
    },
    [EVENT_TYPES.AI_WRITING_CODE]: {
      text: 'Coding',
      color: 'bg-green-100 text-green-800'
    },
    [EVENT_TYPES.AI_RUNNING_CODE]: {
      text: 'Running',
      color: 'bg-pink-100 text-pink-800'
    },
    [EVENT_TYPES.AI_ANALYZING_RESULTS]: {
      text: 'Analysis',
      color: 'bg-teal-100 text-teal-800'
    },
    [EVENT_TYPES.AI_FIXING_BUGS]: {
      text: 'debug',
      color: 'bg-red-100 text-red-800'
    },
    [EVENT_TYPES.AI_CRITICAL_THINKING]: {
      text: 'Thinking',
      color: 'bg-orange-100 text-orange-800'
    },
    [EVENT_TYPES.AI_REPLYING_QUESTION]: {
      text: 'Reply',
      color: 'bg-rose-100 text-rose-800'
    },
    [EVENT_TYPES.AI_FIXING_CODE]: {
      text: 'Debug',
      color: 'bg-gray-100 text-gray-800'
    },
    [EVENT_TYPES.SYSTEM_EVENT]: {
      text: 'System',
      color: 'bg-gray-100 text-gray-800'
    },
    [EVENT_TYPES.AI_GENERATING_CODE]: {
      text: 'Editing',
      color: 'bg-blue-100 text-blue-800'
    },
    [EVENT_TYPES.AI_GENERATING_TEXT]: {
      text: 'Editing',
      color: 'bg-purple-100 text-purple-800'
    }
  };

  return labelConfig[type] || {
    text: 'Event',
    color: 'bg-rose-100 text-rose-800'
  };
};

const EventIcon = ({ type, className = 'w-5 h-5'}) => {
  const iconConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: {
      Icon: MessageSquare,
      color: 'text-rose-600'
    },
    [EVENT_TYPES.USER_NEW_INSTRUCTION]: {
      Icon: Command,
      color: 'text-green-600'
    },
    [EVENT_TYPES.USER_FILE_UPLOAD]: {
      Icon: UploadCloud,
      color: 'text-purple-600'
    },
    [EVENT_TYPES.AI_UNDERSTANDING]: {
      Icon: Eye,
      color: 'text-yellow-600'
    },
    [EVENT_TYPES.AI_EXPLAINING_PROCESS]: {
      Icon: BookOpen,
      color: 'text-indigo-600'
    },
    [EVENT_TYPES.AI_WRITING_CODE]: {
      Icon: Code,
      color: 'text-green-800'
    },
    [EVENT_TYPES.AI_RUNNING_CODE]: {
      Icon: PlayCircle,
      color: 'text-pink-600'
    },
    [EVENT_TYPES.AI_ANALYZING_RESULTS]: {
      Icon: BarChart2,
      color: 'text-teal-600'
    },
    [EVENT_TYPES.AI_FIXING_BUGS]: {
      Icon: Bug,
      color: 'text-red-600'
    },
    [EVENT_TYPES.AI_CRITICAL_THINKING]: {
      Icon: AlertTriangle,
      color: 'text-orange-600'
    },
    [EVENT_TYPES.AI_REPLYING_QUESTION]: {
      Icon: MessageCircle,
      color: 'text-rose-800'
    },
    [EVENT_TYPES.AI_FIXING_CODE]: {
      Icon: Wrench,
      color: 'text-gray-800'
    },
    [EVENT_TYPES.SYSTEM_EVENT]: {
      Icon: Server,
      color: 'text-gray-600'
    },
    [EVENT_TYPES.AI_GENERATING_CODE]: {
      Icon: Edit,
      color: 'text-green-800'
    },
    [EVENT_TYPES.AI_GENERATING_TEXT]: {
      Icon: Edit,
      color: 'text-indigo-800'
    }
  };

  const { Icon = ShieldCheck, color = 'text-rose-800' } = iconConfig[type] || {};

  return (
    <div className="relative">
      <Icon className={`${className} ${color} transition-colors duration-300`} />
    </div>
  );
};

const ViewSwitcher = () => {
  const { activeView, setActiveView } = useAIAgentStore();
  const { setIsRightSidebarCollapsed } = useStore();

  return (
    <div className="flex gap-3 text-lg items-center w-full justify-between">
      <div className="flex gap-3">
        {['script', 'qa'].map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`
              px-5 py-2 rounded-md transition-all duration-300 flex items-center gap-2
              ${activeView === view
                ? 'bg-white text-rose-800 font-semibold'
                : 'text-gray-600 hover:bg-white/10'
              }
            `}
          >
            {view === 'script' ? <Clock className="w-5 h-5" /> : <LucideMessageCircle className="w-5 h-5" />}
            {view === 'script' ? 'history' : 'Chat'}
          </button>
        ))}
      </div>
      <button
        className="p-2 hover:bg-white/10 rounded-lg"
        onClick={() => setIsRightSidebarCollapsed(false)}
      >
        <CircleX className="w-5 h-5 text-gray-700" />
      </button>
    </div>
  );
};

const AIAgentSidebar = () => {
  const {
    activeView,
    isLoading,
    actions,
    qaList,
    setActiveView,
  } = useAIAgentStore();

  // 追踪哪些合并组是展开状态
  const [expandedGroups, setExpandedGroups] = useState({});

  const { getCurrentStepCellsIDs, viewMode } = useStore();

  const actionsToShow = useMemo(() => {
    return actions.filter(action =>
      ((viewMode && action.viewMode === viewMode && viewMode === 'step') &&
        (getCurrentStepCellsIDs().includes(action.cellId))) ||
      (viewMode && action.viewMode === viewMode && viewMode === 'complete') ||
      (viewMode && action.viewMode === viewMode && viewMode === 'dslc')
    );
  }, [actions, viewMode, getCurrentStepCellsIDs]);

  // 合并连续相同类型的actions
  const mergedActionsToShow = useMemo(() => {
    if (actionsToShow.length === 0) return [];
    
    const mergedActions = [];
    let currentGroup = {
      ...actionsToShow[0],
      count: 1,
      originalActions: [actionsToShow[0]]
    };
    
    for (let i = 1; i < actionsToShow.length; i++) {
      const currentAction = actionsToShow[i];
      const prevAction = actionsToShow[i-1];
      
      // 如果当前action与上一个action类型相同，合并它们
      if (currentAction.type === prevAction.type) {
        currentGroup.count += 1;
        currentGroup.originalActions.push(currentAction);
        
        
        // 如果有任何一个正在处理中，则整组标记为处理中
        if (currentAction.onProcess) {
          currentGroup.onProcess = true;
        }
        
        // 合并关联的QA IDs (这个仍然需要合并)
        if (currentAction.relatedQAIds?.length) {
          currentGroup.relatedQAIds = [
            ...(currentGroup.relatedQAIds || []),
            ...(currentAction.relatedQAIds || [])
          ];
        }
      } else {
        // 类型不同，将当前组添加到结果中并开始新组
        mergedActions.push(currentGroup);
        currentGroup = {
          ...currentAction,
          count: 1,
          originalActions: [currentAction]
        };
      }
    }
    
    // 添加最后一组
    mergedActions.push(currentGroup);
    return mergedActions;
  }, [actionsToShow]);

  // 处理展开/折叠逻辑
  const toggleGroup = useCallback((actionId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  }, []);
  
  const qasToShow = useMemo(() => {
    return qaList.filter(qa =>
      ((viewMode && qa.viewMode === viewMode && viewMode === 'step') &&
        (getCurrentStepCellsIDs().includes(qa.cellId))) ||
      (viewMode && qa.viewMode === viewMode && viewMode === 'complete') ||
      (viewMode && qa.viewMode === viewMode && viewMode === 'dslc')
    );
  }, [qaList, viewMode, getCurrentStepCellsIDs]);

  const handleJumpToQA = useCallback((qaId) => {
    setActiveView('qa');
    requestAnimationFrame(() => {
      const qaElement = document.getElementById(qaId);
      if (qaElement) {
        qaElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [setActiveView]);

  // 渲染单个action项
  const renderActionItem = useCallback((action, isOriginal = false, index = 0, totalCount = 1) => {
    return (
      <div
        key={isOriginal ? `original-${action.id}-${index}` : action.id}
        className={`
          p-4 relative transition-all duration-300
          ${index === 0 && !isOriginal
            ? 'bg-white/10 rounded-lg ring-1 ring-rose-200'
            : 'hover:bg-white/10 hover:rounded-lg hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-3 mb-2">
          {!isOriginal && (
            <span className="text-xs font-semibold text-gray-700">
              [{totalCount - index}]
            </span>
          )}
          <EventIcon
            type={action.type}
            onProcess={action.onProcess}
          />
          <span className={`text-xs ${getEventLabel(action.type).color}`}>
            {getEventLabel(action.type).text}
          </span>
          {!isOriginal && action.count > 1 && (
            <button
              onClick={() => toggleGroup(action.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-300"
            >
              <Layers size={12} />
              <span className="text-xs font-medium">x{action.count}</span>
              {expandedGroups[action.id] ? 
                <ChevronUp size={12} /> : 
                <ChevronDown size={12} />
              }
            </button>
          )}
          <span className="text-xs text-gray-500">{action.timestamp}</span>
          {/* {action.onProcess && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
              working
            </span>
          )} */}
        </div>

        <ExpandableText text={action.content} maxLines={3} />

        {action.result && (
          <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm text-gray-600">
            <ExpandableText text={action.result} maxLines={3} />
          </div>
        )}

        {action.relatedQAIds?.length > 0 && (
          <button
            onClick={() => handleJumpToQA(action.relatedQAIds[0])}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 mt-2 transition-colors duration-300"
          >
            <MessageSquare size={16} />
            <span>Linked to Q&A {action.relatedQAIds.join(', ')}</span>
          </button>
        )}
      </div>
    );
  }, [expandedGroups, toggleGroup, handleJumpToQA]);

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50">
        <div className="h-16 w-full flex items-center justify-between px-5 border-b border-white/10 bg-white/5 backdrop-blur-sm relative">
          <ViewSwitcher />
        </div>

        <div className="flex-1 px-4 pb-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50">
          <style>{`
            .scrollbar-thin::-webkit-scrollbar {
              width: 4px;
            }
            .scrollbar-thin::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.3);
              border-radius: 4px;
            }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.5);
            }
            .scrollbar-thin {
              scrollbar-width: thin;
              scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
            }
          `}</style>

          {activeView === 'script' && (
            <div className="space-y-1 py-3">
              {mergedActionsToShow.map((action, index) => (
                <div key={action.id} className="space-y-1">
                  {renderActionItem(action, false, index, mergedActionsToShow.length)}
                  
                  {/* 如果组被展开且有多于1个操作，显示原始操作 */}
                  {expandedGroups[action.id] && action.count > 1 && (
                    <div className="space-y-3 mt-2 pb-2">
                      {action.originalActions.slice(1).map((origAction, origIndex) => (
                        renderActionItem(origAction, true, origIndex, action.originalActions.length - 1)
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeView === 'qa' && (
            <div className="space-y-4 py-4">
              {qasToShow.map((qa, index) => (
                <div
                  key={qa.id}
                  id={qa.id}
                  className={`flex ${qa.type === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`
                      relative p-4 rounded-lg shadow-sm max-w-md transition-all duration-300
                      ${index === 0
                        ? 'bg-white/10 ring-1 ring-rose-200'
                        : qa.type === 'user'
                          ? 'bg-white/10 text-left hover:bg-white/10'
                          : 'bg-white/10 text-right hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-semibold text-gray-700">
                        [{qasToShow.length - index}]
                      </span>
                      <EventIcon
                        type={
                          qa.type === 'assistant'
                            ? EVENT_TYPES.AI_REPLYING_QUESTION
                            : EVENT_TYPES.USER_ASK_QUESTION
                        }
                        onProcess={qa.onProcess}
                      />
                      <span className="text-xs text-gray-500">{qa.timestamp}</span>
                    </div>

                    <ExpandableText text={qa.content} maxLines={3} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div
              className="
                flex items-center justify-center gap-3 text-rose-700 p-4 my-4 
                bg-white/10 rounded-lg animate-pulse transition-all duration-300
              "
            >
              <Loader2 className="animate-spin" size={24} />
              <span className="font-medium">Processing your request...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIAgentSidebar;
