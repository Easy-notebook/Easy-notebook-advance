import React from 'react';
import { useTranslation } from 'react-i18next';
import { CircleX, Clock, List, Bug, MessageCircle as LucideMessageCircle, Activity } from 'lucide-react';
import { Space, Button } from 'antd';
import useStore from '../../../../../store/notebookStore';
import { useAIAgentStore } from '../../../../../store/AIAgentStore';
import type { RightSidebarView } from '../../shared/constants';

const ViewSwitcher: React.FC = () => {
  const { activeView, setActiveView } = useAIAgentStore();
  const { setIsRightSidebarCollapsed } = useStore();
  const { t } = useTranslation();

  const getViewIcon = (view: RightSidebarView) => {
    switch (view) {
      case 'activity':
        return <Activity className="w-4 h-4 flex-shrink-0" />;
      case 'qa':
        return <LucideMessageCircle className="w-4 h-4 flex-shrink-0" />;
      case 'debug':
        return <Bug className="w-4 h-4 flex-shrink-0" />;
      default:
        return <List className="w-4 h-4 flex-shrink-0" />;
    }
  };

  const getViewLabel = (view: RightSidebarView) => {
    switch (view) {
      case 'activity':
        return 'Activity';
      case 'qa':
        return t('rightSideBar.chat');
      case 'debug':
        return 'Debug';
      default:
        return t('rightSideBar.workflow');
    }
  };

  return (
    <div className="flex gap-2 text-lg items-center w-full justify-between">
      <Space size="small" className="flex-1 min-w-0">
        <Button.Group>
          {(['activity', 'qa', 'debug'] as RightSidebarView[]).map((view) => (
            <Button
              key={view}
              type={activeView === view ? 'primary' : 'default'}
              size="small"
              icon={getViewIcon(view)}
              onClick={() => setActiveView(view as any)}
              className="flex items-center gap-1"
            >
              <span className="hidden sm:inline whitespace-nowrap">
                {getViewLabel(view)}
              </span>
            </Button>
          ))}
        </Button.Group>
      </Space>
      <Button
        type="text"
        size="small"
        icon={<CircleX className="w-4 h-4" />}
        onClick={() => setIsRightSidebarCollapsed(false)}
      />
    </div>
  );
};

export default ViewSwitcher;