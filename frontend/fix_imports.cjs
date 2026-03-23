const fs = require('fs');
const path = require('path');

const filesToFix = [
    {
        path: 'src/components/layout/NotificationDropdown.tsx',
        fixes: [
            {
                search: /import type \{ Notification, Alert \} from '@\/contexts\/LegalDataContext';\s*import \{ useLegalData \} from '@\/contexts\/LegalDataContext';/m,
                replace: "import { useLegalData, type Notification, type Alert } from '@/contexts/LegalDataContext';"
            }
        ]
    },
    {
        path: 'src/components/ui/form.tsx',
        fixes: [
            {
                search: /import \* as React from "react";\s*import \{ Controller, ControllerProps, FieldValues, FormProvider, useFormContext, useFormState \} from "react-hook-form";/m,
                replace: 'import * as React from "react";\nimport { Controller, type ControllerProps, type FieldValues, FormProvider, useFormContext, useFormState } from "react-hook-form";'
            }
        ]
    },
    {
        path: 'src/components/ui/pagination.tsx',
        fixes: [
            {
                search: /import \{ Button, ButtonProps \} from "@\/components\/ui\/button";/m,
                replace: 'import { Button, type ButtonProps } from "@/components/ui/button";'
            }
        ]
    },
    {
        path: 'src/components/ui/sidebar.tsx',
        fixes: [
            {
                search: /import \{ VariantProps \} from "class-variance-authority";/m,
                replace: 'import { type VariantProps } from "class-variance-authority";'
            }
        ]
    },
    {
        path: 'src/contexts/AuthContext.tsx',
        fixes: [
            {
                search: /import \{ createContext, useContext, useEffect, useState \} from 'react';\s*import React from 'react';/m,
                replace: "import React, { createContext, useContext, useEffect, useState } from 'react';"
            }
        ]
    },
    {
        path: 'src/contexts/LegalDataContext.tsx',
        fixes: [
            {
                search: /import \{ createContext, useContext, useState, useEffect, useCallback \} from 'react';\s*import React from 'react';/m,
                replace: "import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';"
            }
        ]
    },
    {
        path: 'src/lib/export/export-engine.ts',
        fixes: [
            {
                search: /import \{ Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel \} from 'docx';\s*import \* as docx from 'docx';/m,
                replace: "import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';"
            }
        ]
    }
];

filesToFix.forEach(f => {
    const fullPath = path.resolve(__dirname, f.path);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        f.fixes.forEach(fix => {
            content = content.replace(fix.search, fix.replace);
        });
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed ${fullPath}`);
    } else {
        console.log(`File not found: ${fullPath}`);
    }
});
