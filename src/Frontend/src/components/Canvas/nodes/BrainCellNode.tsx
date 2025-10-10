import { Brain } from "lucide-react";
import { Handle, Position } from "reactflow";
import { BrainCellMeta } from '../utils/types';
import { IO_BADGE, STATUS_DOT } from '../utils/constants';

export function BrainCellNode({ data }: { data: BrainCellMeta }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm w-[280px]">
      <div className="flex items-center gap-2 p-3 border-b bg-gray-50 rounded-t-2xl">
        <div className="p-1 rounded-xl bg-rose-100">
          <Brain className="h-4 w-4 text-rose-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase text-gray-500 tracking-wider">{data.kind}</div>
          <div className="text-sm font-semibold truncate">{data.name}</div>
        </div>
        <div className={`h-2 w-2 rounded-full ${STATUS_DOT[data.runtime.status]}`} title={data.runtime.status} />
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        <div className="space-y-1">
          {data.inputs?.map(port => (
            <div key={port.id} className="relative">
              <Handle type="target" id={port.id} position={Position.Left} className="!w-3 !h-3 !-left-1.5 !bg-gray-700" />
              <span className={`text-[10px] px-1 py-0.5 rounded ${IO_BADGE[port.io]}`}>{port.label}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 text-right">
          {data.outputs?.map(port => (
            <div key={port.id} className="relative">
              <Handle type="source" id={port.id} position={Position.Right} className="!w-3 !h-3 !-right-1.5 !bg-gray-700" />
              <span className={`text-[10px] px-1 py-0.5 rounded ${IO_BADGE[port.io]}`}>{port.label}</span>
            </div>
          ))}
        </div>
      </div>
      {data.description ? (
        <div className="px-3 pb-1 text-xs text-gray-500">{data.description}</div>
      ) : null}
      <div className="px-3 pb-3">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${data.runtime.progress}%` }} />
        </div>
      </div>
    </div>
  );
}

export const nodeTypes = { braincell: BrainCellNode } as const;