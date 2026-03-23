import os
import re

files_to_fix = [
    (r"f:\LAWGPT\LawGPT\frontend\src\components\AlertManager.tsx", "@/contexts/LegalDataContext"),
    (r"f:\LAWGPT\LawGPT\frontend\src\components\CaseConflictChecker.tsx", "@/contexts/LegalDataContext"),
    (r"f:\LAWGPT\LawGPT\frontend\src\components\layout\NotificationDropdown.tsx", "@/contexts/LegalDataContext"),
    (r"f:\LAWGPT\LawGPT\frontend\src\components\ui\form.tsx", "react-hook-form"),
    (r"f:\LAWGPT\LawGPT\frontend\src\components\ui\pagination.tsx", "@/components/ui/button"),
    (r"f:\LAWGPT\LawGPT\frontend\src\components\ui\sidebar.tsx", "class-variance-authority"),
    (r"f:\LAWGPT\LawGPT\frontend\src\contexts\AuthContext.tsx", "react"),
    (r"f:\LAWGPT\LawGPT\frontend\src\contexts\LegalDataContext.tsx", "react"),
    (r"f:\LAWGPT\LawGPT\frontend\src\lib\export\word-driver.ts", "docx"),
    (r"f:\LAWGPT\LawGPT\frontend\src\pages\Billing.tsx", "@/contexts/LegalDataContext"),
    (r"f:\LAWGPT\LawGPT\frontend\src\pages\Calendar.tsx", "@/contexts/LegalDataContext"),
]

def fix_file(file_path, module_name):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match: import type { ... } from 'module';
    # Or: import { ... } from 'module';
    # Or: import React, { ... } from 'module';
    
    # We want to find all imports from this module
    import_pattern = re.compile(rf"import\s+(?:type\s+)?(?:([\*\w\s,{{}}]+)\s+from\s+['\"]{re.escape(module_name)}['\"];?)", re.MULTILINE)
    
    matches = list(import_pattern.finditer(content))
    if len(matches) < 2:
        print(f"Found fewer than 2 imports for {module_name} in {os.path.basename(file_path)}")
        return

    # Extract all imported items
    all_items = []
    has_default = None
    
    # Special case for React default import if present
    for match in matches:
        text = match.group(0)
        # Check for default import like "React," or "* as React"
        default_match = re.search(r"import\s+(?:type\s+)?([\w\s\*]+),?\s*\{", text)
        if default_match:
            has_default = default_match.group(1).strip()
        
        # Check for * as ...
        star_match = re.search(r"import\s+(?:type\s+)?(\* as \w+)", text)
        if star_match:
            has_default = star_match.group(1).strip()

        # Extract items inside {}
        braces_match = re.search(r"\{([\s\w,]*)\}", text)
        if braces_match:
            items = [item.strip() for item in braces_match.group(1).split(',') if item.strip()]
            # If the import was a "import type", prefix items with "type " if they don't have it
            if "import type" in text:
                items = [f"type {item}" if not item.startswith("type ") else item for item in items]
            all_items.extend(items)
        elif not default_match and not star_match:
            # Maybe it's just a default import without braces? "import React from 'react'"
            single_default = re.search(rf"import\s+(?:type\s+)?([\w\*]+)\s+from\s+['\"]{re.escape(module_name)}['\"]", text)
            if single_default:
                has_default = single_default.group(1).strip()

    # Remove duplicates from all_items while preserving order (sort of)
    seen = set()
    unique_items = []
    for item in all_items:
        if item not in seen:
            unique_items.append(item)
            seen.add(item)
    
    # Construct the new import statement
    new_import = "import "
    if has_default:
        new_import += f"{has_default}, "
    
    new_import += "{ " + ", ".join(unique_items) + f" }} from '{module_name}';"
    
    # Replace all matches with the new import (we'll put it at the position of the first one)
    first_match = matches[0]
    new_content = content[:first_match.start()] + new_import
    
    last_end = first_match.end()
    for match in matches[1:]:
        # Add the text between imports
        new_content += content[last_end:match.start()]
        # Skip the duplicate import itself
        last_end = match.end()
    
    new_content += content[last_end:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"Fixed {os.path.basename(file_path)}")

for file_path, module in files_to_fix:
    fix_file(file_path, module)
