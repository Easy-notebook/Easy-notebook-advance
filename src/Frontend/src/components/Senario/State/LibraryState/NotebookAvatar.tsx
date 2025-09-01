// LibraryState/NotebookAvatar.tsx
// Notebook preview component showing actual content

import React, { memo, useState, useEffect } from 'react';
import { FileORM } from '@Storage/index';

interface NotebookPreviewProps {
  id: string;
  size?: number;
}

const NotebookAvatar: React.FC<NotebookPreviewProps> = memo(({ id, size = 48 }) => {
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPreviewContent = async () => {
      try {
        setIsLoading(true);
        console.log(`🔍 Loading preview content for ${id}`);
        
        const main = await FileORM.getFile(id, `notebook_${id}.json`);
        const raw = main?.content;
        
        if (raw) {
          let text = '';
          if (typeof raw === 'string') text = raw;
          else if (raw instanceof Blob) text = await raw.text();
          
          let data: any = null;
          try {
            data = JSON.parse(text);
          } catch {
            try {
              const decoded = atob(text);
              data = JSON.parse(decoded);
            } catch (parseError) {
              console.warn(`Failed to parse notebook data for ${id}:`, parseError);
              setPreviewContent('Parse Error');
              return;
            }
          }
          
          console.log(`📄 Notebook preview data for ${id}:`, {
            hasCells: !!data?.cells,
            cellCount: data?.cells?.length || 0,
            cellTypes: data?.cells?.map(c => c.cell_type || c.cellType) || []
          });
          
          if (data?.cells && Array.isArray(data.cells) && data.cells.length > 0) {
            // Extract text content from first few cells for preview
            let contentPreview = '';
            let foundContent = false;
            
            for (const cell of data.cells.slice(0, 5)) {
              const source = cell.source || cell.content || '';
              const sourceText = Array.isArray(source) ? source.join('') : source;
              
              if (sourceText && sourceText.trim()) {
                // For image cells, show a different preview
                if (cell.cell_type === 'image' || cell.cellType === 'image') {
                  contentPreview += '[图片] ';
                  foundContent = true;
                } else {
                  // Clean markdown headers and get plain text
                  const cleanText = sourceText.trim()
                    .replace(/^#+\s*/, '') // Remove markdown headers
                    .replace(/!\[.*?\]\(.*?\)/g, '[图片]') // Replace image markdown
                    .replace(/\[.*?\]\(.*?\)/g, '') // Remove links
                    .replace(/[*_`]/g, ''); // Remove formatting
                  
                  if (cleanText.trim()) {
                    contentPreview += cleanText.trim() + '\n';
                    foundContent = true;
                  }
                }
                
                if (contentPreview.length > 150) break;
              }
            }
            
            if (foundContent) {
              setPreviewContent(contentPreview.substring(0, 150));
              console.log(`✅ Found preview content for ${id}:`, contentPreview.substring(0, 50) + '...');
            } else {
              console.log(`⚠️ No readable content found for ${id}`);
              setPreviewContent('无内容预览');
            }
          } else {
            console.log(`⚠️ No cells found for ${id}`);
            setPreviewContent('无内容');
          }
        } else {
          console.log(`⚠️ No raw content found for ${id}`);
          setPreviewContent('文件为空');
        }
      } catch (error) {
        console.warn(`Failed to load preview for ${id}:`, error);
        setPreviewContent('加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreviewContent();
  }, [id]);

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
      style={{ 
        width: size, 
        height: size,
        fontSize: Math.max(8, size / 12),
        lineHeight: 1.2
      }}
    >
      {isLoading ? (
        <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
        </div>
      ) : (
        <div className="p-1 w-full h-full overflow-hidden">
          <div 
            className="text-gray-700 text-xs leading-tight"
            style={{ 
              fontSize: Math.max(6, size / 16),
              lineHeight: 1.1,
              wordBreak: 'break-all',
              hyphens: 'auto'
            }}
          >
            {previewContent || 'Empty Notebook'}
          </div>
        </div>
      )}
    </div>
  );
});

NotebookAvatar.displayName = 'NotebookAvatar';

export default NotebookAvatar;