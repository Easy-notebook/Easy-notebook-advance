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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  if (!text || text.trim() === '') {
    return <div className="text-sm text-gray-400 italic">{t('rightSideBar.noContent')}</div>;
  }

  const lines = text.split('\n');
  const exceedsMaxLines = lines.length > maxLines;

  return (
    <div className="relative">
      <div
        className={`
          text-sm text-gray-700 leading-relaxed tracking-wide
          transition-all duration-200 ease-in-out
          prose prose-sm max-w-none break-words overflow-wrap-anywhere
          prose-headings:font-medium prose-headings:my-1 prose-headings:text-gray-800
          prose-p:my-0.5 prose-p:leading-6 prose-p:text-gray-700 prose-p:break-words
          prose-pre:bg-gray-100 prose-pre:rounded-md prose-pre:p-2 prose-pre:my-1 prose-pre:border prose-pre:overflow-x-auto prose-pre:text-xs
          prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:break-all
          prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0.5 prose-li:text-gray-700 prose-li:break-words
          prose-strong:text-gray-800 prose-em:text-gray-600
          prose-blockquote:border-l-gray-300 prose-blockquote:text-gray-600 prose-blockquote:break-words
          ${!isExpanded && exceedsMaxLines ? 'overflow-hidden' : ''}
        `}
        style={{
          maxHeight: !isExpanded && exceedsMaxLines ? `${maxLines * 1.5}em` : 'none',
          WebkitLineClamp: !isExpanded && exceedsMaxLines ? maxLines : 'none',
          display: !isExpanded && exceedsMaxLines ? '-webkit-box' : 'block',
          WebkitBoxOrient: !isExpanded && exceedsMaxLines ? 'vertical' : 'initial'
        }}
      >
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-blue-50 text-blue-700 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ) : (
                <code className={className}>{children}</code>
              );
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {exceedsMaxLines && (
        <button
          onClick={toggleExpand}
          className="mt-2 text-xs font-medium text-theme-600 hover:text-theme-800 transition-colors duration-300 flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={12} />
              {t('rightSideBar.collapseDetails')}
            </>
          ) : (
            <>
              <ChevronDown size={12} />
              {t('rightSideBar.viewDetails')}
            </>
          )}
        </button>
      )}
    </div>
  );
};

// 获取事件类型对应的标签
const getEventLabel = (type, t) => {
  const labelConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: {
      text: t('rightSideBar.eventTypes.question'),
      color: 'bg-theme-100 text-theme-800'
    },
    [EVENT_TYPES.USER_NEW_INSTRUCTION]: {
      text: t('rightSideBar.eventTypes.instruction'),
      color: 'bg-green-100 text-green-800'
    },
    [EVENT_TYPES.USER_FILE_UPLOAD]: {
      text: t('rightSideBar.eventTypes.upload'),
      color: 'bg-purple-100 text-purple-800'
    },
    [EVENT_TYPES.AI_UNDERSTANDING]: {
      text: t('rightSideBar.eventTypes.understanding'),
      color: 'bg-yellow-100 text-yellow-800'
    },
    [EVENT_TYPES.AI_EXPLAINING_PROCESS]: {
      text: t('rightSideBar.eventTypes.explaining'),
      color: 'bg-indigo-100 text-indigo-800'
    },
    [EVENT_TYPES.AI_WRITING_CODE]: {
      text: t('rightSideBar.eventTypes.coding'),
      color: 'bg-green-100 text-green-800'
    },
    [EVENT_TYPES.AI_RUNNING_CODE]: {
      text: t('rightSideBar.eventTypes.running'),
      color: 'bg-pink-100 text-pink-800'
    },
    [EVENT_TYPES.AI_ANALYZING_RESULTS]: {
      text: t('rightSideBar.eventTypes.analysis'),
      color: 'bg-teal-100 text-teal-800'
    },
    [EVENT_TYPES.AI_FIXING_BUGS]: {
      text: t('rightSideBar.eventTypes.debug'),
      color: 'bg-red-100 text-red-800'
    },
    [EVENT_TYPES.AI_CRITICAL_THINKING]: {
      text: t('rightSideBar.eventTypes.thinking'),
      color: 'bg-orange-100 text-orange-800'
    },
    [EVENT_TYPES.AI_REPLYING_QUESTION]: {
      text: t('rightSideBar.eventTypes.reply'),
      color: 'bg-theme-100 text-theme-800'
    },
    [EVENT_TYPES.AI_FIXING_CODE]: {
      text: t('rightSideBar.eventTypes.debug'),
      color: 'bg-gray-100 text-gray-800'
    },
    [EVENT_TYPES.SYSTEM_EVENT]: {
      text: t('rightSideBar.eventTypes.system'),
      color: 'bg-gray-100 text-gray-800'
    },
    [EVENT_TYPES.AI_GENERATING_CODE]: {
      text: t('rightSideBar.eventTypes.editing'),
      color: 'bg-blue-100 text-blue-800'
    },
    [EVENT_TYPES.AI_GENERATING_TEXT]: {
      text: t('rightSideBar.eventTypes.editing'),
      color: 'bg-purple-100 text-purple-800'
    }
  };

  return labelConfig[type] || {
    text: t('rightSideBar.eventTypes.event'),
    color: 'bg-theme-100 text-theme-800'
  };
};

const EventIcon = ({ type, className = 'w-5 h-5'}) => {
  const iconConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: {
      Icon: MessageSquare,
      color: 'text-theme-600'
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
      color: 'text-theme-800'
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

  const { Icon = ShieldCheck, color = 'text-theme-800' } = iconConfig[type] || {};

  return (
    <div className="relative">
      <Icon className={`${className} ${color} transition-colors duration-300`} />
    </div>
  );
};

const ViewSwitcher = () => {
  const { activeView, setActiveView } = useAIAgentStore();
  const { setIsRightSidebarCollapsed } = useStore();
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 text-lg items-center w-full justify-between">
      <div className="flex gap-1 flex-1 min-w-0">
        {['script', 'qa'].map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`
              px-2 py-2 rounded-md transition-all duration-300 flex items-center gap-1.5
              flex-shrink-0 min-w-0
              ${activeView === view
                ? 'bg-white text-theme-800 font-semibold'
                : 'text-gray-600 hover:bg-white/10'
              }
            `}
          >
            {view === 'script' ? 
              <Clock className="w-5 h-5 flex-shrink-0" /> : 
              <LucideMessageCircle className="w-5 h-5 flex-shrink-0" />
            }
            <span className="hidden sm:inline whitespace-nowrap overflow-hidden text-ellipsis">
              {view === 'script' ? t('rightSideBar.history') : t('rightSideBar.chat')}
            </span>
          </button>
        ))}
      </div>
      <button
        className="p-2 hover:bg-white/10 rounded-lg flex-shrink-0"
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
  const { t } = useTranslation();

  const { getCurrentStepCellsIDs, viewMode } = useStore();

  const actionsToShow = useMemo(() => {
    return actions.filter(action =>
      ((viewMode && action.viewMode === viewMode && viewMode === 'step') &&
        (getCurrentStepCellsIDs().includes(action.cellId))) ||
      (viewMode && action.viewMode === viewMode && (viewMode === 'complete' || viewMode === 'create')) ||
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
    const filtered = qaList.filter(qa => {
      // 如果QA没有viewMode，说明是旧数据，显示在所有模式下
      if (!qa.viewMode) {
        return true;
      }
      
      // 匹配当前视图模式
      if (qa.viewMode !== viewMode) {
        return false;
      }
      
      // 如果是step模式，需要检查cell ID
      if (viewMode === 'step') {
        return getCurrentStepCellsIDs().includes(qa.cellId);
      }
      
      // complete 和 dslc 模式显示所有匹配的QA
      return true;
    });
    
    console.log('QA filtering - Total QAs:', qaList.length, 'Filtered QAs:', filtered.length, 'Current viewMode:', viewMode);
    console.log('All QAs:', qaList.map(qa => ({ id: qa.id, viewMode: qa.viewMode, cellId: qa.cellId, content: qa.content.substring(0, 50) })));
    console.log('Filtered QAs:', filtered.map(qa => ({ id: qa.id, viewMode: qa.viewMode, cellId: qa.cellId, content: qa.content.substring(0, 50) })));
    
    return filtered;
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
          p-3 relative transition-all duration-300 min-w-0 break-words overflow-wrap-anywhere
          ${index === 0 && !isOriginal
            ? 'bg-white/10 rounded-lg ring-1 ring-theme-200'
            : 'hover:bg-white/10 hover:rounded-lg hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
          {!isOriginal && (
            <span className="text-xs font-semibold text-gray-700">
              [{totalCount - index}]
            </span>
          )}
          <EventIcon
            type={action.type}
            onProcess={action.onProcess}
          />
          <span className={`text-xs ${getEventLabel(action.type, t).color}`}>
            {getEventLabel(action.type, t).text}
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
          <div className="mt-3 p-3 bg-white/10 rounded-lg text-sm text-gray-600 min-w-0 break-words overflow-wrap-anywhere">
            <ExpandableText text={action.result} maxLines={3} />
          </div>
        )}

        {action.relatedQAIds?.length > 0 && (
          <button
            onClick={() => handleJumpToQA(action.relatedQAIds[0])}
            className="flex items-center gap-1 text-xs text-theme-600 hover:text-theme-800 mt-2 transition-colors duration-300"
          >
            <MessageSquare size={16} />
            <span>{t('rightSideBar.linkedToQA')} {action.relatedQAIds.join(', ')}</span>
          </button>
        )}
      </div>
    );
  }, [expandedGroups, toggleGroup, handleJumpToQA, t]);

  return (
    <>
      <div className="h-full flex flex-col bg-gray-50 min-w-0 overflow-hidden">
        <div className="h-16 w-full flex items-center justify-between px-3 sm:px-5 border-b border-white/10 bg-white/5 backdrop-blur-sm relative">
          <ViewSwitcher />
        </div>

        <div className="flex-1 px-2 sm:px-4 pb-5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50 min-w-0">
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
                        <div key={`${origAction.id}-${origIndex}`}>
                          {renderActionItem(origAction, true, origIndex, action.originalActions.length - 1)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeView === 'qa' && (
            <div className="space-y-4 py-4">
              {qasToShow.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{t('rightSideBar.noChatMessages')}</p>
                  <p className="text-xs mt-1">{t('rightSideBar.startConversation')}</p>
                </div>
              ) : (
                qasToShow.map((qa, index) => (
                  <div
                    key={qa.id}
                    id={qa.id}
                    className="w-full mb-3"
                  >
                    <div
                      className={`
                        relative p-4 rounded-lg shadow-sm w-full transition-all duration-300 min-w-0
                        ${index === 0
                          ? 'bg-white/20 ring-1 ring-theme-200'
                          : qa.type === 'user'
                            ? 'bg-blue-50 text-left hover:bg-blue-100'
                            : 'bg-gray-50 text-left hover:bg-gray-100'
                        }
                      `}
                    >
                      <div className={`flex items-center gap-2 mb-2 ${
                        qa.type === 'user' ? 'justify-start' : 'justify-start'
                      }`}>
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          qa.type === 'user' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {qa.type === 'user' ? t('rightSideBar.you') : t('rightSideBar.ai')}
                        </span>
                        <span className="text-xs text-gray-500">{qa.timestamp}</span>
                      </div>

                      <div className="text-left break-words overflow-wrap-anywhere min-w-0">
                        <ExpandableText text={qa.content} maxLines={5} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {isLoading && (
            <div
              className="
                flex items-center justify-center gap-3 text-theme-700 p-4 my-4 
                bg-white/10 rounded-lg animate-pulse transition-all duration-300
              "
            >
              <Loader2 className="animate-spin" size={24} />
              <span className="font-medium">{t('rightSideBar.processing')}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AIAgentSidebar;
