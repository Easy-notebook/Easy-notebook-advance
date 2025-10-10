import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BrainCellMeta } from '../utils/types';

interface MinimalBrainCellNodeProps extends NodeProps {
  data: BrainCellMeta;
}

// Minimal color scheme - OpenAI style
const colorScheme = {
  Sensor: {
    border: '#10b981',
    bg: '#ffffff',
    text: '#10b981',
    lightBg: '#f0fdf4',
  },
  Processor: {
    border: '#3b82f6',
    bg: '#ffffff',
    text: '#3b82f6',
    lightBg: '#eff6ff',
  },
  Memory: {
    border: '#8b5cf6',
    bg: '#ffffff',
    text: '#8b5cf6',
    lightBg: '#f5f3ff',
  },
  Actuator: {
    border: '#f59e0b',
    bg: '#ffffff',
    text: '#f59e0b',
    lightBg: '#fffbeb',
  },
  Router: {
    border: '#ef4444',
    bg: '#ffffff',
    text: '#ef4444',
    lightBg: '#fef2f2',
  },
};

export const MinimalBrainCellNode = memo(({ data, selected }: MinimalBrainCellNodeProps) => {
  const colors = colorScheme[data.kind as keyof typeof colorScheme] || colorScheme.Processor;

  return (
    <div className="relative group">
      {/* Main node container - Minimal design */}
      <div
        className="min-w-[180px] px-4 py-3 rounded-2xl transition-all duration-200 cursor-pointer"
        style={{
          backgroundColor: colors.bg,
          border: `2px solid ${selected ? colors.border : colors.border + '80'}`,
          boxShadow: selected
            ? `0 0 0 4px ${colors.border}20, 0 2px 8px rgba(0,0,0,0.08)`
            : '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {/* Content layout */}
        <div className="flex items-center gap-3">
          {/* Text information */}
          <div className="flex-1 min-w-0">
            {/* Name */}
            <div
              className="font-semibold text-sm truncate"
              style={{ color: '#1f2937' }}
            >
              {data.name}
            </div>

            {/* Type */}
            <div
              className="text-xs font-medium truncate mt-0.5"
              style={{ color: colors.text + 'cc' }}
            >
              {data.kind}
            </div>
          </div>

          {/* Status indicator - Minimal */}
          {data.runtime.status === 'running' && (
            <div className="flex-shrink-0">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: colors.border }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input ports - Minimal style */}
      {data.inputs?.map((port, index) => (
        <Handle
          key={`input-${port.id}`}
          type="target"
          id={port.id}
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !bg-white transition-all duration-150"
          style={{
            borderColor: port.io === 'data' ? colors.border : colors.border + 'aa',
            top: data.inputs && data.inputs.length > 1 ? `${30 + index * 40}%` : '50%',
            left: '-6px',
          }}
        />
      ))}

      {/* Output ports - Minimal style */}
      {data.outputs?.map((port, index) => (
        <Handle
          key={`output-${port.id}`}
          type="source"
          id={port.id}
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !bg-white transition-all duration-150"
          style={{
            borderColor: port.io === 'data' ? colors.border : colors.border + 'aa',
            top: data.outputs && data.outputs.length > 1 ? `${30 + index * 40}%` : '50%',
            right: '-6px',
          }}
        />
      ))}
    </div>
  );
});

MinimalBrainCellNode.displayName = 'MinimalBrainCellNode';
