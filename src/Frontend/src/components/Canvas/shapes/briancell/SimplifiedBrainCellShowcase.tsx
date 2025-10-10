import React from 'react';
import { Card, Space, Typography } from 'antd';
import SimplifiedBrainCell from './SimplifiedBrainCell';

const { Title, Text } = Typography;

const sampleTheme = {
  colors: {
    primary: '#3B82F6',
    bg: '#ffffff',
    text: '#0f172a',
    textSub: '#64748b',
    border: '#94a3b8',
    borderStrong: '#64748b'
  }
};

/**
 * Simplified BrainCell Showcase - Demonstrates the new line-based design
 * Based on the provided image with clean geometric ports and connections
 */
export const SimplifiedBrainCellShowcase: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <Title level={2}>🧠 Simplified BrainCell Design</Title>
      <Text className="block mb-4">
        Clean, minimalist design based on technical diagram aesthetics with geometric port symbols
      </Text>

      <Card title="Size Variations" className="mb-6">
        <Text className="block mb-4">
          Different sizes for various use cases: sm (200x120), md (280x140), lg (360x160), xl (440x180)
        </Text>
        <Space size="large" wrap align="center">
          <div className="text-center">
            <SimplifiedBrainCell
              data={{
                label: "Small",
                size: "sm",
                stats: { abilities: 3, rules: 2, knowledge: 1 }
              }}
              theme={sampleTheme}
            />
            <div className="mt-2 text-xs text-gray-500">Small (sm)</div>
          </div>

          <div className="text-center">
            <SimplifiedBrainCell
              data={{
                label: "Medium",
                size: "md",
                stats: { abilities: 5, rules: 3, knowledge: 2 }
              }}
              theme={sampleTheme}
            />
            <div className="mt-2 text-xs text-gray-500">Medium (md)</div>
          </div>

          <div className="text-center">
            <SimplifiedBrainCell
              data={{
                label: "Large",
                size: "lg",
                stats: { abilities: 8, rules: 4, knowledge: 3 }
              }}
              theme={sampleTheme}
            />
            <div className="mt-2 text-xs text-gray-500">Large (lg)</div>
          </div>
        </Space>
      </Card>

      <Card title="Interactive States" className="mb-6">
        <Text className="block mb-4">
          Visual feedback for selection and interaction states
        </Text>
        <Space size="large" wrap align="center">
          <div className="text-center">
            <SimplifiedBrainCell
              data={{
                label: "Normal State",
                size: "md",
                stats: { abilities: 4, rules: 2, knowledge: 1 }
              }}
              theme={sampleTheme}
            />
            <div className="mt-2 text-xs">Default State</div>
          </div>

          <div className="text-center">
            <SimplifiedBrainCell
              data={{
                label: "Selected",
                size: "md",
                stats: { abilities: 4, rules: 2, knowledge: 1 }
              }}
              selected={true}
              theme={sampleTheme}
            />
            <div className="mt-2 text-xs">Selected State</div>
          </div>
        </Space>
      </Card>

      <Card title="Port Design Guide" className="mb-6">
        <Text className="block mb-4">
          Each port type has a distinct geometric symbol for easy identification
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 rounded-full bg-white flex items-center justify-center">
                <div className="w-3 h-3 border border-gray-500 rounded-full" />
              </div>
              <span className="text-sm">
                <strong>Circle Port:</strong> Sensor/Input data sources
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-blue-500" />
              </div>
              <span className="text-sm">
                <strong>Triangle Port:</strong> Processing/Computation units
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white flex items-center justify-center">
                <div className="w-0 h-0 border-l-2 border-r-2 border-t-3 border-transparent border-t-blue-500" />
              </div>
              <span className="text-sm">
                <strong>Inverted Triangle:</strong> Filter/Selection logic
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 bg-white" />
              <span className="text-sm">
                <strong>Square Port:</strong> Output/Export endpoints
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full" />
              <span className="text-sm">
                <strong>Filled Circle:</strong> Main output connection
              </span>
            </div>

            <div className="flex items-center gap-3">
              <svg width="24" height="12" className="inline">
                <path d="M0 6 Q12 0 24 6" stroke="#3B82F6" strokeWidth="2" fill="none" strokeDasharray="4,2" />
              </svg>
              <span className="text-sm">
                <strong>Curved Dashed Line:</strong> Secondary/Conditional output
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Design Principles" className="mb-6">
        <div className="space-y-4">
          <div>
            <Text strong>Minimalist Aesthetic:</Text>
            <Text className="block text-sm text-gray-600">
              Clean lines, geometric shapes, and minimal visual noise for professional technical diagrams
            </Text>
          </div>

          <div>
            <Text strong>Semantic Port Design:</Text>
            <Text className="block text-sm text-gray-600">
              Each port shape immediately conveys its function - circles for inputs, triangles for processing, squares for outputs
            </Text>
          </div>

          <div>
            <Text strong>Scalable Architecture:</Text>
            <Text className="block text-sm text-gray-600">
              Multiple size options maintain proportions and readability across different zoom levels and use cases
            </Text>
          </div>

          <div>
            <Text strong>Connection Clarity:</Text>
            <Text className="block text-sm text-gray-600">
              Clear visual hierarchy with solid lines for primary connections and dashed lines for secondary/conditional flows
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SimplifiedBrainCellShowcase;