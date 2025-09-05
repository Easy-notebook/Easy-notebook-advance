import { Extension } from '@tiptap/core';

interface SlashCommandOptions {
  onSlashDetected?: (query: string) => void;
}

export const SlashCommandExtension = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onSlashDetected: () => {},
    };
  },

  addKeyboardShortcuts() {
    return {
      '/': ({ editor }) => {
        // Simple slash detection
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check text before the cursor
        const textBefore = $from.parent.textBetween(0, $from.parentOffset);
        const isAtStart = $from.parentOffset === 0;
        const isAfterSpace = textBefore.endsWith(' ');

        if (isAtStart || isAfterSpace) {
          // Insert a slash
          editor.commands.insertContent('/');

          // Notify external handler that a slash was detected
          setTimeout(() => {
            this.options.onSlashDetected?.('');
          }, 100);

          return true;
        }

        return false;
      },
    };
  },
});

export default SlashCommandExtension;
