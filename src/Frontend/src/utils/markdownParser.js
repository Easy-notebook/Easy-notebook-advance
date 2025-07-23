// utils/markdownParser.js
import {
    Book
} from 'lucide-react';

const DEFAULT_ICONS = [
    Book // 这里只保留一个图标，您可以根据需要添加更多
];

/**
 * 解析 Markdown 单元格并构建任务、阶段和步骤的结构。
 * @param {Array} cells - 单元格数组。
 * @returns {Array} tasks - 解析后的任务数组。
 */
export function parseMarkdownCells(cells) {
    let currentTask = null;
    let currentPhase = null;
    let currentStep = null;
    const tasks = [];

    // Helper to create new task
    const createTask = (title, index) => ({
        id: `task-${index}-${title}`,
        title,
        phases: []
    });

    // Helper to create new phase
    const createPhase = (title, cellId, icon = null) => ({
        id: `phase-${title}-${cellId}`,
        title,
        icon: icon || DEFAULT_ICONS[0],
        status: 'pending',
        steps: []
    });

    // Helper to create new step
    const createStep = (title, stepIndex, phaseId) => ({
        id: `step-${phaseId}-${stepIndex}-${title}`,
        title,
        status: 'pending',
        startIndex: null,
        endIndex: null
    });

    // Helper to end current step if exists
    const endcurrentStep = (index) => {
        if (currentStep) {
            currentStep.endIndex = index - 1;
            currentStep = null;
        }
    };

    // Helper to end current intro step if exists
    const endCurrentIntroStep = (index) => {
        if (currentPhase?.currentIntroStep) {
            currentPhase.currentIntroStep.endIndex = index - 1;
            currentPhase.currentIntroStep = null;
        }
        if (currentTask?.introPhase?.currentIntroStep) {
            currentTask.introPhase.currentIntroStep.endIndex = index - 1;
            currentTask.introPhase.currentIntroStep = null;
        }
    };

    // Process cells
    cells.forEach((cell, index) => {
        if (cell.type !== 'markdown') {
            // Add non-markdown cells to appropriate content array
            if (currentStep) {
                currentStep.content = currentStep.content || [];
                currentStep.content.push(cell);
            } else if (currentPhase?.currentIntroStep) {
                currentPhase.currentIntroStep.content = currentPhase.currentIntroStep.content || [];
                currentPhase.currentIntroStep.content.push(cell);
            } else if (currentTask?.introPhase?.currentIntroStep) {
                currentTask.introPhase.currentIntroStep.content = currentTask.introPhase.currentIntroStep.content || [];
                currentTask.introPhase.currentIntroStep.content.push(cell);
            }
            return;
        }

        // Process markdown content
        const lines = cell.content.split('\n');
        for (const line of lines) {
            const h1Match = line.match(/^# (.+)/);
            const h2Match = line.match(/^## (.+)/);
            const h3Match = line.match(/^### (.+)/);

            // Handle H1 (Task)
            if (h1Match) {
                // End any current steps or intro steps
                endcurrentStep(index);
                endCurrentIntroStep(index);
                
                const taskTitle = h1Match[1].trim();
                currentTask = createTask(taskTitle, tasks.length);
                tasks.push(currentTask);
                
                // Create project intro phase
                const introPhase = createPhase(taskTitle, cell.id, Book);
                const introStep = createStep(taskTitle, 0, introPhase.id);
                introStep.startIndex = index;
                introPhase.steps.push(introStep);
                introPhase.currentIntroStep = introStep;
                
                currentTask.phases.push(introPhase);
                currentTask.introPhase = introPhase;
                currentPhase = introPhase;
                continue;
            }

            // Handle H2 (Phase)
            if (h2Match && currentTask) {
                // End any current steps or intro steps
                endcurrentStep(index);
                endCurrentIntroStep(index);
                
                const phaseTitle = h2Match[1].trim();
                currentPhase = createPhase(phaseTitle, cell.id);
                currentTask.phases.push(currentPhase);
                
                // Create stage intro step
                const introStep = createStep('Stage Intro & Input', 0, currentPhase.id);
                introStep.startIndex = index;
                currentPhase.steps.push(introStep);
                currentPhase.currentIntroStep = introStep;
                continue;
            }

            // Handle H3 (Step)
            if (h3Match && currentPhase) {
                // End any current steps or intro steps
                endcurrentStep(index);
                endCurrentIntroStep(index);
                
                const stepTitle = h3Match[1].trim();
                const stepIndex = currentPhase.steps.length;
                currentStep = createStep(stepTitle, stepIndex, currentPhase.id);
                currentStep.startIndex = index;
                currentPhase.steps.push(currentStep);
                continue;
            }

            // Handle content lines
            if (!line.match(/^#{1,3}/)) {
                if (currentStep) {
                    currentStep.content = currentStep.content || [];
                    currentStep.content.push(cell);
                } else if (currentPhase?.currentIntroStep) {
                    currentPhase.currentIntroStep.content = currentPhase.currentIntroStep.content || [];
                    currentPhase.currentIntroStep.content.push(cell);
                } else if (currentTask?.introPhase?.currentIntroStep) {
                    currentTask.introPhase.currentIntroStep.content = currentTask.introPhase.currentIntroStep.content || [];
                    currentTask.introPhase.currentIntroStep.content.push(cell);
                }
            }
        }
    });

    // Set end index for the last steps
    tasks.forEach(task => {
        task.phases.forEach(phase => {
            if (phase.currentIntroStep) {
                phase.currentIntroStep.endIndex = cells.length - 1;
            }
            phase.steps.forEach(step => {
                if (step.endIndex === null) {
                    step.endIndex = cells.length - 1;
                }
            });
        });
    });

    return tasks;
}

/**
 * 根据阶段 ID 获取对应的单元格。
 * @param {Array} tasks - 任务数组。
 * @param {string} phaseId - 阶段 ID。
 * @returns {Object} - 包含阶段介绍和步骤的单元格数组。
 */
export function findCellsByPhase(tasks, phaseId) {
    if (!phaseId || !tasks || tasks.length === 0) {
        return { intro: [], steps: [] };
    }

    for (const task of tasks) {
        const phase = task.phases.find(p => p.id === phaseId);
        if (phase) {
            return {
                intro: phase.intro || [],
                steps: phase.steps
            };
        }
    }

    return { intro: [], steps: [] };
}

/**
 * 根据阶段 ID 和步骤 ID 获取对应的单元格。
 * @param {Array} tasks - 任务数组。
 * @param {string} phaseId - 阶段 ID。
 * @param {string} stepId - 步骤 ID。
 * @param {Array} cells - 所有单元格数组。
 * @returns {Array} - 对应步骤的单元格数组。
 */
export function findCellsByStep(tasks, phaseId, stepId, cells) {
    if (!phaseId || !stepId || !tasks) {
        return [];
    }

    for (const task of tasks) {
        const phase = task.phases.find(p => p.id === phaseId);
        if (phase) {
            const step = phase.steps.find(s => s.id === stepId);
            if (step) {
                const start = step.startIndex;
                const end = step.endIndex !== null ? step.endIndex : cells.length - 1;
                return cells.slice(start, end + 1);
            }
        }
    }

    return [];
}
