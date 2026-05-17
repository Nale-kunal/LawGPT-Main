# Monitoring

This directory contains monitoring configuration examples.

## Prometheus
- `infrastructure/monitoring/prometheus.yml` — Scrape configuration
- `infrastructure/monitoring/alertmanager.yml` — Alert routing

## Grafana Dashboards (Future)
- API request latency
- Error rate tracking
- Rate limit hits
- Payment event monitoring
- Worker queue depth

## Application Metrics

Metrics are exposed at `GET /api/v1/metrics` in Prometheus text format:

| Metric | Type | Description |
|--------|------|-------------|
| `http_request_duration_seconds` | Histogram | Request latency by method/route/status |
| `rate_limit_triggered_total` | Counter | Rate limit events by limiter name |
| `process_*` | Various | Node.js process metrics (default) |

## Alerting Rules (Recommended)

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | 5xx > 5% for 5 min | Critical |
| High Latency | p99 > 2s for 5 min | Warning |
| Rate Limit Spike | rate_limit > 100/min | Warning |
| Worker Queue Backup | queue depth > 1000 | Warning |
