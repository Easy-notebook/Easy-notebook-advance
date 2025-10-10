import { Button, Card } from "antd";
import { Plus, Wand2 } from "lucide-react";
import { BrainCellKind } from '../utils/types';
import { KINDS } from '../utils/constants';

interface PaletteProps {
  onAdd: (kind: BrainCellKind) => void;
}

export function Palette({ onAdd }: PaletteProps) {
  return (
    <Card className="h-full" title={<div className="flex items-center gap-2"><Wand2 className="h-4 w-4" />组件库</div>}>
      <div className="space-y-2">
        {KINDS.map(kind => (
          <Button key={kind} className="w-full justify-start gap-2" type="default" onClick={() => onAdd(kind)}>
            <Plus className="h-4 w-4" />{kind}
          </Button>
        ))}
        <div className="pt-2 text-xs text-gray-500">
          左击添加。连线有类型和协议，别把 control 接到 data 上，求你了。
        </div>
      </div>
    </Card>
  );
}