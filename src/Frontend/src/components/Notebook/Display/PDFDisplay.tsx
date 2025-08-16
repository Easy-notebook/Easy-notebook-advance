import React from 'react';

interface PDFDisplayProps {
  dataUrl: string; // data:application/pdf;base64,...
  fileName?: string | null;
}

const PDFDisplay: React.FC<PDFDisplayProps> = ({ dataUrl, fileName }) => {
  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-white/70">
        <div className="text-sm font-medium text-gray-700 truncate">{fileName || 'PDF Preview'}</div>
        <a
          href={dataUrl}
          download={fileName || 'document.pdf'}
          className="text-xs px-2 py-1 rounded bg-theme-50 text-theme-700 hover:bg-theme-100"
        >
          下载 PDF
        </a>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50">
        <iframe
          title={fileName || 'PDF'}
          src={dataUrl}
          className="w-full h-full"
        />
      </div>
    </div>
  );
};

export default PDFDisplay;

