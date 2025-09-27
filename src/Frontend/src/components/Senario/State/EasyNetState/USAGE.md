# EasyNet State 使用说明

## 路由配置

EasyNetState现在已经集成到路由系统中，可以通过以下URL访问：

```
/EasyNet/<id>
```

其中 `<id>` 是EasyNet图表的唯一标识符。

## 功能特性

### 1. 图表编辑器
- 基于React Flow的可视化图表编辑器
- 支持拖拽操作和连线
- 实时预览和调试

### 2. 数据持久化
- 自动保存图表数据到本地存储
- 支持多个图表的管理
- 支持导入/导出JSON格式

### 3. 路由集成
- 与应用路由系统完全集成
- 支持浏览器前进/后退
- URL状态同步

## 使用示例

### 访问EasyNet编辑器
```
http://localhost:3000/EasyNet/my-graph-1
http://localhost:3000/EasyNet/workflow-design
http://localhost:3000/EasyNet/test-123
```

### 编程式导航
```typescript
import useRouteStore from '@Store/routeStore';

const { navigateToEasyNet } = useRouteStore();

// 导航到特定的EasyNet图表
navigateToEasyNet('my-graph-id');
```

### 状态管理
```typescript
import { useEasyNetStore } from '../components/Senario/State/EasyNetState';

const {
  currentGraph,
  savedGraphs,
  saveGraph,
  loadGraph,
  deleteGraph
} = useEasyNetStore();
```

## 组件结构

```
EasyNetState/
├── EasyNetState.tsx      # 主组件
├── Header.tsx            # 顶部工具栏
├── GraphManager.tsx      # 图表管理器
├── SaveDialog.tsx        # 保存对话框
├── useEasyNetStore.ts    # 状态管理
├── types.ts             # 类型定义
└── index.ts             # 导出文件
```

## Canvas集成

EasyNetState集成了经过重构的Canvas组件：

- **BrainCellGraphEditor**: 主要的图表编辑器
- **BrainCellNode**: 节点组件
- **EasyNetEdge**: 边组件
- **Inspector**: 属性面板
- **Palette**: 组件面板
- **Toolbar**: 工具栏
- **DebugConsole**: 调试控制台

## 注意事项

1. ID参数会自动传递给EasyNetState组件
2. 组件会根据URL中的ID自动加载对应的图表数据
3. 如果ID对应的图表不存在，会创建一个新的空图表
4. 数据会自动保存到本地存储中

## 开发

启动开发服务器：
```bash
npm run dev
```

访问示例：
```
http://localhost:5173/EasyNet/test
```