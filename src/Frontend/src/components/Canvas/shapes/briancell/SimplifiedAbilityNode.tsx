import React from 'react';
import { Handle, Position } from "reactflow";

export interface SimplifiedAbilityNodeProps {
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

export function SimplifiedAbilityNode({
  data,
  selected = false,
  iconMap = {},
  theme
}: SimplifiedAbilityNodeProps) {
  const primaryColor = theme?.colors?.primary || "#3b82f6";
  const backgroundColor = theme?.colors?.bg || "#ffffff";
  const textColor = theme?.colors?.text || "#0f172a";
  const strokeColor = selected ? primaryColor : (theme?.colors?.border || "#94a3b8");

  return (
    <div
      className="simplified-ability-node"
      style={{
        position: 'relative',
        width: 100,
        height: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Main container - circle like BrainCell ability port */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          border: `3px solid ${strokeColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          boxShadow: selected
            ? `0 0 16px ${primaryColor}40, 0 4px 12px rgba(0, 0, 0, 0.1)`
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative',
          cursor: 'pointer'
        }}
      >
        {/* Inner circle - exactly like BrainCell ability port */}
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `2px solid ${primaryColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${primaryColor}`
          }} />
        </div>

        {/* Label */}
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: textColor,
          textAlign: 'center',
          maxWidth: 60,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {data.label}
        </div>

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


      {/* Single handle - connects to BrainCell left ability port from right */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          right: -4,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 8,
          height: 8,
          background: strokeColor,
          border: 'none',
          borderRadius: '50%'
        }}
      />

      <style>
        {`
          .simplified-ability-node {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
        `}
      </style>
    </div>
  );
}

export default SimplifiedAbilityNode;