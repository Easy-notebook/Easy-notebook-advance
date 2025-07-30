import React, { useState, useEffect, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { AgentMemoryService, AgentType } from '../../services/agentMemoryService';
import useStore from '../../store/notebookStore';

interface AgentListProps {
  isCollapsed: boolean;
  onAgentSelect: (agentType: AgentType) => void;
  selectedAgentType?: AgentType | null;
  runningAgents?: Set<AgentType>; // 正在运行的agents
}

const AGENT_GROUPS = [
  {
    name: 'Basic',
    agents: [
      { type: 'general' as AgentType, icon: '🤖', title: 'General Agent' },
      { type: 'command' as AgentType, icon: '⚡', title: 'Command Agent' },
      { type: 'debug' as AgentType, icon: '🔧', title: 'Debug Agent' },
      { type: 'output' as AgentType, icon: '📊', title: 'Output Agent' }
    ]
  }
  // 未来将添加 DSLC 组
];

// 复用outline的StatusStyles
const StatusStyles = {
  colors: {
    completed: 'text-theme-600 bg-white/20 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
    'in-progress': 'text-theme-800 bg-white/20 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]',
    pending: 'text-black bg-white/10 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]'
  },
  steps: {
    completed: 'bg-theme-800 shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
    'in-progress': 'bg-theme-800 shadow-[0_2px_4px_rgba(0,0,0,0.1)]',
    pending: 'bg-gray-300/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]'
  }
};

const RunningIndicator = memo(() => (
  <div className="flex items-center">
    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
    <span className="text-xs text-green-600">Running</span>
  </div>
));

const TaskCount = memo(({ count }) => (
  <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
    {count}
  </span>
));

const AgentItem = memo(({ 
  agent, 
  isActive, 
  hasMemory, 
  isRunning,
  taskCount,
  onClick 
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 rounded-lg
        transition-all duration-300 text-sm tracking-wide relative
        backdrop-blur-sm
        ${isActive
          ? 'bg-white/10 text-theme-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
          : 'hover:bg-white/5 text-gray-700'}
      `}
    >
      <div className={`
        w-3 h-3 rounded-full flex-shrink-0
        ${hasMemory ? StatusStyles.steps['in-progress'] : StatusStyles.steps['pending']}
      `} />
      
      <span className="font-normal flex-1 text-left">{agent.title}</span>
      
      {isRunning && <RunningIndicator />}
      {!isRunning && hasMemory && taskCount > 0 && <TaskCount count={taskCount} />}
      
      {isActive && (
        <ArrowRight size={14} className="ml-1 text-theme-600" />
      )}
    </button>
  );
});

const formatLastActive = (timestamp: Date | null) => {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const AgentList: React.FC<AgentListProps> = ({ 
  isCollapsed, 
  onAgentSelect, 
  selectedAgentType,
  runningAgents = new Set()
}) => {
  const { t } = useTranslation();
  const { notebookId } = useStore();
  const [agentMemories, setAgentMemories] = useState<Record<AgentType, any>>({} as Record<AgentType, any>);

  useEffect(() => {
    if (!notebookId) return;

    const loadAgentMemories = () => {
      const memories: Record<AgentType, any> = {} as Record<AgentType, any>;
      
      AGENT_GROUPS.forEach(group => {
        group.agents.forEach(({ type }) => {
          const memory = AgentMemoryService.getAgentMemory(notebookId, type);
          if (memory) {
            memories[type] = memory;
          }
        });
      });
      
      setAgentMemories(memories);
    };

    loadAgentMemories();
    
    // 监听存储变化 - localStorage变化
    const handleStorageChange = (e) => {
      if (e.key === 'agent_memories_v2') {
        loadAgentMemories();
      }
    };
    
    // 监听自定义事件 - 内存变化
    const handleMemoryUpdate = (e) => {
      if (e.detail?.notebookId === notebookId) {
        loadAgentMemories();
      }
    };
    
    // 设置定时器进行轮询更新
    const pollInterval = setInterval(() => {
      loadAgentMemories();
    }, 2000); // 每2秒检查一次
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('agentMemoryUpdated', handleMemoryUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('agentMemoryUpdated', handleMemoryUpdate);
      clearInterval(pollInterval);
    };
  }, [notebookId]);

  const getAgentStats = useCallback((agentType: AgentType) => {
    const memory = agentMemories[agentType];
    if (!memory) return { interactions: 0, lastActive: null, taskCount: 0 };

    const taskCount = (memory.situation_tracking?.task_completion?.completed_requirements?.length || 0) +
                     (memory.situation_tracking?.task_completion?.pending_requirements?.length || 0) +
                     (memory.situation_tracking?.task_completion?.blocked_requirements?.length || 0);

    return {
      interactions: memory.interactions?.length || 0,
      lastActive: memory.last_updated ? new Date(memory.last_updated) : null,
      taskCount
    };
  }, [agentMemories]);

  const handleAgentClick = useCallback((agentType: AgentType) => {
    onAgentSelect(agentType);
  }, [onAgentSelect]);

  // 如果是折叠状态，不显示agents（因为没有足够空间）
  if (isCollapsed) {
    return null;
  }

  return (
    <div className="py-0.5">
      {AGENT_GROUPS.map((group) => (
        <div key={group.name} className="mb-3">
          {/* 组标题 */}
          <div className="px-2.5 mb-1">
            <h2 className="pl-2 text-base font-semibold text-theme-800">
              {group.name}
            </h2>
          </div>

          {/* 组内的agents */}
          <div className="px-2.5 space-y-0.5">
            {group.agents.map((agent) => {
              const stats = getAgentStats(agent.type);
              const isActive = selectedAgentType === agent.type;
              const hasMemory = !!agentMemories[agent.type];
              const isRunning = runningAgents.has(agent.type);
              
              return (
                <AgentItem
                  key={agent.type}
                  agent={agent}
                  isActive={isActive}
                  hasMemory={hasMemory}
                  isRunning={isRunning}
                  taskCount={stats.taskCount}
                  onClick={() => handleAgentClick(agent.type)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentList;