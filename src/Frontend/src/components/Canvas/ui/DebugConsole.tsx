import { Card } from "antd";
import { Timer } from "lucide-react";

interface DebugConsoleProps {
  logs: string[];
}

export function DebugConsole({ logs }: DebugConsoleProps) {
  return (
    <div className="h-full flex flex-col">
      {/* 标题区域 */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gray-700 rounded-lg">
            <Timer className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">调试控制台</h3>
            <p className="text-xs text-gray-400">
              {logs.length > 0 ? `${logs.length} 条日志记录` : '等待日志输出'}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-400">实时监控</span>
            </div>
          </div>
        </div>
      </div>

      {/* 日志内容区域 */}
      <div className="flex-1 bg-gray-900 text-green-400 font-mono text-xs overflow-auto">
        {logs.length ? (
          <div className="p-4 space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="flex items-start gap-3 py-1 hover:bg-gray-800 rounded px-2 -mx-2">
                <span className="text-gray-500 flex-shrink-0 w-8 text-right">
                  {String(i + 1).padStart(3, '0')}
                </span>
                <span className="flex-1 whitespace-pre-wrap break-words">
                  {l}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
                <Timer className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <div className="text-gray-500 font-medium">控制台就绪</div>
                <div className="text-gray-600 text-xs mt-1">
                  运行工作流以查看调试信息
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="px-4 py-2 border-t border-gray-700 bg-gray-800 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {logs.length > 0 && `最新: ${logs[logs.length - 1]?.split(']')[0]}]`}
        </div>
        <div className="text-xs text-gray-500">
          EasyNet Debug Console v1.0
        </div>
      </div>
    </div>
  );
}