import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import type { Editor } from '@tiptap/react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import SlashCommandMenu, { SlashCommand } from '../SlashCommands/SlashCommandMenu';
import { v4 as uuidv4 } from 'uuid';
import React, { useEffect } from 'react';
import { useAIAgentStore } from '../../../store/AIAgentStore';
import useStore from '../../../store/notebookStore';
import useOperatorStore from '../../../store/operatorStore';
import { detectActivityType } from '../../../utils/activityDetector';
import { AgentMemoryService, AgentType } from '../../../services/agentMemoryService';
import type { QAItem } from '../../../store/AIAgentStore';

export interface SlashItem {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  icon?: React.ReactNode;
  run: (editor: Editor, query: string) => void;
}

export interface SlashMenuProps {
  items: SlashItem[];
  editor: Editor;
  query: string;
  selectedIndex: number;
  setSelectedIndex: (idx: number) => void;
  command: (item: SlashItem) => void;
  close: () => void;
}

export interface SlashCommandsOptions {
  items: SlashItem[];
  // keepOpenWhenEmpty: true => Keep panel open when query is empty (until Esc or trigger removed)
  keepOpenWhenEmpty?: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    slashCommands: {
      openSlash(): ReturnType;
      closeSlash(): ReturnType;
    };
  }
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      items: [],
      keepOpenWhenEmpty: true,
    };
  },

  addCommands() {
    return {
      openSlash:
        () =>
        ({ editor, chain }) => {
          // Manually insert trigger character
          chain().insertContent('/').run();
          // Immediately trigger suggestion
          (editor as any).storage.suggestion?.suggestion?.command?.({ id: null });
          return true;
        },
      closeSlash:
        () =>
        ({ editor }) => {
          // Collapse suggestion plugin (trigger onExit)
          (editor as any).storage.suggestion?.suggestion?.exit?.();
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const ext = this;
    return [
      Suggestion({
        editor: (this as any).editor,
        char: '/',               // Trigger character
        allowSpaces: true,       // Allow spaces
        startOfLine: false,      // Not limited to start of line

        // Allow showing the panel in a permissive manner; closing handled in onKeyDown
        allow: ({ state, range }) => {
          // If the trigger is deleted (e.g. "/" removed), the plugin exits naturally
          const from = range.from - 1;
          const prev = state.doc.textBetween(from, from + 1);
          if (prev !== '/') return false;
          return true;
        },

        items: ({ query }) => {
          const list = (ext.options.items || []);
          const q = (query || '').trim().toLowerCase();
          if (!q) {
            // Allow empty query: show all
            return list;
          }
          return list.filter((item) => {
            return (
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.toLowerCase().includes(q))
            );
          });
        },

        // Command function to execute when item is selected
        command: ({ editor, range, props }) => {
          const item = props as SlashItem;
          if (item && item.run) {
            // Delete the trigger text (including '/' and query)
            editor.chain().focus().deleteRange(range).run();
            // Execute the command
            item.run(editor, props.query || '');
          }
        },

        // Keyboard handling lives in renderer.onKeyDown to avoid type mismatch

        // Renderer: render menu via React + tippy
        render: () => {
          let component: ReactRenderer | null = null;
          let popup: TippyInstance[] = [];
          let graceUntil = 0;
          let lastProps: any = null;

          return {
            onStart: (props) => {
              lastProps = props;
              // IME grace period: ignore navigation keys (except Esc) for 160ms after compositionend
              document.addEventListener(
                'compositionend',
                () => {
                  graceUntil = Date.now() + 160;
                },
                { capture: true, once: true },
              );

              component = new ReactRenderer(ext.storage.slashMenuComponent, {
                props: {
                  ...props,
                  close: () => props.editor.commands.closeSlash(),
                },
                editor: props.editor,
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                content: (component.element as unknown) as HTMLElement,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                theme: 'light-border',
                appendTo: () => document.body,
                offset: [0, 6],
                hideOnClick: false, // Do not hide on outside click to avoid accidental close
              });

              // Pass graceUntil to onKeyDown
              (props as any).graceUntil = graceUntil;
            },

            onUpdate: (props) => {
              lastProps = props;
              component?.updateProps({
                ...props,
                close: () => props.editor.commands.closeSlash(),
              });
              popup[0].setProps({
                getReferenceClientRect: props.clientRect as any,
              });
            },

            onKeyDown: (props) => {
              // Let the global onKeyDown logic handle keys
              (props as any).graceUntil = (props as any).graceUntil || graceUntil;
              const e = props.event as KeyboardEvent;
              if ((e as any).isComposing || e.key === 'Process' || (e as any).keyCode === 229) {
                return false;
              }
              if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
                const now = Date.now();
                const inGrace = now < graceUntil;
                if (inGrace && e.key !== 'Escape') {
                  return false;
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  return true;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  if (lastProps) {
                    lastProps.setSelectedIndex(
                      (lastProps.selectedIndex + 1) % lastProps.items.length,
                    );
                  }
                  return true;
                }
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  if (lastProps) {
                    lastProps.setSelectedIndex(
                      (lastProps.selectedIndex + lastProps.items.length - 1) %
                        lastProps.items.length,
                    );
                  }
                  return true;
                }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  if (lastProps) {
                    lastProps.setSelectedIndex(
                      (lastProps.selectedIndex + 1) % lastProps.items.length,
                    );
                  }
                  return true;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (lastProps) {
                    const item = lastProps.items[lastProps.selectedIndex];
                    if (item) {
                      // Execute the selected command via Suggestion's command function
                      lastProps.command({ id: item.id, ...item });
                    } else if (lastProps.query && lastProps.query.trim()) {
                      // No matching items - handle as chat request
                      // Access the component's chat request handler through the extension's storage
                      const chatHandler = ext.storage.handleChatRequest;
                      if (chatHandler && typeof chatHandler === 'function') {
                        console.log('Sending chat request via extension:', lastProps.query);
                        chatHandler(lastProps.query.trim());
                      } else {
                        // Fallback: delete the slash text
                        const { from, to } = lastProps.range;
                        lastProps.editor.chain().focus().deleteRange({ from, to }).run();
                        console.log('No chat handler found, just removed slash text');
                      }
                    }
                  }
                  return true;
                }
              }
              return false;
            },

            onExit: () => {
              popup.forEach((p) => p.destroy());
              component?.destroy();
            },
          };
        },
      }),
    ];
  },

  // Store React component type for renderer usage (injected at runtime)
  addStorage() {
    return {
      slashMenuComponent: null as any, // Will be injected in setupSlashMenuRenderer
      handleChatRequest: null as any,  // Will be injected with handleChatRequest function
    };
  },
});

// Allow external code to inject a React component into extension.storage
export function setupSlashMenuRenderer(
  editor: Editor,
  Comp: React.ComponentType<SlashMenuProps>,
) {
  const slashExt = editor.extensionManager.extensions.find((e) => e.name === 'slashCommands') as any;
  if (slashExt) {
    slashExt.storage.slashMenuComponent = Comp;
  } else {
    // eslint-disable-next-line no-console
    console.warn('[SlashCommands] extension not found; did you add it to editor?');
  }
}

// Allow external code to inject the chat request handler into extension.storage
export function setupSlashChatHandler(
  editor: Editor,
  handleChatRequest: (command: string) => void,
) {
  const slashExt = editor.extensionManager.extensions.find((e) => e.name === 'slashCommands') as any;
  if (slashExt) {
    slashExt.storage.handleChatRequest = handleChatRequest;
    console.log('Chat handler injected into extension storage');
  } else {
    // eslint-disable-next-line no-console
    console.warn('[SlashCommands] extension not found; did you add it to editor?');
  }
}

// React component API used by TiptapNotebookEditor
export interface TipTapSlashCommandsProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  searchQuery: string;
  onQueryUpdate: (q: string) => void;
  slashRange?: { from: number; to: number } | null;
  onRemoveSlashText?: (range?: { from: number; to: number }) => void;
}

export const TipTapSlashCommandsComponent = ({ editor, isOpen, onClose, position, searchQuery, onQueryUpdate, slashRange, onRemoveSlashText }: TipTapSlashCommandsProps) => {
  // Store hooks for chat functionality (same as AITerminal)
  const {
    setActiveView,
    actions,
    qaList,
    addQA
  } = useAIAgentStore();

  const {
    currentCellId,
    viewMode,
    currentPhaseId,
    currentStepIndex,
    notebookId,
    getCurrentViewCells,
    setIsRightSidebarCollapsed
  } = useStore();

  // Helper method to infer goals from questions
  const inferGoalsFromQuestion = (question: string): string[] => {
    const inferredGoals: string[] = [];
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('how to')) {
      inferredGoals.push('learning_method');
    }
    if (lowerQuestion.includes('error') || lowerQuestion.includes('bug')) {
      inferredGoals.push('debug_issue');
    }
    if (lowerQuestion.includes('data')) {
      inferredGoals.push('data_analysis');
    }
    if (lowerQuestion.includes('plot') || lowerQuestion.includes('chart')) {
      inferredGoals.push('data_visualization');
    }
    if (lowerQuestion.includes('optimize') || lowerQuestion.includes('improve')) {
      inferredGoals.push('code_optimization');
    }
    if (lowerQuestion.includes('explain') || lowerQuestion.includes('what is')) {
      inferredGoals.push('concept_explanation');
    }
    
    return inferredGoals;
  };

  // Handle chat request for unknown commands (same logic as AITerminal)
  const handleChatRequest = async (command: string) => {
    try {
      // First, remove the current slash text
      removeCurrentSlashText();

      setIsRightSidebarCollapsed(true);
      setActiveView('qa');
      
      const effectiveNotebookId = notebookId ?? `temp-session-${Date.now()}`;
      const qaId = `qa-${uuidv4()}`;
      
      const qaData: Omit<QAItem, 'timestamp' | 'onProcess'> & { onProcess?: boolean } = {
        id: qaId,
        type: 'user',
        content: command,
        resolved: false,
        cellId: currentCellId || undefined,
        viewMode,
        onProcess: true
      };
      addQA(qaData);
      
      // Use smart detector to get activity info
      const detectionResult = detectActivityType(command);
      
      // Create enhanced action info
      const enhancedAction = {
        type: detectionResult.eventType,
        content: command,
        result: '',
        relatedQAIds: [qaId],
        cellId: currentCellId,
        viewMode: viewMode || 'create',
        onProcess: true,
        agentName: detectionResult.agentName,
        agentType: detectionResult.agentType,
        taskDescription: detectionResult.taskDescription,
        progressPercent: 0
      };
      
      useAIAgentStore.getState().addAction(enhancedAction);

      // Prepare Agent memory context
      const memoryContext = AgentMemoryService.prepareMemoryContextForBackend(
        notebookId,
        'general' as AgentType,
        {
          current_cell_id: currentCellId || undefined,
          related_cells: getCurrentViewCells(),
          related_qa_ids: qaList.map(qa => qa.id),
          current_qa_id: qaId,
          question_content: command
        }
      );

      // Update user intent
      AgentMemoryService.updateUserIntent(
        effectiveNotebookId,
        'general' as AgentType,
        [command], // Goals explicitly expressed by user
        inferGoalsFromQuestion(command), // Inferred goals
        command, // Current focus
        [] // Current blocks
      );

      // Record QA interaction start
      AgentMemoryService.recordOperationInteraction(
        effectiveNotebookId,
        'general' as AgentType,
        'qa_started',
        true,
        {
          qa_id: qaId,
          question: command,
          start_time: new Date().toISOString(),
          related_context: {
            current_cell_id: currentCellId || undefined,
            related_qa_count: qaList.length,
            view_mode: viewMode
          }
        }
      );

      const finalPayload = {
        type: 'user_question',
        payload: {
          content: command,
          QId: [qaId],
          current_view_mode: viewMode,
          current_phase_id: currentPhaseId,
          current_step_index: currentStepIndex,
          related_qas: qaList,
          related_actions: actions,
          related_cells: getCurrentViewCells(),
          ...memoryContext
        }
      };
      
      useOperatorStore.getState().sendOperation(notebookId, finalPayload);
      
      console.log('SlashCommand: Sending chat request:', command);
      
    } catch (error) {
      console.error('Error in slash command chat request:', error);
    } finally {
      onClose(); // Close the menu after sending chat request
    }
  };

  // Inject the handleChatRequest function into the extension storage
  useEffect(() => {
    if (editor) {
      setupSlashChatHandler(editor, handleChatRequest);
    }
  }, [editor, handleChatRequest]);

  if (!isOpen) return null;

  // Helper function to detect and remove current slash text
  const removeCurrentSlashText = () => {
    if (!editor) return;
    
    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;
    
    if (!$from.parent.isTextblock) return;
    
    // Get text before cursor
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    
    // Find the slash and query
    const slashMatch = textBefore.match(/\/([^\n]*)$/);
    
    if (slashMatch) {
      const slashPos = $from.pos - slashMatch[0].length;
      const range = {
        from: slashPos,
        to: $from.pos,
      };
      
      console.log('Removing slash text from', range.from, 'to', range.to, 'content:', slashMatch[0]);
      editor.chain().focus().deleteRange(range).run();
      return true;
    }
    
    return false;
  };

  const handleCommand = (cmd: SlashCommand) => {
    try {
      const ed = editor;
      if (!ed) {
        onClose();
        return;
      }

      // First, remove the current slash text
      removeCurrentSlashText();

      // Then execute the command
      switch (cmd.id) {
        case 'heading1':
          ed.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'heading2':
          ed.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'heading3':
          ed.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case 'bulletlist':
          ed.chain().focus().toggleBulletList().run();
          break;
        case 'numberedlist':
          ed.chain().focus().toggleOrderedList().run();
          break;
        case 'quote':
          ed.chain().focus().toggleBlockquote().run();
          break;
        case 'code':
          // Fallback: insert a code block node if extension provides command
          // Many setups use setCodeBlock; if not available, insert pre/code HTML
          const hasSetCodeBlock = typeof (ed.commands as any).setCodeBlock === 'function';
          if (hasSetCodeBlock) {
            (ed.commands as any).setCodeBlock?.();
          } else {
            ed.chain().focus().insertContent('<pre><code></code></pre>').run();
          }
          break;
        case 'image':
          // Insert a placeholder image node if supported; otherwise no-op
          ed.chain().focus().insertContent('<p>Image: paste or drop here</p>').run();
          break;
        case 'table':
          // Basic 3x3 table if table extension is enabled
          (ed.commands as any).insertTable?.({ rows: 3, cols: 3, withHeaderRow: true })
            || ed.chain().focus().insertContent('<p>Table</p>').run();
          break;
        case 'math':
          ed.chain().focus().insertContent('$$\nE = mc^2\n$$').run();
          break;
        case 'ai-thinking':
          ed.chain().focus().insertContent('<p>[AI Thinking]</p>').run();
          break;
        case 'ai-generate':
          ed.chain().focus().insertContent('<p>[AI Generate]</p>').run();
          break;
        case 'text':
        default:
          // No structural change; close menu only
          break;
      }
    } finally {
      onClose();
    }
  };

  return (
    <SlashCommandMenu
      isOpen={isOpen}
      onClose={onClose}
      onCommand={handleCommand}
      onChatRequest={handleChatRequest}
      position={position}
      searchQuery={searchQuery}
      onQueryChange={(q) => onQueryUpdate?.(q)}
    />
  );
};

export default TipTapSlashCommandsComponent;