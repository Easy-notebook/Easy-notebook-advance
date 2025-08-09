import React, { useState, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { 
  Code, 
  Type, 
  Heading1, 
  Heading2, 
  Heading3,
  List,
  ListOrdered,
  Quote,
  Table,
  Calculator,
  Image,
  Brain
} from 'lucide-react';

interface TipTapCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: (editor: Editor) => void;
}

interface TipTapSlashCommandsProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  searchQuery?: string;
}

const TipTapSlashCommands: React.FC<TipTapSlashCommandsProps> = ({
  editor,
  isOpen,
  onClose,
  position,
  searchQuery = ''
}) => {
  const [filteredCommands, setFilteredCommands] = useState<TipTapCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(searchQuery);

  // 定义TipTap可用的命令
  const commands: TipTapCommand[] = [
    {
      id: 'paragraph',
      title: '段落',
      description: '普通文本段落',
      icon: <Type size={16} />,
      keywords: ['text', 'paragraph', '文本', '段落'],
      action: (editor) => {
        editor.chain().focus().setParagraph().run();
      }
    },
    {
      id: 'heading1',
      title: '标题 1',
      description: '大标题',
      icon: <Heading1 size={16} />,
      keywords: ['h1', 'heading', 'title', '标题', '大标题'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 1 }).run();
      }
    },
    {
      id: 'heading2',
      title: '标题 2',
      description: '中标题',
      icon: <Heading2 size={16} />,
      keywords: ['h2', 'heading', 'subtitle', '标题', '中标题'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 2 }).run();
      }
    },
    {
      id: 'heading3',
      title: '标题 3',
      description: '小标题',
      icon: <Heading3 size={16} />,
      keywords: ['h3', 'heading', '标题', '小标题'],
      action: (editor) => {
        editor.chain().focus().toggleHeading({ level: 3 }).run();
      }
    },
    {
      id: 'bulletlist',
      title: '无序列表',
      description: '创建无序列表',
      icon: <List size={16} />,
      keywords: ['list', 'bullet', 'ul', '列表', '无序'],
      action: (editor) => {
        editor.chain().focus().toggleBulletList().run();
      }
    },
    {
      id: 'orderedlist',
      title: '有序列表',
      description: '创建编号列表',
      icon: <ListOrdered size={16} />,
      keywords: ['list', 'numbered', 'ol', '列表', '有序', '编号'],
      action: (editor) => {
        editor.chain().focus().toggleOrderedList().run();
      }
    },
    {
      id: 'blockquote',
      title: '引用',
      description: '创建引用块',
      icon: <Quote size={16} />,
      keywords: ['quote', 'blockquote', '引用'],
      action: (editor) => {
        editor.chain().focus().toggleBlockquote().run();
      }
    },
    {
      id: 'codeblock',
      title: '代码块',
      description: '插入代码块',
      icon: <Code size={16} />,
      keywords: ['code', 'codeblock', '代码'],
      action: (editor) => {
        editor.chain().focus().toggleCodeBlock().run();
      }
    },
    {
      id: 'table',
      title: '表格',
      description: '插入表格',
      icon: <Table size={16} />,
      keywords: ['table', 'grid', '表格'],
      action: (editor) => {
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
      }
    },
    {
      id: 'math',
      title: '数学公式',
      description: '插入LaTeX数学公式',
      icon: <Calculator size={16} />,
      keywords: ['math', 'latex', 'formula', '数学', '公式'],
      action: (editor) => {
        // 检查是否有LaTeX扩展
        if (editor.commands.setLaTeX) {
          editor.chain().focus().setLaTeX({
            latex: 'E = mc^2',
            displayMode: true
          }).run();
        } else {
          // fallback: 插入普通文本
          editor.chain().focus().insertContent('$$E = mc^2$$').run();
        }
      }
    },
    {
      id: 'image',
      title: '图片',
      description: '插入图片',
      icon: <Image size={16} />,
      keywords: ['image', 'photo', 'picture', '图片', '照片'],
      action: (editor) => {
        const url = prompt('请输入图片URL:');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    },
    {
      id: 'thinking',
      title: 'AI思考',
      description: '插入AI思考块',
      icon: <Brain size={16} />,
      keywords: ['ai', 'thinking', 'assistant', 'AI', '思考', '助手'],
      action: (editor) => {
        // 检查是否有思考cell扩展
        if (editor.commands.insertThinkingCell) {
          editor.chain().focus().insertThinkingCell({
            cellId: `thinking-${Date.now()}`,
            agentName: 'AI',
            customText: null,
            textArray: [],
            useWorkflowThinking: false,
          }).run();
        } else {
          // fallback: 插入普通文本
          editor.chain().focus().insertContent('<div class="thinking-placeholder">🤖 AI思考区域</div>').run();
        }
      }
    }
  ];

  // 过滤命令
  useEffect(() => {
    const filtered = commands.filter(command => {
      if (!query.trim()) return true;
      
      const searchTerm = query.toLowerCase();
      return (
        command.title.toLowerCase().includes(searchTerm) ||
        command.description.toLowerCase().includes(searchTerm) ||
        command.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
      );
    });
    
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex] && editor) {
            filteredCommands[selectedIndex].action(editor);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, editor, onClose]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 min-w-80 max-w-96"
      style={{
        left: position.x,
        top: position.y,
        maxHeight: '400px'
      }}
    >
      {/* 搜索输入框 */}
      <div className="p-3 border-b border-gray-100">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索命令..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {/* 命令列表 */}
      <div className="max-h-80 overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            没有找到匹配的命令
          </div>
        ) : (
          <div className="py-2">
            {filteredCommands.map((command, index) => (
              <button
                key={command.id}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                }`}
                onClick={() => {
                  if (editor) {
                    command.action(editor);
                    onClose();
                  }
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex-shrink-0 text-gray-600">
                  {command.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">
                    {command.title}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {command.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
        <span>↑↓ 导航</span>
        <span>Enter 选择</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  );
};

export default TipTapSlashCommands;
