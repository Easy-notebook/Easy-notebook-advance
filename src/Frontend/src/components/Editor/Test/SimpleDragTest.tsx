import React from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';

const SimpleDragTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">TipTap 简单拖拽测试</h1>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">问题修复</h2>
          <ul className="text-sm text-red-700 space-y-1">
            <li>✅ 修复了拖拽后工具栏不显示的问题</li>
            <li>✅ 使用简单的DOM操作，避免复杂的ProseMirror事务</li>
            <li>✅ 保持hover功能正常工作</li>
            <li>✅ 拖拽真正移动块的位置</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">测试步骤</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 输入几个段落和标题（如下面的示例）</li>
            <li>2. 悬停在块上查看工具栏</li>
            <li>3. 拖拽手柄图标到其他块上</li>
            <li>4. 验证块位置真正改变</li>
            <li>5. 验证拖拽后hover功能仍然正常</li>
          </ol>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-green-800 mb-2">示例内容</h3>
          <div className="text-sm text-green-700">
            <p>复制以下内容到编辑器中测试：</p>
            <div className="mt-2 font-mono text-xs bg-white p-2 rounded border">
              # 第一个标题<br/>
              这是第一个段落，可以拖拽移动<br/>
              <br/>
              ## 第二个标题<br/>
              这是第二个段落，也可以拖拽<br/>
              <br/>
              这是第三个段落<br/>
              这是第四个段落
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <TiptapNotebookEditor
            className="h-full"
            placeholder="开始输入内容，然后测试拖拽功能..."
          />
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <h4 className="font-semibold text-yellow-800 mb-1">拖拽测试</h4>
            <p className="text-yellow-700">拖拽手柄到目标块上，验证位置改变</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <h4 className="font-semibold text-purple-800 mb-1">按钮测试</h4>
            <p className="text-purple-700">使用上下箭头按钮移动块</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
            <h4 className="font-semibold text-indigo-800 mb-1">Hover测试</h4>
            <p className="text-indigo-700">拖拽后hover功能应该仍然正常</p>
          </div>
        </div>
        
        <div className="mt-4 bg-gray-100 rounded p-3 text-xs text-gray-600">
          <p><strong>技术说明：</strong> 这个版本使用简单的DOM操作而不是复杂的ProseMirror事务，确保拖拽功能稳定可用，同时保持hover工具栏正常工作。</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleDragTest;
