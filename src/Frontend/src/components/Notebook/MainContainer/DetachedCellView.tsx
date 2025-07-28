import React from 'react';
import { Code, Monitor, Minimize2, Maximize2, Split } from 'lucide-react';
import CodeCell from '../../Editor/CodeCell';
import useStore from '../../../store/notebookStore';

const DetachedCellView: React.FC = () => {
    const { getDetachedCell, setDetachedCellId, isDetachedCellFullscreen, toggleDetachedCellFullscreen } = useStore();
    const detachedCell = getDetachedCell();

    if (!detachedCell) {
        return null;
    }

    return (
        <div className="w-full h-full flex flex-col bg-gray-50">
            {/* 标题栏 */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 text-blue-600" />
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">
                            {isDetachedCellFullscreen ? 'Fullscreen Code Cell' : 'Split View Code Cell'}
                        </h2>
                        <p className="text-sm text-gray-500">Cell ID: {detachedCell.id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleDetachedCellFullscreen}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                        title={isDetachedCellFullscreen ? "Switch to split view" : "Switch to fullscreen"}
                    >
                        {isDetachedCellFullscreen ? (
                            <>
                                <Split className="w-4 h-4" />
                                Split View
                            </>
                        ) : (
                            <>
                                <Maximize2 className="w-4 h-4" />
                                Fullscreen
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setDetachedCellId(null)}
                        className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors flex items-center gap-2"
                        title="Return to normal view"
                    >
                        <Minimize2 className="w-4 h-4" />
                        Close
                    </button>
                </div>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 min-h-0 overflow-auto p-4">
                <div className="h-full min-h-full">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden min-h-full">
                        <CodeCell 
                            cell={detachedCell} 
                            isStepMode={false}
                            dslcMode={false}
                            isInDetachedView={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetachedCellView;