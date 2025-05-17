// services/notebookApi.js

const API_BASE_URL = 'http://localhost:18600';
// const API_BASE_URL = 'https://easy-notebook.silan.tech/api';

// API response handling for non-stream responses
const handleResponse = async (response) => {
    try {
        const data = await response.json();
        if (!response.ok) {
            console.error('API error:', data);
            throw new Error(data.message || `HTTP error! status: ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error('Failed to parse API response:', error);
        throw new Error('Invalid response from server.');
    }
};

// Notebook API Service
export class NotebookApiService {
    // Initialize notebook
    static async initializeNotebook() {
        try {
            const response = await fetch(`${API_BASE_URL}/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to initialize notebook:', error);
            throw error;
        }
    }

    static async restartNotebook(notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/restart_kernel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notebook_id: notebookId
                })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to restart notebook:', error);
            throw error;
        }
    }

    // Execute code
    static async executeCode(code, notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    notebook_id: notebookId
                })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to execute code:', error);
            throw error;
        }
    }

    // Cancel execution
    static async cancelExecution(notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/cancel_execution/${notebookId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to cancel execution:', error);
            throw error;
        }
    }

    // Get execution status
    static async getExecutionStatus(notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/execution_status/${notebookId}`, {
                method: 'GET'
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to get execution status:', error);
            throw error;
        }
    }

    // Upload file
    static async uploadFile(notebookId, files, uploadConfig) {
        try {
            const formData = new FormData();
            formData.append('notebook_id', notebookId);
            formData.append('mode', uploadConfig.mode);
            formData.append('allowed_types', JSON.stringify(uploadConfig.allowedTypes || []));
            formData.append('max_files', uploadConfig.maxFiles || 10);

            files.forEach(file => {
                formData.append('files', file);
            });

            const response = await fetch(`${API_BASE_URL}/upload_file`, {
                method: 'POST',
                body: formData
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to upload files:', error);
            throw error;
        }
    }

    // List files
    static async listFiles(notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/list_files/${notebookId}`, {
                method: 'GET'
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to list files:', error);
            throw error;
        }
    }

    // Download file
    static async downloadFile(notebookId, filename) {
        try {
            const response = await fetch(`${API_BASE_URL}/download_file/${notebookId}/${filename}`, {
                method: 'GET'
            });
            // For file downloads, we might want to handle differently
            if (!response.ok) {
                const data = await response.json();
                console.error('API error:', data);
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            return response.blob(); // Return as blob for downloading
        } catch (error) {
            console.error('Failed to download file:', error);
            throw error;
        }
    }

    // Shutdown notebook
    static async shutdownNotebook(notebookId) {
        try {
            const response = await fetch(`${API_BASE_URL}/shutdown`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notebook_id: notebookId
                })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to shutdown notebook:', error);
            throw error;
        }
    }

    // Check kernel status
    static async checkKernelStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/status`, {
                method: 'GET'
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to check kernel status:', error);
            throw error;
        }
    }

    // ADDED: Send operation to backend (Unified Interface)
    static async sendOperation(notebookId, operation) {
        try {
            const response = await fetch(`${API_BASE_URL}/send_operation`, { // Unified endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notebook_id: notebookId,
                    operation
                })
            });

            // Assuming backend responds with a stream of updates
            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error:', errorData);
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            // Return the response body as a stream
            return response.body;
        } catch (error) {
            console.error('Failed to send operation:', error);
            throw error;
        }
    }

    // get file
    static async getFile(notebookId, filename) {
        try {
            const response = await fetch(`${API_BASE_URL}/get_file`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notebook_id: notebookId,
                    filename: filename
                })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to get file:', error);
            throw error;
        }
    }

    // get file info
    static async getFileInfo(notebookId, filename) {
        try {
            const response = await fetch(`${API_BASE_URL}/get_file_info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notebook_id: notebookId,
                    filename: filename
                })
            });
            return await handleResponse(response);
        } catch (error) {
            console.error('Failed to get file info:', error);
            throw error;
        }
    }
}

// Notebook Store Integration
export const notebookApiIntegration = {
    // Initialize notebook
    initializeNotebook: async () => {
        try {
            const result = await NotebookApiService.initializeNotebook();
            if (result.status === 'ok' && result.notebook_id) {
                console.log('Notebook initialized with ID:', result.notebook_id);
                return result.notebook_id;
            }
            throw new Error(result.message || 'Failed to initialize notebook');
        } catch (error) {
            console.error('Notebook initialization error:', error);
            throw error;
        }
    },

    // Execute code
    executeCode: async (code, notebookId) => {
        try {
            const result = await NotebookApiService.executeCode(code, notebookId);
            return {
                success: result.status === 'ok',
                outputs: result.outputs || [],
                error: result.error,
                elapsed_time: result.elapsed_time
            };
        } catch (error) {
            console.error('Code execution error:', error);
            throw error;
        }
    },

    // Cancel execution
    cancelExecution: async (notebookId) => {
        try {
            const result = await NotebookApiService.cancelExecution(notebookId);
            return {
                success: result.status === 'ok',
                message: result.message
            };
        } catch (error) {
            console.error('Execution cancellation error:', error);
            throw error;
        }
    },

    // Get execution status
    getExecutionStatus: async (notebookId) => {
        try {
            return await NotebookApiService.getExecutionStatus(notebookId);
        } catch (error) {
            console.error('Get execution status error:', error);
            throw error;
        }
    },

    // Run all cells
    runAllCells: async (cells, notebookId, updateCell) => {
        for (const cell of cells) {
            if (cell.type === 'code' && cell.content.trim()) {
                try {
                    updateCell(cell.id, { isExecuting: true, outputs: [] });
                    const result = await NotebookApiService.executeCode(cell.content, notebookId);
                    
                    updateCell(cell.id, {
                        isExecuting: false,
                        outputs: result.outputs || [],
                        error: result.error,
                        elapsed_time: result.elapsed_time
                    });

                    if (result.status === 'error') {
                        break;  // Stop execution on error
                    }
                } catch (error) {
                    updateCell(cell.id, {
                        isExecuting: false,
                        outputs: [{
                            type: 'error',
                            content: error.message,
                            key: `error-${Date.now()}`
                        }],
                        error: error.message
                    });
                    break;  // Stop execution on error
                }
            }
        }
    },

    // Upload files
    uploadFiles: async (notebookId, files, config) => {
        try {
            return await NotebookApiService.uploadFile(notebookId, files, config);
        } catch (error) {
            console.error('File upload error:', error);
            throw error;
        }
    },

    // List files
    listFiles: async (notebookId) => {
        try {
            return await NotebookApiService.listFiles(notebookId);
        } catch (error) {
            console.error('List files error:', error);
            throw error;
        }
    },

    //getFile
    getFile: async (notebookId, filename) => {
        try {
            return await NotebookApiService.getFile(notebookId, filename);
        } catch (error) {
            console.error('Get file error:', error);
            throw error;
        }
    },

    // getfileInfo
    getFileInfo: async (notebookId, filename) => {
        try {
            return await NotebookApiService.getFileInfo(notebookId, filename);
        } catch (error) {
            console.error('Get file info error:', error);
            throw error;
        }
    },

    // Download file
    downloadFile: async (notebookId, filename) => {
        try {
            return await NotebookApiService.downloadFile(notebookId, filename);
        } catch (error) {
            console.error('Download file error:', error);
            throw error;
        }
    },

    // Shutdown notebook
    shutdownNotebook: async (notebookId) => {
        try {
            return await NotebookApiService.shutdownNotebook(notebookId);
        } catch (error) {
            console.error('Notebook shutdown error:', error);
            throw error;
        }
    },

    // Check kernel status
    checkKernelStatus: async () => {
        try {
            return await NotebookApiService.checkKernelStatus();
        } catch (error) {
            console.error('Kernel status check error:', error);
            throw error;
        }
    },

    // ADDED: Send operation (Unified Interface)
    sendOperation: async (notebookId, operation, handleStreamUpdate) => {
        try {
            const stream = await NotebookApiService.sendOperation(notebookId, operation);
            if (!stream) return;

            const reader = stream.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            const readStream = async () => {
                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream closed');
                    return;
                }
                buffer += decoder.decode(value, { stream: true });
                let boundary = buffer.indexOf('\n');
                while (boundary !== -1) {
                    const line = buffer.substring(0, boundary).trim();
                    buffer = buffer.substring(boundary + 1);
                    if (line) {
                        try {
                            const data = JSON.parse(line);
                            handleStreamUpdate(data); // Handle each update
                        } catch (e) {
                            console.error('Failed to parse stream data:', e);
                        }
                    }
                    boundary = buffer.indexOf('\n');
                }
                readStream();
            };

            readStream();
        } catch (error) {
            console.error('Send operation error:', error);
            throw error;
        }
    },
};
