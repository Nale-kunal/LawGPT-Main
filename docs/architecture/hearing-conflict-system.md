# Hearing Conflict System

## Overview

Juriq automatically detects scheduling conflicts when creating or updating hearings, alerting lawyers to overlapping court appearances.

## Conflict Detection Logic (`conflictDetection.js`)

When a hearing is created/updated, the system queries for overlapping hearings:

```
Find all hearings WHERE:
  - ownerId = current user
  - date overlaps with new hearing date
  - hearingId ≠ current hearing (for updates)
  - status ≠ "cancelled"
```

## Conflict Response

If conflicts are detected, the API response includes:
```json
{
  "hearing": { ... },
  "conflicts": [
    {
      "hearingId": "...",
      "caseTitle": "...",
      "court": "...",
      "date": "...",
      "time": "..."
    }
  ]
}
```

## Frontend Components

- `CaseConflictChecker.tsx` — Pre-check conflicts before case creation
- `ConflictDialog.tsx` — Modal showing detected conflicts with resolution options
- `HearingPipelinePanel.tsx` — Hearing workflow with conflict awareness
- `Calendar.tsx` — Visual calendar with conflict highlighting

## Future Enhancements

- Auto-suggest alternative time slots
- Court-specific working hours validation
- Cross-firm conflict detection (for multi-user firms)
- Integration with eCourts for court schedule awareness
