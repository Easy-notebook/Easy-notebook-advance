import { useCallback, useMemo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { App, Modal } from 'antd';

// Local imports
import { BrainCellMeta, EasyNetLink, IOType, GraphSchema, BrainCellKind } from '../utils/types';
import { defaultCell, makeId } from '../utils/utils';
import { isConnectionAllowed, validateGraph } from '../utils/validation';
import { useRunner } from '../hooks/useRunner';
import { ModernBrainCellNode } from '../nodes/ModernBrainCellNode';
import { modernEdgeTypes } from '../nodes/ModernEasyNetEdge';
import { ModernInspector } from '../ui/ModernInspector';
import { ModernPalette } from '../ui/ModernPalette';
import { ModernToolbar } from '../ui/ModernToolbar';
import { ContextMenu } from '../ui/ContextMenu';
import BrainCellInternalView from './BrainCellInternalView';

// =============== Initial Data ===============
const initialNodes: Node<BrainCellMeta>[] = [
  { id: 'sensor1', type: 'braincell', position: { x: 100, y: 120 }, data: defaultCell('Sensor') },
  { id: 'proc1', type: 'braincell', position: { x: 420, y: 100 }, data: defaultCell('Processor') },
  { id: 'mem1', type: 'braincell', position: { x: 420, y: 260 }, data: defaultCell('Memory') },
  { id: 'act1', type: 'braincell', position: { x: 780, y: 160 }, data: defaultCell('Actuator') },
];

const initialEdges: Edge<EasyNetLink & { io: IOType }>[] = [
  {
    id: 'e1',
    type: 'easynet',
    source: 'sensor1',
    target: 'proc1',
    sourceHandle: 'out',
    targetHandle: 'in',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: 'topic', channel: 'signals', qos: 1, namespace: '/global', io: 'data' },
  },
  {
    id: 'e2',
    type: 'easynet',
    source: 'proc1',
    target: 'mem1',
    sourceHandle: 'out',
    targetHandle: 'write',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: 'topic', channel: 'knowledge', qos: 2, namespace: '/kf', io: 'data' },
  },
  {
    id: 'e3',
    type: 'easynet',
    source: 'proc1',
    target: 'act1',
    sourceHandle: 'done',
    targetHandle: 'do',
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { protocol: 'rpc', channel: 'trigger', qos: 0, namespace: '/actions', io: 'control' },
  },
];

// =============== Types ===============
const nodeTypes = {
  braincell: ModernBrainCellNode,
};

interface ModernBrainCellGraphEditorProps {
  onGraphChange?: (nodes: Node<BrainCellMeta>[], edges: Edge<EasyNetLink & { io: IOType }>[]) => void;
  initialData?: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
}

export interface ModernBrainCellGraphEditorRef {
  getGraphData: () => { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] };
  loadGraphData: (data: { nodes: Node<BrainCellMeta>[]; edges: Edge<EasyNetLink & { io: IOType }>[] }) => void;
}

// =============== Component ===============
const ModernBrainCellGraphEditor = forwardRef<ModernBrainCellGraphEditorRef, ModernBrainCellGraphEditorProps>(
  ({ onGraphChange, initialData }, ref) => {
    const { message, modal, notification } = App.useApp();
    const { fitView, zoomIn, zoomOut } = useReactFlow();

    // Graph state
    const [nodes, setNodes, onNodesChange] = useNodesState<BrainCellMeta>(initialData?.nodes || initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialData?.edges || initialEdges);

    // UI state
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [internalViewNodeId, setInternalViewNodeId] = useState<string | null>(null);
    const [canvasTheme, setCanvasTheme] = useState<'grid' | 'dots' | 'plain'>('dots');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
      id: string;
      top: number;
      left: number;
      type: 'node' | 'edge' | 'pane';
    } | null>(null);

    // Logs - we'll show them in a toast/notification system instead
    const appendLog = useCallback(
      (s: string) => {
        message.info({ content: s, duration: 2 });
      },
      [message]
    );

    // Runner controls
    const { runAll, pause, resume, singleStep, reset } = useRunner(nodes, edges as any, setNodes, appendLog);

    // Memoized lookups
    const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
    const internalViewNode = useMemo(() => nodes.find((n) => n.id === internalViewNodeId) ?? null, [nodes, internalViewNodeId]);

    // Imperative API
    useImperativeHandle(
      ref,
      () => ({
        getGraphData: () => ({ nodes, edges }),
        loadGraphData: (data) => {
          if (data.nodes) setNodes(data.nodes);
          if (data.edges) setEdges(data.edges);
          setSelectedId(null);
          message.success({ content: 'Graph loaded successfully!', duration: 2 });
        },
      }),
      [nodes, edges, setNodes, setEdges, message]
    );

    // Change notification
    useEffect(() => {
      onGraphChange?.(nodes, edges);
    }, [nodes, edges, onGraphChange]);

    // Connect
    const onConnect = useCallback(
      (c: Connection) => {
        const check = isConnectionAllowed(c, nodes);
        if (!check.ok || !check.io) {
          message.warning({ content: 'Invalid connection: ports must be of same type', duration: 2 });
          return;
        }
        const defaultLink: EasyNetLink = {
          protocol: check.io === 'data' ? 'topic' : 'rpc',
          channel: check.io === 'data' ? 'data' : 'signal',
          qos: check.io === 'data' ? 1 : 0,
          namespace: '/graph',
        };
        setEdges((eds) =>
          addEdge(
            {
              ...c,
              type: 'easynet',
              data: { ...defaultLink, io: check.io },
              markerEnd: { type: MarkerType.ArrowClosed },
            },
            eds
          )
        );
      },
      [nodes, setEdges, message]
    );

    // Add node
    const onAdd = useCallback(
      (kind: BrainCellKind) => {
        const id = makeId();
        const meta = defaultCell(kind);
        const pos = { x: 120 + Math.random() * 520, y: 80 + Math.random() * 340 };
        setNodes((ns) => ns.concat([{ id, type: 'braincell', position: pos, data: meta }]));
        message.success({ content: `${kind} node added!`, duration: 1.5 });
      },
      [setNodes, message]
    );

    // Update selected
    const onChangeSelected = useCallback(
      (patch: Partial<BrainCellMeta>) => {
        if (!selected) return;
        setNodes((ns) =>
          ns.map((n) =>
            n.id === selected.id
              ? { ...n, data: { ...n.data, ...patch, runtime: patch.runtime ? (patch.runtime as any) : n.data.runtime } }
              : n
          )
        );
      },
      [selected, setNodes]
    );

    // Delete selected
    const onDeleteSelected = useCallback(() => {
      if (!selected) return;
      modal.confirm({
        title: 'Delete Node',
        content: `Are you sure you want to delete "${selected.data?.name || selected.id}"?`,
        okButtonProps: { danger: true },
        onOk: () => {
          setNodes((ns) => ns.filter((n) => n.id !== selected.id));
          setEdges((es) => es.filter((e) => e.source !== selected.id && e.target !== selected.id));
          setSelectedId(null);
          message.success({ content: 'Node deleted', duration: 1.5 });
        },
      });
    }, [selected, modal, setNodes, setEdges, message]);

    // Export / Import / Clear
    const onExport = useCallback(() => {
      const payload: GraphSchema = { version: '1.1.0', nodes, edges } as any;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `braincell-graph-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      message.success({ content: 'Graph exported!', duration: 1.5 });
    }, [nodes, edges, message]);

    const onImport = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) return;
        try {
          const text = await f.text();
          const parsed: GraphSchema = JSON.parse(text);
          if (!parsed.nodes || !parsed.edges) throw new Error('Invalid schema');
          setNodes(parsed.nodes as any);
          setEdges(parsed.edges as any);
          setSelectedId(null);
          notification.success({
            message: 'Import successful',
            description: `Loaded ${parsed.nodes.length} nodes and ${parsed.edges.length} edges`,
          });
        } catch (e) {
          notification.error({ message: 'Import failed', description: (e as Error).message });
        }
      };
      input.click();
    }, [setNodes, setEdges, notification]);

    const onClear = useCallback(() => {
      modal.confirm({
        title: 'Clear Canvas',
        content: 'This will remove all nodes and connections. Continue?',
        okText: 'Clear',
        okButtonProps: { danger: true },
        onOk: () => {
          setNodes([]);
          setEdges([]);
          setSelectedId(null);
          message.success({ content: 'Canvas cleared', duration: 1.5 });
        },
      });
    }, [modal, setNodes, setEdges, message]);

    // Validate
    const onValidate = useCallback(() => {
      const v = validateGraph(nodes, edges as any);
      notification.info({
        message: 'Graph Validation',
        description: `Found ${v.sensors} sensors with ${v.actuatorHits} paths to actuators`,
        placement: 'bottomRight',
      });
    }, [nodes, edges, notification]);

    // Internal view
    const enterInternalView = useCallback((nodeId: string) => {
      setInternalViewNodeId(nodeId);
      setSelectedId(null);
    }, []);

    const exitInternalView = useCallback(() => {
      setInternalViewNodeId(null);
    }, []);

    const updateInternalViewNode = useCallback(
      (updates: Partial<BrainCellMeta>) => {
        if (!internalViewNodeId) return;
        setNodes((ns) => ns.map((n) => (n.id === internalViewNodeId ? { ...n, data: { ...n.data, ...updates } } : n)));
      },
      [internalViewNodeId, setNodes]
    );

    // Context menu handlers
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
        type: 'node',
      });
      setSelectedId(node.id);
    }, []);

    const onPaneClick = useCallback(() => {
      setSelectedId(null);
      setContextMenu(null);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
      const h = (ev: KeyboardEvent) => {
        if ((ev.key === 'Delete' || ev.key === 'Backspace') && selected) onDeleteSelected();
        if (ev.key === 'p') resume();
        if (ev.key === 'o') pause();
        if (ev.key === 'i') singleStep();
        if (ev.key === 'f') fitView({ padding: 0.2, duration: 800 });
      };
      window.addEventListener('keydown', h);
      return () => window.removeEventListener('keydown', h);
    }, [selected, onDeleteSelected, pause, resume, singleStep, fitView]);

    // Internal view
    if (internalViewNodeId && internalViewNode) {
      return (
        <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
          <BrainCellInternalView
            brainCell={internalViewNode.data}
            onBack={exitInternalView}
            onUpdate={updateInternalViewNode}
          />
        </div>
      );
    }

    // Background config
    const backgroundConfig = {
      grid: { variant: 'lines' as const, gap: 20, color: '#e5e7eb' },
      dots: { variant: 'dots' as const, gap: 20, color: '#cbd5e1', size: 1 },
      plain: { variant: 'dots' as const, gap: 1000, color: '#ffffff', size: 0 },
    };

    const bgConfig = backgroundConfig[canvasTheme];

    return (
      <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Toolbar */}
        <div className="h-16 flex-shrink-0">
          <ModernToolbar
            onRun={() => {
              resume();
              runAll();
            }}
            onPause={pause}
            onReset={reset}
            onStep={singleStep}
            onExport={onExport}
            onImport={onImport}
            onClear={onClear}
            onValidate={onValidate}
            onFitView={() => fitView({ padding: 0.2, duration: 800 })}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            canvasTheme={canvasTheme}
            onCanvasThemeChange={setCanvasTheme}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            nodesCount={nodes.length}
            edgesCount={edges.length}
            isRunning={false}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex gap-4 p-4 min-h-0">
          {/* Left sidebar - Palette */}
          <div className="w-[320px] flex-shrink-0">
            <ModernPalette onAdd={onAdd} />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
            <ReactFlow
              nodes={nodes}
              edges={edges as any}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setSelectedId(n.id)}
              onNodeDoubleClick={(_, n) => enterInternalView(n.id)}
              onNodeContextMenu={onNodeContextMenu}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              edgeTypes={modernEdgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              snapToGrid
              snapGrid={[20, 20]}
              proOptions={{ hideAttribution: true }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background {...bgConfig} style={{ backgroundColor: '#fafbfc' }} />

              <MiniMap
                pannable
                zoomable
                position="top-right"
                className="!bg-white/95 !backdrop-blur-sm !border-2 !border-gray-300 !rounded-xl !shadow-xl"
                nodeStrokeWidth={3}
                nodeColor="#e2e8f0"
                maskColor="rgba(100,116,139,0.12)"
              />

              <Controls
                className="!bg-white/95 !backdrop-blur-sm !border-2 !border-gray-300 !rounded-xl !shadow-xl"
                showInteractive={false}
              />

              {/* Watermark */}
              <Panel position="bottom-left">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl border-2 border-gray-200 shadow-lg">
                  <div className="text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    BrainCell Graph Editor
                  </div>
                  <div className="text-xs text-gray-500">Powered by React Flow</div>
                </div>
              </Panel>
            </ReactFlow>
          </div>

          {/* Right sidebar - Inspector */}
          {selected && (
            <div className="w-[360px] flex-shrink-0">
              <ModernInspector
                selected={selected}
                onChange={onChangeSelected}
                onDelete={onDeleteSelected}
                onEnterInternalView={enterInternalView}
              />
            </div>
          )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <ContextMenu
            {...contextMenu}
            onClose={() => setContextMenu(null)}
            onDelete={onDeleteSelected}
            onEnterInternal={() => enterInternalView(contextMenu.id)}
            onViewDetails={() => setSelectedId(contextMenu.id)}
          />
        )}
      </div>
    );
  }
);

ModernBrainCellGraphEditor.displayName = 'ModernBrainCellGraphEditor';
export default ModernBrainCellGraphEditor;
