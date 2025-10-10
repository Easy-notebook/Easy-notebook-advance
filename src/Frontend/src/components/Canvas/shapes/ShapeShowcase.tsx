import React from 'react';
import { Card, Space, Typography, Divider } from 'antd';
import {
  UniversalShape,
  CircleShape,
  RectangleShape,
  HexagonShape,
  PentagonShape,
  DiamondShape,
  AbilityIndicator,
  SIZE_PRESETS,
  SizePreset,
} from './ShapeComponents';

const { Title, Text } = Typography;

// Example abilities for demonstration
const sampleAbilities: AbilityIndicator[] = [
  { type: 'data-processing', enabled: true, color: '#3b82f6' },
  { type: 'machine-learning', enabled: true, color: '#8b5cf6' },
  { type: 'api-integration', enabled: false, color: '#10b981' },
];

const sampleColors = {
  primary: '#3B82F6',
  secondary: '#EFF6FF',
  border: '#3B82F6',
  shadow: '#3B82F620'
};

/**
 * Shape Showcase Component - Demonstrates the new unified shape system
 * This component showcases all the optimized shapes with abilities support
 */
export const ShapeShowcase: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <Title level={2}>🎨 Optimized Shape Components Showcase</Title>

      <Card title="Size Presets" className="mb-6">
        <Text className="block mb-4">
          Unified sizing with responsive presets: sm (60x60), md (80x80), lg (120x120), xl (160x160)
        </Text>
        <Space size="large" wrap>
          {Object.entries(SIZE_PRESETS).map(([preset, dimensions]) => (
            <div key={preset} className="text-center">
              <UniversalShape
                shape="rectangle"
                size={preset as SizePreset}
                colors={{
                  ...sampleColors,
                  shadow: sampleColors.shadow || '#3B82F620'
                }}
                abilities={sampleAbilities}
              >
                <Text strong>{preset}</Text>
              </UniversalShape>
              <div className="mt-2 text-xs text-gray-500">
                {dimensions.width}×{dimensions.height}
              </div>
            </div>
          ))}
        </Space>
      </Card>

      <Card title="Shape Types with Abilities" className="mb-6">
        <Text className="block mb-4">
          Each shape type optimized for different BrainCell kinds with ability indicators
        </Text>
        <Space size="large" wrap>
          <div className="text-center">
            <CircleShape
              size="lg"
              colors={{ ...sampleColors, primary: '#10B981', secondary: '#F0FDF4', border: '#10B981', shadow: '#10B98120' }}
              abilities={sampleAbilities}
            >
              <Text strong>Sensor</Text>
            </CircleShape>
            <div className="mt-2 text-xs">Circle - Data Input</div>
          </div>

          <div className="text-center">
            <RectangleShape
              size="lg"
              colors={sampleColors}
              abilities={sampleAbilities}
            >
              <Text strong>Processor</Text>
            </RectangleShape>
            <div className="mt-2 text-xs">Rectangle - Processing</div>
          </div>

          <div className="text-center">
            <HexagonShape
              size="lg"
              colors={{ ...sampleColors, primary: '#8B5CF6', secondary: '#FAF5FF', border: '#8B5CF6', shadow: '#8B5CF620' }}
              abilities={sampleAbilities}
            >
              <Text strong>Memory</Text>
            </HexagonShape>
            <div className="mt-2 text-xs">Hexagon - Storage</div>
          </div>

          <div className="text-center">
            <PentagonShape
              size="lg"
              colors={{ ...sampleColors, primary: '#F59E0B', secondary: '#FFFBEB', border: '#F59E0B', shadow: '#F59E0B20' }}
              abilities={sampleAbilities}
            >
              <Text strong>Actuator</Text>
            </PentagonShape>
            <div className="mt-2 text-xs">Pentagon - Output</div>
          </div>

          <div className="text-center">
            <DiamondShape
              size="lg"
              colors={{ ...sampleColors, primary: '#EF4444', secondary: '#FEF2F2', border: '#EF4444', shadow: '#EF444420' }}
              abilities={sampleAbilities}
            >
              <Text strong>Router</Text>
            </DiamondShape>
            <div className="mt-2 text-xs">Diamond - Routing</div>
          </div>
        </Space>
      </Card>

      <Card title="Interactive States" className="mb-6">
        <Text className="block mb-4">
          Visual feedback for user interactions: selection, hover, and active states
        </Text>
        <Space size="large" wrap>
          <div className="text-center">
            <UniversalShape
              shape="rectangle"
              size="md"
              colors={sampleColors}
              abilities={sampleAbilities}
            >
              <Text>Normal</Text>
            </UniversalShape>
            <div className="mt-2 text-xs">Default State</div>
          </div>

          <div className="text-center">
            <UniversalShape
              shape="rectangle"
              size="md"
              colors={sampleColors}
              abilities={sampleAbilities}
              isHovered={true}
            >
              <Text>Hovered</Text>
            </UniversalShape>
            <div className="mt-2 text-xs">Hover Effect</div>
          </div>

          <div className="text-center">
            <UniversalShape
              shape="rectangle"
              size="md"
              colors={sampleColors}
              abilities={sampleAbilities}
              isSelected={true}
            >
              <Text>Selected</Text>
            </UniversalShape>
            <div className="mt-2 text-xs">Selection Ring</div>
          </div>

          <div className="text-center">
            <UniversalShape
              shape="rectangle"
              size="md"
              colors={sampleColors}
              abilities={sampleAbilities}
              isActive={true}
            >
              <Text>Active</Text>
            </UniversalShape>
            <div className="mt-2 text-xs">Enhanced Shadow</div>
          </div>
        </Space>
      </Card>

      <Card title="Unified Abilities Interface" className="mb-6">
        <Text className="block mb-4">
          Single interface for all ability management with color-coded indicators
        </Text>
        <div className="space-y-4">
          <div>
            <Text strong>Ability Types:</Text>
            <ul className="mt-2 ml-4">
              <li>🔵 data-processing (Blue)</li>
              <li>🟣 machine-learning (Purple)</li>
              <li>🟢 api-integration (Green)</li>
              <li>🟡 file-storage (Amber)</li>
              <li>🔴 communication (Red)</li>
              <li>🔷 monitoring (Cyan)</li>
              <li>⚫ security (Dark Red)</li>
            </ul>
          </div>

          <Divider />

          <div className="text-center">
            <UniversalShape
              shape="hexagon"
              size="lg"
              colors={sampleColors}
              abilities={[
                { type: 'data-processing', enabled: true },
                { type: 'machine-learning', enabled: true },
                { type: 'api-integration', enabled: true },
                { type: 'file-storage', enabled: true },
                { type: 'communication', enabled: false },
              ]}
            >
              <Text strong>Multi-Ability Node</Text>
            </UniversalShape>
            <div className="mt-2 text-sm text-gray-600">
              Hover over indicators to see ability types
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ShapeShowcase;