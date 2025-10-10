import { memo, useState } from 'react';
import { Button, Input, Select, Switch, Tabs, Tag, Progress, Collapse } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import {
  Layers,
  Trash2,
  Eye,
  Settings,
  Zap,
  Activity,
  AlertCircle,
  ChevronRight,
  Plus,
  Minus,
  Info,
} from 'lucide-react';
import { Node } from 'reactflow';
import { BrainCellMeta, BrainCellKind } from '../utils/types';
import { KINDS } from '../utils/constants';
import { getNodeDesign, getNodeIcon } from '../nodes/nodeDesigns';

const { TabPane } = Tabs;
const { Panel } = Collapse;

interface ModernInspectorProps {
  selected?: Node<BrainCellMeta> | null;
  onChange: (patch: Partial<BrainCellMeta>) => void;
  onDelete: () => void;
  onEnterInternalView?: (nodeId: string) => void;
}

export const ModernInspector = memo(({
  selected,
  onChange,
  onDelete,
  onEnterInternalView,
}: ModernInspectorProps) => {
  const [activeTab, setActiveTab] = useState('properties');

  if (!selected) {
    return (
      <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-gray-200"
          style={{
            background: 'linear-gradient(135deg, rgba(100,116,139,0.05) 0%, rgba(148,163,184,0.05) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">Inspector</h3>
              <p className="text-xs text-gray-500">No node selected</p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <Layers className="w-10 h-10 text-gray-400" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">No Selection</h4>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                Click on a node in the canvas to view and edit its properties
              </p>
            </div>
            <div className="pt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <Info className="w-4 h-4" />
              <span>Double-click to enter internal view</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = selected.data;
  const design = getNodeDesign(meta.kind);
  const icon = getNodeIcon(meta.kind);

  const statusConfig = {
    idle: { color: '#94a3b8', label: 'Idle', icon: <Activity className="w-3 h-3" /> },
    running: { color: '#22c55e', label: 'Running', icon: <Activity className="w-3 h-3 animate-pulse" /> },
    error: { color: '#ef4444', label: 'Error', icon: <AlertCircle className="w-3 h-3" /> },
  };

  const currentStatus = statusConfig[meta.runtime.status as keyof typeof statusConfig] || statusConfig.idle;

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${design.colors.primary}08, ${design.colors.secondary}15)`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          {/* Icon */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${design.colors.primary}30, ${design.colors.primary}50)`,
              border: `2px solid ${design.colors.primary}60`,
            }}
          >
            <span className="text-2xl">{icon}</span>
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-base truncate">{meta.name}</h3>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-semibold"
                style={{ color: design.colors.primary }}
              >
                {meta.kind}
              </span>
              <span className="text-gray-400">•</span>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: currentStatus.color }}
                />
                <span className="text-xs text-gray-600">{currentStatus.label}</span>
              </div>
            </div>
          </div>

          {/* Delete button */}
          <Button
            danger
            size="small"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={onDelete}
            className="shadow-sm hover:shadow-md transition-all"
          />
        </div>

        {/* Progress bar */}
        {meta.runtime.status === 'running' && meta.runtime.progress > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium">Progress</span>
              <span className="font-bold text-gray-700">{meta.runtime.progress}%</span>
            </div>
            <Progress
              percent={meta.runtime.progress}
              strokeColor={{
                '0%': design.colors.primary,
                '100%': design.colors.secondary,
              }}
              showInfo={false}
              size="small"
            />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        className="flex-1 overflow-hidden"
        tabBarStyle={{ paddingLeft: '20px', paddingRight: '20px', marginBottom: 0 }}
      >
        {/* Properties Tab */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Properties
            </span>
          }
          key="properties"
        >
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {/* Basic info */}
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">
                  Node Name
                </span>
                <Input
                  value={meta.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  placeholder="Enter node name"
                  className="rounded-lg"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">
                  Node Type
                </span>
                <Select
                  value={meta.kind}
                  onChange={(v: BrainCellKind) => onChange({ kind: v })}
                  className="w-full"
                  popupClassName="rounded-lg"
                >
                  {KINDS.map((k) => (
                    <Select.Option key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <span>{getNodeIcon(k)}</span>
                        <span className="font-medium">{k}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5 block">
                  Description
                </span>
                <TextArea
                  value={meta.description ?? ''}
                  onChange={(e) => onChange({ description: e.target.value })}
                  placeholder="Describe this node's purpose..."
                  rows={3}
                  showCount
                  maxLength={200}
                  className="rounded-lg"
                />
              </label>
            </div>

            {/* Parameters */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Parameters
                </span>
                <Button
                  type="dashed"
                  size="small"
                  icon={<Plus className="w-3 h-3" />}
                  onClick={() =>
                    onChange({ params: [...(meta.params ?? []), { key: '', value: '' }] })
                  }
                >
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {meta.params?.map((p, idx) => (
                  <div key={idx} className="flex gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
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
                      icon={<Minus className="w-3 h-3" />}
                      onClick={() => {
                        const next = meta.params.filter((_, i) => i !== idx);
                        onChange({ params: next });
                      }}
                    />
                  </div>
                ))}

                {(!meta.params || meta.params.length === 0) && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No parameters configured
                  </div>
                )}
              </div>
            </div>

            {/* Runtime settings */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide block">
                Runtime Settings
              </span>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Breakpoint</span>
                </div>
                <Switch
                  size="small"
                  checked={!!meta.runtime.breakpoint}
                  onChange={(v) => onChange({ runtime: { ...meta.runtime, breakpoint: v } as any })}
                />
              </div>
            </div>

            {/* Internal view */}
            {onEnterInternalView && (
              <div className="pt-4 border-t border-gray-100">
                <Button
                  type="primary"
                  icon={<Eye className="w-4 h-4" />}
                  onClick={() => onEnterInternalView(selected.id)}
                  className="w-full shadow-md hover:shadow-lg transition-all"
                  style={{
                    background: `linear-gradient(135deg, ${design.colors.primary}, ${design.colors.secondary})`,
                    border: 'none',
                  }}
                >
                  Enter Internal View
                </Button>
              </div>
            )}
          </div>
        </TabPane>

        {/* Ports Tab */}
        <TabPane
          tab={
            <span className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5" />
              Ports
            </span>
          }
          key="ports"
        >
          <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {/* Inputs */}
            <div>
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">
                Input Ports ({meta.inputs?.length || 0})
              </span>
              <div className="space-y-2">
                {meta.inputs?.map((port) => (
                  <div
                    key={port.id}
                    className="p-3 rounded-lg border-2 bg-blue-50"
                    style={{ borderColor: port.io === 'data' ? '#3b82f6' : '#8b5cf6' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800">{port.label}</span>
                      <Tag color={port.io === 'data' ? 'blue' : 'purple'} className="text-xs">
                        {port.io}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-600">ID: {port.id}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Outputs */}
            <div className="pt-4 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">
                Output Ports ({meta.outputs?.length || 0})
              </span>
              <div className="space-y-2">
                {meta.outputs?.map((port) => (
                  <div
                    key={port.id}
                    className="p-3 rounded-lg border-2 bg-orange-50"
                    style={{ borderColor: port.io === 'data' ? '#f97316' : '#ec4899' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm text-gray-800">{port.label}</span>
                      <Tag color={port.io === 'data' ? 'orange' : 'pink'} className="text-xs">
                        {port.io}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-600">ID: {port.id}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </div>
  );
});

ModernInspector.displayName = 'ModernInspector';
