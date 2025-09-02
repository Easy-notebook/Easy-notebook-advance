import { useEffect, useCallback, memo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';
import { StorageManager } from '@Storage/index';
import CodeCell from '../Editor/Cells/CodeCell';
import MarkdownCell from '../Editor/Cells/MarkdownCell';
import HybridCell from '../Editor/Cells/HybridCell';
import ImageCell from '../Editor/Cells/ImageCell';
import AIThinkingCell from '../Editor/Cells/AIThinkingCell';
import LinkCell from '../Editor/Cells/LinkCell';
import OutlineSidebarOrig from './LeftSideBar/Main/Workspace/OutlineView/OutlineSidebar';
import StepNavigation from './MainContainer/StepNavigation';
import ErrorAlert from '../UI/ErrorAlert';
import useStore from '@Store/notebookStore';
import { findCellsByStep } from '../../utils/markdownParser';
import { createExportHandlers } from '../../utils/exportToFile/exportUtils';
import { useToast } from '../UI/Toast';
import AIAgentSidebarOrig from './RightSideBar/AIAgentSidebar';
import useOperatorStore from '@Store/operatorStore';
import CommandInputOrig from './FunctionBar/AITerminal';
import { useAIAgentStore } from '@Store/AIAgentStore';
import usePreviewStore from '@Store/previewStore';
import ImportNotebook4JsonOrJupyter from '../../utils/importFile/import4JsonOrJupyterNotebook';
import useSettingsStore from '../../store/settingsStore';
import SettingsPage from '../Senario/settingState';
import TabbedPreviewApp from './Display/TabbedPreviewApp';
import GlobalTabList from './Display/GlobalTabList';
import Header from './MainContainer/Header';
import MainContent from './MainContainer/MainContent';
import WorkflowControl from './MainContainer/WorkflowControl';
import { useWorkflowControlStore } from './store/workflowControlStore';
import AgentDetail from '../Agents/AgentDetail';
import { AgentType } from '../../services/agentMemoryService';
import EmptyState from '../Senario/State/EmptyState/EmptyState';
import LibraryState from '../Senario/State/LibraryState/LibraryState';
import { useRouteSync } from '../../hooks/useRouteSync';
import useRouteStore from '@Store/routeStore';

// Cast components to any to relax prop type constraints
const OutlineSidebar: any = OutlineSidebarOrig;
const AIAgentSidebar: any = AIAgentSidebarOrig;
const CommandInput: any = CommandInputOrig;


// Main NotebookApp component
const NotebookApp = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // 直接订阅路由状态，避免通过 useRouteSync 的间接订阅导致的渲染延迟
  const routeStore = useRouteStore();
  const routeView = routeStore.currentView;
  const { navigateToWorkspace, navigateToEmpty } = routeStore;
  
  // 路由状态调试 (可选)
  // console.log('NotebookApp render:', { routeView, currentRoute: routeStore.currentRoute });
  
  // 路由同步（但不使用其返回的状态）
  useRouteSync();

  // Panel width states
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('leftSidebarWidth');
    return saved ? parseInt(saved) : 384; // w-96 = 384px
  });

  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('rightSidebarWidth');
    return saved ? parseInt(saved) : 384; // w-96 = 384px
  });

  const [currentView, setCurrentView] = useState<'notebook' | 'agent'>('notebook');
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType | null>(null);


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
    setNotebookId,
    setNotebookTitle,
  } = useStore();

  const { setShowCommandInput } = useAIAgentStore();


  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Optimized resize handlers
  const handleLeftResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;
    let animationId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        const newWidth = Math.max(200, Math.min(800, startWidth + e.clientX - startX));
        setLeftSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (animationId) cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      // Save the current width state
      requestAnimationFrame(() => {
        localStorage.setItem('leftSidebarWidth', leftSidebarWidth.toString());
      });
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftSidebarWidth]);

  const handleRightResize = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;
    let animationId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = requestAnimationFrame(() => {
        const newWidth = Math.max(200, Math.min(800, startWidth + startX - e.clientX));
        setRightSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (animationId) cancelAnimationFrame(animationId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      // Save the current width state
      requestAnimationFrame(() => {
        localStorage.setItem('rightSidebarWidth', rightSidebarWidth.toString());
      });
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rightSidebarWidth]);


  // 使用自定义 Hook 获取 handleImport 和 initializeNotebook
  const { handleImport, initializeNotebook } = ImportNotebook4JsonOrJupyter();

  const settingstore = useSettingsStore();

  // WorkflowControl store for global state management
  const {
    setContinueButtonText,
    setIsGenerating,
    setIsCompleted,
    setOnTerminate,
    setOnContinue,
    setOnCancelCountdown,
  } = useWorkflowControlStore();

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
  const handleAddCell = useCallback(async (type: any, index?: number) => {
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
        message: t('toast.cellAdded', { type: t(`cellTypes.${type}`) }),
        type: 'success',
      } as any);
    } catch (err) {
      console.error('Error adding cell:', err);
      setError('Failed to add cell. Please try again.');
      toast({
        message: (err as Error).message || t('toast.error'),
        type: 'error',
      } as any);
    }
  }, [initializeNotebook, notebookId, currentRunningPhaseId, addCell, setLastAddedCellId, setError, toast, t]);

  // Run all cells
  const handleRunAll = useCallback(async () => {
    try {
      await runAllCells();
      toast({
        message: t('toast.allCellsExecuted'),
        type: 'success',
      } as any);
    } catch (err) {
      console.error('Error running all cells:', err);
      setError('Failed to run all cells. Please try again.');
      toast({
        message: (err as Error).message || t('toast.error'),
        type: 'error',
      } as any);
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
  const handlePhaseSelect = useCallback((phaseId: string, stepId: string) => {
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
        const stepCells = findCellsByStep(tasks as any, phaseId, stepId, cells as any);
        if (stepCells.length > 0) {
          const firstCellId = stepCells[0].id;
          const cellElement = document.getElementById(`cell-${firstCellId}`);
          if (cellElement) {
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
  const handleModeChange = useCallback((mode: any) => {
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

  // Handle agent selection
  const handleAgentSelect = useCallback((agentType: AgentType) => {
    setSelectedAgentType(agentType);
    setCurrentView('agent');
  }, []);

  // Handle back to notebook
  const handleBackToNotebook = useCallback(() => {
    setCurrentView('notebook');
    setSelectedAgentType(null);
  }, []);

  // EmptyState 和 LibraryState 处理函数
  const handleEmptyStateAddCell = useCallback(async (type: 'markdown' | 'code') => {
    try {
      let currentNotebookId = notebookId;
      
      // 如果没有 notebook，先创建一个
      if (!currentNotebookId) {
        await initializeNotebook();
        // 获取刚创建的 notebook ID
        currentNotebookId = useStore.getState().notebookId;
      }

      const newCell = {
        id: uuidv4(),
        type: type,
        content: '',
        outputs: [],
        enableEdit: true,
        phaseId: currentRunningPhaseId || null
      };

      addCell(newCell);
      setLastAddedCellId(newCell.id);

      // 创建新 notebook 后导航到工作区
      if (currentNotebookId) {
        console.log(`EmptyState: Creating cell and navigating to workspace ${currentNotebookId}`);
        navigateToWorkspace(currentNotebookId);
      } else {
        console.error('Failed to get notebook ID after initialization');
      }

      toast({
        message: t('toast.cellAdded', { type: t(`cellTypes.${type}`) }),
        type: 'success',
      } as any);
    } catch (err) {
      console.error('Error adding cell:', err);
      setError('Failed to add cell. Please try again.');
      toast({
        message: (err as Error).message || t('toast.error'),
        type: 'error',
      } as any);
    }
  }, [initializeNotebook, notebookId, currentRunningPhaseId, addCell, setLastAddedCellId, setError, toast, t, navigateToWorkspace]);

  const handleLibrarySelectNotebook = useCallback(async (notebookId: string, notebookTitle: string) => {
    try {
      setNotebookId(notebookId);
      setNotebookTitle(notebookTitle);
      
      // 导航到工作区
      navigateToWorkspace(notebookId);
      
      toast({
        message: t('toast.notebookSelected', `Notebook "${notebookTitle}" selected`),
        type: 'success',
      } as any);
    } catch (err) {
      console.error('Error selecting notebook:', err);
      toast({
        message: (err as Error).message || t('toast.error'),
        type: 'error',
      } as any);
    }
  }, [setNotebookId, setNotebookTitle, navigateToWorkspace, toast, t]);

  const handleLibraryBack = useCallback(() => {
    // 从 Library 返回到 EmptyState
    navigateToEmpty();
  }, [navigateToEmpty]);

  // 监听 notebookId 变化，当在 EmptyState 创建新 notebook 时自动导航
  useEffect(() => {
    if (routeView === 'empty' && notebookId && cells.length > 0) {
      console.log(`EmptyState: Detected new notebook ${notebookId} with cells, auto-navigating to workspace`);
      // 延迟一点导航，让 store 状态完全更新
      setTimeout(() => {
        navigateToWorkspace(notebookId);
      }, 100);
    }
  }, [routeView, notebookId, cells.length, navigateToWorkspace]);

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
        message: t('toast.exportSuccess'),
        type: 'success',
      } as any);
    } catch (err) {
      console.error('Error exporting notebook:', err);
      toast({
        message: t('toast.exportFailed'),
        type: 'error',
      } as any);
    }
  }, [notebookId, cells, tasks, toast, t]);

  const { exportDocx, exportPdf, exportMarkdown } = createExportHandlers(cells as any, tasks as any);

  // 触发文件输入
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * 渲染单元格。
   * @param {Object} cell 单元格数据。
   */
  const renderCell = useCallback((cell: any) => {
    if (!cell) return null;

    const props = {
      cell,
      onDelete: ((viewMode as any) === 'complete' || (viewMode as any) === 'create') ? () => deleteCell(cell.id) : undefined, // 直接调用 store 的 deleteCell 动作
      onUpdate: (newContent: any) => updateCell(cell.id, newContent), // 直接调用 store 的 updateCell 动作
      className: "w-full",
      viewMode,
      enableEdit: cell.enableEdit,
      uploadMode,
      allowedTypes,
      maxFiles
    };

    // 为代码单元格添加演示模式标识
    const codeProps = {
      ...props,
      isDemoMode: viewMode === 'demo' // 演示模式标识
    };

    switch (cell.type) {
      case 'Hybrid':
      case 'hybrid':
        return <HybridCell key={cell.id} {...props} />;
      case 'code':
        return <CodeCell key={cell.id} {...codeProps} />;
      case 'markdown':
        return <MarkdownCell key={cell.id} {...props} />;
      case 'image':
        return <ImageCell key={cell.id} {...props} />;
      case 'thinking':
        return <AIThinkingCell key={cell.id} {...props} />;
      case 'link':
        return <LinkCell key={cell.id} {...props} />;
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
    const handleKeyPress = (e: any) => {
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

  // Debug isExecuting state changes
  useEffect(() => {
    console.log('NotebookApp: isExecuting changed to:', isExecuting);
  }, [isExecuting]);

  // WorkflowControl state management based on view mode
  useEffect(() => {
    console.log('NotebookApp: WorkflowControl state update', {
      viewMode,
      isExecuting,
      currentPhaseId
    });

    if (viewMode === 'demo' || viewMode === 'create') {
      setContinueButtonText('Continue to Next Stage');
      // Clear handlers to let workflow state machine control them
      setOnTerminate(null);
      setOnContinue(null);
      setOnCancelCountdown(null);
    } else {
      // In other modes, provide basic state
      console.log('NotebookApp: Setting non-DSLC mode state');
      setContinueButtonText('Continue Workflow');
      // Set basic state for non-DSLC modes
      setIsGenerating(isExecuting);
      // In non-DSLC modes, consider it completed when not executing
      setIsCompleted(!isExecuting);

      // Provide basic handlers for non-DSLC modes
      setOnTerminate(() => {
        console.log('Basic terminate handler called');
        // Could stop any running operations here
      });

      setOnContinue(() => {
        console.log('Basic continue handler called');
        // Could implement basic workflow continuation here
        if (viewMode === 'step' && currentPhaseId) {
          handleNextPhase();
        }
      });
    }
  }, [viewMode, isExecuting, currentPhaseId, setContinueButtonText, setIsGenerating, setIsCompleted, setOnTerminate, setOnContinue, setOnCancelCountdown, handleNextPhase]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: any) => {
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
      if (e.altKey && e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        handleModeChange(viewMode === 'create' ? 'step' : 'create'); // 切换模式
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
    currentPhaseId
  ]);

  const {
    activeFile  
  } = usePreviewStore();

  // Initialize storage system on app start
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log('Initializing storage system...');
        await StorageManager.initialize();
        console.log('Storage system initialized successfully');
      } catch (error) {
        console.error('Failed to initialize storage system:', error);
        // Don't throw - app can still work without perfect storage
      }
    };

    initializeStorage();
  }, []);

  /**
   * 决定当前应该显示的主要内容组件
   * 使用优先级顺序来避免条件冲突
   */
  const resolveMainContent = useCallback(() => {
    console.log('🎭 resolveMainContent called with:', {
      routeView,
      isShowingFileExplorer,
      activeFile: !!activeFile,
      currentView,
      selectedAgentType
    });
    
    // 优先级1: 文件预览 (最高优先级)
    if (isShowingFileExplorer && activeFile) {
      console.log('🎭 → Choosing: file-preview');
      return { type: 'file-preview', component: <TabbedPreviewApp /> };
    }
    
    // 优先级2: Agent详情视图
    if (currentView === 'agent' && selectedAgentType) {
      console.log('🎭 → Choosing: agent-detail');
      return { 
        type: 'agent-detail', 
        component: <AgentDetail agentType={selectedAgentType} onBack={handleBackToNotebook} /> 
      };
    }
    
    // 优先级3: 根据路由视图决定内容
    console.log('🎭 → Switching on routeView:', routeView);
    switch (routeView) {
      case 'empty':
        console.log('🎭 → Choosing: empty-state');
        return { 
          type: 'empty-state', 
          component: <EmptyState onAddCell={handleEmptyStateAddCell} /> 
        };
      
      case 'library':
        console.log('🎭 → Choosing: library-state');
        return { 
          type: 'library-state', 
          component: (
            <LibraryState 
              onSelectNotebook={handleLibrarySelectNotebook}
              onBack={handleLibraryBack}
            />
          ) 
        };
      
      case 'workspace':
        console.log('🎭 → Choosing: main-content (workspace)');
        return { 
          type: 'main-content', 
          component: (
            <MainContent
              cells={cells}
              viewMode={viewMode}
              tasks={tasks}
              currentPhaseId={currentPhaseId}
              currentStepIndex={currentStepIndex}
              getCurrentViewCells={getCurrentViewCells}
              handleAddCell={handleAddCell}
              renderCell={renderCell}
              renderStepNavigation={renderStepNavigation}
              handlePreviousStep={handlePreviousStep}
              handleNextStep={handleNextStep}
              handlePreviousPhase={handlePreviousPhase}
              handleNextPhase={handleNextPhase}
              isFirstPhase={(() => {
                const result = findPhaseIndex();
                return result ? result.phaseIndex === 0 : false;
              })()}
              isLastPhase={(() => {
                const result = findPhaseIndex();
                return result ? result.phaseIndex === result.task.phases.length - 1 : false;
              })()}
            />
          ) 
        };
      
      default:
        // 不要盲目默认到 EmptyState，应该根据 URL 决定
        const currentPath = window.location.pathname;
        console.log('🎭 → Default case triggered, checking URL directly:', currentPath);
        
        if (currentPath === '/') {
          console.log('🎭 → URL shows root, choosing empty-state');
          return { 
            type: 'empty-state', 
            component: <EmptyState onAddCell={handleEmptyStateAddCell} /> 
          };
        } else if (currentPath === '/FoKn/Library') {
          console.log('🎭 → URL shows library, choosing library-state');
          return { 
            type: 'library-state', 
            component: (
              <LibraryState 
                onSelectNotebook={handleLibrarySelectNotebook}
                onBack={handleLibraryBack}
              />
            ) 
          };
        } else if (currentPath.startsWith('/workspace/')) {
          console.log('🎭 → URL shows workspace, choosing main-content');
          return { 
            type: 'main-content', 
            component: (
              <MainContent
                cells={cells}
                viewMode={viewMode}
                tasks={tasks}
                currentPhaseId={currentPhaseId}
                currentStepIndex={currentStepIndex}
                getCurrentViewCells={getCurrentViewCells}
                handleAddCell={handleAddCell}
                renderCell={renderCell}
                renderStepNavigation={renderStepNavigation}
                handlePreviousStep={handlePreviousStep}
                handleNextStep={handleNextStep}
                handlePreviousPhase={handlePreviousPhase}
                handleNextPhase={handleNextPhase}
                isFirstPhase={(() => {
                  const result = findPhaseIndex();
                  return result ? result.phaseIndex === 0 : false;
                })()}
                isLastPhase={(() => {
                  const result = findPhaseIndex();
                  return result ? result.phaseIndex === result.task.phases.length - 1 : false;
                })()}
              />
            ) 
          };
        } else {
          console.log('🎭 → Unknown URL path, showing loading or empty state');
          // 对于未知路径，显示加载状态而不是盲目的 EmptyState
          return { 
            type: 'loading', 
            component: (
              <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading...</div>
              </div>
            )
          };
        }
    }
  }, [
    isShowingFileExplorer, 
    activeFile, 
    currentView, 
    selectedAgentType, 
    routeView,
    handleEmptyStateAddCell,
    handleBackToNotebook,
    handleLibrarySelectNotebook,
    handleLibraryBack,
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
    findPhaseIndex
  ]);

  return (
    <div className="h-screen flex border-r border-black">
      <SettingsPage />
      {(
        <div className="flex">
          <div
            className="transition-all duration-500 ease-in-out relative border-r border-black"
            style={{ width: isCollapsed ? '48px' : `${leftSidebarWidth}px` }}
          >
            <OutlineSidebar
              tasks={tasks}
              currentPhaseId={currentPhaseId}
              currentStepId={currentStepIndex !== null ? tasks.flatMap(task => task.phases).find(p => p.id === currentPhaseId)?.steps[currentStepIndex]?.id : null}
              isCollapsed={isCollapsed}
              onPhaseSelect={handlePhaseSelect}
              onAgentSelect={handleAgentSelect}
              viewMode={viewMode}
              currentRunningPhaseId={currentRunningPhaseId}
              allowPagination={allowPagination}
            />
          </div>
          {!isCollapsed && (
            <div
              className="w-px bg-gray-300 hover:bg-thme-500 cursor-col-resize transition-colors duration-150 relative group"
              onMouseDown={handleLeftResize}
            >
              <div className="absolute inset-y-0 w-1 -translate-x-0.5 group-hover:bg-theme-100/50" />
            </div>
          )}
        </div>
      )}
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden relative m-0 p-0">
        <CommandInput
          onClick={() => setShowCommandInput(true)}
        />
        <Header
          viewMode={viewMode}
          isCollapsed={isCollapsed}
          cells={cells}
          isExecuting={isExecuting}
          isRightSidebarCollapsed={isRightSidebarCollapsed}
          onModeChange={handleModeChange}
          onRunAll={handleRunAll}
          onExportJson={handleExportJson}
          onExportDocx={exportDocx}
          onExportPdf={exportPdf}
          onExportMarkdown={exportMarkdown}
          onTriggerFileInput={triggerFileInput}
          onHandleImport={handleImport}
          onShowCommandInput={() => setShowCommandInput(true)}
          onToggleRightSidebar={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          onOpenSettings={settingstore.openSettings}
          fileInputRef={fileInputRef}
        />

        {/* GlobalTabList - 全局文件标签列表 */}
        <GlobalTabList/>

        <div className="flex-1 overflow-y-auto scroll-smooth border-3 border-theme-200 bg-white w-full h-full">
          {/* 使用单一解析器函数避免条件冲突，提供清晰的优先级顺序 */}
          <div className="w-full h-full">
            {resolveMainContent().component}
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
      {isRightSidebarCollapsed && (
        <div className="flex border-l border-black">
          <div
            className="w-px bg-gray-300 hover:bg-theme-500 cursor-col-resize transition-colors duration-150 relative group"
            onMouseDown={handleRightResize}
          >
            <div className="absolute inset-y-0 w-1 -translate-x-0.5 group-hover:bg-theme-100/50" />
          </div>
          <div
            className="transition-all duration-500 ease-in-out opacity-100 overflow-hidden flex-shrink-0"
            style={{ width: `${rightSidebarWidth}px` }}
          >
            <AIAgentSidebar
              viewMode={viewMode}
              currentPhaseId={currentPhaseId}
              currentStepIndex={currentStepIndex}
            />
          </div>
        </div>
      )}

      {/* WorkflowPanel moved to MainContainer */}

      {/* WorkflowControl - 固定在右下角，在所有模式下都显示 */}
      {<WorkflowControl fallbackViewMode={viewMode} />}
    </div>
  );
};

export default memo(NotebookApp);
