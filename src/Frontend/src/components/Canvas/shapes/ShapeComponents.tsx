import React from 'react';

interface ShapeProps {
  width: number;
  height: number;
  colors: {
    primary: string;
    secondary: string;
    border: string;
    shadow: string;
  };
  borderWidth: number;
  children: React.ReactNode;
  className?: string;
}

// 圆形组件 - 用于 Sensor
export const CircleShape: React.FC<ShapeProps> = ({ width, height, colors, borderWidth, children, className = '' }) => {
  const radius = Math.min(width, height) / 2;

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '50%',
        backgroundColor: colors.secondary,
        border: `${borderWidth}px solid ${colors.border}`,
        boxShadow: `0 4px 12px ${colors.shadow}`,
      }}
    >
      {children}
    </div>
  );
};

// 矩形组件 - 用于 Processor
export const RectangleShape: React.FC<ShapeProps> = ({ width, height, colors, borderWidth, children, className = '' }) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: '12px',
        backgroundColor: colors.secondary,
        border: `${borderWidth}px solid ${colors.border}`,
        boxShadow: `0 4px 12px ${colors.shadow}`,
      }}
    >
      {children}
    </div>
  );
};

// 六边形组件 - 用于 Memory
export const HexagonShape: React.FC<ShapeProps> = ({ width, height, colors, borderWidth, children, className = '' }) => {
  const clipPath = 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)';

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.secondary,
        border: `${borderWidth}px solid ${colors.border}`,
        clipPath,
        boxShadow: `0 4px 12px ${colors.shadow}`,
      }}
    >
      {children}
    </div>
  );
};

// 五边形组件 - 用于 Actuator
export const PentagonShape: React.FC<ShapeProps> = ({ width, height, colors, borderWidth, children, className = '' }) => {
  const clipPath = 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.secondary,
        border: `${borderWidth}px solid ${colors.border}`,
        clipPath,
        boxShadow: `0 4px 12px ${colors.shadow}`,
      }}
    >
      {children}
    </div>
  );
};

// 菱形组件 - 用于 Router
export const DiamondShape: React.FC<ShapeProps> = ({ width, height, colors, borderWidth, children, className = '' }) => {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: colors.secondary,
        border: `${borderWidth}px solid ${colors.border}`,
        transform: 'rotate(45deg)',
        boxShadow: `0 4px 12px ${colors.shadow}`,
      }}
    >
      <div style={{ transform: 'rotate(-45deg)' }}>
        {children}
      </div>
    </div>
  );
};