import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow';

interface MinimalEasyNetEdgeData {
  protocol?: string;
  channel?: string;
  qos?: number;
  namespace?: string;
  io?: 'data' | 'control';
}

export const MinimalEasyNetEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
}: EdgeProps<MinimalEasyNetEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // 极简颜色方案
  const isDataFlow = data?.io === 'data';
  const protocol = data?.protocol ?? 'topic';

  // 根据协议类型选择颜色
  const edgeColor = protocol === 'topic' ? '#3b82f6' : '#92400e';
  const strokeWidth = selected ? 2.5 : 1.5;
  const isDashed = protocol === 'rpc';

  return (
    <>
      {/* 主边缘路径 */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth,
          strokeDasharray: isDashed ? '5,5' : undefined,
          opacity: selected ? 1 : 0.6,
        }}
      />

      {/* 标签 - 极简设计 */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`
            transition-all duration-200
            ${selected ? 'scale-100' : 'scale-95'}
          `}
        >
          <div
            className="px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: '#ffffff',
              border: `1px solid ${edgeColor}40`,
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <span style={{ color: edgeColor, fontWeight: 600 }}>
              {protocol}
            </span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-gray-600">
              {data?.channel ?? 'channel'}
            </span>
            {typeof data?.qos !== 'undefined' && (
              <span className="ml-1.5 text-gray-400 text-xs">
                qos={data.qos}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

MinimalEasyNetEdge.displayName = 'MinimalEasyNetEdge';

export const minimalEdgeTypes = {
  easynet: MinimalEasyNetEdge,
} as const;
