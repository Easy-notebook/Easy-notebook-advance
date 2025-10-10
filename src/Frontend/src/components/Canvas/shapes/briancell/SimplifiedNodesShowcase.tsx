import React, { useState } from 'react';
import { Card, Space, Typography, Switch } from 'antd';
import { SimplifiedBaseNode } from './SimplifiedBaseNode';
import { SimplifiedAbilityNode } from './SimplifiedAbilityNode';
import { SimplifiedRuleNode } from './SimplifiedRuleNode';
import { SimplifiedKnowledgeNode } from './SimplifiedKnowledgeNode';
import { SimplifiedExportNode } from './SimplifiedExportNode';

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
    borderStrong: '#64748b'
  }
};

const IconMap = {
  base: '🧠',
  ability: '⚡',
  rule: '🛡️',
  knowledge: '📚'
};

/**
 * Simplified Nodes Showcase - All simplified node types with unified design
 */
export const SimplifiedNodesShowcase: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Title level={2}>🎨 Simplified Node System</Title>
        <Switch
          checked={selectedMode}
          onChange={setSelectedMode}
          checkedChildren="Selected"
          unCheckedChildren="Normal"
        />
      </div>

      <Text className="block mb-4">
        Complete set of simplified nodes with consistent design language and technical diagram aesthetics
      </Text>

      <Card title="Main BrainCell Node" className="mb-6">
        <Text className="block mb-4">
          Central processing unit with geometric input ports and clean output design
        </Text>
        <div className="flex justify-center">
          <SimplifiedBaseNode
            data={{
              label: "Data Processor",
              kind: "BrainCell",
              stats: { abilities: 5, rules: 3, knowledge: 2 }
            }}
            selected={selectedMode}
            iconMap={IconMap}
            theme={sampleTheme}
          />
        </div>
      </Card>

      <Card title="Component Node Types" className="mb-6">
        <Text className="block mb-4">
          Individual processing components with role-specific designs
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-center">
          <div className="text-center">
            <SimplifiedAbilityNode
              data={{
                label: "Text Analysis",
                role: "ability"
              }}
              selected={selectedMode}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm font-medium">Ability Node</Text>
            <Text className="block text-xs text-gray-500">Pill-shaped with circle port</Text>
          </div>

          <div className="text-center">
            <SimplifiedRuleNode
              data={{
                label: "Validation",
                role: "rule"
              }}
              selected={selectedMode}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm font-medium">Rule Node</Text>
            <Text className="block text-xs text-gray-500">Diamond with triangle icon</Text>
          </div>

          <div className="text-center">
            <SimplifiedKnowledgeNode
              data={{
                label: "Documentation",
                role: "knowledge"
              }}
              selected={selectedMode}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm font-medium">Knowledge Node</Text>
            <Text className="block text-xs text-gray-500">Circle with inverted triangle</Text>
          </div>

          <div className="text-center">
            <SimplifiedExportNode
              data={{
                label: "Export Data",
                role: "export"
              }}
              selected={selectedMode}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm font-medium">Export Node</Text>
            <Text className="block text-xs text-gray-500">Hexagon with square icon</Text>
          </div>
        </div>
      </Card>

      <Card title="Design Features" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Text strong className="block mb-3">Visual Consistency:</Text>
            <ul className="space-y-2 text-sm">
              <li>• Unified stroke width and colors</li>
              <li>• Consistent connection line design</li>
              <li>• Geometric shape language</li>
              <li>• Minimal visual weight</li>
              <li>• Professional appearance</li>
            </ul>
          </div>

          <div>
            <Text strong className="block mb-3">Functional Clarity:</Text>
            <ul className="space-y-2 text-sm">
              <li>• Role-specific geometric shapes</li>
              <li>• Semantic color coding</li>
              <li>• Clear connection points</li>
              <li>• Readable labels at all sizes</li>
              <li>• EasyNet status indicators</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card title="Shape & Role Mapping" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-6 bg-blue-500 rounded-full border-2 border-blue-600 flex items-center justify-center">
                <div className="w-2 h-2 border border-blue-700 rounded-full bg-white" />
              </div>
            </div>
            <Text strong className="block">Ability</Text>
            <Text className="text-xs text-gray-600">Pill shape with circle port</Text>
            <Text className="text-xs">Processing capabilities</Text>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="w-6 h-6 bg-orange-500 border-2 border-orange-600 transform rotate-45 flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-orange-700 transform -rotate-45" />
              </div>
            </div>
            <Text strong className="block">Rule</Text>
            <Text className="text-xs text-gray-600">Diamond with triangle</Text>
            <Text className="text-xs">Validation logic</Text>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-8 bg-green-500 border-2 border-green-600 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-r-2 border-t-3 border-transparent border-t-green-700" />
              </div>
            </div>
            <Text strong className="block">Knowledge</Text>
            <Text className="text-xs text-gray-600">Circle with inverted triangle</Text>
            <Text className="text-xs">Data storage</Text>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="flex justify-center mb-2">
              <div className="w-8 h-5 bg-cyan-500 border-2 border-cyan-600 flex items-center justify-center" style={{clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'}}>
                <div className="w-2 h-2 bg-cyan-700 border border-cyan-800" />
              </div>
            </div>
            <Text strong className="block">Export</Text>
            <Text className="text-xs text-gray-600">Hexagon with square</Text>
            <Text className="text-xs">Output generation</Text>
          </div>
        </div>
      </Card>

      <Card title="Connection States" className="mb-6">
        <Text className="block mb-4">
          Visual indicators for different connection and operational states
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <SimplifiedAbilityNode
              data={{
                label: "Standard",
                role: "ability"
              }}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm">Standard State</Text>
          </div>

          <div className="text-center">
            <SimplifiedAbilityNode
              data={{
                label: "Connected",
                role: "ability",
                source: { type: "easynet" }
              }}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm">EasyNet Connected</Text>
          </div>

          <div className="text-center">
            <SimplifiedAbilityNode
              data={{
                label: "Selected",
                role: "ability"
              }}
              selected={true}
              theme={sampleTheme}
            />
            <Text className="block mt-2 text-sm">Selected State</Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SimplifiedNodesShowcase;