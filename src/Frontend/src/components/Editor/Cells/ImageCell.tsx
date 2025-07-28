import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Eye, Edit3 } from 'lucide-react';
import useStore from '../../../store/notebookStore';

interface Cell {
  id: string;
  content: string;
  type: string;
  outputs: any[];
  enableEdit: boolean;
  metadata?: Record<string, any>;
}

interface ImageCellProps {
  cell: Cell;
}

const ImageCell: React.FC<ImageCellProps> = ({ cell }) => {
  const {
    updateCell,
    deleteCell,
    editingCellId,
    setEditingCellId,
    showButtons,
    setShowButtons,
    viewMode,
  } = useStore();

  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingCellId === cell.id;
  const hasContent = cell.content.trim().length > 0;
  const cellShowButtons = showButtons[cell.id] || false;
  
  const [imageError, setImageError] = useState(false);
  const [tempContent, setTempContent] = useState(cell.content);

  // 解析markdown语法
  const parseMarkdown = (markdownStr: string) => {
    const match = markdownStr.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (match) {
      return {
        alt: match[1] || '',
        src: match[2] || '',
        isValid: true
      }
    }
    return {
      alt: '',
      src: '',
      isValid: false
    }
  }

  // 当前解析的图片数据
  const imageData = parseMarkdown(cell.content);

  // 开始编辑
  const startEditing = useCallback(() => {
    setEditingCellId(cell.id);
    setTempContent(cell.content);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // 将游标设置到文本末尾
        const length = cell.content.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  }, [cell.id, cell.content, setEditingCellId]);

  // 保存编辑
  const saveEdit = useCallback(() => {
    updateCell(cell.id, tempContent);
    setEditingCellId(null);
  }, [cell.id, tempContent, updateCell, setEditingCellId]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setTempContent(cell.content);
    setEditingCellId(null);
  }, [cell.content, setEditingCellId]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        saveEdit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  // 处理输入变化
  const handleChange = useCallback(
    (value: string) => {
      setTempContent(value);
    },
    []
  );

  // 处理失焦
  const handleBlur = useCallback(() => {
    if (isEditing) {
      saveEdit();
    }
  }, [isEditing, saveEdit]);

  // 处理图片加载错误
  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // 实时解析预览数据
  const previewData = parseMarkdown(tempContent);

  return (
    <>
      <div
        className="relative group"
        data-cell-id={cell.id}
      >
        <div className="image-cell">
          <div
            className="flex items-start relative"
            onMouseEnter={() => setShowButtons(cell.id, true)}
            onMouseLeave={() => setShowButtons(cell.id, false)}
          >
            {/* 主体区域 */}
            <div className="flex-grow w-full">
              {isEditing ? (
                // 编辑模式：简约的源码编辑器 + 实时预览
                <div className="image-editor text-black">
                  <input
                    ref={inputRef}
                    type="text"
                    value={tempContent}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    placeholder="![图片描述](图片URL)"
                    className="text-black w-full p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-blue-400"
                  />
                  
                  {/* 实时预览图片 */}
                  {previewData.isValid && previewData.src ? (
                    <div className="mt-3">
                      <img
                        src={previewData.src}
                        alt={previewData.alt}
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      />
                      
                      {imageError && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                          ⚠️ 图片加载失败: {previewData.src}
                        </div>
                      )}
                      
                      {previewData.alt && !imageError && (
                        <div className="mt-2 text-sm text-center italic">
                          {previewData.alt}
                        </div>
                      )}
                    </div>
                  ) : tempContent ? (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-700 text-sm">
                      ⚠️ 请检查 Markdown 语法: ![描述](URL)
                    </div>
                  ) : (
                    <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
                      输入图片的 Markdown 语法以查看预览
                    </div>
                  )}
                </div>
              ) : (
                // 显示模式：显示图片
                <div className="image-display">
                  {imageData.isValid && imageData.src ? (
                    <div className="relative">
                      <img
                        src={imageData.src}
                        alt={imageData.alt}
                        title={imageData.alt}
                        onError={handleImageError}
                        onLoad={handleImageLoad}
                        onClick={startEditing}
                        className="max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      
                      {imageError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-center text-black-500">
                            <div className="text-sm">图片加载失败</div>
                            <div className="text-xs">{imageData.src}</div>
                          </div>
                        </div>
                      )}
                      
                      {imageData.alt && !imageError && (
                        <div className="mt-2 text-sm text-black-600 text-center italic">
                          {imageData.alt}
                        </div>
                      )}
                    </div>
                  ) : (
                    // 空状态或无效语法
                    <div 
                      className="image-placeholder border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                      onClick={startEditing}
                    >
                      <div className="text-black-600 mb-2">
                        {hasContent ? '⚠️ Markdown 语法错误' : '点击添加图片'}
                      </div>
                      <div className="text-sm text-black-400">
                        格式: ![图片描述](图片URL)
                      </div>
                      {hasContent && (
                        <div className="mt-2 font-mono text-xs text-black-500 bg-gray-50 p-2 rounded">
                          {cell.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 工具栏 */}
            {(viewMode === "complete" || viewMode === "create") && (
              <div
                className={`absolute -right-14 top-1 flex items-center transition-opacity duration-200 ${
                  cellShowButtons || isEditing ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      saveEdit();
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="保存"
                  >
                    <Eye size={14} />
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing();
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded"
                    title="编辑"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCell(cell.id);
                  }}
                  className="p-1.5 hover:bg-gray-200 rounded text-red-500"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(ImageCell);