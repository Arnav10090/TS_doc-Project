import React, { createContext, useContext } from 'react';

interface EditorContextType {
  refreshSections: () => Promise<void>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode; refreshSections: () => Promise<void> }> = ({
  children,
  refreshSections,
}) => {
  return (
    <EditorContext.Provider value={{ refreshSections }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};
