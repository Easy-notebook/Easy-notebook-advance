import { Button, Space, Divider } from "antd";
import TextArea from "antd/es/input/TextArea";
import { BugPlay, Pause, StepForward, RotateCcw, Save, Upload, Trash2, Share2 } from "lucide-react";
import { useRef } from "react";

interface ToolbarProps {
  onRun: () => void;
  onStep: () => void;
  onPause: () => void;
  onReset: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  onClear: () => void;
}

export function Toolbar({ onRun, onStep, onPause, onReset, onExport, onImport, onClear }: ToolbarProps) {
  const importRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="h-full flex items-center px-4 bg-gradient-to-r from-slate-50 to-gray-50">
      <Space size="middle" className="flex-1">
        {/* 运行控制组 */}
        <Space.Compact>
          <Button
            onClick={onRun}
            type="primary"
            size="small"
            icon={<BugPlay className="h-4 w-4" />}
            className="bg-green-600 hover:bg-green-700 border-green-600"
          >
            运行
          </Button>
          <Button
            onClick={onStep}
            size="small"
            icon={<StepForward className="h-4 w-4" />}
          >
            单步
          </Button>
          <Button
            onClick={onPause}
            size="small"
            icon={<Pause className="h-4 w-4" />}
          >
            暂停
          </Button>
          <Button
            onClick={onReset}
            size="small"
            icon={<RotateCcw className="h-4 w-4" />}
            className="text-orange-600 hover:text-orange-700"
          >
            重置
          </Button>
        </Space.Compact>

        <Divider type="vertical" className="h-6" />

        {/* 文件操作组 */}
        <Space.Compact>
          <Button
            onClick={onExport}
            size="small"
            icon={<Save className="h-4 w-4" />}
            className="text-blue-600 hover:text-blue-700"
          >
            导出
          </Button>
          <Button
            onClick={() => onImport(importRef.current?.value ?? "")}
            size="small"
            icon={<Upload className="h-4 w-4" />}
            className="text-purple-600 hover:text-purple-700"
          >
            导入
          </Button>
          <Button
            onClick={onClear}
            danger
            size="small"
            icon={<Trash2 className="h-4 w-4" />}
          >
            清空
          </Button>
        </Space.Compact>

        {/* 品牌标识和导入区域 */}
        <div className="ml-auto flex items-center gap-4">
          <Space size="small" className="text-sm font-medium text-gray-700">
            <Share2 className="h-4 w-4 text-blue-500" />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              BrainCell Coding
            </span>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
              EasyNet Ready
            </span>
          </Space>
        </div>
      </Space>
    </div>
  );
}