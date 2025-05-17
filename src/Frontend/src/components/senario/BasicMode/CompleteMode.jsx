import React from 'react';

const CompleteMode = ({ visibleCells, handleAddCell, viewMode, renderCell, CellDivider }) => {
    return (
        <div className="w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto">
            <div className="h-10 w-full"></div>
            <div className="relative space-y-4">
                <div className="h-4 w-full"></div>
                <CellDivider index={0} onAddCell={handleAddCell} viewMode={viewMode} />
                {visibleCells.map((cell, index) => (
                    <React.Fragment key={cell.id}>
                        <div
                            id={`cell-${cell.id}`}
                            className="relative w-full bg-white rounded-lg px-8"
                        >
                            {renderCell(cell)}
                        </div>
                        <CellDivider
                            index={index + 1}
                            onAddCell={handleAddCell}
                            viewMode={viewMode}
                        />
                    </React.Fragment>
                ))}
            </div>
            <div className="h-20 w-full"></div>
        </div>
    );
};

export default CompleteMode;
