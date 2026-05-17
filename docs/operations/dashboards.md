# Operational Dashboards

## Key Metrics to Monitor

### Application Health
| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| API response time (p99) | Pino request logs | > 2s for 5 min |
| Error rate (5xx) | Express error handler | > 5% of requests |
| Active connections | MongoDB driver | > 80% pool capacity |
| Memory usage | `process.memoryUsage()` | > 80% of container limit |
| Event loop lag | `perf_hooks` | > 100ms |

### Business Metrics
| Metric | Source | Dashboard |
|--------|--------|-----------|
| Active subscriptions | Subscription model | Daily snapshot |
| Payment success rate | PaymentLog model | Hourly |
| New registrations | User model | Daily |
| Active users (DAU) | Activity model | Daily |
| Case creation rate | Case model | Weekly trend |

### Infrastructure
| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Redis connectivity | ioredis events | Any disconnect |
| MongoDB replica lag | Atlas monitoring | > 10s lag |
| Worker queue depth | BullMQ metrics | > 1000 pending |
| Disk usage | Container metrics | > 85% |
| SSL certificate expiry | External probe | < 30 days |

## Recommended Stack
- **Metrics collection**: Prometheus (scrape `/api/v1/metrics`)
- **Dashboards**: Grafana Cloud (free tier covers startup needs)
- **Alerting**: Grafana alerts → Slack/Email
- **Error tracking**: Sentry (already integrated)
- **Uptime**: UptimeRobot / Better Uptime (free tier)
