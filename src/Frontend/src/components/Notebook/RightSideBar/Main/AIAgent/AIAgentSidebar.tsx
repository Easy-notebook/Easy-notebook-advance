import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquare, MessageCircle } from 'lucide-react';

import useStore from '@Store/notebookStore';
import { useAIAgentStore, EVENT_TYPES } from '@Store/AIAgentStore';
import { StateMachineDebugger, AIPlanningContextDebugger } from '../Debug';
import { WorkflowTODOPanel } from '../Workflow';
import { ViewSwitcher } from '../ViewSwitcher';
import ToolCallIndicator from '../Components/ToolCallIndicator';
import AgentInfo from '../Components/AgentInfo';
import ExpandableText from '../Components/ExpandableText';
import EventIcon from '../Components/EventIcon';
import { RightSidebarContainer, RightSidebarHeader, RightSidebarContent } from '../../shared';
import ActivityBar from './ActivityBar';

const AIAgentSidebar = () => {
  const {
    activeView,
    isLoading,
    qaList,
    setActiveView,
  } = useAIAgentStore();
  
  const { t } = useTranslation();
  const { getCurrentStepCellsIDs, viewMode } = useStore();

  const qasToShow = useMemo(() => {
    if (!qaList || qaList.length === 0) return [];
    
    // Cache getCurrentStepCellsIDs result to avoid repeated calls
    const currentStepCellsIDs = viewMode === 'step' ? getCurrentStepCellsIDs() : null;
    
    // Use for loop for better performance than filter
    const filtered = [];
    for (let i = 0; i < qaList.length; i++) {
      const qa = qaList[i];
      
      // Early return for items without viewMode
      if (!qa.viewMode) {
        filtered.push(qa);
        continue;
      }
      
      // Skip if viewMode doesn't match
      if (qa.viewMode !== viewMode) continue;
      
      // For step mode, check if cellId is in current step
      if (viewMode === 'step') {
        if (currentStepCellsIDs && currentStepCellsIDs.includes(qa.cellId)) {
          filtered.push(qa);
        }
      } else {
        filtered.push(qa);
      }
    }
    
    return filtered;
  }, [qaList, viewMode, getCurrentStepCellsIDs]);

  const handleJumpToQA = useCallback((qaId: string) => {
    setActiveView('qa');
    requestAnimationFrame(() => {
      const qaElement = document.getElementById(qaId);
      if (qaElement) {
        qaElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }, [setActiveView]);

  return (
    <RightSidebarContainer>
      <RightSidebarHeader>
        <ViewSwitcher />
      </RightSidebarHeader>

      <RightSidebarContent>
        {activeView === 'activity' && (
          <ActivityBar />
        )}

        {activeView === 'qa' && (
          <div className="space-y-4 py-4">
            {qasToShow.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mx-auto text-gray-500">{t('rightSideBar.noChatMessages')}</p>
                <p className="text-xs mt-1 mx-auto text-gray-500">{t('rightSideBar.startConversation')}</p>
              </div>
            ) : (
              qasToShow.map((qa, index) => (
                <div key={qa.id} id={qa.id} className="w-full mb-3">
                  <div
                    className={`
                      relative p-4 rounded-lg shadow-sm w-full transition-all duration-300 min-w-0
                      ${index === 0
                        ? 'bg-white/20 ring-1 ring-theme-200'
                        : qa.type === 'user'
                          ? 'bg-theme-50 text-left hover:bg-theme-100'
                          : 'bg-gray-50 text-left hover:bg-gray-100'
                      }
                    `}
                  >
                    <div className={`flex items-center gap-2 mb-2 ${qa.type === 'user' ? 'justify-start' : 'justify-start'
                      }`}>
                      <span className="text-xs font-semibold text-gray-700">
                        [{qasToShow.length - index}]
                      </span>
                      <EventIcon
                        type={
                          qa.type === 'assistant'
                            ? EVENT_TYPES.AI_REPLYING_QUESTION
                            : EVENT_TYPES.USER_ASK_QUESTION
                        }
                        onProcess={qa.onProcess}
                      />
                      <span className={`text-xs px-2 py-0.5 rounded-full ${qa.type === 'user'
                        ? 'bg-theme-100 text-theme-700'
                        : 'bg-green-100 text-green-700'
                        }`}>
                        {qa.type === 'user' ? t('rightSideBar.you') : t('rightSideBar.ai')}
                      </span>

                      {qa.type === 'assistant' && (
                        <AgentInfo
                          agent={qa.agent}
                          model={qa.model}
                          type={qa.agentType}
                        />
                      )}

                      <span className="text-xs text-gray-500">{qa.timestamp}</span>
                    </div>

                    <div className="text-left break-words overflow-wrap-anywhere min-w-0">
                      {(!qa.content || qa.content.trim() === '') && qa.type === 'assistant' ? (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>{qa.agentType || qa.agent || 'AI'} {t('rightSideBar.thinking') || 'is thinking...'}</span>
                          {qa.thinkingStartAtMs && (
                            <span className="text-gray-400">(
                              {Math.max(0, Math.round(((qa.thinkingEndAtMs || Date.now()) - qa.thinkingStartAtMs) / 1000))}s
                              )</span>
                          )}
                        </div>
                      ) : (
                        <ExpandableText text={qa.content} maxLines={5} />
                      )}
                    </div>

                    {qa.type === 'assistant' && qa.toolCalls && qa.toolCalls.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-gray-500 mb-2">🛠️ Tool Calls:</div>
                        {qa.toolCalls.map((tool: any, toolIndex: number) => (
                          <ToolCallIndicator
                            key={`${qa.id}-tool-${toolIndex}`}
                            type={tool.type || tool.name}
                            content={tool.content || tool.arguments}
                            agent={tool.agent}
                          />
                        ))}
                      </div>
                    )}

                    {qa.type === 'assistant' && qa.content && (
                      (() => {
                        const xmlTagRegex = /<([a-z-]+)(?:\s+[^>]*)?>[\s\S]*?<\/\1>/gi;
                        const matches = [...qa.content.matchAll(xmlTagRegex)];

                        if (matches.length > 0) {
                          return (
                            <div className="mt-3 space-y-2">
                              <div className="text-xs text-gray-500 mb-2">⚡ Executed Actions:</div>
                              {matches.slice(0, 3).map((match, matchIndex) => (
                                <ToolCallIndicator
                                  key={`${qa.id}-xml-${matchIndex}`}
                                  type={match[1]}
                                  content={match[0].length > 100 ? match[0].substring(0, 100) + '...' : match[0]}
                                  agent={qa.agentType || qa.agent}
                                />
                              ))}
                              {matches.length > 3 && (
                                <div className="text-xs text-gray-400">
                                  {matches.length - 3} more actions...
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}

                    {qa.type === 'assistant' && (!qa.toolCalls || qa.toolCalls.length === 0) && qa.content && /<([a-z-]+)[\s\S]*?<\/\1>/i.test(qa.content) && (
                      <div className="mt-2 text-xs text-gray-500">✅ {qa.agentType || qa.agent || 'AI'} {t('rightSideBar.completedActions') || 'completed some operations during answering.'}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {(activeView as any) === 'debug' && (
          <div className="space-y-4">
            <WorkflowTODOPanel />
            <StateMachineDebugger />
            <AIPlanningContextDebugger />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-3 text-theme-700 p-4 my-4 bg-white/10 rounded-lg animate-pulse transition-all duration-300">
            <Loader2 className="animate-spin" size={24} />
            <span className="font-medium">{t('rightSideBar.processing')}</span>
          </div>
        )}
      </RightSidebarContent>
    </RightSidebarContainer>
  );
};

export default AIAgentSidebar;