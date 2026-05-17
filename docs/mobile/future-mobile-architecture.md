# Future Mobile Architecture

## Target Stack
- **Framework**: Flutter 3.x (Dart)
- **State Management**: Riverpod 2.x
- **Navigation**: Go Router
- **HTTP**: Dio with interceptors
- **Local Storage**: Hive or Isar
- **Secure Storage**: flutter_secure_storage (Keychain/Keystore)
- **Payments**: razorpay_flutter
- **Auth**: Custom JWT + Google Sign-In SDK

## Architecture Pattern
```
lib/
├── core/
│   ├── api/           # Dio client, interceptors, error handling
│   ├── auth/          # Token storage, refresh logic
│   ├── di/            # Dependency injection (Riverpod providers)
│   └── theme/         # ThemeData definitions
├── features/
│   ├── auth/          # Login, Register, 2FA, Google SSO
│   ├── dashboard/     # Stats, quick actions
│   ├── cases/         # CRUD, conflict detection, notes
│   ├── calendar/      # Hearing scheduler, conflict view
│   ├── clients/       # Client management
│   ├── documents/     # Upload, browse, preview
│   ├── billing/       # Invoices, time entries
│   ├── legal_research/ # Search, acts, case laws
│   ├── settings/      # Profile, 2FA, preferences
│   └── subscription/  # Plans, upgrade, coupon
├── shared/
│   ├── models/        # DTOs matching backend schemas
│   ├── widgets/       # Reusable UI components
│   └── utils/         # Formatters, validators
└── main.dart
```

## Shared Backend
The **same** Express + MongoDB backend serves both web and mobile:

```
┌─────────────────────────────┐
│       Express Backend        │
│   /api/v1/* endpoints        │
│                              │
│  Cookie auth ←→ React web    │
│  Bearer auth ←→ Flutter app  │
└─────────────────────────────┘
```

## Migration Strategy
1. **Phase 0** (Current): Harden backend API contracts, add Bearer auth support
2. **Phase 1**: Scaffold Flutter project, implement auth + dashboard
3. **Phase 2**: Core features (cases, calendar, clients)
4. **Phase 3**: Advanced features (documents, billing, legal research)
5. **Phase 4**: Subscription + payments via razorpay_flutter
6. **Phase 5**: Polish, testing, App Store / Play Store submission
