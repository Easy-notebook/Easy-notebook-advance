import React, { useState } from 'react';
import { Modal, List, Button, Input, Popconfirm, message } from 'antd';
import { FileText, Trash2, Calendar } from 'lucide-react';
import { GraphData } from './types';

interface GraphManagerProps {
  visible: boolean;
  onClose: () => void;
  savedGraphs: GraphData[];
  onLoadGraph: (id: string) => void;
  onDeleteGraph: (id: string) => void;
}

const GraphManager: React.FC<GraphManagerProps> = ({
  visible,
  onClose,
  savedGraphs,
  onLoadGraph,
  onDeleteGraph,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGraphs = savedGraphs.filter(graph =>
    graph.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (graph.description && graph.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLoad = (id: string) => {
    onLoadGraph(id);
    onClose();
    message.success('图表已加载');
  };

  const handleDelete = (id: string) => {
    onDeleteGraph(id);
    message.success('图表已删除');
  };

  return (
    <Modal
      title="图表管理器"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={600}
    >
      <div className="space-y-4">
        <Input.Search
          placeholder="搜索图表..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />

        <List
          itemLayout="horizontal"
          dataSource={filteredGraphs}
          locale={{ emptyText: '暂无保存的图表' }}
          renderItem={(graph) => (
            <List.Item
              actions={[
                <Button type="primary" size="small" onClick={() => handleLoad(graph.id)}>
                  加载
                </Button>,
                <Popconfirm
                  title="确定要删除这个图表吗？"
                  onConfirm={() => handleDelete(graph.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger size="small" icon={<Trash2 className="h-4 w-4" />}>
                    删除
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                avatar={<FileText className="h-6 w-6 text-blue-500" />}
                title={
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{graph.name}</span>
                  </div>
                }
                description={
                  <div className="space-y-1">
                    {graph.description && (
                      <p className="text-gray-600 text-sm">{graph.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      {new Date(graph.lastModified).toLocaleString('zh-CN')}
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </div>
    </Modal>
  );
};

export default GraphManager;