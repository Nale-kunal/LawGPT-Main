// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\components\TemplateForm.tsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TemplateField } from "../templates";

interface TemplateFormProps {
  fields: TemplateField[];
  formData: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export const TemplateForm = ({ fields, formData, onChange }: TemplateFormProps) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-md md:text-lg font-bold tracking-tight">Structured Inputs</h3>
        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
          Fill details to populate template
        </p>
      </div>
      
      <div className="space-y-4">
        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            
            {field.type === "textarea" ? (
              <Textarea
                id={field.name}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                value={formData[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="min-h-[100px] resize-none focus-visible:ring-primary"
                required={field.required}
              />
            ) : field.type === "date" ? (
              <Input
                id={field.name}
                type="date"
                value={formData[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="focus-visible:ring-primary"
                required={field.required}
              />
            ) : (
              <Input
                id={field.name}
                type="text"
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                value={formData[field.name] || ""}
                onChange={(e) => onChange(field.name, e.target.value)}
                className="focus-visible:ring-primary"
                required={field.required}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
