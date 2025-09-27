import React, { useState } from 'react';
import { Handle, Position } from "reactflow";
import { BrainCellMeta } from './types';
import { IO_BADGE, STATUS_DOT } from './constants';
import { getNodeDesign, getNodeIcon } from './nodeDesigns';
import { CircleShape, RectangleShape, HexagonShape, PentagonShape, DiamondShape } from './shapes/ShapeComponents';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EnhancedBrainCellNodeProps {
  data: BrainCellMeta;
  selected?: boolean;
}

export function EnhancedBrainCellNode({ data, selected = false }: EnhancedBrainCellNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const design = getNodeDesign(data.kind);
  const icon = getNodeIcon(data.kind);

  // 根据展开状态选择尺寸
  const currentSize = isExpanded ? design.size : design.compactSize;

  // 根据形状选择对应的组件
  const getShapeComponent = () => {
    const shapeProps = {
      width: currentSize.width,
      height: currentSize.height,
      colors: design.colors,
      borderWidth: design.borderWidth,
      className: `transition-all duration-200 ${selected ? 'ring-4 ring-blue-400 ring-opacity-50' : ''} ${
        design.animation === 'pulse' && data.runtime.status === 'running' ? 'animate-pulse' : ''
      }`,
    };

    switch (design.shape) {
      case 'circle':
        return CircleShape;
      case 'hexagon':
        return HexagonShape;
      case 'pentagon':
        return PentagonShape;
      case 'diamond':
        return DiamondShape;
      case 'rectangle':
      default:
        return RectangleShape;
    }
  };

  const ShapeComponent = getShapeComponent();

  // 计算端口位置
  const getPortPositions = () => {
    const { shape } = design;

    switch (shape) {
      case 'circle':
        return {
          inputPositions: [{ top: '30%' }, { top: '70%' }],
          outputPositions: [{ top: '30%' }, { top: '70%' }],
        };
      case 'diamond':
        return {
          inputPositions: [{ top: '25%' }, { top: '75%' }],
          outputPositions: [{ top: '25%' }, { top: '75%' }],
        };
      case 'hexagon':
        return {
          inputPositions: [{ top: '35%' }, { top: '65%' }],
          outputPositions: [{ top: '35%' }, { top: '65%' }],
        };
      case 'pentagon':
        return {
          inputPositions: [{ top: '40%' }, { top: '80%' }],
          outputPositions: [{ top: '40%' }, { top: '80%' }],
        };
      default:
        return {
          inputPositions: [{ top: '35%' }, { top: '65%' }],
          outputPositions: [{ top: '35%' }, { top: '65%' }],
        };
    }
  };

  const { inputPositions, outputPositions } = getPortPositions();

  return (
    <div className="relative">
      <ShapeComponent {...{
        width: currentSize.width,
        height: currentSize.height,
        colors: design.colors,
        borderWidth: design.borderWidth,
        className: `transition-all duration-200 ${selected ? 'ring-4 ring-blue-400 ring-opacity-50' : ''} ${
          design.animation === 'pulse' && data.runtime.status === 'running' ? 'animate-pulse' : ''
        }`,
      }}>
        <div className="absolute inset-0 flex items-center p-3">
          {/* 左侧图标区域 */}
          <div className="flex-shrink-0 mr-3">
            <div className="text-2xl">{icon}</div>
          </div>

          {/* 中间内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 主标题 */}
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold text-sm truncate" style={{ color: design.colors.text }}>
                {data.name}
              </div>
              <div className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${STATUS_DOT[data.runtime.status]}`} />
                {/* 展开/收起按钮 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(!isExpanded);
                  }}
                  className="p-0.5 rounded hover:bg-white hover:bg-opacity-20 transition-colors"
                  style={{ color: design.colors.text }}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* 副标题 */}
            <div className="text-xs opacity-75 truncate" style={{ color: design.colors.text }}>
              {data.kind}
            </div>
          </div>

          {/* 展开时的详细信息 */}
          {isExpanded && (
            <div className="absolute top-full left-0 right-0 mt-1 p-3 rounded-lg border-2 z-10"
                 style={{
                   backgroundColor: design.colors.secondary,
                   borderColor: design.colors.border,
                   boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                 }}>
              {/* 端口信息 */}
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-1">
                  <div className="text-xs font-medium opacity-75" style={{ color: design.colors.text }}>输入</div>
                  {data.inputs?.slice(0, 2).map((port, index) => (
                    <div key={port.id} className="text-xs px-2 py-1 bg-blue-500 bg-opacity-20 rounded text-blue-200">
                      {port.label}
                    </div>
                  ))}
                </div>
                <div className="space-y-1 text-right">
                  <div className="text-xs font-medium opacity-75" style={{ color: design.colors.text }}>输出</div>
                  {data.outputs?.slice(0, 2).map((port, index) => (
                    <div key={port.id} className="text-xs px-2 py-1 bg-orange-500 bg-opacity-20 rounded text-orange-200">
                      {port.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* 进度条 */}
              {data.runtime.status === 'running' && (
                <div className="mb-3">
                  <div className="text-xs font-medium mb-1 opacity-75" style={{ color: design.colors.text }}>
                    进度 {data.runtime.progress}%
                  </div>
                  <div className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${data.runtime.progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* 描述 */}
              {data.description && (
                <div className="text-xs opacity-75 leading-relaxed" style={{ color: design.colors.text }}>
                  {data.description}
                </div>
              )}
            </div>
          )}
        </div>
      </ShapeComponent>

      {/* 输入端口 Handles */}
      {data.inputs?.map((port, index) => (
        <Handle
          key={`input-${port.id}`}
          type="target"
          id={port.id}
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !border-gray-300"
          style={{
            background: '#FFFFFF',
            borderColor: '#D1D5DB',
            top: '50%',
            left: '-6px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        />
      ))}

      {/* 输出端口 Handles */}
      {data.outputs?.map((port, index) => (
        <Handle
          key={`output-${port.id}`}
          type="source"
          id={port.id}
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !border-gray-300"
          style={{
            background: '#FFFFFF',
            borderColor: '#D1D5DB',
            top: '50%',
            right: '-6px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          }}
        />
      ))}
    </div>
  );
}