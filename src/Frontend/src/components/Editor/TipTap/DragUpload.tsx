import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from 'prosemirror-model';
import useStore from '../../../store/notebookStore';
import { handleFileUpload } from '../../../utils/fileUtils';
import { notebookApiIntegration } from '../../../services/notebookServices';
import { Backend_BASE_URL } from '../../../config/base_url';

/* ---------------- Types ---------------- */

interface DragUploadProps {
  editor: Editor | null;
  children: React.ReactNode;
}

// Note: Use fileUtils structural types; avoid redefining conflicting interfaces locally

/* ---------------- Constants ---------------- */

const PROSEMIRROR_BLOCK_SELECTOR =
  '.ProseMirror p, .ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6, .ProseMirror ul, .ProseMirror ol, .ProseMirror blockquote, .ProseMirror pre';

const CELL_SELECTOR =
  '[data-cell-id], [data-type="executable-code-block"], [data-type="thinking-cell"], [data-type="markdown-image"]';

const HOVERABLE_SELECTOR = `${PROSEMIRROR_BLOCK_SELECTOR}, ${CELL_SELECTOR}`;

/* ---------------- Component ---------------- */

const DragUpload: React.FC<DragUploadProps> = ({ editor, children }) => {
  const [currentCellId, setCurrentCellId] = useState<string | null>(null);
  // 目前没有真实拖拽交互，可保留占位；若未来需要改变，建议改为 useRef<boolean>
  const [isDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [, setUploading] = useState(false);
  const [, setUploadProgress] = useState(0);
  const [, setUploadError] = useState<string | null>(null);

  const { cells, notebookId } = useStore();

  /* -------- utilities -------- */

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      if (!isDragging) setCurrentCellId(null);
    }, 300);
  }, [clearHideTimeout, isDragging]);

  /** Try to resolve cell-id via DOM; fallback by probing ProseMirror block index. */
  const findCellByElement = useCallback(
    (element: HTMLElement): string | null => {
      // direct attribute on known cells
      const cellElement = element.closest(CELL_SELECTOR);
      if (cellElement) {
        const cellId = (cellElement as HTMLElement).getAttribute('data-cell-id');
        if (cellId) return cellId;
      }

      // fallback: map PM block → our cells[index]
      if (editor) {
        try {
          const blockElement = element.closest(PROSEMIRROR_BLOCK_SELECTOR);
          if (!blockElement) return null;

          const rect = blockElement.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;

          const coords = editor.view.posAtCoords({ left: x, top: y });
          if (!coords || typeof coords.pos !== 'number') return null;

          let blockIndex = 0;
          let found = false;

          editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (found) return false;
            if (node.isBlock) {
              const nodeStart = pos;
              const nodeEnd = pos + node.nodeSize;

              if (coords.pos >= nodeStart && coords.pos < nodeEnd) {
                found = true;
                return false;
              }
              if (coords.pos >= nodeEnd) {
                blockIndex += 1;
              }
            }
            return true;
          });

          if (Array.isArray(cells) && blockIndex >= 0 && blockIndex < cells.length) {
            const id = cells[blockIndex]?.id;
            return typeof id === 'string' ? id : null;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Failed to resolve cell by element:', error);
        }
      }
      return null;
    },
    [editor, cells]
  );

  const showToolbarForElement = useCallback(
    (element: HTMLElement) => {
      clearHideTimeout();
      const cellId = findCellByElement(element);
      if (!cellId) return;
      if (cellId !== currentCellId) setCurrentCellId(cellId);
    },
    [currentCellId, findCellByElement, clearHideTimeout]
  );

  /* -------- effects: mouse & dnd -------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!editor || !container) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const blockElement = target.closest(HOVERABLE_SELECTOR);
      if (blockElement instanceof HTMLElement) {
        showToolbarForElement(blockElement);
      } else {
        scheduleHide();
      }
    };

    const handleMouseLeave = () => {
      if (!isDragging) scheduleHide();
    };

    const handleDragOver = (e: DragEvent) => {
      // Allow dropping files only
      const dt = e.dataTransfer;
      if (dt && Array.from(dt.types || []).includes('Files')) {
        e.preventDefault();
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (!notebookId) return; // require notebook context

      const dt = e.dataTransfer;
      if (!dt || !dt.files || dt.files.length === 0) return;

      e.preventDefault();

      const files: File[] = Array.from(dt.files);

      const uploadConfig = {
        mode: 'restricted' as 'restricted' | 'open',
        maxFileSize: 50 * 1024 * 1024,
        maxFiles: files.length,
        allowedTypes: [
          '.txt',
          '.md',
          '.json',
          '.js',
          '.py',
          '.html',
          '.css',
          '.csv',
          '.pdf',
          '.zip',
          '.tar',
          '.gz',
          '.doc',
          '.docx',
          '.ppt',
          '.pptx',
          '.xls',
          '.xlsx',
          '.png',
          '.jpg',
          '.jpeg',
          '.gif',
          '.svg',
          '.webp',
          '.mp4',
          '.webm',
          '.mov',
          '.avi',
          '.mkv',
        ],
        targetDir: '.assets',
      };

      const toast = ({ title, description, variant }: { title: string; description?: string; variant?: 'success' | 'destructive' | 'info' | 'default' }) => {
        // 这里可以换成你们的全局 toast
        // eslint-disable-next-line no-console
        console.log(`${variant || 'info'}: ${title}${description ? ` - ${description}` : ''}`);
      };

      try {
        // Adapter to satisfy fileUtils NotebookApiIntegration typing
        const filesApi = {
          listFiles: (id: string) => notebookApiIntegration.listFiles(id) as any,
          uploadFiles: (
            id: string,
            f: File[],
            cfg: any,
            _onProgress: (e: ProgressEvent) => void,
            signal: AbortSignal,
          ) => notebookApiIntegration.uploadFiles(id, f, cfg, signal) as any,
          getFilePreviewUrl: async (id: string, filename: string) =>
            `${Backend_BASE_URL}/assets/${encodeURIComponent(id)}/${encodeURIComponent(filename)}`,
          getFileContent: async (id: string, filename: string) => {
            const res = await notebookApiIntegration.getFile(id, filename);
            if ((res as any).status === 'ok' && (res as any).content) return (res as any).content as string;
            throw new Error((res as any).message || 'Failed to get file content');
          },
          downloadFile: async (id: string, filename: string) => {
            await notebookApiIntegration.downloadFile(id, filename);
          },
          deleteFile: async () => {
            throw new Error('Delete API not implemented');
          },
        } as const;

        await handleFileUpload({
          notebookId,
          files,
          notebookApiIntegration: filesApi as any,
          uploadConfig,
          setUploading,
          setUploadProgress,
          setError: setUploadError,
          fileInputRef,
          setIsPreview: () => {},
          toast,
          onUpdate: (_cellId: string, payload: { uploadedFiles: string[] }) => {
            if (!editor) return;
            const uploadedFiles = Array.isArray(payload?.uploadedFiles) ? payload.uploadedFiles : [];

            uploadedFiles.forEach((name) => {
              const lower = name.toLowerCase();
              const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].some((ext) =>
                lower.endsWith(ext)
              );
              const url = `${Backend_BASE_URL}/assets/${encodeURIComponent(
                notebookId
              )}/${encodeURIComponent(name)}`;

              if (isImage) {
                // Prefer custom markdown-image node; fallback to <img>
                try {
                  editor
                    .chain()
                    .focus()
                    .insertContent(
                      `<div data-type="markdown-image" data-src="${url}" data-alt="${name}" data-title="${name}" data-markdown="![${name}](${url})"></div>`
                    )
                    .run();
                } catch {
                  editor.chain().focus().insertContent(`<img src="${url}" alt="${name}" title="${name}" />`).run();
                }
              } else {
                const markdown = `[${name}](${url})`;
                editor
                  .chain()
                  .focus()
                  .insertContent(`<div data-type="file-attachment" data-markdown="${markdown}"></div>`)
                  .run();
              }
            });
          },
          cellId: '', // not tied to a specific cell for DnD root drop
          abortControllerRef,
          fetchFileList: async () => {
            try {
              await notebookApiIntegration.listFiles(notebookId);
            } catch {
              /* ignore */
            }
          },
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('TipTap drop upload failed:', err);
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
      clearHideTimeout();
    };
  }, [editor, isDragging, notebookId, showToolbarForElement, scheduleHide, clearHideTimeout]);

  return (
    <div ref={containerRef} className="relative">
      {children}

      {/* Hover CSS intentionally disabled; keep block for potential future use */}
      <style>{`
        /* Hover effects intentionally disabled for cells */
        /* 
        ${PROSEMIRROR_BLOCK_SELECTOR},
        ${CELL_SELECTOR} {
          transition: all 0.15s ease;
        }
        ${PROSEMIRROR_BLOCK_SELECTOR}:hover,
        ${CELL_SELECTOR}:hover {
          background-color: rgba(66, 133, 244, 0.04);
          border-left: 3px solid rgba(66, 133, 244, 0.3);
          border-radius: 0 4px 4px 0;
          padding-left: 8px;
          margin-left: -11px;
        }
        */
      `}</style>
    </div>
  );
};

export default DragUpload;