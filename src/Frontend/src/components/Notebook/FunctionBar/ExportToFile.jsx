import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Loader2, X } from 'lucide-react';

const ExportOption = ({ icon: Icon, title, description, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-start gap-4 p-4 rounded-lg transition-colors hover:bg-rose-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <div className="mt-1 p-2 rounded-lg bg-rose-100 text-rose-800">
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 text-left">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  </button>
);

export default function ExportToFile({ 
  onExportJson, 
  onExportDocx, 
  onExportPdf,
  onExportMarkdown,
  disabled 
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef(null);

  const handleExport = useCallback(async (exportFn) => {
    try {
      setIsExporting(true);
      await exportFn();
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  }, []);

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 text-base font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-5 h-5" />
        Export
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          {/* Modal Content */}
          <div
            ref={modalRef}
            className="bg-white rounded-xl shadow-xl w-full max-w-md transform transition-all mx-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-rose-800">Export Notebook</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {isExporting ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-rose-800" />
                </div>
              ) : (
                <div className="space-y-4">
                  <ExportOption
                    icon={Download}
                    title="Export as JSON"
                    description="Save notebook with all metadata as JSON file"
                    onClick={() => handleExport(onExportJson)}
                  />
                  <ExportOption
                    icon={Download}
                    title="Export as DOCX"
                    description="Export as Microsoft Word document"
                    onClick={() => handleExport(onExportDocx)}
                  />
                  <ExportOption
                    icon={Download}
                    title="Export as PDF"
                    description="Export as PDF document"
                    onClick={() => handleExport(onExportPdf)}
                  />
                  <ExportOption
                    icon={Download}
                    title="Export as Markdown"
                    description="Export as Markdown document"
                    onClick={() => handleExport(onExportMarkdown)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}