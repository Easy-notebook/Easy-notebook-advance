import { useTranslation } from 'react-i18next';
import { Play, Upload, BarChartHorizontalBig, TerminalSquare, Settings2 } from 'lucide-react';
import ModeToggle from './ModeToggle';
import ExportToFile from '../FunctionBar/ExportToFile';

const VUE_PRIMARY = '#41B883';
const VUE_SECONDARY = '#35495E';

interface HeaderProps {
  viewMode: string;
  isCollapsed: boolean;
  cells: any[];
  isExecuting: boolean;
  isRightSidebarCollapsed: boolean;
  onModeChange: (mode: string) => void;
  onRunAll: () => void;
  onExportJson: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onExportMarkdown: () => void;
  onTriggerFileInput: () => void;
  onHandleImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onShowCommandInput: () => void;
  onToggleRightSidebar: () => void;
  onOpenSettings: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const Header: React.FC<HeaderProps> = ({
  viewMode,
  isCollapsed,
  cells,
  isExecuting,
  onModeChange,
  onRunAll,
  onExportJson,
  onExportDocx,
  onExportPdf,
  onExportMarkdown,
  onTriggerFileInput,
  onHandleImport,
  onShowCommandInput,
  onToggleRightSidebar,
  onOpenSettings,
  fileInputRef
}) => {
  const { t } = useTranslation();

  return (
    <header className="h-16 flex items-center justify-between px-3 bg-white/80 backdrop-blur-md">
      <div className="flex items-center gap-2">
        {isCollapsed && (
          <button 
            onClick={onOpenSettings} 
            className="p-3 rounded-lg hover:bg-white/90 transition-colors"
          >
            <Settings2 size={16} />
          </button>
        )}
        <ModeToggle viewMode={viewMode} onModeChange={onModeChange} />
      </div>

      <div className="flex items-center gap-3">
        {!(cells.length === 0 || viewMode === 'dslc') && (
          <>
            <button
              onClick={onRunAll}
              className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
              disabled={cells.length === 0 || isExecuting}
              style={{ color: VUE_SECONDARY }}
            >
              <Play size={16} />
              {isExecuting ? t('fileOperations.running') : t('fileOperations.runAll')}
            </button>

            <ExportToFile
              disabled={cells.length === 0}
              onExportJson={onExportJson}
              onExportDocx={onExportDocx}
              onExportPdf={onExportPdf}
              onExportMarkdown={onExportMarkdown}
            />
          </>
        )}
        
        <button
          onClick={onTriggerFileInput}
          className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
          style={{ color: VUE_SECONDARY }}
        >
          <Upload size={16} />
          {t('fileOperations.import')}
        </button>
        
        <input
          type="file"
          accept=".ipynb,application/json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={onHandleImport}
        />

        <div className='flex items-center gap-2'>
          {!(cells.length === 0 || viewMode === 'dslc') && (
            <button
              className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
              onClick={onShowCommandInput}
              style={{ color: VUE_PRIMARY }}
            >
              <TerminalSquare size={16} />
            </button>
          )}
          <button
            onClick={onToggleRightSidebar}
            className="flex items-center gap-2 px-4 py-2 font-medium hover:bg-white/90 rounded-lg transition-colors"
            style={{ color: VUE_PRIMARY, backgroundColor: `${VUE_PRIMARY}15` }}
          >
            <BarChartHorizontalBig size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;