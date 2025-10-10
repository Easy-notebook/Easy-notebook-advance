import React from 'react';
import { Handle, Position } from "reactflow";

export interface SimplifiedBaseNodeProps {
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

export function SimplifiedBaseNode({
  data,
  selected = false,
  iconMap = {},
  theme
}: SimplifiedBaseNodeProps) {
  // Colors
  const strokeColor = selected
    ? (theme?.colors?.primary || "#3b82f6")
    : (theme?.colors?.borderStrong || "#64748b");
  const backgroundColor = theme?.colors?.bg || "#ffffff";
  const textColor = theme?.colors?.text || "#0f172a";
  const abilityColor = theme?.colors?.primary || "#3b82f6";
  const ruleColor = theme?.colors?.warning || "#f59e0b";
  const knowledgeColor = theme?.colors?.success || "#10b981";
  const outputColor = theme?.colors?.info || "#06b6d4";

  return (
    <div
      className="simplified-base-node"
      style={{
        position: 'relative',
        width: 200,
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Main container - rounded square */}
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: 20,
          border: `3px solid ${strokeColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: selected
            ? `0 0 20px ${strokeColor}40`
            : '0 4px 12px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Kind label */}
        {data.kind && (
          <div style={{
            fontSize: 12,
            color: theme?.colors?.textSub || "#64748b",
            marginBottom: 4,
            fontWeight: 500
          }}>
            {data.kind}
          </div>
        )}

        {/* Title */}
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: textColor,
          marginBottom: 8
        }}>
          {data.label || "BrainCell"}
        </div>

        {/* Stats */}
        {data.stats && (
          <div style={{
            display: 'flex',
            gap: 16,
            fontSize: 13,
            color: theme?.colors?.textSub || "#64748b",
            fontWeight: 500
          }}>
            <span>{data.stats.abilities}</span>
            <span>{data.stats.rules}</span>
            <span>{data.stats.knowledge}</span>
          </div>
        )}
      </div>

      {/* Top Knowledge Port */}
      <div style={{
        position: 'absolute',
        top: -30,
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        <div style={{
          width: 3,
          height: 30,
          backgroundColor: knowledgeColor,
          marginLeft: 'auto',
          marginRight: 'auto'
        }} />
        <div style={{
          width: 24,
          height: 24,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `12px solid ${knowledgeColor}`
          }} />
        </div>
        <Handle
          id="h_knowledge"
          type="target"
          position={Position.Top}
          style={{
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: knowledgeColor,
            border: 'none'
          }}
        />
        {/* Label */}
        <div style={{
          position: 'absolute',
          top: -45,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          color: knowledgeColor,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          Knowledge
        </div>
      </div>

      {/* Left Ability Port */}
      <div style={{
        position: 'absolute',
        left: -30,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'row-reverse'
      }}>
        <div style={{
          width: 30,
          height: 3,
          backgroundColor: abilityColor
        }} />
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `3px solid ${abilityColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${abilityColor}`
          }} />
        </div>
        <Handle
          id="h_ability"
          type="target"
          position={Position.Left}
          style={{
            left: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            background: abilityColor,
            border: 'none'
          }}
        />
        {/* Label */}
        <div style={{
          position: 'absolute',
          left: -15,
          top: '50%',
          transform: 'translateY(-50%) translateX(-100%)',
          fontSize: 10,
          color: abilityColor,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          Abilities
        </div>
      </div>

      {/* Bottom Rule Port */}
      <div style={{
        position: 'absolute',
        bottom: -30,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div style={{
          width: 3,
          height: 30,
          backgroundColor: ruleColor
        }} />
        <div style={{
          width: 24,
          height: 24,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: `12px solid ${ruleColor}`
          }} />
        </div>
        <Handle
          id="h_rule"
          type="target"
          position={Position.Bottom}
          style={{
            bottom: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: ruleColor,
            border: 'none'
          }}
        />
        {/* Label */}
        <div style={{
          position: 'absolute',
          bottom: -45,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 10,
          color: ruleColor,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          Rules
        </div>
      </div>

      {/* Right Output Port */}
      <div style={{
        position: 'absolute',
        right: -30,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: 30,
          height: 3,
          backgroundColor: outputColor
        }} />
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: outputColor
        }} />
        <Handle
          id="h_out"
          type="source"
          position={Position.Right}
          style={{
            right: -12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            background: outputColor,
            border: 'none'
          }}
        />
        {/* Label */}
        <div style={{
          position: 'absolute',
          right: -15,
          top: '50%',
          transform: 'translateY(-50%) translateX(100%)',
          fontSize: 10,
          color: outputColor,
          fontWeight: 600,
          whiteSpace: 'nowrap'
        }}>
          Output
        </div>
      </div>

      <style>
        {`
          .simplified-base-node {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }
        `}
      </style>
    </div>
  );
}

export default SimplifiedBaseNode;