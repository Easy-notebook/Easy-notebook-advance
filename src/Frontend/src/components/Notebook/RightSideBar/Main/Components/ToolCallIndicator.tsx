import React from 'react';
import { Image, Video, Code, Brain, PlayCircle, Users, Settings, Zap, Bot } from 'lucide-react';
import { Card, Space, Tag } from 'antd';

export interface ToolCallProps {
  type: string;
  content?: string;
  agent?: string;
}

const ToolCallIndicator: React.FC<ToolCallProps> = ({ type, content, agent }) => {
  const getToolIcon = (toolType: string) => {
    switch (toolType.toLowerCase()) {
      case 'draw-image':
      case 'trigger_image_generation':
        return <Image className="w-4 h-4 text-purple-600" />;
      case 'create-video':
        return <Video className="w-4 h-4 text-indigo-600" />;
      case 'add-code':
      case 'exec-code':
        return <Code className="w-4 h-4 text-green-600" />;
      case 'thinking':
        return <Brain className="w-4 h-4 text-orange-600" />;
      case 'call-execute':
        return <PlayCircle className="w-4 h-4 text-theme-600" />;
      case 'communicate':
        return <Users className="w-4 h-4 text-teal-600" />;
      case 'remember':
        return <Settings className="w-4 h-4 text-gray-600" />;
      default:
        return <Zap className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getToolLabel = (toolType: string) => {
    const labels: Record<string, string> = {
      'draw-image': '🎨 Image Generation',
      'trigger_image_generation': '🎨 Image Generation',
      'create-video': '🎬 Video Creation',
      'add-code': '💻 Code Writing',
      'exec-code': '▶️ Code Execution',
      'thinking': '🤔 Reasoning',
      'call-execute': '⚡ Execute',
      'communicate': '💬 Agent Communication',
      'remember': '💾 Memory Update',
      'update-title': '📝 Update Title',
      'new-chapter': '📚 New Chapter',
      'new-section': '📄 New Section',
    };
    return labels[toolType] || `🔧 ${toolType}`;
  };

  return (
    <Card 
      size="small" 
      className="bg-gradient-to-r from-theme-50 to-purple-50 border-theme-100"
      style={{ borderRadius: '8px' }}
    >
      <Space size="small" wrap>
        <Space size={4}>
          {getToolIcon(type)}
          <span className="text-sm font-medium text-gray-700">
            {getToolLabel(type)}
          </span>
        </Space>
        
        {agent && (
          <Tag 
            icon={<Bot className="w-3 h-3" />}
            color="blue"
            size="small"
          >
            {agent}
          </Tag>
        )}
        
        {content && content.length > 50 && (
          <Tag color="default" size="small">
            {content.substring(0, 50)}...
          </Tag>
        )}
      </Space>
    </Card>
  );
};

export default ToolCallIndicator;


