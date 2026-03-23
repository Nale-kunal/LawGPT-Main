import os

file_path = r"f:\LAWGPT\LawGPT\frontend\src\components\CaseNotesPanel.tsx"

# Read as Windows-1252
with open(file_path, 'r', encoding='windows-1252') as f:
    content = f.read()

# Fixes
content = content.replace("import { getApiUrl, apiFetch, apiRequest } from '@/lib/api';", "import { getApiUrl, apiRequest } from '@/lib/api';")
content = content.replace("Maximize2, Minimize2, Minus, Download, FileSpreadsheet, FileJson,", "Maximize2, Minus, Download, FileSpreadsheet,")
content = content.replace("caseId,\n    hearings,", "_caseId,\n    hearings,")
content = content.replace("onSubmit: (data: any) => Promise<void>;", "onSubmit: (data: unknown) => Promise<void>;")
content = content.replace("console.log('[AddNoteModal] Submitting note data:', {", "// console.log('[AddNoteModal] Submitting note data:', {")
content = content.replace("const [isFullscreen, setIsFullscreen] = useState(false);", "const [isFullscreen] = useState(false);")
content = content.replace("}, [isOpen, caseId, filterType, filterHearing, defaultHearingId]);", "}, [isOpen, caseId, filterType, filterHearing, defaultHearingId, fetchNotes]);")
content = content.replace("}, [notes, detailNote?._id]);", "}, [notes, detailNote, detailNote?._id]);")
content = content.replace("const handleSaveNote = async (data: any) => {", "const handleSaveNote = async (data: any) => {")
content = content.replace("console.log(`[CaseNotesPanel] Saving note. Method: ${method}, Type: ${data.noteType}`);", "// console.log(`[CaseNotesPanel] Saving note. Method: ${method}, Type: ${data.noteType}`);")
content = content.replace("} catch (error) {", "} catch (_error) {")
content = content.replace("const onDrag = (_e: any, data: { x: number; y: number }) => setPosition({ x: data.x, y: data.y });", "const onDrag = (_e: unknown, data: { x: number; y: number }) => setPosition({ x: data.x, y: data.y });")
content = content.replace("const onStop = (_e: any, data: { x: number; y: number }) => {", "const onStop = (_e: unknown, data: { x: number; y: number }) => {")
content = content.replace("}, [isFullscreen, isMinimized, inline]);", "}, [isFullscreen, isMinimized, inline, onStop, position]);")

# Write back as UTF-8
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed and converted CaseNotesPanel.tsx to UTF-8")
