// storage/fileTypes.ts
// File type definitions and utilities

/**
 * Supported file types
 */
export type FileType = 'image' | 'csv' | 'xlsx' | 'text' | 'pdf' | 'html' | 'jsx' | 'react' | 'doc' | 'docx';

/**
 * Preview mode mapping for different file types
 */
export type ActivePreviewMode = 'default' | 'csv' | 'jsx' | 'html' | 'image' | 'pdf' | 'text' | 'doc' | 'docx' | null;

/**
 * Determine file type from file extension
 */
export const getFileType = (filePath: string): FileType => {
  if (!filePath || typeof filePath !== 'string') {
    return 'text';
  }
  
  const fileExt = filePath.split('.').pop()?.toLowerCase();

  // Image files
  if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'].includes(`.${fileExt}`)) {
    return 'image';
  }

  // CSV files
  if (fileExt === 'csv') {
    return 'csv';
  }

  // Excel files
  if (fileExt === 'xlsx' || fileExt === 'xls') {
    return 'xlsx';
  }

  // PDF files
  if (fileExt === 'pdf') {
    return 'pdf';
  }

  // DOC/DOCX files
  if (fileExt === 'doc' || fileExt === 'docx') {
    return 'docx';
  }

  // HTML files
  if (fileExt === 'html' || fileExt === 'htm') {
    return 'html';
  }

  // React/JSX files
  if (fileExt === 'jsx' || fileExt === 'tsx') {
    return 'jsx';
  }

  // Other text files
  if (['.txt', '.md', '.json', '.js', '.py', '.css'].includes(`.${fileExt}`)) {
    return 'text';
  }

  // Default
  return 'text';
};

/**
 * Get active preview mode for a file type
 */
export const getActivePreviewMode = (fileType: FileType): ActivePreviewMode => {
  switch (fileType) {
    case 'csv':
      return 'csv';
    case 'jsx':
    case 'react':
      return 'jsx';
    case 'html':
      return 'html';
    case 'image':
      return 'image';
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'text':
      return 'text';
    default:
      return 'default';
  }
};

/**
 * Create MIME type from file extension
 */
export const getMimeType = (filePath: string): string => {
  if (!filePath || typeof filePath !== 'string') {
    return 'application/octet-stream';
  }
  
  const baseName = filePath.split('/').pop() || filePath;
  const ext = baseName.split('.').pop()?.toLowerCase() || '';
  
  if (ext === 'svg') return 'image/svg+xml';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
    return ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  }
  if (ext === 'pdf') return 'application/pdf';
  if (['html', 'htm'].includes(ext)) return 'text/html';
  if (['txt', 'md', 'json', 'js', 'py', 'css', 'csv'].includes(ext)) return 'text/plain';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  
  return 'application/octet-stream';
};