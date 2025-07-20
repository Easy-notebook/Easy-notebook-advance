import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import usePreviewStore from '../../../store/previewStore';
import CSVPreviewApp from './CSVPreviewApp';
import ImageDisplay from './ImageDisplay';

const PreviewApp: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [previewMode, setPreviewMode] = useState<string>('csv');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [lastModified, setLastModified] = useState<string | null>(null);

    const processCsvData = useCallback((fileContent: string) => {
        if (!fileContent) return;
        
        setLoading(true);
        Papa.parse(fileContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors && results.errors.length > 0) {
                    setError(`Parse error: ${results.errors[0].message}`);
                }
                setData(results.data);
                setLoading(false);
            },
            error: (error) => {
                setError(`Parse error: ${error.message}`);
                setLoading(false);
            }
        });
    }, []);

    useEffect(() => {
        // Subscribe to changes in activeFile from the preview store
        const unsubscribe = usePreviewStore.subscribe(
            (state) => {
                if (state.activeFile) {
                    setPreviewMode(state.activeFile.type);
                    if (state.activeFile.type === 'csv') {
                        processCsvData(state.activeFile.content);
                    } else if (state.activeFile.type === 'image') {
                        setData(state.activeFile.content);
                        setFileName(state.activeFile.name);
                        setLastModified(state.activeFile.lastModified);
                    }
                }
            }
        );
        return () => unsubscribe();
    }, [processCsvData]);

    // Use conditional rendering with proper JSX syntax
    return (
        <div className='w-full h-full'>
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading">Loading...</div>}
            {!loading && previewMode === 'csv' && <CSVPreviewApp/>}
            {!loading && previewMode === 'image' && <ImageDisplay imageData={data} 
                    showDetails={true}
                    showControls={true}
                    imageInitialHeight="50vh"
                    fileName={fileName}
                    lastModified={lastModified}
                    />
                    }
        </div>
    );
};

export default PreviewApp;