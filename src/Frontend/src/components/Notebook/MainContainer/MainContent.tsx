import DSLCPipeline from '../../senario/DSLCanalysis/Pipeline';
import StepMode from '../../senario/BasicMode/StepMode';
import TiptapNotebookEditor from '../../Editor/TiptapNotebookEditor';
import CompleteMode from '../../senario/BasicMode/CompleteMode';
import { findCellsByStep } from '../../../utils/markdownParser';
import CellDivider from './CellDivider';

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
  renderStepNavigation
}) => {
  // Always render DSLCPipeline to keep DynamicStageTemplate alive for WorkflowControl
  const shouldShowDSLCUI = cells.length === 0 || viewMode === 'dslc';

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
    if (viewMode === 'step') {
      return (
        <StepMode
          tasks={tasks}
          currentPhaseId={currentPhaseId}
          currentStepIndex={currentStepIndex}
          cells={cells}
          findCellsByStep={findCellsByStep}
          renderCell={renderCell}
          renderStepNavigation={renderStepNavigation}
        />
      );
    }

    if (viewMode === 'wysiwyg') {
      return (
        <div className="w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto">
          <div className="h-10 w-full"></div>
          <div className="relative">
            <TiptapNotebookEditor
              className="w-full"
              placeholder="Start writing your notebook... Type ```python to create a code block"
              readOnly={false}
            />
          </div>
          <div className="h-20 w-full"></div>
        </div>
      );
    }

    const visibleCells = getCurrentViewCells();
    return (
      <CompleteMode
        visibleCells={visibleCells}
        handleAddCell={handleAddCell}
        viewMode={viewMode}
        renderCell={renderCell}
        CellDivider={CellDivider}
      />
    );
  }
};

export default MainContent;