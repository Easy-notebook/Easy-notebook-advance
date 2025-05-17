// utils/markdownExport.js
import { saveAs } from 'file-saver';

const CELL_SEPARATOR = '\n\n---\n\n';
const CODE_BLOCK_DELIMITER = '```';

/**
 * Convert a cell's outputs to markdown format
 * @param {Array} outputs - Array of cell outputs
 * @returns {string} Markdown formatted outputs
 */
const formatOutputs = (outputs) => {
  if (!outputs || outputs.length === 0) return '';

  return outputs.map(output => {
    if (output.type === 'image') {
      // For images, create a markdown image tag with base64 content
      return `![Output](${output.content})`;
    } else if (output.type === 'error') {
      // For errors, create a code block with error formatting
      return `\n❌ Error:\n${CODE_BLOCK_DELIMITER}\n${output.content}\n${CODE_BLOCK_DELIMITER}\n`;
    } else {
      // For regular text output
      return `\nOutput:\n${CODE_BLOCK_DELIMITER}\n${output.content}\n${CODE_BLOCK_DELIMITER}\n`;
    }
  }).join('\n');
};

/**
 * Convert a code cell to markdown format
 * @param {Object} cell - Code cell object
 * @returns {string} Markdown formatted code cell
 */
const convertCodeCellToMarkdown = (cell) => {
  const codeBlock = `${CODE_BLOCK_DELIMITER}python\n${cell.content || ''}\n${CODE_BLOCK_DELIMITER}`;
  const outputs = formatOutputs(cell.outputs);
  
  return `${codeBlock}\n${outputs}`;
};

/**
 * Add frontmatter to the markdown document
 * @param {Array} cells - Array of notebook cells
 * @returns {string} Frontmatter section
 */
const createFrontmatter = (cells) => {
  const date = new Date().toISOString().split('T')[0];
  const totalCells = cells.length;
  const codeCells = cells.filter(cell => cell.type === 'code').length;
  const markdownCells = cells.filter(cell => cell.type === 'markdown').length;

  return `---
title: Exported Notebook
date: ${date}
cells:
  total: ${totalCells}
  code: ${codeCells}
  markdown: ${markdownCells}
---

`;
};

/**
 * Export notebook cells to markdown format
 * @param {Array} cells - Array of notebook cells
 * @param {string} filename - Output filename
 */
const exportToMarkdown = (cells, filename = 'notebook.md') => {
  try {
    // Create frontmatter
    let markdownContent = createFrontmatter(cells);

    // Convert each cell
    const cellsContent = cells.map(cell => {
      if (cell.type === 'markdown') {
        return cell.content || '';
      } else if (cell.type === 'code') {
        return convertCodeCellToMarkdown(cell);
      }
      return '';
    });

    // Combine all content with separators
    markdownContent += cellsContent.join(CELL_SEPARATOR);

    // Create and save the file
    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, filename);

  } catch (error) {
    console.error('Error generating Markdown:', error);
    throw error;
  }
};

export { exportToMarkdown };