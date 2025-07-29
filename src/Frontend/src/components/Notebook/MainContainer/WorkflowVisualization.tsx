import React from 'react';
import { useWorkflowControlStore } from '../store/workflowControlStore';

interface WorkflowVisualizationProps {
  className?: string;
}

const WorkflowVisualization: React.FC<WorkflowVisualizationProps> = ({ className = '' }) => {
  const {
    dynamicWorkflow,
    workflowAnalysis,
    selectedChapters,
    currentChapterActions
  } = useWorkflowControlStore();

  if (!dynamicWorkflow && !workflowAnalysis) {
    return null;
  }

  return (
    <div className={`workflow-visualization ${className}`}>
      {/* Workflow Analysis Summary */}
      {workflowAnalysis && (
        <div className="workflow-analysis mb-4">
          <h3 className="text-lg font-semibold mb-2">📋 Workflow Analysis</h3>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Target:</strong> {workflowAnalysis.target_analysis}
            </p>
            {workflowAnalysis.minimal_workflow && (
              <div className="mt-2">
                <strong>Selected Stages:</strong>
                <div className="flex flex-wrap gap-2 mt-1">
                  {workflowAnalysis.minimal_workflow.map((stage: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                    >
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Workflow Overview */}
      {dynamicWorkflow && (
        <div className="dynamic-workflow mb-4">
          <h3 className="text-lg font-semibold mb-2">🎯 Customized Workflow</h3>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Strategy:</strong> {dynamicWorkflow.execution_strategy || 'Sequential'}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Reason:</strong> {dynamicWorkflow.customization_reason}
            </p>
            {dynamicWorkflow.selected_chapters && (
              <div className="mt-2">
                <strong>Chapters to Execute:</strong>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {dynamicWorkflow.selected_chapters.map((chapterId: string, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-white rounded border"
                    >
                      <span className="text-sm font-medium">{chapterId}</span>
                      <span className="text-xs text-gray-500">Step {index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Current Chapter Actions */}
      {currentChapterActions && (
        <div className="chapter-actions mb-4">
          <h3 className="text-lg font-semibold mb-2">⚡ Current Chapter Actions</h3>
          <div className="bg-yellow-50 p-3 rounded-lg">
            {currentChapterActions.goal_relevance_analysis && (
              <p className="text-sm text-gray-700 mb-2">
                <strong>Analysis:</strong> {currentChapterActions.goal_relevance_analysis}
              </p>
            )}
            
            {currentChapterActions.stage_execution_plan && (
              <p className="text-sm text-gray-700 mb-3">
                <strong>Execution Plan:</strong> {currentChapterActions.stage_execution_plan}
              </p>
            )}

            {/* Selected Actions */}
            {currentChapterActions.selected_actions && (
              <div className="mb-3">
                <strong className="text-sm">Selected Actions:</strong>
                <div className="mt-1 space-y-1">
                  {currentChapterActions.selected_actions.map((action: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-white rounded border-l-4 border-green-400"
                    >
                      <span className="text-lg">
                        {action.necessity === 'essential' ? '🔴' : 
                         action.necessity === 'helpful' ? '🟡' : '🟢'}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{action.action_id}</p>
                        <p className="text-xs text-gray-600">{action.contribution_to_goal}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skipped Actions */}
            {currentChapterActions.skip_actions && currentChapterActions.skip_actions.length > 0 && (
              <div>
                <strong className="text-sm">Skipped Actions:</strong>
                <div className="mt-1 space-y-1">
                  {currentChapterActions.skip_actions.map((action: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-gray-50 rounded border-l-4 border-gray-300"
                    >
                      <span className="text-lg">⏭️</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{action.action_id}</p>
                        <p className="text-xs text-gray-500">{action.skip_reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existence Chain Visualization (if available) */}
      {workflowAnalysis?.existence_chain && (
        <div className="existence-chain mb-4">
          <h3 className="text-lg font-semibold mb-2">🔗 Existence Dependency Chain</h3>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="space-y-2">
              {workflowAnalysis.existence_chain.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 bg-white rounded border-l-4 border-purple-400"
                >
                  <span className="text-sm font-medium">{index + 1}.</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.state}</p>
                    <p className="text-xs text-gray-600">
                      Depends on: {item.depends_on} | Provided by: {item.provided_by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowVisualization;