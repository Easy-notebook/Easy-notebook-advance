import React, { useState, useEffect, useRef } from 'react';
import { 
  Code, 
  Type, 
  Image, 
  Table, 
  Brain, 
  Calculator, 
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Zap
} from 'lucide-react';

export interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
  category: 'basic' | 'advanced' | 'media' | 'ai';
}

interface SlashCommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: SlashCommand) => void;
  onChatRequest?: (query: string) => void; // Add chat request handler
  position: { x: number; y: number };
  searchQuery?: string;
  onQueryChange?: (q: string) => void;
}

const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  onClose,
  onCommand,
  onChatRequest,
  position,
  searchQuery = '',
  onQueryChange
}) => {
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(searchQuery);

  // keep local query synced with props when it changes
  useEffect(() => {
    setQuery(searchQuery || '');
  }, [searchQuery]);

  // Define all available commands
  const commands: SlashCommand[] = [
    // Basic content
    {
      id: 'text',
      title: 'Text',
      description: 'Start writing...',
      icon: <Type size={16} />,
      keywords: ['text', 'paragraph', 'content'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'heading1',
      title: 'Heading 1',
      description: 'Large heading',
      icon: <Heading1 size={16} />,
      keywords: ['h1', 'heading', 'title'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'heading2',
      title: 'Heading 2',
      description: 'Medium heading',
      icon: <Heading2 size={16} />,
      keywords: ['h2', 'heading', 'subtitle'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'heading3',
      title: 'Heading 3',
      description: 'Small heading',
      icon: <Heading3 size={16} />,
      keywords: ['h3', 'heading', 'subtitle'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'bulletlist',
      title: 'Bulleted list',
      description: 'Create a bulleted list',
      icon: <List size={16} />,
      keywords: ['list', 'bullet', 'ul'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'numberedlist',
      title: 'Numbered list',
      description: 'Create a numbered list',
      icon: <ListOrdered size={16} />,
      keywords: ['list', 'numbered', 'ol'],
      action: () => {},
      category: 'basic'
    },
    {
      id: 'quote',
      title: 'Quote',
      description: 'Insert a blockquote',
      icon: <Quote size={16} />,
      keywords: ['quote', 'blockquote'],
      action: () => {},
      category: 'basic'
    },
    
    // Code and technical
    {
      id: 'code',
      title: 'Code block',
      description: 'Create an executable code cell',
      icon: <Code size={16} />,
      keywords: ['code', 'python', 'javascript', 'programming'],
      action: () => {},
      category: 'advanced'
    },
    {
      id: 'math',
      title: 'Math formula',
      description: 'Insert a LaTeX math formula',
      icon: <Calculator size={16} />,
      keywords: ['math', 'latex', 'formula'],
      action: () => {},
      category: 'advanced'
    },
    
    // Media
    {
      id: 'image',
      title: 'Image',
      description: 'Upload or insert an image',
      icon: <Image size={16} />,
      keywords: ['image', 'photo', 'picture'],
      action: () => {},
      category: 'media'
    },
    {
      id: 'table',
      title: 'Table',
      description: 'Insert a table',
      icon: <Table size={16} />,
      keywords: ['table', 'grid'],
      action: () => {},
      category: 'media'
    },
    
    // AI features
    {
      id: 'ai-thinking',
      title: 'AI Thinking',
      description: 'Create an AI thinking cell',
      icon: <Brain size={16} />,
      keywords: ['ai', 'thinking', 'assistant'],
      action: () => {},
      category: 'ai'
    },
    {
      id: 'ai-generate',
      title: 'AI Generate',
      description: 'Let AI generate content',
      icon: <Zap size={16} />,
      keywords: ['ai', 'generate', 'create'],
      action: () => {},
      category: 'ai'
    }
  ];

  // Filter commands
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

  // Keyboard navigation
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
          if (filteredCommands.length === 0) {
            // No matching commands - send as chat request
            if (query.trim() && onChatRequest) {
              onChatRequest(query.trim());
            }
            onClose();
          } else if (filteredCommands[selectedIndex]) {
            // Execute the selected command
            onCommand(filteredCommands[selectedIndex]);
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
  }, [isOpen, filteredCommands, selectedIndex, onCommand, onClose]);

  // Auto-focus the search input
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close when clicking outside
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'basic': return 'text-theme-600';
      case 'advanced': return 'text-purple-600';
      case 'media': return 'text-green-600';
      case 'ai': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

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
      {/* Search input */}
      <div className="p-3 border-b border-gray-100">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onQueryChange?.(val);
          }}
          placeholder="Search commands..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-theme-500 focus:border-transparent"
        />
      </div>

      {/* Command list */}
      <div className="max-h-80 overflow-y-auto">
        {filteredCommands.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
              <div className="text-xs text-theme-600">
                Press Enter to use let AI to help you.
              </div>               
          </div>
        ) : (
          <div className="py-2">
            {filteredCommands.map((command, index) => (
              <button
                key={command.id}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                  index === selectedIndex ? 'bg-theme-50 border-r-2 border-theme-500' : ''
                }`}
                onClick={() => onCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className={`flex-shrink-0 ${getCategoryColor(command.category)}`}>
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

      {/* Footer hints */}
      {filteredCommands.length !== 0 && <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
        <span>↑↓ Navigate</span>
        <span>Enter Select</span>
        <span>Esc Close</span>
      </div>}
    </div>
  );
};

export default SlashCommandMenu;
