import DSLCPipeline from '../../senario/DSLCanalysis/Pipeline';
import CreateMode from '../../senario/BasicMode/CreateMode';
import DemoMode from '../../senario/BasicMode/DemoMode';
import DetachedCellView from './DetachedCellView';
import { findCellsByStep } from '../../../utils/markdownParser';
import useStore from '../../../store/notebookStore';

interface MainContentProps {
  cells: any[];
  viewMode: string;
  tasks: any[];
  currentPhaseId: string | null;
  currentStepIndex: number;
  getCurrentViewCells: () => any[];
  handleAddCell: (type: string, index?: number) => void;
  renderCell: (cell: any) => JSX.Element | null;
  renderStepNavigation: () => JSX.Element | null;
  // Navigation handlers for DemoMode
  handlePreviousStep?: () => void;
  handleNextStep?: () => void;
  handlePreviousPhase?: () => void;
  handleNextPhase?: () => void;
  isFirstPhase?: boolean;
  isLastPhase?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  cells,
  viewMode,
  tasks,
  currentPhaseId,
  currentStepIndex,
  getCurrentViewCells,
  handleAddCell,
  renderCell,
  renderStepNavigation,
  handlePreviousStep,
  handleNextStep,
  handlePreviousPhase,
  handleNextPhase,
  isFirstPhase,
  isLastPhase
}) => {
  const { detachedCellId, isDetachedCellFullscreen } = useStore();
  
  // Always render DSLCPipeline to keep DynamicStageTemplate alive for WorkflowControl
  const shouldShowDSLCUI = cells.length === 0 || viewMode === 'dslc';

  // 如果有独立窗口模式的 cell 且是全屏模式，优先显示独立视图
  if (detachedCellId && isDetachedCellFullscreen) {
    return <DetachedCellView />;
  }

  // 如果有独立窗口且是分屏模式，渲染分屏布局
  if (detachedCellId && !isDetachedCellFullscreen) {
    return (
      <div className="w-full h-full flex">
        {/* 左侧：原始内容 */}
        <div className="w-1/2 h-full border-r border-gray-200 overflow-hidden">
          <div className="w-full h-full overflow-auto">
            {shouldShowDSLCUI ? (
              <div className="w-full h-full" style={{ zIndex: viewMode === 'dslc' ? 100 : 1 }}>
                <DSLCPipeline 
                  onAddCell={handleAddCell}
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div style={{ zIndex: 10 }}>
                {renderOtherModes()}
              </div>
            )}
          </div>
        </div>
        
        {/* 右侧：独立窗口 */}
        <div className="w-1/2 h-full overflow-hidden">
          <DetachedCellView />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Always render DSLCPipeline but conditionally display it with layered positioning */}
      <div className={shouldShowDSLCUI ? 'block w-full h-full' : 'hidden'} style={{ zIndex: viewMode === 'dslc' ? 100 : 1 }}>
        <DSLCPipeline 
          onAddCell={handleAddCell}
          className="w-full h-full"
        />
      </div>
      
      {/* Render other modes when DSLC UI is hidden */}
      {!shouldShowDSLCUI && (
        <div style={{ zIndex: 10 }}>
          {renderOtherModes()}
        </div>
      )}
    </>
  );

  function renderOtherModes() {
    if (viewMode === 'demo') {
      return (
        <DemoMode
          tasks={tasks}
          currentPhaseId={currentPhaseId}
          currentStepIndex={currentStepIndex}
          cells={cells}
          findCellsByStep={findCellsByStep}
          renderCell={renderCell}
          readOnly={false}
          onPrevious={handlePreviousStep}
          onNext={handleNextStep}
          onPreviousPhase={handlePreviousPhase}
          onNextPhase={handleNextPhase}
          isFirstPhase={isFirstPhase}
          isLastPhase={isLastPhase}
        />
      );
    }

    if (viewMode === 'create') {
      return <CreateMode readOnly={false} />;
    }

    // 默认情况下使用 create 模式
    return <CreateMode readOnly={false} />;
  }
};

export default MainContent;