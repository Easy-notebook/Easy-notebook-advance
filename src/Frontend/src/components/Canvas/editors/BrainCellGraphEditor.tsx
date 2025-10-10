import { useCallback, useMemo, useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
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
  Panel
} from "reactflow";
import "reactflow/dist/style.css";
import { App, Button, Card, Space, Typography, Badge, Modal, Dropdown, theme, Tooltip, Segmented } from "antd";
import { Terminal, ChevronDown, Ellipsis, RotateCcw, Play, Pause, StepForward, Upload, Download, Trash2, Bug, ZoomIn, ZoomOut } from "lucide-react";

const { Text } = Typography;

// Local imports
import { BrainCellMeta, EasyNetLink, IOType, GraphSchema, BrainCellKind } from "../utils/types";
import { defaultCell, makeId } from "../utils/utils";
import { isConnectionAllowed, validateGraph } from "../utils/validation";
import { useRunner } from "../hooks/useRunner";
import { EnhancedBrainCellNode } from "../nodes/EnhancedBrainCellNode";
import { edgeTypes } from "../nodes/EasyNetEdge";
import { Inspector } from "../ui/Inspector";
import { EnhancedPalette } from "../ui/EnhancedPalette";
import { Toolbar } from "../ui/Toolbar";
import BrainCellInternalView from "./BrainCellInternalView";

// =============== Initial Data ===============
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

// =============== 类型 ===============
const nodeTypes = {
  braincell: EnhancedBrainCellNode,
};

interface BrainCellGraphEditorProps {
  onGraphChange?: (nodes: Node<BrainCellMeta>[], edges: Edge<EasyNetLink & { io: IOType }>[]) => void;
  initialData?: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
}

export interface BrainCellGraphEditorRef {
  getGraphData: () => { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
  loadGraphData: (data: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] }) => void;
}

// =============== 组件 ===============
const BrainCellGraphEditor = forwardRef<BrainCellGraphEditorRef, BrainCellGraphEditorProps>(({ onGraphChange, initialData }, ref) => {
  const { message, modal, notification } = App.useApp();
  const { token } = theme.useToken();

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState<BrainCellMeta>(initialData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [consoleHeight, setConsoleHeight] = useState(260);
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);
  const [internalViewNodeId, setInternalViewNodeId] = useState<string | null>(null);
  const [canvasTheme, setCanvasTheme] = useState<'grid' | 'dots' | 'plain'>("dots");
  const resizingRef = useRef(false);

  // Memoized lookups
  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId]);
  const internalViewNode = useMemo(() => nodes.find(n => n.id === internalViewNodeId) ?? null, [nodes, internalViewNodeId]);

  const appendLog = useCallback((s: string) => setLogs(ls => {
    const next = [...ls, `[${new Date().toLocaleTimeString()}] ${s}`];
    // 简单截断，避免内存爆
    if (next.length > 800) next.shift();
    return next;
  }), []);

  // Runner controls
  const { runAll, pause, resume, singleStep, reset } = useRunner(nodes, edges as any, setNodes, appendLog);

  // Imperative API
  useImperativeHandle(ref, () => ({
    getGraphData: () => ({ nodes, edges }),
    loadGraphData: (data) => {
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
      setSelectedId(null);
      setLogs([]);
      message.success({ content: "Graph loaded", duration: 1.2 });
    },
  }), [nodes, edges, setNodes, setEdges, message]);

  // Change notification (debounced by microtask)
  useEffect(() => {
    onGraphChange?.(nodes, edges);
  }, [nodes, edges, onGraphChange]);

  // Connect
  const onConnect = useCallback((c: Connection) => {
    const check = isConnectionAllowed(c, nodes);
    if (!check.ok || !check.io) {
      message.warning({ content: "连接不合法：仅允许同类端口，且不能自连。", duration: 1.8 });
      return;
    }
    const defaultLink: EasyNetLink = {
      protocol: check.io === "data" ? "topic" : "rpc",
      channel: check.io === "data" ? "data" : "signal",
      qos: check.io === "data" ? 1 : 0,
      namespace: "/graph"
    };
    setEdges(eds => addEdge({ ...c, type: "easynet", data: { ...defaultLink, io: check.io }, markerEnd: { type: MarkerType.ArrowClosed } }, eds));
  }, [nodes, setEdges, message]);

  // Add node
  const onAdd = useCallback((kind: BrainCellKind) => {
    const id = makeId();
    const meta = defaultCell(kind);
    const pos = { x: 120 + Math.random() * 520, y: 80 + Math.random() * 340 };
    setNodes(ns => ns.concat([{ id, type: "braincell", position: pos, data: meta }]));
  }, [setNodes]);

  // Update selected
  const onChangeSelected = useCallback((patch: Partial<BrainCellMeta>) => {
    if (!selected) return;
    setNodes(ns => ns.map(n => n.id === selected.id ? { ...n, data: { ...n.data, ...patch, runtime: patch.runtime ? patch.runtime as any : n.data.runtime } } : n));
  }, [selected, setNodes]);

  // Delete selected with confirm
  const onDeleteSelected = useCallback(() => {
    if (!selected) return;
    modal.confirm({
      title: "Delete Node",
      content: `Are you sure you want to delete ${selected.data?.name || selected.id} and its related connections?`,
      okButtonProps: { danger: true },
      onOk: () => {
        setNodes(ns => ns.filter(n => n.id !== selected.id));
        setEdges(es => es.filter(e => e.source !== selected.id && e.target !== selected.id));
        setSelectedId(null);
        message.success({ content: "Deleted", duration: 1 });
      }
    });
  }, [selected, modal, setNodes, setEdges, message]);

  // Export / Import / Clear
  const onExport = useCallback(() => {
    const payload: GraphSchema = { version: "1.1.0", nodes, edges } as any;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `braincell-easynet-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
    message.success({ content: "已导出 JSON", duration: 1.2 });
  }, [nodes, edges, message]);

  const onImport = useCallback((text: string) => {
    try {
      const parsed: GraphSchema = JSON.parse(text);
      if (!parsed.nodes || !parsed.edges) throw new Error("invalid schema");
      setNodes(parsed.nodes as any);
      setEdges(parsed.edges as any);
      setSelectedId(null);
      appendLog("Import successful");
      notification.success({ message: "Import successful", description: `Nodes: ${parsed.nodes.length}, Edges: ${parsed.edges.length}` });
    } catch (e) {
      notification.error({ message: "Import failed", description: (e as Error).message });
    }
  }, [setNodes, setEdges, appendLog, notification]);

  const onClear = useCallback(() => {
    modal.confirm({
      title: "Clear Canvas",
      content: "This operation cannot be undone. Are you sure you want to clear all nodes and connections?",
      okText: "Clear",
      okButtonProps: { danger: true },
      onOk: () => { setNodes([]); setEdges([]); setSelectedId(null); setLogs([]); }
    });
  }, [modal, setNodes, setEdges]);

  // Validate
  const onValidate = useCallback(() => {
    const v = validateGraph(nodes, edges as any);
    notification.info({
      message: "Reachability validation",
      description: `Paths from ${v.sensors} sensors to actuators: ${v.actuatorHits}`,
      placement: "bottomRight"
    });
  }, [nodes, edges, notification]);

  // Internal view
  const enterInternalView = useCallback((nodeId: string) => { setInternalViewNodeId(nodeId); setSelectedId(null); }, []);
  const exitInternalView  = useCallback(() => { setInternalViewNodeId(null); }, []);
  const updateInternalViewNode = useCallback((updates: Partial<BrainCellMeta>) => {
    if (!internalViewNodeId) return;
    setNodes(ns => ns.map(n => n.id === internalViewNodeId ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [internalViewNodeId, setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if ((ev.key === "Delete" || ev.key === "Backspace") && selected) onDeleteSelected();
      if (ev.key === "p") resume();
      if (ev.key === "o") pause();
      if (ev.key === "i") singleStep();
      if (ev.ctrlKey && ev.key === "`") { ev.preventDefault(); setIsConsoleVisible(v => !v); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selected, onDeleteSelected, pause, resume, singleStep]);

  // 拖拽调整控制台高度（更顺滑）
  const onStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY; const startHeight = consoleHeight; resizingRef.current = true;
    const move = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(120, Math.min(560, startHeight + deltaY));
      setConsoleHeight(newHeight);
    };
    const up = () => { resizingRef.current = false; document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  // 内部视图
  if (internalViewNodeId && internalViewNode) {
    return (
      <div className="h-[calc(100vh-2rem)] w-full flex flex-col gap-3 p-3 bg-neutral-50">
        <BrainCellInternalView brainCell={internalViewNode.data} onBack={exitInternalView} onUpdate={updateInternalViewNode} />
      </div>
    );
  }

  // Top tools
  const menu = [
    { key: "validate", label: "Validate reachability", onClick: onValidate },
    { type: "divider" as const },
    { key: "clear", label: <span className="text-red-600">Clear Canvas</span>, onClick: onClear },
  ];

  return (
    <div className="h-[calc(100vh-2rem)] w-full flex flex-col gap-3 p-3 bg-neutral-50">
      <Card className="h-16 border border-neutral-200 shadow-sm rounded-xl overflow-hidden" bodyStyle={{ padding: 0, height: "100%" }}>
        <div className="h-full flex items-center justify-between px-3">
          <Space>
            <Button type="primary" icon={<Play size={16}/>} onClick={() => { resume(); runAll(); }}>
              运行
            </Button>
            <Tooltip title="单步执行 (i)"><Button icon={<StepForward size={16}/>} onClick={singleStep}/></Tooltip>
            <Tooltip title="暂停 (o)"><Button icon={<Pause size={16}/>} onClick={pause}/></Tooltip>
            <Tooltip title="重置"><Button icon={<RotateCcw size={16}/>} onClick={reset}/></Tooltip>
            <div className="ml-2">
              <Segmented
                options={[{ label: "点阵", value: "dots" }, { label: "网格", value: "grid" }, { label: "纯色", value: "plain" }]}
                size="small"
                value={canvasTheme}
                onChange={(v) => setCanvasTheme(v as any)}
              />
            </div>
          </Space>
          <Space>
            <Tooltip title="导出 JSON"><Button icon={<Download size={16}/>} onClick={onExport}/></Tooltip>
            <Tooltip title="导入 JSON">
              <Button icon={<Upload size={16}/>} onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.accept = 'application/json';
                input.onchange = async () => {
                  const f = input.files?.[0]; if (!f) return;
                  const text = await f.text(); onImport(text);
                };
                input.click();
              }}/>
            </Tooltip>
            <Dropdown menu={{ items: menu }} trigger={["click"]} placement="bottomRight">
              <Button icon={<Ellipsis size={16}/>}/>
            </Dropdown>
          </Space>
        </div>
      </Card>

      <div className="flex-1 flex gap-3 min-h-0">
        {/* 左侧面板 */}
        <div className="w-[300px] min-w-[280px]">
          <EnhancedPalette onAdd={onAdd} />
        </div>

        {/* 画布区域 */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div
            className="bg-white rounded-t-xl shadow-sm border border-neutral-200 relative overflow-hidden flex-1"
            style={{
              borderBottomLeftRadius: isConsoleVisible ? 0 : token.borderRadiusLG,
              borderBottomRightRadius: isConsoleVisible ? 0 : token.borderRadiusLG,
              borderBottom: isConsoleVisible ? "none" : `1px solid ${token.colorBorder}`,
            }}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges as any}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onNodeDoubleClick={(_, n) => enterInternalView(n.id)}
              onPaneClick={() => setSelectedId(null)}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid
              snapGrid={[20, 20]}
              proOptions={{ hideAttribution: true }}
            >
              {canvasTheme === 'dots' && (
                <Background variant="dots" gap={20} size={1} color="#e2e8f0" style={{ backgroundColor: '#fafbfc' }}/>
              )}
              {canvasTheme === 'grid' && (
                <Background variant="lines" gap={20} lineWidth={0.5} color="#e2e8f0" style={{ backgroundColor: '#fafbfc' }}/>
              )}
              {canvasTheme === 'plain' && (
                <Background variant="dots" gap={1000} size={0} color="#ffffff" style={{ backgroundColor: '#ffffff' }}/>
              )}

              <MiniMap pannable zoomable position="top-right" className="!bg-white !border !border-neutral-200 !rounded-lg !shadow-sm" nodeStrokeWidth={2} nodeColor="#e2e8f0" maskColor="rgba(100,116,139,0.08)" />
              <Controls className="!bg-white !border !border-neutral-200 !rounded-lg !shadow-sm" showInteractive={false} />

              {/* 右下角状态面板 */}
              <Panel position="bottom-right">
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-neutral-200 shadow-sm flex items-center gap-3">
                  <Bug size={14} className="opacity-70"/>
                  <Text type="secondary" className="text-xs">日志 {logs.length}</Text>
                  <Button size="small" onClick={() => setIsConsoleVisible(v => !v)} icon={<Terminal size={14}/>}>{isConsoleVisible ? '隐藏控制台' : '显示控制台'}</Button>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* 控制台 */}
          {isConsoleVisible && (
            <Card
              className="shadow-sm border-t-0 rounded-t-none"
              bodyStyle={{ padding: 0, margin: 0, height: `${consoleHeight}px`, backgroundColor: '#f8fafc', border: 'none' }}
              title={
                <div className="flex items-center justify-between select-none" style={{ cursor: 'row-resize' }} onMouseDown={onStartResize}>
                  <Space>
                    <Terminal className="h-4 w-4 text-blue-600" />
                    <Text className="font-semibold text-neutral-800">调试控制台</Text>
                    <Badge count={logs.length} showZero={false} />
                    <Text className="text-xs text-neutral-500">{logs.length > 0 ? `${logs.length} 条日志` : '等待输出'}</Text>
                  </Space>
                  <Space>
                    <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); setLogs([]); }} disabled={logs.length === 0} className="text-neutral-600 hover:text-neutral-800">清除</Button>
                    <Button type="text" size="small" onClick={(e) => { e.stopPropagation(); setIsConsoleVisible(false); }} icon={<ChevronDown className="h-4 w-4" />} className="text-neutral-600 hover:text-neutral-800" title="隐藏控制台 (Ctrl+` )" />
                  </Space>
                </div>
              }
              headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb', minHeight: '40px', padding: '6px 16px', border: 'none', margin: 0 }}
            >
              <div className="h-full bg-white text-neutral-800 font-mono text-sm overflow-auto p-4">
                {logs.length ? (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="flex items-start gap-3 py-1 hover:bg-neutral-50 rounded px-2 -mx-2">
                        <span className="text-neutral-400 flex-shrink-0 w-8 text-right text-xs">{String(i + 1).padStart(3, '0')}</span>
                        <span className="flex-1 text-neutral-700 text-xs whitespace-pre-wrap break-words">{log}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <div className="text-neutral-500">控制台就绪</div>
                      <div className="text-neutral-400 text-xs">运行工作流以查看调试信息</div>
                      <div className="text-neutral-400 text-xs">快捷键: Ctrl+` 切换控制台 | 拖拽标题栏调整高度</div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* 右侧 Inspector */}
        {selected && (
          <div className="w-[340px] min-w-[320px]">
            <Inspector selected={selected} onChange={onChangeSelected} onDelete={onDeleteSelected} onEnterInternalView={enterInternalView} />
          </div>
        )}
      </div>
    </div>
  );
});

BrainCellGraphEditor.displayName = "BrainCellGraphEditor";
export default BrainCellGraphEditor;
