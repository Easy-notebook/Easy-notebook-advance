import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
  useEdgesState, useNodesState,
  Connection, Edge, Node, MarkerType,
  Handle, Position, ReactFlowInstance,
  getBezierPath, EdgeLabelRenderer, BaseEdge
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ArrowLeft, Download, Shield, BookOpen, Share2, Database,
  MessageSquare, Wand2, Settings, BookMarked, Cpu, Zap,
  Link, Info, Layers, GitBranch, Activity,
  Globe, Server, Cloud, Lock, Unlock, Eye, Plus
} from "lucide-react";
import {
  BaseNode,
  SimplifiedBaseNode,
  GenNode,
  SimplifiedGenNode,
  BrainCellShape,
  Material,
  BrainCellNodeData
} from '../shapes/briancell';

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

/* ================== 增强主题系统 ================== */
const Theme = {
  colors: {
    bg: "#ffffff",
    bgAlt: "#f8fafc",
    grid: "#e2e8f0",
    border: "#cbd5e1",
    borderStrong: "#94a3b8",
    text: "#0f172a",
    textSub: "#64748b",
    textMuted: "#94a3b8",
    dark: "#0f172a",
    darkStroke: "#1e293b",
    primary: "#3b82f6",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#06b6d4"
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
    glow: "0 0 20px rgba(59, 130, 246, 0.15)"
  },
  gradients: {
    primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    success: "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)",
    warm: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
  }
};

/* ================== 材质系统增强 ================== */
type Material = "solid" | "soft" | "glass" | "neon" | "gradient";

const getMaterialStyle = (m: Material, base?: React.CSSProperties): React.CSSProperties => {
  const common: React.CSSProperties = { 
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    color: Theme.colors.text,
    ...base 
  };
  
  switch(m) {
    case "solid": 
      return {
        background: Theme.colors.bg,
        border: `2px solid ${Theme.colors.border}`,
        boxShadow: Theme.shadows.md,
        ...common
      };
    case "soft":
      return {
        background: Theme.colors.bgAlt,
        border: `2px solid ${Theme.colors.border}`,
        boxShadow: `inset 0 2px 4px 0 rgb(0 0 0 / 0.06), ${Theme.shadows.sm}`,
        ...common
      };
    case "glass":
      return {
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px) saturate(180%)",
        border: `2px solid rgba(255, 255, 255, 0.2)`,
        boxShadow: `${Theme.shadows.lg}, inset 0 1px 1px rgba(255, 255, 255, 0.4)`,
        ...common
      };
    case "neon":
      return {
        background: Theme.colors.dark,
        border: `2px solid ${Theme.colors.primary}`,
        boxShadow: `0 0 20px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)`,
        color: "#ffffff",
        ...common
      };
    case "gradient":
      return {
        background: Theme.gradients.primary,
        border: "2px solid transparent",
        boxShadow: Theme.shadows.lg,
        color: "#ffffff",
        ...common
      };
    default:
      return common;
  }
};

/* ================== 扩展图标库 ================== */
const IconMap: Record<string, React.ReactNode> = {
  ability: <Share2 size={16}/>,
  vector: <Database size={16}/>,
  chat: <MessageSquare size={16}/>,
  rule: <Shield size={16}/>,
  knowledge: <BookOpen size={16}/>,
  base: <Cpu size={16}/>,
  wand: <Wand2 size={16}/>,
  settings: <Settings size={16}/>,
  book: <BookMarked size={16}/>,
  zap: <Zap size={16}/>,
  link: <Link size={14}/>,
  info: <Info size={16}/>,
  layers: <Layers size={16}/>,
  branch: <GitBranch size={16}/>,
  activity: <Activity size={16}/>,
  globe: <Globe size={16}/>,
  server: <Server size={16}/>,
  cloud: <Cloud size={16}/>,
  lock: <Lock size={16}/>,
  unlock: <Unlock size={16}/>,
  eye: <Eye size={16}/>
};

/* ================== 自定义边渲染器 - 增强链接显示 ================== */
function CustomEdge({ 
  id, sourceX, sourceY, targetX, targetY, 
  sourcePosition, targetPosition, style = {}, 
  markerEnd, label, selected, data 
}: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const isEasyNet = data?.source?.type === "easynet";
  const linkInfo = isEasyNet 
    ? `${data.source.namespace || ""}/${data.source.channel || ""} • QoS:${data.source.qos ?? 1}`
    : label;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? Theme.colors.primary : (isEasyNet ? Theme.colors.success : Theme.colors.borderStrong),
          filter: selected ? `drop-shadow(${Theme.shadows.glow})` : undefined,
          transition: "all 0.3s ease"
        }}
      />
      {linkInfo && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 11,
              fontWeight: 600,
              pointerEvents: 'all',
            }}
          >
            <div style={{
              background: isEasyNet ? Theme.colors.success : Theme.colors.bg,
              color: isEasyNet ? "#ffffff" : Theme.colors.text,
              padding: "4px 8px",
              borderRadius: 6,
              border: isEasyNet ? "none" : `1px solid ${Theme.colors.border}`,
              boxShadow: Theme.shadows.md,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}>
              {isEasyNet && <LinkIcon size={10}/>}
              {linkInfo}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/* ================== Base Node Wrapper ================== */
function BaseNodeWrapper({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <SimplifiedBaseNode
      data={data}
      selected={selected}
      iconMap={IconMap}
      theme={Theme}
    />
  );
}

/* ================== Updated Type Definitions ================== */
type Role = "ability" | "rule" | "knowledge";
type SourceType = "none" | "easynet";

interface NodeData extends BrainCellNodeData {
  role: Role | "base";
  shape?: BrainCellShape;
  abilityGroup?: "WRITE" | "COMMUNICATION" | "PLANNING" | "OTHER";
  abilitySlug?: string;
  source?: { type: SourceType; namespace?: string; channel?: string; qos?: number };
  description?: string;
}

/* ================== GenNode Wrapper ================== */
function GenNodeWrapper({ data, selected }: { data: NodeData; selected?: boolean }) {
  return (
    <SimplifiedGenNode
      data={data}
      selected={selected}
      iconMap={IconMap}
      theme={Theme}
      getMaterialStyle={getMaterialStyle}
    />
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

/* ================== 边创建和管理 ================== */
const mkEdge = (id: string, source: string, target: string, data?: any): Edge => ({
  id,
  source,
  target,
  targetHandle: data?.role === "ability" ? "h_ability" :
               data?.role === "rule" ? "h_rule" :
               data?.role === "knowledge" ? "h_knowledge" : undefined,
  type: "custom",
  style: { stroke: Theme.colors.borderStrong, strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: Theme.colors.borderStrong },
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
      position: { x: 520, y: 300 },
      data: {
        label: meta.name || "BrainCell",
        kind: meta.kind || "BrainCell",
        icon: "base",
        stats: {
          abilities: meta.abilities?.public?.length || 0,
          rules: meta.rules?.length || 0,
          knowledge: meta.bindings?.knowledge?.length || 0
        }
      }
    }
  ];
  const edges: Edge[] = [];

  // Ability节点位置 - 在BrainCell左侧
  const abilityPositions = [
    { x: 200, y: 280 },
    { x: 200, y: 320 },
    { x: 200, y: 360 },
    { x: 120, y: 240 },
    { x: 120, y: 400 }
  ];

  (meta.abilities?.public || []).forEach((slug, i) => {
    const pos = abilityPositions[i % abilityPositions.length];
    const offset = Math.floor(i / abilityPositions.length) * 100;
    nodes.push(N.ability(`ability.${slug}`, pos.x - offset, pos.y, slug, i % 2 ? "semiRounded" : "ellipse", "ability", "solid"));
    edges.push(mkEdge(`e.ability.${slug}`, `ability.${slug}`, "base", { role: "ability" }));
  });

  const rulePositions = [
    { x: 500, y: 480 },
    { x: 540, y: 480 },
    { x: 520, y: 520 }
  ];

  (meta.rules || []).forEach((r, i) => {
    const pos = rulePositions[i % rulePositions.length];
    nodes.push(N.rule(`rule.${r.name}`, pos.x, pos.y, r.name, "diamond", "rule", "soft"));
    edges.push(mkEdge(`e.rule.${r.name}`, `rule.${r.name}`, "base", { role: "rule" }));
  });

  const knowledgePositions = [
    { x: 480, y: 120 },
    { x: 520, y: 120 },
    { x: 560, y: 120 },
    { x: 440, y: 80 },
    { x: 600, y: 80 }
  ];

  (meta.bindings?.knowledge || []).forEach((k, i) => {
    const pos = knowledgePositions[i % knowledgePositions.length];
    const offset = Math.floor(i / knowledgePositions.length) * 100;
    nodes.push(N.knowledge(`kn.${k.name}`, pos.x + offset, pos.y, k.name, "circle", "knowledge", "glass"));
    edges.push(mkEdge(`e.kn.${k.name}`, `kn.${k.name}`, "base", { role: "knowledge" }));
  });

  // Remove export node - not in original design

  return { nodes, edges };
}

/* ================== 主组件 ================== */
export default function BraincellStudioPro({
  brainCell = {
    id: "demo",
    name: "Demo Braincell",
    kind: "Braincell",
    runtime: { status: "active", logging: true },
    abilities: { 
      public: ["text_analysis", "data_processing", "api_integration"],
      byGroup: {
        WRITE: ["text_analysis"],
        COMMUNICATION: ["api_integration"],
        PLANNING: ["data_processing"],
        OTHER: []
      }
    },
    rules: [
      { name: "SecurityRule", spec: { priority: 1 } },
      { name: "ValidationRule", spec: { priority: 2 } }
    ],
    bindings: {
      knowledge: [
        { kind: "vector", name: "Documentation" },
        { kind: "db", name: "UserData" }
      ]
    }
  },
  onBack = () => console.log("Back"),
  onUpdate = (update: Partial<BrainCellMeta>) => console.log("Update:", update)
}: { 
  brainCell?: BrainCellMeta; 
  onBack?: () => void; 
  onUpdate?: (u: Partial<BrainCellMeta>) => void; 
}) {
  const rfRef = useRef<ReactFlowInstance | null>(null);

  const initial = useMemo(() => buildGraphFromMeta(brainCell), [brainCell]);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState<NodeData | null>(null);

  const nodeTypes = useMemo(() => ({
    baseNode: BaseNodeWrapper,
    genNode: GenNodeWrapper
  }), []);

  const edgeTypes = useMemo(() => ({
    custom: CustomEdge
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
    if (type === "ability") n = N.ability(id, pos.x - 60, pos.y - 60, label, shape || "circle", icon || "ability", material || "solid");
    if (type === "rule") n = N.rule(id, pos.x - 60, pos.y - 60, label, shape || "diamond", icon || "rule", material || "soft");
    if (type === "knowledge") n = N.knowledge(id, pos.x - 60, pos.y - 60, label, shape || "circle", icon || "knowledge", material || "glass");

    if (n) setNodes(ns => ns.concat(n));
  }, [setNodes]);

  // 连接处理
  const onConnect = useCallback((c: Connection) => {
    const get = (id?: string) => nodes.find(n => n.id === id);
    if (!allowed(c, get)) return;
    
    const s = get(c.source);
    if (!s) return;
    
    const sd = s.data as NodeData;
    const edgeData = {
      role: sd.role,
      source: sd.source
    };

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
    const payload = {
      version: "2.0.0",
      nodes,
      edges,
      meta: brainCell
    };
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
    
    // 更新相关边的数据
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

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: Theme.colors.bgAlt }}>
      {/* 顶部工具栏 */}
      <div style={{
        background: Theme.colors.bg,
        borderBottom: `1px solid ${Theme.colors.border}`,
        padding: "12px 24px",
        boxShadow: Theme.shadows.sm
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: Theme.colors.bg,
                border: `1px solid ${Theme.colors.border}`,
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                color: Theme.colors.text,
                transition: "all 0.2s"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = Theme.colors.bgAlt;
                e.currentTarget.style.borderColor = Theme.colors.borderStrong;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = Theme.colors.bg;
                e.currentTarget.style.borderColor = Theme.colors.border;
              }}
            >
              <ArrowLeft size={18}/>
              返回
            </button>
            
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 18, fontWeight: 700, color: Theme.colors.text }}>
                {brainCell.name || "BaseBraincell"}
              </span>
              <div style={{
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                color: "#ffffff",
                background: brainCell.runtime?.status === "active" 
                  ? Theme.colors.success 
                  : brainCell.runtime?.status === "error" 
                    ? Theme.colors.error 
                    : Theme.colors.textMuted
              }}>
                {brainCell.runtime?.status || "idle"}
              </div>
            </div>
          </div>

          <button
            onClick={exportGraph}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              background: Theme.colors.primary,
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              color: "#ffffff",
              transition: "all 0.2s",
              boxShadow: Theme.shadows.md
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = Theme.shadows.lg;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = Theme.shadows.md;
            }}
          >
            <Download size={18}/>
            导出
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* 组件面板 */}
        <div style={{
          width: 280,
          background: Theme.colors.bg,
          borderRadius: 12,
          border: `1px solid ${Theme.colors.border}`,
          padding: 20,
          boxShadow: Theme.shadows.md,
          overflow: "auto"
        }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 700,
            color: Theme.colors.text,
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8
          }}>
            <Layers size={20}/>
            组件面板
          </h3>

          <div style={{ marginBottom: 24 }}>
            <h4 style={{ 
              fontSize: 12,
              fontWeight: 600,
              color: Theme.colors.textSub,
              marginBottom: 12,
              textTransform: "uppercase"
            }}>
              节点类型
            </h4>
            
            {[
              { type: "ability", icon: "ability", label: "Ability", color: Theme.colors.primary, shape: "circle", material: "solid" },
              { type: "rule", icon: "rule", label: "Rule", color: Theme.colors.warning, shape: "diamond", material: "soft" },
              { type: "knowledge", icon: "knowledge", label: "Knowledge", color: Theme.colors.success, shape: "circle", material: "glass" }
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  marginBottom: 8,
                  background: Theme.colors.bg,
                  border: `2px solid ${Theme.colors.border}`,
                  borderRadius: 8,
                  cursor: "grab",
                  transition: "all 0.2s"
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = Theme.colors.bgAlt;
                  e.currentTarget.style.borderColor = item.color;
                  e.currentTarget.style.transform = "translateX(4px)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = Theme.colors.bg;
                  e.currentTarget.style.borderColor = Theme.colors.border;
                  e.currentTarget.style.transform = "translateX(0)";
                }}
              >
                <span style={{ color: item.color, fontSize: 20 }}>
                  {IconMap[item.icon]}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: Theme.colors.text }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 11, color: Theme.colors.textSub }}>
                    拖拽到画布
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: 16,
            background: Theme.colors.bgAlt,
            borderRadius: 8,
            fontSize: 12,
            color: Theme.colors.textSub,
            lineHeight: 1.6
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Info size={14}/>
              <strong>使用提示</strong>
            </div>
            • 拖拽节点到画布创建<br/>
            • 点击节点进行配置<br/>
            • 连接到中心节点对应端口<br/>
            • EasyNet 连接会显示链接信息
          </div>
        </div>

        {/* 画布区域 */}
        <div style={{
          flex: 1,
          background: Theme.colors.bg,
          borderRadius: 12,
          border: `1px solid ${Theme.colors.border}`,
          boxShadow: Theme.shadows.md,
          overflow: "hidden",
          position: "relative"
        }}>
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
            <Background 
              variant="dots" 
              gap={24} 
              size={1.5} 
              color={Theme.colors.grid}
            />
            <MiniMap 
              pannable 
              zoomable 
              position="bottom-right"
              style={{
                background: Theme.colors.bg,
                border: `1px solid ${Theme.colors.border}`,
                borderRadius: 8,
                boxShadow: Theme.shadows.md
              }}
              nodeColor={node => {
                if (node.type === "baseNode") return Theme.colors.dark;
                const data = node.data as NodeData;
                const colors = {
                  ability: Theme.colors.primary,
                  rule: Theme.colors.warning,
                  knowledge: Theme.colors.success
                };
                return colors[data.role as Role] || Theme.colors.textMuted;
              }}
            />
            <Controls
              style={{
                background: Theme.colors.bg,
                border: `1px solid ${Theme.colors.border}`,
                borderRadius: 8,
                boxShadow: Theme.shadows.md
              }}
              showInteractive={false}
            />
          </ReactFlow>
        </div>
      </div>

      {/* 节点设置面板 */}
      {drawerOpen && nodeForm && (
        <div style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: Theme.colors.bg,
          borderLeft: `1px solid ${Theme.colors.border}`,
          boxShadow: Theme.shadows.xl,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.3s ease"
        }}>
          <div style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${Theme.colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 700,
              color: Theme.colors.text,
              display: "flex",
              alignItems: "center",
              gap: 8
            }}>
              <Settings size={20}/>
              节点设置
            </h3>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 8,
                color: Theme.colors.textSub
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: 24,
            overflow: "auto"
          }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: Theme.colors.text,
                marginBottom: 8
              }}>
                节点名称
              </label>
              <input
                type="text"
                value={nodeForm.label}
                onChange={e => setNodeForm({ ...nodeForm, label: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${Theme.colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  transition: "border-color 0.2s"
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: Theme.colors.text,
                marginBottom: 8
              }}>
                图标
              </label>
              <select
                value={nodeForm.icon}
                onChange={e => setNodeForm({ ...nodeForm, icon: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${Theme.colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {Object.keys(IconMap).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: Theme.colors.text,
                marginBottom: 8
              }}>
                材质
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {["solid", "soft", "glass", "neon", "gradient"].map(m => (
                  <button
                    key={m}
                    onClick={() => setNodeForm({ ...nodeForm, material: m as Material })}
                    style={{
                      flex: 1,
                      padding: 8,
                      border: `2px solid ${nodeForm.material === m ? Theme.colors.primary : Theme.colors.border}`,
                      borderRadius: 6,
                      background: nodeForm.material === m ? Theme.colors.primary : Theme.colors.bg,
                      color: nodeForm.material === m ? "#ffffff" : Theme.colors.text,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: Theme.colors.text,
                marginBottom: 8
              }}>
                形状
              </label>
              <select
                value={nodeForm.shape}
                onChange={e => setNodeForm({ ...nodeForm, shape: e.target.value as Shape })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${Theme.colors.border}`,
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                {["circle", "ellipse", "diamond", "rounded", "semiRounded", "hexagon"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {nodeForm.role === "ability" && (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: Theme.colors.text,
                    marginBottom: 8
                  }}>
                    Ability 分组
                  </label>
                  <select
                    value={nodeForm.abilityGroup || "OTHER"}
                    onChange={e => setNodeForm({ ...nodeForm, abilityGroup: e.target.value as any })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${Theme.colors.border}`,
                      borderRadius: 6,
                      fontSize: 14,
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    {["WRITE", "COMMUNICATION", "PLANNING", "OTHER"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: Theme.colors.text,
                    marginBottom: 8
                  }}>
                    Ability 标识
                  </label>
                  <input
                    type="text"
                    value={nodeForm.abilitySlug || ""}
                    onChange={e => setNodeForm({ ...nodeForm, abilitySlug: e.target.value })}
                    placeholder="如: add_text"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: `1px solid ${Theme.colors.border}`,
                      borderRadius: 6,
                      fontSize: 14,
                      outline: "none"
                    }}
                  />
                </div>
              </>
            )}

            <div style={{
              padding: 16,
              background: Theme.colors.bgAlt,
              borderRadius: 8,
              marginBottom: 20
            }}>
              <h4 style={{
                fontSize: 14,
                fontWeight: 600,
                color: Theme.colors.text,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6
              }}>
                <Link size={16}/>
                EasyNet 连接
              </h4>

              <div style={{ marginBottom: 12 }}>
                <label style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 500,
                  color: Theme.colors.textSub,
                  marginBottom: 6
                }}>
                  连接类型
                </label>
                <select
                  value={nodeForm.source?.type || "none"}
                  onChange={e => setNodeForm({
                    ...nodeForm,
                    source: {
                      ...nodeForm.source,
                      type: e.target.value as SourceType
                    }
                  })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: `1px solid ${Theme.colors.border}`,
                    borderRadius: 6,
                    fontSize: 13,
                    outline: "none",
                    cursor: "pointer",
                    background: Theme.colors.bg
                  }}
                >
                  <option value="none">无连接</option>
                  <option value="easynet">EasyNet</option>
                </select>
              </div>

              {nodeForm.source?.type === "easynet" && (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      color: Theme.colors.textSub,
                      marginBottom: 6
                    }}>
                      Namespace
                    </label>
                    <input
                      type="text"
                      value={nodeForm.source?.namespace || "/graph"}
                      onChange={e => setNodeForm({
                        ...nodeForm,
                        source: {
                          ...nodeForm.source!,
                          namespace: e.target.value
                        }
                      })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: `1px solid ${Theme.colors.border}`,
                        borderRadius: 6,
                        fontSize: 13,
                        outline: "none",
                        background: Theme.colors.bg
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      color: Theme.colors.textSub,
                      marginBottom: 6
                    }}>
                      Channel
                    </label>
                    <input
                      type="text"
                      value={nodeForm.source?.channel || "data"}
                      onChange={e => setNodeForm({
                        ...nodeForm,
                        source: {
                          ...nodeForm.source!,
                          channel: e.target.value
                        }
                      })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        border: `1px solid ${Theme.colors.border}`,
                        borderRadius: 6,
                        fontSize: 13,
                        outline: "none",
                        background: Theme.colors.bg
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 500,
                      color: Theme.colors.textSub,
                      marginBottom: 6
                    }}>
                      QoS 级别
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[0, 1, 2].map(q => (
                        <button
                          key={q}
                          onClick={() => setNodeForm({
                            ...nodeForm,
                            source: {
                              ...nodeForm.source!,
                              qos: q
                            }
                          })}
                          style={{
                            flex: 1,
                            padding: 8,
                            border: `2px solid ${nodeForm.source?.qos === q ? Theme.colors.success : Theme.colors.border}`,
                            borderRadius: 6,
                            background: nodeForm.source?.qos === q ? Theme.colors.success : Theme.colors.bg,
                            color: nodeForm.source?.qos === q ? "#ffffff" : Theme.colors.text,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    padding: 12,
                    background: Theme.colors.bg,
                    borderRadius: 6,
                    fontSize: 12,
                    color: Theme.colors.success,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <Activity size={14}/>
                    连接信息将显示在连线上
                  </div>
                </>
              )}
            </div>
          </div>

          <div style={{
            padding: 20,
            borderTop: `1px solid ${Theme.colors.border}`,
            display: "flex",
            gap: 12
          }}>
            <button
              onClick={() => setDrawerOpen(false)}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: Theme.colors.bg,
                border: `1px solid ${Theme.colors.border}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: Theme.colors.text,
                cursor: "pointer"
              }}
            >
              取消
            </button>
            <button
              onClick={updateNodeSettings}
              style={{
                flex: 1,
                padding: "12px 20px",
                background: Theme.colors.primary,
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: "#ffffff",
                cursor: "pointer",
                boxShadow: Theme.shadows.md
              }}
            >
              应用设置
            </button>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}
      </style>
    </div>
  );
}