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

// Ability Configuration
export type AbilityConfig = {
  type: string;
  enabled: boolean;
  parameters: Record<string, any>;
  constraints?: {
    maxRetries?: number;
    timeout?: number;
    resourceLimits?: Record<string, number>;
  };
};

// Policy Configuration
export type PolicyConfig = {
  name: string;
  type: "security" | "access" | "resource" | "behavior";
  rules: Array<{
    condition: string;
    action: "allow" | "deny" | "throttle" | "log";
    parameters?: Record<string, any>;
  }>;
  priority: number;
  enabled: boolean;
};

// Knowledge Configuration
export type KnowledgeConfig = {
  sources: Array<{
    type: "database" | "api" | "file" | "memory";
    name: string;
    endpoint?: string;
    credentials?: Record<string, string>;
    schema?: Record<string, any>;
  }>;
  indexing: {
    enabled: boolean;
    strategy: "vector" | "keyword" | "hybrid";
    dimensions?: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
};

// Communication Configuration
export type CommunicationConfig = {
  protocols: Array<{
    type: "http" | "websocket" | "mqtt" | "grpc";
    enabled: boolean;
    config: Record<string, any>;
  }>;
  serialization: "json" | "protobuf" | "msgpack";
  compression: boolean;
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keySize?: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoff: "exponential" | "linear";
    initialDelay: number;
  };
};

// UI Variant Types
export type UIVariant = "compact" | "focused" | "expanded";

// Memory Binding Configuration
export type MemoryBinding = {
  external: {
    enabled: boolean;
    path?: string; // forest://tenant/user/session
    mode?: "read-only" | "write-only" | "read-write" | "batch-write";
    idempotencyKey?: string;
  };
};

// Port Categories
export type PortCategory = {
  signal: string[];
  goal: string[];
  memory: string[];
  env: string[];
};

export type OutputPortCategory = {
  result: string[];
  behavior: string[];
  state: string[];
  side: string[];
};

export type AbilityPortCategory = {
  public: string[];
  auto: string[];
};

export type BrainCellPorts = {
  in: PortCategory;
  out: OutputPortCategory;
  ability: AbilityPortCategory;
};

// Bindings Configuration
export type BrainCellBindings = {
  memory?: MemoryBinding;
};

// UI State
export type BrainCellUIState = {
  variant: UIVariant;
  showGhostPorts: boolean;
  loggingEnabled?: boolean;
};

export type BrainCellMeta = {
  kind: BrainCellKind;
  name: string;
  description?: string;
  inputs: Array<{ id: string; label: string; io: IOType }>;
  outputs: Array<{ id: string; label: string; io: IOType }>;
  params: BrainCellParam[];
  runtime: RuntimeState;

  // New Industrial Architecture
  ports?: BrainCellPorts;
  bindings?: BrainCellBindings;
  ui?: BrainCellUIState;

  // Advanced Configuration
  abilities?: AbilityConfig[];
  policies?: PolicyConfig[];
  knowledge?: KnowledgeConfig;
  communication?: CommunicationConfig;
};

export type GraphSchema = {
  version: string;
  nodes: any[];
  edges: any[];
};