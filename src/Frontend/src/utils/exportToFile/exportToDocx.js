// components/UI/ExportToDocx.jsx

import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from 'docx';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';

// VSCode light theme colors
const vsCodeTheme = {
  background: "F8F9FA",
  text: "000000",
  keyword: "0000FF",    // 蓝色 - 关键字
  string: "A31515",     // 红色 - 字符串
  function: "795E26",   // 棕色 - 函数
  comment: "008000",    // 绿色 - 注释
  variable: "001080",   // 深蓝 - 变量
  number: "098658",     // 绿色 - 数字
  operator: "000000",   // 黑色 - 操作符
  punctuation: "000000" // 黑色 - 标点符号
};

// 辅助函数：创建带样式的段落
const createStyledParagraph = (text, style) => {
  const baseRun = {
    text,
    font: "ui-sans-serif",
    size: style.size || 24, // size in half-points (e.g., 24 = 12pt)
    color: style.color || "000000",
    bold: style.bold || false
  };

  return new Paragraph({
    children: [new TextRun(baseRun)],
    spacing: style.spacing || { after: 200 },
    ...style.paragraph
  });
};

// 辅助函数：将 Prism tokens 转换为 TextRun 数组
const parseCodeTokens = (tokens) => {
  const runs = [];
  tokens.forEach(token => {
    if (typeof token === 'string') {
      // 处理纯文本
      runs.push(new TextRun({
        text: token,
        color: vsCodeTheme.text,
        font: "Consolas",
        size: 20, // 10pt
      }));
    } else if (typeof token.content === 'string') {
      // 处理带类型的 token
      let color = vsCodeTheme.text;
      switch (token.type) {
        case 'keyword':
          color = vsCodeTheme.keyword;
          break;
        case 'string':
          color = vsCodeTheme.string;
          break;
        case 'function':
          color = vsCodeTheme.function;
          break;
        case 'comment':
          color = vsCodeTheme.comment;
          break;
        case 'number':
          color = vsCodeTheme.number;
          break;
        case 'operator':
          color = vsCodeTheme.operator;
          break;
        case 'punctuation':
          color = vsCodeTheme.punctuation;
          break;
        default:
          color = vsCodeTheme.text;
      }

      runs.push(new TextRun({
        text: token.content,
        color: color,
        font: "Consolas",
        size: 20, // 10pt
      }));
    } else if (Array.isArray(token.content)) {
      // 处理嵌套的 token
      token.content.forEach(childToken => {
        let color = vsCodeTheme.text;
        switch (childToken.type) {
          case 'keyword':
            color = vsCodeTheme.keyword;
            break;
          case 'string':
            color = vsCodeTheme.string;
            break;
          case 'function':
            color = vsCodeTheme.function;
            break;
          case 'comment':
            color = vsCodeTheme.comment;
            break;
          case 'number':
            color = vsCodeTheme.number;
            break;
          case 'operator':
            color = vsCodeTheme.operator;
            break;
          case 'punctuation':
            color = vsCodeTheme.punctuation;
            break;
          default:
            color = vsCodeTheme.text;
        }

        runs.push(new TextRun({
          text: childToken.content,
          color: color,
          font: "Consolas",
          size: 20, // 10pt
        }));
      });
    }
  });
  return runs;
};

// 辅助函数：将 Base64 图片转换为 ImageRun
const createImageRun = (base64String, width = 600, height = 400) => {
  // 移除 Base64 前缀
  const matches = base64String.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
  if (!matches) {
    console.error('Invalid Base64 image string:', base64String);
    return null;
  }

  const mimeType = matches[1];
  const imageData = matches[2];
  const binaryString = atob(imageData);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return new ImageRun({
    data: bytes,
    transformation: {
      width,
      height,
    },
  });
};

// 处理代码块
const createCodeBlock = (code, outputs = [], language = 'python') => { // 默认为 Python
  const paragraphs = [];

  // 检查语言是否被 Prism 支持
  if (!Prism.languages[language]) {
    console.error(`Prism does not support the language: ${language}`);
    // 选择默认语言或抛出错误
    language = 'plaintext';
  }

  // 添加代码块的上边距
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: "", size: 20 })],
    spacing: { before: 240 } // 12pt
  }));

  // 将代码分割成行
  const codeLines = code.split('\n');
  codeLines.forEach((line, index) => {
    // Tokenize the line
    const tokens = Prism.tokenize(line, Prism.languages[language]);

    // Parse tokens to TextRuns
    const runs = parseCodeTokens(tokens);

    // 创建代码行段落
    paragraphs.push(new Paragraph({
      children: runs,
      spacing: { before: 0, after: 0 },
      shading: {
        type: "clear",
        fill: vsCodeTheme.background,
      }
    }));
  });

  // 处理输出
  if (outputs && outputs.length > 0) {
    outputs.forEach(output => {
      if (!output.content) return;

      if (output.type === 'image') {
        const imageRun = createImageRun(output.content);
        if (imageRun) {
          paragraphs.push(new Paragraph({
            children: [imageRun],
            spacing: { before: 200, after: 200 }
          }));
        }
      } else {
        // 处理文本和错误输出
        const outputLines = output.content.split('\n');
        outputLines.forEach((line, index) => {
          paragraphs.push(new Paragraph({
            children: [
              new TextRun({
                text: line,
                font: "Consolas",
                size: 18, // 9pt
                color: output.type === 'error' ? "FF0000" : "000000",
                break: index < outputLines.length - 1 ? 1 : 0
              })
            ],
            spacing: { before: 0, after: 0 }
          }));
        });
      }
    });
  }

  // 添加代码块的下边距
  paragraphs.push(new Paragraph({
    children: [new TextRun({ text: "", size: 20 })],
    spacing: { after: 240 } // 12pt
  }));

  return paragraphs;
};

// 转换 Markdown 内容
const convertMarkdownToDocx = (content) => {
  const lines = content.split('\n');
  const docxParagraphs = [];

  lines.forEach(line => {
    if (!line.trim()) return;

    if (line.startsWith('# ')) {
      docxParagraphs.push(createStyledParagraph(line.slice(2), {
        size: 30, // 15pt
        color: "9F1932",
        bold: true,
        spacing: { after: 240 },
        paragraph: {
          heading: HeadingLevel.HEADING_1,
          border: {
            bottom: {
              color: "9F1932",
              size: 1,
              space: 1,
              style: "single",
            },
          },
        }
      }));
    } 
    else if (line.startsWith('## ')) {
      docxParagraphs.push(createStyledParagraph(line.slice(3), {
        size: 26, // 13pt
        color: "FFFFFF",
        bold: true,
        spacing: { after: 240 },
        paragraph: {
          heading: HeadingLevel.HEADING_2,
          shading: {
            type: "clear",
            fill: "9F1932",
          }
        }
      }));
    }
    else if (line.startsWith('### ')) {
      docxParagraphs.push(createStyledParagraph(line.slice(4), {
        size: 24, // 12pt
        color: "9F1932",
        bold: true,
        spacing: { after: 240 },
        paragraph: {
          heading: HeadingLevel.HEADING_3,
        }
      }));
    }
    else {
      docxParagraphs.push(createStyledParagraph(line, {
        size: 20, // 10pt
        spacing: { after: 200 }
      }));
    }
  });

  return docxParagraphs;
};

// 主导出函数
export const exportToDocx = async (cells) => {
  try {
    // 收集所有段落
    const children = [];
    cells.forEach(cell => {
      if (cell.type === 'markdown') {
        children.push(...convertMarkdownToDocx(cell.content));
      } 
      else if (cell.type === 'code') {
        // 获取语言类型，默认为 python
        const language = cell.language || 'python';
        children.push(...createCodeBlock(cell.content, cell.outputs, language));
      }
    });

    // 创建文档
    const doc = new Document({
      sections: [{
        properties: {},
        children: children
      }],
      styles: {
        default: {
          document: {
            run: {
              font: "ui-sans-serif"
            }
          }
        }
      }
    });

    // 导出为blob并下载
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook.docx';
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to DOCX:', error);
    throw error;
  }
};
