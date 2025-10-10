import React from 'react';
import { Handle, Position } from "reactflow";

export interface BaseNodeProps {
  data: {
    label: string;
    kind?: string;
    icon?: string;
    stats?: {
      abilities: number;
      rules: number;
      knowledge: number;
    };
  };
  selected?: boolean;
  iconMap?: Record<string, React.ReactNode>;
  theme?: any;
}

export function BaseNode({
  data,
  selected = false,
  iconMap = {},
  theme
}: BaseNodeProps) {
  const pulseAnimation = selected ? {
    animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
  } : {};

  const darkColor = theme?.colors?.dark || "#0f172a";
  const darkStroke = theme?.colors?.darkStroke || "#1e293b";
  const primaryColor = theme?.colors?.primary || "#3b82f6";

  return (
    <div style={{
      width: 260,
      height: 260,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${darkColor} 0%, ${darkStroke} 100%)`,
      border: `3px solid ${selected ? primaryColor : darkStroke}`,
      color: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      fontWeight: 700,
      boxShadow: `${theme?.shadows?.xl || "0 20px 25px -5px rgb(0 0 0 / 0.1)"}, 0 0 40px rgba(0, 0, 0, 0.2)`,
      transition: "all 0.3s ease",
      ...pulseAnimation
    }}>
      {/* Center content */}
      <div style={{ textAlign: "center", lineHeight: 1.4, zIndex: 2 }}>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 8 }}>
          {data.kind || "Braincell"}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
          <span style={{ display: "inline-flex", alignItems: "center", fontSize: 20 }}>
            {iconMap[data.icon || "base"] || "🧠"}
          </span>
          <div style={{ fontSize: 18 }}>{data.label}</div>
        </div>
        <div style={{
          marginTop: 12,
          fontSize: 11,
          opacity: 0.8,
          display: "flex",
          gap: 12,
          justifyContent: "center"
        }}>
          <span>📊 {data.stats?.abilities || 0}</span>
          <span>🛡️ {data.stats?.rules || 0}</span>
          <span>📚 {data.stats?.knowledge || 0}</span>
        </div>
      </div>

      {/* Animated background effect */}
      <div style={{
        position: "absolute",
        inset: -20,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
        animation: "rotate 20s linear infinite",
        pointerEvents: "none"
      }}/>

      {/* Connection handles with labels */}
      <Handle
        id="h_ability"
        type="target"
        position={Position.Left}
        style={{
          background: primaryColor,
          width: 12,
          height: 12,
          left: -6,
          border: "2px solid #ffffff",
          boxShadow: theme?.shadows?.md || "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}
      />
      <span style={{
        position: "absolute",
        left: -8,
        top: "50%",
        transform: "translate(-100%, -50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: primaryColor,
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 8px",
        borderRadius: 4,
        boxShadow: theme?.shadows?.sm || "0 1px 2px 0 rgb(0 0 0 / 0.05)"
      }}>
        {iconMap.ability || "⚡"} Abilities
      </span>

      <Handle
        id="h_rule"
        type="target"
        position={Position.Top}
        style={{
          background: theme?.colors?.warning || "#f59e0b",
          width: 12,
          height: 12,
          top: -6,
          border: "2px solid #ffffff",
          boxShadow: theme?.shadows?.md || "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}
      />
      <span style={{
        position: "absolute",
        top: -20,
        left: "50%",
        transform: "translate(-50%, -100%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: theme?.colors?.warning || "#f59e0b",
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 8px",
        borderRadius: 4,
        boxShadow: theme?.shadows?.sm || "0 1px 2px 0 rgb(0 0 0 / 0.05)"
      }}>
        {iconMap.rule || "🛡️"} Rules
      </span>

      <Handle
        id="h_knowledge"
        type="target"
        position={Position.Right}
        style={{
          background: theme?.colors?.success || "#10b981",
          width: 12,
          height: 12,
          right: -6,
          border: "2px solid #ffffff",
          boxShadow: theme?.shadows?.md || "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}
      />
      <span style={{
        position: "absolute",
        right: -8,
        top: "50%",
        transform: "translate(100%, -50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: theme?.colors?.success || "#10b981",
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 8px",
        borderRadius: 4,
        boxShadow: theme?.shadows?.sm || "0 1px 2px 0 rgb(0 0 0 / 0.05)"
      }}>
        {iconMap.knowledge || "📚"} Knowledge
      </span>

      <Handle
        id="h_out"
        type="source"
        position={Position.Bottom}
        style={{
          background: theme?.colors?.info || "#06b6d4",
          width: 12,
          height: 12,
          bottom: -6,
          border: "2px solid #ffffff",
          boxShadow: theme?.shadows?.md || "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}
      />
      <span style={{
        position: "absolute",
        bottom: -20,
        left: "50%",
        transform: "translate(-50%, 100%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: theme?.colors?.info || "#06b6d4",
        fontSize: 11,
        fontWeight: 600,
        background: "rgba(255, 255, 255, 0.9)",
        padding: "4px 8px",
        borderRadius: 4,
        boxShadow: theme?.shadows?.sm || "0 1px 2px 0 rgb(0 0 0 / 0.05)"
      }}>
        Output
      </span>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

export default BaseNode;