'use client';

import { useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  language: string;
  theme: 'light' | 'dark';
  value: string;
  onChange: (value: string | undefined) => void;
  height?: string;
}

export default function CodeEditor({ language, theme, value, onChange, height = '500px' }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    setIsLoading(false);
  };

  return (
    <div className="border border-[#e5e5e5] dark:border-[#3d3d3d] rounded-lg overflow-hidden relative bg-white dark:bg-[#1e1e1e] shadow-sm" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-[#fafafa] dark:bg-[#1e1e1e] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffa116] mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading editor...</p>
          </div>
        </div>
      )}
      <Editor
        height={height}
        language={language}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex items-center justify-center h-full bg-[#fafafa] dark:bg-[#1e1e1e]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#ffa116] mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading editor...</p>
            </div>
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          wordWrap: 'on',
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  );
}

