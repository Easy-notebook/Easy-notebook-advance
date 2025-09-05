import React, { useState, useMemo } from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Tag, 
  Button, 
  Collapse, 
  Empty,
  Badge,
  Tooltip
} from 'antd';
import { 
  Lightbulb, 
  Edit3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 建议类型枚举
export enum SuggestionType {
  INSIGHT = 'insight',
  IMPROVEMENT = 'improvement', 
  PLAN = 'plan',
  WARNING = 'warning'
}

// 建议优先级
export enum SuggestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 建议状态
export enum SuggestionStatus {
  NEW = 'new',
  VIEWED = 'viewed',
  APPLIED = 'applied',
  DISMISSED = 'dismissed'
}

// 建议数据接口
export interface AISuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  title: string;
  description: string;
  details?: string;
  relatedCellIds?: string[];
  timestamp: Date;
  estimatedImpact?: 'low' | 'medium' | 'high';
  actionItems?: string[];
  tags?: string[];
}

interface AISuggestionsProps {
  suggestions?: AISuggestion[];
  onApplySuggestion?: (suggestionId: string) => void;
  onDismissSuggestion?: (suggestionId: string) => void;
  onViewSuggestion?: (suggestionId: string) => void;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
  suggestions = [],
  onApplySuggestion,
  onDismissSuggestion,
  onViewSuggestion
}) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | SuggestionType>('all');

  // 获取建议类型图标
  const getSuggestionIcon = (type: SuggestionType) => {
    switch (type) {
      case SuggestionType.INSIGHT:
        return <Lightbulb className="w-4 h-4 text-yellow-600" />;
      case SuggestionType.IMPROVEMENT:
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      case SuggestionType.PLAN:
        return <Target className="w-4 h-4 text-green-600" />;
      case SuggestionType.WARNING:
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  // 获取建议类型标签颜色
  const getSuggestionColor = (type: SuggestionType) => {
    switch (type) {
      case SuggestionType.INSIGHT:
        return 'gold';
      case SuggestionType.IMPROVEMENT:
        return 'blue';
      case SuggestionType.PLAN:
        return 'green';
      case SuggestionType.WARNING:
        return 'red';
      default:
        return 'purple';
    }
  };

  // 获取优先级标签颜色
  const getPriorityColor = (priority: SuggestionPriority) => {
    switch (priority) {
      case SuggestionPriority.LOW:
        return 'default';
      case SuggestionPriority.MEDIUM:
        return 'orange';
      case SuggestionPriority.HIGH:
        return 'red';
      case SuggestionPriority.CRITICAL:
        return 'volcano';
      default:
        return 'default';
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: SuggestionStatus) => {
    switch (status) {
      case SuggestionStatus.NEW:
        return <Badge status="processing" />;
      case SuggestionStatus.VIEWED:
        return <Badge status="default" />;
      case SuggestionStatus.APPLIED:
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case SuggestionStatus.DISMISSED:
        return <Badge status="error" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 过滤建议
  const filteredSuggestions = useMemo(() => {
    if (filter === 'all') {
      return suggestions;
    }
    return suggestions.filter(suggestion => suggestion.type === filter);
  }, [suggestions, filter]);

  // 按优先级和时间排序
  const sortedSuggestions = useMemo(() => {
    return [...filteredSuggestions].sort((a, b) => {
      // 优先级排序
      const priorityOrder = {
        [SuggestionPriority.CRITICAL]: 4,
        [SuggestionPriority.HIGH]: 3,
        [SuggestionPriority.MEDIUM]: 2,
        [SuggestionPriority.LOW]: 1
      };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 时间排序（新的在前）
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [filteredSuggestions]);

  // 处理建议点击
  const handleSuggestionClick = (suggestionId: string) => {
    onViewSuggestion?.(suggestionId);
  };

  // 应用建议
  const handleApplySuggestion = (suggestionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onApplySuggestion?.(suggestionId);
  };

  // 忽略建议
  const handleDismissSuggestion = (suggestionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onDismissSuggestion?.(suggestionId);
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (suggestions.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            AI Suggestions
          </Title>
        </div>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No AI suggestions available"
          className="py-8"
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-600" />
        <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
          AI Suggestions ({suggestions.length})
        </Title>
      </div>

      {/* Filter buttons */}
      <div className="mb-4">
        <Space wrap>
          <Button
            size="small"
            type={filter === 'all' ? 'primary' : 'default'}
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            size="small"
            type={filter === SuggestionType.INSIGHT ? 'primary' : 'default'}
            icon={<Lightbulb className="w-3 h-3" />}
            onClick={() => setFilter(SuggestionType.INSIGHT)}
          >
            Insights
          </Button>
          <Button
            size="small"
            type={filter === SuggestionType.IMPROVEMENT ? 'primary' : 'default'}
            icon={<TrendingUp className="w-3 h-3" />}
            onClick={() => setFilter(SuggestionType.IMPROVEMENT)}
          >
            Improvements
          </Button>
          <Button
            size="small"
            type={filter === SuggestionType.PLAN ? 'primary' : 'default'}
            icon={<Target className="w-3 h-3" />}
            onClick={() => setFilter(SuggestionType.PLAN)}
          >
            Plans
          </Button>
          <Button
            size="small"
            type={filter === SuggestionType.WARNING ? 'primary' : 'default'}
            icon={<AlertCircle className="w-3 h-3" />}
            onClick={() => setFilter(SuggestionType.WARNING)}
          >
            Warnings
          </Button>
        </Space>
      </div>

      {/* 建议列表 */}
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {sortedSuggestions.map((suggestion) => (
          <Card
            key={suggestion.id}
            size="small"
            hoverable
            onClick={() => handleSuggestionClick(suggestion.id)}
            className={`${
              suggestion.status === SuggestionStatus.NEW ? 'border-blue-300 bg-blue-50' : ''
            }`}
          >
            <div className="space-y-2">
              {/* 头部信息 */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getSuggestionIcon(suggestion.type)}
                  <Title level={5} style={{ margin: 0, fontSize: '13px' }} className="truncate">
                    {suggestion.title}
                  </Title>
                  {getStatusIcon(suggestion.status)}
                </div>
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {formatTime(suggestion.timestamp)}
                </Text>
              </div>

              {/* 标签区域 */}
              <div className="flex items-center gap-1 flex-wrap">
                <Tag 
                  color={getSuggestionColor(suggestion.type)} 
                  size="small"
                  style={{ fontSize: '10px' }}
                >
                  {suggestion.type}
                </Tag>
                <Tag 
                  color={getPriorityColor(suggestion.priority)} 
                  size="small"
                  style={{ fontSize: '10px' }}
                >
                  {suggestion.priority}
                </Tag>
                {suggestion.estimatedImpact && (
                  <Tag color="cyan" size="small" style={{ fontSize: '10px' }}>
                    Impact: {suggestion.estimatedImpact}
                  </Tag>
                )}
              </div>

              {/* 描述 */}
              <Paragraph 
                style={{ margin: 0, fontSize: '12px', lineHeight: '1.4' }}
                ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
              >
                {suggestion.description}
              </Paragraph>

              {/* Action items */}
              {suggestion.actionItems && suggestion.actionItems.length > 0 && (
                <div className="space-y-1">
                  <Text strong style={{ fontSize: '11px' }}>Action Items:</Text>
                  <ul className="space-y-1 ml-4">
                    {suggestion.actionItems.map((item, index) => (
                      <li key={index} style={{ fontSize: '11px', lineHeight: '1.3' }}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              {suggestion.status === SuggestionStatus.NEW && (
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <Button
                    size="small"
                    type="text"
                    onClick={(e) => handleDismissSuggestion(suggestion.id, e)}
                    style={{ fontSize: '11px' }}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => handleApplySuggestion(suggestion.id, e)}
                    style={{ fontSize: '11px' }}
                  >
                    Apply
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </Space>
    </div>
  );
};

export default AISuggestions;