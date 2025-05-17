import React, { useState, useRef, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import _ from 'lodash';
import usePreviewStore from '../../../store/previewStore';


// Usage example:
// <ResponsiveCSVViewer 
//   initialData={yourDataArray} 
//   className="h-screen"
//   style={{height: '100vh'}} 
// />

const CSVPreviewApp = ({
    initialData = null,
    className = "",
    style = {},
    defaultRowsPerPage = 18,
    minRowsPerPage = 5
}) => {
    const [csvData, setCsvData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
    const [searchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('data');

    const tableContainerRef = useRef(null);
    const componentRef = useRef(null);
    const [lastModified, setLastModified] = useState('');

    // Calculate optimal rows per page based on container height
    useEffect(() => {
        if (csvData.length > 0) {
            const calculateVisibleRows = () => {
                // Get container height or use viewport height if container ref not available yet
                const containerHeight = tableContainerRef.current
                    ? tableContainerRef.current.clientHeight
                    : window.innerHeight;

                // Estimate row height (adjust based on your actual styling)
                const estimatedRowHeight = 45; // px per row
                const headerHeight = 40; // px for header
                const paginationHeight = 48; // px for pagination controls
                const scrollbarHeight = 4; // px for scrollbar

                // Calculate available space for table rows
                const availableHeight = containerHeight - headerHeight - paginationHeight - scrollbarHeight;
                const visibleRows = Math.floor(availableHeight / estimatedRowHeight);

                // Set minimum of 5 rows and maximum based on calculation
                const optimalRows = Math.max(minRowsPerPage, Math.min(visibleRows, csvData.length));

                // Only update if needed to prevent re-renders
                if (optimalRows !== rowsPerPage) {
                    setRowsPerPage(optimalRows+3);
                    // Reset to page 1 when changing rows per page
                    setCurrentPage(1);
                }
            };

            // Initial calculation
            calculateVisibleRows();

            // Capture the current value of the ref
            const currentTableContainer = tableContainerRef.current;

            // Add resize listener to both window and container
            const resizeObserver = new ResizeObserver(calculateVisibleRows);
            if (currentTableContainer) {
                resizeObserver.observe(currentTableContainer);
            }

            // Also listen to window resize for fallback
            window.addEventListener('resize', calculateVisibleRows);

            return () => {
                if (currentTableContainer) {
                    resizeObserver.unobserve(currentTableContainer);
                }
                window.removeEventListener('resize', calculateVisibleRows);
            };
        }
    }, [csvData.length, minRowsPerPage, defaultRowsPerPage, rowsPerPage]);



    // Calculate statistics for each column
    const calculateStats = useCallback((data, headers) => {
        const statsObj = {};

        headers.forEach(header => {
            const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined);
            const numericValues = values.filter(val => typeof val === 'number');
            const uniqueValues = _.uniq(values);

            statsObj[header] = {
                count: values.length,
                empty: data.length - values.length,
                unique: uniqueValues.length,
                dataType: numericValues.length > 0 && numericValues.length === values.length ?
                    'numeric' : 'categorical',
                topValues: uniqueValues.length <= 5 ? uniqueValues : uniqueValues.slice(0, 5),
            };

            if (numericValues.length > 0) {
                statsObj[header].min = _.min(numericValues);
                statsObj[header].max = _.max(numericValues);
                statsObj[header].sum = _.sum(numericValues);
                statsObj[header].avg = numericValues.length > 0 ? statsObj[header].sum / numericValues.length : 0;
                statsObj[header].median = calculateMedian(numericValues);
            }
        });

        setStats(statsObj);
    }, []);

    // Process CSV data whether from file or provided directly
    const processCsvData = useCallback((data) => {
        if (!data || data.length === 0) return;

        try {
            // Extract headers from first row if available
            const headersList = Object.keys(data[0] || {});

            setCsvData(data);
            setHeaders(headersList);
            calculateStats(data, headersList);
            setCurrentPage(1);
            setLoading(false);
            setActiveTab('data');
        } catch (e) {
            setError(`Data processing error: ${e.message}`);
            setLoading(false);
        }
    }, [calculateStats]);

    // Initialize with provided data if available
    useEffect(() => {
        if (initialData && Array.isArray(initialData) && initialData.length > 0) {
            processCsvData(initialData);
        }
    }, [initialData, minRowsPerPage, defaultRowsPerPage, rowsPerPage, processCsvData]);


    // File upload handler
    useEffect(() => {
        // Subscribe to changes in activeFile from the preview store
        const unsubscribe = usePreviewStore.subscribe(
            (state) => {
                    // console.log('activeFile changed:', state.activeFile);
                    setLoading(true);
                    setError('');
                    // console.log('newActiveFile', state.activeFile);
                    setFileName(state.activeFile.name);
                    // console.log('newActiveFile.size', state.activeFile.size);
                    setFileSize(state.activeFile.size);
                    // console.log('newActiveFile.content', state.activeFile.content);
                    Papa.parse(state.activeFile.content, {
                        header: true,
                        dynamicTyping: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            if (results.errors && results.errors.length > 0) {
                                setError(`Parse error: ${results.errors[0].message}`);
                            }
                            processCsvData(results.data);
                            setLoading(false);
                            setLastModified(state.activeFile.lastModified);
                        },
                        error: (error) => {
                            setError(`Parse error: ${error.message}`);
                            setLoading(false);
                        }
                    });
            }
        );
        return () => unsubscribe();
    }, [processCsvData]);


    // Calculate median for numeric values
    const calculateMedian = (values) => {
        if (values.length === 0) return null;

        const sorted = [...values].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);

        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }

        return sorted[middle];
    };

    // Sort handler
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Filter data based on search term
    const filteredData = csvData.filter(row => {
        return headers.some(header => {
            const value = row[header];
            return value !== null &&
                value !== undefined &&
                String(value).toLowerCase().includes(searchTerm.toLowerCase());
        });
    });

    // Sort data based on sort configuration
    const sortedData = React.useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const valueA = a[sortConfig.key];
                const valueB = b[sortConfig.key];

                if (valueA === null || valueA === undefined) return 1;
                if (valueB === null || valueB === undefined) return -1;

                if (typeof valueA === 'number' && typeof valueB === 'number') {
                    return sortConfig.direction === 'ascending' ? valueA - valueB : valueB - valueA;
                } else {
                    const strA = String(valueA).toLowerCase();
                    const strB = String(valueB).toLowerCase();
                    return sortConfig.direction === 'ascending'
                        ? strA.localeCompare(strB)
                        : strB.localeCompare(strA);
                }
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    // Paginate data
    const paginatedData = sortedData.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    const totalRows = sortedData.length;
    const startRow = totalRows > 0
    ? (currentPage - 1) * rowsPerPage + 1
    : 0;
    const endRow = Math.min(currentPage * rowsPerPage, totalRows);

    // Navigation handlers
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div
            ref={componentRef}
            className={`flex flex-col h-full w-full ${className}`}
            style={{ ...style }}
        >
            {/* Main Card with header */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden flex-shrink-0">
                <div className="px-4 py-2 border-b border-gray-200">
                    {fileName && (
                        <div className="">
                            <table className="w-auto">
                                <tbody>
                                    <tr className="">
                                        <td className="pr-6 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white">Filename</span>
                                        </td>
                                        <td className="pr-6 text-sm font-medium align-middle">{fileName}</td>
                                        <td className="pr-6 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white">Rows</span>
                                        </td>
                                        <td className="pr-6 text-sm font-medium align-middle">{csvData.length}</td>

                                        <td className="pr-6 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white">Columns</span>
                                        </td>
                                        <td className="pr-6 text-sm font-medium align-middle">{headers.length}</td>
                                        <td className="pr-6 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white">Size</span>
                                        </td>
                                        <td className="pr-6 text-sm font-medium align-middle">{(fileSize / 1024).toFixed(2)} KB</td>
                                        <td className="pr-6 align-middle">
                                            <span className="inline-flex items-center rounded-md bg-rose-600 px-2 py-1 text-xs font-medium text-white">Last edited</span>
                                        </td>
                                        <td className="pr-6 text-sm font-medium align-middle">{new Date(lastModified).toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                    {loading && (
                        <div className="space-y-2 mt-2">
                            <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mt-4">
                            <div className="font-medium">Error</div>
                            <div className="text-sm">{error}</div>
                        </div>
                    )}
                </div>
            </div>

            {csvData.length > 0 && (
                <div className="mt-4 flex-grow flex flex-col overflow-hidden">
                    {/* Tabs Navigation */}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
                        <div className="border-b flex-shrink-0">
                            <div className="flex">
                                <button
                                    className={`py-3 px-6 font-medium text-sm ${activeTab === 'data' ? 'border-b-2 border-rose-600 text-rose-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('data')}
                                >
                                    Data Table
                                </button>
                                <button
                                    className={`py-3 px-6 font-medium text-sm ${activeTab === 'columns' ? 'border-b-2 border-rose-600 text-rose-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('columns')}
                                >
                                    Columns Overview
                                </button>
                                <button
                                    className={`py-3 px-6 font-medium text-sm ${activeTab === 'analysis' ? 'border-b-2 border-rose-600 text-rose-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('analysis')}
                                >
                                    Statistical Analysis
                                </button>
                                <button
                                    className={`py-3 px-6 font-medium text-sm ${activeTab === 'detailed' ? 'border-b-2 border-rose-600 text-rose-700' : 'text-gray-500 hover:text-gray-700'}`}
                                    onClick={() => setActiveTab('detailed')}
                                >
                                    Detailed Information
                                </button>
                            </div>
                        </div>

                        <div className="flex-grow flex flex-col overflow-hidden">
                            {/* Columns Overview Tab */}
                            {activeTab === 'columns' && (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div ref={tableContainerRef} className="overflow-auto flex-grow">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Non-Empty</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Values</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Values</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {headers.map((header, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-700">{header}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stats[header]?.dataType === 'numeric' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                {stats[header]?.dataType === 'numeric' ? 'Numeric' : 'Categorical'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.count || 0}/{csvData.length}
                                                            <span className="ml-1 text-gray-500 text-xs">
                                                                ({((stats[header]?.count / csvData.length) * 100 || 0).toFixed(1)}%)
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.unique || 0}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                                                            {stats[header]?.topValues?.slice(0, 3).join(', ')}
                                                            {stats[header]?.topValues?.length > 3 && '...'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Data Table Tab */}
                            {activeTab === 'data' && (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div ref={tableContainerRef} className="flex-grow overflow-auto border-b">
                                        <table className="min-w-full divide-y divide-gray-200 table-fixed">
                                            <thead className="bg-gray-50 sticky top-0 z-10">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                                        Row
                                                    </th>
                                                    {headers.map((header, index) => (
                                                        <th
                                                            key={index}
                                                            scope="col"
                                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                            onClick={() => requestSort(header)}
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="truncate">{header}</span>
                                                                {sortConfig.key === header && (
                                                                    <span className="ml-1 flex-shrink-0">
                                                                        {sortConfig.direction === 'ascending' ? '↑' : '↓'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {paginatedData.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-500">
                                                            {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                                                        </td>
                                                        {headers.map((header, colIndex) => (
                                                            <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 overflow-hidden text-ellipsis">
                                                                {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                {/* Add empty rows to maintain consistent height */}
                                                {paginatedData.length < rowsPerPage && Array(rowsPerPage - paginatedData.length).fill(0).map((_, i) => (
                                                    <tr key={`empty-${i}`} className="h-12">
                                                        <td className="border-b border-gray-200"></td>
                                                        {headers.map((_, j) => (
                                                            <td key={j} className="border-b border-gray-200"></td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="px-4 py-3 border-t flex justify-between items-center flex-shrink-0">
                                        <div className="text-sm text-gray-500">
                                            Showing {startRow} to {endRow} of {totalRows} rows    
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handlePrevPage}
                                                disabled={currentPage === 1}
                                                className={`px-3 py-1 border rounded-md text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="flex items-center px-2 text-sm text-gray-700">
                                                {currentPage} / {totalPages || 1}
                                            </span>
                                            <button
                                                onClick={handleNextPage}
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className={`px-3 py-1 border rounded-md text-sm ${currentPage === totalPages || totalPages === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Statistical Analysis Tab */}
                            {activeTab === 'analysis' && (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div ref={tableContainerRef} className="overflow-auto flex-grow">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50 sticky top-0">
                                                <tr>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completeness</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unique Values</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mean</th>
                                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Median</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {headers.map((header, index) => (
                                                    <tr key={index} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-rose-700">{header}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${stats[header]?.dataType === 'numeric' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                                                }`}>
                                                                {stats[header]?.dataType === 'numeric' ? 'Numeric' : 'Categorical'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {((stats[header]?.count / csvData.length) * 100 || 0).toFixed(1)}%
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.unique || 0}
                                                            {stats[header]?.count > 0 &&
                                                                <span className="ml-1 text-gray-500 text-xs">
                                                                    ({((stats[header]?.unique / stats[header]?.count) * 100).toFixed(1)}%)
                                                                </span>
                                                            }
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.min !== undefined ? stats[header].min.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.max !== undefined ? stats[header].max.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.avg !== undefined ? stats[header].avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                            {stats[header]?.median !== undefined ? stats[header].median.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Detailed Information Tab */}
                            {activeTab === 'detailed' && (
                                <div className="p-6 flex flex-col h-full overflow-auto">
                                    <div ref={tableContainerRef} className="flex-grow">
                                        <div className="mt-4">
                                            <div className="bg-gray-50 p-5 rounded-lg shadow-sm border border-gray-100">
                                                <table className="w-auto">
                                                    <tbody>
                                                        <tr className="h-8">
                                                            <td className="text-gray-700 pr-8">Total Data Points:</td>
                                                            <td className="font-medium text-rose-600">{csvData.length * headers.length}</td>
                                                        </tr>
                                                        <tr className="h-8">
                                                            <td className="text-gray-700 pr-8">Numeric Columns:</td>
                                                            <td className="font-medium text-rose-600">{Object.values(stats).filter(stat => stat.dataType === 'numeric').length}</td>
                                                        </tr>
                                                        <tr className="h-8">
                                                            <td className="text-gray-700 pr-8">Categorical Columns:</td>
                                                            <td className="font-medium text-rose-600">{Object.values(stats).filter(stat => stat.dataType === 'categorical').length}</td>
                                                        </tr>
                                                        <tr className="h-8">
                                                            <td className="text-gray-700 pr-8">Current Page Size:</td>
                                                            <td className="font-medium text-rose-600">{rowsPerPage} rows</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CSVPreviewApp;