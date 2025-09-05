import React, { useMemo, memo, useState, useEffect } from 'react';
import { Typography, Empty } from 'antd';
import { Activity } from 'lucide-react';
import useStore from '@Store/notebookStore';
import { useAIAgentStore, AgentType, ActionItem, EVENT_TYPES } from '@Store/AIAgentStore';
import EventIcon from '../Components/EventIcon';
import ExpandableText from '../Components/ExpandableText';
import useDebounce from './useDebounce';

const { Text } = Typography;


// Real-time timer component for processing actions
const ProcessingTimer = memo(({ startTime, isProcessing }: { startTime: string; isProcessing: boolean }) => {
  const [elapsed, setElapsed] = useState(0);
  const [finalElapsed, setFinalElapsed] = useState<number | null>(null);

  useEffect(() => {
    // Try to parse timestamp - handle both ISO strings and time strings
    let startTimestamp: number;
    
    if (!startTime) {
      return;
    }
    
    // If it's just a time string like "14:30:25", use today's date
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(startTime)) {
      const today = new Date();
      const [hours, minutes, seconds] = startTime.split(':').map(Number);
      today.setHours(hours, minutes, seconds, 0);
      startTimestamp = today.getTime();
    } else {
      // Try to parse as full date/timestamp
      startTimestamp = new Date(startTime).getTime();
    }
    
    // Validate timestamp
    if (isNaN(startTimestamp)) {
      console.warn('Invalid timestamp in ProcessingTimer:', startTime);
      return;
    }
    
    const updateElapsed = () => {
      const now = Date.now();
      const elapsedMs = now - startTimestamp;
      const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      setElapsed(elapsedSeconds);
    };

    updateElapsed(); // Initial update
    
    // Only continue updating if still processing
    if (isProcessing) {
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    } else {
      // If not processing, capture the final elapsed time
      if (finalElapsed === null) {
        setFinalElapsed(elapsed);
      }
    }
  }, [startTime, isProcessing, elapsed, finalElapsed]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Use final elapsed time if processing has ended, otherwise use current elapsed
  const displayTime = !isProcessing && finalElapsed !== null ? finalElapsed : elapsed;

  return (
    <Text className="text-gray-400 text-xs">
      ({formatTime(displayTime)})
    </Text>
  );
});

// Simplified activity item component matching QA style
const ActivityItem = memo(({ action, index, totalCount }: { action: ActionItem; index: number; totalCount: number }) => {
  const agentName = action.agentName || action.agentType || 'Agent';
  const taskDescription = action.taskDescription || action.content;
  
  return (
    <div className="w-full mb-3">
      <div
        className={`
          relative p-4 rounded-lg shadow-sm w-full transition-all duration-300 min-w-0
          ${index === 0
            ? 'bg-white/20 ring-1 ring-theme-200'
            : action.onProcess
              ? 'bg-blue-50 text-left hover:bg-blue-100'
              : action.errorMessage
                ? 'bg-red-50 text-left hover:bg-red-100'
                : 'bg-gray-50 text-left hover:bg-gray-100'
          }
        `}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-700">
            [{totalCount - index}]
          </span>
          <EventIcon
            type={action.type}
            onProcess={action.onProcess}
          />
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            action.onProcess
              ? 'bg-blue-100 text-blue-700'
              : action.errorMessage
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
          }`}>
            {agentName}
          </span>
          
          {action.workflowContext?.stage && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {action.workflowContext.stage}
            </span>
          )}
          
          <span className="text-xs text-gray-500">{action.timestamp}</span>
          
          {(action.onProcess || (!action.onProcess && action.result)) && (
            <ProcessingTimer startTime={action.timestamp} isProcessing={action.onProcess} />
          )}
        </div>

        <div className="text-left break-words overflow-wrap-anywhere min-w-0">
          {action.onProcess && (!taskDescription || taskDescription.trim() === '') ? (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{agentName} is processing...</span>
            </div>
          ) : (
            <ExpandableText text={taskDescription} maxLines={3} />
          )}
        </div>

        {action.errorMessage && (
          <div className="mt-2 text-xs text-red-600">
            ❌ Error: {action.errorMessage}
          </div>
        )}

        {action.result && !action.errorMessage && (
          <div className="mt-2 text-xs text-green-600">
            ✅ {action.result.substring(0, 100)}{action.result.length > 100 && '...'}
          </div>
        )}
      </div>
    </div>
  );
});

const ActivityBar: React.FC = () => {
  const { viewMode, getCurrentStepCellsIDs } = useStore();
  const { actions } = useAIAgentStore();
  
  // Debounce actions to reduce re-renders during rapid updates
  const debouncedActions = useDebounce(actions, 100);

  // Filter and display actions directly - optimized for performance
  const actionsToShow = useMemo(() => {
    if (!debouncedActions || debouncedActions.length === 0) return [];
    
    // Cache getCurrentStepCellsIDs result to avoid repeated calls
    const currentStepCellsIDs = viewMode === 'step' ? getCurrentStepCellsIDs() : null;
    
    // Pre-filter and reverse in one pass for better performance
    const filtered = [];
    for (let i = debouncedActions.length - 1; i >= 0; i--) {
      const action = debouncedActions[i];
      
      // Early return for items without viewMode
      if (!action.viewMode) {
        filtered.push(action);
        continue;
      }
      
      // Skip if viewMode doesn't match
      if (action.viewMode !== viewMode) continue;
      
      // For step mode, check if cellId is in current step
      if (viewMode === 'step') {
        if (
          currentStepCellsIDs &&
          typeof action.cellId === 'string' &&
          currentStepCellsIDs.includes(action.cellId)
        ) {
          filtered.push(action);
        }
      } else {
        filtered.push(action);
      }
    }
    
    return filtered;
  }, [debouncedActions, viewMode, getCurrentStepCellsIDs]);

  if (actionsToShow.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 flex flex-col items-center">
        <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm mx-auto text-gray-500">No Recent Activity</p>
        <p className="text-xs mt-1 mx-auto text-gray-500">AI Agent activities will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-4">
      {actionsToShow.map((action, index) => (
        <ActivityItem key={action.id} action={action} index={index} totalCount={actionsToShow.length} />
      ))}
    </div>
  );
};

export default memo(ActivityBar);