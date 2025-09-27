import { Card } from "antd";
import { Wand2 } from "lucide-react";
import { BrainCellKind } from './types';
import { KINDS } from './constants';
import { getNodeDesign, getNodeIcon } from './nodeDesigns';
import { CircleShape, RectangleShape, HexagonShape, PentagonShape, DiamondShape } from './shapes/ShapeComponents';

interface EnhancedPaletteProps {
  onAdd: (kind: BrainCellKind) => void;
}

export function EnhancedPalette({ onAdd }: EnhancedPaletteProps) {
  const getShapeComponent = (shape: string) => {
    switch (shape) {
      case 'circle': return CircleShape;
      case 'hexagon': return HexagonShape;
      case 'pentagon': return PentagonShape;
      case 'diamond': return DiamondShape;
      case 'rectangle':
      default: return RectangleShape;
    }
  };

  return (
    <Card
      className="h-full"
      title={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
            <Wand2 className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <span className="font-semibold text-gray-800">组件库</span>
            <div className="text-xs text-gray-500">拖拽添加节点到画布</div>
          </div>
        </div>
      }
      bodyStyle={{ padding: '16px', height: 'calc(100% - 64px)', overflow: 'auto' }}
    >
      <div className="space-y-3">
        {KINDS.map(kind => {
          const design = getNodeDesign(kind);
          const icon = getNodeIcon(kind);
          const ShapeComponent = getShapeComponent(design.shape);

          // 缩放比例以适应预览
          const scale = 0.3;
          const previewSize = {
            width: design.size.width * scale,
            height: design.size.height * scale,
          };

          return (
            <div
              key={kind}
              className="group relative flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
              onClick={() => onAdd(kind)}
            >
              {/* 节点预览 */}
              <div className="flex-shrink-0 flex items-center justify-center bg-gray-50 rounded-lg p-2" style={{ width: '80px', height: '60px' }}>
                <ShapeComponent
                  width={previewSize.width}
                  height={previewSize.height}
                  colors={design.colors}
                  borderWidth={Math.max(1, design.borderWidth * scale)}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div style={{ fontSize: `${12 * scale}px` }}>{icon}</div>
                  </div>
                </ShapeComponent>
              </div>

              {/* 节点信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="font-bold text-sm"
                    style={{ color: design.colors.primary }}
                  >
                    {kind}
                  </span>
                  <div
                    className="px-2 py-1 rounded-lg text-xs font-medium shadow-sm"
                    style={{
                      backgroundColor: design.colors.secondary,
                      color: design.colors.text,
                      border: `1px solid ${design.colors.border}20`,
                    }}
                  >
                    {design.shape}
                  </div>
                </div>

                <div className="text-xs text-gray-600 leading-tight font-medium">
                  {kind === 'Sensor' && '数据输入源 · 传感器触发'}
                  {kind === 'Processor' && 'AI代理处理 · 智能计算'}
                  {kind === 'Memory' && '数据存储 · 状态记忆'}
                  {kind === 'Actuator' && '动作执行 · 结果输出'}
                  {kind === 'Router' && '条件判断 · 流程分支'}
                </div>
              </div>

              {/* 添加按钮指示 */}
              <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>

              {/* 悬停效果边框 */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
            </div>
          );
        })}

        {/* 使用提示 */}
        <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="text-xs text-gray-700 space-y-2">
            <div className="font-semibold text-indigo-700 flex items-center gap-2">
              🎨 <span>节点形状指南</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-600">🔵</span>
                <span className="text-gray-600">圆形 - 传感器(输入源)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-blue-600">📐</span>
                <span className="text-gray-600">矩形 - 处理器(计算)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-600">⬡</span>
                <span className="text-gray-600">六边形 - 存储器(记忆)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-orange-600">⬟</span>
                <span className="text-gray-600">五边形 - 执行器(输出)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600">◆</span>
                <span className="text-gray-600">菱形 - 路由器(分支)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-xs text-amber-800 font-medium flex items-center gap-2">
            💡 <span>点击组件添加到画布，连接时注意端口类型匹配</span>
          </div>
        </div>
      </div>
    </Card>
  );
}