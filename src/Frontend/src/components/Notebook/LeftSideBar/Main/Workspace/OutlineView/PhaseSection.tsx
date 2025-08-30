import { useCallback, memo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';
import iconMapping from '@Utils/iconMapping';
import { SHARED_STYLES, LAYOUT_CONSTANTS } from '@LeftSidebar/shared/constants';
import { StatusIcon, StatusDot, SidebarButton } from '@LeftSidebar/shared/components';

// 使用共享的样式常量
const StatusStyles = SHARED_STYLES.status;

interface StepButtonProps {
  step: { id: string; title: string };
  isActive: boolean;
  onClick: () => void;
}

export const StepButton = memo(({ step, isActive, onClick }: StepButtonProps) => (
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

interface PhaseSectionProps {
  phase: {
    id: string;
    title: string;
    icon: string;
    steps: Array<{ id: string; title: string }>;
  };
  isExpanded: boolean;
  onToggle: () => void;
  onStepSelect: (phaseId: string, stepId: string) => void;
  isActive: boolean;
  currentStepId: string;
  isTitle: boolean;
}

export const PhaseSection = memo(({
  phase,
  isExpanded,
  onToggle,
  onStepSelect,
  isActive,
  currentStepId,
  isTitle
}: PhaseSectionProps) => {
  const IconComponent = iconMapping[phase.icon as keyof typeof iconMapping] || CheckCircle2;
  const introStep = phase.steps[0];
  const regularSteps = phase.steps.slice(1);

  const scrollToElement = useCallback((elementId: string) => {
    // Debug logging in development mode only
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 尝试滚动到元素:', elementId);
    }

    // 使用双重 requestAnimationFrame 确保 DOM 更新完成
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetElement = document.getElementById(elementId);
        if (targetElement) {

          // 查找滚动容器 - 主内容区域
          const scrollContainer = document.querySelector('.flex-1.overflow-y-auto.scroll-smooth') ||
                                 document.querySelector('.flex-1.overflow-y-auto') ||
                                 document.querySelector('[class*="overflow-y-auto"]') ||
                                 document.documentElement;

          // 计算目标元素相对于滚动容器的位置
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // 如果是文档元素，使用 scrollIntoView
          if (scrollContainer === document.documentElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            // 如果是特定容器，计算滚动位置
            const scrollTop = targetRect.top - containerRect.top + scrollContainer.scrollTop - 20; // 20px 偏移

            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });

            // 备用滚动方法
            setTimeout(() => {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

            setTimeout(() => {
              const elementTop = targetElement.offsetTop;
              const container = scrollContainer as HTMLElement;
              if (container && container.scrollTo) {
                container.scrollTo({ top: elementTop - 50, behavior: 'smooth' });
              }
            }, 200);
          }

          return true;
        }

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

          // Debug: log found headings in development mode
          if (process.env.NODE_ENV === 'development') {
            const headings = tiptapContainer.querySelectorAll('h1, h2, h3, h4, h5, h6');
            console.log('📋 找到的标题元素:', Array.from(headings).map(h => ({ 
              tag: h.tagName, 
              id: h.id, 
              key: (h as HTMLElement).dataset?.headingKey, 
              base: (h as HTMLElement).dataset?.baseId, 
              text: h.textContent?.substring(0, 20) 
            })));
          }

          if (heading) {

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

              // 备用滚动方法
              setTimeout(() => {
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);

              setTimeout(() => {
                const elementTop = heading.offsetTop;
                const container = scrollContainer as HTMLElement;
                if (container && container.scrollTo) {
                  container.scrollTo({ top: elementTop - 50, behavior: 'smooth' });
                }
              }, 200);
            }

            return true;
          }
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('❌ 未找到目标元素:', elementId);
        }
        return false;
      });
    });
  }, []);

  const handleStepClick = useCallback((stepId: string) => {
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

export default PhaseSection;