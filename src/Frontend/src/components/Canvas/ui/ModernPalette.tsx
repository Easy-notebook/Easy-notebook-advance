import { memo, useState } from 'react';
import { Input, Badge } from 'antd';
import { Sparkles, Search, Plus } from 'lucide-react';
import { BrainCellKind } from '../utils/types';
import { KINDS } from '../utils/constants';
import { getNodeDesign, getNodeIcon } from '../nodes/nodeDesigns';

interface ModernPaletteProps {
  onAdd: (kind: BrainCellKind) => void;
}

export const ModernPalette = memo(({ onAdd }: ModernPaletteProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredKind, setHoveredKind] = useState<BrainCellKind | null>(null);

  const filteredKinds = KINDS.filter((kind) =>
    kind.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const descriptions: Record<BrainCellKind, string> = {
    Sensor: 'Input data sources and triggers',
    Processor: 'AI-powered processing units',
    Memory: 'State storage and knowledge base',
    Actuator: 'Action executors and outputs',
    Router: 'Conditional routing and branching',
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-gray-200"
        style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(168,85,247,0.05) 100%)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-base">Components</h3>
            <p className="text-xs text-gray-500">Click or drag to add</p>
          </div>
          <Badge count={filteredKinds.length} showZero color="#6366f1" />
        </div>

        {/* Search */}
        <Input
          prefix={<Search className="w-4 h-4 text-gray-400" />}
          placeholder="Search components..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg"
          allowClear
        />
      </div>

      {/* Components list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredKinds.map((kind) => {
          const design = getNodeDesign(kind);
          const icon = getNodeIcon(kind);
          const isHovered = hoveredKind === kind;

          return (
            <div
              key={kind}
              className="group relative cursor-pointer"
              onMouseEnter={() => setHoveredKind(kind)}
              onMouseLeave={() => setHoveredKind(null)}
              onClick={() => onAdd(kind)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', kind);
                e.dataTransfer.effectAllowed = 'move';
              }}
            >
              <div
                className={`
                  relative rounded-xl p-4 border-2 transition-all duration-300
                  ${isHovered ? 'scale-105 shadow-xl -translate-y-1' : 'shadow-sm'}
                `}
                style={{
                  background: isHovered
                    ? `linear-gradient(135deg, ${design.colors.primary}15, ${design.colors.secondary}30)`
                    : `linear-gradient(135deg, ${design.colors.primary}08, ${design.colors.secondary}15)`,
                  borderColor: isHovered ? design.colors.primary : design.colors.border + '40',
                }}
              >
                {/* Content */}
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className={`
                      flex items-center justify-center w-12 h-12 rounded-xl shadow-md
                      transition-all duration-300
                      ${isHovered ? 'scale-110 rotate-3' : ''}
                    `}
                    style={{
                      background: `linear-gradient(135deg, ${design.colors.primary}25, ${design.colors.primary}45)`,
                      border: `2px solid ${design.colors.primary}60`,
                    }}
                  >
                    <span className="text-2xl">{icon}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="font-bold text-sm"
                        style={{ color: design.colors.primary }}
                      >
                        {kind}
                      </h4>
                      <div
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: design.colors.secondary,
                          color: design.colors.text,
                          border: `1px solid ${design.colors.border}30`,
                        }}
                      >
                        {design.shape}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 leading-tight">
                      {descriptions[kind]}
                    </p>
                  </div>

                  {/* Add button */}
                  <div
                    className={`
                      flex items-center justify-center w-8 h-8 rounded-lg
                      transition-all duration-300
                      ${isHovered ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-110' : 'bg-gray-100 text-gray-400'}
                    `}
                  >
                    <Plus className="w-4 h-4" />
                  </div>
                </div>

                {/* Hover glow effect */}
                {isHovered && (
                  <div
                    className="absolute inset-0 rounded-xl pointer-events-none animate-pulse"
                    style={{
                      background: `linear-gradient(135deg, ${design.colors.primary}10, transparent)`,
                      boxShadow: `0 0 30px ${design.colors.primary}30`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredKinds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">No components found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        )}
      </div>

      {/* Footer tips */}
      <div
        className="px-4 py-3 border-t border-gray-200 space-y-2"
        style={{
          background: 'linear-gradient(135deg, rgba(249,250,251,1) 0%, rgba(243,244,246,1) 100%)',
        }}
      >
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-600 font-bold">💡</span>
          </div>
          <div>
            <div className="font-semibold mb-1">Quick Tips</div>
            <ul className="space-y-1 text-gray-500">
              <li>• Click to add to canvas</li>
              <li>• Drag & drop to position</li>
              <li>• Connect ports of same type</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

ModernPalette.displayName = 'ModernPalette';
