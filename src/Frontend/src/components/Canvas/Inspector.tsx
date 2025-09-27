import { useState } from "react";
import { Button, Card, Input, Select, Switch, Form, Typography } from "antd";
import TextArea from "antd/es/input/TextArea";

const { Title } = Typography;
import { Layers, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Node } from "reactflow";
import { BrainCellMeta, BrainCellKind } from './types';
import { KINDS } from './constants';

interface InspectorProps {
  selected?: Node<BrainCellMeta> | null;
  onChange: (next: Partial<BrainCellMeta>) => void;
  onDelete: () => void;
}

export function Inspector({ selected, onChange, onDelete }: InspectorProps) {
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!selected) {
    return (
      <Card
        className="h-full"
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-slate-200">
                <Layers className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <span className="font-semibold text-gray-800">属性检查器</span>
                <div className="text-xs text-gray-500">选择节点查看详情</div>
              </div>
            </div>
            <Button
              type="text"
              size="small"
              onClick={toggleExpanded}
              className="p-1"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        }
        bodyStyle={{
          padding: isExpanded ? '24px' : '16px',
          height: isExpanded ? 'calc(100% - 64px)' : '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
      >
        {isExpanded ? (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
              <Layers className="h-8 w-8 text-gray-400" />
            </div>
            <div>
              <h4 className="font-medium text-gray-700">未选择节点</h4>
              <p className="text-sm text-gray-500 mt-1">
                点击画布上的节点来查看和编辑其属性
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-sm text-gray-600">点击展开查看详情</div>
          </div>
        )}
      </Card>
    );
  }

  const meta = selected.data;

  return (
    <Card
      className="h-full"
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-800">节点属性</span>
              <div className="text-xs text-gray-500 truncate">{meta.kind} · {meta.name}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              onClick={toggleExpanded}
              className="p-1"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {isExpanded && (
              <Button
                danger
                size="small"
                onClick={onDelete}
                className="flex items-center gap-1 border-red-300 hover:border-red-500"
              >
                <Trash2 className="h-3 w-3" />
                删除
              </Button>
            )}
          </div>
        </div>
      }
      bodyStyle={{
        padding: isExpanded ? '16px' : '12px',
        height: isExpanded ? 'calc(100% - 64px)' : '120px',
        overflow: isExpanded ? 'auto' : 'hidden',
        transition: 'all 0.3s ease'
      }}
    >
      {isExpanded ? (
        <div className="space-y-4">
          {/* 基本信息表单 */}
          <Card
            size="small"
            title={
              <div className="flex items-center gap-2">
                🏷️ <span>基本信息</span>
              </div>
            }
          >
            <Form layout="vertical" size="small">
              <Form.Item label="节点名称" className="mb-3">
                <Input
                  value={meta.name}
                  onChange={e => onChange({ name: e.target.value })}
                  placeholder="输入节点名称"
                />
              </Form.Item>

              <Form.Item label="节点类型" className="mb-3">
                <Select
                  value={meta.kind}
                  onChange={(v: BrainCellKind) => onChange({ kind: v })}
                  placeholder="选择节点类型"
                  className="w-full"
                >
                  {KINDS.map(k => (
                    <Select.Option key={k} value={k}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{k}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item label="节点描述" className="mb-0">
                <TextArea
                  value={meta.description ?? ""}
                  onChange={e => onChange({ description: e.target.value })}
                  placeholder="描述此节点的功能和用途..."
                  rows={3}
                  showCount
                  maxLength={200}
                />
              </Form.Item>
            </Form>
          </Card>

          {/* 参数配置卡片 */}
          <Card
            size="small"
            title={
              <div className="flex items-center gap-2">
                ⚙️ <span>参数配置</span>
              </div>
            }
          >
            <div className="space-y-3">
              {meta.params?.map((p, idx) => (
                <Card key={idx} size="small" className="bg-gray-50">
                  <Form layout="vertical" size="small">
                    <div className="grid grid-cols-2 gap-3">
                      <Form.Item label="参数名" className="mb-2">
                        <Input
                          value={p.key}
                          onChange={e => {
                            const next = [...meta.params];
                            next[idx] = { ...next[idx], key: e.target.value };
                            onChange({ params: next });
                          }}
                          placeholder="参数键名"
                          size="small"
                        />
                      </Form.Item>
                      <Form.Item label="参数值" className="mb-2">
                        <Input
                          value={p.value}
                          onChange={e => {
                            const next = [...meta.params];
                            next[idx] = { ...next[idx], value: e.target.value };
                            onChange({ params: next });
                          }}
                          placeholder="参数值"
                          size="small"
                        />
                      </Form.Item>
                    </div>
                  </Form>
                </Card>
              ))}

              <Button
                type="dashed"
                size="small"
                onClick={() => onChange({ params: [...(meta.params ?? []), { key: "", value: "" }] })}
                className="w-full"
                block
              >
                + 添加参数
              </Button>
            </div>
          </Card>

          {/* 调试设置卡片 */}
          <Card
            size="small"
            title={
              <div className="flex items-center gap-2">
                🔧 <span>调试设置</span>
              </div>
            }
          >
            <Form layout="vertical" size="small">
              <Form.Item label="断点调试" className="mb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm">启用断点</div>
                    <div className="text-xs text-gray-500">在此节点暂停执行</div>
                  </div>
                  <Switch
                    checked={!!meta.runtime.breakpoint}
                    onChange={(v) => onChange({ runtime: { ...meta.runtime, breakpoint: v } as any })}
                  />
                </div>
              </Form.Item>
            </Form>
          </Card>

          {/* 运行状态卡片 */}
          <Card
            size="small"
            title={
              <div className="flex items-center gap-2">
                📊 <span>运行状态</span>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">当前状态</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  meta.runtime.status === 'running' ? 'bg-green-100 text-green-700' :
                  meta.runtime.status === 'error' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {meta.runtime.status === 'running' ? '运行中' :
                   meta.runtime.status === 'error' ? '错误' : '空闲'}
                </span>
              </div>
              {meta.runtime.progress > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">进度</span>
                  <span className="text-sm font-medium">{meta.runtime.progress}%</span>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 收起状态的简化信息 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">类型</span>
            <span className="text-sm font-medium">{meta.kind}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">状态</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              meta.runtime.status === 'running' ? 'bg-green-100 text-green-700' :
              meta.runtime.status === 'error' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {meta.runtime.status === 'running' ? '运行中' :
               meta.runtime.status === 'error' ? '错误' : '空闲'}
            </span>
          </div>
          {meta.params && meta.params.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">参数</span>
              <span className="text-sm text-gray-500">{meta.params.length} 个</span>
            </div>
          )}
          <div className="text-center pt-2">
            <div className="text-xs text-gray-500">点击展开查看详细属性</div>
          </div>
        </div>
      )}
    </Card>
  );
}