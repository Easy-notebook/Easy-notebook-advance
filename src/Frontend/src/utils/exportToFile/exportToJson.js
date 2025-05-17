// utils/jsonExport.js
export const exportToJson = (cells, tasks) => {
    const notebookData = {
      cells,
      tasks,
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(notebookData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
  
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook.json';
    a.click();
    
    URL.revokeObjectURL(url);
  };