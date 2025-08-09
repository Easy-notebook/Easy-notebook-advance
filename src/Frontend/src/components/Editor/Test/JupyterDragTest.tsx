import React, { useRef } from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';
import useStore from '../../../store/notebookStore';

const JupyterDragTest: React.FC = () => {
  const editorRef = useRef(null);
  const { cells, setCells, clearCells } = useStore();

  // 创建测试数据
  const createTestCells = () => {
    console.log('🔄 创建测试cells');
    
    clearCells();
    
    const testCells = [
      {
        id: 'test-title',
        type: 'markdown',
        content: '# Jupyter风格拖拽测试\n\n这是一个测试Jupyter风格拖拽功能的页面。',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'test-code-1',
        type: 'code',
        language: 'python',
        content: '# 第一个代码块\nprint("Hello, World!")\nx = 42\nprint(f"答案是: {x}")',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'test-markdown-1',
        type: 'markdown',
        content: '## 说明文档\n\n这是一个markdown单元格，包含：\n\n- **拖拽功能**：使用左侧的拖拽手柄\n- **上下移动**：使用箭头按钮\n- **复制删除**：使用相应的按钮',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'test-code-2',
        type: 'code',
        language: 'python',
        content: '# 第二个代码块\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# 生成数据\nx = np.linspace(0, 10, 100)\ny = np.sin(x)\n\n# 绘图\nplt.plot(x, y)\nplt.title("正弦函数")\nplt.show()',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'test-markdown-2',
        type: 'markdown',
        content: '### 拖拽测试说明\n\n1. **悬停显示工具栏**：将鼠标悬停在任意cell上\n2. **拖拽移动**：点击并拖拽左侧的手柄图标\n3. **视觉反馈**：观察拖拽时的动画效果\n4. **放置指示器**：蓝色线条显示放置位置',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'test-code-3',
        type: 'code',
        language: 'javascript',
        content: '// JavaScript代码块\nconsole.log("这是一个JavaScript代码块");\n\nconst data = [1, 2, 3, 4, 5];\nconst doubled = data.map(x => x * 2);\nconsole.log("翻倍后的数据:", doubled);',
        outputs: [],
        enableEdit: true,
      }
    ];

    setTimeout(() => {
      console.log('📝 设置测试cells:', testCells);
      setCells(testCells);
    }, 100);
  };

  const clearContent = () => {
    console.log('🗑️ 清空内容');
    clearCells();
  };

  const showCellOrder = () => {
    console.log('📋 当前cell顺序:');
    cells.forEach((cell, index) => {
      console.log(`${index + 1}. ${cell.type} - ${cell.id} - ${cell.content.substring(0, 30)}...`);
    });
  };

  const debugDragElements = () => {
    console.log('🔍 调试拖拽元素:');
    const elements = document.querySelectorAll('[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]');
    elements.forEach((el, index) => {
      const element = el as HTMLElement;
      const rect = element.getBoundingClientRect();
      console.log(`${index + 1}. ${element.tagName} - cellId: ${element.getAttribute('data-cell-id')} - type: ${element.getAttribute('data-type')} - 位置: ${rect.top.toFixed(0)}px`);
    });

    console.log('🔍 调试markdown元素:');
    const markdownElements = document.querySelectorAll('.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3');
    markdownElements.forEach((el, index) => {
      const element = el as HTMLElement;
      const rect = element.getBoundingClientRect();
      console.log(`${index + 1}. ${element.tagName} - 内容: ${element.textContent?.substring(0, 30)}... - 位置: ${rect.top.toFixed(0)}px`);
    });

    console.log('🔍 cells数组顺序:');
    cells.forEach((cell, index) => {
      console.log(`${index + 1}. ${cell.type} - ${cell.id} - ${cell.content.substring(0, 30)}...`);
    });
  };

  const testPreciseDrag = () => {
    console.log('🎯 精确拖拽测试:');
    console.log('请按以下步骤测试拖拽锁定功能:');
    console.log('1. 悬停在第1个元素上，确认工具栏出现');
    console.log('2. 开始拖拽，观察控制台"已锁定"消息');
    console.log('3. 拖拽过程中移动到其他元素上，确认不会切换目标');
    console.log('4. 完成拖拽，验证移动的是最初选中的元素');
    console.log('5. 重复测试不同位置的元素');

    // 显示当前状态
    debugDragElements();
  };

  const testDragLocking = () => {
    console.log('🔒 拖拽锁定测试:');
    console.log('测试步骤:');
    console.log('1. 悬停在任意cell上');
    console.log('2. 开始拖拽（点击拖拽手柄）');
    console.log('3. 拖拽过程中移动鼠标到其他cell上');
    console.log('4. 观察是否仍然拖拽的是最初选中的cell');
    console.log('5. 完成拖拽，验证结果');

    console.log('预期行为:');
    console.log('- 拖拽开始时会锁定目标cell');
    console.log('- 拖拽过程中不会切换到其他cell');
    console.log('- 移动的始终是最初选中的cell');
  };

  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Jupyter风格拖拽测试
          </h1>
          <p className="text-gray-600 mb-4">
            测试TipTap编辑器的Jupyter风格拖拽移动功能
          </p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={createTestCells}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              创建测试内容
            </button>
            <button
              onClick={clearContent}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清空内容
            </button>
            <button
              onClick={showCellOrder}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              显示Cell顺序
            </button>
            <button
              onClick={debugDragElements}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              调试拖拽元素
            </button>
            <button
              onClick={testPreciseDrag}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              精确拖拽测试
            </button>
            <button
              onClick={testDragLocking}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              拖拽锁定测试
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mb-4 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-bold mb-2">🎯 测试指南:</h3>
            <ul className="space-y-1">
              <li>• <strong>悬停</strong>：将鼠标悬停在任意内容上查看工具栏</li>
              <li>• <strong>拖拽</strong>：点击并拖拽 <span className="inline-flex items-center px-1 bg-gray-200 rounded">⋮⋮</span> 图标来移动cell</li>
              <li>• <strong>箭头</strong>：使用 ↑ ↓ 按钮进行上下移动</li>
              <li>• <strong>观察</strong>：注意拖拽时的动画效果和drop指示器</li>
              <li>• <strong>验证</strong>：拖拽后点击"显示Cell顺序"验证顺序变化</li>
            </ul>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <strong>当前cells数量:</strong> {cells.length}
            {cells.length > 0 && (
              <div className="mt-2">
                <strong>Cell类型分布:</strong> 
                {Object.entries(
                  cells.reduce((acc, cell) => {
                    acc[cell.type] = (acc[cell.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <span key={type} className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                    {type}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TiptapNotebookEditor
            ref={editorRef}
            className="min-h-[700px]"
            placeholder="点击上方按钮创建测试内容，然后尝试拖拽功能..."
          />
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">🔧 功能特性:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold">✨ 视觉效果</h4>
              <ul className="mt-1 space-y-1">
                <li>• Jupyter风格的hover高亮</li>
                <li>• 平滑的拖拽动画</li>
                <li>• 实时的drop指示器</li>
                <li>• 成功移动的反馈动画</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">🎮 交互功能</h4>
              <ul className="mt-1 space-y-1">
                <li>• 拖拽移动cell顺序</li>
                <li>• 上下箭头快速移动</li>
                <li>• 复制和删除cell</li>
                <li>• 插入新cell</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JupyterDragTest;
