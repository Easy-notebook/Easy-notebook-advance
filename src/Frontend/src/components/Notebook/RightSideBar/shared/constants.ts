// Right sidebar view types
export type RightSidebarView = 'activity' | 'qa' | 'debug';

// Event types for AI agent actions
export const AI_EVENT_TYPES = {
  USER_ASK_QUESTION: 'USER_ASK_QUESTION',
  AI_REPLYING_QUESTION: 'AI_REPLYING_QUESTION',
  TOOL_CALL: 'TOOL_CALL',
  THINKING: 'THINKING',
  CODE_EXECUTION: 'CODE_EXECUTION',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
} as const;

// Shared styles for right sidebar components
export const SHARED_STYLES = {
  container: {
    base: 'h-full flex flex-col bg-white min-w-0 overflow-hidden',
    scrollable: 'overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50 min-w-0'
  },
  header: {
    base: 'h-16 w-full flex items-center justify-between px-3 sm:px-5 border-b border-white/10 bg-white/5 backdrop-blur-sm relative'
  },
  content: {
    base: 'flex-1 px-2 sm:px-4 pb-5',
    spacing: 'space-y-1 py-3'
  },
  button: {
    base: 'px-2 py-2 rounded-md transition-all duration-300 flex items-center gap-1.5 flex-shrink-0 min-w-0',
    active: 'bg-white text-theme-800 font-semibold',
    inactive: 'text-gray-600 hover:bg-white/10',
    hover: 'hover:bg-white/10 hover:rounded-lg hover:shadow-sm'
  },
  card: {
    base: 'p-3 relative transition-all duration-300 min-w-0 break-words overflow-wrap-anywhere',
    active: 'bg-white/10 rounded-lg ring-1 ring-theme-200',
    hover: 'hover:bg-white/10 hover:rounded-lg hover:shadow-sm'
  },
  text: {
    primary: 'text-sm text-gray-700 leading-relaxed tracking-wide',
    secondary: 'text-xs text-gray-500',
    accent: 'text-xs font-medium text-theme-600 hover:text-theme-800'
  }
};

// Loading and status indicators
export const STATUS_CONFIG = {
  colors: {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
    processing: 'text-theme-600'
  },
  backgrounds: {
    success: 'bg-green-50',
    error: 'bg-red-50', 
    warning: 'bg-yellow-50',
    info: 'bg-blue-50',
    processing: 'bg-theme-50'
  }
};