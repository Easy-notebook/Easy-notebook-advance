import React, { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';

// Import Canvas components
import { BrainCellGraphEditor, BrainCellGraphEditorRef } from '../../../Canvas';

// Import local components
import GraphManager from './GraphManager';
import SaveDialog from './SaveDialog';
import { useEasyNetStore } from './useEasyNetStore';
import { EasyNetStateProps } from './types';

const EasyNetState: React.FC<EasyNetStateProps> = () => {
  const {
    currentGraph,
    savedGraphs,
    saveGraph,
    loadGraph,
    deleteGraph,
    createNewGraph,
    updateCurrentGraph,
  } = useEasyNetStore();

  const [showGraphManager, setShowGraphManager] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [canvasRef, setCanvasRef] = useState<BrainCellGraphEditorRef | null>(null);

  // Auto-save current graph data when canvas changes
  const handleGraphChange = useCallback((nodes: any[], edges: any[]) => {
    if (currentGraph) {
      updateCurrentGraph({ nodes, edges });
    }
  }, [currentGraph, updateCurrentGraph]);

  const handleSave = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  const handleLoad = useCallback(() => {
    setShowGraphManager(true);
  }, []);

  const handleNew = useCallback(() => {
    createNewGraph();
    message.success('已创建新图表');
  }, [createNewGraph]);

  const handleSaveConfirm = useCallback((name: string, description: string) => {
    // Get current graph data from canvas
    const graphData = canvasRef?.getGraphData?.() || { nodes: [], edges: [] };
    saveGraph(name, description, graphData);
  }, [saveGraph, canvasRef]);

  const handleLoadGraph = useCallback((id: string) => {
    loadGraph(id);
    // The canvas will be updated via useEffect when currentGraph changes
  }, [loadGraph]);

  // Load graph data into canvas when currentGraph changes
  useEffect(() => {
    if (currentGraph && canvasRef && canvasRef.loadGraphData) {
      canvasRef.loadGraphData(currentGraph.data);
    }
  }, [currentGraph, canvasRef]);

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">

      {/* Main Content - Canvas */}
      <div className="flex-1 relative">
        <BrainCellGraphEditor
          ref={setCanvasRef}
          onGraphChange={handleGraphChange}
          initialData={currentGraph?.data}
        />
      </div>

      {/* Dialogs */}
      <GraphManager
        visible={showGraphManager}
        onClose={() => setShowGraphManager(false)}
        savedGraphs={savedGraphs}
        onLoadGraph={handleLoadGraph}
        onDeleteGraph={deleteGraph}
      />

      <SaveDialog
        visible={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveConfirm}
        initialName={currentGraph?.name}
        initialDescription={currentGraph?.description}
      />
    </div>
  );
};

export default EasyNetState;