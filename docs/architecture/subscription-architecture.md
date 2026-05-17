# Subscription Architecture

## Plan Tiers

| Plan | Features | Limits |
|------|----------|--------|
| Free | Basic case/client management | Limited cases, no legal research |
| Basic | + Legal research, documents | Monthly case limit |
| Pro | + Templates, billing, notes | Higher limits |
| Premium | + Advanced analytics, priority support | Large limits |
| Elite | Full platform access | Unlimited |

Each tier is available in monthly and yearly billing.

## Technical Implementation

### Backend
- **Plan IDs**: Mapped to Razorpay plan IDs via env vars (`RAZORPAY_PLAN_ID_BASIC`, etc.)
- **Enforcement**: `checkPlanAccess.js` middleware validates feature access per request
- **Plan Config**: `src/config/planFeatures.js` defines feature matrix per tier
- **Service**: `planService.js` handles plan lookup, caching (Redis), and validation

### Frontend
- **PlanContext**: React context providing current plan state to all components
- **FeatureGate**: Component wrapper that conditionally renders based on plan
- **AccessDeniedOverlay**: Shown when user accesses a plan-restricted feature
- **UpgradePlanButton**: CTA for plan upgrades, linked to billing page
- **usePlanAccess hook**: Checks feature availability in any component

### Caching
- Plan data is cached in Redis keyed by `plan:{userId}`
- Cache is invalidated on subscription change (webhook handler)
- Frontend caches plan in PlanContext (keyed by userId to prevent bleed)

## Subscription Lifecycle

```
User selects plan → POST /payment/subscribe → Razorpay creates subscription
                                                      │
                                              Razorpay webhook events:
                                              subscription.activated
                                              subscription.charged
                                              subscription.halted
                                              subscription.cancelled
                                              payment.authorized
                                              payment.captured
                                              payment.failed
                                              refund.processed
```

## Plan Enforcement Flow

```
Request → checkPlanAccess middleware
              │
              ├─ Read plan from Redis cache (or DB fallback)
              ├─ Check if feature is allowed for plan tier
              ├─ Check if usage limits are exceeded
              │
              ├─ Allowed → next()
              └─ Denied → 403 { error: "PLAN_LIMIT", upgrade: true }
```
