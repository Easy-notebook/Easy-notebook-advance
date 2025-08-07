import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2, Eye, Edit3, Maximize2, X, Loader2 } from 'lucide-react';
import useStore from '../../../store/notebookStore';

interface Cell {
  id: string;
  content: string;
  type: string;
  outputs: any[];
  enableEdit: boolean;
  metadata?: {
    isGenerating?: boolean;
    generationStartTime?: number;
    prompt?: string;
    generationType?: 'video' | 'image';
    generationParams?: {
      quality?: string;
      ratio?: string;
      duration?: string;
    };
    [key: string]: any;
  };
}

interface ImageCellProps {
  cell: Cell;
}

const ImageCell: React.FC<ImageCellProps> = ({ cell: propCell }) => {
  const {
    updateCell,
    deleteCell,
    editingCellId,
    setEditingCellId,
    showButtons,
    setShowButtons,
    viewMode,
    cells,
  } = useStore();

  // 直接从 store 获取最新的 cell 数据，确保能收到 metadata 更新
  // 使用useMemo确保当cells数组更新时，cell能正确更新
  const cell = React.useMemo(() => {
    const storeCell = cells.find(c => c.id === propCell.id);
    const resultCell = storeCell || propCell;
    
    // 调试日志：当 cell 内容或 metadata 改变时记录
    if (storeCell && (storeCell.content !== propCell.content || JSON.stringify(storeCell.metadata) !== JSON.stringify(propCell.metadata))) {
      console.log('🖼️ ImageCell content/metadata 更新:', {
        cellId: propCell.id,
        oldContent: propCell.content?.substring(0, 50),
        newContent: storeCell.content?.substring(0, 50),
        oldMetadata: propCell.metadata,
        newMetadata: storeCell.metadata,
        contentChanged: storeCell.content !== propCell.content,
        metadataChanged: JSON.stringify(storeCell.metadata) !== JSON.stringify(propCell.metadata)
      });
    }
    
    return resultCell;
  }, [cells, propCell.id, propCell]);

  const inputRef = useRef<HTMLInputElement>(null);
  const isEditing = editingCellId === cell.id;
  const hasContent = cell.content.trim().length > 0;
  const cellShowButtons = showButtons[cell.id] || false;

  const [imageError, setImageError] = useState(false);
  const [tempContent, setTempContent] = useState(cell.content);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check if cell is in generation state
  const isGenerating = cell.metadata?.isGenerating || false;
  const generationType = cell.metadata?.generationType || 'image';
  const generationPrompt = cell.metadata?.prompt || '';
  const generationParams = cell.metadata?.generationParams || {};
  const generationStartTime = cell.metadata?.generationStartTime;
  const generationError = cell.metadata?.generationError;
  const generationStatus = cell.metadata?.generationStatus;

  // 判断是否应该显示loading状态：
  // 1. metadata中明确标记为generating
  // 2. 或者有generation相关的metadata但内容为空（刚创建的情况）
  const shouldShowLoading = isGenerating ||
    (cell.metadata?.generationType && !hasContent && !generationError);

  // 解析markdown语法并检测媒体类型
  const parseMarkdown = (markdownStr: string) => {
    const match = markdownStr.match(/!\[([^\]]*)\]\(([^)]+)\)/)
    if (match) {
      const src = match[2] || '';
      const alt = match[1] || '';

      // 检测是否为视频文件
      const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
      const isVideo = videoExtensions.some(ext => src.toLowerCase().includes(ext));

      return {
        alt,
        src,
        isValid: true,
        isVideo
      }
    }
    return {
      alt: '',
      src: '',
      isValid: false,
      isVideo: false
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

  // 打开模态框
  const openModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsModalOpen(true);
    }
  };

  // 关闭模态框
  const closeModal = () => {
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Timer effect for generation progress
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (shouldShowLoading && generationStartTime) {
      // 立即设置一次，然后每秒更新
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - generationStartTime) / 1000);
        setElapsedTime(elapsed);
      };
      updateElapsed(); // 立即执行一次
      interval = setInterval(updateElapsed, 1000);
    } else if (shouldShowLoading && !generationStartTime) {
      // 如果在loading状态但没有开始时间，使用当前时间作为起点
      const startTime = Date.now();
      const updateElapsed = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(elapsed);
      };
      updateElapsed(); // 立即执行一次
      interval = setInterval(updateElapsed, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [shouldShowLoading, generationStartTime, isGenerating]); // 添加 isGenerating 到依赖

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

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
              {shouldShowLoading ?
                // 生成状态 - 最高优先级，覆盖所有其他状态
                <div className="image-display">
                  <div className={`generation-loading border rounded-lg p-6 ${generationError
                      ? 'border-red-200 bg-red-50'
                      : 'border-theme-200 bg-gradient-to-br from-theme-50 to-indigo-50 animate-pulse'
                    }`}>
                    <div className="flex flex-col items-center space-y-4">
                      {generationError ? (
                        // 错误状态
                        <>
                          <div className="flex items-center gap-3">
                            <div className="text-red-500 text-2xl">❌</div>
                            <div className="text-lg font-semibold text-red-800">
                              {generationType === 'video' ? '视频生成失败' : '图片生成失败'}
                            </div>
                          </div>
                          <div className="text-sm text-red-600 max-w-md text-center">
                            {generationError}
                          </div>
                          <button
                            onClick={() => {
                              // Clear error and allow retry
                              if (cell.metadata) {
                                cell.metadata.generationError = undefined;
                                cell.metadata.isGenerating = false;
                              }
                              updateCell(cell.id, cell.content);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                          >
                            清除错误状态
                          </button>
                        </>
                      ) : (
                        // 正常加载状态 - 类似代码执行的风格
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-6 h-6 animate-spin text-theme-500" />
                            <div className="text-lg font-medium text-gray-700">
                              {generationType === 'video' ? '🎬 生成视频中...' : '🖼️ 生成图片中...'}
                            </div>
                          </div>

                          {/* 时间显示 - 类似代码执行的时间显示 */}
                          <div className="text-sm text-gray-500 font-medium">
                            已用时: {formatElapsedTime(elapsedTime)}
                          </div>

                          {/* 状态显示 */}
                          {generationStatus && (
                            <div className="text-sm text-theme-600 bg-theme-100 px-2 py-1 rounded-full">
                              状态: {generationStatus}
                            </div>
                          )}
                        </>
                      )}

                      {/* 提示词显示 - 更紧凑的设计 */}
                      {generationPrompt && !generationError && (
                        <div className="mt-3 p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-sm max-w-md border border-theme-100">
                          <div className="text-xs text-gray-500 font-medium mb-1">生成提示词:</div>
                          <div className="text-sm text-gray-700 font-medium">"{generationPrompt}"</div>
                        </div>
                      )}

                      {/* 参数显示 - 更紧凑的设计 */}
                      {Object.keys(generationParams).length > 0 && !generationError && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {generationParams.quality && (
                            <span className="px-2 py-1 bg-theme-100 text-theme-700 text-xs rounded-full font-medium">
                              质量: {generationParams.quality}
                            </span>
                          )}
                          {generationParams.ratio && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              比例: {generationParams.ratio}
                            </span>
                          )}
                          {generationParams.duration && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              时长: {generationParams.duration}s
                            </span>
                          )}
                        </div>
                      )}

                      {/* 进度提示 - 更小更不显眼 */}
                      {!generationError && (
                        <div className="text-xs text-gray-400 mt-2 max-w-sm text-center">
                          💡 生成通常需要1-5分钟，请耐心等待
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                : isEditing ?
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
                      className="text-black w-full p-2 border border-gray-300 rounded font-mono text-sm focus:outline-none focus:border-theme-400"
                    />

                    {/* 实时预览媒体 */}
                    {previewData.isValid && previewData.src ? (
                      <div className="mt-3">
                        {previewData.isVideo ? (
                          <video
                            src={previewData.src}
                            controls
                            className="max-w-full h-auto rounded-lg shadow-sm"
                            onError={handleImageError}
                            onLoadedData={handleImageLoad}
                          >
                            您的浏览器不支持视频播放
                          </video>
                        ) : (
                          <img
                            src={previewData.src}
                            alt={previewData.alt}
                            onError={handleImageError}
                            onLoad={handleImageLoad}
                            className="max-w-full h-auto rounded-lg shadow-sm"
                          />
                        )}

                        {imageError && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                            ⚠️ {previewData.isVideo ? '视频' : '图片'}加载失败: {previewData.src}
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
               : (
              // 显示模式：显示媒体或生成状态
              <div className="image-display">
                {shouldShowLoading ? (
                  // 生成中的加载状态或错误状态 - 类似代码生成的样式
                  <div className={`generation-loading border rounded-lg p-6 ${generationError
                      ? 'border-red-200 bg-red-50'
                      : 'border-theme-200 bg-gradient-to-br from-theme-50 to-indigo-50 animate-pulse'
                    }`}>
                    <div className="flex flex-col items-center space-y-4">
                      {generationError ? (
                        // 错误状态
                        <>
                          <div className="flex items-center gap-3">
                            <div className="text-red-500 text-2xl">❌</div>
                            <div className="text-lg font-semibold text-red-800">
                              {generationType === 'video' ? '视频生成失败' : '图片生成失败'}
                            </div>
                          </div>
                          <div className="text-sm text-red-600 max-w-md text-center">
                            {generationError}
                          </div>
                          <button
                            onClick={() => {
                              // Clear error and allow retry
                              if (cell.metadata) {
                                cell.metadata.generationError = undefined;
                                cell.metadata.isGenerating = false;
                              }
                              updateCell(cell.id, cell.content);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                          >
                            清除错误状态
                          </button>
                        </>
                      ) : (
                        // 正常加载状态 - 类似代码执行的风格
                        <>
                          <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-6 h-6 animate-spin text-theme-500" />
                            <div className="text-lg font-medium text-gray-700">
                              {generationType === 'video' ? '🎬 生成视频中...' : '🖼️ 生成图片中...'}
                            </div>
                          </div>

                          {/* 时间显示 - 类似代码执行的时间显示 */}
                          <div className="text-sm text-gray-500 font-medium">
                            已用时: {formatElapsedTime(elapsedTime)}
                          </div>

                          {/* 状态显示 */}
                          {generationStatus && (
                            <div className="text-sm text-theme-600 bg-theme-100 px-2 py-1 rounded-full">
                              状态: {generationStatus}
                            </div>
                          )}
                        </>
                      )}

                      {/* 提示词显示 - 更紧凑的设计 */}
                      {generationPrompt && !generationError && (
                        <div className="mt-3 p-3 bg-white/70 backdrop-blur-sm rounded-lg shadow-sm max-w-md border border-theme-100">
                          <div className="text-xs text-gray-500 font-medium mb-1">生成提示词:</div>
                          <div className="text-sm text-gray-700 font-medium">"{generationPrompt}"</div>
                        </div>
                      )}

                      {/* 参数显示 - 更紧凑的设计 */}
                      {Object.keys(generationParams).length > 0 && !generationError && (
                        <div className="flex flex-wrap gap-2 justify-center">
                          {generationParams.quality && (
                            <span className="px-2 py-1 bg-theme-100 text-theme-700 text-xs rounded-full font-medium">
                              质量: {generationParams.quality}
                            </span>
                          )}
                          {generationParams.ratio && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              比例: {generationParams.ratio}
                            </span>
                          )}
                          {generationParams.duration && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                              时长: {generationParams.duration}s
                            </span>
                          )}
                        </div>
                      )}

                      {/* 进度提示 - 更小更不显眼 */}
                      {!generationError && (
                        <div className="text-xs text-gray-400 mt-2 max-w-sm text-center">
                          💡 生成通常需要1-5分钟，请耐心等待
                        </div>
                      )}
                    </div>
                  </div>
                ) : imageData.isValid && imageData.src ? (
                  <div className="relative group">
                    {imageData.isVideo ? (
                      <video
                        src={imageData.src}
                        controls
                        title={imageData.alt}
                        onError={handleImageError}
                        onLoadedData={handleImageLoad}
                        className="max-w-full h-auto rounded-lg shadow-sm"
                      >
                        您的浏览器不支持视频播放
                      </video>
                    ) : (
                      <>
                        <img
                          src={imageData.src}
                          alt={imageData.alt}
                          title={imageData.alt}
                          onError={handleImageError}
                          onLoad={handleImageLoad}
                          onClick={openModal}
                          className="max-w-full h-auto rounded-lg shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        {/* 放大按钮提示 */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 rounded p-1">
                          <Maximize2 size={16} className="text-white" />
                        </div>
                      </>
                    )}

                    {imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg">
                        <div className="text-center text-black-500">
                          <div className="text-sm">{imageData.isVideo ? '视频' : '图片'}加载失败</div>
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
                      {hasContent ? '⚠️ Markdown 语法错误' : '点击添加媒体'}
                    </div>
                    <div className="text-sm text-black-400">
                      格式: ![描述](图片/视频URL)
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
            {(viewMode === "create") && (
              <div
                className={`absolute -right-14 top-1 flex items-center transition-opacity duration-200 ${cellShowButtons || isEditing ? 'opacity-100' : 'opacity-0'
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

      {/* 全屏模态框 */}
      {isModalOpen && imageData.isValid && imageData.src && !imageData.isVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={imageData.src}
              alt={imageData.alt}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <X size={24} />
            </button>
            {imageData.alt && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center bg-black bg-opacity-50 px-4 py-2 rounded">
                {imageData.alt}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default React.memo(ImageCell);