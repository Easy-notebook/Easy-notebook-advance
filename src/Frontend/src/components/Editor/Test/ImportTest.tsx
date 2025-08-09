import React, { useRef } from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';
import useStore from '../../../store/notebookStore';

const ImportTest: React.FC = () => {
  const editorRef = useRef(null);
  const { cells, setCells, clearCells } = useStore();

  // 模拟导入一些测试数据
  const simulateImport = () => {
    console.log('🔄 模拟导入操作');
    
    // 清空现有内容
    clearCells();
    
    // 模拟导入的cells数据
    const importedCells = [
      {
        id: 'imported-markdown-1',
        type: 'markdown',
        content: '# 导入的标题\n\n这是一个导入的markdown单元格。',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'imported-code-1',
        type: 'code',
        language: 'python',
        content: 'print("Hello from imported code!")\nx = 1 + 1\nprint(f"Result: {x}")',
        outputs: [],
        enableEdit: true,
      },
      {
        id: 'imported-markdown-2',
        type: 'markdown',
        content: '## 第二个标题\n\n这是另一个markdown单元格，包含：\n\n- 列表项1\n- 列表项2\n- **粗体文本**\n- *斜体文本*',
        outputs: [],
        enableEdit: true,
      }
    ];

    // 延迟设置cells，模拟真实的导入过程
    setTimeout(() => {
      console.log('📝 设置导入的cells:', importedCells);
      setCells(importedCells);
    }, 100);
  };

  const clearContent = () => {
    console.log('🗑️ 清空内容');
    clearCells();
  };

  const forceRefresh = () => {
    console.log('🔄 强制刷新编辑器内容');
    if (editorRef.current && editorRef.current.forceRefresh) {
      const success = editorRef.current.forceRefresh();
      console.log('刷新结果:', success ? '成功' : '失败');
    }
  };

  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            TipTap 导入测试
          </h1>
          <p className="text-gray-600 mb-4">
            测试TipTap编辑器的导入文件显示功能
          </p>
          
          <div className="flex gap-4 mb-4">
            <button
              onClick={simulateImport}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              模拟导入文件
            </button>
            <button
              onClick={clearContent}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              清空内容
            </button>
            <button
              onClick={forceRefresh}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              强制刷新
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            当前cells数量: {cells.length}
            {cells.length > 0 && (
              <div className="mt-2">
                <strong>Cells类型:</strong> {cells.map(c => c.type).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TiptapNotebookEditor
            ref={editorRef}
            className="min-h-[600px]"
            placeholder="点击上方按钮测试导入功能..."
          />
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-bold mb-2">调试信息:</h3>
          <div className="text-sm text-gray-600">
            <p>• 点击"模拟导入文件"按钮来测试导入功能</p>
            <p>• 检查浏览器控制台查看详细日志</p>
            <p>• 如果导入成功，编辑器应该显示导入的内容而不是placeholder</p>
            <p>• 当前cells数量: {cells.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportTest;
