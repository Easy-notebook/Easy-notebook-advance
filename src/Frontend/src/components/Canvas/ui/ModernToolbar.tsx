import { Button, Tooltip, Segmented, Dropdown, Badge } from 'antd';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  Download,
  Upload,
  Trash2,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Sun,
  Moon,
  MoreVertical,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { memo } from 'react';

interface ModernToolbarProps {
  onRun: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  onValidate?: () => void;
  onFitView?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  canvasTheme?: 'grid' | 'dots' | 'plain';
  onCanvasThemeChange?: (theme: 'grid' | 'dots' | 'plain') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  nodesCount?: number;
  edgesCount?: number;
  isRunning?: boolean;
}

export const ModernToolbar = memo(({
  onRun,
  onPause,
  onReset,
  onStep,
  onExport,
  onImport,
  onClear,
  onValidate,
  onFitView,
  onZoomIn,
  onZoomOut,
  canvasTheme = 'dots',
  onCanvasThemeChange,
  isDarkMode = false,
  onToggleDarkMode,
  nodesCount = 0,
  edgesCount = 0,
  isRunning = false,
}: ModernToolbarProps) => {
  const moreMenuItems = [
    onValidate && {
      key: 'validate',
      label: (
        <div className="flex items-center gap-2 px-2 py-1">
          <CheckCircle2 className="w-4 h-4" />
          <span>Validate Graph</span>
        </div>
      ),
      onClick: onValidate,
    },
    {
      key: 'clear',
      label: (
        <div className="flex items-center gap-2 px-2 py-1 text-red-600">
          <Trash2 className="w-4 h-4" />
          <span>Clear Canvas</span>
        </div>
      ),
      onClick: onClear,
      danger: true,
    },
  ].filter(Boolean);

  return (
    <div
      className="h-full px-6 flex items-center justify-between backdrop-blur-xl"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.9) 100%)',
        borderBottom: '1px solid rgba(229,231,235,0.8)',
      }}
    >
      {/* Left section - Execution controls */}
      <div className="flex items-center gap-3">
        <Tooltip title="Run workflow">
          <Button
            type="primary"
            icon={<Play className="w-4 h-4" />}
            onClick={onRun}
            className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              height: '36px',
            }}
          >
            Run
          </Button>
        </Tooltip>

        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <Tooltip title="Single step (i)">
            <Button
              size="small"
              icon={<StepForward className="w-4 h-4" />}
              onClick={onStep}
              className="hover:bg-blue-50 transition-colors"
            />
          </Tooltip>

          <Tooltip title="Pause (o)">
            <Button
              size="small"
              icon={<Pause className="w-4 h-4" />}
              onClick={onPause}
              className="hover:bg-orange-50 transition-colors"
            />
          </Tooltip>

          <Tooltip title="Reset">
            <Button
              size="small"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={onReset}
              className="hover:bg-purple-50 transition-colors"
            />
          </Tooltip>
        </div>

        {/* Status indicator */}
        {isRunning && (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full border border-green-300 animate-pulse">
            <Activity className="w-3 h-3 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Running</span>
          </div>
        )}
      </div>

      {/* Center section - Canvas controls */}
      <div className="flex items-center gap-3">
        {/* Theme selector */}
        {onCanvasThemeChange && (
          <Tooltip title="Canvas theme">
            <Segmented
              size="small"
              value={canvasTheme}
              onChange={(v) => onCanvasThemeChange(v as any)}
              options={[
                { label: 'Dots', value: 'dots', icon: <Grid3x3 className="w-3 h-3" /> },
                { label: 'Grid', value: 'grid' },
                { label: 'Plain', value: 'plain' },
              ]}
              className="shadow-sm"
            />
          </Tooltip>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          {onZoomOut && (
            <Tooltip title="Zoom out">
              <Button
                size="small"
                icon={<ZoomOut className="w-4 h-4" />}
                onClick={onZoomOut}
                className="hover:bg-gray-50"
              />
            </Tooltip>
          )}

          {onFitView && (
            <Tooltip title="Fit view">
              <Button
                size="small"
                icon={<Maximize2 className="w-4 h-4" />}
                onClick={onFitView}
                className="hover:bg-gray-50"
              />
            </Tooltip>
          )}

          {onZoomIn && (
            <Tooltip title="Zoom in">
              <Button
                size="small"
                icon={<ZoomIn className="w-4 h-4" />}
                onClick={onZoomIn}
                className="hover:bg-gray-50"
              />
            </Tooltip>
          )}
        </div>

        {/* Graph stats */}
        <div className="flex items-center gap-3 px-4 py-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <Badge count={nodesCount} showZero color="#3b82f6">
            <span className="text-xs font-medium text-gray-600">Nodes</span>
          </Badge>
          <div className="h-4 w-px bg-gray-300" />
          <Badge count={edgesCount} showZero color="#8b5cf6">
            <span className="text-xs font-medium text-gray-600">Edges</span>
          </Badge>
        </div>
      </div>

      {/* Right section - File operations */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
          <Tooltip title="Export JSON">
            <Button
              size="small"
              icon={<Download className="w-4 h-4" />}
              onClick={onExport}
              className="hover:bg-blue-50 transition-colors"
            />
          </Tooltip>

          <Tooltip title="Import JSON">
            <Button
              size="small"
              icon={<Upload className="w-4 h-4" />}
              onClick={onImport}
              className="hover:bg-green-50 transition-colors"
            />
          </Tooltip>
        </div>

        {/* Dark mode toggle */}
        {onToggleDarkMode && (
          <Tooltip title={isDarkMode ? 'Light mode' : 'Dark mode'}>
            <Button
              size="small"
              icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              onClick={onToggleDarkMode}
              className="shadow-sm hover:shadow-md transition-all"
            />
          </Tooltip>
        )}

        {/* More options */}
        <Dropdown menu={{ items: moreMenuItems }} trigger={['click']} placement="bottomRight">
          <Button
            size="small"
            icon={<MoreVertical className="w-4 h-4" />}
            className="shadow-sm hover:shadow-md transition-all"
          />
        </Dropdown>
      </div>
    </div>
  );
});

ModernToolbar.displayName = 'ModernToolbar';
