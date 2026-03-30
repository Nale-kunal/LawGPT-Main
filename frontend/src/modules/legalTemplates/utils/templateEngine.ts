// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\utils\templateEngine.ts

/**
 * Replaces placeholders like {{field_name}} in a template string with values from formData.
 * @param template The template string with placeholders
 * @param formData Object containing field values
 * @returns Processed string with replaced values
 */
export function generateDocument(template: string, formData: Record<string, string>): string {
  let processed = template;
  
  // Find all matches for {{variable_name}}
  const regex = /{{(.*?)}}/g;
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const fullMatch = match[0];
    const fieldName = match[1].trim();
    const value = formData[fieldName] || `[${fieldName.replace(/_/g, ' ')}]`;
    
    // Use replaceAll to replace all occurrences of the same placeholder
    processed = processed.split(fullMatch).join(value);
  }
  
  return processed;
}

/**
 * Strips HTML tags from a string for plain text export
 */
export function stripHtml(html: string): string {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
