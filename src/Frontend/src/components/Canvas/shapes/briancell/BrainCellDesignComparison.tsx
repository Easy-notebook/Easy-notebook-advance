import React, { useState } from 'react';
import { Card, Space, Typography, Button, Switch } from 'antd';
import { BaseNode } from './BaseNode';
import { SimplifiedBaseNode } from './SimplifiedBaseNode';
import { SimplifiedBrainCell } from './SimplifiedBrainCell';
import { CircleNode, EllipseNode, DiamondNode } from './';

const { Title, Text } = Typography;

const sampleTheme = {
  colors: {
    primary: '#3B82F6',
    warning: '#F59E0B',
    success: '#10B981',
    info: '#06B6D4',
    bg: '#ffffff',
    text: '#0f172a',
    textSub: '#64748b',
    border: '#94a3b8',
    borderStrong: '#64748b',
    dark: '#0f172a',
    darkStroke: '#1e293b'
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    glow: '0 0 20px rgba(59, 130, 246, 0.15)'
  }
};

const sampleData = {
  label: "Data Processor",
  kind: "BrainCell",
  icon: "base",
  stats: {
    abilities: 5,
    rules: 3,
    knowledge: 2
  }
};

const IconMap = {
  base: '🧠',
  ability: '⚡',
  rule: '🛡️',
  knowledge: '📚'
};

/**
 * BrainCell Design Comparison - Shows both original and simplified designs
 */
export const BrainCellDesignComparison: React.FC = () => {
  const [showOriginal, setShowOriginal] = useState(true);
  const [selectedMode, setSelectedMode] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Title level={2}>🧠 BrainCell Design Evolution</Title>
        <div className="flex items-center gap-4">
          <Switch
            checked={selectedMode}
            onChange={setSelectedMode}
            checkedChildren="Selected"
            unCheckedChildren="Normal"
          />
          <Switch
            checked={showOriginal}
            onChange={setShowOriginal}
            checkedChildren="Original"
            unCheckedChildren="Simplified"
          />
        </div>
      </div>

      <Text className="block mb-4">
        Comparison between the original complex design and the new simplified, technical diagram-inspired design
      </Text>

      <Card title="Main BrainCell Node Comparison" className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="text-center">
            <div className="mb-4">
              <Text strong className="text-lg">Original Design</Text>
              <Text className="block text-sm text-gray-500">Complex, feature-rich with gradients and effects</Text>
            </div>
            <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
              <BaseNode
                data={sampleData}
                selected={selectedMode}
                iconMap={IconMap}
                theme={sampleTheme}
              />
            </div>
          </div>

          <div className="text-center">
            <div className="mb-4">
              <Text strong className="text-lg">Simplified Design</Text>
              <Text className="block text-sm text-gray-500">Clean, technical, diagram-inspired</Text>
            </div>
            <div className="flex justify-center items-center" style={{ minHeight: '300px' }}>
              <SimplifiedBaseNode
                data={sampleData}
                selected={selectedMode}
                iconMap={IconMap}
                theme={sampleTheme}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Simplified Standalone BrainCell" className="mb-6">
        <Text className="block mb-4">
          New ultra-minimal design based on the technical diagram aesthetic
        </Text>
        <div className="flex justify-center items-center" style={{ minHeight: '200px' }}>
          <SimplifiedBrainCell
            data={{
              label: "Processing Unit",
              size: "lg",
              stats: { abilities: 8, rules: 4, knowledge: 3 }
            }}
            selected={selectedMode}
            theme={sampleTheme}
          />
        </div>
      </Card>

      <Card title="Design Comparison Summary" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Text strong className="text-lg block mb-3">Original Design Features:</Text>
            <ul className="space-y-2 text-sm">
              <li>• Rich gradients and visual effects</li>
              <li>• Complex shadows and animations</li>
              <li>• Circular central node design</li>
              <li>• Multiple handle positions</li>
              <li>• Detailed port labeling</li>
              <li>• Heavy visual weight</li>
              <li>• Stats display with emojis</li>
            </ul>
          </div>

          <div>
            <Text strong className="text-lg block mb-3">Simplified Design Features:</Text>
            <ul className="space-y-2 text-sm">
              <li>• Clean line-based aesthetics</li>
              <li>• Geometric port symbols</li>
              <li>• Rectangular main container</li>
              <li>• Technical diagram style</li>
              <li>• Minimal visual noise</li>
              <li>• Professional appearance</li>
              <li>• Scalable architecture</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Port Design Evolution" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <Text strong className="block mb-3">Abilities Port</Text>
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 border-2 border-blue-500 rounded-full bg-white flex items-center justify-center">
                <div className="w-4 h-4 border border-blue-500 rounded-full" />
              </div>
            </div>
            <Text className="text-xs text-gray-600">Circle with inner ring</Text>
          </div>

          <div className="text-center">
            <Text strong className="block mb-3">Rules Port</Text>
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-b-6 border-transparent border-b-orange-500" />
              </div>
            </div>
            <Text className="text-xs text-gray-600">Upward pointing triangle</Text>
          </div>

          <div className="text-center">
            <Text strong className="block mb-3">Knowledge Port</Text>
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 bg-white flex items-center justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-6 border-transparent border-t-green-500" />
              </div>
            </div>
            <Text className="text-xs text-gray-600">Downward pointing triangle</Text>
          </div>
        </div>
      </Card>

      <Card title="Use Cases" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Text strong className="block mb-2">Original Design Best For:</Text>
            <ul className="text-sm space-y-1">
              <li>• Interactive applications</li>
              <li>• User-facing interfaces</li>
              <li>• Rich visual experiences</li>
              <li>• Creative/artistic contexts</li>
            </ul>
          </div>

          <div>
            <Text strong className="block mb-2">Simplified Design Best For:</Text>
            <ul className="text-sm space-y-1">
              <li>• Technical documentation</li>
              <li>• System architecture diagrams</li>
              <li>• Professional presentations</li>
              <li>• High-density visualizations</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BrainCellDesignComparison;