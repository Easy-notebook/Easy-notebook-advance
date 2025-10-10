import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BrainCellMeta } from '../utils/types';
import { getNodeDesign, getNodeIcon } from './nodeDesigns';
import { ChevronDown, ChevronRight, Zap, Activity, AlertCircle } from 'lucide-react';

interface ModernBrainCellNodeProps extends NodeProps {
  data: BrainCellMeta;
}

export const ModernBrainCellNode = memo(({ data, selected }: ModernBrainCellNodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const design = getNodeDesign(data.kind);
  const icon = getNodeIcon(data.kind);

  // Status indicator
  const statusConfig = {
    idle: { color: '#94a3b8', label: 'Idle', icon: null },
    running: { color: '#22c55e', label: 'Running', icon: <Activity className="w-3 h-3" /> },
    error: { color: '#ef4444', label: 'Error', icon: <AlertCircle className="w-3 h-3" /> },
  };

  const currentStatus = statusConfig[data.runtime.status as keyof typeof statusConfig] || statusConfig.idle;

  return (
    <div
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main node container */}
      <div
        className={`
          relative min-w-[240px] rounded-2xl shadow-lg transition-all duration-300
          ${selected ? 'ring-4 ring-blue-400 ring-opacity-60' : 'ring-1 ring-gray-200'}
          ${isHovered ? 'shadow-2xl scale-105' : 'shadow-md'}
        `}
        style={{
          background: `linear-gradient(135deg, ${design.colors.primary}15 0%, ${design.colors.secondary} 100%)`,
          borderLeft: `4px solid ${design.colors.primary}`,
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Icon */}
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shadow-sm transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${design.colors.primary}20, ${design.colors.primary}40)`,
                  border: `1.5px solid ${design.colors.primary}40`,
                }}
              >
                <span className="text-xl">{icon}</span>
              </div>

              {/* Name and Type */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {data.name}
                </div>
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: design.colors.primary }}
                >
                  {data.kind}
                </div>
              </div>
            </div>

            {/* Expand/Collapse button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="p-1 rounded-lg hover:bg-white/60 transition-all duration-200"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-2 flex items-center justify-between bg-white/40">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: currentStatus.color }}
            />
            <span className="text-xs font-medium text-gray-600">
              {currentStatus.label}
            </span>
            {currentStatus.icon && (
              <span style={{ color: currentStatus.color }}>
                {currentStatus.icon}
              </span>
            )}
          </div>

          {data.runtime.status === 'running' && data.runtime.progress > 0 && (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span className="text-xs font-semibold text-gray-700">
                {data.runtime.progress}%
              </span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {data.runtime.status === 'running' && data.runtime.progress > 0 && (
          <div className="h-1 bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${data.runtime.progress}%` }}
            />
          </div>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 py-3 space-y-3 bg-white/60 rounded-b-2xl border-t border-gray-100">
            {/* Description */}
            {data.description && (
              <div className="text-xs text-gray-600 leading-relaxed">
                {data.description}
              </div>
            )}

            {/* Ports info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Inputs
                </div>
                {data.inputs?.slice(0, 3).map((port) => (
                  <div
                    key={port.id}
                    className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700 font-medium truncate"
                  >
                    {port.label}
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Outputs
                </div>
                {data.outputs?.slice(0, 3).map((port) => (
                  <div
                    key={port.id}
                    className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 font-medium truncate"
                  >
                    {port.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Parameters preview */}
            {data.params && data.params.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Parameters ({data.params.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {data.params.slice(0, 3).map((param, idx) => (
                    <div
                      key={idx}
                      className="px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700 font-mono"
                    >
                      {param.key}
                    </div>
                  ))}
                  {data.params.length > 3 && (
                    <div className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      +{data.params.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hover overlay with glow effect */}
        {isHovered && (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse"
            style={{
              background: `linear-gradient(135deg, ${design.colors.primary}10, transparent)`,
              boxShadow: `0 0 20px ${design.colors.primary}40`,
            }}
          />
        )}
      </div>

      {/* Input Handles */}
      {data.inputs?.map((port, index) => (
        <Handle
          key={`input-${port.id}`}
          type="target"
          id={port.id}
          position={Position.Left}
          className="!w-4 !h-4 !border-2 !bg-white transition-all duration-200 hover:!scale-150 hover:!border-blue-500"
          style={{
            top: `${40 + index * 30}px`,
            borderColor: port.io === 'data' ? '#3b82f6' : '#8b5cf6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
      ))}

      {/* Output Handles */}
      {data.outputs?.map((port, index) => (
        <Handle
          key={`output-${port.id}`}
          type="source"
          id={port.id}
          position={Position.Right}
          className="!w-4 !h-4 !border-2 !bg-white transition-all duration-200 hover:!scale-150 hover:!border-orange-500"
          style={{
            top: `${40 + index * 30}px`,
            borderColor: port.io === 'data' ? '#3b82f6' : '#8b5cf6',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        />
      ))}

      {/* Selection indicator */}
      {selected && (
        <div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow-lg animate-bounce"
        >
          Selected
        </div>
      )}
    </div>
  );
});

ModernBrainCellNode.displayName = 'ModernBrainCellNode';
