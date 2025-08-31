import React, { memo, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  FolderClock,
  TreePine,
  Settings2,
  Network,
  Folder,
  type LucideIcon,
} from 'lucide-react';
import iconMapping from '@Utils/iconMapping';

interface MiniSidebarItem {
  id: string;
  icon: LucideIcon;
  title: string;
}

interface PhaseStep {
  id: string;
  title: string;
}

interface Phase {
  id: string;
  title: string;
  /** key from @Utils/iconMapping */
  icon: string;
  steps: PhaseStep[];
}

interface MiniSidebarProps {
  /** Legacy OutlineView props */
  phases?: Phase[];
  currentPhaseId?: string;
  onPhaseClick?: (phaseId: string | null) => void;

  /** New general-purpose props */
  onItemClick?: (itemId: string) => void;
  onExpandClick?: () => void;
  activeItemId?: string;
  
  /** Whether main sidebar is expanded */
  isMainSidebarExpanded?: boolean;
}

/** 功能区（顶部/中部） */
const PRIMARY_ITEMS: MiniSidebarItem[] = [
  // { id: 'library', icon: FolderClock, title: 'Library' },
  // { id: 'knowledge-forest', icon: TreePine, title: 'Knowledge Forest' },
  // { id: 'tools', icon: Network, title: 'Tools' },
];

/** 固定底部的功能区（只放设置，避免与中部重复且横排） */
const BOTTOM_ITEMS: MiniSidebarItem[] = [
  { id: 'settings', icon: Settings2, title: 'Settings' },
];

/** 按钮（图标底部对齐，去除多余 margin/padding） */
const ItemButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ className = '', children, active, ...props }) => (
  <button
    {...props}
    aria-current={active ? 'page' : undefined}
    className={[
      'w-8 h-8',
      'relative rounded-lg transition-colors',
      'flex items-end justify-center',
      active ? 'text-theme-600' : 'text-gray-500',
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

const MiniSidebar = memo(function MiniSidebar({
  phases,
  currentPhaseId,
  onPhaseClick,
  onItemClick,
  onExpandClick,
  activeItemId = 'workspace',
  isMainSidebarExpanded = false,
}: MiniSidebarProps) {
  const hasPhases = useMemo(() => Array.isArray(phases) && phases.length > 0, [phases]);

  const handleExpandClick = useCallback(() => {
    if (onExpandClick) onExpandClick();
    else onPhaseClick?.(null);
  }, [onExpandClick, onPhaseClick]);

  return (
    <nav
      className={[
        'w-16 h-full',
        'flex flex-col',
        'bg-white',
        'border-black',
        'border-r',
      ].join(' ')}
    >
      <div className="h-12 flex items-center justify-center shrink-0 mt-2">
        <button
          onClick={handleExpandClick}
          className="rounded-lg transition-colors"
          title="Expand Sidebar"
        >
          <img src="/icon.svg" className="w-8 h-8"/>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-visible">
        {/* 阶段模式 */}
        {hasPhases && (
          <>
            {isMainSidebarExpanded ? (
              <div className="relative -mr-2 my-0">
                <div 
                  className="absolute inset-0 bg-white rounded-l-3xl"
                  style={{
                    border: '1px solid rgba(0,0,0,0.04)',
                    borderRight: 'none'
                  }}
                />
                
                {/* Workspace 图标 */}
                <ul className="space-y-1 relative z-10 py-3 pl-3 pr-4">
                  <li className="flex justify-center overflow-visible">
                    <div className="overflow-visible relative">
                      <ItemButton
                        active={true}
                        onClick={() => onExpandClick?.()}
                        title="Workspace"
                      >
                        <Folder size={18} />
                      </ItemButton>
                    </div>
                  </li>
                </ul>
              </div>
            ) : (
              /* 主侧边栏折叠时：显示所有阶段图标 */
              <>
                {/* 整体阶段挖孔区域 */}
                <div className="relative -mr-2 my-0">
                  {/* 整体挖孔背景 - 白色背景 + 圆滑边缘 */}
                  <div 
                    className="absolute inset-0 bg-white rounded-l-3xl"
                    style={{
                      // boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), inset 0 -2px 4px rgba(0,0,0,0.06), inset 2px 0 4px rgba(0,0,0,0.06)',
                      // border: '1px solid rgba(0,0,0,0.04)',
                      borderRight: 'none'
                    }}
                  />
                  
                  {/* 阶段列表 */}
                  <ul className="space-y-1 relative z-10 py-3 pl-1 pr-4">
                    {phases!.map((phase, index) => {
                      const IconComp =
                        (iconMapping as Record<string, LucideIcon>)[phase.icon] ?? CheckCircle2;
                      const isActive = currentPhaseId === phase.id;

                      return (
                        <li key={phase.id} className="flex justify-center overflow-visible">
                          <div className="overflow-visible relative">
                            <ItemButton
                              active={isActive}
                              onClick={() => onPhaseClick?.(phase.id)}
                              title={phase.title}
                            >
                              <IconComp size={18} />
                            </ItemButton>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </>
            )}

            {/* 其他功能区（不包含底部设置） */}
            <ul className="space-y-1">
              {PRIMARY_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = false;

                return (
                  <li key={item.id} className="flex justify-center overflow-visible">
                    <div className="overflow-visible">
                      <ItemButton
                        active={isActive}
                        onClick={() => onItemClick?.(item.id)}
                        title={item.title}
                      >
                        <Icon size={18} />
                      </ItemButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* 通用模式（无 phases）：只渲染主功能区，底部另渲染设置 */}
        {!hasPhases && (
          <ul className="space-y-1">
            {PRIMARY_ITEMS.map((item) => {
              const Icon = item.icon;
              // 无 phases 模式下，根据 activeItemId 正常显示 active 状态
              const isActive = activeItemId === item.id;

              return (
                <li key={item.id} className="flex justify-center overflow-visible">
                  <div className="overflow-visible">
                    <ItemButton
                      active={isActive}
                      onClick={() => onItemClick?.(item.id)}
                      title={item.title}
                    >
                      <Icon size={18} />
                    </ItemButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 底部固定：仅纵向渲染底部项（默认只有 Settings），避免横向排布 */}
      <div className="py-3 shrink-0">
        <ul className="space-y-1">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeItemId === item.id;

            return (
              <li key={item.id} className="flex justify-center overflow-visible">
                <div className="overflow-visible">
                  <ItemButton
                    active={isActive}
                    onClick={() => onItemClick?.(item.id)}
                    title={item.title}
                  >
                    <Icon size={18} />
                  </ItemButton>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
});

export default MiniSidebar;