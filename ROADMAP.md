# Juriq Product Roadmap

This document outlines the Juriq development roadmap. Items are organized by quarter and subject to change based on user feedback and business priorities.

> 📅 Last updated: May 2026 | Current version: 1.5.0

---

## ✅ Completed (v1.0 – v1.5)

- [x] Core practice management (cases, clients, hearings, invoices)
- [x] Document management with Cloudinary
- [x] JWT + CSRF + TOTP 2FA + Google OAuth authentication
- [x] Redis-backed rate limiting with IP escalation
- [x] BullMQ background workers (email, admin, cleanup)
- [x] Razorpay subscription lifecycle + webhook processing
- [x] Legal research engine (full-text + semantic search)
- [x] AI explanation layer for legal search results
- [x] Legal ingestion pipeline (eCourts, IndiaCode, Supreme Court)
- [x] Legal templates module (civil + corporate)
- [x] Case notes with Cloudinary media attachments
- [x] Onboarding wizard
- [x] Plan enforcement + feature gating
- [x] Coupon system
- [x] Settlement tracking + payment reconciliation
- [x] Prometheus metrics + Sentry error tracking
- [x] Kubernetes deployment manifests
- [x] Enterprise repository structure (pnpm workspaces + Turborepo)

---

## 🚧 In Progress (Q2 2026)

### Backend
- [ ] GraphQL API layer (alongside REST) for complex queries
- [ ] OpenAPI 3.0 spec generation with Swagger UI (`/api/v1/docs`)
- [ ] Webhook delivery retry with exponential backoff
- [ ] Advanced rate limit analytics dashboard
- [ ] Redis Cluster support for high availability

### Frontend
- [ ] Progressive Web App (PWA) with offline support
- [ ] Accessibility audit (WCAG 2.1 AA compliance)
- [ ] Dark mode persistence across devices
- [ ] Rich analytics dashboard (case outcomes, revenue charts, time tracking)
- [ ] Drag-and-drop document organization

### Infrastructure
- [ ] Helm charts for Kubernetes deployment
- [ ] GitHub Actions deployment automation (Railway + Vercel)
- [ ] Multi-region MongoDB Atlas configuration
- [ ] Automated database backup verification

---

## 📋 Planned (Q3 2026)

### Mobile
- [ ] **Flutter Mobile App** (iOS + Android)
  - Full feature parity with web app
  - Push notifications for hearing alerts
  - Offline case browsing
  - Document scanning via camera

### Integrations
- [ ] **WhatsApp Notifications** via Twilio or Meta Business API
  - Hearing reminders to clients
  - Invoice delivery
  - Case status updates
- [ ] **eCourts API Integration** — direct case status sync from National Judicial Data Grid
- [ ] **DigiLocker Integration** — seamless document fetching for KYC
- [ ] **GST e-Invoice API** — generate GST-compliant invoices automatically

### AI / Legal Intelligence
- [ ] **Case Outcome Predictor** — ML model trained on Indian court decisions
- [ ] **Contract Analysis** — AI-powered clause extraction and risk flagging
- [ ] **Legal Brief Generator** — AI-assisted draft generation from case facts
- [ ] **Citation Graph** — Visualize how statutes and cases reference each other

### Collaboration
- [ ] **Multi-user Firm Accounts** — role-based team access (Partner, Associate, Paralegal, Clerk)
- [ ] **Client Portal** — secure client-facing portal for case tracking + document sharing
- [ ] **Real-time Collaboration** — simultaneous document editing (WebSocket-powered)

---

## 🔮 Future (Q4 2026 and beyond)

### Enterprise Features
- [ ] **White-label Support** — custom branding for large law firms
- [ ] **SSO Integration** — SAML 2.0 / OIDC for enterprise firms
- [ ] **Advanced RBAC** — granular permission matrix per resource
- [ ] **Audit Report Export** — compliance-grade audit trail export to PDF/Excel
- [ ] **Data Residency** — India-only data hosting option for data sovereignty compliance

### Legal Ecosystem
- [ ] **Bar Council Integration** — verify advocate enrollment numbers
- [ ] **e-Stamp Paper** — generate stamp paper for agreements via integration
- [ ] **District Court Calendars** — auto-import hearing dates from court websites
- [ ] **Legal Aid Portal** — connect advocates with Legal Services Authority cases

### Platform
- [ ] **Juriq API** — public API for third-party integrations (legal tech ecosystem)
- [ ] **Marketplace** — legal templates marketplace for community-contributed templates
- [ ] **Chrome Extension** — one-click case filing and research assistant

---

## 🗳️ Community Requests

Vote for features on our [Discussions page](https://github.com/Nale-kunal/juriq/discussions/categories/ideas).

Top requested:
1. Court date auto-sync from eCourts NJDG
2. WhatsApp reminders for clients
3. GST invoice generation
4. Mobile app
5. Multi-user firm support

---

## Contributing to the Roadmap

Have ideas? We'd love to hear from you:
1. Open a [Feature Request issue](.github/ISSUE_TEMPLATE/feature_request.yml)
2. Start a [Discussion](https://github.com/Nale-kunal/juriq/discussions)
3. Email: product@juriq.in

---

*This roadmap is a living document and priorities may shift based on user feedback, technical feasibility, and business needs.*
