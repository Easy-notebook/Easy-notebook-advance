import React from 'react';
import { Loader2 } from 'lucide-react';
import { SHARED_STYLES, STATUS_CONFIG } from './constants';

// Loading Indicator Component
interface LoadingIndicatorProps {
  text?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  text = 'Loading...', 
  size = 'medium' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6', 
    large: 'w-8 h-8'
  };

  return (
    <div className="flex items-center justify-center gap-3 text-theme-700 p-4 my-4 bg-white/10 rounded-lg animate-pulse transition-all duration-300">
      <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
      <span className="font-medium">{text}</span>
    </div>
  );
};

// Status Dot Component
interface StatusDotProps {
  status: 'success' | 'error' | 'warning' | 'info' | 'processing';
  size?: 'small' | 'medium' | 'large';
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'medium' }) => {
  const sizeClasses = {
    small: 'w-2 h-2',
    medium: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full ${STATUS_CONFIG.backgrounds[status]} border-2 border-white shadow-sm`}
      style={{ backgroundColor: STATUS_CONFIG.colors[status].replace('text-', '') }}
    />
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon, children }) => {
  return (
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
};

// Container Components
export const RightSidebarContainer: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`${SHARED_STYLES.container.base} ${className}`}>
    {children}
  </div>
);

export const RightSidebarHeader: React.FC<{ 
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={`${SHARED_STYLES.header.base} ${className}`}>
    {children}
  </div>
);

export const RightSidebarContent: React.FC<{ 
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
}> = ({ children, className = '', scrollable = true }) => (
  <div className={`
    ${SHARED_STYLES.content.base} 
    ${scrollable ? SHARED_STYLES.container.scrollable : ''} 
    ${className}
  `}>
    <style>{`
      .scrollbar-thin::-webkit-scrollbar { width: 4px; }
      .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
      .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.3); border-radius: 4px; }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.5); }
      .scrollbar-thin { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.3) transparent; }
    `}</style>
    {children}
  </div>
);