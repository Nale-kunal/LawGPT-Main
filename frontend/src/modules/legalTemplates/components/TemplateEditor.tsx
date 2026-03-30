// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\components\TemplateEditor.tsx

import React, { useEffect, useRef } from "react";
// Import ReactQuill from the modern, maintained fork
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface TemplateEditorProps {
  value: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

export const TemplateEditor = ({ value, onChange, readOnly = false }: TemplateEditorProps) => {
  const quillRef = useRef<ReactQuill>(null);

  // Custom toolbar options to make it look more professional
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-lg border overflow-hidden">
      {/* Scrollable container for the 'paper' */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-muted/30">
        <div className="w-full max-w-[850px] bg-white shadow-2xl min-h-[1100px] p-[0.75in] border border-gray-300 office-document relative">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={onChange}
            modules={modules}
            readOnly={readOnly}
            className="h-full border-none text-gray-900"
            placeholder="Start drafting your document..."
          />
        </div>
      </div>
      
      <style>{`
        /* Force dark text regardless of app theme */
        .office-document .ql-editor {
          color: #1a1a1a !important;
          background-color: white !important;
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.6;
          padding: 0 !important;
          min-height: 1000px;
          text-align: justify;
        }
        
        .office-document .ql-container.ql-snow {
          border: none !important;
        }

        /* Toolbar styling - visible in dark and light modes */
        .ql-toolbar.ql-snow {
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          background: white !important;
          color: #333 !important;
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          flex-wrap: wrap;
          padding: 8px !important;
        }
        
        .ql-snow .ql-stroke {
          stroke: #444 !important;
        }
        
        .ql-snow .ql-fill {
          fill: #444 !important;
        }
        
        .ql-snow .ql-picker {
          color: #444 !important;
        }

        /* Paper shadow and edge */
        .office-document {
          box-shadow: 0 0 20px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.05);
          transition: transform 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default TemplateEditor;
