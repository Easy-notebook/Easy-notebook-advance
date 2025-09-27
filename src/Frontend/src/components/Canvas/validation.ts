import { Connection, Edge, Node } from "reactflow";
import { BrainCellMeta, IOType } from './types';

export function isConnectionAllowed(params: Connection, nodes: Node<BrainCellMeta>[]): { ok: boolean; io?: IOType } {
  if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return { ok: false };

  const src = nodes.find(n => n.id === params.source);
  const tgt = nodes.find(n => n.id === params.target);
  if (!src || !tgt) return { ok: false };

  const out = src.data.outputs.find(o => o.id === params.sourceHandle);
  const inn = tgt.data.inputs.find(i => i.id === params.targetHandle);
  if (!out || !inn) return { ok: false };

  if (src.id === tgt.id) return { ok: false };

  return { ok: out.io === inn.io, io: out.io };
}

export function validateGraph(nodes: Node<BrainCellMeta>[], edges: Edge[]): { sensors: number; actuatorHits: number } {
  const outMap = new Map<string, string[]>();
  edges.forEach(e => {
    const arr = outMap.get(e.source) ?? [];
    arr.push(e.target);
    outMap.set(e.source, arr);
  });

  const sensors = nodes.filter(n => n.data.kind === "Sensor");
  const actuators = new Set(nodes.filter(n => n.data.kind === "Actuator").map(n => n.id));

  let hits = 0;
  sensors.forEach(s => {
    const stack = [s.id];
    const seen = new Set<string>();
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      if (actuators.has(cur)) {
        hits++;
        break;
      }
      (outMap.get(cur) ?? []).forEach(n => stack.push(n));
    }
  });

  return { sensors: sensors.length, actuatorHits: hits };
}