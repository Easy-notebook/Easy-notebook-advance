import { BrainCellKind, BrainCellMeta, RuntimeState } from './types';

export const makeId = () => Math.random().toString(36).slice(2, 10);

export function withRuntime(meta: Omit<BrainCellMeta, "runtime">): BrainCellMeta {
  return { ...meta, runtime: { status: "idle", progress: 0, logs: [] } };
}

export function defaultCell(kind: BrainCellKind): BrainCellMeta {
  switch (kind) {
    case "Sensor":
      return withRuntime({
        kind,
        name: `Sensor_${makeId()}`,
        description: "Ingest external signals (EasyNet producer).",
        inputs: [],
        outputs: [
          { id: "out", label: "signal", io: "data" },
          { id: "tick", label: "tick", io: "control" },
        ],
        params: [
          { key: "source", value: "http" },
          { key: "interval_ms", value: "1000" },
        ],
      });
    case "Processor":
      return withRuntime({
        kind,
        name: `Processor_${makeId()}`,
        description: "Transform data using a tool or RPC (EasyNet consumer/producer).",
        inputs: [
          { id: "in", label: "data", io: "data" },
          { id: "run", label: "run", io: "control" },
        ],
        outputs: [
          { id: "out", label: "data", io: "data" },
          { id: "done", label: "done", io: "control" },
        ],
        params: [
          { key: "tool", value: "llm.qwen2.5" },
          { key: "prompt", value: "summarize" },
        ],
      });
    case "Memory":
      return withRuntime({
        kind,
        name: `Memory_${makeId()}`,
        description: "Store/retrieve knowledge (EasyNet topic: knowledge).",
        inputs: [
          { id: "write", label: "write", io: "data" },
          { id: "read", label: "read", io: "data" },
        ],
        outputs: [
          { id: "out", label: "out", io: "data" },
        ],
        params: [
          { key: "namespace", value: "global" },
          { key: "policy", value: "causal-consistent" },
        ],
      });
    case "Actuator":
      return withRuntime({
        kind,
        name: `Actuator_${makeId()}`,
        description: "Trigger side effects (webhook, file, UI).",
        inputs: [
          { id: "in", label: "data", io: "data" },
          { id: "do", label: "do", io: "control" },
        ],
        outputs: [],
        params: [
          { key: "target", value: "webhook" },
        ],
      });
    case "Router":
    default:
      return withRuntime({
        kind: "Router",
        name: `Router_${makeId()}`,
        description: "Branch by condition; routes over EasyNet channels.",
        inputs: [
          { id: "in", label: "in", io: "data" },
          { id: "go", label: "go", io: "control" },
        ],
        outputs: [
          { id: "true", label: "true", io: "control" },
          { id: "false", label: "false", io: "control" },
          { id: "data", label: "data", io: "data" },
        ],
        params: [
          { key: "expr", value: "len(input) > 0" },
        ],
      });
  }
}