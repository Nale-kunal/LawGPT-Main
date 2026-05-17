# Model Relationships

```
User ──────────────────────────────────────────────────────────────┐
 │                                                                  │
 ├── owns → Case ──── has many → Hearing                            │
 │            │                                                      │
 │            ├── has many → CaseNote ── has many → Attachments     │
 │            ├── has many → Document                                │
 │            └── has many → TimeEntry                               │
 │                                                                  │
 ├── owns → Client ── linked to → Case                              │
 ├── owns → Document ── belongs to → Folder                         │
 ├── owns → Invoice ── linked to → Client, Case                     │
 ├── owns → Alert                                                    │
 ├── has → Subscription ── tracked by → Payment                     │
 │                          └── logged by → PaymentLog               │
 │                          └── invoiced by → PaymentInvoice         │
 │                          └── refunded by → RefundLog              │
 │                                                                  │
 ├── generates → Activity, ActivityEvent                             │
 ├── tracked by → AuditLog                                           │
 ├── tracked by → AbuseSignalLog                                     │
 ├── snapshot → AnalyticsDaily, UserUsageSnapshot                    │
 └── coupon usage → CouponUsageLog                                   │
                                                                     │
 LegalActs ── has many → LegalSection (independent of user)         │
 CaseLaws (independent of user — shared legal database)             │
 SettlementLog (system-level — Razorpay settlements)                │
 ClientErrorLog (system-level — frontend error reports)             │
```
