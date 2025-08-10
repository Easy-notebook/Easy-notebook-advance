import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Loader2, MessageSquare, UploadCloud, Eye, BookOpen, Code, PlayCircle,
  BarChart2, Bug, Wrench, AlertTriangle, MessageCircle as LucideMessageCircle,
  ShieldCheck, Server, Command, CircleX, Clock, Layers, ChevronDown,
  ChevronUp, Edit, List, CheckCircle, Circle, ArrowRight, MessageCircle,
  Zap, Brain, Image, Video, Bot, Users, Settings
} from 'lucide-react';
import { extractSectionTitle } from '../utils/String';

import useStore from '../../../store/notebookStore';
import { useAIAgentStore, EVENT_TYPES } from '../../../store/AIAgentStore';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/usePipelineStore'; 
import { useWorkflowStateMachine } from '../../senario/DSLCanalysis/store/workflowStateMachine';
import StateMachineDebugger from './StateMachineDebugger';
import AIPlanningContextDebugger from './AIPlanningContextDebugger';

// ----------------------
// Type Definitions
// ----------------------
import type { EventType } from '../../../store/AIAgentStore';

interface ExpandableTextProps { text: string; maxLines?: number; }
interface EventIconProps { type: EventType; className?: string; onProcess?: boolean; }

type ViewTypeExtended = 'script' | 'qa' | 'todo' | 'debug';

/**
 * 过滤文本内容，移除 section*(数字) 和 stage*(数字) 模式的字符串
 */
const filterSectionStageText = (text: string) => {
  if (!text || typeof text !== 'string') return text;
  
  // 移除各种可能的 section 和 stage 模式（不区分大小写）
  // 支持格式：section1, section 1, section_1, section-1, Section1, SECTION1 等
  return text
    .replace(/section[\s_-]*\d+/gi, '')
    .replace(/stage[\s_-]*\d+/gi, '')
    .replace(/第?\s*\d+\s*章节?/gi, '') // 中文章节
    .replace(/第?\s*\d+\s*阶段/gi, '') // 中文阶段
    .replace(/^\s*[-:：]\s*/g, '') // 移除开头的分隔符
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .trim(); // 去除首尾空格
};

// 工具调用显示组件
interface ToolCallProps {
  type: string;
  content?: string;
  agent?: string;
}

const ToolCallIndicator: React.FC<ToolCallProps> = ({ type, content, agent }) => {
  const getToolIcon = (toolType: string) => {
    switch (toolType.toLowerCase()) {
      case 'draw-image':
      case 'trigger_image_generation':
        return <Image className="w-4 h-4 text-purple-600" />;
      case 'create-video':
        return <Video className="w-4 h-4 text-indigo-600" />;
      case 'add-code':
      case 'exec-code':
        return <Code className="w-4 h-4 text-green-600" />;
      case 'thinking':
        return <Brain className="w-4 h-4 text-orange-600" />;
      case 'call-execute':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      case 'communicate':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'remember':
        return <Settings className="w-4 h-4 text-gray-600" />;
      default:
        return <Zap className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getToolLabel = (toolType: string) => {
    const labels: Record<string, string> = {
      'draw-image': '🎨 图片生成',
      'trigger_image_generation': '🎨 图片生成', 
      'create-video': '🎬 视频创建',
      'add-code': '💻 代码编写',
      'exec-code': '▶️ 代码执行',
      'thinking': '🤔 思考过程',
      'call-execute': '⚡ 立即执行',
      'communicate': '💬 Agent通信',
      'remember': '💾 信息记忆',
      'update-title': '📝 更新标题',
      'new-chapter': '📚 新建章节',
      'new-section': '📄 新建小节'
    };
    return labels[toolType] || `🔧 ${toolType}`;
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
      <div className="flex items-center gap-1">
        {getToolIcon(type)}
        <span className="text-sm font-medium text-gray-700">
          {getToolLabel(type)}
        </span>
      </div>
      {agent && (
        <div className="flex items-center gap-1 px-2 py-1 bg-white/70 rounded-md">
          <Bot className="w-3 h-3 text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">{agent}</span>
        </div>
      )}
      {content && content.length > 50 && (
        <span className="text-xs text-gray-500 truncate max-w-32">
          {content.substring(0, 50)}...
        </span>
      )}
    </div>
  );
};

// Agent信息显示组件
interface AgentInfoProps {
  agent?: string;
  model?: string;
  type?: string;
}

const AgentInfo: React.FC<AgentInfoProps> = ({ agent, model, type }) => {
  const getAgentIcon = (agentType?: string) => {
    switch (agentType) {
      case 'general':
        return <Bot className="w-4 h-4 text-blue-600" />;
      case 'text2image':
        return <Image className="w-4 h-4 text-purple-600" />;
      case 'text2video':
        return <Video className="w-4 h-4 text-indigo-600" />;
      case 'command':
        return <Command className="w-4 h-4 text-green-600" />;
      default:
        return <Brain className="w-4 h-4 text-orange-600" />;
    }
  };

  const getAgentName = (agentType?: string) => {
    const names: Record<string, string> = {
      'general': '通用助手',
      'text2image': '图像生成器',
      'text2video': '视频生成器', 
      'command': '代码助手'
    };
    return names[agentType || ''] || (agent || 'AI助手');
  };

  if (!agent && !type) return null;

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-md">
      {getAgentIcon(type || agent)}
      <span className="text-xs text-blue-700 font-medium">
        {getAgentName(type || agent)}
      </span>
      {model && (
        <span className="text-xs text-gray-500">
          ({model})
        </span>
      )}
    </div>
  );
};

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, maxLines = 3 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => setIsExpanded(!isExpanded);
  const { t } = useTranslation();

  // 应用过滤函数
  const filteredText = filterSectionStageText(text);

  if (!filteredText || filteredText.trim() === '') {
    return <div className="text-sm text-gray-400 italic">{t('rightSideBar.noContent')}</div>;
  }

  const lines = filteredText.split('\n');
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
          prose-code:text-theme-600 prose-code:bg-theme-50 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:break-all
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
                <code className="bg-theme-50 text-theme-700 px-1 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              ) : (
                <code className={className}>{children}</code>
              );
            }
          }}
        >
          {filteredText}
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
const getEventLabel = (type: EventType, t: any) => {
  const labelConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: { text: t('rightSideBar.eventTypes.question'), color: 'bg-theme-100 text-theme-800' },
    [EVENT_TYPES.USER_NEW_INSTRUCTION]: { text: t('rightSideBar.eventTypes.instruction'), color: 'bg-green-100 text-green-800' },
    [EVENT_TYPES.USER_FILE_UPLOAD]: { text: t('rightSideBar.eventTypes.upload'), color: 'bg-purple-100 text-purple-800' },
    [EVENT_TYPES.AI_UNDERSTANDING]: { text: t('rightSideBar.eventTypes.understanding'), color: 'bg-yellow-100 text-yellow-800' },
    [EVENT_TYPES.AI_EXPLAINING_PROCESS]: { text: t('rightSideBar.eventTypes.explaining'), color: 'bg-indigo-100 text-indigo-800' },
    [EVENT_TYPES.AI_WRITING_CODE]: { text: t('rightSideBar.eventTypes.coding'), color: 'bg-green-100 text-green-800' },
    [EVENT_TYPES.AI_RUNNING_CODE]: { text: t('rightSideBar.eventTypes.running'), color: 'bg-pink-100 text-pink-800' },
    [EVENT_TYPES.AI_ANALYZING_RESULTS]: { text: t('rightSideBar.eventTypes.analysis'), color: 'bg-teal-100 text-teal-800' },
    [EVENT_TYPES.AI_FIXING_BUGS]: { text: t('rightSideBar.eventTypes.debug'), color: 'bg-red-100 text-red-800' },
    [EVENT_TYPES.AI_CRITICAL_THINKING]: { text: t('rightSideBar.eventTypes.thinking'), color: 'bg-orange-100 text-orange-800' },
    [EVENT_TYPES.AI_REPLYING_QUESTION]: { text: t('rightSideBar.eventTypes.reply'), color: 'bg-theme-100 text-theme-800' },
    [EVENT_TYPES.AI_FIXING_CODE]: { text: t('rightSideBar.eventTypes.debug'), color: 'bg-gray-100 text-gray-800' },
    [EVENT_TYPES.SYSTEM_EVENT]: { text: t('rightSideBar.eventTypes.system'), color: 'bg-gray-100 text-gray-800' },
    [EVENT_TYPES.AI_GENERATING_CODE]: { text: t('rightSideBar.eventTypes.editing'), color: 'bg-theme-100 text-theme-800' },
    [EVENT_TYPES.AI_GENERATING_TEXT]: { text: t('rightSideBar.eventTypes.editing'), color: 'bg-purple-100 text-purple-800' }
  };
  return (labelConfig as Record<string, { text: string; color: string }>)[type] || { text: t('rightSideBar.eventTypes.event'), color: 'bg-theme-100 text-theme-800' };
};

const EventIcon: React.FC<EventIconProps> = ({ type, className = 'w-5 h-5' }) => {
  const iconConfig = {
    [EVENT_TYPES.USER_ASK_QUESTION]: { Icon: MessageSquare, color: 'text-theme-600' },
    [EVENT_TYPES.USER_NEW_INSTRUCTION]: { Icon: Command, color: 'text-green-600' },
    [EVENT_TYPES.USER_FILE_UPLOAD]: { Icon: UploadCloud, color: 'text-purple-600' },
    [EVENT_TYPES.AI_UNDERSTANDING]: { Icon: Eye, color: 'text-yellow-600' },
    [EVENT_TYPES.AI_EXPLAINING_PROCESS]: { Icon: BookOpen, color: 'text-indigo-600' },
    [EVENT_TYPES.AI_WRITING_CODE]: { Icon: Code, color: 'text-green-800' },
    [EVENT_TYPES.AI_RUNNING_CODE]: { Icon: PlayCircle, color: 'text-pink-600' },
    [EVENT_TYPES.AI_ANALYZING_RESULTS]: { Icon: BarChart2, color: 'text-teal-600' },
    [EVENT_TYPES.AI_FIXING_BUGS]: { Icon: Bug, color: 'text-red-600' },
    [EVENT_TYPES.AI_CRITICAL_THINKING]: { Icon: AlertTriangle, color: 'text-orange-600' },
    [EVENT_TYPES.AI_REPLYING_QUESTION]: { Icon: MessageCircle, color: 'text-theme-800' },
    [EVENT_TYPES.AI_FIXING_CODE]: { Icon: Wrench, color: 'text-gray-800' },
    [EVENT_TYPES.SYSTEM_EVENT]: { Icon: Server, color: 'text-gray-600' },
    [EVENT_TYPES.AI_GENERATING_CODE]: { Icon: Edit, color: 'text-green-800' },
    [EVENT_TYPES.AI_GENERATING_TEXT]: { Icon: Edit, color: 'text-indigo-800' }
  };
  const { Icon = ShieldCheck, color = 'text-theme-800' } = (iconConfig as Record<string, any>)[type] || {};
  return (
    <div className="relative">
      <Icon className={`${className} ${color} transition-colors duration-300`} />
    </div>
  );
};


// =========================================================
// ===        核心更新区域: WorkflowTODOPanel 组件        ===
// =========================================================
const WorkflowTODOPanel = () => {
  const { t } = useTranslation();
  const { workflowTemplate } = usePipelineStore();
  const { context: fsmContext } = useWorkflowStateMachine(); // 使用 FSM context 作为状态来源

  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // 使用 useMemo 预计算当前阶段和步骤的索引，以优化和简化渲染逻辑
  const executionIndices = useMemo(() => {
    if (!workflowTemplate || !fsmContext.currentStageId) {
      return { stageIndex: -1, stepIndex: -1 };
    }
    const stageIndex = workflowTemplate.stages.findIndex(s => s.id === fsmContext.currentStageId);
    if (stageIndex === -1) {
      return { stageIndex: -1, stepIndex: -1 };
    }
    const stepIndex = workflowTemplate.stages[stageIndex]?.steps.findIndex(st => st.id === fsmContext.currentStepId) ?? -1;
    return { stageIndex, stepIndex };
  }, [workflowTemplate, fsmContext]);

  const toggleStage = useCallback((stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  }, []);

  const renderStageStep = (step: any, currentStageIndex: number, stepIndex: number) => {
    const stepId = step.id; // 统一使用 id
    const isCurrent = executionIndices.stageIndex === currentStageIndex && executionIndices.stepIndex === stepIndex;
    const isCompleted = executionIndices.stageIndex > currentStageIndex || 
                       (executionIndices.stageIndex === currentStageIndex && executionIndices.stepIndex > stepIndex);

    return (
      <div key={stepId} className="ml-6 py-1 flex items-start gap-2 text-sm">
        <div className="flex-shrink-0 mt-1">
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isCurrent ? (
            <div className="w-4 h-4 rounded-full border-2 border-theme-600 animate-pulse" />
          ) : (
            <Circle className="w-4 h-4 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium break-words ${
            isCurrent ? 'text-theme-700' : 
            isCompleted ? 'text-green-700 line-through' : 'text-gray-600'
          }`}>
            {filterSectionStageText(step.title || extractSectionTitle(step.id))}
          </div>
        </div>
      </div>
    );
  };

  const renderStage = (stage: any, index: number) => {
    const isCurrent = executionIndices.stageIndex === index;
    const isCompleted = executionIndices.stageIndex > index;
    const isExpanded = expandedStages[stage.id] || isCurrent;
    const hasSteps = stage.steps && stage.steps.length > 0;

    return (
      <div key={stage.id} className="mb-3">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
            isCurrent ? 'bg-theme-100 ring-1 ring-theme-200' :
            isCompleted ? 'bg-green-50 hover:bg-green-100' : 
            'bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => hasSteps && toggleStage(stage.id)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className={`font-semibold text-sm break-words ${
                isCurrent ? 'text-theme-800' : 
                isCompleted ? 'text-green-800' : 'text-gray-700'
              }`}>
                {extractSectionTitle(stage.title || stage.id)}
              </div>
              {isCurrent && (
                <span className="text-xs px-2 py-0.5 bg-theme-200 text-theme-800 rounded-full font-medium">
                  {t('rightSideBar.currentStage')}
                </span>
              )}
               {isCompleted && (
                <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded-full font-medium">
                  {t('rightSideBar.completed')}
                </span>
              )}
            </div>
          </div>
          {hasSteps && (
            <div className="flex-shrink-0">
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          )}
        </div>
        
        {hasSteps && isExpanded && (
          <div className="mt-2 space-y-1">
            {stage.steps.map((step: any, stepIndex: number) => renderStageStep(step, index, stepIndex))}
          </div>
        )}
      </div>
    );
  };

  if (!workflowTemplate?.stages) {
      return <div className="p-4 text-center text-gray-500">{t('rightSideBar.noWorkflowPlan')}</div>;
  }

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800 flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          {t('rightSideBar.workflowStages')}
        </h4>
        {workflowTemplate.stages.map((stage, index) => renderStage(stage, index))}
      </div>
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
        {(['script', 'qa', 'todo', 'debug'] as ViewTypeExtended[]).map((view: ViewTypeExtended) => (
          <button
            key={view}
            onClick={() => setActiveView(view as any)}
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
              view === 'qa' ?
              <LucideMessageCircle className="w-5 h-5 flex-shrink-0" /> :
              view === 'debug' ?
              <Bug className="w-5 h-5 flex-shrink-0" /> :
              <List className="w-5 h-5 flex-shrink-0" />
            }
            <span className="hidden sm:inline whitespace-nowrap overflow-hidden text-ellipsis">
              {view === 'script' ? t('rightSideBar.history') : 
               view === 'qa' ? t('rightSideBar.chat') : 
               view === 'debug' ? 'Debug' :
               t('rightSideBar.workflow')}
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { t } = useTranslation();

  const { getCurrentStepCellsIDs, viewMode } = useStore();

  const actionsToShow = useMemo(() => {
    return actions.filter(action =>
      ((viewMode && action.viewMode === viewMode && viewMode === 'step') &&
        (getCurrentStepCellsIDs().includes(action.cellId ?? ''))) ||
      (viewMode && action.viewMode === viewMode && ((viewMode as any) === 'complete' || (viewMode as any) === 'create')) ||
      (viewMode && action.viewMode === viewMode && (viewMode as any) === 'dslc')
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
  const toggleGroup = useCallback((actionId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  }, []);
  
  const qasToShow = useMemo(() => {
    const filtered = qaList.filter((qa: any) => {
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
    
    return filtered;
  }, [qaList, viewMode, getCurrentStepCellsIDs]);

  const handleJumpToQA = useCallback((qaId: string) => {
    setActiveView('qa');
    requestAnimationFrame(() => {
      const qaElement = document.getElementById(qaId);
      if (qaElement) {
        qaElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [setActiveView]);

  // 渲染单个action项
  const renderActionItem = useCallback((action: any, isOriginal = false, index = 0, totalCount = 1) => {
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
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-theme-100 text-theme-800 hover:bg-theme-200 transition-colors duration-300"
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
            .scrollbar-thin::-webkit-scrollbar { width: 4px; }
            .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
            .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
            .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
            .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.3) transparent; }
          `}</style>

          {activeView === 'script' && (
            <div className="space-y-1 py-3">
              {mergedActionsToShow.map((action, index) => (
                <div key={action.id} className="space-y-1">
                  {renderActionItem(action, false, index, mergedActionsToShow.length)}
                  
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
                  <div key={qa.id} id={qa.id} className="w-full mb-3">
                    <div
                      className={`
                        relative p-4 rounded-lg shadow-sm w-full transition-all duration-300 min-w-0
                        ${index === 0
                          ? 'bg-white/20 ring-1 ring-theme-200'
                          : qa.type === 'user'
                            ? 'bg-theme-50 text-left hover:bg-theme-100'
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
                            ? 'bg-theme-100 text-theme-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {qa.type === 'user' ? t('rightSideBar.you') : t('rightSideBar.ai')}
                        </span>
                        
                        {/* 显示Agent信息 */}
                        {qa.type === 'assistant' && (
                          <AgentInfo 
                            agent={qa.agent} 
                            model={qa.model}
                            type={qa.agentType}
                          />
                        )}
                        
                        <span className="text-xs text-gray-500">{qa.timestamp}</span>
                      </div>

                      <div className="text-left break-words overflow-wrap-anywhere min-w-0">
                        <ExpandableText text={qa.content} maxLines={5} />
                      </div>

                      {/* 显示工具调用信息 */}
                      {qa.type === 'assistant' && qa.toolCalls && qa.toolCalls.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <div className="text-xs text-gray-500 mb-2">🛠️ 工具调用:</div>
                          {qa.toolCalls.map((tool: any, toolIndex: number) => (
                            <ToolCallIndicator 
                              key={`${qa.id}-tool-${toolIndex}`}
                              type={tool.type || tool.name}
                              content={tool.content || tool.arguments}
                              agent={tool.agent}
                            />
                          ))}
                        </div>
                      )}
                      
                      {/* 解析内容中的XML标签作为工具调用显示 */}
                      {qa.type === 'assistant' && qa.content && (
                        (() => {
                          // 简单的XML标签检测
                          const xmlTagRegex = /<([a-z-]+)(?:\s+[^>]*)?>[\s\S]*?<\/\1>/gi;
                          const matches = [...qa.content.matchAll(xmlTagRegex)];
                          
                          if (matches.length > 0) {
                            return (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs text-gray-500 mb-2">⚡ 执行的操作:</div>
                                {matches.slice(0, 3).map((match, matchIndex) => (
                                  <ToolCallIndicator
                                    key={`${qa.id}-xml-${matchIndex}`}
                                    type={match[1]}
                                    content={match[0].length > 100 ? match[0].substring(0, 100) + '...' : match[0]}
                                    agent={qa.agentType || qa.agent}
                                  />
                                ))}
                                {matches.length > 3 && (
                                  <div className="text-xs text-gray-400">
                                    还有 {matches.length - 3} 个操作...
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {(activeView as any) === 'todo' && <WorkflowTODOPanel />}
          
          {(activeView as any) === 'debug' && (
            <div className="space-y-4">
              <StateMachineDebugger />
              <AIPlanningContextDebugger />
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