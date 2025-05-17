const StepMode = ({
    tasks,
    currentPhaseId,
    currentStepIndex,
    cells,
    findCellsByStep,
    renderCell,
    renderStepNavigation
}) => {
    if (!currentPhaseId) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Please select a phase to begin</p>
            </div>
        );
    }

    const phase = tasks.find(task =>
        task.phases.some(p => p.id === currentPhaseId)
    )?.phases.find(p => p.id === currentPhaseId);

    if (!phase) {
        console.warn(`Phase with id "${currentPhaseId}" not found.`);
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Selected phase not found</p>
            </div>
        );
    }

    const currentStep = phase.steps[currentStepIndex];
    if (!currentStep) {
        console.warn(`Step with index "${currentStepIndex}" not found in phase "${currentPhaseId}".`);
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Step not found</p>
            </div>
        );
    }

    const stepCells = findCellsByStep(tasks, currentPhaseId, currentStep.id, cells);

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-12">
                <div className="relative space-y-4 max-w-screen-xl mx-auto">
                    {stepCells.map((cell) => (
                        <div
                            key={cell.id}
                            id={`cell-${cell.id}`}
                            className="relative w-full bg-white rounded-lg transition-all duration-300"
                        >
                            {renderCell(cell)}
                        </div>
                    ))}
                </div>
            </div>
            {renderStepNavigation()}
        </div>
    );
};

export default StepMode;
