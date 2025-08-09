import React from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';

const StableBlockTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">TipTap 稳定块管理测试</h1>
        
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">修复验证</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✅ 游标可以正常插入和移动</li>
            <li>✅ 悬停在块上显示工具栏</li>
            <li>✅ 鼠标可以移动到工具栏上进行操作</li>
            <li>✅ 工具栏不会在移动过程中消失</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">测试步骤</h3>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 点击编辑器，输入一些文字</li>
            <li>2. 按Enter创建几个段落</li>
            <li>3. 悬停在段落上，观察左侧工具栏</li>
            <li>4. 慢慢移动鼠标到工具栏上</li>
            <li>5. 点击工具栏按钮测试功能</li>
          </ol>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: '600px' }}>
          <TiptapNotebookEditor
            className="h-full"
            placeholder="开始输入内容，然后悬停查看稳定的块级工具栏..."
          />
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>💡 提示：工具栏现在有300ms的延迟隐藏，给你足够时间移动到工具栏上</p>
        </div>
      </div>
    </div>
  );
};

export default StableBlockTest;
