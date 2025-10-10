import React, { memo, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Trees,
  PackagePlus,
  Cog,
  Network,
  Folder,
  type LucideIcon,
} from 'lucide-react';
import iconMapping from '@Utils/iconMapping';

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

interface MiniSidebarItem {
  id: string;
  icon: React.ElementType;
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
  { id: 'workspace', icon: Folder, title: 'Workspace' },
  { id: 'knowledge-forest', icon: Trees, title: 'Knowledge Forest' },
  { id: 'easynet', icon: Network, title: 'EasyNet' },
];

/** 固定底部的功能区（只放设置，避免与中部重复且横排） */
const BOTTOM_ITEMS: MiniSidebarItem[] = [
  { id: 'new-notebook', icon: PackagePlus, title: 'New Notebook' },
  { id: 'settings', icon: Cog, title: 'Settings' },
];

/** 按钮（图标底部对齐，去除多余 margin/padding） */
const ItemButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
> = ({ className, children, active, ...props }) => (
  <button
    {...props}
    aria-current={active ? 'page' : undefined}
    className={cn(
      'group relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500',
      'transition-all duration-200 ease-out backdrop-blur-sm',
      'hover:bg-white/80 hover:text-sky-700 hover:shadow-[0_10px_22px_-16px_rgba(14,116,244,0.5)]',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-300',
      active
        ? 'bg-white/90 text-sky-700 shadow-[0_14px_30px_-18px_rgba(14,116,244,0.6)] border border-sky-200'
        : 'border border-transparent',
      className,
    )}
  >
    {active && (
      <span className="pointer-events-none absolute left-0 top-1/2 h-6 w-[6px] -translate-x-full -translate-y-1/2 rounded-full bg-[#4F9EF9] shadow-[0_0_10px_rgba(79,158,249,0.45)]" />
    )}
    <span className="relative z-10 transition-transform duration-150 group-hover:scale-105 group-active:scale-95">
      {children}
    </span>
  </button>
);

const MiniSidebar = memo(function MiniSidebar({
  phases,
  currentPhaseId,
  onPhaseClick,
  onItemClick,
  onExpandClick,
  activeItemId,
  isMainSidebarExpanded = false,
}: MiniSidebarProps) {
  const hasPhases = useMemo(() => Array.isArray(phases) && phases.length > 0, [phases]);

  const handleExpandClick = useCallback(() => {
    if (onExpandClick) onExpandClick();
    else onPhaseClick?.(null);
  }, [onExpandClick, onPhaseClick]);

  // Determine what to show in the phases area based on current state
  const shouldShowPhases = hasPhases && !isMainSidebarExpanded && activeItemId === 'workspace';
  const shouldShowFolderIcon = hasPhases && ((isMainSidebarExpanded && activeItemId === 'workspace') || activeItemId !== 'workspace');

  return (
    <nav
      className={cn(
        'flex h-full w-16 flex-col items-center justify-between border-r border-slate-200/70 bg-white px-3 text-slate-600'
      )}
    >
      {/* Logo - only controls expand/collapse */}
      <div className="h-16 w-full flex items-center justify-center shrink-0">
        <button
          onClick={handleExpandClick}
          className={cn(
            'group flex h-10 w-10 items-center justify-center rounded-xl text-slate-600',
            'transition-all duration-200 ease-out hover:bg-white/80 hover:text-sky-700 hover:shadow-[0_12px_28px_-18px_rgba(14,116,244,0.45)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-300'
          )}
          title="Expand/Collapse Sidebar"
          aria-label="Expand or collapse sidebar"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 border border-white/60 shadow-[0_12px_26px_-18px_rgba(14,116,244,0.35)]">
            <img
              src="/icon.svg"
              alt="Easy Notebook"
              className="h-10 w-10 transition-transform duration-200 group-hover:scale-105"
            />
          </div>
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col gap-3 overflow-y-auto overflow-x-visible">
        {/* Phases area - only show when workspace is active and sidebar is collapsed */}
        {shouldShowPhases && (
          <div className="w-full rounded-2xl border border-white/30 bg-white/70 px-2.5 py-3.5 shadow-[0_18px_60px_-40px_rgba(14,116,244,0.35)] backdrop-blur-xl">
            {/* Phase icons list */}
            <ul className="flex flex-col items-center gap-2">
              {phases!.map((phase) => {
                const IconComp =
                  (iconMapping as Record<string, LucideIcon>)[phase.icon] ?? CheckCircle2;
                const isActive = currentPhaseId === phase.id;

                return (
                  <li key={phase.id} className="flex justify-center overflow-visible">
                    <div className="relative overflow-visible">
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
        )}

        {/* Folder icon - show when sidebar is expanded OR when active item is not workspace */}
        {shouldShowFolderIcon && (
          <div className="w-full rounded-2xl border border-white/30 bg-white/70 px-2.5 py-3.5 shadow-[0_18px_60px_-40px_rgba(14,116,244,0.35)] backdrop-blur-xl">
            <ul className="flex flex-col items-center gap-2">
              <li className="flex justify-center overflow-visible">
                <div className="relative overflow-visible">
                  <ItemButton
                    active={activeItemId === 'workspace'}
                    onClick={() => onItemClick?.('workspace')}
                    title="Workspace"
                  >
                    <Folder size={18} />
                  </ItemButton>
                </div>
              </li>
            </ul>
          </div>
        )}

        {/* Primary items - show non-workspace items */}
        <ul className="flex flex-col items-center gap-2 pb-2">
          {PRIMARY_ITEMS.filter(item => item.id !== 'workspace').map((item) => {
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

      {/* Bottom items - always show */}
      <div className="w-full">
        <ul className="flex flex-col items-center gap-2">
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
