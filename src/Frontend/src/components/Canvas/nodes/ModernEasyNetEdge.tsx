import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, EdgeProps } from 'reactflow';
import { Wifi, Zap, Database, Radio } from 'lucide-react';

interface EasyNetEdgeData {
  protocol?: string;
  channel?: string;
  qos?: number;
  namespace?: string;
  io?: 'data' | 'control';
}

export const ModernEasyNetEdge = memo(({
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
}: EdgeProps<EasyNetEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Define color schemes based on IO type and protocol
  const isDataFlow = data?.io === 'data';
  const protocol = data?.protocol ?? 'topic';

  const colorSchemes = {
    topic: {
      gradient: 'from-blue-500 to-cyan-500',
      stroke: '#3b82f6',
      shadow: '0 0 10px rgba(59, 130, 246, 0.5)',
      bg: 'bg-blue-500',
      icon: <Radio className="w-3 h-3" />,
    },
    rpc: {
      gradient: 'from-purple-500 to-pink-500',
      stroke: '#a855f7',
      shadow: '0 0 10px rgba(168, 85, 247, 0.5)',
      bg: 'bg-purple-500',
      icon: <Zap className="w-3 h-3" />,
    },
    stream: {
      gradient: 'from-green-500 to-emerald-500',
      stroke: '#22c55e',
      shadow: '0 0 10px rgba(34, 197, 94, 0.5)',
      bg: 'bg-green-500',
      icon: <Wifi className="w-3 h-3" />,
    },
    db: {
      gradient: 'from-orange-500 to-red-500',
      stroke: '#f97316',
      shadow: '0 0 10px rgba(249, 115, 22, 0.5)',
      bg: 'bg-orange-500',
      icon: <Database className="w-3 h-3" />,
    },
  };

  const scheme = colorSchemes[protocol as keyof typeof colorSchemes] || colorSchemes.topic;
  const strokeWidth = selected ? 3 : 2;

  // QoS level indicator
  const qosConfig = {
    0: { label: 'At most once', color: 'text-gray-500', bg: 'bg-gray-100' },
    1: { label: 'At least once', color: 'text-blue-600', bg: 'bg-blue-100' },
    2: { label: 'Exactly once', color: 'text-green-600', bg: 'bg-green-100' },
  };

  const qos = data?.qos ?? 0;
  const qosInfo = qosConfig[qos as keyof typeof qosConfig] || qosConfig[0];

  return (
    <>
      {/* Animated background glow */}
      {selected && (
        <path
          d={edgePath}
          strokeWidth={strokeWidth + 6}
          stroke={scheme.stroke}
          fill="none"
          opacity={0.2}
          className="animate-pulse"
        />
      )}

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: scheme.stroke,
          strokeWidth,
          filter: selected ? `drop-shadow(${scheme.shadow})` : undefined,
        }}
      />

      {/* Animated particles flowing along the edge */}
      {isDataFlow && (
        <>
          <circle r="3" fill={scheme.stroke} opacity="0.8">
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="2" fill={scheme.stroke} opacity="0.6">
            <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
          </circle>
        </>
      )}

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`
            group cursor-pointer transition-all duration-300
            ${selected ? 'scale-110' : 'scale-100 hover:scale-105'}
          `}
        >
          {/* Main label card */}
          <div
            className={`
              relative rounded-xl shadow-lg backdrop-blur-sm border-2 overflow-hidden
              ${selected ? 'ring-4 ring-blue-400 ring-opacity-50 border-blue-400' : 'border-white/60'}
            `}
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
            }}
          >
            {/* Gradient accent bar */}
            <div className={`h-1 bg-gradient-to-r ${scheme.gradient}`} />

            {/* Content */}
            <div className="px-3 py-2 space-y-1">
              {/* Protocol and channel */}
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded-lg ${scheme.bg} text-white`}>
                  {scheme.icon}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {protocol}
                  </span>
                  <span className="text-gray-400">/</span>
                  <span className="text-xs font-medium text-gray-600">
                    {data?.channel ?? 'channel'}
                  </span>
                </div>
              </div>

              {/* QoS and namespace */}
              <div className="flex items-center gap-2 text-xs">
                <div className={`px-2 py-0.5 rounded ${qosInfo.bg} ${qosInfo.color} font-medium`}>
                  QoS {qos}
                </div>
                {data?.namespace && (
                  <div className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                    {data.namespace}
                  </div>
                )}
              </div>
            </div>

            {/* Hover tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                <div className="font-semibold mb-1">{protocol.toUpperCase()} Connection</div>
                <div className="text-gray-300">{qosInfo.label}</div>
                <div className="text-gray-400 mt-1">
                  {isDataFlow ? 'Data Flow' : 'Control Flow'}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                  <div className="border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>

            {/* Selected indicator */}
            {selected && (
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping" />
                <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full" />
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ModernEasyNetEdge.displayName = 'ModernEasyNetEdge';

export const modernEdgeTypes = {
  easynet: ModernEasyNetEdge,
} as const;
