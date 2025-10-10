import React from 'react';
import { Handle, Position } from "reactflow";

export interface SemiRoundedNodeProps {
  data: {
    label: string;
    icon?: string;
    material?: "solid" | "soft" | "glass" | "neon" | "gradient";
    role?: string;
    source?: { type: string; namespace?: string; channel?: string; qos?: number };
  };
  selected?: boolean;
  iconMap?: Record<string, React.ReactNode>;
  theme?: any;
  getMaterialStyle?: (material: string, base?: React.CSSProperties) => React.CSSProperties;
}

export function SemiRoundedNode({
  data,
  selected = false,
  iconMap = {},
  theme,
  getMaterialStyle
}: SemiRoundedNodeProps) {
  const material = data.material || "solid";

  let style: React.CSSProperties = {
    minWidth: 240,
    height: 76,
    borderRadius: "16px 999px 999px 16px",
    padding: "0 24px"
  };

  if (getMaterialStyle) {
    style = getMaterialStyle(material, style);
  } else {
    // Fallback default styling
    style = {
      ...style,
      background: "#ffffff",
      border: "2px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      color: "#0f172a"
    };
  }

  // Selection styling
  if (selected) {
    const primaryColor = theme?.colors?.primary || "#3b82f6";
    const glowShadow = theme?.shadows?.glow || "0 0 20px rgba(59, 130, 246, 0.15)";

    style = {
      ...style,
      border: `3px solid ${primaryColor}`,
      boxShadow: `${style.boxShadow}, ${glowShadow}`,
      transform: "scale(1.05)"
    };
  }

  const roleColors = {
    ability: theme?.colors?.primary || "#3b82f6",
    rule: theme?.colors?.warning || "#f59e0b",
    knowledge: theme?.colors?.success || "#10b981",
    export: theme?.colors?.info || "#06b6d4"
  };

  const iconColor = roleColors[data.role as keyof typeof roleColors] || (theme?.colors?.textSub || "#64748b");

  return (
    <div style={{
      ...style,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      cursor: "pointer"
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        gap: 4
      }}>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          color: iconColor,
          fontSize: 18
        }}>
          {iconMap[data.icon || (data.role as string) || "settings"] || "⚙️"}
        </span>
        <span style={{
          fontWeight: 600,
          fontSize: 13,
          textAlign: "center",
          lineHeight: 1.2
        }}>
          {data.label}
        </span>
        {data.source?.type === "easynet" && (
          <span style={{
            fontSize: 10,
            color: theme?.colors?.success || "#10b981",
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginTop: 2
          }}>
            🔗 Connected
          </span>
        )}
      </div>

      {/* Connection handles */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: iconColor,
          width: 8,
          height: 8,
          border: "2px solid #ffffff"
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: iconColor,
          width: 8,
          height: 8,
          border: "2px solid #ffffff"
        }}
      />
    </div>
  );
}

export default SemiRoundedNode;