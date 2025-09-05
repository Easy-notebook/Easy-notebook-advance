import React from 'react';
import { Bot, FileText, Users } from 'lucide-react';
import { Card, Space, Tag, Typography } from 'antd';

const { Title, Text } = Typography;

interface WorkspaceAgentsProps {
  workspaceId: string;
}

const WorkspaceAgents: React.FC<WorkspaceAgentsProps> = ({ workspaceId }) => {
  const agentData = [
    {
      id: 1,
      title: 'Document Assistant',
      icon: <FileText className="w-4 h-4" />,
      status: 'Coming Soon'
    },
    {
      id: 2,
      title: 'Workflow Helper',
      icon: <Users className="w-4 h-4" />,
      status: 'Coming Soon'
    }
  ];

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-theme-600" />
        <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
          Workspace Agents
        </Title>
      </div>
      
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {agentData.map((agent) => (
          <Card
            key={agent.id}
            size="small"
            hoverable
            style={{ backgroundColor: '#fafafa' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {agent.icon}
                <Text>{agent.title}</Text>
              </div>
              <Tag color="orange" size="small">
                {agent.status}
              </Tag>
            </div>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default WorkspaceAgents;