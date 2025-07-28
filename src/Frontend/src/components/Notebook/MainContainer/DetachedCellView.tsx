import React from 'react';
import CodeCell from '../../Editor/CodeCell';
import useStore from '../../../store/notebookStore';

const DetachedCellView: React.FC = () => {
    const { getDetachedCell} = useStore();
    const detachedCell = getDetachedCell();

    if (!detachedCell) {
        return null;
    }

    return (
        <div className="w-full h-full bg-gray-50">
            <CodeCell
                cell={detachedCell}
                isStepMode={false}
                dslcMode={false}
                isInDetachedView={true}
            />
        </div>
    );
};

export default DetachedCellView;