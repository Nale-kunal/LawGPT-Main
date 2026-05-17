# Deployment Architecture

## Current Deployment

| Component | Platform | Configuration |
|-----------|----------|---------------|
| Frontend | Vercel | `vercel.json` — SPA routing, build command |
| Backend | Railway / Render | `railway.json`, `render.yaml` — Node.js service |
| Workers | Railway / Render | Same container, different start command |
| Database | MongoDB Atlas | M10+ cluster, auto-scaling |
| Cache | Railway Redis / Upstash | Managed Redis service |
| Media | Cloudinary | CDN-backed media storage |
| DNS | Cloudflare (recommended) | DDoS protection, SSL termination |

## Docker

### Production Compose (`docker-compose.yml`)
- Backend service with health check
- Frontend Nginx service
- Depends on backend health

### Development Compose (`docker-compose.dev.yml`)
- Adds MongoDB and Redis local services
- Volume mounts for hot reload
- Development-specific environment

### Dockerfiles
- `backend/Dockerfile` — Multi-stage Node.js build
- `frontend/Dockerfile` — Vite build → Nginx serve

## Kubernetes

Manifests in `infrastructure/kubernetes/`:
- `deployment.yaml` — Backend deployment with resource limits
- `service-ingress-hpa.yaml` — Service, Ingress, HPA configuration

## Scaling Strategy

### Horizontal Scaling
- Backend: Stateless Express servers behind load balancer
- Workers: Multiple worker instances reading from same Redis queue
- Frontend: CDN-served static assets (infinite scale)

### Vertical Scaling
- MongoDB Atlas auto-scaling (M10 → M30 → M50)
- Redis: Upstash serverless or Railway managed

### Data Scaling
- MongoDB indexes optimized for read-heavy workloads
- Redis caching reduces DB load for plan checks, rate limits
- Cloudinary CDN for media delivery
