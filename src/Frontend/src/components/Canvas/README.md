# Canvas Components

A modular BrainCell Graph Editor built with React Flow and Ant Design.

## Structure

```
Canvas/
├── BrainCellGraphEditor.tsx    # Main component
├── BrainCellNode.tsx           # Individual node component
├── EasyNetEdge.tsx             # Custom edge component
├── Inspector.tsx               # Node properties panel
├── Palette.tsx                 # Component library panel
├── Toolbar.tsx                 # Top toolbar with controls
├── DebugConsole.tsx            # Debug logs panel
├── hooks/
│   └── useRunner.ts            # Graph execution logic
├── types.ts                    # TypeScript definitions
├── constants.ts                # Constants and styling
├── utils.ts                    # Utility functions
├── validation.ts               # Graph validation logic
├── testUtils.ts                # Test utilities
├── index.ts                    # Exports
└── README.md                   # This file
```

## Key Components

### BrainCellGraphEditor
The main component that orchestrates the entire graph editor. Handles state management, event handling, and layout.

### BrainCellNode
Renders individual brain cell nodes with:
- Input/output handles
- Progress indicators
- Runtime status
- Type-specific styling

### EasyNetEdge
Custom edge component showing EasyNet protocol information:
- Protocol type (topic/queue/rpc)
- Channel name
- QoS level
- Namespace

### Inspector
Property editor panel for selected nodes:
- Name and description editing
- Parameter management
- Breakpoint controls
- Node deletion

### Palette
Component library for adding new nodes:
- All available brain cell types
- Drag or click to add

### Toolbar
Main control bar with:
- Execution controls (run, step, pause)
- Import/export functionality
- Graph manipulation

### DebugConsole
Runtime logging and debugging:
- Execution progress
- Error messages
- Breakpoint hits

## Usage

```tsx
import { BrainCellGraphEditor } from './components/Canvas';

function App() {
  return <BrainCellGraphEditor />;
}
```

## Features

- ✅ Fixed Ant Design component imports
- ✅ Modular component structure
- ✅ Type-safe with TypeScript
- ✅ Graph validation
- ✅ Runtime execution simulation
- ✅ Import/export functionality
- ✅ Keyboard shortcuts
- ✅ Test utilities included

## Debugging Fixes Applied

1. **Import Issues**: Fixed incompatible UI component imports from Ant Design
2. **Button Variants**: Corrected Button props to use Ant Design API
3. **Component Structure**: Split 650+ line component into focused modules
4. **Type Safety**: Improved TypeScript definitions and interfaces
5. **Performance**: Separated concerns for better maintainability