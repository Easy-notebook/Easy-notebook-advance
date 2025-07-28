import React from 'react';
import TiptapNotebookEditor from '../../Editor/TiptapNotebookEditor';
import JupyterNotebookEditor from '../../Editor/JupyterNotebookEditor';
import { useSettings } from '../../../store/settingsStore';

interface CreateModeProps {
  className?: string;
  readOnly?: boolean;
}

/**
 * CreateMode component renders the notebook editor in "create" mode.
 * It decides which underlying editor (Tiptap or Jupyter-style) to show
 * based on the user's editor settings stored in the global settings store.
 */
const CreateMode: React.FC<CreateModeProps> = ({ 
  className = "",
  readOnly = false 
}) => {
  const settings = useSettings();
  
  // Determine which editor to render based on the current settings.
  const editorType = settings.editorSettings?.editorType || 'tiptap';
  
  if (editorType === 'tiptap') {
    // Render Tiptap-based notebook editor
    return (
      <div className={`w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto ${className}`}>
        <div className="h-10 w-full"></div>
        <div className="relative">
          <TiptapNotebookEditor
            className="w-full"
            placeholder="Start writing your notebook... Type ```python to create a code block"
            readOnly={readOnly}
          />
        </div>
        <div className="h-20 w-full"></div>
      </div>
    );
  } else {
    // Render Jupyter-style notebook editor
    return (
      <div className={`w-full max-w-screen-lg mx-auto px-8 lg:px-18 my-auto ${className}`}>
        <div className="h-10 w-full"></div>
        <div className="relative">
          <JupyterNotebookEditor
            className="w-full"
            placeholder="Start your notebook by adding cells..."
            readOnly={readOnly}
          />
        </div>
        <div className="h-20 w-full"></div>
      </div>
    );
  }
};

CreateMode.displayName = 'CreateMode';

export default CreateMode;