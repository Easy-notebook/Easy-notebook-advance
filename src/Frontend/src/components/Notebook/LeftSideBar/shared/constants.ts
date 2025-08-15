/**
 * 共享的样式常量和布局配置
 * 用于保持 LeftSideBar 各个栏目的一致性
 */

// 状态样式配置
export const SHARED_STYLES = {
  status: {
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
  },
  
  // 通用按钮样式
  button: {
    base: 'transition-all duration-300 backdrop-blur-sm',
    hover: 'hover:bg-white/10',
    active: 'bg-white/10 text-theme-700 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]',
    inactive: 'text-gray-700'
  },
  
  // 容器样式
  container: {
    base: 'relative h-full flex flex-col isolate overflow-hidden bg-gray-50',
    header: 'h-16 flex items-center justify-between px-5 border-b border-white/10 bg-white/5 backdrop-blur-sm relative',
    content: 'flex-1 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent hover:scrollbar-thumb-white/50'
  },
  
  // Tab 样式
  tab: {
    base: 'px-2 py-1 rounded text-xs transition-all duration-200',
    active: 'bg-white text-theme-800 font-semibold',
    inactive: 'text-gray-600 hover:bg-white/10'
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
    indent: 16,
    iconSize: 18,
    padding: 8
  }
};

// 滚动条样式（CSS-in-JS）
export const SCROLLBAR_STYLES = `
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
  image: ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
  text: ['.txt', '.md', '.json', '.js', '.py', '.html', '.css', '.csv'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10
};
