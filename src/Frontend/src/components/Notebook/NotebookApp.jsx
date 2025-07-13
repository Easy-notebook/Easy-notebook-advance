import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import CodeCell from '../Editor/CodeCell';
import MarkdownCell from '../Editor/MarkdownCell';
import HybridCell from '../Editor/HybridCell';
import FileCell from '../Editor/FileCell';
import OutlineSidebar from './LeftSideBar/OutlineSidebar';
import ErrorAlert from '../UI/ErrorAlert';
import { Play, PlusCircle, ArrowLeft, ArrowRight, Upload, BarChartHorizontalBig, TerminalSquare, Settings2, Sparkles } from 'lucide-react';
import useStore from '../../store/notebookStore';
import { findCellsByStep } from '../../utils/markdownParser';
import ExportToFile from './FunctionBar/ExportToFile';
import { createExportHandlers } from '../../utils/exportToFile/exportUtils';
import { useToast } from '../UI/Toast';
import AIAgentSidebar from './RightSideBar/AIAgentSidebar';
import useOperatorStore from '../../store/operatorStore';
import CommandInput from './FunctionBar/AITerminal';
import { useAIAgentStore } from '../../store/AIAgentStore';
import usePreviewStore from '../../store/previewStore';
import ImportNotebook4JsonOrJupyter from '../../utils/importFile/import4JsonOrJupyterNotebook';
import DSLCPipeline from '../senario/DSLCanalysis/Pipeline';
import useSettingsStore from '../../store/settingsStore';
import SettingsPage from '../senario/settingState';
import CompleteMode from '../senario/BasicMode/CompleteMode';
import StepMode from '../senario/BasicMode/StepMode';
import PreviewApp from './Display/PreviewApp';
import LanguageSwitcher from '../../i18n/LanguageSwitcher';

const VUE_PRIMARY = '#41B883';
const VUE_SECONDARY = '#35495E';

const ModeToggle = memo(({ viewMode, onModeChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { id: 'complete', label: 'Create Mode', name: t('modeToggle.completeMode') },
    { id: 'step', label: 'Demo Mode', name: t('modeToggle.stepMode') },
  ];

  const selectedMode = modes.find(mode => mode.id === viewMode);

  return (
    <div className="relative w-full max-w-md z-99999">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
        style={{
          whiteSpace: 'nowrap', // 保证按钮内容不换行
        }}
      >
        <span
          style={{
            font: '18px ui-sans-serif, -apple-system, system-ui',
            zIndex: 99999,
            fontWeight: 600,
            height: '24px',
            letterSpacing: 'normal',
            lineHeight: '28px',
            overflowClipMargin: 'content-box',
            whiteSpace: 'nowrap', // 保证mode名称不换行
            display: 'inline-block',
            verticalAlign: 'middle', 
          }}
          className="theme-grad-text"
        >
          {selectedMode?.name}
        </span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" clipRule="evenodd"
            d="M5.29289 9.29289C5.68342 8.90237 6.31658 8.90237 6.70711 9.29289L12 14.5858L17.2929 9.29289C17.6834 8.90237 18.3166 8.90237 18.7071 9.29289C19.0976 9.68342 19.0976 10.3166 18.7071 10.7071L12.7071 16.7071C12.5196 16.8946 12.2652 17 12 17C11.7348 17 11.4804 16.8946 11.2929 16.7071L5.29289 10.7071C4.90237 10.3166 4.90237 9.68342 5.29289 9.29289Z"
            fill="currentColor" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute w-full mt-1 bg-white rounded-lg shadow-lg z-10">
          {modes.map(mode => (
            <button
              key={mode.id}
              onClick={() => { onModeChange(mode.id); setIsOpen(false); }}
              className={`w-full text-left p-3 flex items-center justify-between transition-colors ${viewMode === mode.id ? 'bg-white/90' : 'hover:bg-white/80'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              <span
                className="text-lg font-medium"
                style={{
                  color: viewMode === mode.id ? VUE_PRIMARY : VUE_SECONDARY,
                }}
              >
                {mode.name}
              </span>
              {viewMode === mode.id && <span style={{ color: VUE_PRIMARY, marginLeft: 8 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

const CellDivider = memo(({ index, onAddCell, viewMode }) => {
  const { t } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="h-2 group relative my-2 w-full max-w-screen-xl mx-auto"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && viewMode === 'complete' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-2 z-10">
          <button
            onClick={() => onAddCell('code', index)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm" style={{ color: VUE_SECONDARY }}
          >
            <PlusCircle size={16} />
            {t('cell.addCodeCell')}
          </button>
          <button
            onClick={() => onAddCell('markdown', index)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm" style={{ color: VUE_SECONDARY }}
          >
            <PlusCircle size={16} />
            {t('cell.addTextCell')}
          </button>
          <button
            onClick={() => onAddCell('file', index)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm" style={{ color: VUE_SECONDARY }}
          >
            <Sparkles size={16} />
            {t('cell.aiGenerate')}
          </button>
        </div>
      )}
    </div>
  );
});

const StepNavigation = memo(({
  currentPhase,
  currentStepIndex,
  totalSteps,
  onPrevious,
  onNext,
  onPreviousPhase,
  onNextPhase,
  isFirstPhase,
  isLastPhase
}) => {
  const { t } = useTranslation();
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const baseBtn = "flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all duration-200 shadow-lg";
  const enabledStyle = `bg-white/80 backdrop-blur-md hover:bg-white/90`;
  const disabledStyle = `bg-white/60 text-gray-400`;

  const renderPreviousButton = () => {
    if (isFirstStep) {
      if (!isFirstPhase) {
        return (
          <button 
            onClick={onPreviousPhase} 
            className={`${baseBtn} ${enabledStyle}`}
            style={{ color: VUE_PRIMARY }}
          > 
            <ArrowLeft size={16}/> {t('navigation.prevStage')}
          </button>
        );
      }
      return <button className={`${baseBtn} ${disabledStyle}`}>{t('navigation.topOfAll')}</button>;
    }
    return (
      <button 
        onClick={onPrevious} 
        className={`${baseBtn} ${enabledStyle}`}
        style={{ color: VUE_PRIMARY }}
      > 
        <ArrowLeft size={16}/> {t('navigation.prevStep')}
      </button>
    );
  };

  const renderNextButton = () => {
    const nextBtnStyle = {
      backgroundColor: `${VUE_PRIMARY}90`,
      color: 'white',
    };
    
    if (isLastStep) {
      if (!isLastPhase) {
        return (
          <button 
            onClick={onNextPhase} 
            className={`${baseBtn}`}
            style={nextBtnStyle}
          >
            {t('navigation.nextStage')} <ArrowRight size={16}/>
          </button>
        );
      }
      return <button className={`${baseBtn} ${disabledStyle}`}>{t('navigation.endOfAll')}</button>;
    }
    return (
      <button 
        onClick={onNext} 
        className={`${baseBtn}`}
        style={nextBtnStyle}
      >
        {t('navigation.nextStep')} <ArrowRight size={16}/>
      </button>
    );
  };

  return (
    <div className="h-20 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md" style={{ borderColor: `${VUE_SECONDARY}33` }}>
      <div className="flex items-center gap-2">
        {renderPreviousButton()}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className="text-lg font-semibold" style={{ color: VUE_SECONDARY }}>
          {currentPhase?.title}
        </span>
        <div className="flex items-center gap-3">
          {totalSteps > 0 && Array.from({ length: totalSteps }).map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition duration-200 ${idx === currentStepIndex ? '' : 'bg-gray-200/50'}`}
              style={idx === currentStepIndex ? { backgroundColor: VUE_PRIMARY } : {}}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {renderNextButton()}
      </div>
    </div>
  );
});

// Main NotebookApp component
const NotebookApp = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    notebookId,
    cells,
    tasks,
    viewMode,
    currentPhaseId,
    currentStepIndex,
    getCurrentViewCells,
    getTotalSteps,
    runAllCells,
    isExecuting,
    currentRunningPhaseId,
    allowPagination,
    error,
    isCollapsed,
    lastAddedCellId,
    uploadMode,
    allowedTypes,
    maxFiles,
    isRightSidebarCollapsed,
    setError,
    setLastAddedCellId,
    setIsRightSidebarCollapsed,
    setEditingCellId,
    setCurrentPhase,
    setCurrentStepIndex,
    setCurrentCell,
    addCell,
    deleteCell,
    updateCell,
    setViewMode,
  } = useStore();

  const { setShowCommandInput } = useAIAgentStore();

  const fileInputRef = useRef(null);

  // 使用自定义 Hook 获取 handleImport 和 initializeNotebook
  const { handleImport, initializeNotebook } = ImportNotebook4JsonOrJupyter();

  const settingstore = useSettingsStore();

  // Helper function to find phase index
  const findPhaseIndex = useCallback(() => {
    for (const task of tasks) {
      const phaseIndex = task.phases.findIndex(p => p.id === currentPhaseId);
      if (phaseIndex !== -1) {
        return { task, phaseIndex };
      }
    }
    return null;
  }, [tasks, currentPhaseId]);

  // 修改后的 handleAddCell 函数，使用 hook 的 initializeNotebook
  const handleAddCell = useCallback(async (type, index = null) => {
    try {
      if (!notebookId) {
        await initializeNotebook();
      }

      const newCell = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [], // 使用 'outputs' 而不是 'output'
        enableEdit: true,
        phaseId: currentRunningPhaseId || null // 分配到当前运行的阶段
      };

      addCell(newCell, index); // 直接调用 store 的 addCell 动作
      setLastAddedCellId(newCell.id);

      toast({
        title: t('toast.success'),
        description: t('toast.cellAdded', { type: t(`cellTypes.${type}`) }),
        variant: "success",
      });
    } catch (err) {
      console.error('Error adding cell:', err);
      setError('Failed to add cell. Please try again.');
      toast({
        title: t('toast.error'),
        description: err.message,
        variant: "destructive",
      });
    }
  }, [initializeNotebook, notebookId, currentRunningPhaseId, addCell, setLastAddedCellId, setError, toast, t]);

  // Run all cells
  const handleRunAll = useCallback(async () => {
    try {
      await runAllCells();
      toast({
        title: t('toast.success'),
        description: t('toast.allCellsExecuted'),
        variant: "success",
      });
    } catch (err) {
      console.error('Error running all cells:', err);
      setError('Failed to run all cells. Please try again.');
      toast({
        title: t('toast.error'),
        description: err.message,
        variant: "destructive",
      });
    }
  }, [runAllCells, setError, toast, t]);

  // Navigation handlers
  const handlePreviousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1); // 直接调用 store 的 setCurrentStepIndex 动作
    }
  }, [currentStepIndex, setCurrentStepIndex]);

  const handleNextStep = useCallback(() => {
    const totalSteps = getTotalSteps();
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(currentStepIndex + 1); // 直接调用 store 的 setCurrentStepIndex 动作
    }
  }, [currentStepIndex, getTotalSteps, setCurrentStepIndex]);

  const handlePreviousPhase = useCallback(() => {
    const result = findPhaseIndex();
    if (result) {
      const { task, phaseIndex } = result;
      if (phaseIndex > 0) {
        const previousPhase = task.phases[phaseIndex - 1];
        setCurrentPhase(previousPhase.id);
        setCurrentStepIndex(0);
      }
    }
  }, [findPhaseIndex, setCurrentPhase, setCurrentStepIndex]);

  const handleNextPhase = useCallback(() => {
    const result = findPhaseIndex();
    if (result) {
      const { task, phaseIndex } = result;
      if (phaseIndex < task.phases.length - 1) {
        const nextPhase = task.phases[phaseIndex + 1];
        setCurrentPhase(nextPhase.id); // 直接调用 store 的 setCurrentPhase 动作
        setCurrentStepIndex(0); // 直接调用 store 的 setCurrentStepIndex 动作
      }
    }
  }, [findPhaseIndex, setCurrentPhase, setCurrentStepIndex]);

  /**
   * 处理阶段选择事件。
   * @param {string} phaseId 阶段 ID。
   * @param {string} stepId 步骤 ID。
   */
  const handlePhaseSelect = useCallback((phaseId, stepId) => {
    // 设置当前阶段和步骤
    setCurrentPhase(phaseId); // 直接调用 store 的 setCurrentPhase 动作

    // 查找对应的阶段
    const phase = tasks.flatMap(task => task.phases).find(p => p.id === phaseId);
    if (phase) {
      // 查找步骤的索引
      const stepIndex = phase.steps.findIndex(s => s.id === stepId);
      if (stepIndex !== -1) {
        // 设置当前步骤索引
        setCurrentStepIndex(stepIndex); // 直接调用 store 的 setCurrentStepIndex 动作

        // 查找对应步骤的单元格
        const stepCells = findCellsByStep(tasks, phaseId, stepId, cells);
        if (stepCells.length > 0) {
          const firstCellId = stepCells[0].id;
          const cellElement = document.getElementById(`cell-${firstCellId}`);
          if (cellElement) {
            // 滚动到对应的单元格
            cellElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    }
  }, [tasks, cells, setCurrentPhase, setCurrentStepIndex]);

  /**
   * 处理视图模式切换。
   * @param {string} mode 新的视图模式。
   */
  const handleModeChange = useCallback((mode) => {
    if (mode === 'step' && !currentPhaseId && tasks.length > 0) {
      const firstTask = tasks[0];
      if (firstTask.phases.length > 0) {
        setCurrentPhase(firstTask.phases[0].id);
      }
    }
    setViewMode(mode);
    // 记录并发送操作到后端
    const operation = {
      type: 'update_view_mode',
      payload: { change_to: mode, current_phase_id: currentPhaseId, current_step_index: currentStepIndex }
    };
    useOperatorStore.getState().sendOperation(notebookId, operation);

    setCurrentCell(null);
    setEditingCellId(null);
  }, [
    currentPhaseId,
    tasks,
    setCurrentPhase,
    setViewMode,
    notebookId,
    setCurrentCell,
    setEditingCellId,
    currentStepIndex
  ]);

  // Export handlers
  const handleExportJson = useCallback(async () => {
    try {
      const exportData = {
        notebook_id: notebookId, // 使用 'notebook_id'
        cells,
        tasks
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notebook-${notebookId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: t('toast.success'),
        description: t('toast.exportSuccess'),
        variant: "success",
      });
    } catch (err) {
      console.error('Error exporting notebook:', err);
      toast({
        title: t('toast.error'),
        description: t('toast.exportFailed'),
        variant: "destructive",
      });
    }
  }, [notebookId, cells, tasks, toast, t]);

  const { exportDocx, exportPdf, exportMarkdown } = createExportHandlers(cells, tasks);

  // 触发文件输入
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 渲染单元格。
   * @param {Object} cell 单元格数据。
   */
  const renderCell = useCallback((cell) => {
    if (!cell) return null;

    const props = {
      cell,
      onDelete: viewMode === 'complete' ? () => deleteCell(cell.id) : null, // 直接调用 store 的 deleteCell 动作
      onUpdate: (newContent) => updateCell(cell.id, newContent), // 直接调用 store 的 updateCell 动作
      className: "w-full",
      viewMode,
      enableEdit: cell.enableEdit,
      uploadMode,
      allowedTypes,
      maxFiles
    };

    switch (cell.type) {
      case 'Hybrid':
        return <HybridCell key={cell.id} {...props} />;
      case 'code':
        return <CodeCell key={cell.id} {...props} />;
      case 'markdown':
        return <MarkdownCell key={cell.id} {...props} />;
      case 'file':
        return <FileCell key={cell.id} {...props} />;
      default:
        return null;
    }
  }, [viewMode, uploadMode, allowedTypes, maxFiles, deleteCell, updateCell]);

  /**
   * 渲染步骤导航。
   */
  const renderStepNavigation = useCallback(() => {
    const result = findPhaseIndex();
    if (!result) return null;

    const { task, phaseIndex } = result;
    const currentPhase = task.phases[phaseIndex];
    const isFirstPhase = phaseIndex === 0;
    const isLastPhase = phaseIndex === task.phases.length - 1;

    return (
      <StepNavigation
        currentPhase={currentPhase}
        currentStepIndex={currentStepIndex}
        totalSteps={getTotalSteps()}
        onPrevious={handlePreviousStep}
        onNext={handleNextStep}
        onPreviousPhase={handlePreviousPhase}
        onNextPhase={handleNextPhase}
        isFirstPhase={isFirstPhase}
        isLastPhase={isLastPhase}
      />
    );
  }, [
    findPhaseIndex,
    currentStepIndex,
    getTotalSteps,
    handlePreviousStep,
    handleNextStep,
    handlePreviousPhase,
    handleNextPhase
  ]);

  const isShowingFileExplorer = usePreviewStore((state) => state.previewMode === 'file');

  /**
   * 渲染内容区域。
   */
  const renderContent = useCallback(() => {
    if (cells.length === 0 || viewMode === 'dslc') {
      return <DSLCPipeline onAddCell={handleAddCell}
        className="w-full h-full"
      />;
    }

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
  }, [
    cells,
    viewMode,
    currentPhaseId,
    currentStepIndex,
    tasks,
    getCurrentViewCells,
    handleAddCell,
    renderCell,
    renderStepNavigation,
  ]);

  // 滚动到最后添加的单元格
  useEffect(() => {
    if (lastAddedCellId) {
      const cellElement = document.getElementById(`cell-${lastAddedCellId}`);
      cellElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setLastAddedCellId(null);
    }
  }, [lastAddedCellId, setLastAddedCellId]);

  // 处理快捷键 (Alt/Ctrl + /)
  useEffect(() => {
    const handleKeyPress = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if ((e.altKey || e.metaKey) && e.key === '/' && tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        setShowCommandInput(true);
        console.log("show command input");
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [setShowCommandInput]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + Left/Right Arrow for navigation
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (viewMode === 'step') {
          if (currentStepIndex > 0) {
            handlePreviousStep();
          } else {
            handlePreviousPhase();
          }
        }
      }

      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (viewMode === 'step') {
          const totalSteps = getTotalSteps();
          if (currentStepIndex < totalSteps - 1) {
            handleNextStep();
          } else {
            handleNextPhase();
          }
        }
      }

      // Alt + Ctrl to toggle view mode
      if (e.altKey && e.ctrlKey) {
        e.preventDefault();
        handleModeChange(viewMode === 'complete' ? 'step' : 'complete'); // 切换模式
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    currentStepIndex,
    handlePreviousStep,
    handleNextStep,
    handlePreviousPhase,
    handleNextPhase,
    getTotalSteps,
    handleModeChange,
    currentPhaseId,
    notebookId
  ]);

  return (
    <div className="h-screen flex">
      <SettingsPage />
      {/* 左侧边栏 */}
      {!(cells.length === 0) && <div className={`${isCollapsed ? 'w-14' : 'w-96'} transition-all duration-500 ease-in-out relative`}>
        <OutlineSidebar
          tasks={tasks}
          currentPhaseId={currentPhaseId}
          currentStepId={currentStepIndex !== null ? tasks.flatMap(task => task.phases).find(p => p.id === currentPhaseId)?.steps[currentStepIndex]?.id : null}
          isCollapsed={isCollapsed}
          onPhaseSelect={handlePhaseSelect}
          viewMode={viewMode}
          currentRunningPhaseId={currentRunningPhaseId}
          allowPagination={allowPagination} // 传递翻页权限设置
        />
      </div>
      }
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <CommandInput
          onClick={() => setShowCommandInput(true)}
        />
        <header className="h-16 flex items-center justify-between px-3 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isCollapsed && <button onClick={settingstore.openSettings} className="p-3 rounded-lg hover:bg-white/90 transition-colors"><Settings2 size={16} /></button>}
            <ModeToggle viewMode={viewMode} onModeChange={handleModeChange} />
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-3">
            {
              !(cells.length === 0 || viewMode === 'dslc') &&
              <>
                <button
                  onClick={handleRunAll}
                  className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
                  disabled={cells.length === 0 || isExecuting}
                  style={{ color: VUE_SECONDARY }}
                >
                  <Play size={16} />
                  {isExecuting ? t('fileOperations.running') : t('fileOperations.runAll')}
                </button>

                <ExportToFile
                  disabled={cells.length === 0}
                  onExportJson={handleExportJson}
                  onExportDocx={exportDocx}
                  onExportPdf={exportPdf}
                  onExportMarkdown={exportMarkdown}
                />
              </>
            }
            <button
              onClick={triggerFileInput}
              className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
              style={{ color: VUE_SECONDARY }}
            >
              <Upload size={16} />
              {t('fileOperations.import')}
            </button>
            <input
              type="file"
              accept=".ipynb,application/json"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImport}
            />

            <div className='flex items-center gap-2'>
              {!(cells.length === 0 || viewMode === 'dslc') && <button
                className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
                onClick={() => { setShowCommandInput(true); }}
                style={{ color: VUE_PRIMARY }}
              >
                <TerminalSquare size={16} />
              </button>}
              <button
                onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
                style={{ color: VUE_PRIMARY, backgroundColor: `${VUE_PRIMARY}15` }}
              >
                <BarChartHorizontalBig size={16} />
              </button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto scroll-smooth border-3 border-blue-200 bg-white w-full h-full">
          {isShowingFileExplorer && <PreviewApp />}
          <div className={`${isShowingFileExplorer ? 'hidden' : 'block'} w-full h-full `}>
            {renderContent()}
          </div>
        </div>

        {error && (
          <ErrorAlert
            message={error}
            onClose={() => setError(null)}
          />
        )}
      </div>

      {/* 右侧边栏 */}
      <div className={`transition-all duration-500 ease-in-out ${!isRightSidebarCollapsed ? 'w-0 opacity-0' : 'w-96 opacity-100'} overflow-hidden flex-shrink-0`}>
        <AIAgentSidebar
          viewMode={viewMode}
          currentPhaseId={currentPhaseId}
          currentStepIndex={currentStepIndex}
        />
      </div>
    </div>
  );
};

export default memo(NotebookApp);
