# Changelog

All notable changes to Juriq are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Flutter mobile application (iOS + Android)
- WhatsApp notification integration
- High Court e-Filing integration
- Advanced analytics dashboard

---

## [1.5.0] — 2026-05-11

### Added
- **Enterprise Repository Reorganization**: Full professional monorepo structure with pnpm workspaces, Turborepo, and shared packages
- **Shared Packages**: `shared-types`, `shared-utils`, `eslint-config`, `tsconfig` packages
- **GitHub Actions**: Additional CI workflows — security scanning (CodeQL), dependency audit, deploy workflows
- **GitHub Templates**: Issue templates (bug report, feature request), PR template
- **Developer Tooling**: Husky pre-commit hooks, lint-staged, commitlint, Prettier, EditorConfig
- **Documentation**: Full `docs/` tree with architecture, API, database, deployment, and security docs
- **Docker Compose**: Enhanced with Redis and MongoDB local services + health checks
- **Infrastructure**: Prometheus + Alertmanager monitoring configurations, Redis and MongoDB configs
- `ARCHITECTURE.md`, `SECURITY.md`, `CONTRIBUTING.md`, `ROADMAP.md`, `CODE_OF_CONDUCT.md`
- Root `.env.example` with full-stack variable documentation

### Changed
- `README.md`: Complete rewrite with badges, feature tables, architecture diagram, full tech stack

---

## [1.4.0] — 2026-05-07

### Added
- **Settlement Tracking**: Real-time Razorpay settlement reconciliation with `SettlementLog` model
- **Refund Idempotency**: Redis-locked refund operations prevent duplicate processing
- **Business Metrics**: Prometheus business KPI counters (signups, subscriptions, revenue)
- **SIGHUP Key Rotation**: Hot-reload Razorpay keys without server restart
- **Admin Payment Routes**: `/api/v1/admin/payment` — refunds, settlement logs, subscription management
- **Backup Service**: Automated backup scheduling with restore capability (`restoreBackup.mjs`)
- **Payment Reconciliation**: `reconciliation.js` cron service for detecting mismatches

### Fixed
- Auth redirect loop: sessionStorage circuit breaker prevents infinite redirect on refresh token failure
- Subscription cache bleed: PlanContext cache now keyed by `userId` to prevent cross-account leakage

---

## [1.3.0] — 2026-05-02

### Added
- **Subscription Lifecycle**: Full Razorpay subscription management (create, upgrade, cancel, pause)
- **Webhook Processing**: HMAC-verified Razorpay webhook handler with event deduplication
- **Coupon System**: Coupon validation, usage limits, and per-user enforcement
- **Plan Enforcement Middleware**: `checkPlanAccess.js` + `requirePlan.js` for feature gating
- **AccessDeniedOverlay**: Frontend upgrade prompt for plan-restricted features
- **FeatureGate**: React component for conditional feature rendering based on plan
- `CouponUsageLog`, `RefundLog`, `SettlementLog`, `PaymentInvoice` models

### Changed
- Dashboard layout: removed "Quick Actions", added sidebar "Today's Hearings", mini calendar in main area
- Recent Activity moved to lazy-loaded popup modal

---

## [1.2.0] — 2026-04-30

### Added
- **Case Notes Media**: Cloudinary-backed file attachments on case notes with rich preview rendering
- `NoteAttachmentUploader`, `NoteAttachmentViewer` components
- `noteAttachments` route and media upload endpoint

### Fixed
- CSRF rejection on XHR note attachment uploads — fixed auth headers in upload logic

---

## [1.1.0] — 2026-04-21

### Added
- **Legal Templates Module**: Civil and corporate document templates with variable substitution engine
- `legalTemplates` module with `TemplateCard`, `TemplateEditor`, `TemplateForm` components
- Phase 3 Civil and Corporate templates
- **Semantic Search**: Embedding-based legal search with AI explanations
- `embeddingService.js`, `semanticSearchService.js`, `vectorStore.js`, `aiExplanationService.js`
- **Legal Ingestion Pipeline**: eCourts, IndiaCode, Supreme Court data ingestors
- **Onboarding System**: Multi-step wizard (`OnboardingOverlay`, `OnboardingWizard`)

### Changed
- Legal Research page enhanced with semantic search and AI explanations

---

## [1.0.0] — 2026-04-12

### Added
- **Initial Production Release**
- Case management with full lifecycle tracking
- Client management with portal landing pages
- Calendar with hearing scheduling and conflict detection
- Document management with Cloudinary storage and folder organization
- Invoice generation and time tracking
- Alert system for hearing deadlines
- JWT authentication with HttpOnly cookies + CSRF
- Google OAuth integration
- TOTP 2FA with QR code generation
- Security questions for account recovery
- Account lockout and abuse detection
- Redis-backed rate limiting with IP escalation
- BullMQ workers: email, admin, cleanup
- Prometheus metrics endpoint
- Sentry error tracking
- Structured Pino logging
- MongoDB Atlas with performance-optimized indexes
- Kubernetes deployment manifests
- Docker Compose configuration
- GitHub Actions CI/CD pipeline

[Unreleased]: https://github.com/Nale-kunal/juriq/compare/v1.5.0...HEAD
[1.5.0]: https://github.com/Nale-kunal/juriq/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/Nale-kunal/juriq/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/Nale-kunal/juriq/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/Nale-kunal/juriq/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/Nale-kunal/juriq/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Nale-kunal/juriq/releases/tag/v1.0.0
