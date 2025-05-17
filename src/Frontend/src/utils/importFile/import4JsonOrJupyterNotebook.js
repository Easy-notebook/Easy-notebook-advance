// components/Notebook/useImportNotebook.js

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useStore from '../../store/notebookStore';
import { useToast } from '../../components/UI/Toast';
import { notebookApiIntegration } from '../../services/notebookServices';

/**
 * 自定义 Hook 处理 Notebook 导入逻辑，包括自定义格式和 Jupyter Notebook 格式。
 */
const ImportNotebook4JsonOrJupyter = () => {
    const {
        setNotebookId,
        addCell,
        clearCells,
        setCurrentPhase,
        setCurrentStepIndex,
        setViewMode,
        setCurrentRunningPhaseId,
        setError,
    } = useStore();

    const { toast } = useToast();

    const initializeNotebook = useCallback(async () => {
        try {
            const notebook_id = await notebookApiIntegration.initializeNotebook();
            if (notebook_id) {
                setNotebookId(notebook_id);
                console.log('New Notebook created:', notebook_id);
                toast({
                    title: "Success",
                    description: "New Notebook created successfully",
                    variant: "success",
                });
            } else {
                throw new Error('Failed to create Notebook');
            }
        } catch (err) {
            console.error('Error creating Notebook:', err);
            setError('Failed to create Notebook. Please try again.');
            toast({
                title: "Error",
                description: err.message,
                variant: "destructive",
            });
        }
    }, [setNotebookId, setError, toast]);

    /**
     * 解析 Markdown 内容，分离标题和正文，并根据标题层级管理堆栈结构
     * @param {string} content - Markdown 内容
     * @param {Array} stack - 当前的标题堆栈
     * @returns {Array} - 分离后的单元格数组
     */
    const parseMarkdownContent = (content, stack) => {
        const lines = content.split('\n');
        const cells = [];
        let currentContent = [];

        lines.forEach(line => {
            const titleMatch = line.match(/^(#{1,6})\s+(.*)/);
            if (titleMatch) {
                // 如果当前有正文内容，先将其作为一个单元格添加
                if (currentContent.length > 0) {
                    cells.push({
                        type: 'markdown',
                        content: currentContent.join('\n'),
                        id: `content-${uuidv4()}`,
                    });
                    currentContent = [];
                }

                const hashes = titleMatch[1];
                const titleText = titleMatch[2].trim();
                let level = hashes.length;

                // 根据堆栈管理标题层级
                while (stack.length > 0 && stack[stack.length - 1] >= level) {
                    stack.pop();
                }
                const currentLevel = stack.length + 1;
                stack.push(level);

                // 创建标题单元格
                cells.push({
                    type: 'markdown',
                    content: `${'#'.repeat(currentLevel)} ${titleText}`,
                    id: `title-${uuidv4()}`,
                    level: currentLevel, // 记录标题级别
                });
            } else {
                currentContent.push(line);
            }
        });

        // 添加剩余的正文内容
        if (currentContent.length > 0) {
            cells.push({
                type: 'markdown',
                content: currentContent.join('\n'),
                id: `content-${uuidv4()}`,
            });
        }

        return cells;
    };

    // Import Custom Notebook format
    const importCustomNotebook = useCallback(async (importedData) => {
        if (!importedData.cells || !Array.isArray(importedData.cells)) {
            throw new Error('Invalid Notebook format: Missing cells array');
        }

        clearCells(); // 清除现有单元格

        // 处理 notebook_id
        // if (importedData.notebook_id) {
        //     console.log('Imported Notebook ID:', importedData.notebook_id);
        //     setNotebookId(importedData.notebook_id);
        // } else {
        await initializeNotebook();
        // }

        const titleStack = []; // 初始化标题堆栈

        // 导入单元格
        for (let index = 0; index < importedData.cells.length; index++) {
            const cell = importedData.cells[index];
            if (cell.type === 'markdown') {
                const parsedCells = parseMarkdownContent(cell.content, titleStack);
                parsedCells.forEach(parsedCell => {
                    const cellWithNewId = {
                        ...parsedCell,
                        id: `imported-${uuidv4()}`,
                        outputs: parsedCell.outputs || [],
                        phaseId: parsedCell.phaseId || null,
                    };
                    addCell(cellWithNewId);
                });
            } else {
                const cellWithNewId = {
                    ...cell,
                    id: `imported-${uuidv4()}`,
                    outputs: cell.outputs || [],
                    phaseId: cell.phaseId || null,
                };
                addCell(cellWithNewId);
            }
        }

        // 重置视图状态
        setCurrentPhase(null);
        setCurrentStepIndex(0);
        setViewMode('complete');
        setCurrentRunningPhaseId(null);
    }, [
        clearCells,
        setNotebookId,
        initializeNotebook,
        addCell,
        setCurrentPhase,
        setCurrentStepIndex,
        setViewMode,
        setCurrentRunningPhaseId,
    ]);

    // Import Jupyter Notebook format
    const importJupyterNotebook = useCallback(async (jupyterData) => {
        if (!jupyterData.cells || !Array.isArray(jupyterData.cells)) {
            throw new Error('Invalid Jupyter Notebook format: Missing cells array');
        }

        clearCells(); // 清除现有单元格

        // 处理 notebook_id，根据 Jupyter 元数据或其他字段设置
        if (jupyterData.metadata && jupyterData.metadata.name) {
            setNotebookId(jupyterData.metadata.name);
        } else {
            await initializeNotebook();
        }

        const titleStack = []; // 初始化标题堆栈

        // 导入 Jupyter 单元格
        for (let index = 0; index < jupyterData.cells.length; index++) {
            const cell = jupyterData.cells[index];
            if (cell.cell_type === 'markdown') {
                const content = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
                const parsedCells = parseMarkdownContent(content, titleStack);
                parsedCells.forEach(parsedCell => {
                    const newCell = {
                        ...parsedCell,
                        id: `imported-${uuidv4()}`,
                        phaseId: null, // 如果需要，可以设置 phaseId
                        outputs: [],
                    };
                    addCell(newCell);
                });
            } else if (cell.cell_type === 'code') {
                const newCell = {
                    id: `imported-${uuidv4()}`,
                    type: 'code',
                    content: Array.isArray(cell.source) ? cell.source.join('') : cell.source,
                    outputs: Array.isArray(cell.outputs) ? cell.outputs.map(output => ({
                        output_type: output.output_type,
                        data: output.data || {},
                        execution_count: output.execution_count || null,
                    })) : [],
                    phaseId: null, // 设置 phaseId 如果需要
                };
                addCell(newCell);
            } else {
                // 处理其他类型的单元格
                const newCell = {
                    id: `imported-${uuidv4()}`,
                    type: cell.cell_type,
                    content: Array.isArray(cell.source) ? cell.source.join('') : cell.source,
                    outputs: Array.isArray(cell.outputs) ? cell.outputs.map(output => ({
                        output_type: output.output_type,
                        data: output.data || {},
                        execution_count: output.execution_count || null,
                    })) : [],
                    phaseId: null,
                };
                addCell(newCell);
            }
        }

        // 重置视图状态
        setCurrentPhase(null);
        setCurrentStepIndex(0);
        setViewMode('complete');
        setCurrentRunningPhaseId(null);
    }, [
        clearCells,
        setNotebookId,
        initializeNotebook,
        addCell,
        setCurrentPhase,
        setCurrentStepIndex,
        setViewMode,
        setCurrentRunningPhaseId,
    ]);

    // 处理文件导入
    const handleImport = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (fileExtension === 'ipynb') {  // **[Modification 1]**: 检查是否为 Jupyter Notebook 文件
            // 处理 Jupyter Notebook 文件导入
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const jupyterData = JSON.parse(event.target.result);
                    await importJupyterNotebook(jupyterData);
                    toast({
                        title: "Success",
                        description: "Jupyter Notebook imported successfully",
                        variant: "success",
                    });
                    e.target.value = ''; // 清除文件输入
                } catch (err) {
                    console.error('Error importing Jupyter Notebook:', err);
                    setError('Failed to import Jupyter Notebook. Please check the file format and try again.');
                    toast({
                        title: "Error",
                        description: err.message,
                        variant: "destructive",
                    });
                }
            };
            reader.readAsText(file);
        } else {  // **[Modification 2]**: 默认处理自定义格式
            // 处理自定义 Notebook 格式导入
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    await importCustomNotebook(importedData);
                    toast({
                        title: "Success",
                        description: "Custom Notebook imported successfully",
                        variant: "success",
                    });
                    e.target.value = ''; // 清除文件输入
                } catch (err) {
                    console.error('Error importing custom Notebook:', err);
                    setError('Failed to import Notebook. Please check the file format and try again.');
                    toast({
                        title: "Error",
                        description: err.message,
                        variant: "destructive",
                    });
                }
            };
            reader.readAsText(file);
        }
    }, [
        importJupyterNotebook,
        importCustomNotebook,
        toast,
        setError,
    ]);

    return { handleImport, initializeNotebook };
};

export default ImportNotebook4JsonOrJupyter;