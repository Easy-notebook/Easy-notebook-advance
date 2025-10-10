import { BrainCellKind, BrainCellMeta, RuntimeState, AbilityConfig, PolicyConfig, KnowledgeConfig, CommunicationConfig, BrainCellPorts, BrainCellBindings, BrainCellUIState } from './types';

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
        // New Industrial Architecture
        ports: {
          in: {
            signal: ["in.signal[0]"],
            goal: [],
            memory: [], // Only rendered when external memory enabled
            env: []
          },
          out: {
            result: ["out.result[0]"],
            behavior: ["out.behavior[0]"],
            state: [], // Only rendered when external memory enabled
            side: [] // Only rendered when logging enabled
          },
          ability: {
            public: ["ability.public.ingest", "ability.public.pattern_detect"],
            auto: ["ability.auto.quality_check"]
          }
        },
        bindings: {
          memory: {
            external: {
              enabled: false, // Default: no external memory, no memory ports
              path: "",
              mode: "read-write"
            }
          }
        },
        ui: {
          variant: "compact", // Default to clean industrial look
          showGhostPorts: false,
          loggingEnabled: false
        },
        abilities: [
          {
            type: "data_ingestion",
            enabled: true,
            parameters: {
              sources: ["http", "file", "database"],
              polling: true,
              batch_size: 100
            },
            constraints: {
              maxRetries: 3,
              timeout: 30000
            }
          }
        ],
        policies: [
          {
            name: "rate_limit",
            type: "resource",
            rules: [{
              condition: "requests_per_minute > 60",
              action: "throttle",
              parameters: { delay: 1000 }
            }],
            priority: 1,
            enabled: true
          }
        ],
        communication: {
          protocols: [
            { type: "http", enabled: true, config: { port: 8080 } },
            { type: "mqtt", enabled: false, config: {} }
          ],
          serialization: "json",
          compression: false,
          encryption: { enabled: false },
          retryPolicy: {
            maxRetries: 3,
            backoff: "exponential",
            initialDelay: 1000
          }
        }
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
        abilities: [
          {
            type: "ai_processing",
            enabled: true,
            parameters: {
              model: "qwen2.5",
              max_tokens: 4096,
              temperature: 0.7,
              parallel_requests: 5
            },
            constraints: {
              maxRetries: 2,
              timeout: 60000,
              resourceLimits: { memory: "2GB", cpu: "2 cores" }
            }
          }
        ],
        policies: [
          {
            name: "content_filter",
            type: "security",
            rules: [{
              condition: "contains_sensitive_data",
              action: "deny",
              parameters: { log_violation: true }
            }],
            priority: 1,
            enabled: true
          }
        ],
        knowledge: {
          sources: [
            {
              type: "database",
              name: "training_data",
              endpoint: "postgresql://localhost:5432/knowledge",
              schema: { embeddings: "vector", metadata: "json" }
            }
          ],
          indexing: {
            enabled: true,
            strategy: "vector",
            dimensions: 1536
          },
          caching: {
            enabled: true,
            ttl: 3600,
            maxSize: 1000
          }
        },
        communication: {
          protocols: [
            { type: "grpc", enabled: true, config: { port: 9090 } },
            { type: "http", enabled: true, config: { port: 8080 } }
          ],
          serialization: "protobuf",
          compression: true,
          encryption: { enabled: true, algorithm: "AES-256", keySize: 256 },
          retryPolicy: {
            maxRetries: 3,
            backoff: "exponential",
            initialDelay: 500
          }
        }
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
        abilities: [
          {
            type: "knowledge_storage",
            enabled: true,
            parameters: {
              storage_type: "vector_db",
              persistence: true,
              backup_enabled: true,
              compression_level: 6
            },
            constraints: {
              maxRetries: 5,
              timeout: 10000,
              resourceLimits: { storage: "10GB", connections: 100 }
            }
          }
        ],
        policies: [
          {
            name: "data_retention",
            type: "resource",
            rules: [{
              condition: "age > 30_days",
              action: "archive",
              parameters: { compression: "gzip" }
            }],
            priority: 2,
            enabled: true
          }
        ],
        knowledge: {
          sources: [
            {
              type: "memory",
              name: "working_memory",
              schema: { vectors: "float[]", metadata: "jsonb" }
            }
          ],
          indexing: {
            enabled: true,
            strategy: "hybrid",
            dimensions: 1536
          },
          caching: {
            enabled: true,
            ttl: 1800,
            maxSize: 5000
          }
        },
        communication: {
          protocols: [
            { type: "http", enabled: true, config: { port: 8081 } }
          ],
          serialization: "json",
          compression: true,
          encryption: { enabled: true, algorithm: "AES-128", keySize: 128 },
          retryPolicy: {
            maxRetries: 5,
            backoff: "linear",
            initialDelay: 200
          }
        }
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
        abilities: [
          {
            type: "action_execution",
            enabled: true,
            parameters: {
              targets: ["webhook", "file", "email", "slack"],
              async_execution: true,
              result_tracking: true
            },
            constraints: {
              maxRetries: 3,
              timeout: 30000
            }
          }
        ],
        policies: [
          {
            name: "execution_limits",
            type: "behavior",
            rules: [{
              condition: "executions_per_hour > 100",
              action: "throttle",
              parameters: { cooldown: 3600 }
            }],
            priority: 1,
            enabled: true
          }
        ],
        communication: {
          protocols: [
            { type: "http", enabled: true, config: { timeout: 10000 } },
            { type: "websocket", enabled: false, config: {} }
          ],
          serialization: "json",
          compression: false,
          encryption: { enabled: false },
          retryPolicy: {
            maxRetries: 3,
            backoff: "exponential",
            initialDelay: 1000
          }
        }
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
        abilities: [
          {
            type: "conditional_routing",
            enabled: true,
            parameters: {
              expression_language: "javascript",
              default_route: "false",
              timeout_route: "error"
            },
            constraints: {
              maxRetries: 1,
              timeout: 5000
            }
          }
        ],
        policies: [
          {
            name: "routing_security",
            type: "security",
            rules: [{
              condition: "expression_contains_unsafe_functions",
              action: "deny",
              parameters: { log_attempt: true }
            }],
            priority: 1,
            enabled: true
          }
        ]
      });
  }
}