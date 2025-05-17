// utils/exportUtils.js
import { exportToJson } from './exportToJson';
import { exportToDocx } from './exportToDocx';
import { exportToPdf } from './exportToPDF';
import { exportToMarkdown } from './exportToMarkdown';

export const exportTypes = {
  json: {
    title: "Export as JSON",
    description: "Save notebook with all metadata as JSON file",
    handler: (cells, tasks) => exportToJson(cells, tasks)
  },
  docx: {
    title: "Export as DOCX",
    description: "Export as Microsoft Word document",
    handler: (cells) => exportToDocx(cells)
  },
  pdf: {
    title: "Export as PDF",
    description: "Export as PDF document",
    handler: (cells) => exportToPdf(cells)
  },
  markdown: {
    title: "Export as Markdown",
    description: "Export as Markdown document",
    handler: (cells) => exportToMarkdown(cells)
  }
};

// 简化的导出处理器创建函数
export const createExportHandlers = (cells, tasks) => ({
  exportJson: () => exportTypes.json.handler(cells, tasks),
  exportDocx: () => exportTypes.docx.handler(cells),
  exportPdf: () => exportTypes.pdf.handler(cells),
  exportMarkdown: () => exportTypes.markdown.handler(cells)
});