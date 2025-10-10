import { BrainCellKind, IOType, RuntimeState } from './types';

export const KINDS: BrainCellKind[] = ["Sensor", "Processor", "Memory", "Actuator", "Router"];

export const IO_BADGE: Record<IOType, string> = {
  data: "bg-blue-100 text-blue-700",
  control: "bg-amber-100 text-amber-700"
};

export const STATUS_DOT: Record<RuntimeState["status"], string> = {
  idle: "bg-gray-300",
  running: "bg-sky-500 animate-pulse",
  success: "bg-emerald-500",
  error: "bg-rose-600",
};