import { useState } from "react";
import { Button, Card, Input, Select, Switch, Form, Typography, Tabs, Collapse, Tag, InputNumber } from "antd";
import TextArea from "antd/es/input/TextArea";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
import { Layers, Trash2, ChevronDown, ChevronUp, Settings, Shield, Database, Wifi, Plus, Minus, Eye } from "lucide-react";
import { Node } from "reactflow";
import { BrainCellMeta, BrainCellKind, AbilityConfig, PolicyConfig, KnowledgeConfig, CommunicationConfig } from '../utils/types';
import { KINDS } from '../utils/constants';

interface InspectorProps {
  selected?: Node<BrainCellMeta> | null;
  onChange: (next: Partial<BrainCellMeta>) => void;
  onDelete: () => void;
  onEnterInternalView?: (nodeId: string) => void;
}

export function Inspector({ selected, onChange, onDelete, onEnterInternalView }: InspectorProps) {
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
        <Tabs defaultActiveKey="basic" size="small" className="mt-2">
          <TabPane
            tab={
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                基本配置
              </span>
            }
            key="basic"
          >
            <div className="space-y-4">
              {/* 基本信息表单 */}
              <Card size="small" className="border-gray-200">
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

              {/* 参数配置 */}
              <Card size="small" title="参数配置" className="border-gray-200">
                <div className="space-y-3">
                  {meta.params?.map((p, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <Form.Item label="参数名" className="mb-0 flex-1">
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
                      <Form.Item label="参数值" className="mb-0 flex-1">
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
                      <Button
                        type="text"
                        size="small"
                        icon={<Minus className="h-3 w-3" />}
                        onClick={() => {
                          const next = meta.params.filter((_, i) => i !== idx);
                          onChange({ params: next });
                        }}
                        className="text-red-500 hover:text-red-700 mb-0"
                      />
                    </div>
                  ))}

                  <Button
                    type="dashed"
                    size="small"
                    onClick={() => onChange({ params: [...(meta.params ?? []), { key: "", value: "" }] })}
                    icon={<Plus className="h-3 w-3" />}
                    className="w-full"
                    block
                  >
                    添加参数
                  </Button>
                </div>
              </Card>

              {/* 运行状态 */}
              <Card size="small" title="运行状态" className="border-gray-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">当前状态</span>
                    <Tag color={
                      meta.runtime.status === 'running' ? 'green' :
                      meta.runtime.status === 'error' ? 'red' : 'default'
                    }>
                      {meta.runtime.status === 'running' ? '运行中' :
                       meta.runtime.status === 'error' ? '错误' : '空闲'}
                    </Tag>
                  </div>
                  {meta.runtime.progress > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">进度</span>
                      <span className="text-sm font-medium">{meta.runtime.progress}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">断点调试</span>
                    <Switch
                      size="small"
                      checked={!!meta.runtime.breakpoint}
                      onChange={(v) => onChange({ runtime: { ...meta.runtime, breakpoint: v } as any })}
                    />
                  </div>
                </div>
              </Card>

              {/* 内部视图入口 */}
              {onEnterInternalView && (
                <Card size="small" title="内部架构" className="border-gray-200">
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600">
                      查看和编辑此BrainCell的内部组件架构、能力配置和数据流。
                    </div>
                    <Button
                      type="primary"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => onEnterInternalView(selected!.id)}
                      className="w-full"
                    >
                      进入内部视图
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </TabPane>

          <TabPane
            tab={
              <span className="flex items-center gap-1">
                <Settings className="h-3 w-3" />
                能力配置
              </span>
            }
            key="abilities"
          >
            <div className="space-y-3">
              {meta.abilities?.map((ability, idx) => (
                <Card key={idx} size="small" className="border-blue-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Text strong className="text-blue-700">{ability.type}</Text>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag color={ability.enabled ? "green" : "red"} size="small">
                          {ability.enabled ? "启用" : "禁用"}
                        </Tag>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={ability.enabled}
                      onChange={(enabled) => {
                        const next = [...(meta.abilities || [])];
                        next[idx] = { ...next[idx], enabled };
                        onChange({ abilities: next });
                      }}
                    />
                  </div>
                  <Collapse size="small" ghost>
                    <Panel header="参数配置" key="params">
                      <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                        {JSON.stringify(ability.parameters, null, 2)}
                      </div>
                    </Panel>
                    {ability.constraints && (
                      <Panel header="约束条件" key="constraints">
                        <div className="text-xs font-mono bg-gray-50 p-2 rounded">
                          {JSON.stringify(ability.constraints, null, 2)}
                        </div>
                      </Panel>
                    )}
                  </Collapse>
                </Card>
              ))}
            </div>
          </TabPane>

          <TabPane
            tab={
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                策略配置
              </span>
            }
            key="policies"
          >
            <div className="space-y-3">
              {meta.policies?.map((policy, idx) => (
                <Card key={idx} size="small" className="border-orange-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Text strong className="text-orange-700">{policy.name}</Text>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag color="blue" size="small">{policy.type}</Tag>
                        <Tag color={policy.enabled ? "green" : "red"} size="small">
                          {policy.enabled ? "启用" : "禁用"}
                        </Tag>
                        <Tag color="purple" size="small">优先级: {policy.priority}</Tag>
                      </div>
                    </div>
                    <Switch
                      size="small"
                      checked={policy.enabled}
                      onChange={(enabled) => {
                        const next = [...(meta.policies || [])];
                        next[idx] = { ...next[idx], enabled };
                        onChange({ policies: next });
                      }}
                    />
                  </div>
                  <Collapse size="small" ghost>
                    <Panel header={`规则 (${policy.rules.length})`} key="rules">
                      {policy.rules.map((rule, ruleIdx) => (
                        <div key={ruleIdx} className="mb-2 p-2 bg-gray-50 rounded text-xs">
                          <div><strong>条件:</strong> {rule.condition}</div>
                          <div><strong>动作:</strong> <Tag size="small" color="red">{rule.action}</Tag></div>
                          {rule.parameters && (
                            <div><strong>参数:</strong> {JSON.stringify(rule.parameters)}</div>
                          )}
                        </div>
                      ))}
                    </Panel>
                  </Collapse>
                </Card>
              ))}
            </div>
          </TabPane>

          {meta.knowledge && (
            <TabPane
              tab={
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  知识配置
                </span>
              }
              key="knowledge"
            >
              <div className="space-y-3">
                <Card size="small" title="数据源" className="border-purple-200">
                  {meta.knowledge.sources.map((source, idx) => (
                    <div key={idx} className="mb-2 p-2 bg-purple-50 rounded">
                      <div className="flex justify-between items-center">
                        <Text strong className="text-purple-700">{source.name}</Text>
                        <Tag color="purple" size="small">{source.type}</Tag>
                      </div>
                      {source.endpoint && (
                        <Text className="text-xs text-gray-600">端点: {source.endpoint}</Text>
                      )}
                    </div>
                  ))}
                </Card>

                <Card size="small" title="索引配置" className="border-purple-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">启用索引:</span>
                      <Tag color={meta.knowledge.indexing.enabled ? "green" : "red"} size="small">
                        {meta.knowledge.indexing.enabled ? "是" : "否"}
                      </Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">策略:</span>
                      <Tag color="blue" size="small">{meta.knowledge.indexing.strategy}</Tag>
                    </div>
                    {meta.knowledge.indexing.dimensions && (
                      <div className="flex justify-between">
                        <span className="text-sm">维度:</span>
                        <span className="text-sm font-mono">{meta.knowledge.indexing.dimensions}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card size="small" title="缓存配置" className="border-purple-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">启用缓存:</span>
                      <Tag color={meta.knowledge.caching.enabled ? "green" : "red"} size="small">
                        {meta.knowledge.caching.enabled ? "是" : "否"}
                      </Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">TTL:</span>
                      <span className="text-sm font-mono">{meta.knowledge.caching.ttl}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">最大大小:</span>
                      <span className="text-sm font-mono">{meta.knowledge.caching.maxSize}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabPane>
          )}

          {meta.communication && (
            <TabPane
              tab={
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  通信配置
                </span>
              }
              key="communication"
            >
              <div className="space-y-3">
                <Card size="small" title="协议配置" className="border-green-200">
                  {meta.communication.protocols.map((protocol, idx) => (
                    <div key={idx} className="mb-2 p-2 bg-green-50 rounded">
                      <div className="flex justify-between items-center">
                        <Text strong className="text-green-700">{protocol.type.toUpperCase()}</Text>
                        <Tag color={protocol.enabled ? "green" : "red"} size="small">
                          {protocol.enabled ? "启用" : "禁用"}
                        </Tag>
                      </div>
                      <div className="text-xs font-mono text-gray-600 mt-1">
                        {JSON.stringify(protocol.config)}
                      </div>
                    </div>
                  ))}
                </Card>

                <Card size="small" title="传输配置" className="border-green-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">序列化:</span>
                      <Tag color="blue" size="small">{meta.communication.serialization}</Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">压缩:</span>
                      <Tag color={meta.communication.compression ? "green" : "red"} size="small">
                        {meta.communication.compression ? "启用" : "禁用"}
                      </Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">加密:</span>
                      <Tag color={meta.communication.encryption.enabled ? "green" : "red"} size="small">
                        {meta.communication.encryption.enabled ? "启用" : "禁用"}
                      </Tag>
                    </div>
                  </div>
                </Card>

                <Card size="small" title="重试策略" className="border-green-200">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">最大重试:</span>
                      <span className="text-sm font-mono">{meta.communication.retryPolicy.maxRetries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">退避策略:</span>
                      <Tag color="orange" size="small">{meta.communication.retryPolicy.backoff}</Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">初始延迟:</span>
                      <span className="text-sm font-mono">{meta.communication.retryPolicy.initialDelay}ms</span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabPane>
          )}
        </Tabs>
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