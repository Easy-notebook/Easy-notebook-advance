/**
 * 共享的样式常量和布局配置
 * 用于保持 LeftSideBar 各个栏目的一致性
 */

// Fluent / Windows 11 灵感的柔和高斯风格配置
export const SHARED_STYLES = {
  status: {
    colors: {
      completed: 'text-emerald-600 bg-emerald-50/80 border border-emerald-200/60 shadow-[0_6px_12px_-8px_rgba(16,185,129,0.4)] backdrop-blur-sm',
      'in-progress': 'text-sky-700 bg-sky-50/80 border border-sky-200/60 shadow-[0_6px_12px_-8px_rgba(14,116,244,0.45)] backdrop-blur-sm',
      pending: 'text-slate-600 bg-slate-100/80 border border-slate-200/60 shadow-[0_6px_12px_-8px_rgba(100,116,139,0.35)] backdrop-blur-sm'
    },
    steps: {
      completed: 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.24)]',
      'in-progress': 'bg-sky-500 shadow-[0_0_0_2px_rgba(14,116,244,0.28)] animate-pulse',
      pending: 'bg-slate-400 shadow-[0_0_0_2px_rgba(100,116,139,0.2)]'
    }
  },

  // Fluent 风格按钮样式（柔和圆角 + 阴影）
  button: {
    base: 'px-3.5 py-2.5 rounded-lg transition-colors duration-200 ease-out text-sm font-medium text-slate-600 bg-white border border-transparent shadow-sm',
    hover: 'hover:bg-slate-50 hover:border-slate-200',
    active: 'bg-[#4F9EF9] text-white border border-[#4F9EF9] shadow-sm',
    inactive: 'text-slate-600'
  },

  // 统一的容器样式
  container: {
    base: 'relative h-full flex flex-col bg-white border-l border-slate-200/70',
    header: 'h-14 flex items-center justify-between px-5 border-b border-slate-200/70 bg-white',
    content: 'flex-1 overflow-y-auto px-5 py-4 scrollbar-thin bg-white text-slate-700'
  },

  // 现代化的 Tab 样式
  tab: {
    base: 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200 ease-out',
    active: 'bg-[#E7F1FE] text-[#246BEB] border border-transparent shadow-[0_12px_24px_-16px_rgba(79,158,249,0.4)]',
    inactive: 'text-slate-500 hover:text-[#246BEB]'
  }
};

// 布局常量
export const LAYOUT_CONSTANTS = {
  // 侧边栏尺寸
  sidebar: {
    collapsed: 48,
    minWidth: 280,
    defaultWidth: 384
  },
  
  // 头部高度
  header: {
    height: 64,
    padding: 20
  },
  
  // 间距配置
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
  },
  
  // 动画时长
  animation: {
    fast: 200,
    normal: 300,
    slow: 500
  },
  
  // 文件树配置
  fileTree: {
    indent: 28,
    iconSize: 18,
    padding: 8
  }
};

// Fluent 风格滚动条样式（CSS-in-JS）
export const SCROLLBAR_STYLES = `
  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: rgba(148, 163, 184, 0.1);
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: rgba(14, 116, 244, 0.35);
    border-radius: 9999px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: rgba(14, 116, 244, 0.55);
  }
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: rgba(14, 116, 244, 0.35) rgba(148, 163, 184, 0.12);
  }
`;

// Tab 配置
export const TAB_CONFIG = [
  { id: 'outline', label: 'Outline', icon: null },
  { id: 'file', label: 'Files', icon: null },
  { id: 'agents', label: 'Agents', icon: null }
] as const;

export type TabId = typeof TAB_CONFIG[number]['id'];

// 预览文件类型配置
export const FILE_PREVIEW_CONFIG = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  text: ['.txt', '.md', '.json', '.js', '.py', '.html', '.css', '.csv', '.xlsx', '.xls'],
  pdf: ['.pdf'],
  doc: ['.doc', '.docx'],
  maxFileSize: 50 * 1024 * 1024, // 50MB (increased to support larger DOC/DOCX files)
  maxFiles: 10
};
