import React, { useMemo, memo } from 'react';
import { Space, Tag, Empty, Typography, Badge } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import useStore from '@Store/notebookStore';
import { useAIAgentStore } from '@Store/AIAgentStore';
import EventIcon from '../Components/EventIcon';
import ExpandableText from '../Components/ExpandableText';
import useDebounce from './useDebounce';

const { Text } = Typography;

// Memoized activity item component for better performance
const ActivityItem = memo(({ action, index }: { action: any; index: number }) => (
  <div className="p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-200">
    <div className="flex items-start gap-3">
      <EventIcon
        type={action.type}
        onProcess={action.onProcess}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Text className="text-sm font-medium">
            {action.type || 'Action'}
          </Text>
          {action.onProcess ? (
            <Badge status="processing" text="Running" />
          ) : (
            <Badge status="success" text="Completed" />
          )}
          <Text type="secondary" className="text-xs">
            {action.timestamp}
          </Text>
        </div>
        
        {action.content && (
          <div className="mb-2">
            <ExpandableText text={action.content} maxLines={2} />
          </div>
        )}
        
        {action.result && (
          <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
            <ExpandableText text={action.result} maxLines={2} />
          </div>
        )}
      </div>
    </div>
  </div>
));

const ActivityBar: React.FC = () => {
  const { viewMode, getCurrentStepCellsIDs } = useStore();
  const { actions } = useAIAgentStore();
  
  // Debounce actions to reduce re-renders during rapid updates
  const debouncedActions = useDebounce(actions, 100);

  // Filter and display actions directly - optimized for performance
  const actionsToShow = useMemo(() => {
    if (!debouncedActions || debouncedActions.length === 0) return [];
    
    // Cache getCurrentStepCellsIDs result to avoid repeated calls
    const currentStepCellsIDs = getCurrentStepCellsIDs();
    
    // Pre-filter and reverse in one pass for better performance
    const filtered = [];
    for (let i = debouncedActions.length - 1; i >= 0; i--) {
      const action = debouncedActions[i];
      
      // Early exit if no viewMode match
      if (!viewMode || action.viewMode !== viewMode) continue;
      
      if (
        (viewMode === 'step' && currentStepCellsIDs.includes(action.cellId ?? '')) ||
        (viewMode === 'complete' || viewMode === 'create' || viewMode === 'dslc')
      ) {
        filtered.push(action);
      }
    }
    
    return filtered;
  }, [debouncedActions, viewMode, getCurrentStepCellsIDs]);

  if (actionsToShow.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical">
            <Text type="secondary">No Recent Activity</Text>
            <Text type="secondary" className="text-xs">
              Agent activities will appear here
            </Text>
          </Space>
        }
      />
    );
  }

  return (
    <div className="space-y-3 py-3">
      {actionsToShow.map((action, index) => (
        <ActivityItem key={action.id} action={action} index={index} />
      ))}
    </div>
  );
};

export default memo(ActivityBar);