import { useTranslation } from 'react-i18next';
import { useMemo, useState, useCallback } from 'react';
import { usePipelineStore } from '../../../../Senario/Workflow/store/usePipelineStore'; 
import { useWorkflowStateMachine } from '../../../../Senario/Workflow/store/workflowStateMachine';
import { extractSectionTitle } from '../../../../../utils/String';
import {
    CheckCircle, Circle, ChevronDown, ChevronUp, ArrowRight
  } from 'lucide-react';
import { filterSectionStageText } from '../../../../../utils/String';
import { Card, Space, Typography, Tag } from 'antd';

const { Title, Text } = Typography;

const WorkflowTODOPanel = () => {
    const { t } = useTranslation();
    const { workflowTemplate } = usePipelineStore();
    const { context: fsmContext } = useWorkflowStateMachine();
  
    const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  
    const executionIndices = useMemo(() => {
      if (!workflowTemplate || !fsmContext.currentStageId) {
        return { stageIndex: -1, stepIndex: -1 };
      }
      const stageIndex = workflowTemplate.stages.findIndex(s => s.id === fsmContext.currentStageId);
      if (stageIndex === -1) {
        return { stageIndex: -1, stepIndex: -1 };
      }
      const stepIndex = workflowTemplate.stages[stageIndex]?.steps.findIndex(st => st.id === fsmContext.currentStepId) ?? -1;
      return { stageIndex, stepIndex };
    }, [workflowTemplate, fsmContext]);
  
    const toggleStage = useCallback((stageId: string) => {
      setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
    }, []);
  
    const renderStageStep = (step: any, currentStageIndex: number, stepIndex: number) => {
      const stepId = step.id;
      const isCurrent = executionIndices.stageIndex === currentStageIndex && executionIndices.stepIndex === stepIndex;
      const isCompleted = executionIndices.stageIndex > currentStageIndex || 
                         (executionIndices.stageIndex === currentStageIndex && executionIndices.stepIndex > stepIndex);
  
      return (
        <div key={stepId} className="ml-6 py-1">
          <Space align="start" size="small">
            <div className="flex-shrink-0 mt-1">
              {isCompleted ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full border-2 border-theme-600 animate-pulse" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <Text
              className={`font-medium break-words ${
                isCurrent ? 'text-theme-700' : 
                isCompleted ? 'text-green-700 line-through' : 'text-gray-600'
              }`}
              style={{ fontSize: '14px' }}
            >
              {filterSectionStageText(step.title || extractSectionTitle(step.id))}
            </Text>
          </Space>
        </div>
      );
    };
  
    const renderStage = (stage: any, index: number) => {
      const isCurrent = executionIndices.stageIndex === index;
      const isCompleted = executionIndices.stageIndex > index;
      const isExpanded = expandedStages[stage.id] || isCurrent;
      const hasSteps = stage.steps && stage.steps.length > 0;
  
      return (
        <Card 
          key={stage.id} 
          size="small"
          className={`mb-3 ${
            isCurrent ? 'border-theme-200 bg-theme-50' :
            isCompleted ? 'border-green-200 bg-green-50' : 
            'border-gray-200'
          }`}
          onClick={() => hasSteps && toggleStage(stage.id)}
          hoverable={hasSteps}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              <Title 
                level={5} 
                style={{ 
                  margin: 0, 
                  fontSize: '14px',
                  color: isCurrent ? '#1890ff' : 
                         isCompleted ? '#52c41a' : '#666'
                }}
                className="break-words"
              >
                {extractSectionTitle(stage.title || stage.id)}
              </Title>
              {isCurrent && (
                <Tag color="blue" size="small">
                  {t('rightSideBar.currentStage')}
                </Tag>
              )}
              {isCompleted && (
                <Tag color="green" size="small">
                  {t('rightSideBar.completed')}
                </Tag>
              )}
            </div>
            {hasSteps && (
              <div className="flex-shrink-0">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            )}
          </div>
          
          {hasSteps && isExpanded && (
            <div className="mt-3 space-y-1">
              {stage.steps.map((step: any, stepIndex: number) => renderStageStep(step, index, stepIndex))}
            </div>
          )}
        </Card>
      );
    };
  
    if (!workflowTemplate?.stages) {
        return null;
    }
  
    return (
      <div className="py-4">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4} style={{ margin: 0, fontSize: '16px' }} className="flex items-center gap-2 text-gray-800">
              <ArrowRight className="w-4 h-4" />
              {t('rightSideBar.workflowStages')}
            </Title>
          </div>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {workflowTemplate.stages.map((stage, index) => renderStage(stage, index))}
          </Space>
        </Space>
      </div>
    );
  };

export default WorkflowTODOPanel;