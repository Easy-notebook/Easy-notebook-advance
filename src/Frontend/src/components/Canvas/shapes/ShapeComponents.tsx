import React from 'react';

// Unified Abilities Interface
export interface AbilityIndicator {
  type: string;
  enabled: boolean;
  color?: string;
  icon?: string;
}

// Size Presets for consistent sizing
export type SizePreset = 'sm' | 'md' | 'lg' | 'xl';

export const SIZE_PRESETS: Record<SizePreset, { width: number; height: number }> = {
  sm: { width: 60, height: 60 },
  md: { width: 80, height: 80 },
  lg: { width: 120, height: 120 },
  xl: { width: 160, height: 160 }
};

interface ShapeProps {
  // Size Configuration
  width?: number;
  height?: number;
  size?: SizePreset;

  // Visual Styling
  colors: {
    primary: string;
    secondary: string;
    border: string;
    shadow: string;
  };
  borderWidth?: number;

  // Content
  children: React.ReactNode;
  className?: string;

  // Abilities Integration
  abilities?: AbilityIndicator[];
  showAbilities?: boolean;

  // Interactive States
  isSelected?: boolean;
  isHovered?: boolean;
  isActive?: boolean;
}

// Utility function to get dimensions
type DimensionInput = { width?: number; height?: number; size?: SizePreset };
const getDimensions = (input: DimensionInput) => {
  if (input.size) {
    return SIZE_PRESETS[input.size];
  }
  return {
    width: input.width ?? 80,
    height: input.height ?? 80
  };
};

// Ability Indicators Component
const AbilityIndicators: React.FC<{ abilities?: AbilityIndicator[]; position: 'top' | 'bottom' | 'left' | 'right' }> = ({
  abilities = [],
  position
}) => {
  if (!abilities.length) return null;

  const positionClasses = {
    top: 'absolute -top-2 left-1/2 transform -translate-x-1/2',
    bottom: 'absolute -bottom-2 left-1/2 transform -translate-x-1/2',
    left: 'absolute -left-2 top-1/2 transform -translate-y-1/2',
    right: 'absolute -right-2 top-1/2 transform -translate-y-1/2'
  };

  return (
    <div className={`${positionClasses[position]} flex gap-1 z-10`}>
      {abilities.filter(a => a.enabled).map((ability, idx) => (
        <div
          key={idx}
          className="w-3 h-3 rounded-full border border-white shadow-sm"
          style={{
            backgroundColor: ability.color || '#10b981'
          }}
          title={ability.type}
        />
      ))}
    </div>
  );
};

// Rounded Rectangle Component - for Sensor (data sensing style)
export const CircleShape: React.FC<ShapeProps> = ({
  width,
  height,
  size,
  colors,
  borderWidth = 2,
  children,
  className = '',
  abilities,
  showAbilities = true,
  isSelected = false,
  isHovered = false,
  isActive = false
}) => {
  const dimensions = getDimensions({ width, height, size });

  const stateClasses = [
    isSelected && 'ring-2 ring-blue-400 ring-offset-2',
    isHovered && 'scale-105 transition-transform duration-200',
    isActive && 'shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${stateClasses}`}>
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '16px',
          background: `
            linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}08 100%),
            radial-gradient(circle at 20% 20%, ${colors.primary}15, transparent 50%)
          `,
          border: `${borderWidth}px solid ${colors.border}`,
          boxShadow: `
            0 4px 12px ${colors.shadow},
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Sensor feature: left-side data flow indicator */}
        <div
          className="absolute left-2 top-1/2 transform -translate-y-1/2"
          style={{
            width: '3px',
            height: '60%',
            background: `linear-gradient(to bottom, ${colors.primary}, ${colors.primary}50, transparent)`,
            borderRadius: '2px',
            opacity: 0.6
          }}
        />

        {/* Data pulse effect */}
        <div
          className="absolute inset-4 rounded-xl opacity-20"
          style={{
            border: `1px dashed ${colors.primary}`,
            animation: isActive ? 'pulse 2s infinite' : 'none'
          }}
        />

        {children}
      </div>
      {showAbilities && <AbilityIndicators abilities={abilities} position="top" />}
    </div>
  );
};

// Rounded Rectangle Component - for Processor (computing processing style)
export const RectangleShape: React.FC<ShapeProps> = ({
  width,
  height,
  size,
  colors,
  borderWidth = 2,
  children,
  className = '',
  abilities,
  showAbilities = true,
  isSelected = false,
  isHovered = false,
  isActive = false
}) => {
  const dimensions = getDimensions({ width, height, size });

  const stateClasses = [
    isSelected && 'ring-2 ring-blue-400 ring-offset-2',
    isHovered && 'scale-105 transition-transform duration-200',
    isActive && 'shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${stateClasses}`}>
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '12px',
          background: `
            linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}10 100%),
            linear-gradient(45deg, transparent 30%, ${colors.primary}05 50%, transparent 70%)
          `,
          border: `${borderWidth}px solid ${colors.border}`,
          boxShadow: `
            0 6px 20px ${colors.shadow},
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Processor feature: dual-side processing indicators */}
        <div
          className="absolute left-2 top-2 bottom-2 w-1 opacity-40 rounded-full"
          style={{
            background: `linear-gradient(to bottom, ${colors.primary}, ${colors.primary}60, ${colors.primary})`
          }}
        />
        <div
          className="absolute right-2 top-2 bottom-2 w-1 opacity-40 rounded-full"
          style={{
            background: `linear-gradient(to bottom, ${colors.primary}, ${colors.primary}60, ${colors.primary})`
          }}
        />

        {/* Central computing grid */}
        <div
          className="absolute inset-6 opacity-15 rounded"
          style={{
            backgroundImage: `
              linear-gradient(90deg, ${colors.primary} 1px, transparent 1px),
              linear-gradient(180deg, ${colors.primary} 1px, transparent 1px)
            `,
            backgroundSize: '8px 8px'
          }}
        />

        {children}
      </div>
      {showAbilities && <AbilityIndicators abilities={abilities} position="bottom" />}
    </div>
  );
};

// Rounded Rectangle Component - for Memory (storage style - data storage)
export const HexagonShape: React.FC<ShapeProps> = ({
  width,
  height,
  size,
  colors,
  borderWidth = 2,
  children,
  className = '',
  abilities,
  showAbilities = true,
  isSelected = false,
  isHovered = false,
  isActive = false
}) => {
  const dimensions = getDimensions({ width, height, size });

  const stateClasses = [
    isSelected && 'ring-2 ring-blue-400 ring-offset-2',
    isHovered && 'scale-105 transition-transform duration-200',
    isActive && 'shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${stateClasses}`}>
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '14px',
          background: `
            linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}08 100%),
            repeating-linear-gradient(45deg, transparent, transparent 8px, ${colors.primary}03 8px, ${colors.primary}03 12px)
          `,
          border: `${borderWidth}px solid ${colors.border}`,
          boxShadow: `
            0 4px 16px ${colors.shadow},
            inset 0 2px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Memory feature: top storage indicator */}
        <div
          className="absolute top-2 left-3 right-3 h-1 opacity-50 rounded-full"
          style={{
            background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}30, ${colors.primary})`
          }}
        />

        {/* Data block indicators */}
        <div className="absolute top-6 left-3 flex gap-1">
          <div
            className="w-2 h-2 rounded-sm opacity-40"
            style={{ backgroundColor: colors.primary }}
          />
          <div
            className="w-2 h-2 rounded-sm opacity-60"
            style={{ backgroundColor: colors.primary }}
          />
          <div
            className="w-2 h-2 rounded-sm opacity-30"
            style={{ backgroundColor: colors.primary }}
          />
        </div>

        {/* Storage capacity indicator */}
        <div
          className="absolute bottom-2 left-3 right-3 h-1 opacity-30 rounded-full"
          style={{
            background: `linear-gradient(to right, ${colors.primary}60 70%, transparent 70%)`
          }}
        />

        {children}
      </div>
      {showAbilities && <AbilityIndicators abilities={abilities} position="left" />}
    </div>
  );
};

// Rounded Rectangle Component - for Actuator (actuator style - action output)
export const PentagonShape: React.FC<ShapeProps> = ({
  width,
  height,
  size,
  colors,
  borderWidth = 2,
  children,
  className = '',
  abilities,
  showAbilities = true,
  isSelected = false,
  isHovered = false,
  isActive = false
}) => {
  const dimensions = getDimensions({ width, height, size });

  const stateClasses = [
    isSelected && 'ring-2 ring-blue-400 ring-offset-2',
    isHovered && 'scale-105 transition-transform duration-200',
    isActive && 'shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${stateClasses}`}>
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '10px',
          background: `
            linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}12 100%),
            radial-gradient(circle at 80% 20%, ${colors.primary}08, transparent 50%)
          `,
          border: `${borderWidth}px solid ${colors.border}`,
          boxShadow: `
            0 6px 18px ${colors.shadow},
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Actuator feature: right-side output indicator */}
        <div
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          style={{
            width: '3px',
            height: '60%',
            background: `linear-gradient(to bottom, transparent, ${colors.primary}, ${colors.primary}50)`,
            borderRadius: '2px',
            opacity: 0.6
          }}
        />

        {/* Action execution indicators */}
        <div className="absolute bottom-3 right-3 flex gap-1">
          <div
            className="w-1 h-3 rounded-full opacity-60"
            style={{
              backgroundColor: colors.primary,
              animation: isActive ? 'pulse 1s infinite' : 'none'
            }}
          />
          <div
            className="w-1 h-2 rounded-full opacity-40"
            style={{
              backgroundColor: colors.primary,
              animation: isActive ? 'pulse 1s infinite 0.2s' : 'none'
            }}
          />
          <div
            className="w-1 h-4 rounded-full opacity-50"
            style={{
              backgroundColor: colors.primary,
              animation: isActive ? 'pulse 1s infinite 0.4s' : 'none'
            }}
          />
        </div>

        {/* Execution status indicator */}
        <div
          className="absolute top-2 right-3 w-2 h-2 rounded-full opacity-50"
          style={{
            backgroundColor: colors.primary,
            animation: isActive ? 'pulse 0.8s ease-in-out infinite' : 'none'
          }}
        />

        {children}
      </div>
      {showAbilities && <AbilityIndicators abilities={abilities} position="right" />}
    </div>
  );
};

// Rounded Rectangle Component - for Router (routing style - conditional branching)
export const DiamondShape: React.FC<ShapeProps> = ({
  width,
  height,
  size,
  colors,
  borderWidth = 2,
  children,
  className = '',
  abilities,
  showAbilities = true,
  isSelected = false,
  isHovered = false,
  isActive = false
}) => {
  const dimensions = getDimensions({ width, height, size });

  const stateClasses = [
    isSelected && 'ring-2 ring-blue-400 ring-offset-2',
    isHovered && 'scale-105 transition-transform duration-200',
    isActive && 'shadow-lg'
  ].filter(Boolean).join(' ');

  return (
    <div className={`relative ${stateClasses}`}>
      <div
        className={`relative flex items-center justify-center ${className}`}
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          borderRadius: '8px',
          background: `
            linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary}06 100%),
            linear-gradient(45deg, ${colors.primary}03 25%, transparent 25%, transparent 75%, ${colors.primary}03 75%)
          `,
          border: `${borderWidth}px solid ${colors.border}`,
          boxShadow: `
            0 4px 14px ${colors.shadow},
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Router feature: four-way routing indicators */}
        <div
          className="absolute top-2 left-1/2 transform -translate-x-1/2 w-1 h-4 opacity-40 rounded-full"
          style={{ background: `linear-gradient(to bottom, ${colors.primary}, transparent)` }}
        />
        <div
          className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-4 opacity-40 rounded-full"
          style={{ background: `linear-gradient(to top, ${colors.primary}, transparent)` }}
        />
        <div
          className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-1 opacity-40 rounded-full"
          style={{ background: `linear-gradient(to right, ${colors.primary}, transparent)` }}
        />
        <div
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-1 opacity-40 rounded-full"
          style={{ background: `linear-gradient(to left, ${colors.primary}, transparent)` }}
        />

        {/* Central routing core */}
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-50"
          style={{
            background: `radial-gradient(circle, ${colors.primary}, ${colors.primary}50)`,
            animation: isActive ? 'pulse 1.5s ease-in-out infinite' : 'none'
          }}
        />

        {/* Decision flow indicators */}
        <div className="absolute top-6 left-6 flex gap-1 opacity-30">
          <div
            className="w-1 h-1 rounded-full"
            style={{ backgroundColor: colors.primary }}
          />
          <div
            className="w-1 h-1 rounded-full"
            style={{
              backgroundColor: colors.primary,
              animation: isActive ? 'pulse 0.8s infinite 0.2s' : 'none'
            }}
          />
          <div
            className="w-1 h-1 rounded-full"
            style={{
              backgroundColor: colors.primary,
              animation: isActive ? 'pulse 0.8s infinite 0.4s' : 'none'
            }}
          />
        </div>

        {children}
      </div>
      {showAbilities && <AbilityIndicators abilities={abilities} position="top" />}
    </div>
  );
};

// Unified Shape Factory - Single interface for all shapes
export type ShapeType = 'circle' | 'rectangle' | 'hexagon' | 'pentagon' | 'diamond';

export const createShape = (type: ShapeType, props: ShapeProps) => {
  const shapeComponents = {
    circle: CircleShape,
    rectangle: RectangleShape,
    hexagon: HexagonShape,
    pentagon: PentagonShape,
    diamond: DiamondShape
  };

  const Component = shapeComponents[type];
  return <Component {...props} />;
};

// Ability Adapter - Convert from existing AbilityConfig to AbilityIndicator
export const adaptAbilitiesToIndicators = (
  abilities?: Array<{ type: string; enabled: boolean; parameters?: Record<string, any> }>
): AbilityIndicator[] => {
  if (!abilities) return [];

  const abilityColorMap: Record<string, string> = {
    'data-processing': '#3b82f6',   // blue
    'machine-learning': '#8b5cf6',  // purple
    'api-integration': '#10b981',   // green
    'file-storage': '#f59e0b',      // amber
    'communication': '#ef4444',     // red
    'monitoring': '#06b6d4',        // cyan
    'security': '#dc2626',          // red
    'default': '#6b7280'            // gray
  };

  return abilities.map(ability => ({
    type: ability.type,
    enabled: ability.enabled,
    color: abilityColorMap[ability.type] || abilityColorMap.default,
    icon: ability.type.charAt(0).toUpperCase()
  }));
};

// Enhanced Shape Props for backward compatibility
export interface EnhancedShapeProps extends Omit<ShapeProps, 'abilities'> {
  abilities?: Array<{ type: string; enabled: boolean; parameters?: Record<string, any> }>;
  shape?: ShapeType;
}

// Universal Shape Component - One component to rule them all
export const UniversalShape: React.FC<EnhancedShapeProps> = ({
  shape = 'rectangle',
  abilities,
  ...props
}) => {
  const adaptedAbilities = adaptAbilitiesToIndicators(abilities);

  return (
    <>
      {/* Add necessary CSS animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Better GPU acceleration for shapes */
        .shape-container {
          will-change: transform;
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }

        /* Optimized transition animations */
        .shape-hover-transition {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      {createShape(shape, {
        ...props,
        abilities: adaptedAbilities
      })}
    </>
  );
};