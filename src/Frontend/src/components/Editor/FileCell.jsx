import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Trash2, X, Download, Eye, Image as ImageIcon, FileText, File, List } from 'lucide-react';
import { useToast } from '../UI/Toast';
import useStore from '../../store/notebookStore';
import Progress from '../UI/Progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../UI/Dialog';
import { notebookApiIntegration } from '../../services/notebookServices';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const PREVIEWABLE_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const PREVIEWABLE_TEXT_TYPES = ['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js'];

const FileCell = ({ cell, onDelete, onUpdate }) => {
  const { notebookId } = useStore();
  const { toast } = useToast();
  const abortControllerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isPreview, setIsPreview] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [uploadConfig] = useState({
    mode: cell.content?.mode || 'unrestricted',
    allowedTypes: cell.content?.allowedTypes || [],
    maxFiles: cell.content?.maxFiles || null,
    maxFileSize: cell.content?.maxFileSize || MAX_FILE_SIZE
  });

  const isPreviewable = useCallback((filename) => {
    if (!filename) return false;
    try {
      const ext = `.${filename.split('.').pop().toLowerCase()}`;
      return PREVIEWABLE_IMAGE_TYPES.includes(ext) || PREVIEWABLE_TEXT_TYPES.includes(ext);
    } catch (error) {
      console.error('Error checking if file is previewable:', error);
      return false;
    }
  }, []);

  const getFileIcon = useCallback((filename) => {
    if (!filename) return <File size={16} />;
    try {
      const ext = `.${filename.split('.').pop().toLowerCase()}`;
      if (PREVIEWABLE_IMAGE_TYPES.includes(ext)) return <ImageIcon size={16} />;
      if (PREVIEWABLE_TEXT_TYPES.includes(ext)) return <FileText size={16} />;
      return <File size={16} />;
    } catch (error) {
      console.error('Error getting file icon:', error);
      return <File size={16} />;
    }
  }, []);

  const fetchFileList = useCallback(async () => {
    if (!notebookId) return;

    try {
      const data = await notebookApiIntegration.listFiles(notebookId);
      if (data.status === 'ok') {
        setFileList(data.files);
      } else {
        throw new Error(data.message || 'Failed to fetch file list');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to fetch file list: ${err.message}`,
        variant: "destructive",
      });
      setFileList([]);
    }
  }, [notebookId, toast]);

  const validateFile = useCallback((file) => {
    if (file.size > uploadConfig.maxFileSize) {
      throw new Error(`File ${file.name} exceeds maximum size of ${uploadConfig.maxFileSize / 1024 / 1024}MB`);
    }

    if (uploadConfig.mode === 'restricted') {
      const ext = `.${file.name.split('.').pop().toLowerCase()}`;
      if (!uploadConfig.allowedTypes.includes(ext)) {
        throw new Error(`File type ${ext} is not allowed`);
      }
    }
    return true;
  }, [uploadConfig]);

  const handleFileUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    abortControllerRef.current = new AbortController();

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      if (uploadConfig.mode === 'restricted' &&
        uploadConfig.maxFiles &&
        files.length > uploadConfig.maxFiles) {
        throw new Error(`Maximum ${uploadConfig.maxFiles} files allowed`);
      }

      files.forEach(file => validateFile(file));

      const result = await notebookApiIntegration.uploadFiles(notebookId, files, uploadConfig, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      }, abortControllerRef.current.signal);

      if (result.status === 'ok') {
        await fetchFileList();
        setIsPreview(true);
        toast({
          title: "Upload Successful",
          description: `Successfully uploaded ${files.length} file(s)`,
          variant: "success",
        });

        if (onUpdate) {
          onUpdate(cell.id, { uploadedFiles: files.map(file => file.name) });
        }
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Upload cancelled');
        toast({
          title: "Upload Cancelled",
          description: "File upload was cancelled",
          variant: "info",
        });
      } else {
        setError(err.message);
        toast({
          title: "Upload Failed",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  }, [notebookId, uploadConfig, validateFile, toast, fetchFileList, onUpdate, cell.id]);

  const handlePreview = useCallback(async (filename) => {
    if (!notebookId) return;

    try {
      const ext = `.${filename.split('.').pop().toLowerCase()}`;
      setSelectedFile(filename);

      if (PREVIEWABLE_IMAGE_TYPES.includes(ext)) {
        const imageUrl = await notebookApiIntegration.getFilePreviewUrl(notebookId, filename);
        setPreviewContent(imageUrl);
        setPreviewType('image');
      } else if (PREVIEWABLE_TEXT_TYPES.includes(ext)) {
        const content = await notebookApiIntegration.getFileContent(notebookId, filename);
        setPreviewContent(content);
        setPreviewType('text');
      }

      setIsPreviewOpen(true);
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to preview file: ${err.message}`,
        variant: "destructive",
      });
    }
  }, [notebookId, toast]);

  const handleDownload = useCallback(async (filename) => {
    if (!notebookId) return;

    try {
      await notebookApiIntegration.downloadFile(notebookId, filename);

      toast({
        title: "Success",
        description: `${filename} downloaded successfully`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to download file: ${err.message}`,
        variant: "destructive",
      });
    }
  }, [notebookId, toast]);

  const handleDeleteFile = useCallback(async (filename) => {
    if (!notebookId) return;

    try {
      await notebookApiIntegration.deleteFile(notebookId, filename);
      await fetchFileList();
      
      toast({
        title: "Success",
        description: `${filename} deleted successfully`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: `Failed to delete file: ${err.message}`,
        variant: "destructive",
      });
    }
  }, [notebookId, fetchFileList, toast]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(Array.from(e.dataTransfer.files));
  }, [handleFileUpload]);

  const handleCancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (isPreview) {
      fetchFileList();
    }
  }, [isPreview, fetchFileList]);

  const FilePreviewDialog = () => (
    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
      <DialogContent className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getFileIcon(selectedFile)}
            <span>{selectedFile}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[600px] overflow-auto">
          {previewType === 'image' ? (
            <img 
              src={previewContent} 
              alt={selectedFile} 
              className="max-w-full h-auto"
            />
          ) : (
            <pre className="p-4 bg-custom-gray rounded-lg overflow-auto">
              <code>{previewContent}</code>
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderUploadArea = () => (
    <div
      className={`relative w-full h-40 border-2 border-dashed rounded 
        ${dragOver ? 'border-[#B91C1C] bg-rose-50' : 'border-gray-300'}
        transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        className="hidden"
        multiple={uploadConfig.mode === 'unrestricted'}
        accept={uploadConfig.allowedTypes.join(',')}
      />

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Upload size={32} className="text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          Drag and drop files here or
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-[#B91C1C] hover:text-[#991818] ml-1"
          >
            browse
          </button>
        </p>
        {uploadConfig.mode === 'restricted' && (
          <p className="text-xs text-custom-gray0 mt-2">
            Allowed types: {uploadConfig.allowedTypes.join(', ')}
            {uploadConfig.maxFiles && ` • Max files: ${uploadConfig.maxFiles}`}
          </p>
        )}
      </div>
    </div>
  );

  const renderProgress = () => (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">
          Uploading... {uploadProgress}%
        </span>
        <button
          onClick={handleCancelUpload}
          className="text-custom-gray0 hover:text-gray-700"
        >
          <X size={16} />
        </button>
      </div>
      <Progress 
        value={uploadProgress} 
        className="w-full bg-gray-200" 
        indicatorClassName="bg-[#B91C1C]"
      />
    </div>
  );

  const renderFileList = () => (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#B91C1C]">Uploaded Files</h3>
        <button
          onClick={() => setIsPreview(false)}
          className="text-sm text-[#B91C1C] hover:text-[#991818]"
        >
          Upload More
        </button>
      </div>

      {fileList.length === 0 ? (
        <p className="text-custom-gray0 text-sm">No files uploaded</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {fileList.map((file, index) => (
            <li key={index} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getFileIcon(file)}
                <span className="text-sm text-gray-700">{file}</span>
              </div>
              <div className="flex items-center space-x-2">
                {isPreviewable(file) && (
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-1 hover:bg-rose-50 rounded text-[#B91C1C]"
                    title="Preview"
                  >
                    <Eye size={16} />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1 hover:bg-rose-50 rounded text-[#B91C1C]"
                  title="Download"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={() => handleDeleteFile(file)}
                  className="p-1 hover:bg-rose-50 rounded text-[#B91C1C]"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderToggleButton = () => (
    <button
      onClick={() => setIsPreview(!isPreview)}
      className="flex items-center space-x-1 text-sm text-[#B91C1C] hover:text-[#991818]"
    >
      {isPreview ? (
        <>
          <Upload size={16} />
          <span>Upload</span>
        </>
      ) : (
        <>
          <List size={16} />
          <span>View Files</span>
        </>
      )}
    </button>
  );

  return (
    <div className="rounded border border-gray-200 bg-custom-gray text-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Upload size={16} className="text-[#B91C1C]" />
          <span className="text-base text-[#B91C1C]">File Upload</span>
        </div>
        <div className="flex items-center space-x-4">
          {renderToggleButton()}
          {onDelete && (
            <button
              onClick={onDelete}
              className="text-[#B91C1C] hover:text-[#991818]"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {!isPreview ? (
        <>
          {renderUploadArea()}
          {uploading && renderProgress()}
          {error && (
            <div className="mt-4 flex items-center text-sm text-rose-600">
              <X size={16} className="mr-1" />
              {error}
            </div>
          )}
        </>
      ) : (
        renderFileList()
      )}
      <FilePreviewDialog />
    </div>
  );
};

export default React.memo(FileCell);