export type IOType = "data" | "control";
export type BrainCellKind = "Sensor" | "Processor" | "Memory" | "Actuator" | "Router";

export type EasyNetProtocol = "topic" | "queue" | "rpc";
export type EasyNetLink = {
  protocol: EasyNetProtocol;
  channel: string;
  qos?: 0 | 1 | 2;
  namespace?: string;
};

export type BrainCellParam = { key: string; value: string };

export type RuntimeState = {
  status: "idle" | "running" | "success" | "error";
  progress: number;
  logs: string[];
  breakpoint?: boolean;
};

export type BrainCellMeta = {
  kind: BrainCellKind;
  name: string;
  description?: string;
  inputs: Array<{ id: string; label: string; io: IOType }>;
  outputs: Array<{ id: string; label: string; io: IOType }>;
  params: BrainCellParam[];
  runtime: RuntimeState;
};

export type GraphSchema = {
  version: string;
  nodes: any[];
  edges: any[];
};