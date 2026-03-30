// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\pages\TemplateWorkspace.tsx

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Download, Copy, Check, FileText } from "lucide-react";
import { TemplateForm } from "../components/TemplateForm";
import { TemplateEditor } from "../components/TemplateEditor";
import { ALL_TEMPLATES, LegalTemplate } from "../templates";
import { generateDocument } from "../utils/templateEngine";
import { toast } from "sonner";
import api from "@/lib/api";
import { saveAs } from 'file-saver';
import { asBlob } from 'html-docx-js-typescript';

const TemplateWorkspace = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateIdFromUrl = searchParams.get("templateId");

  const [template, setTemplate] = useState<LegalTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editorContent, setEditorContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [docId, setDocId] = useState<string | null>(id === 'new' ? null : id || null);

  // Initialize workspace
  useEffect(() => {
    const init = async () => {
      if (id === 'new' && templateIdFromUrl) {
        // New document from template
        const selectedTemplate = ALL_TEMPLATES.find(t => t.id === templateIdFromUrl);
        if (selectedTemplate) {
          setTemplate(selectedTemplate);
          // Initial content
          setEditorContent(generateDocument(selectedTemplate.template, {}));
        }
      } else if (id && id !== 'new') {
        // Loading existing draft
        try {
          const draft = await api.get<any>(`/api/v1/templates/${id}`);
          const selectedTemplate = ALL_TEMPLATES.find(t => t.id === draft.templateId);
          if (selectedTemplate) {
            setTemplate(selectedTemplate);
            setFormData(draft.filledData || {});
            setEditorContent(draft.finalHTML);
            setDocId(draft._id);
          }
        } catch (error) {
          toast.error("Failed to load draft");
          navigate("/dashboard/templates");
        }
      }
    };
    init();
  }, [id, templateIdFromUrl, navigate]);

  // Handle form changes - update editor content (one-way sync)
  const handleFormChange = (name: string, value: string) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    
    if (template) {
      const newContent = generateDocument(template.template, newFormData);
      setEditorContent(newContent);
    }
  };

  const handleEditorChange = (content: string) => {
    setEditorContent(content);
  };

  const handleSave = async () => {
    if (!template) return;
    setIsSaving(true);
    try {
      const payload = {
        templateId: template.id,
        templateName: template.name,
        filledData: formData,
        finalHTML: editorContent,
        status: 'draft'
      };

      if (docId) {
        await api.put(`/api/v1/templates/${docId}`, payload);
      } else {
        const response = await api.post<any>('/api/v1/templates', payload);
        setDocId(response._id);
        // Correct the URL without reloading
        window.history.replaceState(null, '', `/dashboard/templates/${response._id}`);
      }
      toast.success("Saved successfully");
    } catch (error) {
      toast.error("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    // Strip HTML for cleaner copy
    const plainText = editorContent.replace(/<[^>]*>?/gm, '');
    navigator.clipboard.writeText(plainText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    toast.success("Document text copied to clipboard");
  };

  const handleDownloadDocx = async () => {
    try {
      // Add standard HTML wrapping for docx conversion if needed
      const htmlString = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${template?.name || 'Document'}</title>
          </head>
          <body>
            ${editorContent}
          </body>
        </html>
      `;
      
      const blobData = await asBlob(htmlString);
      const blob = blobData instanceof Blob ? blobData : new Blob([blobData as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      saveAs(blob, `${template?.name || 'Document'}_${new Date().toLocaleDateString()}.docx`);
      toast.success("Download started");
    } catch (error) {
       console.error("Docx generation failed", error);
       toast.error("Download failed");
    }
  };

  if (!template) return <div className="p-20 text-center animate-pulse">Loading Workspace...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/templates")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {template.name}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{template.category} Template</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={handleCopy}>
            {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {isCopied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadDocx}>
            <Download className="h-4 w-4 mr-2" />
            Download .docx
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>
        </div>
      </div>

      {/* Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Left: Form Inputs */}
        <div className="w-1/3 min-w-[300px] overflow-y-auto pr-4 border-r">
          <TemplateForm 
            fields={template.fields} 
            formData={formData} 
            onChange={handleFormChange} 
          />
        </div>

        {/* Right: Word-like Editor */}
        <div className="flex-1 overflow-hidden">
          <TemplateEditor 
            value={editorContent} 
            onChange={handleEditorChange} 
          />
        </div>
      </div>
      
      <div className="mt-auto py-2 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
        <span>© 2026 Juriq</span>
        <span className="h-1 w-1 bg-muted-foreground rounded-full"></span>
        <span className="italic">This is a draft template. Please review before use.</span>
      </div>
    </div>
  );
};

export default TemplateWorkspace;
