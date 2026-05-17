# Required Diagrams

This directory should contain architecture and workflow diagrams for Juriq documentation. Below are the diagrams that should be created using a diagramming tool (draw.io, Excalidraw, Mermaid, or Figma).

## Architecture Diagrams Needed

### 1. System Architecture Overview
**File**: `system-architecture.png`
```
Shows: Frontend (Vercel) → API (Railway) → MongoDB Atlas + Redis
       Workers (separate container) → Redis queues
       Cloudinary for media
       Razorpay for payments
       Sentry for errors
```

### 2. Auth Flow
**File**: `auth-flow.png`
```
Shows: Login → JWT issued → Cookie set → Refresh cycle
       Google OAuth → callback → JWT issued
       2FA → TOTP verify → JWT issued
       Failed attempts → Abuse detection → Account lockout
```

### 3. Payment Flow
**File**: `payment-flow.png`
```
Shows: User selects plan → Create Razorpay subscription
       → Payment gateway → Webhook notification
       → Subscription activated → Plan updated
       → Reconciliation cron → Self-healing
```

### 4. Webhook Lifecycle
**File**: `webhook-lifecycle.png`
```
Shows: Razorpay event → HMAC verification → Event routing
       → Subscription state machine → DB update → Audit log
       → Failed webhooks → Retry logic → Reconciliation
```

### 5. Worker Architecture
**File**: `worker-architecture.png`
```
Shows: API server → BullMQ queue → Redis
       Worker process → email worker + cleanup worker + admin worker
       Job retry → Dead letter queue → Monitoring
```

### 6. Deployment Architecture
**File**: `deployment-architecture.png`
```
Shows: GitHub → CI/CD → Railway (backend + workers)
       GitHub → Vercel (frontend)
       MongoDB Atlas (managed DB)
       Redis (Railway addon or managed)
       Cloudinary (CDN + media)
```

### 7. Hearing Conflict Detection
**File**: `hearing-conflict-flow.png`
```
Shows: New hearing created → Date/time/court check
       → Conflict detected → Warning to user
       → User confirms or reschedules
```

### 8. Notification Flow
**File**: `notification-flow.png`
```
Shows: Event trigger → Alert created → AlertQueue scheduled
       → Email worker picks up → Email sent via SendGrid
       → In-app notification → Bell icon badge update
```

## How to Create
Use any of these tools:
- **Excalidraw** (recommended — hand-drawn aesthetic, exports to PNG)
- **draw.io** (detailed technical diagrams)
- **Mermaid** (code-based, renders in GitHub markdown)
- **Figma** (polished presentation diagrams)

Save exported PNGs to this `docs/diagrams/` directory.
