import React from 'react';
import JupyterNotebookEditor from '../JupyterNotebookEditor';

const SimpleTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Notebook编辑器测试</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">功能测试说明</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 拖拽排序：悬停在cell左侧显示拖拽手柄</li>
            <li>• 快捷键：<code className="bg-gray-100 px-1 rounded">Ctrl+Shift+L</code> 插入代码块</li>
            <li>• 快捷键：<code className="bg-gray-100 px-1 rounded">Ctrl+Shift+M</code> 插入文本块</li>
            <li>• 快捷键：<code className="bg-gray-100 px-1 rounded">Ctrl+/</code> 打开命令面板</li>
            <li>• 点击右上角"快捷键"按钮查看完整列表</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <JupyterNotebookEditor
            className="min-h-[600px]"
            placeholder="开始创建你的笔记本..."
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleTest;
