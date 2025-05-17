// fileUtils.js

/**
 * 获取文件列表
 * @param {Object} params
 * @param {string} params.notebookId - 当前笔记本的 ID
 * @param {Object} params.notebookApiIntegration - API 集成对象，需要包含 listFiles 方法
 * @param {Function} params.setFileList - 更新文件列表的状态方法
 * @param {Function} params.toast - 提示信息方法
 */
export const fetchFileList = async ({ notebookId, notebookApiIntegration, setFileList, toast }) => {
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
};

/**
 * 验证文件是否符合上传配置
 * @param {File} file - 要验证的文件对象
 * @param {Object} uploadConfig - 上传配置对象
 * @returns {boolean} 验证通过返回 true，否则抛出错误
 */
export const validateFile = (file, uploadConfig) => {
    if (file.size > uploadConfig.maxFileSize) {
        throw new Error(
            `File ${file.name} exceeds maximum size of ${uploadConfig.maxFileSize / 1024 / 1024}MB`
        );
    }

    if (uploadConfig.mode === 'restricted') {
        const ext = `.${file.name.split('.').pop().toLowerCase()}`;
        if (!uploadConfig.allowedTypes.includes(ext)) {
            throw new Error(`File type ${ext} is not allowed`);
        }
    }
    return true;
};

/**
 * 处理文件上传
 * @param {Object} params
 * @param {string} params.notebookId
 * @param {File[]} params.files
 * @param {Object} params.notebookApiIntegration - 包含 uploadFiles 方法
 * @param {Object} params.uploadConfig - 上传配置
 * @param {Function} params.setUploading - 更新上传状态方法
 * @param {Function} params.setUploadProgress - 更新上传进度方法
 * @param {Function} params.setError - 更新错误状态方法
 * @param {Object} params.fileInputRef - 文件 input 的 ref 对象
 * @param {Function} params.setIsPreview - 更新是否显示预览的状态方法
 * @param {Function} params.toast - 提示信息方法
 * @param {Function} params.onUpdate - 上传成功后调用的更新方法
 * @param {string} params.cellId - 当前 cell 的 ID
 * @param {Object} params.abortControllerRef - 用于取消请求的 ref 对象
 * @param {Function} params.fetchFileList - 刷新文件列表的函数
 */
export const handleFileUpload = async ({
    notebookId,
    files,
    notebookApiIntegration,
    uploadConfig,
    setUploading,
    setUploadProgress,
    setError,
    fileInputRef,
    setIsPreview,
    toast,
    onUpdate,
    cellId,
    abortControllerRef,
    fetchFileList,
}) => {
    if (!files || files.length === 0) return;

    abortControllerRef.current = new AbortController();

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
        if (
            uploadConfig.mode === 'restricted' &&
            uploadConfig.maxFiles &&
            files.length > uploadConfig.maxFiles
        ) {
            throw new Error(`Maximum ${uploadConfig.maxFiles} files allowed`);
        }

        files.forEach(file => validateFile(file, uploadConfig));

        const result = await notebookApiIntegration.uploadFiles(
            notebookId,
            files,
            uploadConfig,
            (progressEvent) => {
                const percentCompleted = Math.round(
                    (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress(percentCompleted);
            },
            abortControllerRef.current.signal
        );

        if (result.status === 'ok') {
            await fetchFileList();
            setIsPreview(true);
            toast({
                title: "Upload Successful",
                description: `Successfully uploaded ${files.length} file(s)`,
                variant: "success",
            });

            if (onUpdate) {
                onUpdate(cellId, { uploadedFiles: files.map(file => file.name) });
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
};

/**
 * 处理文件预览
 * @param {Object} params
 * @param {string} params.notebookId
 * @param {string} params.filename
 * @param {Object} params.notebookApiIntegration - 包含 getFilePreviewUrl 和 getFileContent 方法
 * @param {Function} params.setSelectedFile - 设置当前选中文件
 * @param {Function} params.setPreviewContent - 设置预览内容
 * @param {Function} params.setPreviewType - 设置预览类型 ('image' 或 'text')
 * @param {Function} params.setIsPreviewOpen - 控制预览对话框显示
 * @param {Function} params.toast - 提示信息方法
 * @param {string[]} params.PREVIEWABLE_IMAGE_TYPES - 可预览的图片文件后缀数组
 * @param {string[]} params.PREVIEWABLE_TEXT_TYPES - 可预览的文本文件后缀数组
 */
export const handlePreview = async ({
    notebookId,
    filename,
    notebookApiIntegration,
    setSelectedFile,
    setPreviewContent,
    setPreviewType,
    setIsPreviewOpen,
    toast,
    PREVIEWABLE_IMAGE_TYPES,
    PREVIEWABLE_TEXT_TYPES,
}) => {
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
};

/**
 * 处理文件下载
 * @param {Object} params
 * @param {string} params.notebookId
 * @param {string} params.filename
 * @param {Object} params.notebookApiIntegration - 包含 downloadFile 方法
 * @param {Function} params.toast - 提示信息方法
 */
export const handleDownload = async ({ notebookId, filename, notebookApiIntegration, toast }) => {
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
};

/**
 * 处理文件删除
 * @param {Object} params
 * @param {string} params.notebookId
 * @param {string} params.filename
 * @param {Object} params.notebookApiIntegration - 包含 deleteFile 方法
 * @param {Function} params.fetchFileList - 刷新文件列表的方法
 * @param {Function} params.toast - 提示信息方法
 */
export const handleDeleteFile = async ({ notebookId, filename, notebookApiIntegration, fetchFileList, toast }) => {
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
};
