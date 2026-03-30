// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\components\TemplateForm.tsx

import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TemplateField } from "../templates";

interface TemplateFormProps {
  fields: TemplateField[];
  formData: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

/** Render a single field input */
const FieldInput = ({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (name: string, value: string) => void;
}) => {
  if (field.type === "textarea") {
    return (
      <Textarea
        id={field.name}
        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="min-h-[90px] resize-y focus-visible:ring-primary text-sm"
        required={field.required}
      />
    );
  }

  if (field.type === "date") {
    return (
      <Input
        id={field.name}
        type="date"
        value={value}
        onChange={(e) => onChange(field.name, e.target.value)}
        className="focus-visible:ring-primary text-sm"
        required={field.required}
      />
    );
  }

  return (
    <Input
      id={field.name}
      type="text"
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
      value={value}
      onChange={(e) => onChange(field.name, e.target.value)}
      className="focus-visible:ring-primary text-sm"
      required={field.required}
    />
  );
};

export const TemplateForm = ({ fields, formData, onChange }: TemplateFormProps) => {
  // Auto-fill today's date for all empty date fields on mount
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    fields.forEach((f) => {
      if (f.type === "date" && !formData[f.name]) {
        onChange(f.name, today);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build ordered map of groups → fields
  const groupMap: Map<string, TemplateField[]> = new Map();
  const UNGROUPED = "__ungrouped__";

  fields.forEach((field) => {
    const key = field.group ?? UNGROUPED;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(field);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-md md:text-lg font-bold tracking-tight">Structured Inputs</h3>
        <p className="text-[10px] md:text-xs text-muted-foreground uppercase tracking-widest">
          Fill details to populate the template
        </p>
      </div>

      {Array.from(groupMap.entries()).map(([groupName, groupFields]) => (
        <div key={groupName} className="space-y-4">
          {/* Section header – only shown for named groups */}
          {groupName !== UNGROUPED && (
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 border-primary/40 text-primary">
                {groupName}
              </Badge>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <div className="space-y-4">
            {groupFields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}{" "}
                  {field.required && <span className="text-destructive">*</span>}
                </Label>
                <FieldInput
                  field={field}
                  value={formData[field.name] || ""}
                  onChange={onChange}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
