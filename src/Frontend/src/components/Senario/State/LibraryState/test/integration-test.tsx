// LibraryState/test/integration-test.tsx
// Integration test for notebook real-time save and load functionality

import React, { useEffect, useState } from 'react';
import { Button, Card, Space, Typography, Spin, Alert, Divider } from 'antd';
import useNotebookStore from '@Store/notebookStore';
import usePreviewStore from '@Store/previewStore';
import NotebookAutoSave from '@Services/notebookAutoSave';
import { NotebookORM, FileORM } from '@Storage/index';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export const IntegrationTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Auto-save with 25ms delay', status: 'pending' },
    { name: 'Database direct loading', status: 'pending' },
    { name: 'Notebook-based tab loading', status: 'pending' },
    { name: 'Cross-notebook switching', status: 'pending' },
    { name: 'Storage migration', status: 'pending' }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number | null>(null);

  const notebookStore = useNotebookStore();
  const previewStore = usePreviewStore();

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((test, i) => 
      i === index ? { ...test, ...update } : test
    ));
  };

  const runTest = async (index: number, testFn: () => Promise<void>) => {
    const startTime = Date.now();
    setCurrentTest(index);
    updateTest(index, { status: 'running' });
    
    try {
      await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'success', 
        message: `Completed in ${duration}ms`,
        duration 
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTest(index, { 
        status: 'error', 
        message: `Failed: ${error}`,
        duration 
      });
      throw error;
    }
  };

  // Test 1: Auto-save with 25ms delay
  const testAutoSave = async () => {
    console.log('🧪 Test 1: Testing auto-save with 25ms delay...');
    
    // Create test notebook
    const testNotebookId = `test-notebook-${Date.now()}`;
    notebookStore.setNotebookId(testNotebookId);
    notebookStore.setNotebookTitle('Test Auto-save Notebook');
    
    // Add some test content
    notebookStore.addCell({
      type: 'code',
      content: 'print("Testing auto-save functionality")'
    });
    
    notebookStore.addCell({
      type: 'markdown',
      content: '# Test Markdown\nThis is a test for auto-save functionality.'
    });

    // Wait for debounced save (25ms + buffer)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify notebook was saved
    const savedNotebook = await NotebookORM.getNotebook(testNotebookId);
    if (!savedNotebook) {
      throw new Error('Notebook was not saved to database');
    }
    
    // Verify main notebook file exists
    const mainFile = await FileORM.getFile(testNotebookId, `notebook_${testNotebookId}.json`);
    if (!mainFile) {
      throw new Error('Main notebook file was not saved');
    }

    // Verify content
    const parsedContent = JSON.parse(mainFile.content || '{}');
    if (parsedContent.cells?.length !== 2) {
      throw new Error(`Expected 2 cells, found ${parsedContent.cells?.length || 0}`);
    }

    console.log('✅ Auto-save test passed');
  };

  // Test 2: Database direct loading
  const testDatabaseLoading = async () => {
    console.log('🧪 Test 2: Testing database direct loading...');
    
    // Use the notebook from previous test
    const currentNotebookId = notebookStore.notebookId;
    if (!currentNotebookId) {
      throw new Error('No notebook ID available from previous test');
    }

    // Clear current state
    notebookStore.clearCells();
    
    // Load from database
    const loaded = await notebookStore.loadFromDatabase(currentNotebookId);
    if (!loaded) {
      throw new Error('Failed to load notebook from database');
    }

    // Verify content was restored
    if (notebookStore.cells.length !== 2) {
      throw new Error(`Expected 2 cells after loading, found ${notebookStore.cells.length}`);
    }

    const codeCell = notebookStore.cells.find(cell => cell.type === 'code');
    const markdownCell = notebookStore.cells.find(cell => cell.type === 'markdown');

    if (!codeCell?.content.includes('Testing auto-save functionality')) {
      throw new Error('Code cell content not restored correctly');
    }

    if (!markdownCell?.content.includes('Test Markdown')) {
      throw new Error('Markdown cell content not restored correctly');
    }

    console.log('✅ Database loading test passed');
  };

  // Test 3: Notebook-based tab loading
  const testNotebookTabLoading = async () => {
    console.log('🧪 Test 3: Testing notebook-based tab loading...');
    
    const currentNotebookId = notebookStore.notebookId;
    if (!currentNotebookId) {
      throw new Error('No notebook ID available');
    }

    // Load tabs for current notebook
    await previewStore.loadNotebookTabs(currentNotebookId);
    
    // Verify tabs are loaded
    const tabs = previewStore.getTabsByNotebook(currentNotebookId);
    
    if (tabs.length === 0) {
      throw new Error('No tabs loaded for notebook');
    }

    // Verify notebook ID detection
    const detectedNotebookId = previewStore.getCurrentNotebookId();
    if (detectedNotebookId !== currentNotebookId) {
      throw new Error(`Current notebook ID mismatch: expected ${currentNotebookId}, got ${detectedNotebookId}`);
    }

    console.log(`✅ Tab loading test passed - ${tabs.length} tabs loaded`);
  };

  // Test 4: Cross-notebook switching
  const testCrossNotebookSwitching = async () => {
    console.log('🧪 Test 4: Testing cross-notebook switching...');
    
    // Create second test notebook
    const testNotebook2Id = `test-notebook-2-${Date.now()}`;
    notebookStore.setNotebookId(testNotebook2Id);
    notebookStore.setNotebookTitle('Second Test Notebook');
    
    // Add different content
    notebookStore.addCell({
      type: 'markdown',
      content: '# Second Notebook\nThis is a different notebook for testing switching.'
    });

    // Wait for auto-save
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Switch using preview store
    await previewStore.switchToNotebook(testNotebook2Id);
    
    // Verify switch worked
    const currentId = previewStore.getCurrentNotebookId();
    if (currentId !== testNotebook2Id) {
      throw new Error(`Switch failed: expected ${testNotebook2Id}, got ${currentId}`);
    }

    // Verify notebook store was updated
    if (notebookStore.notebookId !== testNotebook2Id) {
      throw new Error('Notebook store was not updated after switch');
    }

    // Verify content
    if (notebookStore.cells.length !== 1) {
      throw new Error(`Expected 1 cell in second notebook, found ${notebookStore.cells.length}`);
    }

    console.log('✅ Cross-notebook switching test passed');
  };

  // Test 5: Storage migration (simplified)
  const testStorageMigration = async () => {
    console.log('🧪 Test 5: Testing storage migration capabilities...');
    
    // This is a simplified test - just verify migration system is available
    try {
      const { DataMigration } = await import('@Storage/migration');
      
      // Test migration detection
      const hasLegacyData = await DataMigration.hasLegacyData();
      console.log(`Legacy data detection: ${hasLegacyData ? 'found' : 'none'}`);
      
      // Migration system is available and functional
      console.log('✅ Storage migration system available');
    } catch (error) {
      throw new Error(`Migration system not available: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTest(null);

    try {
      await runTest(0, testAutoSave);
      await runTest(1, testDatabaseLoading);  
      await runTest(2, testNotebookTabLoading);
      await runTest(3, testCrossNotebookSwitching);
      await runTest(4, testStorageMigration);
      
      console.log('🎉 All tests completed successfully!');
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  const cleanupTestData = async () => {
    try {
      // Clean up test notebooks
      const testNotebooks = await NotebookORM.getAllNotebooks();
      for (const notebook of testNotebooks) {
        if (notebook.id.startsWith('test-notebook-')) {
          await NotebookORM.deleteNotebook(notebook.id);
          await previewStore.clearCacheForNotebook(notebook.id);
        }
      }
      console.log('🧹 Test data cleaned up');
    } catch (error) {
      console.warn('Failed to cleanup test data:', error);
    }
  };

  useEffect(() => {
    // Initialize auto-save service
    NotebookAutoSave.initialize().catch(error => {
      console.error('Failed to initialize auto-save:', error);
    });
  }, []);

  return (
    <Card title="Notebook Integration Test Suite" style={{ margin: '20px' }}>
      <Paragraph>
        This test suite verifies the three main requirements:
      </Paragraph>
      <ul>
        <li>✨ Notebook content auto-saves to database with 25ms delay</li>
        <li>🗄️ Clicking database content directly loads corresponding files</li>
        <li>📄 Tabs load based on their notebook ownership</li>
      </ul>

      <Divider />

      <Space direction="vertical" style={{ width: '100%' }}>
        {tests.map((test, index) => (
          <Card key={index} size="small" style={{ 
            borderColor: test.status === 'success' ? '#52c41a' : 
                       test.status === 'error' ? '#ff4d4f' : 
                       test.status === 'running' ? '#1890ff' : '#d9d9d9'
          }}>
            <Space>
              <Text strong style={{ width: '200px' }}>{test.name}</Text>
              {test.status === 'running' && <Spin size="small" />}
              {test.status === 'success' && <Text type="success">✅ PASSED</Text>}
              {test.status === 'error' && <Text type="danger">❌ FAILED</Text>}
              {test.status === 'pending' && <Text type="secondary">⏳ Pending</Text>}
              {test.message && <Text type="secondary">{test.message}</Text>}
            </Space>
          </Card>
        ))}
      </Space>

      <Divider />

      <Space>
        <Button 
          type="primary" 
          onClick={runAllTests} 
          loading={isRunning}
          disabled={isRunning}
        >
          Run All Tests
        </Button>
        <Button onClick={cleanupTestData} disabled={isRunning}>
          Clean Up Test Data
        </Button>
      </Space>

      {currentTest !== null && (
        <Alert
          message={`Running: ${tests[currentTest].name}`}
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );
};

export default IntegrationTest;