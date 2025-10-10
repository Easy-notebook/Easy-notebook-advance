import React from 'react';
import { SimplifiedAbilityNode } from './SimplifiedAbilityNode';
import { SimplifiedRuleNode } from './SimplifiedRuleNode';
import { SimplifiedKnowledgeNode } from './SimplifiedKnowledgeNode';

export interface SimplifiedGenNodeProps {
  data: {
    label: string;
    role: "ability" | "rule" | "knowledge";
    icon?: string;
    material?: "solid" | "soft" | "glass" | "neon" | "gradient";
    shape?: "circle" | "ellipse" | "diamond" | "rounded" | "semiRounded" | "hexagon";
    source?: { type: string; namespace?: string; channel?: string; qos?: number };
  };
  selected?: boolean;
  iconMap?: Record<string, React.ReactNode>;
  theme?: any;
  getMaterialStyle?: (material: string, base?: React.CSSProperties) => React.CSSProperties;
}

export function SimplifiedGenNode({
  data,
  selected = false,
  iconMap = {},
  theme,
  getMaterialStyle
}: SimplifiedGenNodeProps) {
  // Route to the appropriate simplified component based on role
  switch (data.role) {
    case 'ability':
      return (
        <SimplifiedAbilityNode
          data={data}
          selected={selected}
          iconMap={iconMap}
          theme={theme}
        />
      );

    case 'rule':
      return (
        <SimplifiedRuleNode
          data={data}
          selected={selected}
          iconMap={iconMap}
          theme={theme}
        />
      );

    case 'knowledge':
      return (
        <SimplifiedKnowledgeNode
          data={data}
          selected={selected}
          iconMap={iconMap}
          theme={theme}
        />
      );

    default:
      // Fallback to ability node
      return (
        <SimplifiedAbilityNode
          data={data}
          selected={selected}
          iconMap={iconMap}
          theme={theme}
        />
      );
  }
}

export default SimplifiedGenNode;