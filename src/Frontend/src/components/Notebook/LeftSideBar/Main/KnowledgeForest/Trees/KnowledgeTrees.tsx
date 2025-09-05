import React from 'react';
import { TreePine, Leaf, Sprout } from 'lucide-react';
import { Card, Space, Tag, Typography, Badge } from 'antd';

const { Title, Text } = Typography;

const KnowledgeTrees: React.FC = () => {
  const treeData = [
    {
      id: 1,
      title: 'Machine Learning',
      icon: <TreePine className="w-4 h-4 text-green-600" />,
      color: 'green',
      status: 'Coming Soon'
    },
    {
      id: 2,
      title: 'Data Science',
      icon: <Leaf className="w-4 h-4 text-green-500" />,
      color: 'green',
      status: 'Coming Soon'
    },
    {
      id: 3,
      title: 'Growing Seeds',
      icon: <Sprout className="w-4 h-4 text-green-400" />,
      color: 'green',
      status: 'Coming Soon'
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TreePine className="w-4 h-4 text-green-600" />
        <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
          Knowledge Trees
        </Title>
      </div>
      
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {treeData.map((tree) => (
          <Card
            key={tree.id}
            size="small"
            hoverable
            style={{ backgroundColor: '#f6ffed' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {tree.icon}
                <Text strong>{tree.title}</Text>
              </div>
              <Tag color="orange" size="small">
                {tree.status}
              </Tag>
            </div>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default KnowledgeTrees;