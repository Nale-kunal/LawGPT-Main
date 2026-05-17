<div align="center">
  <img src="frontend/public/logo.png" alt="Juriq Logo" width="120" />
  <h1>Juriq</h1>
  <p><strong>Enterprise Legal Practice Management SaaS for Indian Lawyers</strong></p>

  [![CI](https://github.com/Nale-kunal/juriq/actions/workflows/ci.yml/badge.svg)](https://github.com/Nale-kunal/juriq/actions/workflows/ci.yml)
  [![Security Audit](https://github.com/Nale-kunal/juriq/actions/workflows/security.yml/badge.svg)](https://github.com/Nale-kunal/juriq/actions/workflows/security.yml)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
  [![pnpm](https://img.shields.io/badge/pnpm-9+-orange.svg)](https://pnpm.io)

  [Live Demo](https://juriq.in) · [API Docs](docs/api/endpoints.md) · [Architecture](ARCHITECTURE.md) · [Contributing](CONTRIBUTING.md)
</div>

---

## What is Juriq?

**Juriq** is a production-grade **Legal Practice Management SaaS platform** purpose-built for Indian advocates, law firms, and legal professionals. It digitalizes and streamlines every facet of a legal practice — from case and client management to AI-powered legal research, subscription billing, and document generation.

> Built by engineers who understand that Indian lawyers deserve the same quality of tooling as their international counterparts.

---

## ✨ Feature Highlights

### Core Practice Management
| Feature | Description |
|---------|-------------|
| 🗂️ **Case Management** | Full lifecycle tracking — filing, hearings, judgments, status updates |
| 👥 **Client Management** | Client profiles, portal landing pages, communication history |
| 📅 **Calendar & Hearings** | Smart scheduling with conflict detection across courts |
| 📄 **Document Management** | Cloudinary-powered storage with folder organization and search |
| 🧾 **Invoicing & Billing** | Generate, send, and track legal invoices with time entries |
| ⏱️ **Time Tracking** | Billable hour logging per case with rate configuration |

### Intelligence & Research
| Feature | Description |
|---------|-------------|
| ⚖️ **Legal Research Engine** | Full-text + semantic search across Indian statutes, case laws, and sections |
| 🤖 **AI-Powered Explanations** | Embedding-based semantic search with AI explanations |
| 📰 **Legal News** | Curated Indian legal news feed with RSS ingestion |
| 📋 **Legal Templates** | Civil & corporate document templates with variable substitution |
| 🔍 **Conflict Checker** | Automated client and case conflict detection |

### Security & Compliance
| Feature | Description |
|---------|-------------|
| 🔐 **Multi-factor Auth** | JWT + refresh tokens + TOTP 2FA + Google OAuth |
| 🛡️ **CSRF Protection** | Double-submit cookie CSRF with SameSite enforcement |
| 🚦 **Rate Limiting** | Redis-backed, per-endpoint, IP-level rate limiting with escalation |
| 🔒 **Account Lockout** | Abuse detection with progressive lockout |
| 🔑 **Security Questions** | Secondary authentication layer for account recovery |
| 📊 **Audit Logging** | Immutable admin audit trail for all sensitive operations |

### Subscription & Payments
| Feature | Description |
|---------|-------------|
| 💳 **Razorpay Integration** | Full subscription lifecycle — create, upgrade, cancel, refund |
| 🪝 **Webhook Processing** | HMAC-verified webhook handler with idempotency |
| 🎟️ **Coupon System** | Coupon validation, usage tracking, and enforcement |
| 💰 **Settlement Tracking** | Real-time payment reconciliation and settlement logs |
| 📈 **Plan Enforcement** | Feature gating with per-plan limits (cases, storage, features) |

### Infrastructure & Observability
| Feature | Description |
|---------|-------------|
| 📊 **Prometheus Metrics** | Full HTTP request metrics, rate-limit counters, business KPIs |
| 🪲 **Sentry Integration** | Error tracking for both frontend and backend |
| 🔄 **BullMQ Workers** | Background email, cleanup, and admin job processing |
| 🗃️ **Redis Caching** | Rate limiting, session tokens, CSRF, plan caching |
| 💾 **MongoDB Atlas** | Indexed, multi-tenant MongoDB with performance-optimized queries |
| 🏥 **Health Checks** | `/health` + `/api/v1/health` endpoints with full service status |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Juriq Platform                                 │
├───────────────────┬────────────────────────┬────────────────────────────┤
│    Frontend        │      Backend API        │       Workers               │
│  React 18 + Vite  │  Node.js + Express 4   │  BullMQ (Email/Admin/GC)   │
│  TypeScript       │  Pino structured logs  │  Separate process / Dyno   │
│  Tailwind + Radix │  Sentry + Prometheus   │  Redis job queue           │
└────────┬──────────┴──────────┬─────────────┴──────────────┬─────────────┘
         │  HTTPS / REST API   │                             │
         └─────────────────────┘           Redis             │
                                      ┌────────────┐         │
                                      │   Redis    │◄────────┘
                                      │  (Cache,   │
                                      │  BullMQ,   │
                                      │  Sessions) │
                                      └────────────┘
                                      ┌────────────┐
                                      │  MongoDB   │
                                      │   Atlas    │
                                      │ (Primary   │
                                      │  Store)    │
                                      └────────────┘
                                      ┌────────────┐
                                      │ Cloudinary │
                                      │  (Docs,    │
                                      │  Media)    │
                                      └────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20.x | Runtime |
| pnpm | ≥ 9.x | Package manager |
| MongoDB Atlas | Any | Database (free M0 works) |
| Redis | ≥ 7.x | Caching + queues (optional for dev) |
| Cloudinary | Free tier | Document storage |

### 1. Clone & Install

```bash
git clone https://github.com/Nale-kunal/juriq.git
cd juriq

# Install pnpm if you don't have it
npm install -g pnpm@9

# Install all workspace dependencies
pnpm install
```

### 2. Configure Environment

```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# Root template (for reference)
cp .env.example .env.local
```

Key variables to configure in `backend/.env`:

```env
MONGODB_URI=mongodb+srv://...        # MongoDB Atlas connection string
JWT_SECRET=...                       # Min 64 chars (openssl rand -hex 64)
JWT_REFRESH_SECRET=...               # Different from JWT_SECRET
CLOUDINARY_CLOUD_NAME=...           # Cloudinary credentials
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
RAZORPAY_KEY_ID=rzp_test_...        # Razorpay test keys
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

### 3. Start Development Servers

```bash
# Option A: Start everything with turborepo
pnpm dev

# Option B: Start individually
pnpm dev:backend   # → http://localhost:5000
pnpm dev:frontend  # → http://localhost:5173
pnpm dev:workers   # → BullMQ workers (requires Redis)
```

### 4. Docker Setup (Recommended)

```bash
# Start full stack with Docker Compose (includes MongoDB + Redis)
pnpm docker:up

# View logs
pnpm docker:logs

# Stop everything
pnpm docker:down
```

---

## 📁 Project Structure

```
juriq/                              ← Repository root
├── backend/                        ← Node.js API server
│   ├── index.js                    ← Server entry point + middleware stack
│   ├── src/
│   │   ├── config/                 ← DB, Cloudinary, env validation, indexes
│   │   ├── controllers/            ← Route handler controllers
│   │   ├── jobs/                   ← node-cron scheduled jobs (legal, token cleanup)
│   │   ├── middleware/             ← Auth, CSRF, rate-limit, audit, RBAC
│   │   ├── models/                 ← 29 Mongoose models (User, Case, Payment…)
│   │   ├── routes/                 ← 23 Express route files
│   │   ├── services/               ← Business logic (payments, legal, search…)
│   │   ├── utils/                  ← Logger, Redis, mailer, encryption…
│   │   └── workers/                ← BullMQ workers (email, admin, cleanup)
│   ├── .env.example                ← Environment template
│   └── Dockerfile
│
├── frontend/                       ← React 18 + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/             ← UI components (shadcn/radix + custom)
│   │   ├── contexts/               ← React contexts (Auth, Plan, Theme…)
│   │   ├── hooks/                  ← Custom React hooks
│   │   ├── modules/                ← Feature modules (legalTemplates)
│   │   ├── pages/                  ← Route-level page components (30 pages)
│   │   └── services/               ← API client services
│   └── Dockerfile
│
├── packages/                       ← Shared workspace packages
│   ├── shared-types/               ← TypeScript types shared between apps
│   ├── shared-utils/               ← Utility functions shared between apps
│   ├── eslint-config/              ← Shared ESLint configuration
│   └── tsconfig/                   ← Shared TypeScript configurations
│
├── infrastructure/                 ← Infrastructure & deployment configs
│   ├── kubernetes/                 ← K8s deployment, service, HPA, ingress
│   ├── redis/                      ← Redis configuration
│   ├── mongodb/                    ← MongoDB configuration
│   ├── nginx/                      ← Nginx reverse proxy configuration
│   └── monitoring/                 ← Prometheus + Alertmanager configs
│
├── docs/                           ← Architecture & developer documentation
│   ├── architecture/               ← System design diagrams & explanations
│   ├── api/                        ← API reference documentation
│   ├── database/                   ← Schema, indexes, caching docs
│   ├── deployment/                 ← Platform-specific deployment guides
│   ├── security/                   ← Security architecture documentation
│   └── onboarding/                 ← Developer onboarding guides
│
├── .github/
│   ├── workflows/                  ← CI/CD + security workflows
│   ├── ISSUE_TEMPLATE/             ← Bug report and feature request templates
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docker-compose.yml              ← Production-like local environment
├── docker-compose.dev.yml          ← Development overrides
├── turbo.json                      ← Turborepo build pipeline
├── pnpm-workspace.yaml             ← pnpm workspace configuration
├── package.json                    ← Root workspace scripts
├── .prettierrc                     ← Code formatting
├── .editorconfig                   ← Editor settings
├── .commitlintrc.json              ← Commit message standards
├── ARCHITECTURE.md                 ← System architecture overview
├── SECURITY.md                     ← Security policy & disclosure
├── CONTRIBUTING.md                 ← Contribution guide
├── CHANGELOG.md                    ← Version history
├── ROADMAP.md                      ← Product roadmap
└── CODE_OF_CONDUCT.md              ← Community standards
```

---

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20 (ESM)
- **Framework**: Express 4 with structured middleware
- **Database**: MongoDB Atlas with Mongoose ODM (29 models)
- **Cache / Queue**: Redis + BullMQ (email, admin, cleanup workers)
- **Auth**: JWT + HttpOnly cookies + CSRF + TOTP 2FA + Google OAuth
- **Payments**: Razorpay (subscriptions, webhooks, refunds)
- **Storage**: Cloudinary (documents, media attachments)
- **Logging**: Pino (structured JSON)
- **Metrics**: Prometheus + prom-client
- **Error Tracking**: Sentry
- **Email**: SendGrid / SMTP (nodemailer)
- **Security**: Helmet, express-mongo-sanitize, express-rate-limit, xss

### Frontend
- **Framework**: React 18
- **Build**: Vite 7 + TypeScript 5
- **Routing**: React Router 6
- **UI**: Tailwind CSS + Radix UI (shadcn/ui)
- **State**: React Context + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Rich Text**: React Quill
- **Export**: jsPDF + docx (PDF & Word generation)
- **Error Tracking**: Sentry
- **Charts**: Recharts

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (K8s manifests in `infrastructure/kubernetes/`)
- **Reverse Proxy**: Nginx
- **CI/CD**: GitHub Actions
- **Deployment**: Railway (backend) + Vercel (frontend)

---

## 📊 API Overview

All API endpoints are versioned under `/api/v1/`. See [API Reference](docs/api/endpoints.md) for the full specification.

| Domain | Base Path | Auth Required |
|--------|-----------|---------------|
| Authentication | `/api/v1/auth` | Varies |
| Cases | `/api/v1/cases` | ✅ |
| Clients | `/api/v1/clients` | ✅ |
| Hearings | `/api/v1/hearings` | ✅ |
| Documents | `/api/v1/documents` | ✅ |
| Invoices | `/api/v1/invoices` | ✅ |
| Legal Research | `/api/v1/legal` | Public + Auth |
| Subscriptions | `/api/v1/subscription` | ✅ |
| Payments | `/api/v1/payment` | ✅ |
| Admin | `/api/v1/admin` | Admin only |
| Health | `/api/v1/health` | Public |
| Metrics | `/api/v1/metrics` | Internal |

---

## 🧪 Testing

```bash
# Run all backend tests
pnpm test:backend

# Run with coverage
cd backend && npm run test:coverage

# Load testing
cd backend && npm run load-test
```

Test suites: `auth`, `payment.webhook`, `security`, `deletionHard`

---

## 🔐 Security

Juriq is built with security-first principles:
- All secrets managed through environment variables
- CSRF double-submit cookie protection
- Redis-backed rate limiting with IP escalation
- Account lockout with abuse signal detection
- Immutable audit logs for all admin operations
- HMAC-verified webhook processing
- CSP, HSTS, X-Frame-Options enforced by Helmet

See [SECURITY.md](SECURITY.md) for our full security policy and responsible disclosure process.

---

## 📈 Roadmap

See [ROADMAP.md](ROADMAP.md) for upcoming features and the product vision.

---

## 🤝 Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

```bash
# Fork the repo, then:
git checkout -b feat/your-feature-name
# Make your changes
git commit -m "feat(backend): add your feature"
git push origin feat/your-feature-name
# Open a PR against main
```

---

## 📜 License

[MIT](LICENSE) © 2024–2026 Juriq Engineering

---

<div align="center">
  <sub>Built with ❤️ for Indian legal professionals</sub>
</div>
