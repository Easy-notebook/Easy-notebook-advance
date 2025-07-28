import React from 'react';
import CodeCell from '../../Editor/Cells/CodeCell';
import MarkdownCell from '../../Editor/Cells/MarkdownCell';
import HybridCell from '../../Editor/Cells/HybridCell';
import ImageCell from '../../Editor/Cells/ImageCell';
import AIThinkingCell from '../../Editor/Cells/AIThinkingCell';
import useStore from '../../../store/notebookStore';

const DetachedCellView: React.FC = () => {
    const { getDetachedCell} = useStore();
    const detachedCell = getDetachedCell();

    if (!detachedCell) {
        return null;
    }

    const renderDetachedCell = () => {
        const props = {
            cell: detachedCell,
            isStepMode: false,
            dslcMode: false,
            isInDetachedView: true
        };

        switch (detachedCell.type) {
            case 'code':
                return <CodeCell {...props} />;
            case 'markdown':
                return <MarkdownCell {...props} />;
            case 'Hybrid':
                return <HybridCell {...props} />;
            case 'image':
                return <ImageCell {...props} />;
            case 'thinking':
                return <AIThinkingCell {...props} />;
            default:
                return <CodeCell {...props} />;
        }
    };

    return (
        <div className="w-full h-full bg-gray-50">
            {renderDetachedCell()}
        </div>
    );
};

export default DetachedCellView;