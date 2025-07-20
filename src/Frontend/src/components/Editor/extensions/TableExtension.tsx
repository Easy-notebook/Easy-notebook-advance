// 简化的表格扩展，专注于可靠的实时表格解析
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export const SimpleTableExtension = Extension.create({
  name: 'simpleTable',
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('simpleTableParser'),
        
        props: {
          // 处理回车键，检测表格
          handleKeyDown(view, event) {
            if (event.key === 'Enter' && !event.shiftKey) {
              // 检查当前行是否是表格头
              const { state } = view;
              const { $from } = state.selection;
              const currentText = $from.parent.textContent.trim();
              
              console.log('Enter pressed, current text:', currentText);
              
              // 如果当前行包含多个 | 并且看起来像表格头，立即创建表格
              if (isTableHeader(currentText)) {
                console.log('Detected table header, creating table...');
                event.preventDefault(); // 阻止默认回车行为
                createTableFromHeader(view, currentText);
                return true;
              }
            }
            return false;
          },
          
          // 处理文本输入
          handleTextInput(view, from, to, text) {
            // 当输入分隔符相关字符时检查
            if (text === '|' || text === '-') {
              setTimeout(() => {
                tryCreateTable(view);
              }, 50);
            }
            return false;
          }
        }
      })
    ]
  }
})

// 将函数移到插件外部，避免 this 引用问题
function tryCreateTable(view) {
  try {
    const { state } = view
    const { doc } = state
    
    // 收集所有段落
    const paragraphs = []
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        const text = node.textContent.trim()
        if (text) {
          paragraphs.push({
            text,
            pos,
            node,
            nodeSize: node.nodeSize
          })
        }
      }
    })
    
    console.log('Found paragraphs:', paragraphs.map(p => p.text))
    
    // 检查最后两个段落是否构成表格
    if (paragraphs.length >= 2) {
      const last = paragraphs[paragraphs.length - 1]
      const secondLast = paragraphs[paragraphs.length - 2]
      
      console.log('Checking:', secondLast.text, 'and', last.text)
      
      if (isTablePattern(secondLast.text, last.text)) {
        console.log('Creating table!')
        createTableFromParagraphs(view, secondLast, last)
      }
    }
  } catch (e) {
    console.error('Table creation error:', e)
  }
}

// 检测是否是表格头（单行包含多个列）
function isTableHeader(text) {
  // 必须包含 | 并且至少有2列
  const pipes = (text.match(/\|/g) || []).length
  const columns = text.split('|').map(s => s.trim()).filter(s => s).length
  
  console.log('Header check:', text, 'pipes:', pipes, 'columns:', columns)
  
  // 至少要有2个 | 符号（3列）或者1个 | 符号（2列）
  return pipes >= 1 && columns >= 2
}

function isTablePattern(headerLine, separatorLine) {
  const hasHeader = headerLine.includes('|')
  const isSeparator = /^[\s\-:|]+$/.test(separatorLine.replace(/\|/g, ''))
  console.log('Pattern check:', hasHeader, isSeparator, headerLine, separatorLine)
  return hasHeader && isSeparator && separatorLine.includes('-')
}

// 从表格头直接创建完整表格
function createTableFromHeader(view, headerText) {
  const { state } = view
  const { schema } = state
  
  // 解析表头
  const headers = headerText.split('|')
    .map(h => h.trim())
    .filter(h => h)
  
  console.log('Creating table with headers:', headers)
  
  if (headers.length === 0) return
  
  // 创建表格节点
  const headerCells = headers.map(header => 
    schema.nodes.tableHeader.create(
      null,
      schema.nodes.paragraph.create(null, schema.text(header))
    )
  )
  const headerRow = schema.nodes.tableRow.create(null, headerCells)
  
  // 创建一个空数据行
  const emptyCells = headers.map(() =>
    schema.nodes.tableCell.create(
      null,
      schema.nodes.paragraph.create()
    )
  )
  const emptyRow = schema.nodes.tableRow.create(null, emptyCells)
  
  const table = schema.nodes.table.create(null, [headerRow, emptyRow])
  
  // 替换当前段落
  const { tr } = state
  const { $from } = state.selection
  const startPos = $from.before($from.depth)
  const endPos = $from.after($from.depth)
  
  console.log('Replacing paragraph with table from', startPos, 'to', endPos)
  
  tr.replaceWith(startPos, endPos, table)
  
  // 将光标移动到第一个数据单元格
  const newPos = startPos + 1 + headerRow.nodeSize + 1 + 1 // table + headerRow + firstDataRow + firstCell
  tr.setSelection(state.selection.constructor.near(tr.doc.resolve(newPos)))
  
  view.dispatch(tr)
}

function createTableFromParagraphs(view, headerPara, separatorPara) {
  const { state } = view
  const { schema } = state
  
  // 解析表头
  const headers = headerPara.text.split('|')
    .map(h => h.trim())
    .filter(h => h)
  
  console.log('Headers:', headers)
  
  if (headers.length === 0) return
  
  // 创建表格节点
  const headerCells = headers.map(header => 
    schema.nodes.tableHeader.create(
      null,
      schema.nodes.paragraph.create(null, schema.text(header))
    )
  )
  const headerRow = schema.nodes.tableRow.create(null, headerCells)
  
  // 创建一个空数据行
  const emptyCells = headers.map(() =>
    schema.nodes.tableCell.create(
      null,
      schema.nodes.paragraph.create()
    )
  )
  const emptyRow = schema.nodes.tableRow.create(null, emptyCells)
  
  const table = schema.nodes.table.create(null, [headerRow, emptyRow])
  
  // 计算替换范围
  const startPos = headerPara.pos
  const endPos = separatorPara.pos + separatorPara.nodeSize
  
  console.log('Replacing from', startPos, 'to', endPos)
  
  // 执行替换
  const { tr } = state
  tr.replaceWith(startPos, endPos, table)
  view.dispatch(tr)
}

export default SimpleTableExtension;