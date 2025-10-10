import React from 'react';
import { Handle, Position } from "reactflow";

export interface SimplifiedKnowledgeNodeProps {
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
}

export function SimplifiedKnowledgeNode({
  data,
  selected = false,
  iconMap = {},
  theme
}: SimplifiedKnowledgeNodeProps) {
  const successColor = theme?.colors?.success || "#10b981";
  const backgroundColor = theme?.colors?.bg || "#ffffff";
  const textColor = theme?.colors?.text || "#0f172a";
  const strokeColor = selected ? successColor : (theme?.colors?.border || "#94a3b8");

  return (
    <div
      className="simplified-knowledge-node"
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Main container - downward triangle like BrainCell knowledge port */}
      <div
        style={{
          width: 80,
          height: 80,
          backgroundColor: backgroundColor,
          borderRadius: '8px',
          border: `2px solid ${theme?.colors?.border || "#e2e8f0"}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          boxShadow: selected
            ? `0 0 16px ${successColor}40, 0 4px 12px rgba(0, 0, 0, 0.1)`
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative',
          cursor: 'pointer'
        }}
      >
        {/* Label at top */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: textColor,
          textAlign: 'center',
          maxWidth: 70,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginBottom: 8
        }}>
          {data.label}
        </div>

        {/* Downward triangle - exactly like BrainCell knowledge port */}
        <div style={{
          width: 0,
          height: 0,
          borderLeft: '20px solid transparent',
          borderRight: '20px solid transparent',
          borderTop: `28px solid ${strokeColor}`,
          filter: selected ? `drop-shadow(0 0 8px ${successColor}40)` : 'none'
        }} />

        {/* Connection indicator */}
        {data.source?.type === "easynet" && (
          <div style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: theme?.colors?.success || "#10b981",
            border: `2px solid ${backgroundColor}`
          }} />
        )}
      </div>


      {/* Single handle - connects to BrainCell top knowledge port from bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 8,
          height: 8,
          background: strokeColor,
          border: 'none',
          borderRadius: '50%'
        }}
      />

      <style>
        {`
          .simplified-knowledge-node {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
        `}
      </style>
    </div>
  );
}

export default SimplifiedKnowledgeNode;