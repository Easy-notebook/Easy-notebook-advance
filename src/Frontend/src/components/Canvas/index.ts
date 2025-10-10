// Original components (legacy)
export { default as BrainCellGraphEditor } from './editors/BrainCellGraphEditor';
export type { BrainCellGraphEditorRef } from './editors/BrainCellGraphEditor';

// Modern components (recommended) - Based on React Flow examples
export { default as ModernBrainCellGraphEditor } from './editors/ModernBrainCellGraphEditor';
export type { ModernBrainCellGraphEditorRef } from './editors/ModernBrainCellGraphEditor';
export { ModernBrainCellNode } from './nodes/ModernBrainCellNode';
export { ModernEasyNetEdge, modernEdgeTypes } from './nodes/ModernEasyNetEdge';
export { ModernToolbar } from './ui/ModernToolbar';
export { ModernPalette } from './ui/ModernPalette';
export { ModernInspector } from './ui/ModernInspector';
export { ContextMenu } from './ui/ContextMenu';

// Shared utilities
export * from './utils/types';
export * from './utils/utils';
export * from './utils/constants';
export * from './utils/validation';

// Legacy components (for compatibility)
export * from './nodes/BrainCellNode';
export * from './nodes/EnhancedBrainCellNode';
export * from './nodes/EasyNetEdge';
export * from './ui/Inspector';
export * from './ui/Palette';
export * from './ui/EnhancedPalette';
export * from './ui/Toolbar';
export * from './ui/DebugConsole';
export * from './nodes/nodeDesigns';
export * from './shapes';
export * from './hooks/useRunner';