import React from 'react';
import { CircleNode, CircleNodeProps } from './CircleNode';
import { EllipseNode, EllipseNodeProps } from './EllipseNode';
import { DiamondNode, DiamondNodeProps } from './DiamondNode';
import { RoundedNode, RoundedNodeProps } from './RoundedNode';
import { SemiRoundedNode, SemiRoundedNodeProps } from './SemiRoundedNode';
import { HexagonNode, HexagonNodeProps } from './HexagonNode';
import { BaseNode, BaseNodeProps } from './BaseNode';
import { SimplifiedBrainCell, SimplifiedBrainCellProps } from './SimplifiedBrainCell';
import { SimplifiedBaseNode, SimplifiedBaseNodeProps } from './SimplifiedBaseNode';
import { SimplifiedAbilityNode, SimplifiedAbilityNodeProps } from './SimplifiedAbilityNode';
import { SimplifiedRuleNode, SimplifiedRuleNodeProps } from './SimplifiedRuleNode';
import { SimplifiedKnowledgeNode, SimplifiedKnowledgeNodeProps } from './SimplifiedKnowledgeNode';
import { SimplifiedGenNode, SimplifiedGenNodeProps } from './SimplifiedGenNode';
import { SimplifiedBrainCellShowcase } from './SimplifiedBrainCellShowcase';
import { BrainCellDesignComparison } from './BrainCellDesignComparison';

// Export all individual components
export {
  CircleNode,
  EllipseNode,
  DiamondNode,
  RoundedNode,
  SemiRoundedNode,
  HexagonNode,
  BaseNode,
  SimplifiedBrainCell,
  SimplifiedBaseNode,
  SimplifiedAbilityNode,
  SimplifiedRuleNode,
  SimplifiedKnowledgeNode,
  SimplifiedGenNode,
  SimplifiedBrainCellShowcase,
  BrainCellDesignComparison
};
export type {
  CircleNodeProps,
  EllipseNodeProps,
  DiamondNodeProps,
  RoundedNodeProps,
  SemiRoundedNodeProps,
  HexagonNodeProps,
  BaseNodeProps,
  SimplifiedBrainCellProps,
  SimplifiedBaseNodeProps,
  SimplifiedAbilityNodeProps,
  SimplifiedRuleNodeProps,
  SimplifiedKnowledgeNodeProps,
  SimplifiedGenNodeProps
};

// Shape types
export type BrainCellShape = "circle" | "ellipse" | "diamond" | "rounded" | "semiRounded" | "hexagon";
export type Material = "solid" | "soft" | "glass" | "neon" | "gradient";

// Common props interface
export interface BrainCellNodeData {
  label: string;
  icon?: string;
  material?: Material;
  role?: string;
  source?: { type: string; namespace?: string; channel?: string; qos?: number };
}

export interface BrainCellNodeProps {
  data: BrainCellNodeData;
  selected?: boolean;
  iconMap?: Record<string, React.ReactNode>;
  theme?: any;
  getMaterialStyle?: (material: string, base?: React.CSSProperties) => React.CSSProperties;
}

// Shape factory function
export function createBrainCellNode(
  shape: BrainCellShape,
  props: BrainCellNodeProps
): React.ReactElement {
  const shapeComponents = {
    circle: CircleNode,
    ellipse: EllipseNode,
    diamond: DiamondNode,
    rounded: RoundedNode,
    semiRounded: SemiRoundedNode,
    hexagon: HexagonNode
  };

  const Component = shapeComponents[shape];
  return <Component {...props} />;
}

// Universal BrainCell Node Component
export interface UniversalBrainCellNodeProps extends BrainCellNodeProps {
  shape?: BrainCellShape;
}

export function UniversalBrainCellNode({
  shape = "ellipse",
  ...props
}: UniversalBrainCellNodeProps): React.ReactElement {
  return createBrainCellNode(shape, props);
}

// Enhanced GenNode that wraps the original logic with new components
export interface GenNodeProps extends BrainCellNodeProps {
  shape?: BrainCellShape;
}

export function GenNode({ shape = "ellipse", ...props }: GenNodeProps) {
  return <UniversalBrainCellNode shape={shape} {...props} />;
}

export default UniversalBrainCellNode;