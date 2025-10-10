import { memo } from 'react';
import { Button, Input, Select } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { Node } from 'reactflow';
import { BrainCellMeta, BrainCellKind } from '../utils/types';
import { KINDS } from '../utils/constants';

const { Option } = Select;

interface MinimalInspectorProps {
  selected?: Node<BrainCellMeta> | null;
  onChange: (patch: Partial<BrainCellMeta>) => void;
  onDelete: () => void;
  onEnterInternalView?: (nodeId: string) => void;
}

const colorScheme = {
  Sensor: '#10b981',
  Processor: '#3b82f6',
  Memory: '#8b5cf6',
  Actuator: '#f59e0b',
  Router: '#ef4444',
};

export const MinimalInspector = memo(({
  selected,
  onChange,
  onDelete,
  onEnterInternalView,
}: MinimalInspectorProps) => {
  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900">Inspector</h3>
          <p className="text-xs text-gray-500 mt-0.5">No node selected</p>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Select a node to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  const meta = selected.data;
  const color = colorScheme[meta.kind as keyof typeof colorScheme] || '#3b82f6';

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 truncate">{meta.name}</h3>
            <p className="text-xs truncate" style={{ color }}>{meta.kind}</p>
          </div>
          <Button
            danger
            type="text"
            size="small"
            onClick={onDelete}
            className="hover:bg-gray-50 text-sm"
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Name
          </label>
          <Input
            value={meta.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Node name"
            size="small"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Type
          </label>
          <Select
            value={meta.kind}
            onChange={(v: BrainCellKind) => onChange({ kind: v })}
            className="w-full"
            size="small"
          >
            {KINDS.map((k) => (
              <Option key={k} value={k}>
                {k}
              </Option>
            ))}
          </Select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <TextArea
            value={meta.description ?? ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Node description..."
            rows={3}
            size="small"
          />
        </div>

        {/* Parameters */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">
              Parameters
            </label>
            <Button
              type="text"
              size="small"
              onClick={() =>
                onChange({ params: [...(meta.params ?? []), { key: '', value: '' }] })
              }
              className="hover:bg-gray-50 text-xs"
            >
              Add
            </Button>
          </div>

          <div className="space-y-2">
            {meta.params?.map((p, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={p.key}
                  onChange={(e) => {
                    const next = [...meta.params];
                    next[idx] = { ...next[idx], key: e.target.value };
                    onChange({ params: next });
                  }}
                  placeholder="Key"
                  size="small"
                  className="flex-1"
                />
                <Input
                  value={p.value}
                  onChange={(e) => {
                    const next = [...meta.params];
                    next[idx] = { ...next[idx], value: e.target.value };
                    onChange({ params: next });
                  }}
                  placeholder="Value"
                  size="small"
                  className="flex-1"
                />
                <Button
                  type="text"
                  size="small"
                  danger
                  onClick={() => {
                    const next = meta.params.filter((_, i) => i !== idx);
                    onChange({ params: next });
                  }}
                  className="hover:bg-gray-50 text-xs"
                >
                  Remove
                </Button>
              </div>
            ))}

            {(!meta.params || meta.params.length === 0) && (
              <div className="text-center py-4 text-xs text-gray-400">
                No parameters
              </div>
            )}
          </div>
        </div>

        {/* Internal view button */}
        {onEnterInternalView && (
          <Button
            type="primary"
            onClick={() => onEnterInternalView(selected.id)}
            className="w-full"
            size="small"
          >
            View Internal
          </Button>
        )}
      </div>
    </div>
  );
});

MinimalInspector.displayName = 'MinimalInspector';
