import React from 'react';
import { Handle, Position } from "reactflow";

export interface SimplifiedBrainCellProps {
  data: {
    label: string;
    icon?: string;
    stats?: {
      abilities: number;
      rules: number;
      knowledge: number;
    };
    size?: 'sm' | 'md' | 'lg' | 'xl';
  };
  selected?: boolean;
  theme?: any;
}

const SIZE_CONFIG = {
  sm: { width: 200, height: 120, fontSize: 14 },
  md: { width: 280, height: 140, fontSize: 16 },
  lg: { width: 360, height: 160, fontSize: 18 },
  xl: { width: 440, height: 180, fontSize: 20 }
};

export function SimplifiedBrainCell({
  data,
  selected = false,
  theme
}: SimplifiedBrainCellProps) {
  const size = data.size || 'md';
  const config = SIZE_CONFIG[size];

  // Colors
  const strokeColor = selected
    ? (theme?.colors?.primary || "#3b82f6")
    : (theme?.colors?.border || "#94a3b8");
  const backgroundColor = theme?.colors?.bg || "#ffffff";
  const textColor = theme?.colors?.text || "#0f172a";
  const portColor = theme?.colors?.borderStrong || "#64748b";

  return (
    <div
      className="simplified-braincell"
      style={{
        position: 'relative',
        width: config.width,
        height: config.height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Main container - rounded rectangle */}
      <div
        style={{
          width: config.width - 40,
          height: config.height - 40,
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
          transition: 'all 0.3s ease'
        }}
      >
        {/* Title */}
        <div style={{
          fontSize: config.fontSize,
          fontWeight: 600,
          color: textColor,
          marginBottom: 8
        }}>
          {data.label || "BrainCell"}
        </div>

        {/* Stats */}
        {data.stats && (
          <div style={{
            display: 'flex',
            gap: 12,
            fontSize: config.fontSize - 4,
            color: theme?.colors?.textSub || "#64748b"
          }}>
            <span>⚡{data.stats.abilities}</span>
            <span>🛡️{data.stats.rules}</span>
            <span>📚{data.stats.knowledge}</span>
          </div>
        )}
      </div>

      {/* Top Input Ports */}
      {/* Circle port - left */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: '25%',
        transform: 'translateX(-50%)'
      }}>
        <div style={{
          width: 3,
          height: 40,
          backgroundColor: strokeColor,
          marginLeft: 'auto',
          marginRight: 'auto'
        }} />
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `3px solid ${strokeColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${portColor}`
          }} />
        </div>
        <Handle
          id="input-sensor"
          type="target"
          position={Position.Top}
          style={{
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      {/* Triangle port - center */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        <div style={{
          width: 3,
          height: 40,
          backgroundColor: strokeColor,
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
            borderBottom: `12px solid ${strokeColor}`
          }} />
        </div>
        <Handle
          id="input-processor"
          type="target"
          position={Position.Top}
          style={{
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      {/* Inverted Triangle port - right */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: '75%',
        transform: 'translateX(-50%)'
      }}>
        <div style={{
          width: 3,
          height: 40,
          backgroundColor: strokeColor,
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
            borderTop: `12px solid ${strokeColor}`
          }} />
        </div>
        <Handle
          id="input-filter"
          type="target"
          position={Position.Top}
          style={{
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      {/* Left Input Port */}
      <div style={{
        position: 'absolute',
        left: -40,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `3px solid ${strokeColor}`,
          backgroundColor: backgroundColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            border: `2px solid ${portColor}`
          }} />
        </div>
        <div style={{
          width: 40,
          height: 3,
          backgroundColor: strokeColor
        }} />
        <Handle
          id="input-left"
          type="target"
          position={Position.Left}
          style={{
            left: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      {/* Right Output Port */}
      <div style={{
        position: 'absolute',
        right: -40,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: 40,
          height: 3,
          backgroundColor: strokeColor
        }} />
        <div style={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          backgroundColor: strokeColor
        }} />
        <Handle
          id="output-right"
          type="source"
          position={Position.Right}
          style={{
            right: -8,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      {/* Bottom Output with curved connection */}
      <div style={{
        position: 'absolute',
        bottom: -60,
        left: '50%',
        transform: 'translateX(-50%)'
      }}>
        {/* Curved connection line */}
        <svg
          width="80"
          height="40"
          style={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        >
          <path
            d="M 40 0 Q 20 20 0 40 L 80 40"
            stroke={strokeColor}
            strokeWidth="3"
            fill="none"
            strokeDasharray="8,4"
          />
          {/* Arrow */}
          <polygon
            points="75,36 85,40 75,44"
            fill={strokeColor}
          />
        </svg>

        {/* Bottom square */}
        <div style={{
          width: 32,
          height: 32,
          border: `3px solid ${strokeColor}`,
          backgroundColor: backgroundColor,
          borderRadius: 4
        }} />

        {/* Bottom output line */}
        <div style={{
          width: 3,
          height: 20,
          backgroundColor: strokeColor,
          marginLeft: 'auto',
          marginRight: 'auto'
        }} />

        {/* Arrow down */}
        <div style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `8px solid ${strokeColor}`,
          marginLeft: 'auto',
          marginRight: 'auto'
        }} />

        <Handle
          id="output-bottom"
          type="source"
          position={Position.Bottom}
          style={{
            bottom: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 8,
            height: 8,
            background: strokeColor,
            border: 'none'
          }}
        />
      </div>

      <style>
        {`
          .simplified-braincell {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          }

          .simplified-braincell:hover .connection-line {
            stroke-dasharray: 4,4;
            animation: dash 1s linear infinite;
          }

          @keyframes dash {
            to {
              stroke-dashoffset: -8;
            }
          }
        `}
      </style>
    </div>
  );
}

export default SimplifiedBrainCell;