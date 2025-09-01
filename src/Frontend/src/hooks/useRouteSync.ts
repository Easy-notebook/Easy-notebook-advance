// src/hooks/useRouteSync.ts
// Hook to sync route changes with route store

import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import useRouteStore from '../store/routeStore';
import useNotebookStore from '../store/notebookStore';
import usePreviewStore from '../store/previewStore';

export const useRouteSync = () => {
  const location = useLocation();
  const params = useParams();
  const { setRoute, currentView, currentNotebookId } = useRouteStore();
  const { setNotebookId, loadFromDatabase } = useNotebookStore();
  const { switchToNotebook } = usePreviewStore();

  // 同步路由状态
  useEffect(() => {
    const currentPath = location.pathname;
    console.log('Route changed to:', currentPath);
    setRoute(currentPath);
  }, [location.pathname, setRoute]);

  // 处理 workspace 路由的 notebook 加载
  useEffect(() => {
    const handleWorkspaceRoute = async () => {
      if (currentView === 'workspace' && currentNotebookId) {
        try {
          console.log(`Loading workspace for notebook: ${currentNotebookId}`);
          
          // 设置当前 notebook ID
          setNotebookId(currentNotebookId);
          
          // 从数据库加载 notebook 数据
          const loadSuccess = await loadFromDatabase(currentNotebookId);
          if (!loadSuccess) {
            console.warn(`Could not load notebook ${currentNotebookId} from database`);
          }
          
          // 切换预览 store
          await switchToNotebook(currentNotebookId);
          
          console.log(`Workspace loaded for notebook: ${currentNotebookId}`);
        } catch (error) {
          console.error('Failed to load workspace:', error);
        }
      }
    };

    handleWorkspaceRoute();
  }, [currentView, currentNotebookId, setNotebookId, loadFromDatabase, switchToNotebook]);

  return {
    currentView,
    currentNotebookId,
    currentRoute: location.pathname
  };
};