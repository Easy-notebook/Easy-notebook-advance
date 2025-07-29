import { useState, useCallback, memo, useMemo, useEffect } from 'react';
import {
  MenuIcon,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import useStore from '../../../store/notebookStore';
import iconMapping from '../../../utils/iconMapping';
import useSettingsStore from '../../../store/settingsStore';
import FileTree from './FileExplorer';
import AgentList from '../../Agents/AgentList';
import { AgentType } from '../../../services/agentMemoryService';

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

const StatusIcon = memo(({ status }) => {
  if (status === 'completed') {
    return <CheckCircle2 size={16} className="text-theme-500" />;
  }
  return null;
});

const StepButton = memo(({ step, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
      transition-all duration-300 text-base tracking-wide relative
      backdrop-blur-sm
      ${isActive
        ? 'bg-white/10 text-theme-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
        : 'hover:bg-white/5 text-gray-700'}
    `}
  >
    <div className={`
      w-4 h-4 rounded-full flex-shrink-0
      ${isActive ? StatusStyles.steps['in-progress'] : StatusStyles.steps['pending']}
    `} />
    <span className="font-normal">{step.title}</span>
    {isActive && (
      <ArrowRight size={16} className="ml-auto text-theme-600" />
    )}
  </button>
));

const PhaseSection = memo(({
  phase,
  isExpanded,
  onToggle,
  onStepSelect,
  isActive,
  currentStepId,
  isTitle
}) => {
  const handleStepClick = useCallback((stepId) => {
    onStepSelect(phase.id, stepId);
  }, [phase.id, onStepSelect]);

  const IconComponent = iconMapping[phase.icon] || CheckCircle2;
  const introStep = phase.steps[0];
  const regularSteps = phase.steps.slice(1);

  const handleTitleClick = useCallback(() => {
    console.log('=== 大纲跳转调试 ===');
    console.log('点击的Phase ID:', phase.id);
    console.log('查找元素ID:', phase.id);
    
    onStepSelect(phase.id, introStep.id);
    if (regularSteps.length > 0) {
      onToggle();
    }
    
    // 检查TiptapNotebookEditor中是否有对应的标题元素
    const targetElement = document.getElementById(phase.id);
    console.log('找到的目标元素:', targetElement);
    
    if (targetElement) {
      console.log('元素标签名:', targetElement.tagName);
      console.log('元素文本内容:', targetElement.textContent);
      console.log('元素所在容器:', targetElement.closest('.tiptap-notebook-editor'));
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      console.log('已执行滚动');
    } else {
      console.log('未找到目标元素，检查所有标题:');
      // 特别检查TiptapNotebookEditor容器内的标题
      const tiptapContainer = document.querySelector('.tiptap-notebook-editor');
      if (tiptapContainer) {
        const headings = tiptapContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
        console.log('TiptapEditor中的标题元素:');
        headings.forEach(h => {
          console.log(`- ${h.tagName}: id="${h.id}", text="${h.textContent?.substring(0, 50)}"`);
        });
      } else {
        console.log('未找到TiptapNotebookEditor容器');
      }
    }
  }, [phase.id, introStep.id, onStepSelect, onToggle, regularSteps.length]);

  return (
    <div className="px-2.5">
      <div className="rounded-xl transition-all duration-300">
        <button
          onClick={handleTitleClick}
          className={`
            w-full flex items-center p-2.5 hover:bg-white/10 rounded-lg 
            transition-all duration-300 relative group backdrop-blur-sm
            ${isActive ? 'bg-white/10' : ''}
            ${currentStepId === introStep.id ? 'border-2 border-theme-500 shadow-[0_2px_8px_rgba(0,0,0,0.1)]' : ''}
          `}
        >
          {!isTitle && (<>
            <div className={`
            w-10 rounded-xl flex items-center justify-center
            ${StatusStyles.colors[isActive ? 'in-progress' : 'pending']}
            transition-all duration-300
            before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-b before:from-white/5 before:to-transparent
          `}>
              <IconComponent size={16} />
            </div>
            <div className="flex-1 min-w-0 flex items-center ml-2">
              <h3 className="font-bold tracking-wide text-base text-black">{phase.title}</h3>
            </div></>)}

          {isTitle && (
            <h2 className="pl-2 text-lg font-semibold text-theme-800">
              {phase.title}
            </h2>
          )}

          {regularSteps.length > 0 && (
            <div className="relative px-1.5">
              {isExpanded ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )}
            </div>
          )}
          {isActive && <StatusIcon status="in-progress" />}
        </button>

        {regularSteps.length > 0 && (
          <div className={`
            pl-8 mt-1.5 overflow-hidden transition-all duration-300
            ${isExpanded ? 'max-h-screen' : 'max-h-0'}
          `}>
            {regularSteps.map((step) => (
              <StepButton
                key={step.id}
                step={step}
                isActive={currentStepId === step.id}
                onClick={() => handleStepClick(step.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const MiniSidebar = memo(({ phases, currentPhaseId, onPhaseClick }) => (
  <div className="w-16 h-full flex flex-col bg-gray-50/80 backdrop-blur-xl">
    <div className="h-16 flex items-center justify-center">
      <button
        onClick={() => onPhaseClick(null)}
        className="p-2 hover:bg-white/10 rounded-lg transition-all duration-300"
        aria-label="Expand sidebar"
      >
        <MenuIcon size={16} className="text-gray-700" />
      </button>
    </div>
    <div className="flex-1 py-2.5">
      {phases.map((phase) => {
        const IconComponent = iconMapping[phase.icon] || CheckCircle2;
        return (
          <button
            key={phase.id}
            onClick={() => onPhaseClick(phase.id)}
            className={`
              w-full p-2 flex items-center justify-center
              hover:bg-white/10 transition-all duration-300
              ${currentPhaseId === phase.id ? 'text-theme-800 bg-white/10' : 'text-gray-400'}
            `}
            title={phase.title}
          >
            <div className={`
              w-8 rounded-lg flex items-center justify-center
              ${StatusStyles.colors[currentPhaseId === phase.id ? 'in-progress' : 'pending']}
              transition-all duration-300
              relative
            `}>
              <IconComponent size={16} />
              {currentPhaseId === phase.id && (
                <div className="absolute -top-1 -right-1 w-4 h-4">
                  <div className="w-4 h-4 rounded-full bg-theme-800 animate-ping" />
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-theme-800" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
));

const OutlineSidebar = ({
  tasks,
  currentPhaseId,
  currentStepId,
  onPhaseSelect,
  viewMode,
  onAgentSelect,
}) => {
  
  const isCollapsed = useStore((state) => state.isCollapsed);
  const setIsCollapsed = useStore((state) => state.setIsCollapsed);
  const settingstore = useSettingsStore();
  const notebookId = useStore((state) => state.notebookId);
  const [activeTab, setActiveTab] = useState('outline');
  const [isHovered, setIsHovered] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);

  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = {};
    tasks.forEach(task => {
      task.phases.forEach(phase => {
        initialState[phase.id] = phase.id === currentPhaseId;
      });
    });
    return initialState;
  });

  const currentTask = useMemo(() => {
    if (!currentPhaseId) return null;
    return tasks.find(task =>
      task.phases.some(phase => phase.id === currentPhaseId)
    );
  }, [tasks, currentPhaseId]);

  const projectName = currentTask?.title || (tasks && tasks.length > 0 ? tasks[0].title : '');

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [setIsCollapsed, isCollapsed]);

  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const handlePhaseClick = useCallback((phaseId) => {
    if (phaseId === null) {
      toggleCollapse();
      return;
    }
    const phase = tasks.flatMap(task => task.phases).find(p => p.id === phaseId);
    if (phase && phase.steps.length > 0) {
      onPhaseSelect(phaseId, phase.steps[0].id);
      setExpandedSections(prev => ({
        ...prev,
        [phaseId]: true
      }));
    }
  }, [toggleCollapse, onPhaseSelect, tasks]);

  const handleAgentSelect = useCallback((agentType: AgentType) => {
    setSelectedAgentType(agentType);
    onAgentSelect?.(agentType);
  }, [onAgentSelect]);

  const allPhases = useMemo(() => tasks.flatMap(task => task.phases), [tasks]);

  useEffect(() => {
    if (currentStepId) {
      const allPhasesFlat = tasks.flatMap(task => task.phases);
      const phaseOfcurrentStep = allPhasesFlat.find(phase =>
        phase.steps.some(step => step.id === currentStepId)
      );
      if (phaseOfcurrentStep) {
        setExpandedSections(prev => ({
          ...prev,
          [phaseOfcurrentStep.id]: true
        }));
      }
    }
  }, [currentStepId, tasks]);

  if (isCollapsed) {
    return (
      <MiniSidebar
        phases={allPhases}
        currentPhaseId={currentPhaseId}
        onPhaseClick={handlePhaseClick}
      />
    );
  }

  return (
    <div
      className="relative h-full flex flex-col isolate overflow-hidden bg-gray-50"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 顶部区域：左侧折叠按钮 + 文件/大纲 Tab + 设置按钮 */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10 bg-white/5 backdrop-blur-sm relative">
        <div className="flex items-center">
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-white/10 rounded-lg transition-transform duration-300 relative"
            aria-label="Collapse sidebar"
          >
            <MenuIcon size={16} className="text-gray-700" />
          </button>

          {/* 大纲/文件/Agent Tab 切换 */}
          <div className="ml-4 flex space-x-1">
            <button
              onClick={() => setActiveTab('outline')}
              className={`
                px-2 py-1 rounded text-xs
                ${activeTab === 'outline' ? 'bg-white text-theme-800 font-semibold'
                  : 'text-gray-600 hover:bg-white/10'}
              `}
            >
              Outline
            </button>
            <button
              onClick={() => setActiveTab('file')}
              className={`
                px-2 py-1 rounded text-xs
                ${activeTab === 'file' ? 'bg-white text-theme-800 font-semibold'
                  : 'text-gray-600 hover:bg-white/10'}
              `}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              className={`
                px-2 py-1 rounded text-xs
                ${activeTab === 'agents' ? 'bg-white text-theme-800 font-semibold'
                  : 'text-gray-600 hover:bg-white/10'}
              `}
            >
              Agents
            </button>
          </div>
        </div>

        <button className="p-2 hover:bg-white/10 rounded-lg">
          <Settings2 size={16} className="text-gray-700" onClick={settingstore.openSettings} />
        </button>
      </div>

      {/* 中间内容：根据 activeTab 切换显示 */}
      <div className="flex-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50">
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

        {activeTab === 'file' ? (
          // 文件视图：使用新的 FileTree 组件
          <div className="flex-1 h-full w-full relative">
            <FileTree notebookId={notebookId} projectName={projectName} />
          </div>
        ) : activeTab === 'agents' ? (
          // Agent视图：显示AI代理列表
          <div className="flex-1 h-full w-full relative">
            <AgentList 
              isCollapsed={false}
              onAgentSelect={handleAgentSelect}
              selectedAgentType={selectedAgentType}
            />
          </div>
        ) : (
          // 大纲视图：显示任务和阶段
          <div className="py-0.5">
            {tasks.map((task) => (
              <div key={task.id} className="mb-5">
                {task.phases.map((phase, index) => (
                  <PhaseSection
                    key={phase.id}
                    isTitle={index === 0}
                    phase={phase}
                    isExpanded={expandedSections[phase.id]}
                    onToggle={() => toggleSection(phase.id)}
                    onStepSelect={onPhaseSelect}
                    isActive={currentPhaseId === phase.id}
                    currentStepId={currentStepId}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部区域：
           - 若 viewMode === 'step' 且存在 currentPhaseId，则显示大底部栏；
           - 否则仅当 activeTab === 'file' 且鼠标悬停时显示窄底部栏，
             否则不显示底部区域。 */}
      {viewMode === 'step' && currentPhaseId ? (
        <div className="w-full h-20 pl-7 flex items-center border-t border-gray-200 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
          <div className="w-4 h-4 rounded-full bg-theme-800 mr-4 animate-pulse shadow-lg" />
          <span className="font-medium tracking-wide text-theme-800 relative text-base">
            {tasks.flatMap(task => task.phases).find(p => p.id === currentPhaseId)?.title || ''}
          </span>
        </div>
      ) : (
        activeTab === 'file' && isHovered ? (
          <div className="w-full h-10 pl-7 flex items-center justify-start border-t border-gray-200 relative">
            <span className="font-medium tracking-wide text-theme-800 relative text-base truncate overflow-hidden whitespace-nowrap">
              {'drop files to upload'}
            </span>
          </div>
        ) :
          <div className="w-full h-10"></div>
      )}
    </div>
  );
};

export default memo(OutlineSidebar);