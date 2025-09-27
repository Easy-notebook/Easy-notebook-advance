import { useCallback, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button, Card, Space, Typography, Badge } from "antd";
import { Terminal, ChevronUp, ChevronDown } from "lucide-react";

const { Text } = Typography;

// Local imports
import { BrainCellMeta, EasyNetLink, IOType, GraphSchema, BrainCellKind } from './types';
import { defaultCell, makeId } from './utils';
import { isConnectionAllowed, validateGraph } from './validation';
import { useRunner } from './hooks/useRunner';
import { EnhancedBrainCellNode } from './EnhancedBrainCellNode';
import { EasyNetEdge, edgeTypes } from './EasyNetEdge';
import { Inspector } from './Inspector';
import { EnhancedPalette } from './EnhancedPalette';
import { Toolbar } from './Toolbar';
import { DebugConsole } from './DebugConsole';

// Initial graph data
const initialNodes: Node<BrainCellMeta>[] = [
  { id: "sensor1", type: "braincell", position: { x: 100, y: 120 }, data: defaultCell("Sensor") },
  { id: "proc1", type: "braincell", position: { x: 420, y: 100 }, data: defaultCell("Processor") },
  { id: "mem1", type: "braincell", position: { x: 420, y: 260 }, data: defaultCell("Memory") },
  { id: "act1", type: "braincell", position: { x: 780, y: 160 }, data: defaultCell("Actuator") },
];

const initialEdges: Edge<EasyNetLink & { io: IOType }>[] = [
  {
    id: "e1",
    type: "easynet",
    source: "sensor1",
    target: "proc1",
    sourceHandle: "out",
    targetHandle: "in",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: "topic", channel: "signals", qos: 1, namespace: "/global", io: "data" }
  },
  {
    id: "e2",
    type: "easynet",
    source: "proc1",
    target: "mem1",
    sourceHandle: "out",
    targetHandle: "write",
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: "topic", channel: "knowledge", qos: 2, namespace: "/kf", io: "data" }
  },
  {
    id: "e3",
    type: "easynet",
    source: "proc1",
    target: "act1",
    sourceHandle: "done",
    targetHandle: "do",
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: "rpc", channel: "trigger", qos: 0, namespace: "/actions", io: "control" }
  },
];

interface BrainCellGraphEditorProps {
  onGraphChange?: (nodes: Node<BrainCellMeta>[], edges: Edge<EasyNetLink & { io: IOType }>[]) => void;
  initialData?: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
}

export interface BrainCellGraphEditorRef {
  getGraphData: () => { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
  loadGraphData: (data: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] }) => void;
}

// 节点类型配置 - 统一使用增强节点
const nodeTypes = {
  braincell: EnhancedBrainCellNode,
};

const BrainCellGraphEditor = forwardRef<BrainCellGraphEditorRef, BrainCellGraphEditorProps>(({ onGraphChange, initialData }, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState<BrainCellMeta>(initialData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<EasyNetLink & { io: IOType }>>(initialData?.edges || initialEdges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [consoleHeight, setConsoleHeight] = useState(280);
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);

  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId]);
  const appendLog = useCallback((s: string) => setLogs(ls => [...ls, `[${new Date().toLocaleTimeString()}] ${s}`]), []);

  const { runAll, pause, resume, singleStep, reset } = useRunner(nodes, edges as any, setNodes, appendLog);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getGraphData: () => ({ nodes, edges }),
    loadGraphData: (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
      setSelectedId(null);
      setLogs([]);
    },
  }), [nodes, edges, setNodes, setEdges]);

  // Notify parent when graph changes
  useEffect(() => {
    onGraphChange?.(nodes, edges);
  }, [nodes, edges, onGraphChange]);

  const onConnect = useCallback((c: Connection) => {
    const check = isConnectionAllowed(c, nodes);
    if (!check.ok || !check.io) {
      alert("连接不合法：仅允许相同类型的端口相连，且不能自连。");
      return;
    }
    const defaultLink: EasyNetLink = {
      protocol: check.io === "data" ? "topic" : "rpc",
      channel: check.io === "data" ? "data" : "signal",
      qos: check.io === "data" ? 1 : 0,
      namespace: "/graph"
    };
    setEdges(eds => addEdge({
      ...c,
      type: "easynet",
      data: { ...defaultLink, io: check.io },
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds));
  }, [nodes, setEdges]);

  const onAdd = useCallback((kind: BrainCellKind) => {
    const id = makeId();
    const meta = defaultCell(kind);
    const pos = { x: 120 + Math.random() * 520, y: 80 + Math.random() * 340 };
    setNodes(ns => ns.concat([{ id, type: "braincell", position: pos, data: meta }]));
  }, [setNodes]);

  const onChangeSelected = useCallback((patch: Partial<BrainCellMeta>) => {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? {
      ...n,
      data: {
        ...n.data,
        ...patch,
        runtime: patch.runtime ? patch.runtime as any : n.data.runtime
      }
    } : n));
  }, [selected, setNodes]);

  const onDeleteSelected = useCallback(() => {
    if (!selected) return;
    setNodes(ns => ns.filter(n => n.id !== selected.id));
    setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id));
    setSelectedId(null);
  }, [selected, setNodes, setEdges]);

  const onExport = useCallback(() => {
    const payload: GraphSchema = { version: "1.1.0", nodes, edges } as any;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `braincell-easynet-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const onImport = useCallback((text: string) => {
    try {
      const parsed: GraphSchema = JSON.parse(text);
      if (!parsed.nodes || !parsed.edges) throw new Error("invalid schema");
      setNodes(parsed.nodes as any);
      setEdges(parsed.edges as any);
      setSelectedId(null);
      appendLog("导入成功");
    } catch (e) {
      alert("导入失败：" + (e as Error).message);
    }
  }, [setNodes, setEdges, appendLog]);

  const onClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedId(null);
    setLogs([]);
  }, [setNodes, setEdges]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if ((ev.key === "Delete" || ev.key === "Backspace") && selected) onDeleteSelected();
      if (ev.key === "p") resume();
      if (ev.key === "o") pause();
      if (ev.key === "i") singleStep();
      // Toggle console with Ctrl+` (backtick) like VS Code
      if (ev.ctrlKey && ev.key === "`") {
        ev.preventDefault();
        setIsConsoleVisible(!isConsoleVisible);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, onDeleteSelected, pause, resume, singleStep, isConsoleVisible]);

  const onValidate = useCallback(() => {
    const v = validateGraph(nodes, edges as any);
    alert(`从 ${v.sensors} 个传感器能到达执行器的路径数：${v.actuatorHits}`);
  }, [nodes, edges]);

  return (
    <div className="h-[calc(100vh-2rem)] w-full flex flex-col gap-3 p-3 bg-gray-50">
      {/* 顶部工具栏 */}
      <Card className="h-14" bodyStyle={{ padding: 0, height: '100%' }}>
        <Toolbar
          onRun={() => { resume(); runAll(); }}
          onStep={singleStep}
          onPause={pause}
          onReset={reset}
          onExport={onExport}
          onImport={onImport}
          onClear={onClear}
        />
      </Card>

      {/* 主要内容区域 */}
      <div className="flex-1 flex gap-3 min-h-0">
        {/* 左侧组件面板 */}
        <div className="w-[300px]">
          <EnhancedPalette onAdd={onAdd} />
        </div>

        {/* 中央画布区域 */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {/* 画布主体 */}
          <div
            className="bg-white rounded-t-lg shadow-sm border border-gray-200 relative overflow-hidden flex-1"
            style={{
              borderBottomLeftRadius: isConsoleVisible ? 0 : '0.5rem',
              borderBottomRightRadius: isConsoleVisible ? 0 : '0.5rem',
              borderBottom: isConsoleVisible ? 'none' : '1px solid rgb(229 231 235)',
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges as any}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid
              snapGrid={[20, 20]}
            >
              <Background
                variant="dots"
                gap={20}
                size={1}
                color="#e2e8f0"
                style={{
                  backgroundColor: '#fafbfc',
                }}
              />
              <MiniMap
                pannable
                zoomable
                position="top-right"
                className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
                nodeStrokeWidth={2}
                nodeColor="#e2e8f0"
                maskColor="rgba(100, 116, 139, 0.1)"
              />
              <Controls
                className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
                showInteractive={false}
              />
            </ReactFlow>

            {/* 画布工具按钮 */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Button
                size="small"
                type="default"
                onClick={onValidate}
                className="bg-white border-gray-300 shadow-sm hover:shadow-md transition-shadow"
              >
                校验连通
              </Button>
            </div>

            {/* 调试控制台触发按钮 */}
            {!isConsoleVisible && (
              <div className="absolute bottom-4 right-4">
                <Button
                  type="primary"
                  size="small"
                  onClick={() => setIsConsoleVisible(true)}
                  className="shadow-lg flex items-center gap-2"
                  icon={<Terminal className="h-4 w-4" />}
                >
                  <Badge count={logs.length} size="small" showZero={false}>
                    <span>控制台</span>
                  </Badge>
                </Button>
              </div>
            )}
          </div>

          {/* 调试控制台 - 与画布宽度一致 */}
          {isConsoleVisible && (
            <Card
              className="shadow-sm border-t-0 rounded-t-none"
              bodyStyle={{
                padding: 0,
                height: `${consoleHeight}px`,
                backgroundColor: '#1f2937',
              }}
              title={
                <div
                  className="flex items-center justify-between cursor-row-resize select-none"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const startY = e.clientY;
                    const startHeight = consoleHeight;

                    const handleMouseMove = (e: MouseEvent) => {
                      const deltaY = startY - e.clientY;
                      const newHeight = Math.max(100, Math.min(500, startHeight + deltaY));
                      setConsoleHeight(newHeight);
                    };

                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  title="拖拽调整高度"
                >
                  <Space>
                    <Terminal className="h-4 w-4 text-blue-600" />
                    <Text className="font-semibold text-gray-800">调试控制台</Text>
                    <Badge count={logs.length} showZero={false} />
                    <Text className="text-xs text-gray-500">
                      {logs.length > 0 ? `${logs.length} 条日志` : '等待输出'}
                    </Text>
                  </Space>
                  <Space>
                    <Button
                      type="text"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLogs([]);
                      }}
                      disabled={logs.length === 0}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      清除
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConsoleVisible(false);
                      }}
                      icon={<ChevronDown className="h-4 w-4" />}
                      className="text-gray-600 hover:text-gray-800"
                      title="隐藏控制台 (Ctrl+`)"
                    />
                  </Space>
                </div>
              }
              headStyle={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0',
                minHeight: '48px',
                padding: '8px 16px',
              }}
            >
              <div className="h-full bg-gray-900 text-green-400 font-mono text-sm overflow-auto p-4">
                {logs.length ? (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 py-1 hover:bg-gray-800 rounded px-2 -mx-2">
                        <span className="text-gray-500 flex-shrink-0 w-8 text-right text-xs">
                          {String(i + 1).padStart(3, '0')}
                        </span>
                        <span className="flex-1 text-green-400 text-xs whitespace-pre-wrap break-words">
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <div className="text-gray-500">控制台就绪</div>
                      <div className="text-gray-600 text-xs">运行工作流以查看调试信息</div>
                      <div className="text-gray-600 text-xs">快捷键: Ctrl+` 切换控制台 | 拖拽标题栏调整高度</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* 右侧属性面板 - 仅在有选中节点时显示 */}
        {selected && (
          <div className="w-[340px]">
            <Inspector
              selected={selected}
              onChange={onChangeSelected}
              onDelete={onDeleteSelected}
            />
          </div>
        )}
      </div>
    </div>
  );
});

BrainCellGraphEditor.displayName = 'BrainCellGraphEditor';

export default BrainCellGraphEditor;