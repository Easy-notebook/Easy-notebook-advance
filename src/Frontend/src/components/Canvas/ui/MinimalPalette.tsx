import { memo } from 'react';
import { BrainCellKind } from '../utils/types';
import { KINDS } from '../utils/constants';
import { getNodeIcon } from '../nodes/nodeDesigns';

interface MinimalPaletteProps {
  onAdd: (kind: BrainCellKind) => void;
}

const colorScheme = {
  Sensor: '#10b981',
  Processor: '#3b82f6',
  Memory: '#8b5cf6',
  Actuator: '#f59e0b',
  Router: '#ef4444',
};

const descriptions: Record<BrainCellKind, string> = {
  Sensor: 'Input data sources',
  Processor: 'AI processing units',
  Memory: 'State storage',
  Actuator: 'Action executors',
  Router: 'Conditional routing',
};

export const MinimalPalette = memo(({ onAdd }: MinimalPaletteProps) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-sm text-gray-900">Components</h3>
        <p className="text-xs text-gray-500 mt-0.5">Click to add to canvas</p>
      </div>

      {/* Components list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {KINDS.map((kind) => {
          const color = colorScheme[kind as keyof typeof colorScheme];

          return (
            <button
              key={kind}
              onClick={() => onAdd(kind)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer group text-left"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div
                  className="font-semibold text-sm"
                  style={{ color }}
                >
                  {kind}
                </div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {descriptions[kind]}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

MinimalPalette.displayName = 'MinimalPalette';
