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
import { App } from "antd";

// Local imports
import { BrainCellMeta, EasyNetLink, IOType, GraphSchema, BrainCellKind } from "../utils/types";
import { defaultCell, makeId } from "../utils/utils";
import { isConnectionAllowed, validateGraph } from "../utils/validation";
import { useRunner } from "../hooks/useRunner";
import { MinimalBrainCellNode } from "../nodes/MinimalBrainCellNode";
import { minimalEdgeTypes } from "../nodes/MinimalEasyNetEdge";
import { MinimalInspector } from "../ui/MinimalInspector";
import { MinimalPalette } from "../ui/MinimalPalette";
import { MinimalToolbar } from "../ui/MinimalToolbar";
import { MinimalDebugConsole } from "../ui/MinimalDebugConsole";
import MinimalBrainCellInternalView from "./MinimalBrainCellInternalView";

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
  braincell: MinimalBrainCellNode,
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

  // Graph state
  const [nodes, setNodes, onNodesChange] = useNodesState<BrainCellMeta>(initialData?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);

  // UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [isConsoleVisible, setIsConsoleVisible] = useState(false);
  const [internalViewNodeId, setInternalViewNodeId] = useState<string | null>(null);
  const [canvasTheme, setCanvasTheme] = useState<'grid' | 'dots' | 'plain'>("dots");

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
      message.warning({ content: "Invalid connection: Only same-type ports allowed, no self-connection.", duration: 1.8 });
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
    message.success({ content: "JSON exported", duration: 1.2 });
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

  // Internal view - Minimal design
  if (internalViewNodeId && internalViewNode) {
    return (
      <MinimalBrainCellInternalView
        brainCell={internalViewNode.data}
        onBack={exitInternalView}
        onUpdate={updateInternalViewNode}
      />
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] w-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-14 flex-shrink-0">
        <MinimalToolbar
          onRun={() => { resume(); runAll(); }}
          onPause={pause}
          onReset={reset}
          onStep={singleStep}
          onExport={onExport}
          onImport={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = async () => {
              const f = input.files?.[0];
              if (!f) return;
              const text = await f.text();
              onImport(text);
            };
            input.click();
          }}
          canvasTheme={canvasTheme}
          onCanvasThemeChange={setCanvasTheme}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex gap-3 p-3 min-h-0">
          {/* Left sidebar - Palette */}
          <div className="w-[280px] flex-shrink-0">
            <MinimalPalette onAdd={onAdd} />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 min-w-0 relative">
            <div className="h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                edgeTypes={minimalEdgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                snapToGrid
                snapGrid={[20, 20]}
                proOptions={{ hideAttribution: true }}
              >
                {canvasTheme === 'dots' && (
                  <Background variant="dots" gap={20} size={1} color="#d1d5db" style={{ backgroundColor: '#ffffff' }}/>
                )}
                {canvasTheme === 'grid' && (
                  <Background variant="lines" gap={20} lineWidth={0.5} color="#d1d5db" style={{ backgroundColor: '#ffffff' }}/>
                )}
                {canvasTheme === 'plain' && (
                  <Background variant="dots" gap={1000} size={0} color="#ffffff" style={{ backgroundColor: '#ffffff' }}/>
                )}

                <MiniMap pannable zoomable position="top-right" className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm" nodeStrokeWidth={1} nodeColor="#e5e7eb" maskColor="rgba(0,0,0,0.05)" />
                <Controls className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm" showInteractive={false} />
              </ReactFlow>
            </div>
          </div>

          {/* Right sidebar - Inspector */}
          {selected && (
            <div className="w-[320px] flex-shrink-0">
              <MinimalInspector
                selected={selected}
                onChange={onChangeSelected}
                onDelete={onDeleteSelected}
                onEnterInternalView={enterInternalView}
              />
            </div>
          )}
        </div>

        {/* Debug Console - inside main content area */}
        <MinimalDebugConsole
          logs={logs}
          isVisible={isConsoleVisible}
          height={consoleHeight}
          onToggle={() => setIsConsoleVisible(v => !v)}
          onClear={() => setLogs([])}
          onResize={setConsoleHeight}
        />
      </div>
    </div>
  );
});

BrainCellGraphEditor.displayName = "BrainCellGraphEditor";
export default BrainCellGraphEditor;
