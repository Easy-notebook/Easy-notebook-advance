import pdfMake from 'pdfmake/build/pdfmake';
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

const mainColor = '#9F1239';
const paragraphColor = '#1f2937';
const codeBlockBg = '#fef2f2';
const inlineCodeBg = '#fff7ed';

// 更新字重和字体加载部分
const loadFonts = async () => {
  if (pdfMake.vfs && pdfMake.fonts) return;

  try {
    const fontResponse = await fetch('/fonts/NotoSansSC-VariableFont_wght.ttf');
    if (!fontResponse.ok) {
      throw new Error('Font file not found');
    }
    const fontArrayBuffer = await fontResponse.arrayBuffer();
    const fontBase64 = arrayBufferToBase64(fontArrayBuffer);

    // 为不同字重加载相同的字体文件
    const fontFileName = 'NotoSansSC.ttf';
    const boldFontFileName = 'NotoSansSC-Bold.ttf'; // 虽然是同一个文件，但用不同名字注册

    pdfMake.vfs = {
      [fontFileName]: fontBase64,
      [boldFontFileName]: fontBase64
    };

    pdfMake.fonts = {
      NotoSansSC: {
        normal: fontFileName,
        bold: boldFontFileName, // 明确指定 bold 使用加粗版本
        italics: fontFileName,
        bolditalics: boldFontFileName
      }
    };
  } catch (error) {
    console.warn('Failed to load NotoSansSC font, falling back to Helvetica', error);
    pdfMake.fonts = {
      NotoSansSC: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold', // 使用 Helvetica 的 Bold 版本
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };
  }
};

const getStyles = () => ({
  h1: {
    font: 'NotoSansSC',
    fontSize: 14,
    color: mainColor,
    bold: true, 
    lineHeight: 1.2,
    margin: [0, 0, 0, 3],
    fontWeight: 700 // 添加 fontWeight 属性
  },
  h2Text: {
    font: 'NotoSansSC',
    fontSize: 12,
    color: '#FFFFFF',
    bold: true,
    lineHeight: 1.2,
    fontWeight: 700
  },
  h3: {
    font: 'NotoSansSC',
    fontSize: 11,
    color: mainColor,
    bold: true,
    lineHeight: 1.1,
    margin: [0, 10, 0, 10],
    fontWeight: 700
  },
  paragraph: {
    font: 'NotoSansSC',
    fontSize: 9,
    color: paragraphColor,
    lineHeight: 1.2,
    margin: [0, 0, 0, 8]
  },
  codeBlock: {
    font: 'NotoSansSC',
    fontSize: 9,
    lineHeight: 1.3,
    preserveLeadingSpaces: true,
    noWrap: true
  },
  inlineCode: {
    font: 'NotoSansSC',
    fontSize: 9,
    background: inlineCodeBg,
    color: '#000000',
    margin: [1, 0, 1, 0]
  },
  output: {
    font: 'NotoSansSC',
    fontSize: 9,
    color: '#000000',
    lineHeight: 1.2
  },
  error: {
    font: 'NotoSansSC',
    fontSize: 9,
    color: '#FF0000',
    lineHeight: 1.2
  }
});

// 创建标题相关函数的更新
const createH1Block = (text) => {
  return [
    { 
      text,
      style: 'h1',
      bold: true,
      fontWeight: 700
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 0, y1: 0,
          x2: 400, y2: 0,
          lineWidth: 1,
          lineColor: mainColor
        }
      ],
      margin: [0, 0, 0, 5]
    }
  ];
};

const createH2Block = (text) => {
  return {
    table: {
      widths: ['*'],
      body: [
        [{ 
          text,
          style: 'h2Text',
          alignment: 'left',
          bold: true,
          fontWeight: 700
        }]
      ]
    },
    layout: {
      fillColor: () => mainColor,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 2,
      paddingBottom: () => 2,
      hLineWidth: () => 0,
      vLineWidth: () => 0
    },
    margin: [0, 24, 0, 10]
  };
};

// 其他函数和实现保持不变...
const arrayBufferToBase64 = (buffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
};

const parseCodeHighlight = (code, language = 'python') => {
    try {
        if (!Prism.languages[language]) {
            console.warn(`Language ${language} not found, falling back to plain text`);
            return [{
                text: code,
                style: 'codeBlock',
                color: '#000000'
            }];
        }

        const highlighted = Prism.highlight(code, Prism.languages[language], language);
        if (!highlighted) {
            return [{
                text: code,
                style: 'codeBlock',
                color: '#000000'
            }];
        }

        const parts = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = highlighted;

        const processNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                if (node.textContent) {
                    parts.push({
                        text: node.textContent,
                        style: 'codeBlock',
                        color: '#000000'
                    });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                let color = '#000000';

                const classes = Array.from(node.classList || []);
                if (classes.includes('keyword')) color = '#0000FF';
                else if (classes.includes('string')) color = '#A31515';
                else if (classes.includes('function')) color = '#795E26';
                else if (classes.includes('comment')) color = '#008000';
                else if (classes.includes('number')) color = '#098658';

                if (node.textContent) {
                    parts.push({
                        text: node.textContent,
                        style: 'codeBlock',
                        color
                    });
                }
            }
        };

        Array.from(tempDiv.childNodes).forEach(processNode);

        return parts.length ? parts : [{
            text: code,
            style: 'codeBlock',
            color: '#000000'
        }];
    } catch (error) {
        console.error('Error parsing code highlight:', error);
        return [{
            text: code,
            style: 'codeBlock',
            color: '#000000'
        }];
    }
};

const createCodeBlock = (code, outputs = [], language = 'python') => {
    const codeLines = code.split('\n');
    
    const codeContent = codeLines.map((line, index) => ({
        stack: [{
            text: line ? parseCodeHighlight(line, language) : ' ',
            style: 'codeBlock',
            preserveLeadingSpaces: true
        }],
        margin: [0, index > 0 ? 1 : 0, 0, 0]
    }));

    const mainContainer = {
        table: {
            widths: ['*'],
            body: [[{
                stack: codeContent,
                fillColor: codeBlockBg
            }]]
        },
        layout: {
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 6,
            paddingBottom: () => 6,
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            fillColor: () => codeBlockBg
        },
        margin: [0, 5, 0, 5]
    };

    const result = [mainContainer];

    if (outputs && outputs.length > 0) {
        outputs.forEach(output => {
            if (!output.content) return;

            const outputLines = output.content.split('\n');
            outputLines.forEach(line => {
                result.push({
                    text: line,
                    style: output.type === 'error' ? 'error' : 'output',
                    margin: [0, 1, 0, 1]
                });
            });
        });
    }

    return result;
};

const convertMarkdownToPdf = (content) => {
    const lines = content.split('\n');
    const pdfContent = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
            pdfContent.push({ text: '', margin: [0, 0, 0, 8] });
            return;
        }

        if (line.startsWith('# ')) {
            pdfContent.push(...createH1Block(line.slice(2)));
        } 
        else if (line.startsWith('## ')) {
            pdfContent.push(createH2Block(line.slice(3)));
        }
        else if (line.startsWith('### ')) {
            pdfContent.push({
                text: line.slice(4),
                style: 'h3',
                bold: true,
                fontWeight: 700
            });
        }
        else {
            pdfContent.push({
                text: line,
                style: 'paragraph'
            });
        }
    });

    return pdfContent;
};

export const exportToPdf = async (cells) => {
    try {
        await loadFonts();

        const content = [];

        for (const cell of cells) {
            if (!cell || !cell.type || !cell.content) continue;

            if (cell.type === 'markdown') {
                content.push(...convertMarkdownToPdf(cell.content));
            } 
            else if (cell.type === 'code') {
                const language = typeof cell.language === 'string' ? cell.language : 'python';
                content.push(...createCodeBlock(cell.content, cell.outputs, language));
            }
        }

        const docDefinition = {
            content: content,
            defaultStyle: {
                font: 'NotoSansSC'
            },
            styles: getStyles(),
            pageSize: 'A4',
            pageMargins: [30, 30, 30, 30]
        };

        pdfMake.createPdf(docDefinition).download('notebook.pdf');
    } catch (error) {
        console.error('Error exporting to PDF:', error);
        throw error;
    }
};