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
import { SHARED_STYLES, LAYOUT_CONSTANTS } from './shared/constants';

// 导入共享组件
import {
  StatusIcon,
  StatusDot,
  SidebarButton,
  TabSwitcher,
  SidebarContainer,
  SidebarHeader,
  SidebarContent
} from './shared/components';

// 使用共享的样式常量
const StatusStyles = SHARED_STYLES.status;

const StepButton = memo(({ step, isActive, onClick }) => (
  <SidebarButton
    isActive={isActive}
    onClick={onClick}
    className="text-base tracking-wide"
  >
    <StatusDot
      status={isActive ? 'in-progress' : 'pending'}
      size="sm"
    />
    <span className="font-normal">{step.title}</span>
  </SidebarButton>
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
  const IconComponent = iconMapping[phase.icon] || CheckCircle2;
  const introStep = phase.steps[0];
  const regularSteps = phase.steps.slice(1);

  const scrollToElement = useCallback((elementId: string) => {
    console.log('🎯 尝试滚动到元素:', elementId);

    // 使用双重 requestAnimationFrame 确保 DOM 更新完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
      const targetElement = document.getElementById(elementId);
      if (targetElement) {
        console.log('✅ 找到目标元素:', targetElement);

        // 查找滚动容器 - 主内容区域
        const scrollContainer = document.querySelector('.flex-1.overflow-y-auto.scroll-smooth') ||
                               document.querySelector('.flex-1.overflow-y-auto') ||
                               document.querySelector('[class*="overflow-y-auto"]') ||
                               document.documentElement;

        console.log('📦 使用滚动容器:', scrollContainer);

        // 计算目标元素相对于滚动容器的位置
        const targetRect = targetElement.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();

        console.log('📍 目标元素位置:', { top: targetRect.top, left: targetRect.left });
        console.log('📍 容器位置:', { top: containerRect.top, left: containerRect.left });

        // 如果是文档元素，使用 scrollIntoView
        if (scrollContainer === document.documentElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // 如果是特定容器，计算滚动位置
          const scrollTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 20; // 20px 偏移
          console.log('📊 滚动计算:', {
            targetTop: targetRect.top,
            containerTop: containerRect.top,
            currentScrollTop: scrollContainer.scrollTop,
            newScrollTop: scrollTop
          });

          scrollContainer.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });

          // 添加多个备用的滚动方法，以防第一个不工作
          setTimeout(() => {
            console.log('🔄 执行备用滚动方法 1: scrollIntoView');
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);

          // 第二个备用方法：强制滚动到页面顶部然后滚动到元素
          setTimeout(() => {
            console.log('🔄 执行备用滚动方法 2: 强制滚动');
            const elementTop = targetElement.offsetTop;
            const container = scrollContainer as HTMLElement;
            if (container && container.scrollTo) {
              container.scrollTo({ top: elementTop - 50, behavior: 'smooth' });
            }
          }, 200);
        }

        console.log('✅ 滚动命令已执行');
        return true;
      }

      console.log('⚠️ 直接查找失败，尝试在 TiptapNotebookEditor 容器内查找');
      // 如果直接查找失败，尝试在 TiptapNotebookEditor 容器内查找
      const tiptapContainer = document.querySelector('.tiptap-notebook-editor');
      if (tiptapContainer) {
        // 优先用 meta 属性精准匹配（data-base-id + data-heading-key），避免仅依赖 id
        const [baseId, key] = elementId.includes('--') ? elementId.split('--') : [elementId, ''];
        let heading = null as HTMLElement | null;
        if (key) {
          heading = tiptapContainer.querySelector(`[data-base-id="${CSS.escape(baseId)}"][data-heading-key="${CSS.escape(key)}"]`) as HTMLElement | null;
        }
        // 回退到按 id 匹配
        if (!heading) heading = tiptapContainer.querySelector(`#${CSS.escape(elementId)}`) as HTMLElement | null;

        const headings = tiptapContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
        console.log('📋 找到的标题元素:', Array.from(headings).map(h => ({ tag: h.tagName, id: h.id, key: (h as any).dataset?.headingKey, base: (h as any).dataset?.baseId, text: h.textContent?.substring(0, 20) })));

        if (heading) {
          console.log('✅ 在容器内找到目标标题(通过 meta 或 id):', heading);

          // 同样的滚动逻辑
          const scrollContainer = document.querySelector('.flex-1.overflow-y-auto.scroll-smooth') ||
                                 document.querySelector('.flex-1.overflow-y-auto') ||
                                 document.querySelector('[class*="overflow-y-auto"]') ||
                                 document.documentElement;

          const targetRect = heading.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          if (scrollContainer === document.documentElement) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            const scrollTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 20;
            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });

            // 添加多个备用的滚动方法
            setTimeout(() => {
              console.log('🔄 执行容器内备用滚动方法 1: scrollIntoView');
              heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            setTimeout(() => {
              console.log('🔄 执行容器内备用滚动方法 2: 强制滚动');
              const elementTop = heading.offsetTop;
              const container = scrollContainer as HTMLElement;
              if (container && container.scrollTo) {
                container.scrollTo({ top: elementTop - 50, behavior: 'smooth' });
              }
            }, 200);
          }

          console.log('✅ 容器内滚动命令已执行');
          return true;
        }
      }

        console.log('❌ 未找到目标元素:', elementId);
        return false;
      });
    });
  }, []);

  const handleStepClick = useCallback((stepId) => {
    onStepSelect(phase.id, stepId);

    // 计算子标题的 DOM ID：`${phase.id}--${slug(step.title)}`
    const slug = (text: string) => text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
    const stepTitle = (phase.steps.find(s => s.id === stepId)?.title) || '';
    if (!stepTitle) return;

    // 与编辑器相同的唯一化规则：同一阶段下重复 slug 加序号
    const baseId = phase.id;
    const rawSlug = slug(stepTitle);
    const siblings = phase.steps.filter(s => s.title === stepTitle);
    let indexAmongSame = 0;
    if (siblings.length > 1) {
      // 在同标题列表中找到当前 step 的序号（从 1 起），用于构造与渲染一致的 id
      indexAmongSame = siblings.findIndex(s => s.id === stepId);
    }
    const uniqueSlug = indexAmongSame > 0 ? `${rawSlug}-${indexAmongSame + 1}` : rawSlug;
    const elementId = `${baseId}--${uniqueSlug}`;

    // 使用相同的滚动逻辑
    scrollToElement(elementId);

    // 兼容 fallback：如果没找到，尝试不用序号
    setTimeout(() => {
      scrollToElement(`${baseId}--${rawSlug}`);
    }, 150);
  }, [phase.id, onStepSelect, scrollToElement]);

  const handleTitleClick = useCallback(() => {
    onStepSelect(phase.id, introStep.id);
    if (regularSteps.length > 0) {
      onToggle();
    }

    // 尝试滚动到对应元素
    scrollToElement(phase.id);
  }, [phase.id, introStep.id, onStepSelect, onToggle, regularSteps.length, scrollToElement]);

  const isCurrentStep = currentStepId === introStep.id;
  const hasSubSteps = regularSteps.length > 0;

  return (
    <div className="px-2.5">
      <div className="rounded-xl transition-all duration-300">
        <button
          onClick={handleTitleClick}
          className={`
            w-full flex items-center p-2.5 rounded-lg
            ${SHARED_STYLES.button.base} ${SHARED_STYLES.button.hover}
            ${isActive ? SHARED_STYLES.button.active : ''}
            ${isCurrentStep ? 'border-2 border-theme-500 shadow-[0_2px_8px_rgba(0,0,0,0.1)]' : ''}
          `}
        >
          {!isTitle && (
            <>
              <div className={`
                w-10 rounded-xl flex items-center justify-center
                ${StatusStyles.colors[isActive ? 'in-progress' : 'pending']}
                transition-all duration-300
                relative
                before:absolute before:inset-0 before:rounded-xl
                before:bg-gradient-to-b before:from-white/5 before:to-transparent
              `}>
                <IconComponent size={16} />
              </div>
              <div className="flex-1 min-w-0 flex items-center ml-2">
                <h3 className="font-bold tracking-wide text-base text-black">
                  {phase.title}
                </h3>
              </div>
            </>
          )}

          {isTitle && (
            <h2 className="pl-2 text-lg font-semibold text-theme-800">
              {phase.title}
            </h2>
          )}

          {hasSubSteps && (
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

        {hasSubSteps && (
          <div className={`
            pl-8 mt-1.5 overflow-hidden transition-all duration-${LAYOUT_CONSTANTS.animation.normal}
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

  const renderBottomSection = useCallback(() => {
    if (viewMode === 'step' && currentPhaseId) {
      const currentPhase = allPhases.find(p => p.id === currentPhaseId);
      return (
        <div className="w-full h-20 pl-7 flex items-center border-t border-gray-200 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent" />
          <StatusDot status="in-progress" />
          <span className="font-medium tracking-wide text-theme-800 relative text-base ml-4">
            {currentPhase?.title || ''}
          </span>
        </div>
      );
    }

    if (activeTab === 'file' && isHovered) {
      return (
        <div className="w-full h-10 pl-7 flex items-center justify-start border-t border-gray-200 relative">
          <span className="font-medium tracking-wide text-theme-800 relative text-base truncate overflow-hidden whitespace-nowrap">
            Drop files to upload
          </span>
        </div>
      );
    }

    return <div className="w-full h-10" />;
  }, [viewMode, currentPhaseId, allPhases, activeTab, isHovered]);

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
    <SidebarContainer
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 顶部区域：左侧折叠按钮 + Tab 切换 + 设置按钮 */}
      <SidebarHeader>
        <div className="flex items-center">
          <button
            onClick={toggleCollapse}
            className={`p-2 rounded-lg ${SHARED_STYLES.button.base} ${SHARED_STYLES.button.hover}`}
            aria-label="Collapse sidebar"
          >
            <MenuIcon size={16} className="text-gray-700" />
          </button>

          {/* Tab 切换器 */}
          <TabSwitcher
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="ml-4"
          />
        </div>

        <button
          className={`p-2 rounded-lg ${SHARED_STYLES.button.base} ${SHARED_STYLES.button.hover}`}
          onClick={settingstore.openSettings}
        >
          <Settings2 size={16} className="text-gray-700" />
        </button>
      </SidebarHeader>

      {/* 中间内容：根据 activeTab 切换显示 */}
      <SidebarContent>
        {activeTab === 'file' ? (
          // 文件视图：使用 FileTree 组件
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
      </SidebarContent>

      {/* 底部区域 */}
      {renderBottomSection()}
    </SidebarContainer>
  );
};

export default memo(OutlineSidebar);