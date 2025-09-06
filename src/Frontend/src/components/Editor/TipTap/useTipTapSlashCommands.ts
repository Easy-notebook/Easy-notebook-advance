import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';

interface UseTipTapSlashCommandsProps {
  editor: Editor | null;
}

export const useTipTapSlashCommands = ({ editor }: UseTipTapSlashCommandsProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  // Keep query as-is to support IME and non-ASCII characters
  const sanitizeQuery = useCallback((raw: string) => raw, []);
  const [slashRange, setSlashRange] = useState<{ from: number; to: number } | null>(null);
  const isComposingRef = useRef(false);

  // Open command menu
  const openMenu = useCallback((position: { x: number; y: number }, query: string = '') => {
    setMenuPosition(position);
    setSearchQuery(sanitizeQuery(query));
    setIsMenuOpen(true);
  }, [sanitizeQuery]);

  // Close command menu
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setSearchQuery('');
    setSlashRange(null);
  }, []);

  // Detect slash input
  const detectSlashCommand = useCallback(() => {
    if (!editor) return;

    const { state } = editor;
    const { selection } = state;
    const { $from } = selection;

    // Ensure we are in a text block
    if (!$from.parent.isTextblock) return;

    // Get text before cursor in current line
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    
    // Find the last slash; allow any non-newline characters as query (supports IME/non-ASCII)
    const slashMatch = textBefore.match(/\/([^\n]*)$/);
    
    if (slashMatch) {
      const slashPos = $from.pos - slashMatch[0].length;
      const query = sanitizeQuery(slashMatch[1] || '');
      
      // Validate slash position (relaxed to support IME typing)
      const isValidSlash = true; // allow slash anywhere to support IME typing
      
      if (isValidSlash) {
        const range = {
          from: slashPos,
          to: $from.pos,
        };

        setSlashRange(range);
        
        // Compute panel position for slash
        const coords = editor.view.coordsAtPos(slashPos);
        openMenu({ x: coords.left, y: coords.bottom + 8 }, query);
        
        return true;
      }
    }
    
    return false;
  }, [editor, openMenu]);

  // Remove slash text from editor
  const removeSlashText = useCallback(() => {
    if (!editor || !slashRange) return;
    
    const { from, to } = slashRange;
    editor.chain().focus().deleteRange({ from, to }).run();
    setSlashRange(null);
  }, [editor, slashRange]);

  // Update query text after slash in the editor
  const updateSlashQuery = useCallback((newQuery: string) => {
    if (!editor || !slashRange) return;
    
    const { from } = slashRange;
    const safeQuery = sanitizeQuery(newQuery);
    const newTo = from + 1 + safeQuery.length; // '/' + safe query length
    
    editor.chain().focus().deleteRange({ from, to: slashRange.to }).insertContentAt(from, `/${safeQuery}`).run();
    setSlashRange({ from, to: newTo });
    setSearchQuery(safeQuery);
  }, [editor, slashRange, sanitizeQuery]);

  // Observe editor updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      // Detect slash command
      const detected = detectSlashCommand();
      
      // Close panel if no slash is detected
      if (!detected && isMenuOpen) {
        closeMenu();
      }
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    // Track IME composition on editor DOM to avoid intercepting commits
    const dom = editor.view.dom;
    const onCompositionStart = () => { isComposingRef.current = true; };
    const onCompositionEnd = () => { 
      // small grace period could be added if needed
      isComposingRef.current = false; 
    };
    dom.addEventListener('compositionstart', onCompositionStart, true);
    dom.addEventListener('compositionend', onCompositionEnd, true);

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
      dom.removeEventListener('compositionstart', onCompositionStart, true);
      dom.removeEventListener('compositionend', onCompositionEnd, true);
    };
  }, [editor, detectSlashCommand, isMenuOpen, closeMenu]);

  // Intercept editor keydown while the menu is open
  useEffect(() => {
    if (!editor) return;

    const onKeydown = (event: KeyboardEvent) => {
      if (isMenuOpen) {
        const interceptKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'];
        if (interceptKeys.includes(event.key)) {
          // During IME composition, do not intercept Enter/Arrow to allow committing candidates
          if (isComposingRef.current && event.key !== 'Escape') {
            return;
          }
          event.stopPropagation();
        }
      }
    };

    const dom = editor.view.dom;
    dom.addEventListener('keydown', onKeydown, true);
    return () => {
      dom.removeEventListener('keydown', onKeydown, true);
    };
  }, [editor, isMenuOpen]);


  return {
    isMenuOpen,
    menuPosition,
    searchQuery,
    openMenu,
    closeMenu,
    removeSlashText,
    updateSlashQuery,
    slashRange,
  };
};
