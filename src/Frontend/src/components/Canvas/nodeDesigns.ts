import { BrainCellKind } from './types';

// 节点设计配置
export interface NodeDesign {
  shape: 'rectangle' | 'circle' | 'diamond' | 'hexagon' | 'pentagon';
  colors: {
    primary: string;      // 主色调
    secondary: string;    // 辅助色调
    text: string;        // 文字颜色
    border: string;      // 边框颜色
    shadow: string;      // 阴影颜色
  };
  icon: string;          // 图标类型
  size: {
    width: number;
    height: number;
  };
  compactSize: {
    width: number;
    height: number;
  };
  borderRadius: number;
  borderWidth: number;
  animation?: string;    // 动画效果
}

// 每种BrainCell类型的设计配置
export const NODE_DESIGNS: Record<BrainCellKind, NodeDesign> = {
  // Sensor - 传感器：数据输入源
  Sensor: {
    shape: 'rectangle',
    colors: {
      primary: '#10B981',      // 绿色主题
      secondary: '#1F2937',    // 深灰背景
      text: '#FFFFFF',         // 白色文字
      border: '#10B981',       // 绿色边框
      shadow: '#10B98120',     // 半透明绿色阴影
    },
    icon: 'sensor',
    size: { width: 200, height: 80 },
    compactSize: { width: 160, height: 60 },
    borderRadius: 12,
    borderWidth: 2,
    animation: 'pulse'
  },

  // Processor - 处理器：数据处理和AI代理
  Processor: {
    shape: 'rectangle',
    colors: {
      primary: '#3B82F6',      // 蓝色主题
      secondary: '#1F2937',    // 深灰背景
      text: '#FFFFFF',         // 白色文字
      border: '#3B82F6',       // 蓝色边框
      shadow: '#3B82F620',     // 半透明蓝色阴影
    },
    icon: 'processor',
    size: { width: 280, height: 100 },
    compactSize: { width: 200, height: 70 },
    borderRadius: 12,
    borderWidth: 2,
  },

  // Memory - 存储器：数据存储和记忆
  Memory: {
    shape: 'rectangle',
    colors: {
      primary: '#8B5CF6',      // 紫色主题
      secondary: '#1F2937',    // 深灰背景
      text: '#FFFFFF',         // 白色文字
      border: '#8B5CF6',       // 紫色边框
      shadow: '#8B5CF620',     // 半透明紫色阴影
    },
    icon: 'memory',
    size: { width: 180, height: 80 },
    compactSize: { width: 140, height: 60 },
    borderRadius: 12,
    borderWidth: 2,
  },

  // Actuator - 执行器：动作执行和输出
  Actuator: {
    shape: 'rectangle',
    colors: {
      primary: '#F59E0B',      // 橙色主题
      secondary: '#1F2937',    // 深灰背景
      text: '#FFFFFF',         // 白色文字
      border: '#F59E0B',       // 橙色边框
      shadow: '#F59E0B20',     // 半透明橙色阴影
    },
    icon: 'actuator',
    size: { width: 200, height: 80 },
    compactSize: { width: 160, height: 60 },
    borderRadius: 12,
    borderWidth: 2,
  },

  // Router - 路由器：条件判断和分支
  Router: {
    shape: 'rectangle',
    colors: {
      primary: '#EF4444',      // 红色主题
      secondary: '#1F2937',    // 深灰背景
      text: '#FFFFFF',         // 白色文字
      border: '#EF4444',       // 红色边框
      shadow: '#EF444420',     // 半透明红色阴影
    },
    icon: 'router',
    size: { width: 160, height: 80 },
    compactSize: { width: 130, height: 60 },
    borderRadius: 12,
    borderWidth: 2,
  },
};

// 图标映射 - 使用更现代化的图标
export const NODE_ICONS = {
  sensor: '📊',      // 传感器 - 数据输入
  processor: '🤖',   // 处理器 - AI代理
  memory: '💾',      // 存储器 - 数据存储
  actuator: '⚡',    // 执行器 - 动作执行
  router: '🔀',      // 路由器 - 条件分支
};

// 获取节点设计配置
export function getNodeDesign(kind: BrainCellKind): NodeDesign {
  return NODE_DESIGNS[kind];
}

// 获取节点图标
export function getNodeIcon(kind: BrainCellKind): string {
  return NODE_ICONS[NODE_DESIGNS[kind].icon as keyof typeof NODE_ICONS];
}