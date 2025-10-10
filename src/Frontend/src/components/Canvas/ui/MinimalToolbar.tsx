import { memo } from 'react';
import { Button, Tooltip, Segmented } from 'antd';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Download,
  Upload,
  Maximize2,
} from 'lucide-react';

interface MinimalToolbarProps {
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onExport: () => void;
  onImport: () => void;
  onFitView?: () => void;
  canvasTheme?: 'grid' | 'dots' | 'plain';
  onCanvasThemeChange?: (theme: 'grid' | 'dots' | 'plain') => void;
}

export const MinimalToolbar = memo(({
  onRun,
  onPause,
  onReset,
  onStep,
  onExport,
  onImport,
  onFitView,
  canvasTheme = 'dots',
  onCanvasThemeChange,
}: MinimalToolbarProps) => {
  return (
    <div
      className="h-full px-4 flex items-center justify-between bg-white"
      style={{
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Left - Execution controls */}
      <div className="flex items-center gap-2">
        <Button
          type="text"
          onClick={onRun}
          className="hover:bg-gray-50 text-sm"
        >
          Run
        </Button>

        <Button
          type="text"
          onClick={onStep}
          className="hover:bg-gray-50 text-sm"
        >
          Step
        </Button>

        <Button
          type="text"
          onClick={onPause}
          className="hover:bg-gray-50 text-sm"
        >
          Pause
        </Button>

        <Button
          type="text"
          onClick={onReset}
          className="hover:bg-gray-50 text-sm"
        >
          Reset
        </Button>

        <div className="w-px h-6 bg-gray-200 mx-2" />

        {onFitView && (
          <Button
            type="text"
            onClick={onFitView}
            className="hover:bg-gray-50 text-sm"
          >
            Fit View
          </Button>
        )}
      </div>

      {/* Center - Theme */}
      {onCanvasThemeChange && (
        <Segmented
          size="small"
          value={canvasTheme}
          onChange={(v) => onCanvasThemeChange(v as any)}
          options={[
            { label: 'Dots', value: 'dots' },
            { label: 'Grid', value: 'grid' },
            { label: 'Plain', value: 'plain' },
          ]}
        />
      )}

      {/* Right - File operations */}
      <div className="flex items-center gap-2">
        <Button
          type="text"
          onClick={onExport}
          className="hover:bg-gray-50 text-sm"
        >
          Export
        </Button>

        <Button
          type="text"
          onClick={onImport}
          className="hover:bg-gray-50 text-sm"
        >
          Import
        </Button>
      </div>
    </div>
  );
});

MinimalToolbar.displayName = 'MinimalToolbar';
