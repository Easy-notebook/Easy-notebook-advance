import { useCallback, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  MarkerType,
  ReactFlowInstance,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  Handle,
  Position,
  NodeProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import {
  ArrowLeft, Download, Shield, BookOpen, Share2, Database,
  MessageSquare, Wand2, Settings, BookMarked, Cpu, Zap,
  Link, Info, Layers, Activity, Code, Monitor, Play, ChevronDown, ChevronUp,
  Maximize2, Minimize2, X
} from 'lucide-react';

/* ================== 类型 ================== */
export interface BrainCellMeta {
  id: string;
  name: string;
  kind?: string;
  runtime?: { status?: "active" | "error" | "idle"; logging?: boolean };
  abilities?: { public: string[]; byGroup?: Record<"WRITE"|"COMMUNICATION"|"PLANNING"|"OTHER", string[]> };
  rules?: { name: string; spec: any }[];
  bindings?: { knowledge?: { kind: "vector"|"db"|"file"; name: string }[] };
}

type BrainCellShape = "circle" | "ellipse" | "diamond" | "rounded" | "semiRounded" | "hexagon";
type Material = "solid" | "soft" | "glass" | "neon" | "gradient";
type Role = "ability" | "rule" | "knowledge";
type SourceType = "none" | "easynet";

interface NodeData {
  label: string;
  role: Role | "base";
  shape?: BrainCellShape;
  icon?: string;
  material?: Material;
  kind?: string;
  stats?: { abilities: number; rules: number; knowledge: number };
  abilityGroup?: "WRITE" | "COMMUNICATION" | "PLANNING" | "OTHER";
  abilitySlug?: string;
  source?: { type: SourceType; namespace?: string; channel?: string; qos?: number };
}

/* ================== 统一主题 ================== */
const Theme = {
  colors: {
    bg: "#ffffff",
    bgAlt: "#f8fafc",
    border: "#e5e7eb",
    borderStrong: "#9ca3af",
    grid: "#e5e7eb",
    text: "#111827",
    textSub: "#6b7280",
    textMuted: "#9ca3af",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    accent: "#06b6d4",
  }
};

/* ================== 图标库 ================== */
const IconMap: Record<string, React.ReactNode> = {
  ability: <Share2 size={16}/>,
  vector: <Database size={16}/>,
  chat: <MessageSquare size={16}/>,
  rule: <Shield size={16}/>,
  knowledge: <BookOpen size={16}/>,
  base: <Cpu size={20}/>,
  wand: <Wand2 size={16}/>,
  settings: <Settings size={16}/>,
  book: <BookMarked size={16}/>,
  zap: <Zap size={16}/>,
};

/* ================== 工业感 Base 节点 ================== */
function TechBaseNode({ data, selected }: NodeProps<NodeData>) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative"
      style={{ width: 180, height: 180 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 角标装饰 */}
      <svg className="absolute" style={{ top: 10, left: 10, width: 160, height: 160, pointerEvents: 'none', opacity: 0.4 }}>
        {/* 四个角的装饰线 */}
        <path d="M 0,10 L 0,0 L 10,0" stroke={Theme.colors.borderStrong} strokeWidth="0.8" fill="none"/>
        <path d="M 150,0 L 160,0 L 160,10" stroke={Theme.colors.borderStrong} strokeWidth="0.8" fill="none"/>
        <path d="M 160,150 L 160,160 L 150,160" stroke={Theme.colors.borderStrong} strokeWidth="0.8" fill="none"/>
        <path d="M 10,160 L 0,160 L 0,150" stroke={Theme.colors.borderStrong} strokeWidth="0.8" fill="none"/>
      </svg>

      {/* 主容器 */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: 140,
          height: 140,
          margin: '20px',
          background: Theme.colors.bg,
          border: `1.5px solid ${selected ? Theme.colors.primary : isHovered ? Theme.colors.borderStrong : Theme.colors.border}`,
          borderRadius: 6,
          boxShadow: selected
            ? `0 0 0 1px ${Theme.colors.primary}20, 0 3px 8px rgba(0,0,0,0.06)`
            : isHovered
              ? '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(229, 231, 235, 0.8)'
              : '0 2px 4px rgba(0,0,0,0.03)',
          transition: 'all 0.2s ease',
        }}
      >
        {/* 技术标注 - 类型标签 - 左上角 */}
        {data.kind && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              background: Theme.colors.bgAlt,
              color: Theme.colors.textSub,
              border: `1px solid ${Theme.colors.border}`,
              fontSize: 10,
              letterSpacing: '0.3px',
            }}
          >
            {data.kind.toUpperCase()}
          </div>
        )}

        {/* 状态Badge - 右上角 */}
        <div className="absolute top-2 right-2">
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded"
            style={{
              background: data.stats && (data.stats.abilities + data.stats.rules + data.stats.knowledge) > 0
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(156, 163, 175, 0.1)',
              border: `1px solid ${data.stats && (data.stats.abilities + data.stats.rules + data.stats.knowledge) > 0
                ? 'rgba(16, 185, 129, 0.3)'
                : 'rgba(156, 163, 175, 0.3)'}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: data.stats && (data.stats.abilities + data.stats.rules + data.stats.knowledge) > 0
                  ? Theme.colors.success
                  : Theme.colors.textMuted
              }}
            />
            <div className="text-xs font-medium" style={{
              color: data.stats && (data.stats.abilities + data.stats.rules + data.stats.knowledge) > 0
                ? Theme.colors.success
                : Theme.colors.textMuted,
              fontSize: 9
            }}>
              READY
            </div>
          </div>
        </div>

        {/* 名称 */}
        <div
          className="text-base font-bold mb-3 px-3 text-center"
          style={{
            color: Theme.colors.text,
            letterSpacing: '0.3px',
            marginTop: 32
          }}
        >
          {data.label}
        </div>

        {/* 统计 - 纯文本仪表盘 */}
        {data.stats && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            height: 20
          }}>
            {/* Ability */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: '100%'
            }}>
              <span className="font-medium text-xs" style={{ color: Theme.colors.primary, opacity: 0.7 }}>ABL</span>
              <span className="font-bold font-mono" style={{
                color: Theme.colors.primary,
                fontSize: 14,
                lineHeight: '20px'
              }}>{data.stats.abilities}</span>
            </div>

            <div style={{ width: 1, height: 14, background: Theme.colors.border, alignSelf: 'center' }} />

            {/* Rule */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: '100%'
            }}>
              <span className="font-medium text-xs" style={{ color: Theme.colors.warning, opacity: 0.7 }}>RUL</span>
              <span className="font-bold font-mono" style={{
                color: Theme.colors.warning,
                fontSize: 14,
                lineHeight: '20px'
              }}>{data.stats.rules}</span>
            </div>

            <div style={{ width: 1, height: 14, background: Theme.colors.border, alignSelf: 'center' }} />

            {/* Knowledge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              height: '100%'
            }}>
              <span className="font-medium text-xs" style={{ color: Theme.colors.success, opacity: 0.7 }}>KNW</span>
              <span className="font-bold font-mono" style={{
                color: Theme.colors.success,
                fontSize: 14,
                lineHeight: '20px'
              }}>{data.stats.knowledge}</span>
            </div>
          </div>
        )}
      </div>

      {/* 端口 - Knowledge (左上) */}
      <div className="absolute" style={{ left: 0, top: '30%', transform: 'translateY(-50%)' }}>
        <Handle
          id="h_knowledge"
          type="target"
          position={Position.Left}
          style={{
            width: 7,
            height: 7,
            background: Theme.colors.success,
            border: `1.5px solid ${Theme.colors.bg}`,
            borderRadius: '50%',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />
        <div
          className="absolute font-mono font-semibold"
          style={{
            left: -48,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            color: Theme.colors.success,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
            opacity: 0.8,
          }}
        >
          K-IN
        </div>
      </div>

      {/* 端口 - Ability (左中) */}
      <div className="absolute" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
        <Handle
          id="h_ability"
          type="target"
          position={Position.Left}
          style={{
            width: 7,
            height: 7,
            background: Theme.colors.primary,
            border: `1.5px solid ${Theme.colors.bg}`,
            borderRadius: '50%',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />
        <div
          className="absolute font-mono font-semibold"
          style={{
            left: -48,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            color: Theme.colors.primary,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
            opacity: 0.8,
          }}
        >
          A-IN
        </div>
      </div>

      {/* 端口 - Rule (左下) */}
      <div className="absolute" style={{ left: 0, top: '70%', transform: 'translateY(-50%)' }}>
        <Handle
          id="h_rule"
          type="target"
          position={Position.Left}
          style={{
            width: 7,
            height: 7,
            background: Theme.colors.warning,
            border: `1.5px solid ${Theme.colors.bg}`,
            borderRadius: '50%',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />
        <div
          className="absolute font-mono font-semibold"
          style={{
            left: -48,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            color: Theme.colors.warning,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
            opacity: 0.8,
          }}
        >
          R-IN
        </div>
      </div>

      {/* 端口 - Output (右侧) */}
      <div className="absolute" style={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}>
        <Handle
          id="h_out"
          type="source"
          position={Position.Right}
          style={{
            width: 7,
            height: 7,
            background: Theme.colors.accent,
            border: `1.5px solid ${Theme.colors.bg}`,
            borderRadius: '50%',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          }}
        />
        <div
          className="absolute font-mono font-semibold"
          style={{
            right: -42,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 9,
            color: Theme.colors.accent,
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
            opacity: 0.8,
          }}
        >
          OUT
        </div>
      </div>
    </div>
  );
}

/* ================== 形状渲染器 ================== */
function ShapeRenderer({
  shape = "circle",
  size,
  borderColor,
  backgroundColor,
  children
}: {
  shape?: BrainCellShape;
  size: number;
  borderColor: string;
  backgroundColor: string;
  children: React.ReactNode;
}) {
  const commonStyle: React.CSSProperties = {
    width: size,
    height: size,
    border: `1px solid ${borderColor}`,
    background: backgroundColor,
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    transition: 'all 0.2s ease',
    position: 'relative',
  };

  switch (shape) {
    case "circle":
      return <div style={{ ...commonStyle, borderRadius: '50%' }}>{children}</div>;

    case "ellipse":
      return <div style={{ ...commonStyle, borderRadius: '50%', width: size * 1.3 }}>{children}</div>;

    case "diamond":
      return (
        <div style={{ ...commonStyle, transform: 'rotate(45deg)', borderRadius: 3 }}>
          <div style={{ transform: 'rotate(-45deg)' }}>{children}</div>
        </div>
      );

    case "rounded":
      return <div style={{ ...commonStyle, borderRadius: 10 }}>{children}</div>;

    case "semiRounded":
      return <div style={{ ...commonStyle, borderRadius: '16px 3px' }}>{children}</div>;

    case "hexagon":
      return (
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.03))' }}>
            <polygon
              points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5"
              fill={backgroundColor}
              stroke={borderColor}
              strokeWidth="1"
            />
          </svg>
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3
          }}>
            {children}
          </div>
        </div>
      );

    default:
      return <div style={{ ...commonStyle, borderRadius: '50%' }}>{children}</div>;
  }
}

/* ================== 工业感 Gen 节点 ================== */
function TechGenNode({ data, selected }: NodeProps<NodeData>) {
  const roleColors = {
    ability: Theme.colors.primary,
    rule: Theme.colors.warning,
    knowledge: Theme.colors.success
  };

  const color = roleColors[data.role as Role] || Theme.colors.primary;
  const borderColor = selected ? color : Theme.colors.border;

  // 材质背景
  let backgroundColor = Theme.colors.bg;
  if (data.material === "soft") backgroundColor = Theme.colors.bgAlt;
  else if (data.material === "glass") backgroundColor = "rgba(248, 250, 252, 0.8)";

  const size = 75;

  return (
    <div className="relative" style={{ width: size + 20, height: size + 20 }}>
      <div style={{ margin: 10 }}>
        <ShapeRenderer
          shape={data.shape}
          size={size}
          borderColor={borderColor}
          backgroundColor={backgroundColor}
        >
          {/* 标签 */}
          <span
            className="text-xs font-semibold px-2 text-center"
            style={{
              maxWidth: size - 16,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: Theme.colors.text,
              fontSize: 12,
            }}
          >
            {data.label}
          </span>

          {/* EasyNet 指示器 */}
          {data.source?.type === "easynet" && (
            <div
              className="absolute"
              style={{
                top: -4,
                right: -4,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: Theme.colors.success,
                border: `1.5px solid ${Theme.colors.bg}`,
                boxShadow: '0 0 0 1px rgba(16, 185, 129, 0.2)',
              }}
            />
          )}
        </ShapeRenderer>
      </div>

      {/* Handle */}
      <Handle
        type="source"
        position={data.role === "knowledge" ? Position.Bottom : Position.Right}
        style={{
          [data.role === "knowledge" ? "bottom" : "right"]: 0,
          [data.role === "knowledge" ? "left" : "top"]: '50%',
          transform: data.role === "knowledge" ? 'translateX(-50%)' : 'translateY(-50%)',
          width: 6,
          height: 6,
          background: borderColor,
          border: `1.5px solid ${Theme.colors.bg}`,
          borderRadius: '50%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  );
}

/* ================== 技术感边 ================== */
function TechEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {}, markerEnd, label, selected, data }: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const isEasyNet = data?.source?.type === "easynet";
  const linkInfo = isEasyNet
    ? `${data.source.namespace || ""}/${data.source.channel || ""} • QoS:${data.source.qos ?? 1}`
    : label;

  const edgeColor = selected ? Theme.colors.primary : isEasyNet ? Theme.colors.success : Theme.colors.borderStrong;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 1.5 : 1,
          stroke: edgeColor,
          transition: "all 0.2s ease"
        }}
      />
      {linkInfo && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 9,
              fontWeight: 500,
              pointerEvents: 'all',
            }}
          >
            <div
              className="px-2 py-0.5 font-mono"
              style={{
                background: Theme.colors.bg,
                color: isEasyNet ? Theme.colors.success : Theme.colors.text,
                border: `0.5px solid ${isEasyNet ? Theme.colors.success : Theme.colors.border}`,
                borderRadius: 3,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
            >
              {linkInfo}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/* ================== 节点工厂 ================== */
const N = {
  ability: (id: string, x: number, y: number, label: string, shape: BrainCellShape = "circle", icon = "ability", material: Material = "solid"): Node => ({
    id,
    type: "genNode",
    position: { x, y },
    data: { label, role: "ability", material, shape, icon } as NodeData
  }),
  rule: (id: string, x: number, y: number, label: string, shape: BrainCellShape = "diamond", icon = "rule", material: Material = "soft"): Node => ({
    id,
    type: "genNode",
    position: { x, y },
    data: { label, role: "rule", material, shape, icon } as NodeData
  }),
  knowledge: (id: string, x: number, y: number, label: string, shape: BrainCellShape = "circle", icon = "knowledge", material: Material = "glass"): Node => ({
    id,
    type: "genNode",
    position: { x, y },
    data: { label, role: "knowledge", material, shape, icon } as NodeData
  }),
};

/* ================== 边创建 ================== */
const mkEdge = (id: string, source: string, target: string, data?: any): Edge => ({
  id,
  source,
  target,
  targetHandle: data?.role === "ability" ? "h_ability" :
               data?.role === "rule" ? "h_rule" :
               data?.role === "knowledge" ? "h_knowledge" : undefined,
  type: "custom",
  style: { stroke: Theme.colors.borderStrong, strokeWidth: 1 },
  markerEnd: { type: MarkerType.ArrowClosed, color: Theme.colors.borderStrong, width: 12, height: 12 },
  data,
  animated: data?.source?.type === "easynet"
});

/* ================== 连接验证 ================== */
function allowed(c: Connection, get: (id?: string) => Node | undefined) {
  if (!c.source || !c.target || !c.targetHandle) return false;
  const s = get(c.source);
  const t = get(c.target);
  if (!s || !t) return false;
  const role = (s.data as NodeData)?.role;
  if (t.type !== "baseNode") return false;
  if (role === "ability" && c.targetHandle === "h_ability") return true;
  if (role === "rule" && c.targetHandle === "h_rule") return true;
  if (role === "knowledge" && c.targetHandle === "h_knowledge") return true;
  return false;
}

/* ================== 从元数据构建初始图 ================== */
function buildGraphFromMeta(meta: BrainCellMeta) {
  const nodes: Node[] = [
    {
      id: "base",
      type: "baseNode",
      position: { x: 400, y: 280 },
      data: {
        label: meta.name || "BrainCell",
        kind: meta.kind || "BrainCell",
        icon: "base",
        role: "base",
        stats: {
          abilities: meta.abilities?.public?.length || 0,
          rules: meta.rules?.length || 0,
          knowledge: meta.bindings?.knowledge?.length || 0
        }
      }
    }
  ];
  const edges: Edge[] = [];

  // Abilities - 左侧
  const abilityPositions = [
    { x: 150, y: 250 },
    { x: 150, y: 310 },
    { x: 70, y: 215 },
    { x: 70, y: 345 }
  ];

  (meta.abilities?.public || []).forEach((slug, i) => {
    const pos = abilityPositions[i % abilityPositions.length];
    const offset = Math.floor(i / abilityPositions.length) * 100;
    nodes.push(N.ability(`ability.${slug}`, pos.x - offset, pos.y, slug, i % 2 ? "semiRounded" : "ellipse", "ability", "solid"));
    edges.push(mkEdge(`e.ability.${slug}`, `ability.${slug}`, "base", { role: "ability" }));
  });

  // Rules - 底部
  const rulePositions = [
    { x: 360, y: 450 },
    { x: 430, y: 450 },
  ];

  (meta.rules || []).forEach((r, i) => {
    const pos = rulePositions[i % rulePositions.length];
    nodes.push(N.rule(`rule.${r.name}`, pos.x, pos.y, r.name, "diamond", "rule", "soft"));
    edges.push(mkEdge(`e.rule.${r.name}`, `rule.${r.name}`, "base", { role: "rule" }));
  });

  // Knowledge - 顶部
  const knowledgePositions = [
    { x: 360, y: 100 },
    { x: 430, y: 100 },
  ];

  (meta.bindings?.knowledge || []).forEach((k, i) => {
    const pos = knowledgePositions[i % knowledgePositions.length];
    nodes.push(N.knowledge(`kn.${k.name}`, pos.x, pos.y, k.name, "hexagon", "knowledge", "glass"));
    edges.push(mkEdge(`e.kn.${k.name}`, `kn.${k.name}`, "base", { role: "knowledge" }));
  });

  return { nodes, edges };
}

/* ================== 主组件 ================== */
interface MinimalBrainCellInternalViewProps {
  brainCell: BrainCellMeta;
  onBack: () => void;
  onUpdate?: (u: Partial<BrainCellMeta>) => void;
}

export default function MinimalBrainCellInternalView({
  brainCell,
  onBack,
  onUpdate = () => {}
}: MinimalBrainCellInternalViewProps) {
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const initial = useMemo(() => buildGraphFromMeta(brainCell), [brainCell]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState<NodeData | null>(null);

  // 代码面板状态
  const [codePanelOpen, setCodePanelOpen] = useState(false);
  const [codeMode, setCodeMode] = useState<'code' | 'preview'>('code');
  const [code, setCode] = useState('# BrainCell runtime script\nprint("Hello from BrainCell!")');
  const [output, setOutput] = useState<string[]>([]);
  const [fullCodeView, setFullCodeView] = useState(false); // Full code view mode

  const nodeTypes = useMemo(() => ({
    baseNode: TechBaseNode,
    genNode: TechGenNode
  }), []);

  const edgeTypes = useMemo(() => ({
    custom: TechEdge
  }), []);

  // 拖拽处理
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-bc-type");
    const label = e.dataTransfer.getData("text/plain") || type;
    const shape = e.dataTransfer.getData("application/x-bc-shape") as BrainCellShape;
    const icon = e.dataTransfer.getData("application/x-bc-icon") || "settings";
    const material = e.dataTransfer.getData("application/x-bc-material") as Material;

    const rf = rfRef.current;
    if (!rf) return;

    const pos = rf.project({ x: e.clientX, y: e.clientY });
    const id = `${type}.${Date.now()}`;

    let n: Node | null = null;
    if (type === "ability") n = N.ability(id, pos.x - 50, pos.y - 50, label, shape || "circle", icon || "ability", material || "solid");
    if (type === "rule") n = N.rule(id, pos.x - 50, pos.y - 50, label, shape || "diamond", icon || "rule", material || "soft");
    if (type === "knowledge") n = N.knowledge(id, pos.x - 50, pos.y - 50, label, shape || "hexagon", icon || "knowledge", material || "glass");

    if (n) setNodes(ns => ns.concat(n));
  }, [setNodes]);

  // 连接处理
  const onConnect = useCallback((c: Connection) => {
    const get = (id?: string) => nodes.find(n => n.id === id);
    if (!allowed(c, get)) return;

    const s = get(c.source);
    if (!s) return;

    const sd = s.data as NodeData;
    const edgeData = { role: sd.role, source: sd.source };

    setEdges(edges => {
      const existing = edges.find(e => e.source === c.source && e.target === c.target);
      if (existing) {
        return edges.map(e =>
          e.id === existing.id
            ? { ...e, data: edgeData, animated: sd.source?.type === "easynet" }
            : e
        );
      }
      return [...edges, mkEdge(`e.${c.source}.${c.target}`, c.source!, c.target!, edgeData)];
    });

    // 更新元数据
    if (sd.role === "ability") {
      const slug = (sd.abilitySlug || sd.label || "ability").toString().trim().toLowerCase().replace(/\s+/g, "_");
      const group = sd.abilityGroup || "OTHER";
      const pub = Array.from(new Set([...(brainCell.abilities?.public || []), slug]));
      const byGroup = { ...(brainCell.abilities?.byGroup || {}) } as Record<string, string[]>;
      byGroup[group] = Array.from(new Set([...(byGroup[group] || []), slug]));
      onUpdate({ abilities: { public: pub, byGroup: byGroup as any } });
    }
  }, [nodes, edges, setEdges, brainCell, onUpdate]);

  // 节点选择
  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedId(node.id);
    if (node.type === "genNode") {
      setNodeForm(node.data as NodeData);
      setDrawerOpen(true);
    }
  }, []);

  // 导出功能
  const exportGraph = useCallback(() => {
    const payload = { version: "2.0.0", nodes, edges, meta: brainCell };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `braincell-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, brainCell]);

  // 更新节点设置
  const updateNodeSettings = useCallback(() => {
    if (!selectedId || !nodeForm) return;

    setNodes(ns => ns.map(n =>
      n.id === selectedId
        ? { ...n, data: { ...(n.data as NodeData), ...nodeForm } }
        : n
    ));

    setEdges(es => es.map(e => {
      if (e.source === selectedId) {
        return {
          ...e,
          data: { ...e.data, source: nodeForm.source },
          animated: nodeForm.source?.type === "easynet"
        };
      }
      return e;
    }));

    setDrawerOpen(false);
  }, [selectedId, nodeForm, setNodes, setEdges]);

  // 运行代码
  const runCode = useCallback(() => {
    try {
      // 模拟代码执行
      setOutput(prev => [...prev, `> Executing...`, code, `✓ Execution completed`]);
    } catch (error) {
      setOutput(prev => [...prev, `✗ Error: ${error}`]);
    }
  }, [code]);

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="h-12 flex-shrink-0 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={16}/>
            Back
          </button>

          <div className="text-base font-semibold text-gray-900">
            {brainCell.name || "BrainCell"}
          </div>
          <div className={`px-2 py-0.5 text-xs rounded font-mono font-semibold ${
            brainCell.runtime?.status === "active"
              ? "bg-green-50 text-green-700 border border-green-200"
              : brainCell.runtime?.status === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-gray-100 text-gray-600 border border-gray-200"
          }`}>
            {brainCell.runtime?.status || "idle"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCodePanelOpen(!codePanelOpen)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              codePanelOpen
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Code Panel
          </button>

          <button
            onClick={exportGraph}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* Sidebar - 全代码预览时隐藏 */}
        {!fullCodeView && (
          <div className="w-[240px] flex-shrink-0 bg-white rounded-lg border border-gray-200 p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Components
          </h3>

          <div className="space-y-2 mb-3">
            {[
              { type: "ability", icon: "ability", label: "Ability", color: Theme.colors.primary, shape: "circle", material: "solid" },
              { type: "rule", icon: "rule", label: "Rule", color: Theme.colors.warning, shape: "diamond", material: "soft" },
              { type: "knowledge", icon: "knowledge", label: "Knowledge", color: Theme.colors.success, shape: "hexagon", material: "glass" }
            ].map(item => (
              <div
                key={item.type}
                draggable
                onDragStart={e => {
                  e.dataTransfer.setData("application/x-bc-type", item.type);
                  e.dataTransfer.setData("application/x-bc-shape", item.shape);
                  e.dataTransfer.setData("application/x-bc-icon", item.icon);
                  e.dataTransfer.setData("application/x-bc-material", item.material);
                  e.dataTransfer.setData("text/plain", item.label);
                }}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg cursor-grab hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Drag to add
                </div>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
            <div className="mb-1 font-semibold">
              Guide
            </div>
            <div className="font-mono" style={{ fontSize: 10 }}>
              • Drag components<br/>
              • Click to config<br/>
              • Connect to ports
            </div>
          </div>
          </div>
        )}

        {/* Canvas */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <ReactFlow
            onInit={inst => (rfRef.current = inst)}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={20} size={0.5} color="#e5e7eb" style={{ backgroundColor: '#ffffff' }}/>
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              className="!bg-white !border !border-gray-200 !rounded-lg"
              nodeStrokeWidth={1}
              nodeColor={node => {
                if (node.type === "baseNode") return Theme.colors.text;
                const data = node.data as NodeData;
                const colors = {
                  ability: Theme.colors.primary,
                  rule: Theme.colors.warning,
                  knowledge: Theme.colors.success
                };
                return colors[data.role as Role] || Theme.colors.textMuted;
              }}
            />
            <Controls className="!bg-white !border !border-gray-200 !rounded-lg" showInteractive={false}/>
          </ReactFlow>
        </div>

        {/* Code Panel - Right Side */}
        {codePanelOpen && (
          <div className={`${fullCodeView ? 'w-[50%]' : 'w-[480px]'} flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col transition-all`}>
            {/* Code Panel Header */}
            <div className="h-10 flex-shrink-0 border-b border-gray-200 px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">BrainCell Code</span>
                {fullCodeView && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                    Full Code View
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setCodeMode('code')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      codeMode === 'code'
                        ? 'bg-white text-gray-900 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Code
                  </button>
                  <button
                    onClick={() => setCodeMode('preview')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      codeMode === 'preview'
                        ? 'bg-white text-gray-900 shadow-sm font-medium'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Preview
                  </button>
                </div>

                {/* Run Button */}
                <button
                  onClick={runCode}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Run
                </button>

                {/* Full Code View Toggle */}
                <button
                  onClick={() => setFullCodeView(!fullCodeView)}
                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  {fullCodeView ? "Exit Fullscreen" : "Fullscreen"}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setCodePanelOpen(false)}
                  className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Code Panel Content */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Code Editor */}
              {codeMode === 'code' && (
                <div className="flex-1 overflow-hidden">
                  <CodeMirror
                    value={code}
                    height="100%"
                    extensions={[python()]}
                    onChange={(value) => setCode(value)}
                    theme={dracula}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLineGutter: true,
                      highlightSpecialChars: true,
                      foldGutter: true,
                      drawSelection: true,
                      dropCursor: true,
                      allowMultipleSelections: true,
                      indentOnInput: true,
                      syntaxHighlighting: true,
                      bracketMatching: true,
                      closeBrackets: true,
                      autocompletion: true,
                      rectangularSelection: true,
                      crosshairCursor: true,
                      highlightActiveLine: true,
                      highlightSelectionMatches: true,
                      closeBracketsKeymap: true,
                      defaultKeymap: true,
                      searchKeymap: true,
                      historyKeymap: true,
                      foldKeymap: true,
                      completionKeymap: true,
                      lintKeymap: true,
                    }}
                  />
                </div>
              )}

              {/* Preview/Output */}
              {codeMode === 'preview' && (
                <div className="flex-1 overflow-auto p-3 bg-gray-50 font-mono text-xs">
                  {output.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center text-sm">
                        Click "Run" to see output
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {output.map((line, i) => (
                        <div key={i} className="text-gray-700">
                          {line}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {drawerOpen && nodeForm && (
        <div className="fixed top-0 right-0 bottom-0 w-[340px] bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col animate-slide-in">
          <div className="h-12 px-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Settings size={16}/>
              Configuration
            </h3>
            <button onClick={() => setDrawerOpen(false)} className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 text-xl leading-none">
              ×
            </button>
          </div>

          <div className="flex-1 p-3 overflow-auto space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={nodeForm.label}
                onChange={e => setNodeForm({ ...nodeForm, label: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Icon</label>
              <select
                value={nodeForm.icon}
                onChange={e => setNodeForm({ ...nodeForm, icon: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              >
                {Object.keys(IconMap).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Material</label>
              <div className="grid grid-cols-3 gap-1.5">
                {["solid", "soft", "glass", "neon", "gradient"].map(m => (
                  <button
                    key={m}
                    onClick={() => setNodeForm({ ...nodeForm, material: m as Material })}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      nodeForm.material === m
                        ? "bg-blue-600 text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Shape</label>
              <select
                value={nodeForm.shape}
                onChange={e => setNodeForm({ ...nodeForm, shape: e.target.value as BrainCellShape })}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
              >
                {["circle", "ellipse", "diamond", "rounded", "semiRounded", "hexagon"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {nodeForm.role === "ability" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Group</label>
                  <select
                    value={nodeForm.abilityGroup || "OTHER"}
                    onChange={e => setNodeForm({ ...nodeForm, abilityGroup: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors"
                  >
                    {["WRITE", "COMMUNICATION", "PLANNING", "OTHER"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={nodeForm.abilitySlug || ""}
                    onChange={e => setNodeForm({ ...nodeForm, abilitySlug: e.target.value })}
                    placeholder="e.g: add_text"
                    className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 transition-colors font-mono"
                  />
                </div>
              </>
            )}

            <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                <Link size={12}/>
                EasyNet Connection
              </h4>

              <div className="space-y-2">
                <select
                  value={nodeForm.source?.type || "none"}
                  onChange={e => setNodeForm({
                    ...nodeForm,
                    source: { ...nodeForm.source, type: e.target.value as SourceType }
                  })}
                  className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors bg-white"
                >
                  <option value="none">None</option>
                  <option value="easynet">EasyNet</option>
                </select>

                {nodeForm.source?.type === "easynet" && (
                  <>
                    <input
                      type="text"
                      placeholder="Namespace"
                      value={nodeForm.source?.namespace || "/graph"}
                      onChange={e => setNodeForm({ ...nodeForm, source: { ...nodeForm.source!, namespace: e.target.value }})}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors bg-white font-mono"
                    />
                    <input
                      type="text"
                      placeholder="Channel"
                      value={nodeForm.source?.channel || "data"}
                      onChange={e => setNodeForm({ ...nodeForm, source: { ...nodeForm.source!, channel: e.target.value }})}
                      className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors bg-white font-mono"
                    />
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map(q => (
                        <button
                          key={q}
                          onClick={() => setNodeForm({ ...nodeForm, source: { ...nodeForm.source!, qos: q }})}
                          className={`flex-1 px-2 py-1 text-xs font-mono font-semibold rounded transition-colors ${
                            nodeForm.source?.qos === q
                              ? "bg-green-600 text-white"
                              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          QoS {q}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="h-12 px-3 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(false)}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={updateNodeSettings}
              className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slide-in {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .animate-slide-in {
            animation: slide-in 0.15s ease-out;
          }
        `}
      </style>
    </div>
  );
}
