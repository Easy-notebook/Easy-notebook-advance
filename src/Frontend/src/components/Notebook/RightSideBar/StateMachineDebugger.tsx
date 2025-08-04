// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useWorkflowStateMachine, WORKFLOW_STATES, EVENTS } from '../../senario/DSLCanalysis/store/workflowStateMachine';
import { usePipelineStore } from '../../senario/DSLCanalysis/store/usePipelineStore';
import { 
  Settings, 
  ChevronDown, 
  Trash2, 
  Clock,
  ArrowRight,
  Activity,
  Cpu,
  RotateCcw,
  Play,
  Square,
  CheckCircle,
  XCircle,
  GitBranch,
  Timer,
  Download,
  Shuffle,
  Eye,
  Repeat
} from 'lucide-react';

const StateMachineDebugger: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [maxEntries, setMaxEntries] = useState(25);
  
  // Get state machine and pipeline state from their respective stores
  const stateMachine = useWorkflowStateMachine();
  const { workflowTemplate } = usePipelineStore();
  
  // Directly use and reverse the execution history for display. This is simpler and more robust.
  const displayedHistory = useMemo(() => {
    return [...stateMachine.executionHistory].reverse().slice(0, maxEntries);
  }, [stateMachine.executionHistory, maxEntries]);

  const clearHistory = () => {
    alert("Clearing display. The store's history remains until the page is reloaded or the FSM is reset.");
  };

  const getStateColor = (state: string) => {
    if (state.includes('COMPLETED')) return 'text-green-600';
    if (state.includes('RUNNING') || state.includes('EXECUTING')) return 'text-blue-600';
    if (state.includes('PENDING')) return 'text-orange-500';
    if (state.includes('ERROR') || state.includes('FAIL')) return 'text-red-600';
    if (state.includes('IDLE') || state.includes('CANCELLED')) return 'text-gray-500';
    return 'text-gray-800';
  };

  // Updated to match the new EVENTS constants
  const getEventIcon = (event: string) => {
    const icons: Record<string, React.ReactNode> = {
      [EVENTS.START_WORKFLOW]: <Play size={8} />,
      [EVENTS.START_STAGE]: <Play size={8} />,
      [EVENTS.START_STEP]: <Play size={8} />,
      [EVENTS.START_BEHAVIOR]: <Play size={8} />,
      [EVENTS.START_ACTION]: <Activity size={8} />,
      [EVENTS.COMPLETE_ACTION]: <CheckCircle size={8} />,
      [EVENTS.EVALUATE_BEHAVIOR]: <Eye size={8} />,
      [EVENTS.COMPLETE_BEHAVIOR]: <CheckCircle size={8} />,
      [EVENTS.COMPLETE_STEP]: <CheckCircle size={8} />,
      [EVENTS.COMPLETE_STAGE]: <CheckCircle size={8} />,
      [EVENTS.COMPLETE_WORKFLOW]: <CheckCircle size={8} />,
      [EVENTS.RETRY_BEHAVIOR]: <Repeat size={8} />,
      [EVENTS.NEXT_BEHAVIOR]: <ArrowRight size={8} />,
      [EVENTS.NEXT_STAGE]: <ArrowRight size={8} />,
      [EVENTS.UPDATE_WORKFLOW]: <Timer size={8} />,
      [EVENTS.UPDATE_STEP]: <Timer size={8} />,
      [EVENTS.FAIL]: <XCircle size={8} />,
      [EVENTS.CANCEL]: <Square size={8} />,
      [EVENTS.RESET]: <RotateCcw size={8} />,
    };
    return icons[event] || <GitBranch size={8} />;
  };

  // Rewritten to export data from the new FSM and pipeline stores
  const exportStateMachine = () => {
    const exportData = {
      exportTimestamp: new Date().toISOString(),
      
      // Current State Machine Status
      currentStatus: {
        currentState: stateMachine.currentState,
        context: stateMachine.context,
      },
      
      // Workflow Template from Pipeline Store
      workflowTemplate: workflowTemplate,
      
      // Full Execution History from FSM Store
      executionHistory: stateMachine.executionHistory,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `state-machine-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm mt-4" style={{
      fontFamily: 'ui-sans-serif, system-ui, sans-serif', 
      fontSize: '11px', 
      lineHeight: '1.4',
      borderColor: 'rgba(65, 184, 131, 0.2)'
    }}>
      {/* Header (UI Unchanged) */}
      <div 
        className="px-3 py-2 border-b cursor-pointer transition-all duration-200"
        style={{
          borderBottomColor: 'rgba(65, 184, 131, 0.2)',
          background: 'linear-gradient(135deg, rgba(65, 184, 131, 0.02), rgba(52, 144, 220, 0.02))'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu size={8} style={{color: '#41B883'}} />
            <h3 className="text-sm font-semibold" style={{
              background: 'linear-gradient(to right, #41B883, #3490DC, #6574CD)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent'
            }}>
              State Machine Debugger
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs" style={{color: '#35495E'}}>
              {stateMachine.executionHistory.length} events
            </span>
            <ChevronDown 
              size={8}
              className={`transform transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
              style={{color: '#41B883'}}
            />
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-3">
          {/* Current Status (Rewritten for new FSM structure) */}
          <div className="mb-3 p-3 rounded-md border" style={{
            background: 'linear-gradient(135deg, rgba(65, 184, 131, 0.04), rgba(52, 144, 220, 0.04))',
            borderColor: 'rgba(65, 184, 131, 0.15)'
          }}>
            <div className="flex items-center space-x-2 mb-2">
              <Activity size={8} style={{color: '#41B883'}} />
              <h4 className="text-xs font-semibold" style={{
                background: 'linear-gradient(to right, #41B883, #3490DC)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}>Current Status</h4>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1 col-span-2">
                <Shuffle size={8} style={{color: '#35495E'}} />
                <span style={{color: '#35495E', fontWeight: 'bold'}}>State:</span>
                <span className="ml-1 font-medium font-mono px-1.5 py-0.5 rounded" style={{
                    backgroundColor: 'rgba(101, 116, 205, 0.1)', 
                    color: '#6574CD'
                }}>
                  {stateMachine.currentState}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Square size={8} style={{color: '#35495E'}} />
                <span style={{color: '#35495E'}}>Stage:</span>
                <span className="ml-1 font-mono font-medium" style={{color: '#6574CD'}}>
                  {stateMachine.context.currentStageId || 'null'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Play size={8} style={{color: '#35495E'}} />
                <span style={{color: '#35495E'}}>Step:</span>
                <span className="ml-1 font-mono font-medium" style={{color: '#6574CD'}}>
                  {stateMachine.context.currentStepId || 'null'}
                </span>
              </div>
               <div className="flex items-center space-x-1">
                <Repeat size={8} style={{color: '#35495E'}} />
                <span style={{color: '#35495E'}}>Behavior:</span>
                <span className="ml-1 font-mono font-medium" style={{color: '#6574CD'}}>
                  {stateMachine.context.currentBehaviorId || 'null'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Timer size={8} style={{color: '#35495E'}} />
                <span style={{color: '#35495E'}}>Action #:</span>
                <span className="ml-1 font-mono font-medium" style={{color: '#E74C3C'}}>
                  {stateMachine.context.currentActionIndex}
                </span>
              </div>
            </div>
          </div>

          {/* Controls (UI Unchanged) */}
          <div className="mb-3 flex items-center justify-between py-2 border-b" style={{borderBottomColor: 'rgba(65, 184, 131, 0.1)'}}>
            <div className="flex items-center space-x-2">
              <Settings size={8} style={{color: '#35495E'}} />
              <label className="text-xs" style={{color: '#35495E'}}>Max entries:</label>
              <select 
                value={maxEntries} 
                onChange={(e) => setMaxEntries(Number(e.target.value))}
                className="text-xs px-2 py-1 border-0 focus:outline-none"
                style={{
                  backgroundColor: 'rgba(65, 184, 131, 0.05)',
                  color: '#202124',
                  borderRadius: '4px'
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportStateMachine}
                className="flex items-center space-x-1 text-xs px-2 py-1 font-medium transition-all duration-200 rounded"
                style={{
                  background: 'linear-gradient(135deg, #41B883, #3490DC)',
                  color: 'white',
                  border: 'none'
                }}
                title="Export state machine debug data"
              >
                <Download size={8} />
                <span>Export</span>
              </button>
              <button
                onClick={clearHistory}
                className="flex items-center space-x-1 text-xs px-2 py-1 font-medium transition-colors duration-200 rounded"
                style={{ color: '#35495E', backgroundColor: 'transparent', border: 'none' }}
                title="This only clears the view, not the store's history."
              >
                <Trash2 size={8} />
                <span>Clear View</span>
              </button>
            </div>
          </div>

          {/* Transitions List (Rewritten logic, UI Unchanged) */}
          <div className="space-y-0 max-h-96 overflow-y-auto" style={{scrollbarWidth: 'thin'}}>
            {displayedHistory.length === 0 ? (
              <div className="text-xs text-center py-4" style={{color: '#35495E'}}>
                No state transitions recorded yet.
              </div>
            ) : (
              displayedHistory.map((entry, index) => (
                <div key={`${entry.timestamp}-${index}`} className="py-2 px-0 border-b transition-colors duration-200" style={{
                  borderBottomColor: 'rgba(65, 184, 131, 0.06)'
                }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 px-2 py-0.5 text-xs font-medium bg-gray-100 border border-gray-300 rounded-sm`}>
                        {getEventIcon(entry.event)}
                        <span>{entry.event}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock size={8} />
                        <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-1 pl-1">
                    <div className="flex items-center space-x-2">
                      <span className={`font-mono ${getStateColor(entry.from)}`}>
                        {entry.from}
                      </span>
                      <ArrowRight size={8} className="text-gray-400" />
                      <span className={`font-medium font-mono ${getStateColor(entry.to)}`}>
                        {entry.to}
                      </span>
                    </div>
                    
                    {entry.payload && Object.keys(entry.payload).length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-800 text-xs">
                          Payload
                        </summary>
                        <pre className="text-xs p-2 mt-1 overflow-auto max-h-32 font-mono bg-gray-50 border border-gray-200 rounded text-gray-700">
                          {JSON.stringify(entry.payload, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StateMachineDebugger;