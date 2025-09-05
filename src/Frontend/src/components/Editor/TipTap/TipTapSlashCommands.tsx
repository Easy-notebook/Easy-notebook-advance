import { Extension } from '@tiptap/core';
import { Suggestion } from '@tiptap/suggestion';
import type { Editor } from '@tiptap/react';
import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import SlashCommandMenu, { SlashCommand } from '../SlashCommands/SlashCommandMenu';

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
                      lastProps.command(item);
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

// React component API used by TiptapNotebookEditor
export interface TipTapSlashCommandsProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  searchQuery: string;
  onQueryUpdate: (q: string) => void;
}

export const TipTapSlashCommandsComponent = ({ editor, isOpen, onClose, position, searchQuery, onQueryUpdate }: TipTapSlashCommandsProps) => {
  if (!isOpen) return null;

  const handleCommand = (cmd: SlashCommand) => {
    try {
      const ed = editor;
      if (!ed) {
        onClose();
        return;
      }

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
      position={position}
      searchQuery={searchQuery}
      onQueryChange={(q) => onQueryUpdate?.(q)}
    />
  );
};

export default TipTapSlashCommandsComponent;