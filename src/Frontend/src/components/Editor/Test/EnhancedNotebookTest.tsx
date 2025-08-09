import React from 'react';
import EnhancedJupyterNotebookEditor from '../EnhancedJupyterNotebookEditor';

const EnhancedNotebookTest: React.FC = () => {
  return (
    <div className="w-full h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            增强版 Jupyter Notebook 编辑器
          </h1>
          <p className="text-gray-600">
            真正实用的cell管理、快捷指令和拖拽排序功能
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <EnhancedJupyterNotebookEditor
            className="min-h-[700px]"
            placeholder="开始创建你的增强版笔记本..."
          />
        </div>

        {/* 功能说明 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🎯 智能Cell管理
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 点击选中，双击编辑</li>
              <li>• 基于当前选中cell的操作</li>
              <li>• 智能聚焦和状态管理</li>
              <li>• 流畅的键盘导航</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              ⚡ 快捷操作
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <code>Ctrl+/</code> 打开命令菜单</li>
              <li>• <code>Ctrl+Shift+A</code> 在上方插入</li>
              <li>• <code>Ctrl+Shift+B</code> 在下方插入</li>
              <li>• <code>Delete</code> 删除选中cell</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              🔄 流畅体验
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• 悬停显示操作工具栏</li>
              <li>• 拖拽重新排序</li>
              <li>• 在cell之间快速插入</li>
              <li>• 实时状态反馈</li>
            </ul>
          </div>
        </div>

        {/* 详细使用说明 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            📖 详细使用说明
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
            <div>
              <h4 className="font-medium mb-2">基本操作：</h4>
              <ul className="space-y-1">
                <li>• 点击cell边框选中cell</li>
                <li>• 双击cell内容开始编辑</li>
                <li>• 按Esc退出编辑模式</li>
                <li>• 按Enter进入编辑模式</li>
                <li>• 使用↑↓键导航cell</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">高级功能：</h4>
              <ul className="space-y-1">
                <li>• 悬停cell左侧查看工具栏</li>
                <li>• 悬停cell上下边缘快速插入</li>
                <li>• 拖拽cell左侧手柄重新排序</li>
                <li>• 使用命令菜单快速插入内容</li>
                <li>• 支持复制、移动、删除操作</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-100 rounded">
            <h4 className="font-medium text-blue-800 mb-2">💡 专业提示：</h4>
            <p className="text-blue-700 text-sm">
              这个增强版编辑器专注于实际使用体验，所有操作都基于当前选中的cell，
              让你能够像使用真正的Jupyter Notebook一样流畅地编辑和管理cells。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNotebookTest;
