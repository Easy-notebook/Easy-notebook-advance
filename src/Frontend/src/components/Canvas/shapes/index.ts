// Re-export all shape components and utilities
export * from './ShapeComponents';

// Convenience exports for commonly used items
export {
  UniversalShape,
  createShape,
  adaptAbilitiesToIndicators,
  SIZE_PRESETS
} from './ShapeComponents';

export type {
  AbilityIndicator,
  SizePreset,
  ShapeType,
  EnhancedShapeProps
} from './ShapeComponents';