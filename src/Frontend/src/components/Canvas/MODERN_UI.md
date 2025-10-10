# 🎨 Modern Canvas UI - Complete Redesign

基于 [React Flow 官方示例](https://reactflow.dev/examples) 的最佳实践，对 Canvas 组件进行了全面的现代化重构。

## 📋 目录

- [概述](#概述)
- [主要改进](#主要改进)
- [快速开始](#快速开始)
- [组件详解](#组件详解)
- [迁移指南](#迁移指南)
- [最佳实践](#最佳实践)

---

## 🌟 概述

新的现代化 UI 系统提供了：

- ✨ **精美的视觉设计** - 渐变、阴影、动画效果
- 🎯 **流畅的交互体验** - 悬停效果、平滑过渡、上下文菜单
- 🚀 **高性能渲染** - 优化的组件和 React Flow 集成
- 📱 **响应式布局** - 适配各种屏幕尺寸
- 🎨 **可定制主题** - 支持多种画布主题和颜色方案

---

## 🎯 主要改进

### 1. **现代化节点设计** (`ModernBrainCellNode`)

#### 视觉改进
- 🎨 **渐变背景** - 基于节点类型的动态渐变色
- 💎 **圆角卡片** - 更柔和的视觉效果
- 🌈 **悬停动画** - 平滑的缩放和发光效果
- 📊 **进度指示器** - 实时显示节点运行进度

#### 交互增强
- 🔄 **可展开/收起** - 动态显示详细信息
- 🎯 **端口高亮** - 悬停时自动放大连接点
- 🏷️ **智能标签** - 清晰的状态和类型标识
- 🎭 **选中指示器** - 明显的选中状态反馈

#### 示例特性
```typescript
// 自动根据节点类型显示不同的视觉样式
<ModernBrainCellNode
  data={meta}
  selected={isSelected}
/>

// 支持的节点类型及其独特样式：
// - Sensor (传感器): 蓝色圆形渐变
// - Processor (处理器): 紫色矩形渐变
// - Memory (存储器): 橙色六边形渐变
// - Actuator (执行器): 绿色五边形渐变
// - Router (路由器): 红色菱形渐变
```

---

### 2. **增强的边缘样式** (`ModernEasyNetEdge`)

#### 视觉效果
- 🌊 **流动动画** - 数据流的粒子动画效果
- 🎨 **协议颜色** - 根据协议类型显示不同颜色
  - Topic: 蓝色到青色渐变
  - RPC: 紫色到粉色渐变
  - Stream: 绿色到翠绿渐变
  - Database: 橙色到红色渐变
- ✨ **选中光晕** - 选中时的发光效果

#### 信息卡片
- 📋 **完整信息展示** - 协议、通道、QoS、命名空间
- 🎯 **悬停提示** - 详细的连接信息工具提示
- 🏷️ **QoS 等级标识** - 清晰的服务质量级别显示

#### 特性示例
```typescript
// 支持多种协议，自动应用对应样式
<ModernEasyNetEdge
  data={{
    protocol: 'topic',    // 或 'rpc', 'stream', 'db'
    channel: 'signals',
    qos: 1,              // 0: At most once, 1: At least once, 2: Exactly once
    namespace: '/global',
    io: 'data'           // 或 'control'
  }}
/>
```

---

### 3. **现代化工具栏** (`ModernToolbar`)

#### 功能分组
- ⚡ **执行控制** - Run, Step, Pause, Reset
- 🎨 **画布主题** - Grid, Dots, Plain 三种主题
- 🔍 **视图控制** - Zoom In, Fit View, Zoom Out
- 💾 **文件操作** - Export, Import JSON
- 📊 **统计信息** - 实时显示节点和边的数量

#### 视觉设计
- 🌈 **渐变背景** - 毛玻璃效果
- 🎯 **分组布局** - 逻辑清晰的按钮组
- ✨ **悬停效果** - 平滑的颜色过渡

---

### 4. **优化的组件面板** (`ModernPalette`)

#### 交互增强
- 🔍 **实时搜索** - 快速查找组件
- 🎯 **拖放支持** - 直接拖拽到画布
- 🎨 **预览效果** - 悬停时的 3D 效果
- 📝 **详细描述** - 每个组件的用途说明

#### 视觉优化
- 🌈 **渐变卡片** - 根据组件类型的动态渐变
- 💎 **图标展示** - 清晰的组件图标
- 🏷️ **形状标签** - 显示节点形状类型
- 💡 **快速提示** - 使用说明和快捷键

---

### 5. **增强的属性检查器** (`ModernInspector`)

#### 标签页组织
- ⚙️ **Properties** - 基本属性和参数
- 🔌 **Ports** - 输入输出端口详情

#### 功能特性
- 📝 **实时编辑** - 即时更新节点属性
- 🎨 **彩色标签** - 清晰的端口类型区分
- 📊 **进度展示** - 运行时进度可视化
- 🔧 **参数管理** - 添加/删除/编辑参数

#### 空状态优化
- 🎭 **友好提示** - 未选择节点时的引导信息
- 💎 **精美图标** - 视觉化的空状态设计

---

### 6. **上下文菜单系统** (`ContextMenu`)

#### 节点操作
- 👁️ **View Details** - 查看节点详情
- 🏗️ **Enter Internal View** - 进入内部视图
- ▶️ **Run Node** - 运行当前节点
- ⏸️ **Pause** - 暂停执行
- 🔄 **Reset State** - 重置状态
- ✏️ **Edit Properties** - 编辑属性
- 📋 **Duplicate** - 复制节点
- 🗑️ **Delete** - 删除节点

#### 视觉设计
- 🌈 **渐变头部** - 美观的分组标题
- ✨ **悬停效果** - 清晰的交互反馈
- 🎯 **分类组织** - 逻辑分组的菜单项

---

## 🚀 快速开始

### 基本使用

```tsx
import React, { useRef } from 'react';
import { ModernBrainCellGraphEditor } from '@/components/Canvas';
import type { ModernBrainCellGraphEditorRef } from '@/components/Canvas';
import { ReactFlowProvider } from 'reactflow';

function MyApp() {
  const editorRef = useRef<ModernBrainCellGraphEditorRef>(null);

  const handleGraphChange = (nodes, edges) => {
    console.log('Graph updated:', { nodes, edges });
  };

  return (
    <ReactFlowProvider>
      <ModernBrainCellGraphEditor
        ref={editorRef}
        onGraphChange={handleGraphChange}
      />
    </ReactFlowProvider>
  );
}

export default MyApp;
```

### 使用自定义初始数据

```tsx
import React from 'react';
import { ModernBrainCellGraphEditor } from '@/components/Canvas';
import { ReactFlowProvider } from 'reactflow';

function MyApp() {
  const initialData = {
    nodes: [
      {
        id: 'node-1',
        type: 'braincell',
        position: { x: 100, y: 100 },
        data: {
          name: 'Input Sensor',
          kind: 'Sensor',
          description: 'Captures input data',
          // ... 其他属性
        }
      }
    ],
    edges: []
  };

  return (
    <ReactFlowProvider>
      <ModernBrainCellGraphEditor initialData={initialData} />
    </ReactFlowProvider>
  );
}
```

### 导出和导入图数据

```tsx
import React, { useRef } from 'react';
import { ModernBrainCellGraphEditor } from '@/components/Canvas';
import type { ModernBrainCellGraphEditorRef } from '@/components/Canvas';
import { ReactFlowProvider } from 'reactflow';

function MyApp() {
  const editorRef = useRef<ModernBrainCellGraphEditorRef>(null);

  const handleExport = () => {
    const data = editorRef.current?.getGraphData();
    console.log('Exported data:', data);
    // 保存到文件或服务器
  };

  const handleImport = (data) => {
    editorRef.current?.loadGraphData(data);
  };

  return (
    <ReactFlowProvider>
      <ModernBrainCellGraphEditor ref={editorRef} />
      <button onClick={handleExport}>Export</button>
    </ReactFlowProvider>
  );
}
```

---

## 📦 组件详解

### ModernBrainCellGraphEditor

主编辑器组件，整合所有功能。

**Props:**
```typescript
interface ModernBrainCellGraphEditorProps {
  onGraphChange?: (nodes: Node[], edges: Edge[]) => void;
  initialData?: {
    nodes: Node<BrainCellMeta>[];
    edges: Edge<EasyNetLink & { io: IOType }>[];
  };
}
```

**Ref 方法:**
```typescript
interface ModernBrainCellGraphEditorRef {
  getGraphData: () => { nodes: Node[]; edges: Edge[] };
  loadGraphData: (data: { nodes: Node[]; edges: Edge[] }) => void;
}
```

### ModernBrainCellNode

现代化节点组件。

**特性:**
- 自动根据节点类型应用样式
- 支持展开/收起详情
- 实时进度显示
- 状态指示器

### ModernEasyNetEdge

增强的边缘组件。

**特性:**
- 协议类型颜色编码
- 流动动画（数据流）
- 详细的连接信息卡片
- QoS 等级显示

### ModernToolbar

现代化工具栏。

**功能:**
- 执行控制（运行、暂停、单步、重置）
- 画布主题切换
- 视图控制（缩放、适应）
- 文件操作（导出、导入）
- 统计信息展示

### ModernPalette

组件面板。

**功能:**
- 搜索过滤
- 拖放添加
- 点击添加
- 组件预览

### ModernInspector

属性检查器。

**功能:**
- 节点属性编辑
- 参数管理
- 端口信息展示
- 进度监控

### ContextMenu

右键上下文菜单。

**功能:**
- 节点操作菜单
- 连接操作菜单
- 画布操作菜单

---

## 🔄 迁移指南

### 从旧版本迁移

**1. 更新导入语句**

```tsx
// 旧版本
import { BrainCellGraphEditor } from '@/components/Canvas';

// 新版本
import { ModernBrainCellGraphEditor } from '@/components/Canvas';
import { ReactFlowProvider } from 'reactflow';
```

**2. 添加 ReactFlowProvider**

```tsx
// 旧版本
<BrainCellGraphEditor />

// 新版本
<ReactFlowProvider>
  <ModernBrainCellGraphEditor />
</ReactFlowProvider>
```

**3. 更新 Ref 类型**

```tsx
// 旧版本
const editorRef = useRef<BrainCellGraphEditorRef>(null);

// 新版本
const editorRef = useRef<ModernBrainCellGraphEditorRef>(null);
```

**注意:** 旧版本组件仍然可用，标记为 `legacy`，但推荐使用新的现代化组件。

---

## 💡 最佳实践

### 1. 性能优化

```tsx
// 使用 React.memo 包裹编辑器
const MemoizedEditor = React.memo(ModernBrainCellGraphEditor);

// 使用 useCallback 包裹回调函数
const handleGraphChange = useCallback((nodes, edges) => {
  // 处理图变化
}, []);
```

### 2. 状态管理

```tsx
// 使用外部状态管理（如 Redux, Zustand）
import { useGraphStore } from '@/stores/graph';

function MyApp() {
  const { nodes, edges, updateGraph } = useGraphStore();

  return (
    <ReactFlowProvider>
      <ModernBrainCellGraphEditor
        initialData={{ nodes, edges }}
        onGraphChange={updateGraph}
      />
    </ReactFlowProvider>
  );
}
```

### 3. 自定义主题

```tsx
// 通过 CSS 变量自定义颜色
<div style={{
  '--primary-color': '#6366f1',
  '--secondary-color': '#8b5cf6',
}}>
  <ReactFlowProvider>
    <ModernBrainCellGraphEditor />
  </ReactFlowProvider>
</div>
```

### 4. 键盘快捷键

内置快捷键：
- `Delete` / `Backspace` - 删除选中节点
- `p` - 运行
- `o` - 暂停
- `i` - 单步执行
- `f` - 适应视图

### 5. 持久化

```tsx
// 保存到 localStorage
const handleGraphChange = (nodes, edges) => {
  localStorage.setItem('graph-data', JSON.stringify({ nodes, edges }));
};

// 从 localStorage 加载
const initialData = JSON.parse(
  localStorage.getItem('graph-data') || '{"nodes":[],"edges":[]}'
);
```

---

## 🎨 样式定制

### Tailwind CSS 类名

所有组件都使用 Tailwind CSS，可以通过修改类名来定制样式：

```tsx
// 示例：自定义节点样式
const customNodeClassName = `
  rounded-3xl        // 更圆的边角
  shadow-2xl         // 更深的阴影
  hover:scale-110    // 更大的悬停缩放
`;
```

### 渐变颜色方案

每个节点类型都有预定义的渐变色，可以在 `nodeDesigns.ts` 中自定义：

```typescript
export const customDesign = {
  Sensor: {
    colors: {
      primary: '#your-color',
      secondary: '#your-secondary-color',
      // ...
    }
  }
};
```

---

## 📚 参考资源

- [React Flow 官方文档](https://reactflow.dev/)
- [React Flow 示例](https://reactflow.dev/examples)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Ant Design 组件库](https://ant.design/)

---

## 🐛 已知问题

1. **性能**: 超过 500 个节点时可能需要启用虚拟化
2. **浏览器兼容性**: IE 11 不支持
3. **移动端**: 触摸操作需要额外优化

---

## 🔮 未来计划

- [ ] 添加更多节点形状
- [ ] 实现协作编辑功能
- [ ] 支持撤销/重做
- [ ] 添加节点分组功能
- [ ] 实现自动布局算法
- [ ] 支持导出为图片

---

## 📝 更新日志

### v2.0.0 (2025-10-10)
- ✨ 全新的现代化 UI 设计
- 🎨 基于 React Flow 官方示例的最佳实践
- 🚀 性能优化和代码重构
- 📦 新增上下文菜单系统
- 🎯 改进的用户交互体验

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ using React Flow**
