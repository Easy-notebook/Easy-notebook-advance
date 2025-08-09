import React from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';

const SimpleTipTapTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">TipTap 简单测试</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">功能测试</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 首先测试基本编辑功能：点击编辑器，输入文字</li>
            <li>• 输入 <code>/</code> 或按 <code>Ctrl+/</code> 打开快捷指令</li>
            <li>• 创建几个段落后，悬停查看左侧工具栏</li>
            <li>• 测试工具栏的复制、删除等操作</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <TiptapNotebookEditor
            className="h-full"
            placeholder="开始输入内容，悬停查看块级工具栏..."
          />
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 提示：先输入一些内容（标题、段落、列表等），然后悬停在上面查看工具栏效果</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTipTapTest;
