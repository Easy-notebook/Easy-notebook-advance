import React from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';

const DraggableBlockTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">TipTap 可拖拽块管理测试</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">拖拽功能测试</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ 悬停显示工具栏</li>
            <li>✅ 拖拽手柄可以拖拽重新排序</li>
            <li>✅ 上下移动按钮</li>
            <li>✅ 复制、删除、插入功能</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">测试步骤</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 输入几个段落和标题</li>
            <li>2. 悬停在块上查看工具栏</li>
            <li>3. 拖拽手柄图标重新排序</li>
            <li>4. 使用上下箭头移动块</li>
            <li>5. 测试复制和删除功能</li>
          </ol>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">示例内容</h3>
          <div className="text-sm text-yellow-700">
            <p>你可以输入以下内容进行测试：</p>
            <div className="mt-2 font-mono text-xs bg-white p-2 rounded">
              # 第一个标题<br/>
              这是第一个段落<br/>
              ## 第二个标题<br/>
              这是第二个段落<br/>
              这是第三个段落
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <TiptapNotebookEditor
            className="h-full"
            placeholder="开始输入内容，然后测试拖拽功能..."
          />
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <h4 className="font-semibold text-green-800 mb-1">拖拽功能</h4>
            <p className="text-green-700">点击并拖拽手柄图标到其他块上进行重新排序</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <h4 className="font-semibold text-purple-800 mb-1">快捷操作</h4>
            <p className="text-purple-700">使用工具栏的上下箭头快速移动块位置</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraggableBlockTest;
