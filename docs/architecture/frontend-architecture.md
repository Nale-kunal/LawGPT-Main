# Frontend Architecture

## Technology Stack

- **React 18** with Vite 7 (SWC compiler)
- **TypeScript 5.x** strict mode
- **React Router 6** with lazy-loaded routes
- **Tailwind CSS** + Radix UI primitives (shadcn/ui component library)
- **TanStack Query** for server state
- **React Hook Form** + Zod for form management
- **Axios** for HTTP (centralized in `lib/api.ts`)

## Directory Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── auth/            # RequireAuth, PublicOnlyRoute
│   ├── landing/         # DashMockup, FAQ, Landing icons
│   ├── layout/          # DashboardLayout, Header, Sidebar, NotificationDropdown
│   ├── onboarding/      # OnboardingOverlay, OnboardingWizard
│   ├── subscription/    # FeatureGate, AccessDeniedOverlay, UpgradePlanButton
│   └── ui/              # shadcn/ui components (60+ components)
├── contexts/            # React Context providers
│   ├── AuthContext.tsx   # Auth state, login/logout, token refresh
│   ├── PlanContext.tsx   # Subscription plan state (userId-scoped cache)
│   ├── ThemeContext.tsx  # Dark/light theme
│   ├── LegalDataContext.tsx  # Legal data state
│   ├── FormattingContext.tsx  # Formatting preferences
│   └── PreferencesContext.tsx # User preferences
├── hooks/               # Custom React hooks
│   ├── useCSRF.ts       # CSRF token management
│   ├── usePlanAccess.ts # Plan feature checks
│   ├── useCaseLimit.ts  # Case count limit checks
│   └── useFormAutoSave.ts # Auto-save form data
├── lib/                 # Utility libraries
│   ├── api.ts           # Axios instance with interceptors
│   ├── utils.ts         # cn() helper, misc utilities
│   ├── formatters.ts    # Date/number formatters
│   ├── sentry.ts        # Sentry initialization
│   └── export/          # PDF/Word export engine
├── modules/             # Feature modules
│   └── legalTemplates/  # Legal template system
├── pages/               # Route-level page components (30 pages)
└── services/            # API service layers
    ├── legalApi.ts      # Legal research API calls
    └── staticLegalData.ts # Static legal data
```

## Key Patterns

### Route Guards
- `RequireAuth` — redirects to /login if not authenticated
- `PublicOnlyRoute` — redirects to /dashboard if authenticated
- `FeatureGate` — shows AccessDeniedOverlay if feature is plan-restricted

### State Management
- Server state: TanStack Query (caching, refetching, background updates)
- Auth state: AuthContext (login, logout, user, token refresh)
- Plan state: PlanContext (current plan, feature checks, userId-scoped cache)
- Theme state: ThemeContext (dark/light/system)
- Local UI state: React useState/useReducer within components

### API Layer
- `lib/api.ts` creates an Axios instance with:
  - Base URL from `VITE_API_URL`
  - `withCredentials: true` (cookie transport)
  - CSRF token header injection
  - 401 interceptor for silent token refresh
  - Request ID header injection
