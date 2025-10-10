import { memo, useRef, useEffect } from 'react';
import { Button } from 'antd';

interface MinimalDebugConsoleProps {
  logs: string[];
  isVisible: boolean;
  height: number;
  onToggle: () => void;
  onClear: () => void;
  onResize?: (height: number) => void;
}

export const MinimalDebugConsole = memo(({
  logs,
  isVisible,
  height,
  onToggle,
  onClear,
  onResize,
}: MinimalDebugConsoleProps) => {
  const consoleRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);

  // Auto scroll to bottom
  useEffect(() => {
    if (consoleRef.current && logs.length > 0) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!onResize) return;
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;
    resizingRef.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(120, Math.min(480, startHeight + deltaY));
      onResize(newHeight);
    };

    const handleMouseUp = () => {
      resizingRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (!isVisible) {
    return (
      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <Button
          type="text"
          size="small"
          onClick={onToggle}
          className="hover:bg-gray-50 text-sm"
        >
          Show Console
          {logs.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded">
              {logs.length}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="bg-white border-t border-gray-200"
      style={{ height: `${height}px` }}
    >
      {/* Header - Draggable */}
      <div
        className="px-4 py-2 border-b border-gray-200 flex items-center justify-between cursor-row-resize select-none bg-gray-50 hover:bg-gray-100 transition-colors"
        onMouseDown={handleResizeStart}
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium text-gray-700">Console</div>
          {logs.length > 0 && (
            <div className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded font-medium">
              {logs.length} logs
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="text"
            size="small"
            onClick={onClear}
            disabled={logs.length === 0}
            className="text-xs hover:bg-gray-200"
          >
            Clear
          </Button>

          <Button
            type="text"
            size="small"
            onClick={onToggle}
            className="hover:bg-gray-200 text-sm"
          >
            Hide
          </Button>
        </div>
      </div>

      {/* Logs */}
      <div
        ref={consoleRef}
        className="overflow-y-auto bg-white font-mono text-xs"
        style={{ height: `${height - 40}px` }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="mb-1">No logs yet</div>
              <div className="text-xs">Run workflow to see output</div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex gap-3 py-1 hover:bg-gray-50 rounded px-2 -mx-2"
              >
                <span className="text-gray-400 flex-shrink-0 w-8 text-right">
                  {String(i + 1).padStart(3, '0')}
                </span>
                <span className="flex-1 text-gray-700">{log}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

MinimalDebugConsole.displayName = 'MinimalDebugConsole';
