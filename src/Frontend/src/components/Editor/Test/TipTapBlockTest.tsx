import React from 'react';
import TiptapNotebookEditor from '../TiptapNotebookEditor';

const TipTapBlockTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            TipTap 块级管理测试
          </h1>
          <p className="text-gray-600">
            测试TipTap编辑器的hover显示工具栏和拖拽排序功能
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <TiptapNotebookEditor
            className="min-h-[700px]"
            placeholder="开始输入内容，悬停在任意块上查看工具栏..."
          />
        </div>

        {/* 功能说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🎯 块级Hover工具栏
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 悬停在任意段落、标题、列表等块上</li>
              <li>• 左侧显示操作工具栏</li>
              <li>• 支持移动、复制、删除、插入</li>
              <li>• 拖拽手柄支持重新排序</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🔄 拖拽排序
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 点击拖拽手柄开始拖拽</li>
              <li>• 拖拽到目标位置释放</li>
              <li>• 支持跨块类型拖拽</li>
              <li>• 实时视觉反馈</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              ⚡ 快捷操作
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <code>/</code> 或 <code>Ctrl+/</code> 快捷指令</li>
              <li>• 工具栏快速插入新块</li>
              <li>• 一键复制和删除</li>
              <li>• 上下移动块</li>
            </ul>
          </div>
        </div>

        {/* 详细使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            📖 使用说明
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">基本操作：</h4>
              <ul className="space-y-1">
                <li>1. 输入内容创建不同类型的块</li>
                <li>2. 悬停在块上查看左侧工具栏</li>
                <li>3. 使用工具栏进行各种操作</li>
                <li>4. 拖拽手柄重新排序块</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">快捷指令：</h4>
              <ul className="space-y-1">
                <li>• 输入 <code>/</code> 打开命令菜单</li>
                <li>• 选择要插入的块类型</li>
                <li>• 支持标题、列表、代码块等</li>
                <li>• 键盘导航选择命令</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded">
            <h4 className="font-medium text-blue-800 mb-2">💡 测试建议：</h4>
            <ol className="text-blue-700 text-sm space-y-1">
              <li>1. 先创建几个不同类型的块（标题、段落、列表等）</li>
              <li>2. 悬停在块上查看工具栏效果</li>
              <li>3. 尝试拖拽重新排序</li>
              <li>4. 使用快捷指令插入新内容</li>
              <li>5. 测试复制、删除等操作</li>
            </ol>
          </div>
        </div>

        {/* 示例内容 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">
            📝 示例内容
          </h3>
          <p className="text-yellow-700 text-sm mb-4">
            你可以复制以下内容到编辑器中进行测试：
          </p>
          <div className="bg-white p-4 rounded border text-sm font-mono">
            <div># 这是一个标题</div>
            <div><br /></div>
            <div>这是一个段落，你可以悬停在上面查看工具栏。</div>
            <div><br /></div>
            <div>- 这是一个列表项</div>
            <div>- 另一个列表项</div>
            <div><br /></div>
            <div>&gt; 这是一个引用块</div>
            <div><br /></div>
            <div>```</div>
            <div>console.log('这是代码块');</div>
            <div>```</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TipTapBlockTest;
