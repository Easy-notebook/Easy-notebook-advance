import { BrainCellKind } from '../utils/types';
import { ShapeType, SizePreset } from '../shapes';

// Node design configuration
export interface NodeDesign {
  shape: ShapeType;
  colors: {
    primary: string;      // Primary color
    secondary: string;    // Secondary color
    text: string;        // Text color
    border: string;      // Border color
    shadow: string;      // Shadow color
  };
  icon: string;          // Icon type
  size: {
    width: number;
    height: number;
  };
  compactSize: {
    width: number;
    height: number;
  };
  // Unified sizing support
  sizePreset?: SizePreset;
  compactSizePreset?: SizePreset;
  borderRadius: number;
  borderWidth: number;
  animation?: string;    // Animation effect
  // Abilities visual configuration
  abilityIndicatorPosition?: 'top' | 'bottom' | 'left' | 'right';
}

// Design configuration for each BrainCell type
export const NODE_DESIGNS: Record<BrainCellKind, NodeDesign> = {
  // Sensor - Data input source
  Sensor: {
    shape: 'circle',
    colors: {
      primary: '#10B981',      // Green theme
      secondary: '#F0FDF4',    // Light green background
      text: '#059669',         // Dark green text
      border: '#10B981',       // Green border
      shadow: '#10B98120',     // Semi-transparent green shadow
    },
    icon: 'sensor',
    size: { width: 200, height: 80 },
    compactSize: { width: 160, height: 60 },
    sizePreset: 'lg',
    compactSizePreset: 'md',
    borderRadius: 12,
    borderWidth: 2,
    animation: 'pulse',
    abilityIndicatorPosition: 'top'
  },

  // Processor - Data processing and AI agent
  Processor: {
    shape: 'rectangle',
    colors: {
      primary: '#3B82F6',      // Blue theme
      secondary: '#EFF6FF',    // Light blue background
      text: '#1D4ED8',         // Dark blue text
      border: '#3B82F6',       // Blue border
      shadow: '#3B82F620',     // Semi-transparent blue shadow
    },
    icon: 'processor',
    size: { width: 280, height: 100 },
    compactSize: { width: 200, height: 70 },
    sizePreset: 'xl',
    compactSizePreset: 'lg',
    borderRadius: 12,
    borderWidth: 2,
    abilityIndicatorPosition: 'bottom'
  },

  // Memory - Data storage and memory
  Memory: {
    shape: 'hexagon',
    colors: {
      primary: '#8B5CF6',      // Purple theme
      secondary: '#FAF5FF',    // Light purple background
      text: '#7C3AED',         // Dark purple text
      border: '#8B5CF6',       // Purple border
      shadow: '#8B5CF620',     // Semi-transparent purple shadow
    },
    icon: 'memory',
    size: { width: 180, height: 80 },
    compactSize: { width: 140, height: 60 },
    sizePreset: 'lg',
    compactSizePreset: 'md',
    borderRadius: 12,
    borderWidth: 2,
    abilityIndicatorPosition: 'left'
  },

  // Actuator - Action execution and output
  Actuator: {
    shape: 'pentagon',
    colors: {
      primary: '#F59E0B',      // Orange theme
      secondary: '#FFFBEB',    // Light orange background
      text: '#D97706',         // Dark orange text
      border: '#F59E0B',       // Orange border
      shadow: '#F59E0B20',     // Semi-transparent orange shadow
    },
    icon: 'actuator',
    size: { width: 200, height: 80 },
    compactSize: { width: 160, height: 60 },
    sizePreset: 'lg',
    compactSizePreset: 'md',
    borderRadius: 12,
    borderWidth: 2,
    abilityIndicatorPosition: 'right'
  },

  // Router - Conditional judgment and branching
  Router: {
    shape: 'diamond',
    colors: {
      primary: '#EF4444',      // Red theme
      secondary: '#FEF2F2',    // Light red background
      text: '#DC2626',         // Dark red text
      border: '#EF4444',       // Red border
      shadow: '#EF444420',     // Semi-transparent red shadow
    },
    icon: 'router',
    size: { width: 160, height: 80 },
    compactSize: { width: 130, height: 60 },
    sizePreset: 'lg',
    compactSizePreset: 'md',
    borderRadius: 12,
    borderWidth: 2,
    abilityIndicatorPosition: 'top'
  },
};

// Icon mapping - using modern icons
export const NODE_ICONS = {
  sensor: '📊',      // Sensor - data input
  processor: '🤖',   // Processor - AI agent
  memory: '💾',      // Memory - data storage
  actuator: '⚡',    // Actuator - action execution
  router: '🔀',      // Router - conditional branching
};

// Get node design configuration
export function getNodeDesign(kind: BrainCellKind): NodeDesign {
  return NODE_DESIGNS[kind];
}

// Get node icon
export function getNodeIcon(kind: BrainCellKind): string {
  return NODE_ICONS[NODE_DESIGNS[kind].icon as keyof typeof NODE_ICONS];
}